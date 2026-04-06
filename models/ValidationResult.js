const mongoose = require('mongoose');

/**
 * ValidationResult Schema for DataGuard
 * Stores individual validation findings for a given upload.
 * Each result represents one type of data quality issue found.
 */
const validationResultSchema = new mongoose.Schema(
  {
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upload',
      required: [true, 'Upload ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    validationType: {
      type: String,
      required: [true, 'Validation type is required'],
      enum: {
        values: ['null_values', 'duplicates', 'outliers', 'format', 'garbage'],
        message: '{VALUE} is not a valid validation type',
      },
    },
    affectedRows: {
      type: Number,
      default: 0,
      min: [0, 'Affected rows cannot be negative'],
    },
    affectedColumns: {
      type: [String],
      default: [],
    },
    severity: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid severity level',
      },
      default: 'LOW',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    samples: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // Stores up to 5 sample rows that exhibit the problem
    },
    suggestedFix: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fetching all results for a specific upload
validationResultSchema.index({ uploadId: 1, validationType: 1 });

const ValidationResult = mongoose.model('ValidationResult', validationResultSchema);

module.exports = ValidationResult;
