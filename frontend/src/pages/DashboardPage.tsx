import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Design tokens (shared with LoginPage) ────────────────────────────────────
const c = {
  pageBg:      '#0c0f1a',
  navBg:       '#141927',
  navBorder:   'rgba(255,255,255,0.07)',
  accent:      '#3b82f6',
  textPrimary: '#f1f5f9',
  textMuted:   '#64748b',
  textLabel:   '#94a3b8',
  cardBg:      '#141927',
  cardBorder:  'rgba(255,255,255,0.07)',
  adminBadge:  { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  csrBadge:    { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(16,185,129,0.20)' },
} as const;

// ── Component ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const badge = user?.role === 'ADMIN' ? c.adminBadge : c.csrBadge;

  return (
    <div style={styles.page}>
      {/* ── Top navigation bar ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {/* Left — logo */}
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <span style={styles.logoText}>BoxERP</span>
          </div>

          {/* Right — user info + logout */}
          <div style={styles.userRow}>
            <span style={{ ...styles.roleBadge, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
              {user?.role}
            </span>
            <span style={styles.userName}>{user?.name}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          <h1 style={styles.welcomeHeading}>Welcome back, {user?.name?.split(' ')[0]}.</h1>
          <p style={styles.welcomeSub}>
            You are signed in as <strong style={{ color: c.textPrimary }}>{user?.email}</strong> with <strong style={{ color: c.textPrimary }}>{user?.role}</strong> access.
          </p>

          <div style={styles.divider} />

          <p style={styles.placeholderNote}>
            Authentication is working. Master data, quoting, production, and shipping modules will appear here as we build them in the sessions ahead.
          </p>

          <div style={styles.moduleGrid}>
            {MODULES.map(m => (
              <div key={m.label} style={styles.moduleCard}>
                <span style={styles.moduleIcon}>{m.icon}</span>
                <span style={styles.moduleLabel}>{m.label}</span>
                <span style={styles.moduleMeta}>{m.session}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Module roadmap tiles ─────────────────────────────────────────────────────
const MODULES = [
  { icon: '🏢', label: 'Master Data',     session: 'Session 4' },
  { icon: '📦', label: 'Product Catalog', session: 'Session 5' },
  { icon: '💬', label: 'Quotes',          session: 'Session 6' },
  { icon: '📋', label: 'Sales Orders',    session: 'Session 7' },
  { icon: '⚙️',  label: 'Production',     session: 'Session 8' },
  { icon: '🏭', label: 'Inventory',       session: 'Session 9' },
  { icon: '🚛', label: 'Shipping',        session: 'Session 10' },
  { icon: '💰', label: 'Invoicing',       session: 'Session 10' },
];

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:  '100vh',
    background: c.pageBg,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color:      c.textPrimary,
  },
  nav: {
    background:  c.navBg,
    borderBottom: `1px solid ${c.navBorder}`,
    position:    'sticky',
    top:          0,
    zIndex:       10,
  },
  navInner: {
    maxWidth:       1200,
    margin:         '0 auto',
    padding:        '0 1.5rem',
    height:         56,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    display:    'flex',
    alignItems: 'center',
    gap:         8,
  },
  logoIcon: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:           34,
    height:          34,
    borderRadius:    7,
    background:      'rgba(59,130,246,0.12)',
    border:          '1px solid rgba(59,130,246,0.25)',
    flexShrink:      0,
  },
  logoText: {
    fontSize:    '1.1rem',
    fontWeight:  700,
    color:       c.textPrimary,
    letterSpacing: '-0.01em',
  },
  userRow: {
    display:    'flex',
    alignItems: 'center',
    gap:         12,
  },
  roleBadge: {
    fontSize:     '0.7rem',
    fontWeight:   600,
    padding:      '0.2rem 0.55rem',
    borderRadius: 20,
    letterSpacing: '0.04em',
  },
  userName: {
    fontSize:  '0.875rem',
    color:     c.textLabel,
  },
  logoutBtn: {
    background:   'transparent',
    border:       `1px solid rgba(255,255,255,0.1)`,
    borderRadius: 6,
    padding:      '0.35rem 0.75rem',
    fontSize:     '0.8rem',
    color:        c.textLabel,
    cursor:       'pointer',
    transition:   'border-color 0.15s, color 0.15s',
  },
  main: {
    maxWidth: 960,
    margin:   '0 auto',
    padding:  '2.5rem 1.5rem',
  },
  welcomeCard: {
    background:   c.cardBg,
    border:       `1px solid ${c.cardBorder}`,
    borderRadius: 12,
    padding:      '2rem 2rem 1.75rem',
  },
  welcomeHeading: {
    fontSize:    '1.5rem',
    fontWeight:  600,
    color:       c.textPrimary,
    margin:      '0 0 0.5rem',
    letterSpacing: '-0.01em',
  },
  welcomeSub: {
    fontSize: '0.9rem',
    color:    c.textMuted,
    margin:   0,
  },
  divider: {
    height:     1,
    background: 'rgba(255,255,255,0.06)',
    margin:     '1.5rem 0',
  },
  placeholderNote: {
    fontSize:     '0.875rem',
    color:        c.textMuted,
    lineHeight:   1.65,
    margin:       '0 0 1.5rem',
  },
  moduleGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap:                  12,
  },
  moduleCard: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'flex-start',
    gap:             4,
    background:     'rgba(255,255,255,0.03)',
    border:         '1px solid rgba(255,255,255,0.06)',
    borderRadius:    8,
    padding:        '0.85rem 1rem',
  },
  moduleIcon: {
    fontSize: '1.2rem',
    marginBottom: 2,
  },
  moduleLabel: {
    fontSize:   '0.8rem',
    fontWeight: 600,
    color:      c.textPrimary,
  },
  moduleMeta: {
    fontSize: '0.7rem',
    color:    c.textMuted,
  },
};
