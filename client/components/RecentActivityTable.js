'use client';

import { useRouter } from 'next/navigation';

/**
 * RecentActivityTable — Shows user's recent uploads with quality scores.
 * Props: { activities }
 */
export default function RecentActivityTable({ activities = [] }) {
  const router = useRouter();

  const timeAgo = (date) => {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const scoreColor = (score) => {
    if (score == null) return 'var(--text-muted)';
    if (score >= 80) return '#34d399';
    if (score >= 50) return '#fbbf24';
    return '#f87171';
  };

  const scoreBg = (score) => {
    if (score == null) return 'rgba(107,114,128,0.1)';
    if (score >= 80) return 'rgba(16,185,129,0.12)';
    if (score >= 50) return 'rgba(245,158,11,0.12)';
    return 'rgba(239,68,68,0.12)';
  };

  if (activities.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
        No recent activity. Upload a CSV to get started!
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Rows</th>
            <th>Quality</th>
            <th>Issues</th>
            <th>Status</th>
            <th>When</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/uploads`)}
            >
              <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📄 {a.filename}
              </td>
              <td>{a.rowCount?.toLocaleString() ?? '—'}</td>
              <td>
                {a.qualityScore != null ? (
                  <span style={{
                    background: scoreBg(a.qualityScore),
                    color: scoreColor(a.qualityScore),
                    padding: '3px 10px', borderRadius: 8,
                    fontSize: '0.78rem', fontWeight: 700,
                  }}>
                    {a.qualityScore}%
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                )}
              </td>
              <td>
                {a.problemsFound > 0 ? (
                  <span style={{
                    color: '#fbbf24', fontWeight: 600, fontSize: '0.78rem',
                  }}>
                    ⚠ {a.issueCount} {a.issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                ) : (
                  <span style={{ color: '#34d399', fontSize: '0.78rem' }}>✓ Clean</span>
                )}
              </td>
              <td>
                <span className={`badge ${a.status === 'validated' ? 'badge-green' : 'badge-yellow'}`}>
                  {a.status}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {timeAgo(a.uploadedAt)}
              </td>
              <td>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                  onClick={(e) => { e.stopPropagation(); router.push(`/uploads`); }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
