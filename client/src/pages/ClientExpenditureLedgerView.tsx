import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ExpenditureRecord {
  id: string;
  date: string;
  invoiceId: string;
  drId: string;
  truckPlate: string;
  truckModel: string;
  category: string;
  description: string;
  qty: number;
  amount: number;
  status: "UNPAID / OPEN" | "PAID / VERIFIED";
  company: string;
}

export default function ClientExpenditureLedgerView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.";
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const initialRecords: ExpenditureRecord[] = [
    {
      id: "EXP-2026-901",
      date: "2026-08-21",
      invoiceId: "INV-5808",
      drId: "DR-2026-8801",
      truckPlate: "ABC-1234",
      truckModel: "Isuzu Giga 10-Wheeler Dump Truck",
      category: "Engine & Oil Filtration",
      description: "Fleet Oil Filter Core (10 units) & Radiator Coolant Pre-Mix (5 gallons)",
      qty: 15,
      amount: 187297.50,
      status: "UNPAID / OPEN",
      company: clientCompany
    },
    {
      id: "EXP-2026-895",
      date: "2026-08-20",
      invoiceId: "INV-5805",
      drId: "DR-2026-8794",
      truckPlate: "DEF-5678",
      truckModel: "Fuso Super Great Cargo Hauler",
      category: "Braking Systems",
      description: "Full Performance Rear Brake Pad Sets (4 units) & Alternator Belts (2 units)",
      qty: 6,
      amount: 20500.00,
      status: "UNPAID / OPEN",
      company: clientCompany
    },
    {
      id: "EXP-2026-882",
      date: "2026-08-19",
      invoiceId: "INV-5804",
      drId: "DR-2026-8780",
      truckPlate: "GHI-9012",
      truckModel: "Hino 700 Concrete Mixer Truck",
      category: "Clutch & Transmission",
      description: "Clutch Assembly Kit v2 Heavy Duty (2 units)",
      qty: 2,
      amount: 29000.00,
      status: "UNPAID / OPEN",
      company: clientCompany
    },
    {
      id: "EXP-2026-810",
      date: "2026-07-15",
      invoiceId: "INV-5688",
      drId: "DR-2026-7910",
      truckPlate: "ABC-1234",
      truckModel: "Isuzu Giga 10-Wheeler Dump Truck",
      category: "Suspension & Cabin Shocks",
      description: "Monroe Heavy Duty Cabin Air Suspension Shocks Replacement",
      qty: 4,
      amount: 42000.00,
      status: "PAID / VERIFIED",
      company: clientCompany
    },
    {
      id: "EXP-2026-745",
      date: "2026-06-10",
      invoiceId: "INV-5510",
      drId: "DR-2026-7204",
      truckPlate: "DEF-5678",
      truckModel: "Fuso Super Great Cargo Hauler",
      category: "Engine & Oil Filtration",
      description: "Full Service PM-1 Kit: Oil Filters, Fuel Filters, Air Cleaner Cores",
      qty: 12,
      amount: 38400.00,
      status: "PAID / VERIFIED",
      company: clientCompany
    }
  ];

  const [records, setRecords] = useState<ExpenditureRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  // Form State
  const [newExpForm, setNewExpForm] = useState({
    invoiceId: "INV-5808",
    drId: "DR-2026-8801",
    truckPlate: "ABC-1234",
    truckModel: "Isuzu Giga 10-Wheeler Dump Truck",
    category: "Engine & Oil Filtration",
    description: "Urgent Maintenance Spare Parts Requisition",
    qty: 1,
    amount: 5000
  });

  // Save State to LocalStorage & Server Vault
  const saveRecordsState = (updatedVault: ExpenditureRecord[], targetRec?: ExpenditureRecord) => {
    try {
      setRecords(updatedVault);
      localStorage.setItem("partsman_expenditure_jetexpress", JSON.stringify(updatedVault));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (targetRec) {
        fetch(`/api/expenditures/${targetRec.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetRec, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Save expenditure error:", err);
    }
  };

  // Fetch Expenditure Vault
  const fetchExpenditureVault = async () => {
    try {
      const localData = localStorage.getItem("partsman_expenditure_jetexpress");
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
          setLastSavedTime("Synced");
        }
      }

      const res = await fetch("/api/expenditures");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecords(data);
          localStorage.setItem("partsman_expenditure_jetexpress", JSON.stringify(data));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Failed to load expenditure vault:", err);
    }
  };

  useEffect(() => {
    fetchExpenditureVault();
  }, []);

  // Filtered Records
  const filteredRecords = records.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.truckPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    const matchesCategory = filterCategory === "ALL" || r.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate Key Metrics
  const totalExpenditure = records.reduce((acc, r) => acc + r.amount, 0);
  const paidTotal = records.filter(r => r.status === "PAID / VERIFIED").reduce((acc, r) => acc + r.amount, 0);
  const openTotal = records.filter(r => r.status === "UNPAID / OPEN").reduce((acc, r) => acc + r.amount, 0);

  // Spend by Category Breakdown
  const categoriesList = ["Engine & Oil Filtration", "Braking Systems", "Clutch & Transmission", "Suspension & Cabin Shocks"];
  const categoryTotals = categoriesList.map(cat => {
    const catSum = records.filter(r => r.category === cat).reduce((acc, r) => acc + r.amount, 0);
    return { name: cat, total: catSum, pct: totalExpenditure > 0 ? (catSum / totalExpenditure) * 100 : 0 };
  });

  // Handler to Add Expense
  const handleAddExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    const created: ExpenditureRecord = {
      id: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      invoiceId: newExpForm.invoiceId,
      drId: newExpForm.drId,
      truckPlate: newExpForm.truckPlate,
      truckModel: newExpForm.truckModel,
      category: newExpForm.category,
      description: newExpForm.description,
      qty: Number(newExpForm.qty) || 1,
      amount: Number(newExpForm.amount) || 0,
      status: "UNPAID / OPEN",
      company: clientCompany
    };

    const updatedVault = [created, ...records];
    saveRecordsState(updatedVault, created);

    try {
      await fetch("/api/expenditures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch (_) {}

    setShowAddModal(false);
    alert(`Expenditure #${created.id} recorded & saved to vault!`);
  };

  // Handler to Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm(`Are you sure you want to delete Expenditure #${id}?`)) return;
    const updated = records.filter(r => r.id !== id);
    saveRecordsState(updated);

    try {
      await fetch(`/api/expenditures/${id}`, { method: "DELETE" });
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-[#1E4FD8] selection:text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/80 p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/portal" className="text-slate-400 hover:text-white font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                ← BACK TO PORTAL
              </Link>
              <span className="text-slate-700">|</span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>💾</span> AUTO-SAVED TO VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase font-sans mt-2">
              Fleet Expenditure & Procurement Ledger
            </h1>
            <p className="text-slate-400 font-mono text-xs mt-0.5">
              Financial Procurement Audit & Fleet Maintenance Spend for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              🖨️ Executive Audit Report
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#1E4FD8] hover:bg-blue-600 text-white px-5 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(30,79,216,0.3)] cursor-pointer"
            >
              + Log Expense Record
            </button>
          </div>
        </div>

        {/* Top Summary Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Fleet Maintenance Spend</div>
            <div className="text-3xl font-black text-amber-400 font-mono">
              ₱{totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Lifetime Parts Requisitions</div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Verified Paid Ledger</div>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              ₱{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Cleared Bank Transactions</div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Open Payable Balance</div>
            <div className="text-3xl font-black text-rose-400 font-mono">
              ₱{openTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Pending Payment Verification</div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Logged Items Count</div>
            <div className="text-3xl font-black text-blue-400 font-mono">
              {records.length} Transactions
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Audited Financial Records</div>
          </div>
        </div>

        {/* Spend by Category Breakdown Card */}
        <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-6"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-4 flex items-center gap-2">
            <span>📊</span> Maintenance Spend Allocation by Component Category
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
            {categoryTotals.map(cat => (
              <div key={cat.name} className="p-4 rounded-xl border border-slate-800 bg-black/40 space-y-2">
                <div className="text-xs text-slate-400 font-bold truncate">{cat.name}</div>
                <div className="text-xl font-black text-white">₱{cat.total.toLocaleString()}</div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1E4FD8] h-full rounded-full transition-all duration-500" style={{ width: `${cat.pct}%` }}></div>
                </div>
                <div className="text-[10px] text-slate-500 text-right">{cat.pct.toFixed(1)}% of total spend</div>
              </div>
            ))}
          </div>
        </div>

        {/* Master Transaction Ledger Table */}
        <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-6"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🧾</span> Itemized Expenditure Transaction Ledger
            </h2>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search EXP #, Invoice #, Plate, Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2.5 bg-black border border-slate-800 rounded-lg text-white text-xs font-mono w-full md:w-64"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2.5 bg-black border border-slate-800 rounded-lg text-white text-xs font-mono cursor-pointer"
              >
                <option value="ALL">Status: All Ledgers</option>
                <option value="UNPAID / OPEN">UNPAID / OPEN</option>
                <option value="PAID / VERIFIED">PAID / VERIFIED</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2.5 bg-black border border-slate-800 rounded-lg text-white text-xs font-mono cursor-pointer"
              >
                <option value="ALL">Category: All Categories</option>
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-4">EXP # & Date</th>
                  <th className="p-4">Invoice & DR Link</th>
                  <th className="p-4">Target Fleet Truck</th>
                  <th className="p-4">Category & Description</th>
                  <th className="p-4 text-center">Qty</th>
                  <th className="p-4 text-right">Amount (₱)</th>
                  <th className="p-4 text-center">Payment Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-900 text-xs font-mono text-slate-300">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center bg-black/40 text-slate-500">
                      No expenditure records found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-4">
                        <div className="font-black text-[#1E4FD8] text-sm">{exp.id}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{exp.date}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-amber-400">{exp.invoiceId}</div>
                        <div className="text-[10px] text-blue-400">{exp.drId}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{exp.truckPlate}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{exp.truckModel}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-blue-950/50 text-blue-400 rounded text-[10px] border border-blue-900">
                          {exp.category}
                        </span>
                        <div className="text-white font-sans text-xs mt-1">{exp.description}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-white">{exp.qty}</td>
                      <td className="p-4 text-right font-black text-amber-400 text-sm">
                        ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${
                          exp.status === "PAID / VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteRecord(exp.id)}
                          className="px-2.5 py-1.5 bg-rose-950/60 text-rose-400 border border-rose-900 font-bold rounded text-[10px] uppercase hover:bg-rose-900 hover:text-white transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* MODAL: Printable Executive Audit Report */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl p-10 shadow-2xl space-y-8 font-sans">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {clientCompany}
                  </h1>
                  <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mt-1">
                    CORPORATE FINANCE & PROCUREMENT DIVISION // EXPENDITURE AUDIT REPORT
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-slate-900">AUDIT PERIOD: FY-2026 Q3</div>
                  <div className="text-slate-500">Generated: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Summary Numbers Box */}
              <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg grid grid-cols-3 gap-4 text-xs font-mono">
                <div>TOTAL FLEET SPEND: <span className="font-bold block text-slate-900 text-sm">₱{totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div>VERIFIED PAID: <span className="font-bold block text-emerald-700 text-sm">₱{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div>OUTSTANDING OPEN: <span className="font-bold block text-rose-700 text-sm">₱{openTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>

              {/* Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Audited Expenditure Transaction Ledger</h3>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-200 text-slate-800 font-mono uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300">REF #</th>
                      <th className="p-2.5 border-r border-slate-300">Date</th>
                      <th className="p-2.5 border-r border-slate-300">Invoice / DR</th>
                      <th className="p-2.5 border-r border-slate-300">Plate</th>
                      <th className="p-2.5 border-r border-slate-300">Description</th>
                      <th className="p-2.5 text-right border-slate-300">Amount (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono">
                    {records.map((rec) => (
                      <tr key={rec.id}>
                        <td className="p-2.5 border-r border-slate-300 font-bold">{rec.id}</td>
                        <td className="p-2.5 border-r border-slate-300">{rec.date}</td>
                        <td className="p-2.5 border-r border-slate-300">{rec.invoiceId} / {rec.drId}</td>
                        <td className="p-2.5 border-r border-slate-300 font-bold">{rec.truckPlate}</td>
                        <td className="p-2.5 border-r border-slate-300 font-semibold">{rec.description}</td>
                        <td className="p-2.5 text-right font-black">₱{rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono text-xs font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={5} className="p-3 text-right uppercase">TOTAL AUDITED SPEND:</td>
                      <td className="p-3 text-right font-black text-sm text-slate-900">₱{totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-12 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block uppercase">Prepared By:</span>
                  <div className="border-b-2 border-slate-900 pt-8 font-bold text-slate-900 uppercase">
                    Head of Corporate Procurement
                  </div>
                  <span className="text-[10px] text-slate-500">Fleet Operations Division</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-blue-900">Approved By (General Manager / CFO):</span>
                  <div className="border-b-2 border-slate-900 pt-8 font-bold text-slate-900 uppercase">
                    ____________________________________
                  </div>
                  <span className="text-[10px] text-slate-500">Executive Signature & Audit Stamp</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg text-xs uppercase hover:bg-slate-800 transition cursor-pointer"
                >
                  🖨️ Print Report for Executive Approval
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase hover:bg-slate-300 transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: Log Custom Expense Record */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider font-sans">➕ Log Custom Maintenance Expense</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddExpenditure} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Invoice #</label>
                    <input
                      type="text"
                      value={newExpForm.invoiceId}
                      onChange={(e) => setNewExpForm({ ...newExpForm, invoiceId: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">DR Receipt #</label>
                    <input
                      type="text"
                      value={newExpForm.drId}
                      onChange={(e) => setNewExpForm({ ...newExpForm, drId: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Truck Plate</label>
                    <input
                      type="text"
                      value={newExpForm.truckPlate}
                      onChange={(e) => setNewExpForm({ ...newExpForm, truckPlate: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Category</label>
                    <select
                      value={newExpForm.category}
                      onChange={(e) => setNewExpForm({ ...newExpForm, category: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white cursor-pointer"
                    >
                      {categoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase">Expense Description</label>
                  <input
                    type="text"
                    value={newExpForm.description}
                    onChange={(e) => setNewExpForm({ ...newExpForm, description: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white font-sans"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newExpForm.qty}
                      onChange={(e) => setNewExpForm({ ...newExpForm, qty: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Amount (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpForm.amount}
                      onChange={(e) => setNewExpForm({ ...newExpForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-amber-400 font-bold"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="w-full p-4 bg-[#1E4FD8] text-white font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-blue-600/30 cursor-pointer mt-4">
                  🚀 Save & Log Expenditure
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
