const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  type: { type: String, enum: ['quality_drop', 'anomaly', 'error', 'team_invite', 'monitoring'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
