import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle, STATUS_COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ContractLine {
  id: number;
  customerItemId: number | null;
  variantId: number | null;
  committedQty: string | number;
  unitPrice: string | number;
  validFrom: string | null;
  validTo: string | null;
  notes: string | null;
  customerItem?: { id: number; code: string; name: string };
  variant?: { id: number; sku: string; variantDescription?: string };
  priceLockedBy: { id: number; name: string };
}

interface BlanketContract {
  id: number;
  contractNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  totalCommittedValue: string | number | null;
  notes: string | null;
  createdAt: string;
  customerId: number;
  customer: { id: number; code: string; name: string };
  createdBy?: { id: number; name: string };
  lines: ContractLine[];
}

interface CustomerItem { id: number; code: string; name: string }

const EMPTY_LINE = {
  customerItemId: '',
  variantSpecId: '',
  committedQty: '',
  unitPrice: '',
  validFrom: '',
  validTo: '',
  notes: '',
};

const STATUSES = ['ACTIVE', 'EXPIRED', 'RENEGOTIATING', 'CANCELLED'] as const;

// Status badge color fallback for statuses not in the shared theme
const CONTRACT_STATUS_FALLBACK: Record<string, { bg: string; text: string; border: string }> = {
  EXPIRED:        { bg: 'rgba(100,116,139,0.12)', text: '#64748b', border: 'rgba(100,116,139,0.2)' },
  RENEGOTIATING:  { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
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

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? CONTRACT_STATUS_FALLBACK[status] ?? { bg: 'rgba(100,116,139,0.12)', text: '#64748b', border: 'rgba(100,116,139,0.2)' };
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: c.danger };
  return (
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>
      {msg}
    </div>
  );
}

function fmtCurrency(val: string | number | null | undefined): string {
  if (val == null) return '\u2014';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '\u2014';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function BlanketContractRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<BlanketContract | null>(null);
  const [loading, setLoading]   = useState(true);
  const [edit, setEdit]         = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit form
  const [ef, setEf] = useState({ contractNumber: '', status: '', startDate: '', endDate: '', totalCommittedValue: '', notes: '' });

  // Add line drawer
  const [lineDrawerOpen, setLineDrawerOpen] = useState(false);
  const [lineForm, setLineForm]             = useState(EMPTY_LINE);
  const [lineSaving, setLineSaving]         = useState(false);
  const [lineSaveErr, setLineSaveErr]       = useState('');

  // Lookups
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<BlanketContract>(`/protected/blanket-contracts/${id}`);
      setContract(data);
      setEf({
        contractNumber:     data.contractNumber,
        status:             data.status,
        startDate:          data.startDate ? data.startDate.substring(0, 10) : '',
        endDate:            data.endDate ? data.endDate.substring(0, 10) : '',
        totalCommittedValue: data.totalCommittedValue != null ? String(data.totalCommittedValue) : '',
        notes:              data.notes ?? '',
      });
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load lookups once
  useEffect(() => {
    api.get<{ data: CustomerItem[] }>('/protected/customer-items?limit=500').then(r => setCustomerItems(r.data)).catch(() => {});
  }, []);

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Save contract edits ──
  async function saveContract() {
    try {
      const body: Record<string, unknown> = {
        contractNumber:     ef.contractNumber.trim(),
        status:             ef.status,
        startDate:          ef.startDate,
        endDate:            ef.endDate,
        totalCommittedValue: ef.totalCommittedValue ? parseFloat(ef.totalCommittedValue) : null,
        notes:              ef.notes.trim() || null,
      };
      await api.put(`/protected/blanket-contracts/${id}`, body);
      setEdit(false);
      flash('Contract updated.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Delete contract ──
  async function deleteContract() {
    if (!window.confirm(`Delete contract "${contract?.contractNumber}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/protected/blanket-contracts/${id}`);
      navigate('/admin/blanket-contracts');
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Add line ──
  function openAddLine() {
    setLineForm(EMPTY_LINE);
    setLineSaveErr('');
    setLineDrawerOpen(true);
  }

  const setLine = (k: keyof typeof EMPTY_LINE) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setLineForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  async function saveLine() {
    if (!lineForm.committedQty) { setLineSaveErr('Committed qty is required'); return; }
    if (!lineForm.unitPrice) { setLineSaveErr('Unit price is required'); return; }
    if (!lineForm.validFrom || !lineForm.validTo) { setLineSaveErr('Valid from/to dates are required'); return; }
    setLineSaving(true); setLineSaveErr('');
    try {
      const body: Record<string, unknown> = {
        customerItemId:  lineForm.customerItemId ? Number(lineForm.customerItemId) : null,
        variantId:       lineForm.variantSpecId ? Number(lineForm.variantSpecId) : null,
        committedQty:    parseInt(lineForm.committedQty),
        unitPrice:       parseFloat(lineForm.unitPrice),
        validFrom:       lineForm.validFrom,
        validTo:         lineForm.validTo,
        priceLockedAt:   new Date().toISOString(),
        priceLockedById: 1,
        notes:           lineForm.notes.trim() || null,
      };
      await api.post(`/protected/blanket-contracts/${id}/lines`, body);
      setLineDrawerOpen(false);
      flash('Line added.');
      load();
    } catch (e: any) { setLineSaveErr(e.message); }
    finally { setLineSaving(false); }
  }

  // ── Delete line ──
  async function deleteLine(lineId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Remove this line?')) return;
    try {
      await api.delete(`/protected/blanket-contracts/${id}/lines/${lineId}`);
      flash('Line removed.');
      load();
    } catch (err: any) { flash(err.message, 'error'); }
  }

  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!contract) return <Layout><div style={{ color: c.danger, padding: '3rem', textAlign: 'center' }}>Contract not found.</div></Layout>;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/admin/blanket-contracts')}>Blanket Contracts</span>
        &nbsp;&rsaquo;&nbsp;
        <span style={{ color: c.textLabel }}>{contract.contractNumber}</span>
      </div>

      {/* Toast */}
      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', fontFamily: 'monospace' }}>{contract.contractNumber}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <div style={{ fontSize: '0.85rem', color: c.textLabel, marginTop: 4 }}>
            <span
              style={{ color: c.accent, cursor: 'pointer' }}
              onClick={() => navigate(`/customers/${contract.customer.id}`)}
            >
              {contract.customer.name}
            </span>
          </div>
        </div>
        {!edit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
            <button style={btnDanger} onClick={deleteContract}>Delete</button>
          </div>
        )}
      </div>

      {/* Details Card */}
      <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 720, marginBottom: '1.5rem' }}>
        {edit ? (
          <>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Contract</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
              <Field label="Contract # *">
                <input style={inputStyle} value={ef.contractNumber} onChange={e => setEf(p => ({ ...p, contractNumber: e.target.value }))} />
              </Field>
              <Field label="Status *">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={ef.status} onChange={e => setEf(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Start Date *">
                <input style={inputStyle} type="date" value={ef.startDate} onChange={e => setEf(p => ({ ...p, startDate: e.target.value }))} />
              </Field>
              <Field label="End Date *">
                <input style={inputStyle} type="date" value={ef.endDate} onChange={e => setEf(p => ({ ...p, endDate: e.target.value }))} />
              </Field>
              <Field label="Total Committed Value ($)">
                <input style={inputStyle} type="number" step="0.01" min="0" value={ef.totalCommittedValue} onChange={e => setEf(p => ({ ...p, totalCommittedValue: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notes" full>
              <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={ef.notes} onChange={e => setEf(p => ({ ...p, notes: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={saveContract}>Save</button>
              <button style={btnSecondary} onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
            {([
              ['Contract #', contract.contractNumber],
              ['Customer', contract.customer.name],
              ['Status', contract.status.replace(/_/g, ' ')],
              ['Start Date', fmtDate(contract.startDate)],
              ['End Date', fmtDate(contract.endDate)],
              ['Committed Value', fmtCurrency(contract.totalCommittedValue)],
              ['Created By', contract.createdBy?.name ?? '\u2014'],
              ['Created', fmtDate(contract.createdAt)],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                <div style={{ color: c.textPrimary }}>{val}</div>
              </div>
            ))}
            {contract.notes && (
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${c.divider}` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: '0.875rem', color: c.textLabel, whiteSpace: 'pre-wrap' }}>{contract.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lines Section */}
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Contract Lines ({contract.lines?.length ?? 0})
          </div>
          <button style={btnSecondary} onClick={openAddLine}>+ Add Line</button>
        </div>

        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                {['Customer Item / Variant', 'Committed Qty', 'Unit Price', 'Valid From', 'Valid To', 'Notes', ''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!contract.lines || contract.lines.length === 0) && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.85rem' }}>No lines yet. Click "+ Add Line" to add one.</td></tr>
              )}
              {contract.lines?.map(line => (
                <tr
                  key={line.id}
                  style={{ borderBottom: `1px solid ${c.divider}`, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: c.textPrimary }}>
                    {line.customerItem
                      ? <span><span style={{ fontFamily: 'monospace', color: c.accent }}>{line.customerItem.code}</span> {line.customerItem.name}</span>
                      : line.variant
                        ? <span style={{ fontFamily: 'monospace', color: c.accent }}>{line.variant.sku}</span>
                        : '\u2014'
                    }
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: c.textLabel, textAlign: 'right' }}>
                    {Number(line.committedQty).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: c.textLabel, textAlign: 'right' }}>
                    {fmtCurrency(line.unitPrice)}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                    {fmtDate(line.validFrom)}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                    {fmtDate(line.validTo)}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: c.textLabel, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.notes ?? '\u2014'}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                    <button
                      onClick={(e) => deleteLine(line.id, e)}
                      title="Remove line"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '0.9rem', padding: '4px 6px', borderRadius: 4, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                      onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}
                    >
                      &#x2715;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Line Drawer */}
      <Drawer open={lineDrawerOpen} onClose={() => setLineDrawerOpen(false)} title="Add Contract Line" width={480}>
        {lineSaveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {lineSaveErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Customer Item" full>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={lineForm.customerItemId} onChange={setLine('customerItemId')}>
              <option value="">-- None --</option>
              {customerItems.map(ci => <option key={ci.id} value={ci.id}>{ci.code} - {ci.name}</option>)}
            </select>
          </Field>
          <Field label="Committed Qty *">
            <input style={inputStyle} type="number" min="1" step="1" value={lineForm.committedQty} onChange={setLine('committedQty')} />
          </Field>
          <Field label="Unit Price *">
            <input style={inputStyle} type="number" min="0" step="0.01" value={lineForm.unitPrice} onChange={setLine('unitPrice')} />
          </Field>
          <Field label="Valid From">
            <input style={inputStyle} type="date" value={lineForm.validFrom} onChange={setLine('validFrom')} />
          </Field>
          <Field label="Valid To">
            <input style={inputStyle} type="date" value={lineForm.validTo} onChange={setLine('validTo')} />
          </Field>
        </div>

        <Field label="Notes" full>
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={lineForm.notes} onChange={setLine('notes')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={saveLine} disabled={lineSaving}>{lineSaving ? 'Adding...' : 'Add Line'}</button>
          <button style={btnSecondary} onClick={() => setLineDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
