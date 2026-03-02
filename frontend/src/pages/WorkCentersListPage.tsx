import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

const WC_TYPES = ['PRINTING', 'SLITTING_SCORING', 'DIE_CUTTING', 'GLUING', 'BUNDLING_STRAPPING', 'SHIPPING', 'OTHER'];

interface WorkCenter {
  id: number; name: string; type: string; description?: string; isActive: boolean;
}

const EMPTY = { name: '', type: 'PRINTING', description: '', isActive: true };

function typeLabel(t: string) { return t.replace(/_/g, ' '); }

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

export function WorkCentersListPage() {
  const [rows, setRows]           = useState<WorkCenter[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy]       = useState('name');
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('asc');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number|null>(null);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (typeFilter) p.set('type', typeFilter);
      const res = await api.get<WorkCenter[]>(`/protected/work-centers?${p}`);
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

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

  function openEdit(r: WorkCenter) {
    setSaveErr(''); setEditId(r.id);
    setF({ name: r.name, type: r.type, description: r.description ?? '', isActive: r.isActive });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = { name: f.name.trim(), type: f.type, description: f.description || null, ...(editId ? { isActive: f.isActive } : {}) };
      if (editId) await api.put(`/protected/work-centers/${editId}`, body);
      else        await api.post('/protected/work-centers', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Work Centers</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{rows.length} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Work Center</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
        <select style={{ ...inputStyle, maxWidth: 220, cursor: 'pointer' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {WC_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        {typeFilter && <button style={btnSecondary} onClick={() => setTypeFilter('')}>Clear</button>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 760 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="name"        label="Name"        sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="type"        label="Type"        sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="description" label="Description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading…</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No work centers found.</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{typeLabel(r.type)}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.description ?? '—'}</td>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Work Center' : 'New Work Center'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Die Cutter 1" /></Field>
        <Field label="Type *">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.type} onChange={set('type')}>
            {WC_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={set('description')} /></Field>
        {editId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
            <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
          </label>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Work Center'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
