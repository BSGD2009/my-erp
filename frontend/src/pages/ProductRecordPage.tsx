import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
  id: number; sku: string; name: string; description?: string;
  productType: string; categoryId?: number; isCustom: boolean;
  listPrice?: string; isActive: boolean; createdAt: string; updatedAt: string;
  category?: { id: number; name: string };
  boxSpec?: BoxSpec; blankSpec?: BlankSpec;
  bomLines: BOMLine[]; variants: Variant[]; specs: Spec[];
  finishedGoodsInventory: FGInventory[];
}
interface BoxSpec { id: number; lengthInches: string; widthInches: string; heightInches: string; outsideDimensions: boolean; style: string; hasDieCut: boolean; hasPerforations: boolean; notes?: string }
interface BlankSpec { id: number; materialId: number; outsPerSheet: number; sheetsPerBox: string; sheetLengthInches?: string; sheetWidthInches?: string; layoutNotes?: string; rollWidthRequired?: string; requiredDieId?: number; requiredPlateIds?: string; materialVariantId?: number; blankLengthInches: string; blankWidthInches: string; grainDirection: string; boardGrade: string; flute: string; wallType: string; scoreCount: number; scorePositions: string; slotDepth?: string; slotWidth?: string; specialCuts?: string; trimAmount?: string; jointType: string; printType: string; printColors: number; inkTypes?: string; plateNumbers?: string; coating: string; bundleCount?: number; tieHigh?: number; tierWide?: number; palletsPerOrder?: number; notes?: string; material?: { id: number; code: string; name: string }; requiredDie?: { id: number; toolNumber: string }; materialVariant?: { id: number; variantCode: string } }
interface Variant { id: number; sku: string; variantDescription?: string; width?: string; length?: string; thickness?: string; bundleQty?: number; caseQty?: number; listPrice?: string; isActive: boolean }
interface Spec { id: number; specKey: string; specValue: string; specUnit?: string; sortOrder?: number; variantId?: number }
interface BOMLine { id: number; materialId: number; quantityPer: string; unitOfMeasure: string; material: { id: number; code: string; name: string; unitOfMeasure: string } }
interface FGInventory { id: number; locationId: number; quantity: string; avgCost?: string; location: { id: number; name: string }; variant?: { id: number; sku: string } }
interface Category { id: number; name: string }
interface Material { id: number; code: string; name: string; unitOfMeasure: string }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = { CORRUGATED_BOX: 'Corrugated Box', PACKAGING_SUPPLY: 'Packaging Supply', RESALE: 'Resale', LABOR_SERVICE: 'Labor / Service', OTHER: 'Other' };
const TYPE_COLOR: Record<string, string> = { CORRUGATED_BOX: '#60a5fa', PACKAGING_SUPPLY: '#c084fc', RESALE: '#2dd4bf', LABOR_SERVICE: '#fbbf24', OTHER: '#94a3b8' };

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
  flute:     ['A','B','C','E','F','BC','EB','OTHER'],
  wallType:  ['SINGLE','DOUBLE','TRIPLE'],
  printType: ['NONE','ONE_COLOR','TWO_COLOR','THREE_COLOR','FOUR_COLOR'],
  coating:   ['NONE','WAX','CLAY','UV','VARNISH'],
  grain:     ['LONG_GRAIN','SHORT_GRAIN'],
  joint:     ['GLUED','STAPLED','TAPED','NONE'],
  boxStyle:  ['RSC','HSC','FOL','TELESCOPE','DIE_CUT','BLISS','TRAY','OTHER'],
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductRecordPage
// ─────────────────────────────────────────────────────────────────────────────
export function ProductRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [product, setProduct]   = useState<Product | null>(null);
  const [loading, setLoading]   = useState(!isNew);
  const [activeTab, setTab]     = useState('details');
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Categories and materials for selectors
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials,  setMaterials]  = useState<Material[]>([]);

  // ── Load supporting data ──
  useEffect(() => {
    api.get<{ data: Category[] }>('/protected/product-categories').then(r => setCategories(r.data)).catch(() => {});
    api.get<{ data: Material[] }>('/protected/materials?limit=500').then(r => setMaterials(r.data)).catch(() => {});
  }, []);

  // ── Load product ──
  const loadProduct = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const p = await api.get<Product>(`/protected/products/${id}`);
      setProduct(p);
    } catch (e: any) {
      setMsg({ text: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Build tabs based on productType ──
  const tabs = ['Details'];
  if (product?.productType === 'CORRUGATED_BOX') {
    tabs.push('Box Spec', 'Blank Spec');
  }
  if (product && product.productType !== 'LABOR_SERVICE') {
    tabs.push('Variants');
  }
  if (product && ['PACKAGING_SUPPLY', 'OTHER'].includes(product.productType)) {
    tabs.push('Specs');
  }
  tabs.push('BOM', 'Inventory');

  // ── Status pipeline ──
  function pipeline() {
    if (!product) return null;
    const isBox = product.productType === 'CORRUGATED_BOX';
    const steps = [
      { label: 'Created',    done: true },
      { label: 'Specified',  done: isBox ? !!(product.boxSpec && product.blankSpec) : product.bomLines.length > 0 || product.variants.length > 0 },
      { label: 'Active',     done: product.isActive },
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

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading…</div></Layout>;

  return (
    <Layout>
      {/* ── Breadcrumb ── */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/products')}>Products</span>
        {product && <> &rsaquo; <span style={{ color: c.textLabel }}>{product.sku}</span></>}
        {isNew && <> &rsaquo; <span style={{ color: c.textLabel }}>New Product</span></>}
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* ── Header ── */}
      {product && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{product.name}</h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: `${TYPE_COLOR[product.productType]}20`, color: TYPE_COLOR[product.productType], letterSpacing: '0.03em' }}>
                {TYPE_LABEL[product.productType]}
              </span>
              {!product.isActive && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>INACTIVE</span>
              )}
              {product.isCustom && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>CUSTOM</span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: c.textMuted, marginTop: 4 }}>
              SKU: <span style={{ fontFamily: 'monospace', color: c.textLabel }}>{product.sku}</span>
              {product.category && <> &nbsp;·&nbsp; {product.category.name}</>}
            </div>
          </div>
        </div>
      )}

      {/* ── Status pipeline ── */}
      {product && pipeline()}

      {/* ── Tabs ── */}
      {product && (
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
      {isNew && <NewProductForm categories={categories} onCreated={p => { setProduct(p); navigate(`/products/${p.id}`); setTab('details'); }} />}
      {product && activeTab === 'Details'   && <DetailsTab    product={product} categories={categories} onUpdated={setProduct} flash={flash} />}
      {product && activeTab === 'Box Spec'  && <BoxSpecTab    product={product} onUpdated={setProduct} flash={flash} />}
      {product && activeTab === 'Blank Spec'&& <BlankSpecTab  product={product} materials={materials}  onUpdated={setProduct} flash={flash} />}
      {product && activeTab === 'Variants'  && <VariantsTab   product={product} onUpdated={loadProduct} flash={flash} />}
      {product && activeTab === 'Specs'     && <SpecsTab      product={product} onUpdated={loadProduct} flash={flash} />}
      {product && activeTab === 'BOM'       && <BOMTab        product={product} materials={materials}   onUpdated={loadProduct} flash={flash} />}
      {product && activeTab === 'Inventory' && <InventoryTab  product={product} />}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Product Form (shown when id = 'new')
// ─────────────────────────────────────────────────────────────────────────────
function NewProductForm({ categories, onCreated }: { categories: Category[]; onCreated: (p: Product) => void }) {
  const [f, setF] = useState({ sku: '', name: '', productType: 'CORRUGATED_BOX', categoryId: '', description: '', listPrice: '', isCustom: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = { sku: f.sku, name: f.name, productType: f.productType, isCustom: f.isCustom };
      if (f.categoryId) body.categoryId = parseInt(f.categoryId);
      if (f.description) body.description = f.description;
      if (f.listPrice)   body.listPrice   = parseFloat(f.listPrice);
      const p = await api.post<Product>('/protected/products', body);
      onCreated(p);
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
      <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>New Product</h2>
      {err && <Toast msg={err} type="error" />}

      <FormGrid cols={2}>
        <Field label="SKU *"><input style={inputStyle} value={f.sku} onChange={inp('sku')} placeholder="BOX-12X10X08" /></Field>
        <Field label="Product Type *">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.productType} onChange={inp('productType')}>
            {Object.entries(TYPE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </FormGrid>

      <Field label="Name *"><input style={inputStyle} value={f.name} onChange={inp('name')} placeholder="12×10×8 RSC Box" /></Field>

      <FormGrid cols={2}>
        <Field label="Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.categoryId} onChange={inp('categoryId')}>
            <option value="">— None —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="List Price"><input style={inputStyle} type="number" value={f.listPrice} onChange={inp('listPrice')} placeholder="0.00" /></Field>
      </FormGrid>

      <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={inp('description')} /></Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
        <input type="checkbox" checked={f.isCustom} onChange={e => setF(prev => ({ ...prev, isCustom: e.target.checked }))} />
        Custom / one-off item (not in standard catalog)
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Product'}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Details Tab
// ─────────────────────────────────────────────────────────────────────────────
function DetailsTab({ product, categories, onUpdated, flash }: { product: Product; categories: Category[]; onUpdated: (p: Product) => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: product.name, description: product.description ?? '', categoryId: String(product.categoryId ?? ''), listPrice: product.listPrice ?? '', isCustom: product.isCustom, isActive: product.isActive });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: f.name, description: f.description || null, isCustom: f.isCustom, isActive: f.isActive };
      body.categoryId = f.categoryId ? parseInt(f.categoryId) : null;
      body.listPrice  = f.listPrice  ? parseFloat(f.listPrice) : null;
      const updated = await api.put<Product>(`/protected/products/${product.id}`, body);
      onUpdated(updated);
      setEdit(false);
      flash('Product saved.');
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
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Product Details</span>
        <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 2rem' }}>
        {[['Name', product.name], ['SKU', product.sku], ['Product Type', TYPE_LABEL[product.productType] ?? product.productType], ['Category', product.category?.name ?? '—'], ['List Price', product.listPrice ? `$${Number(product.listPrice).toFixed(2)}` : '—'], ['Status', product.isActive ? 'Active' : 'Inactive'], ['Custom Item', product.isCustom ? 'Yes' : 'No'], ['Last Updated', new Date(product.updatedAt).toLocaleDateString()]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: '0.875rem', color: c.textPrimary }}>{v}</div>
          </div>
        ))}
      </div>
      {product.description && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: '0.875rem', color: c.textLabel, lineHeight: 1.6 }}>{product.description}</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Product</h3>
      <Field label="Name *"><input style={inputStyle} value={f.name} onChange={inp('name')} /></Field>
      <FormGrid cols={2}>
        <Field label="Category">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.categoryId} onChange={inp('categoryId')}>
            <option value="">— None —</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </Field>
        <Field label="List Price"><input style={inputStyle} type="number" step="0.0001" value={f.listPrice} onChange={inp('listPrice')} /></Field>
      </FormGrid>
      <Field label="Description"><textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={f.description} onChange={inp('description')} /></Field>
      <div style={{ display: 'flex', gap: 16, marginBottom: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.isCustom} onChange={e => setF(p => ({ ...p, isCustom: e.target.checked }))} /> Custom item
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Box Spec Tab
// ─────────────────────────────────────────────────────────────────────────────
function BoxSpecTab({ product, onUpdated, flash }: { product: Product; onUpdated: (p: Product) => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const spec = product.boxSpec;
  const [edit, setEdit] = useState(!spec);
  const blank = { lengthInches: '', widthInches: '', heightInches: '', outsideDimensions: false, style: 'RSC', hasDieCut: false, hasPerforations: false, notes: '' };
  const [f, setF] = useState(spec ? { lengthInches: spec.lengthInches, widthInches: spec.widthInches, heightInches: spec.heightInches, outsideDimensions: spec.outsideDimensions, style: spec.style, hasDieCut: spec.hasDieCut, hasPerforations: spec.hasPerforations, notes: spec.notes ?? '' } : blank);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = { ...f, lengthInches: parseFloat(f.lengthInches as any), widthInches: parseFloat(f.widthInches as any), heightInches: parseFloat(f.heightInches as any) };
      let updated: Product;
      if (spec) {
        await api.put(`/protected/products/${product.id}/box-spec`, body);
      } else {
        await api.post(`/protected/products/${product.id}/box-spec`, body);
      }
      updated = await api.get<Product>(`/protected/products/${product.id}`);
      onUpdated(updated);
      setEdit(false);
      flash('Box spec saved.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  if (!edit && spec) return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Customer Dimensions (Inside)</span>
        <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[['Length', spec.lengthInches + '"'], ['Width', spec.widthInches + '"'], ['Height', spec.heightInches + '"']].map(([l,v]) => (
          <div key={l} style={{ background: c.inputBg, borderRadius: 8, padding: '0.85rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: c.accent }}>{v}</div>
            <div style={{ fontSize: '0.7rem', color: c.textMuted, marginTop: 2, textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem', fontSize: '0.85rem' }}>
        {[['Style', spec.style], ['Outside Dims', spec.outsideDimensions ? 'Yes' : 'No'], ['Die Cut', spec.hasDieCut ? 'Yes' : 'No'], ['Perforations', spec.hasPerforations ? 'Yes' : 'No']].map(([l,v]) => (
          <div key={l}><span style={{ color: c.textMuted }}>{l}:</span> <span style={{ color: c.textPrimary, marginLeft: 4 }}>{v}</span></div>
        ))}
      </div>
      {spec.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: c.textLabel }}>{spec.notes}</div>}
    </div>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 560 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{spec ? 'Edit Box Spec' : 'Create Box Spec'}</h3>
      <FormGrid cols={3}>
        <Field label="Length (in) *"><input style={inputStyle} type="number" step="0.125" value={f.lengthInches as any} onChange={e => setF(p => ({ ...p, lengthInches: e.target.value }))} /></Field>
        <Field label="Width (in) *"><input style={inputStyle} type="number" step="0.125" value={f.widthInches as any} onChange={e => setF(p => ({ ...p, widthInches: e.target.value }))} /></Field>
        <Field label="Height (in) *"><input style={inputStyle} type="number" step="0.125" value={f.heightInches as any} onChange={e => setF(p => ({ ...p, heightInches: e.target.value }))} /></Field>
      </FormGrid>
      <FormGrid cols={2}>
        <Field label="Box Style">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.style} onChange={e => setF(p => ({ ...p, style: e.target.value }))}>
            {SELECT_OPTS.boxStyle.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </FormGrid>
      <div style={{ display: 'flex', gap: 20, margin: '0.25rem 0 1rem' }}>
        {[['outsideDimensions', 'Outside dimensions'], ['hasDieCut', 'Has die cut'], ['hasPerforations', 'Has perforations']].map(([k, l]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={(f as any)[k]} onChange={e => setF(p => ({ ...p, [k]: e.target.checked }))} /> {l}
          </label>
        ))}
      </div>
      <Field label="Notes"><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {spec && <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Blank Spec Tab
// ─────────────────────────────────────────────────────────────────────────────
function BlankSpecTab({ product, materials, onUpdated, flash }: { product: Product; materials: Material[]; onUpdated: (p: Product) => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const spec = product.blankSpec;
  const [edit, setEdit] = useState(!spec);
  const [saving, setSaving] = useState(false);

  const initForm = () => spec ? {
    materialId: String(spec.materialId), outsPerSheet: String(spec.outsPerSheet), sheetsPerBox: spec.sheetsPerBox,
    sheetLengthInches: spec.sheetLengthInches ?? '', sheetWidthInches: spec.sheetWidthInches ?? '',
    layoutNotes: spec.layoutNotes ?? '', rollWidthRequired: spec.rollWidthRequired ?? '',
    requiredDieId: String(spec.requiredDieId ?? ''), requiredPlateIds: spec.requiredPlateIds ?? '',
    materialVariantId: String(spec.materialVariantId ?? ''),
    blankLengthInches: spec.blankLengthInches, blankWidthInches: spec.blankWidthInches,
    grainDirection: spec.grainDirection, boardGrade: spec.boardGrade, flute: spec.flute, wallType: spec.wallType,
    scoreCount: String(spec.scoreCount), scorePositions: spec.scorePositions,
    slotDepth: spec.slotDepth ?? '', slotWidth: spec.slotWidth ?? '',
    specialCuts: spec.specialCuts ?? '', trimAmount: spec.trimAmount ?? '', jointType: spec.jointType,
    printType: spec.printType, printColors: String(spec.printColors), inkTypes: spec.inkTypes ?? '',
    plateNumbers: spec.plateNumbers ?? '', coating: spec.coating,
    bundleCount: String(spec.bundleCount ?? ''), tieHigh: String(spec.tieHigh ?? ''),
    tierWide: String(spec.tierWide ?? ''), palletsPerOrder: String(spec.palletsPerOrder ?? ''),
    notes: spec.notes ?? '',
  } : {
    materialId: '', outsPerSheet: '1', sheetsPerBox: '1.0',
    sheetLengthInches: '', sheetWidthInches: '', layoutNotes: '', rollWidthRequired: '',
    requiredDieId: '', requiredPlateIds: '', materialVariantId: '',
    blankLengthInches: '', blankWidthInches: '', grainDirection: 'LONG_GRAIN',
    boardGrade: '', flute: 'C', wallType: 'SINGLE', scoreCount: '0', scorePositions: '[]',
    slotDepth: '', slotWidth: '', specialCuts: '', trimAmount: '', jointType: 'GLUED',
    printType: 'NONE', printColors: '0', inkTypes: '', plateNumbers: '', coating: 'NONE',
    bundleCount: '', tieHigh: '', tierWide: '', palletsPerOrder: '', notes: '',
  };

  const [f, setF] = useState(initForm);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    try {
      const n = (v: string) => v !== '' ? parseFloat(v) : undefined;
      const i = (v: string) => v !== '' ? parseInt(v) : undefined;
      const body: Record<string, unknown> = {
        materialId: parseInt(f.materialId), outsPerSheet: parseInt(f.outsPerSheet), sheetsPerBox: parseFloat(f.sheetsPerBox),
        blankLengthInches: parseFloat(f.blankLengthInches as any), blankWidthInches: parseFloat(f.blankWidthInches as any),
        grainDirection: f.grainDirection, boardGrade: f.boardGrade, flute: f.flute, wallType: f.wallType,
        scoreCount: parseInt(f.scoreCount), scorePositions: f.scorePositions, jointType: f.jointType,
        printType: f.printType, printColors: parseInt(f.printColors), coating: f.coating,
      };
      if (f.sheetLengthInches)  body.sheetLengthInches  = n(f.sheetLengthInches as any);
      if (f.sheetWidthInches)   body.sheetWidthInches   = n(f.sheetWidthInches as any);
      if (f.layoutNotes)        body.layoutNotes        = f.layoutNotes;
      if (f.rollWidthRequired)  body.rollWidthRequired  = n(f.rollWidthRequired as any);
      if (f.requiredDieId)      body.requiredDieId      = i(f.requiredDieId);
      if (f.requiredPlateIds)   body.requiredPlateIds   = f.requiredPlateIds;
      if (f.materialVariantId)  body.materialVariantId  = i(f.materialVariantId);
      if (f.slotDepth)          body.slotDepth          = n(f.slotDepth as any);
      if (f.slotWidth)          body.slotWidth          = n(f.slotWidth as any);
      if (f.specialCuts)        body.specialCuts        = f.specialCuts;
      if (f.trimAmount)         body.trimAmount         = n(f.trimAmount as any);
      if (f.inkTypes)           body.inkTypes           = f.inkTypes;
      if (f.plateNumbers)       body.plateNumbers       = f.plateNumbers;
      if (f.bundleCount)        body.bundleCount        = i(f.bundleCount);
      if (f.tieHigh)            body.tieHigh            = i(f.tieHigh);
      if (f.tierWide)           body.tierWide           = i(f.tierWide);
      if (f.palletsPerOrder)    body.palletsPerOrder    = i(f.palletsPerOrder);
      if (f.notes)              body.notes              = f.notes;

      if (spec) { await api.put(`/protected/products/${product.id}/blank-spec`, body); }
      else      { await api.post(`/protected/products/${product.id}/blank-spec`, body); }
      const updated = await api.get<Product>(`/protected/products/${product.id}`);
      onUpdated(updated);
      setEdit(false);
      flash('Blank spec saved.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  if (!edit && spec) return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Manufacturing Recipe</span>
        <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
      </div>

      {/* Procurement summary */}
      <div style={{ background: c.accentMuted, border: `1px solid ${c.accentBorder}`, borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
        <strong style={{ color: c.accent }}>Procurement: </strong>
        <span style={{ color: c.textLabel }}>
          Material: <strong style={{ color: c.textPrimary }}>{spec.material?.name ?? spec.materialId}</strong>
          {spec.outsPerSheet > 1 && <> &nbsp;·&nbsp; <strong style={{ color: c.textPrimary }}>{spec.outsPerSheet}-out</strong> (CEIL(qty ÷ {spec.outsPerSheet}) sheets)</>}
          {parseFloat(spec.sheetsPerBox) > 1 && <> &nbsp;·&nbsp; <strong style={{ color: c.textPrimary }}>{spec.sheetsPerBox}×</strong> sheets per box</>}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
        {[['Blank L × W', `${spec.blankLengthInches}" × ${spec.blankWidthInches}"`], ['Grain', spec.grainDirection], ['Board Grade', spec.boardGrade], ['Flute', spec.flute], ['Wall', spec.wallType], ['Joint', spec.jointType], ['Score Count', String(spec.scoreCount)], ['Print', spec.printType], ['Coating', spec.coating], ['Outs/Sheet', String(spec.outsPerSheet)], ['Sheets/Box', spec.sheetsPerBox], ['Bundle Qty', String(spec.bundleCount ?? '—')], ['Die #', spec.requiredDie?.toolNumber ?? '—'], ['Plates', spec.requiredPlateIds ?? '—']].map(([l,v]) => (
          <div key={l}><span style={{ color: c.textMuted }}>{l}:</span> <span style={{ marginLeft: 4 }}>{v}</span></div>
        ))}
      </div>
    </div>
  );

  const sel = (k: string, opts: string[]) => (
    <select style={{ ...inputStyle, cursor: 'pointer' }} value={(f as any)[k]} onChange={set(k)}>
      {opts.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 820 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{spec ? 'Edit Blank Spec' : 'Create Blank Spec'}</h3>

      <Section title="Material">
        <FormGrid cols={2}>
          <Field label="Board Material *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialId} onChange={set('materialId')}>
              <option value="">— Select material —</option>
              {materials.filter(m => m.unitOfMeasure).map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </Field>
        </FormGrid>
      </Section>

      <Section title="Multi-Out / Multi-Sheet Layout">
        <FormGrid cols={3}>
          <Field label="Outs per Sheet"><input style={inputStyle} type="number" min="1" value={f.outsPerSheet} onChange={set('outsPerSheet')} /></Field>
          <Field label="Sheets per Box"><input style={inputStyle} type="number" min="1" step="0.0001" value={f.sheetsPerBox as any} onChange={set('sheetsPerBox')} /></Field>
          <Field label="Roll Width Required (in)"><input style={inputStyle} type="number" step="0.125" value={f.rollWidthRequired as any} onChange={set('rollWidthRequired')} /></Field>
          <Field label="Sheet Length (in)"><input style={inputStyle} type="number" step="0.125" value={f.sheetLengthInches as any} onChange={set('sheetLengthInches')} /></Field>
          <Field label="Sheet Width (in)"><input style={inputStyle} type="number" step="0.125" value={f.sheetWidthInches as any} onChange={set('sheetWidthInches')} /></Field>
        </FormGrid>
        <Field label="Layout Notes"><input style={inputStyle} value={f.layoutNotes} onChange={set('layoutNotes')} placeholder="e.g. 2-out landscape, alternating…" /></Field>
      </Section>

      <Section title="Tooling">
        <FormGrid cols={3}>
          <Field label="Required Die ID"><input style={inputStyle} type="number" value={f.requiredDieId} onChange={set('requiredDieId')} placeholder="Tooling ID" /></Field>
          <Field label="Plate IDs (comma sep)"><input style={inputStyle} value={f.requiredPlateIds} onChange={set('requiredPlateIds')} placeholder="PLT-001,PLT-002" /></Field>
          <Field label="Material Variant ID"><input style={inputStyle} type="number" value={f.materialVariantId} onChange={set('materialVariantId')} placeholder="Variant ID" /></Field>
        </FormGrid>
      </Section>

      <Section title="Blank Dimensions">
        <FormGrid cols={3}>
          <Field label="Blank Length (in) *"><input style={inputStyle} type="number" step="0.125" value={f.blankLengthInches as any} onChange={set('blankLengthInches')} /></Field>
          <Field label="Blank Width (in) *"><input style={inputStyle} type="number" step="0.125" value={f.blankWidthInches as any} onChange={set('blankWidthInches')} /></Field>
          <Field label="Grain Direction"><Field label="">{sel('grainDirection', SELECT_OPTS.grain)}</Field></Field>
        </FormGrid>
      </Section>

      <Section title="Board Specification">
        <FormGrid cols={3}>
          <Field label="Board Grade *"><input style={inputStyle} value={f.boardGrade} onChange={set('boardGrade')} placeholder="32 ECT, 200#…" /></Field>
          <Field label="Flute"><Field label="">{sel('flute', SELECT_OPTS.flute)}</Field></Field>
          <Field label="Wall Type"><Field label="">{sel('wallType', SELECT_OPTS.wallType)}</Field></Field>
        </FormGrid>
      </Section>

      <Section title="Scoring">
        <FormGrid cols={2}>
          <Field label="Score Count *"><input style={inputStyle} type="number" min="0" value={f.scoreCount} onChange={set('scoreCount')} /></Field>
        </FormGrid>
        <Field label="Score Positions (JSON)">
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} value={f.scorePositions} onChange={set('scorePositions')} placeholder='[{"position":1,"measurement":12.5},{"position":2,"measurement":6.25}]' />
        </Field>
      </Section>

      <Section title="Slots, Cuts & Joint">
        <FormGrid cols={3}>
          <Field label="Slot Depth (in)"><input style={inputStyle} type="number" step="0.0625" value={f.slotDepth as any} onChange={set('slotDepth')} /></Field>
          <Field label="Slot Width (in)"><input style={inputStyle} type="number" step="0.0625" value={f.slotWidth as any} onChange={set('slotWidth')} /></Field>
          <Field label="Trim Amount (in)"><input style={inputStyle} type="number" step="0.0625" value={f.trimAmount as any} onChange={set('trimAmount')} /></Field>
          <Field label="Joint Type"><Field label="">{sel('jointType', SELECT_OPTS.joint)}</Field></Field>
        </FormGrid>
        <Field label="Special Cuts"><input style={inputStyle} value={f.specialCuts} onChange={set('specialCuts')} /></Field>
      </Section>

      <Section title="Print Specification">
        <FormGrid cols={3}>
          <Field label="Print Type"><Field label="">{sel('printType', SELECT_OPTS.printType)}</Field></Field>
          <Field label="Print Colors"><input style={inputStyle} type="number" min="0" max="8" value={f.printColors} onChange={set('printColors')} /></Field>
          <Field label="Coating"><Field label="">{sel('coating', SELECT_OPTS.coating)}</Field></Field>
          <Field label="Ink Types"><input style={inputStyle} value={f.inkTypes} onChange={set('inkTypes')} placeholder="Blue PMS 286, Black…" /></Field>
          <Field label="Plate Numbers"><input style={inputStyle} value={f.plateNumbers} onChange={set('plateNumbers')} placeholder="PLT-001,PLT-002" /></Field>
        </FormGrid>
      </Section>

      <Section title="Pallet Configuration">
        <FormGrid cols={4}>
          <Field label="Bundle Qty"><input style={inputStyle} type="number" min="0" value={f.bundleCount} onChange={set('bundleCount')} /></Field>
          <Field label="Tie High"><input style={inputStyle} type="number" min="0" value={f.tieHigh} onChange={set('tieHigh')} /></Field>
          <Field label="Tier Wide"><input style={inputStyle} type="number" min="0" value={f.tierWide} onChange={set('tierWide')} /></Field>
          <Field label="Pallets/Order (est.)"><input style={inputStyle} type="number" min="0" value={f.palletsPerOrder} onChange={set('palletsPerOrder')} /></Field>
        </FormGrid>
      </Section>

      <Field label="Notes"><textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} /></Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Blank Spec'}</button>
        {spec && <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants Tab
// ─────────────────────────────────────────────────────────────────────────────
function VariantsTab({ product, onUpdated, flash }: { product: Product; onUpdated: () => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF]             = useState({ sku: '', variantDescription: '', width: '', length: '', thickness: '', bundleQty: '', caseQty: '', listPrice: '' });
  const [saving, setSaving]   = useState(false);

  async function addVariant() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { sku: f.sku };
      if (f.variantDescription) body.variantDescription = f.variantDescription;
      if (f.width)    body.width    = parseFloat(f.width);
      if (f.length)   body.length   = parseFloat(f.length);
      if (f.thickness)body.thickness= parseFloat(f.thickness);
      if (f.bundleQty)body.bundleQty= parseInt(f.bundleQty);
      if (f.caseQty)  body.caseQty  = parseInt(f.caseQty);
      if (f.listPrice)body.listPrice = parseFloat(f.listPrice);
      await api.post(`/protected/products/${product.id}/variants`, body);
      onUpdated();
      setShowAdd(false);
      setF({ sku: '', variantDescription: '', width: '', length: '', thickness: '', bundleQty: '', caseQty: '', listPrice: '' });
      flash('Variant added.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  async function deactivate(vid: number) {
    if (!confirm('Deactivate this variant?')) return;
    try {
      await api.delete(`/protected/products/${product.id}/variants/${vid}`);
      onUpdated();
      flash('Variant deactivated.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={() => setShowAdd(s => !s)}>+ Add Variant</button>
      </div>

      {showAdd && (
        <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 700 }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Add Variant</h4>
          <FormGrid cols={2}>
            <Field label="SKU *"><input style={inputStyle} value={f.sku} onChange={set('sku')} /></Field>
            <Field label="Description"><input style={inputStyle} value={f.variantDescription} onChange={set('variantDescription')} /></Field>
            <Field label="Width (in)"><input style={inputStyle} type="number" step="0.125" value={f.width} onChange={set('width')} /></Field>
            <Field label="Length (in)"><input style={inputStyle} type="number" step="0.125" value={f.length} onChange={set('length')} /></Field>
            <Field label="Bundle Qty"><input style={inputStyle} type="number" value={f.bundleQty} onChange={set('bundleQty')} /></Field>
            <Field label="Case Qty"><input style={inputStyle} type="number" value={f.caseQty} onChange={set('caseQty')} /></Field>
            <Field label="List Price"><input style={inputStyle} type="number" step="0.0001" value={f.listPrice} onChange={set('listPrice')} /></Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={btnPrimary} onClick={addVariant} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
            <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {product.variants.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No variants yet.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['SKU','Description','W × L','Bundle Qty','List Price','Status',''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.variants.map(v => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent }}>{v.sku}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>{v.variantDescription ?? '—'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{v.width && v.length ? `${v.width}" × ${v.length}"` : '—'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{v.bundleQty ?? '—'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem' }}>{v.listPrice ? `$${Number(v.listPrice).toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 4, background: v.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: v.isActive ? '#22c55e' : '#64748b' }}>{v.isActive ? 'Active' : 'Off'}</span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    {v.isActive && <button style={{ ...btnDanger, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => deactivate(v.id)}>Deactivate</button>}
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
// Specs Tab
// ─────────────────────────────────────────────────────────────────────────────
function SpecsTab({ product, onUpdated, flash }: { product: Product; onUpdated: () => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF]             = useState({ specKey: '', specValue: '', specUnit: '', sortOrder: '' });
  const [saving, setSaving]   = useState(false);

  async function addSpec() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { specKey: f.specKey, specValue: f.specValue };
      if (f.specUnit)  body.specUnit  = f.specUnit;
      if (f.sortOrder) body.sortOrder = parseInt(f.sortOrder);
      await api.post(`/protected/products/${product.id}/specs`, body);
      onUpdated();
      setShowAdd(false);
      setF({ specKey: '', specValue: '', specUnit: '', sortOrder: '' });
      flash('Spec added.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  async function deleteSpec(sid: number) {
    try {
      await api.delete(`/protected/products/${product.id}/specs/${sid}`);
      onUpdated();
      flash('Spec removed.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{product.specs.length} spec{product.specs.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={() => setShowAdd(s => !s)}>+ Add Spec</button>
      </div>
      {showAdd && (
        <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 500 }}>
          <FormGrid cols={2}>
            <Field label="Key *"><input style={inputStyle} value={f.specKey} onChange={set('specKey')} placeholder="slitWidth" /></Field>
            <Field label="Value *"><input style={inputStyle} value={f.specValue} onChange={set('specValue')} /></Field>
            <Field label="Unit"><input style={inputStyle} value={f.specUnit} onChange={set('specUnit')} placeholder="inches" /></Field>
            <Field label="Sort Order"><input style={inputStyle} type="number" value={f.sortOrder} onChange={set('sortOrder')} /></Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnPrimary} onClick={addSpec} disabled={saving}>{saving ? '…' : 'Add'}</button>
            <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {product.specs.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No specs yet.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Key', 'Value', 'Unit', ''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.specs.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent }}>{s.specKey}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}>{s.specValue}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{s.specUnit ?? '—'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <button style={{ ...btnDanger, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => deleteSpec(s.id)}>Remove</button>
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
// BOM Tab
// ─────────────────────────────────────────────────────────────────────────────
function BOMTab({ product, materials, onUpdated, flash }: { product: Product; materials: Material[]; onUpdated: () => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF]             = useState({ materialId: '', quantityPer: '', unitOfMeasure: '' });
  const [saving, setSaving]   = useState(false);

  async function addLine() {
    setSaving(true);
    try {
      await api.post(`/protected/products/${product.id}/bom`, { materialId: parseInt(f.materialId), quantityPer: parseFloat(f.quantityPer), unitOfMeasure: f.unitOfMeasure });
      onUpdated();
      setShowAdd(false);
      setF({ materialId: '', quantityPer: '', unitOfMeasure: '' });
      flash('BOM line added.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  async function removeLine(bid: number) {
    try {
      await api.delete(`/protected/products/${product.id}/bom/${bid}`);
      onUpdated();
      flash('BOM line removed.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{product.bomLines.length} material{product.bomLines.length !== 1 ? 's' : ''} in BOM</span>
        <button style={btnPrimary} onClick={() => setShowAdd(s => !s)}>+ Add Material</button>
      </div>
      {showAdd && (
        <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 560 }}>
          <FormGrid cols={3}>
            <Field label="Material *">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialId} onChange={e => setF(p => ({ ...p, materialId: e.target.value }))}>
                <option value="">— Select —</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
              </select>
            </Field>
            <Field label="Qty per Unit *"><input style={inputStyle} type="number" step="0.000001" value={f.quantityPer} onChange={e => setF(p => ({ ...p, quantityPer: e.target.value }))} /></Field>
            <Field label="Unit of Measure *"><input style={inputStyle} value={f.unitOfMeasure} onChange={e => setF(p => ({ ...p, unitOfMeasure: e.target.value }))} placeholder="oz, fl oz, sqft…" /></Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnPrimary} onClick={addLine} disabled={saving}>{saving ? '…' : 'Add'}</button>
            <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {product.bomLines.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No BOM lines. Note: board/sheet is captured in the Blank Spec.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Material', 'Code', 'Qty/Unit', 'UOM', ''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.bomLines.map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}>{b.material.name}</td>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.textLabel }}>{b.material.code}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}>{b.quantityPer}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{b.unitOfMeasure}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <button style={{ ...btnDanger, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => removeLine(b.id)}>Remove</button>
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
// Inventory Tab
// ─────────────────────────────────────────────────────────────────────────────
function InventoryTab({ product }: { product: Product }) {
  const rows = product.finishedGoodsInventory;
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
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.variant?.sku ?? '—'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{Number(r.quantity).toLocaleString()}</td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.avgCost ? `$${Number(r.avgCost).toFixed(4)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
