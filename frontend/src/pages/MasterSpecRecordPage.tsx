import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';
import { FractionInput } from '../components/FractionInput';
import { decimalToFraction } from '../utils/fractions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MasterSpec {
  id: number; sku: string; name: string; description?: string;
  categoryId?: number; isActive: boolean; createdAt: string; updatedAt: string;
  category?: { id: number; name: string; module?: { id: number; moduleKey: string } };
  boxSpec?: BoxSpec;
  variants: Variant[];
  specs: Spec[];
  customerItems: CustomerItem[];
  finishedGoodsInventory: FGInventory[];
}
interface BoxSpec { id: number; lengthInches: string; widthInches: string; heightInches: string; outsideDimensions: boolean; style: string; hasDieCut: boolean; hasPerforations: boolean; notes?: string }
interface Variant {
  id: number; sku: string; variantDescription?: string;
  boardGradeId?: number; flute?: string; caliper?: string;
  width?: string; length?: string; thickness?: string;
  bundleQty?: number; caseQty?: number; listPrice?: string; isActive: boolean;
  boardGrade?: { id: number; gradeCode: string; gradeName: string; wallType: string; nominalCaliper: string };
  blankSpec?: object; bomLines?: object[]; customerItems?: { id: number; code: string; customer: { id: number; name: string } }[];
}
interface Spec { id: number; specKey: string; specValue: string; specUnit?: string; sortOrder?: number; variantId?: number }
interface CustomerItem { id: number; code: string; name: string; description?: string; customer: { id: number; name: string; code: string }; variant?: { id: number; sku: string } }
interface FGInventory { id: number; locationId: number; quantity: string; avgCost?: string; location: { id: number; name: string }; variant?: { id: number; sku: string } }
interface Category { id: number; name: string }
interface BoardGradeLookup { id: number; gradeCode: string; gradeName: string; wallType: string; nominalCaliper: string }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${c.divider}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FormGrid({ cols = 3, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.85rem 1.25rem' }}>
      {children}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const colors = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: c.danger };
  return <div style={{ ...colors, borderWidth: 1, borderStyle: 'solid', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{msg}</div>;
}

const SELECT_OPTS = {
  boxStyle:  ['RSC','HSC','FOL','TELESCOPE','DIE_CUT','BLISS','TRAY','OTHER'],
  flute:     ['A','B','C','E','F','BC','EB','OTHER'],
};

// ─────────────────────────────────────────────────────────────────────────────
// MasterSpecRecordPage
// ─────────────────────────────────────────────────────────────────────────────
export function MasterSpecRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [spec, setSpec]           = useState<MasterSpec | null>(null);
  const [loading, setLoading]     = useState(!isNew);
  const [activeTab, setTab]       = useState('Details');
  const [msg, setMsg]             = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Categories for selectors
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Load supporting data ──
  useEffect(() => {
    api.get<Category[]>('/protected/product-categories').then(setCategories).catch(() => {});
  }, []);

  // ── Load master spec ──
  const loadSpec = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const s = await api.get<MasterSpec>(`/protected/master-specs/${id}`);
      setSpec(s);
    } catch (e: any) {
      setMsg({ text: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => { loadSpec(); }, [loadSpec]);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Build tabs ──
  const tabs = ['Details', 'Box Spec', 'Variants', 'Customer Items', 'Inventory'];

  // ── Status pipeline ──
  function pipeline() {
    if (!spec) return null;
    const steps = [
      { label: 'Created',    done: true },
      { label: 'Specified',  done: !!spec.boxSpec || spec.variants.length > 0 },
      { label: 'Active',     done: spec.isActive },
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.5rem' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div style={{ width: 40, height: 2, background: s.done ? c.accent : c.divider }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? c.accent : 'rgba(255,255,255,0.05)', border: `2px solid ${s.done ? c.accent : c.divider}`, transition: 'all 0.2s' }}>
                {s.done ? <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                         : <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.divider }} />}
              </div>
              <span style={{ fontSize: '0.68rem', color: s.done ? c.textLabel : c.textMuted, fontWeight: s.done ? 600 : 400, letterSpacing: '0.02em' }}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;

  return (
    <Layout>
      {/* ── Breadcrumb ── */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/master-specs')}>Master Specs</span>
        {spec && <> &rsaquo; <span style={{ color: c.textLabel }}>{spec.sku}</span></>}
        {isNew && <> &rsaquo; <span style={{ color: c.textLabel }}>New Master Spec</span></>}
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* ── Header ── */}
      {spec && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{spec.name}</h1>
              {!spec.isActive && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>INACTIVE</span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: c.textMuted, marginTop: 4 }}>
              SKU: <span style={{ fontFamily: 'monospace', color: c.textLabel }}>{spec.sku}</span>
              {spec.category && <> &nbsp;&middot;&nbsp; {spec.category.name}</>}
            </div>
          </div>
        </div>
      )}

      {/* ── Status pipeline ── */}
      {spec && pipeline()}

      {/* ── Tabs ── */}
      {spec && (
        <div style={{ borderBottom: `1px solid ${c.cardBorder}`, marginBottom: '1.5rem', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ background: 'none', border: 'none', padding: '0.6rem 1rem', fontSize: '0.85rem', color: activeTab === t ? c.accent : c.textMuted, fontWeight: activeTab === t ? 600 : 400, cursor: 'pointer', borderBottom: `2px solid ${activeTab === t ? c.accent : 'transparent'}`, transition: 'all 0.12s', marginBottom: -1 }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content ── */}
      {isNew && <NewSpecForm categories={categories} onCreated={s => { setSpec(s); navigate(`/master-specs/${s.id}`); setTab('Details'); }} />}
      {spec && activeTab === 'Details'        && <DetailsTab       spec={spec} categories={categories} onUpdated={setSpec} flash={flash} />}
      {spec && activeTab === 'Box Spec'       && <BoxSpecTab       spec={spec} onUpdated={setSpec} flash={flash} />}
      {spec && activeTab === 'Variants'       && <VariantsTab      spec={spec} onUpdated={loadSpec} flash={flash} />}
      {spec && activeTab === 'Customer Items' && <CustomerItemsTab spec={spec} />}
      {spec && activeTab === 'Inventory'      && <InventoryTab     spec={spec} />}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Master Spec Form (shown when id = 'new')
// ─────────────────────────────────────────────────────────────────────────────
function NewSpecForm({ categories, onCreated }: { categories: Category[]; onCreated: (s: MasterSpec) => void }) {
  const [f, setF] = useState({ name: '', sku: '', categoryId: '', description: '', lengthInches: '', widthInches: '', heightInches: '', style: 'RSC' });
  const [nameManual, setNameManual] = useState(false);
  const [skuManual, setSkuManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Auto-generate name from dimensions + style
  useEffect(() => {
    if (nameManual) return;
    if (f.lengthInches && f.widthInches && f.heightInches) {
      setF(p => ({ ...p, name: `${p.lengthInches} x ${p.widthInches} x ${p.heightInches} ${p.style}` }));
    }
  }, [f.lengthInches, f.widthInches, f.heightInches, f.style, nameManual]);

  // Auto-generate SKU from dimensions + style
  useEffect(() => {
    if (skuManual) return;
    if (f.lengthInches && f.widthInches && f.heightInches) {
      setF(p => ({ ...p, sku: `BOX-${p.lengthInches}x${p.widthInches}x${p.heightInches}-${p.style}` }));
    }
  }, [f.lengthInches, f.widthInches, f.heightInches, f.style, skuManual]);

  async function save() {
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = { name: f.name };
      if (f.sku.trim())          body.sku = f.sku.trim().toUpperCase();
      if (f.categoryId)          body.categoryId = parseInt(f.categoryId);
      if (f.description.trim())  body.description = f.description.trim();
      const s = await api.post<MasterSpec>('/protected/master-specs', body);
      onCreated(s);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inp = (field: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>New Master Spec</h2>
      {err && <Toast msg={err} type="error" />}

      <FormGrid cols={3}>
        <Field label="Length (in)"><FractionInput value={f.lengthInches} onChange={val => setF(p => ({ ...p, lengthInches: val }))} placeholder="12-3/8" /></Field>
        <Field label="Width (in)"><FractionInput value={f.widthInches} onChange={val => setF(p => ({ ...p, widthInches: val }))} placeholder="10-1/2" /></Field>
        <Field label="Height (in)"><FractionInput value={f.heightInches} onChange={val => setF(p => ({ ...p, heightInches: val }))} placeholder="8" /></Field>
      </FormGrid>

      <Field label="Box Style">
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.style} onChange={inp('style')}>
          {SELECT_OPTS.boxStyle.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="Name *"><input style={inputStyle} value={f.name} onChange={e => { setNameManual(true); setF(p => ({ ...p, name: e.target.value })); }} placeholder="12x10x8 RSC Box" /></Field>

      <FormGrid cols={2}>
        <Field label="SKU (optional, auto-generates)"><input style={inputStyle} value={f.sku} onChange={e => { setSkuManual(true); setF(p => ({ ...p, sku: e.target.value })); }} placeholder="BOX-12X10X08" /></Field>
        <Field label="Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.categoryId} onChange={inp('categoryId')}>
            <option value="">&mdash; None &mdash;</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </Field>
      </FormGrid>

      <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={inp('description')} /></Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Master Spec'}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Details Tab
// ─────────────────────────────────────────────────────────────────────────────
function DetailsTab({ spec, categories, onUpdated, flash }: { spec: MasterSpec; categories: Category[]; onUpdated: (s: MasterSpec) => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: spec.name, description: spec.description ?? '', categoryId: String(spec.categoryId ?? ''), isActive: spec.isActive });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: f.name, description: f.description || null, isActive: f.isActive };
      body.categoryId = f.categoryId ? parseInt(f.categoryId) : null;
      const updated = await api.put<MasterSpec>(`/protected/master-specs/${spec.id}`, body);
      onUpdated(updated);
      setEdit(false);
      flash('Master spec saved.');
    } catch (e: any) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inp = (field: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [field]: e.target.value }));

  if (!edit) return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Master Spec Details</span>
        <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 2rem' }}>
        {[['Name', spec.name], ['SKU', spec.sku], ['Category', spec.category?.name ?? '\u2014'], ['Status', spec.isActive ? 'Active' : 'Inactive'], ['Last Updated', new Date(spec.updatedAt).toLocaleDateString()]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: '0.875rem', color: c.textPrimary }}>{v}</div>
          </div>
        ))}
      </div>
      {spec.description && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: '0.875rem', color: c.textLabel, lineHeight: 1.6 }}>{spec.description}</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Master Spec</h3>
      <Field label="Name *"><input style={inputStyle} value={f.name} onChange={inp('name')} /></Field>
      <FormGrid cols={2}>
        <Field label="Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.categoryId} onChange={inp('categoryId')}>
            <option value="">&mdash; None &mdash;</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </Field>
      </FormGrid>
      <Field label="Description"><textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={f.description} onChange={inp('description')} /></Field>
      <div style={{ display: 'flex', gap: 16, marginBottom: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Box Spec Tab
// ─────────────────────────────────────────────────────────────────────────────
function BoxSpecTab({ spec, onUpdated, flash }: { spec: MasterSpec; onUpdated: (s: MasterSpec) => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const box = spec.boxSpec;
  const [edit, setEdit] = useState(!box);
  const blank = { lengthInches: '', widthInches: '', heightInches: '', outsideDimensions: false, style: 'RSC', hasDieCut: false, hasPerforations: false, notes: '' };
  const [f, setF] = useState(box ? { lengthInches: box.lengthInches, widthInches: box.widthInches, heightInches: box.heightInches, outsideDimensions: box.outsideDimensions, style: box.style, hasDieCut: box.hasDieCut, hasPerforations: box.hasPerforations, notes: box.notes ?? '' } : blank);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(box ? (box.hasDieCut || box.hasPerforations) : false);

  async function save() {
    setSaving(true);
    try {
      const body = { ...f, lengthInches: parseFloat(f.lengthInches as any), widthInches: parseFloat(f.widthInches as any), heightInches: parseFloat(f.heightInches as any) };
      if (box) {
        await api.put(`/protected/master-specs/${spec.id}/box-spec`, body);
      } else {
        await api.post(`/protected/master-specs/${spec.id}/box-spec`, body);
      }
      const updated = await api.get<MasterSpec>(`/protected/master-specs/${spec.id}`);
      onUpdated(updated);
      setEdit(false);
      flash('Box spec saved.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  if (!edit && box) return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Customer Dimensions (Inside)</span>
        <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[['Length', decimalToFraction(Number(box.lengthInches))], ['Width', decimalToFraction(Number(box.widthInches))], ['Height', decimalToFraction(Number(box.heightInches))]].map(([l,v]) => (
          <div key={l} style={{ background: c.inputBg, borderRadius: 8, padding: '0.85rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: c.accent }}>{v}"</div>
            <div style={{ fontSize: '0.7rem', color: c.textMuted, marginTop: 2, textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem', fontSize: '0.85rem' }}>
        {[['Style', box.style], ['Outside Dims', box.outsideDimensions ? 'Yes' : 'No'], ['Die Cut', box.hasDieCut ? 'Yes' : 'No'], ['Perforations', box.hasPerforations ? 'Yes' : 'No']].map(([l,v]) => (
          <div key={l}><span style={{ color: c.textMuted }}>{l}:</span> <span style={{ color: c.textPrimary, marginLeft: 4 }}>{v}</span></div>
        ))}
      </div>
      {box.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: c.textLabel }}>{box.notes}</div>}
    </div>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 560 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{box ? 'Edit Box Spec' : 'Create Box Spec'}</h3>
      <FormGrid cols={3}>
        <Field label="Length (in) *"><FractionInput value={f.lengthInches as string} onChange={val => setF(p => ({ ...p, lengthInches: val }))} placeholder="12-3/8" /></Field>
        <Field label="Width (in) *"><FractionInput value={f.widthInches as string} onChange={val => setF(p => ({ ...p, widthInches: val }))} placeholder="10-1/2" /></Field>
        <Field label="Height (in) *"><FractionInput value={f.heightInches as string} onChange={val => setF(p => ({ ...p, heightInches: val }))} placeholder="8" /></Field>
      </FormGrid>
      <FormGrid cols={2}>
        <Field label="Box Style">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.style} onChange={e => setF(p => ({ ...p, style: e.target.value }))}>
            {SELECT_OPTS.boxStyle.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </FormGrid>
      <div style={{ display: 'flex', gap: 20, margin: '0.25rem 0 1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }} title="When checked, L/W/H values represent the outside dimensions of the box rather than the inside.">
          <input type="checkbox" checked={f.outsideDimensions} onChange={e => setF(p => ({ ...p, outsideDimensions: e.target.checked }))} /> Outside dimensions
        </label>
      </div>
      <div onClick={() => setShowAdvanced(s => !s)} style={{ cursor: 'pointer', color: c.accent, fontSize: '0.82rem', marginBottom: '0.75rem' }}>{showAdvanced ? '\u25be Hide' : '\u25b8 Show'} Advanced Options</div>
      {showAdvanced && (
        <div style={{ display: 'flex', gap: 20, margin: '0 0 1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.hasDieCut} onChange={e => setF(p => ({ ...p, hasDieCut: e.target.checked }))} /> Has die cut
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.hasPerforations} onChange={e => setF(p => ({ ...p, hasPerforations: e.target.checked }))} /> Has perforations
          </label>
        </div>
      )}
      <Field label="Notes"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {box && <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Variants Tab
// ─────────────────────────────────────────────────────────────────────────────
function VariantsTab({ spec, onUpdated, flash }: { spec: MasterSpec; onUpdated: () => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [boardGrades, setBoardGrades] = useState<BoardGradeLookup[]>([]);
  const [f, setF] = useState({ sku: '', variantDescription: '', boardGradeId: '', flute: '', caliper: '', width: '', length: '', bundleQty: '', caseQty: '', listPrice: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<BoardGradeLookup[]>('/protected/board-grades').then(setBoardGrades).catch(() => {});
  }, []);

  function handleBoardGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const grade = boardGrades.find(g => g.id === parseInt(val));
    setF(p => ({ ...p, boardGradeId: val, caliper: grade ? grade.nominalCaliper : p.caliper }));
  }

  async function addVariant() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { sku: f.sku };
      if (f.variantDescription) body.variantDescription = f.variantDescription;
      if (f.boardGradeId) body.boardGradeId = parseInt(f.boardGradeId);
      if (f.flute)        body.flute = f.flute;
      if (f.caliper)      body.caliper = parseFloat(f.caliper);
      if (f.width)        body.width = parseFloat(f.width);
      if (f.length)       body.length = parseFloat(f.length);
      if (f.bundleQty)    body.bundleQty = parseInt(f.bundleQty);
      if (f.caseQty)      body.caseQty = parseInt(f.caseQty);
      if (f.listPrice)    body.listPrice = parseFloat(f.listPrice);
      await api.post(`/protected/master-specs/${spec.id}/variants`, body);
      onUpdated();
      setShowAdd(false);
      setF({ sku: '', variantDescription: '', boardGradeId: '', flute: '', caliper: '', width: '', length: '', bundleQty: '', caseQty: '', listPrice: '' });
      flash('Variant added.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  async function deactivate(vid: number, ev: React.MouseEvent) {
    ev.stopPropagation();
    if (!confirm('Deactivate this variant?')) return;
    try {
      await api.delete(`/protected/master-specs/${spec.id}/variants/${vid}`);
      onUpdated();
      flash('Variant deactivated.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{spec.variants.length} variant{spec.variants.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={() => setShowAdd(s => !s)}>+ Add Variant</button>
      </div>

      {showAdd && (
        <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 700 }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Add Variant</h4>
          <FormGrid cols={2}>
            <Field label="SKU *"><input style={inputStyle} value={f.sku} onChange={set('sku')} /></Field>
            <Field label="Description"><input style={inputStyle} value={f.variantDescription} onChange={set('variantDescription')} /></Field>
            <Field label="Board Grade">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.boardGradeId} onChange={handleBoardGradeChange}>
                <option value="">&mdash; None &mdash;</option>
                {boardGrades.map(g => <option key={g.id} value={g.id}>{g.gradeCode} &mdash; {g.gradeName} ({g.wallType})</option>)}
              </select>
            </Field>
            <Field label="Flute">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.flute} onChange={set('flute')}>
                <option value="">&mdash; None &mdash;</option>
                {SELECT_OPTS.flute.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Caliper (in)"><input style={inputStyle} type="number" step="0.001" value={f.caliper} onChange={set('caliper')} placeholder="Auto from grade" /></Field>
            <Field label="Width (in)"><input style={inputStyle} type="number" step="0.125" value={f.width} onChange={set('width')} /></Field>
            <Field label="Length (in)"><input style={inputStyle} type="number" step="0.125" value={f.length} onChange={set('length')} /></Field>
            <Field label="Bundle Qty"><input style={inputStyle} type="number" value={f.bundleQty} onChange={set('bundleQty')} /></Field>
            <Field label="Case Qty"><input style={inputStyle} type="number" value={f.caseQty} onChange={set('caseQty')} /></Field>
            <Field label="List Price"><input style={inputStyle} type="number" step="0.0001" value={f.listPrice} onChange={set('listPrice')} /></Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={btnPrimary} onClick={addVariant} disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
            <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {spec.variants.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No variants yet.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['SKU','Description','Board Grade','Flute','W x L','List Price','Status',''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.variants.map(v => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/master-specs/${spec.id}/variants/${v.id}`)}
                  style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{v.sku}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>{v.variantDescription ?? '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{v.boardGrade?.gradeCode ?? '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{v.flute ?? '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{v.width && v.length ? `${v.width}" x ${v.length}"` : '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem' }}>{v.listPrice ? `$${Number(v.listPrice).toFixed(2)}` : '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 4, background: v.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: v.isActive ? '#22c55e' : '#64748b' }}>{v.isActive ? 'Active' : 'Off'}</span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    {v.isActive && <button style={{ ...btnDanger, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={(ev) => deactivate(v.id, ev)}>Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Customer Items Tab (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function CustomerItemsTab({ spec }: { spec: MasterSpec }) {
  const navigate = useNavigate();
  const rows = spec.customerItems ?? [];

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{rows.length} customer item{rows.length !== 1 ? 's' : ''} reference this master spec</span>
        <button style={btnPrimary} onClick={() => navigate(`/customer-items/new?masterSpecId=${spec.id}`)}>+ New Customer Item</button>
      </div>
      {rows.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No customer items linked to this master spec.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Code', 'Name', 'Variant', 'Customer'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(ci => (
                <tr
                  key={ci.id}
                  onClick={() => navigate(`/customer-items/${ci.id}`)}
                  style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{ci.code}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', color: c.textPrimary }}>{ci.name}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{ci.variant?.sku ?? '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{ci.customer?.name ?? '\u2014'} {ci.customer?.code ? `(${ci.customer.code})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Tab
// ─────────────────────────────────────────────────────────────────────────────
function InventoryTab({ spec }: { spec: MasterSpec }) {
  const rows = spec.finishedGoodsInventory;
  const total = rows.reduce((s, r) => s + Number(r.quantity), 0);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>Finished goods on hand</span>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: c.accent }}>{total.toLocaleString()} total</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No inventory on record.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Location', 'Variant', 'Qty on Hand', 'Avg Cost'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}>{r.location.name}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.variant?.sku ?? '\u2014'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{Number(r.quantity).toLocaleString()}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.avgCost ? `$${Number(r.avgCost).toFixed(4)}` : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
