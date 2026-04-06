const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * API Key Management Service for DataGuard PRO
 * Generates, hashes, and verifies API keys.
 */

const API_KEY_PREFIX = 'sk-dataguard-';

/**
 * Generate a new API key with "sk-dataguard-" prefix.
 * @returns {string} - Plain-text API key (show to user once).
 */
function generateApiKey() {
  const random = crypto.randomBytes(24).toString('hex'); // 48 hex chars
  return `${API_KEY_PREFIX}${random}`;
}

/**
 * Hash an API key for secure storage.
 * Uses a lower bcrypt round count for faster lookups.
 * @param {string} key - Plain-text API key.
 * @returns {Promise<string>} - Bcrypt hash.
 */
async function hashApiKey(key) {
  const salt = await bcrypt.genSalt(8); // Fewer rounds for API key checks
  return bcrypt.hash(key, salt);
}

/**
 * Verify a plain-text key against a stored hash.
 * @param {string} plainKey - The plain-text API key.
 * @param {string} hashedKey - The bcrypt hash stored in DB.
 * @returns {Promise<boolean>} - True if match.
 */
async function verifyApiKey(plainKey, hashedKey) {
  return bcrypt.compare(plainKey, hashedKey);
}

/**
 * Extract the display prefix from a key (first 12 chars + "...").
 * @param {string} key - Plain-text API key.
 * @returns {string} - e.g. "sk-dataguard-a1b2..."
 */
function getKeyPrefix(key) {
  return key.substring(0, 20) + '...';
}

module.exports = {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  getKeyPrefix,
  API_KEY_PREFIX,
};
