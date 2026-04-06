const express = require('express');
const auth = require('../middleware/auth');
const DataSource = require('../models/DataSource');
const {
  scheduleMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  getMonitoringHistory,
  runMonitoringCheck,
} = require('../services/monitoringEngine');

const router = express.Router();

// ─── POST /api/monitoring/:sourceId/start ──────────────────────────
router.post('/:sourceId/start', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found.' });

    const { schedule = 'daily' } = req.body;
    const validSchedules = ['hourly', 'daily', 'weekly', 'manual'];
    if (!validSchedules.includes(schedule)) {
      return res.status(400).json({ error: `Invalid schedule. Use: ${validSchedules.join(', ')}` });
    }

    const result = await scheduleMonitoring(source._id, schedule, req.user._id);

    res.json({
      success: true,
      status: 'monitoring_started',
      schedule,
      sourceName: source.name,
      firstCheck: result.firstRecord ? {
        qualityScore: result.firstRecord.qualityScore,
        problemCount: result.firstRecord.problemCount,
        trend: result.firstRecord.trend,
      } : null,
    });
  } catch (error) {
    console.error('Start monitoring error:', error.message);
    res.status(500).json({ error: 'Failed to start monitoring.', message: error.message });
  }
});

// ─── GET /api/monitoring/:sourceId/status ──────────────────────────
router.get('/:sourceId/status', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found.' });

    const status = await getMonitoringStatus(source._id);

    res.json({ success: true, sourceName: source.name, ...status });
  } catch (error) {
    console.error('Get monitoring status error:', error.message);
    res.status(500).json({ error: 'Failed to get monitoring status.' });
  }
});

// ─── GET /api/monitoring/:sourceId/history ─────────────────────────
router.get('/:sourceId/history', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found.' });

    const days = parseInt(req.query.days) || 30;
    const history = await getMonitoringHistory(source._id, days);

    res.json({ success: true, sourceName: source.name, ...history });
  } catch (error) {
    console.error('Get monitoring history error:', error.message);
    res.status(500).json({ error: 'Failed to get monitoring history.' });
  }
});

// ─── POST /api/monitoring/:sourceId/stop ───────────────────────────
router.post('/:sourceId/stop', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found.' });

    const stopped = stopMonitoring(source._id);

    res.json({
      success: true,
      status: stopped ? 'monitoring_stopped' : 'was_not_monitoring',
      sourceName: source.name,
    });
  } catch (error) {
    console.error('Stop monitoring error:', error.message);
    res.status(500).json({ error: 'Failed to stop monitoring.' });
  }
});

// ─── POST /api/monitoring/:sourceId/check-now ──────────────────────
router.post('/:sourceId/check-now', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found.' });

    const record = await runMonitoringCheck(source._id, req.user._id);

    res.json({
      success: true,
      sourceName: source.name,
      record: record ? {
        qualityScore: record.qualityScore,
        previousScore: record.previousScore,
        scoreDelta: record.scoreDelta,
        trend: record.trend,
        problemCount: record.problemCount,
        alertGenerated: record.alertGenerated,
      } : { message: 'No data to check (CSV sources don\'t support live re-check).' },
    });
  } catch (error) {
    console.error('Check now error:', error.message);
    res.status(500).json({ error: 'Monitoring check failed.', message: error.message });
  }
});

module.exports = router;
