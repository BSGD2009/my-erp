import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface WCType { id: number; typeKey: string; typeName: string }
interface LocationRef { id: number; name: string }
interface EquipmentRef { id: number; name: string }
interface WorkCenter {
  id: number; name: string; description?: string; isActive: boolean;
  workCenterTypeId?: number; locationId?: number; equipmentId?: number;
  workCenterType?: WCType | null;
  location?: LocationRef | null;
  equipment?: EquipmentRef | null;
  _count?: { jobs: number };
  createdAt: string; updatedAt: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' };
  return <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>{msg}</div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem' }}>{value || '\u2014'}</div>
    </div>
  );
}

export function WorkCenterRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [wc, setWc]             = useState<WorkCenter | null>(null);
  const [loading, setLoading]   = useState(true);
  const [edit, setEdit]         = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: 'success'|'error' } | null>(null);
  const [saving, setSaving]     = useState(false);

  // Lookups
  const [wcTypes, setWcTypes]         = useState<WCType[]>([]);
  const [locations, setLocations]     = useState<LocationRef[]>([]);
  const [equipmentList, setEquipment] = useState<EquipmentRef[]>([]);

  const [f, setF] = useState({
    name: '', workCenterTypeId: '', locationId: '', equipmentId: '', description: '', isActive: true,
  });

  useEffect(() => {
    api.get<WCType[]>('/protected/work-center-types').then(setWcTypes).catch(() => {});
    api.get<LocationRef[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: EquipmentRef[] }>('/protected/equipment?limit=100').then(r => setEquipment(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await api.get<WorkCenter>(`/protected/work-centers/${id}`);
      setWc(w);
      setF({
        name: w.name,
        workCenterTypeId: w.workCenterTypeId != null ? String(w.workCenterTypeId) : '',
        locationId: w.locationId != null ? String(w.locationId) : '',
        equipmentId: w.equipmentId != null ? String(w.equipmentId) : '',
        description: w.description ?? '',
        isActive: w.isActive,
      });
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function flash(text: string, type: 'success'|'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save() {
    if (!f.name.trim()) { flash('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(),
        workCenterTypeId: f.workCenterTypeId ? parseInt(f.workCenterTypeId) : null,
        locationId: f.locationId ? parseInt(f.locationId) : null,
        equipmentId: f.equipmentId ? parseInt(f.equipmentId) : null,
        description: f.description || null,
        isActive: f.isActive,
      };
      await api.put(`/protected/work-centers/${id}`, body);
      setEdit(false);
      flash('Saved.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!wc) return <Layout><div style={{ color: c.danger, padding: '3rem', textAlign: 'center' }}>Work center not found.</div></Layout>;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/work-centers')}>Work Centers</span>
        {' \u203A '}
        <span style={{ color: c.textLabel }}>{wc.name}</span>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{wc.name}</h1>
            {wc.workCenterType && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                {wc.workCenterType.typeName}
              </span>
            )}
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: wc.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: wc.isActive ? '#22c55e' : '#64748b' }}>
              {wc.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {wc.description && <div style={{ fontSize: '0.85rem', color: c.textLabel, marginTop: 4 }}>{wc.description}</div>}
        </div>
        {!edit && <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>}
      </div>

      {/* Job count */}
      {wc._count && (
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ ...cardStyle, padding: '0.85rem 1.25rem', minWidth: 120 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: c.textPrimary }}>{wc._count.jobs}</div>
            <div style={{ fontSize: '0.72rem', color: c.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Production Jobs</div>
          </div>
        </div>
      )}

      {/* Details card */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 640 }}>
        {edit ? (
          <>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Work Center</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} /></Field>
              <Field label="Type">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.workCenterTypeId} onChange={set('workCenterTypeId')}>
                  <option value="">-- None --</option>
                  {wcTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
                </select>
              </Field>
              <Field label="Location">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.locationId} onChange={set('locationId')}>
                  <option value="">-- None --</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
              <Field label="Equipment">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.equipmentId} onChange={set('equipmentId')}>
                  <option value="">-- None --</option>
                  {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={f.description} onChange={set('description')} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
              <input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Active
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button style={btnSecondary} onClick={() => { setEdit(false); load(); }}>Cancel</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
            <ReadOnlyField label="Name" value={wc.name} />
            <ReadOnlyField label="Type" value={wc.workCenterType?.typeName ?? ''} />
            <ReadOnlyField label="Location" value={wc.location?.name ?? ''} />
            <ReadOnlyField label="Equipment" value={wc.equipment?.name ?? ''} />
            <ReadOnlyField label="Status" value={wc.isActive ? 'Active' : 'Inactive'} />
            <ReadOnlyField label="Jobs" value={String(wc._count?.jobs ?? 0)} />
            {wc.description && (
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${c.divider}` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: '0.875rem', color: c.textLabel }}>{wc.description}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
