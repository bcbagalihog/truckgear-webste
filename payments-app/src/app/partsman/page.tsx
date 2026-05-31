'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Zap, Settings, FileText, Lock, Server, ShieldCheck, 
  ArrowRight, ExternalLink, Network, Database
} from 'lucide-react';

export default function PartsmanPage() {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none group">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md relative bg-slate-950 border border-slate-800 shrink-0 group-hover:border-cyan-500 transition-colors">
              <Image src="/truckgear-logo-v4.png" alt="TruckGear Logo" fill className="object-cover" priority />
            </div>
            <div className="flex flex-col select-none">
              <span className="font-black italic text-xl tracking-wide text-white leading-none group-hover:text-cyan-500 transition-colors">
                Truck<span className="text-cyan-500 group-hover:text-white transition-colors">Gear</span>
              </span>
              <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest leading-none mt-1 group-hover:text-slate-400 transition-colors">BACK TO MAIN</span>
            </div>
          </Link>
          <div>
            <Link 
              href="/portal/login" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-md shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/30 transition-all duration-300 group uppercase tracking-widest"
            >
              <span>Login to PARTSMAN</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative py-24 border-b border-slate-900 overflow-hidden min-h-[60vh] flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-slate-950 to-slate-950 z-0 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-slate-900/50 to-transparent pointer-events-none z-0"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-center flex flex-col items-center">
          <div className="relative w-72 h-72 mb-8 drop-shadow-[0_0_35px_rgba(6,182,212,0.25)] hover:scale-105 transition-transform duration-500">
            <Image src="/partsman-logo-new.jpg" alt="Partsman AI OS Logo" fill className="object-contain" priority />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900/80 text-cyan-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-cyan-500/20 mb-8 shadow-xl">
            <Network className="w-3.5 h-3.5 animate-pulse" />
            <span>PROPRIETARY AI ECOSYSTEM</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight uppercase max-w-4xl mx-auto mb-6">
            Partsman AI OS: <br/>
            <span className="text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Next-Gen Fleet & Inventory Intelligence</span>
          </h1>
          
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            At TruckGear Philippines Co., we don’t just supply premium truck parts—we pioneer the technology that keeps your logistics moving. Partsman AI OS is our proprietary, enterprise-grade Artificial Intelligence ecosystem designed to eliminate operational downtime and streamline high-volume parts management for modern fleets.
          </p>

          <div className="flex justify-center gap-4 pt-10">
            <Link href="/portal/login" className="px-8 py-4 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold text-xs uppercase tracking-widest rounded-lg transition-all duration-300 text-center shadow-xl shadow-cyan-500/15 hover:shadow-cyan-500/35 flex items-center justify-center gap-2">
              <span>Access System Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CORE CAPABILITIES ─── */}
      <section className="py-24 bg-slate-950 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-8 h-8 text-cyan-500" />
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Core Capabilities</h2>
            </div>
            <div className="w-20 h-1 bg-cyan-500 rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:border-cyan-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Settings className="w-24 h-24 text-cyan-500" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 relative z-10">Intelligent Technical Cross-Referencing</h3>
              <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                Managing massive fleets means dealing with thousands of complex technical specifications and OEM components. Partsman AI OS utilizes advanced semantic search to instantly cross-reference intricate part variations, alternative SKUs, and compatibility matrices. Your maintenance teams get exact answers in seconds, drastically reducing vehicle downtime.
              </p>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:border-cyan-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Database className="w-24 h-24 text-cyan-500" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 relative z-10">Automated Ledger & Procurement Auditing</h3>
              <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                Human error in high-volume transactions can stall operations. Our system features autonomous auditing protocols that instantly cross-reference delivery receipts, branch records, and transaction logs. By automatically flagging discrepancies, missing sequences, or outstanding balances, it ensures your administration remains seamless and accurate.
              </p>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:border-cyan-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText className="w-24 h-24 text-cyan-500" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 relative z-10">Enterprise Document Automation</h3>
              <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                Speed up your corporate workflows. Partsman AI OS streamlines administrative friction by instantly generating precise procurement paperwork, logistics documentation, and formal corporate correspondence tailored to complex enterprise structures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECURITY SECTION ─── */}
      <section className="py-24 bg-slate-900/20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-8 h-8 text-cyan-500" />
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Enterprise-Grade Security & Privacy</h2>
                </div>
                <div className="w-20 h-1 bg-cyan-500 rounded-full mb-6"></div>
                <p className="text-slate-400 leading-relaxed text-sm">
                  We understand that operational data is a company's most valuable asset. Unlike standard public AI tools that expose your data to third-party networks, Partsman AI OS is built from the ground up on a strictly isolated, secure infrastructure.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <ShieldCheck className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase text-sm tracking-wider mb-2">Complete Data Sovereignty</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Your operational logs, fleet metrics, and pricing tiers remain entirely private and are never used to train external public models.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <Server className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase text-sm tracking-wider mb-2">Resilient Architecture</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Engineered to withstand infrastructure disruptions, ensuring continuous uptime and data availability for your critical branch networks.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advantage Panel */}
            <div className="bg-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-[100px] pointer-events-none"></div>
              <div className="mb-6 inline-block">
                <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-widest px-3 py-1 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                  THE TRUCKGEAR ADVANTAGE
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-sm italic relative z-10 border-l-2 border-cyan-500 pl-6">
                "By integrating Partsman AI OS into our corporate supply services, TruckGear Philippines Co. bridges the gap between heavy-duty logistics and autonomous intelligence. We provide our B2B partners with unprecedented speed, absolute accuracy, and a secure technological edge that traditional suppliers simply cannot match."
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2026 TruckGear Philippines Co. - Partsman AI OS Enterprise Edition.</p>
        </div>
      </footer>
    </div>
  );
}
