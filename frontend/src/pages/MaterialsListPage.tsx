import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

const UOM_OPTS = ['MSF', 'LF', 'ROLL', 'LB', 'GAL', 'EA', 'CTN'];

interface MaterialType { id: number; typeKey: string; typeName: string; sortOrder: number }
interface Material {
  id: number; code: string; name: string; unitOfMeasure: string;
  defaultCost?: string; reorderPoint?: string; reorderQty?: string;
  leadTimeDays?: number; isActive: boolean;
  materialType?: { id: number; typeKey: string; typeName: string };
  _count: { inventory: number };
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BOARD:     { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  INK:       { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  ADHESIVE:  { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  TAPE:      { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
  STAPLE:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
  COATING:   { bg: 'rgba(236,72,153,0.12)',  text: '#f472b6' },
};
const DEFAULT_TYPE_COLOR = { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' };

const EMPTY = {
  code: '', name: '', materialTypeId: '', unitOfMeasure: 'MSF',
  defaultCost: '', reorderPoint: '', reorderQty: '', leadTimeDays: '',
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
  const navigate = useNavigate();
  const [rows, setRows]             = useState<Material[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [sortBy, setSortBy]         = useState('code');
  const [sortDir, setSortDir]       = useState<'asc'|'desc'>('asc');
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     p.set('search', search);
      if (typeFilter) p.set('materialTypeId', typeFilter);
      const res = await api.get<{ data: Material[]; total: number }>(`/protected/materials?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  useEffect(() => {
    api.get<MaterialType[]>('/protected/material-types').then(setMaterialTypes).catch(() => {});
  }, []);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: string, bv: string;
    if (sortBy === 'type') {
      av = a.materialType?.typeName ?? '';
      bv = b.materialType?.typeName ?? '';
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function openNew() {
    setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim())         { setSaveErr('Name is required'); return; }
    if (!f.unitOfMeasure.trim()){ setSaveErr('Unit of measure is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        unitOfMeasure: f.unitOfMeasure,
        materialTypeId: f.materialTypeId ? parseInt(f.materialTypeId) : null,
      };
      if (f.code.trim()) body.code = f.code.trim().toUpperCase();
      if (f.defaultCost) body.defaultCost = parseFloat(f.defaultCost);
      if (f.reorderPoint) body.reorderPoint = parseFloat(f.reorderPoint);
      if (f.reorderQty) body.reorderQty = parseFloat(f.reorderQty);
      if (f.leadTimeDays) body.leadTimeDays = parseInt(f.leadTimeDays);

      await api.post('/protected/materials', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteMaterial(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Deactivate this material? This cannot be undone if it has inventory or BOM references.')) return;
    try {
      await api.delete(`/protected/materials/${id}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  function getTypeColor(typeKey?: string) {
    if (!typeKey) return DEFAULT_TYPE_COLOR;
    return TYPE_COLORS[typeKey] ?? DEFAULT_TYPE_COLOR;
  }

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
        <input style={{ ...inputStyle, maxWidth: 240 }} placeholder="Search code or name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 180, cursor: 'pointer' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {materialTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
        </select>
        {(search || typeFilter) && <button style={btnSecondary} onClick={() => { setSearch(''); setTypeFilter(''); }}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="code"          label="Code"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="name"          label="Name"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="type"          label="Type"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="unitOfMeasure" label="UoM"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="leadTimeDays"  label="Lead Time"  sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No materials found.</td></tr>}
            {!loading && sorted.map(r => {
              const typeKey = r.materialType?.typeKey;
              const col = getTypeColor(typeKey);
              return (
                <tr key={r.id} onClick={() => navigate(`/materials/${r.id}`)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {r.materialType ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: col.bg, color: col.text }}>{r.materialType.typeName}</span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: c.textMuted }}>--</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.unitOfMeasure}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.leadTimeDays != null ? `${r.leadTimeDays}d` : '--'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={e => deleteMaterial(r.id, e)}
                      title="Deactivate material"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Material">
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <Field label="Code (auto if blank)"><input style={inputStyle} value={f.code} onChange={set('code')} placeholder="BOARD-42" /></Field>
          <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="42# Kraft Liner" /></Field>
          <Field label="Material Type">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialTypeId} onChange={set('materialTypeId')}>
              <option value="">-- None --</option>
              {materialTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
            </select>
          </Field>
          <Field label="Unit of Measure *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.unitOfMeasure} onChange={set('unitOfMeasure')}>
              {UOM_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Default Cost ($)"><input style={inputStyle} type="number" step="0.0001" value={f.defaultCost} onChange={set('defaultCost')} /></Field>
          <Field label="Reorder Point"><input style={inputStyle} type="number" step="0.01" value={f.reorderPoint} onChange={set('reorderPoint')} /></Field>
          <Field label="Reorder Qty"><input style={inputStyle} type="number" step="0.01" value={f.reorderQty} onChange={set('reorderQty')} /></Field>
          <Field label="Lead Time (days)"><input style={inputStyle} type="number" step="1" value={f.leadTimeDays} onChange={set('leadTimeDays')} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Material'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
