import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MasterSpec {
  id: number; sku: string; name: string; description?: string;
  isActive: boolean;
  category?: { id: number; name: string; module?: { id: number; moduleKey: string; moduleName: string } };
  _count: { variants: number; bomLines: number; customerItems: number };
}

interface Category { id: number; name: string }

const EMPTY_FORM = { name: '', sku: '', categoryId: '', description: '' };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const colors = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: c.danger };
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: colors.color }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MasterSpecsListPage
// ─────────────────────────────────────────────────────────────────────────────
export function MasterSpecsListPage() {
  const navigate = useNavigate();
  const [specs, setSpecs]             = useState<MasterSpec[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage]               = useState(1);
  const LIMIT = 50;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories once
  useEffect(() => {
    api.get<Category[]>('/protected/product-categories').then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)         params.set('search', search);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      const res = await api.get<{ data: MasterSpec[]; total: number }>(`/protected/master-specs?${params}`);
      setSpecs(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load master specs');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 3500);
  }

  // ── Drawer helpers ──
  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = { name: f.name.trim() };
      if (f.sku.trim())        body.sku = f.sku.trim().toUpperCase();
      if (f.categoryId)        body.categoryId = parseInt(f.categoryId);
      if (f.description.trim())body.description = f.description.trim();
      await api.post('/protected/master-specs', body);
      setDrawerOpen(false);
      flash('Master spec created.');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      {/* ── Toast ── */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Master Specs</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            {total} {total === 1 ? 'spec' : 'specs'} &mdash; Manufacturable item definitions
          </p>
        </div>
        <button style={btnPrimary} onClick={openNew}>
          + New Master Spec
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search SKU or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, maxWidth: 200, cursor: 'pointer' }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        {(search || categoryFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setCategoryFilter(''); }}>
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
              {['SKU', 'Name', 'Category', 'Variants', 'BOM Lines', 'Customer Items', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && specs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search || categoryFilter ? 'No master specs match your filters.' : 'No master specs yet. Create the first one.'}
              </td></tr>
            )}
            {!loading && specs.map(s => (
              <tr
                key={s.id}
                onClick={() => navigate(`/master-specs/${s.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>
                  {s.sku}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: c.textPrimary }}>
                  {s.name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {s.category?.name ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>
                  {s._count.variants > 0 ? s._count.variants : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>
                  {s._count.bomLines > 0 ? s._count.bomLines : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>
                  {s._count.customerItems > 0 ? s._count.customerItems : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
                    background: s.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                    color:      s.isActive ? '#22c55e'               : '#64748b',
                  }}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            &larr; Prev
          </button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Next &rarr;
          </button>
        </div>
      )}

      {/* ── New Master Spec Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Master Spec" width={500}>
        {saveErr && <Toast msg={saveErr} type="error" />}

        <Field label="Name *">
          <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="12x10x8 RSC Box" />
        </Field>

        <Field label="SKU (optional, auto-generates if blank)">
          <input style={inputStyle} value={f.sku} onChange={set('sku')} placeholder="BOX-12X10X08" />
        </Field>

        <Field label="Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.categoryId} onChange={set('categoryId')}>
            <option value="">&mdash; None &mdash;</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </Field>

        <Field label="Description">
          <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={f.description} onChange={set('description')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Master Spec'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
