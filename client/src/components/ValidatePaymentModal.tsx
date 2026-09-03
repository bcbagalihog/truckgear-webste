import { useState, useEffect } from "react";
import { PendingPayment } from "./NotificationCenter";
import { CheckCircle, AlertTriangle, X, FileText, Image as ImageIcon, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PosInvoice {
  invoiceNumber: string;
  registeredName: string;
  totalAmount_Due: number;
  status: string;
  payment_method?: string;
  po_document_url?: string;
  items?: Array<{ description: string; qty: number; price: number }>;
}

interface ValidatePaymentModalProps {
  payment: PendingPayment;
  onClose: () => void;
  onApproved: () => void;
}

export function ValidatePaymentModal({ payment, onClose, onApproved }: ValidatePaymentModalProps) {
  const [posInvoice, setPosInvoice] = useState<PosInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [approving, setApproving] = useState(false);
  const [uploadingPo, setUploadingPo] = useState(false);
  const [poDocUrl, setPoDocUrl] = useState<string | null>(payment.po_document_url || null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPosInvoice() {
      try {
        const res = await fetch(`/api/pos/vault-invoices/${payment.invoice_number}`);
        if (res.ok) {
          const data = await res.json();
          setPosInvoice(data);
          if (data.po_document_url) {
            setPoDocUrl(data.po_document_url);
          }
        }
      } catch (err) {
        console.error("Failed to load POS invoice details:", err);
      } finally {
        setLoadingInvoice(false);
      }
    }
    fetchPosInvoice();
  }, [payment.invoice_number]);

  const handlePoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPo(true);

    const formData = new FormData();
    formData.append("po_document", file);
    formData.append("invoiceNumber", payment.invoice_number);

    try {
      const res = await fetch("/api/invoices/upload-po", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPoDocUrl(data.poDocumentUrl);
        toast({
          title: "📄 P.O. Document Attached!",
          description: `P.O. file attached to Invoice #${payment.invoice_number}.`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "Could not attach P.O. document.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Upload Error",
        description: "Network error while uploading P.O.",
        variant: "destructive",
      });
    } finally {
      setUploadingPo(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "Staff Admin" }),
      });

      if (res.ok) {
        toast({
          title: "⚡ Payment Approved & POS Updated!",
          description: `Invoice #${payment.invoice_number} is now set to PAID in truckgear-os vault.`,
        });
        onApproved();
        onClose();
      } else {
        const err = await res.json();
        toast({
          title: "Approval Error",
          description: err.message || "Failed to approve payment",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to server backend",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const amountMatch = posInvoice
    ? Math.abs(Number(payment.amount) - Number(posInvoice.totalAmount_Due)) < 1.00
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 font-mono text-xs">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Verify Client Payment: Invoice #{payment.invoice_number}
              </h2>
              <p className="text-xs text-slate-400">
                Ref ID: {payment.reference_number} • Method: {payment.payment_method}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-950 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side-by-Side Comparison Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 flex-1 overflow-y-auto pr-1">
          
          {/* Left Panel: Client Submission */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <CreditCard className="h-4 w-4 text-yellow-400" />
              Client Submitted Payment Log
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice #:</span>
                <span className="font-bold text-white">{payment.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-black text-yellow-400 text-sm">
                  ₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode:</span>
                <span className="font-bold text-white">{payment.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference ID:</span>
                <span className="font-bold text-white">{payment.reference_number}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Submission Time:</span>
                <span className="text-slate-400">
                  {new Date(payment.payment_date).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Proof Screenshot */}
            <div>
              <p className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-yellow-400" /> GCash / Bank Proof Screenshot:
              </p>
              {payment.proof_image_url ? (
                <div className="relative h-48 w-full rounded-xl border border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                  <img
                    src={payment.proof_image_url}
                    alt="Proof screenshot"
                    className="max-h-full max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => window.open(payment.proof_image_url, "_blank")}
                  />
                </div>
              ) : (
                <div className="h-28 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500 italic bg-slate-950/50">
                  No proof photo attached by client.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Matching POS Vault Invoice & P.O. Tool */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="h-4 w-4 text-blue-400" />
              Matching POS Vault Invoice & P.O. Tool
            </h3>

            {loadingInvoice ? (
              <div className="h-48 flex items-center justify-center text-yellow-400 font-mono text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                Loading POS Vault record...
              </div>
            ) : posInvoice ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Name:</span>
                  <span className="font-bold text-white">{posInvoice.registeredName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Amount Due:</span>
                  <span className="font-black text-blue-400 text-sm">
                    ₱{Number(posInvoice.totalAmount_Due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current POS Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    posInvoice.status === "PAID" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                  }`}>
                    {posInvoice.status}
                  </span>
                </div>

                {posInvoice.items && posInvoice.items.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-300 mb-1">Invoice Items:</p>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-xs border border-slate-800 rounded-lg p-2 bg-slate-900">
                      {posInvoice.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-400">
                          <span>{item.description} (x{item.qty})</span>
                          <span className="text-slate-200">₱{Number(item.price * item.qty).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/50 text-red-400 text-xs">
                ⚠️ POS Invoice #{payment.invoice_number} not found in POS vault.
              </div>
            )}

            {/* Staff P.O. Attachment Linker Tool */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>📎 Staff P.O. Document Attachment:</span>
                {poDocUrl && <span className="text-emerald-400 text-[10px]">✓ P.O. Attached</span>}
              </p>

              {poDocUrl ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-400">
                  <a href={poDocUrl} target="_blank" rel="noreferrer" className="underline font-bold text-xs">
                    View Attached P.O. Document
                  </a>
                  <label className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-bold cursor-pointer">
                    Replace
                    <input type="file" onChange={handlePoUpload} className="hidden" accept="image/*,.pdf" />
                  </label>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-800 hover:border-yellow-400 rounded-xl bg-slate-950 text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer text-xs font-bold">
                  {uploadingPo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  <span>Attach P.O. Document (PDF / Photo) to Invoice #{payment.invoice_number}</span>
                  <input type="file" onChange={handlePoUpload} className="hidden" accept="image/*,.pdf" />
                </label>
              )}
            </div>

            {/* Match Status Banner */}
            <div className="pt-1">
              {amountMatch ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Exact Amount Match: Client payment matches POS invoice.</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
                  <span>Amount Check: Confirm total due before approving.</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-800 hover:bg-slate-950 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-yellow-400/20 flex items-center gap-2 cursor-pointer"
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating POS Vault...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-slate-950" />
                Approve & Set POS Invoice to PAID
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

function CreditCard(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  );
}
