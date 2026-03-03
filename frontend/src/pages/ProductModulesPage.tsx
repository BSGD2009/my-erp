import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface ProductModule {
  id: number; moduleKey: string; moduleName: string;
  sortOrder: number; isActive: boolean;
  _count: { specFields: number; categories: number };
}

interface SpecField {
  id: number; fieldKey: string; fieldLabel: string;
  fieldType: string; selectOptions: string | null;
  isRequired: boolean; sortOrder: number;
}

const EMPTY_MOD = { moduleKey: '', moduleName: '', sortOrder: '0' };
const EMPTY_FIELD = { fieldKey: '', fieldLabel: '', fieldType: 'TEXT', selectOptions: '', isRequired: false, sortOrder: '0' };
const FIELD_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

export function ProductModulesPage() {
  const [rows, setRows]       = useState<ProductModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* Module drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [f, setF]                   = useState(EMPTY_MOD);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  /* Spec fields drawer */
  const [fieldsDrawerOpen, setFieldsDrawerOpen] = useState(false);
  const [selectedModule, setSelectedModule]     = useState<ProductModule | null>(null);
  const [specFields, setSpecFields]             = useState<SpecField[]>([]);
  const [fieldsLoading, setFieldsLoading]       = useState(false);
  const [fieldsError, setFieldsError]           = useState('');

  /* Spec field edit sub-drawer */
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editFieldId, setEditFieldId]         = useState<number | null>(null);
  const [ff, setFF]                           = useState(EMPTY_FIELD);
  const [fieldSaving, setFieldSaving]         = useState(false);
  const [fieldSaveErr, setFieldSaveErr]       = useState('');

  /* ── Load modules ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<ProductModule[]>('/protected/product-modules');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Module CRUD helpers ───────────────────────────────────────── */
  function openNew() {
    setEditId(null); setF(EMPTY_MOD); setSaveErr(''); setDrawerOpen(true);
  }

  function openEdit(r: ProductModule, e: React.MouseEvent) {
    e.stopPropagation();
    setSaveErr(''); setEditId(r.id);
    setF({
      moduleKey: r.moduleKey,
      moduleName: r.moduleName,
      sortOrder: String(r.sortOrder),
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_MOD) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.moduleKey.trim())  { setSaveErr('Module Key is required'); return; }
    if (!f.moduleName.trim()) { setSaveErr('Module Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        moduleKey: f.moduleKey.trim().toUpperCase(),
        moduleName: f.moduleName.trim(),
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : 0,
      };
      if (editId) await api.put(`/protected/product-modules/${editId}`, body);
      else        await api.post('/protected/product-modules', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteModule(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Deactivate this product module?')) return;
    try {
      await api.delete(`/protected/product-modules/${id}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  /* ── Spec fields helpers ───────────────────────────────────────── */
  async function openFieldsDrawer(mod: ProductModule) {
    setSelectedModule(mod);
    setFieldsDrawerOpen(true);
    setFieldsLoading(true); setFieldsError('');
    try {
      const res = await api.get<SpecField[]>(`/protected/product-modules/${mod.id}/spec-fields`);
      setSpecFields(res);
    } catch (e: any) { setFieldsError(e.message); }
    finally { setFieldsLoading(false); }
  }

  async function reloadFields() {
    if (!selectedModule) return;
    setFieldsLoading(true); setFieldsError('');
    try {
      const res = await api.get<SpecField[]>(`/protected/product-modules/${selectedModule.id}/spec-fields`);
      setSpecFields(res);
    } catch (e: any) { setFieldsError(e.message); }
    finally { setFieldsLoading(false); }
  }

  function openNewField() {
    setEditFieldId(null); setFF(EMPTY_FIELD); setFieldSaveErr(''); setFieldDrawerOpen(true);
  }

  function openEditField(sf: SpecField) {
    setFieldSaveErr(''); setEditFieldId(sf.id);
    setFF({
      fieldKey: sf.fieldKey,
      fieldLabel: sf.fieldLabel,
      fieldType: sf.fieldType,
      selectOptions: sf.selectOptions || '',
      isRequired: sf.isRequired,
      sortOrder: String(sf.sortOrder),
    });
    setFieldDrawerOpen(true);
  }

  const setField = (k: keyof typeof EMPTY_FIELD) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFF(p => ({ ...p, [k]: val }));
  };

  async function saveField() {
    if (!selectedModule) return;
    if (!ff.fieldKey.trim())   { setFieldSaveErr('Field Key is required'); return; }
    if (!ff.fieldLabel.trim()) { setFieldSaveErr('Field Label is required'); return; }
    setFieldSaving(true); setFieldSaveErr('');
    try {
      const body: Record<string, unknown> = {
        fieldKey: ff.fieldKey.trim().toUpperCase(),
        fieldLabel: ff.fieldLabel.trim(),
        fieldType: ff.fieldType,
        isRequired: ff.isRequired,
        sortOrder: ff.sortOrder ? parseInt(ff.sortOrder as string) : 0,
      };
      if (ff.fieldType === 'SELECT' && ff.selectOptions) {
        body.selectOptions = ff.selectOptions;
      }
      if (editFieldId) await api.put(`/protected/product-modules/${selectedModule.id}/spec-fields/${editFieldId}`, body);
      else             await api.post(`/protected/product-modules/${selectedModule.id}/spec-fields`, body);
      setFieldDrawerOpen(false); reloadFields(); load();
    } catch (e: any) { setFieldSaveErr(e.message); }
    finally { setFieldSaving(false); }
  }

  async function deleteField(fieldId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!selectedModule) return;
    if (!confirm('Delete this spec field?')) return;
    try {
      await api.delete(`/protected/product-modules/${selectedModule.id}/spec-fields/${fieldId}`);
      reloadFields(); load();
    } catch (err: any) {
      setFieldsError(err.message);
    }
  }

  /* ── Styles ────────────────────────────────────────────────────── */
  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Product Modules</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Configurable product types and spec fields — {rows.length} modules</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ Add Module</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 900 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <th style={thStyle}>Key</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Sort Order</th>
              <th style={thStyle}>Spec Fields</th>
              <th style={thStyle}>Categories</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No product modules found.</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.id} onClick={() => openFieldsDrawer(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.moduleKey}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.moduleName}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textMuted }}>{r.sortOrder}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r._count.specFields}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r._count.categories}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                    background: r.isActive ? c.successMuted : c.dangerMuted,
                    color: r.isActive ? c.success : c.danger,
                    border: `1px solid ${r.isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.3)'}`,
                  }}>{r.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: 4 }}>
                  <button
                    style={{ ...btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={e => openEdit(r, e)}
                    title="Edit module"
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={e => deleteModule(r.id, e)}
                    title="Deactivate module"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Module create/edit drawer ────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Product Module' : 'New Product Module'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <Field label="Module Key *"><input style={inputStyle} value={f.moduleKey} onChange={set('moduleKey')} placeholder="CORRUGATED_BOX" /></Field>
        <Field label="Module Name *"><input style={inputStyle} value={f.moduleName} onChange={set('moduleName')} placeholder="Corrugated Box" /></Field>
        <Field label="Sort Order"><input style={inputStyle} type="number" step="1" value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Module'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>

      {/* ── Spec fields drawer ───────────────────────────────────── */}
      <Drawer open={fieldsDrawerOpen} onClose={() => setFieldsDrawerOpen(false)} title={selectedModule ? `${selectedModule.moduleName} — Spec Fields` : 'Spec Fields'} width={640}>
        {fieldsError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{fieldsError}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{specFields.length} fields</span>
          <button style={{ ...btnPrimary, padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={openNewField}>+ Add Field</button>
        </div>

        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Label</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Required</th>
                <th style={thStyle}>Sort</th>
                <th style={{ ...thStyle, width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {fieldsLoading && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
              {!fieldsLoading && specFields.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: c.textMuted }}>No spec fields yet.</td></tr>}
              {!fieldsLoading && specFields.map(sf => (
                <tr key={sf.id} onClick={() => openEditField(sf)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: c.accent, fontWeight: 600 }}>{sf.fieldKey}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 500 }}>{sf.fieldLabel}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: c.textLabel }}>{sf.fieldType}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: sf.isRequired ? c.warning : c.textMuted }}>{sf.isRequired ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: c.textMuted }}>{sf.sortOrder}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <button
                      style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={e => deleteField(sf.id, e)}
                      title="Delete field"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Drawer>

      {/* ── Spec field create/edit drawer ─────────────────────────── */}
      <Drawer open={fieldDrawerOpen} onClose={() => setFieldDrawerOpen(false)} title={editFieldId ? 'Edit Spec Field' : 'New Spec Field'}>
        {fieldSaveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{fieldSaveErr}</div>}
        <Field label="Field Key *"><input style={inputStyle} value={ff.fieldKey} onChange={setField('fieldKey')} placeholder="FLUTE_TYPE" /></Field>
        <Field label="Field Label *"><input style={inputStyle} value={ff.fieldLabel} onChange={setField('fieldLabel')} placeholder="Flute Type" /></Field>
        <Field label="Field Type *">
          <select style={inputStyle} value={ff.fieldType} onChange={setField('fieldType')}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        {ff.fieldType === 'SELECT' && (
          <Field label="Select Options (comma-separated)">
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={ff.selectOptions as string}
              onChange={setField('selectOptions')}
              placeholder="A,B,C,E"
            />
          </Field>
        )}
        <Field label="Sort Order"><input style={inputStyle} type="number" step="1" value={ff.sortOrder as string} onChange={setField('sortOrder')} /></Field>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={ff.isRequired as boolean} onChange={setField('isRequired')} />
            <span style={{ fontSize: '0.85rem', color: c.textLabel }}>Required field</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={saveField} disabled={fieldSaving}>{fieldSaving ? 'Saving...' : editFieldId ? 'Save Changes' : 'Create Field'}</button>
          <button style={btnSecondary} onClick={() => setFieldDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
