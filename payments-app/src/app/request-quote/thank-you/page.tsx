import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-900 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-center">
          <Link href="/" className="relative w-40 h-12">
            <Image src="/truckgear-typo-logo.png" alt="TruckGear" fill className="object-contain" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 md:p-16 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              Request Received
            </h1>
            
            <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Thank you for choosing Truckgear! We have successfully received your quotation request. Our dedicated sales team is reviewing your list and will contact you shortly with the best pricing.
            </p>
            
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-6 rounded-xl font-bold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
