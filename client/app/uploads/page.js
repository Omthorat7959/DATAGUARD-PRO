'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUploads, getUpload } from '../../services/api';
import Link from 'next/link';

export default function UploadsPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadUploads = useCallback(async () => {
    try {
      const data = await getUploads();
      setUploads(data.uploads || []);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const viewDetails = async (id) => {
    setDetailLoading(true);
    try {
      const data = await getUpload(id);
      setSelectedUpload(data);
    } catch (err) {
      console.error('Failed to load upload details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--accent-green)';
    if (score >= 70) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="animate-fade-in p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header section with gradient */}
      <div className="relative overflow-hidden rounded-2xl p-8 mb-8 border border-gray-800/60 shadow-2xl"
           style={{ background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(30,58,138,0.2) 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10">
              📁
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              CSV Uploads
            </h1>
          </div>
          <p className="text-gray-400 max-w-2xl text-sm md:text-base font-medium leading-relaxed">
            View and manage your validated CSV files. Click on any file to explore detailed data quality insights, identify anomalies, and apply AI-driven fixes.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-15 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-600 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 glass-card">
          <div className="spinner mb-4" style={{ width: '40px', height: '40px' }} />
          <p className="text-gray-400 font-medium animate-pulse">Loading your uploads...</p>
        </div>
      ) : uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 glass-card text-center border-dashed border-gray-700/50">
          <div className="w-24 h-24 mb-6 rounded-full bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-4xl shadow-inner">
            📂
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">No uploads yet</h2>
          <p className="text-gray-400 mb-8 max-w-md text-sm leading-relaxed">
            You haven't uploaded any CSV data for analysis yet. Head over to the Data Sources section to upload and validate your first dataset.
          </p>
          <Link href="/data-sources" className="btn btn-primary px-8 py-3 rounded-xl font-semibold shadow-xl shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
            Upload your first CSV
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uploads.map((u) => {
            const statusColor = u.status === 'validated' ? 'green' : u.status === 'validating' ? 'yellow' : 'gray';
            const qualityScore = u.currentValidationResults?.qualityScore ?? 100;
            const scoreColor = getScoreColor(qualityScore);

            return (
              <div key={u._id} className="glass-card group flex flex-col p-6 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-lg hover:shadow-blue-500/10"
                   onClick={() => viewDetails(u._id)}>
                
                {/* Status Badge */}
                <div className="absolute top-5 right-5 z-10">
                  <span className={`badge badge-${statusColor} shadow-sm px-3 py-1 bg-opacity-90 backdrop-blur-md`}>
                    {u.status === 'validated' ? '✅ Validated' : u.status === 'validating' ? '⏳ Validating' : u.status}
                  </span>
                </div>

                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-2xl shrink-0 drop-shadow-md">
                    📄
                  </div>
                  <div className="overflow-hidden pr-24 flex-grow pt-1">
                    <h3 className="font-bold text-lg text-white truncate drop-shadow-sm title-font" title={u.filename}>
                      {u.filename}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                      Uploaded {new Date(u.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 mb-5 grid grid-cols-3 gap-4 text-center border border-gray-800/30">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Rows</p>
                    <p className="font-semibold text-gray-200 text-sm">{u.rowCount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="border-l border-r border-gray-800/50">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Cols</p>
                    <p className="font-semibold text-gray-200 text-sm">{u.columnNames?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Size</p>
                    <p className="font-semibold text-gray-200 text-sm">{(u.fileSize / 1024).toFixed(0)} KB</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"></path>
                        <path strokeDasharray={`${qualityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreColor} strokeWidth="3" className="drop-shadow-md"></path>
                      </svg>
                      <span className="absolute text-[10px] font-bold text-white">{qualityScore}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Quality</p>
                    </div>
                  </div>
                  
                  <button className="text-blue-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                    Details <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Improved Detail Modal */}
      {selectedUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in"
             onClick={() => !detailLoading && setSelectedUpload(null)}>
          <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-blue-900/20 relative overflow-hidden"
               style={{ borderTop: `4px solid ${getScoreColor(selectedUpload.currentResults?.qualityScore ?? 100)}` }}
               onClick={(e) => e.stopPropagation()}>
            
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center p-20 h-64">
                <div className="spinner mb-5" style={{ width: '48px', height: '48px' }} />
                <p className="text-gray-400 font-medium tracking-wide">Fetching deep analysis data...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-6 md:p-8 bg-gray-900/40 border-b border-gray-800/80 shrink-0 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-gray-800/80 border border-gray-700/80 flex items-center justify-center text-3xl shadow-inner">
                      📄
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1.5 truncate max-w-sm drop-shadow-sm">
                        {selectedUpload.upload?.filename}
                      </h3>
                      <p className="text-sm text-gray-400 font-medium">
                        {selectedUpload.upload?.rowCount?.toLocaleString()} rows • {(selectedUpload.upload?.fileSize / 1024).toFixed(1)} KB • {selectedUpload.upload?.columnNames?.length} columns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 relative z-10 hidden md:flex">
                    <div className="text-center bg-gray-900/80 rounded-xl px-5 py-3 border border-gray-700/50 shadow-inner">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Quality Score</p>
                      <p className="text-2xl font-black drop-shadow-md" style={{ color: getScoreColor(selectedUpload.currentResults?.qualityScore ?? 100) }}>
                        {selectedUpload.currentResults?.qualityScore ?? 100}%
                      </p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center text-gray-300 transition-colors" 
                            onClick={() => setSelectedUpload(null)}>✕</button>
                  </div>
                  <button className="md:hidden w-8 h-8 absolute top-4 right-4 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 z-20" 
                          onClick={() => setSelectedUpload(null)}>✕</button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto flex-grow bg-[#0a0e1a]/40 custom-scrollbar">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Detected Issues Summary
                  </h4>
                  
                  {selectedUpload.validations?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5">
                      {selectedUpload.validations.map((v, i) => {
                        const severityColors = {
                          HIGH: 'var(--accent-red)',
                          MEDIUM: 'var(--accent-yellow)',
                          LOW: 'var(--accent-green)'
                        };
                        const color = severityColors[v.severity] || 'var(--text-secondary)';
                        
                        return (
                          <div key={i} className="rounded-xl border border-gray-800/80 bg-gray-900/60 p-5 md:p-6 relative overflow-hidden transition-all hover:bg-gray-800/40 hover:border-gray-700">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }}></div>
                            <div className="flex justify-between items-start mb-4">
                              <h5 className="font-bold text-gray-100 text-lg capitalize flex items-center gap-2 drop-shadow-sm">
                                {v.validationType?.replace(/_/g, ' ')}
                              </h5>
                              <span className={`badge badge-${v.severity === 'HIGH' ? 'red' : v.severity === 'MEDIUM' ? 'yellow' : 'green'} text-[10px] shadow-sm`}>
                                {v.severity} SEVERITY
                              </span>
                            </div>
                            
                            <div className="bg-black/40 rounded-xl p-4 mb-4 border border-gray-800/60 flex flex-wrap gap-6 items-center">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Affected Rows</p>
                                <p className="text-xl font-bold text-white">{v.affectedRows?.toLocaleString()}</p>
                              </div>
                              <div className="w-px h-10 bg-gray-800 hidden md:block"></div>
                              <div className="flex-grow">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Affected Columns</p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {v.affectedColumns?.map(col => (
                                    <span key={col} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-md border border-gray-700 shadow-sm">{col}</span>
                                  )) || <span className="text-gray-500 text-sm">—</span>}
                                </div>
                              </div>
                            </div>

                            {v.suggestedFix && (
                              <div className="flex items-start gap-3 bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 relative overflow-hidden">
                                <div className="text-blue-400 text-xl shrink-0 relative z-10 pt-0.5">💡</div>
                                <p className="text-sm text-blue-100/90 leading-relaxed font-medium relative z-10">
                                  {v.suggestedFix}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-6 bg-gradient-to-b from-green-900/20 to-transparent border border-green-900/30 rounded-2xl shadow-inner">
                      <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 shadow-lg shadow-green-500/10 flex items-center justify-center text-4xl mb-5">
                        ✨
                      </div>
                      <h4 className="text-2xl font-bold text-green-400 mb-3 drop-shadow-sm">Perfect Data Quality!</h4>
                      <p className="text-base text-green-200/80 text-center max-w-md leading-relaxed">
                        Our engine scanned this file thoroughly and found absolutely zero anomalies. It's incredibly clean and ready for direct analysis.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="p-5 md:p-6 border-t border-gray-800 bg-gray-900/90 shrink-0 flex justify-end gap-4 rounded-b-2xl">
                  <button className="btn btn-secondary px-6 md:hidden" onClick={() => setSelectedUpload(null)}>
                    Close
                  </button>
                  <Link href={`/analysis?uploadId=${selectedUpload.upload?._id}`} className="btn btn-primary px-8 py-2.5 shadow-lg shadow-blue-500/20">
                    Fix Issues with AI Engine
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
