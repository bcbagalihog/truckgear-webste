import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";
import { useAuth } from "@/hooks/use-auth";

interface QuotationLineItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  prices: { [supplierId: string]: number };
}

interface SupplierColumn {
  id: string;
  name: string;
  isTruckgear?: boolean;
}

interface RfqRecord {
  id: string;
  date: string;
  targetFleetUnit: string;
  preparedBy: string;
  status: string;
  suppliers: SupplierColumn[];
  items: QuotationLineItem[];
}

export default function RfqComparisonView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.";

  const [activeTab, setActiveTab] = useState<"vault" | "comparison" | "newRfq">("vault");
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [showEditRfqModal, setShowEditRfqModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Line Item Edit Modal State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationLineItem | null>(null);

  // Master Registered Suppliers List (from Client Directory)
  const registeredDirectorySuppliers = [
    { id: "truckgear", name: "TruckGear Philippines Co. (Primary Supplier)" },
    { id: "monroe", name: "Monroe Cabin Systems Co." },
    { id: "meritor", name: "Meritor Heavy-Duty Axles" },
    { id: "koyorad", name: "KoyoRad Aluminum Coolant Ltd." },
    { id: "jemax", name: "Jemax Radiator & Fluid Supplies" },
    { id: "bando", name: "Bando Heavy Belts Phils" },
    { id: "manila_parts", name: "Manila Heavy Fleet Parts Traders" }
  ];

  // Initial Seed RFQs
  const initialSeedRfqs: RfqRecord[] = [
    {
      id: "RFQ-2026-0890",
      date: "2026-08-21",
      targetFleetUnit: "Fuso Super Great Cargo Hauler (DEF-5678)",
      preparedBy: user?.username || "Procurement Officer",
      status: "Quotation Ready",
      suppliers: [
        { id: "truckgear", name: "TruckGear Philippines Co.", isTruckgear: true },
        { id: "monroe", name: "Monroe Cabin Systems Co." },
        { id: "meritor", name: "Meritor Heavy-Duty Axles" }
      ],
      items: [
        {
          id: "ITEM-1",
          sku: "TG-CLUTCH-99",
          name: "Clutch Assembly Kit v2 (Heavy Duty)",
          qty: 2,
          prices: { truckgear: 14500, monroe: 16200, meritor: 15800 }
        },
        {
          id: "ITEM-2",
          sku: "TG-BRAKE-202",
          name: "Full Performance Rear Brake Pad Set",
          qty: 4,
          prices: { truckgear: 4200, monroe: 4900, meritor: 4600 }
        },
        {
          id: "ITEM-3",
          sku: "TG-BELT-404",
          name: "Premium Double-Ribbed Alternator Fan Belt",
          qty: 2,
          prices: { truckgear: 1850, monroe: 2100, meritor: 2000 }
        }
      ]
    },
    {
      id: "RFQ-2026-0875",
      date: "2026-08-19",
      targetFleetUnit: "Isuzu Giga 10-Wheeler Dump Truck (ABC-1234)",
      preparedBy: "Depot Supervisor",
      status: "Quotation Ready",
      suppliers: [
        { id: "truckgear", name: "TruckGear Philippines Co.", isTruckgear: true },
        { id: "monroe", name: "Monroe Cabin Systems Co." },
        { id: "koyorad", name: "KoyoRad Aluminum Coolant Ltd." }
      ],
      items: [
        {
          id: "ITEM-1",
          sku: "JET-OIL-001",
          name: "Fleet Oil Filter Core (Isuzu Giga)",
          qty: 10,
          prices: { truckgear: 1200, monroe: 1450, koyorad: 1380 }
        },
        {
          id: "ITEM-2",
          sku: "JET-FLUID-303",
          name: "Radiator Coolant Pre-Mix (Gallon)",
          qty: 5,
          prices: { truckgear: 850, monroe: 990, koyorad: 920 }
        }
      ]
    }
  ];

  // RFQ Vault Records List
  const [rfqVault, setRfqVault] = useState<RfqRecord[]>(initialSeedRfqs);
  const [selectedRfq, setSelectedRfq] = useState<RfqRecord>(initialSeedRfqs[0]);

  // Save RFQs to LocalStorage & Server Vault
  const saveVaultState = (updatedVault: RfqRecord[], updatedSelected?: RfqRecord) => {
    try {
      setRfqVault(updatedVault);
      if (updatedSelected) setSelectedRfq(updatedSelected);

      // LocalStorage sync
      localStorage.setItem("partsman_rfq_vault_jetexpress", JSON.stringify(updatedVault));
      setLastSavedTime(new Date().toLocaleTimeString());

      // Server Vault API sync
      if (updatedSelected) {
        fetch(`/api/inventory/rfqs/${updatedSelected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSelected)
        });
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // Load RFQs from LocalStorage + Backend Vault API
  const fetchRfqVault = async () => {
    try {
      // First check local storage for instant persistence
      const localData = localStorage.getItem("partsman_rfq_vault_jetexpress");
      if (localData !== null) {
        try {
          const parsedLocal = JSON.parse(localData);
          if (Array.isArray(parsedLocal)) {
            setRfqVault(parsedLocal);
            if (parsedLocal.length > 0) setSelectedRfq(parsedLocal[0]);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      // Fetch from Backend Server API
      const res = await fetch("/api/inventory/rfqs");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRfqVault(data);
          if (data.length > 0) setSelectedRfq(data[0]);
          localStorage.setItem("partsman_rfq_vault_jetexpress", JSON.stringify(data));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Failed to load RFQ vault:", err);
    }
  };

  useEffect(() => {
    fetchRfqVault();
  }, []);

  // Dynamic Add Line Item Input State
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrices, setNewItemPrices] = useState<{ [id: string]: number }>({});

  // Form state for creating a new RFQ Sheet
  const [newRfqForm, setNewRfqForm] = useState({
    rfqId: "",
    date: new Date().toISOString().split("T")[0],
    fleetUnit: "Fuso Super Great Cargo Hauler (DEF-5678)"
  });

  // Calculate Grand Totals per Supplier for selected RFQ
  const getSupplierGrandTotal = (supplierId: string) => {
    if (!selectedRfq || !selectedRfq.items) return 0;
    return selectedRfq.items.reduce((acc, item) => {
      const price = item.prices ? (item.prices[supplierId] || 0) : 0;
      return acc + (price * item.qty);
    }, 0);
  };

  // DYNAMICALLY DETERMINE THE ACTUAL LOWEST SUPPLIER BIDDER
  const supplierTotals = selectedRfq?.suppliers ? selectedRfq.suppliers.map(col => ({
    id: col.id,
    name: col.name,
    isTruckgear: col.isTruckgear,
    total: getSupplierGrandTotal(col.id)
  })) : [];

  const nonZeroTotals = supplierTotals.filter(s => s.total > 0);
  const lowestBidder = nonZeroTotals.length > 0
    ? nonZeroTotals.reduce((min, cur) => cur.total < min.total ? cur : min, nonZeroTotals[0])
    : null;

  // Find second lowest bidder for savings calculation
  const sortedTotals = [...nonZeroTotals].sort((a, b) => a.total - b.total);
  const secondLowestBidder = sortedTotals.length > 1 ? sortedTotals[1] : null;
  const calculatedSavings = (lowestBidder && secondLowestBidder)
    ? secondLowestBidder.total - lowestBidder.total
    : 0;

  // Handler to view an RFQ
  const handleViewRfq = (rfq: RfqRecord) => {
    setSelectedRfq(rfq);
    setActiveTab("comparison");
  };

  // Handler to delete an RFQ
  const handleDeleteRfq = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete RFQ #${id} from the vault?`)) return;

    const updated = rfqVault.filter(r => r.id !== id);
    saveVaultState(updated, updated.length > 0 ? updated[0] : undefined);

    try {
      await fetch(`/api/inventory/rfqs/${id}`, { method: "DELETE" });
    } catch (_) {}
    alert(`RFQ #${id} deleted successfully.`);
  };

  // Handler to add a new supplier column to the active RFQ
  const handleAddSupplierColumn = () => {
    if (!selectedRfq) return;
    const nextUnused = registeredDirectorySuppliers.find(s => !selectedRfq.suppliers.some(col => col.id === s.id));
    if (!nextUnused) {
      alert("All directory suppliers are already added to this comparison sheet.");
      return;
    }

    const updatedSuppliers = [...selectedRfq.suppliers, { id: nextUnused.id, name: nextUnused.name }];
    const updatedRfq = { ...selectedRfq, suppliers: updatedSuppliers };
    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);

    saveVaultState(updatedVault, updatedRfq);
  };

  // Handler to remove a supplier column from active RFQ
  const handleRemoveSupplierColumn = (supplierId: string) => {
    if (!selectedRfq) return;
    if (supplierId === "truckgear") {
      alert("TruckGear Philippines Co. is the primary comparison anchor and cannot be removed.");
      return;
    }
    if (selectedRfq.suppliers.length <= 2) {
      alert("You must keep at least 2 suppliers to compare.");
      return;
    }

    const updatedSuppliers = selectedRfq.suppliers.filter(s => s.id !== supplierId);
    const updatedRfq = { ...selectedRfq, suppliers: updatedSuppliers };
    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);

    saveVaultState(updatedVault, updatedRfq);
  };

  // Handler to change supplier for a specific column
  const handleSupplierChange = (colIdx: number, newSupplierId: string) => {
    const selected = registeredDirectorySuppliers.find(s => s.id === newSupplierId);
    if (!selected || !selectedRfq) return;

    const updatedSuppliers = [...selectedRfq.suppliers];
    updatedSuppliers[colIdx] = { id: selected.id, name: selected.name, isTruckgear: selected.id === "truckgear" };

    const updatedRfq = { ...selectedRfq, suppliers: updatedSuppliers };
    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);

    saveVaultState(updatedVault, updatedRfq);
  };

  // Handler to open Line Item Edit modal
  const handleOpenEditItemModal = (item: QuotationLineItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setShowEditItemModal(true);
  };

  // Handler to save Line Item edits
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !selectedRfq) return;

    const updatedItems = selectedRfq.items.map(it => it.id === editingItem.id ? editingItem : it);
    const updatedRfq = { ...selectedRfq, items: updatedItems };
    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);

    saveVaultState(updatedVault, updatedRfq);
    setShowEditItemModal(false);
    setEditingItem(null);
  };

  // Handler to delete a Line Item
  const handleDeleteItem = (itemId: string) => {
    if (!selectedRfq || !confirm("Are you sure you want to delete this line item?")) return;

    const updatedItems = selectedRfq.items.filter(it => it.id !== itemId);
    const updatedRfq = { ...selectedRfq, items: updatedItems };
    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);

    saveVaultState(updatedVault, updatedRfq);
  };

  // Handler to add a new line item dynamically
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !selectedRfq) return;

    const addedLine: QuotationLineItem = {
      id: `ITEM-${Date.now().toString().slice(-4)}`,
      sku: newItemSku || `SKU-${Date.now().toString().slice(-4)}`,
      name: newItemName,
      qty: Number(newItemQty) || 1,
      prices: { ...newItemPrices }
    };

    const updatedRfq = {
      ...selectedRfq,
      items: [...selectedRfq.items, addedLine]
    };

    const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);
    saveVaultState(updatedVault, updatedRfq);

    setNewItemSku("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrices({});
  };

  // Handler to create a new RFQ Sheet (WITH ZERO INITIAL ITEMS)
  const handleCreateNewRfqSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = newRfqForm.rfqId || `RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const created: RfqRecord = {
      id: newId,
      date: newRfqForm.date || new Date().toISOString().split("T")[0],
      targetFleetUnit: newRfqForm.fleetUnit,
      preparedBy: user?.username || "Procurement Officer",
      status: "Quotation Ready",
      suppliers: [
        { id: "truckgear", name: "TruckGear Philippines Co.", isTruckgear: true },
        { id: "monroe", name: "Monroe Cabin Systems Co." },
        { id: "meritor", name: "Meritor Heavy-Duty Axles" }
      ],
      items: [] // ZERO ITEMS ON CREATION
    };

    const updatedVault = [created, ...rfqVault];
    saveVaultState(updatedVault, created);
    setActiveTab("comparison");

    try {
      await fetch("/api/inventory/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch (_) {}

    alert(`New Multi-Item RFQ #${created.id} created with clean slate!`);
  };

  return (
    <PartsOperationsLayout>
      <div className="space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
                RFQ Vault & Line Item Manager
              </h1>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>💾</span> AUTO-SAVED TO VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1">
              Add / Remove Suppliers, Multi-Item Comparison, & Executive Boss Reports for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("vault")}
              className={`px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                activeTab === "vault"
                  ? "bg-[#1E4FD8] text-white shadow-[0_0_15px_rgba(30,79,216,0.4)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              📂 RFQ Vault ({rfqVault.length})
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              📊 Active Matrix: {selectedRfq?.id}
            </button>
            <button
              onClick={() => setActiveTab("newRfq")}
              className={`px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                activeTab === "newRfq"
                  ? "bg-[#F59E0B] text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              + Create New RFQ
            </button>
          </div>
        </div>

        {/* TAB 1: RFQ VAULT LEDGER */}
        {activeTab === "vault" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pl-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                📁 Saved Quotation RFQs in Vault
              </h2>
              <span className="text-xs font-mono text-slate-400">Total Vault RFQs: {rfqVault.length}</span>
            </div>

            <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">RFQ Number & Date</th>
                    <th className="p-4">Fleet Truck Destination</th>
                    <th className="p-4 text-center">Items Count</th>
                    <th className="p-4 text-center">Lowest Total Bid</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs font-mono text-slate-300">
                  {rfqVault.map((rfq) => {
                    const rfqTotals = rfq.suppliers ? rfq.suppliers.map(col => {
                      return rfq.items.reduce((acc, it) => acc + ((it.prices ? (it.prices[col.id] || 0) : 0) * it.qty), 0);
                    }).filter(t => t > 0) : [];
                    const minTotal = rfqTotals.length > 0 ? Math.min(...rfqTotals) : 0;

                    return (
                      <tr 
                        key={rfq.id} 
                        onClick={() => handleViewRfq(rfq)}
                        className="hover:bg-white/[0.03] transition cursor-pointer group"
                      >
                        <td className="p-4">
                          <div className="font-black text-[#1E4FD8] text-sm group-hover:text-blue-400">{rfq.id}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Date: {rfq.date}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{rfq.targetFleetUnit}</div>
                          <div className="text-[10px] text-slate-400">Prepared By: {rfq.preparedBy}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-white text-sm">
                          {rfq.items.length} Parts
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-black text-amber-400 text-base">₱{minTotal.toLocaleString()}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/30 uppercase tracking-wider">
                            {rfq.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewRfq(rfq); }}
                            className="px-3 py-1.5 bg-[#1E4FD8] text-white font-bold rounded text-[10px] uppercase hover:bg-blue-600 transition cursor-pointer"
                          >
                            👁️ View & Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedRfq(rfq); setShowPrintReportModal(true); }}
                            className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded text-[10px] uppercase hover:bg-emerald-500 transition cursor-pointer"
                          >
                            🖨️ Boss Report
                          </button>
                          <button
                            onClick={(e) => handleDeleteRfq(rfq.id, e)}
                            className="px-3 py-1.5 bg-rose-950/60 text-rose-400 border border-rose-900 font-bold rounded text-[10px] uppercase hover:bg-rose-900 hover:text-white transition cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Multi-Item Comparison Table Sheet */}
        {activeTab === "comparison" && selectedRfq && (
          <div className="space-y-8">
            
            {/* Sheet Overview Header Card */}
            <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-6 relative overflow-hidden"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-[#1E4FD8]/20 text-[#1E4FD8] font-mono text-sm font-black rounded border border-[#1E4FD8]/40">
                      {selectedRfq.id}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Date: <span className="text-white font-bold">{selectedRfq.date}</span></span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-2">
                    Fleet Destination: <span className="text-[#1E4FD8]">{selectedRfq.targetFleetUnit}</span>
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAddSupplierColumn}
                    className="bg-[#1E4FD8] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(30,79,216,0.3)] cursor-pointer"
                  >
                    + Add Supplier Column
                  </button>
                  <button
                    onClick={() => setShowPrintReportModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
                  >
                    🖨️ Print Boss Report
                  </button>
                  <button
                    onClick={() => setShowEditRfqModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    ✏️ Edit Header
                  </button>
                </div>
              </div>

              {/* Multi-Item Line Comparison Table */}
              <div className="rounded-xl border border-slate-900 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead className="bg-slate-950/90 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                    <tr>
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">Part Description / SKU</th>
                      <th className="p-4 text-center">Qty</th>
                      
                      {/* DYNAMIC SUPPLIER COLUMNS WITH REMOVE BUTTON */}
                      {selectedRfq.suppliers.map((col, cIdx) => (
                        <th
                          key={cIdx}
                          className={`p-4 text-center relative ${
                            col.isTruckgear
                              ? "bg-[#1E4FD8]/20 border-x border-[#1E4FD8]/40 text-white"
                              : "border-r border-slate-800 text-slate-300"
                          }`}
                        >
                          {!col.isTruckgear && (
                            <button
                              onClick={() => handleRemoveSupplierColumn(col.id)}
                              className="absolute top-2 right-2 text-slate-600 hover:text-rose-400 font-black text-xs p-1 cursor-pointer"
                              title="Remove Supplier Column"
                            >
                              ✕
                            </button>
                          )}

                          <div className="space-y-1 pr-4">
                            <div className="font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                              {col.isTruckgear ? "🛡️ " : "📦 "}
                              {col.name}
                            </div>
                            
                            {!col.isTruckgear && (
                              <select
                                value={col.id}
                                onChange={(e) => handleSupplierChange(cIdx, e.target.value)}
                                className="bg-black border border-slate-700 text-slate-300 text-[10px] p-1 rounded w-full font-mono cursor-pointer"
                              >
                                {registeredDirectorySuppliers
                                  .filter(s => s.id !== "truckgear")
                                  .map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                      Directory: {sup.name}
                                    </option>
                                  ))}
                              </select>
                            )}

                            {col.isTruckgear && (
                              <span className="text-[9px] text-emerald-400 font-bold block">
                                Direct Factory OEM // Stock Ready
                              </span>
                            )}
                          </div>
                        </th>
                      ))}

                      <th className="p-4 text-right">Edit Controls</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-900 text-xs font-mono text-slate-300">
                    {selectedRfq.items.length === 0 ? (
                      <tr>
                        <td colSpan={selectedRfq.suppliers.length + 4} className="p-8 text-center bg-black/40">
                          <div className="text-base font-bold text-amber-400">📭 No Line Items Added to RFQ #{selectedRfq.id}</div>
                          <p className="text-xs text-slate-400 mt-1 font-sans">
                            Use the form below to commit your first part description, requested quantity, and supplier quotation bids.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      selectedRfq.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-4 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{item.name}</div>
                            <div className="text-[#1E4FD8] font-bold mt-0.5">{item.sku}</div>
                          </td>
                          <td className="p-4 text-center font-bold text-white text-sm">{item.qty}</td>

                          {/* DYNAMIC PRICES PER SUPPLIER */}
                          {selectedRfq.suppliers.map((col, cIdx) => {
                            const unitPrice = item.prices ? (item.prices[col.id] || 0) : 0;
                            const lineTotal = unitPrice * item.qty;

                            return (
                              <td
                                key={cIdx}
                                className={`p-4 text-center ${
                                  col.isTruckgear
                                    ? "bg-[#1E4FD8]/10 border-x border-[#1E4FD8]/30"
                                    : "border-r border-slate-900"
                                }`}
                              >
                                <div className={col.isTruckgear ? "text-white font-bold" : "text-slate-300"}>
                                  ₱{unitPrice.toLocaleString()} / unit
                                </div>
                                <div className={col.isTruckgear ? "text-emerald-400 font-black text-xs mt-1" : "text-slate-400 font-bold text-xs mt-1"}>
                                  Total: ₱{lineTotal.toLocaleString()}
                                </div>
                              </td>
                            );
                          })}

                          {/* LINE ITEM ACTION BUTTONS */}
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditItemModal(item)}
                              className="px-3 py-1.5 bg-blue-900/60 border border-blue-700 text-blue-300 hover:bg-blue-600 hover:text-white rounded font-bold text-[10px] uppercase transition cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-2.5 py-1.5 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded font-bold text-[10px] uppercase transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* DYNAMIC SUMMARY GRAND TOTALS ROW */}
                  <tfoot className="border-t-2 border-slate-800 bg-slate-950 font-mono text-sm">
                    <tr>
                      <td colSpan={3} className="p-5 text-right font-black uppercase text-white tracking-wider">
                        GRAND TOTAL BID AMOUNT:
                      </td>

                      {selectedRfq.suppliers.map((col, cIdx) => {
                        const grandTotal = getSupplierGrandTotal(col.id);
                        const isLowest = lowestBidder && lowestBidder.id === col.id && grandTotal > 0;

                        return (
                          <td
                            key={cIdx}
                            className={`p-5 text-center ${
                              isLowest
                                ? "bg-emerald-950/40 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                : col.isTruckgear
                                ? "bg-[#1E4FD8]/10 border-x border-slate-800"
                                : "border-r border-slate-800"
                            }`}
                          >
                            {isLowest ? (
                              <>
                                <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center justify-center gap-1">
                                  <span>★</span> LOWEST TOTAL BID
                                </div>
                                <div className="text-2xl font-black text-emerald-400 mt-1">
                                  ₱{grandTotal.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-300 font-semibold mt-1">
                                  {col.isTruckgear ? "Includes 12Mo OEM Warranty" : "Best Price Bidder"}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">{col.name}</div>
                                <div className="text-xl font-bold text-slate-300 mt-1">₱{grandTotal.toLocaleString()}</div>
                              </>
                            )}
                          </td>
                        );
                      })}

                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Dynamic Add New Line Item Form */}
              <div className="p-6 rounded-xl border border-slate-900 bg-black/40 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-2">
                  ➕ Add Item to RFQ #{selectedRfq.id}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="SKU (e.g. TG-FILTER-05)"
                      value={newItemSku}
                      onChange={(e) => setNewItemSku(e.target.value)}
                      className="p-3 bg-black border border-slate-800 rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder="Part Name / Specification"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="p-3 bg-black border border-slate-800 rounded text-white md:col-span-2"
                      required
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                      className="p-3 bg-black border border-slate-800 rounded text-white"
                    />
                  </div>

                  {/* DYNAMIC UNIT PRICE INPUTS FOR ALL ACTIVE SUPPLIERS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-900">
                    {selectedRfq.suppliers.map(col => (
                      <div key={col.id} className="space-y-1">
                        <label className="text-[10px] text-slate-400 block truncate font-sans">{col.name} (₱):</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newItemPrices[col.id] || ""}
                          onChange={(e) => setNewItemPrices({ ...newItemPrices, [col.id]: parseFloat(e.target.value) || 0 })}
                          className={`w-full p-2.5 bg-black border rounded font-mono ${
                            col.isTruckgear ? "border-amber-500/50 text-amber-400 font-bold" : "border-slate-800 text-white"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#1E4FD8] hover:bg-blue-600 text-white font-black rounded uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
                  >
                    + Commit Line Item & Save to Vault
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: Create New RFQ Vault Record */}
        {activeTab === "newRfq" && (
          <div className="max-w-2xl mx-auto p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-6"
               style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="border-b border-slate-900 pb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <span>📝</span> Create New RFQ Record in Vault
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Configure Custom RFQ Number & Fleet Unit Destination for <span className="text-white font-bold">{clientCompany}</span>
              </p>
            </div>

            <form onSubmit={handleCreateNewRfqSheet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">RFQ Document Number</label>
                  <input
                    type="text"
                    placeholder="e.g. RFQ-2026-0995"
                    value={newRfqForm.rfqId}
                    onChange={(e) => setNewRfqForm({ ...newRfqForm, rfqId: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Issue Date</label>
                  <input
                    type="date"
                    value={newRfqForm.date}
                    onChange={(e) => setNewRfqForm({ ...newRfqForm, date: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Target Fleet Truck Unit</label>
                <select
                  value={newRfqForm.fleetUnit}
                  onChange={(e) => setNewRfqForm({ ...newRfqForm, fleetUnit: e.target.value })}
                  className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                >
                  <option>Fuso Super Great Cargo Hauler (DEF-5678)</option>
                  <option>Isuzu Giga 10-Wheeler Dump Truck (ABC-1234)</option>
                  <option>Hino 700 Concrete Mixer Truck (GHI-9012)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#F59E0B] text-black font-black rounded-lg hover:bg-yellow-400 transition uppercase tracking-wider text-xs shadow-lg shadow-yellow-500/20 cursor-pointer"
              >
                🚀 Save & Open New RFQ Sheet
              </button>
            </form>
          </div>
        )}

        {/* MODAL: Edit Specific Line Item */}
        {showEditItemModal && editingItem && selectedRfq && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">✏️ Edit Line Item Details</h3>
                <button onClick={() => setShowEditItemModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleSaveItemEdit} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Part SKU</label>
                    <input
                      type="text"
                      value={editingItem.sku}
                      onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.qty}
                      onChange={(e) => setEditingItem({ ...editingItem, qty: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase">Part Description / Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white font-sans text-sm"
                  />
                </div>

                {/* EDIT PRICES FOR ALL ACTIVE SUPPLIERS */}
                <div className="space-y-3 pt-2 border-t border-slate-900">
                  <label className="text-amber-400 font-bold uppercase block">Supplier Unit Prices (₱):</label>
                  
                  {selectedRfq.suppliers.map(col => (
                    <div key={col.id} className="flex justify-between items-center gap-4">
                      <span className="text-slate-300 w-1/2 truncate font-sans text-xs">{col.name}:</span>
                      <input
                        type="number"
                        value={editingItem.prices ? (editingItem.prices[col.id] || 0) : 0}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          prices: { ...(editingItem.prices || {}), [col.id]: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-1/2 p-2 bg-black border border-slate-800 rounded text-white font-mono text-right"
                      />
                    </div>
                  ))}
                </div>

                <button type="submit" className="w-full p-4 bg-[#1E4FD8] text-white font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-blue-600/30 cursor-pointer mt-4">
                  Save Item Changes & Commit to Vault
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit RFQ Header Details */}
        {showEditRfqModal && selectedRfq && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">✏️ Edit RFQ #{selectedRfq.id} Header</h3>
                <button onClick={() => setShowEditRfqModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const updatedRfq = { ...selectedRfq };
                const updatedVault = rfqVault.map(r => r.id === updatedRfq.id ? updatedRfq : r);
                saveVaultState(updatedVault, updatedRfq);
                setShowEditRfqModal(false);
                alert(`RFQ #${selectedRfq.id} header saved!`);
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Target Fleet Truck Unit</label>
                  <input
                    type="text"
                    value={selectedRfq.targetFleetUnit}
                    onChange={(e) => setSelectedRfq({ ...selectedRfq, targetFleetUnit: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Prepared By</label>
                  <input
                    type="text"
                    value={selectedRfq.preparedBy}
                    onChange={(e) => setSelectedRfq({ ...selectedRfq, preparedBy: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
                <button type="submit" className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg uppercase tracking-wider text-xs cursor-pointer">
                  Save Changes to RFQ
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Printable Executive Boss Approval Report with Dynamic Lowest Bid Recommendation */}
        {showPrintReportModal && selectedRfq && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl p-10 shadow-2xl space-y-8 font-sans">
              
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {clientCompany}
                  </h1>
                  <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mt-1">
                    FLEET MAINTENANCE & PROCUREMENT DEPARTMENT // EXECUTIVE RFQ REPORT
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-slate-900">REF #: {selectedRfq.id}</div>
                  <div className="text-slate-500">Date: {selectedRfq.date}</div>
                </div>
              </div>

              {/* Fleet Target Info */}
              <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                <div>TARGET FLEET UNIT: <span className="font-bold block text-slate-900">{selectedRfq.targetFleetUnit}</span></div>
                <div>PREPARED BY: <span className="font-bold block text-slate-900">{selectedRfq.preparedBy}</span></div>
                <div>RECOMMENDED VENDOR: <span className="font-bold block text-blue-700">{lowestBidder ? lowestBidder.name.toUpperCase() : "N/A"}</span></div>
              </div>

              {/* Multi-Item Line Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Itemized Price Comparison Breakdown</h3>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-200 text-slate-800 font-mono uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-3 border-r border-slate-300">#</th>
                      <th className="p-3 border-r border-slate-300">Part Description</th>
                      <th className="p-3 border-r border-slate-300 text-center">Qty</th>
                      {selectedRfq.suppliers.map(col => {
                        const isLowest = lowestBidder && lowestBidder.id === col.id;
                        return (
                          <th key={col.id} className={`p-3 border-r border-slate-300 text-center ${isLowest ? "bg-emerald-100 font-black text-emerald-950" : ""}`}>
                            {col.name} {isLowest ? "(★ LOWEST BID)" : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono">
                    {selectedRfq.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-3 border-r border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-300 font-semibold">
                          {item.name} <span className="text-slate-500 font-normal">({item.sku})</span>
                        </td>
                        <td className="p-3 border-r border-slate-300 text-center font-bold">{item.qty}</td>
                        {selectedRfq.suppliers.map(col => {
                          const isLowest = lowestBidder && lowestBidder.id === col.id;
                          return (
                            <td key={col.id} className={`p-3 border-r border-slate-300 text-center ${isLowest ? "bg-emerald-50/60 font-bold text-emerald-950" : ""}`}>
                              ₱{(((item.prices ? item.prices[col.id] : 0) || 0) * item.qty).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono text-xs font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={3} className="p-3 text-right uppercase">GRAND TOTAL:</td>
                      {selectedRfq.suppliers.map(col => {
                        const grandTotal = getSupplierGrandTotal(col.id);
                        const isLowest = lowestBidder && lowestBidder.id === col.id;
                        return (
                          <td key={col.id} className={`p-3 text-center ${isLowest ? "bg-emerald-200 text-emerald-950 font-black text-sm" : "text-slate-700"}`}>
                            ₱{grandTotal.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Dynamic Executive Recommendation Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1 font-mono text-emerald-950">
                <span className="font-bold uppercase block text-emerald-800">💡 Executive Savings Analysis & Recommendation:</span>
                <p>
                  Approving <strong>{lowestBidder ? lowestBidder.name : "Recommended Vendor"}</strong> offers the lowest total bid of <strong>₱{lowestBidder ? lowestBidder.total.toLocaleString() : 0}</strong>
                  {calculatedSavings > 0 ? `, saving ₱${calculatedSavings.toLocaleString()} compared to competing vendor bids.` : "."}
                </p>
              </div>

              {/* Official Sign-off Approval Block */}
              <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-12 text-xs font-mono">
                <div className="space-y-12">
                  <div>
                    <span className="text-slate-500 block uppercase">Prepared By:</span>
                    <div className="border-b-2 border-slate-900 pt-8 font-bold text-slate-900 uppercase">
                      {selectedRfq.preparedBy}
                    </div>
                    <span className="text-[10px] text-slate-500">Fleet Procurement Officer</span>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-blue-900">Approved By (Boss / General Manager):</span>
                    <div className="border-b-2 border-slate-900 pt-8 font-bold text-slate-900 uppercase">
                      ____________________________________
                    </div>
                    <span className="text-[10px] text-slate-500">Executive Approval Signature & Date</span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer"
                >
                  🖨️ Print / Save PDF for Boss
                </button>
                <button
                  onClick={() => setShowPrintReportModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-300 transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </PartsOperationsLayout>
  );
}
