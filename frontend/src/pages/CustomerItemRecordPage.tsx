import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerItem {
  id: number; code: string; name: string; description?: string;
  listPrice?: number; fulfillmentPath?: string; isActive: boolean;
  customerId: number; masterSpecId?: number; variantId?: number;
  createdAt: string; updatedAt: string;
  customer: { id: number; code: string; name: string };
  masterSpec?: { id: number; sku: string; name: string };
  variant?: { id: number; sku: string; name: string };
  tooling?: Array<{ id: number; toolNumber: string; type: string }>;
}

interface CustomerLookup { id: number; code: string; name: string }
interface MasterSpecLookup { id: number; sku: string; name: string }

const FULFILLMENT_PATHS = ['MANUFACTURE', 'STOCK_AND_SHIP', 'OUTSOURCE', 'VIRTUAL'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CustomerItemRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem]         = useState<CustomerItem | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [f, setF] = useState({
    name: '', code: '', description: '', customerId: '',
    masterSpecId: '', variantId: '', listPrice: '', fulfillmentPath: '', isActive: true,
  });

  // Lookups
  const [customers, setCustomers]     = useState<CustomerLookup[]>([]);
  const [masterSpecs, setMasterSpecs] = useState<MasterSpecLookup[]>([]);

  useEffect(() => {
    api.get<{ data: CustomerLookup[] }>('/protected/customers?limit=500').then(r => setCustomers(r.data)).catch(() => {});
    api.get<{ data: MasterSpecLookup[] }>('/protected/master-specs?limit=500').then(r => setMasterSpecs(r.data)).catch(() => {});
  }, []);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadItem = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const r = await api.get<CustomerItem>(`/protected/customer-items/${id}`);
      setItem(r);
      setF({
        name:            r.name,
        code:            r.code,
        description:     r.description ?? '',
        customerId:      String(r.customerId),
        masterSpecId:    r.masterSpecId != null ? String(r.masterSpecId) : '',
        variantId:       r.variantId != null ? String(r.variantId) : '',
        listPrice:       r.listPrice != null ? String(r.listPrice) : '',
        fulfillmentPath: r.fulfillmentPath ?? '',
        isActive:        r.isActive,
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadItem(); }, [loadItem]);

  // ── Edit drawer ───────────────────────────────────────────────────────────

  function openEdit() {
    if (!item) return;
    setSaveErr('');
    setF({
      name:            item.name,
      code:            item.code,
      description:     item.description ?? '',
      customerId:      String(item.customerId),
      masterSpecId:    item.masterSpecId != null ? String(item.masterSpecId) : '',
      variantId:       item.variantId != null ? String(item.variantId) : '',
      listPrice:       item.listPrice != null ? String(item.listPrice) : '',
      fulfillmentPath: item.fulfillmentPath ?? '',
      isActive:        item.isActive,
    });
    setDrawerOpen(true);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim())  { setSaveErr('Name is required'); return; }
    if (!f.customerId)   { setSaveErr('Customer is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name:            f.name.trim(),
        code:            f.code.trim() || undefined,
        description:     f.description.trim() || null,
        customerId:      parseInt(f.customerId),
        masterSpecId:    f.masterSpecId ? parseInt(f.masterSpecId) : null,
        variantId:       f.variantId ? parseInt(f.variantId) : null,
        listPrice:       f.listPrice ? parseFloat(f.listPrice) : null,
        fulfillmentPath: f.fulfillmentPath || null,
        isActive:        f.isActive,
      };
      await api.put(`/protected/customer-items/${item!.id}`, body);
      setDrawerOpen(false);
      flash('Customer item saved.');
      await loadItem();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  async function deactivate() {
    if (!item) return;
    if (!window.confirm(`Deactivate "${item.name}"? This is a soft delete.`)) return;
    try {
      await api.delete(`/protected/customer-items/${item.id}`);
      flash('Customer item deactivated.');
      await loadItem();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Loading / not-found ───────────────────────────────────────────────────

  if (loading) {
    return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  }

  if (notFound || !item) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', color: c.textMuted, marginBottom: '1rem' }}>Customer item not found</div>
          <button style={btnSecondary} onClick={() => navigate('/customer-items')}>&larr; Back to Customer Items</button>
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/customer-items')}>Customer Items</span>
        <> &rsaquo; <span style={{ color: c.textLabel }}>{item.code}</span></>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', fontFamily: 'monospace' }}>{item.code}</h1>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: c.accentMuted, color: '#93c5fd', border: `1px solid ${c.accentBorder}` }}>{item.customer.name}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: item.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: item.isActive ? '#22c55e' : '#64748b' }}>{item.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div style={{ fontSize: '0.95rem', color: c.textPrimary, marginTop: 4 }}>{item.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondary} onClick={openEdit}>Edit</button>
          {item.isActive && <button style={btnDanger} onClick={deactivate}>Deactivate</button>}
        </div>
      </div>

      {/* Info Card */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Code</div>
            <div style={{ fontFamily: 'monospace', color: c.accent }}>{item.code}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Name</div>
            <div>{item.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Customer</div>
            <div>
              <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate(`/customers/${item.customer.id}`)}>{item.customer.name}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Master Spec</div>
            <div>
              {item.masterSpec ? (
                <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate(`/master-specs/${item.masterSpec!.id}`)}>{item.masterSpec.name}</span>
              ) : '\u2014'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Variant</div>
            <div>{item.variant ? item.variant.name : '\u2014'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>List Price</div>
            <div style={{ fontFamily: 'monospace' }}>{item.listPrice != null ? `$${Number(item.listPrice).toFixed(2)}` : '\u2014'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Fulfillment Path</div>
            <div>
              {item.fulfillmentPath ? (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>{item.fulfillmentPath.replace(/_/g, ' ')}</span>
              ) : '\u2014'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Status</div>
            <div>{item.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </div>

        {item.description && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: '0.875rem', color: c.textLabel }}>{item.description}</div>
          </div>
        )}
      </div>

      {/* Tooling section */}
      {item.tooling && item.tooling.length > 0 && (
        <div style={{ marginTop: '1.5rem', maxWidth: 700 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Associated Tooling</div>
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                  {['Tool #', 'Type'].map(h => <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {item.tooling.map(t => (
                  <tr key={t.id}
                    onClick={() => navigate(`/tooling/${t.id}`)}
                    style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent }}>{t.toolNumber}</td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: 4, background: t.type === 'DIE' ? 'rgba(59,130,246,0.12)' : t.type === 'PLATE' ? 'rgba(168,85,247,0.12)' : 'rgba(100,116,139,0.12)', color: t.type === 'DIE' ? '#60a5fa' : t.type === 'PLATE' ? '#c084fc' : '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{t.type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Edit Customer Item" width={520}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Name *">
            <input style={inputStyle} value={f.name} onChange={set('name')} />
          </Field>
          <Field label="Code">
            <input style={inputStyle} value={f.code} onChange={set('code')} />
          </Field>
          <Field label="Customer *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.customerId} onChange={set('customerId')}>
              <option value="">-- Select customer --</option>
              {customers.map(cu => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
            </select>
          </Field>
          <Field label="Master Spec">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.masterSpecId} onChange={set('masterSpecId')}>
              <option value="">-- None --</option>
              {masterSpecs.map(ms => <option key={ms.id} value={ms.id}>{ms.name}</option>)}
            </select>
          </Field>
          <Field label="List Price ($)">
            <input style={inputStyle} type="number" step="0.01" min="0" value={f.listPrice} onChange={set('listPrice')} />
          </Field>
          <Field label="Fulfillment Path">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.fulfillmentPath} onChange={set('fulfillmentPath')}>
              <option value="">-- None --</option>
              {FULFILLMENT_PATHS.map(fp => <option key={fp} value={fp}>{fp.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.description} onChange={set('description')} />
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
          <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
