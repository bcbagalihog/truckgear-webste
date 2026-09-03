import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function TTPSDashboard() {
  const [greeting, setGreeting] = useState("Good Morning");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    setLocation("/login");
  };

  return (
    <div className="min-h-screen p-8 font-sans selection:bg-amber-500 selection:text-slate-950" style={{ backgroundColor: "#0A0C10" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden gap-6"
             style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-6">
             <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.25)]">
               <span className="text-3xl font-black text-yellow-400">⚙️</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">PARTSMAN</h1>
                <span className="px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-mono text-[10px] rounded font-extrabold uppercase tracking-wider">CLIENT ACCESS</span>
              </div>
              <p className="text-[#94A3B8] font-mono text-xs mt-1">
                (Parts Manager) <span className="text-[#1E4FD8] font-bold">AI Operating System</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 relative z-10 items-center w-full md:w-auto">
             <Link href="/expenditure" className="bg-[#1E4FD8] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-[0_0_15px_rgba(30,79,216,0.4)] flex items-center gap-2 text-sm cursor-pointer">
                <span>📉</span> Expenditure Ledger
             </Link>
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-950 bg-emerald-950/20 text-emerald-400 font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                GATE ACTIVE
             </div>
             <button 
               onClick={handleLogout}
               className="px-4 py-2.5 bg-slate-900 hover:bg-red-950/30 border border-slate-800 hover:border-red-900/40 text-slate-400 hover:text-red-400 font-mono text-xs rounded-lg transition-all cursor-pointer"
             >
               DISCONNECT
             </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/inventory" className="p-8 rounded-2xl border border-slate-800 hover:border-[#1E4FD8]/50 transition group relative overflow-hidden block"
               style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E4FD8]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-[#1E4FD8]">⚙️</span> Parts Operations
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Advanced fleet logistics dashboard: Monitor fast-moving inventories, track unit allocations, dispatch maintenance requests, and forecast part failure dates.</p>
            <span className="inline-block border border-[#1E4FD8] text-[#1E4FD8] px-6 py-2 rounded-lg font-bold group-hover:bg-[#1E4FD8] group-hover:text-white transition">
              Access Operations →
            </span>
          </Link>

          <Link href="/payment" className="p-8 rounded-2xl border border-slate-800 hover:border-[#FACC15]/50 transition group relative overflow-hidden block"
               style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#FACC15]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-yellow-400">💳</span> Payment Center
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Process client invoices, record direct payments, and sync to the global ledger.</p>
            <span className="inline-block bg-yellow-400 text-slate-950 border border-yellow-400 px-6 py-2.5 rounded-lg font-black group-hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20">
              Process Payments →
            </span>
          </Link>

          <Link href="/logistics" className="p-8 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition group relative overflow-hidden block"
               style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-purple-500/20 text-[#A855F7] border border-purple-500/30 text-[10px] font-mono font-bold rounded">ONLINE</div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              <span className="text-purple-400">🚚</span> Logistics & Delivery Receipts
            </h2>
            <p className="text-[#94A3B8] mb-8 font-medium line-clamp-2 text-sm">Track active fleet delivery dispatches, view DR receipts (DR-XXXX), and inspect signed proof of delivery (POD) records.</p>
            <span className="inline-block bg-purple-600 text-white border border-purple-500 px-6 py-2.5 rounded-lg font-black group-hover:bg-purple-500 transition shadow-lg shadow-purple-500/20">
              View Delivery Receipts →
            </span>
          </Link>
        </div>

        {/* Bot Status Footer */}
        <div className="border border-slate-800 p-6 rounded-xl flex items-center justify-between"
             style={{ background: "rgba(255,255,255,0.02)" }}>
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
