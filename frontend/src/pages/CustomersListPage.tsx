import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentTerm { id: number; termCode: string; termName: string; netDays: number }
interface Customer {
  id: number; code: string; name: string; accountNumber?: string;
  city?: string; state?: string; creditHold: boolean; taxExempt: boolean; isActive: boolean;
  acquisitionStatus?: string;
  paymentTerm?: { id: number; termName: string };
  defaultSalesRep?: { id: number; name: string };
  party?: { contacts: Array<{ id: number; name: string; phone?: string; email?: string }> };
  _count: { orders: number };
}

const EMPTY_FORM = {
  name: '', code: '', accountNumber: '', taxId: '', resaleCertificateNumber: '',
  street: '', city: '', state: '', zip: '', country: 'US',
  billingStreet: '', billingCity: '', billingState: '', billingZip: '', billingCountry: 'US',
  paymentTermId: '', creditLimit: '', creditHold: false, taxExempt: false, notes: '',
  acquisitionStatus: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: '0.85rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Th({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: string; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600,
        color: active ? '#93c5fd' : c.textMuted, letterSpacing: '0.05em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
      }}
    >
      {label}{active ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''}
    </th>
  );
}

function StatusBadge({ creditHold, isActive }: { creditHold: boolean; isActive: boolean }) {
  const cfg = creditHold
    ? { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Credit Hold' }
    : isActive
      ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Active' }
      : { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Inactive' };
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
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
export function CustomersListPage() {
  const navigate = useNavigate();

  const [rows, setRows]         = useState<Customer[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [acqFilter, setAcqFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [sortBy, setSortBy]     = useState('name');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  const LIMIT = 50;

  // Load payment terms once
  useEffect(() => {
    api.get<PaymentTerm[]>('/protected/payment-terms').then(setPaymentTerms).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) p.set('search', search);
      if (acqFilter) p.set('acquisitionStatus', acqFilter);
      const res = await api.get<{ data: Customer[]; total: number }>(`/protected/customers?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, acqFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, acqFilter]);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av = '', bv = '';
    if (sortBy === 'cityState') {
      av = `${a.city ?? ''} ${a.state ?? ''}`.trim();
      bv = `${b.city ?? ''} ${b.state ?? ''}`.trim();
    } else if (sortBy === 'terms') {
      av = a.paymentTerm?.termName ?? '';
      bv = b.paymentTerm?.termName ?? '';
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  // ── Drawer helpers ──
  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = (e.target as HTMLInputElement).type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setF(prev => ({ ...prev, [k]: val }));
  };

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name:                    f.name.trim(),
        code:                    f.code.trim() ? f.code.trim().toUpperCase() : undefined,
        accountNumber:           f.accountNumber.trim() || null,
        taxId:                   f.taxId.trim() || null,
        resaleCertificateNumber: (f.taxExempt && f.resaleCertificateNumber.trim()) ? f.resaleCertificateNumber.trim() : null,
        street:                  f.street.trim() || null,
        city:                    f.city.trim() || null,
        state:                   f.state.trim() || null,
        zip:                     f.zip.trim() || null,
        country:                 f.country.trim() || 'US',
        billingStreet:           f.billingStreet.trim() || null,
        billingCity:             f.billingCity.trim() || null,
        billingState:            f.billingState.trim() || null,
        billingZip:              f.billingZip.trim() || null,
        billingCountry:          f.billingCountry.trim() || 'US',
        paymentTermId:           f.paymentTermId ? Number(f.paymentTermId) : null,
        creditLimit:             f.creditLimit ? parseFloat(f.creditLimit) : null,
        creditHold:              f.creditHold,
        taxExempt:               f.taxExempt,
        notes:                   f.notes.trim() || null,
        acquisitionStatus:       f.acquisitionStatus || null,
      };
      await api.post('/protected/customers', body);
      setDrawerOpen(false);
      flash('Customer created.', 'success');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteCustomer(id: number, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Deactivate "${name}"? This is a soft delete.`)) return;
    try {
      await api.delete(`/protected/customers/${id}`);
      flash('Customer deactivated.', 'success');
      load();
    } catch (err: any) {
      flash(err.message, 'error');
    }
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Customers</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{total} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Customer</button>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* ── Search ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search name, code, account#, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, maxWidth: 180, cursor: 'pointer' }} value={acqFilter} onChange={e => setAcqFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['PROSPECT', 'QUOTED', 'NEGOTIATING', 'WON', 'ONBOARDING', 'ACTIVE', 'LOST', 'DORMANT'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {(search || acqFilter) && <button style={btnSecondary} onClick={() => { setSearch(''); setAcqFilter(''); }}>Clear</button>}
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
              <Th col="name"       label="Name"           sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="accountNumber" label="Account #"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="cityState"  label="City / State"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="terms"      label="Terms"          sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pipeline</th>
              <th style={{ padding: '0.75rem 1rem', width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search ? 'No customers match your search.' : 'No customers yet.'}
              </td></tr>
            )}
            {!loading && sorted.map(r => (
              <tr
                key={r.id}
                onClick={() => navigate(`/customers/${r.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: c.textPrimary }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: c.accent, marginTop: 1 }}>{r.code}</div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.accountNumber ?? '\u2014'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.city || r.state ? `${r.city ?? ''}${r.city && r.state ? ', ' : ''}${r.state ?? ''}` : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.paymentTerm?.termName ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StatusBadge creditHold={r.creditHold} isActive={r.isActive} />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {r.acquisitionStatus ? (() => {
                    const colors = STATUS_COLORS[r.acquisitionStatus!] ?? { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)' };
                    return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>{r.acquisitionStatus.replace(/_/g, ' ')}</span>;
                  })() : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <button
                    onClick={(e) => deleteCustomer(r.id, r.name, e)}
                    title="Deactivate"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '0.9rem', padding: '4px 6px', borderRadius: 4, lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                    onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}
                  >
                    &#x2715;
                  </button>
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

      {/* ── New Customer Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Customer" width={560}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *">
            <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Acme Packaging Corp" />
          </Field>
          <Field label="Code">
            <input style={inputStyle} value={f.code} onChange={set('code')} placeholder="Auto-generated if blank" />
          </Field>
          <Field label="Account Number">
            <input style={inputStyle} value={f.accountNumber} onChange={set('accountNumber')} />
          </Field>
          <Field label="Tax ID">
            <input style={inputStyle} value={f.taxId} onChange={set('taxId')} />
          </Field>
          <Field label="Payment Terms">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.paymentTermId} onChange={set('paymentTermId')}>
              <option value="">-- None --</option>
              {paymentTerms.map(t => <option key={t.id} value={t.id}>{t.termName}</option>)}
            </select>
          </Field>
          <Field label="Credit Limit ($)">
            <input style={inputStyle} type="number" step="0.01" min="0" value={f.creditLimit} onChange={set('creditLimit')} />
          </Field>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.creditHold} onChange={set('creditHold')} /> Credit Hold
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.taxExempt} onChange={set('taxExempt')} /> Tax Exempt
          </label>
        </div>

        {f.taxExempt && (
          <Field label="Resale Certificate #">
            <input style={inputStyle} value={f.resaleCertificateNumber} onChange={set('resaleCertificateNumber')} />
          </Field>
        )}

        {/* Address section */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Main Address
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Street" full>
            <input style={inputStyle} value={f.street} onChange={set('street')} />
          </Field>
          <Field label="City">
            <input style={inputStyle} value={f.city} onChange={set('city')} />
          </Field>
          <Field label="State">
            <input style={inputStyle} value={f.state} onChange={set('state')} />
          </Field>
          <Field label="Zip">
            <input style={inputStyle} value={f.zip} onChange={set('zip')} />
          </Field>
          <Field label="Country">
            <input style={inputStyle} value={f.country} onChange={set('country')} />
          </Field>
        </div>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Billing Address (if different)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Billing Street" full>
            <input style={inputStyle} value={f.billingStreet} onChange={set('billingStreet')} />
          </Field>
          <Field label="Billing City">
            <input style={inputStyle} value={f.billingCity} onChange={set('billingCity')} />
          </Field>
          <Field label="Billing State">
            <input style={inputStyle} value={f.billingState} onChange={set('billingState')} />
          </Field>
          <Field label="Billing Zip">
            <input style={inputStyle} value={f.billingZip} onChange={set('billingZip')} />
          </Field>
          <Field label="Billing Country">
            <input style={inputStyle} value={f.billingCountry} onChange={set('billingCountry')} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
        </Field>

        <Field label="Acquisition Status">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.acquisitionStatus} onChange={set('acquisitionStatus')}>
            <option value="">-- None --</option>
            {['PROSPECT', 'QUOTED', 'NEGOTIATING', 'WON', 'ONBOARDING', 'ACTIVE', 'LOST', 'DORMANT'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Customer'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
