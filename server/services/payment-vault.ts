import fs from "fs";
import path from "path";

const PAYMENTS_FILE = path.resolve(process.cwd(), "./data/payments.json");

export interface PaymentRecord {
  id: number;
  invoice_number: string;
  customer_name?: string;
  payment_method: string;
  reference_number: string;
  amount: number;
  status: string;
  payment_date: string;
  proof_image_url?: string;
  receipt_image_url?: string;
  po_document_url?: string;
}

export function getPayments(): PaymentRecord[] {
  if (!fs.existsSync(PAYMENTS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(PAYMENTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[PAYMENT_VAULT] Error reading payments.json:", e);
    return [];
  }
}

export function savePayments(payments: PaymentRecord[]) {
  const dir = path.dirname(PAYMENTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${PAYMENTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payments, null, 2), "utf-8");
  fs.renameSync(tmp, PAYMENTS_FILE);
}

export function addPayment(payment: Omit<PaymentRecord, "id">): PaymentRecord {
  const payments = getPayments();
  const nextId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
  const newRec: PaymentRecord = {
    ...payment,
    id: nextId,
  };
  payments.unshift(newRec);
  savePayments(payments);
  return newRec;
}

export function updatePaymentStatus(id: number, status: string): PaymentRecord | null {
  const payments = getPayments();
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) return null;
  payments[idx].status = status;
  savePayments(payments);
  return payments[idx];
}

export function updatePaymentPoDocument(invoiceNumber: string, poUrl: string): boolean {
  const payments = getPayments();
  const normalized = invoiceNumber.trim().replace(/^INV-/i, "");
  let updated = false;
  for (const p of payments) {
    if (p.invoice_number.trim().replace(/^INV-/i, "").toLowerCase() === normalized.toLowerCase()) {
      p.po_document_url = poUrl;
      updated = true;
    }
  }
  if (updated) {
    savePayments(payments);
  }
  return updated;
}
