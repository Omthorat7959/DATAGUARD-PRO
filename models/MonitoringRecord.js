const mongoose = require('mongoose');

const monitoringRecordSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  qualityScore: { type: Number, required: true, min: 0, max: 100 },
  previousScore: { type: Number, default: null },
  scoreDelta: { type: Number, default: 0 },
  problemCount: { type: Number, default: 0 },
  affectedRows: { type: Number, default: 0 },
  totalRows: { type: Number, default: 0 },
  trend: { type: String, enum: ['improving', 'declining', 'stable'], default: 'stable' },
  aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  validationSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
  alertGenerated: { type: Boolean, default: false },
}, { timestamps: true });

monitoringRecordSchema.index({ sourceId: 1, timestamp: -1 });

module.exports = mongoose.model('MonitoringRecord', monitoringRecordSchema);
