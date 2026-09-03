import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";
import { useAuth } from "@/hooks/use-auth";

// ----- Interfaces -----
interface ProcurementRequest {
  id: string;
  fleetUnit: string;
  partNumber: string;
  name: string;
  qty: number;
  priority: string;
  status: string;
  timestamp: string;
  requestedBy?: string;
  notes?: string;
  partPhotoUrl?: string;
}

interface PurchaseOrderLine {
  id: string;
  partNumber: string;
  name: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  fleetUnit: string;
  status: "Draft" | "Submitted" | "Approved" | "Received" | "Cancelled";
  dateCreated: string;
  lines: PurchaseOrderLine[];
  requestRef: string;
  preparedBy: string;
  remarks: string;
  grandTotal: number;
}

type ActiveTab = "requirements" | "purchase_orders" | "create_po";

export default function ProcurementView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH Global JET Express Inc.";
  const [lastSaved, setLastSaved] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("requirements");

  // Pending Requirements from Mechanic
  const [requirements, setRequirements] = useState<ProcurementRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Purchase Orders vault
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [printablePO, setPrintablePO] = useState<PurchaseOrder | null>(null);

  // Directory Suppliers (from vault)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([
    { id: "truckgear", name: "TRUCKGEAR TRUCK PARTS STORE" },
    { id: "monroe", name: "Monroe Cabin Systems Co." },
    { id: "meritor", name: "Meritor Heavy-Duty Axles" },
    { id: "koyorad", name: "KoyoRad Aluminum Coolant Ltd." },
    { id: "manila_parts", name: "Manila Heavy Fleet Parts Traders" },
  ]);

  // Create PO form state
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [poForm, setPoForm] = useState({
    poNumber: `JNTNWLU${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
    supplier: "TRUCKGEAR TRUCK PARTS STORE",
    authorizedRepresentative: "Cindy Halog (Procurement Supervisor)",
    remarks: "ASAP Delivery to Mexico Pampanga Hub",
  });
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);

  // ---- Load Data ----
  useEffect(() => {
    fetchRequirements();
    loadPurchaseOrders();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const local = localStorage.getItem("partsman_directory_suppliers_jetexpress");
      if (local !== null) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) setSuppliers(parsed);
        } catch {}
      }
      const res = await fetch("/api/inventory/directory/suppliers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuppliers(data);
          localStorage.setItem("partsman_directory_suppliers_jetexpress", JSON.stringify(data));
        }
      }
    } catch {}
  };

  const handleAssignSku = async (req: ProcurementRequest) => {
    const currentSku = (!req.partNumber || req.partNumber === "UNASSIGNED_SKU") ? "" : req.partNumber;
    const newSku = prompt(`Enter official Part SKU for "${req.name}":`, currentSku);
    if (newSku === null) return;

    const assignedSku = newSku.trim() ? newSku.trim().toUpperCase() : "UNASSIGNED_SKU";
    
    const updatedReqs = requirements.map(r => r.id === req.id ? { ...r, partNumber: assignedSku } : r);
    setRequirements(updatedReqs);
    localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(updatedReqs));

    setPoLines(prev => prev.map(line => line.id === req.id ? { ...line, partNumber: assignedSku } : line));

    try {
      await fetch(`/api/inventory/maintenance/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, partNumber: assignedSku, company: clientCompany })
      });
      alert(`✅ Part SKU set to "${assignedSku}" for request ${req.id}! Saved to vault.`);
    } catch (err) {
      console.error("Failed to assign SKU:", err);
    }
  };

  const fetchRequirements = async () => {
    setLoadingReqs(true);
    try {
      const res = await fetch("/api/inventory/maintenance");
      if (res.ok) {
        const data = await res.json();
        const pending = data.filter((r: ProcurementRequest) => r.status === "Pending Purchase");
        setRequirements(pending);
      } else {
        const local = localStorage.getItem("partsman_maintenance_requests_jetexpress");
        if (local) {
          const parsed = JSON.parse(local);
          setRequirements(parsed.filter((r: ProcurementRequest) => r.status === "Pending Purchase"));
        }
      }
    } catch {
      const local = localStorage.getItem("partsman_maintenance_requests_jetexpress");
      if (local) {
        const parsed = JSON.parse(local);
        setRequirements(parsed.filter((r: ProcurementRequest) => r.status === "Pending Purchase"));
      }
    } finally {
      setLoadingReqs(false);
    }
  };

  const loadPurchaseOrders = () => {
    const local = localStorage.getItem("partsman_purchase_orders_jetexpress");
    if (local !== null) {
      try {
        setPurchaseOrders(JSON.parse(local));
      } catch {}
    } else {
      // Default Sample J&T PO matching exact uploaded image
      const defaultJntPO: PurchaseOrder = {
        id: "JNT-PO-001",
        poNumber: "JNTNWLU20260624-183",
        supplier: "TRUCKGEAR TRUCK PARTS STORE",
        fleetUnit: "PAMPANGA DC-730",
        status: "Approved",
        dateCreated: "2026-06-24",
        lines: [
          {
            id: "LINE-1",
            partNumber: "HG-HINO-500",
            name: "OVERHAULING GASKET HINO 500",
            qty: 2,
            unit: "PC",
            unitPrice: 7500,
            total: 15000
          }
        ],
        requestRef: "REQ-DIRECT-STOCK",
        preparedBy: "Cindy Halog",
        remarks: "ASAP Delivery to Mexico Pampanga Hub",
        grandTotal: 15000
      };
      setPurchaseOrders([defaultJntPO]);
      localStorage.setItem("partsman_purchase_orders_jetexpress", JSON.stringify([defaultJntPO]));
    }
  };

  const savePurchaseOrders = (updated: PurchaseOrder[]) => {
    setPurchaseOrders(updated);
    localStorage.setItem("partsman_purchase_orders_jetexpress", JSON.stringify(updated));
    setLastSaved(new Date().toLocaleTimeString());
  };

  // ---- Requirement Selection for PO ----
  const toggleRequirementSelect = (req: ProcurementRequest) => {
    const exists = selectedReqIds.includes(req.id);
    if (exists) {
      setSelectedReqIds(prev => prev.filter(id => id !== req.id));
      setPoLines(prev => prev.filter(l => l.id !== req.id));
    } else {
      setSelectedReqIds(prev => [...prev, req.id]);
      setPoLines(prev => [...prev, {
        id: req.id,
        partNumber: req.partNumber || "STOCK_PART",
        name: req.name,
        qty: req.qty,
        unit: "PC",
        unitPrice: 0,
        total: 0,
      }]);
    }
  };

  // ---- Add Direct Custom Line Item (Instant Inline Row — Quotation Pattern) ----
  const addCustomPoLine = () => {
    const customLine: PurchaseOrderLine = {
      id: `DIRECT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      partNumber: "",
      name: "",
      qty: 1,
      unit: "PC",
      unitPrice: 0,
      total: 0
    };

    setPoLines(prev => [...prev, customLine]);
  };

  const updateLineDetails = (id: string, field: keyof PurchaseOrderLine, value: any) => {
    setPoLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "unitPrice" || field === "qty") {
        updated.total = updated.qty * updated.unitPrice;
      }
      return updated;
    }));
  };

  const removePoLine = (id: string) => {
    setPoLines(prev => prev.filter(l => l.id !== id));
    setSelectedReqIds(prev => prev.filter(reqId => reqId !== id));
  };

  const grandTotal = poLines.reduce((sum, l) => sum + l.total, 0);

  // ---- Create PO ----
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplier) { alert("Please select a supplier."); return; }
    if (poLines.length === 0) { alert("Add at least one line item (from requests or direct stock item)."); return; }

    const selectedReqs = requirements.filter(r => selectedReqIds.includes(r.id));
    const fleetUnits = Array.from(new Set(selectedReqs.map(r => r.fleetUnit))).join(", ") || "Warehouse Stock Order";

    const newPO: PurchaseOrder = {
      id: Date.now().toString(),
      poNumber: poForm.poNumber || `JNTNWLU${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      supplier: poForm.supplier,
      fleetUnit: fleetUnits,
      status: "Approved",
      dateCreated: new Date().toISOString().split("T")[0],
      lines: poLines,
      requestRef: selectedReqIds.join(", ") || "Direct Stock Order",
      preparedBy: poForm.authorizedRepresentative || user?.username || user?.email || "Cindy Halog",
      remarks: poForm.remarks,
      grandTotal,
    };

    savePurchaseOrders([newPO, ...purchaseOrders]);

    // Update maintenance request statuses to "On Order"
    selectedReqIds.forEach(reqId => {
      fetch(`/api/inventory/maintenance/${reqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "On Order" }),
      }).catch(() => {});
    });

    // Reset form
    setSelectedReqIds([]);
    setPoLines([]);
    setPoForm({
      poNumber: `JNTNWLU${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      supplier: "TRUCKGEAR TRUCK PARTS STORE",
      authorizedRepresentative: poForm.authorizedRepresentative || "Cindy Halog (Procurement Supervisor)",
      remarks: "ASAP Delivery to Mexico Pampanga Hub",
    });

    setPrintablePO(newPO);
    alert(`🛒 Purchase Order #${newPO.poNumber} created successfully! Printable J&T PO document generated.`);
  };

  const updatePOStatus = (poId: string, newStatus: PurchaseOrder["status"]) => {
    const targetPO = purchaseOrders.find(p => p.id === poId);
    const updated = purchaseOrders.map(po => po.id === poId ? { ...po, status: newStatus } : po);
    savePurchaseOrders(updated);

    if (newStatus === "Received" && targetPO) {
      // Sync received items into inventory stock
      targetPO.lines.forEach(async (line) => {
        try {
          await fetch("/api/inventory/parts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              part_number: line.partNumber,
              name: line.name,
              description: `Received via PO #${targetPO.poNumber}`,
              quantity: line.qty,
              unit_price: line.unitPrice,
              supplier: targetPO.supplier,
              reorder_level: 5,
              company: clientCompany
            })
          });
        } catch (_) {}
      });

      alert(`📦 PO #${targetPO.poNumber} marked as RECEIVED! Items automatically added to Warehouse Inventory stock.`);
    }
  };

  const deletePO = (poId: string) => {
    if (!confirm("Are you sure you want to delete this Purchase Order?")) return;
    savePurchaseOrders(purchaseOrders.filter(p => p.id !== poId));
  };

  const getPriorityColor = (priority: string) => {
    if (priority?.includes("AOG")) return "bg-rose-500/20 text-rose-400 border-rose-500/40";
    if (priority === "Urgent") return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-slate-800 text-slate-400 border-slate-700";
  };

  const getStatusColor = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "Approved": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "Submitted": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "Received": return "bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold";
      case "Cancelled": return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      default: return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <PartsOperationsLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
                Procurement & PO Desk
              </h1>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>📑</span> OFFICIAL J&T PO VAULT {lastSaved && `(${lastSaved})`}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1">
              Issue & Print Official J&T Purchase Orders for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab("requirements")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${
                activeTab === "requirements"
                  ? "bg-[#1E4FD8] text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚠️ Pending Requirements ({requirements.length})
            </button>
            <button
              onClick={() => setActiveTab("purchase_orders")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${
                activeTab === "purchase_orders"
                  ? "bg-[#1E4FD8] text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📋 PO Vault ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("create_po")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${
                activeTab === "create_po"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛒 + Create Purchase Order
            </button>
          </div>
        </div>

        {/* TAB 1: Pending Purchase Requirements */}
        {activeTab === "requirements" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                  ⚠️ Pending Purchase Requirements
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Parts requested by mechanics that require procurement action.
                </p>
              </div>
              <button
                onClick={fetchRequirements}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                🔄 Refresh
              </button>
            </div>

            {loadingReqs ? (
              <div className="p-12 text-center text-slate-500 font-mono">
                <div className="text-2xl mb-2">⏳</div>
                Loading pending requirements...
              </div>
            ) : requirements.length === 0 ? (
              <div className="p-16 rounded-2xl border border-slate-900 text-center space-y-3"
                   style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-4xl">✅</div>
                <div className="text-xl font-bold text-white">No Pending Mechanic Requirements</div>
                <p className="text-slate-400 font-mono text-sm max-w-md mx-auto">
                  You can still create Purchase Orders directly for stock items or consumables using the button below.
                </p>
                <button
                  onClick={() => setActiveTab("create_po")}
                  className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-lg transition"
                >
                  🛒 + Create Direct Stock Purchase Order
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 overflow-hidden shadow-xl"
                   style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="px-6 py-4 border-b border-amber-500/20 flex items-center justify-between"
                     style={{ background: "rgba(245,158,11,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 text-lg">⚠️</span>
                    <span className="font-bold text-amber-400 text-sm uppercase tracking-wider">
                      {requirements.length} Items Requiring Procurement Action
                    </span>
                  </div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-slate-900" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <tr>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase">REQ ID / Date</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase">Fleet Unit</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase">Part Requested</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase text-center">Qty</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase text-center">Priority</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {requirements.map((req, i) => (
                      <tr key={i} className="hover:bg-amber-900/5 transition duration-150">
                        <td className="px-6 py-4">
                          <div className="font-black text-amber-400 text-sm font-mono">{req.id}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{req.timestamp}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-bold text-sm">{req.fleetUnit}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {req.partPhotoUrl && (
                              <img src={req.partPhotoUrl} alt={req.name} className="h-12 w-12 object-cover rounded-lg border border-amber-500/50 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-white text-sm">{req.name}</div>
                              {(!req.partNumber || req.partNumber === "UNASSIGNED_SKU") ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                    ⚠️ SKU UNASSIGNED
                                  </span>
                                  <button
                                    onClick={() => handleAssignSku(req)}
                                    className="text-[10px] font-bold text-sky-400 hover:text-white underline cursor-pointer"
                                  >
                                    ✏️ Assign SKU
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-[#1E4FD8] font-mono mt-1 flex items-center gap-2">
                                  <span>{req.partNumber}</span>
                                  <button
                                    onClick={() => handleAssignSku(req)}
                                    className="text-[10px] text-slate-500 hover:text-sky-300 cursor-pointer"
                                    title="Edit Part SKU"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                              {req.notes && <div className="text-[10px] text-slate-400 mt-0.5 italic">{req.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-black font-mono text-white">{req.qty}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 text-[9px] font-black rounded border uppercase ${getPriorityColor(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 text-[9px] font-black rounded border uppercase bg-amber-500/20 text-amber-400 border-amber-500/40">
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => { setActiveTab("create_po"); toggleRequirementSelect(req); }}
                            className="px-4 py-2 bg-[#1E4FD8] hover:bg-blue-600 text-white text-xs font-bold rounded-md transition uppercase tracking-wider cursor-pointer"
                          >
                            + Add to PO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Purchase Orders Vault */}
        {activeTab === "purchase_orders" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                📋 Official J&T Purchase Orders Vault
              </h2>
              <span className="text-xs font-mono text-slate-400">Total: {purchaseOrders.length} POs</span>
            </div>

            <div className="space-y-4">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="rounded-2xl border border-slate-900 bg-slate-950/80 overflow-hidden shadow-xl space-y-2">
                  {/* PO Header */}
                  <div className="px-6 py-5 border-b border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xl font-black text-[#1E4FD8] font-mono">{po.poNumber}</span>
                        <span className={`px-3 py-1 text-[9px] font-black rounded border uppercase ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </div>
                      <div className="text-sm text-white font-bold">Supplier: {po.supplier}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        Destination: {po.fleetUnit || "Mexico Pampanga Depot"} · Date: {po.dateCreated} · Prepared By: {po.preparedBy}
                      </div>
                      {po.remarks && <div className="text-xs text-amber-400 font-mono italic">Remarks: {po.remarks}</div>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-mono uppercase">Grand Total</div>
                        <div className="text-2xl font-black text-amber-400">₱{po.grandTotal.toLocaleString()}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 ml-4">
                        <button
                          onClick={() => setPrintablePO(po)}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-lg uppercase cursor-pointer transition flex items-center gap-1.5 shadow-md font-mono"
                        >
                          <span>🖨️</span> Print Official J&T PO
                        </button>

                        {po.status === "Approved" && (
                          <button
                            onClick={() => updatePOStatus(po.id, "Received")}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase cursor-pointer transition shadow-md"
                          >
                            📦 Mark Received
                          </button>
                        )}
                        <button
                          onClick={() => deletePO(po.id)}
                          className="px-3 py-2 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PO Line Items */}
                  <div className="overflow-x-auto px-6 py-3">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead className="border-b border-slate-900 text-[10px] text-slate-500 uppercase">
                        <tr>
                          <th className="py-2">#</th>
                          <th className="py-2">Part Description / SKU</th>
                          <th className="py-2 text-center">Qty</th>
                          <th className="py-2 text-center">Unit</th>
                          <th className="py-2 text-right">Unit Price</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {po.lines.map((line, idx) => (
                          <tr key={idx}>
                            <td className="py-2 text-slate-500">{idx + 1}</td>
                            <td className="py-2">
                              <div className="font-bold text-white">{line.name}</div>
                              <div className="text-[#1E4FD8] text-[10px]">{line.partNumber}</div>
                            </td>
                            <td className="py-2 text-center font-bold text-white">{line.qty}</td>
                            <td className="py-2 text-center text-slate-400">{line.unit || "PC"}</td>
                            <td className="py-2 text-right text-slate-300">₱{line.unitPrice.toLocaleString()}</td>
                            <td className="py-2 text-right font-bold text-amber-400">₱{line.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Create Purchase Order */}
        {activeTab === "create_po" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                🛒 Create Official Purchase Order
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Create POs for mechanic requests or direct stock inventory / consumables.
              </p>
            </div>

            <form onSubmit={handleCreatePO} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left: PO Details & Supplier */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950/90 space-y-4 font-mono">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                    📝 PO Header Details
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">PO Number (J&T Format)</label>
                    <input
                      type="text"
                      value={poForm.poNumber}
                      onChange={e => setPoForm({ ...poForm, poNumber: e.target.value })}
                      className="w-full p-3.5 bg-black border border-slate-800 rounded-xl text-white text-xs font-bold font-mono focus:border-[#1E4FD8] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Vendor / Supplier *</label>
                    <select
                      value={poForm.supplier}
                      onChange={e => setPoForm({ ...poForm, supplier: e.target.value })}
                      className="w-full p-3.5 bg-black border border-slate-800 rounded-xl text-white text-xs font-bold cursor-pointer focus:border-[#1E4FD8] outline-none"
                      required
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Delivery & Payment Notes</label>
                    <textarea
                      value={poForm.remarks}
                      onChange={e => setPoForm({ ...poForm, remarks: e.target.value })}
                      rows={3}
                      className="w-full p-3.5 bg-black border border-slate-800 rounded-xl text-white text-xs resize-none focus:border-[#1E4FD8] outline-none"
                      placeholder="e.g. ASAP Delivery to Mexico Pampanga Hub..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Authorized Representative *</label>
                    <input
                      type="text"
                      value={poForm.authorizedRepresentative}
                      onChange={e => setPoForm({ ...poForm, authorizedRepresentative: e.target.value })}
                      className="w-full p-3.5 bg-black border border-slate-800 rounded-xl text-white text-xs font-bold font-mono focus:border-[#1E4FD8] outline-none"
                      placeholder="e.g. Cindy Halog (Procurement Supervisor)"
                      required
                    />
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-4 font-mono">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    📊 PO Line Summary
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Line Items Count:</span>
                      <span className="text-white font-bold">{poLines.length}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Quantity:</span>
                      <span className="text-white font-bold">{poLines.reduce((s, l) => s + l.qty, 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-3">
                      <span className="text-white font-black uppercase">Grand Total:</span>
                      <span className="text-2xl font-black text-amber-400">₱{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition uppercase tracking-wider text-sm cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    🚀 Create & Print J&T PO
                  </button>
                </div>
              </div>

              {/* Right: Line Items Builder */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Line Items Table */}
                <div className="rounded-2xl border border-slate-900 bg-slate-950/90 overflow-hidden font-mono text-xs">
                  <div className="px-6 py-4 border-b border-slate-800 bg-white/[0.02]">
                    <span className="font-bold text-white uppercase tracking-wider">Line Items Builder ({poLines.length} Items)</span>
                  </div>

                  {poLines.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 space-y-2">
                      <div className="text-2xl">📦</div>
                      <div>No line items in Purchase Order.</div>
                      <p className="text-[10px] text-slate-600">Select mechanic requirements below or click "+ Add Line Item Row" below.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                        <tr>
                          <th className="p-3 pl-6">Description</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3 text-center w-20">Qty</th>
                          <th className="p-3 text-center w-16">Unit</th>
                          <th className="p-3 text-right w-28">Unit Price (₱)</th>
                          <th className="p-3 text-right w-28">Total</th>
                          <th className="p-3 pr-6 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {poLines.map((line) => (
                          <tr key={line.id}>
                            <td className="p-3 pl-6">
                              <input
                                type="text"
                                placeholder="Item Description (e.g. Oil Filter, Towels, Gasket)"
                                value={line.name}
                                onChange={e => updateLineDetails(line.id, "name", e.target.value)}
                                className="w-full bg-black border border-slate-800 rounded p-1.5 text-white font-bold placeholder-slate-600 focus:border-amber-500 outline-none"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="SKU"
                                value={line.partNumber}
                                onChange={e => updateLineDetails(line.id, "partNumber", e.target.value.toUpperCase())}
                                className="w-24 bg-black border border-slate-800 rounded p-1.5 text-[#1E4FD8] font-bold focus:border-amber-500 outline-none"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={line.qty}
                                onChange={e => updateLineDetails(line.id, "qty", parseInt(e.target.value) || 1)}
                                className="w-16 bg-black border border-slate-800 rounded p-1.5 text-center text-white font-bold focus:border-amber-500 outline-none"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                value={line.unit || "PC"}
                                onChange={e => updateLineDetails(line.id, "unit", e.target.value)}
                                className="w-12 bg-black border border-slate-800 rounded p-1.5 text-center text-slate-300 focus:border-amber-500 outline-none"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={line.unitPrice}
                                onChange={e => updateLineDetails(line.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-24 bg-black border border-slate-800 rounded p-1.5 text-right text-amber-400 font-bold focus:border-amber-500 outline-none"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-amber-400">
                              ₱{line.total.toLocaleString()}
                            </td>
                            <td className="p-3 pr-6 text-center">
                              <button
                                type="button"
                                onClick={() => removePoLine(line.id)}
                                className="text-rose-400 hover:text-white font-bold cursor-pointer"
                                title="Remove Line Row"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Inline Add Row Footer (Quotation Module Pattern) */}
                  <div className="p-3 border-t border-slate-800 bg-white/[0.01] flex justify-center">
                    <button
                      type="button"
                      onClick={addCustomPoLine}
                      className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2 font-mono"
                    >
                      <span>➕</span> Add Line Item Row
                    </button>
                  </div>
                </div>

                {/* Pending Mechanic Requirements Checklist */}
                {requirements.length > 0 && (
                  <div className="rounded-2xl border border-slate-900 bg-slate-950/90 overflow-hidden font-mono text-xs">
                    <div className="px-6 py-3 border-b border-slate-800 bg-white/[0.02] flex justify-between items-center">
                      <span className="font-bold text-white uppercase">Or Select Pending Mechanic Requirements ({requirements.length})</span>
                    </div>
                    <div className="divide-y divide-slate-900 max-h-60 overflow-y-auto">
                      {requirements.map((req) => {
                        const isSelected = selectedReqIds.includes(req.id);
                        return (
                          <label key={req.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRequirementSelect(req)}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <div className="flex-1">
                              <div className="font-bold text-white">{req.name} (x{req.qty})</div>
                              <div className="text-[10px] text-slate-400">Fleet: {req.fleetUnit} | SKU: {req.partNumber}</div>
                            </div>
                            <span className="text-[10px] text-amber-400">{req.id}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </form>
          </div>
        )}

        {/* PRINTABLE J&T EXPRESS PURCHASE ORDER MODAL */}
        {printablePO && (
          <div id="printable-jnt-po-modal" className="fixed inset-0 z-50 bg-black/90 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
            {/* Global Print Styles */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
                html, body {
                  width: 210mm !important;
                  height: 297mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-jnt-po-modal,
                #printable-jnt-po-modal * {
                  visibility: visible !important;
                }
                #printable-jnt-po-modal {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 210mm !important;
                  margin: 0 !important;
                  padding: 8mm !important;
                  background: white !important;
                  color: black !important;
                  overflow: visible !important;
                  box-sizing: border-box !important;
                  z-index: 99999 !important;
                  display: block !important;
                }
                .no-print {
                  display: none !important;
                }
                #printable-jnt-doc {
                  border: none !important;
                  box-shadow: none !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-sizing: border-box !important;
                }
              }
            `}</style>

            <div className="w-full max-w-[850px] mb-4 flex justify-between items-center no-print">
              <span className="text-amber-400 font-mono text-xs font-bold uppercase">
                🖨️ OFFICIAL J&T EXPRESS PURCHASE ORDER (PRINT PREVIEW)
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl uppercase transition cursor-pointer font-mono shadow-lg"
                >
                  🖨️ Print Document
                </button>
                <button
                  onClick={() => setPrintablePO(null)}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-black rounded-xl uppercase cursor-pointer hover:bg-slate-700 font-mono"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {/* 100% Exact Replica J&T Document */}
            <div id="printable-jnt-doc" className="bg-white text-black font-sans p-6 max-w-[820px] w-full border border-slate-300 shadow-2xl space-y-3 print:p-0 print:border-none print:shadow-none text-[10px] leading-tight">
              
              {/* Header: Logo & PO Metadata Table */}
              <div className="flex justify-between items-start border-b-2 border-black pb-2">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#CC0000] font-black text-3xl tracking-tighter italic font-sans">J&T</span>
                    <span className="text-[#CC0000] font-black text-xs tracking-widest uppercase">EXPRESS</span>
                  </div>
                  <h1 className="text-xl font-extrabold text-black uppercase mt-1 tracking-wider font-sans">Purchase Order</h1>
                </div>

                <table className="border-collapse border border-black text-[9px]">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100 w-24">Date</td>
                      <td className="border border-black px-2 py-0.5 text-center">{printablePO.dateCreated}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100">PO Number</td>
                      <td className="border border-black px-2 py-0.5 font-bold text-center">{printablePO.poNumber}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100">Area Code</td>
                      <td className="border border-black px-2 py-0.5 text-center font-bold">PAMPANGA DC-730</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100">Delivery Date</td>
                      <td className="border border-black px-2 py-0.5 text-center font-bold">ASAP</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100">Delivery Address</td>
                      <td className="border border-black px-2 py-0.5 max-w-[220px] text-center font-semibold leading-tight">
                        Blk 18, J&T Warehouse, Unimax Compund, NEW MEXICO BUSINESS PARK ANAO MEXICO PAMPANGA
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-0.5 font-bold bg-slate-100">Contact Number</td>
                      <td className="border border-black px-2 py-0.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Client vs Vendor Table */}
              <div className="border border-black">
                <div className="grid grid-cols-2 bg-[#CC0000] text-white font-bold text-center py-0.5 text-[10px] border-b border-black">
                  <div>Client</div>
                  <div className="border-l border-white">Vendor</div>
                </div>
                <div className="grid grid-cols-2 text-[9px] divide-x divide-black">
                  <div className="p-1.5 space-y-0.5">
                    <div><span className="font-bold">Company:</span> <span className="font-bold text-black">PH Global JET Express Inc.</span></div>
                    <div><span className="font-bold">Company Address:</span> 9th and 11th Floor Marajo Tower 26th St. Cor. 4th Avenue, Fort Bonifacio, 1630 Taguig City</div>
                    <div><span className="font-bold">Authorized Representative:</span> Cindy Halog</div>
                    <div><span className="font-bold">Contact Number:</span> 09262420561</div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <div><span className="font-bold">Company:</span> <span className="font-bold text-black">{printablePO.supplier || "TRUCKGEAR TRUCK PARTS STORE"}</span></div>
                    <div><span className="font-bold">Company Address:</span> 1032 A. BONIFACIO ST., BALINTAWAK, BALINGASA, 1115 QUEZON CITY - 00002 NCR, SECOND DISTRICT PHILIPPINES</div>
                    <div><span className="font-bold">Authorized Representative:</span> BEN ANTHONY BAGALIHOG</div>
                    <div><span className="font-bold">Contact Number:</span> 09285066385</div>
                  </div>
                </div>
              </div>

              {/* Item Details Table */}
              <div className="border border-black">
                <div className="bg-[#CC0000] text-white font-bold text-left px-2 py-0.5 text-[10px] border-b border-black">
                  Item Details
                </div>
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead className="bg-slate-100 border-b border-black font-bold text-center">
                    <tr>
                      <th className="border-r border-black p-1 w-10">Item No</th>
                      <th className="border-r border-black p-1 text-left">Item Description</th>
                      <th className="border-r border-black p-1 w-14">Quantity</th>
                      <th className="border-r border-black p-1 w-12">Unit</th>
                      <th className="border-r border-black p-1 text-right w-20">Unit Price</th>
                      <th className="p-1 text-right w-24">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono">
                    {printablePO.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                        <td className="border-r border-black p-1 font-bold uppercase">{line.name}</td>
                        <td className="border-r border-black p-1 text-center">{line.qty}</td>
                        <td className="border-r border-black p-1 text-center">{line.unit || "SET"}</td>
                        <td className="border-r border-black p-1 text-right">{line.unitPrice}</td>
                        <td className="p-1 text-right font-bold">₱{line.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Empty placeholder rows for visual table structure */}
                    {Array.from({ length: Math.max(0, 7 - printablePO.lines.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className="border-r border-black p-1.5">&nbsp;</td>
                        <td className="border-r border-black p-1.5">&nbsp;</td>
                        <td className="border-r border-black p-1.5">&nbsp;</td>
                        <td className="border-r border-black p-1.5">&nbsp;</td>
                        <td className="border-r border-black p-1.5">&nbsp;</td>
                        <td className="p-1.5">&nbsp;</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={6} className="p-1 text-center text-slate-700 font-bold italic border-t border-black font-sans">
                        *Nothing Follows*
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Subtotal & Total Box */}
                <div className="border-t border-black flex justify-end font-mono text-[9px]">
                  <div className="w-60 border-l border-black divide-y divide-black">
                    <div className="flex justify-between p-1">
                      <span className="font-bold">SUBTOTAL</span>
                      <span className="font-bold">₱{printablePO.grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-1">
                      <span className="font-bold">VAT</span>
                      <span>inclusive</span>
                    </div>
                    <div className="flex justify-between p-1">
                      <span className="font-bold">FREIGHT</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between p-1 bg-slate-100 font-black text-[11px] border-t-2 border-black">
                      <span>TOTAL</span>
                      <span className="border border-black px-2 py-0.5">₱{printablePO.grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms and Billing Details */}
              <div className="border border-black">
                <div className="bg-[#CC0000] text-white font-bold text-left px-2 py-0.5 text-[10px] border-b border-black">
                  Payment Terms and Billing Details
                </div>
                <div className="p-2 space-y-1.5 text-[9px] font-sans">
                  <div>
                    <span className="font-bold">Payment Method:</span><br />
                    <span>☐Check</span><br />
                    <span>☐Bank Transfer.</span>
                  </div>

                  <div className="space-y-0.5 pt-0.5">
                    <div className="font-bold">Account information of the Vendor:</div>
                    <div><span className="font-bold">Bank Name:</span></div>
                    <div><span className="font-bold">Account Name:</span></div>
                    <div><span className="font-bold">Account Number:</span></div>
                    <div><span className="font-bold">Swift Code:</span></div>
                    <div><span className="font-bold">Branch Name and Address:</span></div>
                    <div><span className="font-bold">Beneficiary AC No.:</span></div>
                  </div>

                  <div className="border-t border-black pt-1 space-y-0.5">
                    <div className="font-bold">Billing Details:</div>
                    <div>Company official name: PH Global JET Express Inc.</div>
                    <div>Billing address: 9th and 11th Flr, Marajo Tower, 26th St. Cor 4th Ave., Fort Bonifacio 1630 Taguig City NCR, Fourth District Philippines.</div>
                    <div>Business Style: J&T Express</div>
                    <div>TIN: 010-133-971-000</div>
                  </div>
                </div>
              </div>

              {/* Other Agreements */}
              <div className="border border-black">
                <div className="bg-[#CC0000] text-white font-bold text-left px-2 py-0.5 text-[10px] border-b border-black">
                  Other Agreements
                </div>
                <div className="p-1.5 text-[7.5px] text-black space-y-1 leading-tight font-sans">
                  <p>1. The Products as defined in this PO shall be free from defect and consistent with the requirements prescribed by the Client. Should there be any defect in the quality of each unit upon delivery by the Vendor which shall include but not limited to incomplete visual markings, improper configuration of visuals markings, erroneous printouts, non-inclusion of standard tools, and/or imperfection in the external and internal structure of the vehicles, the Client has the right to impose a penalty. The Vendor shall cause the repair, rectification, or replacement of the Products with no charge.</p>
                  <p>2. Each party shall hold in strictest confidence all information that it may receive, or may be exposed to, in the course of this transaction, whether such information be transmitted digitally, electronically, verbally, in writing or otherwise. Breach of this obligation by any party in this Agreement shall grant the offended party the right to terminate this Agreement without penalties or liability and without prejudice to the right of the offended party to resort to available legal remedies to protect its interest. The obligations arising from this provision shall remain even after the termination of the Agreement.</p>
                </div>
              </div>

              {/* Signatories */}
              <div className="border border-black">
                <div className="bg-[#CC0000] text-white font-bold text-left px-2 py-0.5 text-[10px] border-b border-black">
                  Signatories
                </div>
                <div className="grid grid-cols-2 text-[9px] divide-x divide-black text-center font-sans">
                  
                  {/* Left Column: PH Global JET Express Inc. */}
                  <div className="p-2.5 flex flex-col justify-between min-h-[140px]">
                    <div className="text-[#CC0000] font-bold uppercase text-left border-b border-black pb-0.5">
                      PH Global JET Express Inc.
                    </div>

                    {/* Handwritten Signature Stamp */}
                    <div className="py-2 my-auto text-center">
                      <div className="inline-block relative">
                        <div className="text-xl font-bold italic text-[#1E4FD8] tracking-tighter transform -rotate-6 select-none font-mono">
                          CINDY HALOG
                        </div>
                        <div className="text-[7px] text-[#CC0000] font-black uppercase tracking-widest -mt-1">
                          express Inc.
                        </div>
                      </div>
                      
                      <div className="border-t border-black w-4/5 mx-auto mt-2 pt-0.5 text-[8.5px]">
                        Procurement Supervisor/Manager
                      </div>
                      
                      <div className="text-[8px] text-black mt-1 leading-tight">
                        <div>Noted by</div>
                        <div className="font-mono text-[8px]">GenAp0202202690583</div>
                        <div className="font-bold text-[8px] uppercase">APPROVED VIA OA APPROVAL</div>
                      </div>
                    </div>

                    <div className="border-t border-black pt-0.5 text-[8.5px] uppercase">
                      <div className="font-bold">RGM</div>
                      <div>Approved by</div>
                    </div>
                  </div>

                  {/* Right Column: Vendor */}
                  <div className="p-2.5 flex flex-col justify-between min-h-[140px]">
                    <div className="text-[#CC0000] font-bold uppercase text-left border-b border-black pb-0.5">
                      Vendor
                    </div>

                    <div className="py-6 my-auto text-center">
                      <div className="border-t border-black w-4/5 mx-auto pt-0.5 text-[8.5px]">
                        <div className="font-bold">Sales Representative</div>
                        <div>Acknowledged by</div>
                      </div>
                    </div>

                    <div className="border-t border-black pt-0.5 text-[8.5px] uppercase text-center">
                      <div className="font-bold">Management</div>
                      <div>Approved by</div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PartsOperationsLayout>
  );
}
