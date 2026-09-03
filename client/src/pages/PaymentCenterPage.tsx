import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Search, FileText, CheckCircle, Clock, Plus, X, Upload, ImageIcon, Zap, Loader2, Building2, Calendar } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

interface CombinedInvoice {
  invoiceNumber: string;
  registeredName: string;
  totalAmount_Due: number;
  status: 'UNPAID' | 'PENDING_VALIDATION' | 'PAID' | 'APPROVED';
  date?: string;
  items?: Array<{ description: string; qty: number; price: number }>;
  paymentId?: number;
  paymentMethod?: string;
  paymentRef?: string;
  proofImageUrl?: string;
  poDocumentUrl?: string;
  invoiceDocumentUrl?: string;
  paymentDate?: string;
}

function getInvoiceAging(dateStr?: string, status?: string) {
  if (status === 'PAID') {
    return { days: 0, text: 'Settled', badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' };
  }
  if (!dateStr) {
    return { days: 0, text: 'Current', badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700' };
  }
  const dateObj = new Date(dateStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - dateObj.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 7) {
    return { days, text: `${days} Days (Current)`, badgeClass: 'bg-slate-800 text-slate-200 border border-slate-700' };
  } else if (days <= 30) {
    return { days, text: `${days} Days Aged`, badgeClass: 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-bold' };
  } else {
    return { days, text: `OVERDUE (${days} Days)`, badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30 font-black' };
  }
}

export default function PaymentCenterPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<CombinedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PENDING_VALIDATION' | 'PAID'>('UNPAID');
  
  // Client's own company name from session (defaults to assigned account)
  const clientCompanyName = user?.companyName || 'PH GLOBAL JET EXPRESS INC.';

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<CombinedInvoice | null>(null);

  // Modal Form State (Payment Submission)
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [paymentRef, setPaymentRef] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Document Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; title: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch POS Vault Invoices
      const posRes = await fetch('/api/pos/vault-invoices');
      const posInvoices = posRes.ok ? await posRes.json() : [];

      // 2. Fetch Payment Logs
      const payRes = await fetch('/api/payments/list');
      const payLogs = payRes.ok ? await payRes.json() : [];

      // Create lookup map of payments by normalized invoice number
      const payMap = new Map<string, any>();
      payLogs.forEach((p: any) => {
        const key = String(p.invoice_number || '').trim().replace(/^INV-/i, '').toLowerCase();
        payMap.set(key, p);
      });

      // Combine into unified invoice array
      const combined: CombinedInvoice[] = [];

      posInvoices.forEach((inv: any) => {
        const invNum = String(inv.invoiceNumber || '').trim();
        const regName = String(inv.registeredName || '').trim();

        // Skip non-invoices without proper invoice numbers or generic cash slips
        if (!invNum || invNum.toUpperCase() === 'NO RECEIPT' || invNum.toUpperCase() === 'NO INVOICE') {
          return;
        }

        const key = invNum.replace(/^INV-/i, '').toLowerCase();
        const payment = payMap.get(key);

        let finalStatus: CombinedInvoice['status'] = 'UNPAID';
        if (inv.status === 'PAID' || payment?.status === 'APPROVED' || payment?.status === 'Completed') {
          finalStatus = 'PAID';
        } else if (payment && payment.status === 'PENDING_VALIDATION') {
          finalStatus = 'PENDING_VALIDATION';
        }

        combined.push({
          invoiceNumber: inv.invoiceNumber.startsWith('INV-') ? inv.invoiceNumber : `INV-${inv.invoiceNumber}`,
          registeredName: regName || 'Client Account',
          totalAmount_Due: Number(inv.totalAmount_Due || 0),
          status: finalStatus,
          date: inv.date || new Date().toISOString(),
          items: inv.items || [],
          paymentId: payment?.id,
          paymentMethod: payment?.payment_method || inv.payment_method,
          paymentRef: payment?.reference_number || inv.paymentRef,
          proofImageUrl: payment?.proof_image_url || inv.proof_image_url,
          poDocumentUrl: inv.po_document_url || payment?.po_document_url,
          invoiceDocumentUrl: inv.invoice_document_url || payment?.invoice_document_url,
          paymentDate: payment?.payment_date || inv.paymentDate,
        });
      });

      // Also append any payment logs that were not in POS vault
      payLogs.forEach((p: any) => {
        const key = String(p.invoice_number || '').trim().replace(/^INV-/i, '').toLowerCase();
        const exists = combined.some(c => String(c.invoiceNumber).trim().replace(/^INV-/i, '').toLowerCase() === key);
        if (!exists) {
          combined.unshift({
            invoiceNumber: p.invoice_number.startsWith('INV-') ? p.invoice_number : `INV-${p.invoice_number}`,
            registeredName: p.customer_name || clientCompanyName,
            totalAmount_Due: Number(p.amount || 0),
            status: p.status === 'APPROVED' || p.status === 'Completed' ? 'PAID' : 'PENDING_VALIDATION',
            date: p.payment_date || new Date().toISOString(),
            paymentId: p.id,
            paymentMethod: p.payment_method,
            paymentRef: p.reference_number,
            proofImageUrl: p.proof_image_url,
            poDocumentUrl: p.po_document_url,
            invoiceDocumentUrl: p.invoice_document_url,
            paymentDate: p.payment_date,
          });
        }
      });

      setInvoices(combined);
    } catch (err) {
      console.error('Failed to load combined invoice ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (inv: CombinedInvoice) => {
    setSelectedInvoice(inv);
    setAmountPaid(String(inv.totalAmount_Due));
    setPaymentRef(inv.paymentRef || '');
    setPaymentMethod(inv.paymentMethod || 'GCash');
    setProofFile(null);
    setProofPreviewUrl(inv.proofImageUrl || null);
    setSubmitMessage(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!paymentRef.trim()) {
      return setSubmitMessage({ type: 'error', text: 'Please provide the transaction Reference / Receipt ID.' });
    }

    setSubmittingPayment(true);
    setSubmitMessage(null);

    try {
      let uploadedProofUrl = selectedInvoice.proofImageUrl || '';

      if (proofFile) {
        const formData = new FormData();
        formData.append('proof', proofFile);
        const uploadRes = await fetch('/api/upload/payment-proof', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedProofUrl = uploadData.imageUrl || '';
        }
      }

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: selectedInvoice.invoiceNumber,
          customer_name: selectedInvoice.registeredName,
          amount: parseFloat(amountPaid) || selectedInvoice.totalAmount_Due,
          payment_method: paymentMethod,
          reference_number: paymentRef.trim(),
          proof_image_url: uploadedProofUrl || null,
        }),
      });

      if (res.ok) {
        setSubmitMessage({ type: 'success', text: 'Proof of payment submitted! Status updated to PENDING VALIDATION.' });
        loadData();
        setSelectedInvoice({
          ...selectedInvoice,
          status: 'PENDING_VALIDATION',
          paymentMethod,
          paymentRef,
          proofImageUrl: uploadedProofUrl,
        });
      } else {
        const errData = await res.json();
        setSubmitMessage({ type: 'error', text: errData.message || 'Failed to submit payment.' });
      }
    } catch (err) {
      setSubmitMessage({ type: 'error', text: 'Connection refused. Is the server running?' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Strictly filter invoices for the logged-in client's company
  const companyInvoices = invoices.filter(inv => {
    if (!clientCompanyName) return true;
    return inv.registeredName.toLowerCase().includes(clientCompanyName.toLowerCase());
  });

  // Fallback to all valid company invoices if companyInvoices array is empty during demo
  const displayInvoicesList = companyInvoices.length > 0 ? companyInvoices : invoices;

  // Apply status & search query filtering
  const filteredInvoices = displayInvoicesList.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.paymentRef && inv.paymentRef.toLowerCase().includes(q));

    if (statusFilter === 'UNPAID') return matchesSearch && inv.status === 'UNPAID';
    if (statusFilter === 'PENDING_VALIDATION') return matchesSearch && inv.status === 'PENDING_VALIDATION';
    if (statusFilter === 'PAID') return matchesSearch && inv.status === 'PAID';
    return matchesSearch;
  });

  const unpaidCount = displayInvoicesList.filter(i => i.status === 'UNPAID').length;
  const pendingCount = displayInvoicesList.filter(i => i.status === 'PENDING_VALIDATION').length;
  const paidCount = displayInvoicesList.filter(i => i.status === 'PAID').length;
  const totalUnpaidBalance = displayInvoicesList
    .filter(i => i.status === 'UNPAID')
    .reduce((sum, inv) => sum + Number(inv.totalAmount_Due || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono text-xs selection:bg-yellow-400 selection:text-slate-950 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
              <span className="text-yellow-400 text-3xl">💳</span> MY INVOICES & PAYMENTS
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-400">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-yellow-400" />
                <span>Company Account:</span>
                <span className="font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-xl">
                  {user?.companyName || clientCompanyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Total Outstanding Balance:</span>
                <span className="font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-xl text-sm">
                  ₱{totalUnpaidBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <Link href="/portal" className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-yellow-400 text-slate-300 hover:text-yellow-400 rounded-xl transition-all">
            ← Client Hub
          </Link>
        </header>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-2xl">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-yellow-400 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Invoices ({companyInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'UNPAID' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unpaid ({unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_VALIDATION')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'PENDING_VALIDATION' ? 'bg-blue-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'PAID' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ✓ Paid ({paidCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Master Invoice Table */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Date Issued</th>
                  <th className="p-4">Days Aged</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Docs Attached</th>
                  <th className="p-4 text-right">Amount Due</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-yellow-400 animate-pulse font-mono">
                      Loading invoice records for {clientCompanyName}...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 italic">
                      No invoices found for {clientCompanyName}.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const aging = getInvoiceAging(inv.date, inv.status);
                    const formattedDate = inv.date
                      ? new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                      : 'N/A';

                    return (
                      <tr key={inv.invoiceNumber} className="hover:bg-slate-950/60 transition-colors">
                        <td className="p-4 font-black text-white text-sm">{inv.invoiceNumber}</td>
                        <td className="p-4 text-slate-300 font-bold flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {formattedDate}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase ${aging.badgeClass}`}>
                            {aging.text}
                          </span>
                        </td>
                        <td className="p-4">
                          {inv.status === 'PAID' ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ PAID & SETTLED
                            </span>
                          ) : inv.status === 'PENDING_VALIDATION' ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                              ⏳ PENDING VALIDATION
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              UNPAID
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {inv.poDocumentUrl && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                                📋 P.O.
                              </span>
                            )}
                            {inv.proofImageUrl && (
                              <span className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 rounded text-[10px] font-bold">
                                📸 Proof
                              </span>
                            )}
                            {!inv.poDocumentUrl && !inv.proofImageUrl && (
                              <span className="text-slate-600 italic text-[11px]">- None -</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right font-black text-yellow-400 text-sm">
                          ₱{Number(inv.totalAmount_Due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenModal(inv)}
                            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-400/20 cursor-pointer"
                          >
                            View Details & Pay →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════ SINGLE INVOICE DETAIL & PAYMENT MODAL ════ */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 font-mono">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    INVOICE #{selectedInvoice.invoiceNumber}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                    selectedInvoice.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : selectedInvoice.status === 'PENDING_VALIDATION'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">Account: <span className="text-white font-bold">{selectedInvoice.registeredName}</span></p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-6 my-4 pr-1">
              
              {/* SECTION 1: INVOICE BREAKDOWN & ITEMS */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-400" /> Sales Invoice Breakdown
                  </h3>
                  <span className="text-yellow-400 font-black text-base">
                    Total: ₱{Number(selectedInvoice.totalAmount_Due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-300 py-1 border-b border-slate-900">
                        <span>{item.description} (x{item.qty})</span>
                        <span className="font-bold text-slate-100">₱{Number(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">Standard part order invoice.</p>
                )}
              </div>

              {/* SECTION 2: SIDE-BY-SIDE STAFF ATTACHED DOCUMENTS (P.O. & SALES INVOICE PHOTO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Card: Purchase Order (P.O.) */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-emerald-400" /> 📋 Attached Purchase Order (P.O.)
                    </h3>
                    {selectedInvoice.poDocumentUrl ? (
                      <div
                        onClick={() => setLightboxUrl({ url: selectedInvoice.poDocumentUrl!, title: `Purchase Order - Invoice #${selectedInvoice.invoiceNumber}` })}
                        className="relative h-32 w-full rounded-xl border border-slate-800 overflow-hidden bg-black/60 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors group"
                      >
                        <img src={selectedInvoice.poDocumentUrl} alt="P.O. Document" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-400 font-bold text-xs transition-opacity">
                          ↗ Expand P.O.
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 italic text-[11px] text-center p-2 bg-slate-900/40">
                        <span>📋 No P.O. document attached by staff yet.</span>
                      </div>
                    )}
                  </div>
                  {selectedInvoice.poDocumentUrl && (
                    <button
                      onClick={() => setLightboxUrl({ url: selectedInvoice.poDocumentUrl!, title: `Purchase Order - Invoice #${selectedInvoice.invoiceNumber}` })}
                      className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-xs uppercase transition-colors"
                    >
                      View Full P.O. ↗
                    </button>
                  )}
                </div>

                {/* Right Card: Sales Invoice Photo / Billing Document */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-400" /> 🧾 Attached Sales Invoice Photo
                    </h3>
                    {selectedInvoice.invoiceDocumentUrl ? (
                      <div
                        onClick={() => setLightboxUrl({ url: selectedInvoice.invoiceDocumentUrl!, title: `Sales Invoice - Invoice #${selectedInvoice.invoiceNumber}` })}
                        className="relative h-32 w-full rounded-xl border border-slate-800 overflow-hidden bg-black/60 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors group"
                      >
                        <img src={selectedInvoice.invoiceDocumentUrl} alt="Sales Invoice Document" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-blue-400 font-bold text-xs transition-opacity">
                          ↗ Expand Invoice
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 italic text-[11px] text-center p-2 bg-slate-900/40">
                        <span>🧾 No Sales Invoice photo attached by staff yet.</span>
                      </div>
                    )}
                  </div>
                  {selectedInvoice.invoiceDocumentUrl && (
                    <button
                      onClick={() => setLightboxUrl({ url: selectedInvoice.invoiceDocumentUrl!, title: `Sales Invoice - Invoice #${selectedInvoice.invoiceNumber}` })}
                      className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl font-bold text-xs uppercase transition-colors"
                    >
                      View Full Invoice Photo ↗
                    </button>
                  )}
                </div>

              </div>

              {/* SECTION 3: PROOF OF PAYMENT UPLOAD BOX ([ + ADD PROOF OF PAYMENT ]) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2">
                  <Upload className="h-4 w-4 text-yellow-400" /> Proof of Payment
                </h3>

                {submitMessage && (
                  <div className={`p-3 rounded-xl text-xs ${
                    submitMessage.type === 'success' ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-400' : 'bg-red-950/50 border border-red-800 text-red-400'
                  }`}>
                    {submitMessage.text}
                  </div>
                )}

                {/* Proof Image Display or Upload Dropzone */}
                {proofPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="relative h-56 w-full rounded-2xl border border-slate-800 overflow-hidden bg-black/60 flex items-center justify-center p-2">
                      <img
                        src={proofPreviewUrl}
                        alt="Proof of Payment"
                        className="max-h-full max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setLightboxUrl({ url: proofPreviewUrl, title: `Proof Photo - Invoice #${selectedInvoice.invoiceNumber}` })}
                      />
                    </div>
                    {selectedInvoice.status !== 'PAID' && (
                      <label className="block text-center text-xs font-bold text-yellow-400 hover:underline cursor-pointer">
                        Change / Re-upload Proof Screenshot
                        <input type="file" onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                      </label>
                    )}
                  </div>
                ) : (
                  /* LARGE PLUS BOX FOR UPLOADING PROOF OF PAYMENT */
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 hover:border-yellow-400 rounded-2xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-yellow-400 transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 group-hover:border-yellow-400 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                      <Plus className="h-7 w-7 text-yellow-400" />
                    </div>
                    <span className="font-black text-sm text-white group-hover:text-yellow-400 uppercase tracking-wider">
                      Add Proof of Payment
                    </span>
                    <span className="text-slate-500 text-[11px] mt-1">
                      Click to upload GCash or Bank Transfer receipt screenshot
                    </span>
                    <input type="file" onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                  </label>
                )}

                {/* Form fields for submitting payment */}
                {selectedInvoice.status !== 'PAID' && (
                  <form onSubmit={handlePostPayment} className="space-y-4 pt-2 border-t border-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase mb-1">Payment Mode</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-yellow-400 outline-none"
                        >
                          <option value="GCash">GCash Transfer</option>
                          <option value="Bank Transfer">Bank Wire Transfer</option>
                          <option value="Check">Check Payment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase mb-1">Reference / Transaction ID <span className="text-yellow-400">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5009823189"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-yellow-400 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submittingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Proof...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 fill-slate-950" />
                          Submit Proof of Payment
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Logged Payment Status Footer */}
                {selectedInvoice.paymentRef && (
                  <div className="pt-2 border-t border-slate-900 flex justify-between text-slate-400 text-[11px]">
                    <span>Mode: <strong className="text-white">{selectedInvoice.paymentMethod}</strong></span>
                    <span>Ref ID: <strong className="text-white">{selectedInvoice.paymentRef}</strong></span>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl font-bold uppercase text-xs transition-colors"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Viewer */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">{lightboxUrl.title}</h3>
              <button onClick={() => setLightboxUrl(null)} className="text-slate-400 hover:text-white font-bold p-2 bg-slate-950 rounded-lg">✕</button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-950 rounded-xl border border-slate-800">
              <img src={lightboxUrl.url} alt={lightboxUrl.title} className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
