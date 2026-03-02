import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface Customer {
  id: number; code: string; name: string; contactName?: string;
  email?: string; phone?: string; paymentTerms?: string;
  creditHold: boolean; isActive: boolean;
}

const EMPTY = {
  code: '', name: '', contactName: '', email: '', phone: '',
  address: '', billingAddress: '', paymentTerms: '', creditLimit: '',
  creditHold: false, taxExempt: false, notes: '', isActive: true,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
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
    <th onClick={() => onSort(col)} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: active ? '#93c5fd' : c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

export function CustomersListPage() {
  const [rows, setRows]         = useState<Customer[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [sortBy, setSortBy]     = useState('name');
  const [sortDir, setSortDir]   = useState<'asc'|'desc'>('asc');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number|null>(null);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) p.set('search', search);
      const res = await api.get<{ data: Customer[]; total: number }>(`/protected/customers?${p}`);
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
    setEditId(null); setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  async function openEdit(id: number) {
    setSaveErr(''); setEditId(id); setDrawerOpen(true);
    try {
      const r = await api.get<any>(`/protected/customers/${id}`);
      setF({
        code: r.code, name: r.name,
        contactName: r.contactName ?? '', email: r.email ?? '', phone: r.phone ?? '',
        address: r.address ?? '', billingAddress: r.billingAddress ?? '',
        paymentTerms: r.paymentTerms ?? '',
        creditLimit: r.creditLimit != null ? String(r.creditLimit) : '',
        creditHold: r.creditHold ?? false,
        taxExempt: r.taxExempt ?? false,
        notes: r.notes ?? '', isActive: r.isActive,
      });
    } catch {}
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.code.trim()) { setSaveErr('Code is required'); return; }
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        code: f.code.trim().toUpperCase(), name: f.name.trim(),
        contactName: f.contactName || null, email: f.email || null,
        phone: f.phone || null, address: f.address || null,
        billingAddress: f.billingAddress || null,
        paymentTerms: f.paymentTerms || null,
        creditLimit: f.creditLimit ? parseFloat(f.creditLimit) : null,
        creditHold: f.creditHold, taxExempt: f.taxExempt,
        notes: f.notes || null,
        ...(editId ? { isActive: f.isActive } : {}),
      };
      if (editId) await api.put(`/protected/customers/${editId}`, body);
      else        await api.post('/protected/customers', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Customers</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{total} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Customer</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search name, code, email…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button style={btnSecondary} onClick={() => setSearch('')}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="code"         label="Code"    sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="name"         label="Name"    sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="contactName"  label="Contact" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="email"        label="Email"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="phone"        label="Phone"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="paymentTerms" label="Terms"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading…</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No customers found.</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={r.id} onClick={() => openEdit(r.id)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.code}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.contactName ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.email ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.phone ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.paymentTerms ?? '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.creditHold ? 'rgba(245,158,11,0.12)' : r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.creditHold ? '#f59e0b' : r.isActive ? '#22c55e' : '#64748b' }}>
                    {r.creditHold ? 'Credit Hold' : r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Customer' : 'New Customer'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <Field label="Code *"><input style={inputStyle} value={f.code} onChange={set('code')} placeholder="ACME" /></Field>
          <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Acme Corp" /></Field>
          <Field label="Contact Name"><input style={inputStyle} value={f.contactName} onChange={set('contactName')} /></Field>
          <Field label="Email"><input style={inputStyle} type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input style={inputStyle} value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Payment Terms"><input style={inputStyle} value={f.paymentTerms} onChange={set('paymentTerms')} placeholder="Net 30" /></Field>
          <Field label="Credit Limit ($)"><input style={inputStyle} type="number" step="0.01" value={f.creditLimit} onChange={set('creditLimit')} /></Field>
        </div>
        <Field label="Address"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={f.address} onChange={set('address')} /></Field>
        <Field label="Billing Address (if different)"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={f.billingAddress} onChange={set('billingAddress')} /></Field>
        <Field label="Notes"><textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} /></Field>
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.creditHold} onChange={set('creditHold')} /> Credit Hold
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.taxExempt} onChange={set('taxExempt')} /> Tax Exempt
          </label>
          {editId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Customer'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
