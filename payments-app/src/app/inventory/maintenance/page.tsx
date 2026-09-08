'use client';

import { useState } from 'react';

interface PartRequest {
  id: string;
  fleetUnit: string;
  partNumber: string;
  name: string;
  qty: number;
  priority: 'Routine' | 'Urgent' | 'AOG (Aircraft on Ground / Truck Down)';
  status: 'Pending Dispatch' | 'Dispatched' | 'Completed';
  timestamp: string;
}

export default function MaintenanceRequestPage() {
  const [requests, setRequests] = useState<PartRequest[]>([
    {
      id: 'REQ-1021',
      fleetUnit: 'Isuzu Giga (ABC-1234)',
      partNumber: 'TG-BELT-404',
      name: 'Premium Alternator Fan Belt',
      qty: 2,
      priority: 'Urgent',
      status: 'Pending Dispatch',
      timestamp: '2026-05-17 08:32 AM'
    },
    {
      id: 'REQ-1020',
      fleetUnit: 'Fuso Super Great (DEF-5678)',
      partNumber: 'TG-CLUTCH-99',
      name: 'Clutch Assembly Kit v2',
      qty: 1,
      priority: 'AOG (Aircraft on Ground / Truck Down)',
      status: 'Dispatched',
      timestamp: '2026-05-16 02:15 PM'
    },
    {
      id: 'REQ-1019',
      fleetUnit: 'Hino 700 (GHI-9012)',
      partNumber: 'TG-OIL-001',
      name: 'Premium Oil Filter (Heavy Duty)',
      qty: 1,
      priority: 'Routine',
      status: 'Completed',
      timestamp: '2026-05-15 11:00 AM'
    }
  ]);

  const [form, setForm] = useState({ fleetUnit: 'Isuzu Giga (ABC-1234)', partNumber: '', name: '', qty: 1, priority: 'Routine' as any });

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partNumber || !form.name) return;

    const newReq: PartRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      fleetUnit: form.fleetUnit,
      partNumber: form.partNumber,
      name: form.name,
      qty: form.qty,
      priority: form.priority,
      status: 'Pending Dispatch',
      timestamp: new Date().toLocaleString()
    };

    setRequests([newReq, ...requests]);
    setForm({ fleetUnit: 'Isuzu Giga (ABC-1234)', partNumber: '', name: '', qty: 1, priority: 'Routine' });
  };

  const updateStatus = (id: string, newStatus: 'Dispatched' | 'Completed') => {
    setRequests(requests.map(req => req.id === id ? { ...req, status: newStatus } : req));
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Maintenance Requests</h1>
        <p className="text-slate-400 font-mono text-sm mt-1">Submit & Dispatch Part Requests for Fleet Repairs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Request Form */}
        <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-900 shadow-xl"
             style={{ background: 'rgba(255,255,255,0.01)' }}>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6 border-b border-slate-900 pb-3">
            🔧 Request Stock Parts
          </h2>
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Target Fleet Unit</label>
              <select 
                value={form.fleetUnit}
                onChange={(e) => setForm({...form, fleetUnit: e.target.value})}
                className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
              >
                <option>Isuzu Giga (ABC-1234)</option>
                <option>Fuso Super Great (DEF-5678)</option>
                <option>Hino 700 (GHI-9012)</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Part SKU / Number</label>
              <input 
                type="text" 
                placeholder="e.g. TG-BELT-404" 
                value={form.partNumber}
                onChange={(e) => setForm({...form, partNumber: e.target.value})}
                className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Part Name</label>
              <input 
                type="text" 
                placeholder="e.g. Alternator Fan Belt" 
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={form.qty}
                  onChange={(e) => setForm({...form, qty: parseInt(e.target.value) || 1})}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Priority</label>
                <select 
                  value={form.priority}
                  onChange={(e) => setForm({...form, priority: e.target.value as any})}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white text-sm"
                >
                  <option>Routine</option>
                  <option>Urgent</option>
                  <option>AOG (Aircraft on Ground / Truck Down)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full p-3 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2"
            >
              Submit Maintenance Request
            </button>
          </form>
        </div>

        {/* Right: Request Queue & Dispatch Board */}
        <div className="lg:col-span-2 space-y-6">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-2">Active Dispatch Board</p>
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="p-6 rounded-2xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.03] transition relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#1E4FD8] font-bold bg-[#1E4FD8]/10 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.priority === 'AOG (Aircraft on Ground / Truck Down)' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        req.priority === 'Urgent' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {req.priority.split(' ')[0]}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base mt-2">{req.name} <span className="text-slate-500">x{req.qty}</span></h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">Fleet Unit: {req.fleetUnit}</p>
                    <p className="text-[10px] text-slate-600 font-mono">Timestamp: {req.timestamp}</p>
                  </div>

                  <div className="text-right space-y-3">
                    <span className={`inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      req.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      req.status === 'Dispatched' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 animate-pulse'
                    }`}>
                      {req.status}
                    </span>

                    <div className="flex gap-2">
                      {req.status === 'Pending Dispatch' && (
                        <button 
                          onClick={() => updateStatus(req.id, 'Dispatched')}
                          className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 transition uppercase tracking-wider"
                        >
                          Dispatch Part
                        </button>
                      )}
                      {req.status === 'Dispatched' && (
                        <button 
                          onClick={() => updateStatus(req.id, 'Completed')}
                          className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition uppercase tracking-wider"
                        >
                          Mark Installed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
