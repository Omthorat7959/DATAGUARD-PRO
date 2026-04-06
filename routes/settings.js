const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Upload = require('../models/Upload');
const DataSource = require('../models/DataSource');
const DataConnection = require('../models/DataConnection');
const ValidationResult = require('../models/ValidationResult');
const TeamMember = require('../models/TeamMember');
const Alert = require('../models/Alert');
const { generateApiKey, hashApiKey, getKeyPrefix } = require('../services/apiKeyManager');

const router = express.Router();

// ─── GET /api/settings/profile ─────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -apiKeys.keyHash');
    res.json({
      success: true,
      profile: {
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImage: user.profileImage || '',
        theme: user.theme || 'dark',
        emailNotifications: user.emailNotifications ?? true,
        twoFactorEnabled: user.twoFactorEnabled || false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── POST /api/settings/profile ────────────────────────────────────
router.post('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, theme, emailNotifications } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined)  user.lastName = lastName.trim();
    if (theme && ['light', 'dark'].includes(theme)) user.theme = theme;
    if (emailNotifications !== undefined) user.emailNotifications = !!emailNotifications;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ─── POST /api/settings/password ───────────────────────────────────
router.post('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one uppercase letter.' });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one number.' });
    }

    // Fetch user WITH password for comparison
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─── POST /api/settings/api-keys/generate ──────────────────────────
router.post('/api-keys/generate', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'API key name is required.' });
    }

    const user = await User.findById(req.user._id);

    if (user.apiKeys.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 API keys allowed. Delete an old one first.' });
    }

    // Generate & hash the key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);
    const keyPrefix = getKeyPrefix(plainKey);

    user.apiKeys.push({
      keyHash,
      keyPrefix,
      name: name.trim(),
      isActive: true,
    });

    await user.save();

    const savedKey = user.apiKeys[user.apiKeys.length - 1];

    res.status(201).json({
      success: true,
      message: 'API key generated. Copy it now — it won\'t be shown again!',
      apiKey: plainKey, // Show ONCE
      keyId: savedKey._id,
      name: savedKey.name,
      prefix: keyPrefix,
      createdAt: savedKey.createdAt,
    });
  } catch (error) {
    console.error('Generate API key error:', error.message);
    res.status(500).json({ error: 'Failed to generate API key.' });
  }
});

// ─── GET /api/settings/api-keys ────────────────────────────────────
router.get('/api-keys', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const keys = (user.apiKeys || []).map(k => ({
      id: k._id,
      name: k.name,
      prefix: k.keyPrefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
    }));

    res.json({ success: true, keys, count: keys.length });
  } catch (error) {
    console.error('List API keys error:', error.message);
    res.status(500).json({ error: 'Failed to fetch API keys.' });
  }
});

// ─── DELETE /api/settings/api-keys/:keyId ──────────────────────────
router.delete('/api-keys/:keyId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.apiKeys.findIndex(k => String(k._id) === req.params.keyId);
    if (idx === -1) return res.status(404).json({ error: 'API key not found.' });

    user.apiKeys.splice(idx, 1);
    await user.save();

    res.json({ success: true, message: 'API key deleted.' });
  } catch (error) {
    console.error('Delete API key error:', error.message);
    res.status(500).json({ error: 'Failed to delete API key.' });
  }
});

// ─── POST /api/settings/api-keys/:keyId/revoke ────────────────────
router.post('/api-keys/:keyId/revoke', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const key = user.apiKeys.id(req.params.keyId);
    if (!key) return res.status(404).json({ error: 'API key not found.' });

    key.isActive = !key.isActive; // toggle
    await user.save();

    res.json({
      success: true,
      message: key.isActive ? 'API key reactivated.' : 'API key revoked.',
      isActive: key.isActive,
    });
  } catch (error) {
    console.error('Revoke API key error:', error.message);
    res.status(500).json({ error: 'Failed to update API key.' });
  }
});

// ─── GET /api/settings/usage ───────────────────────────────────────
router.get('/usage', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [uploadCount, validationCount, sourceCount, alertCount] = await Promise.all([
      Upload.countDocuments({ userId }),
      ValidationResult.countDocuments({ userId }),
      DataSource.countDocuments({ userId }),
      Alert.countDocuments({ userId }),
    ]);

    // Average quality score from data sources
    const sources = await DataSource.find({ userId, lastDataQualityScore: { $ne: null } })
      .select('lastDataQualityScore').lean();
    const avgQuality = sources.length > 0
      ? Math.round(sources.reduce((s, src) => s + src.lastDataQualityScore, 0) / sources.length)
      : null;

    // Get most recent upload date
    const latestUpload = await Upload.findOne({ userId }).sort({ uploadedAt: -1 }).select('uploadedAt').lean();

    // Fixes = validation results with suggested fixes
    const fixesApplied = await ValidationResult.countDocuments({ userId, suggestedFix: { $ne: '' } });

    res.json({
      success: true,
      usage: {
        totalUploads: uploadCount,
        totalValidations: validationCount,
        totalDataSources: sourceCount,
        totalAlerts: alertCount,
        fixesApplied,
        averageQualityScore: avgQuality,
        estimatedTimeSaved: fixesApplied * 8,
        lastUploadAt: latestUpload?.uploadedAt || null,
        lastActiveAt: new Date(),
        memberSince: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Usage stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch usage stats.' });
  }
});

// ─── DELETE /api/settings/account ──────────────────────────────────
router.delete('/account', auth, async (req, res) => {
  try {
    const { confirmPassword } = req.body;
    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation is required.' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(confirmPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Delete ALL user data
    const userId = req.user._id;
    await Promise.all([
      Upload.deleteMany({ userId }),
      DataSource.deleteMany({ userId }),
      DataConnection.deleteMany({ userId }),
      ValidationResult.deleteMany({ userId }),
      TeamMember.deleteMany({ ownerId: userId }),
      Alert.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

module.exports = router;
