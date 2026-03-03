import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface EquipmentType { id: number; typeKey: string; typeName: string }

interface Operation {
  id: number; operationKey: string; operationName: string;
  defaultEquipmentTypeId?: number; sortOrder: number;
  defaultEquipmentType?: { id: number; typeKey: string; typeName: string };
}

const EMPTY_FORM = { operationKey: '', operationName: '', defaultEquipmentTypeId: '', sortOrder: '0' };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
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
export function OperationsListPage() {
  const [rows, setRows]           = useState<Operation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);

  useEffect(() => {
    api.get<EquipmentType[]>('/protected/work-center-types').then(setEquipmentTypes).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<Operation[]>('/protected/operations');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sort by sortOrder then operationKey
  const sorted = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.operationKey.localeCompare(b.operationKey);
  });

  // ── Drawer helpers ──
  function openNew() {
    setEditId(null);
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  function openEdit(r: Operation) {
    setEditId(r.id);
    setSaveErr('');
    setF({
      operationKey: r.operationKey,
      operationName: r.operationName,
      defaultEquipmentTypeId: r.defaultEquipmentTypeId != null ? String(r.defaultEquipmentTypeId) : '',
      sortOrder: String(r.sortOrder),
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.operationKey.trim()) { setSaveErr('Operation key is required'); return; }
    if (!f.operationName.trim()) { setSaveErr('Operation name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        operationKey: f.operationKey.trim().toUpperCase(),
        operationName: f.operationName.trim(),
        defaultEquipmentTypeId: f.defaultEquipmentTypeId ? parseInt(f.defaultEquipmentTypeId) : null,
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : 0,
      };
      if (editId) {
        await api.put(`/protected/operations/${editId}`, body);
        flash('Operation updated.', 'success');
      } else {
        await api.post('/protected/operations', body);
        flash('Operation created.', 'success');
      }
      setDrawerOpen(false);
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteOp() {
    if (!editId) return;
    const op = rows.find(r => r.id === editId);
    if (!window.confirm(`Delete operation "${op?.operationName}"? This will fail if equipment capabilities reference it.`)) return;
    try {
      await api.delete(`/protected/operations/${editId}`);
      setDrawerOpen(false);
      flash('Operation deleted.', 'success');
      load();
    } catch (e: any) {
      // 409 means capabilities reference it
      setSaveErr(e.message);
    }
  }

  function flash(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 4000);
  }

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Operations</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            Production operations — {rows.length} defined
          </p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ Add Operation</button>
      </div>

      {toast && <Toast msg={toast.text} type={toast.type} />}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 860 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              {['Operation Key', 'Operation Name', 'Default Equipment Type', 'Sort Order'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No operations defined yet.</td></tr>
            )}
            {!loading && sorted.map(r => (
              <tr
                key={r.id}
                onClick={() => openEdit(r)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.operationKey}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.operationName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {r.defaultEquipmentType ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                      {r.defaultEquipmentType.typeName}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: c.textMuted }}>{'\u2014'}</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Operation' : 'New Operation'}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <Field label="Operation Key *">
          <input style={inputStyle} value={f.operationKey} onChange={set('operationKey')} placeholder="PRINT_FLEXO" />
        </Field>
        <Field label="Operation Name *">
          <input style={inputStyle} value={f.operationName} onChange={set('operationName')} placeholder="Flexographic Printing" />
        </Field>
        <Field label="Default Equipment Type">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.defaultEquipmentTypeId} onChange={set('defaultEquipmentTypeId')}>
            <option value="">-- None --</option>
            {equipmentTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
          </select>
        </Field>
        <Field label="Sort Order">
          <input style={inputStyle} type="number" value={f.sortOrder} onChange={set('sortOrder')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Operation'}
          </button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
          {editId && (
            <button
              style={{ ...btnSecondary, marginLeft: 'auto', color: c.danger, borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={deleteOp}
            >
              Delete
            </button>
          )}
        </div>
      </Drawer>
    </Layout>
  );
}
