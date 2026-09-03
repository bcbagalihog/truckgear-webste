import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";

interface Part {
  id?: number;
  name: string;
  part_number: string;
  description: string;
  quantity: number;
  reorder_level: number;
  supplier?: string;
}

interface PartRequest {
  id: string;
  fleetUnit: string;
  partNumber: string;
  name: string;
  qty: number;
  priority: string;
  status: string;
  timestamp: string;
}

export default function WarehouseInventoryView() {
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [dispatchLog, setDispatchLog] = useState<any[]>([]);
  const [parts, setParts] = useState<Part[]>([
    { id: 1, name: "Premium Oil Filter (Heavy Duty)", part_number: "TG-OIL-001", description: "Hino 500 & Isuzu Giga oil filter core", quantity: 45, reorder_level: 10, supplier: "Monroe Cabin Systems Co." },
    { id: 2, name: "Full Performance Brake Pads", part_number: "TG-BRAKE-202", description: "Heavy duty ceramic brake pads", quantity: 12, reorder_level: 15, supplier: "Meritor Heavy-Duty Axles" },
    { id: 3, name: "Clutch Assembly Kit v2", part_number: "TG-CLUTCH-99", description: "Heavy transport application assembly", quantity: 3, reorder_level: 5, supplier: "TruckGear Parts Philippines" },
    { id: 4, name: "Premium Alternator Fan Belt", part_number: "TG-BELT-404", description: "Double ribbed alternator belt", quantity: 2, reorder_level: 5, supplier: "Local Stock" },
    { id: 5, name: "Ethylene Glycol Coolant (Gallon)", part_number: "TG-FLUID-303", description: "Anti-corrosion radiator coolant", quantity: 18, reorder_level: 8, supplier: "KoyoRad Aluminum Coolant Ltd." }
  ]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showDispatchLog, setShowDispatchLog] = useState(false);

  useEffect(() => {
    async function loadInventory() {
      try {
        setLoading(true);
        const res = await fetch("/api/inventory/search?q=");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setParts(data);
          }
        }

        const localReq = localStorage.getItem("partsman_maintenance_requests_jetexpress");
        if (localReq !== null) {
          try {
            const parsed = JSON.parse(localReq);
            if (Array.isArray(parsed)) setRequests(parsed);
          } catch {}
        }
        const reqRes = await fetch("/api/inventory/maintenance");
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          if (Array.isArray(reqData)) {
            setRequests(reqData);
            localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(reqData));
          }
        }

        // Load dispatch log
        const logRes = await fetch("/api/inventory/dispatch-log");
        if (logRes.ok) {
          const logData = await logRes.json();
          if (Array.isArray(logData)) setDispatchLog(logData);
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, []);

  const [newPart, setNewPart] = useState({
    sku: "",
    name: "",
    location: "",
    brand: "TruckGear",
    quantity: 0,
    reorder_level: 5
  });

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.part_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier && p.supplier.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.sku || !newPart.name) return;

    try {
      const res = await fetch("/api/inventory/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPart)
      });
      if (res.ok) {
        const searchRes = await fetch("/api/inventory/search?q=");
        if (searchRes.ok) {
          const data = await searchRes.json();
          setParts(data);
        }
      }
    } catch (err) {
      console.error("Failed to save part:", err);
    } finally {
      setShowAddModal(false);
      setNewPart({ sku: "", name: "", location: "", brand: "TruckGear", quantity: 0, reorder_level: 5 });
    }
  };

  const handleDispatch = async (req: PartRequest, stockPart: Part) => {
    const previousQty = stockPart.quantity;
    const newQty = Math.max(0, previousQty - req.qty);

    // 1. Optimistically update React state so UI reflects immediately
    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, status: "Dispatched" } : r);
    setRequests(updatedReqs);

    const updatedParts = parts.map(p =>
      (stockPart.id && p.id === stockPart.id) || p.part_number === stockPart.part_number
        ? { ...p, quantity: newQty }
        : p
    );
    setParts(updatedParts);

    // 2. Persist maintenance request status to "Dispatched" in server vault
    try {
      await fetch(`/api/inventory/maintenance/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dispatched" })
      });
    } catch (e) { console.error("Failed to update maintenance status:", e); }

    // 3. Persist inventory deduction — try by id first, then by sku/part_number, then by name
    const targetId = stockPart.id ?? stockPart.part_number;
    try {
      const updateRes = await fetch(`/api/inventory/update/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: newQty,
          partNumber: stockPart.part_number,
          name: stockPart.name,
        })
      });
      const updateResult = await updateRes.json();
      console.log("Inventory update result:", updateResult);
    } catch (e) { console.error("Failed to update inventory quantity:", e); }

    // 4. Save dispatch log record to server vault
    const logEntry = {
      id: `DSP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      partNumber: stockPart.part_number,
      partName: stockPart.name,
      qty: req.qty,
      fleetUnit: req.fleetUnit,
      dispatchedBy: "Stock Man",
      previousQty,
      newQty,
    };
    setDispatchLog(prev => [logEntry, ...prev]);
    try {
      await fetch("/api/inventory/dispatch-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry)
      });
    } catch (e) { console.error("Failed to save dispatch log:", e); }

    // 5. Update localStorage for maintenance requests
    localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(updatedReqs));

    // 6. Reload parts from server to confirm the persisted value
    try {
      const reloadRes = await fetch("/api/inventory/search?q=");
      if (reloadRes.ok) {
        const freshParts = await reloadRes.json();
        if (Array.isArray(freshParts) && freshParts.length > 0) {
          setParts(freshParts);
        }
      }
    } catch (e) { console.error("Failed to reload inventory:", e); }

    alert(`✅ Dispatched ${req.qty}x ${req.name} → ${req.fleetUnit}. Inventory deducted: ${previousQty} → ${newQty}. Dispatch log saved.`);
  };

  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const handleSavePartEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    const targetId = editingPart.id ?? editingPart.part_number;
    try {
      const res = await fetch(`/api/inventory/update/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: editingPart.quantity,
          partNumber: editingPart.part_number,
          sku: editingPart.part_number,
          name: editingPart.name,
          description: editingPart.description,
          reorder_level: editingPart.reorder_level,
          supplier: editingPart.supplier
        })
      });
      if (res.ok) {
        setParts(prev => prev.map(p => ((editingPart.id && p.id === editingPart.id) || p.part_number === editingPart.part_number) ? editingPart : p));
        alert(`Part ${editingPart.name} (${editingPart.part_number}) updated successfully!`);
      }
    } catch (err) {
      console.error("Failed to update part:", err);
    } finally {
      setEditingPart(null);
    }
  };

  const handleDeletePart = async (part: Part) => {
    if (!confirm(`Are you sure you want to delete part ${part.name} (${part.part_number}) from warehouse inventory?`)) return;
    const targetId = part.id ?? part.part_number;
    setParts(prev => prev.filter(p => (part.id ? p.id !== part.id : true) && p.part_number !== part.part_number));
    try {
      await fetch(`/api/inventory/delete/${targetId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete part:", err);
    }
  };

  const handleOrder = (req: PartRequest) => {
    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, status: "Pending Purchase" } : r);
    setRequests(updatedReqs);
    localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(updatedReqs));
    fetch(`/api/inventory/maintenance/${req.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Pending Purchase" })
    }).catch(console.error);
    alert(`Purchase request for ${req.qty}x ${req.name} sent to procurement.`);
  };


  return (
    <PartsOperationsLayout>
      <div className="space-y-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">Warehouse Inventory</h1>
            <p className="text-slate-400 font-mono text-sm mt-1">Monitor Available Stock, Locations, and Safety Thresholds</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#1E4FD8] text-white px-5 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-[0_0_15px_rgba(30,79,216,0.4)] flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              + Add New Part
            </button>
            <button 
              onClick={() => setShowScannerModal(true)}
              className="bg-transparent border border-[#F59E0B] text-[#F59E0B] px-5 py-3 rounded-lg font-bold hover:bg-[#F59E0B] hover:text-black transition flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              📸 AI Invoice Scanner
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 rounded-2xl border border-slate-900 shadow-xl"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Query parts by name, SKU, or shelf location... (Full-text enabled)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-4 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white placeholder-slate-600 focus:outline-none focus:border-[#1E4FD8] focus:ring-1 focus:ring-[#1E4FD8] transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] text-sm font-mono"
            />
            <button
              onClick={() => {}}
              className="bg-transparent border border-[#1E4FD8] text-[#1E4FD8] px-8 py-4 rounded-lg font-bold hover:bg-[#1E4FD8] hover:text-white transition uppercase tracking-wider text-xs cursor-pointer"
            >
              Search DB
            </button>
          </div>
        </div>

        {/* MECHANIC / MAINTENANCE REQUESTS BOARD */}
        <div className="rounded-2xl border border-rose-900 shadow-xl overflow-hidden mb-8"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="bg-rose-900/30 px-6 py-4 border-b border-rose-900 flex justify-between items-center">
            <h2 className="text-xl font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
              <span>⚠️</span> Pending Mechanic Requests
            </h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-slate-900" style={{ background: "rgba(255,255,255,0.02)" }}>
              <tr>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Request ID / Date</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Target Fleet Unit</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Requested Part</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Priority</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {requests.filter(r => r.status === "Pending Dispatch").length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-mono">NO PENDING MECHANIC REQUESTS.</td></tr>
              ) : requests.filter(r => r.status === "Pending Dispatch").map((req, i) => {
                const stockPart = parts.find(p => p.part_number === req.partNumber || p.name === req.name);
                const isAvailable = stockPart && stockPart.quantity >= req.qty;
                return (
                <tr key={i} className="hover:bg-rose-900/10 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{req.id}</div>
                    <div className="text-xs text-slate-400 mt-1">{req.timestamp}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm font-semibold">{req.fleetUnit}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(req as any).partPhotoUrl && (
                        <a href={(req as any).partPhotoUrl} target="_blank" rel="noreferrer" title="Click to view mechanic part photo">
                          <img src={(req as any).partPhotoUrl} alt={req.name} className="h-10 w-10 object-cover rounded-lg border border-amber-500/50 hover:border-amber-400 transition flex-shrink-0" />
                        </a>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">{req.name}</div>
                        <div className="text-xs text-[#1E4FD8] font-mono mt-1">{req.partNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-black font-mono text-white">{req.qty}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 text-[9px] font-black rounded border uppercase tracking-wider ${req.priority.includes("AOG") ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : req.priority === "Urgent" ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAvailable ? (
                      <button 
                        onClick={() => handleDispatch(req, stockPart)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-md transition uppercase tracking-wider shadow-[0_0_10px_rgba(225,29,72,0.4)] cursor-pointer">
                        Dispatch
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleOrder(req)}
                        className="px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black text-xs font-black rounded-md transition uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.4)] cursor-pointer">
                        Order Parts
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Inventory Table */}
        <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-slate-900" style={{ background: "rgba(255,255,255,0.02)" }}>
              <tr>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Part Name</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Part #</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">In Stock</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredParts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-mono">NO RECORDS MATCHING INQUIRY.</td></tr>
              ) : filteredParts.map((part, index) => {
                const isCritical = part.quantity <= (part.reorder_level || 0);
                return (
                  <tr key={index} className="hover:bg-white/[0.03] transition duration-150">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{part.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{part.description}</div>
                    </td>
                    <td className="px-6 py-4 text-[#1E4FD8] font-mono text-xs font-semibold">{part.part_number}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold font-mono ${isCritical ? "text-[#F59E0B]" : "text-emerald-400"}`}>
                        {part.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isCritical ? (
                        <span className="px-3 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-black rounded border border-[#F59E0B]/40 uppercase tracking-wider">
                          Critical
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/40 uppercase tracking-wider">
                          Optimal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300 font-semibold">{part.supplier || "Local Stock"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingPart(part)}
                          className="px-3 py-1.5 bg-blue-950/60 border border-blue-800 text-blue-300 hover:bg-blue-800 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                          title="Edit Inventory Part"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeletePart(part)}
                          className="px-2.5 py-1.5 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                          title="Delete Inventory Part"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dispatch History Log */}
        <div className="rounded-2xl border border-slate-900 overflow-hidden shadow-xl"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          <div
            className="px-6 py-4 border-b border-slate-900 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] transition"
            style={{ background: "rgba(255,255,255,0.02)" }}
            onClick={() => setShowDispatchLog(!showDispatchLog)}
          >
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-base">📦</span>
              <span className="font-bold text-white text-sm uppercase tracking-wider">Dispatch History Log</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/40">
                {dispatchLog.length} Records
              </span>
            </div>
            <span className="text-slate-500 text-xs font-mono">{showDispatchLog ? "▲ Collapse" : "▼ Show Log"}</span>
          </div>

          {showDispatchLog && (
            dispatchLog.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">NO DISPATCH RECORDS LOGGED YET.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">Log ID / Req</th>
                    <th className="p-3">Dispatched Part</th>
                    <th className="p-3">Fleet Unit</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-center">Stock Change</th>
                    <th className="p-3">Date / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs font-mono">
                  {dispatchLog.map((entry: any, i: number) => (
                    <tr key={i} className="hover:bg-emerald-900/5 transition">
                      <td className="p-3 text-slate-400">
                        <div className="font-bold text-emerald-400">{entry.id}</div>
                        <div className="text-[9px] text-slate-600">Req: {entry.requestId}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{entry.partName}</div>
                        <div className="text-[#1E4FD8] text-xs font-mono">{entry.partNumber}</div>
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">{entry.fleetUnit}</td>
                      <td className="p-3 text-center font-black text-white">{entry.qty}</td>
                      <td className="p-3 text-center">
                        <span className="text-slate-400">{entry.previousQty}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-emerald-400 font-bold">{entry.newQty}</span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-PH") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* MODAL: Add New Part Form */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">➕ Register New Part SKU</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>
              
              <form onSubmit={handleAddPart} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Part Number / SKU</label>
                    <input 
                      type="text" 
                      placeholder="e.g. TG-AXLE-505"
                      value={newPart.sku}
                      onChange={(e) => setNewPart({...newPart, sku: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Part Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Heavy Duty Axle"
                      value={newPart.name}
                      onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Warehouse Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SHELF-A2"
                      value={newPart.location}
                      onChange={(e) => setNewPart({...newPart, location: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Supplier / Brand</label>
                    <input 
                      type="text" 
                      placeholder="e.g. TruckGear, Monroe"
                      value={newPart.brand}
                      onChange={(e) => setNewPart({...newPart, brand: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Initial Qty In Stock</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 0})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Reorder Level Threshold</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newPart.reorder_level}
                      onChange={(e) => setNewPart({...newPart, reorder_level: parseInt(e.target.value) || 5})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2 cursor-pointer"
                >
                  Register & Commit Stock
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: AI Invoice Scanner */}
        {showScannerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                  <span>📸</span> PARTSMAN AI Invoice OCR Scanner
                </h3>
                <button 
                  onClick={() => setShowScannerModal(false)} 
                  className="text-slate-500 hover:text-white font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div 
                onClick={() => {
                  alert("Simulated AI Scanner: 3 items extracted from supplier invoice!");
                  setShowScannerModal(false);
                }}
                className="border-2 border-dashed border-slate-800 hover:border-[#F59E0B] bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl p-12 text-center cursor-pointer transition duration-300 space-y-4"
              >
                <div className="text-5xl">📄</div>
                <div>
                  <p className="font-bold text-slate-200">Drag & drop supplier invoice PDF / Image here</p>
                  <p className="text-xs text-slate-500 mt-1">Supports Meritor, Monroe, Fuso, Isuzu supply receipts</p>
                </div>
                <button className="bg-slate-900 border border-slate-800 text-slate-300 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Select Invoice File
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PartsOperationsLayout>
  );
}
