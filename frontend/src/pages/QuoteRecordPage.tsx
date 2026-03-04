import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Drawer } from '../components/Drawer';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { c, inputStyle, labelStyle, btnPrimary, btnSecondary, btnDanger, cardStyle, STATUS_COLORS } from '../theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Quote {
  id: number; quoteNumber: string; customerId: number; status: string;
  validUntil: string | null; salesRepId: number | null;
  customerStatedPrice: string | null; customerStatedPriceSource: string | null;
  internalNotes: string | null; notes: string | null;
  createdAt: string; updatedAt: string; totalValue: number;
  customer: { id: number; name: string; code: string; partyId: number | null; acquisitionStatus: string | null };
  createdBy: { id: number; name: string };
  salesRep: { id: number; name: string } | null;
  party: { id: number; name: string } | null;
  items: QuoteLine[];
  order: { id: number; orderNumber: string } | null;
}
interface QuoteLine {
  id: number; quoteId: number; lineNumber: number; description: string;
  quantity: string; quantityUnit: string; unitPrice: string; extendedPrice: string | null;
  customerItemId: number | null; variantId: number | null; masterSpecId: number | null;
  boardGradeId: number | null; flute: string | null; notes: string | null;
  materialCostPerM: string | null; bomCostPerM: string | null; totalCostPerM: string | null;
  marginPercent: string | null; unitPricePerM: string | null;
  selectedSupplierId: number | null;
  altQty1: string | null; altPrice1: string | null;
  altQty2: string | null; altPrice2: string | null;
  altQty3: string | null; altPrice3: string | null;
  customerItem: { id: number; code: string; name: string } | null;
  masterSpec: { id: number; sku: string; name: string } | null;
  variant: { id: number; sku: string; variantDescription: string | null } | null;
  boardGrade: { id: number; gradeCode: string; gradeName: string } | null;
  selectedSupplier: { id: number; name: string } | null;
}
interface CustomerIntel {
  customer: any; isProspect: boolean; openQuotes: any[]; activeOrders: any[];
  activeOrdersValue: number; ytdRevenue: number; customerItems: any[]; contacts: any[];
}
interface SpecIntel {
  otherCustomers: any[]; openOrdersWithSameSpec: any[];
  equipmentCapability: any[]; materialAvailability: any;
}
interface PriceCalc {
  materialCostPerM: number | null; bomCostPerM: number | null; totalCostPerM: number | null;
  suggestedPrice: number | null; costSource: string; msf: number | null; altPrices: any[];
}
interface UserOption { id: number; name: string; role: string }
interface GradeOption { id: number; gradeCode: string; gradeName: string }
interface SupplierOption { id: number; name: string; code: string }
interface LocationOption { id: number; name: string }

// ─── Status Pipeline ────────────────────────────────────────────────────────
const PIPELINE = ['DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'CONVERTED'];
const DECLINED_PIPELINE = ['DRAFT', 'SENT', 'DECLINED'];
const EXPIRED_PIPELINE = ['DRAFT', 'SENT', 'EXPIRED'];

function StatusPipeline({ status }: { status: string }) {
  const pipe = status === 'DECLINED' ? DECLINED_PIPELINE : status === 'EXPIRED' ? EXPIRED_PIPELINE : PIPELINE;
  const idx = pipe.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, flexWrap: 'wrap' }}>
      {pipe.map((step, i) => {
        const done = i <= idx;
        const isCurrent = i === idx;
        const isNeg = step === 'DECLINED' || step === 'EXPIRED';
        const fillColor = isNeg && done ? c.danger : done ? c.success : 'transparent';
        const borderColor = isNeg && done ? c.danger : done ? c.success : c.inputBorder;
        const textColor = isNeg && done ? c.danger : done ? c.success : c.textMuted;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div style={{ width: 32, height: 2, background: done ? (isNeg ? c.danger : c.success) : c.inputBorder }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${borderColor}`,
                background: fillColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', color: done ? '#fff' : c.textMuted, fontWeight: 700,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.62rem', color: textColor, fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                {step.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtCurrency(n: number | string | null | undefined) {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  // Add quote-specific status colors
  const extraColors: Record<string, { bg: string; text: string; border: string }> = {
    DRAFT:        { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
    SENT:         { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    UNDER_REVIEW: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    ACCEPTED:     { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
    DECLINED:     { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    EXPIRED:      { bg: 'rgba(100,116,139,0.12)', text: '#64748b', border: 'rgba(100,116,139,0.2)' },
    CONVERTED:    { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  };
  const sc = extraColors[status] ?? STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
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

// ─── Margin color ───────────────────────────────────────────────────────────
function marginColor(pct: number): string {
  if (pct >= 20) return c.success;
  if (pct >= 10) return c.warning;
  return c.danger;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export function QuoteRecordPage() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const { user } = useAuth();
  const isNew  = id === 'new';

  const [quote, setQuote]       = useState<Quote | null>(null);
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [flash, setFlash]       = useState('');
  const [tab, setTab]           = useState<'lines' | 'intelligence' | 'pdf' | 'activity'>('lines');

  // Header form state
  const [headerForm, setHeaderForm] = useState({
    customerId: '', partyId: '', salesRepId: '', validUntil: '',
    customerStatedPrice: '', customerStatedPriceSource: '',
    internalNotes: '', notes: '',
  });

  // Lookups
  const [users, setUsers]           = useState<UserOption[]>([]);
  const [grades, setGrades]         = useState<GradeOption[]>([]);
  const [suppliers, setSuppliers]   = useState<SupplierOption[]>([]);
  const [locations, setLocations]   = useState<LocationOption[]>([]);

  // Party search
  const [partySearch, setPartySearch] = useState('');
  const [partyResults, setPartyResults] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const searchTimeout = useRef<any>(null);

  // Intelligence
  const [custIntel, setCustIntel] = useState<CustomerIntel | null>(null);
  const [specIntel, setSpecIntel] = useState<SpecIntel | null>(null);

  // Line item drawer
  const [lineDrawerOpen, setLineDrawerOpen] = useState(false);
  const [editLineId, setEditLineId]         = useState<number | null>(null);
  const [lineForm, setLineForm]             = useState<Record<string, any>>({});
  const [lineError, setLineError]           = useState('');
  const [priceCalc, setPriceCalc]           = useState<PriceCalc | null>(null);

  // Spec search for line items
  const [specSearch, setSpecSearch]       = useState('');
  const [specResults, setSpecResults]     = useState<{ masterSpecs: any[]; customerItems: any[] }>({ masterSpecs: [], customerItems: [] });
  const specSearchTimeout = useRef<any>(null);

  // PDF data
  const [pdfData, setPdfData] = useState<any>(null);

  // ── Load lookups ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<UserOption[]>('/protected/quotes/lookup/users').then(setUsers).catch(() => {});
    api.get<{ data: GradeOption[] }>('/protected/board-grades?limit=200').then(r => setGrades(r.data ?? [])).catch(() => {});
    api.get<any>('/protected/suppliers?limit=200').then(r => setSuppliers(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
    api.get<any>('/protected/locations?limit=200').then(r => setLocations(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
  }, []);

  // ── Load quote ────────────────────────────────────────────────────────────
  const loadQuote = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await api.get<Quote>(`/protected/quotes/${id}`);
      setQuote(res);
      setHeaderForm({
        customerId:               String(res.customerId),
        partyId:                  res.party?.id ? String(res.party.id) : '',
        salesRepId:               res.salesRepId ? String(res.salesRepId) : '',
        validUntil:               res.validUntil?.split('T')[0] ?? '',
        customerStatedPrice:      res.customerStatedPrice ?? '',
        customerStatedPriceSource: res.customerStatedPriceSource ?? '',
        internalNotes:            res.internalNotes ?? '',
        notes:                    res.notes ?? '',
      });
      setSelectedParty({ name: res.customer.name, id: res.party?.id });
      setPartySearch(res.customer.name);
      // Load customer intelligence
      loadCustomerIntel(res.customerId);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  // ── Customer intelligence ─────────────────────────────────────────────────
  async function loadCustomerIntel(customerId: number) {
    try {
      const res = await api.get<CustomerIntel>(`/protected/quotes/intelligence/customer/${customerId}`);
      setCustIntel(res);
    } catch { /* */ }
  }

  // ── Party search ──────────────────────────────────────────────────────────
  function handlePartySearch(val: string) {
    setPartySearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 2) { setPartyResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get<any[]>(`/protected/quotes/search/parties?search=${encodeURIComponent(val)}`);
        setPartyResults(res);
      } catch { /* */ }
    }, 300);
  }

  function selectParty(party: any) {
    setSelectedParty(party);
    setPartySearch(party.name);
    setPartyResults([]);
    const custId = party.customers?.[0]?.id;
    setHeaderForm(f => ({
      ...f,
      partyId: String(party.id),
      customerId: custId ? String(custId) : '',
    }));
    if (custId) loadCustomerIntel(custId);
  }

  // ── Create quote ──────────────────────────────────────────────────────────
  async function createQuote() {
    if (!headerForm.partyId && !headerForm.customerId) {
      setError('Please select a customer or prospect');
      return;
    }
    setSaving(true); setError('');
    try {
      const body: any = {
        partyId:                  headerForm.partyId ? parseInt(headerForm.partyId, 10) : undefined,
        customerId:               headerForm.customerId ? parseInt(headerForm.customerId, 10) : undefined,
        salesRepId:               headerForm.salesRepId ? parseInt(headerForm.salesRepId, 10) : undefined,
        validUntil:               headerForm.validUntil || undefined,
        customerStatedPrice:      headerForm.customerStatedPrice ? parseFloat(headerForm.customerStatedPrice) : undefined,
        customerStatedPriceSource: headerForm.customerStatedPriceSource || undefined,
        internalNotes:            headerForm.internalNotes || undefined,
        notes:                    headerForm.notes || undefined,
      };
      const res = await api.post<Quote>('/protected/quotes', body);
      nav(`/quotes/${res.id}`, { replace: true });
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  // ── Update quote header ───────────────────────────────────────────────────
  async function updateHeader() {
    if (!quote) return;
    setSaving(true); setError('');
    try {
      const body = {
        salesRepId:                headerForm.salesRepId ? parseInt(headerForm.salesRepId, 10) : null,
        validUntil:               headerForm.validUntil || null,
        customerStatedPrice:      headerForm.customerStatedPrice ? parseFloat(headerForm.customerStatedPrice) : null,
        customerStatedPriceSource: headerForm.customerStatedPriceSource || null,
        internalNotes:            headerForm.internalNotes || null,
        notes:                    headerForm.notes || null,
      };
      await api.put(`/protected/quotes/${quote.id}`, body);
      showFlash('Quote updated');
      loadQuote();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  // ── Status actions ────────────────────────────────────────────────────────
  async function doAction(action: string) {
    if (!quote) return;
    setSaving(true);
    try {
      await api.post(`/protected/quotes/${quote.id}/${action}`, {});
      showFlash(`Quote ${action} successful`);
      loadQuote();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function deleteQuote() {
    if (!quote) return;
    if (!window.confirm('Delete this draft quote?')) return;
    try {
      await api.delete(`/protected/quotes/${quote.id}`);
      nav('/quotes', { replace: true });
    } catch (e: any) { setError(e.message); }
  }

  // ── Line item CRUD ────────────────────────────────────────────────────────
  function openAddLine() {
    setEditLineId(null);
    setLineForm({ description: '', quantity: '', quantityUnit: 'EACH', unitPrice: '',
      boardGradeId: '', flute: '', notes: '', variantId: '', masterSpecId: '', customerItemId: '',
      materialCostPerM: '', bomCostPerM: '', totalCostPerM: '',
      altQty1: '', altPrice1: '', altQty2: '', altPrice2: '', altQty3: '', altPrice3: '',
      selectedSupplierId: '', locationId: '' });
    setLineError(''); setSpecSearch(''); setSpecResults({ masterSpecs: [], customerItems: [] }); setPriceCalc(null);
    setLineDrawerOpen(true);
  }

  function openEditLine(line: QuoteLine) {
    setEditLineId(line.id);
    setLineForm({
      description: line.description, quantity: line.quantity, quantityUnit: line.quantityUnit ?? 'EACH',
      unitPrice: line.unitPrice, boardGradeId: line.boardGradeId ?? '', flute: line.flute ?? '',
      notes: line.notes ?? '', variantId: line.variantId ?? '', masterSpecId: line.masterSpecId ?? '',
      customerItemId: line.customerItemId ?? '',
      materialCostPerM: line.materialCostPerM ?? '', bomCostPerM: line.bomCostPerM ?? '',
      totalCostPerM: line.totalCostPerM ?? '', selectedSupplierId: line.selectedSupplierId ?? '',
      altQty1: line.altQty1 ?? '', altPrice1: line.altPrice1 ?? '',
      altQty2: line.altQty2 ?? '', altPrice2: line.altPrice2 ?? '',
      altQty3: line.altQty3 ?? '', altPrice3: line.altPrice3 ?? '',
      locationId: '',
    });
    setLineError(''); setPriceCalc(null);
    setLineDrawerOpen(true);
  }

  async function saveLine() {
    if (!quote) return;
    setSaving(true); setLineError('');
    try {
      const body: any = {
        description: lineForm.description,
        quantity:    parseFloat(lineForm.quantity),
        quantityUnit: lineForm.quantityUnit,
        unitPrice:   parseFloat(lineForm.unitPrice),
        boardGradeId: lineForm.boardGradeId ? parseInt(lineForm.boardGradeId, 10) : null,
        flute:        lineForm.flute || null,
        notes:        lineForm.notes || null,
        variantId:    lineForm.variantId ? parseInt(lineForm.variantId, 10) : null,
        masterSpecId: lineForm.masterSpecId ? parseInt(lineForm.masterSpecId, 10) : null,
        customerItemId: lineForm.customerItemId ? parseInt(lineForm.customerItemId, 10) : null,
        materialCostPerM: lineForm.materialCostPerM ? parseFloat(lineForm.materialCostPerM) : null,
        bomCostPerM:      lineForm.bomCostPerM ? parseFloat(lineForm.bomCostPerM) : null,
        totalCostPerM:    lineForm.totalCostPerM ? parseFloat(lineForm.totalCostPerM) : null,
        selectedSupplierId: lineForm.selectedSupplierId ? parseInt(lineForm.selectedSupplierId, 10) : null,
        altQty1:   lineForm.altQty1 ? parseFloat(lineForm.altQty1) : null,
        altPrice1: lineForm.altPrice1 ? parseFloat(lineForm.altPrice1) : null,
        altQty2:   lineForm.altQty2 ? parseFloat(lineForm.altQty2) : null,
        altPrice2: lineForm.altPrice2 ? parseFloat(lineForm.altPrice2) : null,
        altQty3:   lineForm.altQty3 ? parseFloat(lineForm.altQty3) : null,
        altPrice3: lineForm.altPrice3 ? parseFloat(lineForm.altPrice3) : null,
      };
      // Calculate margin if we have cost and price
      if (body.totalCostPerM && body.unitPrice) {
        const margin = ((body.unitPrice - body.totalCostPerM) / body.unitPrice) * 100;
        body.marginPercent = Math.round(margin * 100) / 100;
      }
      if (editLineId) {
        await api.put(`/protected/quotes/${quote.id}/lines/${editLineId}`, body);
      } else {
        await api.post(`/protected/quotes/${quote.id}/lines`, body);
      }
      setLineDrawerOpen(false);
      showFlash(editLineId ? 'Line updated' : 'Line added');
      loadQuote();
    } catch (e: any) { setLineError(e.message); }
    setSaving(false);
  }

  async function deleteLine(lineId: number) {
    if (!quote) return;
    if (!window.confirm('Delete this line?')) return;
    try {
      await api.delete(`/protected/quotes/${quote.id}/lines/${lineId}`);
      showFlash('Line deleted');
      loadQuote();
    } catch (e: any) { setError(e.message); }
  }

  // ── Spec search for line items ────────────────────────────────────────────
  function handleSpecSearch(val: string) {
    setSpecSearch(val);
    if (specSearchTimeout.current) clearTimeout(specSearchTimeout.current);
    if (val.length < 2) { setSpecResults({ masterSpecs: [], customerItems: [] }); return; }
    specSearchTimeout.current = setTimeout(async () => {
      try {
        let url = `/protected/quotes/search/specs?search=${encodeURIComponent(val)}`;
        if (quote?.customerId) url += `&customerId=${quote.customerId}`;
        const res = await api.get<{ masterSpecs: any[]; customerItems: any[] }>(url);
        setSpecResults(res);
      } catch { /* */ }
    }, 300);
  }

  function selectSpec(type: 'masterSpec' | 'customerItem', item: any) {
    setSpecSearch('');
    setSpecResults({ masterSpecs: [], customerItems: [] });
    if (type === 'masterSpec') {
      const variant = item.variants?.[0];
      setLineForm(f => ({
        ...f,
        masterSpecId: String(item.id),
        description: item.name,
        variantId: variant ? String(variant.id) : '',
        boardGradeId: variant?.boardGrade ? String(variant.boardGradeId) : f.boardGradeId,
        flute: variant?.flute ?? f.flute,
      }));
      // Load spec intelligence
      loadSpecIntel(item.id, variant?.id);
    } else {
      setLineForm(f => ({
        ...f,
        customerItemId: String(item.id),
        masterSpecId: item.masterSpecId ? String(item.masterSpecId) : '',
        variantId: item.variantId ? String(item.variantId) : '',
        description: item.name,
        boardGradeId: item.variant?.boardGradeId ? String(item.variant.boardGradeId) : f.boardGradeId,
        flute: item.variant?.flute ?? f.flute,
      }));
      if (item.masterSpecId) loadSpecIntel(item.masterSpecId, item.variantId);
    }
  }

  async function loadSpecIntel(masterSpecId: number, variantId?: number) {
    try {
      let url = `/protected/quotes/intelligence/spec?masterSpecId=${masterSpecId}`;
      if (variantId) url += `&variantId=${variantId}`;
      const res = await api.get<SpecIntel>(url);
      setSpecIntel(res);
    } catch { /* */ }
  }

  // ── Calculate price ───────────────────────────────────────────────────────
  async function calculatePrice() {
    if (!lineForm.variantId || !lineForm.quantity) return;
    try {
      const body: any = {
        variantId: parseInt(lineForm.variantId, 10),
        qty:       parseFloat(lineForm.quantity),
        locationId: lineForm.locationId ? parseInt(lineForm.locationId, 10) : null,
        supplierId: lineForm.selectedSupplierId ? parseInt(lineForm.selectedSupplierId, 10) : null,
        altQty1: lineForm.altQty1 ? parseFloat(lineForm.altQty1) : undefined,
        altQty2: lineForm.altQty2 ? parseFloat(lineForm.altQty2) : undefined,
        altQty3: lineForm.altQty3 ? parseFloat(lineForm.altQty3) : undefined,
      };
      const res = await api.post<PriceCalc>('/protected/quotes/calculate-price', body);
      setPriceCalc(res);
      // Auto-fill cost fields
      setLineForm(f => ({
        ...f,
        materialCostPerM: res.materialCostPerM != null ? String(res.materialCostPerM) : f.materialCostPerM,
        bomCostPerM: res.bomCostPerM != null ? String(res.bomCostPerM) : f.bomCostPerM,
        totalCostPerM: res.totalCostPerM != null ? String(res.totalCostPerM) : f.totalCostPerM,
      }));
    } catch { /* */ }
  }

  // ── Load PDF ──────────────────────────────────────────────────────────────
  async function loadPdf() {
    if (!quote) return;
    try {
      const res = await api.get<any>(`/protected/quotes/${quote.id}/pdf`);
      setPdfData(res);
    } catch { /* */ }
  }

  useEffect(() => { if (tab === 'pdf' && quote) loadPdf(); }, [tab, quote?.id]);

  // ── Flash message ─────────────────────────────────────────────────────────
  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const canSeeMargin = user?.role === 'ADMIN';

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) return <Layout><div style={{ padding: 40, color: c.textMuted }}>Loading...</div></Layout>;

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW QUOTE
  // ═══════════════════════════════════════════════════════════════════════════
  if (isNew) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button onClick={() => nav('/quotes')} style={{ ...btnSecondary, padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>New Quote</h1>
        </div>

        {error && <div style={{ background: c.dangerMuted, border: `1px solid ${c.danger}`, borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: 12, color: c.danger, fontSize: '0.82rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
          {/* Left — Form */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Customer / Prospect *</label>
              <div style={{ position: 'relative' }}>
                <input value={partySearch} onChange={e => handlePartySearch(e.target.value)}
                  placeholder="Search by name or code..." style={inputStyle} />
                {partyResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                    background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 6,
                    maxHeight: 250, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    {partyResults.map(p => (
                      <div key={p.id} onClick={() => selectParty(p)}
                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: `1px solid ${c.divider}`, fontSize: '0.82rem' }}
                        onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: c.textMuted }}>
                          {p.partyCode} — {p.roles?.map((r: any) => r.roleType).join(', ')}
                          {p.customers?.[0]?.acquisitionStatus && ` — ${p.customers[0].acquisitionStatus}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedParty && (
                <div style={{ fontSize: '0.75rem', color: c.textMuted, marginTop: 4 }}>
                  Selected: {selectedParty.name}
                  {selectedParty.customers?.[0]?.acquisitionStatus === 'PROSPECT' && (
                    <span style={{ color: c.warning, marginLeft: 8 }}>New customer — onboarding needed if won</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Sales Rep</label>
                <select value={headerForm.salesRepId} onChange={e => setHeaderForm(f => ({ ...f, salesRepId: e.target.value }))} style={inputStyle}>
                  <option value="">Select...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Valid Until</label>
                <input type="date" value={headerForm.validUntil} onChange={e => setHeaderForm(f => ({ ...f, validUntil: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Customer Stated Price</label>
                <input type="number" step="0.01" value={headerForm.customerStatedPrice}
                  onChange={e => setHeaderForm(f => ({ ...f, customerStatedPrice: e.target.value }))}
                  style={inputStyle} placeholder="What are they paying now?" />
              </div>
              <div>
                <label style={labelStyle}>Price Source</label>
                <select value={headerForm.customerStatedPriceSource} onChange={e => setHeaderForm(f => ({ ...f, customerStatedPriceSource: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  <option value="COMPETITOR">Competitor</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Internal Notes</label>
              <textarea value={headerForm.internalNotes} onChange={e => setHeaderForm(f => ({ ...f, internalNotes: e.target.value }))}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Never shown on PDF" />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Quote Notes (appears on PDF)</label>
              <textarea value={headerForm.notes} onChange={e => setHeaderForm(f => ({ ...f, notes: e.target.value }))}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            </div>

            <button onClick={createQuote} disabled={saving} style={{ ...btnPrimary, marginTop: 16, width: '100%' }}>
              {saving ? 'Creating...' : 'Create Quote'}
            </button>
          </div>

          {/* Right — Intelligence preview */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 12 }}>Customer Intelligence</div>
            {custIntel ? (
              <CustomerIntelPanel intel={custIntel} canSeeMargin={canSeeMargin} />
            ) : (
              <div style={{ color: c.textMuted, fontSize: '0.82rem' }}>Select a customer to see intelligence</div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING QUOTE
  // ═══════════════════════════════════════════════════════════════════════════
  if (!quote) return <Layout><div style={{ color: c.danger, padding: 20 }}>Quote not found</div></Layout>;

  const isEditable = quote.status === 'DRAFT' || quote.status === 'SENT';

  return (
    <Layout>
      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 100,
          background: c.successMuted, border: `1px solid ${c.success}`, color: c.success,
          borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
        }}>{flash}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button onClick={() => nav('/quotes')} style={{ ...btnSecondary, padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>← Quotes</button>
        <h1 style={{ margin: 0, fontSize: '1.15rem' }}>{quote.quoteNumber}</h1>
        <StatusBadge status={quote.status} />
        <span style={{ color: c.textMuted, fontSize: '0.82rem', marginLeft: 'auto' }}>
          {quote.customer.name} ({quote.customer.code})
        </span>
      </div>

      {error && <div style={{ background: c.dangerMuted, border: `1px solid ${c.danger}`, borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: 12, color: c.danger, fontSize: '0.82rem' }}>{error}</div>}

      {/* Pipeline */}
      <StatusPipeline status={quote.status} />

      {/* Actions bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {quote.status === 'DRAFT' && <>
          <button onClick={() => doAction('send')} disabled={saving} style={btnPrimary}>Send Quote</button>
          <button onClick={deleteQuote} style={btnDanger}>Delete</button>
        </>}
        {quote.status === 'SENT' && <>
          <button onClick={() => doAction('accept')} disabled={saving} style={{ ...btnPrimary, background: c.success }}>Mark Accepted</button>
          <button onClick={() => doAction('decline')} disabled={saving} style={btnDanger}>Mark Declined</button>
          <button onClick={() => doAction('send')} disabled={saving} style={btnSecondary}>Resend</button>
        </>}
        {quote.status === 'UNDER_REVIEW' && <>
          <button onClick={() => doAction('accept')} disabled={saving} style={{ ...btnPrimary, background: c.success }}>Mark Accepted</button>
          <button onClick={() => doAction('decline')} disabled={saving} style={btnDanger}>Mark Declined</button>
        </>}
        {quote.status === 'ACCEPTED' && (
          <button onClick={() => doAction('convert')} disabled={saving} style={{ ...btnPrimary, background: '#8b5cf6' }}>Convert to Sales Order</button>
        )}
        {(quote.status === 'DECLINED' || quote.status === 'EXPIRED') && (
          <button onClick={() => doAction('reopen')} disabled={saving} style={btnSecondary}>Reopen as Draft</button>
        )}
        {quote.status === 'CONVERTED' && quote.order && (
          <span style={{ fontSize: '0.82rem', color: c.accent, fontWeight: 600 }}>
            Sales Order: {quote.order.orderNumber}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${c.divider}`, paddingBottom: 8 }}>
        {(['lines', 'intelligence', 'pdf', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? c.accentMuted : 'transparent',
            border: `1px solid ${tab === t ? c.accentBorder : 'transparent'}`,
            borderRadius: 6, padding: '0.4rem 0.85rem', fontSize: '0.82rem',
            fontWeight: tab === t ? 600 : 400, color: tab === t ? '#93c5fd' : c.textLabel,
            cursor: 'pointer',
          }}>
            {t === 'lines' ? 'Quote Lines' : t === 'intelligence' ? 'Intelligence' : t === 'pdf' ? 'PDF Preview' : 'Activity'}
          </button>
        ))}
      </div>

      {/* ─── TAB: QUOTE LINES (two-panel) ─── */}
      {tab === 'lines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Left: Lines + Header */}
          <div>
            {/* Editable header section */}
            {isEditable && (
              <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Sales Rep</label>
                    <select value={headerForm.salesRepId} onChange={e => setHeaderForm(f => ({ ...f, salesRepId: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}>
                      <option value="">—</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Valid Until</label>
                    <input type="date" value={headerForm.validUntil} onChange={e => setHeaderForm(f => ({ ...f, validUntil: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Customer Stated Price</label>
                    <input type="number" step="0.01" value={headerForm.customerStatedPrice}
                      onChange={e => setHeaderForm(f => ({ ...f, customerStatedPrice: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Internal Notes</label>
                    <textarea value={headerForm.internalNotes} onChange={e => setHeaderForm(f => ({ ...f, internalNotes: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '0.8rem', minHeight: 40, resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Quote Notes (on PDF)</label>
                    <textarea value={headerForm.notes} onChange={e => setHeaderForm(f => ({ ...f, notes: e.target.value }))}
                      style={{ ...inputStyle, fontSize: '0.8rem', minHeight: 40, resize: 'vertical' }} />
                  </div>
                </div>
                <button onClick={updateHeader} disabled={saving} style={{ ...btnSecondary, marginTop: 8, fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}>Save Header</button>
              </div>
            )}

            {/* Line items table */}
            <div style={{ ...cardStyle, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: `1px solid ${c.divider}` }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Line Items ({quote.items.length})</span>
                {isEditable && <button onClick={openAddLine} style={{ ...btnPrimary, padding: '0.25rem 0.7rem', fontSize: '0.78rem' }}>+ Add Line</button>}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
                    {['#', 'Description', 'Grade', 'Qty', 'Unit', 'Unit Price', 'Extended', canSeeMargin ? 'Margin' : '', ''].filter(Boolean).map(h =>
                      <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: c.textMuted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quote.items.length === 0 ? (
                    <tr><td colSpan={canSeeMargin ? 9 : 8} style={{ padding: 20, textAlign: 'center', color: c.textMuted }}>No line items yet</td></tr>
                  ) : quote.items.map(line => {
                    const marginPct = line.marginPercent ? parseFloat(line.marginPercent) : null;
                    return (
                      <tr key={line.id} style={{ borderBottom: `1px solid ${c.divider}`, cursor: isEditable ? 'pointer' : 'default' }}
                        onClick={() => isEditable && openEditLine(line)}
                        onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '0.45rem 0.6rem', color: c.textMuted }}>{line.lineNumber}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>
                          <div>{line.description}</div>
                          {line.customerItem && <div style={{ fontSize: '0.7rem', color: c.textMuted }}>{line.customerItem.code}</div>}
                          {(line.altQty1 || line.altQty2 || line.altQty3) && (
                            <div style={{ fontSize: '0.68rem', color: c.accent, marginTop: 2 }}>
                              {[line.altQty1 && `${line.altQty1}@${fmtCurrency(line.altPrice1)}`, line.altQty2 && `${line.altQty2}@${fmtCurrency(line.altPrice2)}`, line.altQty3 && `${line.altQty3}@${fmtCurrency(line.altPrice3)}`].filter(Boolean).join(' | ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.45rem 0.6rem', color: c.textMuted }}>{line.boardGrade?.gradeCode ?? line.flute ?? '—'}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{Number(line.quantity).toLocaleString()}</td>
                        <td style={{ padding: '0.45rem 0.6rem', color: c.textMuted }}>{line.quantityUnit}</td>
                        <td style={{ padding: '0.45rem 0.6rem' }}>{fmtCurrency(line.unitPrice)}</td>
                        <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>{fmtCurrency(line.extendedPrice)}</td>
                        {canSeeMargin && (
                          <td style={{ padding: '0.45rem 0.6rem', color: marginPct != null ? marginColor(marginPct) : c.textMuted, fontWeight: 600 }}>
                            {marginPct != null ? `${marginPct.toFixed(1)}%` : '—'}
                          </td>
                        )}
                        <td style={{ padding: '0.45rem 0.6rem' }}>
                          {isEditable && (
                            <button onClick={e => { e.stopPropagation(); deleteLine(line.id); }}
                              style={{ background: 'none', border: 'none', color: c.danger, cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Footer / subtotal */}
              <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${c.divider}`, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Subtotal: {fmtCurrency(quote.totalValue)}</span>
              </div>
            </div>
          </div>

          {/* Right: Intelligence panel */}
          <div>
            {custIntel && (
              <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 8 }}>Customer Intelligence</div>
                <CustomerIntelPanel intel={custIntel} canSeeMargin={canSeeMargin} />
              </div>
            )}
            {canSeeMargin && quote.items.length > 0 && (
              <div style={{ ...cardStyle, padding: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 8 }}>Margin Summary</div>
                <MarginSummary items={quote.items} statedPrice={quote.customerStatedPrice} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: INTELLIGENCE ─── */}
      {tab === 'intelligence' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 12 }}>Customer Intelligence</div>
            {custIntel ? <CustomerIntelPanel intel={custIntel} canSeeMargin={canSeeMargin} /> : <div style={{ color: c.textMuted, fontSize: '0.82rem' }}>No data</div>}
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 12 }}>Spec Intelligence</div>
            {specIntel ? <SpecIntelPanel intel={specIntel} /> : <div style={{ color: c.textMuted, fontSize: '0.82rem' }}>Select a line item spec to see intelligence</div>}
          </div>
        </div>
      )}

      {/* ─── TAB: PDF PREVIEW ─── */}
      {tab === 'pdf' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {pdfData ? <PdfPreview data={pdfData} /> : <div style={{ color: c.textMuted, padding: 20, textAlign: 'center' }}>Loading PDF preview...</div>}
        </div>
      )}

      {/* ─── TAB: ACTIVITY ─── */}
      {tab === 'activity' && (
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ fontSize: '0.82rem', color: c.textMuted }}>
            <div style={{ borderBottom: `1px solid ${c.divider}`, paddingBottom: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Created:</span> {new Date(quote.createdAt).toLocaleString()} by {quote.createdBy.name}
            </div>
            <div style={{ borderBottom: `1px solid ${c.divider}`, paddingBottom: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Last Updated:</span> {new Date(quote.updatedAt).toLocaleString()}
            </div>
            <div style={{ borderBottom: `1px solid ${c.divider}`, paddingBottom: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Status:</span> {quote.status.replace(/_/g, ' ')}
            </div>
            {quote.order && (
              <div>
                <span style={{ fontWeight: 600 }}>Converted to:</span> {quote.order.orderNumber}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── LINE ITEM DRAWER ─── */}
      <Drawer open={lineDrawerOpen} onClose={() => setLineDrawerOpen(false)} title={editLineId ? 'Edit Line Item' : 'Add Line Item'} width={560}>
        {lineError && <div style={{ background: c.dangerMuted, border: `1px solid ${c.danger}`, borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: 12, color: c.danger, fontSize: '0.82rem' }}>{lineError}</div>}

        {/* Spec search */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <label style={labelStyle}>Search Specs or Type Description</label>
          <input value={specSearch} onChange={e => handleSpecSearch(e.target.value)}
            placeholder="Search MasterSpec, CustomerItem, or free text..." style={inputStyle} />
          {(specResults.masterSpecs.length > 0 || specResults.customerItems.length > 0) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
              background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 6,
              maxHeight: 300, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {specResults.customerItems.length > 0 && (
                <>
                  <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)' }}>Customer Items</div>
                  {specResults.customerItems.map((ci: any) => (
                    <div key={`ci-${ci.id}`} onClick={() => selectSpec('customerItem', ci)}
                      style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', borderBottom: `1px solid ${c.divider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontWeight: 600 }}>{ci.code} — {ci.name}</div>
                      <div style={{ fontSize: '0.7rem', color: c.textMuted }}>
                        {ci.variant?.boardGrade?.gradeCode && `${ci.variant.boardGrade.gradeCode} `}
                        {ci.variant?.flute && `${ci.variant.flute}-Flute`}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {specResults.masterSpecs.length > 0 && (
                <>
                  <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.68rem', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)' }}>Master Specs</div>
                  {specResults.masterSpecs.map((ms: any) => (
                    <div key={`ms-${ms.id}`} onClick={() => selectSpec('masterSpec', ms)}
                      style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', borderBottom: `1px solid ${c.divider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontWeight: 600 }}>{ms.sku} — {ms.name}</div>
                      <div style={{ fontSize: '0.7rem', color: c.textMuted }}>
                        {ms.customerItems?.length > 0 && `Already made for ${ms.customerItems.length} customer(s)`}
                        {ms.variants?.[0]?.boardGrade?.gradeCode && ` | ${ms.variants[0].boardGrade.gradeCode}`}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description *</label>
          <input value={lineForm.description} onChange={e => setLineForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Board Grade</label>
            <select value={lineForm.boardGradeId} onChange={e => setLineForm(f => ({ ...f, boardGradeId: e.target.value }))} style={inputStyle}>
              <option value="">—</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.gradeCode}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Flute</label>
            <select value={lineForm.flute} onChange={e => setLineForm(f => ({ ...f, flute: e.target.value }))} style={inputStyle}>
              <option value="">—</option>
              {['A', 'B', 'C', 'E', 'F', 'BC', 'EB'].map(fl => <option key={fl} value={fl}>{fl}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" value={lineForm.quantity} onChange={e => setLineForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Unit</label>
            <select value={lineForm.quantityUnit} onChange={e => setLineForm(f => ({ ...f, quantityUnit: e.target.value }))} style={inputStyle}>
              {['EACH', 'M', 'ROLL', 'SHEET', 'BUNDLE', 'PALLET', 'LOT'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Unit Price *</label>
            <input type="number" step="0.01" value={lineForm.unitPrice} onChange={e => setLineForm(f => ({ ...f, unitPrice: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        {/* Alt qty breaks */}
        <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase', marginBottom: 6 }}>Quantity Breaks</div>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.6rem' }}>Alt Qty {n}</label>
                <input type="number" value={lineForm[`altQty${n}`] ?? ''} onChange={e => setLineForm(f => ({ ...f, [`altQty${n}`]: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.6rem' }}>Alt Price {n}</label>
                <input type="number" step="0.01" value={lineForm[`altPrice${n}`] ?? ''} onChange={e => setLineForm(f => ({ ...f, [`altPrice${n}`]: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Cost section (ADMIN only) */}
        {canSeeMargin && (
          <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textLabel, textTransform: 'uppercase' }}>Costing</span>
              {lineForm.variantId && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={lineForm.selectedSupplierId} onChange={e => setLineForm(f => ({ ...f, selectedSupplierId: e.target.value }))} style={{ ...inputStyle, width: 140, fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                    <option value="">Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={lineForm.locationId} onChange={e => setLineForm(f => ({ ...f, locationId: e.target.value }))} style={{ ...inputStyle, width: 120, fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                    <option value="">Location...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <button onClick={calculatePrice} style={{ ...btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>Calculate</button>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.6rem' }}>Material Cost/M</label>
                <input type="number" step="0.01" value={lineForm.materialCostPerM ?? ''} onChange={e => setLineForm(f => ({ ...f, materialCostPerM: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.6rem' }}>BOM Cost/M</label>
                <input type="number" step="0.01" value={lineForm.bomCostPerM ?? ''} onChange={e => setLineForm(f => ({ ...f, bomCostPerM: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.6rem' }}>Total Cost/M</label>
                <input type="number" step="0.01" value={lineForm.totalCostPerM ?? ''} onChange={e => setLineForm(f => ({ ...f, totalCostPerM: e.target.value }))} style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} />
              </div>
            </div>
            {priceCalc && (
              <div style={{ marginTop: 8, padding: '0.5rem', background: 'rgba(59,130,246,0.06)', borderRadius: 6, fontSize: '0.75rem' }}>
                <div>MSF: {priceCalc.msf} | Source: {priceCalc.costSource}</div>
                {priceCalc.suggestedPrice && <div style={{ fontWeight: 600, color: c.accent }}>Suggested Price/M: {fmtCurrency(priceCalc.suggestedPrice)}</div>}
                {priceCalc.altPrices?.map((ap: any, i: number) => (
                  <div key={i} style={{ color: c.textMuted }}>Alt {ap.qty}: Cost/M {fmtCurrency(ap.totalCostPerM)} → Suggested {fmtCurrency(ap.suggestedPrice)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={lineForm.notes ?? ''} onChange={e => setLineForm(f => ({ ...f, notes: e.target.value }))}
            style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveLine} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : editLineId ? 'Update Line' : 'Add Line'}</button>
          <button onClick={() => setLineDrawerOpen(false)} style={btnSecondary}>Cancel</button>
        </div>
      </Drawer>
    </Layout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function CustomerIntelPanel({ intel, canSeeMargin }: { intel: CustomerIntel; canSeeMargin: boolean }) {
  const cust = intel.customer;
  const sc = STATUS_COLORS[cust.acquisitionStatus] ?? STATUS_COLORS.PENDING;
  return (
    <div style={{ fontSize: '0.82rem' }}>
      {/* Status badge */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 20,
          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
        }}>
          {cust.acquisitionStatus?.replace(/_/g, ' ') ?? 'UNKNOWN'}
        </span>
        {cust.accountPotentialRating && (
          <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 700,
            color: cust.accountPotentialRating === 'A' ? c.success : cust.accountPotentialRating === 'B' ? c.accent : c.textMuted }}>
            {cust.accountPotentialRating}-Rating
          </span>
        )}
      </div>

      {intel.isProspect && (
        <div style={{ background: c.warningMuted, border: `1px solid ${c.warning}`, borderRadius: 6, padding: '0.4rem 0.6rem', marginBottom: 8, color: c.warning, fontSize: '0.75rem' }}>
          New customer — onboarding needed if won
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        <div><span style={{ color: c.textMuted }}>Active Orders:</span></div>
        <div style={{ fontWeight: 600 }}>{intel.activeOrders.length} ({fmtCurrency(intel.activeOrdersValue)})</div>
        <div><span style={{ color: c.textMuted }}>Open Quotes:</span></div>
        <div style={{ fontWeight: 600 }}>{intel.openQuotes.length}</div>
        <div><span style={{ color: c.textMuted }}>YTD Revenue:</span></div>
        <div style={{ fontWeight: 600 }}>{fmtCurrency(intel.ytdRevenue)}</div>
        <div><span style={{ color: c.textMuted }}>Active Items:</span></div>
        <div style={{ fontWeight: 600 }}>{intel.customerItems.length}</div>
      </div>

      {canSeeMargin && (cust.competitorName || cust.currentSupplierNotes) && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${c.divider}`, paddingTop: 8 }}>
          {cust.competitorName && <div><span style={{ color: c.textMuted }}>Competitor:</span> {cust.competitorName} ({cust.competitorRelationship})</div>}
          {cust.currentSupplierNotes && <div style={{ color: c.textMuted, marginTop: 2 }}>{cust.currentSupplierNotes}</div>}
        </div>
      )}

      {cust.otherProductsNeeded && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${c.divider}`, paddingTop: 8 }}>
          <span style={{ color: c.textMuted }}>Other products needed:</span> {cust.otherProductsNeeded}
        </div>
      )}

      {cust.salesRep && (
        <div style={{ marginTop: 8, color: c.textMuted }}>Account managed by: {cust.salesRep.name}</div>
      )}
    </div>
  );
}

function SpecIntelPanel({ intel }: { intel: SpecIntel }) {
  return (
    <div style={{ fontSize: '0.82rem' }}>
      {intel.otherCustomers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: c.accent }}>
            Already running for {intel.otherCustomers.length} customer(s)
          </div>
          {intel.otherCustomers.map((oc, i) => (
            <div key={i} style={{ color: c.textMuted, fontSize: '0.78rem' }}>
              {oc.customerName} ({oc.customerCode}) — {oc.itemCode}
            </div>
          ))}
        </div>
      )}

      {intel.openOrdersWithSameSpec.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: c.warning }}>
            Consider combining production runs
          </div>
          {intel.openOrdersWithSameSpec.map((oo, i) => (
            <div key={i} style={{ color: c.textMuted, fontSize: '0.78rem' }}>
              {oo.orderNumber} — {oo.customerName} — {oo.quantity} qty
            </div>
          ))}
        </div>
      )}

      {intel.equipmentCapability.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Equipment Capability</div>
          {intel.equipmentCapability.length === 1 && (
            <div style={{ background: c.warningMuted, border: `1px solid ${c.warning}`, borderRadius: 4, padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: c.warning }}>
              WARNING: Only {intel.equipmentCapability[0].name} can run this
            </div>
          )}
          {intel.equipmentCapability.map((eq, i) => (
            <div key={i} style={{ color: c.textMuted, fontSize: '0.78rem' }}>
              {eq.name} — max {eq.maxSheetWidth}" — {eq.location}
            </div>
          ))}
        </div>
      )}

      {intel.materialAvailability && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Material Availability</div>
          <div style={{ fontSize: '0.78rem' }}>
            <div>{intel.materialAvailability.boardGrade} {intel.materialAvailability.flute}-Flute</div>
            <div>On hand: {intel.materialAvailability.onHand}</div>
            <div>Committed: {intel.materialAvailability.committed}</div>
            <div style={{ fontWeight: 600, color: intel.materialAvailability.available > 0 ? c.success : c.danger }}>
              Available: {intel.materialAvailability.available}
            </div>
          </div>
        </div>
      )}

      {intel.otherCustomers.length === 0 && intel.equipmentCapability.length === 0 && !intel.materialAvailability && (
        <div style={{ color: c.textMuted }}>No spec intelligence available</div>
      )}
    </div>
  );
}

function MarginSummary({ items, statedPrice }: { items: QuoteLine[]; statedPrice: string | null }) {
  const withMargin = items.filter(i => i.totalCostPerM && i.unitPrice);

  if (withMargin.length === 0) return <div style={{ color: c.textMuted, fontSize: '0.82rem' }}>Enter cost data on line items to see margin</div>;

  return (
    <div style={{ fontSize: '0.82rem' }}>
      {withMargin.map(item => {
        const cost = parseFloat(item.totalCostPerM!);
        const price = parseFloat(item.unitPrice);
        const marginDollar = price - cost;
        const marginPct = price > 0 ? (marginDollar / price) * 100 : 0;
        const qty = parseFloat(item.quantity);
        const totalMargin = marginDollar * qty / 1000; // per M conversion

        return (
          <div key={item.id} style={{ borderBottom: `1px solid ${c.divider}`, paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Line {item.lineNumber}: {item.description}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: '0.78rem' }}>
              <div style={{ color: c.textMuted }}>Material/M:</div><div>{fmtCurrency(item.materialCostPerM)}</div>
              <div style={{ color: c.textMuted }}>BOM/M:</div><div>{fmtCurrency(item.bomCostPerM)}</div>
              <div style={{ color: c.textMuted }}>Total Cost/M:</div><div style={{ fontWeight: 600 }}>{fmtCurrency(cost)}</div>
              <div style={{ color: c.textMuted }}>Sell Price/M:</div><div>{fmtCurrency(price)}</div>
              <div style={{ color: c.textMuted }}>Margin $/M:</div><div style={{ color: marginColor(marginPct) }}>{fmtCurrency(marginDollar)}</div>
              <div style={{ color: c.textMuted }}>Margin %:</div>
              <div style={{ color: marginColor(marginPct), fontWeight: 700 }}>{marginPct.toFixed(1)}%</div>
              <div style={{ color: c.textMuted }}>Total Margin:</div><div>{fmtCurrency(totalMargin)}</div>
            </div>
            {statedPrice && (
              <div style={{ marginTop: 4, fontSize: '0.75rem' }}>
                <span style={{ color: c.textMuted }}>Price gap vs stated:</span>{' '}
                <span style={{ fontWeight: 600, color: price > parseFloat(statedPrice) ? c.danger : c.success }}>
                  {fmtCurrency(price - parseFloat(statedPrice))}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtCurrencyLocal(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PdfPreview({ data }: { data: any }) {
  return (
    <div style={{
      background: '#fff', color: '#111', borderRadius: 8, padding: '40px 50px',
      fontFamily: "'Segoe UI', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1a2e' }}>{data.companyName}</div>
          <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>Your Corrugated Packaging Partner</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.05em' }}>{data.title}</div>
          <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
            <div>Quote #: {data.quoteNumber}</div>
            <div>Date: {data.date}</div>
            <div>Valid Until: {data.validUntil}</div>
            {data.salesRep !== 'N/A' && <div>Sales Rep: {data.salesRep}</div>}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>BILL TO</div>
        <div style={{ fontWeight: 600 }}>{data.billTo.name}</div>
        {data.billTo.street && <div style={{ fontSize: '0.88rem', color: '#555' }}>{data.billTo.street}</div>}
        {(data.billTo.city || data.billTo.state) && (
          <div style={{ fontSize: '0.88rem', color: '#555' }}>{[data.billTo.city, data.billTo.state, data.billTo.zip].filter(Boolean).join(', ')}</div>
        )}
      </div>

      {/* Line items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #3b82f6' }}>
            {['Item', 'Description', 'Qty', 'Unit', 'Unit Price', 'Extended'].map(h =>
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Qty' || h === 'Unit Price' || h === 'Extended' ? 'right' : 'left', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line: any) => (
            <tr key={line.lineNumber} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem' }}>{line.lineNumber}</td>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem' }}>
                <div>{line.description}</div>
                {line.boardGrade && <div style={{ fontSize: '0.75rem', color: '#888' }}>{line.boardGrade}</div>}
                {(line.altQty1 || line.altQty2 || line.altQty3) && (
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: 2 }}>
                    Qty breaks: {[
                      line.altQty1 && `${line.altQty1.toLocaleString()} @ ${fmtCurrencyLocal(line.altPrice1)}`,
                      line.altQty2 && `${line.altQty2.toLocaleString()} @ ${fmtCurrencyLocal(line.altPrice2)}`,
                      line.altQty3 && `${line.altQty3.toLocaleString()} @ ${fmtCurrencyLocal(line.altPrice3)}`,
                    ].filter(Boolean).join(' | ')}
                  </div>
                )}
                {line.notes && <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: 2 }}>{line.notes}</div>}
              </td>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem', textAlign: 'right' }}>{line.quantity.toLocaleString()}</td>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem' }}>{line.unit}</td>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem', textAlign: 'right' }}>{fmtCurrencyLocal(line.unitPrice)}</td>
              <td style={{ padding: '10px 10px', fontSize: '0.88rem', textAlign: 'right', fontWeight: 600 }}>{fmtCurrencyLocal(line.extendedPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Subtotal */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: 250, borderTop: '2px solid #1a1a2e', paddingTop: 8, textAlign: 'right' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>Subtotal: {fmtCurrencyLocal(data.subtotal)}</span>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>NOTES</div>
          <div style={{ fontSize: '0.88rem', color: '#555', whiteSpace: 'pre-wrap' }}>{data.notes}</div>
        </div>
      )}

      {/* Terms */}
      <div style={{ fontSize: '0.78rem', color: '#888', borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 600, color: '#555', marginBottom: 4 }}>Terms & Conditions</div>
        <div>{data.terms}</div>
      </div>

      {/* Signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40 }}>
        <div>
          <div style={{ borderBottom: '1px solid #ccc', marginBottom: 4, height: 30 }} />
          <div style={{ fontSize: '0.75rem', color: '#888' }}>Customer Signature</div>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid #ccc', marginBottom: 4, height: 30 }} />
          <div style={{ fontSize: '0.75rem', color: '#888' }}>Date</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30, fontSize: '0.82rem', color: '#94a3b8' }}>
        Thank you for your business
      </div>
    </div>
  );
}

