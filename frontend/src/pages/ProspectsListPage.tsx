import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Prospect {
  id: number;
  code: string;
  name: string;
  city?: string;
  state?: string;
  acquisitionStatus?: string;
  leadSource?: string;
  estimatedAnnualSpend?: string | number;
  defaultSalesRep?: { id: number; name: string };
  isActive: boolean;
}

const PIPELINE_STATUSES = ['PROSPECT', 'QUOTED', 'NEGOTIATING', 'ONBOARDING'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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
  const colors = STATUS_COLORS[status] ?? { bg: 'rgba(100,116,139,0.12)', text: '#64748b', border: 'rgba(100,116,139,0.2)' };
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function ProspectsListPage() {
  const navigate = useNavigate();

  const [rows, setRows]         = useState<Prospect[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [sortBy, setSortBy]     = useState('name');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast]       = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) {
        p.set('acquisitionStatus', statusFilter);
      } else {
        p.set('acquisitionStatus', PIPELINE_STATUSES.join(','));
      }
      if (search) p.set('search', search);
      const res = await api.get<{ data: Prospect[]; total: number }>(`/protected/customers?${p}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  function onSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av = '', bv = '';
    if (sortBy === 'cityState') {
      av = `${a.city ?? ''} ${a.state ?? ''}`.trim();
      bv = `${b.city ?? ''} ${b.state ?? ''}`.trim();
    } else if (sortBy === 'salesRep') {
      av = a.defaultSalesRep?.name ?? '';
      bv = b.defaultSalesRep?.name ?? '';
    } else if (sortBy === 'estimatedAnnualSpend') {
      const na = parseFloat(String(a.estimatedAnnualSpend ?? '0')) || 0;
      const nb = parseFloat(String(b.estimatedAnnualSpend ?? '0')) || 0;
      return sortDir === 'asc' ? na - nb : nb - na;
    } else {
      av = String((a as any)[sortBy] ?? '');
      bv = String((b as any)[sortBy] ?? '');
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function flash(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 4000);
  }

  // suppress unused lint — flash kept for future use
  void flash;

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  function fmtCurrency(val: string | number | undefined): string {
    if (val == null) return '\u2014';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(n)) return '\u2014';
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Prospects Pipeline</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Customers in acquisition pipeline &mdash; {total} total</p>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search name, code, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, maxWidth: 200, cursor: 'pointer' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Pipeline Statuses</option>
          {PIPELINE_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {(search || statusFilter) && <button style={btnSecondary} onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear</button>}
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
              <Th col="name"                label="Name"              sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="cityState"           label="City / State"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pipeline Status</th>
              <Th col="leadSource"          label="Lead Source"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="estimatedAnnualSpend" label="Est. Annual Spend" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <Th col="salesRep"            label="Sales Rep"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
                {search || statusFilter ? 'No prospects match your filters.' : 'No prospects in the pipeline.'}
              </td></tr>
            )}
            {!loading && sorted.map(r => (
              <tr
                key={r.id}
                onClick={() => navigate(`/customers/${r.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: c.textPrimary }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: c.accent, marginTop: 1 }}>{r.code}</div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.city || r.state ? `${r.city ?? ''}${r.city && r.state ? ', ' : ''}${r.state ?? ''}` : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {r.acquisitionStatus ? <StatusBadge status={r.acquisitionStatus} /> : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.leadSource ?? '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {fmtCurrency(r.estimatedAnnualSpend)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>
                  {r.defaultSalesRep?.name ?? '\u2014'}
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
    </Layout>
  );
}
