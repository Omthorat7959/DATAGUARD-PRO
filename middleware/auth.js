const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyApiKey, API_KEY_PREFIX } = require('../services/apiKeyManager');

/**
 * JWT Authentication Middleware
 * Extracts token from "Authorization: Bearer TOKEN" header,
 * verifies the signature, and attaches the user to req.user.
 *
 * Also supports API key authentication via "X-API-Key" header
 * for programmatic access (e.g., CLI uploads).
 */
const auth = async (req, res, next) => {
  try {
    // ─── Try API Key first ──────────────────────────────────
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && apiKeyHeader.startsWith(API_KEY_PREFIX)) {
      return authenticateApiKey(apiKeyHeader, req, res, next);
    }

    // ─── JWT Bearer Token ───────────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        message: 'Include a Bearer token or X-API-Key header.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Token is empty.',
        message: 'The Bearer token is missing after the prefix.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(403).json({
          error: 'Token expired.',
          message: 'Your session has expired. Please log in again.',
          expiredAt: jwtError.expiredAt,
        });
      }

      return res.status(401).json({
        error: 'Invalid token.',
        message: 'The provided token is malformed or has an invalid signature.',
      });
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'User not found.',
        message: 'The user associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({
      error: 'Authentication error.',
      message: 'An internal error occurred during authentication.',
    });
  }
};

/**
 * Authenticate via X-API-Key header.
 * Iterates through user's stored API keys and checks for a match.
 */
async function authenticateApiKey(plainKey, req, res, next) {
  try {
    // Find all users that have active API keys (limited to avoid full table scan)
    const users = await User.find({
      'apiKeys.isActive': true,
    }).select('+password'); // Need the full doc for apiKeys

    for (const user of users) {
      for (const keyDoc of user.apiKeys) {
        if (!keyDoc.isActive) continue;
        const match = await verifyApiKey(plainKey, keyDoc.keyHash);
        if (match) {
          // Update last-used timestamp
          keyDoc.lastUsedAt = new Date();
          await user.save();

          // Strip password before attaching
          const userObj = user.toObject();
          delete userObj.password;
          req.user = userObj;
          req.authMethod = 'api_key';
          return next();
        }
      }
    }

    return res.status(401).json({
      error: 'Invalid API key.',
      message: 'The provided API key is invalid or has been revoked.',
    });
  } catch (error) {
    console.error('API key auth error:', error.message);
    return res.status(500).json({
      error: 'Authentication error.',
      message: 'Failed to verify API key.',
    });
  }
}

module.exports = auth;
