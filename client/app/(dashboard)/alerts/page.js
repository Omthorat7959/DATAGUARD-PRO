'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '../../../services/api';

const SEVERITY_STYLE = {
  critical: { cls: 'badge-red', icon: '🔴', color: 'var(--accent-red)' },
  warning: { cls: 'badge-yellow', icon: '🟡', color: 'var(--accent-yellow)' },
  info: { cls: 'badge-blue', icon: '🔵', color: 'var(--accent-blue)' },
};

const TYPE_ICONS = {
  quality_drop: '📉', anomaly: '⚠️', error: '❌', team_invite: '👥', monitoring: '📡',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | critical | warning | info
  const [unreadCount, setUnreadCount] = useState(0);

  const loadAlerts = useCallback(async () => {
    try {
      const filters = {};
      if (filter === 'unread') filters.isRead = 'false';
      else if (['critical', 'warning', 'info'].includes(filter)) filters.severity = filter;

      const data = await getAlerts(filters);
      setAlerts(data.alerts || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleMarkRead = async (alertId) => {
    try {
      await markAlertRead(alertId);
      loadAlerts();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      loadAlerts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (alertId) => {
    try {
      await deleteAlert(alertId);
      loadAlerts();
    } catch (err) { console.error(err); }
  };

  const timeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            🔔 Alert Center
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            ✅ Mark All Read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 10,
        padding: 4, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'critical', label: '🔴 Critical' },
          { key: 'warning', label: '🟡 Warning' },
          { key: 'info', label: '🔵 Info' },
        ].map((f) => (
          <button key={f.key} onClick={() => { setFilter(f.key); setLoading(true); }}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              background: filter === f.key ? 'var(--accent-blue)' : 'transparent',
              color: filter === f.key ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s', minWidth: 80,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {filter === 'all' ? 'No alerts yet. They\'ll appear when monitoring detects issues.' : `No ${filter} alerts.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {alerts.map((alert) => {
            const sev = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
            return (
              <div key={alert._id} className="glass-card" style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                borderLeft: alert.isRead ? 'none' : `3px solid ${sev.color}`,
                opacity: alert.isRead ? 0.7 : 1,
              }}>
                {/* Icon */}
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                  {TYPE_ICONS[alert.type] || '🔔'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alert.title}</span>
                    <span className={`badge ${sev.cls}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      {alert.severity}
                    </span>
                    {!alert.isRead && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)',
                        display: 'inline-block', flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {alert.message}
                  </p>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    {timeSince(alert.createdAt)}
                    {alert.sourceId?.name && ` • ${alert.sourceId.name}`}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!alert.isRead && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleMarkRead(alert._id)}
                      style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                      ✓ Read
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(alert._id)}
                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
