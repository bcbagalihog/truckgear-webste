import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";
import { useAuth } from "@/hooks/use-auth";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  specialty: string;
  rating: number;
}

interface TruckUnit {
  id: string;
  model: string;
  plate: string;
  driver: string;
  route: string;
  status: "Available" | "On Route" | "Maintenance";
}

export default function DirectoryView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.";
  const [activeTab, setActiveTab] = useState<"suppliers" | "fleet">("suppliers");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  const initialSuppliers: Supplier[] = [
    { id: "SUP-01", name: "Monroe Cabin Systems Co.", contactPerson: "Arnel Lopez", phone: "0917-555-0129", email: "arnel@monroe-cabin.ph", specialty: "Cabin Shocks & Suspension", rating: 4.8 },
    { id: "SUP-02", name: "Meritor Heavy-Duty Axles", contactPerson: "Maricel Soriano", phone: "0922-888-4055", email: "soriano.m@meritor.com", specialty: "Steering Joints & Axles", rating: 4.9 },
    { id: "SUP-03", name: "KoyoRad Aluminum Coolant Ltd.", contactPerson: "Danilo Santos", phone: "0919-444-1290", email: "danilo@koyorad.com.ph", specialty: "Cooling Cores & Radiators", rating: 4.7 },
    { id: "SUP-04", name: "TruckGear Parts Philippines", contactPerson: "Ben Bagalihog", phone: "0918-777-3022", email: "sales@truckgear.ph", specialty: "OEM Heavy Duty Spares", rating: 5.0 }
  ];

  const initialFleet: TruckUnit[] = [
    { id: "UNIT-101", model: "Isuzu Giga 10-Wheeler Dump Truck", plate: "ABC-1234", driver: "Rodrigo Santos", route: "Manila - Batangas Port", status: "On Route" },
    { id: "UNIT-102", model: "Fuso Super Great Cargo Truck", plate: "DEF-5678", driver: "Juan Dela Cruz", route: "Bulacan Depot", status: "Maintenance" },
    { id: "UNIT-103", model: "Hino 700 Concrete Mixer Truck", plate: "GHI-9012", driver: "Danilo Ramos", route: "Cavite Construction Hub", status: "Available" }
  ];

  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [fleet, setFleet] = useState<TruckUnit[]>(initialFleet);

  const [supplierForm, setSupplierForm] = useState({ name: "", contactPerson: "", phone: "", email: "", specialty: "" });
  const [truckForm, setTruckForm] = useState({ id: "", model: "", plate: "", driver: "", route: "", status: "Available" as any });

  // Save Directory State
  const saveSuppliersState = (updated: Supplier[], target?: Supplier) => {
    try {
      setSuppliers(updated);
      localStorage.setItem("partsman_directory_suppliers_jetexpress", JSON.stringify(updated));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (target) {
        fetch("/api/inventory/directory/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Save directory error:", err);
    }
  };

  const saveFleetState = (updated: TruckUnit[], target?: TruckUnit) => {
    try {
      setFleet(updated);
      localStorage.setItem("partsman_directory_fleet_jetexpress", JSON.stringify(updated));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (target) {
        fetch("/api/inventory/directory/fleet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Save fleet error:", err);
    }
  };

  // Fetch Directory Vault
  const fetchDirectoryVault = async () => {
    try {
      const localData = localStorage.getItem("partsman_directory_suppliers_jetexpress");
      if (localData !== null) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            setSuppliers(parsed);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      const localFleetData = localStorage.getItem("partsman_directory_fleet_jetexpress");
      if (localFleetData !== null) {
        try {
          const parsedFleet = JSON.parse(localFleetData);
          if (Array.isArray(parsedFleet)) {
            setFleet(parsedFleet);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      const res = await fetch("/api/inventory/directory/suppliers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuppliers(data);
          localStorage.setItem("partsman_directory_suppliers_jetexpress", JSON.stringify(data));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }

      const fleetRes = await fetch("/api/inventory/directory/fleet");
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (Array.isArray(fleetData)) {
          setFleet(fleetData);
          localStorage.setItem("partsman_directory_fleet_jetexpress", JSON.stringify(fleetData));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error("Failed to load directory vault:", err);
    }
  };

  useEffect(() => {
    fetchDirectoryVault();
  }, []);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingTruck, setEditingTruck] = useState<TruckUnit | null>(null);

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier partner from directory?")) return;
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated);
    localStorage.setItem("partsman_directory_suppliers_jetexpress", JSON.stringify(updated));
    setLastSavedTime(new Date().toLocaleTimeString());
    try {
      await fetch(`/api/inventory/directory/suppliers/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Delete supplier error:", e);
    }
  };

  const handleDeleteTruck = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fleet truck asset from directory?")) return;
    const updated = fleet.filter(f => f.id !== id && f.plate !== id);
    setFleet(updated);
    localStorage.setItem("partsman_directory_fleet_jetexpress", JSON.stringify(updated));
    setLastSavedTime(new Date().toLocaleTimeString());
    try {
      await fetch(`/api/inventory/directory/fleet/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Delete fleet truck error:", e);
    }
  };

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const updated = suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s);
    saveSuppliersState(updated, editingSupplier);
    fetch(`/api/inventory/directory/suppliers/${editingSupplier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingSupplier, company: clientCompany })
    });
    setEditingSupplier(null);
    alert(`Supplier partner ${editingSupplier.name} updated successfully!`);
  };

  const handleUpdateTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTruck) return;
    const updated = fleet.map(f => (f.id === editingTruck.id || f.plate === editingTruck.plate) ? editingTruck : f);
    saveFleetState(updated, editingTruck);
    fetch(`/api/inventory/directory/fleet/${editingTruck.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingTruck, model: editingTruck.model, company: clientCompany })
    });
    setEditingTruck(null);
    alert(`Logistics Truck asset ${editingTruck.plate} updated successfully!`);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.specialty) return;

    const newSup: Supplier = {
      id: `SUP-${Date.now().toString().slice(-4)}`,
      name: supplierForm.name,
      contactPerson: supplierForm.contactPerson || "N/A",
      phone: supplierForm.phone || "N/A",
      email: supplierForm.email || "N/A",
      specialty: supplierForm.specialty,
      rating: 5.0
    };

    const updated = [newSup, ...suppliers];
    saveSuppliersState(updated, newSup);
    setSupplierForm({ name: "", contactPerson: "", phone: "", email: "", specialty: "" });
    alert(`Supplier partner ${newSup.name} saved to directory vault!`);
  };

  const handleAddTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckForm.id || !truckForm.plate) return;

    const newTruck: TruckUnit = {
      id: truckForm.id.toUpperCase(),
      model: truckForm.model || "Heavy Hauler",
      plate: truckForm.plate.toUpperCase(),
      driver: truckForm.driver || "Unassigned",
      route: truckForm.route || "Local Depot Routing",
      status: truckForm.status
    };

    const updatedFleet = [newTruck, ...fleet];
    saveFleetState(updatedFleet, newTruck);
    setTruckForm({ id: "", model: "", plate: "", driver: "", route: "", status: "Available" });
    alert(`Logistics Truck asset ${newTruck.plate} registered!`);
  };

  return (
    <PartsOperationsLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
                Operations Directory
              </h1>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span>💾</span> AUTO-SAVED TO VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1">
              Master Registry: Approved Suppliers & Logistics Fleet Assets for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>
        </div>

        {/* Tab Selectors */}
        <div className="flex border-b border-slate-900 gap-4">
          {[
            { key: "suppliers", label: "📦 Parts Suppliers", count: suppliers.length },
            { key: "fleet", label: "🚛 Logistics Fleet", count: fleet.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative cursor-pointer ${
                activeTab === tab.key 
                  ? "text-[#1E4FD8] font-black" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs font-mono px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-800">
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E4FD8] shadow-[0_0_10px_#1E4FD8]"></span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: Suppliers Directory */}
        {activeTab === "suppliers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Registered Supply Partners</p>
              <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
                   style={{ background: "rgba(255,255,255,0.01)" }}>
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Supplier Partner</th>
                      <th className="p-4">Specialty Category</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4 text-center">Score</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {suppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-bold text-white text-base">{sup.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">{sup.id} // Rep: {sup.contactPerson}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-blue-950/40 text-blue-400 border border-blue-950 text-xs font-semibold rounded">
                            {sup.specialty}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs space-y-0.5">
                          <div className="text-slate-200">{sup.phone}</div>
                          <div className="text-slate-500">{sup.email}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-[#F59E0B] font-mono">★ {sup.rating.toFixed(1)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingSupplier(sup)}
                              className="px-2.5 py-1 bg-blue-950/60 border border-blue-800 text-blue-300 hover:bg-blue-800 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                              title="Edit Supplier"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup.id)}
                              className="px-2 py-1 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                              title="Delete Supplier"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-900 shadow-xl self-start"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 border-b border-slate-900 pb-3">
                ➕ Register Supplier
              </h3>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Supplier Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cummins Filtration Phils" 
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Specialty Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Filters, Braking" 
                    value={supplierForm.specialty}
                    onChange={(e) => setSupplierForm({...supplierForm, specialty: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Representative Contact</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Juan Perez" 
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({...supplierForm, contactPerson: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2 cursor-pointer"
                >
                  Log Approved Supplier to Vault
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB CONTENT: Fleet Directory */}
        {activeTab === "fleet" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Active Heavy Logistics Units</p>
              <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
                   style={{ background: "rgba(255,255,255,0.01)" }}>
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Truck Unit / Plate</th>
                      <th className="p-4">Active Route Assignation</th>
                      <th className="p-4">Assigned Driver</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {fleet.map((unit) => (
                      <tr key={unit.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-bold text-white text-base">{unit.model}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">ID: {unit.id} // Plate: {unit.plate}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-300 text-xs">{unit.route}</td>
                        <td className="p-4 font-mono text-xs">{unit.driver}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 text-[9px] font-black rounded border ${
                            unit.status === "Available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            unit.status === "On Route" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {unit.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingTruck(unit)}
                              className="px-2.5 py-1 bg-blue-950/60 border border-blue-800 text-blue-300 hover:bg-blue-800 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                              title="Edit Fleet Truck"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTruck(unit.id)}
                              className="px-2 py-1 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded text-[10px] uppercase font-bold transition cursor-pointer"
                              title="Delete Fleet Truck"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-900 shadow-xl self-start"
                 style={{ background: "rgba(255,255,255,0.01)" }}>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 border-b border-slate-900 pb-3">
                ➕ Register Fleet Truck
              </h3>
              <form onSubmit={handleAddTruck} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Unit Code ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UNIT-104" 
                      value={truckForm.id}
                      onChange={(e) => setTruckForm({...truckForm, id: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Plate Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. XYZ-9876" 
                      value={truckForm.plate}
                      onChange={(e) => setTruckForm({...truckForm, plate: e.target.value})}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Truck Model & Specification</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Isuzu Giga Dump Truck" 
                    value={truckForm.model}
                    onChange={(e) => setTruckForm({...truckForm, model: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2 cursor-pointer"
                >
                  Log Fleet Heavy Asset to Vault
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT SUPPLIER MODAL */}
        {editingSupplier && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D1117] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">✏️ Edit Supplier Partner</h3>
                <button onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-white font-mono text-lg cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleUpdateSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Company Name</label>
                  <input
                    type="text"
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Specialty Category</label>
                  <input
                    type="text"
                    value={editingSupplier.specialty}
                    onChange={e => setEditingSupplier({ ...editingSupplier, specialty: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Contact Representative</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPerson}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Phone</label>
                    <input
                      type="text"
                      value={editingSupplier.phone}
                      onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Email</label>
                    <input
                      type="text"
                      value={editingSupplier.email}
                      onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSupplier(null)}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1E4FD8] hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT FLEET TRUCK MODAL */}
        {editingTruck && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D1117] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">✏️ Edit Fleet Truck Asset</h3>
                <button onClick={() => setEditingTruck(null)} className="text-slate-400 hover:text-white font-mono text-lg cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleUpdateTruck} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Unit ID</label>
                    <input
                      type="text"
                      value={editingTruck.id}
                      onChange={e => setEditingTruck({ ...editingTruck, id: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Plate Number</label>
                    <input
                      type="text"
                      value={editingTruck.plate}
                      onChange={e => setEditingTruck({ ...editingTruck, plate: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Truck Model & Specification</label>
                  <input
                    type="text"
                    value={editingTruck.model}
                    onChange={e => setEditingTruck({ ...editingTruck, model: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Driver</label>
                    <input
                      type="text"
                      value={editingTruck.driver}
                      onChange={e => setEditingTruck({ ...editingTruck, driver: e.target.value })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Status</label>
                    <select
                      value={editingTruck.status}
                      onChange={e => setEditingTruck({ ...editingTruck, status: e.target.value as any })}
                      className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="On Route">On Route</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Route Assignation</label>
                  <input
                    type="text"
                    value={editingTruck.route}
                    onChange={e => setEditingTruck({ ...editingTruck, route: e.target.value })}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingTruck(null)}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1E4FD8] hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PartsOperationsLayout>
  );
}
