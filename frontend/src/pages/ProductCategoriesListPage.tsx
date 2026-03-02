import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface Category {
  id: number; name: string; parentId?: number; description?: string;
  sortOrder?: number; isActive: boolean;
  _count: { products: number; children: number };
}

const EMPTY = { name: '', parentId: '', description: '', sortOrder: '', isActive: true };

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

export function ProductCategoriesListPage() {
  const [rows, setRows]       = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sortBy, setSortBy]   = useState('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number|null>(null);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const nameMap = new Map(rows.map(r => [r.id, r.name]));

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<Category[]>('/protected/product-categories');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

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

  function openEdit(r: Category) {
    setSaveErr(''); setEditId(r.id);
    setF({
      name: r.name,
      parentId: r.parentId != null ? String(r.parentId) : '',
      description: r.description ?? '',
      sortOrder: r.sortOrder != null ? String(r.sortOrder) : '',
      isActive: r.isActive,
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        name: f.name.trim(),
        parentId: f.parentId ? parseInt(f.parentId) : null,
        description: f.description || null,
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : null,
        ...(editId ? { isActive: f.isActive } : {}),
      };
      if (editId) await api.put(`/protected/product-categories/${editId}`, body);
      else        await api.post('/protected/product-categories', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Product Categories</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{rows.length} categories</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Category</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 760 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="name"      label="Name"           sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Parent</th>
              <Th col="_count.children" label="Sub-categories" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="_count.products" label="Products"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading…</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No categories found.</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  {r.parentId && <span style={{ color: c.textMuted, marginRight: 4 }}>↳</span>}{r.name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.parentId ? (nameMap.get(r.parentId) ?? '—') : <span style={{ color: c.textMuted }}>Root</span>}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>{r._count.children > 0 ? r._count.children : '—'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>{r._count.products > 0 ? r._count.products : '—'}</td>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Category' : 'New Category'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Corrugated Boxes" /></Field>
        <Field label="Parent Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.parentId} onChange={set('parentId')}>
            <option value="">— Root level —</option>
            {rows.filter(r => r.id !== editId).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <Field label="Sort Order"><input style={inputStyle} type="number" value={f.sortOrder} onChange={set('sortOrder')} placeholder="0" /></Field>
        </div>
        <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={set('description')} /></Field>
        {editId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
            <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
          </label>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Category'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
