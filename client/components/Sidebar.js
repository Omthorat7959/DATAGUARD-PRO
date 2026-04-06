'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAlerts } from '../services/api';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'My Data', href: '/data-sources', icon: '📊' },
  { label: 'Connections', href: '/connections', icon: '🔌' },
  { label: 'Uploads', href: '/uploads', icon: '📁' },
  { label: 'AI Analysis', href: '/analysis', icon: '🤖' },
  { label: 'Monitoring', href: '/monitoring', icon: '📡' },
  { label: 'Alerts', href: '/alerts', icon: '🔔', showBadge: true },
  { label: 'Team', href: '/team', icon: '👥' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('dg_user');
    if (stored) setUser(JSON.parse(stored));

    // Fetch unread alert count
    getAlerts({ isRead: 'false', limit: 1 })
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});

    // Poll every 30s
    const interval = setInterval(() => {
      getAlerts({ isRead: 'false', limit: 1 })
        .then((data) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dg_token');
    localStorage.removeItem('dg_user');
    router.push('/');
  };

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)', display: 'flex',
      flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-blue)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🛡️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              DataGuard <span style={{ color: 'var(--accent-blue)' }}>PRO</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>Enterprise Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 4, borderRadius: 10,
                border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                fontSize: '0.85rem', fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
              {item.showBadge && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--accent-red)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                  borderRadius: 9999, minWidth: 20, textAlign: 'center',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 16px 20px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email || 'user@example.com'}
        </div>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.78rem' }}>
          Logout
        </button>
      </div>
    </aside>
  );
}
