import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface EquipmentType { id: number; typeKey: string; typeName: string }
interface Location { id: number; name: string }
interface Supplier { id: number; name: string }

interface Equipment {
  id: number; name: string; manufacturer?: string; modelNumber?: string;
  serialNumber?: string; isActive: boolean;
  equipmentType: { id: number; typeKey: string; typeName: string };
  location: { id: number; name: string };
}

const EMPTY_FORM = {
  name: '', equipmentTypeId: '', locationId: '', manufacturer: '', modelNumber: '',
  serialNumber: '', yearOfManufacture: '', maxSheetWidth: '', maxSheetLength: '',
  minSheetWidth: '', minSheetLength: '', maxSpeed: '', purchaseDate: '',
  purchasePrice: '', warrantyExpiry: '', assetTagId: '', partsSupplierId: '', notes: '',
};

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

// Badge color for equipment types
function typeBadgeColor(typeKey: string) {
  switch (typeKey) {
    case 'CORRUGATOR':    return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' };
    case 'FLEXO_FOLDER_GLUER': return { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' };
    case 'ROTARY_DIE_CUT': return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' };
    case 'FLATBED_DIE_CUT': return { bg: 'rgba(236,72,153,0.12)', color: '#f472b6' };
    case 'PRINTER':       return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' };
    case 'SLITTER_SCORER': return { bg: 'rgba(14,165,233,0.12)', color: '#38bdf8' };
    case 'GLUER':         return { bg: 'rgba(244,63,94,0.12)', color: '#fb7185' };
    case 'BANDER':        return { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' };
    default:              return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function EquipmentListPage() {
  const navigate = useNavigate();

  const [rows, setRows]           = useState<Equipment[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 50;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [locations, setLocations]           = useState<Location[]>([]);
  const [suppliers, setSuppliers]           = useState<Supplier[]>([]);

  // Load lookups once
  useEffect(() => {
    api.get<EquipmentType[]>('/protected/work-center-types').then(setEquipmentTypes).catch(() => {});
    api.get<Location[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: Supplier[] }>('/protected/suppliers?limit=500').then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     params.set('search', search);
      if (typeFilter) params.set('equipmentTypeId', typeFilter);
      if (locFilter)  params.set('locationId', locFilter);
      const res = await api.get<{ data: Equipment[]; total: number }>(`/protected/equipment?${params}`);
      setRows(res.data);
      setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, typeFilter, locFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter, locFilter]);

  // ── Drawer helpers ──
  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    if (!f.equipmentTypeId) { setSaveErr('Equipment type is required'); return; }
    if (!f.locationId) { setSaveErr('Location is required'); return; }
    setSaving(true); setSaveErr('');
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
        assetTagId: f.assetTagId.trim() || null,
        partsSupplierId: f.partsSupplierId ? parseInt(f.partsSupplierId) : null,
        notes: f.notes.trim() || null,
      };
      const eq = await api.post<{ id: number }>('/protected/equipment', body);
      setDrawerOpen(false);
      flash('Equipment created.', 'success');
      navigate(`/equipment/${eq.id}`);
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  function flash(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 4000);
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Equipment</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            Machines and production assets — {total} on record
          </p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Equipment</button>
      </div>

      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 260 }}
          placeholder="Search name, serial#..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inputStyle, maxWidth: 200, cursor: 'pointer' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {equipmentTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
        </select>
        <select style={{ ...inputStyle, maxWidth: 180, cursor: 'pointer' }} value={locFilter} onChange={e => setLocFilter(e.target.value)}>
          <option value="">All locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {(search || typeFilter || locFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setTypeFilter(''); setLocFilter(''); }}>Clear</button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              {['Name', 'Type', 'Location', 'Manufacturer', 'Model', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search || typeFilter || locFilter ? 'No equipment matches your filters.' : 'No equipment yet.'}
              </td></tr>
            )}
            {!loading && rows.map(r => {
              const badge = typeBadgeColor(r.equipmentType.typeKey);
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/equipment/${r.id}`)}
                  style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: c.textPrimary }}>{r.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: badge.bg, color: badge.color }}>{r.equipmentType.typeName}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.location.name}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.manufacturer ?? '\u2014'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.modelNumber ?? '\u2014'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
        </div>
      )}

      {/* New Equipment Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Equipment" width={560}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        {/* General */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          General
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *" full>
            <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Flexo Folder Gluer #1" />
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
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Manufacturer Info
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Manufacturer">
            <input style={inputStyle} value={f.manufacturer} onChange={set('manufacturer')} placeholder="Bobst" />
          </Field>
          <Field label="Model Number">
            <input style={inputStyle} value={f.modelNumber} onChange={set('modelNumber')} />
          </Field>
          <Field label="Serial Number">
            <input style={inputStyle} value={f.serialNumber} onChange={set('serialNumber')} />
          </Field>
          <Field label="Year of Manufacture">
            <input style={inputStyle} type="number" value={f.yearOfManufacture} onChange={set('yearOfManufacture')} placeholder="2018" />
          </Field>
        </div>

        {/* Sheet Capabilities */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Sheet Capabilities
        </div>
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
            <input style={inputStyle} type="number" value={f.maxSpeed} onChange={set('maxSpeed')} />
          </Field>
        </div>

        {/* Procurement */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Procurement
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
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

        {/* Notes */}
        <Field label="Notes">
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Equipment'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
