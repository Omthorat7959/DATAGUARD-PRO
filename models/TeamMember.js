const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  invitedEmail: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });

teamMemberSchema.index({ sourceId: 1, invitedEmail: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
