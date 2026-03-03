import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PartyRole { id: number; roleType: string }
interface Party {
  id: number; partyCode: string; name: string; isActive: boolean;
  roles: PartyRole[];
  _count: { contacts: number };
}

const ROLE_TYPES = ['CUSTOMER', 'SUPPLIER', 'CARRIER', 'OTHER'];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  CUSTOMER: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  SUPPLIER: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  CARRIER:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  OTHER:    { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
};

const EMPTY_FORM = { name: '', partyCode: '' };

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

export function PartiesListPage() {
  const [rows, setRows]         = useState<Party[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [page, setPage]         = useState(1);
  const LIMIT = 50;

  // New party drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [f, setF]                   = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [toast, setToast]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Detail drawer
  const [detailParty, setDetailParty]     = useState<Party | null>(null);
  const [detailOpen, setDetailOpen]       = useState(false);
  const [editName, setEditName]           = useState('');
  const [editCode, setEditCode]           = useState('');
  const [editActive, setEditActive]       = useState(true);
  const [detailSaving, setDetailSaving]   = useState(false);
  const [newRole, setNewRole]             = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)     params.set('search', search);
      if (roleFilter) params.set('roleType', roleFilter);
      const res = await api.get<{ data: Party[]; total: number }>(`/protected/parties?${params}`);
      setRows(res.data); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, roleFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  function flash(text: string, type: 'success' | 'error') {
    setToast({ text, type });
    if (type === 'success') setTimeout(() => setToast(null), 4000);
  }

  // ── New party drawer ──

  function openNew() {
    setF(EMPTY_FORM);
    setSaveErr('');
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  async function save() {
    if (!f.name.trim()) { setSaveErr('Name is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body: Record<string, unknown> = {
        name:      f.name.trim(),
        partyCode: f.partyCode.trim() ? f.partyCode.trim().toUpperCase() : undefined,
      };
      await api.post('/protected/parties', body);
      setDrawerOpen(false);
      flash('Party created.', 'success');
      load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  // ── Detail drawer ──

  function openDetail(party: Party) {
    setDetailParty(party);
    setEditName(party.name);
    setEditCode(party.partyCode);
    setEditActive(party.isActive);
    setNewRole('');
    setDetailOpen(true);
  }

  async function saveDetail() {
    if (!detailParty) return;
    setDetailSaving(true);
    try {
      const body: Record<string, unknown> = {
        name:      editName.trim(),
        partyCode: editCode.trim() || undefined,
        isActive:  editActive,
      };
      await api.put(`/protected/parties/${detailParty.id}`, body);
      flash('Party updated.', 'success');
      setDetailOpen(false);
      load();
    } catch (e: any) { flash(e.message, 'error'); }
    finally { setDetailSaving(false); }
  }

  async function addRole() {
    if (!detailParty || !newRole) return;
    try {
      await api.post(`/protected/parties/${detailParty.id}/roles`, { roleType: newRole });
      flash('Role added.', 'success');
      // Reload detail
      const updated = await api.get<Party>(`/protected/parties/${detailParty.id}`);
      setDetailParty(updated);
      setNewRole('');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  async function removeRole(roleId: number) {
    if (!detailParty) return;
    if (!window.confirm('Remove this role?')) return;
    try {
      await api.delete(`/protected/parties/${detailParty.id}/roles/${roleId}`);
      flash('Role removed.', 'success');
      const updated = await api.get<Party>(`/protected/parties/${detailParty.id}`);
      setDetailParty(updated);
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Parties</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>
            Organizations and business entities &mdash; {total} on record
          </p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ New Party</button>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.text} type={toast.type} />}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, maxWidth: 260 }} placeholder="Search name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth: 160, cursor: 'pointer' }} value={roleFilter} onChange={e => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || roleFilter) && (
          <button style={btnSecondary} onClick={() => { setSearch(''); setRole(''); }}>Clear</button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              {['Code', 'Name', 'Roles', 'Contacts', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>No parties found.</td></tr>}
            {!loading && rows.map(r => (
              <tr
                key={r.id}
                onClick={() => openDetail(r)}
                style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.textLabel }}>{r.partyCode}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{r.name}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {r.roles.length === 0 && <span style={{ fontSize: '0.82rem', color: c.textMuted }}>&mdash;</span>}
                    {r.roles.map(role => {
                      const rc = ROLE_COLORS[role.roleType] ?? ROLE_COLORS.OTHER;
                      return (
                        <span key={role.id} style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: rc.bg, color: rc.color }}>{role.roleType}</span>
                      );
                    })}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel, textAlign: 'center' }}>
                  {r._count.contacts > 0 ? r._count.contacts : '\u2014'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: r.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: r.isActive ? '#22c55e' : '#64748b' }}>{r.isActive ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.25rem' }}>
          <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
          <span style={{ fontSize: '0.82rem', color: c.textLabel }}>Page {page} of {pages}</span>
          <button style={btnSecondary} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
        </div>
      )}

      {/* ── New Party Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Party" width={440}>
        {saveErr && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>
            {saveErr}
          </div>
        )}

        <Field label="Name *">
          <input style={inputStyle} value={f.name} onChange={set('name')} placeholder="Organization name" />
        </Field>
        <Field label="Party Code">
          <input style={inputStyle} value={f.partyCode} onChange={set('partyCode')} placeholder="Auto-generated if blank" />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Creating...' : 'Create Party'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>

      {/* ── Detail Drawer ── */}
      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title={detailParty ? detailParty.name : 'Party'} width={500}>
        {detailParty && (
          <>
            {/* Basic info */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
              Basic Info
            </div>
            <Field label="Name">
              <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
            </Field>
            <Field label="Party Code">
              <input style={inputStyle} value={editCode} onChange={e => setEditCode(e.target.value)} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
              <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} /> Active
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
              <button style={btnPrimary} onClick={saveDetail} disabled={detailSaving}>{detailSaving ? 'Saving...' : 'Save'}</button>
            </div>

            {/* Roles */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${c.divider}` }}>
              Roles
            </div>
            {detailParty.roles.length === 0 && (
              <div style={{ fontSize: '0.85rem', color: c.textMuted, marginBottom: '0.85rem' }}>No roles assigned.</div>
            )}
            {detailParty.roles.map(role => {
              const rc = ROLE_COLORS[role.roleType] ?? ROLE_COLORS.OTHER;
              return (
                <div key={role.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: `1px solid ${c.divider}` }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 4, background: rc.bg, color: rc.color }}>{role.roleType}</span>
                  <button
                    onClick={() => removeRole(role.id)}
                    title="Remove role"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: '0.9rem', padding: '2px 6px', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                    onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}
                  >
                    &#x2715;
                  </button>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: '0.85rem' }}>
              <select style={{ ...inputStyle, maxWidth: 160, cursor: 'pointer' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="">-- Add role --</option>
                {ROLE_TYPES.filter(rt => !detailParty.roles.some(r => r.roleType === rt)).map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
              <button style={btnSecondary} onClick={addRole} disabled={!newRole}>Add</button>
            </div>
          </>
        )}
      </Drawer>
    </Layout>
  );
}
