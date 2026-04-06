/**
 * Encryption Helper for DataGuard PRO
 * Uses Node.js built-in crypto to encrypt/decrypt database credentials.
 * AES-256-GCM provides authenticated encryption.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Derive encryption key from JWT_SECRET (or a dedicated ENCRYPTION_KEY env var)
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('No encryption key configured. Set ENCRYPTION_KEY or JWT_SECRET.');
  return secret;
};

/**
 * Encrypt a plaintext string.
 * Returns a hex-encoded string containing: salt + iv + tag + ciphertext
 * @param {string} plaintext - The string to encrypt.
 * @returns {string} - Hex-encoded encrypted payload.
 */
const encrypt = (plaintext) => {
  if (!plaintext) return '';

  const secret = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from secret + salt using PBKDF2
  const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: salt(64) + iv(16) + tag(16) + ciphertext
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('hex');
};

/**
 * Decrypt a hex-encoded encrypted payload.
 * @param {string} ciphertext - Hex-encoded string from encrypt().
 * @returns {string} - The original plaintext.
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return '';

  const secret = getEncryptionKey();
  const buffer = Buffer.from(ciphertext, 'hex');

  // Unpack: salt(64) + iv(16) + tag(16) + encrypted
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };
