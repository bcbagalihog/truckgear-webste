'use client';

import { useState, useEffect } from 'react';

interface RFQItem {
  id: string;
  description: string;
  partNumber: string;
  make: string;
  qty: number;
}

export default function RFQPage() {
  const [items, setItems] = useState<RFQItem[]>([]);
  const [form, setForm] = useState({ description: '', partNumber: '', make: '', qty: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const partNumber = params.get('partNumber');
      const description = params.get('description');
      if (partNumber || description) {
        setForm({
          description: description || '',
          partNumber: partNumber || '',
          make: '',
          qty: 1
        });
      }
    }
  }, []);

  // Client Details (Placeholders for User to Edit)
  const clientInfo = {
    company: "Client Company Name",
    address: "123 Trucker Lane, Manila, Philippines",
    contact: "+63 912 345 6789",
    purchaser: "John Doe"
  };

  const addItem = () => {
    if (!form.description || !form.partNumber) return;
    
    if (editingId) {
        setItems(items.map(item => item.id === editingId ? { ...form, id: editingId } : item));
        setEditingId(null);
    } else {
        setItems([...items, { ...form, id: Date.now().toString() }]);
    }
    setForm({ description: '', partNumber: '', make: '', qty: 1 });
  };

  const editItem = (item: RFQItem) => {
    setForm({ description: item.description, partNumber: item.partNumber, make: item.make, qty: item.qty });
    setEditingId(item.id);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
      for (const item of items) {
        await fetch(`${apiUrl}/api/inventory/rfq/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_description: item.description,
            part_number: item.partNumber,
            make: item.make,
            qty: item.qty
          }),
        });
      }
      alert('RFQ Saved Successfully!');
      setItems([]);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] p-12 font-sans">
      {/* Navigation Control Bar */}
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center no-print">
        <button 
          onClick={() => window.location.href = '/inventory'}
          className="text-[#94A3B8] hover:text-white font-mono text-sm font-bold flex items-center gap-2 transition"
        >
          ← Back to Parts Inventory
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="text-[#94A3B8] hover:text-white font-mono text-sm font-bold flex items-center gap-2 transition"
        >
          ← System Core Home
        </button>
      </div>

      <div className="max-w-5xl mx-auto bg-white border border-slate-200 p-12 rounded-lg shadow-2xl printable-rfq">
        
        {/* Professional Client Header Block */}
        <div className="flex justify-between border-b-4 border-slate-900 pb-10 mb-12 items-start">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{clientInfo.company}</h1>
              <p className="text-slate-500 font-bold text-sm tracking-tight">{clientInfo.address}</p>
              <p className="text-slate-500 font-bold text-sm">Contact: {clientInfo.contact}</p>
              <p className="text-slate-900 font-black text-sm mt-3 uppercase tracking-widest">Purchaser: {clientInfo.purchaser}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-400">REFERENCE:</div>
              <div className="text-3xl font-black text-slate-900 leading-none">RFQ-{new Date().getFullYear()}-0001</div>
              <div className="text-sm text-slate-500 mt-2 font-bold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
        </div>

        {/* Input Form (Hidden on Print) */}
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 mb-12 no-print">
          <h2 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">Add / Edit Item Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-2 md:col-span-1">
                <input 
                    placeholder="Description" 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900" 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})}
                />
            </div>
            <input 
              placeholder="Part #" 
              className="p-3 border border-slate-300 rounded-lg"
              value={form.partNumber} 
              onChange={e => setForm({...form, partNumber: e.target.value})}
            />
            <input 
              placeholder="Make (Truck Type/Mfr)" 
              className="p-3 border border-slate-300 rounded-lg"
              value={form.make} 
              onChange={e => setForm({...form, make: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Qty"
              className="p-3 border border-slate-300 rounded-lg" 
              value={form.qty} 
              onChange={e => setForm({...form, qty: parseInt(e.target.value)})}
            />
            <button 
              onClick={addItem} 
              className={`font-black rounded-lg transition uppercase text-xs p-3 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'} text-white`}
            >
              {editingId ? 'Update' : 'Add Item'}
            </button>
          </div>
        </div>

        {/* Updated RFQ Table */}
        <table className="w-full text-left border-collapse mb-16">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Item Description</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Part Number</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Make</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                <td className="p-6 font-bold text-slate-900">{item.description}</td>
                <td className="p-6 font-mono text-slate-500 text-sm italic">{item.partNumber}</td>
                <td className="p-6 font-bold text-slate-900 uppercase text-xs">{item.make}</td>
                <td className="p-6 text-center font-black text-slate-900">{item.qty}</td>
                <td className="p-6 text-right no-print whitespace-nowrap">
                   <button onClick={() => editItem(item)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-4">EDIT</button>
                   <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest">Your RFQ list is empty</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Action Footer */}
        <div className="flex justify-between items-end border-t-2 border-slate-900 pt-12 mt-12">
            <div className="text-slate-400 text-[10px] italic space-y-1">
                <p>Note: This is an official Request for Quotation generated through PARTSMAN.</p>
                <p>Terms: All prices quoted should be valid for 15 days.</p>
            </div>
            <div className="flex gap-4 no-print">
              <button 
                onClick={handleSave} 
                disabled={saving || items.length === 0}
                className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:bg-slate-300"
              >
                {saving ? 'Saving...' : 'SAVE RFQ'}
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black hover:bg-slate-800 transition"
              >
                EXPORT PDF
              </button>
            </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .printable-rfq { 
            border: none !important; 
            box-shadow: none !important; 
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          body { background: white !important; }
          thead { background-color: #000 !important; -webkit-print-color-adjust: exact; }
          thead th { color: #fff !important; }
        }
      `}</style>
    </div>
  );
}
