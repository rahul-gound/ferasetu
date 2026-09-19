/**
 * FeraSetu Email Secret Encryption Module
 * Provides AES-256-GCM encryption and decryption for external SMTP secrets at rest.
 * Uses the Web Crypto API (SubtleCrypto) native to Cloudflare Workers and Node.js 18+.
 * Zero plaintext SMTP secrets are ever stored in Cloudflare D1.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const DEFAULT_FALLBACK_SALT = 'ferasetu-smtp-storage-salt-v1';

/**
 * Derives a 256-bit CryptoKey from an environment secret string via PBKDF2 or SHA-256.
 */
async function getCryptoKey(secretKey) {
  const encoder = new TextEncoder();
  const rawSecret = secretKey || 'ferasetu-default-internal-secret-key-32b';
  const keyData = encoder.encode(rawSecret);

  // Hash the master key to guarantee a 256-bit (32-byte) key
  const hash = await crypto.subtle.digest('SHA-256', keyData);

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
 * @param {string} [masterKey] - Master encryption key from environment
 * @returns {Promise<string>} Encrypted representation
 */
export async function encryptSecret(plaintext, masterKey) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    return '';
  }

  const key = await getCryptoKey(masterKey);
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
 * @param {string} [masterKey] - Master encryption key from environment
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptSecret(encryptedRef, masterKey) {
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
  const key = await getCryptoKey(masterKey);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
