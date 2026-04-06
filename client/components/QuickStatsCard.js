'use client';

/**
 * QuickStatsCard — Displays a metric with icon, value, subtitle, and optional mini sparkline.
 * Props: { title, icon, value, subtitle, trend, link, onClick, color }
 */
export default function QuickStatsCard({ title, icon, value, subtitle, trend, link, onClick, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'rgba(59, 130, 246, 0.1)',  border: 'rgba(59, 130, 246, 0.2)',  glow: 'rgba(59, 130, 246, 0.15)' },
    green:  { bg: 'rgba(16, 185, 129, 0.1)',  border: 'rgba(16, 185, 129, 0.2)',  glow: 'rgba(16, 185, 129, 0.15)' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)',  border: 'rgba(139, 92, 246, 0.2)',  glow: 'rgba(139, 92, 246, 0.15)' },
    yellow: { bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.2)',  glow: 'rgba(245, 158, 11, 0.15)' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div
      onClick={onClick}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 16,
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 24px ${c.glow}`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{icon}</div>

      {/* Value */}
      <div style={{
        fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
        lineHeight: 1.1, marginBottom: 4,
      }}>
        {value}
        {trend && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, marginLeft: 8,
            color: trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#9ca3af',
          }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 2,
      }}>
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4,
        }}>
          {subtitle}
        </div>
      )}

      {/* Link */}
      {link && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--accent-blue)', marginTop: 8,
          fontWeight: 600, cursor: 'pointer',
        }}>
          {link} →
        </div>
      )}
    </div>
  );
}
