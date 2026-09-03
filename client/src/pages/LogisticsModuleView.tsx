import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";

interface DeliveryItem {
  sku: string;
  name: string;
  qty: number;
}

interface DeliveryReceipt {
  id: string;
  invoiceId: string;
  dispatchDate: string;
  destinationDepot: string;
  truckPlate: string;
  driver: string;
  status: "Preparing Order" | "Dispatched" | "In Transit" | "Delivered";
  company: string;
  podImage: string;
  items: DeliveryItem[];
  notes: string;
}

export default function LogisticsModuleView() {
  const [location] = useLocation();
  const isAdminPath = location.startsWith("/admin");

  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>("PH GLOBAL JET EXPRESS INC.");

  const clientCompany = isAdminPath
    ? selectedCompany
    : (user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.");

  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  const userRole = (user?.role || localStorage.getItem("user_role") || "client").toLowerCase();
  const isTruckGearStaff = isAdminPath || userRole === "admin" || userRole === "staff";

  const initialReceipts: DeliveryReceipt[] = [
    {
      id: "DR-2026-8801",
      invoiceId: "INV-5808",
      dispatchDate: "2026-08-21",
      destinationDepot: "Paranaque Central Distribution Depot",
      truckPlate: "ABC-1234",
      driver: "Rodrigo Santos",
      status: "In Transit",
      company: clientCompany,
      podImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
      items: [
        { sku: "JET-OIL-001", name: "Fleet Oil Filter Core (Isuzu Giga)", qty: 10 },
        { sku: "JET-FLUID-303", name: "Radiator Coolant Pre-Mix (Gallon)", qty: 5 }
      ],
      notes: "Urgent depot stock replenishment dispatch. Driver on route via SLEX."
    },
    {
      id: "DR-2026-8794",
      invoiceId: "INV-5805",
      dispatchDate: "2026-08-20",
      destinationDepot: "Bulacan Logistics Hub",
      truckPlate: "DEF-5678",
      driver: "Juan Dela Cruz",
      status: "Delivered",
      company: clientCompany,
      podImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
      items: [
        { sku: "JET-BRAKE-202", name: "Full Performance Brake Pads", qty: 4 },
        { sku: "JET-BELT-404", name: "Premium Alternator Fan Belt", qty: 2 }
      ],
      notes: "Delivered & signed by Warehouse Receiving Supervisor Engr. Santos."
    },
    {
      id: "DR-2026-8780",
      invoiceId: "INV-5804",
      dispatchDate: "2026-08-19",
      destinationDepot: "Batangas Port Fleet Terminal",
      truckPlate: "GHI-9012",
      driver: "Danilo Ramos",
      status: "Dispatched",
      company: clientCompany,
      podImage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
      items: [
        { sku: "TG-CLUTCH-99", name: "Clutch Assembly Kit v2", qty: 2 }
      ],
      notes: "Dispatched from TruckGear Central Warehouse, ETA 4:00 PM."
    }
  ];

  const [receipts, setReceipts] = useState<DeliveryReceipt[]>(initialReceipts);
  const [selectedDr, setSelectedDr] = useState<DeliveryReceipt | null>(null);
  const [showPodModal, setShowPodModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create Form State
  const [newDrForm, setNewDrForm] = useState({
    invoiceId: "INV-5808",
    dispatchDate: new Date().toISOString().split("T")[0],
    destinationDepot: "Paranaque Central Distribution Depot",
    truckPlate: "ABC-1234",
    driver: "Rodrigo Santos",
    notes: "Direct depot dispatch request.",
    itemSku: "JET-OIL-001",
    itemName: "Fleet Oil Filter Core (Isuzu Giga)",
    itemQty: 5,
    podImage: ""
  });
  const [uploadingPod, setUploadingPod] = useState(false);

  const handlePodFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPod(true);
    const formData = new FormData();
    formData.append("pod_image", file);
    formData.append("company", clientCompany);
    if (selectedDr) formData.append("drId", selectedDr.id);

    try {
      const res = await fetch("/api/logistics/upload-pod", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setNewDrForm(prev => ({ ...prev, podImage: data.imageUrl }));
        if (selectedDr) {
          const updatedDr = { ...selectedDr, podImage: data.imageUrl };
          setSelectedDr(updatedDr);
          const updatedReceipts = receipts.map(r => r.id === selectedDr.id ? updatedDr : r);
          saveReceiptsState(updatedReceipts, updatedDr);
        }
        alert("📷 Delivery Receipt photo / POD scan uploaded successfully!");
      }
    } catch (err) {
      console.error("Failed to upload POD photo:", err);
    } finally {
      setUploadingPod(false);
    }
  };

  // Save Receipts to LocalStorage & Server Vault
  const saveReceiptsState = (updatedVault: DeliveryReceipt[], targetDr?: DeliveryReceipt) => {
    try {
      setReceipts(updatedVault);
      localStorage.setItem("partsman_delivery_receipts_jetexpress", JSON.stringify(updatedVault));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (targetDr) {
        fetch(`/api/logistics/dr/${targetDr.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetDr, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Failed to save delivery receipts:", err);
    }
  };

  // Load Receipts from LocalStorage + Server Vault API
  const fetchReceiptsVault = async () => {
    try {
      const localData = localStorage.getItem("partsman_delivery_receipts_jetexpress");
      if (localData !== null) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            setReceipts(parsed);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      const res = await fetch("/api/logistics/dr");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReceipts(data);
          localStorage.setItem("partsman_delivery_receipts_jetexpress", JSON.stringify(data));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Failed to fetch delivery receipts vault:", err);
    }
  };

  useEffect(() => {
    fetchReceiptsVault();
  }, []);

  // Filtered Receipts
  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.truckPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.destinationDepot.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.driver.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handler to update status
  const handleUpdateStatus = (id: string, newStatus: DeliveryReceipt["status"]) => {
    const updated = receipts.map(r => r.id === id ? { ...r, status: newStatus } : r);
    const target = updated.find(r => r.id === id);
    saveReceiptsState(updated, target);
  };

  // Handler to delete receipt
  const handleDeleteDr = async (id: string) => {
    if (!confirm(`Are you sure you want to delete Delivery Receipt #${id}?`)) return;
    const updated = receipts.filter(r => r.id !== id);
    saveReceiptsState(updated);

    try {
      await fetch(`/api/logistics/dr/${id}`, { method: "DELETE" });
    } catch (_) {}
    alert(`Delivery Receipt #${id} deleted.`);
  };

  // Handler to create new Delivery Receipt
  const handleCreateDr = async (e: React.FormEvent) => {
    e.preventDefault();

    const created: DeliveryReceipt = {
      id: `DR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: newDrForm.invoiceId,
      dispatchDate: newDrForm.dispatchDate,
      destinationDepot: newDrForm.destinationDepot,
      truckPlate: newDrForm.truckPlate,
      driver: newDrForm.driver,
      status: "Dispatched",
      company: clientCompany,
      podImage: newDrForm.podImage || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
      items: [
        { sku: newDrForm.itemSku, name: newDrForm.itemName, qty: Number(newDrForm.itemQty) || 1 }
      ],
      notes: newDrForm.notes
    };

    const updatedVault = [created, ...receipts];
    saveReceiptsState(updatedVault, created);

    try {
      await fetch("/api/logistics/dr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch (_) {}

    setShowCreateModal(false);
    alert(`New Delivery Receipt #${created.id} issued & saved to vault!`);
  };

  const mainContent = (
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/80 p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              {!isAdminPath ? (
                <Link href="/portal" className="text-slate-400 hover:text-white font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                  ← BACK TO PORTAL
                </Link>
              ) : (
                <span className="text-xs font-mono font-bold text-amber-400">
                  🚚 TRUCKGEAR STAFF LOGISTICS MANAGER
                </span>
              )}
              <span className="text-slate-700">|</span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>💾</span> AUTO-SAVED TO VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase font-sans mt-2">
              Logistics & Delivery Receipts (DR)
            </h1>
            <p className="text-slate-400 font-mono text-xs mt-0.5">
              Live Fleet Shipment Dispatch & Signed Proof of Delivery (POD) Vault for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdminPath && (
              <div className="font-mono text-xs">
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Client Account:</label>
                <select
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                  className="bg-black border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:border-yellow-400 outline-none cursor-pointer"
                >
                  <option value="PH GLOBAL JET EXPRESS INC.">PH GLOBAL JET EXPRESS INC.</option>
                  <option value="TruckGear Philippines Co.">TruckGear Philippines Co.</option>
                </select>
              </div>
            )}
            {isTruckGearStaff && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#1E4FD8] hover:bg-blue-600 text-white px-5 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(30,79,216,0.3)] cursor-pointer"
              >
                + Issue Delivery Receipt
              </button>
            )}
          </div>
        </div>

        {/* Live Dispatch Pipeline Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Preparing Orders</div>
            <div className="text-3xl font-black text-amber-400">
              {receipts.filter(r => r.status === "Preparing Order").length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Warehouse Allocation</div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Dispatched</div>
            <div className="text-3xl font-black text-blue-400">
              {receipts.filter(r => r.status === "Dispatched").length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Left Central Yard</div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">In Transit</div>
            <div className="text-3xl font-black text-purple-400">
              {receipts.filter(r => r.status === "In Transit").length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">En Route to Depot</div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Delivered & Signed</div>
            <div className="text-3xl font-black text-emerald-400">
              {receipts.filter(r => r.status === "Delivered").length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">POD Verified</div>
          </div>
        </div>

        {/* Delivery Receipts Ledger Table */}
        <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-6"
             style={{ background: "rgba(255,255,255,0.01)" }}>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🚚</span> Master Delivery Receipts Ledger
            </h2>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search DR #, Invoice #, Plate, Driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2.5 bg-black border border-slate-800 rounded-lg text-white text-xs font-mono w-full md:w-64"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2.5 bg-black border border-slate-800 rounded-lg text-white text-xs font-mono cursor-pointer"
              >
                <option value="ALL">Status: All Statuses</option>
                <option value="Preparing Order">Preparing Order</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-4">DR Number & Date</th>
                  <th className="p-4">Sales Invoice Link</th>
                  <th className="p-4">Destination Depot</th>
                  <th className="p-4">Truck & Driver</th>
                  <th className="p-4 text-center">Items Shipped</th>
                  <th className="p-4 text-center">Dispatch Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-900 text-xs font-mono text-slate-300">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center bg-black/40 text-slate-500">
                      No delivery receipts found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((dr) => (
                    <tr key={dr.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-4">
                        <div className="font-black text-[#1E4FD8] text-sm">{dr.id}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Date: {dr.dispatchDate}</div>
                      </td>
                      <td className="p-4 font-bold text-amber-400">
                        {dr.invoiceId}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{dr.destinationDepot}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{dr.notes}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{dr.driver}</div>
                        <div className="text-[10px] text-blue-400 font-mono">Plate: {dr.truckPlate}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-white">
                        {dr.items.reduce((acc, it) => acc + it.qty, 0)} Units
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${
                          dr.status === "Delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                          dr.status === "In Transit" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                          dr.status === "Dispatched" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}>
                          {dr.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => { setSelectedDr(dr); setShowPodModal(true); }}
                          className="px-3 py-1.5 bg-[#1E4FD8] text-white font-bold rounded text-[10px] uppercase hover:bg-blue-600 transition cursor-pointer"
                        >
                          👁️ View POD
                        </button>
                        {isTruckGearStaff && dr.status !== "Delivered" && (
                          <button
                            onClick={() => handleUpdateStatus(dr.id, "Delivered")}
                            className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded text-[10px] uppercase hover:bg-emerald-500 transition cursor-pointer"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {isTruckGearStaff && (
                          <button
                            onClick={() => handleDeleteDr(dr.id)}
                            className="px-2.5 py-1.5 bg-rose-950/60 text-rose-400 border border-rose-900 font-bold rounded text-[10px] uppercase hover:bg-rose-900 hover:text-white transition cursor-pointer"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* MODAL: Signed Proof of Delivery (POD) Lightbox */}
        {showPodModal && selectedDr && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-3xl bg-[#0A0C10] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                    📋 Delivery Receipt #{selectedDr.id} & Signed POD
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Linked Sales Invoice: <span className="text-amber-400 font-bold">{selectedDr.invoiceId}</span> // Date: {selectedDr.dispatchDate}
                  </p>
                </div>
                <button onClick={() => setShowPodModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>

              {/* Delivery Info Box */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-black border border-slate-800 rounded-xl text-xs font-mono">
                <div>DESTINATION: <span className="font-bold text-white block">{selectedDr.destinationDepot}</span></div>
                <div>DRIVER: <span className="font-bold text-white block">{selectedDr.driver}</span></div>
                <div>TRUCK PLATE: <span className="font-bold text-blue-400 block">{selectedDr.truckPlate}</span></div>
              </div>

              {/* Shipped Line Items Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase font-bold">Itemized Shipment Breakdown:</h4>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Part Description</th>
                        <th className="p-3 text-center">Qty Shipped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {selectedDr.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-blue-400 font-bold">{it.sku}</td>
                          <td className="p-3 text-white">{it.name}</td>
                          <td className="p-3 text-center font-bold">{it.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signed POD Photo Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase font-bold">
                  📷 Signed Receiving Document Photo (POD):
                </h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-black p-2 max-h-72 flex items-center justify-center">
                  <img
                    src={selectedDr.podImage}
                    alt="Signed Delivery Receipt"
                    className="max-h-64 object-contain rounded"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <label className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-yellow-400 font-bold rounded-lg text-xs uppercase hover:bg-slate-800 transition cursor-pointer flex items-center gap-2">
                  <span>📷 {uploadingPod ? "Uploading..." : "Upload / Replace POD Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePodFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-700 text-white font-bold rounded-lg text-xs uppercase hover:bg-slate-800 transition cursor-pointer"
                >
                  🖨️ Print DR Copy
                </button>
                <button
                  onClick={() => setShowPodModal(false)}
                  className="px-5 py-2.5 bg-[#1E4FD8] text-white font-bold rounded-lg text-xs uppercase hover:bg-blue-600 transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: Issue New Delivery Receipt */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">➕ Issue New Delivery Receipt</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleCreateDr} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Linked Invoice #</label>
                    <input
                      type="text"
                      value={newDrForm.invoiceId}
                      onChange={(e) => setNewDrForm({ ...newDrForm, invoiceId: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Dispatch Date</label>
                    <input
                      type="date"
                      value={newDrForm.dispatchDate}
                      onChange={(e) => setNewDrForm({ ...newDrForm, dispatchDate: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase">Destination Depot</label>
                  <input
                    type="text"
                    value={newDrForm.destinationDepot}
                    onChange={(e) => setNewDrForm({ ...newDrForm, destinationDepot: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Truck Plate</label>
                    <input
                      type="text"
                      value={newDrForm.truckPlate}
                      onChange={(e) => setNewDrForm({ ...newDrForm, truckPlate: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 uppercase">Assigned Driver</label>
                    <input
                      type="text"
                      value={newDrForm.driver}
                      onChange={(e) => setNewDrForm({ ...newDrForm, driver: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <label className="text-amber-400 font-bold uppercase block">First Line Item Shipped:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={newDrForm.itemSku}
                      onChange={(e) => setNewDrForm({ ...newDrForm, itemSku: e.target.value })}
                      className="p-2 bg-black border border-slate-800 rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder="Part Name"
                      value={newDrForm.itemName}
                      onChange={(e) => setNewDrForm({ ...newDrForm, itemName: e.target.value })}
                      className="p-2 bg-black border border-slate-800 rounded text-white"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={newDrForm.itemQty}
                      onChange={(e) => setNewDrForm({ ...newDrForm, itemQty: parseInt(e.target.value) || 1 })}
                      className="p-2 bg-black border border-slate-800 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <label className="text-amber-400 font-bold uppercase block text-[11px]">
                    📷 Attach Delivery Receipt Photo / Signed POD Scan:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 px-4 py-2.5 bg-black border border-slate-800 hover:border-amber-500 rounded text-slate-300 text-xs font-mono flex items-center justify-between cursor-pointer transition">
                      <span>{uploadingPod ? "⏳ Uploading photo..." : newDrForm.podImage ? "✓ Photo Attached" : "📁 Choose File (JPEG, PNG)"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePodFileUpload}
                        className="hidden"
                      />
                    </label>
                    {newDrForm.podImage && (
                      <img
                        src={newDrForm.podImage}
                        alt="POD Preview"
                        className="h-10 w-10 object-cover rounded border border-amber-500"
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://...)"
                    value={newDrForm.podImage}
                    onChange={(e) => setNewDrForm({ ...newDrForm, podImage: e.target.value })}
                    className="w-full p-2 bg-black border border-slate-800 rounded text-slate-400 text-xs font-mono mt-1"
                  />
                </div>

                <button type="submit" className="w-full p-4 bg-[#1E4FD8] text-white font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-blue-600/30 cursor-pointer mt-4">
                  🚀 Save & Issue Delivery Receipt
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
  );

  if (isAdminPath) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
        <Sidebar />
        <main className="flex-1 pl-64 p-8 space-y-8">
          {mainContent}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-[#1E4FD8] selection:text-white p-4 md:p-8">
      {mainContent}
    </div>
  );
}
