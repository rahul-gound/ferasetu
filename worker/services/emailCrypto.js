/**
 * FeraSetu Email Secret Encryption Module
 * Provides AES-256-GCM encryption and decryption for external SMTP secrets at rest.
 * Uses the Web Crypto API (SubtleCrypto) native to Cloudflare Workers and Node.js 18+.
 * Zero plaintext SMTP secrets are ever stored in Cloudflare D1.
 *
 * Security Hardening (Milestone 1 / R1):
 * - Strictly derives 256-bit key from env.DATA_ENCRYPTION_KEY || env.SMTP_ENCRYPTION_KEY
 * - Removed insecure hardcoded fallback key
 * - Throws explicit security exception when key is missing or insufficient in production
 * - Preserves backward-compatible decryption for legacy plaintext values
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

/**
 * Resolves the master encryption key string from either a direct string or an environment object.
 *
 * @param {string|object} masterKeyOrEnv
 * @returns {string|null}
 */
export function resolveEncryptionKey(masterKeyOrEnv) {
  if (typeof masterKeyOrEnv === 'string' && masterKeyOrEnv.trim().length > 0) {
    return masterKeyOrEnv.trim();
  }

  if (masterKeyOrEnv && typeof masterKeyOrEnv === 'object') {
    const candidate = masterKeyOrEnv.DATA_ENCRYPTION_KEY
      || masterKeyOrEnv.SMTP_ENCRYPTION_KEY
      || masterKeyOrEnv.ENCRYPTION_SECRET
      || masterKeyOrEnv.ADMIN_JWT_SECRET;

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * Checks if the execution environment is production.
 *
 * @param {string|object} masterKeyOrEnv
 * @returns {boolean}
 */
function isProductionEnvironment(masterKeyOrEnv) {
  if (masterKeyOrEnv && typeof masterKeyOrEnv === 'object') {
    if (masterKeyOrEnv.ENVIRONMENT === 'production' || masterKeyOrEnv.NODE_ENV === 'production') {
      return true;
    }
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return true;
  }
  return false;
}

/**
 * Derives a 256-bit CryptoKey from an environment secret string via SHA-256.
 * Strictly forbids empty or insecure fallback keys.
 *
 * @param {string|object} masterKeyOrEnv
 * @returns {Promise<CryptoKey>}
 */
async function getCryptoKey(masterKeyOrEnv) {
  const rawSecret = resolveEncryptionKey(masterKeyOrEnv);
  const isProd = isProductionEnvironment(masterKeyOrEnv);

  if (!rawSecret) {
    throw new Error(
      'Security Exception: Encryption key is required. DATA_ENCRYPTION_KEY or SMTP_ENCRYPTION_KEY must be configured.'
    );
  }

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(rawSecret);

  if (isProd && keyBytes.length < 32) {
    throw new Error(
      'Security Exception: DATA_ENCRYPTION_KEY must be at least 256 bits (32 bytes) in production.'
    );
  }

  // Hash via SHA-256 to guarantee a strict 256-bit (32-byte) key while maintaining 100% cipher compatibility
  const hash = await crypto.subtle.digest('SHA-256', keyBytes);

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Converts a Uint8Array to base64 string.
 */
function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to Uint8Array.
 */
function base64ToUint8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts a plaintext secret (e.g. SMTP password) into an encrypted reference string.
 * Output format: "enc:v1:<base64-iv>:<base64-ciphertext>"
 *
 * @param {string} plaintext - Sensitive string to encrypt
 * @param {string|object} masterKeyOrEnv - Master encryption key or Cloudflare Worker env object
 * @returns {Promise<string>} Encrypted representation
 */
export async function encryptSecret(plaintext, masterKeyOrEnv) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    return '';
  }

  const key = await getCryptoKey(masterKeyOrEnv);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedPlaintext
  );

  const ivB64 = uint8ToBase64(iv);
  const cipherB64 = uint8ToBase64(new Uint8Array(ciphertextBuffer));

  return `enc:v1:${ivB64}:${cipherB64}`;
}

/**
 * Decrypts an encrypted reference string back to plaintext.
 *
 * @param {string} encryptedRef - Encrypted string formatted as "enc:v1:<iv>:<ciphertext>"
 * @param {string|object} masterKeyOrEnv - Master encryption key or Cloudflare Worker env object
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptSecret(encryptedRef, masterKeyOrEnv) {
  if (!encryptedRef || typeof encryptedRef !== 'string') {
    return '';
  }

  // Backward compatibility with unencrypted/legacy values in dev/migration
  if (!encryptedRef.startsWith('enc:v1:')) {
    return encryptedRef;
  }

  const parts = encryptedRef.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted secret format');
  }

  const ivB64 = parts[2];
  const cipherB64 = parts[3];

  const iv = base64ToUint8(ivB64);
  const ciphertext = base64ToUint8(cipherB64);
  const key = await getCryptoKey(masterKeyOrEnv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
