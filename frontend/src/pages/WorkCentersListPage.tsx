import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface WCType { id: number; typeKey: string; typeName: string }
interface Location { id: number; name: string }
interface Equipment { id: number; name: string }
interface WorkCenter {
  id: number; name: string; description?: string; isActive: boolean;
  workCenterType?: { id: number; typeKey: string; typeName: string } | null;
  location?: { id: number; name: string } | null;
  equipment?: { id: number; name: string } | null;
}

const EMPTY = { name: '', workCenterTypeId: '', locationId: '', equipmentId: '', description: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
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

export function WorkCentersListPage() {
  const navigate = useNavigate();
  const [rows, setRows]           = useState<WorkCenter[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [sortBy, setSortBy]       = useState('name');
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('asc');
  const [toast, setToast]         = useState<{ text: string; type: 'success'|'error' } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  // Lookups
  const [wcTypes, setWcTypes]       = useState<WCType[]>([]);
  const [locations, setLocations]   = useState<Location[]>([]);
  const [equipment, setEquipment]   = useState<Equipment[]>([]);

  useEffect(() => {
    api.get<WCType[]>('/protected/work-center-types').then(setWcTypes).catch(() => {});
    api.get<Location[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: Equipment[] }>('/protected/equipment?limit=100').then(r => setEquipment(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await api.get<WorkCenter[]>('/protected/work-centers')); }
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
    if (sortBy === 'type') {
      av = a.workCenterType?.typeName ?? '';
      bv = b.workCenterType?.typeName ?? '';
    } else if (sortBy === 'location') {
      av = a.location?.name ?? '';
      bv = b.location?.name ?? '';
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function openNew() {
    setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  function flash(text: string, type: 'success'|'error' = 'success') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 3500);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        workCenterTypeId: f.workCenterTypeId ? parseInt(f.workCenterTypeId) : null,
        locationId: f.locationId ? parseInt(f.locationId) : null,
        equipmentId: f.equipmentId ? parseInt(f.equipmentId) : null,
        description: f.description.trim() || null,
      };
      await api.post('/protected/work-centers', body);
      setDrawerOpen(false);
      flash('Work center created.');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Deactivate work center "${name}"?`)) return;
    try {
      await api.delete(`/protected/work-centers/${id}`);
      flash('Work center deactivated.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Work Centers</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{rows.length} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Work Center</button>
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
              <Th col="name"     label="Name"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="type"     label="Type"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="location" label="Location"  sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Equipment</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && sorted.length === 0 && <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No work centers found.</td></tr>}
            {!loading && sorted.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }} onClick={() => navigate(`/work-centers/${r.id}`)}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/work-centers/${r.id}`)}>
                  {r.workCenterType ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{r.workCenterType.typeName}</span>
                  ) : <span style={{ fontSize: '0.82rem', color: c.textMuted }}>{'\u2014'}</span>}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/work-centers/${r.id}`)}>
                  {r.location?.name ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }} onClick={() => navigate(`/work-centers/${r.id}`)}>
                  {r.equipment?.name ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }} onClick={() => navigate(`/work-centers/${r.id}`)}>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* New Work Center drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Work Center" width={480}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Die Cutter 1" /></Field>
        <Field label="Type">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.workCenterTypeId} onChange={set('workCenterTypeId')}>
            <option value="">-- Select --</option>
            {wcTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationId} onChange={set('locationId')}>
            <option value="">-- Select --</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Equipment">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.equipmentId} onChange={set('equipmentId')}>
            <option value="">-- None --</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
        </Field>
        <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={set('description')} /></Field>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Work Center'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
