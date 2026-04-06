'use client';

import { useState } from 'react';
import { testNewConnection } from '../services/api';

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017 },
];

export default function ConnectionForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'postgresql', host: 'localhost', port: 5432,
    database: '', username: '', password: '',
  });
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key, value) => {
    const next = { ...form, [key]: value };
    // Auto-update port when type changes
    if (key === 'type') {
      const match = DB_TYPES.find((d) => d.value === value);
      if (match) next.port = match.defaultPort;
    }
    setForm(next);
    setTestStatus(null); // Reset test when form changes
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const result = await testNewConnection(form);
      setTestStatus(result.success ? 'success' : 'error');
      setTestMessage(result.message);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Failed to save connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
      <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem' }}>➕</span> New Database Connection
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Connection Name - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="input-label">Connection Name</label>
          <input className="input-field" placeholder="e.g., Production Orders DB"
            value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>

        {/* Database Type */}
        <div>
          <label className="input-label">Database Type</label>
          <select className="select-field" value={form.type} onChange={(e) => update('type', e.target.value)}>
            {DB_TYPES.map((db) => (
              <option key={db.value} value={db.value}>{db.label}</option>
            ))}
          </select>
        </div>

        {/* Port */}
        <div>
          <label className="input-label">Port</label>
          <input className="input-field" type="number" placeholder="5432"
            value={form.port} onChange={(e) => update('port', parseInt(e.target.value) || '')} />
        </div>

        {/* Host - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="input-label">Host</label>
          <input className="input-field" placeholder="localhost or db.example.com"
            value={form.host} onChange={(e) => update('host', e.target.value)} />
        </div>

        {/* Database */}
        <div>
          <label className="input-label">Database Name</label>
          <input className="input-field" placeholder="mydb"
            value={form.database} onChange={(e) => update('database', e.target.value)} />
        </div>

        {/* Username */}
        <div>
          <label className="input-label">Username</label>
          <input className="input-field" placeholder="db_user"
            value={form.username} onChange={(e) => update('username', e.target.value)} />
        </div>

        {/* Password */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="input-label">Password</label>
          <input className="input-field" type="password" placeholder="••••••••"
            value={form.password} onChange={(e) => update('password', e.target.value)} />
        </div>
      </div>

      {/* Test result */}
      {testStatus && testStatus !== 'testing' && (
        <div className={`alert ${testStatus === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 18 }}>
          {testStatus === 'success' ? '✅' : '❌'} {testMessage}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        <button className="btn btn-secondary" onClick={handleTest} disabled={testStatus === 'testing' || !form.host || !form.database}>
          {testStatus === 'testing' ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Testing...</> : '🔍 Test Connection'}
        </button>
        <button className="btn btn-primary" onClick={handleSave}
          disabled={testStatus !== 'success' || saving || !form.name}>
          {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Connection'}
        </button>
      </div>
    </div>
  );
}
