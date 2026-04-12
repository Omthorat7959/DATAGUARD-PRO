'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUploads, getUpload } from '../../services/api';

export default function UploadsPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadUploads = useCallback(async () => {
    try {
      const data = await getUploads();
      setUploads(data.uploads || []);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const viewDetails = async (id) => {
    setDetailLoading(true);
    try {
      const data = await getUpload(id);
      setSelectedUpload(data);
    } catch (err) {
      console.error('Failed to load upload details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getScoreColor = (v) => {
    if (!v || v.length === 0) return 'var(--text-muted)';
    const total = v.reduce((s, x) => s + (x.affectedRows || 0), 0);
    if (total === 0) return 'var(--accent-green)';
    if (total < 10) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          📁 CSV Uploads
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          View your recent CSV uploads and validation results.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
        </div>
      ) : uploads.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📁</div>
          <p style={{ color: 'var(--text-secondary)' }}>No uploads yet. Upload a CSV via Data Sources.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Rows</th>
                <th>Columns</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.filename}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(u.fileSize / 1024).toFixed(1)} KB</td>
                  <td>{u.rowCount}</td>
                  <td>{u.columnNames?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${u.status === 'validated' ? 'green' : u.status === 'validating' ? 'yellow' : 'gray'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {new Date(u.uploadedAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => viewDetails(u._id)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selectedUpload && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setSelectedUpload(null)}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: 800, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 28 }}
            onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} /></div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>📄 {selectedUpload.upload?.filename}</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUpload(null)}>✕ Close</button>
                </div>

                {selectedUpload.validations?.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {selectedUpload.validations.map((v, i) => (
                      <div key={i} className="glass-card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{v.validationType?.replace(/_/g, ' ')}</span>
                          <span className={`badge badge-${v.severity === 'HIGH' ? 'red' : v.severity === 'MEDIUM' ? 'yellow' : 'green'}`}>{v.severity}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                          {v.affectedRows} rows affected in columns: {v.affectedColumns?.join(', ') || '—'}
                        </p>
                        {v.suggestedFix && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', margin: 0 }}>
                            💡 {v.suggestedFix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-success">✅ No issues found. Data quality looks great!</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
