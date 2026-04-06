'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDataSources,
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole,
} from '../../../services/api';

const ROLE_STYLE = {
  owner: { cls: 'badge-blue', label: 'Owner' },
  admin: { cls: 'badge-red', label: 'Admin' },
  editor: { cls: 'badge-yellow', label: 'Editor' },
  viewer: { cls: 'badge-gray', label: 'Viewer' },
};

export default function TeamPage() {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [sourceName, setSourceName] = useState('');

  useEffect(() => {
    getDataSources()
      .then((d) => {
        setSources(d.dataSources || []);
        if (d.dataSources?.length > 0) setSelectedSource(d.dataSources[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMembers = useCallback(async () => {
    if (!selectedSource) return;
    try {
      const data = await getTeamMembers(selectedSource);
      setMembers(data.members || []);
      setSourceName(data.sourceName || '');
    } catch (err) { console.error(err); }
  }, [selectedSource]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail || !selectedSource) return;
    setInviting(true);
    setError('');
    setMsg('');
    try {
      const data = await inviteTeamMember(selectedSource, inviteEmail, inviteRole);
      setMsg(data.message);
      setInviteEmail('');
      loadMembers();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setError(err.error || err.message || 'Failed to invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (email) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    try {
      await removeTeamMember(selectedSource, email);
      loadMembers();
    } catch (err) { alert(err.message); }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRole(selectedSource, memberId, newRole);
      loadMembers();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          👥 Team Collaboration
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Invite team members to view and manage data sources together.
        </p>
      </div>

      {/* Source selector */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <label className="input-label">Select Data Source</label>
        <select className="select-field" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
          <option value="">Choose a data source...</option>
          {sources.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedSource && (
        <>
          {/* Invite form */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem' }}>
              ✉️ Invite Team Member {sourceName && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>to {sourceName}</span>}
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" placeholder="teammate@company.com"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div style={{ width: 140 }}>
                <label className="input-label">Role</label>
                <select className="select-field" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="viewer">👁️ Viewer</option>
                  <option value="editor">✏️ Editor</option>
                  <option value="admin">🔑 Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Inviting...</> : '📨 Send Invite'}
              </button>
            </div>

            {msg && <div className="alert alert-success" style={{ marginTop: 12 }}>✅ {msg}</div>}
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>❌ {error}</div>}
          </div>

          {/* Members list */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                Team Members ({members.length})
              </h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const role = ROLE_STYLE[m.role] || ROLE_STYLE.viewer;
                  return (
                    <tr key={m.id || i}>
                      <td style={{ fontWeight: m.isOwner ? 700 : 500 }}>
                        {m.email}
                        {m.isOwner && <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginLeft: 8 }}>👑 You</span>}
                      </td>
                      <td>
                        {m.isOwner ? (
                          <span className={`badge ${role.cls}`}>{role.label}</span>
                        ) : (
                          <select className="select-field" value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.78rem', borderRadius: 8 }}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${m.status === 'accepted' ? 'badge-green' : 'badge-yellow'}`}>
                          {m.status === 'accepted' ? '✅ Active' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!m.isOwner && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m.email)}>
                            🗑️ Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
