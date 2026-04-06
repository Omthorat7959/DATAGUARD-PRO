'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUploads, analyzeProblems } from '../../../services/api';
import ClaudeAnalysisCard from '../../../components/ClaudeAnalysisCard';

export default function AnalysisPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [approvedFixes, setApprovedFixes] = useState(new Set());

  useEffect(() => {
    getUploads()
      .then((d) => { setUploads(d.uploads || []); if (d.uploads?.length > 0) setSelectedUpload(d.uploads[0]._id); })
      .catch(() => {})
      .finally(() => setLoadingUploads(false));
  }, []);

  const handleAnalyze = async () => {
    if (!selectedUpload) return;
    setLoading(true);
    setError('');
    setResult(null);
    setApprovedFixes(new Set());

    try {
      const data = await analyzeProblems(selectedUpload, true);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (analysis) => {
    setApprovedFixes((prev) => new Set([...prev, analysis.problemType + ':' + analysis.column]));
  };

  const handleIgnore = (analysis) => {
    setApprovedFixes((prev) => new Set([...prev, 'ignored:' + analysis.problemType + ':' + analysis.column]));
  };

  const totalProblems = result?.problems?.length || 0;
  const totalApproved = [...approvedFixes].filter((k) => !k.startsWith('ignored:')).length;
  const totalIgnored = [...approvedFixes].filter((k) => k.startsWith('ignored:')).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          🤖 Claude AI Analysis
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          AI-powered root cause analysis for your data quality problems.
        </p>
      </div>

      {/* Source selector */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">Select Upload to Analyze</label>
            <select className="select-field" value={selectedUpload} onChange={(e) => setSelectedUpload(e.target.value)}>
              <option value="">Choose an upload...</option>
              {uploads.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.filename} ({u.rowCount} rows, {u.status})
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !selectedUpload}
            style={{ whiteSpace: 'nowrap', minWidth: 200, padding: '12px 24px' }}>
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Analyzing with Claude...</>
            ) : (
              '🧠 Analyze with AI'
            )}
          </button>
        </div>

        {/* Source info badge */}
        {result?.analysisSource && (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`badge ${result.analysisSource === 'claude' ? 'badge-blue' : 'badge-yellow'}`}>
              {result.analysisSource === 'claude' ? '🤖 Claude AI' : '⚙️ Rule Engine'}
            </span>
            {result.cached && <span className="badge badge-gray">📦 Cached</span>}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {result.filename} • {result.rowCount} rows • {totalProblems} issues
            </span>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>❌ {error}</div>}

      {/* Loading state */}
      {loading && (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 20px', borderWidth: 4 }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>Claude is analyzing your data...</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
            Examining patterns, detecting root causes, and building recommendations.
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Issues Found', value: totalProblems, color: 'var(--accent-red)', icon: '⚠️' },
              { label: 'Fixes Approved', value: totalApproved, color: 'var(--accent-green)', icon: '✅' },
              { label: 'Ignored', value: totalIgnored, color: 'var(--text-muted)', icon: '🚫' },
              { label: 'Analysis Source', value: result.analysisSource === 'claude' ? 'Claude AI' : 'Rules', color: 'var(--accent-purple)', icon: '🤖' },
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>
                  {typeof stat.value === 'number' ? stat.value : stat.value}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Analysis Cards */}
          {result.aiAnalysis && result.aiAnalysis.length > 0 ? (
            result.aiAnalysis.map((analysis, i) => {
              const problem = result.problems?.[i] || {};
              const key = analysis.problemType + ':' + analysis.column;
              const isHandled = approvedFixes.has(key) || approvedFixes.has('ignored:' + key);

              return (
                <div key={i} style={{ opacity: isHandled ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                  <ClaudeAnalysisCard
                    problem={problem}
                    analysis={analysis}
                    onApprove={isHandled ? null : handleApprove}
                    onIgnore={isHandled ? null : handleIgnore}
                  />
                </div>
              );
            })
          ) : result.problems?.length > 0 ? (
            result.problems.map((problem, i) => (
              <ClaudeAnalysisCard key={i} problem={problem} analysis={null} />
            ))
          ) : (
            <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                No quality issues found! Your data looks great.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤖</div>
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>AI-Powered Root Cause Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', maxWidth: 500, marginInline: 'auto' }}>
            Select an upload above and click "Analyze with AI" to get Claude's explanation of
            why your data has issues, with confidence scores and actionable fixes.
          </p>
        </div>
      )}
    </div>
  );
}
