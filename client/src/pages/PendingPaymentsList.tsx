import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CreditCard, CheckCircle, Clock, Search, RefreshCw, FileText, Image as ImageIcon, Zap, Loader2, X, Calendar, Building, Eye, Upload, Check, Trash2 } from "lucide-react";
import { PendingPayment, NotificationCenter } from "@/components/NotificationCenter";
import { ValidatePaymentModal } from "@/components/ValidatePaymentModal";
import { useToast } from "@/hooks/use-toast";

interface PosInvoiceItem {
  partNumber?: string;
  name?: string;
  description?: string;
  qty?: number;
  price?: number;
  total?: number;
}

interface PosInvoice {
  invoiceNumber: string;
  registeredName?: string;
  date?: string;
  status?: string; // 'UNPAID', 'PENDING_VALIDATION', 'PAID'
  totalAmount_Due?: number | string;
  poDocumentUrl?: string;
  invoiceDocumentUrl?: string;
  proofImageUrl?: string;
  items?: PosInvoiceItem[];
}

export default function PendingPaymentsList() {
  const { toast } = useToast();
  const [activeMainTab, setActiveMainTab] = useState<"INVOICES_VAULT" | "PAYMENTS_QUEUE">("INVOICES_VAULT");
  
  // Submitted payment verifications state
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchPayments, setSearchPayments] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"ALL" | "PENDING_VALIDATION" | "APPROVED">("PENDING_VALIDATION");
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);

  // Master Client Invoices Vault state
  const [companies, setCompanies] = useState<any[]>([]);
  const [posCustomers, setPosCustomers] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("PH GLOBAL JET EXPRESS INC.");
  const [invoices, setInvoices] = useState<PosInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"ALL" | "UNPAID" | "PENDING_VALIDATION" | "PAID">("UNPAID");
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState("");

  // Modals for Invoices Vault
  const [docModalInvoice, setDocModalInvoice] = useState<PosInvoice | null>(null);
  const [detailModalInvoice, setDetailModalInvoice] = useState<PosInvoice | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchPayments();
    fetchCompaniesAndCustomers();
  }, []);

  // Fetch Invoices whenever selected company changes
  useEffect(() => {
    fetchInvoicesForCompany(selectedCompanyId);
  }, [selectedCompanyId]);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/payments/list");
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (e) {
      console.error("Failed to load payments list:", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchCompaniesAndCustomers = async () => {
    try {
      const [compRes, custRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/pos/customers")
      ]);
      const compData = compRes.ok ? await compRes.json() : [];
      const custData = custRes.ok ? await custRes.json() : [];
      setCompanies(compData);
      setPosCustomers(custData);
    } catch (e) {
      console.error("Failed to load companies:", e);
    }
  };

  const fetchInvoicesForCompany = async (companyName: string) => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/pos/vault-invoices?registeredName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error("Failed to fetch vault invoices:", e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Unified Company List for Dropdown
  const companyList = useMemo(() => {
    const map = new Map<string, string>();
    map.set("ph global jet express inc.", "PH GLOBAL JET EXPRESS INC.");
    map.set("truckgear philippines co.", "TruckGear Philippines Co. (Primary Staff)");

    for (const c of companies) {
      if (c.name && !map.has(c.name.toLowerCase())) {
        map.set(c.name.toLowerCase(), c.name);
      }
    }
    for (const pc of posCustomers) {
      const pName = (pc.name || pc.registeredName || pc.company || "").trim();
      if (pName && pName.toUpperCase() !== "CASH PAYMENT" && pName.toUpperCase() !== "WALK-IN CUSTOMER" && !map.has(pName.toLowerCase())) {
        map.set(pName.toLowerCase(), pName);
      }
    }
    return Array.from(map.values());
  }, [companies, posCustomers]);

  // Master Invoices Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchInvoiceQuery.toLowerCase()) ||
        (inv.registeredName || "").toLowerCase().includes(searchInvoiceQuery.toLowerCase());

      if (invoiceStatusFilter === "UNPAID") {
        return matchesSearch && (inv.status === "UNPAID" || !inv.status);
      }
      if (invoiceStatusFilter === "PENDING_VALIDATION") {
        return matchesSearch && inv.status === "PENDING_VALIDATION";
      }
      if (invoiceStatusFilter === "PAID") {
        return matchesSearch && inv.status === "PAID";
      }
      return matchesSearch;
    });
  }, [invoices, invoiceStatusFilter, searchInvoiceQuery]);

  // Invoice Counts
  const unpaidCount = invoices.filter((i) => i.status === "UNPAID" || !i.status).length;
  const pendingInvCount = invoices.filter((i) => i.status === "PENDING_VALIDATION").length;
  const paidCount = invoices.filter((i) => i.status === "PAID").length;

  const totalUnpaidAmount = invoices
    .filter((i) => i.status === "UNPAID" || !i.status)
    .reduce((sum, i) => sum + Number(i.totalAmount_Due || 0), 0);

  // Submitted Payments Filtering
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchPayments.toLowerCase()) ||
      p.reference_number.toLowerCase().includes(searchPayments.toLowerCase()) ||
      p.payment_method.toLowerCase().includes(searchPayments.toLowerCase());

    if (filterPaymentStatus === "PENDING_VALIDATION") {
      return matchesSearch && p.status === "PENDING_VALIDATION";
    }
    if (filterPaymentStatus === "APPROVED") {
      return matchesSearch && (p.status === "APPROVED" || p.status === "Completed");
    }
    return matchesSearch;
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING_VALIDATION").length;
  const pendingTotal = payments
    .filter((p) => p.status === "PENDING_VALIDATION")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const approvedTotal = payments
    .filter((p) => p.status === "APPROVED" || p.status === "Completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Helper for invoice aging calculation
  const getInvoiceAging = (dateStr?: string, status?: string) => {
    if (status === "PAID") return { text: "SETTLED", badgeClass: "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30" };
    if (!dateStr) return { text: "CURRENT", badgeClass: "bg-slate-800 text-slate-400 font-bold" };
    const invDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - invDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 5) {
      return { text: `${diffDays} DAYS (CURRENT)`, badgeClass: "bg-slate-800 text-slate-300 font-bold border border-slate-700" };
    }
    return { text: `${diffDays} DAYS AGED`, badgeClass: "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 font-mono" };
  };

  const handleMarkPaid = async (inv: PosInvoice) => {
    if (!confirm(`Are you sure you want to mark Invoice #${inv.invoiceNumber} as PAID & SETTLED?`)) return;
    try {
      const res = await fetch(`/api/invoices/${inv.invoiceNumber}/mark-paid`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Invoice Marked Paid", description: `Invoice #${inv.invoiceNumber} status set to PAID.` });
        fetchInvoicesForCompany(selectedCompanyId);
      } else {
        toast({ title: "Update Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Sidebar />

      <main className="flex-1 pl-64 p-8 space-y-6">
        {/* Top Header Bar */}
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase flex items-center gap-3 text-white">
              <CreditCard className="h-7 w-7 text-yellow-400" />
              Client Payments Verification & Invoice Manager
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Categorized client invoice vault, P.O. & S.I. document uploader, & payment verification queue
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                fetchPayments();
                fetchInvoicesForCompany(selectedCompanyId);
              }}
              className="p-2.5 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors text-slate-400 hover:text-yellow-400"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Main Section Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 font-mono">
          <button
            onClick={() => setActiveMainTab("INVOICES_VAULT")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "INVOICES_VAULT"
                ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            📋 Master Client Invoices & Document Vault
          </button>

          <button
            onClick={() => setActiveMainTab("PAYMENTS_QUEUE")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "PAYMENTS_QUEUE"
                ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            💳 Submitted Payment Verifications ({pendingCount})
          </button>
        </div>

        {/* ════════ TAB 1: MASTER CLIENT INVOICES & DOCUMENT VAULT ════════ */}
        {activeMainTab === "INVOICES_VAULT" && (
          <div className="space-y-6">
            {/* Client Company Selector Bar */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <Building className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Client Company:
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:border-yellow-400 outline-none"
                  >
                    {companyList.map((compName) => (
                      <option key={compName} value={compName}>
                        {compName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Metrics Badges */}
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-right">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Unpaid Balance</span>
                  <span className="text-sm font-black text-amber-400">
                    ₱{totalUnpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-right">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Open Invoices</span>
                  <span className="text-sm font-black text-yellow-400">{unpaidCount}</span>
                </div>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-right">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Settled Invoices</span>
                  <span className="text-sm font-black text-emerald-400">{paidCount}</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 font-mono">
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  onClick={() => setInvoiceStatusFilter("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === "ALL" ? "bg-slate-800 text-white font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Invoices ({invoices.length})
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter("UNPAID")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === "UNPAID" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Unpaid ({unpaidCount})
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter("PENDING_VALIDATION")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === "PENDING_VALIDATION" ? "bg-blue-500 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pending ({pendingInvCount})
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter("PAID")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === "PAID" ? "bg-emerald-500 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  ✓ Paid ({paidCount})
                </button>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Invoice #..."
                  value={searchInvoiceQuery}
                  onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* Master Invoices Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 shadow-2xl font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Client Name</th>
                      <th className="p-4">Date Issued</th>
                      <th className="p-4">Days Aged</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Docs Attached</th>
                      <th className="p-4 text-right">Amount Due</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {loadingInvoices ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-yellow-400 animate-pulse font-mono">
                          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                          Loading invoice vault records for {selectedCompanyId}...
                        </td>
                      </tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500 italic">
                          No invoices found for {selectedCompanyId}.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const aging = getInvoiceAging(inv.date, inv.status);
                        const formattedDate = inv.date
                          ? new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                          : "N/A";

                        return (
                          <tr key={inv.invoiceNumber} className="hover:bg-slate-950/60 transition-colors">
                            <td className="p-4 font-black text-white text-sm">{inv.invoiceNumber}</td>
                            <td className="p-4 font-bold text-slate-300 max-w-[200px] truncate" title={inv.registeredName || selectedCompanyId}>
                              {inv.registeredName || selectedCompanyId}
                            </td>
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
                              {inv.status === "PAID" ? (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  ✓ PAID & SETTLED
                                </span>
                              ) : inv.status === "PENDING_VALIDATION" ? (
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
                              <div className="flex items-center gap-1.5">
                                {inv.poDocumentUrl ? (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                                    📋 PO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-600 rounded text-[10px]">
                                    PO
                                  </span>
                                )}
                                {inv.invoiceDocumentUrl ? (
                                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] font-bold">
                                    🧾 SI
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-600 rounded text-[10px]">
                                    SI
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right font-black text-yellow-400 text-sm">
                              ₱{Number(inv.totalAmount_Due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setDocModalInvoice(inv)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold rounded-xl text-[11px] border border-slate-700 transition-all inline-flex items-center gap-1 cursor-pointer"
                                  title="Attach P.O. / Sales Invoice scan"
                                >
                                  <Upload className="h-3 w-3 text-yellow-400" />
                                  Attach P.O. / S.I.
                                </button>

                                <button
                                  onClick={() => setDetailModalInvoice(inv)}
                                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-[11px] transition-all shadow-md shadow-yellow-400/20 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Details
                                </button>

                                {inv.status !== "PAID" && (
                                  <button
                                    onClick={() => handleMarkPaid(inv)}
                                    className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl text-[11px] border border-emerald-500/30 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Mark Invoice as Paid"
                                  >
                                    <Check className="h-3 w-3" />
                                    Mark Paid
                                  </button>
                                )}
                              </div>
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
        )}

        {/* ════════ TAB 2: SUBMITTED PAYMENT VERIFICATIONS ════════ */}
        {activeMainTab === "PAYMENTS_QUEUE" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
              <div className="p-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-yellow-400 uppercase tracking-wider font-bold">
                  <span>Pending Verification</span>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="text-3xl font-extrabold text-yellow-400">
                  {pendingCount}
                </p>
                <p className="text-xs text-slate-400">
                  Total Pending: ₱{pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-emerald-500 uppercase tracking-wider font-bold">
                  <span>Verified & Paid</span>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-extrabold text-emerald-500">
                  ₱{approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400">
                  Updated live in truckgear-os POS vault
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                  <span>Total Transactions</span>
                  <FileText className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">
                  {payments.length}
                </p>
                <p className="text-xs text-slate-400">
                  All payment submissions
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 font-mono">
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  onClick={() => setFilterPaymentStatus("PENDING_VALIDATION")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterPaymentStatus === "PENDING_VALIDATION"
                      ? "bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setFilterPaymentStatus("APPROVED")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterPaymentStatus === "APPROVED"
                      ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ✓ Verified & Paid
                </button>
                <button
                  onClick={() => setFilterPaymentStatus("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterPaymentStatus === "ALL"
                      ? "bg-slate-800 text-white font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Payments ({payments.length})
                </button>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Invoice # or Ref ID..."
                  value={searchPayments}
                  onChange={(e) => setSearchPayments(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* Payments Queue Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 shadow-2xl font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Reference ID</th>
                      <th className="p-4">Proof Photo</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {loadingPayments ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-yellow-400 animate-pulse">
                          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                          Loading payment submission records...
                        </td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500 italic">
                          No payment submissions match filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-950/60 transition-colors">
                          <td className="p-4 font-black text-white text-sm">{p.invoice_number}</td>
                          <td className="p-4 font-bold text-slate-300">
                            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-300">{p.reference_number || "N/A"}</td>
                          <td className="p-4">
                            {p.proof_image_url ? (
                              <a
                                href={p.proof_image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/20 font-bold"
                              >
                                <ImageIcon className="h-3 w-3" />
                                Proof Photo
                              </a>
                            ) : (
                              <span className="text-slate-600 italic">- None -</span>
                            )}
                          </td>
                          <td className="p-4 font-bold">
                            {p.status === "PENDING_VALIDATION" ? (
                              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg uppercase text-[10px]">
                                ⏳ Pending
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg uppercase text-[10px]">
                                ✓ Approved
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 text-[11px]">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-black text-yellow-400 text-sm">
                            ₱{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              className={`px-3 py-1.5 font-black rounded-xl text-[11px] shadow-sm transition-all hover:scale-105 inline-flex items-center gap-1 cursor-pointer ${
                                p.status === "PENDING_VALIDATION"
                                  ? "bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-400/20"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              }`}
                            >
                              <Zap className="h-3 w-3 fill-current" />
                              {p.status === "PENDING_VALIDATION" ? "Verify & Set Paid" : "View Audit"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ Modal 1: Submitted Payment Verification Modal ════ */}
        {selectedPayment && (
          <ValidatePaymentModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onApproved={() => {
              fetchPayments();
              fetchInvoicesForCompany(selectedCompanyId);
            }}
          />
        )}

        {/* ════ Modal 2: Staff Document Upload Modal (P.O. & S.I. Photos) ════ */}
        {docModalInvoice && (
          <StaffDocumentUploadModal
            invoice={docModalInvoice}
            onClose={() => setDocModalInvoice(null)}
            onUpdated={() => fetchInvoicesForCompany(selectedCompanyId)}
          />
        )}

        {/* ════ Modal 3: Side-by-Side Invoice Detail Lightbox Modal ════ */}
        {detailModalInvoice && (
          <StaffInvoiceDetailModal
            invoice={detailModalInvoice}
            clientCompanyName={selectedCompanyId}
            onClose={() => setDetailModalInvoice(null)}
            onUpdated={() => fetchInvoicesForCompany(selectedCompanyId)}
          />
        )}
      </main>
    </div>
  );
}

// ── Staff Document Upload Modal Component ──
function StaffDocumentUploadModal({
  invoice,
  onClose,
  onUpdated,
}: {
  invoice: PosInvoice;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [uploadingPo, setUploadingPo] = useState(false);
  const [uploadingSalesDoc, setUploadingSalesDoc] = useState(false);
  const [poUrl, setPoUrl] = useState<string | null>(invoice.poDocumentUrl || null);
  const [salesDocUrl, setSalesDocUrl] = useState<string | null>(invoice.invoiceDocumentUrl || null);

  const handlePoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPo(true);
    const formData = new FormData();
    formData.append("po_document", file);
    formData.append("invoiceNumber", invoice.invoiceNumber);

    try {
      const res = await fetch("/api/invoices/upload-po", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setPoUrl(data.poDocumentUrl);
        onUpdated();
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingPo(false);
    }
  };

  const handleSalesDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSalesDoc(true);
    const formData = new FormData();
    formData.append("invoice_document", file);
    formData.append("invoiceNumber", invoice.invoiceNumber);

    try {
      const res = await fetch("/api/invoices/upload-invoice-doc", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setSalesDocUrl(data.invoiceDocumentUrl);
        onUpdated();
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingSalesDoc(false);
    }
  };

  const handleDeletePo = async () => {
    if (!confirm(`Are you sure you want to delete the P.O. document for Invoice #${invoice.invoiceNumber}?`)) return;
    try {
      const res = await fetch("/api/invoices/delete-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
      });
      if (res.ok) {
        setPoUrl(null);
        toast({ title: "P.O. Deleted", description: `Purchase Order document removed from Invoice #${invoice.invoiceNumber}.` });
        onUpdated();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleDeleteSalesDoc = async () => {
    if (!confirm(`Are you sure you want to delete the Sales Invoice photo for Invoice #${invoice.invoiceNumber}?`)) return;
    try {
      const res = await fetch("/api/invoices/delete-invoice-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
      });
      if (res.ok) {
        setSalesDocUrl(null);
        toast({ title: "Sales Invoice Photo Deleted", description: `Sales Invoice photo removed from Invoice #${invoice.invoiceNumber}.` });
        onUpdated();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Staff Documents: Invoice #{invoice.invoiceNumber}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Attach or delete documents for the client before payment.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-950 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload Box 1: Purchase Order (P.O.) */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
          <p className="font-bold text-yellow-400 uppercase tracking-wider flex items-center justify-between">
            <span>📋 1. Purchase Order (P.O.) Document</span>
            {poUrl && <span className="text-emerald-400 text-[10px]">✓ Attached</span>}
          </p>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-dashed border-slate-800 hover:border-yellow-400 rounded-xl bg-slate-900 text-slate-300 hover:text-yellow-400 transition-colors cursor-pointer font-bold">
              {uploadingPo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-yellow-400" />}
              <span>{poUrl ? "Replace Attached P.O. File" : "+ Upload P.O. Document (PDF / Photo)"}</span>
              <input type="file" onChange={handlePoUpload} className="hidden" accept="image/*,.pdf" />
            </label>
            {poUrl && (
              <button
                onClick={handleDeletePo}
                className="px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl flex items-center gap-1 font-bold transition-all cursor-pointer"
                title="Delete attached P.O. document"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Upload Box 2: Sales Invoice Photo / Billing Doc */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
          <p className="font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span>🧾 2. Sales Invoice / Billing Photo</span>
            {salesDocUrl && <span className="text-emerald-400 text-[10px]">✓ Attached</span>}
          </p>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-dashed border-slate-800 hover:border-blue-400 rounded-xl bg-slate-900 text-slate-300 hover:text-blue-400 transition-colors cursor-pointer font-bold">
              {uploadingSalesDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-blue-400" />}
              <span>{salesDocUrl ? "Replace Sales Invoice Photo" : "+ Upload Sales Invoice Photo (PDF / Photo)"}</span>
              <input type="file" onChange={handleSalesDocUpload} className="hidden" accept="image/*,.pdf" />
            </label>
            {salesDocUrl && (
              <button
                onClick={handleDeleteSalesDoc}
                className="px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl flex items-center gap-1 font-bold transition-all cursor-pointer"
                title="Delete attached Sales Invoice photo"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl uppercase tracking-wider">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Invoice Detail Modal Component ──
function StaffInvoiceDetailModal({
  invoice,
  clientCompanyName,
  onClose,
  onUpdated,
}: {
  invoice: PosInvoice;
  clientCompanyName: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const poUrl = invoice.poDocumentUrl || invoice.po_document_url;
  const salesDocUrl = invoice.invoiceDocumentUrl || invoice.invoice_document_url || invoice.receipt_image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white">INVOICE #{invoice.invoiceNumber}</span>
              {invoice.status === "PAID" ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                  ✓ PAID & SETTLED
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold">
                  UNPAID
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-1">Client: {invoice.registeredName || clientCompanyName}</p>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-950 rounded-xl text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* Sales Invoice Breakdown */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
            <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
              Sales Invoice Breakdown
            </h4>

            {invoice.items && invoice.items.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 pb-2">
                  <div className="col-span-3">Part #</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-center">Qty x Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-xs py-1.5 border-b border-slate-900/60 items-center">
                    <div className="col-span-3 text-slate-300 font-bold">{item.partNumber || "N/A"}</div>
                    <div className="col-span-5 text-white font-medium">{item.description || item.name}</div>
                    <div className="col-span-2 text-center text-slate-400">
                      {item.qty} × ₱{Number(item.price || 0).toLocaleString()}
                    </div>
                    <div className="col-span-2 text-right font-bold text-yellow-400">
                      ₱{Number(item.total || (item.qty || 1) * (item.price || 0)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic text-xs">Standard auto-parts order items breakdown.</p>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Amount Due</span>
              <span className="text-xl font-black text-yellow-400">
                ₱{Number(invoice.totalAmount_Due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Attached Documents Side-by-Side View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Box: P.O. */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-400 uppercase text-xs">📋 Purchase Order (P.O.)</span>
                {poUrl && <span className="text-[10px] text-emerald-400 font-bold">✓ Attached</span>}
              </div>
              {poUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 max-h-48 flex items-center justify-center">
                    <img src={poUrl} alt="P.O. Document" className="max-h-48 w-full object-contain" />
                  </div>
                  <a
                    href={poUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl font-bold border border-slate-800"
                  >
                    View Full High-Res P.O.
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                  No Purchase Order attached yet.
                </div>
              )}
            </div>

            {/* Right Box: Sales Invoice Scan */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-400 uppercase text-xs">🧾 Sales Invoice Scan</span>
                {salesDocUrl && <span className="text-[10px] text-blue-400 font-bold">✓ Attached</span>}
              </div>
              {salesDocUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 max-h-48 flex items-center justify-center">
                    <img src={salesDocUrl} alt="Sales Invoice Scan" className="max-h-48 w-full object-contain" />
                  </div>
                  <a
                    href={salesDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center py-2 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-xl font-bold border border-slate-800"
                  >
                    View Full High-Res Invoice Scan
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                  No Sales Invoice photo attached yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl uppercase tracking-wider"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
