'use client';

import { useState } from 'react';

interface ReliabilityPart {
  partNumber: string;
  name: string;
  fleetUnit: string;
  installedAt: string;
  hoursInService: number;
  mtbfHours: number; // Mean Time Between Failures
  failureProbability: number; // 0 to 100%
  forecastedFailureDate: string;
}

export default function ReliabilityPartsPage() {
  const [reliabilityItems, setReliabilityItems] = useState<ReliabilityPart[]>([
    {
      partNumber: 'TG-BRAKE-202',
      name: 'Full Performance Brake Pads',
      fleetUnit: 'Isuzu Giga (ABC-1234)',
      installedAt: '2026-04-15',
      hoursInService: 720,
      mtbfHours: 800,
      failureProbability: 90, // Crucial
      forecastedFailureDate: '2026-05-24 (In 7 Days)'
    },
    {
      partNumber: 'TG-BELT-404',
      name: 'Premium Alternator Fan Belt',
      fleetUnit: 'Hino 700 (GHI-9012)',
      installedAt: '2026-03-01',
      hoursInService: 1100,
      mtbfHours: 1500,
      failureProbability: 73, // Warn
      forecastedFailureDate: '2026-06-15 (In 29 Days)'
    },
    {
      partNumber: 'TG-OIL-001',
      name: 'Premium Oil Filter (Heavy Duty)',
      fleetUnit: 'Fuso Super Great (DEF-5678)',
      installedAt: '2026-05-10',
      hoursInService: 150,
      mtbfHours: 500,
      failureProbability: 30, // Healthy
      forecastedFailureDate: '2026-07-12 (In 56 Days)'
    }
  ]);

  const getStatusColor = (prob: number) => {
    if (prob >= 80) return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10';
    if (prob >= 50) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Reliability Analytics</h1>
        <p className="text-slate-400 font-mono text-sm mt-1">Predictive Analytics: Mean Time Between Failures (MTBF) & Wear Projections</p>
      </div>

      {/* Hero Stats */}
      <div className="p-8 rounded-2xl border border-slate-900 shadow-2xl relative overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
              <span>🧠</span> AI Wear Projection Engine
            </h2>
            <p className="text-xs text-slate-400 max-w-xl font-mono leading-relaxed">
              Analyzes historical wear cycles, R&R interval telemetry, and engine hours to predict failure dates and recommend proactive maintenance prior to road-breakdowns.
            </p>
          </div>
          <div className="px-6 py-4 bg-white/[0.02] border border-slate-800 rounded-xl font-mono text-xs space-y-1">
            <div className="text-slate-400"><span className="text-emerald-400">●</span> Healthy units: <span className="text-white">1</span></div>
            <div className="text-slate-400"><span className="text-indigo-400">●</span> Approaching limit: <span className="text-white">1</span></div>
            <div className="text-slate-400"><span className="text-[#F59E0B] animate-pulse">●</span> Critical swap action: <span className="text-white">1</span></div>
          </div>
        </div>
      </div>

      {/* Projection Matrix Table */}
      <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="p-6 border-b border-slate-900" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Predictive Lifetime Matrix</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-900" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <tr>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Installed Part</th>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Fleet Unit Destination</th>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Service Hours / Limit</th>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Wear Level</th>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Predicted Failure Date</th>
              <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Preemptive Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {reliabilityItems.map((item, index) => {
              const statusClass = getStatusColor(item.failureProbability);
              return (
                <tr key={index} className="hover:bg-white/[0.02] transition duration-150">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.partNumber}</div>
                  </td>
                  <td className="p-4 text-xs text-slate-300 font-semibold">{item.fleetUnit}</td>
                  <td className="p-4 text-center font-mono text-xs">
                    <span className="text-white font-bold">{item.hoursInService}</span>
                    <span className="text-slate-600"> / {item.mtbfHours} hrs</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                      {item.failureProbability}%
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-300 font-semibold">{item.forecastedFailureDate}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {
                        window.location.href = `/inventory/rfq?partNumber=${encodeURIComponent(item.partNumber)}&description=${encodeURIComponent(item.name)}&qty=1`;
                      }}
                      className="px-3 py-1.5 bg-[#1E4FD8] text-white text-[10px] font-black rounded hover:bg-blue-700 transition uppercase tracking-wider"
                    >
                      Preorder swap
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
