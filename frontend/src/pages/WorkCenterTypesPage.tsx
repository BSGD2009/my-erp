import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface WorkCenterType {
  id: number; typeKey: string; typeName: string;
  sortOrder: number; isActive: boolean;
  _count: { workCenters: number; equipment: number };
}

const EMPTY = { typeKey: '', typeName: '', sortOrder: '0' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

export function WorkCenterTypesPage() {
  const [rows, setRows]       = useState<WorkCenterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<WorkCenterType[]>('/protected/work-center-types');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null); setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  function openEdit(r: WorkCenterType) {
    setSaveErr(''); setEditId(r.id);
    setF({
      typeKey: r.typeKey,
      typeName: r.typeName,
      sortOrder: String(r.sortOrder),
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.typeKey.trim())  { setSaveErr('Type Key is required'); return; }
    if (!f.typeName.trim()) { setSaveErr('Type Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        typeKey: f.typeKey.trim().toUpperCase(),
        typeName: f.typeName.trim(),
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : 0,
      };
      if (editId) await api.put(`/protected/work-center-types/${editId}`, body);
      else        await api.post('/protected/work-center-types', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteType(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Deactivate this work center type?')) return;
    try {
      await api.delete(`/protected/work-center-types/${id}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Work Center Types</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Admin lookup — {rows.length} types</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ Add Type</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 800 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <th style={thStyle}>Type Key</th>
              <th style={thStyle}>Type Name</th>
              <th style={thStyle}>Work Centers</th>
              <th style={thStyle}>Equipment</th>
              <th style={thStyle}>Sort Order</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No work center types found.</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.typeKey}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.typeName}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>{r._count.workCenters > 0 ? r._count.workCenters : '--'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>{r._count.equipment > 0 ? r._count.equipment : '--'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textMuted }}>{r.sortOrder}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button
                    style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={e => deleteType(r.id, e)}
                    title="Deactivate type"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Work Center Type' : 'New Work Center Type'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <Field label="Type Key *"><input style={inputStyle} value={f.typeKey} onChange={set('typeKey')} placeholder="CORRUGATOR" /></Field>
        <Field label="Type Name *"><input style={inputStyle} value={f.typeName} onChange={set('typeName')} placeholder="Corrugator Line" /></Field>
        <Field label="Sort Order"><input style={inputStyle} type="number" step="1" value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Type'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
