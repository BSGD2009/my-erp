import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

const PRODUCT_TYPES = [
  { value: '',                 label: 'All types' },
  { value: 'CORRUGATED_BOX',  label: 'Corrugated Box' },
  { value: 'PACKAGING_SUPPLY',label: 'Packaging Supply' },
  { value: 'RESALE',          label: 'Resale' },
  { value: 'LABOR_SERVICE',   label: 'Labor / Service' },
  { value: 'OTHER',           label: 'Other' },
];

const TYPE_BADGE: Record<string, { text: string; bg: string; color: string }> = {
  CORRUGATED_BOX:   { text: 'Box',     bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  PACKAGING_SUPPLY: { text: 'Supply',  bg: 'rgba(168,85,247,0.12)',  color: '#c084fc' },
  RESALE:           { text: 'Resale',  bg: 'rgba(20,184,166,0.12)',  color: '#2dd4bf' },
  LABOR_SERVICE:    { text: 'Service', bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  OTHER:            { text: 'Other',   bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
};

interface Product {
  id: number; sku: string; name: string; description?: string;
  productType: string; listPrice?: string; isActive: boolean; isCustom: boolean;
  category?: { id: number; name: string };
  _count: { variants: number; bomLines: number };
}

export function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts]       = useState<Product[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     params.set('search', search);
      if (typeFilter) params.set('productType', typeFilter);
      const res = await api.get<{ data: Product[]; total: number }>(`/protected/products?${params}`);
      setProducts(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Products</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            {total} {total === 1 ? 'product' : 'products'} in catalog
          </p>
        </div>
        <button style={btnPrimary} onClick={() => navigate('/products/new')}>
          + New Product
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search SKU or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, maxWidth: 200, cursor: 'pointer' }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(search || typeFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setTypeFilter(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              {['SKU', 'Name', 'Type', 'Category', 'Variants', 'List Price', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading…</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search || typeFilter ? 'No products match your filters.' : 'No products yet. Create the first one.'}
              </td></tr>
            )}
            {!loading && products.map(p => {
              const badge = TYPE_BADGE[p.productType] ?? TYPE_BADGE.OTHER;
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/products/${p.id}`)}
                  style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>
                    {p.sku}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: c.textPrimary }}>
                    {p.name}
                    {p.isCustom && <span style={{ marginLeft: 6, fontSize: '0.67rem', background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600 }}>CUSTOM</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: badge.bg, color: badge.color, letterSpacing: '0.02em' }}>
                      {badge.text}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                    {p.category?.name ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>
                    {p._count.variants > 0 ? p._count.variants : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textPrimary }}>
                    {p.listPrice ? `$${Number(p.listPrice).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
                      background: p.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                      color:      p.isActive ? '#22c55e'               : '#64748b',
                    }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← Prev
          </button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </Layout>
  );
}
