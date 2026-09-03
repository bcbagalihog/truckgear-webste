import fs from "fs";
import path from "path";

// Candidate data directories for truckgear-os (Local fast paths first to prevent GVFS SFTP mount blocking)
const VAULT_DIRS = [
  path.resolve(process.cwd(), "../truckgear-os/data"),
  "/run/user/1000/gvfs/sftp:host=192.168.254.121,user=bab/home/bab/Documents/truckgear-os/data",
  "/home/bab/Documents/truckgear-os/data",
  path.resolve(process.cwd(), "./data"),
];

const VAULT_FILENAMES = ["invoices_bonifacio.json", "invoices_batangas.json"];

let cachedInvoices: PosInvoice[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5-second TTL cache for instant responses

export function invalidateInvoiceCache() {
  cachedInvoices = null;
  lastCacheTime = 0;
}

function resolveVaultDir(): string {
  for (const dirPath of VAULT_DIRS) {
    if (fs.existsSync(dirPath)) {
      for (const filename of VAULT_FILENAMES) {
        if (fs.existsSync(path.join(dirPath, filename))) {
          return dirPath;
        }
      }
    }
  }
  return VAULT_DIRS[0];
}

function resolveVaultPath(): string {
  const dir = resolveVaultDir();
  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return path.join(dir, "invoices.json");
}

export interface PosInvoiceItem {
  id?: string | number;
  description: string;
  qty: number;
  price: number;
  unit?: string;
}

export interface PosInvoice {
  invoiceNumber: string;
  registeredName: string;
  businessAddress?: string;
  tin?: string;
  totalAmount_Due: number;
  vat_amount?: number;
  vatable_sales?: number;
  payment_method?: string;
  status: string;
  date?: string;
  items?: PosInvoiceItem[];
  paymentRef?: string;
  paymentDate?: string;
  proof_image_url?: string;
  receipt_image_url?: string;
  po_document_url?: string;
  invoice_document_url?: string;
  [key: string]: any;
}

/**
 * Reads all invoices from all truckgear-os branch POS vaults (invoices_bonifacio.json, invoices_batangas.json, invoices.json)
 */
export function getPosInvoices(): PosInvoice[] {
  const now = Date.now();
  if (cachedInvoices && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedInvoices;
  }

  const dirPath = resolveVaultDir();
  const allInvoices: PosInvoice[] = [];
  const seenMap = new Map<string, PosInvoice>();

  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dirPath, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const list: PosInvoice[] = JSON.parse(raw);
        list.forEach((inv) => {
          if (!inv.invoiceNumber) return;
          const key = String(inv.invoiceNumber).trim().replace(/^INV-/i, "").toLowerCase();
          
          // Normalize doc properties
          const poDoc = inv.poDocumentUrl || inv.po_document_url;
          const invDoc = inv.invoiceDocumentUrl || inv.invoice_document_url;
          const normalizedInv = {
            ...inv,
            poDocumentUrl: poDoc,
            po_document_url: poDoc,
            invoiceDocumentUrl: invDoc,
            invoice_document_url: invDoc,
          };

          if (!seenMap.has(key)) {
            seenMap.set(key, normalizedInv);
          } else {
            const existing = seenMap.get(key)!;
            const existingIsPaid = String(existing.status || '').toUpperCase() === 'PAID';
            const newIsPaid = String(inv.status || '').toUpperCase() === 'PAID';
            const mergedPaid = existingIsPaid || newIsPaid;
            
            const mergedPoDoc = poDoc || existing.poDocumentUrl || existing.po_document_url;
            const mergedInvDoc = invDoc || existing.invoiceDocumentUrl || existing.invoice_document_url;
            const mergedProofDoc = inv.proof_image_url || existing.proof_image_url;

            const newDate = new Date(inv.date || 0).getTime();
            const oldDate = new Date(existing.date || 0).getTime();

            const baseRecord = newDate >= oldDate ? normalizedInv : existing;
            seenMap.set(key, {
              ...baseRecord,
              status: mergedPaid ? 'PAID' : baseRecord.status,
              poDocumentUrl: mergedPoDoc,
              po_document_url: mergedPoDoc,
              invoiceDocumentUrl: mergedInvDoc,
              invoice_document_url: mergedInvDoc,
              proof_image_url: mergedProofDoc,
            });
          }
        });
      } catch (err) {
        console.error(`[POS_VAULT] Error reading ${fullPath}:`, err);
      }
    }
  }

  // Also cross-reference billing_collections.json to mark invoices in paid billing statements as PAID
  const bcPath = path.join(dirPath, "billing_collections.json");
  if (fs.existsSync(bcPath)) {
    try {
      const raw = fs.readFileSync(bcPath, "utf-8");
      const bcList: any[] = JSON.parse(raw);
      const paidInvoiceIds = new Set<string>();
      bcList.forEach((bc) => {
        if (String(bc.status || '').toUpperCase() === 'PAID') {
          (bc.invoiceIds || []).forEach((id: any) => {
            paidInvoiceIds.add(String(id).trim().replace(/^INV-/i, "").toLowerCase());
          });
        }
      });

      paidInvoiceIds.forEach((key) => {
        if (seenMap.has(key)) {
          const inv = seenMap.get(key)!;
          seenMap.set(key, { ...inv, status: 'PAID' });
        }
      });
    } catch (err) {
      console.error(`[POS_VAULT] Error reading billing_collections.json:`, err);
    }
  }

  // Convert map values to array and sort by date descending (newest invoices first)
  const result = Array.from(seenMap.values()).sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();
    return timeB - timeA;
  });

  cachedInvoices = result;
  lastCacheTime = Date.now();
  return result;
}

/**
 * Finds a specific invoice by invoice number (e.g. "1671" or "INV-1671")
 */
export function getPosInvoiceByNumber(invoiceNumber: string): PosInvoice | null {
  const invoices = getPosInvoices();
  const normalizedSearch = invoiceNumber.trim().replace(/^INV-/i, "");
  
  return invoices.find((inv) => {
    const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
    return normalizedInv.toLowerCase() === normalizedSearch.toLowerCase();
  }) || null;
}

/**
 * Atomically updates a POS invoice status to PAID with payment details, creates a backup snapshot, and appends to audit log.
 */
export function updatePosInvoiceStatusPaid(params: {
  invoiceNumber: string;
  paymentMethod: string;
  paymentRef: string;
  proofImageUrl?: string;
  approvedBy?: string;
}): { success: boolean; invoice?: PosInvoice; error?: string } {
  const vaultPath = resolveVaultPath();
  if (!fs.existsSync(vaultPath)) {
    return { success: false, error: `Vault file missing at ${vaultPath}` };
  }

  try {
    const raw = fs.readFileSync(vaultPath, "utf-8");
    const invoices: PosInvoice[] = JSON.parse(raw);
    const normalizedSearch = params.invoiceNumber.trim().replace(/^INV-/i, "");

    const targetIdx = invoices.findIndex((inv) => {
      const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
      return normalizedInv.toLowerCase() === normalizedSearch.toLowerCase();
    });

    if (targetIdx === -1) {
      return { success: false, error: `Invoice #${params.invoiceNumber} not found in POS Vault` };
    }

    // 1. Generate Timestamped Safety Backup
    const vaultDir = path.dirname(vaultPath);
    const backupDir = path.join(vaultDir, "_backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `invoices_${timestamp}.json`);
    fs.writeFileSync(backupFile, raw, "utf-8");
    console.log(`[POS_VAULT] Safety backup created: ${backupFile}`);

    // 2. Mutate Target Invoice Record
    const originalInvoice = { ...invoices[targetIdx] };
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.split("T")[0];

    invoices[targetIdx] = {
      ...invoices[targetIdx],
      status: "PAID",
      payment_method: params.paymentMethod,
      paymentRef: params.paymentRef,
      paymentDate: nowDate,
      payment_date: nowIso,
      ...(params.proofImageUrl ? { proof_image_url: params.proofImageUrl } : {}),
    };

    // 3. Perform Atomic Write (.tmp -> fs.rename)
    const tmpPath = `${vaultPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(invoices, null, 2), "utf-8");
    fs.renameSync(tmpPath, vaultPath);
    console.log(`[POS_VAULT] Atomic write successful for Invoice #${invoices[targetIdx].invoiceNumber}`);

    // 4. Append Audit Log Entry
    const auditLogPath = path.join(vaultDir, "audit_logs.json");
    let auditLogs: any[] = [];
    if (fs.existsSync(auditLogPath)) {
      try {
        auditLogs = JSON.parse(fs.readFileSync(auditLogPath, "utf-8"));
      } catch (e) {
        auditLogs = [];
      }
    }
    auditLogs.push({
      timestamp: nowIso,
      action: "MARK_INVOICE_PAID",
      invoiceNumber: invoices[targetIdx].invoiceNumber,
      approvedBy: params.approvedBy || "Admin",
      paymentMethod: params.paymentMethod,
      paymentRef: params.paymentRef,
      proofImageUrl: params.proofImageUrl || null,
      before: {
        status: originalInvoice.status,
        payment_method: originalInvoice.payment_method,
      },
      after: {
        status: "PAID",
        payment_method: params.paymentMethod,
      },
    });
    fs.writeFileSync(auditLogPath, JSON.stringify(auditLogs, null, 2), "utf-8");

    return { success: true, invoice: invoices[targetIdx] };
  } catch (err: any) {
    console.error("[POS_VAULT] Error performing atomic update:", err);
    return { success: false, error: err.message || "Failed to update POS Vault" };
  }
}

/**
 * Reads all customers from truckgear-os vault (data/customers.json)
 */
export function getPosCustomers(): any[] {
  const vaultPath = resolveVaultPath();
  const vaultDir = path.dirname(vaultPath);
  const custPath = path.join(vaultDir, "customers.json");

  if (!fs.existsSync(custPath)) {
    console.warn(`[POS_VAULT] Customer vault file not found at ${custPath}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(custPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[POS_VAULT] Error reading customer vault at ${custPath}:`, err);
    return [];
  }
}

/**
 * Attaches a Purchase Order (P.O.) document to a POS invoice record.
 */
export function updatePosInvoicePoDocument(invoiceNumber: string, poDocumentUrl: string): { success: boolean; error?: string } {
  const dirPath = resolveVaultDir();
  let updatedAny = false;

  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dirPath, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const invoices: PosInvoice[] = JSON.parse(raw);
        const normalizedSearch = invoiceNumber.trim().replace(/^INV-/i, "");

        let fileModified = false;
        invoices.forEach((inv) => {
          const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
          if (normalizedInv.toLowerCase() === normalizedSearch.toLowerCase()) {
            inv.po_document_url = poDocumentUrl;
            inv.poDocumentUrl = poDocumentUrl;
            fileModified = true;
            updatedAny = true;
          }
        });

        if (fileModified) {
          const tmpPath = `${fullPath}.tmp`;
          fs.writeFileSync(tmpPath, JSON.stringify(invoices, null, 2), "utf-8");
          fs.renameSync(tmpPath, fullPath);
        }
      } catch (err) {
        console.error(`[POS_VAULT] Error updating P.O. doc in ${fullPath}:`, err);
      }
    }
  }

  if (updatedAny) return { success: true };
  return { success: false, error: `Invoice #${invoiceNumber} not found in any vault file` };
}

export function updatePosInvoiceSalesDoc(invoiceNumber: string, invoiceDocumentUrl: string): { success: boolean; error?: string } {
  const dirPath = resolveVaultDir();
  let updatedAny = false;

  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dirPath, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const invoices: PosInvoice[] = JSON.parse(raw);
        const normalizedSearch = invoiceNumber.trim().replace(/^INV-/i, "");

        let fileModified = false;
        invoices.forEach((inv) => {
          const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
          if (normalizedInv.toLowerCase() === normalizedSearch.toLowerCase()) {
            inv.invoice_document_url = invoiceDocumentUrl;
            inv.invoiceDocumentUrl = invoiceDocumentUrl;
            fileModified = true;
            updatedAny = true;
          }
        });

        if (fileModified) {
          const tmpPath = `${fullPath}.tmp`;
          fs.writeFileSync(tmpPath, JSON.stringify(invoices, null, 2), "utf-8");
          fs.renameSync(tmpPath, fullPath);
        }
      } catch (err) {
        console.error(`[POS_VAULT] Error updating Sales Invoice doc in ${fullPath}:`, err);
      }
    }
  }

  if (updatedAny) return { success: true };
  return { success: false, error: `Invoice #${invoiceNumber} not found in any vault file` };
}

export function deletePosInvoicePoDocument(invoiceNumber: string): { success: boolean; error?: string } {
  const dirPath = resolveVaultDir();
  let updatedAny = false;

  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dirPath, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const invoices: PosInvoice[] = JSON.parse(raw);
        const normalizedSearch = invoiceNumber.trim().replace(/^INV-/i, "");

        let fileModified = false;
        invoices.forEach((inv) => {
          const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
          if (normalizedInv.toLowerCase() === normalizedSearch.toLowerCase()) {
            delete inv.po_document_url;
            delete inv.poDocumentUrl;
            fileModified = true;
            updatedAny = true;
          }
        });

        if (fileModified) {
          const tmpPath = `${fullPath}.tmp`;
          fs.writeFileSync(tmpPath, JSON.stringify(invoices, null, 2), "utf-8");
          fs.renameSync(tmpPath, fullPath);
        }
      } catch (err) {
        console.error(`[POS_VAULT] Error deleting P.O. doc in ${fullPath}:`, err);
      }
    }
  }

  if (updatedAny) return { success: true };
  return { success: false, error: `Invoice #${invoiceNumber} not found in any vault file` };
}

export function deletePosInvoiceSalesDoc(invoiceNumber: string): { success: boolean; error?: string } {
  const dirPath = resolveVaultDir();
  let updatedAny = false;

  for (const filename of VAULT_FILENAMES) {
    const fullPath = path.join(dirPath, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const invoices: PosInvoice[] = JSON.parse(raw);
        const normalizedSearch = invoiceNumber.trim().replace(/^INV-/i, "");

        let fileModified = false;
        invoices.forEach((inv) => {
          const normalizedInv = String(inv.invoiceNumber || "").trim().replace(/^INV-/i, "");
          if (normalizedInv.toLowerCase() === normalizedSearch.toLowerCase()) {
            delete inv.invoice_document_url;
            delete inv.invoiceDocumentUrl;
            fileModified = true;
            updatedAny = true;
          }
        });

        if (fileModified) {
          const tmpPath = `${fullPath}.tmp`;
          fs.writeFileSync(tmpPath, JSON.stringify(invoices, null, 2), "utf-8");
          fs.renameSync(tmpPath, fullPath);
        }
      } catch (err) {
        console.error(`[POS_VAULT] Error deleting Sales Invoice doc in ${fullPath}:`, err);
      }
    }
  }

  if (updatedAny) return { success: true };
  return { success: false, error: `Invoice #${invoiceNumber} not found in any vault file` };
}
