/**
 * DataGuard PRO — Monitoring Engine
 *
 * Schedules periodic data quality checks using node-cron.
 * Tracks quality trends and fires alerts on significant drops.
 */

const cron = require('node-cron');
const DataSource = require('../models/DataSource');
const DataConnection = require('../models/DataConnection');
const MonitoringRecord = require('../models/MonitoringRecord');
const Alert = require('../models/Alert');
const { validateCSV } = require('./validator');
const { decryptCredentials, getSampleData } = require('./databaseConnector');

// Active cron jobs: Map<sourceId, cronJob>
const activeJobs = new Map();

// ─── Cron expressions ──────────────────────────────────────────────

const CRON_SCHEDULES = {
  hourly: '0 * * * *',      // Every hour at :00
  daily: '0 9 * * *',       // Every day at 9:00 AM
  weekly: '0 9 * * 1',      // Every Monday at 9:00 AM
  manual: null,              // No auto-schedule
};

// ─── Run a single monitoring check ─────────────────────────────────

const runMonitoringCheck = async (sourceId, userId) => {
  try {
    const source = await DataSource.findById(sourceId);
    if (!source) {
      console.error(`Monitoring: Source ${sourceId} not found.`);
      return null;
    }

    let rows = [];
    let columnNames = [];

    // Fetch data based on source type
    if (source.sourceType === 'database_query' && source.connectionId) {
      const connection = await DataConnection.findById(source.connectionId);
      if (!connection) throw new Error('Connection not found.');

      const decryptedPassword = connection.password ? decryptCredentials(connection.password) : '';
      const data = await getSampleData(
        { type: connection.type, host: connection.host, port: connection.port, database: connection.database, username: connection.username, password: decryptedPassword },
        source.query,
        1000
      );
      rows = data.rows;
      columnNames = data.columnNames;
    } else {
      // For CSV sources, use stored data (no re-fetch needed)
      return null;
    }

    if (rows.length === 0) return null;

    // Run validation
    const report = validateCSV(rows);

    // Get previous record for trend comparison
    const previousRecord = await MonitoringRecord.findOne({ sourceId })
      .sort({ timestamp: -1 });

    const previousScore = previousRecord?.qualityScore ?? null;
    const scoreDelta = previousScore !== null ? report.qualityScore - previousScore : 0;
    const trend = scoreDelta > 2 ? 'improving' : scoreDelta < -2 ? 'declining' : 'stable';

    // Save monitoring record
    const record = new MonitoringRecord({
      sourceId,
      userId,
      qualityScore: report.qualityScore,
      previousScore,
      scoreDelta,
      problemCount: report.totalProblems,
      affectedRows: report.validations.reduce((s, v) => s + (v.affectedRows || v.count || 0), 0),
      totalRows: rows.length,
      trend,
      validationSummary: {
        types: report.validations.map((v) => ({ type: v.type, count: v.affectedRows || v.count || 0 })),
        qualityScore: report.qualityScore,
      },
    });

    await record.save();

    // Update source quality
    source.lastDataQualityScore = report.qualityScore;
    source.lastSyncedAt = new Date();
    source.rowCount = rows.length;
    source.columnNames = columnNames.length > 0 ? columnNames : (rows.length > 0 ? Object.keys(rows[0]) : []);
    source.monitoringStatus = report.qualityScore >= 80 ? 'healthy' : report.qualityScore >= 50 ? 'warning' : 'critical';
    source.qualityHistory.push({ score: report.qualityScore, date: new Date(), totalProblems: report.totalProblems });
    await source.save();

    // Generate alert if quality drops > 10%
    if (previousScore !== null && scoreDelta <= -10) {
      const alert = new Alert({
        sourceId,
        userId,
        severity: scoreDelta <= -20 ? 'critical' : 'warning',
        type: 'quality_drop',
        title: `Quality Drop: ${source.name}`,
        message: `Quality score dropped from ${previousScore}% to ${report.qualityScore}% (${scoreDelta.toFixed(1)}% change). ${report.totalProblems} issues found.`,
        metadata: { previousScore, currentScore: report.qualityScore, delta: scoreDelta, problemCount: report.totalProblems },
      });
      await alert.save();
      record.alertGenerated = true;
      await record.save();
    }

    console.log(`📊 Monitoring check: ${source.name} → Score: ${report.qualityScore}% (${trend})`);
    return record;
  } catch (error) {
    console.error(`Monitoring check failed for ${sourceId}:`, error.message);

    // Create error alert
    try {
      await new Alert({
        sourceId,
        userId,
        severity: 'critical',
        type: 'error',
        title: 'Monitoring Error',
        message: `Monitoring check failed: ${error.message}`,
      }).save();
    } catch (alertErr) {
      console.error('Failed to create error alert:', alertErr.message);
    }

    return null;
  }
};

// ─── Schedule Monitoring ───────────────────────────────────────────

const scheduleMonitoring = async (sourceId, schedule, userId) => {
  // Stop existing job if any
  stopMonitoring(sourceId);

  const cronExpression = CRON_SCHEDULES[schedule];
  if (!cronExpression) {
    // Manual mode: run once immediately but don't schedule
    const record = await runMonitoringCheck(sourceId, userId);
    return { status: 'manual_check_complete', record };
  }

  // Create cron job
  const job = cron.schedule(cronExpression, async () => {
    await runMonitoringCheck(sourceId, userId);
  });

  activeJobs.set(String(sourceId), { job, schedule, userId, startedAt: new Date() });

  // Run first check immediately
  const firstRecord = await runMonitoringCheck(sourceId, userId);

  return { status: 'monitoring_started', schedule, firstRecord };
};

// ─── Stop Monitoring ───────────────────────────────────────────────

const stopMonitoring = (sourceId) => {
  const key = String(sourceId);
  const entry = activeJobs.get(key);
  if (entry) {
    entry.job.stop();
    activeJobs.delete(key);
    return true;
  }
  return false;
};

// ─── Get Monitoring Status ─────────────────────────────────────────

const getMonitoringStatus = async (sourceId) => {
  const key = String(sourceId);
  const entry = activeJobs.get(key);
  const isMonitoring = !!entry;

  const lastRecord = await MonitoringRecord.findOne({ sourceId }).sort({ timestamp: -1 });
  const recordCount = await MonitoringRecord.countDocuments({ sourceId });

  return {
    isMonitoring,
    schedule: entry?.schedule || 'manual',
    startedAt: entry?.startedAt || null,
    lastCheck: lastRecord?.timestamp || null,
    qualityScore: lastRecord?.qualityScore ?? null,
    previousScore: lastRecord?.previousScore ?? null,
    scoreDelta: lastRecord?.scoreDelta ?? 0,
    trend: lastRecord?.trend || 'stable',
    totalChecks: recordCount,
  };
};

// ─── Get Monitoring History ────────────────────────────────────────

const getMonitoringHistory = async (sourceId, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await MonitoringRecord.find({
    sourceId,
    timestamp: { $gte: since },
  }).sort({ timestamp: 1 });

  // Calculate overall trend
  let overallTrend = 'stable';
  if (records.length >= 2) {
    const first = records[0].qualityScore;
    const last = records[records.length - 1].qualityScore;
    const diff = last - first;
    overallTrend = diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }

  return { records, count: records.length, overallTrend, days };
};

module.exports = {
  scheduleMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  getMonitoringHistory,
  runMonitoringCheck,
};
