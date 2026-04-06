'use client';

import { useState, useEffect, useCallback } from 'react';
import DataSourceForm from '../../../components/DataSourceForm';
import {
  getDataSources,
  createDataSource,
  validateDataSource,
  deleteDataSource,
} from '../../../services/api';

const STATUS_MAP = {
  healthy:  { cls: 'badge-green',  label: 'Healthy' },
  warning:  { cls: 'badge-yellow', label: 'Warning' },
  critical: { cls: 'badge-red',    label: 'Critical' },
};

const TYPE_LABEL = {
  csv_upload: '📁 CSV',
  database_query: '🔌 Database',
  api_endpoint: '🌐 API',
};

export default function DataSourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [validatingId, setValidatingId] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const loadSources = useCallback(async () => {
    try {
      const data = await getDataSources();
      setSources(data.dataSources || []);
    } catch (err) {
      console.error('Failed to load data sources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleCreate = async (config) => {
    await createDataSource(config);
    setShowForm(false);
    setSuccessMsg('Data source created!');
    setTimeout(() => setSuccessMsg(''), 4000);
    loadSources();
  };

  const handleValidate = async (id) => {
    setValidatingId(id);
    setValidationResult(null);
    try {
      const result = await validateDataSource(id);
      setValidationResult({ id, ...result });
      loadSources();
    } catch (err) {
      setValidationResult({ id, error: err.message || 'Validation failed.' });
    } finally {
      setValidatingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete data source "${name}"?`)) return;
    try {
      await deleteDataSource(id);
      loadSources();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 50) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            📊 Data Sources
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Create data sources from CSV uploads or database queries, then validate.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Source'}
        </button>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {successMsg}</div>}

      {showForm && (
        <div style={{ marginBottom: 28 }}>
          <DataSourceForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Validation result popup */}
      {validationResult && (
        <div className={`glass-card animate-fade-in`} style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>
              {validationResult.error ? '❌ Validation Failed' : '✅ Validation Complete'}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setValidationResult(null)}>✕ Close</button>
          </div>

          {validationResult.error ? (
            <div className="alert alert-error">{validationResult.error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: getScoreColor(validationResult.qualityScore) }}>
                  {validationResult.qualityScore}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Quality Score</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{validationResult.rowCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Rows Analyzed</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-red)' }}>{validationResult.totalProblems}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Issues Found</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{validationResult.durationMs}ms</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Duration</div>
              </div>
            </div>
          )}

          {/* Validation detail */}
          {validationResult.validations && validationResult.validations.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Issues Breakdown</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                {validationResult.validations.map((v, i) => (
                  <div key={i} className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {v.validationType?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 10 }}>
                        {v.affectedColumns?.join(', ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.affectedRows} rows</span>
                      <span className={`badge badge-${v.severity === 'HIGH' ? 'red' : v.severity === 'MEDIUM' ? 'yellow' : 'green'}`}>
                        {v.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sources list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading data sources...</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            No data sources yet. Create your first one above.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Quality Score</th>
                <th>Status</th>
                <th>Last Synced</th>
                <th>Rows</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const status = STATUS_MAP[s.monitoringStatus] || STATUS_MAP.healthy;
                return (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{TYPE_LABEL[s.sourceType] || s.sourceType}</td>
                    <td>
                      {s.lastDataQualityScore != null ? (
                        <span style={{ fontWeight: 700, color: getScoreColor(s.lastDataQualityScore) }}>
                          {s.lastDataQualityScore}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.rowCount || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-success btn-sm"
                          disabled={validatingId === s._id} onClick={() => handleValidate(s._id)}>
                          {validatingId === s._id ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Validating...</> : '🔍 Validate'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id, s.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
