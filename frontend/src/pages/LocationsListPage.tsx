import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface Location {
  id: number; name: string; locationType: string; isRegistered: boolean;
  isDefault: boolean; street?: string; city?: string; state?: string;
  zip?: string; country?: string; phone?: string; email?: string; isActive: boolean;
}

const LOCATION_TYPES = ['OWN_PLANT', 'OWN_WAREHOUSE', 'OFFICE', 'CUSTOMER', 'SUPPLIER', 'OTHER'];
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

const EMPTY = {
  name: '', locationType: 'OWN_PLANT', isRegistered: false, isDefault: false,
  street: '', city: '', state: '', zip: '', country: 'US', phone: '', email: '',
};

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: '0.85rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Th({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: string; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: active ? '#93c5fd' : c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
      {label}{active ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''}
    </th>
  );
}

export function LocationsListPage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sortBy, setSortBy]   = useState('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [toast, setToast]     = useState<{ text: string; type: 'success'|'error' } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await api.get<Location[]>('/protected/locations')); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: string, bv: string;
    if (sortBy === 'cityState') {
      av = `${a.city ?? ''} ${a.state ?? ''}`.trim();
      bv = `${b.city ?? ''} ${b.state ?? ''}`.trim();
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function openNew() {
    setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function flash(text: string, type: 'success'|'error' = 'success') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(), locationType: f.locationType,
        street: f.street.trim() || null, city: f.city.trim() || null,
        state: f.state.trim() || null, zip: f.zip.trim() || null,
        country: f.country.trim() || 'US',
        phone: f.phone.trim() || null, email: f.email.trim() || null,
        isRegistered: f.isRegistered, isDefault: f.isDefault,
      };
      await api.post('/protected/locations', body);
      flash('Location created.');
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Deactivate location "${name}"?`)) return;
    try {
      await api.delete(`/protected/locations/${id}`);
      flash('Location deactivated.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Locations</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Plants, warehouses, and offices &mdash; {rows.length} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Location</button>
      </div>

      {toast && (
        <div style={{
          background: toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem',
          color: toast.type === 'success' ? '#22c55e' : c.danger,
        }}>{toast.text}</div>
      )}

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <Th col="name"         label="Name"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="locationType" label="Type"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="cityState"    label="City / State" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Default</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Registered</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No locations found.</td></tr>}
            {!loading && sorted.map(r => {
              const typeCol = LOC_TYPE_COLOR[r.locationType] ?? LOC_TYPE_COLOR.OTHER;
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }} onClick={() => navigate(`/locations/${r.id}`)}>{r.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/locations/${r.id}`)}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: typeCol.bg, color: typeCol.text }}>
                      {LOC_TYPE_LABEL[r.locationType] ?? r.locationType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/locations/${r.id}`)}>
                    {r.city && r.state ? `${r.city}, ${r.state}` : r.city || r.state || '\u2014'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/locations/${r.id}`)}>
                    {r.isDefault && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>Default</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/locations/${r.id}`)}>
                    {r.isRegistered && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>W9 Address</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/locations/${r.id}`)}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {r.isActive && (
                      <button style={{ ...btnDanger, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                        onClick={e => { e.stopPropagation(); handleDelete(r.id, r.name); }}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Location drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Location" width={500}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *">
            <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Main Plant" />
          </Field>
          <Field label="Location Type">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationType} onChange={set('locationType')}>
              {LOCATION_TYPES.map(t => <option key={t} value={t}>{LOC_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.isRegistered} onChange={set('isRegistered')} /> Registered (W9 Address)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} /> Set as Default
          </label>
        </div>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.25rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Address
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Street" full><input style={inputStyle} value={f.street} onChange={set('street')} /></Field>
          <Field label="City"><input style={inputStyle} value={f.city} onChange={set('city')} /></Field>
          <Field label="State"><input style={inputStyle} value={f.state} onChange={set('state')} /></Field>
          <Field label="Zip"><input style={inputStyle} value={f.zip} onChange={set('zip')} /></Field>
          <Field label="Country"><input style={inputStyle} value={f.country} onChange={set('country')} /></Field>
        </div>

        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '0.25rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
          Contact
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Phone"><input style={inputStyle} value={f.phone} onChange={set('phone')} placeholder="(555) 123-4567" /></Field>
          <Field label="Email"><input style={inputStyle} value={f.email} onChange={set('email')} placeholder="plant@boxerp.local" /></Field>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Location'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
