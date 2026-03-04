import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BlanketContract {
  id: number;
  contractNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  totalCommittedValue: string | number | null;
  notes: string | null;
  customer: { id: number; code: string; name: string };
}

interface Customer {
  id: number;
  code: string;
  name: string;
}

const EMPTY_FORM = {
  contractNumber: '',
  customerId: '',
  startDate: '',
  endDate: '',
  totalCommittedValue: '',
  notes: '',
};

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

function Th({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: string; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600,
        color: active ? '#93c5fd' : c.textMuted, letterSpacing: '0.05em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
      }}
    >
      {label}{active ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''}
    </th>
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
  const colors = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: c.danger };
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: colors.color }}>
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
export function BlanketContractsListPage() {
  const navigate = useNavigate();

  const [rows, setRows]         = useState<BlanketContract[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [sortBy, setSortBy]     = useState('contractNumber');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookups
  const [customers, setCustomers] = useState<Customer[]>([]);

  const LIMIT = 50;

  // Load customers once
  useEffect(() => {
    api.get<{ data: Customer[] }>('/protected/customers?limit=500').then(r => setCustomers(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) p.set('search', search);
      const res = await api.get<{ data: BlanketContract[]; total: number }>(`/protected/blanket-contracts?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av = '', bv = '';
    if (sortBy === 'customer') {
      av = a.customer?.name ?? '';
      bv = b.customer?.name ?? '';
    } else if (sortBy === 'totalCommittedValue') {
      const na = parseFloat(String(a.totalCommittedValue ?? '0')) || 0;
      const nb = parseFloat(String(b.totalCommittedValue ?? '0')) || 0;
      return sortDir === 'asc' ? na - nb : nb - na;
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  // ── Drawer helpers ──
  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF(prev => ({ ...prev, [k]: e.target.value }));
  };

  async function save() {
    if (!f.contractNumber.trim()) { setSaveErr('Contract number is required'); return; }
    if (!f.customerId) { setSaveErr('Customer is required'); return; }
    if (!f.startDate) { setSaveErr('Start date is required'); return; }
    if (!f.endDate) { setSaveErr('End date is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        contractNumber:     f.contractNumber.trim(),
        customerId:         Number(f.customerId),
        startDate:          f.startDate,
        endDate:            f.endDate,
        totalCommittedValue: f.totalCommittedValue ? parseFloat(f.totalCommittedValue) : null,
        notes:              f.notes.trim() || null,
      };
      await api.post('/protected/blanket-contracts', body);
      setDrawerOpen(false);
      flash('Blanket contract created.', 'success');
      load();
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Blanket Contracts</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>{total} on record</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Contract</button>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search contract #, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button style={btnSecondary} onClick={() => setSearch('')}>Clear</button>}
      </div>

      {/* Error */}
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
              <Th col="contractNumber"     label="Contract #"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="customer"           label="Customer"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
              <Th col="startDate"          label="Start Date"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="endDate"            label="End Date"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="totalCommittedValue" label="Committed Value" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search ? 'No contracts match your search.' : 'No blanket contracts yet.'}
              </td></tr>
            )}
            {!loading && sorted.map(r => (
              <tr
                key={r.id}
                onClick={() => navigate(`/admin/blanket-contracts/${r.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'monospace', color: c.accent }}>{r.contractNumber}</div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.customer?.name ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StatusBadge status={r.status} />
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {fmtDate(r.startDate)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {fmtDate(r.endDate)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {fmtCurrency(r.totalCommittedValue)}
                </td>
              </tr>
            ))}
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

      {/* New Contract Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Blanket Contract" width={500}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          <Field label="Contract # *">
            <input style={inputStyle} value={f.contractNumber} onChange={set('contractNumber')} placeholder="BC-2026-001" />
          </Field>
          <Field label="Customer *">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.customerId} onChange={set('customerId')}>
              <option value="">-- Select --</option>
              {customers.map(cust => <option key={cust.id} value={cust.id}>{cust.name}</option>)}
            </select>
          </Field>
          <Field label="Start Date *">
            <input style={inputStyle} type="date" value={f.startDate} onChange={set('startDate')} />
          </Field>
          <Field label="End Date *">
            <input style={inputStyle} type="date" value={f.endDate} onChange={set('endDate')} />
          </Field>
          <Field label="Committed Value ($)">
            <input style={inputStyle} type="number" step="0.01" min="0" value={f.totalCommittedValue} onChange={set('totalCommittedValue')} />
          </Field>
        </div>

        <Field label="Notes" full>
          <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Contract'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
