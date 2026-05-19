'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AccountingPage() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';
        fetch(`${apiUrl}/api/accounting/summary`)
            .then(res => res.json())
            .then(data => {
                setSummary(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-yellow-500 font-mono">
            [ LOADING EXPENDITURE KERNEL... ]
        </div>
    );

    return (
        <div className="min-h-screen p-8 font-sans" style={{ backgroundColor: '#0A0C10' }}>
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-12 p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E4FD8] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-xl bg-[#1E4FD8]/20 flex items-center justify-center border border-[#1E4FD8]/50 shadow-[0_0_20px_rgba(30,79,216,0.3)]">
                            <span className="text-xl font-black text-[#1E4FD8]">📉</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Expenditure Control</h1>
                            <p className="text-[#94A3B8] font-mono text-sm mt-1">Supplier Expenditure & Procurement Log // Balintawak HQ</p>
                        </div>
                    </div>
                    <Link href="/" className="text-[#94A3B8] hover:text-white font-medium px-4 transition relative z-10">
                        ← System Core
                    </Link>
                </header>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: 'Daily Spend', value: summary.daily, color: 'border-[#1E4FD8]' },
                        { label: 'Weekly Spend', value: summary.weekly, color: 'border-[#F59E0B]' },
                        { label: 'Monthly Spend', value: summary.monthly, color: 'border-emerald-500' }
                    ].map((card, i) => (
                        <div key={i} className={`p-8 rounded-2xl border-l-4 ${card.color} border-y border-r border-slate-800 shadow-xl relative overflow-hidden`}
                             style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-[#94A3B8] text-xs font-mono uppercase tracking-widest">{card.label}</p>
                            <p className="text-4xl font-black mt-3 text-white tracking-tight">
                                ₱{card.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Recent Transactions */}
                <div className="rounded-2xl border border-slate-800 shadow-xl overflow-hidden"
                     style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="p-6 border-b border-slate-800" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                            <span className="text-[#1E4FD8]">⚡</span> Procurement History
                        </h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b border-slate-800" style={{ background: 'rgba(255,255,255,0.01)' }}>
                            <tr>
                                <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Invoice / Quote ID</th>
                                <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Order Date</th>
                                <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Payment Method</th>
                                <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Spend Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {summary.recent.map((tx: any, i: number) => (
                                <tr key={i} className="hover:bg-white/5 transition duration-150">
                                    <td className="p-4 font-mono text-[#1E4FD8]">{tx.quote_id || 'N/A'}</td>
                                    <td className="p-4 text-[#94A3B8] text-sm">
                                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded border border-slate-700 uppercase">
                                            {tx.payment_method || 'Direct Wire'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-black text-white text-lg">
                                        ₱{tx.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {(!summary.recent || summary.recent.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500 font-mono">
                                        NO PROCUREMENT TRANSACTIONS RECORDED YET.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
