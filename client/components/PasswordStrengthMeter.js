'use client';

/**
 * PasswordStrengthMeter — Visual password strength indicator with requirement checks.
 * Props: { password }
 */
export default function PasswordStrengthMeter({ password = '' }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = checks.filter(c => c.met).length;
  const levels = [
    { label: 'Weak', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Good', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Strong', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  ];
  const level = password.length === 0 ? null : levels[Math.min(metCount, 4) - 1] || levels[0];

  return (
    <div style={{ marginTop: 10 }}>
      {/* Strength bar */}
      {password.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{
            display: 'flex', gap: 4, marginBottom: 6,
          }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < metCount ? level?.color : 'var(--border-color)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
          <div style={{
            fontSize: '0.72rem', fontWeight: 600, color: level?.color,
          }}>
            {level?.label}
          </div>
        </div>
      )}

      {/* Requirement checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {checks.map((check, i) => (
          <div key={i} style={{
            fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6,
            color: check.met ? '#34d399' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <span style={{ fontSize: '0.8rem' }}>{check.met ? '✓' : '○'}</span>
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}
