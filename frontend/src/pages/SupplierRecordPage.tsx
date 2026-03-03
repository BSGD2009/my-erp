import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ── Types ────────────────────────────────────────────────────────────────────
interface PaymentTerm { id: number; termCode: string; termName: string; netDays: number }
interface Contact {
  id: number; name: string; title?: string; email?: string; phone?: string;
  contactType: string; isPrimary: boolean; invoiceDistribution: boolean; isActive: boolean;
}
interface Supplier {
  id: number; code: string; name: string; accountNumber?: string; taxId?: string;
  is1099Eligible: boolean; name1099?: string;
  street?: string; city?: string; state?: string; zip?: string; country?: string;
  paymentTermId?: number; creditLimit?: number; w9OnFile: boolean; isActive: boolean; notes?: string;
  paymentTerm?: PaymentTerm;
  partyId: number | null;
  party?: { contacts: Contact[] };
  contacts: Contact[];
  _count: { purchaseOrders: number };
}

const CONTACT_TYPES = ['MAIN', 'BUYER', 'SALES_REP', 'PURCHASING', 'AP', 'RECEIVING', 'SHIPPING', 'OTHER'];
const CONTACT_TYPE_LABEL: Record<string, string> = {
  MAIN: 'Main', BUYER: 'Buyer', SALES_REP: 'Sales Rep', PURCHASING: 'Purchasing',
  AP: 'A/P', RECEIVING: 'Receiving', SHIPPING: 'Shipping', OTHER: 'Other',
};

type Tab = 'details' | 'contacts' | 'materials' | 'pos' | 'ap' | 'activity';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'details',  label: 'Details' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'materials', label: 'Materials' },
  { key: 'pos',      label: 'Open POs' },
  { key: 'ap',       label: 'AP / Balance' },
  { key: 'activity', label: 'Activity Log' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ marginBottom: '0.85rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
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
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color }}>
      {msg}
    </div>
  );
}

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border?: string }) {
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: bg, color, border: border ? `1px solid ${border}` : undefined }}>
      {label}
    </span>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem' }}>{value || '\u2014'}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600,
  color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.875rem' };

// ── Component ────────────────────────────────────────────────────────────────
export function SupplierRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('details');
  const [msg, setMsg]           = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Details form
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({
    code: '', name: '', accountNumber: '', taxId: '', is1099Eligible: false, name1099: '',
    w9OnFile: false, paymentTermId: '', creditLimit: '',
    street: '', city: '', state: '', zip: '', country: 'US', notes: '', isActive: true,
  });
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Contact drawer
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editContact, setEditContact]   = useState<Contact | null>(null);
  const [cf, setCf] = useState({
    name: '', title: '', email: '', phone: '', contactType: 'MAIN', isPrimary: false, invoiceDistribution: false,
  });
  const [contactErr, setContactErr] = useState('');

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Load supplier ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.get<any>(`/protected/suppliers/${id}`);
      const s: Supplier = { ...raw, contacts: raw.party?.contacts ?? [] };
      setSupplier(s);
      setF({
        code: s.code, name: s.name, accountNumber: s.accountNumber ?? '', taxId: s.taxId ?? '',
        is1099Eligible: s.is1099Eligible, name1099: s.name1099 ?? '',
        w9OnFile: s.w9OnFile, paymentTermId: s.paymentTermId ? String(s.paymentTermId) : '',
        creditLimit: s.creditLimit != null ? String(s.creditLimit) : '',
        street: s.street ?? '', city: s.city ?? '', state: s.state ?? '', zip: s.zip ?? '',
        country: s.country ?? 'US', notes: s.notes ?? '', isActive: s.isActive,
      });
    } catch (e: any) {
      flash(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<PaymentTerm[]>('/protected/payment-terms').then(setPaymentTerms).catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  // ── Save supplier ──────────────────────────────────────────────────────────
  async function save() {
    if (!f.name.trim()) { flash('Name is required', 'error'); return; }
    try {
      const body: Record<string, unknown> = {
        code: f.code.trim().toUpperCase(), name: f.name.trim(),
        accountNumber: f.accountNumber || null,
        taxId: f.taxId || null,
        is1099Eligible: f.is1099Eligible,
        name1099: f.is1099Eligible && f.name1099 ? f.name1099.trim() : null,
        w9OnFile: f.w9OnFile,
        paymentTermId: f.paymentTermId ? parseInt(f.paymentTermId) : null,
        creditLimit: f.creditLimit ? parseFloat(f.creditLimit) : null,
        street: f.street || null, city: f.city || null, state: f.state || null,
        zip: f.zip || null, country: f.country || null,
        notes: f.notes || null, isActive: f.isActive,
      };
      await api.put(`/protected/suppliers/${supplier!.id}`, body);
      setEdit(false);
      flash('Supplier saved.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  // ── Contact CRUD ───────────────────────────────────────────────────────────
  function openNewContact() {
    setEditContact(null);
    setCf({ name: '', title: '', email: '', phone: '', contactType: 'MAIN', isPrimary: false, invoiceDistribution: false });
    setContactErr('');
    setDrawerOpen(true);
  }

  function openEditContact(ct: Contact) {
    setEditContact(ct);
    setCf({
      name: ct.name, title: ct.title ?? '', email: ct.email ?? '', phone: ct.phone ?? '',
      contactType: ct.contactType, isPrimary: ct.isPrimary, invoiceDistribution: ct.invoiceDistribution,
    });
    setContactErr('');
    setDrawerOpen(true);
  }

  async function saveContact() {
    if (!cf.name.trim()) { setContactErr('Name is required'); return; }
    setContactErr('');
    try {
      const body: Record<string, unknown> = {
        name: cf.name.trim(), title: cf.title || null, email: cf.email || null, phone: cf.phone || null,
        contactType: cf.contactType, isPrimary: cf.isPrimary, invoiceDistribution: cf.invoiceDistribution,
      };
      if (editContact) {
        await api.put(`/protected/suppliers/${supplier!.id}/contacts/${editContact.id}`, body);
        flash('Contact updated.');
      } else {
        await api.post(`/protected/suppliers/${supplier!.id}/contacts`, body);
        flash('Contact added.');
      }
      setDrawerOpen(false);
      load();
    } catch (e: any) { setContactErr(e.message); }
  }

  async function deleteContact(ct: Contact) {
    if (!confirm(`Remove contact "${ct.name}"?`)) return;
    try {
      await api.delete(`/protected/suppliers/${supplier!.id}/contacts/${ct.id}`);
      flash('Contact removed.');
      load();
    } catch (e: any) { flash(e.message, 'error'); }
  }

  const cSet = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCf(p => ({ ...p, [k]: e.target.value }));

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading) return <Layout><div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!supplier) return (
    <Layout>
      <div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 0.5rem' }}>Supplier not found</h2>
        <button style={btnSecondary} onClick={() => navigate('/suppliers')}>Back to Suppliers</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: '0.75rem' }}>
        <span style={{ cursor: 'pointer', color: c.accent }} onClick={() => navigate('/suppliers')}>Suppliers</span>
        {' \u203A '}
        <span style={{ color: c.textLabel }}>{supplier.name}</span>
      </div>

      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{supplier.name}</h1>
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>{supplier.code}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {supplier.is1099Eligible && <Badge label="1099" bg="rgba(245,158,11,0.12)" color="#f59e0b" border="rgba(245,158,11,0.25)" />}
            {supplier.w9OnFile && <Badge label="W9 On File" bg="rgba(34,197,94,0.12)" color="#22c55e" border="rgba(34,197,94,0.25)" />}
            <Badge
              label={supplier.isActive ? 'Active' : 'Inactive'}
              bg={supplier.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)'}
              color={supplier.isActive ? '#22c55e' : '#64748b'}
            />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${c.divider}`, marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${c.accent}` : '2px solid transparent',
            padding: '0.65rem 1.1rem', fontSize: '0.82rem', fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? c.textPrimary : c.textMuted, cursor: 'pointer', transition: 'color 0.15s',
          }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = c.textLabel; }}
            onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = c.textMuted; }}>
            {t.label}{t.key === 'contacts' ? ` (${supplier.contacts.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && (
        <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 720 }}>
          {edit ? (
            <>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Edit Supplier</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                <Field label="Name *"><input style={inputStyle} value={f.name} onChange={set('name')} /></Field>
                <Field label="Code"><input style={inputStyle} value={f.code} onChange={set('code')} /></Field>
                <Field label="Account Number"><input style={inputStyle} value={f.accountNumber} onChange={set('accountNumber')} /></Field>
                <Field label="Tax ID"><input style={inputStyle} value={f.taxId} onChange={set('taxId')} /></Field>
                <Field label="Payment Terms">
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={f.paymentTermId} onChange={set('paymentTermId')}>
                    <option value="">-- None --</option>
                    {paymentTerms.map(pt => <option key={pt.id} value={pt.id}>{pt.termName} ({pt.netDays}d)</option>)}
                  </select>
                </Field>
                <Field label="Credit Limit ($)"><input style={inputStyle} type="number" step="0.01" value={f.creditLimit} onChange={set('creditLimit')} /></Field>
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.is1099Eligible} onChange={e => setF(p => ({ ...p, is1099Eligible: e.target.checked }))} /> 1099 Eligible
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.w9OnFile} onChange={e => setF(p => ({ ...p, w9OnFile: e.target.checked }))} /> W9 On File
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.isActive} onChange={e => setF(p => ({ ...p, isActive: e.target.checked }))} /> Active
                </label>
              </div>
              {f.is1099Eligible && (
                <Field label="1099 Name"><input style={inputStyle} value={f.name1099} onChange={set('name1099')} placeholder="Legal name for 1099" /></Field>
              )}

              <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Address</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                  <Field label="Street" full><input style={inputStyle} value={f.street} onChange={set('street')} /></Field>
                  <Field label="City"><input style={inputStyle} value={f.city} onChange={set('city')} /></Field>
                  <Field label="State"><input style={inputStyle} value={f.state} onChange={set('state')} /></Field>
                  <Field label="Zip"><input style={inputStyle} value={f.zip} onChange={set('zip')} /></Field>
                  <Field label="Country"><input style={inputStyle} value={f.country} onChange={set('country')} /></Field>
                </div>
              </div>

              <Field label="Notes" full>
                <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
              </Field>

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnPrimary} onClick={save}>Save</button>
                <button style={btnSecondary} onClick={() => { setEdit(false); load(); }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button style={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
                <ReadOnlyField label="Name" value={supplier.name} />
                <ReadOnlyField label="Code" value={supplier.code} />
                <ReadOnlyField label="Account Number" value={supplier.accountNumber ?? ''} />
                <ReadOnlyField label="Tax ID" value={supplier.taxId ?? ''} />
                <ReadOnlyField label="1099 Eligible" value={supplier.is1099Eligible ? 'Yes' : 'No'} />
                {supplier.is1099Eligible && <ReadOnlyField label="1099 Name" value={supplier.name1099 ?? ''} />}
                <ReadOnlyField label="W9 On File" value={supplier.w9OnFile ? 'Yes' : 'No'} />
                <ReadOnlyField label="Payment Terms" value={supplier.paymentTerm ? `${supplier.paymentTerm.termName} (${supplier.paymentTerm.netDays} days)` : ''} />
                <ReadOnlyField label="Credit Limit" value={supplier.creditLimit != null ? `$${Number(supplier.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''} />
                <ReadOnlyField label="Status" value={supplier.isActive ? 'Active' : 'Inactive'} />
              </div>

              {(supplier.street || supplier.city || supplier.state || supplier.zip) && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Address</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem', fontSize: '0.875rem' }}>
                    <ReadOnlyField label="Street" value={supplier.street ?? ''} />
                    <ReadOnlyField label="City" value={supplier.city ?? ''} />
                    <ReadOnlyField label="State" value={supplier.state ?? ''} />
                    <ReadOnlyField label="Zip" value={supplier.zip ?? ''} />
                    <ReadOnlyField label="Country" value={supplier.country ?? ''} />
                  </div>
                </div>
              )}

              {supplier.notes && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${c.divider}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: c.textLabel, whiteSpace: 'pre-wrap' }}>{supplier.notes}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Contacts tab ── */}
      {tab === 'contacts' && (
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button style={btnPrimary} onClick={openNewContact}>+ Add Contact</button>
          </div>

          {supplier.contacts.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No contacts yet. Click "+ Add Contact" to add one.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    {['Name', 'Title', 'Type', 'Email', 'Phone', 'Primary', ''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplier.contacts.map(ct => (
                    <tr key={ct.id} onClick={() => openEditContact(ct)} style={{ borderBottom: `1px solid ${c.divider}`, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{ct.name}</td>
                      <td style={tdStyle}>{ct.title || '\u2014'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                          {CONTACT_TYPE_LABEL[ct.contactType] ?? ct.contactType}
                        </span>
                      </td>
                      <td style={tdStyle}>{ct.email || '\u2014'}</td>
                      <td style={tdStyle}>{ct.phone || '\u2014'}</td>
                      <td style={tdStyle}>
                        {ct.isPrimary && <Badge label="Primary" bg="rgba(34,197,94,0.12)" color="#22c55e" />}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button style={{ ...btnDanger, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={e => { e.stopPropagation(); deleteContact(ct); }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contact drawer */}
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editContact ? 'Edit Contact' : 'Add Contact'} width={460}>
            {contactErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: c.danger }}>{contactErr}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem 1.25rem' }}>
              <Field label="Name *"><input style={inputStyle} value={cf.name} onChange={cSet('name')} placeholder="Jane Smith" /></Field>
              <Field label="Title"><input style={inputStyle} value={cf.title} onChange={cSet('title')} placeholder="Buyer" /></Field>
              <Field label="Email"><input style={inputStyle} type="email" value={cf.email} onChange={cSet('email')} /></Field>
              <Field label="Phone"><input style={inputStyle} value={cf.phone} onChange={cSet('phone')} /></Field>
              <Field label="Contact Type">
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={cf.contactType} onChange={cSet('contactType')}>
                  {CONTACT_TYPES.map(t => <option key={t} value={t}>{CONTACT_TYPE_LABEL[t] ?? t}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                <input type="checkbox" checked={cf.isPrimary} onChange={e => setCf(p => ({ ...p, isPrimary: e.target.checked }))} /> Primary Contact
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer' }}>
                <input type="checkbox" checked={cf.invoiceDistribution} onChange={e => setCf(p => ({ ...p, invoiceDistribution: e.target.checked }))} /> Invoice Distribution
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={saveContact}>{editContact ? 'Save Contact' : 'Add Contact'}</button>
              <button style={btnSecondary} onClick={() => setDrawerOpen(false)}>Cancel</button>
            </div>
          </Drawer>
        </div>
      )}

      {/* ── Materials tab (placeholder) ── */}
      {tab === 'materials' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', maxWidth: 720 }}>
          <div style={{ fontSize: '0.9rem', color: c.textMuted }}>
            Supplier materials and pricing will be managed here once Material-Supplier preferences are built.
          </div>
        </div>
      )}

      {/* ── Open POs tab (placeholder) ── */}
      {tab === 'pos' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', maxWidth: 720 }}>
          <div style={{ fontSize: '0.9rem', color: c.textMuted }}>
            Purchase orders will appear here once the Purchasing module is built (Session 9).
          </div>
        </div>
      )}

      {/* ── AP / Balance tab (placeholder) ── */}
      {tab === 'ap' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', maxWidth: 720 }}>
          <div style={{ fontSize: '0.9rem', color: c.textMuted }}>
            Accounts payable will appear here once the AP module is built.
          </div>
        </div>
      )}

      {/* ── Activity Log tab (placeholder) ── */}
      {tab === 'activity' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', maxWidth: 720 }}>
          <div style={{ fontSize: '0.9rem', color: c.textMuted }}>
            Activity log coming in a future update.
          </div>
        </div>
      )}
    </Layout>
  );
}
