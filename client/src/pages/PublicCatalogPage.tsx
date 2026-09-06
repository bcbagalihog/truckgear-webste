import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Search, Truck, ArrowLeft, Sparkles, MessageCircle, CheckCircle, Zap, Droplet, X, Maximize2, ZoomIn } from 'lucide-react';

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
  description?: string;
}

function ProductCardItem({ p }: { p: CatalogPart }) {
  const validImgs = (p.images || []).filter(Boolean);
  if (validImgs.length === 0 && p.imageUrl) validImgs.push(p.imageUrl);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImgIdx, setModalImgIdx] = useState(0);

  const activeImg = validImgs[activeIdx] || validImgs[0] || '';
  const modalImg = validImgs[modalImgIdx] || validImgs[0] || '';

  const upperName = p.name.toUpperCase();
  const upperCat = p.category.toUpperCase();
  const isFluid = upperName.includes('COOLANT') || upperName.includes('ATF') || upperName.includes('FLUID') || upperCat.includes('FLUID');
  const isElectrical = upperCat.includes('ELECTRICAL') || upperName.includes('HORN');

  const handleViberClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const message = `Hello TruckGear! I would like to inquire about: ${p.name} (₱${p.sellingPrice.toFixed(2)})`;
    const viberUrl = `viber://chat?number=%2B639285066385&text=${encodeURIComponent(message)}`;
    window.open(viberUrl, '_blank');
  };

  const openModal = () => {
    setModalImgIdx(activeIdx);
    setIsModalOpen(true);
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <>
      <div className="bg-slate-900/40 border border-slate-800 hover:border-[#FACC15]/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg hover:shadow-yellow-500/5">
        <div>
          {/* MAIN PHOTO CARD WITH HOVER OVERLAY & CLICK TO POP OUT */}
          <div 
            onClick={openModal}
            className="aspect-video bg-slate-950 relative overflow-hidden border-b border-slate-800 flex items-center justify-center cursor-pointer group/photo"
          >
            {activeImg ? (
              <img 
                src={activeImg} 
                alt={p.name} 
                className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500" 
              />
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
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-2 text-[#FACC15]">
                    <Truck className="w-6 h-6" />
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-300 font-bold block">TRUCKGEAR GENUINE</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase block">OEM SPECIFIED REPLACEMENT</span>
              </div>
            )}

            {/* HOVER QUICK VIEW OVERLAY */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-white font-mono text-xs font-bold">
              <ZoomIn className="w-4 h-4 text-[#FACC15] animate-bounce" />
              <span className="text-[#FACC15]">CLICK TO POP OUT</span>
            </div>

            {validImgs.length > 0 && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/90 text-slate-950 font-mono font-black text-[9px] rounded border border-emerald-400 uppercase z-10">
                📷 {validImgs.length} {validImgs.length === 1 ? 'Angle' : 'Angles'}
              </span>
            )}
          </div>

          {/* INTERACTIVE THUMBNAIL ANGLE GALLERY STRIP */}
          {validImgs.length > 1 && (
            <div className="flex gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto">
              {validImgs.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                  className={`w-9 h-9 rounded border-2 overflow-hidden bg-slate-900 shrink-0 transition-all cursor-pointer ${
                    activeIdx === i ? 'border-[#FACC15] scale-105 shadow-md shadow-yellow-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
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

            <h3 
              onClick={openModal}
              className="font-bold text-white text-sm line-clamp-2 leading-snug hover:text-[#FACC15] transition-colors cursor-pointer"
            >
              {p.name}
            </h3>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-baseline font-mono text-xs">
              <span className="text-[9px] text-slate-400 uppercase font-bold">ONLINE RETAIL PRICE:</span>
              <span className="text-lg font-black text-[#FACC15] font-mono">
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

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={handleViberClick}
            className="w-full flex items-center justify-center gap-2 bg-[#FACC15] hover:bg-yellow-300 text-slate-950 py-2.5 px-4 rounded-xl font-mono text-xs font-black transition-all shadow-md shadow-yellow-500/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>INQUIRE VIA VIBER</span>
          </button>
        </div>
      </div>

      {/* ─── POP-OUT LIGHTBOX & SPECIFICATIONS MODAL ─── */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col md:flex-row overflow-hidden"
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-[#FACC15] flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT COLUMN: LARGE PHOTO & GALLERY STRIP */}
            <div className="md:w-1/2 p-6 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    PRODUCT IMAGE PREVIEW
                  </span>
                  {validImgs.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      📷 Angle {modalImgIdx + 1} of {validImgs.length}
                    </span>
                  )}
                </div>

                {/* LARGE MAIN IMAGE WITH HOVER ZOOM */}
                <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative group flex items-center justify-center">
                  {modalImg ? (
                    <img 
                      src={modalImg} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-500 cursor-zoom-in" 
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-600">
                      <Truck className="w-16 h-16 mx-auto mb-2 text-[#FACC15]" />
                      <span className="font-mono text-xs uppercase font-bold">No Image Available</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-800 flex items-center gap-1.5 pointer-events-none">
                    <ZoomIn className="w-3.5 h-3.5 text-[#FACC15]" />
                    <span>Hover image to zoom</span>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE THUMBNAIL SELECTOR IN MODAL */}
              {validImgs.length > 1 && (
                <div className="mt-4 pt-4 border-t border-slate-900">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-2">
                    AVAILABLE CAMERA ANGLES ({validImgs.length}):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {validImgs.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setModalImgIdx(idx)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                          modalImgIdx === idx ? 'border-[#FACC15] scale-105 ring-2 ring-[#FACC15]/30' : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: DETAILED SPECIFICATIONS & VIBER CTA */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg ${p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    ● {p.stock > 0 ? `${p.stock} IN STOCK` : 'AVAILABLE ON ORDER'}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white leading-tight uppercase">
                  {p.name}
                </h2>

                <div className="flex gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-3 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded uppercase">
                    Category: {p.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded uppercase">
                    Fitment: {p.fitment}
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">RETAIL PRICE:</span>
                  <div className="text-2xl md:text-3xl font-black text-[#FACC15] font-mono">
                    {p.sellingPrice > 0 ? `₱${p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'INQUIRE COST'}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Item Description & Specifications:</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl font-medium">
                    {p.description || `Genuine specification replacement part for ${p.fitment}. Precision manufactured to meet OEM tolerances for heavy-duty fleet operations.`}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleViberClick}
                  className="w-full flex items-center justify-center gap-3 bg-[#FACC15] hover:bg-yellow-300 text-slate-950 py-3.5 px-6 rounded-2xl font-mono text-sm font-black transition-all shadow-xl shadow-yellow-500/20 uppercase tracking-widest cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>INQUIRE VIA VIBER NOW</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PublicCatalogPage() {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedFitment, setSelectedFitment] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerPage = 30;

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setParts(data.map((item: any) => ({
              sku: item.sku || `PART-${item.id}`,
              name: item.name || 'Truck Part',
              category: item.category || 'General Spares',
              fitment: item.fitment || 'Universal',
              costPrice: parseFloat(item.costPrice) || 0,
              sellingPrice: parseFloat(item.sellingPrice || item.price) || 0,
              stock: parseInt(item.stock) || 10,
              imageUrl: item.imageUrl || '',
              images: item.images || []
            })));
            setIsLoading(false);
            return;
          }
        }
      } catch (_) {}

      // Fallback load from static products.json if API is empty
      try {
        const resJson = await fetch('/products.json');
        if (resJson.ok) {
          const dataJson = await resJson.json();
          if (Array.isArray(dataJson)) {
            setParts(dataJson.map((item: any) => ({
              sku: item.sku || item.partCode || 'PART-001',
              name: item.name || item.title || 'Truck Component',
              category: item.category || 'General Spares',
              fitment: item.fitment || item.compatibility || 'Universal',
              costPrice: parseFloat(item.costPrice) || 0,
              sellingPrice: parseFloat(item.sellingPrice || item.price) || 0,
              stock: parseInt(item.stock) || 10,
              imageUrl: item.imageUrl || item.image || '',
              images: item.images || []
            })));
          }
        }
      } catch (_) {}
      setIsLoading(false);
    }

    loadCatalog();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(parts.map(p => p.category)))];
  const fitments = ['ALL', ...Array.from(new Set(parts.map(p => p.fitment)))];

  const filteredParts = parts.filter(p => {
    const matchesSearch = 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fitment.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesFitment = selectedFitment === 'ALL' || p.fitment === selectedFitment;

    return matchesSearch && matchesCategory && matchesFitment;
  });

  const totalItems = filteredParts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const pageItems = filteredParts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-yellow-400 selection:text-slate-950">
      
      {/* ─── NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md relative bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
              <img src="/truckgear-logo-v4.png" alt="TruckGear Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col select-none">
              <span className="font-black italic text-lg tracking-wide text-white leading-none">
                Truck<span className="text-[#FACC15] glow-text-yellow">Gear</span>
              </span>
              <span className="text-[8px] font-mono text-[#FACC15] uppercase tracking-widest leading-none mt-1">PARTS CATALOG</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-md border border-slate-800 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4 text-[#FACC15]" />
              <span>Back to Home</span>
            </Link>

            <a
              href="viber://chat?number=%2B639285066385"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FACC15] hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-md shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all uppercase tracking-widest"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Request Custom Quote</span>
            </a>
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
                Live searchable inventory for Isuzu, Hino, Fuso, Sinotruk Howo & Shacman replacement components with direct online retail store pricing.
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
                placeholder="Search Part Name, Category, or Vehicle Fitment..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium placeholder-slate-500 focus:outline-none focus:border-[#FACC15] text-sm font-mono"
              />
              <Search className="w-5 h-5 text-[#FACC15] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-[#FACC15] font-mono font-bold text-xs focus:outline-none focus:border-[#FACC15]"
              >
                {categories.map(c => (
                  <option key={c} value={c}>Category: {c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedFitment}
                onChange={(e) => { setSelectedFitment(e.target.value); setCurrentPage(1); }}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sky-400 font-mono font-bold text-xs focus:outline-none focus:border-[#FACC15]"
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
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedFitment('ALL'); setCurrentPage(1); }}
              className="text-xs font-mono text-[#FACC15] hover:underline uppercase cursor-pointer"
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
              Showing <span className="text-[#FACC15] font-bold">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white font-bold">{totalItems}</span> Store Parts (30 items per page)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-lg text-white font-bold transition-colors cursor-pointer"
              >
                ◄ PREV
              </button>

              <span className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[#FACC15] font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-lg text-white font-bold transition-colors cursor-pointer"
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
