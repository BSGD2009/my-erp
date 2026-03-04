import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { FractionInput } from '../components/FractionInput';
import { decimalToFraction } from '../utils/fractions';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LocationOverride {
  id: number; locationId: number;
  sheetLengthOverride?: string; sheetWidthOverride?: string;
  trimNotes?: string; isActive: boolean;
  location: { id: number; name: string };
}

interface Variant {
  id: number; sku: string; variantDescription?: string;
  boardGradeId?: number; flute?: string; caliper?: string;
  width?: string; length?: string; thickness?: string;
  bundleQty?: number; caseQty?: number; listPrice?: string;
  isActive: boolean; createdAt: string; updatedAt: string;
  masterSpec: { id: number; sku: string; name: string };
  boardGrade?: { id: number; gradeCode: string; gradeName: string; wallType: string; nominalCaliper: string };
  blankSpec?: BlankSpec;
  bomLines: BOMLine[];
  customerItems: CustomerItem[];
  locationOverrides?: LocationOverride[];
}

interface BlankSpec {
  id: number; materialId: number; outsPerSheet: number; sheetsPerBox: string;
  sheetLengthInches?: string; sheetWidthInches?: string; layoutNotes?: string;
  rollWidthRequired?: string; requiredDieId?: number; requiredPlateIds?: string;
  materialVariantId?: number; blankLengthInches: string; blankWidthInches: string;
  grainDirection: string; boardGrade: string; flute: string; wallType: string;
  scoreCount: number; scorePositions: string; slotDepth?: string; slotWidth?: string;
  specialCuts?: string; trimAmount?: string; jointType: string;
  printType: string; printColors: number; inkTypes?: string; plateNumbers?: string;
  coating: string; bundleCount?: number; tieHigh?: number; tierWide?: number;
  palletsPerOrder?: number; notes?: string;
  material?: { id: number; code: string; name: string };
  requiredDie?: { id: number; toolNumber: string };
  materialVariant?: { id: number; variantCode: string };
}

interface BOMLine {
  id: number; materialId: number; quantityPer: string; unitOfMeasure: string;
  material: { id: number; code: string; name: string; unitOfMeasure: string };
}

interface CustomerItem {
  id: number; code: string; name: string; description?: string;
  customer: { id: number; code: string; name: string };
}

interface Material { id: number; code: string; name: string; unitOfMeasure: string }
interface BoardGrade { id: number; gradeCode: string; gradeName: string; wallType: string; nominalCaliper: string }

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
  flute:     ['A','B','C','E','F','BC','EB','OTHER'],
  wallType:  ['SINGLE','DOUBLE','TRIPLE'],
  printType: ['NONE','ONE_COLOR','TWO_COLOR','THREE_COLOR','FOUR_COLOR'],
  coating:   ['NONE','WAX','CLAY','UV','VARNISH'],
  grain:     ['LONG_GRAIN','SHORT_GRAIN'],
  joint:     ['GLUED','STAPLED','TAPED','NONE'],
};

const FLUTE_OPTS = ['B','C','E','BC','BE','A','F','EB','OTHER'];

// ─────────────────────────────────────────────────────────────────────────────
// VariantRecordPage
// ─────────────────────────────────────────────────────────────────────────────
export function VariantRecordPage() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const navigate = useNavigate();

  const [variant, setVariant]     = useState<Variant | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setTab]       = useState('Blank Spec');
  const [msg, setMsg]             = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [drawerOpen, setDrawer]   = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Supporting data
  const [materials, setMaterials]   = useState<Material[]>([]);
  const [boardGrades, setBoardGrades] = useState<BoardGrade[]>([]);

  // ── Load supporting data ──
  useEffect(() => {
    api.get<{ data: Material[] }>('/protected/materials?limit=500').then(r => setMaterials(r.data)).catch(() => {});
    api.get<BoardGrade[]>('/protected/board-grades').then(setBoardGrades).catch(() => {});
  }, []);

  // ── Load variant ──
  const loadVariant = useCallback(async () => {
    setLoading(true);
    try {
      const v = await api.get<Variant>(`/protected/master-specs/${id}/variants/${vid}`);
      setVariant(v);
    } catch (e: unknown) {
      const err = e as Error;
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, vid]);

  useEffect(() => { loadVariant(); }, [loadVariant]);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Duplicate variant ──
  async function handleDuplicate() {
    if (!variant) return;
    setDuplicating(true);
    try {
      const newVariant = await api.post<Variant>(`/protected/master-specs/${id}/variants/${variant.id}/duplicate`, {});
      navigate(`/master-specs/${id}/variants/${newVariant.id}`);
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    } finally {
      setDuplicating(false);
    }
  }

  const tabs = ['Blank Spec', 'BOM', 'Customer Items'];

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;

  return (
    <Layout>
      {/* ── Breadcrumb ── */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/master-specs')}>Master Specs</span>
        {variant && (
          <>
            {' '}&rsaquo;{' '}
            <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate(`/master-specs/${variant.masterSpec.id}`)}>{variant.masterSpec.name}</span>
            {' '}&rsaquo;{' '}
            <span style={{ color: c.textLabel }}>Variants</span>
            {' '}&rsaquo;{' '}
            <span style={{ color: c.textLabel }}>{variant.sku}</span>
          </>
        )}
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* ── Header ── */}
      {variant && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{variant.sku}</h1>
              {variant.boardGrade && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: c.accentMuted, color: c.accent, border: `1px solid ${c.accentBorder}` }}>
                  {variant.boardGrade.gradeName} / {variant.boardGrade.wallType}
                </span>
              )}
              {variant.flute && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                  {variant.flute} Flute
                </span>
              )}
              {variant.caliper && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                  {variant.caliper}" cal
                </span>
              )}
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: variant.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.15)', color: variant.isActive ? '#22c55e' : '#64748b' }}>
                {variant.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            {variant.variantDescription && (
              <div style={{ fontSize: '0.82rem', color: c.textMuted, marginTop: 4 }}>{variant.variantDescription}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={handleDuplicate} disabled={duplicating}>{duplicating ? 'Duplicating...' : 'Duplicate'}</button>
            <button style={btnSecondary} onClick={() => setDrawer(true)}>Edit</button>
          </div>
        </div>
      )}

      {/* ── Edit Drawer ── */}
      {variant && (
        <EditDrawer
          variant={variant}
          boardGrades={boardGrades}
          open={drawerOpen}
          onClose={() => setDrawer(false)}
          onUpdated={v => { setVariant(v); setDrawer(false); flash('Variant saved.'); }}
          flash={flash}
          specId={id!}
        />
      )}

      {/* ── Tabs ── */}
      {variant && (
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
      {variant && activeTab === 'Blank Spec'     && <BlankSpecTab variant={variant} materials={materials} specId={id!} onUpdated={setVariant} flash={flash} />}
      {variant && activeTab === 'BOM'            && <BOMTab variant={variant} materials={materials} specId={id!} onUpdated={loadVariant} flash={flash} />}
      {variant && activeTab === 'Customer Items' && <CustomerItemsTab variant={variant} />}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Drawer (variant header fields)
// ─────────────────────────────────────────────────────────────────────────────
function EditDrawer({ variant, boardGrades, open, onClose, onUpdated, flash, specId }: {
  variant: Variant; boardGrades: BoardGrade[]; open: boolean; onClose: () => void;
  onUpdated: (v: Variant) => void; flash: (m: string, t?: 'success' | 'error') => void; specId: string;
}) {
  const [f, setF] = useState({
    sku: variant.sku,
    variantDescription: variant.variantDescription ?? '',
    boardGradeId: String(variant.boardGradeId ?? ''),
    flute: variant.flute ?? '',
    caliper: variant.caliper ?? '',
    width: variant.width ?? '',
    length: variant.length ?? '',
    listPrice: variant.listPrice ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [caliperOverride, setCaliperOverride] = useState(false);

  // Determine if caliper matches grade
  const caliperFromGrade = !!(variant.boardGrade && variant.caliper === variant.boardGrade.nominalCaliper);

  // Reset form when variant changes or drawer opens
  useEffect(() => {
    if (open) {
      setF({
        sku: variant.sku,
        variantDescription: variant.variantDescription ?? '',
        boardGradeId: String(variant.boardGradeId ?? ''),
        flute: variant.flute ?? '',
        caliper: variant.caliper ?? '',
        width: variant.width ?? '',
        length: variant.length ?? '',
        listPrice: variant.listPrice ?? '',
      });
      setCaliperOverride(false);
    }
  }, [open, variant]);

  function handleBoardGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    const grade = boardGrades.find(g => g.id === parseInt(newId));
    setF(p => ({
      ...p,
      boardGradeId: newId,
      caliper: grade ? grade.nominalCaliper : p.caliper,
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { sku: f.sku };
      body.variantDescription = f.variantDescription || null;
      body.boardGradeId = f.boardGradeId ? parseInt(f.boardGradeId) : null;
      body.flute = f.flute || null;
      body.caliper = f.caliper || null;
      body.width = f.width ? parseFloat(f.width) : null;
      body.length = f.length ? parseFloat(f.length) : null;
      body.listPrice = f.listPrice ? parseFloat(f.listPrice) : null;
      const updated = await api.put<Variant>(`/protected/master-specs/${specId}/variants/${variant.id}`, body);
      onUpdated(updated);
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <Drawer open={open} onClose={onClose} title="Edit Variant" width={480}>
      <Field label="SKU *">
        <input style={inputStyle} value={f.sku} onChange={set('sku')} />
      </Field>

      <Field label="Description">
        <input style={inputStyle} value={f.variantDescription} onChange={set('variantDescription')} />
      </Field>

      <Field label="Board Grade">
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.boardGradeId} onChange={handleBoardGradeChange}>
          <option value="">&mdash; None &mdash;</option>
          {boardGrades.map(g => <option key={g.id} value={g.id}>{g.gradeCode} &mdash; {g.gradeName} ({g.wallType})</option>)}
        </select>
      </Field>

      <FormGrid cols={2}>
        <Field label="Flute">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.flute} onChange={set('flute')}>
            <option value="">&mdash; None &mdash;</option>
            {FLUTE_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>

        <Field label="Caliper (in)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {caliperFromGrade && !caliperOverride ? (
              <>
                <input style={{ ...inputStyle, flex: 1, opacity: 0.8 }} value={f.caliper} readOnly />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap' }}>from grade</span>
                <button
                  type="button"
                  onClick={() => setCaliperOverride(true)}
                  style={{ background: 'none', border: 'none', color: c.accent, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'underline' }}
                >Override</button>
              </>
            ) : (
              <>
                <input style={{ ...inputStyle, flex: 1 }} value={f.caliper} onChange={set('caliper')} placeholder="Auto from grade" />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap' }}>manual</span>
              </>
            )}
          </div>
        </Field>
      </FormGrid>

      <FormGrid cols={2}>
        <Field label="Width (in)">
          <input style={inputStyle} type="number" step="0.125" value={f.width} onChange={set('width')} />
        </Field>
        <Field label="Length (in)">
          <input style={inputStyle} type="number" step="0.125" value={f.length} onChange={set('length')} />
        </Field>
      </FormGrid>

      <Field label="List Price">
        <input style={inputStyle} type="number" step="0.0001" value={f.listPrice} onChange={set('listPrice')} placeholder="0.0000" />
      </Field>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Blank Spec Tab
// ─────────────────────────────────────────────────────────────────────────────
interface ScoreEntry { position: number; measurement: string; auto: boolean }

function parseScoresToArray(json: string): ScoreEntry[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((s: { position: number; measurement: number }, i: number) => ({
      position: s.position ?? (i + 1),
      measurement: String(s.measurement ?? 0),
      auto: false,
    }));
  } catch {
    return [];
  }
}

function scoresToJson(scores: ScoreEntry[]): string {
  return JSON.stringify(scores.map(s => ({ position: s.position, measurement: Number(s.measurement) || 0 })));
}

function BlankSpecTab({ variant, materials, specId, onUpdated, flash }: {
  variant: Variant; materials: Material[]; specId: string;
  onUpdated: (v: Variant) => void; flash: (m: string, t?: 'success' | 'error') => void;
}) {
  const blankSpec = variant.blankSpec;
  const [edit, setEdit] = useState(!blankSpec);
  const [saving, setSaving] = useState(false);

  // Location overrides state (for view mode)
  const [locations, setLocations] = useState<{id: number; name: string}[]>([]);
  const [overrideForm, setOverrideForm] = useState({ locationId: '', sheetLength: '', sheetWidth: '', trimNotes: '' });
  const [addingOverride, setAddingOverride] = useState(false);

  // Load locations once
  useEffect(() => {
    api.get<{data: {id: number; name: string}[]}>('/protected/locations?limit=200').then(r => setLocations(r.data)).catch(() => {});
  }, []);

  const initForm = () => blankSpec ? {
    materialId: String(blankSpec.materialId), outsPerSheet: String(blankSpec.outsPerSheet), sheetsPerBox: blankSpec.sheetsPerBox,
    sheetLengthInches: blankSpec.sheetLengthInches ?? '', sheetWidthInches: blankSpec.sheetWidthInches ?? '',
    layoutNotes: blankSpec.layoutNotes ?? '', rollWidthRequired: blankSpec.rollWidthRequired ?? '',
    requiredDieId: String(blankSpec.requiredDieId ?? ''), requiredPlateIds: blankSpec.requiredPlateIds ?? '',
    materialVariantId: String(blankSpec.materialVariantId ?? ''),
    blankLengthInches: blankSpec.blankLengthInches, blankWidthInches: blankSpec.blankWidthInches,
    grainDirection: blankSpec.grainDirection, boardGrade: blankSpec.boardGrade, flute: blankSpec.flute, wallType: blankSpec.wallType,
    scoreCount: String(blankSpec.scoreCount), scorePositions: blankSpec.scorePositions,
    slotDepth: blankSpec.slotDepth ?? '', slotWidth: blankSpec.slotWidth ?? '',
    specialCuts: blankSpec.specialCuts ?? '', trimAmount: blankSpec.trimAmount ?? '', jointType: blankSpec.jointType,
    printType: blankSpec.printType, printColors: String(blankSpec.printColors), inkTypes: blankSpec.inkTypes ?? '',
    plateNumbers: blankSpec.plateNumbers ?? '', coating: blankSpec.coating,
    bundleCount: String(blankSpec.bundleCount ?? ''), tieHigh: String(blankSpec.tieHigh ?? ''),
    tierWide: String(blankSpec.tierWide ?? ''), palletsPerOrder: String(blankSpec.palletsPerOrder ?? ''),
    notes: blankSpec.notes ?? '',
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

  // Score positions as structured array
  const [scores, setScores] = useState<ScoreEntry[]>(() => parseScoresToArray(f.scorePositions));
  // Box dimensions for auto-calc (loaded from master spec)
  const [boxDims, setBoxDims] = useState<{ L: number; W: number; H: number } | null>(null);
  // Multi-sheet toggle
  const [multiSheet, setMultiSheet] = useState(() => parseFloat(blankSpec?.sheetsPerBox ?? '1') > 1);

  // Load box dims from master spec for auto-calc
  useEffect(() => {
    api.get<{ boxSpec?: { lengthInches: string; widthInches: string; heightInches: string } }>(`/protected/master-specs/${specId}`)
      .then(ms => {
        if (ms.boxSpec) {
          setBoxDims({
            L: parseFloat(ms.boxSpec.lengthInches) || 0,
            W: parseFloat(ms.boxSpec.widthInches) || 0,
            H: parseFloat(ms.boxSpec.heightInches) || 0,
          });
        }
      })
      .catch(() => {});
  }, [specId]);

  // Sync scores -> f.scorePositions and f.scoreCount whenever scores change
  useEffect(() => {
    setF(p => ({
      ...p,
      scorePositions: scoresToJson(scores),
      scoreCount: String(scores.length),
    }));
  }, [scores]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  // Score auto-calc (RSC standard)
  function autoCalcScores() {
    if (!boxDims) {
      flash('No box dimensions found on master spec. Cannot auto-calculate.', 'error');
      return;
    }
    const { L, W, H } = boxDims;
    const cal = parseFloat(variant.caliper ?? '') || 0.1875; // default 3/16"
    const s1 = W + cal;
    const s2 = W + L + 2 * cal;
    const s3 = 2 * W + L + 3 * cal;
    const s4 = 2 * W + 2 * L + 4 * cal;
    const autoSlotDepth = H / 2 + 0.375;

    const newScores: ScoreEntry[] = [
      { position: 1, measurement: String(Math.round(s1 * 1000000) / 1000000), auto: true },
      { position: 2, measurement: String(Math.round(s2 * 1000000) / 1000000), auto: true },
      { position: 3, measurement: String(Math.round(s3 * 1000000) / 1000000), auto: true },
      { position: 4, measurement: String(Math.round(s4 * 1000000) / 1000000), auto: true },
    ];
    setScores(newScores);
    setF(p => ({ ...p, slotDepth: String(Math.round(autoSlotDepth * 1000000) / 1000000) }));
  }

  // Handle score measurement change
  function updateScoreMeasurement(idx: number, val: string) {
    setScores(prev => prev.map((s, i) => i === idx ? { ...s, measurement: val, auto: false } : s));
  }

  // Add/remove score rows
  function addScoreRow() {
    setScores(prev => [...prev, { position: prev.length + 1, measurement: '', auto: false }]);
  }
  function removeScoreRow(idx: number) {
    setScores(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i + 1 })));
  }

  // Multi-sheet toggle handler
  function handleMultiSheetToggle(checked: boolean) {
    setMultiSheet(checked);
    if (checked) {
      // ON: show sheetsPerBox, hide outsPerSheet (set to 1)
      setF(p => ({ ...p, outsPerSheet: '1' }));
    } else {
      // OFF: show outsPerSheet, hide sheetsPerBox (set to 1.0)
      setF(p => ({ ...p, sheetsPerBox: '1.0' }));
    }
  }

  // Location override handlers
  async function addOverride() {
    if (!overrideForm.locationId) return;
    setAddingOverride(true);
    try {
      const body: Record<string, unknown> = { locationId: parseInt(overrideForm.locationId) };
      if (overrideForm.sheetLength) body.sheetLengthOverride = parseFloat(overrideForm.sheetLength);
      if (overrideForm.sheetWidth) body.sheetWidthOverride = parseFloat(overrideForm.sheetWidth);
      if (overrideForm.trimNotes) body.trimNotes = overrideForm.trimNotes;
      await api.post(`/protected/master-specs/${specId}/variants/${variant.id}/location-overrides`, body);
      const updated = await api.get<Variant>(`/protected/master-specs/${specId}/variants/${variant.id}`);
      onUpdated(updated);
      setOverrideForm({ locationId: '', sheetLength: '', sheetWidth: '', trimNotes: '' });
      flash('Location override added.');
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    } finally {
      setAddingOverride(false);
    }
  }

  async function removeOverride(ovId: number) {
    try {
      await api.delete(`/protected/master-specs/${specId}/variants/${variant.id}/location-overrides/${ovId}`);
      const updated = await api.get<Variant>(`/protected/master-specs/${specId}/variants/${variant.id}`);
      onUpdated(updated);
      flash('Location override removed.');
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    }
  }

  async function save() {
    setSaving(true);
    try {
      const n = (v: string) => v !== '' ? parseFloat(v) : undefined;
      const i = (v: string) => v !== '' ? parseInt(v) : undefined;
      const body: Record<string, unknown> = {
        materialId: parseInt(f.materialId), outsPerSheet: parseInt(f.outsPerSheet), sheetsPerBox: parseFloat(f.sheetsPerBox),
        blankLengthInches: parseFloat(f.blankLengthInches), blankWidthInches: parseFloat(f.blankWidthInches),
        grainDirection: f.grainDirection, boardGrade: f.boardGrade, flute: f.flute, wallType: f.wallType,
        scoreCount: parseInt(f.scoreCount), scorePositions: f.scorePositions, jointType: f.jointType,
        printType: f.printType, printColors: parseInt(f.printColors), coating: f.coating,
      };
      if (f.sheetLengthInches)  body.sheetLengthInches  = n(f.sheetLengthInches);
      if (f.sheetWidthInches)   body.sheetWidthInches   = n(f.sheetWidthInches);
      if (f.layoutNotes)        body.layoutNotes        = f.layoutNotes;
      if (f.rollWidthRequired)  body.rollWidthRequired  = n(f.rollWidthRequired);
      if (f.requiredDieId)      body.requiredDieId      = i(f.requiredDieId);
      if (f.requiredPlateIds)   body.requiredPlateIds   = f.requiredPlateIds;
      if (f.materialVariantId)  body.materialVariantId  = i(f.materialVariantId);
      if (f.slotDepth)          body.slotDepth          = n(f.slotDepth);
      if (f.slotWidth)          body.slotWidth          = n(f.slotWidth);
      if (f.specialCuts)        body.specialCuts        = f.specialCuts;
      if (f.trimAmount)         body.trimAmount         = n(f.trimAmount);
      if (f.inkTypes)           body.inkTypes           = f.inkTypes;
      if (f.plateNumbers)       body.plateNumbers       = f.plateNumbers;
      if (f.bundleCount)        body.bundleCount        = i(f.bundleCount);
      if (f.tieHigh)            body.tieHigh            = i(f.tieHigh);
      if (f.tierWide)           body.tierWide           = i(f.tierWide);
      if (f.palletsPerOrder)    body.palletsPerOrder    = i(f.palletsPerOrder);
      if (f.notes)              body.notes              = f.notes;

      if (blankSpec) {
        await api.put(`/protected/master-specs/${specId}/variants/${variant.id}/blank-spec`, body);
      } else {
        await api.post(`/protected/master-specs/${specId}/variants/${variant.id}/blank-spec`, body);
      }
      const updated = await api.get<Variant>(`/protected/master-specs/${specId}/variants/${variant.id}`);
      onUpdated(updated);
      setEdit(false);
      flash('Blank spec saved.');
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── View mode ──
  if (!edit && blankSpec) return (
    <div>
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Manufacturing Recipe</span>
          <button style={btnSecondary} onClick={() => { setF(initForm()); setScores(parseScoresToArray(blankSpec.scorePositions)); setMultiSheet(parseFloat(blankSpec.sheetsPerBox) > 1); setEdit(true); }}>Edit</button>
        </div>

        {/* Procurement summary */}
        <div style={{ background: c.accentMuted, border: `1px solid ${c.accentBorder}`, borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
          <strong style={{ color: c.accent }}>Procurement: </strong>
          <span style={{ color: c.textLabel }}>
            Material: <strong style={{ color: c.textPrimary }}>{blankSpec.material?.name ?? blankSpec.materialId}</strong>
            {blankSpec.outsPerSheet > 1 && <> &nbsp;&middot;&nbsp; <strong style={{ color: c.textPrimary }}>{blankSpec.outsPerSheet}-out</strong> (CEIL(qty / {blankSpec.outsPerSheet}) sheets)</>}
            {parseFloat(blankSpec.sheetsPerBox) > 1 && <> &nbsp;&middot;&nbsp; <strong style={{ color: c.textPrimary }}>{blankSpec.sheetsPerBox}x</strong> sheets per box</>}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
          {([
            ['Blank L x W', `${decimalToFraction(Number(blankSpec.blankLengthInches))}" x ${decimalToFraction(Number(blankSpec.blankWidthInches))}"`],
            ['Grain', blankSpec.grainDirection],
            ['Board Grade', blankSpec.boardGrade],
            ['Flute', blankSpec.flute],
            ['Wall', blankSpec.wallType],
            ['Joint', blankSpec.jointType],
            ['Score Count', String(blankSpec.scoreCount)],
            ['Slot Depth', blankSpec.slotDepth ? `${decimalToFraction(Number(blankSpec.slotDepth))}"` : '\u2014'],
            ['Slot Width', blankSpec.slotWidth ? `${decimalToFraction(Number(blankSpec.slotWidth))}"` : '\u2014'],
            ['Sheet L x W', (blankSpec.sheetLengthInches && blankSpec.sheetWidthInches) ? `${decimalToFraction(Number(blankSpec.sheetLengthInches))}" x ${decimalToFraction(Number(blankSpec.sheetWidthInches))}"` : '\u2014'],
            ['Print', blankSpec.printType],
            ['Coating', blankSpec.coating],
            ['Outs/Sheet', String(blankSpec.outsPerSheet)],
            ['Sheets/Box', blankSpec.sheetsPerBox],
            ['Bundle Qty', String(blankSpec.bundleCount ?? '\u2014')],
            ['Die #', blankSpec.requiredDie?.toolNumber ?? '\u2014'],
            ['Plates', blankSpec.requiredPlateIds ?? '\u2014'],
          ] as [string, string][]).map(([l, v]) => (
            <div key={l}><span style={{ color: c.textMuted }}>{l}:</span> <span style={{ marginLeft: 4 }}>{v}</span></div>
          ))}
        </div>
      </div>

      {/* ── Location Overrides section (view mode) ── */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 800, marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: c.textLabel }}>Location Overrides</span>
        </div>

        {/* Inline add form */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ ...labelStyle, fontSize: '0.7rem' }}>Location</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={overrideForm.locationId} onChange={e => setOverrideForm(p => ({ ...p, locationId: e.target.value }))}>
              <option value="">&mdash; Select &mdash;</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ ...labelStyle, fontSize: '0.7rem' }}>Sheet Length</label>
            <FractionInput value={overrideForm.sheetLength} onChange={val => setOverrideForm(p => ({ ...p, sheetLength: val }))} placeholder="in" />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ ...labelStyle, fontSize: '0.7rem' }}>Sheet Width</label>
            <FractionInput value={overrideForm.sheetWidth} onChange={val => setOverrideForm(p => ({ ...p, sheetWidth: val }))} placeholder="in" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ ...labelStyle, fontSize: '0.7rem' }}>Trim Notes</label>
            <input style={inputStyle} value={overrideForm.trimNotes} onChange={e => setOverrideForm(p => ({ ...p, trimNotes: e.target.value }))} placeholder="Notes..." />
          </div>
          <button style={{ ...btnPrimary, padding: '0.45rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={addOverride} disabled={addingOverride || !overrideForm.locationId}>{addingOverride ? '...' : 'Add'}</button>
        </div>

        {/* Overrides table */}
        {(variant.locationOverrides ?? []).length === 0 ? (
          <div style={{ color: c.textMuted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>No location overrides.</div>
        ) : (
          <div style={{ overflow: 'hidden', borderRadius: 8, border: `1px solid ${c.divider}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
                  {['Location', 'Sheet Length', 'Sheet Width', 'Trim Notes', 'Active', ''].map(h => (
                    <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(variant.locationOverrides ?? []).map(ov => (
                  <tr key={ov.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.82rem' }}>{ov.location.name}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.82rem' }}>{ov.sheetLengthOverride ? decimalToFraction(Number(ov.sheetLengthOverride)) + '"' : '\u2014'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.82rem' }}>{ov.sheetWidthOverride ? decimalToFraction(Number(ov.sheetWidthOverride)) + '"' : '\u2014'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: c.textLabel }}>{ov.trimNotes || '\u2014'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.75rem' }}>
                      <span style={{ color: ov.isActive ? '#22c55e' : '#64748b' }}>{ov.isActive ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <button style={{ ...btnDanger, padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} onClick={() => removeOverride(ov.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── Edit mode ──
  const sel = (k: string, opts: string[]) => (
    <select style={{ ...inputStyle, cursor: 'pointer' }} value={(f as Record<string, string>)[k]} onChange={set(k)}>
      {opts.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  );

  return (
    <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 820 }}>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{blankSpec ? 'Edit Blank Spec' : 'Create Blank Spec'}</h3>

      <Section title="Material">
        <FormGrid cols={2}>
          <Field label="Board Material *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialId} onChange={set('materialId')}>
              <option value="">&mdash; Select material &mdash;</option>
              {materials.filter(m => m.unitOfMeasure).map(m => <option key={m.id} value={m.id}>{m.code} &mdash; {m.name}</option>)}
            </select>
          </Field>
        </FormGrid>
      </Section>

      <Section title="Multi-Out / Multi-Sheet Layout">
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: c.textLabel }}>
            <input type="checkbox" checked={multiSheet} onChange={e => handleMultiSheetToggle(e.target.checked)} />
            Multiple sheets per box
          </label>
        </div>
        <FormGrid cols={3}>
          {!multiSheet && (
            <Field label="Outs per Sheet"><input style={inputStyle} type="number" min="1" value={f.outsPerSheet} onChange={set('outsPerSheet')} /></Field>
          )}
          {multiSheet && (
            <Field label="Sheets per Box"><input style={inputStyle} type="number" min="1" step="0.0001" value={f.sheetsPerBox} onChange={set('sheetsPerBox')} /></Field>
          )}
          <Field label="Roll Width Required (in)"><input style={inputStyle} type="number" step="0.125" value={f.rollWidthRequired} onChange={set('rollWidthRequired')} /></Field>
          <Field label="Sheet Length (in)">
            <FractionInput value={f.sheetLengthInches} onChange={val => setF(p => ({ ...p, sheetLengthInches: val }))} />
          </Field>
          <Field label="Sheet Width (in)">
            <FractionInput value={f.sheetWidthInches} onChange={val => setF(p => ({ ...p, sheetWidthInches: val }))} />
          </Field>
        </FormGrid>
        <Field label="Layout Notes"><input style={inputStyle} value={f.layoutNotes} onChange={set('layoutNotes')} placeholder="e.g. 2-out landscape, alternating..." /></Field>
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
          <Field label="Blank Length (in) *">
            <FractionInput value={f.blankLengthInches} onChange={val => setF(p => ({ ...p, blankLengthInches: val }))} />
          </Field>
          <Field label="Blank Width (in) *">
            <FractionInput value={f.blankWidthInches} onChange={val => setF(p => ({ ...p, blankWidthInches: val }))} />
          </Field>
          <Field label="Grain Direction"><Field label="">{sel('grainDirection', SELECT_OPTS.grain)}</Field></Field>
        </FormGrid>
      </Section>

      <Section title="Board Specification">
        <FormGrid cols={3}>
          <Field label="Board Grade *"><input style={inputStyle} value={f.boardGrade} onChange={set('boardGrade')} placeholder="32 ECT, 200#..." /></Field>
          <Field label="Flute"><Field label="">{sel('flute', SELECT_OPTS.flute)}</Field></Field>
          <Field label="Wall Type"><Field label="">{sel('wallType', SELECT_OPTS.wallType)}</Field></Field>
        </FormGrid>
      </Section>

      <Section title="Scoring">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>{scores.length} score{scores.length !== 1 ? 's' : ''}</span>
          <button
            type="button"
            style={{ ...btnSecondary, padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            onClick={autoCalcScores}
          >Auto-Calculate (RSC)</button>
          <button
            type="button"
            style={{ ...btnSecondary, padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            onClick={addScoreRow}
          >+ Add Score</button>
        </div>
        {scores.length > 0 && (
          <div style={{ overflow: 'hidden', borderRadius: 8, border: `1px solid ${c.divider}`, marginBottom: '0.85rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', width: 60 }}>Pos #</th>
                  <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase' }}>Measurement (in)</th>
                  <th style={{ padding: '0.45rem 0.75rem', textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', width: 70 }}>Source</th>
                  <th style={{ padding: '0.45rem 0.75rem', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${c.divider}` }}>
                    <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', color: c.textLabel, fontWeight: 600 }}>{s.position}</td>
                    <td style={{ padding: '0.45rem 0.75rem' }}>
                      <FractionInput value={s.measurement} onChange={val => updateScoreMeasurement(idx, val)} placeholder="e.g. 12-3/8" />
                    </td>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 600, padding: '0.12rem 0.35rem', borderRadius: 4,
                        background: s.auto ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: s.auto ? '#22c55e' : '#f59e0b',
                        border: `1px solid ${s.auto ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      }}>{s.auto ? 'auto' : 'manual'}</span>
                    </td>
                    <td style={{ padding: '0.45rem 0.75rem' }}>
                      <button type="button" style={{ ...btnDanger, padding: '0.1rem 0.4rem', fontSize: '0.68rem' }} onClick={() => removeScoreRow(idx)}>x</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Slots, Cuts & Joint">
        <FormGrid cols={3}>
          <Field label="Slot Depth (in)">
            <FractionInput value={f.slotDepth} onChange={val => setF(p => ({ ...p, slotDepth: val }))} />
          </Field>
          <Field label="Slot Width (in)">
            <FractionInput value={f.slotWidth} onChange={val => setF(p => ({ ...p, slotWidth: val }))} />
          </Field>
          <Field label="Trim Amount (in)"><input style={inputStyle} type="number" step="0.0625" value={f.trimAmount} onChange={set('trimAmount')} /></Field>
          <Field label="Joint Type"><Field label="">{sel('jointType', SELECT_OPTS.joint)}</Field></Field>
        </FormGrid>
        <Field label="Special Cuts"><input style={inputStyle} value={f.specialCuts} onChange={set('specialCuts')} /></Field>
      </Section>

      <Section title="Print Specification">
        <FormGrid cols={3}>
          <Field label="Print Type"><Field label="">{sel('printType', SELECT_OPTS.printType)}</Field></Field>
          <Field label="Print Colors"><input style={inputStyle} type="number" min="0" max="8" value={f.printColors} onChange={set('printColors')} /></Field>
          <Field label="Coating"><Field label="">{sel('coating', SELECT_OPTS.coating)}</Field></Field>
          <Field label="Ink Types"><input style={inputStyle} value={f.inkTypes} onChange={set('inkTypes')} placeholder="Blue PMS 286, Black..." /></Field>
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
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Blank Spec'}</button>
        {blankSpec && <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM Tab
// ─────────────────────────────────────────────────────────────────────────────
function BOMTab({ variant, materials, specId, onUpdated, flash }: {
  variant: Variant; materials: Material[]; specId: string;
  onUpdated: () => void; flash: (m: string, t?: 'success' | 'error') => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF]             = useState({ materialId: '', quantityPer: '', unitOfMeasure: '' });
  const [saving, setSaving]   = useState(false);

  async function addLine() {
    setSaving(true);
    try {
      await api.post(`/protected/master-specs/${specId}/variants/${variant.id}/bom`, {
        materialId: parseInt(f.materialId),
        quantityPer: parseFloat(f.quantityPer),
        unitOfMeasure: f.unitOfMeasure,
      });
      onUpdated();
      setShowAdd(false);
      setF({ materialId: '', quantityPer: '', unitOfMeasure: '' });
      flash('BOM line added.');
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeLine(bid: number) {
    try {
      await api.delete(`/protected/master-specs/${specId}/variants/${variant.id}/bom/${bid}`);
      onUpdated();
      flash('BOM line removed.');
    } catch (e: unknown) {
      const err = e as Error;
      flash(err.message, 'error');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{variant.bomLines.length} material{variant.bomLines.length !== 1 ? 's' : ''} in BOM</span>
        <button style={btnPrimary} onClick={() => setShowAdd(s => !s)}>+ Add Material</button>
      </div>
      {showAdd && (
        <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 560 }}>
          <FormGrid cols={3}>
            <Field label="Material *">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialId} onChange={e => setF(p => ({ ...p, materialId: e.target.value }))}>
                <option value="">&mdash; Select &mdash;</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.code} &mdash; {m.name}</option>)}
              </select>
            </Field>
            <Field label="Qty per Unit *"><input style={inputStyle} type="number" step="0.000001" value={f.quantityPer} onChange={e => setF(p => ({ ...p, quantityPer: e.target.value }))} /></Field>
            <Field label="Unit of Measure *"><input style={inputStyle} value={f.unitOfMeasure} onChange={e => setF(p => ({ ...p, unitOfMeasure: e.target.value }))} placeholder="oz, fl oz, sqft..." /></Field>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnPrimary} onClick={addLine} disabled={saving}>{saving ? '...' : 'Add'}</button>
            <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {variant.bomLines.length === 0 ? (
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
              {variant.bomLines.map(b => (
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
// Customer Items Tab (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function CustomerItemsTab({ variant }: { variant: Variant }) {
  const navigate = useNavigate();
  const rows = variant.customerItems ?? [];

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: c.textMuted }}>{rows.length} customer item{rows.length !== 1 ? 's' : ''} reference this variant</span>
        <button style={btnPrimary} onClick={() => navigate(`/customer-items/new?variantId=${variant.id}&masterSpecId=${variant.masterSpec.id}`)}>+ New Customer Item</button>
      </div>
      {rows.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No customer items linked to this variant.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Code', 'Name', 'Customer'].map(h => (
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
