/**
 * DataGuard PRO — Server Entry Point
 *
 * Enterprise data quality validation platform.
 * CSV Uploads + Live Database Connections → Validate → Show Problems → Suggest Fixes.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Import route handlers
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const connectionRoutes = require('./routes/connections');
const dataSourceRoutes = require('./routes/dataSources');
const analysisRoutes = require('./routes/analysis');
const monitoringRoutes = require('./routes/monitoring');
const teamRoutes = require('./routes/team');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────

// CORS — allow Vercel frontend + localhost in development
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) return cb(null, true);
    cb(null, true); // be permissive for now; tighten in production
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (compact)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== '/health') {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// ─── Health Check ──────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    node: process.version,
  });
});

// ─── Routes ────────────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found.',
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message);
  res.status(err.status || 500).json({
    error: 'Internal server error.',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
  });
});

// ─── Start Server ──────────────────────────────────────────────────

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🛡️  DataGuard PRO Server`);
      console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Port        : ${PORT}`);
      console.log(`   Health      : http://localhost:${PORT}/health`);
      console.log(`   Ready for requests!\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
