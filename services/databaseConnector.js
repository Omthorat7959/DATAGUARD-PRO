/**
 * Database Connector Service for DataGuard PRO
 * Handles connections to PostgreSQL, MySQL, and MongoDB.
 * Encrypts credentials at rest and decrypts only during active connections.
 */

const { encrypt, decrypt } = require('./encryptionHelper');

// ─── Validation ────────────────────────────────────────────────────

const DEFAULT_PORTS = { postgresql: 5432, mysql: 3306, mongodb: 27017 };

/**
 * Validate connection parameters before attempting a connection.
 * @param {string} type - Database type.
 * @param {string} host - Host address.
 * @param {number} port - Port number.
 * @param {string} database - Database name.
 * @param {string} username - Username.
 * @param {string} password - Password.
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateConnection = (type, host, port, database, username, password) => {
  const errors = [];

  if (!type || !['postgresql', 'mysql', 'mongodb'].includes(type)) {
    errors.push('Database type must be one of: postgresql, mysql, mongodb');
  }
  if (!host || typeof host !== 'string' || host.trim().length === 0) {
    errors.push('Host is required');
  }
  if (!port || port < 1 || port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }
  if (!database || typeof database !== 'string' || database.trim().length === 0) {
    errors.push('Database name is required');
  }

  return { valid: errors.length === 0, errors };
};

// ─── Credential Helpers ────────────────────────────────────────────

const encryptCredentials = (password) => encrypt(password);
const decryptCredentials = (encryptedPassword) => decrypt(encryptedPassword);

// ─── Connection Testers ────────────────────────────────────────────

/**
 * Test a database connection without persisting it.
 * @param {{ type, host, port, database, username, password }} config
 * @returns {Promise<{ success: boolean, message: string, connectedAt?: Date }>}
 */
const testConnection = async (config) => {
  const { type, host, port, database, username, password } = config;

  try {
    switch (type) {
      case 'postgresql':
        return await testPostgres(host, port, database, username, password);
      case 'mysql':
        return await testMySQL(host, port, database, username, password);
      case 'mongodb':
        return await testMongoDB(host, port, database, username, password);
      default:
        return { success: false, message: `Unsupported database type: ${type}` };
    }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
};

// ─── PostgreSQL ────────────────────────────────────────────────────

const testPostgres = async (host, port, database, username, password) => {
  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ host, port, database, user: username, password, connectionTimeoutMillis: 10000 });
    await client.connect();
    const result = await client.query('SELECT NOW() as connected_at');
    return { success: true, message: 'PostgreSQL connection successful', connectedAt: result.rows[0].connected_at };
  } catch (err) {
    return { success: false, message: `PostgreSQL error: ${err.message}` };
  } finally {
    if (client) try { await client.end(); } catch (_) {}
  }
};

const fetchPostgres = async (host, port, database, username, password, query, limit = 100) => {
  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ host, port, database, user: username, password, connectionTimeoutMillis: 10000 });
    await client.connect();
    const limitedQuery = `SELECT * FROM (${query}) AS _dg_sub LIMIT ${limit}`;
    const result = await client.query(limitedQuery);
    return { rows: result.rows, columnNames: result.fields.map((f) => f.name), rowCount: result.rowCount };
  } finally {
    if (client) try { await client.end(); } catch (_) {}
  }
};

// ─── MySQL ─────────────────────────────────────────────────────────

const testMySQL = async (host, port, database, username, password) => {
  let conn;
  try {
    const mysql = require('mysql2/promise');
    conn = await mysql.createConnection({ host, port, database, user: username, password, connectTimeout: 10000 });
    const [rows] = await conn.execute('SELECT NOW() as connected_at');
    return { success: true, message: 'MySQL connection successful', connectedAt: rows[0].connected_at };
  } catch (err) {
    return { success: false, message: `MySQL error: ${err.message}` };
  } finally {
    if (conn) try { await conn.end(); } catch (_) {}
  }
};

const fetchMySQL = async (host, port, database, username, password, query, limit = 100) => {
  let conn;
  try {
    const mysql = require('mysql2/promise');
    conn = await mysql.createConnection({ host, port, database, user: username, password, connectTimeout: 10000 });
    const limitedQuery = `SELECT * FROM (${query}) AS _dg_sub LIMIT ${limit}`;
    const [rows, fields] = await conn.execute(limitedQuery);
    return { rows, columnNames: fields.map((f) => f.name), rowCount: rows.length };
  } finally {
    if (conn) try { await conn.end(); } catch (_) {}
  }
};

// ─── MongoDB ───────────────────────────────────────────────────────

const testMongoDB = async (host, port, database, username, password) => {
  let client;
  try {
    const { MongoClient } = require('mongodb');
    let uri;
    if (username && password) {
      uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    } else {
      uri = `mongodb://${host}:${port}/${database}`;
    }
    client = new MongoClient(uri, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 });
    await client.connect();
    await client.db(database).command({ ping: 1 });
    return { success: true, message: 'MongoDB connection successful', connectedAt: new Date() };
  } catch (err) {
    return { success: false, message: `MongoDB error: ${err.message}` };
  } finally {
    if (client) try { await client.close(); } catch (_) {}
  }
};

const fetchMongoDB = async (host, port, database, username, password, query, limit = 100) => {
  let client;
  try {
    const { MongoClient } = require('mongodb');
    let uri;
    if (username && password) {
      uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    } else {
      uri = `mongodb://${host}:${port}/${database}`;
    }
    client = new MongoClient(uri, { connectTimeoutMS: 10000 });
    await client.connect();

    // query is expected to be a collection name for MongoDB
    const collectionName = query.trim();
    const rows = await client.db(database).collection(collectionName).find({}).limit(limit).toArray();
    const columnNames = rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== '_id') : [];
    return { rows, columnNames, rowCount: rows.length };
  } finally {
    if (client) try { await client.close(); } catch (_) {}
  }
};

// ─── Unified Fetch ─────────────────────────────────────────────────

/**
 * Fetch data from any supported database.
 * @param {{ type, host, port, database, username, password }} connection
 * @param {string} query - SQL query or MongoDB collection name.
 * @param {number} limit - Max rows to fetch.
 * @returns {Promise<{ rows, columnNames, rowCount }>}
 */
const fetchDataFromDatabase = async (connection, query, limit = 100) => {
  const { type, host, port, database, username, password } = connection;

  switch (type) {
    case 'postgresql':
      return fetchPostgres(host, port, database, username, password, query, limit);
    case 'mysql':
      return fetchMySQL(host, port, database, username, password, query, limit);
    case 'mongodb':
      return fetchMongoDB(host, port, database, username, password, query, limit);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
};

/**
 * Convenience wrapper: fetch a small sample for preview.
 */
const getSampleData = (connection, query, limit = 100) =>
  fetchDataFromDatabase(connection, query, limit);

module.exports = {
  testConnection,
  fetchDataFromDatabase,
  getSampleData,
  encryptCredentials,
  decryptCredentials,
  validateConnection,
  DEFAULT_PORTS,
};
