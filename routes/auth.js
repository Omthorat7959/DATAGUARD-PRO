const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a JWT token for a given user ID.
 * Token expires in 7 days.
 * @param {string} userId - The user's MongoDB _id.
 * @returns {string} - Signed JWT token.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ─── POST /auth/signup ─────────────────────────────────────────────
// Create a new user, hash password, generate API key, return JWT.
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields.',
        message: 'Both email and password are required.',
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password.',
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: 'Duplicate email.',
        message: 'An account with this email already exists.',
      });
    }

    // Create the user (password is hashed automatically by pre-save hook)
    const user = new User({ email, password });
    await user.save();

    // Generate an API key for the new user
    await user.generateApiKey();

    // Create a JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        email: user.email,
        apiKey: user.apiKey,
      },
      token,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: 'Validation error.',
        message: messages.join(', '),
      });
    }

    // Handle duplicate key error (race condition on unique email)
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate email.',
        message: 'An account with this email already exists.',
      });
    }

    console.error('Signup error:', error.message);
    res.status(500).json({
      error: 'Server error.',
      message: 'An error occurred during signup. Please try again.',
    });
  }
});

// ─── POST /auth/login ──────────────────────────────────────────────
// Authenticate user with email and password, return JWT.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields.',
        message: 'Both email and password are required.',
      });
    }

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials.',
        message: 'No account found with this email address.',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials.',
        message: 'Incorrect password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      user: {
        email: user.email,
        apiKey: user.apiKey,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      error: 'Server error.',
      message: 'An error occurred during login. Please try again.',
    });
  }
});

// ─── GET /auth/me ──────────────────────────────────────────────────
// Return current authenticated user's profile. Requires auth middleware.
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        email: req.user.email,
        apiKey: req.user.apiKey,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({
      error: 'Server error.',
      message: 'An error occurred while fetching user data.',
    });
  }
});

module.exports = router;
