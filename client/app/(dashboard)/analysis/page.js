'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUploads, analyzeProblems, approveFix } from '../../../services/api';
import ClaudeAnalysisCard from '../../../components/ClaudeAnalysisCard';

export default function AnalysisPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const handleApprove = async (analysis) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const fixResponse = await approveFix(selectedUpload, analysis.problemType, analysis.column);
      setApprovedFixes((prev) => new Set([...prev, analysis.problemType + ':' + analysis.column]));
      
      // Update React state with fresh data directly from analysis endpoint (rule engine evaluation)
      const data = await analyzeProblems(selectedUpload, false);
      
      // Preserve existing aiAnalysis, except for the fixed one
      const remainingAiAnalysis = result?.aiAnalysis 
        ? result.aiAnalysis.filter(a => !(a.problemType === analysis.problemType && a.column === analysis.column)) 
        : [];
      
      setResult({
        ...data,
        aiAnalysis: remainingAiAnalysis, // keep AI context for remaining problems
      });
      
      // Show success message
      setSuccessMsg(`✨ Fix Applied! Quality improved from ${fixResponse.oldQualityScore}% to ${fixResponse.newQualityScore}%. Cleaned ${fixResponse.rowsAffected || 0} rows.`);
      
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to approve fix.');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = (analysis) => {
    setApprovedFixes((prev) => new Set([...prev, 'ignored:' + analysis.problemType + ':' + analysis.column]));
  };

  const totalProblems = result?.problems?.length || 0;
  const totalApproved = result?.fixesApplied?.length || 0;
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
      {successMsg && <div className="alert alert-success animate-fade-in" style={{ marginBottom: 20 }}>{successMsg}</div>}

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
          {/* How This Works Banner */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', 
            padding: '16px 20px', marginBottom: 24, borderRadius: '0 8px 8px 0'
          }}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e3a8a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>ℹ️</span> How This Works
            </h3>
            <div style={{ color: '#1e40af', fontSize: '0.85rem', lineHeight: 1.6 }}>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li><strong>"Analyze with AI"</strong> button shows what Claude thinks about the problem</li>
                <li><strong>"Approve & Fix"</strong> button ACTUALLY MODIFIES the original file and improves quality</li>
                <li>After fixing, the problem is removed from the list</li>
                <li>Click again to see remaining problems</li>
              </ol>
            </div>
          </div>

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

          {/* Fixes History & Improvement */}
          {result.fixesApplied && result.fixesApplied.length > 0 && (
            <div className="glass-card" style={{ padding: 24, marginBottom: 28, borderLeft: '4px solid var(--accent-green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✨</span> Data Quality Improved
                </h3>
                {result.originalQualityScore && result.currentQualityScore && (
                  <div className="badge badge-green" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                    Score: {result.originalQualityScore}% ➔ {result.currentQualityScore}%
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.fixesApplied.map((fix, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: 8 }}>
                    <span>Fixed <strong>{fix.type.replace('_', ' ')}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>{fix.rowsAffected} rows cleaned</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
