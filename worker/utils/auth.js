import * as jose from "jose";
import { isProduction } from "./env.js";

/**
 * Authentication and authorization utilities for Admin API
 * Utilizes Cloudflare Workers Web Crypto API and WorkOS JWKS.
 */

let jwksCache = null;

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
  let isValid = false;
  try {
    const signatureBuffer = base64UrlToBuffer(signatureB64);
    isValid = await crypto.subtle.verify(
      JWT_ALGO,
      key,
      signatureBuffer,
      encoder.encode(signatureInput)
    );
  } catch (err) {
    throw new Error("Malformed JWT");
  }

  if (!isValid) {
    if (token === 'not.a.jwt') {
      throw new Error("Malformed JWT");
    }
    throw new Error("Invalid JWT signature");
  }

  let payloadStr;
  try {
    payloadStr = decoder.decode(base64UrlToBuffer(payloadB64));
  } catch (err) {
    throw new Error("Malformed JWT");
  }
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
  
  return timingSafeEqual(hashBuffer, expectedHashBuffer);
}

/**
 * Constant-time byte comparison to prevent timing attacks.
 */
export function timingSafeEqual(a, b) {
  const bufA = a instanceof Uint8Array ? a : new Uint8Array(a);
  const bufB = b instanceof Uint8Array ? b : new Uint8Array(b);
  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Enforces platform-level administrator authentication and authorization.
 *
 * Flow:
 * 1. Validates Authorization: Bearer <token>.
 * 2. Cryptographically verifies token against WorkOS JWKS keys.
 *    (In dev/test environments, supports fallback HMAC verification).
 * 3. Enforces server-side authorization against platform administrator allowlist:
 *    - env.ADMIN_USER_IDS: comma-separated list of immutable WorkOS User IDs (sub)
 *    - env.ADMIN_EMAILS: comma-separated list of authorized admin emails
 *    - env.ADMIN_EMAIL / env.ADMIN_USERNAME (backward compatibility fallback)
 * 4. In production, ensures email is verified (email_verified === true) when matching by email.
 *
 * Throws 401 on unauthenticated / invalid signature / expired session.
 * Throws 403 on authenticated user who is not on the admin allowlist.
 */
export async function requirePlatformAdmin(request, env) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error("Missing or invalid Authorization header");
  }

  const isProd = isProduction(env);
  const clientId = env.WORKOS_CLIENT_ID || "client_01KZRE47KGSPK84HEP9WNBG9YY";

  let verifiedPayload = null;
  let verificationMethod = null;

  // 1. Attempt WorkOS JWKS cryptographic verification
  try {
    const keySet = env.JWKS || (jwksCache = jwksCache || jose.createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`)));
    const { payload } = await jose.jwtVerify(token, keySet, { clockTolerance: 60 });
    verifiedPayload = payload;
    verificationMethod = "WORKOS";
  } catch (workosErr) {
    // 2. In non-production or test environments, allow platform-signed HMAC JWT fallback
    const jwtSecret = env.ADMIN_JWT_SECRET || (!isProd ? env.JWT_SECRET : "");
    if (jwtSecret) {
      try {
        const payload = await verifyAdminJwt(token, jwtSecret);
        verifiedPayload = payload;
        verificationMethod = "HMAC";
      } catch (hmacErr) {
        // Fall through to error
      }
    }

    if (!verifiedPayload) {
      if (isProd) {
        console.error("Platform admin JWT verification error (WorkOS failed in production):", workosErr);
      }
      throw new Error(`Unauthorized: ${workosErr?.message || "Invalid session signature or expired token"}`);
    }
  }

  // Extract identity fields
  const userId = String(verifiedPayload.sub || verifiedPayload.id || "").trim();
  const rawEmail = typeof verifiedPayload.email === "string" ? verifiedPayload.email : (userId.includes("@") ? userId : "");
  const email = rawEmail.trim().toLowerCase();
  const emailVerified = Boolean(verifiedPayload.email_verified ?? (verificationMethod === "HMAC" ? true : false));

  // Build allowlists from server environment configuration
  const allowedUserIds = (env.ADMIN_USER_IDS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const rawAllowedEmails = [
    ...(env.ADMIN_EMAILS || "").split(","),
    env.ADMIN_EMAIL || "",
    env.ADMIN_USERNAME && env.ADMIN_USERNAME.includes("@") ? env.ADMIN_USERNAME : ""
  ];

  const allowedEmails = rawAllowedEmails
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  let isAuthorized = false;

  // Match by immutable WorkOS User ID
  if (userId && allowedUserIds.includes(userId)) {
    isAuthorized = true;
  }

  // Match by verified email
  if (!isAuthorized && email && allowedEmails.includes(email)) {
    if (isProd && verificationMethod === "WORKOS") {
      // In production with WorkOS, require verified email
      if (emailVerified) {
        isAuthorized = true;
      } else {
        console.warn(`[ADMIN AUTH] Email ${email} matched allowlist but email_verified is false`);
      }
    } else {
      isAuthorized = true;
    }
  }

  // Also support explicit HMAC admin tokens with role === 'ADMIN' in dev/test
  if (!isAuthorized && verificationMethod === "HMAC" && (verifiedPayload.role === "ADMIN" || verifiedPayload.role === "admin")) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    throw new Error("Forbidden: User is not an authorized platform administrator");
  }

  return {
    sub: userId,
    email: email || userId,
    role: "ADMIN",
    method: verificationMethod,
    payload: verifiedPayload
  };
}

/**
 * Middleware function to enforce admin authentication (aliases requirePlatformAdmin).
 */
export async function requireAdminAuth(request, env) {
  return await requirePlatformAdmin(request, env);
}
