const mongoose = require('mongoose');

/**
 * DataConnection Schema for DataGuard PRO
 * Stores encrypted database connection credentials for PostgreSQL, MySQL, and MongoDB.
 */
const dataConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Connection name is required'],
      trim: true,
      maxlength: [100, 'Connection name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      required: [true, 'Database type is required'],
      enum: {
        values: ['postgresql', 'mysql', 'mongodb'],
        message: '{VALUE} is not a supported database type',
      },
    },
    host: {
      type: String,
      required: [true, 'Host is required'],
      trim: true,
    },
    port: {
      type: Number,
      required: [true, 'Port is required'],
      min: [1, 'Port must be a positive number'],
      max: [65535, 'Port cannot exceed 65535'],
    },
    database: {
      type: String,
      required: [true, 'Database name is required'],
      trim: true,
    },
    username: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      default: '',
      // Stored encrypted via encryptionHelper
    },
    connectionString: {
      type: String,
      default: '',
      // Alternative to individual host/port/db fields
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastConnected: {
      type: Date,
      default: null,
    },
    connectionStatus: {
      type: String,
      enum: {
        values: ['connected', 'disconnected', 'error'],
        message: '{VALUE} is not a valid connection status',
      },
      default: 'disconnected',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user's connections
dataConnectionSchema.index({ userId: 1, name: 1 });

/**
 * Override toJSON to strip password from API responses.
 */
dataConnectionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const DataConnection = mongoose.model('DataConnection', dataConnectionSchema);

module.exports = DataConnection;
