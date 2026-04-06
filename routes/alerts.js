const express = require('express');
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

const router = express.Router();

// ─── GET /api/alerts ───────────────────────────────────────────────
// List user's alerts (unread first, then by date).
router.get('/', auth, async (req, res) => {
  try {
    const { severity, isRead, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (severity) filter.severity = severity;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const alerts = await Alert.find(filter)
      .sort({ isRead: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sourceId', 'name');

    const unreadCount = await Alert.countDocuments({ userId: req.user._id, isRead: false });

    res.json({ alerts, count: alerts.length, unreadCount });
  } catch (error) {
    console.error('Get alerts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// ─── POST /api/alerts/:alertId/mark-read ───────────────────────────
router.post('/:alertId/mark-read', auth, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    res.json({ success: true, alert });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ error: 'Failed to mark alert as read.' });
  }
});

// ─── POST /api/alerts/mark-all-read ────────────────────────────────
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, markedCount: result.modifiedCount });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    res.status(500).json({ error: 'Failed to mark alerts.' });
  }
});

// ─── DELETE /api/alerts/:alertId ───────────────────────────────────
router.delete('/:alertId', auth, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.alertId, userId: req.user._id });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    res.json({ success: true, message: 'Alert deleted.' });
  } catch (error) {
    console.error('Delete alert error:', error.message);
    res.status(500).json({ error: 'Failed to delete alert.' });
  }
});

module.exports = router;
