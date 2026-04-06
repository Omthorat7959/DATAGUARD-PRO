'use client';

import { useState } from 'react';
import { testConnection, deleteConnection, fetchSampleData } from '../services/api';

const TYPE_LABELS = { postgresql: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB' };

const STATUS_BADGE = {
  connected:    { cls: 'badge-green', label: 'Connected', dot: '#34d399' },
  disconnected: { cls: 'badge-gray',  label: 'Disconnected', dot: '#9ca3af' },
  error:        { cls: 'badge-red',   label: 'Error', dot: '#f87171' },
};

export default function ConnectionList({ connections, onRefresh }) {
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sampleData, setSampleData] = useState(null);
  const [sampleConnId, setSampleConnId] = useState(null);
  const [sampleQuery, setSampleQuery] = useState('');
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState('');

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      await testConnection(id);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete connection "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteConnection(id);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFetchSample = async () => {
    setSampleLoading(true);
    setSampleError('');
    setSampleData(null);
    try {
      const data = await fetchSampleData(sampleConnId, sampleQuery);
      setSampleData(data);
    } catch (err) {
      setSampleError(err.message || 'Failed to fetch sample data.');
    } finally {
      setSampleLoading(false);
    }
  };

  if (connections.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔌</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          No connections yet. Add your first database connection above.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Host</th>
              <th>Database</th>
              <th>Status</th>
              <th>Last Connected</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => {
              const badge = STATUS_BADGE[c.connectionStatus] || STATUS_BADGE.disconnected;
              return (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className="badge badge-blue">{TYPE_LABELS[c.type] || c.type}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.host}:{c.port}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.database}</td>
                  <td>
                    <span className={`badge ${badge.cls}`}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: badge.dot, display: 'inline-block' }} />
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {c.lastConnected ? new Date(c.lastConnected).toLocaleString() : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm"
                        disabled={testingId === c._id} onClick={() => handleTest(c._id)}>
                        {testingId === c._id ? '...' : '🔄 Test'}
                      </button>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setSampleConnId(c._id); setSampleData(null); setSampleError(''); setSampleQuery(''); }}>
                        📋 Sample
                      </button>
                      <button className="btn btn-danger btn-sm"
                        disabled={deletingId === c._id} onClick={() => handleDelete(c._id, c.name)}>
                        {deletingId === c._id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sample Data Modal */}
      {sampleConnId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setSampleConnId(null)}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: 900, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 28 }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>📋 Fetch Sample Data</h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input className="input-field" placeholder="SQL query or collection name..."
                value={sampleQuery} onChange={(e) => setSampleQuery(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" disabled={!sampleQuery || sampleLoading} onClick={handleFetchSample}>
                {sampleLoading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Fetching...</> : 'Fetch'}
              </button>
            </div>

            {sampleError && <div className="alert alert-error" style={{ marginBottom: 12 }}>❌ {sampleError}</div>}

            {sampleData && sampleData.rows && sampleData.rows.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Showing {sampleData.rowCount} rows × {sampleData.columnNames.length} columns
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>{sampleData.columnNames.map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {sampleData.rows.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          {sampleData.columnNames.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setSampleConnId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
