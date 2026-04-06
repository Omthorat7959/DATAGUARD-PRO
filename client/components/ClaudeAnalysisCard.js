'use client';

const SEVERITY_STYLE = {
  HIGH: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171', icon: '🔴' },
  MEDIUM: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', icon: '🟡' },
  LOW: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#34d399', icon: '🟢' },
};

const PROBLEM_ICONS = {
  NULL_VALUES: '⬜', OUTLIERS: '📈', DUPLICATES: '📋', FORMAT: '🔤', GARBAGE: '🗑️',
};

export default function ClaudeAnalysisCard({ problem, analysis, onApprove, onIgnore }) {
  const severity = SEVERITY_STYLE[analysis?.severity || problem?.severity || 'MEDIUM'];
  const confidence = analysis?.confidence || 0;

  const getConfidenceColor = (v) => {
    if (v >= 80) return 'var(--accent-green)';
    if (v >= 50) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '24px 28px', marginBottom: 16 }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>{PROBLEM_ICONS[analysis?.problemType] || '⚠️'}</span>
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
              {(analysis?.problemType || problem?.type || 'Unknown').replace(/_/g, ' ')}
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Column: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{analysis?.column || problem?.column || '—'}</span>
              {problem?.count ? ` • ${problem.count} rows affected` : ''}
            </span>
          </div>
        </div>
        <span className={`badge`} style={{ background: severity.bg, color: severity.color, border: `1px solid ${severity.border}` }}>
          {severity.icon} {analysis?.severity || 'MEDIUM'}
        </span>
      </div>

      {/* Root Cause */}
      <div style={{
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.06em' }}>
          🤖 Claude AI Root Cause
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {analysis?.rootCause || 'Analysis pending...'}
        </p>
      </div>

      {/* Confidence + Reasoning row */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, marginBottom: 16 }}>
        {/* Confidence Score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confidence
          </div>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border-color)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke={getConfidenceColor(confidence)} strokeWidth="6"
                strokeDasharray={`${(confidence / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: getConfidenceColor(confidence),
            }}>
              {confidence}%
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reasoning
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {analysis?.reasoning || 'AI reasoning will appear here.'}
          </p>
        </div>
      </div>

      {/* Suggested Fix */}
      <div style={{
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 16,
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: 6 }}>
          💡 Suggested Fix
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {analysis?.suggestedFix || problem?.suggestedFix || 'No fix available.'}
        </p>
      </div>

      {/* Impact */}
      {analysis?.impact && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 6 }}>
          <span>⚡</span>
          <span><strong>Impact:</strong> {analysis.impact}</span>
        </div>
      )}

      {/* Alternative fixes */}
      {analysis?.alternativeFixes?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Alternative Fixes
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {analysis.alternativeFixes.map((fix, i) => (
              <span key={i} style={{
                padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}>
                {fix}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fallback indicator */}
      {analysis?.isFallback && (
        <div className="alert alert-info" style={{ marginBottom: 16, fontSize: '0.78rem' }}>
          ℹ️ This analysis was generated by DataGuard's rule engine. Connect a Claude API key for deeper AI insights.
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {onIgnore && (
          <button className="btn btn-secondary btn-sm" onClick={() => onIgnore(analysis)}>
            🚫 Ignore
          </button>
        )}
        {onApprove && (
          <button className="btn btn-success btn-sm" onClick={() => onApprove(analysis)}>
            ✅ Approve Fix
          </button>
        )}
      </div>
    </div>
  );
}
