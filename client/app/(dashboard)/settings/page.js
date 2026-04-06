'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProfile, updateProfile, changePassword,
  generateApiKeyRequest, listApiKeys, deleteApiKey, revokeApiKey,
  getUsageStats, deleteAccount,
} from '../../../services/api';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';

const TABS = [
  { id: 'profile',  label: 'Profile',     icon: '👤' },
  { id: 'security', label: 'Security',    icon: '🔒' },
  { id: 'apikeys',  label: 'API Keys',    icon: '🔑' },
  { id: 'usage',    label: 'Usage',       icon: '📊' },
  { id: 'danger',   label: 'Danger Zone', icon: '⚠️' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('profile');

  // ─── Profile state ───────────────────────────────────
  const [profile, setProfile] = useState({ firstName: '', lastName: '', theme: 'dark', emailNotifications: true });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // ─── Password state ──────────────────────────────────
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });

  // ─── API Keys state ──────────────────────────────────
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [keysLoading, setKeysLoading] = useState(false);

  // ─── Usage state ─────────────────────────────────────
  const [usage, setUsage] = useState(null);

  // ─── Danger state ────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadProfile();
    loadKeys();
    loadUsage();
  }, []);

  // ─── Loaders ─────────────────────────────────────────
  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data.profile);
    } catch (e) { console.error(e); }
  };

  const loadKeys = async () => {
    try {
      const data = await listApiKeys();
      setKeys(data.keys || []);
    } catch (e) { console.error(e); }
  };

  const loadUsage = async () => {
    try {
      const data = await getUsageStats();
      setUsage(data.usage);
    } catch (e) { console.error(e); }
  };

  // ─── Profile handlers ───────────────────────────────
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    try {
      await updateProfile(profile);
      setProfileMsg('✓ Profile saved successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e) {
      setProfileMsg('✗ ' + (e.error || 'Failed to save.'));
    } finally {
      setProfileLoading(false);
    }
  };

  // ─── Password handlers ──────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg({ text: '', type: '' });
    try {
      await changePassword(pw.current, pw.new, pw.confirm);
      setPwMsg({ text: '✓ Password changed successfully!', type: 'success' });
      setPw({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPwMsg({ text: err.error || 'Failed to change password.', type: 'error' });
    } finally {
      setPwLoading(false);
    }
  };

  // ─── API Key handlers ───────────────────────────────
  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    setKeysLoading(true);
    try {
      const data = await generateApiKeyRequest(newKeyName.trim());
      setGeneratedKey(data.apiKey);
      setNewKeyName('');
      loadKeys();
    } catch (e) {
      alert(e.error || 'Failed to generate key.');
    } finally {
      setKeysLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    alert('API key copied to clipboard!');
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await deleteApiKey(keyId);
      loadKeys();
    } catch (e) { alert(e.error || 'Failed.'); }
  };

  const handleRevokeKey = async (keyId) => {
    try {
      await revokeApiKey(keyId);
      loadKeys();
    } catch (e) { alert(e.error || 'Failed.'); }
  };

  // ─── Delete account handler ─────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword);
      localStorage.removeItem('dg_token');
      localStorage.removeItem('dg_user');
      router.push('/');
    } catch (err) {
      setDeleteError(err.error || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────
  const timeAgo = (date) => {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-0.03em' }}>
        ⚙️ Settings
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 24px' }}>
        Manage your account, security, and API access.
      </p>

      {/* ─── Tab Bar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        background: 'var(--bg-secondary)', borderRadius: 12, padding: 4,
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: '0 0 auto', padding: '10px 18px', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: tab === t.id ? 700 : 500,
              fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              background: tab === t.id ? 'var(--accent-blue)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PROFILE TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 620 }}>
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 20 }}>👤 Profile Information</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="input-label">First Name</label>
                <input className="input-field" placeholder="John"
                  value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <input className="input-field" placeholder="Doe"
                  value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Email Address</label>
              <input className="input-field" value={profile.email || ''} disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Theme</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['dark', 'light'].map(t => (
                  <button key={t} onClick={() => setProfile({ ...profile, theme: t })}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
                      background: profile.theme === t ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: profile.theme === t ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}>
                    {t === 'dark' ? '🌙 ' : '☀️ '}{t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>🔔 Notifications</h2>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              fontSize: '0.85rem',
            }}>
              <input type="checkbox" checked={profile.emailNotifications}
                onChange={e => setProfile({ ...profile, emailNotifications: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-blue)' }} />
              Receive email notifications for alerts and team invitations
            </label>
          </div>

          {profileMsg && (
            <div className={`alert ${profileMsg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}
              style={{ marginBottom: 16 }}>
              {profileMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={loadProfile}>Discard</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECURITY TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'security' && (
        <div style={{ maxWidth: 520 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 20 }}>🔒 Change Password</h2>

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Current Password</label>
                <input type="password" className="input-field" placeholder="••••••••"
                  value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required />
              </div>

              <div style={{ marginBottom: 4 }}>
                <label className="input-label">New Password</label>
                <input type="password" className="input-field" placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={pw.new} onChange={e => setPw({ ...pw, new: e.target.value })} required />
                <PasswordStrengthMeter password={pw.new} />
              </div>

              <div style={{ marginBottom: 20, marginTop: 16 }}>
                <label className="input-label">Confirm New Password</label>
                <input type="password" className="input-field" placeholder="Re-enter new password"
                  value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required />
                {pw.confirm && pw.new !== pw.confirm && (
                  <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 4 }}>Passwords don't match</div>
                )}
              </div>

              {pwMsg.text && (
                <div className={`alert ${pwMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}
                  style={{ marginBottom: 16 }}>
                  {pwMsg.text}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                {pwLoading ? 'Updating...' : '🔐 Update Password'}
              </button>
            </form>
          </div>

          <div className="glass-card" style={{ padding: 28, marginTop: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>📱 Two-Factor Authentication</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 16px' }}>
              Add an extra layer of security to your account.
            </p>
            <div style={{
              background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '12px 16px',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              🚧 Two-factor authentication is coming in a future update.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* API KEYS TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'apikeys' && (
        <div>
          {/* Generate */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>🔑 Generate New API Key</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-field" placeholder="Key name (e.g., Production API)"
                value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleGenerateKey} disabled={keysLoading || !newKeyName.trim()}>
                {keysLoading ? 'Generating...' : '✨ Generate'}
              </button>
            </div>

            {/* Show generated key ONCE */}
            {generatedKey && (
              <div style={{
                marginTop: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  ⚠️ Copy this key now — it won't be shown again!
                </div>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <code style={{
                    flex: 1, background: 'var(--bg-primary)', padding: '10px 14px',
                    borderRadius: 8, fontSize: '0.8rem', fontFamily: 'monospace',
                    wordBreak: 'break-all', color: '#34d399',
                  }}>
                    {generatedKey}
                  </code>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyKey}
                    style={{ whiteSpace: 'nowrap' }}>
                    📋 Copy
                  </button>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, fontSize: '0.7rem' }}
                  onClick={() => setGeneratedKey(null)}>
                  ✓ I've copied it — dismiss
                </button>
              </div>
            )}
          </div>

          {/* Existing Keys */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              📋 Your API Keys ({keys.length}/5)
            </h2>

            {keys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No API keys yet. Generate one above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Key</th>
                      <th>Created</th>
                      <th>Last Used</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(k => (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 600 }}>{k.name}</td>
                        <td>
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {k.prefix}
                          </code>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {k.lastUsedAt ? timeAgo(k.lastUsedAt) : 'Never'}
                        </td>
                        <td>
                          <span className={`badge ${k.isActive ? 'badge-green' : 'badge-red'}`}>
                            {k.isActive ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }}
                            onClick={() => handleRevokeKey(k.id)}>
                            {k.isActive ? '⏸ Revoke' : '▶ Activate'}
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}
                            onClick={() => handleDeleteKey(k.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* API Docs */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>📖 API Usage</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
              Use your API key to upload CSV files programmatically:
            </p>
            <pre style={{
              background: 'var(--bg-primary)', borderRadius: 10, padding: 16,
              fontSize: '0.78rem', overflowX: 'auto', color: '#e2e8f0',
              lineHeight: 1.6, border: '1px solid var(--border-color)',
            }}>
{`# Upload a CSV file
curl -X POST ${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':5000') : 'http://localhost:5000'}/api/upload \\
  -H "X-API-Key: sk-dataguard-your-key-here" \\
  -F "file=@data.csv"

# Check health
curl ${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':5000') : 'http://localhost:5000'}/health`}
            </pre>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* USAGE TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'usage' && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16, marginBottom: 24,
          }}>
            {[
              { icon: '📁', value: usage?.totalUploads ?? 0, label: 'Files Uploaded', color: 'rgba(59,130,246,0.1)' },
              { icon: '✓', value: usage?.totalValidations ?? 0, label: 'Validations Run', color: 'rgba(16,185,129,0.1)' },
              { icon: '📊', value: usage?.averageQualityScore != null ? `${usage.averageQualityScore}%` : '—', label: 'Avg Quality', color: 'rgba(139,92,246,0.1)' },
              { icon: '🔧', value: usage?.fixesApplied ?? 0, label: 'Fixes Detected', color: 'rgba(245,158,11,0.1)' },
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{
                padding: '20px 24px', background: stat.color,
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Time Saved */}
          <div className="glass-card" style={{
            padding: 28, marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))',
          }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>⏱️ Time Saved</h2>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.03em' }}>
              ~{usage?.estimatedTimeSaved ?? 0} hours
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>
              Based on {usage?.fixesApplied ?? 0} issues detected × 8 hours average manual debugging each.
            </p>
          </div>

          {/* Activity */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>📅 Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last upload</span>
                <span style={{ fontWeight: 600 }}>{usage?.lastUploadAt ? timeAgo(usage.lastUploadAt) : 'Never'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Member since</span>
                <span style={{ fontWeight: 600 }}>{usage?.memberSince ? new Date(usage.memberSince).toLocaleDateString() : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total data sources</span>
                <span style={{ fontWeight: 600 }}>{usage?.totalDataSources ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total alerts received</span>
                <span style={{ fontWeight: 600 }}>{usage?.totalAlerts ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* DANGER ZONE TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '2px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 16, padding: 28,
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171', marginBottom: 8 }}>
              ⚠️ Danger Zone
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px' }}>
              Actions here are <strong>permanent and cannot be undone</strong>.
            </p>

            {deleteStep === 0 && (
              <>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, padding: 16,
                  marginBottom: 20, fontSize: '0.82rem', color: 'var(--text-secondary)',
                }}>
                  <strong style={{ color: '#f87171' }}>Deleting your account will:</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
                    <li>Delete all your uploads and validation results</li>
                    <li>Delete all your data sources and connections</li>
                    <li>Remove all team invitations you've sent</li>
                    <li>Delete all your alerts</li>
                    <li>Revoke all API keys</li>
                    <li><strong>This cannot be undone.</strong></li>
                  </ul>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ color: '#f87171' }}>
                    Type DELETE to confirm
                  </label>
                  <input className="input-field" placeholder="DELETE"
                    value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
                </div>
                <button className="btn btn-danger"
                  disabled={deleteConfirm !== 'DELETE'}
                  onClick={() => setDeleteStep(1)}>
                  🗑️ Delete My Account
                </button>
              </>
            )}

            {deleteStep === 1 && (
              <>
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <strong>Are you absolutely sure?</strong> This will permanently delete your account and all data.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Enter your password to confirm</label>
                  <input type="password" className="input-field" placeholder="Your current password"
                    value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
                </div>
                {deleteError && (
                  <div className="alert alert-error" style={{ marginBottom: 16 }}>{deleteError}</div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-danger" onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}>
                    {deleteLoading ? 'Deleting...' : '⚠️ Yes, delete everything'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setDeleteStep(0); setDeleteConfirm(''); setDeletePassword(''); }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
