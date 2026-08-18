'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Truck, ArrowLeft, Filter, Sparkles, Phone, MessageCircle, ExternalLink, CheckCircle, ShieldAlert, Zap, Droplet } from 'lucide-react';

interface CatalogPart {
  sku: string;
  name: string;
  category: string;
  fitment: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  imageUrl?: string;
  images?: string[];
}

function ProductCardItem({ p }: { p: CatalogPart }) {
  const validImgs = (p.images || []).filter(Boolean);
  if (validImgs.length === 0 && p.imageUrl) validImgs.push(p.imageUrl);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeImg = validImgs[activeIdx] || validImgs[0] || '';

  const upperName = p.name.toUpperCase();
  const upperCat = p.category.toUpperCase();
  const isFluid = upperName.includes('COOLANT') || upperName.includes('ATF') || upperName.includes('FLUID') || upperCat.includes('FLUID');
  const isElectrical = upperCat.includes('ELECTRICAL') || upperName.includes('HORN');

  return (
    <div className="bg-slate-900/40 border border-slate-800 hover:border-amber-500/30 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg">
      <div>
        {/* MAIN PHOTO CARD WITH ANGLE BADGE */}
        <div className="aspect-video bg-slate-950 relative overflow-hidden border-b border-slate-850 flex items-center justify-center">
          {activeImg ? (
            <Image src={activeImg} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="text-center p-4">
              {isFluid ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                  <Droplet className="w-6 h-6" />
                </div>
              ) : isElectrical ? (
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-2 text-amber-500">
                  <Truck className="w-6 h-6" />
                </div>
              )}
              <span className="text-[10px] font-mono text-slate-300 font-bold block">TRUCKGEAR GENUINE</span>
              <span className="text-[8px] font-mono text-slate-500 uppercase block">OEM SPECIFIED REPLACEMENT</span>
            </div>
          )}

          <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950/90 text-amber-400 font-mono font-bold text-[10px] rounded border border-slate-800">
            {p.sku}
          </span>

          {validImgs.length > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/90 text-slate-950 font-mono font-black text-[9px] rounded border border-emerald-400 uppercase">
              📷 {validImgs.length} {validImgs.length === 1 ? 'Angle' : 'Angles'}
            </span>
          )}
        </div>

        {/* INTERACTIVE THUMBNAIL ANGLE GALLERY STRIP */}
        {validImgs.length > 1 && (
          <div className="flex gap-1.5 p-2 bg-slate-950 border-b border-slate-850 overflow-x-auto">
            {validImgs.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-9 h-9 rounded border-2 overflow-hidden bg-slate-900 shrink-0 transition-all ${
                  activeIdx === i ? 'border-amber-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${isFluid ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : isElectrical ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>
              {p.category}
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded uppercase">
              {p.fitment}
            </span>
          </div>

          <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
            {p.name}
          </h3>

          <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex justify-between items-baseline font-mono text-xs">
            <span className="text-[9px] text-slate-400 uppercase font-bold">RETAIL STORE PRICE:</span>
            <span className="text-lg font-black text-amber-500 font-mono">
              {p.sellingPrice > 0 ? `₱${p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'INQUIRE COST'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className={`text-[10px] font-mono font-bold ${p.stock > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              ● {p.stock > 0 ? `${p.stock} IN STOCK` : 'AVAILABLE ON ORDER'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-850">
        <a
          href={`https://wa.me/639285066385?text=Hello%20Truckgear!%20I%20would%20like%20to%20inquire%20about%20part%20${encodeURIComponent(p.sku)}%20(${encodeURIComponent(p.name)})%20priced%20at%20P${p.sellingPrice.toFixed(2)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <span>Inquire Item Quote</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function PublicCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedFitment, setSelectedFitment] = useState('ALL');
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        // 1. Try static synced products.json from website build
        let res = await fetch(`/products.json?cb=${Date.now()}`).catch(() => null);
        
        // 2. If not found or empty, try live server API
        if (!res || !res.ok) {
          const primaryApi = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/products` : '/api/products';
          res = await fetch(`${primaryApi}?cb=${Date.now()}`).catch(() => null);
        }

        if (!res || !res.ok) {
          res = await fetch(`http://100.86.51.57:3002/api/products?cb=${Date.now()}`).catch(() => null);
        }

        if (res && res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            const mapped: CatalogPart[] = raw.map((item: any) => {
              const parsePrice = (v: any) => {
                if (!v) return 0;
                const clean = String(v).replace(/[^0-9.]/g, '');
                const n = parseFloat(clean);
                return isNaN(n) ? 0 : n;
              };
              const cost = parsePrice(item.cost_price || item.costPrice || item.cost || 0);
              let sell = parsePrice(item.selling_price || item.sellingPrice || item.price || 0);
              if (sell === 0 && cost > 0) sell = cost * 1.35;

              let imgs = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
              if ((item.image_url || item.imageUrl) && !imgs.includes(item.image_url || item.imageUrl)) {
                imgs.unshift(item.image_url || item.imageUrl);
              }

              return {
                sku: item.sku || item.oem_number || 'TG-PART',
                name: item.name || item.partName || 'Genuine Truck Replacement Part',
                category: item.category || 'General Spares',
                fitment: item.compatibleModels || item.location || 'Universal Fitment',
                costPrice: cost,
                sellingPrice: sell,
                stock: parseInt(item.stock_quantity || item.stockQuantity || item.stock || 10),
                imageUrl: imgs[0] || item.image_url || item.imageUrl || '',
                images: imgs
              };
            });
            setParts(mapped);
            return;
          }
        }
        
        // No dummy sample items fallback: default to empty catalog list
        setParts([]);
      } catch (err) {
        console.error('Failed to load public catalog:', err);
        setParts([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const categories = ['ALL', 'FLUIDS', 'ELECTRICAL', 'ENGINE', 'BRAKE', 'SUSPENSION', 'TRANSMISSION', 'FILTERS'];
  const fitments = ['ALL', 'ISUZU', 'HINO', 'FUSO', 'HOWO', 'SHACMAN', 'FAW', 'UNIVERSAL'];

  const filteredParts = parts.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesText = !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.fitment.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'ALL' || p.category.toUpperCase().includes(selectedCategory);
    const matchesFit = selectedFitment === 'ALL' || p.fitment.toUpperCase().includes(selectedFitment);
    return matchesText && matchesCat && matchesFit;
  });

  const totalItems = filteredParts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const pageItems = filteredParts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* ─── HEADER NAV ─── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md relative bg-slate-950 border border-slate-800 shrink-0">
              <Image src="/truckgear-logo-v4.png" alt="TruckGear Logo" fill className="object-cover" priority />
            </div>
            <div className="flex flex-col select-none">
              <span className="font-black italic text-lg tracking-wide text-white leading-none">
                Truck<span className="text-amber-500 glow-text-yellow">Gear</span>
              </span>
              <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest leading-none mt-1">PARTS CATALOG</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-md border border-slate-800 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500" />
              <span>Back to Home</span>
            </Link>

            <Link 
              href="/request-quote"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md shadow-lg shadow-amber-500/10 hover:shadow-amber-500/30 transition-all uppercase tracking-widest"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Request Custom Quote</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO & SEARCH BANNER ─── */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>OFFICIAL TRUCKGEAR PARTS CATALOG</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
                Search Truck Replacement Parts
              </h1>
              <p className="text-slate-400 text-sm md:text-base mt-1 max-w-2xl font-medium">
                Live searchable inventory for Isuzu, Hino, Fuso, Sinotruk Howo & Shacman replacement components with direct wholesale retail pricing.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-lg shrink-0">
              <CheckCircle className="w-4 h-4" />
              <span>LIVE INVENTORY READY</span>
            </div>
          </div>

          {/* SEARCH INPUT + FILTERS BAR */}
          <div className="grid md:grid-cols-12 gap-3 pt-2">
            <div className="md:col-span-6 relative">
              <input
                type="text"
                placeholder="Search OEM Number (e.g. 80KH1205), Part Name, or Fitment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-mono"
              />
              <Search className="w-5 h-5 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>Category: {c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedFitment}
                onChange={(e) => setSelectedFitment(e.target.value)}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sky-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              >
                {fitments.map(f => (
                  <option key={f} value={f}>Fitment: {f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PARTS GRID RESULTS ─── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            PARTS LISTING ({filteredParts.length} ITEMS FOUND)
          </h2>
          {(searchQuery || selectedCategory !== 'ALL' || selectedFitment !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedFitment('ALL'); }}
              className="text-xs font-mono text-amber-500 hover:underline uppercase"
            >
              Clear Filters
            </button>
          )}
        </div>

        {filteredParts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl p-8">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white uppercase">No Matching Parts Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              We couldn't find any parts matching your search terms. Try adjusting your category filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pageItems.map((p, idx) => (
              <ProductCardItem key={idx} p={p} />
            ))}
          </div>
        )}

        {/* 30 ITEMS PER PAGE PAGINATION FOOTER BAR */}
        {!isLoading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-10 pt-6 border-t border-slate-900 gap-4 font-mono text-xs">
            <div className="text-slate-400 font-medium">
              Showing <span className="text-amber-500 font-bold">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white font-bold">{totalItems}</span> Store Parts (30 items per page)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-lg text-white font-bold transition-colors"
              >
                ◄ PREV
              </button>

              <span className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-500 font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-lg text-white font-bold transition-colors"
              >
                NEXT ►
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
