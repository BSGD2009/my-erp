import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface Location {
  id: number; name: string; locationType: string; isRegistered: boolean;
  isDefault: boolean; street?: string; city?: string; state?: string;
  zip?: string; country?: string; phone?: string; email?: string; isActive: boolean;
  _count?: { inventory: number; equipment: number; workCenters: number };
  createdAt: string; updatedAt: string;
}

const LOCATION_TYPES = ['OWN_PLANT','OWN_WAREHOUSE','OFFICE','CUSTOMER','SUPPLIER','OTHER'];
const LOC_TYPE_LABEL: Record<string, string> = {
  OWN_PLANT: 'Own Plant', OWN_WAREHOUSE: 'Own Warehouse', OFFICE: 'Office',
  CUSTOMER: 'Customer', SUPPLIER: 'Supplier', OTHER: 'Other',
};
const LOC_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  OWN_PLANT:     { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  OWN_WAREHOUSE: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  OFFICE:        { bg: 'rgba(245,158,11,0.12)',   text: '#f59e0b' },
  CUSTOMER:      { bg: 'rgba(34,197,94,0.12)',    text: '#22c55e' },
  SUPPLIER:      { bg: 'rgba(236,72,153,0.12)',   text: '#f472b6' },
  OTHER:         { bg: 'rgba(100,116,139,0.12)',  text: '#94a3b8' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' };
  return <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>{msg}</div>;
}

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border?: string }) {
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: bg, color, border: border ? `1px solid ${border}` : undefined }}>
      {label}
    </span>
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

export function LocationRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading]   = useState(true);
  const [edit, setEdit]         = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: 'success'|'error' } | null>(null);
  const [saving, setSaving]     = useState(false);

  const [f, setF] = useState({
    name: '', locationType: 'OWN_PLANT', isRegistered: false, isDefault: false,
    street: '', city: '', state: '', zip: '', country: 'US', phone: '', email: '', isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loc = await api.get<Location>(`/protected/locations/${id}`);
      setLocation(loc);
      setF({
        name: loc.name, locationType: loc.locationType,
        isRegistered: loc.isRegistered, isDefault: loc.isDefault,
        street: loc.street ?? '', city: loc.city ?? '', state: loc.state ?? '',
        zip: loc.zip ?? '', country: loc.country ?? 'US',
        phone: loc.phone ?? '', email: loc.email ?? '', isActive: loc.isActive,
      });
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function flash(text: string, type: 'success'|'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.name.trim()) { flash('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        locationType: f.locationType,
        isRegistered: f.isRegistered,
        isDefault: f.isDefault,
        street: f.street || null,
        city: f.city || null,
        state: f.state || null,
        zip: f.zip || null,
        country: f.country || null,
        phone: f.phone || null,
        email: f.email || null,
        isActive: f.isActive,
      };
      await api.put(`/protected/locations/${id}`, body);
      setEdit(false);
      flash('Saved.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!location) return <Layout><div style={{ color: c.danger, padding: '3rem', textAlign: 'center' }}>Location not found.</div></Layout>;

  const typeCol = LOC_TYPE_COLOR[location.locationType] ?? LOC_TYPE_COLOR.OTHER;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/locations')}>Locations</span>
        {' \u203A '}
        <span style={{ color: c.textLabel }}>{location.name}</span>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{location.name}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Badge label={LOC_TYPE_LABEL[location.locationType] ?? location.locationType} bg={typeCol.bg} color={typeCol.text} />
            {location.isDefault && <Badge label="Default" bg="rgba(59,130,246,0.12)" color="#60a5fa" border="rgba(59,130,246,0.25)" />}
            {location.isRegistered && <Badge label="W9 Address" bg="rgba(245,158,11,0.12)" color="#f59e0b" border="rgba(245,158,11,0.25)" />}
            <Badge
              label={location.isActive ? 'Active' : 'Inactive'}
              bg={location.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)'}
              color={location.isActive ? '#22c55e' : '#64748b'}
            />
          </div>
        </div>
        {!edit && <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>}
      </div>

      {/* Counts */}
      {location._count && (
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Inventory Items', count: location._count.inventory },
            { label: 'Equipment', count: location._count.equipment },
            { label: 'Work Centers', count: location._count.workCenters },
          ].map(({ label, count }) => (
            <div key={label} style={{ ...cardStyle, padding: '0.85rem 1.25rem', minWidth: 120 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: c.textPrimary }}>{count}</div>
              <div style={{ fontSize: '0.72rem', color: c.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Details card */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 720 }}>
        {edit ? (
          <>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Location</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} /></Field>
              <Field label="Location Type">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationType} onChange={set('locationType')}>
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{LOC_TYPE_LABEL[t]}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.isRegistered} onChange={set('isRegistered')} /> Registered (W9 Address)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} /> Set as Default
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
              </label>
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${c.divider}` }}>
              Address
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}><Field label="Street"><input style={inputStyle} value={f.street} onChange={set('street')} /></Field></div>
              <Field label="City"><input style={inputStyle} value={f.city} onChange={set('city')} /></Field>
              <Field label="State"><input style={inputStyle} value={f.state} onChange={set('state')} /></Field>
              <Field label="Zip"><input style={inputStyle} value={f.zip} onChange={set('zip')} /></Field>
              <Field label="Country"><input style={inputStyle} value={f.country} onChange={set('country')} /></Field>
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${c.divider}` }}>
              Contact
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Phone"><input style={inputStyle} value={f.phone} onChange={set('phone')} /></Field>
              <Field label="Email"><input style={inputStyle} type="email" value={f.email} onChange={set('email')} /></Field>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button style={btnSecondary} onClick={() => { setEdit(false); load(); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
              <ReadOnlyField label="Name" value={location.name} />
              <ReadOnlyField label="Type" value={LOC_TYPE_LABEL[location.locationType] ?? location.locationType} />
              <ReadOnlyField label="Registered (W9)" value={location.isRegistered ? 'Yes' : 'No'} />
              <ReadOnlyField label="Default Location" value={location.isDefault ? 'Yes' : 'No'} />
              <ReadOnlyField label="Status" value={location.isActive ? 'Active' : 'Inactive'} />
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>Address</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
                <ReadOnlyField label="Street" value={location.street ?? ''} />
                <ReadOnlyField label="City" value={location.city ?? ''} />
                <ReadOnlyField label="State" value={location.state ?? ''} />
                <ReadOnlyField label="Zip" value={location.zip ?? ''} />
                <ReadOnlyField label="Country" value={location.country ?? ''} />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
                <ReadOnlyField label="Phone" value={location.phone ?? ''} />
                <ReadOnlyField label="Email" value={location.email ?? ''} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Map placeholder */}
      <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', marginTop: '1.5rem', maxWidth: 720 }}>
        <div style={{ fontSize: '0.9rem', color: c.textMuted }}>
          Map view coming in a future update.
        </div>
      </div>
    </Layout>
  );
}
