import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derives a 32-byte encryption key from the environment secret and organization ID.
 * This guarantees cryptographic tenant isolation.
 *
 * @param {string} orgId
 * @param {string} masterSecret
 * @returns {Buffer}
 */
function deriveOrgKey(orgId, masterSecret) {
  return crypto.createHmac('sha256', masterSecret)
    .update(`ferasetu:wa:session:${orgId}`)
    .digest();
}

/**
 * Encrypts arbitrary string data (e.g. Baileys session creds/keys) using AES-256-GCM.
 *
 * @param {string} plainText
 * @param {string} orgId
 * @param {string} masterSecret
 * @returns {string}
 */
export function encryptSessionData(plainText, orgId, masterSecret) {
  if (!plainText) return '';
  const key = deriveOrgKey(orgId, masterSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  // Return base64 payload: iv:tag:encrypted
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts AES-256-GCM payload with integrity verification.
 *
 * @param {string} encryptedPayload
 * @param {string} orgId
 * @param {string} masterSecret
 * @returns {string}
 */
export function decryptSessionData(encryptedPayload, orgId, masterSecret) {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted session payload structure');
  }

  const [ivB64, tagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const cipherText = Buffer.from(cipherB64, 'base64');

  const key = deriveOrgKey(orgId, masterSecret);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
