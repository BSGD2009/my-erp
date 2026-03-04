import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

interface QuoteRow {
  id: number;
  quoteNumber: string;
  status: string;
  createdAt: string;
  validUntil: string | null;
  lineCount: number;
  totalValue: number;
  customer: { id: number; name: string; code: string };
  salesRep: { id: number; name: string } | null;
}

interface UserOption { id: number; name: string }
interface CustomerOption { id: number; name: string; code: string }

const STATUSES = ['', 'DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'];

function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.55rem',
      borderRadius: 20, letterSpacing: '0.03em',
      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function fmtCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuotesListPage() {
  const nav = useNavigate();
  const [rows, setRows]         = useState<QuoteRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [repFilter, setRepFilter]       = useState('');
  const [custFilter, setCustFilter]     = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const [users, setUsers]       = useState<UserOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/protected/quotes?page=${page}&limit=30`;
      if (search)       url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (repFilter)    url += `&salesRepId=${repFilter}`;
      if (custFilter)   url += `&customerId=${custFilter}`;
      if (dateFrom)     url += `&dateFrom=${dateFrom}`;
      if (dateTo)       url += `&dateTo=${dateTo}`;
      const res = await api.get<{ data: QuoteRow[]; total: number }>(url);
      setRows(res.data); setTotal(res.total);
    } catch { /* */ }
    setLoading(false);
  }, [page, search, statusFilter, repFilter, custFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<UserOption[]>('/protected/quotes/lookup/users').then(setUsers).catch(() => {});
    api.get<{ data: CustomerOption[] }>('/protected/customers?limit=500&active=true').then(r => setCustomers(r.data ?? [])).catch(() => {});
  }, []);

  function clearFilters() {
    setSearch(''); setStatusFilter(''); setRepFilter(''); setCustFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  }

  const hasFilters = search || statusFilter || repFilter || custFilter || dateFrom || dateTo;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Quotes</h1>
        <button onClick={() => nav('/quotes/new')} style={btnPrimary}>+ New Quote</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search quote # or customer..."
          style={{ ...inputStyle, width: 220 }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 160 }}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={repFilter} onChange={e => { setRepFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 160 }}>
          <option value="">All Reps</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={custFilter} onChange={e => { setCustFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 180 }}>
          <option value="">All Customers</option>
          {customers.map(cu => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 140 }} title="From date" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 140 }} title="To date" />
        {hasFilters && <button onClick={clearFilters} style={{ ...btnSecondary, fontSize: '0.78rem' }}>Clear</button>}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
              {['Quote #', 'Customer', 'Lines', 'Total Value', 'Status', 'Sales Rep', 'Created', 'Valid Until'].map(h =>
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: c.textMuted, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: c.textMuted }}>
                {hasFilters ? 'No quotes match your filters' : 'No quotes yet. Click + New Quote to create one.'}
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} onClick={() => nav(`/quotes/${r.id}`)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: c.accent }}>{r.quoteNumber}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.customer.name}</td>
                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{r.lineCount}</td>
                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{fmtCurrency(r.totalValue)}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.salesRep?.name ?? '—'}</td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.createdAt?.split('T')[0]}</td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.validUntil?.split('T')[0] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnSecondary}>Prev</button>
          <span style={{ color: c.textMuted, fontSize: '0.82rem', lineHeight: '2rem' }}>Page {page} of {Math.ceil(total / 30)}</span>
          <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)} style={btnSecondary}>Next</button>
        </div>
      )}
    </Layout>
  );
}
