import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

interface MatRow { materialId: number; material: { id: number; code: string; name: string; type: string; unitOfMeasure: string }; totalQty: number; locations: Array<{ locationId: number; location: { id: number; name: string }; quantity: number; avgCost: string }> }
interface FGRow { id: number; product: { id: number; sku: string; name: string; productType: string }; variant?: { id: number; sku: string }; location: { id: number; name: string }; quantity: string; avgCost?: string }
interface Transfer { id: number; materialId?: number; productId?: number; quantity: string; status: string; notes?: string; transferredAt: string; material?: { id: number; code: string; name: string }; product?: { id: number; sku: string; name: string }; fromLocation: { id: number; name: string }; toLocation: { id: number; name: string }; transferredBy: { id: number; name: string } }
interface Location { id: number; name: string }
interface Material { id: number; code: string; name: string; type: string }
interface Product  { id: number; sku: string; name: string }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom:'1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}
function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  const col = type === 'success' ? { bg:'rgba(34,197,94,0.12)',border:'rgba(34,197,94,0.3)',color:'#22c55e'} : {bg:'rgba(239,68,68,0.10)',border:'rgba(239,68,68,0.3)',color:'#ef4444'};
  return <div style={{ ...col, borderWidth:1, borderStyle:'solid', borderRadius:8, padding:'0.65rem 1rem', marginBottom:'1rem', fontSize:'0.85rem' }}>{msg}</div>;
}

type Tab = 'materials' | 'finished-goods' | 'transfers';

export function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setTab] = useState<Tab>('materials');
  const [msg, setMsg]       = useState<{ text: string; type: 'success'|'error' } | null>(null);

  function flash(text: string, type: 'success'|'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'materials',      label: 'Raw Materials' },
    { key: 'finished-goods', label: 'Finished Goods' },
    { key: 'transfers',      label: 'Transfers' },
  ];

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:700, margin:0, letterSpacing:'-0.02em' }}>Inventory</h1>
          <p style={{ fontSize:'0.85rem', color:c.textMuted, margin:'0.25rem 0 0' }}>Stock levels and transfers</p>
        </div>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Tabs */}
      <div style={{ borderBottom:`1px solid ${c.cardBorder}`, marginBottom:'1.5rem', display:'flex', gap:2 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background:'none', border:'none', padding:'0.6rem 1rem', fontSize:'0.85rem', color: activeTab===t.key ? c.accent : c.textMuted, fontWeight: activeTab===t.key ? 600 : 400, cursor:'pointer', borderBottom:`2px solid ${activeTab===t.key ? c.accent : 'transparent'}`, transition:'all 0.12s', marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'materials'      && <MaterialInventoryTab />}
      {activeTab === 'finished-goods' && <FGInventoryTab navigate={navigate} />}
      {activeTab === 'transfers'      && <TransfersTab flash={flash} />}
    </Layout>
  );
}

// ─── Material Inventory ───────────────────────────────────────────────────────
function MaterialInventoryTab() {
  const [rows, setRows] = useState<MatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get<{ byMaterial: MatRow[] }>('/protected/inventory/materials')
      .then(r => setRows(r.byMaterial))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  if (loading) return <div style={{ color: c.textMuted, textAlign:'center', padding:'3rem' }}>Loading…</div>;

  return (
    <div style={{ ...cardStyle, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${c.cardBorder}` }}>
            {['Material', 'Code', 'Type', 'Total On Hand', 'UOM', ''].map(h => (
              <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:c.textMuted, fontSize:'0.875rem' }}>No inventory records.</td></tr>}
          {rows.map(r => (
            <>
              <tr key={r.materialId} style={{ borderBottom:`1px solid ${c.divider}`, cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => toggle(r.materialId)}>
                <td style={{ padding:'0.75rem 1rem', fontSize:'0.875rem', fontWeight:600 }}>{r.material.name}</td>
                <td style={{ padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.82rem', color:c.textLabel }}>{r.material.code}</td>
                <td style={{ padding:'0.75rem 1rem', fontSize:'0.78rem', color:c.textMuted }}>{r.material.type}</td>
                <td style={{ padding:'0.75rem 1rem', fontSize:'0.95rem', fontWeight:700, color: r.totalQty > 0 ? c.accent : c.danger }}>{r.totalQty.toLocaleString()}</td>
                <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{r.material.unitOfMeasure}</td>
                <td style={{ padding:'0.75rem 1rem', fontSize:'0.75rem', color:c.textMuted }}>{expanded.has(r.materialId) ? '▲ collapse' : '▼ by location'}</td>
              </tr>
              {expanded.has(r.materialId) && r.locations.map(loc => (
                <tr key={`${r.materialId}-${loc.locationId}`} style={{ background:'rgba(255,255,255,0.02)', borderBottom:`1px solid ${c.divider}` }}>
                  <td colSpan={2} style={{ padding:'0.5rem 1rem 0.5rem 2.5rem', fontSize:'0.8rem', color:c.textMuted }}>└ {loc.location.name}</td>
                  <td />
                  <td style={{ padding:'0.5rem 1rem', fontSize:'0.85rem', color:c.textPrimary }}>{loc.quantity.toLocaleString()}</td>
                  <td style={{ padding:'0.5rem 1rem', fontSize:'0.8rem', color:c.textMuted }}>{loc.avgCost ? `$${Number(loc.avgCost).toFixed(4)} avg` : ''}</td>
                  <td />
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Finished Goods Inventory ─────────────────────────────────────────────────
function FGInventoryTab({ navigate }: { navigate: (p: string) => void }) {
  const [rows, setRows] = useState<FGRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ rows: FGRow[] }>('/protected/inventory/finished-goods')
      .then(r => setRows(r.rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color:c.textMuted, textAlign:'center', padding:'3rem' }}>Loading…</div>;

  return (
    <div style={{ ...cardStyle, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${c.cardBorder}` }}>
            {['Product', 'SKU', 'Variant', 'Location', 'Qty On Hand', 'Avg Cost'].map(h => (
              <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:c.textMuted, fontSize:'0.875rem' }}>No finished goods inventory.</td></tr>}
          {rows.map(r => (
            <tr key={r.id} onClick={() => navigate(`/products/${r.product.id}`)} style={{ borderBottom:`1px solid ${c.divider}`, cursor:'pointer', transition:'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ padding:'0.75rem 1rem', fontSize:'0.875rem' }}>{r.product.name}</td>
              <td style={{ padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.82rem', color:c.accent }}>{r.product.sku}</td>
              <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{r.variant?.sku ?? '—'}</td>
              <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{r.location.name}</td>
              <td style={{ padding:'0.75rem 1rem', fontSize:'0.95rem', fontWeight:700, color: Number(r.quantity) > 0 ? c.accent : c.danger }}>{Number(r.quantity).toLocaleString()}</td>
              <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{r.avgCost ? `$${Number(r.avgCost).toFixed(4)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transfers ────────────────────────────────────────────────────────────────
function TransfersTab({ flash }: { flash: (m: string, t?: 'success'|'error') => void }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [saving, setSaving]       = useState(false);
  const [f, setF] = useState({ transferType: 'material', materialId: '', productId: '', fromLocationId: '', toLocationId: '', quantity: '', notes: '', status: 'PENDING' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data: Transfer[] }>('/protected/inventory/transfers?limit=100');
      setTransfers(r.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<{ data: Location[] }>('/protected/locations').then(r => setLocations(r.data)).catch(() => {});
    api.get<{ data: Material[] }>('/protected/materials?limit=500').then(r => setMaterials(r.data)).catch(() => {});
    api.get<{ data: Product[]  }>('/protected/products?limit=500').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  async function createTransfer() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fromLocationId: parseInt(f.fromLocationId),
        toLocationId:   parseInt(f.toLocationId),
        quantity:       parseFloat(f.quantity),
        status:         f.status,
      };
      if (f.transferType === 'material' && f.materialId) body.materialId = parseInt(f.materialId);
      if (f.transferType === 'product'  && f.productId)  body.productId  = parseInt(f.productId);
      if (f.notes) body.notes = f.notes;
      await api.post('/protected/inventory/transfers', body);
      await load();
      setShowForm(false);
      setF({ transferType:'material', materialId:'', productId:'', fromLocationId:'', toLocationId:'', quantity:'', notes:'', status:'PENDING' });
      flash('Transfer created.');
    } catch (e: any) { flash(e.message, 'error'); } finally { setSaving(false); }
  }

  async function completeTransfer(id: number) {
    if (!confirm('Mark this transfer as COMPLETED? This will adjust inventory quantities.')) return;
    try {
      await api.put(`/protected/inventory/transfers/${id}`, { status: 'COMPLETED' });
      await load();
      flash('Transfer completed — inventory updated.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function cancelTransfer(id: number) {
    if (!confirm('Cancel this transfer?')) return;
    try {
      await api.put(`/protected/inventory/transfers/${id}`, { status: 'CANCELLED' });
      await load();
      flash('Transfer cancelled.');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
        <span style={{ fontSize:'0.85rem', color:c.textMuted }}>{transfers.length} transfer{transfers.length !== 1 ? 's' : ''} on record</span>
        <button style={btnPrimary} onClick={() => setShowForm(s => !s)}>+ New Transfer</button>
      </div>

      {/* New transfer form */}
      {showForm && (
        <div style={{ ...cardStyle, padding:'1.5rem', marginBottom:'1.5rem', maxWidth:640 }}>
          <h3 style={{ margin:'0 0 1.25rem', fontSize:'0.95rem', fontWeight:600 }}>New Inventory Transfer</h3>

          <div style={{ display:'flex', gap:12, marginBottom:'1rem' }}>
            {[['material','Raw Material'],['product','Finished Good']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem', color:c.textLabel, cursor:'pointer' }}>
                <input type="radio" name="ttype" value={v} checked={f.transferType===v} onChange={set('transferType')} /> {l}
              </label>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem 1.25rem' }}>
            {f.transferType === 'material' ? (
              <Field label="Material *">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.materialId} onChange={set('materialId')}>
                  <option value="">— Select —</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Product *">
                <select style={{ ...inputStyle, cursor:'pointer' }} value={f.productId} onChange={set('productId')}>
                  <option value="">— Select —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Quantity *"><input style={inputStyle} type="number" step="0.0001" value={f.quantity} onChange={set('quantity')} /></Field>
            <Field label="From Location *">
              <select style={{ ...inputStyle, cursor:'pointer' }} value={f.fromLocationId} onChange={set('fromLocationId')}>
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="To Location *">
              <select style={{ ...inputStyle, cursor:'pointer' }} value={f.toLocationId} onChange={set('toLocationId')}>
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display:'flex', gap:12, marginBottom:'1rem' }}>
            {[['PENDING','Save as Pending'],['COMPLETED','Complete Now']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem', color:c.textLabel, cursor:'pointer' }}>
                <input type="radio" name="tstatus" value={v} checked={f.status===v} onChange={set('status')} /> {l}
              </label>
            ))}
          </div>
          {f.status === 'COMPLETED' && (
            <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:6, padding:'0.65rem 0.85rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#f59e0b' }}>
              Completing immediately will adjust inventory balances at both locations.
            </div>
          )}

          <Field label="Notes"><textarea style={{ ...inputStyle, height:56, resize:'vertical' }} value={f.notes} onChange={set('notes')} /></Field>
          <div style={{ display:'flex', gap:8 }}>
            <button style={btnPrimary} onClick={createTransfer} disabled={saving}>{saving ? 'Creating…' : 'Create Transfer'}</button>
            <button style={btnSecondary} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Transfers list */}
      {loading ? (
        <div style={{ color:c.textMuted, textAlign:'center', padding:'3rem' }}>Loading…</div>
      ) : transfers.length === 0 ? (
        <div style={{ ...cardStyle, padding:'2rem', textAlign:'center', color:c.textMuted, fontSize:'0.875rem' }}>No transfers yet.</div>
      ) : (
        <div style={{ ...cardStyle, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${c.cardBorder}` }}>
                {['Date','Item','Qty','From','To','By','Status',''].map(h => (
                  <th key={h} style={{ padding:'0.65rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:600, color:c.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => {
                const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.PENDING;
                return (
                  <tr key={t.id} style={{ borderBottom:`1px solid ${c.divider}` }}>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.78rem', color:c.textMuted }}>{new Date(t.transferredAt).toLocaleDateString()}</td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.85rem' }}>
                      {t.material ? <span><span style={{ fontFamily:'monospace', color:c.textLabel, fontSize:'0.78rem' }}>{t.material.code}</span> {t.material.name}</span>
                                  : t.product ? <span><span style={{ fontFamily:'monospace', color:c.accent, fontSize:'0.78rem' }}>{t.product.sku}</span> {t.product.name}</span> : '—'}
                    </td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.875rem', fontWeight:600 }}>{Number(t.quantity).toLocaleString()}</td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{t.fromLocation.name}</td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.82rem', color:c.textLabel }}>{t.toLocation.name}</td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.78rem', color:c.textMuted }}>{t.transferredBy.name}</td>
                    <td style={{ padding:'0.65rem 1rem' }}>
                      <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'0.2rem 0.5rem', borderRadius:4, background:sc.bg, color:sc.text }}>{t.status}</span>
                    </td>
                    <td style={{ padding:'0.65rem 1rem' }}>
                      {t.status === 'PENDING' && (
                        <div style={{ display:'flex', gap:4 }}>
                          <button style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:4, padding:'0.2rem 0.55rem', fontSize:'0.72rem', color:'#22c55e', cursor:'pointer' }} onClick={() => completeTransfer(t.id)}>Complete</button>
                          <button style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:4, padding:'0.2rem 0.55rem', fontSize:'0.72rem', color:'#ef4444', cursor:'pointer' }} onClick={() => cancelTransfer(t.id)}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
