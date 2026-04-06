const express = require('express');
const auth = require('../middleware/auth');
const DataConnection = require('../models/DataConnection');
const {
  testConnection,
  fetchDataFromDatabase,
  getSampleData,
  encryptCredentials,
  decryptCredentials,
  validateConnection,
  DEFAULT_PORTS,
} = require('../services/databaseConnector');

const router = express.Router();

// Simple in-memory rate limiter for connection tests (per-user, 5 per minute)
const testRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

const checkTestRateLimit = (userId) => {
  const now = Date.now();
  const key = String(userId);
  const entry = testRateLimit.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  }
  entry.count++;
  testRateLimit.set(key, entry);
  return entry.count <= RATE_LIMIT_MAX;
};

// ─── POST /api/connections ─────────────────────────────────────────
// Create a new database connection after testing it.
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, host, port, database, username, password } = req.body;

    // Validate input
    if (!name || !type) {
      return res.status(400).json({ error: 'Validation error.', message: 'Name and database type are required.' });
    }

    const resolvedPort = port || DEFAULT_PORTS[type] || 5432;

    const validation = validateConnection(type, host, resolvedPort, database, username, password);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation error.', message: validation.errors.join('; ') });
    }

    // Test the connection before saving
    const testResult = await testConnection({ type, host, port: resolvedPort, database, username, password });

    if (!testResult.success) {
      return res.status(400).json({
        error: 'Connection failed.',
        message: testResult.message,
        connectionStatus: 'error',
      });
    }

    // Encrypt password before storing
    const encryptedPassword = password ? encryptCredentials(password) : '';

    const connection = new DataConnection({
      userId: req.user._id,
      name,
      type,
      host,
      port: resolvedPort,
      database,
      username: username || '',
      password: encryptedPassword,
      isActive: true,
      lastConnected: testResult.connectedAt || new Date(),
      connectionStatus: 'connected',
    });

    await connection.save();

    res.status(201).json({
      success: true,
      connectionId: connection._id,
      message: `Connection "${name}" saved successfully.`,
      connection: connection.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Duplicate.', message: 'A connection with this name already exists.' });
    }
    console.error('Create connection error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to create connection.' });
  }
});

// ─── GET /api/connections ──────────────────────────────────────────
// List all connections for the authenticated user (no passwords).
router.get('/', auth, async (req, res) => {
  try {
    const connections = await DataConnection.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-password');

    res.json({ connections, count: connections.length });
  } catch (error) {
    console.error('List connections error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to fetch connections.' });
  }
});

// ─── GET /api/connections/:id ──────────────────────────────────────
// Get single connection details (no password).
router.get('/:id', auth, async (req, res) => {
  try {
    const connection = await DataConnection.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select('-password');

    if (!connection) {
      return res.status(404).json({ error: 'Not found.', message: 'Connection not found.' });
    }

    res.json({ connection });
  } catch (error) {
    console.error('Get connection error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to fetch connection.' });
  }
});

// ─── POST /api/connections/:id/test ────────────────────────────────
// Test if an existing connection still works.
router.post('/:id/test', auth, async (req, res) => {
  try {
    if (!checkTestRateLimit(req.user._id)) {
      return res.status(429).json({ error: 'Rate limited.', message: 'Too many test requests. Try again in a minute.' });
    }

    const connection = await DataConnection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!connection) {
      return res.status(404).json({ error: 'Not found.', message: 'Connection not found.' });
    }

    const decryptedPassword = connection.password ? decryptCredentials(connection.password) : '';

    const result = await testConnection({
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: decryptedPassword,
    });

    // Update connection status in DB
    connection.connectionStatus = result.success ? 'connected' : 'error';
    connection.lastConnected = result.success ? (result.connectedAt || new Date()) : connection.lastConnected;
    connection.errorMessage = result.success ? '' : result.message;
    await connection.save();

    res.json({ success: result.success, message: result.message, connectedAt: result.connectedAt });
  } catch (error) {
    console.error('Test connection error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to test connection.' });
  }
});

// ─── POST /api/connections/test-new ────────────────────────────────
// Test a connection config without saving it first (for the form).
router.post('/test-new', auth, async (req, res) => {
  try {
    if (!checkTestRateLimit(req.user._id)) {
      return res.status(429).json({ error: 'Rate limited.', message: 'Too many test requests. Try again in a minute.' });
    }

    const { type, host, port, database, username, password } = req.body;
    const resolvedPort = port || DEFAULT_PORTS[type] || 5432;

    const validation = validateConnection(type, host, resolvedPort, database, username, password);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation error.', message: validation.errors.join('; ') });
    }

    const result = await testConnection({ type, host, port: resolvedPort, database, username, password });

    res.json({ success: result.success, message: result.message, connectedAt: result.connectedAt });
  } catch (error) {
    console.error('Test new connection error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to test connection.' });
  }
});

// ─── DELETE /api/connections/:id ───────────────────────────────────
// Delete a connection.
router.delete('/:id', auth, async (req, res) => {
  try {
    const connection = await DataConnection.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!connection) {
      return res.status(404).json({ error: 'Not found.', message: 'Connection not found.' });
    }

    res.json({ success: true, message: `Connection "${connection.name}" deleted.` });
  } catch (error) {
    console.error('Delete connection error:', error.message);
    res.status(500).json({ error: 'Server error.', message: 'Failed to delete connection.' });
  }
});

// ─── POST /api/connections/:id/fetch-sample ────────────────────────
// Fetch 100 sample rows from a connection.
router.post('/:id/fetch-sample', auth, async (req, res) => {
  try {
    const connection = await DataConnection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!connection) {
      return res.status(404).json({ error: 'Not found.', message: 'Connection not found.' });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query.', message: 'Provide a query or collection name.' });
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
      query,
      100
    );

    res.json({ success: true, rows: data.rows, columnNames: data.columnNames, rowCount: data.rowCount });
  } catch (error) {
    console.error('Fetch sample error:', error.message);
    res.status(500).json({ error: 'Server error.', message: `Failed to fetch sample data: ${error.message}` });
  }
});

module.exports = router;
