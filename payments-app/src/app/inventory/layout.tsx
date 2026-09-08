'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function PartsOperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/inventory', icon: '📊' },
    { name: 'Inventory Parts', path: '/inventory/parts', icon: '⚙️' },
    { name: 'Fleet', path: '/inventory/fleet', icon: '🚛' },
    { name: 'Maintenance Request', path: '/inventory/maintenance', icon: '🔧' },
    { name: 'Reliability Parts', path: '/inventory/reliability', icon: '🧠' },
    { name: 'Directory', path: '/inventory/directory', icon: '📁' },
  ];

  return (
    <div className="flex min-h-screen bg-[#06080C] text-white font-sans selection:bg-[#1E4FD8] selection:text-white">
      
      {/* Premium Vertical Sidebar Navigation */}
      <aside className="w-80 border-r border-slate-900 flex flex-col justify-between p-8 relative shrink-0"
             style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
        
        {/* Glow Element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>

        <div className="space-y-12 relative z-10">
          
          {/* Brand Logo & Meta */}
          <div className="flex items-center gap-4 border-b border-slate-900 pb-8">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(30,79,216,0.3)]">
              <Image src="/logo.png" alt="PARTSMAN Logo" width={48} height={48} className="object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-widest uppercase">PARTSMAN</h2>
              <p className="text-[10px] text-[#1E4FD8] font-mono font-bold tracking-widest uppercase">PARTS OPERATIONS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pl-4 mb-4">Operations Dashboard</p>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 group relative overflow-hidden ${
                    isActive 
                      ? 'text-white bg-[#1E4FD8]/20 border border-[#1E4FD8]/40 shadow-[0_0_15px_rgba(30,79,216,0.15)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Subtle hover glow strip */}
                  <span className={`absolute left-0 top-0 bottom-0 w-1 bg-[#1E4FD8] transition-transform duration-300 ${
                    isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                  }`}></span>
                  
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="space-y-4 relative z-10">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full p-3 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl font-bold transition text-xs uppercase tracking-wider bg-white/2 animate-none"
          >
            ← System Core Home
          </Link>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 border-t border-slate-900 pt-6">
            <span>KERN: ONLINE</span>
            <span>v2.1</span>
          </div>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className="flex-1 p-12 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1E4FD8] rounded-full blur-[180px] opacity-10 pointer-events-none"></div>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}
