import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";
import { useAuth } from "@/hooks/use-auth";

interface FleetUnit {
  id: string;
  name: string;
  plate: string;
  status: "In Service" | "Under Repair" | "Dispatched";
  driver: string;
  allocatedParts: Array<{
    partNumber: string;
    name: string;
    installedAt: string;
    notes: string;
  }>;
}

export default function FleetOperationsView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.";
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  const initialFleet: FleetUnit[] = [
    {
      id: "F-01",
      name: "Isuzu Giga 10-Wheeler Dump Truck",
      plate: "ABC-1234",
      status: "In Service",
      driver: "Rodrigo Santos",
      allocatedParts: [
        { partNumber: "TG-OIL-001", name: "Premium Oil Filter (Heavy Duty)", installedAt: "2026-05-10", notes: "Scheduled PM1 service change." },
        { partNumber: "TG-BRAKE-202", name: "Full Performance Brake Pads", installedAt: "2026-04-15", notes: "Front axle pads replaced." }
      ]
    },
    {
      id: "F-02",
      name: "Fuso Super Great Cargo Hauler",
      plate: "DEF-5678",
      status: "Under Repair",
      driver: "Juan Dela Cruz",
      allocatedParts: [
        { partNumber: "TG-CLUTCH-99", name: "Clutch Assembly Kit v2", installedAt: "2026-05-16", notes: "Transmission slip fix." }
      ]
    },
    {
      id: "F-03",
      name: "Hino 700 Mixer Truck",
      plate: "GHI-9012",
      status: "Dispatched",
      driver: "Danilo Ramos",
      allocatedParts: [
        { partNumber: "TG-OIL-001", name: "Premium Oil Filter (Heavy Duty)", installedAt: "2026-04-20", notes: "Filter swapped." }
      ]
    }
  ];

  const [fleet, setFleet] = useState<FleetUnit[]>(initialFleet);
  const [selectedUnit, setSelectedUnit] = useState<FleetUnit>(initialFleet[0]);
  const [form, setForm] = useState({ partNumber: "", name: "", notes: "" });

  // Save to LocalStorage & Backend Server Vault
  const saveFleetState = (updatedFleet: FleetUnit[], updatedUnit?: FleetUnit) => {
    try {
      setFleet(updatedFleet);
      if (updatedUnit) setSelectedUnit(updatedUnit);

      localStorage.setItem("partsman_directory_fleet_jetexpress", JSON.stringify(updatedFleet));
      localStorage.setItem("partsman_fleet_trucks_jetexpress", JSON.stringify(updatedFleet));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (updatedUnit) {
        fetch(`/api/inventory/fleet/${updatedUnit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updatedUnit, company: clientCompany })
        });
        fetch(`/api/inventory/directory/fleet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updatedUnit, model: updatedUnit.name, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Failed to save fleet state:", err);
    }
  };

  // Load from LocalStorage + Backend Vault API (Directory Fleet)
  const fetchFleetVault = async () => {
    try {
      const localData = localStorage.getItem("partsman_directory_fleet_jetexpress") || localStorage.getItem("partsman_fleet_trucks_jetexpress");
      if (localData !== null) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            const mapped: FleetUnit[] = parsed.map((item: any) => ({
              id: item.id || item.plate || `UNIT-${Math.random()}`,
              name: item.name || item.model || "Truck Unit",
              plate: item.plate || "N/A",
              status: item.status === "On Route" || item.status === "Available" ? "In Service" : item.status === "Maintenance" ? "Under Repair" : item.status || "In Service",
              driver: item.driver || "Unassigned Driver",
              allocatedParts: Array.isArray(item.allocatedParts) ? item.allocatedParts : []
            }));
            setFleet(mapped);
            if (mapped.length > 0) setSelectedUnit(mapped[0]);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      const res = await fetch("/api/inventory/directory/fleet");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: FleetUnit[] = data.map((item: any) => ({
            id: item.id || item.plate || `UNIT-${Math.random()}`,
            name: item.name || item.model || "Truck Unit",
            plate: item.plate || "N/A",
            status: item.status === "On Route" || item.status === "Available" ? "In Service" : item.status === "Maintenance" ? "Under Repair" : item.status || "In Service",
            driver: item.driver || "Unassigned Driver",
            allocatedParts: Array.isArray(item.allocatedParts) ? item.allocatedParts : []
          }));
          setFleet(mapped);
          if (mapped.length > 0) setSelectedUnit(mapped[0]);
          localStorage.setItem("partsman_directory_fleet_jetexpress", JSON.stringify(mapped));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Failed to load fleet vault:", err);
    }
  };

  useEffect(() => {
    fetchFleetVault();
  }, []);

  const logAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partNumber || !form.name) return;

    const newAllocation = {
      partNumber: form.partNumber,
      name: form.name,
      installedAt: new Date().toISOString().split("T")[0],
      notes: form.notes || "Direct component replacement."
    };

    let targetUpdated: FleetUnit | undefined;

    const updatedFleet = fleet.map(unit => {
      if (unit.id === selectedUnit.id) {
        targetUpdated = {
          ...unit,
          allocatedParts: [newAllocation, ...unit.allocatedParts]
        };
        return targetUpdated;
      }
      return unit;
    });

    saveFleetState(updatedFleet, targetUpdated);
    setForm({ partNumber: "", name: "", notes: "" });
    alert(`Installed part ${newAllocation.name} logged for truck ${selectedUnit.plate}!`);
  };

  return (
    <PartsOperationsLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
                Fleet Operations
              </h1>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>💾</span> AUTO-SAVED TO VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1">
              Track Heavy Units & Allocated Part Destination Logs for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Fleet Unit List */}
          <div className="lg:col-span-1 space-y-4">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Active Fleet Units ({fleet.length})</p>
            {fleet.map((unit) => (
              <div 
                key={unit.id}
                onClick={() => setSelectedUnit(unit)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  selectedUnit.id === unit.id 
                    ? "border-[#1E4FD8] bg-[#1E4FD8]/5 shadow-[0_0_15px_rgba(30,79,216,0.1)]" 
                    : "border-slate-900 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#1E4FD8] font-bold bg-[#1E4FD8]/10 px-2 py-0.5 rounded border border-[#1E4FD8]/30">
                    {unit.id}
                  </span>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    unit.status === "In Service" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    unit.status === "Under Repair" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-[#1E4FD8]/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {unit.status}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mt-3 leading-tight">{unit.name}</h3>
                <div className="mt-4 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>Plate: <span className="text-white font-bold">{unit.plate}</span></span>
                  <span>Driver: {unit.driver.split(" ")[0]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Allocation History & Log Form */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Allocation Logs View */}
            <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    📍 Parts Allocation Tracker: <span className="text-[#1E4FD8]">{selectedUnit.plate}</span>
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500">{selectedUnit.allocatedParts.length} Logged Items</span>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {selectedUnit.allocatedParts.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 font-mono text-xs">
                      No part installations logged for truck {selectedUnit.plate} yet.
                    </div>
                  ) : (
                    selectedUnit.allocatedParts.map((part: any, index: number) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-900 bg-white/[0.01] flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          {part.partPhotoUrl && (
                            <a href={part.partPhotoUrl} target="_blank" rel="noreferrer" title="Click to view installed part photo">
                              <img src={part.partPhotoUrl} alt={part.name} className="h-12 w-12 object-cover rounded-lg border border-amber-500/50 hover:border-amber-400 transition flex-shrink-0" />
                            </a>
                          )}
                          <div className="space-y-1">
                            <div className="font-bold text-white text-sm">{part.name}</div>
                            <div className="text-xs text-slate-400">{part.notes}</div>
                            <div className="text-[10px] text-slate-600 font-mono">Installer ID: system_alloc // Installed: {part.installedAt}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[#1E4FD8] bg-[#1E4FD8]/10 px-2 py-1 rounded border border-[#1E4FD8]/30">
                          {part.partNumber}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Log New Allocation Form */}
            <div className="p-8 rounded-2xl border border-slate-900 shadow-xl"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 border-b border-slate-900 pb-3">
                📝 Register Installed Part (Remove & Replace Log)
              </h3>
              <form onSubmit={logAllocation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Part SKU / Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TG-OIL-001" 
                    value={form.partNumber}
                    onChange={(e) => setForm({...form, partNumber: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Part Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Oil Filter" 
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Mechanic Notes / Odometer info</label>
                  <input 
                    type="text" 
                    placeholder="Installed at 124,500km during regular oil exchange." 
                    value={form.notes}
                    onChange={(e) => setForm({...form, notes: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                  />
                </div>
                <button 
                  type="submit"
                  className="md:col-span-2 w-full p-3.5 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2 cursor-pointer"
                >
                  Log Installed Part & Save to Vault
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </PartsOperationsLayout>
  );
}
