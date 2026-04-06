const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * User Schema for DataGuard PRO
 * Handles authentication, profile, API keys, and settings.
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

    // ─── Profile ───────────────────────────────────────────────
    firstName: { type: String, trim: true, default: '' },
    lastName:  { type: String, trim: true, default: '' },
    profileImage: { type: String, default: '' },

    // ─── Preferences ──────────────────────────────────────────
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    emailNotifications: { type: Boolean, default: true },
    twoFactorEnabled:   { type: Boolean, default: false },

    // ─── Legacy API key (kept for backward compat) ────────────
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Managed API Keys ─────────────────────────────────────
    apiKeys: [{
      keyHash:    { type: String, required: true },
      keyPrefix:  { type: String, required: true },   // first 12 chars for display
      name:       { type: String, required: true, trim: true },
      createdAt:  { type: Date, default: Date.now },
      lastUsedAt: { type: Date, default: null },
      isActive:   { type: Boolean, default: true },
    }],

    // ─── Usage Stats ──────────────────────────────────────────
    usageStats: {
      totalUploads:        { type: Number, default: 0 },
      totalValidations:    { type: Number, default: 0 },
      totalFixesApplied:   { type: Number, default: 0 },
      averageQualityScore: { type: Number, default: 0 },
      lastActiveAt:        { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: Hash password if it has been modified.
 */
userSchema.pre('save', async function (next) {
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
 */
userSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

/**
 * Generate a legacy 32-character random API key.
 */
userSchema.methods.generateApiKey = async function () {
  this.apiKey = crypto.randomBytes(16).toString('hex');
  await this.save();
  return this.apiKey;
};

/**
 * Override toJSON to strip sensitive fields.
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  // Strip full key hashes from API keys
  if (userObject.apiKeys) {
    userObject.apiKeys = userObject.apiKeys.map(k => ({
      _id: k._id,
      keyPrefix: k.keyPrefix,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
    }));
  }
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
