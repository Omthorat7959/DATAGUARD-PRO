const mongoose = require('mongoose');

/**
 * DataSource Schema for DataGuard PRO
 * Represents a named data feed — either a CSV upload or a live database query.
 * Tracks sync history and quality scores over time.
 */
const dataSourceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DataConnection',
      default: null,
      // null for CSV uploads; set for database queries
    },
    name: {
      type: String,
      required: [true, 'Data source name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    sourceType: {
      type: String,
      required: [true, 'Source type is required'],
      enum: {
        values: ['csv_upload', 'database_query', 'api_endpoint'],
        message: '{VALUE} is not a supported source type',
      },
    },
    query: {
      type: String,
      default: '',
      // SQL query for database_query sources
    },
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upload',
      default: null,
      // Reference to Upload document for CSV sources
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    syncSchedule: {
      type: String,
      enum: {
        values: ['manual', 'hourly', 'daily', 'weekly'],
        message: '{VALUE} is not a valid sync schedule',
      },
      default: 'manual',
    },
    isMonitoring: {
      type: Boolean,
      default: false,
    },
    monitoringStatus: {
      type: String,
      enum: {
        values: ['healthy', 'warning', 'critical'],
        message: '{VALUE} is not a valid monitoring status',
      },
      default: 'healthy',
    },
    lastDataQualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    qualityHistory: {
      type: [
        {
          score: Number,
          date: { type: Date, default: Date.now },
          totalProblems: Number,
        },
      ],
      default: [],
    },
    rowCount: { type: Number, default: 0 },
    columnNames: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

dataSourceSchema.index({ userId: 1, createdAt: -1 });

const DataSource = mongoose.model('DataSource', dataSourceSchema);

module.exports = DataSource;
