import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

interface Tool {
  id: number; toolNumber: string; type: string; description?: string;
  customerId?: number; condition: string; locationId: number; isActive: boolean;
  createdAt: string; updatedAt: string;
  customer?: { id: number; code: string; name: string };
  location:  { id: number; name: string };
  customerItem?: { id: number; code: string; name: string };
  masterSpec?: { id: number; sku: string; name: string };
  blankSpecs: Array<{ id: number; variant?: { id: number; sku: string; variantDescription?: string; masterSpec: { id: number; sku: string; name: string } } }>;
}
interface Location { id: number; name: string }
interface Customer { id: number; code: string; name: string }

const TOOL_TYPES  = ['DIE', 'PLATE', 'OTHER'];
const CONDITIONS  = ['NEW', 'GOOD', 'WORN', 'RETIRED'];

// Condition pipeline order
const COND_ORDER = ['NEW','GOOD','WORN','RETIRED'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}
function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  const col = type === 'success' ? { bg:'rgba(34,197,94,0.12)',border:'rgba(34,197,94,0.3)',color:'#22c55e'} : {bg:'rgba(239,68,68,0.10)',border:'rgba(239,68,68,0.3)',color:'#ef4444'};
  return <div style={{ ...col, borderWidth:1, borderStyle:'solid', borderRadius:8, padding:'0.65rem 1rem', marginBottom:'1rem', fontSize:'0.85rem' }}>{msg}</div>;
}

export function ToolingRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [tool, setTool]         = useState<Tool | null>(null);
  const [loading, setLoading]   = useState(!isNew);
  const [edit, setEdit]         = useState(isNew);
  const [msg, setMsg]           = useState<{ text: string; type: 'success'|'error' } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [f, setF] = useState({ toolNumber: '', type: 'DIE', description: '', customerId: '', condition: 'NEW', locationId: '', isActive: true });

  useEffect(() => {
    api.get<Location[]>('/protected/locations').then(setLocations).catch(() => {});
    api.get<{ data: Customer[] }>('/protected/customers?limit=500').then(r => setCustomers(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const t = await api.get<Tool>(`/protected/tooling/${id}`);
      setTool(t);
      setF({ toolNumber: t.toolNumber, type: t.type, description: t.description ?? '', customerId: String(t.customerId ?? ''), condition: t.condition, locationId: String(t.locationId), isActive: t.isActive });
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setLoading(false); }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  function flash(text: string, type: 'success'|'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  async function save() {
    try {
      const body: Record<string, unknown> = { toolNumber: f.toolNumber, type: f.type, description: f.description || null, customerId: f.customerId ? parseInt(f.customerId) : null, condition: f.condition, locationId: parseInt(f.locationId), isActive: f.isActive };
      if (isNew) {
        const t = await api.post<Tool>('/protected/tooling', body);
        navigate(`/tooling/${t.id}`, { replace: true });
      } else {
        const t = await api.put<Tool>(`/protected/tooling/${tool!.id}`, body);
        setTool(t);
        setEdit(false);
        flash('Saved.');
      }
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <Layout><div style={{ color: c.textMuted, padding:'3rem', textAlign:'center' }}>Loading…</div></Layout>;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor:'pointer', color: c.accent }} onClick={() => navigate('/tooling')}>Tooling</span>
        {tool && <> &rsaquo; <span style={{ color: c.textLabel }}>{tool.toolNumber}</span></>}
        {isNew && <> &rsaquo; <span style={{ color: c.textLabel }}>New Tool</span></>}
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      {tool && (
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h1 style={{ fontSize:'1.4rem', fontWeight:700, margin:0, letterSpacing:'-0.02em', fontFamily:'monospace' }}>{tool.toolNumber}</h1>
              <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:4, background: tool.type==='DIE'?'rgba(59,130,246,0.12)':'rgba(168,85,247,0.12)', color: tool.type==='DIE'?'#60a5fa':'#c084fc' }}>{tool.type}</span>
            </div>
            {tool.description && <div style={{ fontSize:'0.85rem', color:c.textLabel, marginTop:4 }}>{tool.description}</div>}
          </div>
          {!edit && <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>}
        </div>
      )}

      {/* Condition pipeline */}
      {tool && (
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:'1.5rem' }}>
          {COND_ORDER.map((cond, i) => {
            const idx  = COND_ORDER.indexOf(tool.condition);
            const done = i <= idx;
            const colors = STATUS_COLORS[cond];
            return (
              <div key={cond} style={{ display:'flex', alignItems:'center' }}>
                {i > 0 && <div style={{ width:36, height:2, background: i <= idx ? colors.text : c.divider, opacity: 0.5 }} />}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: done ? `${colors.bg}` : 'rgba(255,255,255,0.05)', border:`2px solid ${done ? colors.text : c.divider}` }}>
                    {done && <div style={{ width:8, height:8, borderRadius:'50%', background: colors.text }} />}
                  </div>
                  <span style={{ fontSize:'0.65rem', color: done ? colors.text : c.textMuted, fontWeight: cond === tool.condition ? 700 : 400, letterSpacing:'0.03em' }}>{cond}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form */}
      <div style={{ ...cardStyle, padding:'1.5rem', maxWidth:640 }}>
        {(edit || isNew) ? (
          <>
            <h3 style={{ margin:'0 0 1.25rem', fontSize:'0.95rem', fontWeight:600 }}>{isNew ? 'New Tool' : 'Edit Tool'}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem 1.25rem' }}>
              <Field label="Tool Number *"><input style={inputStyle} value={f.toolNumber} onChange={set('toolNumber')} placeholder="DIE-0042" /></Field>
              <Field label="Type *">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.type} onChange={set('type')}>
                  {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Condition *">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.condition} onChange={set('condition')}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Location *">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.locationId} onChange={set('locationId')}>
                  <option value="">— Select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
              <Field label="Customer Owner (blank = plant)">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.customerId} onChange={set('customerId')}>
                  <option value="">Plant Owned</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea style={{ ...inputStyle, height:64, resize:'vertical' }} value={f.description} onChange={set('description')} /></Field>
            {!isNew && (
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem', color:c.textLabel, cursor:'pointer', marginBottom:'1rem' }}>
                <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
              </label>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button style={btnPrimary} onClick={save}>{isNew ? 'Create Tool' : 'Save'}</button>
              {!isNew && <button style={btnSecondary} onClick={() => { setEdit(false); }}>Cancel</button>}
            </div>
          </>
        ) : tool && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem 2rem', fontSize:'0.875rem' }}>
              {[['Tool Number', tool.toolNumber], ['Type', tool.type], ['Condition', tool.condition], ['Location', tool.location.name], ['Owner', tool.customer ? `${tool.customer.name} (customer)` : 'Plant owned'], ['Master Spec', tool.masterSpec ? tool.masterSpec.name : '--'], ['Customer Item', tool.customerItem ? tool.customerItem.name : '--'], ['Status', tool.isActive ? 'Active' : 'Retired']].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{l}</div>
                  <div>{v}</div>
                </div>
              ))}
            </div>
            {tool.description && (
              <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:`1px solid ${c.divider}` }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', marginBottom:4 }}>Description</div>
                <div style={{ fontSize:'0.875rem', color:c.textLabel }}>{tool.description}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Products using this tool */}
      {tool && tool.blankSpecs.length > 0 && (
        <div style={{ marginTop:'1.5rem', maxWidth:640 }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:c.textMuted, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.85rem' }}>Variants Using This Tool</div>
          <div style={{ ...cardStyle, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${c.cardBorder}` }}>
                  {['Variant SKU','Master Spec'].map(h => <th key={h} style={{ padding:'0.65rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tool.blankSpecs.filter(bs => bs.variant).map(bs => (
                  <tr key={bs.id} onClick={() => navigate(`/master-specs/${bs.variant!.masterSpec.id}/variants/${bs.variant!.id}`)} style={{ borderBottom:`1px solid ${c.divider}`, cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding:'0.65rem 1rem', fontFamily:'monospace', fontSize:'0.82rem', color:c.accent }}>{bs.variant!.sku}</td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.875rem' }}>{bs.variant!.masterSpec.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
