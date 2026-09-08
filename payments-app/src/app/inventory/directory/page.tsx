'use client';

import { useState } from 'react';

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
  status: 'Available' | 'On Route' | 'Maintenance';
}

export default function DirectoryPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'fleet'>('suppliers');

  // Supplier state registry
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 'SUP-01', name: 'Monroe Cabin Systems Co.', contactPerson: 'Arnel Lopez', phone: '0917-555-0129', email: 'arnel@monroe-cabin.ph', specialty: 'Cabin Shocks & Suspension', rating: 4.8 },
    { id: 'SUP-02', name: 'Meritor Heavy-Duty Axles', contactPerson: 'Maricel Soriano', phone: '0922-888-4055', email: 'soriano.m@meritor.com', specialty: 'Steering Joints & Axles', rating: 4.9 },
    { id: 'SUP-03', name: 'KoyoRad Aluminum Coolant Ltd.', contactPerson: 'Danilo Santos', phone: '0919-444-1290', email: 'danilo@koyorad.com.ph', specialty: 'Cooling Cores & Radiators', rating: 4.7 },
    { id: 'SUP-04', name: 'TruckGear Parts Philippines', contactPerson: 'Ben Bagalihog', phone: '0918-777-3022', email: 'sales@truckgear.ph', specialty: 'OEM Heavy Duty Spares', rating: 5.0 }
  ]);

  // Fleet state registry
  const [fleet, setFleet] = useState<TruckUnit[]>([
    { id: 'UNIT-101', model: 'Isuzu Giga 10-Wheeler Dump Truck', plate: 'ABC-1234', driver: 'Rodrigo Santos', route: 'Manila - Batangas Port', status: 'On Route' },
    { id: 'UNIT-102', model: 'Fuso Super Great Cargo Truck', plate: 'DEF-5678', driver: 'Juan Dela Cruz', route: 'Bulacan Depot', status: 'Maintenance' },
    { id: 'UNIT-103', model: 'Hino 700 Concrete Mixer Truck', plate: 'GHI-9012', driver: 'Danilo Ramos', route: 'Cavite Construction Hub', status: 'Available' }
  ]);

  // Form states
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', specialty: '' });
  const [truckForm, setTruckForm] = useState({ id: '', model: '', plate: '', driver: '', route: '', status: 'Available' as any });

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.specialty) return;

    const newSup: Supplier = {
      id: `SUP-0${suppliers.length + 1}`,
      name: supplierForm.name,
      contactPerson: supplierForm.contactPerson || 'N/A',
      phone: supplierForm.phone || 'N/A',
      email: supplierForm.email || 'N/A',
      specialty: supplierForm.specialty,
      rating: 5.0
    };

    setSuppliers([...suppliers, newSup]);
    setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', specialty: '' });
    alert(`Supplier "${newSup.name}" successfully added to registry!`);
  };

  const handleAddTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckForm.id || !truckForm.plate) return;

    const newTruck: TruckUnit = {
      id: truckForm.id.toUpperCase(),
      model: truckForm.model || 'Heavy Hauler',
      plate: truckForm.plate.toUpperCase(),
      driver: truckForm.driver || 'Unassigned',
      route: truckForm.route || 'Local Depot Routing',
      status: truckForm.status
    };

    setFleet([...fleet, newTruck]);
    setTruckForm({ id: '', model: '', plate: '', driver: '', route: '', status: 'Available' });
    alert(`Truck "${newTruck.id}" successfully added to Fleet registry!`);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans">Operations Directory</h1>
        <p className="text-slate-400 font-mono text-sm mt-1">Master Registry: Register Approved Suppliers & Manage Logistics Assets</p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-900 gap-4">
        {[
          { key: 'suppliers', label: '📦 Parts Suppliers', count: suppliers.length },
          { key: 'fleet', label: '🚛 Logistics Fleet', count: fleet.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${
              activeTab === tab.key 
                ? 'text-[#1E4FD8] font-black' 
                : 'text-slate-500 hover:text-slate-300'
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
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Registered Supply Partners</p>
            <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.01)' }}>
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">Supplier Partner</th>
                    <th className="p-4">Specialty Category</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4 text-center">Score</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registration Form Panel */}
          <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-900 shadow-xl self-start"
               style={{ background: 'rgba(255,255,255,0.01)' }}>
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
                  placeholder="e.g. Filters, Braking, Transmission" 
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Mobile Number</label>
                  <input 
                    type="text" 
                    placeholder="0917-xxx-xxxx" 
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Corporate Email</label>
                  <input 
                    type="email" 
                    placeholder="rep@supplier.com" 
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2"
              >
                Log Approved Supplier
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Fleet Directory */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Fleet Table Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Active Heavy Logistics Units</p>
            <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.01)' }}>
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="p-4">Truck Unit / Plate</th>
                    <th className="p-4">Active Route Assignation</th>
                    <th className="p-4">Assigned Driver</th>
                    <th className="p-4 text-center">Status</th>
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
                          unit.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          unit.status === 'On Route' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {unit.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Registration Form */}
          <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-900 shadow-xl self-start"
               style={{ background: 'rgba(255,255,255,0.01)' }}>
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
                  placeholder="e.g. Isuzu Giga 10-Wheeler Dump Truck" 
                  value={truckForm.model}
                  onChange={(e) => setTruckForm({...truckForm, model: e.target.value})}
                  className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Assigned Professional Driver</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rodrigo Santos" 
                  value={truckForm.driver}
                  onChange={(e) => setTruckForm({...truckForm, driver: e.target.value})}
                  className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Current Logistics Status</label>
                  <select
                    value={truckForm.status}
                    onChange={(e) => setTruckForm({...truckForm, status: e.target.value as any})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  >
                    <option>Available</option>
                    <option>On Route</option>
                    <option>Maintenance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Logistics Route</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Manila - Batangas" 
                    value={truckForm.route}
                    onChange={(e) => setTruckForm({...truckForm, route: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2"
              >
                Log Fleet Heavy Asset
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
