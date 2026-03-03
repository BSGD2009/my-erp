import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface PaymentTerm { id: number; termCode: string; termName: string; netDays: number }
interface Supplier {
  id: number; code: string; name: string; accountNumber?: string; taxId?: string;
  is1099Eligible: boolean; name1099?: string;
  street?: string; city?: string; state?: string; zip?: string; country?: string;
  paymentTermId?: number; paymentTerm?: { id: number; termName: string };
  creditLimit?: number; w9OnFile: boolean; isActive: boolean;
  _count?: { contacts: number; purchaseOrders: number };
}

const EMPTY = {
  name: '', code: '', accountNumber: '', taxId: '',
  is1099Eligible: false, name1099: '',
  street: '', city: '', state: '', zip: '', country: 'US',
  paymentTermId: '', creditLimit: '', w9OnFile: false,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Th({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: string; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: active ? '#93c5fd' : c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<Supplier[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortBy, setSortBy]   = useState('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success'|'error' } | null>(null);

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  const LIMIT = 50;

  useEffect(() => {
    api.get<PaymentTerm[]>('/protected/payment-terms').then(setPaymentTerms).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) p.set('search', search);
      const res = await api.get<{ data: Supplier[]; total: number }>(`/protected/suppliers?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = String((a as any)[sortBy] ?? '');
    const bv = String((b as any)[sortBy] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function openNew() {
    setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function flash(text: string, type: 'success'|'error' = 'success') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        code: f.code.trim() ? f.code.trim().toUpperCase() : undefined,
        accountNumber: f.accountNumber || null,
        taxId: f.taxId || null,
        is1099Eligible: f.is1099Eligible,
        name1099: f.is1099Eligible && f.name1099 ? f.name1099.trim() : null,
        street: f.street || null,
        city: f.city || null,
        state: f.state || null,
        zip: f.zip || null,
        country: f.country || 'US',
        paymentTermId: f.paymentTermId ? parseInt(f.paymentTermId) : null,
        creditLimit: f.creditLimit ? parseFloat(f.creditLimit) : null,
        w9OnFile: f.w9OnFile,
      };
      await api.post('/protected/suppliers', body);
      setDrawerOpen(false);
      flash('Supplier created.');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Deactivate supplier "${name}"?`)) return;
    try {
      await api.delete(`/protected/suppliers/${id}`);
      flash('Supplier deactivated.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Suppliers</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{total} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Supplier</button>
      </div>

      {toast && (
        <div style={{
          background: toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem',
          color: toast.type === 'success' ? '#22c55e' : c.danger,
        }}>{toast.text}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search name, code, city..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button style={btnSecondary} onClick={() => setSearch('')}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="name"  label="Name"  sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="code"  label="Code"  sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="city"  label="City / State" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Terms</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Contacts</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No suppliers found.</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }} onClick={() => navigate(`/suppliers/${r.id}`)}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }} onClick={() => navigate(`/suppliers/${r.id}`)}>{r.code}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/suppliers/${r.id}`)}>
                  {r.city && r.state ? `${r.city}, ${r.state}` : r.city || r.state || '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/suppliers/${r.id}`)}>
                  {r.paymentTerm?.termName ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/suppliers/${r.id}`)}>
                  {r._count?.contacts ?? 0}
                </td>
                <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/suppliers/${r.id}`)}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  {r.isActive && (
                    <button style={{ ...btnDanger, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={e => { e.stopPropagation(); handleDelete(r.id, r.name); }}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* New Supplier drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Supplier" width={540}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Acme Paper Co." /></Field>
          <Field label="Code (auto if blank)"><input style={inputStyle} value={f.code} onChange={set('code')} placeholder="ACME01" /></Field>
          <Field label="Account Number"><input style={inputStyle} value={f.accountNumber} onChange={set('accountNumber')} /></Field>
          <Field label="Tax ID"><input style={inputStyle} value={f.taxId} onChange={set('taxId')} /></Field>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is1099Eligible} onChange={set('is1099Eligible')} /> 1099 Eligible
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.w9OnFile} onChange={set('w9OnFile')} /> W9 On File
          </label>
        </div>

        {f.is1099Eligible && (
          <Field label="1099 Name"><input style={inputStyle} value={f.name1099} onChange={set('name1099')} placeholder="Legal name for 1099" /></Field>
        )}

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${c.divider}` }}>
          Address
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Street"><input style={inputStyle} value={f.street} onChange={set('street')} /></Field></div>
          <Field label="City"><input style={inputStyle} value={f.city} onChange={set('city')} /></Field>
          <Field label="State"><input style={inputStyle} value={f.state} onChange={set('state')} /></Field>
          <Field label="Zip"><input style={inputStyle} value={f.zip} onChange={set('zip')} /></Field>
          <Field label="Country"><input style={inputStyle} value={f.country} onChange={set('country')} /></Field>
        </div>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${c.divider}` }}>
          Payment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <Field label="Payment Terms">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.paymentTermId} onChange={set('paymentTermId')}>
              <option value="">-- Select --</option>
              {paymentTerms.map(t => <option key={t.id} value={t.id}>{t.termName}</option>)}
            </select>
          </Field>
          <Field label="Credit Limit ($)"><input style={inputStyle} type="number" step="0.01" value={f.creditLimit} onChange={set('creditLimit')} /></Field>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Supplier'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
