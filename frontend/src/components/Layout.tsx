import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { c, font } from '../theme';

interface LayoutProps { children: React.ReactNode }

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard' },
  { path: '/products',   label: 'Products' },
  { path: '/tooling',    label: 'Tooling' },
  { path: '/inventory',  label: 'Inventory' },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const badge = user?.role === 'ADMIN'
    ? { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' }
    : { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(16,185,129,0.20)' };

  return (
    <div style={{ minHeight: '100vh', background: c.pageBg, fontFamily: font, color: c.textPrimary }}>
      {/* ── Top nav ── */}
      <nav style={{ background: c.navBg, borderBottom: `1px solid ${c.navBorder}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo + nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Logo */}
            <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '0 1rem 0 0', marginRight: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, background: c.accentMuted, border: `1px solid ${c.accentBorder}`, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: c.textPrimary, letterSpacing: '-0.01em' }}>BoxERP</span>
            </button>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {NAV_ITEMS.map(item => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      background:   isActive ? c.accentMuted : 'transparent',
                      border:       isActive ? `1px solid ${c.accentBorder}` : '1px solid transparent',
                      borderRadius: 6,
                      padding:      '0.3rem 0.75rem',
                      fontSize:     '0.82rem',
                      fontWeight:   isActive ? 600 : 400,
                      color:        isActive ? '#93c5fd' : c.textLabel,
                      cursor:       'pointer',
                      transition:   'all 0.12s',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — user + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 20, letterSpacing: '0.04em', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
              {user?.role}
            </span>
            <span style={{ fontSize: '0.82rem', color: c.textLabel }}>{user?.name}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6, padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: c.textLabel, cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '1.75rem 1.5rem' }}>
        {children}
      </main>
    </div>
  );
}
