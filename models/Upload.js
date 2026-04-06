const mongoose = require('mongoose');

/**
 * Upload Schema for DataGuard
 * Tracks CSV file uploads and their metadata.
 * Stores the first 100 rows of raw data for quick reference.
 */
const uploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    rowCount: {
      type: Number,
      default: 0,
      min: [0, 'Row count cannot be negative'],
    },
    columnNames: {
      type: [String],
      default: [],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['uploaded', 'validating', 'validated', 'processed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'uploaded',
    },
    rawData: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // Stores first 100 rows for quick reference / preview
    },
    originalData: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // Store all original, unmodified data
    },
    cleanedData: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // Store all data after fixes applied
    },
    originalValidationResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    currentValidationResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fixesApplied: [
      {
        type: { type: String, required: true }, // Problem type (e.g., 'NULL_VALUES')
        appliedAt: { type: Date, default: Date.now },
        rowsAffected: { type: Number, default: 0 },
        qualityBefore: { type: Number, default: 0 },
        qualityAfter: { type: Number, default: 0 },
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups: user's uploads sorted by date
uploadSchema.index({ userId: 1, uploadedAt: -1 });

const Upload = mongoose.model('Upload', uploadSchema);

module.exports = Upload;
