import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerItem {
  id: number; code: string; name: string; description?: string;
  listPrice?: number; fulfillmentPath?: string; isActive: boolean;
  customer: { id: number; code: string; name: string };
  masterSpec?: { id: number; sku: string; name: string };
  variant?: { id: number; sku: string; variantDescription: string };
}

interface CustomerLookup { id: number; code: string; name: string }
interface MasterSpecLookup { id: number; sku: string; name: string }
interface VariantLookup { id: number; sku: string; variantDescription: string; isActive: boolean }

const FULFILLMENT_PATHS = ['MANUFACTURE', 'STOCK_AND_SHIP', 'OUTSOURCE', 'VIRTUAL'];

const EMPTY_FORM = {
  name: '', customerId: '', code: '', description: '',
  masterSpecId: '', variantId: '', listPrice: '', fulfillmentPath: '',
};

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
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function CustomerItemsListPage() {
  const navigate = useNavigate();

  const [rows, setRows]         = useState<CustomerItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [custFilter, setCust]   = useState('');
  const [fpFilter, setFp]       = useState('');
  const [page, setPage]         = useState(1);
  const LIMIT = 50;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [customers, setCustomers]     = useState<CustomerLookup[]>([]);
  const [masterSpecs, setMasterSpecs] = useState<MasterSpecLookup[]>([]);
  const [variants, setVariants]       = useState<VariantLookup[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Load lookups once
  useEffect(() => {
    api.get<{ data: CustomerLookup[] }>('/protected/customers?limit=500').then(r => setCustomers(r.data)).catch(() => {});
    api.get<{ data: MasterSpecLookup[] }>('/protected/master-specs?limit=500').then(r => setMasterSpecs(r.data)).catch(() => {});
  }, []);

  // Fetch variants when masterSpecId changes in the form
  useEffect(() => {
    if (!f.masterSpecId) { setVariants([]); return; }
    setLoadingVariants(true);
    api.get<{ id: number; variants: VariantLookup[] }>(`/protected/master-specs/${f.masterSpecId}`)
      .then(r => setVariants(r.variants ?? []))
      .catch(() => setVariants([]))
      .finally(() => setLoadingVariants(false));
  }, [f.masterSpecId]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     params.set('search', search);
      if (custFilter) params.set('customerId', custFilter);
      if (fpFilter)   params.set('fulfillmentPath', fpFilter);
      const res = await api.get<{ data: CustomerItem[]; total: number }>(`/protected/customer-items?${params}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, custFilter, fpFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, custFilter, fpFilter]);

  // ── Drawer helpers ──
  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim())       { setSaveErr('Name is required'); return; }
    if (!f.customerId)        { setSaveErr('Customer is required'); return; }
    if (!f.masterSpecId)      { setSaveErr('Master Spec is required'); return; }
    if (!f.variantId)         { setSaveErr('Variant is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name:            f.name.trim(),
        customerId:      parseInt(f.customerId),
        code:            f.code.trim() ? f.code.trim().toUpperCase() : undefined,
        description:     f.description.trim() || null,
        masterSpecId:    parseInt(f.masterSpecId),
        variantId:       parseInt(f.variantId),
        listPrice:       f.listPrice ? parseFloat(f.listPrice) : null,
        fulfillmentPath: f.fulfillmentPath || null,
      };
      await api.post('/protected/customer-items', body);
      setDrawerOpen(false);
      flash('Customer item created.', 'success');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  function flash(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 4000);
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Customer Items</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            Customer-specific sellable products &mdash; {total} on record
          </p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Customer Item</button>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, maxWidth: 260 }} placeholder="Search code or name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 200, cursor: 'pointer' }} value={custFilter} onChange={e => setCust(e.target.value)}>
          <option value="">All customers</option>
          {customers.map(cu => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
        </select>
        <select style={{ ...inputStyle, maxWidth: 180, cursor: 'pointer' }} value={fpFilter} onChange={e => setFp(e.target.value)}>
          <option value="">All fulfillment</option>
          {FULFILLMENT_PATHS.map(fp => <option key={fp} value={fp}>{fp.replace(/_/g, ' ')}</option>)}
        </select>
        {(search || custFilter || fpFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setCust(''); setFp(''); }}>Clear</button>
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
              {['Code', 'Name', 'Customer', 'Master Spec', 'Variant', 'Fulfillment', 'Price', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No customer items found.</td></tr>}
            {!loading && rows.map(r => (
              <tr
                key={r.id}
                onClick={() => navigate(`/customer-items/${r.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.code}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.customer.name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.masterSpec ? r.masterSpec.name : '\u2014'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.variant?.sku ?? '\u2014'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {r.fulfillmentPath ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>{r.fulfillmentPath.replace(/_/g, ' ')}</span>
                  ) : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, fontFamily: 'monospace' }}>
                  {r.listPrice != null ? `$${Number(r.listPrice).toFixed(2)}` : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>{r.isActive ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
        </div>
      )}

      {/* ── New Customer Item Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Customer Item" width={520}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *">
            <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Customer item name" />
          </Field>
          <Field label="Code">
            <input style={inputStyle} value={f.code} onChange={set('code')} placeholder="Auto-generated if blank" />
          </Field>
          <Field label="Customer *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.customerId} onChange={set('customerId')}>
              <option value="">-- Select customer --</option>
              {customers.map(cu => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
            </select>
          </Field>
          <Field label="Master Spec *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.masterSpecId} onChange={e => setF(prev => ({ ...prev, masterSpecId: e.target.value, variantId: '' }))}>
              <option value="">-- Select master spec --</option>
              {masterSpecs.map(ms => <option key={ms.id} value={ms.id}>{ms.name}</option>)}
            </select>
          </Field>
          <Field label="Variant *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.variantId} onChange={set('variantId')} disabled={!f.masterSpecId || loadingVariants}>
              <option value="">{!f.masterSpecId ? '-- Select master spec first --' : loadingVariants ? 'Loading...' : '-- Select variant --'}</option>
              {variants.filter(v => v.isActive).map(v => <option key={v.id} value={v.id}>{v.sku}{v.variantDescription ? ` — ${v.variantDescription}` : ''}</option>)}
            </select>
          </Field>
          <Field label="List Price ($)">
            <input style={inputStyle} type="number" step="0.01" min="0" value={f.listPrice} onChange={set('listPrice')} />
          </Field>
          <Field label="Fulfillment Path">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.fulfillmentPath} onChange={set('fulfillmentPath')}>
              <option value="">-- None --</option>
              {FULFILLMENT_PATHS.map(fp => <option key={fp} value={fp}>{fp.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.description} onChange={set('description')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Customer Item'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
