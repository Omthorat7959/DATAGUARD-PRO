'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup, getMe } from '../services/api';

export default function HomePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('dg_token');
    if (token) {
      getMe()
        .then(() => router.push('/dashboard'))
        .catch(() => localStorage.removeItem('dg_token'))
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const fn = isLogin ? login : signup;
      const data = await fn(email, password);
      localStorage.setItem('dg_token', data.token);
      localStorage.setItem('dg_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Background grid effect */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `radial-gradient(circle at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 50%),
                     radial-gradient(circle at 70% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)`,
      }} />

      <div className="glass-card animate-fade-in" style={{ maxWidth: 440, width: '100%', padding: '48px 40px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--gradient-blue)', marginBottom: 16, fontSize: 24,
          }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            DataGuard <span style={{ color: 'var(--accent-blue)' }}>PRO</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Enterprise Data Quality Platform
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10,
          padding: 4, marginBottom: 28,
        }}>
          {['Login', 'Sign Up'].map((label, i) => (
            <button key={label} onClick={() => { setIsLogin(i === 0); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
                background: (i === 0 ? isLogin : !isLogin) ? 'var(--accent-blue)' : 'transparent',
                color: (i === 0 ? isLogin : !isLogin) ? '#fff' : 'var(--text-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label className="input-label">Email Address</label>
            <input type="email" className="input-field" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="input-label">Password</label>
            <input type="password" className="input-field" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '12px 0', fontSize: '0.95rem' }}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Processing...</> : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
}
