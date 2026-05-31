'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function TTPSDashboard() {
  const [greeting, setGreeting] = useState('Good Morning');
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated via client session
    const session = localStorage.getItem('partsman_session');
    if (!session) {
      router.push('/portal/login');
    } else {
      setAuthorized(true);
    }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('partsman_session');
    router.push('/');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-mono text-xs tracking-widest">AUTHENTICATING SECURE SESSION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]" style={{ backgroundColor: '#0A0C10' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden gap-6"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-6">
             <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] relative">
               <Image src="/partsman-logo.png" alt="PARTSMAN Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">PARTSMAN</h1>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] rounded font-bold uppercase tracking-wider">CLIENT ACCESS</span>
              </div>
              <p className="text-[#94A3B8] font-mono text-xs mt-1">
                (Parts Manager) <span className="text-[#1E4FD8] font-bold">AI Operating System</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 relative z-10 items-center w-full md:w-auto">
             <Link href="/accounting" className="bg-[#1E4FD8] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-[0_0_15px_rgba(30,79,216,0.4)] flex items-center gap-2 text-sm">
                <span>📉</span> Expenditure Ledger
             </Link>
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-950 bg-emerald-950/20 text-emerald-400 font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                GATE ACTIVE
             </div>
             <button 
               onClick={handleLogout}
               className="px-4 py-2.5 bg-slate-900 hover:bg-red-950/30 border border-slate-800 hover:border-red-900/40 text-slate-400 hover:text-red-400 font-mono text-xs rounded-lg transition-all"
             >
               DISCONNECT
             </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/inventory" className="p-8 rounded-2xl border border-slate-800 hover:border-[#1E4FD8]/50 transition group relative overflow-hidden block"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E4FD8]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-[#1E4FD8]">⚙️</span> Parts Operations
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Advanced fleet logistics dashboard: Monitor fast-moving inventories, track unit allocations, dispatch maintenance requests, and forecast part failure dates.</p>
            <span className="inline-block border border-[#1E4FD8] text-[#1E4FD8] px-6 py-2 rounded-lg font-bold group-hover:bg-[#1E4FD8] group-hover:text-white transition">
              Access Operations →
            </span>
          </Link>

          <Link href="/payment" className="p-8 rounded-2xl border border-slate-800 hover:border-[#F59E0B]/50 transition group relative overflow-hidden block"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-[#F59E0B]">💳</span> Payment Center
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Process client invoices, record direct payments, and sync to the global ledger.</p>
            <span className="inline-block border border-[#F59E0B] text-[#F59E0B] px-6 py-2 rounded-lg font-bold group-hover:bg-[#F59E0B] group-hover:text-black transition">
              Process Payments →
            </span>
          </Link>

          <div className="p-8 rounded-2xl border border-slate-800 opacity-60 relative overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.01)' }}>
            <div className="absolute top-4 right-4 px-2 py-1 bg-slate-800 text-xs text-slate-400 font-mono rounded">LOCKED</div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-slate-500">🚚</span> Logistics
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Fleet tracking and delivery receipt management. System upgrade pending.</p>
            <button disabled className="inline-block bg-slate-800 text-slate-500 px-6 py-2 rounded-lg font-bold cursor-not-allowed">
              Module Offline
            </button>
          </div>
        </div>

        {/* Bot Status Footer */}
        <div className="border border-slate-800 p-6 rounded-xl flex items-center justify-between"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-[#1E4FD8] rounded-full animate-pulse shadow-[0_0_10px_#1E4FD8]"></div>
             <span className="font-mono text-[#1E4FD8] font-bold uppercase tracking-widest text-xs">Partsman OS v2.1 // System Online</span>
          </div>
          <p className="text-[#94A3B8] text-xs font-mono">Sync Link: [NITRO-5 &lt;-&gt; SG-CLOUD]</p>
        </div>
      </div>
    </div>
  );
}
