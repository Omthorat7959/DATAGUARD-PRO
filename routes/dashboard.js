const express = require('express');
const auth = require('../middleware/auth');
const Upload = require('../models/Upload');
const DataSource = require('../models/DataSource');
const DataConnection = require('../models/DataConnection');
const ValidationResult = require('../models/ValidationResult');
const TeamMember = require('../models/TeamMember');
const Alert = require('../models/Alert');

const router = express.Router();

// ─── GET /api/dashboard ───────────────────────────────────────────
// Aggregated stats for the user's personal dashboard.
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Run all queries in parallel for speed
    const [
      uploads,
      dataSources,
      connections,
      validationResults,
      teamMembers,
      unreadAlerts,
    ] = await Promise.all([
      Upload.find({ userId }).sort({ uploadedAt: -1 }).select('-rawData').lean(),
      DataSource.find({ userId }).sort({ createdAt: -1 }).lean(),
      DataConnection.find({ userId }).select('-password').lean(),
      ValidationResult.find({ userId }).lean(),
      TeamMember.find({ ownerId: userId }).lean(),
      Alert.countDocuments({ userId, isRead: false }),
    ]);

    // ─── Quick Stats ────────────────────────────────────────────
    const totalUploads = uploads.length;
    const totalDataSources = dataSources.length;
    const totalConnections = connections.length;
    const totalTeamMembers = teamMembers.length;

    // Average quality score (from data sources that have one)
    const sourcesWithScore = dataSources.filter(s => s.lastDataQualityScore != null);
    const avgQuality = sourcesWithScore.length > 0
      ? Math.round(sourcesWithScore.reduce((sum, s) => sum + s.lastDataQualityScore, 0) / sourcesWithScore.length)
      : null;

    // Total problems found
    const totalProblems = validationResults.reduce((sum, v) => sum + (v.affectedRows || 0), 0);

    // Total fixes applied (validated uploads = "fixes applied" via validation)
    const fixesApplied = validationResults.filter(v => v.suggestedFix).length;

    // Quality trend (last 7 data points from all sources)
    const qualityTrend = [];
    for (const src of dataSources) {
      if (src.qualityHistory && src.qualityHistory.length > 0) {
        for (const entry of src.qualityHistory.slice(-7)) {
          qualityTrend.push({
            score: entry.score,
            date: entry.date,
            source: src.name,
          });
        }
      }
    }
    qualityTrend.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ─── Recent Activity (last 10 uploads) ──────────────────────
    const recentActivity = uploads.slice(0, 10).map(upload => {
      // Find validation results for this upload
      const valResults = validationResults.filter(
        v => String(v.uploadId) === String(upload._id)
      );
      const totalIssues = valResults.reduce((sum, v) => sum + (v.affectedRows || 0), 0);

      // Find matching data source for quality score
      const matchingSrc = dataSources.find(
        s => s.uploadId && String(s.uploadId) === String(upload._id)
      );

      return {
        id: upload._id,
        filename: upload.filename,
        rowCount: upload.rowCount,
        columnCount: upload.columnNames?.length || 0,
        status: upload.status,
        qualityScore: matchingSrc?.lastDataQualityScore ?? null,
        problemsFound: totalIssues,
        issueCount: valResults.length,
        uploadedAt: upload.uploadedAt || upload.createdAt,
      };
    });

    // ─── Data Sources Summary ───────────────────────────────────
    const sourcesSummary = dataSources.map(s => ({
      id: s._id,
      name: s.name,
      sourceType: s.sourceType,
      lastSyncedAt: s.lastSyncedAt,
      lastDataQualityScore: s.lastDataQualityScore,
      monitoringStatus: s.monitoringStatus || 'inactive',
      rowCount: s.rowCount,
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      stats: {
        totalUploads,
        totalDataSources,
        totalConnections,
        totalTeamMembers,
        avgQuality,
        totalProblems,
        fixesApplied,
        unreadAlerts,
        estimatedTimeSaved: fixesApplied * 8, // hrs
      },
      qualityTrend: qualityTrend.slice(-14),
      recentActivity,
      sourcesSummary,
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ error: 'Failed to load dashboard.', message: error.message });
  }
});

module.exports = router;
