import { describe, it, expect, beforeEach } from 'vitest';
import { verifyPassword, hashPassword, signAdminJwt, verifyAdminJwt } from '../utils/auth.js';

describe('Admin Authentication Utilities', () => {
  const secret = 'test-secret-key-12345';
  const adminEmail = 'admin@fera.ai';
  let hashedPassword;

  beforeEach(async () => {
    // Generate a fresh hash for the test password
    hashedPassword = await hashPassword('password123');
  });

  describe('Password Hashing (PBKDF2)', () => {
    it('should successfully verify a correct password', async () => {
      const isValid = await verifyPassword('password123', hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const isValid = await verifyPassword('wrongpassword', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle malformed hashes gracefully', async () => {
      const isValid = await verifyPassword('password123', 'invalid-hash-format');
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Signing and Verification', () => {
    it('should create a valid JWT and verify it correctly', async () => {
      const token = await signAdminJwt(adminEmail, secret);
      const payload = await verifyAdminJwt(token, secret);
      
      expect(payload.sub).toBe(adminEmail);
      expect(payload.role).toBe('ADMIN');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should reject a JWT with an invalid signature', async () => {
      const token = await signAdminJwt(adminEmail, secret);
      const forgedToken = token.slice(0, -5) + 'abcde'; // Corrupt signature
      
      await expect(verifyAdminJwt(forgedToken, secret)).rejects.toThrow('Invalid JWT signature');
    });

    it('should reject a JWT signed with a different secret', async () => {
      const token = await signAdminJwt(adminEmail, 'different-secret');
      await expect(verifyAdminJwt(token, secret)).rejects.toThrow();
    });

    it('should reject a malformed JWT', async () => {
      await expect(verifyAdminJwt('not.a.jwt', secret)).rejects.toThrow('Malformed JWT');
    });
  });
});
