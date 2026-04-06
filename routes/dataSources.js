const express = require('express');
const auth = require('../middleware/auth');
const DataSource = require('../models/DataSource');
const DataConnection = require('../models/DataConnection');
const Upload = require('../models/Upload');
const ValidationResult = require('../models/ValidationResult');
const { decryptCredentials } = require('../services/databaseConnector');
const { getSampleData } = require('../services/databaseConnector');
const { validateCSV } = require('../services/validator');

const router = express.Router();

// ─── POST /api/data-sources ────────────────────────────────────────
// Create a new data source.
router.post('/', auth, async (req, res) => {
  try {
    const { name, sourceType, connectionId, query, syncSchedule } = req.body;

    if (!name || !sourceType) {
      return res.status(400).json({ error: 'Validation error.', message: 'Name and source type are required.' });
    }

    // For database_query sources, validate connection + query
    if (sourceType === 'database_query') {
      if (!connectionId) {
        return res.status(400).json({ error: 'Validation error.', message: 'Connection ID is required for database sources.' });
      }
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Validation error.', message: 'Query is required for database sources.' });
      }

      // Verify connection exists and belongs to user
      const connection = await DataConnection.findOne({ _id: connectionId, userId: req.user._id });
      if (!connection) {
        return res.status(404).json({ error: 'Not found.', message: 'Connection not found.' });
      }
    }

    const dataSource = new DataSource({
      userId: req.user._id,
      connectionId: sourceType === 'database_query' ? connectionId : null,
      name,
      sourceType,
      query: query || '',
      syncSchedule: syncSchedule || 'manual',
    });

    await dataSource.save();

    res.status(201).json({
      success: true,
      sourceId: dataSource._id,
      message: `Data source "${name}" created.`,
      dataSource,
    });
  } catch (error) {
    console.error('Create data source error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to create data source.' });
  }
});

// ─── GET /api/data-sources ─────────────────────────────────────────
// List all data sources for the user.
router.get('/', auth, async (req, res) => {
  try {
    const sources = await DataSource.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('connectionId', 'name type host database connectionStatus');

    res.json({ dataSources: sources, count: sources.length });
  } catch (error) {
    console.error('List data sources error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to fetch data sources.' });
  }
});

// ─── GET /api/data-sources/:id ─────────────────────────────────────
// Get a single data source with its validation history.
router.get('/:id', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('connectionId', 'name type host database connectionStatus');

    if (!source) {
      return res.status(404).json({ error: 'Not found.', message: 'Data source not found.' });
    }

    // Fetch recent validation results if there's an uploadId
    let validations = [];
    if (source.uploadId) {
      validations = await ValidationResult.find({ uploadId: source.uploadId }).sort({ createdAt: -1 });
    }

    res.json({ dataSource: source, validations, qualityHistory: source.qualityHistory.slice(-10) });
  } catch (error) {
    console.error('Get data source error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to fetch data source.' });
  }
});

// ─── POST /api/data-sources/:id/validate ───────────────────────────
// Trigger validation on a data source (fetch from DB, run validations).
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.id, userId: req.user._id });
    if (!source) {
      return res.status(404).json({ error: 'Not found.', message: 'Data source not found.' });
    }

    let rows = [];
    let columnNames = [];

    if (source.sourceType === 'database_query' && source.connectionId) {
      // Fetch data from database
      const connection = await DataConnection.findById(source.connectionId);
      if (!connection) {
        return res.status(404).json({ error: 'Not found.', message: 'Associated connection not found.' });
      }

      const decryptedPassword = connection.password ? decryptCredentials(connection.password) : '';

      const data = await getSampleData(
        {
          type: connection.type,
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: decryptedPassword,
        },
        source.query,
        1000 // Fetch up to 1000 rows for validation
      );

      rows = data.rows;
      columnNames = data.columnNames;
    } else if (source.uploadId) {
      // Use stored CSV data
      const upload = await Upload.findById(source.uploadId);
      if (!upload) {
        return res.status(404).json({ error: 'Not found.', message: 'Upload data not found.' });
      }
      rows = upload.rawData || [];
      columnNames = upload.columnNames || [];
    } else {
      return res.status(400).json({ error: 'No data.', message: 'No data available to validate. Upload a CSV or configure a database query.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Empty data.', message: 'No rows returned from the data source.' });
    }

    // Run validations
    const report = validateCSV(rows);

    // Save validation results
    const savedResults = [];
    for (const v of report.validations) {
      const affected = v.affectedRows || v.count || 0;
      if (affected > 0) {
        const doc = new ValidationResult({
          uploadId: source.uploadId || source._id,
          userId: req.user._id,
          validationType: v.type,
          affectedRows: affected,
          affectedColumns: v.columns || [],
          severity: affected / rows.length > 0.2 ? 'HIGH' : affected / rows.length > 0.05 ? 'MEDIUM' : 'LOW',
          details: v,
          samples: v.samples || [],
          suggestedFix: v.suggestedFix || '',
        });
        await doc.save();
        savedResults.push(doc);
      }
    }

    // Update data source quality history
    source.lastDataQualityScore = report.qualityScore;
    source.lastSyncedAt = new Date();
    source.rowCount = rows.length;
    source.columnNames = columnNames.length > 0 ? columnNames : (rows.length > 0 ? Object.keys(rows[0]) : []);
    source.monitoringStatus = report.qualityScore >= 80 ? 'healthy' : report.qualityScore >= 50 ? 'warning' : 'critical';
    source.qualityHistory.push({ score: report.qualityScore, date: new Date(), totalProblems: report.totalProblems });
    await source.save();

    res.json({
      success: true,
      qualityScore: report.qualityScore,
      totalProblems: report.totalProblems,
      validations: savedResults,
      rowCount: rows.length,
      columnCount: source.columnNames.length,
      durationMs: report.durationMs,
    });
  } catch (error) {
    console.error('Validate data source error:', error.message);
    res.status(500).json({ error: 'Server error.', message: `Validation failed: ${error.message}` });
  }
});

// ─── DELETE /api/data-sources/:id ──────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const source = await DataSource.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!source) {
      return res.status(404).json({ error: 'Not found.', message: 'Data source not found.' });
    }
    res.json({ success: true, message: `Data source "${source.name}" deleted.` });
  } catch (error) {
    console.error('Delete data source error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to delete data source.' });
  }
});

module.exports = router;
