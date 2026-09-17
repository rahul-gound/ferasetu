// FeraSetu Pro Data & Storage — Cryptographic Credential Envelope
// =============================================================================
// Strictly enforces dedicated DATA_ENCRYPTION_KEY (256-bit).
// Never uses ADMIN_JWT_SECRET or JWT_SECRET.
// Uses HKDF (RFC 5869) to derive service-specific subkeys + AES-256-GCM.
// Versioned envelopes (envelope_version, key_version) for zero-plaintext key rotation.
// Decrypted credentials are NEVER logged or returned in API responses.
// =============================================================================

export const CURRENT_ENVELOPE_VERSION = 1;
export const CURRENT_KEY_VERSION = 1;
const HKDF_INFO_STRING = 'ferasetu-pro-data-storage-v1';

function bufferToHex(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Validates and extracts the dedicated 256-bit DATA_ENCRYPTION_KEY from environment.
 * Strictly forbids fallback to JWT or Admin secrets.
 */
export function getDedicatedEncryptionKey(env) {
  const rawKey = env?.DATA_ENCRYPTION_KEY;

  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    throw new Error(
      'Security Exception: DATA_ENCRYPTION_KEY is required and must be configured. Fallback keys (JWT_SECRET, ADMIN_JWT_SECRET) are strictly prohibited.'
    );
  }

  const trimmed = rawKey.trim();

  // If hex string (64 characters = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return hexToBuffer(trimmed);
  }

  // If base64 string
  if (trimmed.length >= 43 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    try {
      const binary = typeof atob !== 'undefined' ? atob(trimmed) : Buffer.from(trimmed, 'base64').toString('binary');
      if (binary.length >= 32) {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }
    } catch {
      // Fall through to text encoder
    }
  }

  // Raw secret string (must be at least 32 characters for 256 bits)
  const encoded = new TextEncoder().encode(trimmed);
  if (encoded.length < 32) {
    throw new Error(
      'Security Exception: DATA_ENCRYPTION_KEY must be at least 256 bits (32 bytes). Provided key is too short.'
    );
  }

  return encoded.slice(0, 32);
}

/**
 * Derives a service-specific AES-256-GCM subkey using HKDF-SHA256 (RFC 5869).
 */
async function deriveHkdfSubkey(masterKeyBytes, saltBytes, infoStr = HKDF_INFO_STRING) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBytes,
      info: new TextEncoder().encode(infoStr),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts provider credentials into a versioned, authenticated envelope.
 * Plaintext credentials never leave this scope.
 */
export async function encryptCredentials(credentials, env, keyVersion = CURRENT_KEY_VERSION) {
  if (!credentials || (typeof credentials !== 'object' && typeof credentials !== 'string')) {
    throw new Error('Invalid credentials payload for encryption');
  }

  const masterKeyBytes = getDedicatedEncryptionKey(env);
  const plainText = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
  const plainBuffer = new TextEncoder().encode(plainText);

  // 16-byte random salt for HKDF
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // 12-byte random IV for AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const subKey = await deriveHkdfSubkey(masterKeyBytes, salt);

  // AES-GCM encryption
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    subKey,
    plainBuffer
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  // Last 16 bytes is the authentication tag
  const tagLength = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLength);

  return {
    envelope_version: CURRENT_ENVELOPE_VERSION,
    key_version: keyVersion,
    algorithm: 'AES-256-GCM',
    kdf: 'HKDF-SHA256',
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(ciphertextBytes),
    tag: bufferToHex(tagBytes),
  };
}

/**
 * Decrypts a versioned envelope back to the credentials object.
 * Strictly transient; results must never be logged or serialized to responses.
 */
export async function decryptCredentials(envelope, env) {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Invalid credential envelope');
  }

  if (envelope.envelope_version !== CURRENT_ENVELOPE_VERSION) {
    throw new Error(`Unsupported envelope version: ${envelope.envelope_version}`);
  }

  const masterKeyBytes = getDedicatedEncryptionKey(env);

  const salt = hexToBuffer(envelope.salt);
  const iv = hexToBuffer(envelope.iv);
  const ciphertext = hexToBuffer(envelope.ciphertext);
  const tag = hexToBuffer(envelope.tag);

  const subKey = await deriveHkdfSubkey(masterKeyBytes, salt);

  // Combine ciphertext + tag for Web Crypto AES-GCM decryption
  const combinedBuffer = new Uint8Array(ciphertext.length + tag.length);
  combinedBuffer.set(ciphertext, 0);
  combinedBuffer.set(tag, ciphertext.length);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      subKey,
      combinedBuffer
    );

    const decryptedStr = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedStr);
  } catch (err) {
    throw new Error('Credential decryption failed. Envelope may be corrupt or master key does not match.');
  }
}

/**
 * Key rotation helper: re-encrypts envelope with a new key version without exposing plaintext.
 */
export async function rotateCredentialEnvelope(envelope, currentEnv, newEnv, newKeyVersion = 2) {
  const decrypted = await decryptCredentials(envelope, currentEnv);
  return await encryptCredentials(decrypted, newEnv, newKeyVersion);
}

/**
 * Scrubs all secrets and produces safe public metadata.
 */
export function maskDataSourceMetadata(input = {}, provider = '') {
  const safe = {};

  // Host masking (e.g. ep-bold-firefly-12345.eu-central-1.neon.tech -> ep-b***.neon.tech)
  if (input.host) {
    const parts = String(input.host).split('.');
    if (parts.length > 1) {
      const first = parts[0];
      const maskedFirst = first.length > 4 ? first.slice(0, 4) + '***' : first.slice(0, 1) + '***';
      safe.host = [maskedFirst, ...parts.slice(1)].join('.');
    } else {
      safe.host = String(input.host).slice(0, 3) + '***';
    }
  }

  if (input.port) safe.port = Number(input.port);
  if (input.database) safe.database = String(input.database);
  if (input.databaseName) safe.database = String(input.databaseName);

  // Username masking (e.g. shop_master -> s***r)
  if (input.username || input.user) {
    const u = String(input.username || input.user);
    safe.username = u.length > 2 ? `${u[0]}***${u[u.length - 1]}` : `${u[0]}***`;
  }

  if (input.ssl !== undefined) safe.ssl = Boolean(input.ssl);
  if (input.region) safe.region = String(input.region);
  if (input.bucket) safe.bucket = String(input.bucket);
  if (input.bucketName) safe.bucket = String(input.bucketName);
  if (input.endpoint) {
    safe.endpoint = String(input.endpoint).replace(/:\/\/[^@]+@/, '://***@');
  }

  // Storage prefixes / folders
  if (input.selected_prefixes) safe.selected_prefixes = input.selected_prefixes;
  if (input.selected_tables) safe.selected_tables = input.selected_tables;

  // Strict sanitization: ensure no password, token, or private key leaks
  delete safe.password;
  delete safe.secret;
  delete safe.secretAccessKey;
  delete safe.accessKeyId;
  delete safe.privateKey;
  delete safe.applicationKey;
  delete safe.token;
  delete safe.connectionString;

  return safe;
}
