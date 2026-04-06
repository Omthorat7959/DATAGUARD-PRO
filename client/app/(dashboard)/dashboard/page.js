'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboard } from '../../../services/api';
import QuickStatsCard from '../../../components/QuickStatsCard';
import RecentActivityTable from '../../../components/RecentActivityTable';
import DataSourceCard from '../../../components/DataSourceCard';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('dg_user');
    if (stored) setUser(JSON.parse(stored));

    // Time-based greeting
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const result = await getDashboard();
      setData(result);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="animate-fade-in">
      {/* ─── Welcome Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-0.03em' }}>
          {greeting}, <span style={{ color: 'var(--accent-blue)' }}>{displayName}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Here's an overview of your data quality across all sources.
        </p>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => router.push('/uploads')}>
            📁 Upload New Data
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/monitoring')}>
            📡 Start Monitoring
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/connections')}>
            🔌 Add Connection
          </button>
        </div>
      </div>

      {/* ─── Quick Stats Grid ────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        <QuickStatsCard
          icon="📁"
          value={stats.totalUploads || 0}
          title="Total Uploads"
          subtitle={`${stats.totalDataSources || 0} data sources`}
          color="blue"
          onClick={() => router.push('/uploads')}
          link="View all"
        />
        <QuickStatsCard
          icon="📊"
          value={stats.avgQuality != null ? `${stats.avgQuality}%` : '—'}
          title="Average Quality"
          subtitle={stats.avgQuality != null
            ? (stats.avgQuality >= 80 ? 'Looking great!' : stats.avgQuality >= 50 ? 'Needs attention' : 'Critical issues')
            : 'No data yet'}
          trend={stats.avgQuality >= 80 ? 'up' : stats.avgQuality >= 50 ? null : 'down'}
          color="green"
          onClick={() => router.push('/data-sources')}
        />
        <QuickStatsCard
          icon="👥"
          value={stats.totalTeamMembers || 0}
          title="Team Members"
          subtitle="Across all sources"
          color="purple"
          onClick={() => router.push('/team')}
          link="Manage teams"
        />
        <QuickStatsCard
          icon="✅"
          value={stats.fixesApplied || 0}
          title="Issues Detected"
          subtitle={stats.estimatedTimeSaved > 0
            ? `~${stats.estimatedTimeSaved} hrs saved`
            : 'Upload data to detect issues'}
          color="yellow"
          onClick={() => router.push('/analysis')}
        />
      </div>

      {/* ─── Unread Alerts Banner ────────────────────────────────── */}
      {stats.unreadAlerts > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 24, cursor: 'pointer' }}
          onClick={() => router.push('/alerts')}>
          🔔 You have <strong style={{ margin: '0 4px' }}>{stats.unreadAlerts}</strong>
          unread alert{stats.unreadAlerts !== 1 ? 's' : ''}. Click to view.
        </div>
      )}

      {/* ─── Recent Activity ─────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: 32 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            📋 Recent Activity
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/uploads')}>
            View All
          </button>
        </div>
        <RecentActivityTable activities={data?.recentActivity || []} />
      </div>

      {/* ─── My Data Sources ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            📊 My Data Sources
          </h2>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/data-sources')}>
            + Add New Source
          </button>
        </div>

        {(data?.sourcesSummary || []).length === 0 ? (
          <div className="glass-card" style={{
            padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>No data sources yet</div>
            <div style={{ fontSize: '0.8rem' }}>Upload a CSV or connect a database to get started.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}>
            {(data?.sourcesSummary || []).map((src) => (
              <DataSourceCard
                key={src.id}
                source={src}
                onValidate={() => router.push('/data-sources')}
                onMonitor={() => router.push('/monitoring')}
                onDelete={null}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Quick Links Footer ──────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginBottom: 32,
      }}>
        {[
          { icon: '🤖', label: 'AI Analysis', href: '/analysis', desc: 'Root cause analysis' },
          { icon: '📡', label: 'Monitoring', href: '/monitoring', desc: 'Automated checks' },
          { icon: '🔔', label: 'Alerts', href: '/alerts', desc: `${stats.unreadAlerts || 0} unread` },
          { icon: '🔌', label: 'Connections', href: '/connections', desc: `${stats.totalConnections || 0} connected` },
        ].map((link) => (
          <div key={link.href} className="glass-card" style={{
            padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
          }} onClick={() => router.push(link.href)}>
            <span style={{ fontSize: '1.5rem' }}>{link.icon}</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{link.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{link.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
