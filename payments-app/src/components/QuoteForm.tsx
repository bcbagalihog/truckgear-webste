"use client";

import { useState } from "react";
import { Send, CheckCircle, MessageCircle, AlertCircle } from "lucide-react";

export default function QuoteForm() {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    partName: "",
    quantity: "1",
    message: ""
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      // Pointing to local backend via Cloudflare tunnel env variable (or fallback to localhost)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8055";
      
      const response = await fetch(`${apiUrl}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error("Failed to submit");
      
      setStatus("success");
      setFormData({ name: "", contact: "", partName: "", quantity: "1", message: "" });
      
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Viber Action Button */}
      <a 
        href="viber://chat?number=+639285066385" 
        className="w-full flex items-center justify-center gap-3 bg-[#7360f2] hover:bg-[#6251d1] text-white py-4 px-6 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-[#7360f2]/20"
      >
        <MessageCircle className="w-6 h-6" />
        Request Quote via Viber
      </a>

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-slate-800 flex-1"></div>
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">or use form</span>
        <div className="h-px bg-slate-800 flex-1"></div>
      </div>

      {/* Internal Quote Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Your Name / Company</label>
          <input 
            required 
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Juan Dela Cruz"
          />
        </div>
        
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Contact Number</label>
          <input 
            required 
            type="text" 
            value={formData.contact}
            onChange={e => setFormData({...formData, contact: e.target.value})}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="0912 345 6789"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Part Name / Number</label>
            <input 
              required 
              type="text" 
              value={formData.partName}
              onChange={e => setFormData({...formData, partName: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="e.g. 4D56 Cylinder Head"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Qty</label>
            <input 
              required 
              type="number" 
              min="1"
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Additional Notes</label>
          <textarea 
            rows={2}
            value={formData.message}
            onChange={e => setFormData({...formData, message: e.target.value})}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
            placeholder="Any specific brand or truck model?"
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={status === "loading" || status === "success"}
          className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
            status === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            status === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
            "bg-amber-500 hover:bg-amber-400 text-slate-950"
          }`}
        >
          {status === "idle" && <><Send className="w-4 h-4" /> Send Request to TruckGear</>}
          {status === "loading" && <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>}
          {status === "success" && <><CheckCircle className="w-4 h-4" /> Received!</>}
          {status === "error" && <><AlertCircle className="w-4 h-4" /> Error - Try Viber Instead</>}
        </button>
      </form>
    </div>
  );
}
