const express = require('express');
const auth = require('../middleware/auth');
const DataSource = require('../models/DataSource');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const Alert = require('../models/Alert');

const router = express.Router();

// ─── POST /api/team/:sourceId/invite ───────────────────────────────
router.post('/:sourceId/invite', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found or you are not the owner.' });

    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Use: ${validRoles.join(', ')}` });
    }

    // Can't invite yourself
    if (email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot invite yourself.' });
    }

    // Check if already invited
    const existing = await TeamMember.findOne({ sourceId: source._id, invitedEmail: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'This email has already been invited.' });
    }

    // Check if the invited user exists
    const invitedUser = await User.findOne({ email: email.toLowerCase() });

    const member = new TeamMember({
      sourceId: source._id,
      ownerId: req.user._id,
      userId: invitedUser?._id || null,
      invitedEmail: email.toLowerCase(),
      role,
      status: invitedUser ? 'accepted' : 'pending',
      acceptedAt: invitedUser ? new Date() : null,
    });

    await member.save();

    // Create alert for the invited user if they exist
    if (invitedUser) {
      await new Alert({
        sourceId: source._id,
        userId: invitedUser._id,
        severity: 'info',
        type: 'team_invite',
        title: 'Team Invitation',
        message: `You've been added as ${role} on "${source.name}" by ${req.user.email}.`,
        metadata: { role, sourceName: source.name, invitedBy: req.user.email },
      }).save();
    }

    res.status(201).json({
      success: true,
      message: invitedUser ? `${email} added as ${role}.` : `Invitation sent to ${email} (pending signup).`,
      member: { email: member.invitedEmail, role: member.role, status: member.status },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This email has already been invited.' });
    }
    console.error('Invite error:', error.message);
    res.status(500).json({ error: 'Failed to send invitation.' });
  }
});

// ─── GET /api/team/:sourceId/members ───────────────────────────────
router.get('/:sourceId/members', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found or you are not the owner.' });

    const members = await TeamMember.find({ sourceId: source._id })
      .sort({ createdAt: -1 });

    // Add owner as first entry
    const ownerEntry = {
      email: req.user.email,
      role: 'owner',
      status: 'accepted',
      joinedAt: source.createdAt,
      isOwner: true,
    };

    const memberList = [ownerEntry, ...members.map((m) => ({
      id: m._id,
      email: m.invitedEmail,
      role: m.role,
      status: m.status,
      joinedAt: m.acceptedAt || m.invitedAt,
      isOwner: false,
    }))];

    res.json({ success: true, members: memberList, count: memberList.length, sourceName: source.name });
  } catch (error) {
    console.error('Get members error:', error.message);
    res.status(500).json({ error: 'Failed to fetch team members.' });
  }
});

// ─── PUT /api/team/:sourceId/member/:memberId/role ─────────────────
router.put('/:sourceId/member/:memberId/role', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found or you are not the owner.' });

    const { role } = req.body;
    const validRoles = ['viewer', 'editor', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Use: ${validRoles.join(', ')}` });
    }

    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.memberId, sourceId: source._id },
      { role },
      { new: true }
    );

    if (!member) return res.status(404).json({ error: 'Team member not found.' });

    res.json({ success: true, message: `Role updated to ${role}.`, member: { email: member.invitedEmail, role: member.role } });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ─── DELETE /api/team/:sourceId/member/:email ──────────────────────
router.delete('/:sourceId/member/:email', auth, async (req, res) => {
  try {
    const source = await DataSource.findOne({ _id: req.params.sourceId, userId: req.user._id });
    if (!source) return res.status(404).json({ error: 'Data source not found or you are not the owner.' });

    const removed = await TeamMember.findOneAndDelete({
      sourceId: source._id,
      invitedEmail: req.params.email.toLowerCase(),
    });

    if (!removed) return res.status(404).json({ error: 'Team member not found.' });

    res.json({ success: true, message: `${req.params.email} removed from team.` });
  } catch (error) {
    console.error('Remove member error:', error.message);
    res.status(500).json({ error: 'Failed to remove team member.' });
  }
});

module.exports = router;
