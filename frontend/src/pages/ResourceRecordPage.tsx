import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ResourceType { id: number; typeKey: string; typeName: string }
interface Location     { id: number; name: string }
interface Supplier     { id: number; name: string }
interface Operation    { id: number; operationKey: string; operationName: string }

interface Capability {
  id: number;
  operation: { id: number; operationKey: string; operationName: string };
}

interface Resource {
  id: number;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  yearOfManufacture?: number;
  maxSheetWidth?: number;
  maxSheetLength?: number;
  minSheetWidth?: number;
  minSheetLength?: number;
  maxSpeed?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  assetTagId?: string;
  partsSupplierId?: number;
  notes?: string;
  isActive: boolean;
  resourceTypeId: number;
  locationId: number;
  resourceType: { id: number; typeKey: string; typeName: string };
  location:     { id: number; name: string };
  capabilities: Capability[];
  partsSupplier?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function typeBadgeColor(typeKey: string) {
  switch (typeKey) {
    case 'CORRUGATOR':         return { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' };
    case 'FLEXO_FOLDER_GLUER': return { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' };
    case 'ROTARY_DIE_CUT':    return { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' };
    case 'FLATBED_DIE_CUT':   return { bg: 'rgba(236,72,153,0.12)', color: '#f472b6' };
    case 'PRINTER':            return { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' };
    case 'SLITTER_SCORER':    return { bg: 'rgba(14,165,233,0.12)',  color: '#38bdf8' };
    case 'GLUER':              return { bg: 'rgba(244,63,94,0.12)',  color: '#fb7185' };
    case 'BANDER':             return { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' };
    default:                   return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  }
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: '0.85rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.25rem',
      paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}`,
    }}>
      {label}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' };
  return (
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>
      {msg}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem' }}>{value || '\u2014'}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ResourceRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource]   = useState<Resource | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [msg, setMsg]             = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [f, setF] = useState({
    name: '', resourceTypeId: '', locationId: '',
    manufacturer: '', modelNumber: '', serialNumber: '', yearOfManufacture: '',
    maxSheetWidth: '', maxSheetLength: '', minSheetWidth: '', minSheetLength: '', maxSpeed: '',
    purchaseDate: '', purchasePrice: '', warrantyExpiry: '', assetTagId: '', partsSupplierId: '',
    notes: '',
  });

  // Lookup data
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [locations, setLocations]         = useState<Location[]>([]);
  const [suppliers, setSuppliers]         = useState<Supplier[]>([]);
  const [operations, setOperations]       = useState<Operation[]>([]);

  // Add capability state
  const [addCapOpen, setAddCapOpen]       = useState(false);
  const [selectedOpId, setSelectedOpId]   = useState('');

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Load resource ─────────────────────────────────────────────────────────

  const loadResource = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const r = await api.get<Resource>(`/protected/resources/${id}`);
      setResource(r);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadResource(); }, [loadResource]);

  // ── Load lookups ──────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<ResourceType[]>('/protected/resource-types').then(setResourceTypes).catch(() => {});
    api.get<Location[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: Supplier[] }>('/protected/suppliers?limit=500').then(r => setSuppliers(r.data)).catch(() => {});
    api.get<Operation[]>('/protected/operations').then(setOperations).catch(() => {});
  }, []);

  // ── Edit drawer ───────────────────────────────────────────────────────────

  function openEdit() {
    if (!resource) return;
    setF({
      name: resource.name,
      resourceTypeId: String(resource.resourceTypeId),
      locationId: String(resource.locationId),
      manufacturer: resource.manufacturer ?? '',
      modelNumber: resource.modelNumber ?? '',
      serialNumber: resource.serialNumber ?? '',
      yearOfManufacture: resource.yearOfManufacture != null ? String(resource.yearOfManufacture) : '',
      maxSheetWidth: resource.maxSheetWidth != null ? String(resource.maxSheetWidth) : '',
      maxSheetLength: resource.maxSheetLength != null ? String(resource.maxSheetLength) : '',
      minSheetWidth: resource.minSheetWidth != null ? String(resource.minSheetWidth) : '',
      minSheetLength: resource.minSheetLength != null ? String(resource.minSheetLength) : '',
      maxSpeed: resource.maxSpeed != null ? String(resource.maxSpeed) : '',
      purchaseDate: resource.purchaseDate ? resource.purchaseDate.slice(0, 10) : '',
      purchasePrice: resource.purchasePrice != null ? String(resource.purchasePrice) : '',
      warrantyExpiry: resource.warrantyExpiry ? resource.warrantyExpiry.slice(0, 10) : '',
      assetTagId: resource.assetTagId ?? '',
      partsSupplierId: resource.partsSupplierId != null ? String(resource.partsSupplierId) : '',
      notes: resource.notes ?? '',
    });
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function saveEdit() {
    if (!resource) return;
    if (!f.name.trim())    { setSaveErr('Name is required'); return; }
    if (!f.resourceTypeId) { setSaveErr('Resource Type is required'); return; }
    if (!f.locationId)     { setSaveErr('Location is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        resourceTypeId: parseInt(f.resourceTypeId),
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
        assetTagId: f.assetTagId.trim() || null,
        partsSupplierId: f.partsSupplierId ? parseInt(f.partsSupplierId) : null,
        notes: f.notes.trim() || null,
      };
      await api.put(`/protected/resources/${resource.id}`, body);
      flash('Saved.');
      setDrawerOpen(false);
      await loadResource();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  async function handleDeactivate() {
    if (!resource) return;
    if (!confirm(`Deactivate resource "${resource.name}"?`)) return;
    try {
      await api.delete(`/protected/resources/${resource.id}`);
      flash('Resource deactivated.');
      await loadResource();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Capabilities ──────────────────────────────────────────────────────────

  async function addCapability() {
    if (!resource || !selectedOpId) return;
    try {
      await api.post(`/protected/resources/${resource.id}/capabilities`, { operationId: parseInt(selectedOpId) });
      flash('Capability added.');
      setAddCapOpen(false);
      setSelectedOpId('');
      await loadResource();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function removeCapability(capId: number) {
    if (!resource) return;
    if (!confirm('Remove this capability?')) return;
    try {
      await api.delete(`/protected/resources/${resource.id}/capabilities/${capId}`);
      flash('Capability removed.');
      await loadResource();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Loading / not-found states ────────────────────────────────────────────

  if (loading) {
    return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  }

  if (notFound || !resource) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', color: c.textMuted, marginBottom: '1rem' }}>Resource not found</div>
          <button style={btnSecondary} onClick={() => navigate('/resources')}>&larr; Back to Resources</button>
        </div>
      </Layout>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const badge = typeBadgeColor(resource.resourceType.typeKey);

  // Filter out operations already assigned as capabilities
  const assignedOpIds = new Set(resource.capabilities.map(cap => cap.operation.id));
  const availableOps = operations.filter(op => !assignedOpIds.has(op.id));

  const thStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600,
    color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', fontSize: '0.875rem',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/resources')}>Resources</span>
        {' \u203A '}
        <span style={{ color: c.textLabel }}>{resource.name}</span>
      </div>

      {/* Toast */}
      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{resource.name}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: badge.bg, color: badge.color }}>
              {resource.resourceType.typeName}
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
              background: resource.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
              color: resource.isActive ? '#22c55e' : '#64748b',
            }}>
              {resource.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondary} onClick={openEdit}>Edit</button>
          {resource.isActive && (
            <button style={btnDanger} onClick={handleDeactivate}>Deactivate</button>
          )}
        </div>
      </div>

      {/* Info card */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
          <ReadOnlyField label="Type" value={resource.resourceType.typeName} />
          <ReadOnlyField label="Location" value={resource.location.name} />
          <ReadOnlyField label="Manufacturer" value={resource.manufacturer ?? ''} />
          <ReadOnlyField label="Model" value={resource.modelNumber ?? ''} />
          <ReadOnlyField label="Serial Number" value={resource.serialNumber ?? ''} />
          <ReadOnlyField label="Year" value={resource.yearOfManufacture != null ? String(resource.yearOfManufacture) : ''} />
          <ReadOnlyField label="Max Sheet Width" value={resource.maxSheetWidth != null ? `${resource.maxSheetWidth}"` : ''} />
          <ReadOnlyField label="Max Sheet Length" value={resource.maxSheetLength != null ? `${resource.maxSheetLength}"` : ''} />
          <ReadOnlyField label="Min Sheet Width" value={resource.minSheetWidth != null ? `${resource.minSheetWidth}"` : ''} />
          <ReadOnlyField label="Min Sheet Length" value={resource.minSheetLength != null ? `${resource.minSheetLength}"` : ''} />
          <ReadOnlyField label="Max Speed" value={resource.maxSpeed != null ? `${resource.maxSpeed} pcs/hr` : ''} />
          <ReadOnlyField label="Purchase Date" value={resource.purchaseDate ? resource.purchaseDate.slice(0, 10) : ''} />
          <ReadOnlyField label="Purchase Price" value={resource.purchasePrice != null ? `$${Number(resource.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''} />
          <ReadOnlyField label="Warranty Expiry" value={resource.warrantyExpiry ? resource.warrantyExpiry.slice(0, 10) : ''} />
          <ReadOnlyField label="Asset Tag" value={resource.assetTagId ?? ''} />
          <ReadOnlyField label="Parts Supplier" value={resource.partsSupplier?.name ?? ''} />
        </div>
        {resource.notes && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: '0.875rem', color: c.textLabel, whiteSpace: 'pre-wrap' }}>{resource.notes}</div>
          </div>
        )}
      </div>

      {/* Capabilities section */}
      <div style={{ marginTop: '1.5rem', maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Capabilities
          </div>
          <button style={{ ...btnPrimary, padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => { setAddCapOpen(true); setSelectedOpId(''); }}>
            + Add Capability
          </button>
        </div>

        {/* Add capability inline row */}
        {addCapOpen && (
          <div style={{ ...cardStyle, padding: '0.85rem 1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, maxWidth: 280, cursor: 'pointer' }} value={selectedOpId} onChange={e => setSelectedOpId(e.target.value)}>
              <option value="">-- Select operation --</option>
              {availableOps.map(op => <option key={op.id} value={op.id}>{op.operationName}</option>)}
            </select>
            <button style={{ ...btnPrimary, padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={addCapability} disabled={!selectedOpId}>Add</button>
            <button style={{ ...btnSecondary, padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setAddCapOpen(false)}>Cancel</button>
          </div>
        )}

        {resource.capabilities.length === 0 ? (
          <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
            No capabilities assigned yet. Click "+ Add Capability" to assign operations this resource can perform.
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                  <th style={thStyle}>Operation Key</th>
                  <th style={thStyle}>Operation Name</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resource.capabilities.map(cap => (
                  <tr
                    key={cap.id}
                    style={{ borderBottom: `1px solid ${c.divider}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent }}>{cap.operation.operationKey}</td>
                    <td style={{ ...tdStyle, color: c.textLabel }}>{cap.operation.operationName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => removeCapability(cap.id)}
                        title="Remove capability"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, fontSize: '0.9rem', padding: '2px 6px' }}
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Edit Resource" width={520}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <SectionHeader label="General" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *" full>
            <input style={inputStyle} value={f.name} onChange={set('name')} />
          </Field>
          <Field label="Resource Type *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.resourceTypeId} onChange={set('resourceTypeId')}>
              <option value="">-- Select --</option>
              {resourceTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.typeName}</option>)}
            </select>
          </Field>
          <Field label="Location *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationId} onChange={set('locationId')}>
              <option value="">-- Select --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>

        <SectionHeader label="Manufacturer Info" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
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
            <input style={inputStyle} type="number" value={f.yearOfManufacture} onChange={set('yearOfManufacture')} placeholder="2020" />
          </Field>
        </div>

        <SectionHeader label="Sheet Capabilities" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
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
            <input style={inputStyle} type="number" step="1" value={f.maxSpeed} onChange={set('maxSpeed')} />
          </Field>
        </div>

        <SectionHeader label="Procurement" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Purchase Date">
            <input style={inputStyle} type="date" value={f.purchaseDate} onChange={set('purchaseDate')} />
          </Field>
          <Field label="Purchase Price">
            <input style={inputStyle} type="number" step="0.01" value={f.purchasePrice} onChange={set('purchasePrice')} placeholder="0.00" />
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

        <SectionHeader label="Notes" />
        <Field label="Notes" full>
          <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
