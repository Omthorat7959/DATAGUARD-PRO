'use client';

import { useState, useEffect, useCallback } from 'react';
import ConnectionForm from '../../../components/ConnectionForm';
import ConnectionList from '../../../components/ConnectionList';
import { getConnections, addConnection } from '../../../services/api';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadConnections = useCallback(async () => {
    try {
      const data = await getConnections();
      setConnections(data.connections || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleSave = async (config) => {
    const result = await addConnection(config);
    setShowForm(false);
    setSuccessMsg(result.message || 'Connection saved!');
    setTimeout(() => setSuccessMsg(''), 4000);
    loadConnections();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            🔌 Database Connections
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Connect to PostgreSQL, MySQL, or MongoDB to validate live data.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Connection'}
        </button>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {successMsg}</div>}

      {/* Form */}
      {showForm && (
        <div style={{ marginBottom: 28 }}>
          <ConnectionForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Connection List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading connections...</p>
        </div>
      ) : (
        <ConnectionList connections={connections} onRefresh={loadConnections} />
      )}
    </div>
  );
}
