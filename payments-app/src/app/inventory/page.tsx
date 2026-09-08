'use client';

import { useState, useEffect } from 'react';

interface Part {
  id: number;
  name: string;
  part_number: string;
  description: string;
  quantity: number;
  reorder_level: number;
}

export default function PartsOperationsDashboard() {
  const [criticalParts, setCriticalParts] = useState<Part[]>([]);
  const [stats, setStats] = useState({
    totalParts: 25554,
    criticalCount: 0,
    activeFleet: 12,
    reliabilityIndex: 94.2
  });
  const [loading, setLoading] = useState(true);

  // Fast-Moving parts mock tracking
  const fastMovingParts = [
    { part_number: 'TG-OIL-001', name: 'Premium Oil Filter (Heavy Duty)', usageRate: '45 units/mo', rank: 1, stock: 45 },
    { part_number: 'TG-BRAKE-202', name: 'Full Performance Brake Pads', usageRate: '38 units/mo', rank: 2, stock: 12 },
    { part_number: 'TG-BELT-404', name: 'Premium Alternator Fan Belt', usageRate: '22 units/mo', rank: 3, stock: 2 },
    { part_number: 'TG-FLUID-303', name: 'Ethylene Glycol Coolant (Gallon)', usageRate: '19 units/mo', rank: 4, stock: 18 }
  ];

  useEffect(() => {
    const fetchCritical = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
        const res = await fetch(`${apiUrl}/api/inventory/search?q=`);
        const data: Part[] = await res.json();
        
        // Filter parts that are critical (quantity <= reorder_level)
        const critical = data.filter(part => part.quantity <= (part.reorder_level || 0));
        setCriticalParts(critical);
        setStats(prev => ({
          ...prev,
          totalParts: data.length > 0 ? data.length : 25554,
          criticalCount: critical.length
        }));
      } catch (err) {
        console.error('Failed to load dashboard inventory data:', err);
        // Fallback mock critical items
        const mockCritical = [
          { id: 3, name: 'Clutch Assembly Kit v2', part_number: 'TG-CLUTCH-99', description: 'Heavy transport application assembly', quantity: 3, reorder_level: 5 },
          { id: 4, name: 'Premium Alternator Fan Belt', part_number: 'TG-BELT-404', description: 'Double ribbed fan belt', quantity: 2, reorder_level: 5 }
        ];
        setCriticalParts(mockCritical);
        setStats(prev => ({
          ...prev,
          criticalCount: mockCritical.length
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchCritical();
  }, []);

  return (
    <div className="space-y-10">
      
      {/* Title Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Operations Dashboard</h1>
        <p className="text-slate-400 font-mono text-sm mt-1">Real-Time Fast-Moving & Stock Allocation Summary</p>
      </div>

      {/* Metrics Summary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Catalog Parts', value: stats.totalParts.toLocaleString(), color: 'border-l-[#1E4FD8]', bg: 'bg-[#1E4FD8]/5' },
          { label: 'Critical Restocks', value: stats.criticalCount, color: 'border-l-[#F59E0B]', bg: 'bg-[#F59E0B]/5', highlight: stats.criticalCount > 0 },
          { label: 'Active Fleet Trucks', value: stats.activeFleet, color: 'border-l-indigo-500', bg: 'bg-indigo-500/5' },
          { label: 'Fleet Reliability Index', value: `${stats.reliabilityIndex}%`, color: 'border-l-emerald-500', bg: 'bg-emerald-500/5' }
        ].map((card, i) => (
          <div key={i} className={`p-6 rounded-xl border-l-4 ${card.color} border-y border-r border-slate-900 shadow-xl ${card.bg} relative overflow-hidden`}>
            <p className="text-[#94A3B8] text-[10px] font-mono uppercase tracking-widest">{card.label}</p>
            <p className={`text-3xl font-black mt-2 tracking-tight ${card.highlight ? 'text-[#F59E0B] animate-pulse' : 'text-white'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Dual Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fast Moving Parts List */}
        <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <span>🔥</span> Fast-Moving Items
              </h2>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Active Demand</span>
            </div>

            <div className="space-y-4">
              {fastMovingParts.map((part) => (
                <div key={part.part_number} className="flex justify-between items-center p-4 rounded-xl border border-slate-900 bg-white/[0.01] hover:bg-white/[0.04] transition">
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{part.name}</div>
                    <div className="text-xs font-mono text-[#1E4FD8]">{part.part_number}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-mono text-slate-300 font-semibold">{part.usageRate}</div>
                    <div className="text-[10px] font-mono text-slate-500">In Stock: {part.stock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B] rounded-full blur-[140px] opacity-5 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <span>⚠️</span> Critical Stock Alerts
              </h2>
              <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Restock Required</span>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-mono">Loading data feeds...</div>
              ) : criticalParts.length === 0 ? (
                <div className="text-center py-12 text-emerald-400 font-mono text-xs uppercase border border-dashed border-emerald-950/50 bg-emerald-950/10 rounded-xl">
                  [ ✓ ] ALL WAREHOUSE STOCK LEVELS OPTIMAL
                </div>
              ) : (
                criticalParts.map((part) => (
                  <div key={part.id} className="flex justify-between items-center p-4 rounded-xl border border-red-950/40 bg-red-950/5 hover:bg-red-950/10 transition">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{part.name}</div>
                      <div className="text-xs font-mono text-red-400">{part.part_number}</div>
                    </div>
                    <div className="text-right space-y-2">
                      <span className="inline-block px-2.5 py-0.5 bg-red-950/80 text-[#F59E0B] text-[10px] font-black rounded border border-[#F59E0B]/50 uppercase tracking-widest">
                        {part.quantity} left
                      </span>
                      <button 
                        onClick={() => window.location.href = `/inventory/rfq?partNumber=${encodeURIComponent(part.part_number)}&description=${encodeURIComponent(part.name)}`}
                        className="block w-full px-3 py-1 bg-[#F59E0B] text-black text-[10px] font-black rounded-md hover:bg-yellow-400 transition uppercase tracking-wider text-center"
                      >
                        RFQ →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
