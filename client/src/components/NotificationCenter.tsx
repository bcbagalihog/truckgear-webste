import { useState, useEffect } from "react";
import { Bell, CreditCard, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export interface PendingPayment {
  id: number;
  invoice_number: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
  proof_image_url?: string;
  payment_date: string;
}

export function NotificationCenter() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchPending = async () => {
    try {
      const res = await fetch("/api/payments/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingPayments(data);
      }
    } catch (e) {
      // Ignore poll errors
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 6000); // 6s poll
    return () => clearInterval(interval);
  }, []);

  const pendingCount = pendingPayments.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
        title="Client Payment Notifications"
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center animate-pulse">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-sm tracking-tight">Client Payment Alerts</h3>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                {pendingCount} Pending
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {pendingPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No pending payments awaiting verification.
              </div>
            ) : (
              pendingPayments.map((pay) => (
                <div key={pay.id} className="p-4 hover:bg-muted/20 transition-colors space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Invoice #{pay.invoice_number}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Ref: {pay.reference_number} ({pay.payment_method})
                      </p>
                    </div>
                    <span className="text-xs font-black text-amber-500">
                      ₱{Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(pay.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link
                      href="/admin/payments"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>Verify & Set Paid</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-muted/40 border-t border-border text-center">
            <Link
              href="/admin/payments"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary hover:underline"
            >
              View Payment Verification Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
