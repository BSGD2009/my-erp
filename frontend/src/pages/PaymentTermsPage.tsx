import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

interface PaymentTerm {
  id: number; termCode: string; termName: string;
  discountPercent: string; discountDays: number; netDays: number;
  sortOrder: number; isActive: boolean;
}

const EMPTY = { termCode: '', termName: '', discountPercent: '0', discountDays: '0', netDays: '', sortOrder: '0' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>{label}</label>{children}</div>;
}

export function PaymentTermsPage() {
  const [rows, setRows]       = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [f, setF]                   = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<PaymentTerm[]>('/protected/payment-terms');
      setRows(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null); setF(EMPTY); setSaveErr(''); setDrawerOpen(true);
  }

  function openEdit(r: PaymentTerm) {
    setSaveErr(''); setEditId(r.id);
    setF({
      termCode: r.termCode,
      termName: r.termName,
      discountPercent: r.discountPercent != null ? String(r.discountPercent) : '0',
      discountDays: String(r.discountDays),
      netDays: String(r.netDays),
      sortOrder: String(r.sortOrder),
    });
    setDrawerOpen(true);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function save() {
    if (!f.termCode.trim()) { setSaveErr('Term Code is required'); return; }
    if (!f.termName.trim()) { setSaveErr('Term Name is required'); return; }
    if (!f.netDays || isNaN(parseInt(f.netDays))) { setSaveErr('Net Days is required'); return; }
    setSaving(true); setSaveErr('');
    try {
      const body = {
        termCode: f.termCode.trim().toUpperCase(),
        termName: f.termName.trim(),
        discountPercent: f.discountPercent ? parseFloat(f.discountPercent) : 0,
        discountDays: f.discountDays ? parseInt(f.discountDays) : 0,
        netDays: parseInt(f.netDays),
        sortOrder: f.sortOrder ? parseInt(f.sortOrder) : 0,
      };
      if (editId) await api.put(`/protected/payment-terms/${editId}`, body);
      else        await api.post('/protected/payment-terms', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteTerm(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Deactivate this payment term?')) return;
    try {
      await api.delete(`/protected/payment-terms/${id}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Payment Terms</h1>
          <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: '0.25rem 0 0' }}>Admin lookup — {rows.length} terms</p>
        </div>
        <button style={btnPrimary} onClick={openNew}>+ Add Term</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: c.danger, fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ ...cardStyle, overflow: 'hidden', maxWidth: 900 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
              <th style={thStyle}>Term Code</th>
              <th style={thStyle}>Term Name</th>
              <th style={thStyle}>Discount %</th>
              <th style={thStyle}>Discount Days</th>
              <th style={thStyle}>Net Days</th>
              <th style={thStyle}>Sort Order</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: c.textMuted }}>No payment terms found.</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{r.termCode}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{r.termName}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{Number(r.discountPercent) > 0 ? `${Number(r.discountPercent)}%` : '--'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textLabel }}>{r.discountDays > 0 ? r.discountDays : '--'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: 600 }}>{r.netDays}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: c.textMuted }}>{r.sortOrder}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button
                    style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={e => deleteTerm(r.id, e)}
                    title="Deactivate term"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Payment Term' : 'New Payment Term'}>
        {saveErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{saveErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
          <Field label="Term Code *"><input style={inputStyle} value={f.termCode} onChange={set('termCode')} placeholder="NET30" /></Field>
          <Field label="Term Name *"><input style={inputStyle} value={f.termName} onChange={set('termName')} placeholder="Net 30 Days" /></Field>
          <Field label="Discount %"><input style={inputStyle} type="number" step="0.01" value={f.discountPercent} onChange={set('discountPercent')} /></Field>
          <Field label="Discount Days"><input style={inputStyle} type="number" step="1" value={f.discountDays} onChange={set('discountDays')} /></Field>
          <Field label="Net Days *"><input style={inputStyle} type="number" step="1" value={f.netDays} onChange={set('netDays')} placeholder="30" /></Field>
          <Field label="Sort Order"><input style={inputStyle} type="number" step="1" value={f.sortOrder} onChange={set('sortOrder')} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Term'}</button>
          <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
