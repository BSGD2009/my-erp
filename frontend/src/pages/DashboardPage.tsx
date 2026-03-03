import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { c } from '../theme';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 12, padding: '2rem 2rem 1.75rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: c.textPrimary, margin: '0 0 0.4rem', letterSpacing: '-0.01em' }}>
            Welcome back, {user?.name?.split(' ')[0]}.
          </h1>
          <p style={{ fontSize: '0.875rem', color: c.textMuted, margin: 0 }}>
            Signed in as <strong style={{ color: c.textPrimary }}>{user?.email}</strong> · <strong style={{ color: c.textPrimary }}>{user?.role}</strong>
          </p>

          <div style={{ height: 1, background: c.divider, margin: '1.5rem 0' }} />

          <p style={{ fontSize: '0.85rem', color: c.textMuted, lineHeight: 1.65, margin: '0 0 1.5rem' }}>
            Sessions 1–4 complete. Use the nav bar or the module cards below to get started.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {MODULES.map(m => (
              <div
                key={m.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,0.03)', border: m.path ? `1px solid rgba(59,130,246,0.18)` : `1px solid rgba(255,255,255,0.06)`, borderRadius: 8, padding: '0.85rem 1rem', cursor: m.path ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
                onClick={() => m.path && navigate(m.path)}
                onMouseEnter={e => { if (m.path) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.45)'; }}
                onMouseLeave={e => { if (m.path) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.18)'; }}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>{m.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: m.path ? c.accent : c.textPrimary }}>{m.label}</span>
                <span style={{ fontSize: '0.68rem', color: c.textMuted }}>{m.session}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const MODULES = [
  { icon: '👥', label: 'Customers',      session: 'Session 3 ✓', path: '/customers' },
  { icon: '🏭', label: 'Suppliers',      session: 'Session 3 ✓', path: '/suppliers' },
  { icon: '📍', label: 'Locations',      session: 'Session 3 ✓', path: '/locations' },
  { icon: '🔩', label: 'Materials',      session: 'Session 3 ✓', path: '/materials' },
  { icon: '📦', label: 'Master Specs',   session: 'Session 4 ✓', path: '/master-specs' },
  { icon: '🏷️', label: 'Customer Items', session: 'Session 4 ✓', path: '/customer-items' },
  { icon: '🔧', label: 'Tooling',        session: 'Session 4 ✓', path: '/tooling' },
  { icon: '📊', label: 'Inventory',      session: 'Session 4 ✓', path: '/inventory' },
  { icon: '⚙️', label: 'Resources',      session: 'Session 4 ✓', path: '/resources' },
  { icon: '💬', label: 'Quotes',         session: 'Session 6',   path: null },
  { icon: '📋', label: 'Sales Orders',   session: 'Session 7',   path: null },
  { icon: '🚛', label: 'Shipping',       session: 'Session 10',  path: null },
];
