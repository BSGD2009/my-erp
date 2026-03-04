import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, cardStyle } from '../theme';

interface BoardPrice {
  id: number;
  supplierId: number;
  deliveryLocationId: number | null;
  boardGradeId: number;
  flute: string | null;
  tier1MaxMsf: string; tier1Price: string;
  tier2MaxMsf: string; tier2Price: string;
  tier3MaxMsf: string; tier3Price: string;
  tier4Price: string;
  effectiveDate: string;
  expiryDate: string | null;
  isActive: boolean;
  supplier: { id: number; name: string; code: string };
  deliveryLocation: { id: number; name: string } | null;
  boardGrade: { id: number; gradeCode: string; gradeName: string };
}

interface Supplier  { id: number; name: string; code: string }
interface Location  { id: number; name: string }
interface Grade     { id: number; gradeCode: string; gradeName: string }

const FLUTES = ['', 'A', 'B', 'C', 'E', 'F', 'BC', 'EB'];

export function BoardPricesPage() {
  const [rows, setRows]         = useState<BoardPrice[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [suppFilter, setSuppFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [locations, setLocations]   = useState<Location[]>([]);
  const [grades, setGrades]         = useState<Grade[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState<Record<string, any>>({});
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/protected/board-prices?page=${page}&limit=50&active=true`;
      if (suppFilter)  url += `&supplierId=${suppFilter}`;
      if (gradeFilter) url += `&boardGradeId=${gradeFilter}`;
      const res = await api.get<{ data: BoardPrice[]; total: number }>(url);
      setRows(res.data); setTotal(res.total);
    } catch { /* */ }
    setLoading(false);
  }, [page, suppFilter, gradeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<Supplier[]>('/protected/suppliers?limit=200').then(r => setSuppliers(Array.isArray(r) ? r : (r as any).data ?? []));
    api.get<Location[]>('/protected/locations?limit=200').then(r => setLocations(Array.isArray(r) ? r : (r as any).data ?? []));
    api.get<{ data: Grade[] }>('/protected/board-grades?limit=200').then(r => setGrades(r.data ?? []));
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ supplierId: '', boardGradeId: '', deliveryLocationId: '', flute: '',
      tier1MaxMsf: '9.9', tier1Price: '', tier2MaxMsf: '20.9', tier2Price: '',
      tier3MaxMsf: '49.9', tier3Price: '', tier4Price: '', effectiveDate: new Date().toISOString().split('T')[0], expiryDate: '' });
    setError(''); setDrawerOpen(true);
  }

  function openEdit(row: BoardPrice) {
    setEditId(row.id);
    setForm({
      supplierId: row.supplierId, boardGradeId: row.boardGradeId,
      deliveryLocationId: row.deliveryLocationId ?? '', flute: row.flute ?? '',
      tier1MaxMsf: row.tier1MaxMsf, tier1Price: row.tier1Price,
      tier2MaxMsf: row.tier2MaxMsf, tier2Price: row.tier2Price,
      tier3MaxMsf: row.tier3MaxMsf, tier3Price: row.tier3Price,
      tier4Price: row.tier4Price,
      effectiveDate: row.effectiveDate?.split('T')[0] ?? '',
      expiryDate: row.expiryDate?.split('T')[0] ?? '',
    });
    setError(''); setDrawerOpen(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const body = {
        supplierId:         parseInt(form.supplierId, 10),
        boardGradeId:       parseInt(form.boardGradeId, 10),
        deliveryLocationId: form.deliveryLocationId ? parseInt(form.deliveryLocationId, 10) : null,
        flute:              form.flute || null,
        tier1MaxMsf: parseFloat(form.tier1MaxMsf), tier1Price: parseFloat(form.tier1Price),
        tier2MaxMsf: parseFloat(form.tier2MaxMsf), tier2Price: parseFloat(form.tier2Price),
        tier3MaxMsf: parseFloat(form.tier3MaxMsf), tier3Price: parseFloat(form.tier3Price),
        tier4Price:  parseFloat(form.tier4Price),
        effectiveDate: form.effectiveDate,
        expiryDate:    form.expiryDate || null,
      };
      if (editId) await api.put(`/protected/board-prices/${editId}`, body);
      else        await api.post('/protected/board-prices', body);
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
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Board Prices</h1>
        <button onClick={openCreate} style={btnPrimary}>+ New Price</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={suppFilter} onChange={e => { setSuppFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 200 }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 180 }}>
          <option value="">All Grades</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.gradeCode} — {g.gradeName}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
              {['Supplier', 'Grade', 'Flute', 'Location', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Effective', ''].map(h =>
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: c.textMuted, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: c.textMuted }}>Loading...</td></tr> :
             rows.length === 0 ? <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: c.textMuted }}>No board prices found</td></tr> :
             rows.map(r => (
              <tr key={r.id} onClick={() => openEdit(r)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.supplier.name}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.boardGrade.gradeCode}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.flute ?? 'All'}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>{r.deliveryLocation?.name ?? 'All'}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>≤{r.tier1MaxMsf} → ${r.tier1Price}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>≤{r.tier2MaxMsf} → ${r.tier2Price}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>≤{r.tier3MaxMsf} → ${r.tier3Price}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>${r.tier4Price}</td>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? 'Edit Board Price' : 'New Board Price'} width={480}>
        {error && <div style={{ background: c.dangerMuted, border: `1px solid ${c.danger}`, borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: 12, color: c.danger, fontSize: '0.82rem' }}>{error}</div>}
        <Field label="Supplier *">
          <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} style={inputStyle}>
            <option value="">Select supplier...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Board Grade *">
          <select value={form.boardGradeId} onChange={e => setForm(f => ({ ...f, boardGradeId: e.target.value }))} style={inputStyle}>
            <option value="">Select grade...</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.gradeCode} — {g.gradeName}</option>)}
          </select>
        </Field>
        <Field label="Delivery Location (optional)">
          <select value={form.deliveryLocationId} onChange={e => setForm(f => ({ ...f, deliveryLocationId: e.target.value }))} style={inputStyle}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Flute (optional)">
          <select value={form.flute} onChange={e => setForm(f => ({ ...f, flute: e.target.value }))} style={inputStyle}>
            {FLUTES.map(fl => <option key={fl} value={fl}>{fl || 'All flutes'}</option>)}
          </select>
        </Field>

        <div style={{ borderTop: `1px solid ${c.divider}`, margin: '12px 0', paddingTop: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.textLabel, marginBottom: 8, textTransform: 'uppercase' }}>Pricing Tiers (per MSF)</div>
          {[
            { label: 'Tier 1 Max MSF', key: 'tier1MaxMsf', priceKey: 'tier1Price' },
            { label: 'Tier 2 Max MSF', key: 'tier2MaxMsf', priceKey: 'tier2Price' },
            { label: 'Tier 3 Max MSF', key: 'tier3MaxMsf', priceKey: 'tier3Price' },
          ].map(tier => (
            <div key={tier.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.65rem' }}>≤ MSF</label>
                <input value={form[tier.key] ?? ''} onChange={e => setForm(f => ({ ...f, [tier.key]: e.target.value }))} style={inputStyle} type="number" step="0.1" />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.65rem' }}>$/MSF</label>
                <input value={form[tier.priceKey] ?? ''} onChange={e => setForm(f => ({ ...f, [tier.priceKey]: e.target.value }))} style={inputStyle} type="number" step="0.01" />
              </div>
            </div>
          ))}
          <Field label="Tier 4 $/MSF (over tier 3)">
            <input value={form.tier4Price ?? ''} onChange={e => setForm(f => ({ ...f, tier4Price: e.target.value }))} style={inputStyle} type="number" step="0.01" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Effective Date *">
            <input type="date" value={form.effectiveDate ?? ''} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Expiry Date">
            <input type="date" value={form.expiryDate ?? ''} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
          <button onClick={() => setDrawerOpen(false)} style={btnSecondary}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}
