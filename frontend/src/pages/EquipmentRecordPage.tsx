import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface EquipmentType { id: number; typeKey: string; typeName: string }
interface LocationRef { id: number; name: string }
interface SupplierRef { id: number; name: string }
interface OperationRef { id: number; operationKey: string; operationName: string }
interface Capability {
  id: number; operationId: number; maxSpeed?: number; notes?: string;
  operation: OperationRef;
}
interface WorkCenterRef { id: number; name: string; type: string }

interface Equipment {
  id: number; name: string; isActive: boolean;
  manufacturer?: string; modelNumber?: string; serialNumber?: string;
  yearOfManufacture?: number;
  maxSheetWidth?: number; maxSheetLength?: number;
  minSheetWidth?: number; minSheetLength?: number; maxSpeed?: number;
  purchaseDate?: string; purchasePrice?: number; warrantyExpiry?: string;
  lastServiceDate?: string; nextServiceDue?: string;
  assetTagId?: string; notes?: string;
  equipmentTypeId: number; locationId: number; partsSupplierId?: number;
  equipmentType: { id: number; typeKey: string; typeName: string };
  location: LocationRef;
  partsSupplier?: SupplierRef;
  capabilities: Capability[];
  workCenters: WorkCenterRef[];
  createdAt: string; updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: '0.85rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: c.textPrimary }}>{value || '\u2014'}</div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
      {label}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: c.danger };
  return (
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>
      {msg}
    </div>
  );
}

function typeBadgeColor(typeKey: string) {
  switch (typeKey) {
    case 'CORRUGATOR':          return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' };
    case 'FLEXO_FOLDER_GLUER':  return { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' };
    case 'ROTARY_DIE_CUT':      return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' };
    case 'FLATBED_DIE_CUT':     return { bg: 'rgba(236,72,153,0.12)', color: '#f472b6' };
    case 'PRINTER':             return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' };
    case 'SLITTER_SCORER':      return { bg: 'rgba(14,165,233,0.12)', color: '#38bdf8' };
    case 'GLUER':               return { bg: 'rgba(244,63,94,0.12)', color: '#fb7185' };
    case 'BANDER':              return { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' };
    default:                    return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  }
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

function fmtCurrency(v?: number | null) {
  if (v == null) return null;
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateInput(d?: string | null) {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function EquipmentRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [eq, setEq]             = useState<Equipment | null>(null);
  const [loading, setLoading]   = useState(true);
  const [edit, setEdit]         = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [locations, setLocations]           = useState<LocationRef[]>([]);
  const [suppliers, setSuppliers]           = useState<SupplierRef[]>([]);
  const [operations, setOperations]         = useState<OperationRef[]>([]);

  // Edit form state
  const [f, setF] = useState({
    name: '', equipmentTypeId: '', locationId: '', manufacturer: '', modelNumber: '',
    serialNumber: '', yearOfManufacture: '', maxSheetWidth: '', maxSheetLength: '',
    minSheetWidth: '', minSheetLength: '', maxSpeed: '', purchaseDate: '',
    purchasePrice: '', warrantyExpiry: '', lastServiceDate: '', nextServiceDue: '',
    assetTagId: '', partsSupplierId: '', notes: '', isActive: true,
  });

  // Capability drawer
  const [capDrawerOpen, setCapDrawerOpen] = useState(false);
  const [capForm, setCapForm] = useState({ operationId: '', maxSpeed: '', notes: '' });
  const [capSaving, setCapSaving] = useState(false);
  const [capErr, setCapErr] = useState('');

  // Load lookups
  useEffect(() => {
    api.get<EquipmentType[]>('/protected/work-center-types').then(setEquipmentTypes).catch(() => {});
    api.get<LocationRef[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: SupplierRef[] }>('/protected/suppliers?limit=500').then(r => setSuppliers(r.data)).catch(() => {});
    api.get<OperationRef[]>('/protected/operations').then(setOperations).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await api.get<Equipment>(`/protected/equipment/${id}`);
      setEq(e);
      populateForm(e);
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function populateForm(e: Equipment) {
    setF({
      name: e.name,
      equipmentTypeId: String(e.equipmentTypeId),
      locationId: String(e.locationId),
      manufacturer: e.manufacturer ?? '',
      modelNumber: e.modelNumber ?? '',
      serialNumber: e.serialNumber ?? '',
      yearOfManufacture: e.yearOfManufacture != null ? String(e.yearOfManufacture) : '',
      maxSheetWidth: e.maxSheetWidth != null ? String(e.maxSheetWidth) : '',
      maxSheetLength: e.maxSheetLength != null ? String(e.maxSheetLength) : '',
      minSheetWidth: e.minSheetWidth != null ? String(e.minSheetWidth) : '',
      minSheetLength: e.minSheetLength != null ? String(e.minSheetLength) : '',
      maxSpeed: e.maxSpeed != null ? String(e.maxSpeed) : '',
      purchaseDate: toDateInput(e.purchaseDate),
      purchasePrice: e.purchasePrice != null ? String(e.purchasePrice) : '',
      warrantyExpiry: toDateInput(e.warrantyExpiry),
      lastServiceDate: toDateInput(e.lastServiceDate),
      nextServiceDue: toDateInput(e.nextServiceDue),
      assetTagId: e.assetTagId ?? '',
      partsSupplierId: e.partsSupplierId != null ? String(e.partsSupplierId) : '',
      notes: e.notes ?? '',
      isActive: e.isActive,
    });
  }

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim()) { flash('Name is required', 'error'); return; }
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        equipmentTypeId: parseInt(f.equipmentTypeId),
        locationId: parseInt(f.locationId),
        manufacturer: f.manufacturer.trim() || null,
        modelNumber: f.modelNumber.trim() || null,
        serialNumber: f.serialNumber.trim() || null,
        yearOfManufacture: f.yearOfManufacture ? parseInt(f.yearOfManufacture) : null,
        maxSheetWidth: f.maxSheetWidth ? parseFloat(f.maxSheetWidth) : null,
        maxSheetLength: f.maxSheetLength ? parseFloat(f.maxSheetLength) : null,
        minSheetWidth: f.minSheetWidth ? parseFloat(f.minSheetWidth) : null,
        minSheetLength: f.minSheetLength ? parseFloat(f.minSheetLength) : null,
        maxSpeed: f.maxSpeed ? parseFloat(f.maxSpeed) : null,
        purchaseDate: f.purchaseDate || null,
        purchasePrice: f.purchasePrice ? parseFloat(f.purchasePrice) : null,
        warrantyExpiry: f.warrantyExpiry || null,
        lastServiceDate: f.lastServiceDate || null,
        nextServiceDue: f.nextServiceDue || null,
        assetTagId: f.assetTagId.trim() || null,
        partsSupplierId: f.partsSupplierId ? parseInt(f.partsSupplierId) : null,
        notes: f.notes.trim() || null,
        isActive: f.isActive,
      };
      const updated = await api.put<Equipment>(`/protected/equipment/${eq!.id}`, body);
      setEq(updated);
      populateForm(updated);
      setEdit(false);
      flash('Saved.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function softDelete() {
    if (!window.confirm(`Deactivate "${eq!.name}"? This is a soft delete.`)) return;
    try {
      await api.delete(`/protected/equipment/${eq!.id}`);
      flash('Equipment deactivated.', 'success');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Capabilities ──
  function openAddCapability() {
    setCapForm({ operationId: '', maxSpeed: '', notes: '' });
    setCapErr('');
    setCapDrawerOpen(true);
  }

  async function saveCapability() {
    if (!capForm.operationId) { setCapErr('Operation is required'); return; }
    setCapSaving(true); setCapErr('');
    try {
      const body: Record<string, unknown> = {
        operationId: parseInt(capForm.operationId),
        maxSpeed: capForm.maxSpeed ? parseFloat(capForm.maxSpeed) : null,
        notes: capForm.notes.trim() || null,
      };
      await api.post(`/protected/equipment/${eq!.id}/capabilities`, body);
      setCapDrawerOpen(false);
      flash('Capability added.');
      load();
    } catch (e: any) { setCapErr(e.message); }
    finally { setCapSaving(false); }
  }

  async function deleteCapability(capId: number) {
    if (!window.confirm('Remove this capability?')) return;
    try {
      await api.delete(`/protected/equipment/${eq!.id}/capabilities/${capId}`);
      flash('Capability removed.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!eq) return <Layout><div style={{ color: c.danger, padding: '3rem', textAlign: 'center' }}>Equipment not found.</div></Layout>;

  const badge = typeBadgeColor(eq.equipmentType.typeKey);

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/equipment')}>Equipment</span>
        <> &rsaquo; <span style={{ color: c.textLabel }}>{eq.name}</span></>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{eq.name}</h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: badge.bg, color: badge.color }}>{eq.equipmentType.typeName}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(14,165,233,0.12)', color: '#38bdf8' }}>{eq.location.name}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: eq.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: eq.isActive ? '#22c55e' : '#64748b' }}>
              {eq.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {eq.manufacturer && (
            <div style={{ fontSize: '0.85rem', color: c.textLabel, marginTop: 4 }}>
              {eq.manufacturer}{eq.modelNumber ? ` \u2014 ${eq.modelNumber}` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!edit && <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>}
          {!edit && eq.isActive && <button style={btnDanger} onClick={softDelete}>Deactivate</button>}
        </div>
      </div>

      {/* ── Details Card ── */}
      <div style={{ ...cardStyle, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{edit ? 'Edit Details' : 'Details'}</h3>

        {edit ? (
          <>
            {/* General */}
            <SectionLabel label="General" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Name *">
                <input style={inputStyle} value={f.name} onChange={set('name')} />
              </Field>
              <Field label="Equipment Type *">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.equipmentTypeId} onChange={set('equipmentTypeId')}>
                  <option value="">-- Select --</option>
                  {equipmentTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
                </select>
              </Field>
              <Field label="Location *">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationId} onChange={set('locationId')}>
                  <option value="">-- Select --</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            </div>

            {/* Manufacturer Info */}
            <SectionLabel label="Manufacturer Info" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Manufacturer">
                <input style={inputStyle} value={f.manufacturer} onChange={set('manufacturer')} />
              </Field>
              <Field label="Model Number">
                <input style={inputStyle} value={f.modelNumber} onChange={set('modelNumber')} />
              </Field>
              <Field label="Serial Number">
                <input style={inputStyle} value={f.serialNumber} onChange={set('serialNumber')} />
              </Field>
              <Field label="Year of Manufacture">
                <input style={inputStyle} type="number" value={f.yearOfManufacture} onChange={set('yearOfManufacture')} />
              </Field>
            </div>

            {/* Sheet Capabilities */}
            <SectionLabel label="Sheet Capabilities" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Max Sheet Width (in)">
                <input style={inputStyle} type="number" step="0.01" value={f.maxSheetWidth} onChange={set('maxSheetWidth')} />
              </Field>
              <Field label="Max Sheet Length (in)">
                <input style={inputStyle} type="number" step="0.01" value={f.maxSheetLength} onChange={set('maxSheetLength')} />
              </Field>
              <Field label="Min Sheet Width (in)">
                <input style={inputStyle} type="number" step="0.01" value={f.minSheetWidth} onChange={set('minSheetWidth')} />
              </Field>
              <Field label="Min Sheet Length (in)">
                <input style={inputStyle} type="number" step="0.01" value={f.minSheetLength} onChange={set('minSheetLength')} />
              </Field>
              <Field label="Max Speed (pcs/hr)">
                <input style={inputStyle} type="number" value={f.maxSpeed} onChange={set('maxSpeed')} />
              </Field>
            </div>

            {/* Procurement */}
            <SectionLabel label="Procurement" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Purchase Date">
                <input style={inputStyle} type="date" value={f.purchaseDate} onChange={set('purchaseDate')} />
              </Field>
              <Field label="Purchase Price ($)">
                <input style={inputStyle} type="number" step="0.01" value={f.purchasePrice} onChange={set('purchasePrice')} />
              </Field>
              <Field label="Warranty Expiry">
                <input style={inputStyle} type="date" value={f.warrantyExpiry} onChange={set('warrantyExpiry')} />
              </Field>
              <Field label="Asset Tag ID">
                <input style={inputStyle} value={f.assetTagId} onChange={set('assetTagId')} />
              </Field>
              <Field label="Parts Supplier" full>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.partsSupplierId} onChange={set('partsSupplierId')}>
                  <option value="">-- None --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>

            {/* Service */}
            <SectionLabel label="Service" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Last Service Date">
                <input style={inputStyle} type="date" value={f.lastServiceDate} onChange={set('lastServiceDate')} />
              </Field>
              <Field label="Next Service Due">
                <input style={inputStyle} type="date" value={f.nextServiceDue} onChange={set('nextServiceDue')} />
              </Field>
            </div>

            {/* Notes */}
            <Field label="Notes" full>
              <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
            </Field>

            {/* Active toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
              <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={save}>Save</button>
              <button style={btnSecondary} onClick={() => { setEdit(false); populateForm(eq); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {/* Read-only view */}
            <SectionLabel label="General" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem 2rem', marginBottom: '1rem' }}>
              <ReadField label="Name" value={eq.name} />
              <ReadField label="Type" value={eq.equipmentType.typeName} />
              <ReadField label="Location" value={eq.location.name} />
            </div>

            <SectionLabel label="Manufacturer Info" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.85rem 2rem', marginBottom: '1rem' }}>
              <ReadField label="Manufacturer" value={eq.manufacturer} />
              <ReadField label="Model" value={eq.modelNumber} />
              <ReadField label="Serial Number" value={eq.serialNumber} />
              <ReadField label="Year" value={eq.yearOfManufacture} />
            </div>

            <SectionLabel label="Sheet Capabilities" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.85rem 2rem', marginBottom: '1rem' }}>
              <ReadField label="Max Width" value={eq.maxSheetWidth != null ? `${eq.maxSheetWidth}"` : null} />
              <ReadField label="Max Length" value={eq.maxSheetLength != null ? `${eq.maxSheetLength}"` : null} />
              <ReadField label="Min Width" value={eq.minSheetWidth != null ? `${eq.minSheetWidth}"` : null} />
              <ReadField label="Min Length" value={eq.minSheetLength != null ? `${eq.minSheetLength}"` : null} />
              <ReadField label="Max Speed" value={eq.maxSpeed != null ? `${eq.maxSpeed} pcs/hr` : null} />
            </div>

            <SectionLabel label="Procurement" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.85rem 2rem', marginBottom: '1rem' }}>
              <ReadField label="Purchase Date" value={fmtDate(eq.purchaseDate)} />
              <ReadField label="Purchase Price" value={fmtCurrency(eq.purchasePrice)} />
              <ReadField label="Warranty Expiry" value={fmtDate(eq.warrantyExpiry)} />
              <ReadField label="Asset Tag" value={eq.assetTagId} />
              <ReadField label="Parts Supplier" value={eq.partsSupplier?.name} />
            </div>

            <SectionLabel label="Service" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 2rem', marginBottom: '1rem' }}>
              <ReadField label="Last Service Date" value={fmtDate(eq.lastServiceDate)} />
              <ReadField label="Next Service Due" value={fmtDate(eq.nextServiceDue)} />
            </div>

            {eq.notes && (
              <>
                <SectionLabel label="Notes" />
                <div style={{ fontSize: '0.875rem', color: c.textLabel }}>{eq.notes}</div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Capabilities Card ── */}
      <div style={{ ...cardStyle, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Capabilities</h3>
          <button style={btnPrimary} onClick={openAddCapability}>+ Add Capability</button>
        </div>

        {eq.capabilities.length === 0 ? (
          <div style={{ color: c.textMuted, fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
            No capabilities assigned. Click "+ Add Capability" to define what operations this equipment can perform.
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                  {['Operation', 'Max Speed', 'Notes', ''].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eq.capabilities.map(cap => (
                  <tr key={cap.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cap.operation.operationName}</div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: c.textMuted }}>{cap.operation.operationKey}</div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: c.textLabel }}>
                      {cap.maxSpeed != null ? `${cap.maxSpeed} pcs/hr` : '\u2014'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: c.textLabel }}>
                      {cap.notes ?? '\u2014'}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteCapability(cap.id)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '0.9rem', padding: '4px 6px', borderRadius: 4, lineHeight: 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                        onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}
                      >
                        &#x2715;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Work Centers Card ── */}
      <div style={{ ...cardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 600 }}>Work Centers</h3>

        {eq.workCenters.length === 0 ? (
          <div style={{ color: c.textMuted, fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
            This equipment is not assigned to any work centers.
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                  {['Work Center', 'Type'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eq.workCenters.map(wc => (
                  <tr key={wc.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{wc.name}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                        {wc.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Capability Drawer ── */}
      <Drawer open={capDrawerOpen} onClose={() => setCapDrawerOpen(false)} title="Add Capability">
        {capErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {capErr}
          </div>
        )}
        <Field label="Operation *">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={capForm.operationId} onChange={e => setCapForm(p => ({ ...p, operationId: e.target.value }))}>
            <option value="">-- Select --</option>
            {operations
              .filter(op => !eq.capabilities.some(cap => cap.operationId === op.id))
              .map(op => <option key={op.id} value={op.id}>{op.operationName}</option>)}
          </select>
        </Field>
        <Field label="Max Speed (pcs/hr)">
          <input style={inputStyle} type="number" value={capForm.maxSpeed} onChange={e => setCapForm(p => ({ ...p, maxSpeed: e.target.value }))} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={capForm.notes} onChange={e => setCapForm(p => ({ ...p, notes: e.target.value }))} />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={saveCapability} disabled={capSaving}>{capSaving ? 'Adding...' : 'Add Capability'}</button>
          <button style={btnSecondary} onClick={() => setCapDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
