const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * Extracts token from "Authorization: Bearer TOKEN" header,
 * verifies the signature, and attaches the user to req.user.
 *
 * Returns 401 if token is missing or invalid.
 * Returns 403 if token is expired.
 */
const auth = async (req, res, next) => {
  try {
    // Extract the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        message: 'Please include a valid Bearer token in the Authorization header.',
      });
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Token is empty.',
        message: 'The Bearer token is missing after the prefix.',
      });
    }

    // Verify the token signature and decode payload
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Differentiate between expired and invalid tokens
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

    // Look up the user from the decoded token payload
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'User not found.',
        message: 'The user associated with this token no longer exists.',
      });
    }

    // Attach the user to the request object for downstream handlers
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

module.exports = auth;
