'use client';

import { useState, useEffect } from 'react';
import { getConnections, uploadCSV } from '../services/api';

export default function DataSourceForm({ onSave, onCancel }) {
  const [sourceType, setSourceType] = useState('csv_upload');
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [query, setQuery] = useState('');
  const [syncSchedule, setSyncSchedule] = useState('manual');
  const [file, setFile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getConnections()
      .then((data) => setConnections(data.connections || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setUploadResult(null);

    try {
      if (sourceType === 'csv_upload') {
        if (!file) throw { message: 'Please select a CSV file.' };
        // Upload CSV first, then create data source
        const uploadData = await uploadCSV(file);
        setUploadResult(uploadData);
        await onSave({
          name: name || file.name,
          sourceType: 'csv_upload',
          syncSchedule: 'manual',
          uploadId: uploadData.uploadId,
        });
      } else {
        if (!connectionId) throw { message: 'Please select a database connection.' };
        if (!query) throw { message: 'Please enter a query.' };
        await onSave({ name, sourceType, connectionId, query, syncSchedule });
      }
    } catch (err) {
      setError(err.message || 'Failed to create data source.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
      <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem' }}>📊</span> Create Data Source
      </h3>

      {/* Source type toggle */}
      <div style={{
        display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10,
        padding: 4, marginBottom: 24,
      }}>
        {[
          { value: 'csv_upload', label: '📁 CSV Upload' },
          { value: 'database_query', label: '🔌 Database Query' },
        ].map((opt) => (
          <button key={opt.value} onClick={() => { setSourceType(opt.value); setError(''); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
              background: sourceType === opt.value ? 'var(--accent-blue)' : 'transparent',
              color: sourceType === opt.value ? '#fff' : 'var(--text-muted)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Name */}
      <div style={{ marginBottom: 18 }}>
        <label className="input-label">Source Name</label>
        <input className="input-field" placeholder="e.g., Daily Orders Feed"
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* CSV mode */}
      {sourceType === 'csv_upload' && (
        <div style={{ marginBottom: 18 }}>
          <label className="input-label">Upload CSV File</label>
          <div style={{
            border: '2px dashed var(--border-color)', borderRadius: 12, padding: '28px 20px',
            textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
          }}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-color)'; setFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('csv-input').click()}>
            <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])} />
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
            {file ? (
              <p style={{ color: 'var(--accent-green)', fontWeight: 600, margin: 0 }}>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            ) : (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                Drop a CSV file here, or <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>click to browse</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Database query mode */}
      {sourceType === 'database_query' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label className="input-label">Database Connection</label>
              <select className="select-field" value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
                <option value="">Select a connection...</option>
                {connections.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Sync Schedule</label>
              <select className="select-field" value={syncSchedule} onChange={(e) => setSyncSchedule(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="input-label">SQL Query / Collection Name</label>
            <textarea className="input-field" rows={4}
              placeholder="SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'"
              value={query} onChange={(e) => setQuery(e.target.value)}
              style={{ resize: 'vertical', minHeight: 80 }} />
          </div>
        </>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>❌ {error}</div>}

      {uploadResult && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✅ Uploaded {uploadResult.summary?.rowCount} rows × {uploadResult.summary?.columnCount} columns — Quality: {uploadResult.summary?.qualityScore}%
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {onCancel && <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !name}>
          {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : '🚀 Create Source'}
        </button>
      </div>
    </div>
  );
}
