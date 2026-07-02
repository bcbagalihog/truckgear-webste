'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Truck, ShieldCheck, Zap, Layers, MapPin, ExternalLink, 
  Coins, Recycle, Award, Sparkles, Scale, AlertTriangle, ArrowRight,
  Shield, CheckCircle, Quote, Eye, Target, MessageCircle
} from 'lucide-react';

export default function TruckgearHome() {
  const [batteryType, setBatteryType] = useState('4D');
  const [quantity, setQuantity] = useState(1);
  const [isTradeIn, setIsTradeIn] = useState(true);

  const batterySpecs: Record<string, { name: string; cashPrice: number; tradeInPrice: number; desc: string }> = {
    'LM7': { name: 'LM7 (Small Equipment)', cashPrice: 200, tradeInPrice: 250, desc: '' },
    'NS40': { name: 'NS40', cashPrice: 250, tradeInPrice: 280, desc: 'NS40R-1SN / NS40-1SM' },
    '1SNF': { name: '1SNF (Standard Compact)', cashPrice: 280, tradeInPrice: 320, desc: 'NS40 / N50 Series' },
    '1SMF': { name: '1SMF (Standard Sedan)', cashPrice: 370, tradeInPrice: 430, desc: 'N50-2SM' },
    '2SMF': { name: '2SMF', cashPrice: 430, tradeInPrice: 500, desc: 'N50-2SM' },
    '3SMF': { name: '3SMF', cashPrice: 480, tradeInPrice: 560, desc: 'N70L-3SM' },
    '6SMF': { name: '6SMF', cashPrice: 630, tradeInPrice: 740, desc: 'N100L-6SM' },
    '2D': { name: '2D', cashPrice: 850, tradeInPrice: 1000, desc: 'N120L-2D' },
    '4D': { name: '4D', cashPrice: 1000, tradeInPrice: 1200, desc: 'N150L-4D' },
    '8D': { name: '8D (Heavy Industrial)', cashPrice: 1200, tradeInPrice: 1400, desc: 'Heavy Duty Series' }
  };

  const currentSpec = batterySpecs[batteryType];
  const baseValue = currentSpec.cashPrice * quantity;
  const tradeInBonus = isTradeIn ? (currentSpec.tradeInPrice - currentSpec.cashPrice) * quantity : 0;
  const estimatedRebate = baseValue + tradeInBonus;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* ─── FIXED NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            {/* Authentic Round Company Logo */}
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md relative bg-slate-950 border border-slate-800 shrink-0">
              <Image src="/truckgear-logo-v4.png" alt="TruckGear Logo" fill className="object-cover" priority />
            </div>
            <div className="flex flex-col select-none">
              <span className="font-black italic text-xl tracking-wide text-white leading-none">
                Truck<span className="text-amber-500 glow-text-yellow">Gear</span>
              </span>
              <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest leading-none mt-1">PHILIPPINES CO.</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#about" className="hover:text-amber-400 transition-colors">About</a>
            <a href="#vision" className="hover:text-amber-400 transition-colors">Vision & Mission</a>
            <a href="#parts" className="hover:text-amber-400 transition-colors">Parts Grid</a>
            <a href="#batteries" className="hover:text-amber-400 transition-colors">Batteries</a>
            <a href="#ceo" className="hover:text-amber-400 transition-colors">CEO Message</a>
          </nav>
          <div>
            <Link 
              href="/portal/login" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md shadow-lg shadow-amber-500/10 hover:shadow-amber-500/30 transition-all duration-300 group uppercase tracking-widest"
            >
              <span>Access PARTSMAN OS</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── STUNNING HERO SECTION ─── */}
      <section className="relative relative-grid py-20 md:py-28 border-b border-slate-900 overflow-hidden min-h-[90vh] flex items-center">
        {/* Slanted Yellow/Black Chevron Accent Background */}
        <div className="absolute top-0 right-0 w-[45%] h-full bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none transform skew-x-12 z-0 hidden lg:block border-l border-amber-500/10"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>OFFICIAL 2026 COMPANY PORTAL</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight uppercase">
                Your Gear to <br />Move Forward. <br />
                <span className="text-amber-500 glow-text-yellow">Your Partner in Success.</span>
              </h1>
              
              <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed font-medium">
                TruckGear Philippines Co. is your go-to retail destination for premium truck replacement parts. We bring high-quality, dependable components directly to truck owners and operators, paired with accredited eco-friendly battery recycling solutions that keep your vehicle moving responsibly.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="#about" className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700 font-bold text-xs uppercase tracking-widest rounded-lg transition-all duration-300 text-center flex items-center justify-center gap-2">
                  <span>Explore Company Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <Link href="/partsman" className="px-8 py-4 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs uppercase tracking-widest rounded-lg transition-all duration-300 text-center shadow-xl shadow-amber-500/15 hover:shadow-amber-500/35 flex items-center justify-center gap-2">
                  <span>Explore Partsman OS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Slanted Renders Window */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full aspect-square max-w-[420px] mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/35 shadow-2xl shadow-amber-500/10 group">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-500 z-20"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-500 z-20"></div>
                
                <Image 
                  src="/storefront-v4.png" 
                  alt="Truckgear Storefront View" 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                
                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 z-10 flex justify-between items-center text-[10px] font-mono select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span className="text-white font-bold">GRID SYNCED</span>
                  </div>
                  <span className="text-amber-500 font-bold">NITRO-5 DEVICE CONNECTED</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── ABOUT DIRECTORY SECTION ─── */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6 scroll-mt-20">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block border-l-2 border-amber-500 pl-3">SECTION 01 // OVERVIEW</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">About Company</h2>
            
            <p className="text-slate-400 leading-relaxed font-medium">
              Founded in 2016 in the industrial center of Caloocan, **TruckGear Philippines Co.** began with a singular mission: to serve as a reliable supplier of Japanese and Chinese truck parts.
            </p>
            <p className="text-slate-400 leading-relaxed font-medium">
              Over the years, we have accelerated beyond our humble beginnings to become a premier importer and wholesale distributor of superior replacement parts. We supply construction conglomerates, delivery networks, and spare part centers across Luzon, Visayas, and Mindanao.
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                <span className="text-2xl font-black text-amber-500 font-mono block">24 Hrs</span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-1">Downtime Limit</span>
                <span className="text-[10px] text-slate-500 block mt-1">Rapid order dispatch and delivery nationwide.</span>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                <span className="text-2xl font-black text-amber-500 font-mono block">25,000+</span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-1">Industrial parts</span>
                <span className="text-[10px] text-slate-500 block mt-1">Full-spectrum Japanese & Chinese support.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 bg-slate-900/30 border border-slate-800 p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>
            <h3 className="text-base font-bold text-white uppercase font-mono tracking-widest border-b border-slate-800 pb-4">The Truckgear Advantage</h3>
            <div className="space-y-6">
              {[
                { title: 'Zero-Downtime Commitment', desc: 'In logistics and construction, downtime means major financial loss. We pick and dispatch parts immediately to preserve operations.' },
                { title: 'Premium Sourced Assemblies', desc: 'Direct-from-factory sourcing ensures that every part matches strict OEM standards at wholesale scales.' },
                { title: 'PARTSMAN AI Operating System', desc: 'Our self-hosted database system allows corporate clients to instantly check inventory status, track ledgers, and manage payments.' }
              ].map((adv, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-300">
                    0{i+1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wide text-xs mb-1">{adv.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{adv.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ─── STUNNING BOOKLET VISION & MISSION SECTION ─── */}
      <section id="vision" className="bg-slate-900/20 border-y border-slate-900 py-24 scroll-mt-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-full bg-amber-500/5 transform -skew-x-12 -translate-x-32 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-full bg-amber-500/5 transform skew-x-12 translate-x-32 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block">SECTION 02 // ROADMAP</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">Vision & Mission</h2>
            <p className="text-xs text-slate-500 font-mono">FROM ACCELERATING LOGISTICS TO COMPLIANT RECYCLING</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Vision Panel */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/20 rounded-2xl p-8 space-y-6 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-3xl pointer-events-none"></div>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-300">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider font-mono text-white">Our Vision</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                To be the premier partner in the Philippine trucking and logistics industry, accelerating our clients' success through superior product quality, strategic innovation, and a relentless commitment to keeping the nation moving.
              </p>
            </div>

            {/* Mission Panel */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/20 rounded-2xl p-8 space-y-6 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-3xl pointer-events-none"></div>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-300">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider font-mono text-white">Our Mission</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                To provide high-quality heavy and light truck parts with unmatched speed and reliability. We are dedicated to minimizing downtime by delivering the best value products into our customers' hands within 24 hours, ensuring every interaction is executed with integrity and professional excellence.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── DIVISION 1: HEAVY PARTS DETAILED GRID ─── */}
      <section id="parts" className="py-24 max-w-7xl mx-auto px-6 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block">RETAIL DIVISION // AFTERMARKET SPECIALISTS</span>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">PREMIUM AFTERMARKET PARTS</h2>
          <p className="text-xs text-slate-500 font-mono">HIGH-QUALITY, ACCESSIBLE SPARES FOR JAPANESE & CHINESE DIESEL TRUCKS</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Japanese Component Spares', category: 'ISUZU / HINO / FUSO', icon: Truck, desc: 'Complete engine cylinder kits, crankshafts, manual transmissions, clutch packs, suspension air-bags, and specialized brake grids for light, medium, and heavy haulage fleets.' },
            { title: 'Chinese Heavy Duty Parts', category: 'SINOTRUK / SHACMAN / FAW', icon: Layers, desc: 'Full chassis fittings, cabin overlays, high-ratio differentials, turbocharger components, steering boxes, and exhaust grids optimized for robust construction and haulage platforms.' },
            { title: 'Electrical & Filter Kits', category: 'CUMMINS / WEICHAI / OSAKA', icon: Zap, desc: 'Accredited high-micron diesel fuel filters, oil separators, alternators, starter motors, and electrical diagnostic sensors keeping common-rail systems performing at peak loads.' }
          ].map((part, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 hover:border-amber-500/20 p-6 rounded-2xl shadow-md transition-all duration-300 relative group">
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-slate-800 group-hover:border-amber-500/30 transition-colors rounded-tr-2xl"></div>
              <div className="w-10 h-10 bg-amber-500/5 text-amber-400 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-300">
                <part.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-amber-500 font-mono tracking-widest uppercase block mb-1">{part.category}</span>
              <h4 className="font-bold text-white uppercase tracking-wide text-xs mb-2">{part.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">{part.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DIVISION 2: CLOSED-LOOP MEDEX BATTERIES ─── */}
      <section id="batteries" className="bg-slate-900/20 border-t border-slate-900 py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block">TRUCKGEAR PHILIPPINES CO.</span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">Official Battery Trade-In & Buy-Back Program</h2>
            <p className="text-xs text-slate-500 font-mono">Turn your dead, junk, and scrap batteries into Instant Cash, or trade them in for a massive discount on a brand new MEDEX Super Power Battery!</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Dynamic Battery solutions Image Render inside slanted frame */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full aspect-square max-w-[390px] mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-2xl shadow-emerald-500/5 group">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-500/30 z-20"></div>
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-500/30 z-20"></div>
                
                <Image 
                  src="/medex-batteries.png" 
                  alt="Medex Batteries & Recycling Solutions" 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-lg border border-slate-800/80 z-10 flex justify-between items-center text-[9px] font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Recycle className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="font-bold">DENR TRANSITS ACTIVE</span>
                  </div>
                  <span className="text-slate-400">MANIFEST #ULAB-406</span>
                </div>
              </div>
            </div>

            {/* Right: Interactive Scrap rebate calculator */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500 rounded-bl-2xl"></div>
              
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white uppercase tracking-wider">Instant Scrap Cash Rebate Estimator</h4>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Calculates live scrap lead payouts</p>
              </div>

              <div className="space-y-4 text-xs">
                
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-mono font-bold uppercase tracking-wider block">1. Select Scrap Battery Model</label>
                  <select 
                    value={batteryType} 
                    onChange={(e) => setBatteryType(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="LM7">LM7 (Small Equipment)</option>
                    <option value="NS40">NS40 (NS40R-1SN / NS40-1SM)</option>
                    <option value="1SNF">1SNF (Standard Compact) - NS40 / N50 Series</option>
                    <option value="1SMF">1SMF (Standard Sedan) - N50-2SM</option>
                    <option value="2SMF">2SMF - N50-2SM</option>
                    <option value="3SMF">3SMF - N70L-3SM</option>
                    <option value="6SMF">6SMF - N100L-6SM</option>
                    <option value="2D">2D - N120L-2D</option>
                    <option value="4D">4D - N150L-4D</option>
                    <option value="8D">8D (Heavy Industrial) - Heavy Duty Series</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-mono font-bold uppercase tracking-wider block">2. Scrap Quantity</label>
                    <input 
                      type="number" 
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 text-center focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-mono font-bold uppercase tracking-wider block">3. Trade-In Bonus?</label>
                    <button
                      type="button"
                      onClick={() => setIsTradeIn(!isTradeIn)}
                      className={`w-full p-3 border rounded-lg text-center font-bold transition-all duration-300 font-mono uppercase tracking-widest ${isTradeIn ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-855 text-slate-500'}`}
                    >
                      {isTradeIn ? `Activated (+₱${currentSpec.tradeInPrice - currentSpec.cashPrice}/pc)` : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Estimate Result receipt */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2.5 font-mono text-[11px] select-none shadow-inner">
                  <div className="flex justify-between">
                    <span className="text-slate-500">SPECIFICATION:</span>
                    <span className="text-white font-bold">{batterySpecs[batteryType].name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BASE BUYBACK VAL:</span>
                    <span className="text-white font-bold">₱{currentSpec.cashPrice.toLocaleString()} / pc</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">QUANTITY SYNCED:</span>
                    <span className="text-white font-bold">{quantity} units</span>
                  </div>
                  {isTradeIn && (
                    <div className="flex justify-between text-emerald-400">
                      <span>TRADE-IN REBATE BONUS:</span>
                      <span className="font-bold">+₱{tradeInBonus.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-amber-500 pt-1">
                    <span>ESTIMATED CASH REBATE:</span>
                    <span className="glow-text-yellow">₱{estimatedRebate.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Estimates subject to raw lead grid indexes. Payouts verified at branch scales. ULAB Scrap buyback is fully DENR certified.</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3-Step Recycling Workflow */}
          <div className="border-t border-slate-850 pt-16">
            <h4 className="text-center text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-10">THE CLOSED-LOOP BATTERY CYCLE</h4>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', name: 'GET NEW POWER', icon: Zap, color: 'text-amber-500', desc: 'Equip your truck fleet with MEDEX storage batteries. Guaranteed direct wholesale pricing and extended warranties.' },
                { step: '02', name: 'SELL JUNK SCRAP', icon: Coins, color: 'text-emerald-400', desc: 'Trade in used, old & scrap batteries (ULAB) for instant cash. Scale-weighted transparency at all logistics hubs.' },
                { step: '03', name: 'RESPONSIBLE RECYCLING', icon: Recycle, color: 'text-blue-400', desc: 'Secure transit via DENR accredited transport directly to local TSD recycling plants. 100% eco-compliant.' }
              ].map((act, i) => (
                <div key={i} className="bg-slate-900/30 border border-slate-850 p-6 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-slate-600">{act.step}</span>
                    <act.icon className={`w-6 h-6 ${act.color}`} />
                  </div>
                  <h5 className="font-bold text-white text-xs font-mono uppercase tracking-widest">{act.name}</h5>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{act.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── REAL BOOKLET CEO MESSAGE & storefront HISTORY ─── */}
      <section id="ceo" className="py-24 max-w-7xl mx-auto px-6 scroll-mt-20">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Left: Message from CEO Engr. Ben Anthony C. Bagalihog */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block border-l-2 border-amber-500 pl-3">SECTION 03 // LEADERSHIP MESSAGE</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">Welcome to Truckgear</h2>
            
            <div className="relative p-6 bg-slate-900/40 border border-slate-800 rounded-2xl italic text-slate-300 text-sm leading-relaxed space-y-4">
              <Quote className="absolute top-4 right-4 w-10 h-10 text-slate-800 z-0 opacity-40" />
              <p className="relative z-10">
                "In the logistics and construction industry, the right gear makes all the difference. Since 2016, TruckGear Philippines Co. has been dedicated to one goal: ensuring you have the equipment you need to move forward."
              </p>
              <p className="relative z-10">
                "We know the challenges you face—tight deadlines, rugged terrains, and the high cost of equipment failure. That is why we don't just sell parts; we provide solutions. Whether you are maintaining a fleet of heavy trucks or managing a mining operation, our team is ready to deliver high-quality new and aftermarket parts on the spot."
              </p>
              <p className="relative z-10">
                "With our expansion into Quezon City, Parañaque, and Cavite, we are closer to you than ever before. We invite you to explore our profile and see how our commitment to integrity, innovation, and speed can work for you. Let us be your gear to success."
              </p>
            </div>

            <div className="font-mono text-xs">
              <p className="text-white font-bold text-sm uppercase">Engr. Ben Anthony C. Bagalihog</p>
              <p className="text-slate-500 uppercase tracking-widest mt-1">CEO, TruckGear Philippines Co.</p>
            </div>
          </div>

          {/* Right: Company Profile Cover */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 select-none pb-2 border-b border-slate-800">
                <span>BUSINESS PROFILE</span>
                <span>2026 EDITION</span>
              </div>
              <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-slate-850 group">
                <Image 
                  src="/company-profile.png" 
                  alt="TruckGear Company Profile 2026" 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-left space-y-1.5 font-mono select-none">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs tracking-wider">COMPANY PROFILE</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] rounded uppercase font-bold tracking-widest">LATEST RELEASE</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed text-center">
                Your Gear to Move Forward. Your Partner in Success.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ─── MILESTONES & BRANCH NETWORK TIMELINE ─── */}
      <section id="milestones" className="bg-slate-900/10 border-t border-slate-900 py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-20 space-y-2">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block">SECTION 04 // TIMELINE</span>
            <h3 className="text-3xl font-black text-white tracking-tight uppercase leading-none">Strategic Hub Timeline</h3>
            <p className="text-xs text-slate-400 mt-2 font-mono">A Journey of Growth: From a single location to a strategic cross-region supply grid.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                year: '2016', 
                name: 'The Foundation', 
                loc: 'Caloocan City',
                desc: 'Founded in Caloocan, Philippines as a specialized supplier of Japanese and Chinese truck parts. This marked the beginning of our mission to provide quality aftermarket solutions.'
              },
              { 
                year: '2018', 
                name: 'Establishing Our Identity', 
                loc: 'South Caloocan',
                desc: 'We solidified our presence in the industry by opening our first official branch, TruckGear Heavy Equipment Parts and Trading, in South Caloocan. This location set the standard for our service and product quality.'
              },
              { 
                year: '2022', 
                name: 'Expanding South', 
                loc: 'Parañaque City (HW Truck MNL)',
                desc: 'To reach more partners in the south, we launched our sister company, HW Truck MNL, located in Parañaque City. This strategic move allowed us to serve the logistics hubs near the airport and southern metro area effectively.'
              },
              { 
                year: '2023', 
                name: 'The New Headquarters', 
                loc: 'A. Bonifacio, Quezon City',
                desc: 'We established our Main Branch in A. Bonifacio, Quezon City. This central hub now serves as the heart of our operations, streamlining our ability to import and distribute parts across the region.'
              },
              { 
                year: '2024', 
                name: 'Reaching Cavite', 
                loc: 'Bacoor, Cavite (HW Truck Bacoor)',
                desc: 'Continuing our aggressive expansion, we opened another sister company, HW Truck Bacoor, in Cavite. This addition brings our total network to four locations, fulfilling our promise to be accessible wherever our customers need us.'
              },
              { 
                year: '2025', 
                name: 'The Batangas Gateway', 
                loc: 'Batangas City Branch (Dec 2025)',
                desc: 'Opened the Batangas City Branch, strategically supporting the industrial and maritime sectors near the Batangas International Port.'
              },
              { 
                year: '2026', 
                name: 'Central Luzon Expansion', 
                loc: 'Bulacan (Buy-Fast Truck Parts - Feb 2026)',
                desc: 'Launched Buy-Fast Truck Parts in Bulacan. This branch is dedicated to providing high-speed parts fulfillment for the rapidly developing construction and transport sectors in the north.'
              }
            ].map((mile, idx) => (
              <div key={idx} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 p-8 rounded-2xl flex flex-col justify-between relative transition-all duration-300 group shadow-lg hover:shadow-amber-500/[0.02]">
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-slate-800 group-hover:border-amber-500/20 rounded-tr-2xl transition-colors"></div>
                <div className="absolute top-0 left-0 w-[4px] h-0 bg-amber-500 rounded-l-2xl group-hover:h-full transition-all duration-300"></div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-amber-500 block font-mono leading-none tracking-tighter">{mile.year}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">[STAGE 0{idx + 1}]</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wider font-mono">{mile.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{mile.desc}</p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-850 flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono text-[10px] font-bold tracking-wide">{mile.loc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BRANDS FOOTPRINT DIRECTORY ─── */}
      <section id="brands" className="bg-slate-900/40 border-t border-slate-900 py-20 scroll-mt-20 select-none">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="text-center">
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest block">PORTFOLIO // GLOBAL PARTNERS</span>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mt-2">Core Brands We Carry</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">Direct importer of premium heavy duty parts, filtration, lubricants, and chassis assemblies</p>
          </div>
          
          {/* Stunning exact booklet brand partner banner display */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-6 md:p-10 shadow-2xl flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950 opacity-40 pointer-events-none z-10"></div>
            <Image 
              src="/brands-banner.png" 
              alt="Truckgear Authorized Core Brands and Repair Associates Portfolio" 
              width={1200}
              height={800}
              className="object-contain max-h-[520px] transition-transform duration-500 hover:scale-[1.01]"
            />
          </div>
        </div>
      </section>
      {/* ─── CONTACT & BRANCHES SECTION ─── */}
      <section id="contact" className="relative bg-slate-950 py-24 border-t border-slate-900 overflow-hidden scroll-mt-20">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-[40%] h-full bg-amber-500/5 transform skew-x-12 z-0 hidden lg:block border-l border-amber-500/10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Column: Let's Connect Banner */}
            <div className="lg:col-span-4 space-y-8">
              <div className="relative bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-8 shadow-2xl overflow-hidden text-slate-950 border border-amber-400">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 space-y-6">
                  {/* TruckGear Typography Logo */}
                  <div className="relative w-64 h-20 -ml-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <Image src="/truckgear-typo-logo.png" alt="TruckGear" fill className="object-contain object-left" priority />
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-black uppercase leading-[1.1] tracking-tighter drop-shadow-sm">
                    Let's<br/>Connect<br/>With Us
                  </h2>
                  
                  <div className="pt-4 border-t border-slate-950/20">
                    <h3 className="font-bold text-lg mb-2">Truckgear Philippines Co.</h3>
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      Looking for something in particular? Give our expert customer service staff a call today across any of our regional hubs.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6">
                <a 
                  href="viber://chat?number=+639285066385" 
                  className="w-full flex items-center justify-center gap-3 bg-[#7360f2] hover:bg-[#6251d1] text-white py-4 px-6 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-[#7360f2]/20"
                >
                  <MessageCircle className="w-6 h-6" />
                  Request Quote via Viber
                </a>
                
                <Link 
                  href="/request-quote"
                  className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 px-6 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
                >
                  <Quote className="w-6 h-6" />
                  Submit Quote Online
                </Link>
              </div>
              {/* Quick Contact Links */}
              <div className="space-y-6 text-slate-300 font-mono text-xs hidden lg:block bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <span>(02) 8552 3199</span>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <span>truckgearph@gmail.com</span>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                  <span className="underline underline-offset-4 decoration-slate-700 hover:text-amber-400 transition-colors cursor-pointer">www.truckgearphilippines.com</span>
                </div>
              </div>
            </div>

            {/* Right Column: Branch Directory */}
            <div className="lg:col-span-8">
              <div className="mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider font-mono">Branch Directory</h3>
                <span className="text-[10px] text-amber-500 uppercase tracking-widest font-mono font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">6 Locations</span>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Branch 1 */}
                <div className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl transition-all group flex flex-col">
                  <h4 className="font-bold text-amber-400 text-sm mb-2 uppercase tracking-wide">TRUCKGEAR TRUCK PARTS STORE</h4>
                  <div className="flex gap-2 items-start text-xs text-slate-400 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>1032 A. Bonifacio St. Brgy Balingasa, Quezon City</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/60 mt-auto mb-4">
                    <div className="flex justify-between"><span className="text-slate-500">Ben Anthony:</span> <span>0928 506 6385</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Benny:</span> <span>0935 881 8360</span></div>
                  </div>
                  <div className="mt-auto w-full h-32 rounded-lg overflow-hidden border border-slate-800/60">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      src="https://maps.google.com/maps?q=TruckGear+Philippines+Co.&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    />
                  </div>
                </div>

                {/* Branch 2 */}
                <div className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl transition-all group flex flex-col">
                  <h4 className="font-bold text-amber-400 text-sm mb-2 uppercase tracking-wide">TRUCKGEAR MOTORPARTS CENTER</h4>
                  <div className="flex gap-2 items-start text-xs text-slate-400 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>Amihan Ville, Balagtas, Batangas City, Batangas</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/60 mt-auto mb-4">
                    <div className="flex justify-between"><span className="text-slate-500">Honesto:</span> <span>0918 990 6385</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ben Anthony:</span> <span>0928 506 6385</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Benny:</span> <span>0935 881 8360</span></div>
                  </div>
                  <div className="mt-auto w-full h-32 rounded-lg overflow-hidden border border-slate-800/60">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      src="https://maps.google.com/maps?q=TRUCKGEAR+MOTORPARTS+CENTER+Batangas&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    />
                  </div>
                </div>


              </div>
            </div>

          </div>
        </div>
      </section>
      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex justify-center items-center gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full overflow-hidden relative border border-slate-800 shrink-0">
              <Image src="/truckgear-logo-v4.png" alt="TruckGear Logo" fill className="object-cover" />
            </div>
            <div className="flex flex-col text-left select-none">
              <span className="font-black italic text-xs tracking-wide text-white leading-none">
                Truck<span className="text-amber-500">Gear</span>
              </span>
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-0.5">PHILIPPINES CO.</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-650 pt-4">© 2026 Truckgear Philippines Co. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
