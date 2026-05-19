'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Payment {
  id: number;
  invoice_number: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
  payment_date: string;
}

export default function PaymentCenterPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8055';

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/payments/list`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load payments ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!invoiceNumber.trim()) return setError('Please enter a valid Invoice or Sales Order number.');
    if (!amount || parseFloat(amount) <= 0) return setError('Please specify a positive payment amount.');
    if (!referenceNumber.trim()) return setError('Please provide the transaction Reference / Receipt ID.');

    setSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invoiceNumber.trim(),
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim()
        })
      });

      if (res.ok) {
        setSuccess(`Payment for ${invoiceNumber} logged successfully under secure ledger protocol.`);
        setInvoiceNumber('');
        setAmount('');
        setReferenceNumber('');
        // Refresh list
        fetchPayments();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to post payment. Please verify local DB status.');
      }
    } catch (err) {
      setError('Connection refused. Is the uvicorn backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]" style={{ backgroundColor: '#0A0C10' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-end p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <span className="text-xl font-black text-[#F59E0B]">💳</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Payment Center</h1>
              <p className="text-[#94A3B8] font-mono text-sm mt-1">Transaction Archiver & Ledger Ledger Sync</p>
            </div>
          </div>
          <Link href="/" className="text-[#94A3B8] hover:text-white font-medium px-4 transition relative z-10">
            ← System Core
          </Link>
        </header>

        {/* Dynamic Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Post Transaction Form */}
          <div className="lg:col-span-1 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-4">
              <span className="text-[#F59E0B]">📥</span> Log Payment
            </h2>

            {error && (
              <div className="bg-red-950/40 border border-red-900/60 text-red-400 p-4 rounded-lg text-xs font-mono">
                [!] {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 p-4 rounded-lg text-xs font-mono">
                [✓] {success}
              </div>
            )}

            <form onSubmit={handlePostPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-2">Invoice / Sales Order #</label>
                <input
                  type="text"
                  placeholder="e.g. INV-10029"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10] text-white placeholder-slate-600 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-2">Amount Paid (₱)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10] text-white placeholder-slate-600 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-2">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10] text-white focus:outline-none focus:border-[#F59E0B] transition font-mono cursor-pointer"
                >
                  <option value="GCash">GCash Transfer</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-2">Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. 500293189"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-800 bg-[#0A0C10] text-white placeholder-slate-600 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full text-black p-4 rounded-lg font-black transition-all hover:scale-[1.02] uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#F59E0B' }}
              >
                {submitting ? 'Archiving Payment...' : 'Securely Post Payment'}
              </button>
            </form>
          </div>

          {/* Secure Audit Trail */}
          <div className="lg:col-span-2 p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-4 mb-6">
              <span className="text-[#1E4FD8]">⚡</span> Secure Payment Ledger
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-800" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <tr>
                    <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Invoice</th>
                    <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Method</th>
                    <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Reference ID</th>
                    <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-[#F59E0B] font-mono animate-pulse">
                        [ SYNCHRONIZING SECURE LEDGER PROTOCOL... ]
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-600 font-mono">
                        NO TRANSACTION HISTORY DETECTED.
                      </td>
                    </tr>
                  ) : (
                    payments.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition duration-150">
                        <td className="p-4 font-mono font-bold text-white">{tx.invoice_number}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono border ${
                            tx.payment_method === 'GCash' 
                              ? 'bg-blue-950/40 text-blue-400 border-blue-900/50' 
                              : 'bg-yellow-950/40 text-yellow-500 border-yellow-900/50'
                          }`}>
                            {tx.payment_method}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[#94A3B8] text-sm">{tx.reference_number}</td>
                        <td className="p-4 text-[#94A3B8] text-xs">
                          {new Date(tx.payment_date).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-black text-[#F59E0B] text-base">
                          ₱{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
