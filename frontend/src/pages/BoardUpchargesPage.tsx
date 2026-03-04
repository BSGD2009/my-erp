import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface BoardUpcharge {
  id: number;
  supplierId: number;
  upchargeType: string;
  chargeType: string;
  amount: string;
  condition: string | null;
  minMsf: string | null;
  effectiveDate: string;
  isActive: boolean;
  supplier: { id: number; name: string; code: string };
}

interface Supplier { id: number; name: string; code: string }

const UPCHARGE_TYPES = [
  'E_FLUTE', 'BE_FLUTE', 'WHITE_TOP_31', 'WHITE_TOP_42', 'WHITE_TOP_69',
  'KRAFT_MCH', 'M33', 'M36', 'NARROW_WIDTH', 'SHORT_CUT_25', 'SHORT_CUT_29',
  'TELE_TWIN_SCORING', 'FLAT_SCORES', 'REVERSE_SCORES', 'WRA_SW', 'WRA_DW',
  'STOP_CHARGE', 'OTHER',
];

const CHARGE_TYPES = ['PER_MSF', 'FLAT_SETUP'];

function formatUpchargeType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function BoardUpchargesPage() {
  const [rows, setRows]       = useState<BoardUpcharge[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [suppFilter, setSuppFilter] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState<Record<string, any>>({});
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/protected/board-upcharges?page=${page}&limit=50&active=true`;
      if (suppFilter) url += `&supplierId=${suppFilter}`;
      const res = await api.get<{ data: BoardUpcharge[]; total: number }>(url);
      setRows(res.data); setTotal(res.total);
    } catch { /* */ }
    setLoading(false);
  }, [page, suppFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<Supplier[]>('/protected/suppliers?limit=200').then(r => setSuppliers(Array.isArray(r) ? r : (r as any).data ?? []));
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ supplierId: '', upchargeType: UPCHARGE_TYPES[0], chargeType: 'PER_MSF', amount: '', condition: '', minMsf: '', effectiveDate: new Date().toISOString().split('T')[0] });
    setError(''); setDrawerOpen(true);
  }

  function openEdit(row: BoardUpcharge) {
    setEditId(row.id);
    setForm({
      supplierId: row.supplierId, upchargeType: row.upchargeType, chargeType: row.chargeType,
      amount: row.amount, condition: row.condition ?? '', minMsf: row.minMsf ?? '',
      effectiveDate: row.effectiveDate?.split('T')[0] ?? '',
    });
    setError(''); setDrawerOpen(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const body = {
        supplierId:    parseInt(form.supplierId, 10),
        upchargeType:  form.upchargeType,
        chargeType:    form.chargeType,
        amount:        parseFloat(form.amount),
        condition:     form.condition || null,
        minMsf:        form.minMsf ? parseFloat(form.minMsf) : null,
        effectiveDate: form.effectiveDate,
      };
      if (editId) await api.put(`/protected/board-upcharges/${editId}`, body);
      else        await api.post('/protected/board-upcharges', body);
      setDrawerOpen(false); load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Board Upcharges</h1>
        <button onClick={openCreate} style={btnPrimary}>+ New Upcharge</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={suppFilter} onChange={e => { setSuppFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 200 }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div style={{ ...cardStyle, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
              {['Supplier', 'Upcharge Type', 'Charge Type', 'Amount', 'Min MSF', 'Condition', 'Effective', ''].map(h =>
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: c.textMuted, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: c.textMuted }}>Loading...</td></tr> :
             rows.length === 0 ? <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: c.textMuted }}>No upcharges found</td></tr> :
             rows.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.supplier.name}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{formatUpchargeType(r.upchargeType)}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.chargeType === 'PER_MSF' ? 'Per MSF' : 'Flat/Setup'}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>${r.amount}</td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.minMsf ?? '—'}</td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.condition ?? '—'}</td>
                <td style={{ padding: '0.55rem 0.75rem', color: c.textMuted }}>{r.effectiveDate?.split('T')[0]}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(r); }} style={{ ...btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnSecondary}>Prev</button>
          <span style={{ color: c.textMuted, fontSize: '0.82rem', lineHeight: '2rem' }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} style={btnSecondary}>Next</button>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Upcharge' : 'New Upcharge'} width={440}>
        {error && <div style={{ background: c.dangerMuted, border: `1px solid ${c.danger}`, borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: 12, color: c.danger, fontSize: '0.82rem' }}>{error}</div>}
        <Field label="Supplier *">
          <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} style={inputStyle}>
            <option value="">Select supplier...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Upcharge Type *">
          <select value={form.upchargeType} onChange={e => setForm(f => ({ ...f, upchargeType: e.target.value }))} style={inputStyle}>
            {UPCHARGE_TYPES.map(t => <option key={t} value={t}>{formatUpchargeType(t)}</option>)}
          </select>
        </Field>
        <Field label="Charge Type *">
          <select value={form.chargeType} onChange={e => setForm(f => ({ ...f, chargeType: e.target.value }))} style={inputStyle}>
            {CHARGE_TYPES.map(t => <option key={t} value={t}>{t === 'PER_MSF' ? 'Per MSF' : 'Flat / Setup'}</option>)}
          </select>
        </Field>
        <Field label="Amount ($) *">
          <input value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} type="number" step="0.01" />
        </Field>
        <Field label="Min MSF (optional)">
          <input value={form.minMsf ?? ''} onChange={e => setForm(f => ({ ...f, minMsf: e.target.value }))} style={inputStyle} type="number" step="0.1" placeholder="Only applies above this MSF" />
        </Field>
        <Field label="Condition (optional)">
          <input value={form.condition ?? ''} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} style={inputStyle} placeholder="e.g. Only for 200# test" />
        </Field>
        <Field label="Effective Date *">
          <input type="date" value={form.effectiveDate ?? ''} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
          <button onClick={() => setDrawerOpen(false)} style={btnSecondary}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
