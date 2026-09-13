import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token (64 hex characters from 32 random bytes).
 */
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Computes a SHA-256 hash of a raw token for secure database storage.
 * Raw tokens should NEVER be persisted directly in the database.
 */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};
