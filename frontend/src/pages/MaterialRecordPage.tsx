import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MaterialType { id: number; typeKey: string; typeName: string }
interface InventoryRow { id: number; materialId: number; locationId: number; quantity: string; avgCost: string; location: { id: number; name: string } }
interface Variant { id: number; variantCode: string; description?: string; isActive: boolean }
interface MaterialRecord {
  id: number; code: string; name: string; unitOfMeasure: string;
  defaultCost?: string; reorderPoint?: string; reorderQty?: string;
  leadTimeDays?: number; isActive: boolean;
  materialTypeId?: number;
  materialType?: MaterialType;
  inventory: InventoryRow[];
  variants: Variant[];
}
interface Transaction {
  id: number; materialId: number; txType: string; quantity: string; unitCost?: string; locationId: number;
  notes?: string; createdAt: string;
  location: { id: number; name: string };
  createdBy: { id: number; name: string };
}

const UOM_OPTS = ['MSF', 'LF', 'ROLL', 'LB', 'GAL', 'EA', 'CTN'];

type Tab = 'details' | 'inventory' | 'transactions' | 'variants' | 'bom-usage';

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

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: active ? 600 : 400,
    background: active ? c.accentMuted : 'transparent',
    border: `1px solid ${active ? c.accentBorder : 'transparent'}`,
    borderRadius: 6, color: active ? '#93c5fd' : c.textLabel, cursor: 'pointer',
  };
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' };
  return (
    <div style={{ background: col.bg, borderWidth: 1, borderStyle: 'solid', borderColor: col.border, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>
      {msg}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600,
  color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.875rem' };

const TX_COLORS: Record<string, { bg: string; text: string }> = {
  RECEIPT:            { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  CONSUMPTION:        { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  ADJUSTMENT:         { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  TRANSFER:           { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  ISSUED_TO_JOB:      { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  RETURNED_FROM_JOB:  { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
  CONVERTED_TO_FG:    { bg: 'rgba(236,72,153,0.12)',  text: '#f472b6' },
  WASTE:              { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
};
const DEFAULT_TX_COLOR = { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' };

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function MaterialRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mat, setMat]           = useState<MaterialRecord | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab]           = useState<Tab>('details');
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Details form
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({
    code: '', name: '', materialTypeId: '', unitOfMeasure: 'MSF',
    defaultCost: '', reorderPoint: '', reorderQty: '', leadTimeDays: '', isActive: true,
  });
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  // Transactions (lazy loaded)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading]       = useState(false);
  const [txLoaded, setTxLoaded]         = useState(false);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Load material ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<MaterialRecord>(`/protected/materials/${id}`);
      setMat(r);
      setF({
        code: r.code, name: r.name,
        materialTypeId: r.materialTypeId != null ? String(r.materialTypeId) : '',
        unitOfMeasure: r.unitOfMeasure,
        defaultCost: r.defaultCost != null ? String(r.defaultCost) : '',
        reorderPoint: r.reorderPoint != null ? String(r.reorderPoint) : '',
        reorderQty: r.reorderQty != null ? String(r.reorderQty) : '',
        leadTimeDays: r.leadTimeDays != null ? String(r.leadTimeDays) : '',
        isActive: r.isActive,
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<MaterialType[]>('/protected/material-types').then(setMaterialTypes).catch(() => {});
  }, []);

  // Load transactions on tab switch
  useEffect(() => {
    if (tab === 'transactions' && !txLoaded) {
      setTxLoading(true);
      api.get<Transaction[]>(`/protected/materials/${id}/transactions?limit=50`)
        .then(r => { setTransactions(r); setTxLoaded(true); })
        .catch(() => {})
        .finally(() => setTxLoading(false));
    }
  }, [tab, id, txLoaded]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  // ── Save material ──────────────────────────────────────────────────────────
  async function save() {
    try {
      const body: Record<string, unknown> = {
        code: f.code.trim().toUpperCase(), name: f.name.trim(),
        materialTypeId: f.materialTypeId ? parseInt(f.materialTypeId) : null,
        unitOfMeasure: f.unitOfMeasure,
        defaultCost: f.defaultCost ? parseFloat(f.defaultCost) : null,
        reorderPoint: f.reorderPoint ? parseFloat(f.reorderPoint) : null,
        reorderQty: f.reorderQty ? parseFloat(f.reorderQty) : null,
        leadTimeDays: f.leadTimeDays ? parseInt(f.leadTimeDays) : null,
        isActive: f.isActive,
      };
      await api.put(`/protected/materials/${mat!.id}`, body);
      setEdit(false);
      flash('Material saved.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (notFound || !mat) return (
    <Layout>
      <div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 0.5rem' }}>Material not found</h2>
        <button style={btnSecondary} onClick={() => navigate('/materials')}>Back to Materials</button>
      </div>
    </Layout>
  );

  const totalQty = mat.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'details',      label: 'Details' },
    { key: 'inventory',    label: `Inventory (${mat.inventory.length})` },
    { key: 'transactions', label: 'Transactions' },
    { key: 'variants',     label: `Variants (${mat.variants.length})` },
    { key: 'bom-usage',    label: 'BOM Usage' },
  ];

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/materials')}>Materials</span>
        {' \u203A '}
        <span style={{ color: c.textLabel }}>{mat.code}</span>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{mat.name}</h1>
            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 4, background: c.accentMuted, color: '#93c5fd' }}>
              {mat.code}
            </span>
            {mat.materialType && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>
                {mat.materialType.typeName}
              </span>
            )}
            {!mat.isActive && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: 'rgba(100,116,139,0.12)', color: '#64748b' }}>
                INACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: c.textMuted, marginTop: 4 }}>
            {mat.unitOfMeasure} &middot; Total on hand: {totalQty.toLocaleString()}
          </div>
        </div>
        <button style={btnSecondary} onClick={() => navigate('/materials')}>Back</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tabStyle(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details tab ───────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 720 }}>
          {edit ? (
            <>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Material</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                <Field label="Code *"><input style={inputStyle} value={f.code} onChange={set('code')} /></Field>
                <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} /></Field>
                <Field label="Material Type">
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.materialTypeId} onChange={set('materialTypeId')}>
                    <option value="">-- None --</option>
                    {materialTypes.map(t => <option key={t.id} value={t.id}>{t.typeName}</option>)}
                  </select>
                </Field>
                <Field label="Unit of Measure *">
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.unitOfMeasure} onChange={set('unitOfMeasure')}>
                    {UOM_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Default Cost ($)"><input style={inputStyle} type="number" step="0.0001" value={f.defaultCost} onChange={set('defaultCost')} placeholder="0.0000" /></Field>
                <Field label="Reorder Point"><input style={inputStyle} type="number" step="0.01" value={f.reorderPoint} onChange={set('reorderPoint')} /></Field>
                <Field label="Reorder Qty"><input style={inputStyle} type="number" step="0.01" value={f.reorderQty} onChange={set('reorderQty')} /></Field>
                <Field label="Lead Time (days)"><input style={inputStyle} type="number" step="1" value={f.leadTimeDays} onChange={set('leadTimeDays')} /></Field>
              </div>

              {/* Active toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
                <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnPrimary} onClick={save}>Save</button>
                <button style={btnSecondary} onClick={() => { setEdit(false); load(); }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
                {([
                  ['Code', mat.code],
                  ['Name', mat.name],
                  ['Material Type', mat.materialType?.typeName ?? '--'],
                  ['Unit of Measure', mat.unitOfMeasure],
                  ['Default Cost', mat.defaultCost ? `$${Number(mat.defaultCost).toFixed(4)}` : '--'],
                  ['Reorder Point', mat.reorderPoint ? Number(mat.reorderPoint).toLocaleString() : '--'],
                  ['Reorder Qty', mat.reorderQty ? Number(mat.reorderQty).toLocaleString() : '--'],
                  ['Lead Time', mat.leadTimeDays != null ? `${mat.leadTimeDays} days` : '--'],
                  ['Status', mat.isActive ? 'Active' : 'Inactive'],
                  ['Total On Hand', totalQty.toLocaleString()],
                ] as [string, string][]).map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{l}</div>
                    <div>{v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Inventory tab ─────────────────────────────────────────────────────── */}
      {tab === 'inventory' && (
        <div style={{ maxWidth: 720 }}>
          {mat.inventory.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No inventory records for this material.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    {['Location', 'Quantity', 'Avg Cost'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mat.inventory.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                      <td style={tdStyle}>{inv.location.name}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: Number(inv.quantity) > 0 ? c.accent : c.danger }}>
                        {Number(inv.quantity).toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>
                        {inv.avgCost ? `$${Number(inv.avgCost).toFixed(4)}` : '--'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `2px solid ${c.cardBorder}`, background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: c.textLabel }}>Total</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: c.accent }}>{totalQty.toLocaleString()}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Transactions tab ──────────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <div style={{ maxWidth: 960 }}>
          {txLoading ? (
            <div style={{ color: c.textMuted, textAlign: 'center', padding: '3rem' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No transactions recorded for this material.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    {['Date', 'Type', 'Qty', 'Unit Cost', 'Location', 'By', 'Notes'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const txCol = TX_COLORS[tx.txType] ?? DEFAULT_TX_COLOR;
                    const qty = Number(tx.quantity);
                    return (
                      <tr key={tx.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                        <td style={{ ...tdStyle, fontSize: '0.78rem', color: c.textMuted }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: txCol.bg, color: txCol.text }}>
                            {tx.txType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: qty >= 0 ? '#22c55e' : '#ef4444' }}>
                          {qty >= 0 ? '+' : ''}{qty.toLocaleString()}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.82rem', color: c.textLabel }}>
                          {tx.unitCost ? `$${Number(tx.unitCost).toFixed(4)}` : '--'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.82rem', color: c.textLabel }}>{tx.location.name}</td>
                        <td style={{ ...tdStyle, fontSize: '0.78rem', color: c.textMuted }}>{tx.createdBy.name}</td>
                        <td style={{ ...tdStyle, fontSize: '0.78rem', color: c.textMuted }}>{tx.notes ?? '--'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Variants tab ──────────────────────────────────────────────────────── */}
      {tab === 'variants' && (
        <div style={{ maxWidth: 720 }}>
          {mat.variants.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No variants defined for this material.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    {['Code', 'Description', 'Status'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mat.variants.map(v => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: c.accent }}>{v.variantCode}</td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>{v.description || '--'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                          background: v.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                          color: v.isActive ? '#22c55e' : '#64748b',
                        }}>
                          {v.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: c.textMuted, fontStyle: 'italic' }}>
            Variant management coming soon.
          </div>
        </div>
      )}

      {/* ── BOM Usage tab ─────────────────────────────────────────────────────── */}
      {tab === 'bom-usage' && (
        <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem', maxWidth: 720 }}>
          BOM references coming in a future session.
        </div>
      )}
    </Layout>
  );
}
