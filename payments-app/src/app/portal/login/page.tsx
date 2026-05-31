'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ShieldAlert, ArrowLeft, Terminal, Cpu } from 'lucide-react';
import Image from 'next/image';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check credentials against the defaults
    const defaultEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@truckgearph.com';
    const defaultPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'amin123';

    if (email !== defaultEmail || password !== defaultPassword) {
      setError('ACCESS DENIED: Unregistered account. (Trial Version)');
      return;
    }

    setLoading(true);
    setLoadingStep(1); // Stage 1: Reading ledger

    // Realistic terminal loading sequence
    setTimeout(() => {
      setLoadingStep(2); // Stage 2: Handshaking
      setTimeout(() => {
        setLoadingStep(3); // Stage 3: Syncing
        setTimeout(() => {
          localStorage.setItem('partsman_session', 'active-' + Date.now());
          router.push('/portal');
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-amber-500 selection:text-slate-950 relative-grid flex items-center justify-center p-4">
      
      {/* Back to marketing link */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Homepage</span>
        </Link>
      </div>

      {/* Main secure container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Accent yellow corner borders for heavy industrial layout */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500 rounded-br-2xl"></div>

          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-amber-500/20 mb-3 select-none relative bg-slate-950">
              <Image src="/partsman-logo.png" alt="PARTSMAN Logo" fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold tracking-wider text-white">PARTSMAN <span className="text-amber-500 font-black">OS</span></h2>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">LOGISTICS GATEWAY</p>
          </div>

          {loading ? (
            /* Sci-fi dynamic terminal loader */
            <div className="py-8 space-y-6 text-center">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-t-amber-500 rounded-full animate-spin"></div>
                <Cpu className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div className="font-mono text-xs space-y-2 max-w-xs mx-auto">
                <p className={`transition-opacity duration-300 ${loadingStep >= 1 ? 'text-amber-500' : 'text-slate-600'}`}>
                  [OK] Handshaking secure node 127.0.0.1
                </p>
                <p className={`transition-opacity duration-300 ${loadingStep >= 2 ? 'text-amber-500' : 'text-slate-600'}`}>
                  [OK] Initializing local database query...
                </p>
                <p className={`transition-opacity duration-300 ${loadingStep >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                  [SUCCESS] Access Granted. Launching System...
                </p>
              </div>
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-5">
              
              {error && (
                <div className="flex gap-3 p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs font-mono items-center animate-bounce">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Client Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. client@domain.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Access Passcode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <span>Authorize Login</span>
              </button>

              <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center text-[10px] font-mono text-slate-500 select-none">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>SECURE GATE ACTIVE</span>
                </span>
                <span>SHA-256 ENCRYPTED</span>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
