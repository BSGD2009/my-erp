import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface Supplier {
  id: number; code: string; name: string; contactName?: string;
  email?: string; phone?: string; paymentTerms?: string;
  leadTimeDays?: number; isActive: boolean;
}

const EMPTY = {
  code: '', name: '', contactName: '', email: '', phone: '',
  address: '', paymentTerms: '', leadTimeDays: '', notes: '', isActive: true,
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
  const [rows, setRows]       = useState<Supplier[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortBy, setSortBy]   = useState('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

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
    setEditId(null); setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  async function openEdit(id: number) {
    setSaveErr(''); setEditId(id); setDrawerOpen(true);
    try {
      const r = await api.get<any>(`/protected/suppliers/${id}`);
      setF({
        code: r.code, name: r.name,
        contactName: r.contactName ?? '', email: r.email ?? '', phone: r.phone ?? '',
        address: r.address ?? '', paymentTerms: r.paymentTerms ?? '',
        leadTimeDays: r.leadTimeDays != null ? String(r.leadTimeDays) : '',
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
        paymentTerms: f.paymentTerms || null,
        leadTimeDays: f.leadTimeDays ? parseInt(f.leadTimeDays) : null,
        notes: f.notes || null,
        ...(editId ? { isActive: f.isActive } : {}),
      };
      if (editId) await api.put(`/protected/suppliers/${editId}`, body);
      else        await api.post('/protected/suppliers', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
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

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search name, code, contact…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button style={btnSecondary} onClick={() => setSearch('')}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="code"         label="Code"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="name"         label="Name"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="contactName"  label="Contact"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="email"        label="Email"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="phone"        label="Phone"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="paymentTerms" label="Terms"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="leadTimeDays" label="Lead Time" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading…</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No suppliers found.</td></tr>}
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
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.leadTimeDays != null ? `${r.leadTimeDays}d` : '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                    {r.isActive ? 'Active' : 'Inactive'}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Supplier' : 'New Supplier'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <Field label="Code *"><input style={inputStyle} value={f.code} onChange={set('code')} placeholder="SUPPL-01" /></Field>
          <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Acme Paper Co." /></Field>
          <Field label="Contact Name"><input style={inputStyle} value={f.contactName} onChange={set('contactName')} /></Field>
          <Field label="Email"><input style={inputStyle} type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input style={inputStyle} value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Payment Terms"><input style={inputStyle} value={f.paymentTerms} onChange={set('paymentTerms')} placeholder="Net 30" /></Field>
          <Field label="Lead Time (days)"><input style={inputStyle} type="number" value={f.leadTimeDays} onChange={set('leadTimeDays')} /></Field>
        </div>
        <Field label="Address"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={f.address} onChange={set('address')} /></Field>
        <Field label="Notes"><textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} /></Field>
        {editId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
            <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
          </label>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Supplier'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
