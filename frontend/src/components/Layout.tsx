import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { c, font } from '../theme';

const HEADER_H  = 56;
const SIDEBAR_W = 220;

const NAV_SECTIONS = [
  {
    section: 'Master Data',
    items: [
      { path: '/customers',          label: 'Customers' },
      { path: '/prospects',          label: 'Prospects' },
      { path: '/suppliers',          label: 'Suppliers' },
      { path: '/locations',          label: 'Locations' },
      { path: '/parties',            label: 'Parties' },
      { path: '/materials',          label: 'Materials' },
      { path: '/product-categories', label: 'Categories' },
    ],
  },
  {
    section: 'Products',
    items: [
      { path: '/master-specs',    label: 'Master Specs' },
      { path: '/customer-items',  label: 'Customer Items' },
      { path: '/tooling',         label: 'Tooling' },
    ],
  },
  {
    section: 'Resources',
    items: [
      { path: '/resources',  label: 'Resources' },
      { path: '/operations', label: 'Operations' },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { path: '/inventory', label: 'Inventory' },
    ],
  },
  {
    section: 'Admin Settings',
    items: [
      { path: '/admin/payment-terms',    label: 'Payment Terms' },
      { path: '/admin/material-types',   label: 'Material Types' },
      { path: '/admin/resource-types',   label: 'Resource Types' },
      { path: '/admin/product-modules',  label: 'Product Modules' },
      { path: '/admin/board-grades',    label: 'Board Grades' },
      { path: '/admin/blanket-contracts', label: 'Blanket Contracts' },
    ],
  },
];

interface LayoutProps { children: React.ReactNode }

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  function handleLogout() { logout(); navigate('/login', { replace: true }); }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  const roleBadge = user?.role === 'ADMIN'
    ? { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' }
    : { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(16,185,129,0.20)' };

  function NavBtn({ path, label }: { path: string; label: string }) {
    const active = isActive(path);
    return (
      <button
        onClick={() => { navigate(path); setSidebarOpen(false); }}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: active ? c.accentMuted : 'transparent',
          border: `1px solid ${active ? c.accentBorder : 'transparent'}`,
          borderRadius: 6,
          padding: '0.42rem 0.75rem',
          fontSize: '0.82rem',
          fontWeight: active ? 600 : 400,
          color: active ? '#93c5fd' : c.textLabel,
          cursor: 'pointer',
          marginBottom: 2,
          transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.textPrimary; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = c.textLabel; }}
      >
        {label}
      </button>
    );
  }

  const Sidebar = (
    <aside style={{
      position: 'fixed',
      top: isMobile ? 0 : HEADER_H,
      left: 0,
      width: SIDEBAR_W,
      height: isMobile ? '100vh' : `calc(100vh - ${HEADER_H}px)`,
      background: c.sideBg,
      borderRight: `1px solid ${c.navBorder}`,
      overflowY: 'auto',
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Mobile header row inside sidebar */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: HEADER_H, borderBottom: `1px solid ${c.navBorder}`, flexShrink: 0 }}>
          <button onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: c.accentMuted, border: `1px solid ${c.accentBorder}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: c.textPrimary }}>BoxERP</span>
          </button>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '1.1rem', lineHeight: 1, padding: 6 }}>✕</button>
        </div>
      )}

      <div style={{ padding: '0.85rem 0.75rem 0.5rem' }}>
        <NavBtn path="/dashboard" label="Dashboard" />
      </div>

      <div style={{ height: 1, background: c.navBorder, margin: '0 0.75rem 0.25rem' }} />

      {NAV_SECTIONS.map(({ section, items }) => (
        <div key={section} style={{ padding: '0.25rem 0.75rem 0.25rem' }}>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '0.5rem 0.75rem 0.3rem' }}>
            {section}
          </div>
          {items.map(item => <NavBtn key={item.path} path={item.path} label={item.label} />)}
        </div>
      ))}
    </aside>
  );

  return (
    <div style={{ minHeight: '100vh', background: c.pageBg, fontFamily: font, color: c.textPrimary }}>
      {/* ── Top header ── */}
      <header style={{ background: c.navBg, borderBottom: `1px solid ${c.navBorder}`, position: 'sticky', top: 0, zIndex: 20, height: HEADER_H }}>
        <div style={{ height: '100%', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: hamburger (mobile) + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textLabel, padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6"  x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, background: c.accentMuted, border: `1px solid ${c.accentBorder}`, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: c.textPrimary, letterSpacing: '-0.01em' }}>BoxERP</span>
            </button>
          </div>

          {/* Right: role badge + name + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 20, letterSpacing: '0.04em', background: roleBadge.bg, color: roleBadge.text, border: `1px solid ${roleBadge.border}` }}>
              {user?.role}
            </span>
            {!isMobile && <span style={{ fontSize: '0.82rem', color: c.textLabel }}>{user?.name}</span>}
            <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6, padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: c.textLabel, cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: 'flex' }}>
        {/* Desktop: sidebar always visible */}
        {!isMobile && Sidebar}

        {/* Mobile: backdrop + sidebar overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 25 }} />
            {Sidebar}
          </>
        )}

        {/* Main content */}
        <main style={{
          flex: 1,
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          padding: '1.75rem 1.5rem',
          minWidth: 0,
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
