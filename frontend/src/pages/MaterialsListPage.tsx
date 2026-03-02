import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

const MAT_TYPES = ['BOARD', 'INK', 'ADHESIVE', 'TAPE', 'STAPLE', 'COATING', 'OTHER'];
const UOM_OPTS  = ['MSF', 'LF', 'ROLL', 'LB', 'GAL', 'EA', 'CTN'];

interface Material {
  id: number; code: string; name: string; type: string;
  unitOfMeasure: string; unitCost?: string; isActive: boolean;
  supplier?: { id: number; code: string; name: string };
}
interface Supplier { id: number; code: string; name: string }

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BOARD:    { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  INK:      { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' },
  ADHESIVE: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  TAPE:     { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  STAPLE:   { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
  COATING:  { bg: 'rgba(236,72,153,0.12)', text: '#f472b6' },
  OTHER:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
};

const EMPTY = {
  code: '', name: '', type: 'BOARD', unitOfMeasure: 'MSF', unitCost: '',
  supplierId: '', description: '', reorderPoint: '', isActive: true,
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

export function MaterialsListPage() {
  const [rows, setRows]             = useState<Material[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [sortBy, setSortBy]         = useState('name');
  const [sortDir, setSortDir]       = useState<'asc'|'desc'>('asc');
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);

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
      if (search)     p.set('search', search);
      if (typeFilter) p.set('type', typeFilter);
      const res = await api.get<{ data: Material[]; total: number }>(`/protected/materials?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  useEffect(() => {
    api.get<{ data: Supplier[] }>('/protected/suppliers?limit=200')
      .then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

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
      const r = await api.get<any>(`/protected/materials/${id}`);
      setF({
        code: r.code, name: r.name, type: r.type,
        unitOfMeasure: r.unitOfMeasure,
        unitCost: r.unitCost != null ? String(r.unitCost) : '',
        supplierId: r.supplierId != null ? String(r.supplierId) : '',
        description: r.description ?? '',
        reorderPoint: r.reorderPoint != null ? String(r.reorderPoint) : '',
        isActive: r.isActive,
      });
    } catch {}
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.code.trim())         { setSaveErr('Code is required'); return; }
    if (!f.name.trim())         { setSaveErr('Name is required'); return; }
    if (!f.unitOfMeasure.trim()){ setSaveErr('Unit of measure is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        code: f.code.trim().toUpperCase(), name: f.name.trim(), type: f.type,
        unitOfMeasure: f.unitOfMeasure,
        unitCost: f.unitCost ? parseFloat(f.unitCost) : null,
        supplierId: f.supplierId ? parseInt(f.supplierId) : null,
        description: f.description || null,
        reorderPoint: f.reorderPoint ? parseFloat(f.reorderPoint) : null,
        ...(editId ? { isActive: f.isActive } : {}),
      };
      if (editId) await api.put(`/protected/materials/${editId}`, body);
      else        await api.post('/protected/materials', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Materials</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Board grades, inks, adhesives — {total} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Material</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, maxWidth: 240 }} placeholder="Search code or name…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 160, cursor: 'pointer' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {MAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || typeFilter) && <button style={btnSecondary} onClick={() => { setSearch(''); setTypeFilter(''); }}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="code"          label="Code"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="name"          label="Name"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="type"          label="Type"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="unitOfMeasure" label="UoM"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="unitCost"      label="Unit Cost" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Supplier</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading…</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No materials found.</td></tr>}
            {!loading && sorted.map(r => {
              const col = TYPE_COLORS[r.type] ?? TYPE_COLORS.OTHER;
              return (
                <tr key={r.id} onClick={() => openEdit(r.id)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: col.bg, color: col.text }}>{r.type}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.unitOfMeasure}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.unitCost ? `$${parseFloat(r.unitCost).toFixed(4)}` : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.supplier?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Material' : 'New Material'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <Field label="Code *"><input style={inputStyle} value={f.code} onChange={set('code')} placeholder="BOARD-42" /></Field>
          <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="42# Kraft Liner" /></Field>
          <Field label="Type *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.type} onChange={set('type')}>
              {MAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Unit of Measure *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.unitOfMeasure} onChange={set('unitOfMeasure')}>
              {UOM_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Unit Cost ($)"><input style={inputStyle} type="number" step="0.0001" value={f.unitCost} onChange={set('unitCost')} /></Field>
          <Field label="Reorder Point"><input style={inputStyle} type="number" step="0.01" value={f.reorderPoint} onChange={set('reorderPoint')} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Supplier">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.supplierId} onChange={set('supplierId')}>
                <option value="">— None —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label="Description"><textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.description} onChange={set('description')} /></Field>
        {editId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
            <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
          </label>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Material'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
