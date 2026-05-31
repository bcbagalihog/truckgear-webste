"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, Trash2, UploadCloud, CheckCircle, File } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function QuotePortal() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    message: ""
  });

  const [items, setItems] = useState([{ partName: "", quantity: 1 }]);
  const [file, setFile] = useState<File | null>(null);

  const handleAddItem = () => setItems([...items, { partName: "", quantity: 1 }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: "partName" | "quantity", value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_TRUCKGEAR_API_URL || "http://127.0.0.1:3002";
      
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("contact", formData.contact);
      payload.append("message", formData.message);
      payload.append("items", JSON.stringify(items));
      if (file) {
        payload.append("file", file);
      }

      const response = await fetch(`${apiUrl}/api/web-quotes`, {
        method: "POST",
        body: payload
      });

      if (!response.ok) throw new Error("Failed to submit quote request. Please try again or use Viber.");

      router.push("/request-quote/thank-you");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-slate-950 pb-20">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="relative w-40 h-12">
            <Image src="/truckgear-typo-logo.png" alt="TruckGear" fill className="object-contain object-left" />
          </Link>
          <Link href="/" className="text-sm font-mono text-slate-400 hover:text-amber-400">← Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
            Request a Quote
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Build your parts list below or upload your own Excel, Word, or PDF document. Our team will get back to you with pricing and availability.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl">
          
          {/* Contact Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Company / Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="e.g. Acme Trucking" />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Contact Info *</label>
              <input required type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Email or Phone Number" />
            </div>
          </div>

          <div className="h-px bg-slate-800 w-full mb-10"></div>

          {/* Items List */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold uppercase tracking-wider">Parts Required</h3>
              <button type="button" onClick={handleAddItem} className="text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input type="text" required value={item.partName} onChange={e => updateItem(index, "partName", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" placeholder={`Item ${index + 1} Name or Part Number`} />
                  </div>
                  <div className="w-24 shrink-0">
                    <input type="number" required min="1" value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-center" />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)} className="shrink-0 p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-0.5">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Upload OR Note */}
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Additional Notes</label>
              <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none h-32" placeholder="Specify any brands, truck models, or special requests..."></textarea>
            </div>
            
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Attach File (Optional)</label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950 rounded-xl h-32 flex flex-col items-center justify-center transition-colors group">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                
                {file ? (
                  <div className="text-center text-amber-500 z-0">
                    <File className="w-8 h-8 mx-auto mb-2 opacity-80" />
                    <span className="text-sm font-medium truncate max-w-[200px] block px-4">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 group-hover:text-amber-400 transition-colors z-0">
                    <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <span className="text-sm font-medium">Upload List or Image</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-2 text-center">PDF, Excel, Word, JPG, PNG</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={status === "loading"}
            className="w-full py-4 px-6 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-xl shadow-amber-500/20 disabled:opacity-50"
          >
            {status === "loading" ? (
              <div className="w-6 h-6 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Send className="w-5 h-5" /> Submit Quote Request</>
            )}
          </button>
          
        </form>
      </main>
    </div>
  );
}
