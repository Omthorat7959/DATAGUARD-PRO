'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  getDataSources,
  startMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  getMonitoringHistory,
} from '../../../services/api';

const QualityTrendChart = dynamic(() => import('../../../components/QualityTrendChart'), { ssr: false });

const TREND_ICON = { improving: '📈', declining: '📉', stable: '➡️' };
const TREND_COLOR = { improving: 'var(--accent-green)', declining: 'var(--accent-red)', stable: 'var(--text-muted)' };

export default function MonitoringPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [selectedChart, setSelectedChart] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState('');

  // New monitoring form
  const [selectedSource, setSelectedSource] = useState('');
  const [schedule, setSchedule] = useState('daily');

  const loadSources = useCallback(async () => {
    try {
      const data = await getDataSources();
      setSources(data.dataSources || []);
      // Load status for each source
      for (const s of (data.dataSources || [])) {
        try {
          const status = await getMonitoringStatus(s._id);
          setStatusMap((prev) => ({ ...prev, [s._id]: status }));
        } catch { /* ignore */ }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleStart = async () => {
    if (!selectedSource) return;
    setActionLoading('start');
    try {
      await startMonitoring(selectedSource, schedule);
      setMsg('Monitoring started!');
      setTimeout(() => setMsg(''), 3000);
      loadSources();
    } catch (err) { setMsg(`Error: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleStop = async (sourceId) => {
    setActionLoading(sourceId);
    try {
      await stopMonitoring(sourceId);
      setMsg('Monitoring stopped.');
      setTimeout(() => setMsg(''), 3000);
      loadSources();
    } catch (err) { setMsg(`Error: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleViewChart = async (sourceId) => {
    if (selectedChart === sourceId) { setSelectedChart(null); return; }
    try {
      const history = await getMonitoringHistory(sourceId, 7);
      setHistoryMap((prev) => ({ ...prev, [sourceId]: history }));
      setSelectedChart(sourceId);
    } catch (err) { console.error(err); }
  };

  const getScoreColor = (s) => s >= 80 ? 'var(--accent-green)' : s >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          📡 Real-Time Monitoring
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Schedule automated quality checks and track trends over time.
        </p>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 20 }}>
        {msg.startsWith('Error') ? '❌' : '✅'} {msg}
      </div>}

      {/* Start monitoring form */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem' }}>🚀 Start New Monitoring</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">Data Source</label>
            <select className="select-field" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
              <option value="">Choose a data source...</option>
              {sources.filter((s) => s.sourceType === 'database_query').map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 160 }}>
            <label className="input-label">Schedule</label>
            <select className="select-field" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="hourly">⏰ Hourly</option>
              <option value="daily">📅 Daily</option>
              <option value="weekly">📆 Weekly</option>
              <option value="manual">🖐 Manual</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleStart} disabled={actionLoading === 'start' || !selectedSource}>
            {actionLoading === 'start' ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Starting...</> : '▶️ Start'}
          </button>
        </div>
      </div>

      {/* Active monitoring sources */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
        </div>
      ) : sources.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📡</div>
          <p style={{ color: 'var(--text-secondary)' }}>No data sources to monitor. Create a database query source first.</p>
        </div>
      ) : (
        <div>
          <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem' }}>Monitored Sources</h3>
          {sources.map((s) => {
            const status = statusMap[s._id] || {};
            const isMonitoring = status.isMonitoring;
            const history = historyMap[s._id];

            return (
              <div key={s._id} className="glass-card" style={{ padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.sourceType === 'database_query' ? '🔌 Database' : '📁 CSV'} •
                        Last: {status.lastCheck ? new Date(status.lastCheck).toLocaleString() : '—'} •
                        Checks: {status.totalChecks || 0}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Score */}
                    {status.qualityScore != null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getScoreColor(status.qualityScore) }}>
                          {status.qualityScore}%
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SCORE</div>
                      </div>
                    )}

                    {/* Trend */}
                    {status.trend && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem' }}>{TREND_ICON[status.trend]}</div>
                        <div style={{ fontSize: '0.65rem', color: TREND_COLOR[status.trend], fontWeight: 600, textTransform: 'capitalize' }}>
                          {status.trend}
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    <span className={`badge ${isMonitoring ? 'badge-green' : 'badge-gray'}`}>
                      {isMonitoring ? '🟢 Active' : '⬜ Inactive'}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleViewChart(s._id)}>
                        {selectedChart === s._id ? '✕ Close' : '📊 Chart'}
                      </button>
                      {isMonitoring ? (
                        <button className="btn btn-danger btn-sm" onClick={() => handleStop(s._id)}
                          disabled={actionLoading === s._id}>
                          ⏹ Stop
                        </button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => { setSelectedSource(s._id); handleStart(); }}>
                          ▶️ Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart */}
                {selectedChart === s._id && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      7-Day Quality Trend
                      {history?.overallTrend && (
                        <span style={{ marginLeft: 10, color: TREND_COLOR[history.overallTrend] }}>
                          ({TREND_ICON[history.overallTrend]} {history.overallTrend})
                        </span>
                      )}
                    </div>
                    <QualityTrendChart records={history?.records || []} height={250} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
