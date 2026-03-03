import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentTerm {
  id: number;
  termCode: string;
  termName: string;
  netDays: number;
}

interface Contact {
  id: number;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  isPrimary: boolean;
  invoiceDistribution: boolean;
  isActive: boolean;
}

interface ShipTo {
  id: number;
  name: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isDefault: boolean;
  deliveryInstructions: string | null;
  isActive: boolean;
}

interface Customer {
  id: number;
  code: string;
  name: string;
  accountNumber: string | null;
  taxId: string | null;
  resaleCertificateNumber: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  paymentTermId: number | null;
  creditLimit: string | null;
  creditHold: boolean;
  taxExempt: boolean;
  taxExemptId: string | null;
  defaultSalesRepId: number | null;
  notes: string | null;
  isActive: boolean;
  paymentTerm: PaymentTerm | null;
  defaultSalesRep: { id: number; name: string } | null;
  partyId: number | null;
  party?: { contacts: Contact[] };
  contacts: Contact[];
  shipToLocations: ShipTo[];
  _count: { orders: number; invoices: number };
}

const CONTACT_TYPES = [
  'MAIN',
  'SALES_REP',
  'PURCHASING',
  'SHIPPING',
  'ACCOUNTS_RECEIVABLE',
  'ACCOUNTS_PAYABLE',
  'GENERAL',
];

type TabKey = 'details' | 'contacts' | 'shipto' | 'orders' | 'ar' | 'price' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'details',  label: 'Details' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'shipto',   label: 'Ship-To' },
  { key: 'orders',   label: 'Open Orders' },
  { key: 'ar',       label: 'AR / Balance' },
  { key: 'price',    label: 'Price List' },
  { key: 'activity', label: 'Activity' },
];

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

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: active ? 600 : 400,
    background: active ? c.accentMuted : 'transparent',
    border: `1px solid ${active ? c.accentBorder : 'transparent'}`,
    borderRadius: 6, color: active ? '#93c5fd' : c.textLabel, cursor: 'pointer',
  };
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const col = type === 'success'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' }
    : { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' };
  return (
    <div style={{
      background: col.bg, borderWidth: 1, borderStyle: 'solid', borderColor: col.border,
      borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: col.color,
    }}>
      {msg}
    </div>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
      background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CustomerRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('details');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lookup data
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Details form state
  const [form, setForm] = useState({
    code: '', name: '', accountNumber: '', taxId: '', resaleCertificateNumber: '',
    paymentTermId: '', creditLimit: '', creditHold: false, taxExempt: false, taxExemptId: '',
    defaultSalesRepId: '',
    street: '', city: '', state: '', zip: '', country: '',
    billingStreet: '', billingCity: '', billingState: '', billingZip: '', billingCountry: '',
    notes: '', isActive: true,
  });

  // Contact drawer
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '', title: '', email: '', phone: '', contactType: 'MAIN', isPrimary: false, invoiceDistribution: false,
  });

  // Ship-To drawer
  const [shipToDrawerOpen, setShipToDrawerOpen] = useState(false);
  const [editingShipTo, setEditingShipTo] = useState<ShipTo | null>(null);
  const [shipToForm, setShipToForm] = useState({
    name: '', street: '', city: '', state: '', zip: '', country: 'US',
    contactName: '', contactPhone: '', contactEmail: '', isDefault: false, deliveryInstructions: '',
  });

  function flash(text: string, type: 'success' | 'error' = 'success') {
    setMsg({ text, type });
    if (type === 'success') setTimeout(() => setMsg(null), 3500);
  }

  // ── Load customer ──────────────────────────────────────────────────────────

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const raw = await api.get<any>(`/protected/customers/${id}`);
      // Flatten party.contacts to top-level contacts for backward compat
      const cust: Customer = {
        ...raw,
        contacts: raw.party?.contacts ?? [],
        shipToLocations: raw.shipToLocations ?? [],
      };
      setCustomer(cust);
      setForm({
        code: cust.code,
        name: cust.name,
        accountNumber: cust.accountNumber ?? '',
        taxId: cust.taxId ?? '',
        resaleCertificateNumber: cust.resaleCertificateNumber ?? '',
        paymentTermId: cust.paymentTermId != null ? String(cust.paymentTermId) : '',
        creditLimit: cust.creditLimit != null ? String(cust.creditLimit) : '',
        creditHold: cust.creditHold,
        taxExempt: cust.taxExempt,
        taxExemptId: cust.taxExemptId ?? '',
        defaultSalesRepId: cust.defaultSalesRepId != null ? String(cust.defaultSalesRepId) : '',
        street: cust.street ?? '',
        city: cust.city ?? '',
        state: cust.state ?? '',
        zip: cust.zip ?? '',
        country: cust.country ?? '',
        billingStreet: cust.billingStreet ?? '',
        billingCity: cust.billingCity ?? '',
        billingState: cust.billingState ?? '',
        billingZip: cust.billingZip ?? '',
        billingCountry: cust.billingCountry ?? '',
        notes: cust.notes ?? '',
        isActive: cust.isActive,
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);

  // Load lookup data
  useEffect(() => {
    api.get<PaymentTerm[]>('/protected/payment-terms').then(setPaymentTerms).catch(() => {});
  }, []);

  // ── Details save ───────────────────────────────────────────────────────────

  async function saveDetails() {
    if (!customer) return;
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        name: form.name,
        accountNumber: form.accountNumber || null,
        taxId: form.taxId || null,
        resaleCertificateNumber: form.resaleCertificateNumber || null,
        paymentTermId: form.paymentTermId ? parseInt(form.paymentTermId) : null,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
        creditHold: form.creditHold,
        taxExempt: form.taxExempt,
        taxExemptId: form.taxExemptId || null,
        defaultSalesRepId: form.defaultSalesRepId ? parseInt(form.defaultSalesRepId) : null,
        street: form.street || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        country: form.country || null,
        billingStreet: form.billingStreet || null,
        billingCity: form.billingCity || null,
        billingState: form.billingState || null,
        billingZip: form.billingZip || null,
        billingCountry: form.billingCountry || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      await api.put(`/protected/customers/${customer.id}`, body);
      flash('Customer saved.');
      await loadCustomer();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      flash(message, 'error');
    }
  }

  // ── Contact CRUD ───────────────────────────────────────────────────────────

  function openAddContact() {
    setEditingContact(null);
    setContactForm({ name: '', title: '', email: '', phone: '', contactType: 'MAIN', isPrimary: false, invoiceDistribution: false });
    setContactDrawerOpen(true);
  }

  function openEditContact(ct: Contact) {
    setEditingContact(ct);
    setContactForm({
      name: ct.name,
      title: ct.title ?? '',
      email: ct.email ?? '',
      phone: ct.phone ?? '',
      contactType: ct.contactType,
      isPrimary: ct.isPrimary,
      invoiceDistribution: ct.invoiceDistribution,
    });
    setContactDrawerOpen(true);
  }

  async function saveContact() {
    if (!customer) return;
    try {
      const body = {
        name: contactForm.name,
        title: contactForm.title || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        contactType: contactForm.contactType,
        isPrimary: contactForm.isPrimary,
        invoiceDistribution: contactForm.invoiceDistribution,
      };
      if (editingContact) {
        await api.put(`/protected/customers/${customer.id}/contacts/${editingContact.id}`, body);
        flash('Contact updated.');
      } else {
        await api.post(`/protected/customers/${customer.id}/contacts`, body);
        flash('Contact added.');
      }
      setContactDrawerOpen(false);
      await loadCustomer();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      flash(message, 'error');
    }
  }

  async function deactivateContact(ct: Contact) {
    if (!customer) return;
    if (!confirm(`Deactivate contact "${ct.name}"?`)) return;
    try {
      await api.delete(`/protected/customers/${customer.id}/contacts/${ct.id}`);
      flash('Contact deactivated.');
      await loadCustomer();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      flash(message, 'error');
    }
  }

  // ── Ship-To CRUD ───────────────────────────────────────────────────────────

  function openAddShipTo() {
    setEditingShipTo(null);
    setShipToForm({
      name: '', street: '', city: '', state: '', zip: '', country: 'US',
      contactName: '', contactPhone: '', contactEmail: '', isDefault: false, deliveryInstructions: '',
    });
    setShipToDrawerOpen(true);
  }

  function openEditShipTo(addr: ShipTo) {
    setEditingShipTo(addr);
    setShipToForm({
      name: addr.name,
      street: addr.street ?? '',
      city: addr.city ?? '',
      state: addr.state ?? '',
      zip: addr.zip ?? '',
      country: addr.country ?? 'US',
      contactName: addr.contactName ?? '',
      contactPhone: addr.contactPhone ?? '',
      contactEmail: addr.contactEmail ?? '',
      isDefault: addr.isDefault,
      deliveryInstructions: addr.deliveryInstructions ?? '',
    });
    setShipToDrawerOpen(true);
  }

  async function saveShipTo() {
    if (!customer) return;
    try {
      const body = {
        name: shipToForm.name,
        street: shipToForm.street || null,
        city: shipToForm.city || null,
        state: shipToForm.state || null,
        zip: shipToForm.zip || null,
        country: shipToForm.country || null,
        contactName: shipToForm.contactName || null,
        contactPhone: shipToForm.contactPhone || null,
        contactEmail: shipToForm.contactEmail || null,
        isDefault: shipToForm.isDefault,
        deliveryInstructions: shipToForm.deliveryInstructions || null,
      };
      if (editingShipTo) {
        await api.put(`/protected/customers/${customer.id}/ship-to/${editingShipTo.id}`, body);
        flash('Ship-to address updated.');
      } else {
        await api.post(`/protected/customers/${customer.id}/ship-to`, body);
        flash('Ship-to address added.');
      }
      setShipToDrawerOpen(false);
      await loadCustomer();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      flash(message, 'error');
    }
  }

  async function deactivateShipTo(addr: ShipTo) {
    if (!customer) return;
    if (!confirm(`Deactivate ship-to "${addr.name}"?`)) return;
    try {
      await api.delete(`/protected/customers/${customer.id}/ship-to/${addr.id}`);
      flash('Ship-to address deactivated.');
      await loadCustomer();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      flash(message, 'error');
    }
  }

  // ── Form change helpers ────────────────────────────────────────────────────

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const setContactField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setContactForm(prev => ({ ...prev, [key]: e.target.value }));

  const setShipToField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setShipToForm(prev => ({ ...prev, [key]: e.target.value }));

  // ── Loading / not-found states ─────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div style={{ color: c.textMuted, padding: '3rem', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  if (notFound || !customer) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', color: c.textMuted, marginBottom: '1rem' }}>Customer not found</div>
          <button style={btnSecondary} onClick={() => navigate('/customers')}>
            &larr; Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  // ── Table styles ───────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600,
    color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', fontSize: '0.875rem',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: c.accent, fontSize: '0.82rem', padding: 0, marginBottom: '0.75rem',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        &larr; Customers
      </button>

      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
          {customer.name}
        </h1>
        <span style={{
          display: 'inline-block', marginTop: 6, fontFamily: 'monospace', fontSize: '0.78rem',
          padding: '0.2rem 0.55rem', borderRadius: 4,
          background: c.accentMuted, color: '#93c5fd', border: `1px solid ${c.accentBorder}`,
        }}>
          {customer.code}
        </span>
        {!customer.isActive && (
          <span style={{
            display: 'inline-block', marginLeft: 8, fontSize: '0.7rem', fontWeight: 600,
            padding: '0.2rem 0.55rem', borderRadius: 4,
            background: c.dangerMuted, color: c.danger, border: '1px solid rgba(239,68,68,0.3)',
          }}>
            INACTIVE
          </span>
        )}
      </div>

      {/* Toast */}
      {msg && <Toast msg={msg.text} type={msg.type} />}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details Tab ─────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div style={{ ...cardStyle, padding: '1.5rem', maxWidth: 800 }}>
          {/* General Info */}
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: c.textPrimary }}>
            General Info
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <Field label="Code">
              <input style={inputStyle} value={form.code} onChange={setField('code')} />
            </Field>
            <Field label="Name *">
              <input style={inputStyle} value={form.name} onChange={setField('name')} />
            </Field>
            <Field label="Account Number">
              <input style={inputStyle} value={form.accountNumber} onChange={setField('accountNumber')} />
            </Field>
            <Field label="Tax ID">
              <input style={inputStyle} value={form.taxId} onChange={setField('taxId')} />
            </Field>
            <Field label="Resale Certificate #">
              <input style={inputStyle} value={form.resaleCertificateNumber} onChange={setField('resaleCertificateNumber')} />
            </Field>
            <Field label="Payment Terms">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.paymentTermId} onChange={setField('paymentTermId')}>
                <option value="">-- None --</option>
                {paymentTerms.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.termName} ({pt.netDays} days)</option>
                ))}
              </select>
            </Field>
            <Field label="Credit Limit">
              <input style={inputStyle} type="number" step="0.01" value={form.creditLimit} onChange={setField('creditLimit')} placeholder="0.00" />
            </Field>
            <Field label="Default Sales Rep ID">
              <input style={inputStyle} type="number" value={form.defaultSalesRepId} onChange={setField('defaultSalesRepId')} placeholder="User ID" />
            </Field>
            <Field label="Credit Hold">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={form.creditHold} onChange={e => setForm(p => ({ ...p, creditHold: e.target.checked }))} />
                Credit Hold
              </label>
            </Field>
            <Field label="Tax Exempt">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={form.taxExempt} onChange={e => setForm(p => ({ ...p, taxExempt: e.target.checked }))} />
                Tax Exempt
              </label>
            </Field>
            {form.taxExempt && (
              <Field label="Tax Exempt ID">
                <input style={inputStyle} value={form.taxExemptId} onChange={setField('taxExemptId')} />
              </Field>
            )}
          </div>

          <div style={{ height: 1, background: c.divider, margin: '1rem 0' }} />

          {/* Main Address */}
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: c.textPrimary }}>
            Main Address
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <Field label="Street" full>
              <input style={inputStyle} value={form.street} onChange={setField('street')} />
            </Field>
            <Field label="City">
              <input style={inputStyle} value={form.city} onChange={setField('city')} />
            </Field>
            <Field label="State">
              <input style={inputStyle} value={form.state} onChange={setField('state')} />
            </Field>
            <Field label="Zip">
              <input style={inputStyle} value={form.zip} onChange={setField('zip')} />
            </Field>
            <Field label="Country">
              <input style={inputStyle} value={form.country} onChange={setField('country')} />
            </Field>
          </div>

          <div style={{ height: 1, background: c.divider, margin: '1rem 0' }} />

          {/* Billing Address */}
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: c.textPrimary }}>
            Billing Address
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <Field label="Street" full>
              <input style={inputStyle} value={form.billingStreet} onChange={setField('billingStreet')} />
            </Field>
            <Field label="City">
              <input style={inputStyle} value={form.billingCity} onChange={setField('billingCity')} />
            </Field>
            <Field label="State">
              <input style={inputStyle} value={form.billingState} onChange={setField('billingState')} />
            </Field>
            <Field label="Zip">
              <input style={inputStyle} value={form.billingZip} onChange={setField('billingZip')} />
            </Field>
            <Field label="Country">
              <input style={inputStyle} value={form.billingCountry} onChange={setField('billingCountry')} />
            </Field>
          </div>

          <div style={{ height: 1, background: c.divider, margin: '1rem 0' }} />

          {/* Notes */}
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: c.textPrimary }}>
            Notes
          </h3>
          <Field label="Notes" full>
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              value={form.notes}
              onChange={setField('notes')}
            />
          </Field>

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1rem' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            Active
          </label>

          {/* Save */}
          <button style={btnPrimary} onClick={saveDetails}>Save Changes</button>
        </div>
      )}

      {/* ── Contacts Tab ────────────────────────────────────────────────────── */}
      {tab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.85rem' }}>
            <button style={btnPrimary} onClick={openAddContact}>+ Add Contact</button>
          </div>

          {customer.contacts.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No contacts yet. Click "+ Add Contact" to create one.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Primary</th>
                    <th style={thStyle}>Invoice Dist.</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.contacts.map(ct => (
                    <tr
                      key={ct.id}
                      style={{ borderBottom: `1px solid ${c.divider}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{ct.name}</td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>{ct.title || '--'}</td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>{ct.email || '--'}</td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>{ct.phone || '--'}</td>
                      <td style={tdStyle}>
                        <Badge
                          label={ct.contactType.replace(/_/g, ' ')}
                          color="#93c5fd"
                          bg={c.accentMuted}
                          border={c.accentBorder}
                        />
                      </td>
                      <td style={tdStyle}>
                        {ct.isPrimary && (
                          <Badge label="PRIMARY" color="#22c55e" bg="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.25)" />
                        )}
                      </td>
                      <td style={tdStyle}>
                        {ct.invoiceDistribution && (
                          <Badge label="YES" color="#f59e0b" bg="rgba(245,158,11,0.12)" border="rgba(245,158,11,0.25)" />
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openEditContact(ct)}
                          title="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textLabel, fontSize: '0.9rem', padding: '2px 6px' }}
                        >
                          &#9998;
                        </button>
                        <button
                          onClick={() => deactivateContact(ct)}
                          title="Deactivate"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, fontSize: '0.9rem', padding: '2px 6px', marginLeft: 4 }}
                        >
                          &#10005;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contact Drawer */}
          <Drawer
            open={contactDrawerOpen}
            onClose={() => setContactDrawerOpen(false)}
            title={editingContact ? 'Edit Contact' : 'Add Contact'}
          >
            <Field label="Name *">
              <input style={inputStyle} value={contactForm.name} onChange={setContactField('name')} />
            </Field>
            <Field label="Title">
              <input style={inputStyle} value={contactForm.title} onChange={setContactField('title')} />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" value={contactForm.email} onChange={setContactField('email')} />
            </Field>
            <Field label="Phone">
              <input style={inputStyle} value={contactForm.phone} onChange={setContactField('phone')} />
            </Field>
            <Field label="Contact Type *">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={contactForm.contactType} onChange={setContactField('contactType')}>
                {CONTACT_TYPES.map(ct => (
                  <option key={ct} value={ct}>{ct.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '0.85rem' }}>
              <input
                type="checkbox"
                checked={contactForm.isPrimary}
                onChange={e => setContactForm(p => ({ ...p, isPrimary: e.target.checked }))}
              />
              Primary Contact
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                checked={contactForm.invoiceDistribution}
                onChange={e => setContactForm(p => ({ ...p, invoiceDistribution: e.target.checked }))}
              />
              Invoice Distribution
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={saveContact}>
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </button>
              <button style={btnSecondary} onClick={() => setContactDrawerOpen(false)}>Cancel</button>
            </div>
          </Drawer>
        </div>
      )}

      {/* ── Ship-To Tab ─────────────────────────────────────────────────────── */}
      {tab === 'shipto' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.85rem' }}>
            <button style={btnPrimary} onClick={openAddShipTo}>+ Add Ship-To</button>
          </div>

          {customer.shipToLocations.length === 0 ? (
            <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: c.textMuted, fontSize: '0.875rem' }}>
              No ship-to addresses yet. Click "+ Add Ship-To" to create one.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
                    <th style={thStyle}>Location Name</th>
                    <th style={thStyle}>Address</th>
                    <th style={thStyle}>Contact</th>
                    <th style={thStyle}>Default</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.shipToLocations.map(addr => (
                    <tr
                      key={addr.id}
                      style={{ borderBottom: `1px solid ${c.divider}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{addr.name}</td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>
                        {[addr.city, addr.state].filter(Boolean).join(', ') || '--'}
                      </td>
                      <td style={{ ...tdStyle, color: c.textLabel }}>
                        {addr.contactName || '--'}
                        {addr.contactPhone && <span style={{ marginLeft: 6, fontSize: '0.8rem' }}>{addr.contactPhone}</span>}
                      </td>
                      <td style={tdStyle}>
                        {addr.isDefault && (
                          <Badge label="DEFAULT" color="#22c55e" bg="rgba(34,197,94,0.12)" border="rgba(34,197,94,0.25)" />
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openEditShipTo(addr)}
                          title="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textLabel, fontSize: '0.9rem', padding: '2px 6px' }}
                        >
                          &#9998;
                        </button>
                        <button
                          onClick={() => deactivateShipTo(addr)}
                          title="Deactivate"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, fontSize: '0.9rem', padding: '2px 6px', marginLeft: 4 }}
                        >
                          &#10005;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ship-To Drawer */}
          <Drawer
            open={shipToDrawerOpen}
            onClose={() => setShipToDrawerOpen(false)}
            title={editingShipTo ? 'Edit Ship-To Address' : 'Add Ship-To Address'}
          >
            <Field label="Location Name *">
              <input style={inputStyle} value={shipToForm.name} onChange={setShipToField('name')} />
            </Field>
            <Field label="Street">
              <input style={inputStyle} value={shipToForm.street} onChange={setShipToField('street')} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <Field label="City">
                <input style={inputStyle} value={shipToForm.city} onChange={setShipToField('city')} />
              </Field>
              <Field label="State">
                <input style={inputStyle} value={shipToForm.state} onChange={setShipToField('state')} />
              </Field>
              <Field label="Zip">
                <input style={inputStyle} value={shipToForm.zip} onChange={setShipToField('zip')} />
              </Field>
              <Field label="Country">
                <input style={inputStyle} value={shipToForm.country} onChange={setShipToField('country')} />
              </Field>
            </div>

            <div style={{ height: 1, background: c.divider, margin: '0.5rem 0 1rem' }} />

            <Field label="Contact Name">
              <input style={inputStyle} value={shipToForm.contactName} onChange={setShipToField('contactName')} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <Field label="Contact Phone">
                <input style={inputStyle} value={shipToForm.contactPhone} onChange={setShipToField('contactPhone')} />
              </Field>
              <Field label="Contact Email">
                <input style={inputStyle} type="email" value={shipToForm.contactEmail} onChange={setShipToField('contactEmail')} />
              </Field>
            </div>
            <Field label="Delivery Instructions">
              <textarea
                style={{ ...inputStyle, height: 64, resize: 'vertical' }}
                value={shipToForm.deliveryInstructions}
                onChange={setShipToField('deliveryInstructions')}
              />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: c.textLabel, cursor: 'pointer', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                checked={shipToForm.isDefault}
                onChange={e => setShipToForm(p => ({ ...p, isDefault: e.target.checked }))}
              />
              Default Ship-To
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={saveShipTo}>
                {editingShipTo ? 'Update Address' : 'Add Address'}
              </button>
              <button style={btnSecondary} onClick={() => setShipToDrawerOpen(false)}>Cancel</button>
            </div>
          </Drawer>
        </div>
      )}

      {/* ── Open Orders Tab (placeholder) ───────────────────────────────────── */}
      {tab === 'orders' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', color: c.textMuted, fontSize: '0.9rem' }}>
          Sales orders will be available in Session 7.
        </div>
      )}

      {/* ── AR / Balance Tab (placeholder) ──────────────────────────────────── */}
      {tab === 'ar' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', color: c.textMuted, fontSize: '0.9rem' }}>
          AR aging and balance tracking coming in a future session.
        </div>
      )}

      {/* ── Price List Tab (placeholder) ────────────────────────────────────── */}
      {tab === 'price' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', color: c.textMuted, fontSize: '0.9rem' }}>
          Customer-specific pricing coming in a future session.
        </div>
      )}

      {/* ── Activity Tab (placeholder) ──────────────────────────────────────── */}
      {tab === 'activity' && (
        <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center', color: c.textMuted, fontSize: '0.9rem' }}>
          Activity log coming in a future session.
        </div>
      )}
    </Layout>
  );
}
