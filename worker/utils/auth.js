/**
 * Authentication and authorization utilities for Admin API
 * Utilizes Cloudflare Workers Web Crypto API.
 */

const JWT_ALGO = { name: "HMAC", hash: "SHA-256" };
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "SHA-256";

/**
 * Encodes an ArrayBuffer to a Base64URL string.
 */
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let string = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    string += String.fromCharCode(bytes[i]);
  }
  return btoa(string)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a Base64URL string to an ArrayBuffer.
 */
function base64UrlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const string = atob(base64);
  const buffer = new ArrayBuffer(string.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < string.length; i++) {
    bytes[i] = string.charCodeAt(i);
  }
  return buffer;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Imports a raw string as an HMAC key for JWT signing.
 */
async function importJwtKey(secretStr) {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretStr),
    JWT_ALGO,
    false,
    ["sign", "verify"]
  );
}

/**
 * Generates a signed JWT for the admin.
 */
export async function signAdminJwt(adminEmail, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: adminEmail,
    role: "ADMIN",
    iat: now,
    exp: now + 24 * 60 * 60 // 24 hours expiry
  };

  const headerB64 = bufferToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = bufferToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const key = await importJwtKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    JWT_ALGO,
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = bufferToBase64Url(signatureBuffer);
  return `${signatureInput}.${signatureB64}`;
}

/**
 * Verifies a JWT and extracts the payload.
 * Throws an error if invalid, expired, or wrong role.
 */
export async function verifyAdminJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const signatureInput = `${headerB64}.${payloadB64}`;

  const key = await importJwtKey(secret);
  const isValid = await crypto.subtle.verify(
    JWT_ALGO,
    key,
    base64UrlToBuffer(signatureB64),
    encoder.encode(signatureInput)
  );

  if (!isValid) {
    throw new Error("Invalid JWT signature");
  }

  const payloadStr = decoder.decode(base64UrlToBuffer(payloadB64));
  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch (e) {
    throw new Error("Invalid JWT payload JSON");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) {
    throw new Error("Token expired");
  }

  if (payload.role !== "ADMIN") {
    throw new Error("Insufficient permissions");
  }

  return payload;
}

/**
 * Hashes a password using PBKDF2 and returns the encoded string.
 * Format: pbkdf2$<iterations>$<hash_algo>$<salt_b64>$<hash_b64>
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    keyMaterial,
    256
  );

  const saltB64 = bufferToBase64Url(salt);
  const hashB64 = bufferToBase64Url(hashBuffer);
  
  return `pbkdf2$${PBKDF2_ITERATIONS}$${PBKDF2_HASH}$${saltB64}$${hashB64}`;
}

/**
 * Verifies a password against a PBKDF2 encoded hash.
 * Safely handles timing attacks using timingSafeEqual.
 */
export async function verifyPassword(password, encodedHash) {
  const parts = encodedHash.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const hashAlgo = parts[2];
  const saltBuffer = base64UrlToBuffer(parts[3]);
  const expectedHashBuffer = base64UrlToBuffer(parts[4]);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: iterations,
      hash: hashAlgo
    },
    keyMaterial,
    expectedHashBuffer.byteLength * 8
  );

  // Use timingSafeEqual to prevent timing attacks. Both buffers MUST be the same length.
  if (hashBuffer.byteLength !== expectedHashBuffer.byteLength) {
    return false;
  }
  
  return crypto.subtle.timingSafeEqual(hashBuffer, expectedHashBuffer);
}

/**
 * Middleware function to enforce admin authentication.
 * Parses the Authorization header and verifies the token.
 */
export async function requireAdminAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);
  if (!env.ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET not configured");
  }

  try {
    const payload = await verifyAdminJwt(token, env.ADMIN_JWT_SECRET);
    return payload; // { sub, role, iat, exp }
  } catch (err) {
    throw new Error(`Unauthorized: ${err.message}`);
  }
}
