import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface BoardGrade {
  id: number; gradeCode: string; gradeName: string;
  wallType: string; nominalCaliper: string;
  description?: string; isActive: boolean; sortOrder: number;
}

const EMPTY = { gradeCode: '', gradeName: '', wallType: 'SW', nominalCaliper: '', description: '', sortOrder: '0' };

const WALL_BADGE: Record<string, { bg: string; text: string }> = {
  SW: { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  DW: { bg: 'rgba(168,85,247,0.15)',  text: '#c084fc' },
  TW: { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

export function BoardGradesPage() {
  const [rows, setRows]       = useState<BoardGrade[]>([]);
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
      const res = await api.get<BoardGrade[]>('/protected/board-grades');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null); setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  function openEdit(r: BoardGrade) {
    setSaveErr(''); setEditId(r.id);
    setF({
      gradeCode: r.gradeCode,
      gradeName: r.gradeName,
      wallType: r.wallType,
      nominalCaliper: r.nominalCaliper != null ? String(r.nominalCaliper) : '',
      description: r.description ?? '',
      sortOrder: String(r.sortOrder),
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.gradeCode.trim()) { setSaveErr('Grade Code is required'); return; }
    if (!f.gradeName.trim()) { setSaveErr('Grade Name is required'); return; }
    if (!f.wallType)         { setSaveErr('Wall Type is required'); return; }
    if (!f.nominalCaliper || isNaN(parseFloat(f.nominalCaliper))) { setSaveErr('Nominal Caliper is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        gradeCode: f.gradeCode.trim().toUpperCase(),
        gradeName: f.gradeName.trim(),
        wallType: f.wallType,
        nominalCaliper: parseFloat(f.nominalCaliper),
        description: f.description?.trim() || null,
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : 0,
      };
      if (editId) await api.put(`/protected/board-grades/${editId}`, body);
      else        await api.post('/protected/board-grades', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteGrade(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Deactivate this board grade?')) return;
    try {
      await api.delete(`/protected/board-grades/${id}`);
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Board Grades</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Board grade reference data — {rows.length} defined</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ Add Grade</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 900 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <th style={thStyle}>Grade Code</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Wall Type</th>
              <th style={thStyle}>Caliper (in)</th>
              <th style={thStyle}>Sort Order</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No board grades found.</td></tr>}
            {!loading && rows.map(r => {
              const badge = WALL_BADGE[r.wallType] ?? WALL_BADGE.SW;
              return (
                <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.gradeCode}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.gradeName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 4,
                      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
                      background: badge.bg, color: badge.text,
                    }}>{r.wallType}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{Number(r.nominalCaliper).toFixed(3)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textMuted }}>{r.sortOrder}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={e => deleteGrade(r.id, e)}
                      title="Deactivate grade"
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Board Grade' : 'New Board Grade'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <Field label="Grade Code *"><input style={inputStyle} value={f.gradeCode} onChange={set('gradeCode')} placeholder="200C" /></Field>
          <Field label="Grade Name *"><input style={inputStyle} value={f.gradeName} onChange={set('gradeName')} placeholder="200# C-Flute" /></Field>
          <Field label="Wall Type *">
            <select style={inputStyle} value={f.wallType} onChange={set('wallType')}>
              <option value="SW">SW — Single Wall</option>
              <option value="DW">DW — Double Wall</option>
              <option value="TW">TW — Triple Wall</option>
            </select>
          </Field>
          <Field label="Nominal Caliper *"><input style={inputStyle} type="number" step="0.001" value={f.nominalCaliper} onChange={set('nominalCaliper')} placeholder="0.155" /></Field>
        </div>
        <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={f.description} onChange={set('description')} placeholder="Optional notes..." /></Field>
        <Field label="Sort Order"><input style={{ ...inputStyle, maxWidth: 120 }} type="number" step="1" value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Grade'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
          {editId && (
            <button
              style={{ ...btnDanger, marginLeft: 'auto' }}
              onClick={e => deleteGrade(editId, e)}
            >
              Delete
            </button>
          )}
        </div>
      </Drawer>
    </Layout>
  );
}
