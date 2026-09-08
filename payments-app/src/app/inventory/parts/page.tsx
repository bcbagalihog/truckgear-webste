'use client';

import { useState, useEffect, useCallback } from 'react';

interface Part {
  id?: number;
  name: string;
  part_number: string;
  description: string;
  quantity: number;
  reorder_level: number;
  supplier?: string;
}

export default function InventoryPartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Form submission state
  const [newPart, setNewPart] = useState({
    sku: '',
    name: '',
    location: '',
    brand: 'TruckGear',
    quantity: 0,
    reorder_level: 5
  });

  // AI Invoice Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const fetchParts = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
      const res = await fetch(`${apiUrl}/api/inventory/search?q=${query}`);
      const data = await res.json();
      setParts(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Save new part to backend SQL partsman_db
  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.sku || !newPart.name) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
      const res = await fetch(`${apiUrl}/api/inventory/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newPart.sku,
          name: newPart.name,
          location: newPart.location || 'Warehouse',
          brand: newPart.brand || 'TruckGear',
          quantity: Number(newPart.quantity),
          reorder_level: Number(newPart.reorder_level)
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewPart({ sku: '', name: '', location: '', brand: 'TruckGear', quantity: 0, reorder_level: 5 });
        fetchParts();
        alert('Part successfully created and stored in public.parts!');
      } else {
        alert('Failed to save part. Check terminal logs.');
      }
    } catch (err) {
      console.error(err);
      alert('Save failed.');
    }
  };

  // Simulate AI OCR invoice scanning
  const startInvoiceScan = () => {
    setIsScanning(true);
    setScannedData(null);
    setScanStep(1);

    // Dynamic scanning sequence animations
    setTimeout(() => setScanStep(2), 1200);
    setTimeout(() => setScanStep(3), 2400);

    setTimeout(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
        const res = await fetch(`${apiUrl}/api/inventory/scan-invoice`, { method: 'POST' });
        const data = await res.json();
        setScannedData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsScanning(false);
        setScanStep(0);
      }
    }, 3500);
  };

  // Batch import parsed OCR items into public.parts
  const importScannedItems = async () => {
    if (!scannedData || !scannedData.items) return;
    setIsImporting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
      
      // Post all items sequentially to backend
      for (const item of scannedData.items) {
        await fetch(`${apiUrl}/api/inventory/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: item.sku,
            name: item.name,
            location: item.location,
            brand: item.brand,
            quantity: item.qty,
            reorder_level: item.reorder_level
          })
        });
      }

      setIsImporting(false);
      setShowScannerModal(false);
      setScannedData(null);
      fetchParts();
      alert(`Successfully imported ${scannedData.items.length} parts from OCR scanned invoice!`);
    } catch (err) {
      console.error(err);
      alert('Import failed.');
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Warehouse Inventory</h1>
          <p className="text-slate-400 font-mono text-sm mt-1">Monitor Available Stock, Locations, and Safety Thresholds</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#1E4FD8] text-white px-5 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-[0_0_15px_rgba(30,79,216,0.4)] flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            + Add New Part
          </button>
          <button 
            onClick={() => setShowScannerModal(true)}
            className="bg-transparent border border-[#F59E0B] text-[#F59E0B] px-5 py-3 rounded-lg font-bold hover:bg-[#F59E0B] hover:text-black transition flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            📸 AI Invoice Scanner
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-6 rounded-2xl border border-slate-900 shadow-xl"
           style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Query parts by name, SKU, or shelf location... (Full-text enabled)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value === '') fetchParts();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchParts(search);
            }}
            className="flex-1 p-4 rounded-lg border border-slate-800 bg-[#0A0C10]/80 text-white placeholder-slate-600 focus:outline-none focus:border-[#1E4FD8] focus:ring-1 focus:ring-[#1E4FD8] transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] text-sm"
          />
          <button
            onClick={() => fetchParts(search)}
            className="bg-transparent border border-[#1E4FD8] text-[#1E4FD8] px-8 py-4 rounded-lg font-bold hover:bg-[#1E4FD8] hover:text-white transition uppercase tracking-wider text-xs"
          >
            Search DB
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-slate-900 shadow-xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.01)' }}>
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-900" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Part Name</th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Part #</th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">In Stock</th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#1E4FD8] font-mono animate-pulse">Querying DB...</td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-mono">NO RECORDS MATCHING INQUIRY.</td></tr>
            ) : parts.map((part, index) => {
              const isCritical = part.quantity <= (part.reorder_level || 0);
              return (
                <tr key={index} className="hover:bg-white/[0.03] transition duration-150">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{part.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{part.description}</div>
                  </td>
                  <td className="px-6 py-4 text-[#1E4FD8] font-mono text-xs font-semibold">{part.part_number}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold font-mono ${isCritical ? 'text-[#F59E0B]' : 'text-emerald-400'}`}>
                      {part.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isCritical ? (
                      <span className="px-3 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-black rounded border border-[#F59E0B]/40 uppercase tracking-wider">
                        Critical
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/40 uppercase tracking-wider">
                        Optimal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-300 font-semibold">{part.supplier || 'Local Stock'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        window.location.href = `/inventory/rfq?partNumber=${encodeURIComponent(part.part_number)}&description=${encodeURIComponent(part.name)}`;
                      }}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-md hover:bg-[#F59E0B] hover:text-black hover:border-transparent transition uppercase tracking-wider"
                    >
                      Restock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add New Part Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">➕ Register New Part SKU</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white font-black">✕</button>
            </div>
            
            <form onSubmit={handleAddPart} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Part Number / SKU</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TG-AXLE-505"
                    value={newPart.sku}
                    onChange={(e) => setNewPart({...newPart, sku: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Part Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Heavy Duty Axle"
                    value={newPart.name}
                    onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Warehouse Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SHELF-A2"
                    value={newPart.location}
                    onChange={(e) => setNewPart({...newPart, location: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Supplier / Brand</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TruckGear, Monroe, Meritor"
                    value={newPart.brand}
                    onChange={(e) => setNewPart({...newPart, brand: e.target.value})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Initial Qty In Stock</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Reorder Level Threshold</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newPart.reorder_level}
                    onChange={(e) => setNewPart({...newPart, reorder_level: parseInt(e.target.value) || 5})}
                    className="w-full p-3 bg-black border border-slate-800 rounded text-white text-sm"
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full p-4 bg-[#1E4FD8] text-white font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(30,79,216,0.3)] mt-2"
              >
                Register & Commit Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI Invoice Scanner */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0A0C10] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <span>📸</span> PARTSMAN AI Invoice OCR Scanner
              </h3>
              <button 
                onClick={() => {
                  setShowScannerModal(false);
                  setScannedData(null);
                  setIsScanning(false);
                }} 
                className="text-slate-500 hover:text-white font-black"
              >
                ✕
              </button>
            </div>

            {/* Drop / Choice Panel */}
            {!isScanning && !scannedData && (
              <div 
                onClick={startInvoiceScan}
                className="border-2 border-dashed border-slate-800 hover:border-[#F59E0B] bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl p-12 text-center cursor-pointer transition duration-300 space-y-4"
              >
                <div className="text-5xl">📄</div>
                <div>
                  <p className="font-bold text-slate-200">Drag & drop supplier invoice PDF / Image here</p>
                  <p className="text-xs text-slate-500 mt-1">Supports Meritor, Monroe, Fuso, Isuzu supply receipts</p>
                </div>
                <button className="bg-slate-900 border border-slate-800 text-slate-300 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Select Invoice File
                </button>
              </div>
            )}

            {/* Scanning radar loading animations */}
            {isScanning && (
              <div className="p-12 text-center space-y-8 border border-slate-900 bg-white/[0.01] rounded-2xl relative overflow-hidden">
                {/* Horizontal scan line animation */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F59E0B] shadow-[0_0_15px_#F59E0B] animate-[bounce_3.5s_infinite]"></div>
                
                <div className="text-4xl animate-bounce">👁️</div>
                <div className="space-y-3 font-mono">
                  <div className="text-[#F59E0B] text-sm uppercase tracking-widest font-bold animate-pulse">
                    Scanning Document via Optical Radar...
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {scanStep === 1 && "[*] Locating Invoice borders and Supplier Metadata..."}
                    {scanStep === 2 && "[*] Extracting Tabular Part lists & quantities..."}
                    {scanStep === 3 && "[*] Matching SKU catalogs to Partsman Database..."}
                  </div>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#F59E0B] h-full rounded-full animate-[shimmer_3.5s_infinite]" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}

            {/* Scanned result dashboard */}
            {scannedData && (
              <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-400">
                  <div>Supplier: <span className="text-white block font-bold mt-0.5">{scannedData.vendor}</span></div>
                  <div>Invoice: <span className="text-white block font-bold mt-0.5">{scannedData.invoice_number}</span></div>
                  <div>Date: <span className="text-white block font-bold mt-0.5">{scannedData.scanned_date}</span></div>
                  <div>Total Spent: <span className="text-emerald-400 block font-bold mt-0.5">₱{scannedData.total_amount.toLocaleString()}</span></div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-1">Extracted Items Scrape</p>
                  <div className="border border-slate-900 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
                        <tr>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Part Name</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3">Shelf</th>
                          <th className="p-3">Brand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 bg-[#0A0C10] text-slate-300">
                        {scannedData.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 font-mono text-[#1E4FD8] font-bold">{item.sku}</td>
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-center font-bold text-emerald-400">{item.qty}</td>
                            <td className="p-3 font-mono">{item.location}</td>
                            <td className="p-3 font-mono">{item.brand}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={importScannedItems}
                    disabled={isImporting}
                    className="flex-1 p-4 bg-[#F59E0B] text-black font-black rounded-lg hover:bg-yellow-400 transition uppercase tracking-wider text-xs text-center shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    {isImporting ? 'Importing stock...' : '✓ Confirm & Import Scanned Stock'}
                  </button>
                  <button 
                    onClick={() => setScannedData(null)}
                    className="p-4 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs uppercase tracking-wider font-bold transition"
                  >
                    Re-scan
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
