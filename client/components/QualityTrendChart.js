'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 10, padding: '12px 16px', fontSize: '0.8rem',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {new Date(d.timestamp).toLocaleString()}
      </p>
      <p style={{ margin: '0 0 3px', color: payload[0].color }}>
        Quality: <strong>{d.qualityScore}%</strong>
      </p>
      {d.problemCount !== undefined && (
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Issues: {d.problemCount} • Rows: {d.totalRows}
        </p>
      )}
      {d.trend && (
        <p style={{ margin: '4px 0 0', color: d.trend === 'improving' ? '#34d399' : d.trend === 'declining' ? '#f87171' : '#9ca3af' }}>
          {d.trend === 'improving' ? '↑' : d.trend === 'declining' ? '↓' : '→'} {d.trend}
        </p>
      )}
    </div>
  );
};

export default function QualityTrendChart({ records = [], height = 280 }) {
  if (records.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📉</div>
        <p style={{ margin: 0 }}>No monitoring data yet. Start monitoring to see trends.</p>
      </div>
    );
  }

  const data = records.map((r) => ({
    ...r,
    date: new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }));

  // Determine color based on overall trend
  const lastScore = data[data.length - 1]?.qualityScore ?? 0;
  const firstScore = data[0]?.qualityScore ?? 0;
  const lineColor = lastScore > firstScore ? '#10b981' : lastScore < firstScore ? '#ef4444' : '#3B82F6';
  const fillColor = lastScore > firstScore ? 'rgba(16,185,129,0.1)' : lastScore < firstScore ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,48,80,0.5)" />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
        <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false}
          tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="qualityScore" stroke={lineColor} strokeWidth={2.5}
          fill="url(#qualityGradient)" dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
