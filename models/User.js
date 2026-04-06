const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * User Schema for DataGuard
 * Handles authentication, API key generation, and password hashing.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    apiKey: {
      type: String,
      unique: true,
      sparse: true, // Allow null values while maintaining uniqueness
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Pre-save hook: Hash password if it has been modified.
 * Uses bcrypt with configurable rounds (default 10).
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const salt = await bcrypt.genSalt(rounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare a plaintext password with the stored hashed password.
 * @param {string} inputPassword - The plaintext password to compare.
 * @returns {Promise<boolean>} - True if passwords match, false otherwise.
 */
userSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

/**
 * Generate a 32-character random API key, save it to the user document.
 * @returns {Promise<string>} - The generated API key.
 */
userSchema.methods.generateApiKey = async function () {
  // Generate 16 random bytes → 32 hex chars
  this.apiKey = crypto.randomBytes(16).toString('hex');
  await this.save();
  return this.apiKey;
};

/**
 * Override toJSON to strip the password field from serialized output.
 * This ensures passwords are never leaked in API responses.
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
