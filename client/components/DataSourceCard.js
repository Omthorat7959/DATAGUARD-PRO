'use client';

import { useRouter } from 'next/navigation';

/**
 * DataSourceCard — Card for a single data source in the dashboard / my-data page.
 * Props: { source, onValidate, onDelete, onMonitor }
 */
export default function DataSourceCard({ source, onValidate, onDelete, onMonitor }) {
  const router = useRouter();

  const scoreColor = (score) => {
    if (score == null) return { text: 'var(--text-muted)', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.25)' };
    if (score >= 80) return { text: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' };
    if (score >= 50) return { text: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)' };
    return { text: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)' };
  };

  const sc = scoreColor(source.lastDataQualityScore);
  const typeIcon = source.sourceType === 'csv_upload' ? '📁' : source.sourceType === 'database_query' ? '🗄️' : '📊';
  const typeLabel = source.sourceType === 'csv_upload' ? 'CSV' : source.sourceType === 'database_query' ? 'Database' : source.sourceType;

  const statusColors = {
    healthy:  { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
    warning:  { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    critical: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
    inactive: { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
  };
  const st = statusColors[source.monitoringStatus] || statusColors.inactive;

  return (
    <div className="glass-card" style={{
      padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{typeIcon}</span>
            {source.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span style={{
              background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
              padding: '2px 8px', borderRadius: 6, fontWeight: 600,
            }}>
              {typeLabel}
            </span>
            {source.rowCount && (
              <span>{source.rowCount.toLocaleString()} rows</span>
            )}
          </div>
        </div>

        {/* Quality Score Badge */}
        <div style={{
          background: sc.bg, border: `1px solid ${sc.border}`,
          borderRadius: 12, padding: '8px 14px', textAlign: 'center',
          minWidth: 70,
        }}>
          <div style={{
            fontSize: '1.3rem', fontWeight: 800, color: sc.text,
            lineHeight: 1.1,
          }}>
            {source.lastDataQualityScore != null ? `${source.lastDataQualityScore}%` : '—'}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
            QUALITY
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>
          📅 Created {new Date(source.createdAt).toLocaleDateString()}
        </span>
        {source.lastSyncedAt && (
          <span>
            🔄 Synced {new Date(source.lastSyncedAt).toLocaleDateString()}
          </span>
        )}
        <span style={{
          background: st.bg, color: st.color,
          padding: '1px 8px', borderRadius: 6, fontWeight: 600,
        }}>
          {source.monitoringStatus || 'inactive'}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        {onValidate && (
          <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }}
            onClick={() => onValidate(source.id)}>
            ✓ Validate
          </button>
        )}
        {onMonitor && (
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}
            onClick={() => onMonitor(source.id)}>
            📡 Monitor
          </button>
        )}
        <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}
          onClick={() => router.push(`/team`)}>
          👥 Team
        </button>
        <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}
          onClick={() => router.push(`/analysis`)}>
          🤖 Analyze
        </button>
        {onDelete && (
          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.72rem', marginLeft: 'auto' }}
            onClick={() => onDelete(source.id)}>
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}
