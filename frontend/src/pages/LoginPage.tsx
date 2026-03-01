import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { AuthUser } from '../types/auth';

// ── Types ────────────────────────────────────────────────────────────────────
interface LoginResponse {
  token: string;
  user:  AuthUser;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const c = {
  pageBg:        '#0c0f1a',
  cardBg:        '#141927',
  cardBorder:    'rgba(255,255,255,0.07)',
  accent:        '#3b82f6',
  accentHover:   '#2563eb',
  textPrimary:   '#f1f5f9',
  textMuted:     '#64748b',
  textLabel:     '#94a3b8',
  inputBg:       '#0c0f1a',
  inputBorder:   '#1e293b',
  inputFocus:    '#3b82f6',
  errorBg:       'rgba(239,68,68,0.08)',
  errorBorder:   'rgba(239,68,68,0.25)',
  errorText:     '#fca5a5',
} as const;

// ── Component ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [pwFocus,  setPwFocus]  = useState(false);
  const [emFocus,  setEmFocus]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* ── Logo ── */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <span style={styles.logoText}>BoxERP</span>
        </div>

        {/* ── Heading ── */}
        <h1 style={styles.heading}>Sign in to your account</h1>
        <p style={styles.subheading}>Corrugated packaging — quote to cash</p>

        {/* ── Error banner ── */}
        {error && (
          <div style={styles.errorBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.errorText} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmFocus(true)}
              onBlur={()  => setEmFocus(false)}
              placeholder="you@company.com"
              required
              style={{
                ...styles.input,
                borderColor: emFocus ? c.inputFocus : c.inputBorder,
                boxShadow:   emFocus ? `0 0 0 3px rgba(59,130,246,0.15)` : 'none',
              }}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPwFocus(true)}
              onBlur={()  => setPwFocus(false)}
              placeholder="••••••••"
              required
              style={{
                ...styles.input,
                borderColor: pwFocus ? c.inputFocus : c.inputBorder,
                boxShadow:   pwFocus ? `0 0 0 3px rgba(59,130,246,0.15)` : 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              background:   loading ? c.accentHover : c.accent,
              cursor:       loading ? 'not-allowed' : 'pointer',
              opacity:      loading ? 0.85 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* ── Footer ── */}
        <p style={styles.footer}>
          BoxERP · Session 3 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      c.pageBg,
    padding:         '1rem',
    fontFamily:      "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  card: {
    width:           '100%',
    maxWidth:        420,
    background:      c.cardBg,
    border:          `1px solid ${c.cardBorder}`,
    borderRadius:    12,
    padding:         '2.5rem 2rem',
    boxShadow:       '0 25px 50px rgba(0,0,0,0.5)',
  },
  logoRow: {
    display:         'flex',
    alignItems:      'center',
    gap:             10,
    marginBottom:    '1.75rem',
  },
  logoIcon: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    width:           40,
    height:          40,
    borderRadius:    8,
    background:      'rgba(59,130,246,0.12)',
    border:          '1px solid rgba(59,130,246,0.25)',
    flexShrink:      0,
  },
  logoText: {
    fontSize:        '1.35rem',
    fontWeight:      700,
    color:           c.textPrimary,
    letterSpacing:   '-0.01em',
  },
  heading: {
    fontSize:        '1.2rem',
    fontWeight:      600,
    color:           c.textPrimary,
    margin:          '0 0 0.35rem',
    letterSpacing:   '-0.01em',
  },
  subheading: {
    fontSize:        '0.85rem',
    color:           c.textMuted,
    margin:          '0 0 1.75rem',
  },
  errorBox: {
    display:         'flex',
    alignItems:      'flex-start',
    gap:             8,
    background:      c.errorBg,
    border:          `1px solid ${c.errorBorder}`,
    borderRadius:    7,
    padding:         '0.65rem 0.85rem',
    marginBottom:    '1.25rem',
    color:           c.errorText,
    fontSize:        '0.85rem',
    lineHeight:      1.5,
  },
  fieldGroup: {
    marginBottom:    '1.25rem',
  },
  label: {
    display:         'block',
    fontSize:        '0.8rem',
    fontWeight:      500,
    color:           c.textLabel,
    marginBottom:    '0.45rem',
    letterSpacing:   '0.01em',
  },
  input: {
    width:           '100%',
    background:      c.inputBg,
    border:          `1px solid ${c.inputBorder}`,
    borderRadius:    7,
    padding:         '0.65rem 0.85rem',
    fontSize:        '0.95rem',
    color:           c.textPrimary,
    outline:         'none',
    transition:      'border-color 0.15s, box-shadow 0.15s',
    boxSizing:       'border-box',
  },
  button: {
    display:         'block',
    width:           '100%',
    padding:         '0.75rem',
    marginTop:       '1.75rem',
    borderRadius:    7,
    border:          'none',
    fontSize:        '0.95rem',
    fontWeight:      600,
    color:           '#fff',
    transition:      'background 0.15s, opacity 0.15s',
    letterSpacing:   '0.01em',
  },
  footer: {
    textAlign:       'center',
    marginTop:       '2rem',
    fontSize:        '0.75rem',
    color:           c.textMuted,
  },
};
