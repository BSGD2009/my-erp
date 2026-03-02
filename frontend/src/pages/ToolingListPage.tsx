import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { c, inputStyle, btnPrimary, btnSecondary, cardStyle, STATUS_COLORS } from '../theme';

const TYPES      = ['', 'DIE', 'PLATE', 'OTHER'];
const CONDITIONS = ['', 'NEW', 'GOOD', 'WORN', 'RETIRED'];

interface Tool {
  id: number; toolNumber: string; type: string; description?: string;
  condition: string; isActive: boolean;
  customer?: { id: number; code: string; name: string };
  location:  { id: number; name: string };
  _count:    { blankSpecs: number };
}

export function ToolingListPage() {
  const navigate = useNavigate();
  const [tools, setTools]         = useState<Tool[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [typeFilter, setType]     = useState('');
  const [condFilter, setCond]     = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (condFilter) params.set('condition', condFilter);
      const res = await api.get<{ data: Tool[]; total: number }>(`/protected/tooling?${params}`);
      setTools(res.data);
      setTotal(res.total);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [search, typeFilter, condFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter, condFilter]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Tooling</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            Dies, plates, and other tooling — {total} on record
          </p>
        </div>
        <button style={btnPrimary} onClick={() => navigate('/tooling/new')}>+ New Tool</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, maxWidth: 240 }} placeholder="Search tool # or description…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 140, cursor: 'pointer' }} value={typeFilter} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={{ ...inputStyle, maxWidth: 160, cursor: 'pointer' }} value={condFilter} onChange={e => setCond(e.target.value)}>
          <option value="">All conditions</option>
          {CONDITIONS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || typeFilter || condFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setType(''); setCond(''); }}>Clear</button>
        )}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              {['Tool #', 'Type', 'Description', 'Condition', 'Location', 'Owner', 'Products Using', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading…</td></tr>}
            {!loading && tools.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No tooling found.</td></tr>}
            {!loading && tools.map(t => {
              const cond = STATUS_COLORS[t.condition] ?? STATUS_COLORS.GOOD;
              return (
                <tr key={t.id}
                  onClick={() => navigate(`/tooling/${t.id}`)}
                  style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{t.toolNumber}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 4, background: t.type === 'DIE' ? 'rgba(59,130,246,0.12)' : t.type === 'PLATE' ? 'rgba(168,85,247,0.12)' : 'rgba(100,116,139,0.12)', color: t.type === 'DIE' ? '#60a5fa' : t.type === 'PLATE' ? '#c084fc' : '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{t.type}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: c.textLabel }}>{t.description ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: cond.bg, color: cond.text }}>{t.condition}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{t.location.name}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{t.customer ? t.customer.name : 'Plant'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>{t._count.blankSpecs > 0 ? t._count.blankSpecs : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: t.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: t.isActive ? '#22c55e' : '#64748b' }}>{t.isActive ? 'Active' : 'Retired'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </Layout>
  );
}
