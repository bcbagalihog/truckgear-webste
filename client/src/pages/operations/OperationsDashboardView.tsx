import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";

interface Part {
  id?: number;
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  reorder_level?: number;
  supplier?: string;
}

interface FleetUnit {
  id: string;
  model: string;
  plate: string;
  driver: string;
  route: string;
  status: string;
  allocatedParts?: any[];
}

interface MaintenanceReq {
  id: string;
  fleetUnit: string;
  partNumber: string;
  name: string;
  qty: number;
  priority: string;
  status: string;
  timestamp: string;
}

export default function OperationsDashboardView() {
  const [parts, setParts] = useState<Part[]>([]);
  const [fleet, setFleet] = useState<FleetUnit[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<MaintenanceReq[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [deliveryReceipts, setDeliveryReceipts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");

  const loadAllModuleData = async () => {
    try {
      // 1. Inventory Parts
      const invRes = await fetch("/api/inventory/search?q=");
      if (invRes.ok) {
        const data = await invRes.json();
        if (Array.isArray(data)) setParts(data);
      }

      // 2. Directory Fleet Assets
      const fleetLocal = localStorage.getItem("partsman_directory_fleet_jetexpress");
      if (fleetLocal !== null) {
        try {
          const parsed = JSON.parse(fleetLocal);
          if (Array.isArray(parsed)) setFleet(parsed);
        } catch {}
      }
      const fleetRes = await fetch("/api/inventory/directory/fleet");
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (Array.isArray(fleetData)) setFleet(fleetData);
      }

      // 3. Maintenance Requests
      const maintLocal = localStorage.getItem("partsman_maintenance_requests_jetexpress");
      if (maintLocal !== null) {
        try {
          const parsed = JSON.parse(maintLocal);
          if (Array.isArray(parsed)) setMaintenanceReqs(parsed);
        } catch {}
      }
      const maintRes = await fetch("/api/inventory/maintenance");
      if (maintRes.ok) {
        const maintData = await maintRes.json();
        if (Array.isArray(maintData)) setMaintenanceReqs(maintData);
      }

      // 4. Dispatch Logs
      const logRes = await fetch("/api/inventory/dispatch-log");
      if (logRes.ok) {
        const logData = await logRes.json();
        if (Array.isArray(logData)) setDispatchLogs(logData);
      }

      // 5. Delivery Receipts
      const drLocal = localStorage.getItem("partsman_delivery_receipts_jetexpress");
      if (drLocal !== null) {
        try {
          const parsed = JSON.parse(drLocal);
          if (Array.isArray(parsed)) setDeliveryReceipts(parsed);
        } catch {}
      }
      const drRes = await fetch("/api/logistics/dr");
      if (drRes.ok) {
        const drData = await drRes.json();
        if (Array.isArray(drData)) setDeliveryReceipts(drData);
      }

      // 6. Purchase Orders
      const poLocal = localStorage.getItem("partsman_purchase_orders_jetexpress");
      if (poLocal !== null) {
        try {
          const parsed = JSON.parse(poLocal);
          if (Array.isArray(parsed)) setPurchaseOrders(parsed);
        } catch {}
      }

      // 7. Suppliers
      const supLocal = localStorage.getItem("partsman_directory_suppliers_jetexpress");
      if (supLocal !== null) {
        try {
          const parsed = JSON.parse(supLocal);
          if (Array.isArray(parsed)) setSuppliers(parsed);
        } catch {}
      }
      const supRes = await fetch("/api/inventory/directory/suppliers");
      if (supRes.ok) {
        const supData = await supRes.json();
        if (Array.isArray(supData)) setSuppliers(supData);
      }

      setLastSyncedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard sync error:", err);
    }
  };

  useEffect(() => {
    loadAllModuleData();
  }, []);

  // Calculated Metrics
  const criticalParts = parts.filter(p => p.quantity <= (p.reorder_level || 5));
  const underRepairFleet = fleet.filter(f => f.status === "Maintenance" || f.status === "Under Repair");
  const fleetReliabilityIndex = fleet.length > 0 
    ? Math.round(((fleet.length - underRepairFleet.length) / fleet.length) * 100)
    : 100;

  const pendingDispatchCount = maintenanceReqs.filter(r => r.status === "Pending Dispatch" || r.status === "Pending Purchase").length;
  const completedMaintCount = maintenanceReqs.filter(r => r.status === "Completed").length;

  // Calculate Fast-Moving items from dispatch logs or inventory
  const dispatchCountsMap: Record<string, { name: string; sku: string; count: number; stock: number }> = {};
  dispatchLogs.forEach(log => {
    const sku = log.partNumber || log.sku || "N/A";
    if (!dispatchCountsMap[sku]) {
      dispatchCountsMap[sku] = {
        name: log.partName || sku,
        sku: sku,
        count: 0,
        stock: 0
      };
    }
    dispatchCountsMap[sku].count += (log.qty || 1);
  });

  // Attach current stock to fast moving map
  parts.forEach(p => {
    if (dispatchCountsMap[p.part_number]) {
      dispatchCountsMap[p.part_number].stock = p.quantity;
    }
  });

  const fastMovingFromLogs = Object.values(dispatchCountsMap).sort((a, b) => b.count - a.count);
  const fastMovingDisplay = fastMovingFromLogs.length > 0
    ? fastMovingFromLogs.slice(0, 4)
    : parts.slice(0, 4).map(p => ({
        name: p.name,
        sku: p.part_number,
        count: p.quantity,
        stock: p.quantity
      }));

  return (
    <PartsOperationsLayout>
      <div className="space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
                Operations Dashboard
              </h1>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>🔄</span> LIVE SYNCED {lastSyncedTime && `(${lastSyncedTime})`}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1">
              Real-Time Cross-Module Operational Metrics & Inventory Allocation Ledger
            </p>
          </div>
          <button
            onClick={loadAllModuleData}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer"
          >
            🔄 Refresh Metrics
          </button>
        </div>

        {/* 4 Core Metric Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Catalog Parts", value: parts.length, sub: `${parts.reduce((a, b) => a + (b.quantity || 0), 0)} Total Stock Units`, color: "border-l-[#1E4FD8]", bg: "bg-[#1E4FD8]/5" },
            { label: "Critical Stock Alerts", value: criticalParts.length, sub: criticalParts.length > 0 ? "Action Required" : "Optimal Threshold", color: "border-l-[#F59E0B]", bg: "bg-[#F59E0B]/5", highlight: criticalParts.length > 0 },
            { label: "Active Fleet Units", value: fleet.length, sub: `${underRepairFleet.length} Under Maintenance`, color: "border-l-indigo-500", bg: "bg-indigo-500/5" },
            { label: "Fleet Reliability Index", value: `${fleetReliabilityIndex}%`, sub: `${fleet.length - underRepairFleet.length}/${fleet.length} Operational`, color: "border-l-emerald-500", bg: "bg-emerald-500/5" }
          ].map((card, i) => (
            <div key={i} className={`p-6 rounded-xl border-l-4 ${card.color} border-y border-r border-slate-900 shadow-xl ${card.bg} relative overflow-hidden`}>
              <p className="text-[#94A3B8] text-[10px] font-mono uppercase tracking-widest">{card.label}</p>
              <p className={`text-3xl font-black mt-2 tracking-tight ${card.highlight ? "text-[#F59E0B] animate-pulse" : "text-white"}`}>
                {card.value}
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Live Operational Module Health Grid */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4 pl-1">
            📦 Operational Modules Live Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Warehouse Inventory Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>⚙️</span> Warehouse Inventory
                </div>
                <a href="/inventory/parts" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">REGISTERED SKUS</span>
                  <span className="text-lg font-bold text-white">{parts.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CRITICAL ALERTS</span>
                  <span className={`text-lg font-bold ${criticalParts.length > 0 ? "text-[#F59E0B]" : "text-emerald-400"}`}>{criticalParts.length}</span>
                </div>
              </div>
            </div>

            {/* Logistics Fleet Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>🚛</span> Fleet Operations
                </div>
                <a href="/inventory/fleet" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">FLEET TRUCK ASSETS</span>
                  <span className="text-lg font-bold text-white">{fleet.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">UNDER REPAIR</span>
                  <span className="text-lg font-bold text-amber-400">{underRepairFleet.length}</span>
                </div>
              </div>
            </div>

            {/* Maintenance Requests Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>🔧</span> Maintenance Requests
                </div>
                <a href="/inventory/maintenance" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">PENDING DISPATCH</span>
                  <span className="text-lg font-bold text-rose-400">{pendingDispatchCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">COMPLETED / INSTALLED</span>
                  <span className="text-lg font-bold text-emerald-400">{completedMaintCount}</span>
                </div>
              </div>
            </div>

            {/* Procurement & PO Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>🛒</span> Procurement & POs
                </div>
                <a href="/inventory/procurement" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">PURCHASE ORDERS</span>
                  <span className="text-lg font-bold text-white">{purchaseOrders.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">APPROVED SUPPLIERS</span>
                  <span className="text-lg font-bold text-blue-400">{suppliers.length}</span>
                </div>
              </div>
            </div>

            {/* Logistics Delivery Receipts Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>🚚</span> Delivery Receipts (DR)
                </div>
                <a href="/logistics" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">ISSUED RECEPTS</span>
                  <span className="text-lg font-bold text-white">{deliveryReceipts.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">DELIVERED PODS</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {deliveryReceipts.filter(d => d.status === "Delivered").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Operations Directory Module Card */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.02] transition space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="font-bold text-white uppercase text-sm flex items-center gap-2">
                  <span>📖</span> Master Directory
                </div>
                <a href="/inventory/directory" className="text-xs font-mono text-blue-400 hover:underline">View →</a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">APPROVED SUPPLIERS</span>
                  <span className="text-lg font-bold text-white">{suppliers.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">REGISTERED TRUCKS</span>
                  <span className="text-lg font-bold text-indigo-400">{fleet.length}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Dual Grid Layout: Fast-Moving & Critical Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Fast-Moving Items List */}
          <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
               style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                  <span>🔥</span> Fast-Moving Items Demand
                </h2>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Active Demand</span>
              </div>

              <div className="space-y-4">
                {fastMovingDisplay.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs">NO DISPATCH ACTIVITY LOGGED YET.</div>
                ) : (
                  fastMovingDisplay.map((part) => (
                    <div key={part.sku} className="flex justify-between items-center p-4 rounded-xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.04] transition">
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">{part.name}</div>
                        <div className="text-xs font-mono text-[#1E4FD8]">{part.sku}</div>
                      </div>
                      <div className="text-right space-y-1 font-mono">
                        <div className="text-xs text-slate-300 font-semibold">{part.count} Dispatched</div>
                        <div className="text-[10px] text-slate-500">In Stock: {part.stock}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Critical Stock Alerts */}
          <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
               style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B] rounded-full blur-[140px] opacity-5 pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                  <span>⚠️</span> Critical Stock Alerts
                </h2>
                <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Restock Required</span>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {criticalParts.length === 0 ? (
                  <div className="p-8 text-center text-emerald-400 font-mono text-xs">
                    ✅ ALL INVENTORY STOCK LEVELS ARE OPTIMAL.
                  </div>
                ) : (
                  criticalParts.map((part) => (
                    <div key={part.part_number} className="flex justify-between items-center p-4 rounded-xl border border-red-950/40 bg-red-950/5 hover:bg-red-950/10 transition">
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">{part.name}</div>
                        <div className="text-xs font-mono text-red-400">{part.part_number}</div>
                      </div>
                      <div className="text-right space-y-2">
                        <span className="inline-block px-2.5 py-0.5 bg-red-950/80 text-[#F59E0B] text-[10px] font-black rounded border border-[#F59E0B]/50 uppercase tracking-widest font-mono">
                          {part.quantity} left
                        </span>
                        <a 
                          href="/inventory/rfq"
                          className="block w-full px-3 py-1 bg-[#F59E0B] text-black text-[10px] font-black rounded-md hover:bg-yellow-400 transition uppercase tracking-wider text-center cursor-pointer"
                        >
                          RFQ →
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PartsOperationsLayout>
  );
}
