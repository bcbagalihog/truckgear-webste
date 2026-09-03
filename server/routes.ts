import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import express from "express";
import fs from "fs";
import Shopify from "shopify-api-node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cropCatalogItemImage } from "./services/catalogCropper";
import { db } from "./db";
import { eq, and, desc, ilike, inArray, gte, lte, sql } from "drizzle-orm";
import {
  salesInvoices, salesInvoiceItems, drawerSessions,
  accountsPayable, counterReceiptChecks, purchaseOrders,
  billingCollections, billingCollectionItems, billingCollectionPayments,
  products, inventoryTransactions, supplierCatalogItems,
} from "@shared/schema";


import {
  getPosInvoices,
  getPosInvoiceByNumber,
  updatePosInvoiceStatusPaid,
  getPosCustomers,
  updatePosInvoicePoDocument,
  updatePosInvoiceSalesDoc,
  deletePosInvoicePoDocument,
  deletePosInvoiceSalesDoc,
} from "./services/pos-vault-manager";
import {
  getPayments,
  addPayment,
  updatePaymentStatus,
  updatePaymentPoDocument,
} from "./services/payment-vault";

const uploadsDir = path.join(process.cwd(), "uploads");
const proofUploadsDir = path.join(uploadsDir, "payment_proofs");
const adminDocsDir = path.join(uploadsDir, "admin_docs");

[uploadsDir, proofUploadsDir, adminDocsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `product-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|pdf)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"));
    }
  },
});

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: proofUploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `proof-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const adminDocUpload = multer({
  storage: multer.diskStorage({
    destination: adminDocsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `doc-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS Middleware for tgphparts.com & Beelink Server API
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static(uploadsDir));
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // --- PAYMENT PROOF & ADMIN DOC UPLOAD ENDPOINTS ---
  app.post("/api/upload/payment-proof", proofUpload.single("proof"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No payment proof file uploaded" });
    }
    res.json({ imageUrl: `/uploads/payment_proofs/${req.file.filename}` });
  });

  app.post("/api/upload/admin-doc", adminDocUpload.single("document"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No admin document uploaded" });
    }
    res.json({ documentUrl: `/uploads/admin_docs/${req.file.filename}` });
  });

  // --- POS VAULT FILE INTEGRATION ENDPOINTS ---
  app.get("/api/pos/vault-invoices", (req, res) => {
    try {
      let invoices = getPosInvoices();
      if (req.query.registeredName) {
        const queryName = String(req.query.registeredName).toLowerCase().trim();
        invoices = invoices.filter(inv => (inv.registeredName || "").toLowerCase().includes(queryName));
      }
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to read POS vault invoices: " + err.message });
    }
  });

  app.get("/api/pos/vault-invoices/:invoiceNumber", (req, res) => {
    try {
      const inv = getPosInvoiceByNumber(req.params.invoiceNumber);
      if (!inv) {
        return res.status(404).json({ message: `POS Invoice #${req.params.invoiceNumber} not found` });
      }
      res.json(inv);
    } catch (err: any) {
      res.status(500).json({ message: "Error fetching POS invoice: " + err.message });
    }
  });

  app.post("/api/pos/vault-invoices/:invoiceNumber/mark-paid", (req, res) => {
    try {
      const { paymentMethod, paymentRef, proofImageUrl, approvedBy } = req.body;
      const result = updatePosInvoiceStatusPaid({
        invoiceNumber: req.params.invoiceNumber,
        paymentMethod: paymentMethod || "CASH",
        paymentRef: paymentRef || "MANUAL_APPROVAL",
        proofImageUrl,
        approvedBy,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json({ success: true, message: `Invoice #${req.params.invoiceNumber} marked as PAID in POS Vault`, invoice: result.invoice });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update POS Vault: " + err.message });
    }
  });

  // --- GET CUSTOMERS FROM TRUCKGEAR OS VAULT ---
  app.get("/api/pos/customers", (_req, res) => {
    try {
      const customers = getPosCustomers();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to read customer vault: " + err.message });
    }
  });

  // --- PAYMENT TRANSACTIONS ENDPOINTS ---
  app.get("/api/payments/list", (_req, res) => {
    try {
      const list = getPayments();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch payments: " + err.message });
    }
  });

  app.get("/api/payments/pending", (_req, res) => {
    try {
      const list = getPayments().filter(p => p.status === "PENDING_VALIDATION");
      res.json({ count: list.length, pending: list });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch pending payments: " + err.message });
    }
  });

  app.post("/api/payments/create", (req, res) => {
    try {
      const { invoice_number, payment_method, reference_number, amount, proof_image_url, customer_name } = req.body;
      if (!invoice_number || !payment_method || !amount) {
        return res.status(400).json({ message: "Invoice number, method, and amount are required" });
      }
      const newPayment = addPayment({
        invoice_number: String(invoice_number).trim(),
        customer_name: customer_name || "Client Customer",
        payment_method: payment_method || "GCash",
        reference_number: reference_number || `REF-${Date.now().toString().slice(-6)}`,
        amount: Number(amount),
        status: "PENDING_VALIDATION",
        payment_date: new Date().toISOString(),
        proof_image_url: proof_image_url || undefined,
      });
      res.status(201).json({ success: true, payment: newPayment });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create payment submission: " + err.message });
    }
  });

  // --- UPLOAD & LINK P.O. DOCUMENT TO POS INVOICE ---
  app.post("/api/invoices/upload-po", upload.single("po_document"), (req, res) => {
    try {
      const { invoiceNumber } = req.body;
      if (!req.file || !invoiceNumber) {
        return res.status(400).json({ message: "File and invoiceNumber are required" });
      }
      const poDocumentUrl = `/uploads/${req.file.filename}`;
      const result = updatePosInvoicePoDocument(invoiceNumber, poDocumentUrl);
      updatePaymentPoDocument(invoiceNumber, poDocumentUrl);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json({ success: true, poDocumentUrl, message: `P.O. linked to Invoice #${invoiceNumber}` });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to upload P.O. document: " + err.message });
    }
  });

  // --- UPLOAD & LINK SALES INVOICE DOCUMENT TO POS INVOICE ---
  app.post("/api/invoices/upload-invoice-doc", upload.single("invoice_document"), (req, res) => {
    try {
      const { invoiceNumber } = req.body;
      if (!req.file || !invoiceNumber) {
        return res.status(400).json({ message: "File and invoiceNumber are required" });
      }
      const invoiceDocumentUrl = `/uploads/${req.file.filename}`;
      const result = updatePosInvoiceSalesDoc(invoiceNumber, invoiceDocumentUrl);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json({ success: true, invoiceDocumentUrl, message: `Sales Invoice photo linked to Invoice #${invoiceNumber}` });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to upload Sales Invoice document: " + err.message });
    }
  });

  // --- DELETE P.O. DOCUMENT FROM POS INVOICE ---
  app.post("/api/invoices/delete-po", (req, res) => {
    try {
      const { invoiceNumber } = req.body;
      if (!invoiceNumber) {
        return res.status(400).json({ message: "invoiceNumber is required" });
      }
      const result = deletePosInvoicePoDocument(invoiceNumber);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json({ success: true, message: `P.O. document deleted from Invoice #${invoiceNumber}` });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete P.O. document: " + err.message });
    }
  });

  // --- DELETE SALES INVOICE DOCUMENT FROM POS INVOICE ---
  app.post("/api/invoices/delete-invoice-doc", (req, res) => {
    try {
      const { invoiceNumber } = req.body;
      if (!invoiceNumber) {
        return res.status(400).json({ message: "invoiceNumber is required" });
      }
      const result = deletePosInvoiceSalesDoc(invoiceNumber);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json({ success: true, message: `Sales Invoice document deleted from Invoice #${invoiceNumber}` });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete Sales Invoice document: " + err.message });
    }
  });

  // --- PAYMENT APPROVAL & POS VAULT SYNC ---
  app.post("/api/payments/:id/approve", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { approvedBy } = req.body;

      // 1. Update payment in JSON payment vault
      const payment = updatePaymentStatus(id, "APPROVED");
      
      // 2. Also try updating PostgreSQL DB if online
      try {
        await db.execute(sql`
          UPDATE public.payments SET status = 'APPROVED' WHERE id = ${id}
        `);
      } catch (dbErr) {
        console.warn("[DB_OPTIONAL] PostgreSQL offline, skipping DB sync:", dbErr);
      }

      // 3. Atomically update POS Vault (invoices.json)
      let vaultResult: any = { success: true };
      if (payment) {
        vaultResult = updatePosInvoiceStatusPaid({
          invoiceNumber: payment.invoice_number,
          paymentMethod: payment.payment_method || "GCash",
          paymentRef: payment.reference_number || "REF-APPROVED",
          proofImageUrl: payment.proof_image_url || undefined,
          approvedBy: approvedBy || "Staff Admin",
        });
      }

      res.json({
        success: true,
        message: `Payment approved. Invoice #${payment?.invoice_number || id} set to PAID in POS Vault.`,
        posVaultSync: vaultResult,
      });
    } catch (err: any) {
      console.error("[PAYMENT_APPROVAL_ERROR]", err);
      res.status(500).json({ message: "Failed to approve payment: " + err.message });
    }
  });

  // --- HEIC AUTO-CONVERTER ENDPOINT ---
  app.post("/api/convert-heic", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: "No imageBase64 provided" });
      }
      const sharp = (await import("sharp")).default;
      const rawBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 85 }).toBuffer();
      const convertedBase64 = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
      res.json({ imageBase64: convertedBase64 });
    } catch (e: any) {
      console.error("[HEIC_CONVERT_ERROR]", e?.message);
      res.status(500).json({ message: "Failed to convert HEIC image: " + e?.message });
    }
  });

  // --- AGENT #6: AI CATALOG DIGITIZER SCANNER ---
  app.post("/api/agent/scan-catalog", async (req, res) => {
    try {
      let { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: "No imageBase64 payload provided" });
      }

      // Auto-convert HEIC/HEIF or non-standard image buffers via sharp to JPEG
      try {
        const sharp = (await import("sharp")).default;
        const rawBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 85 }).toBuffer();
        imageBase64 = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
      } catch (sharpErr) {
        console.log("[SHARP_PASSTHROUGH] Using original image payload");
      }

      let apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        const configPaths = [
          path.join(process.cwd(), "data", "gemini_config.json"),
          path.join(process.cwd(), "gemini_config.json"),
          path.join(process.cwd(), "..", "truckgear-os", "data", "gemini_config.json")
        ];
        for (const p of configPaths) {
          if (fs.existsSync(p)) {
            try {
              const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
              if (cfg.apiKey) { apiKey = cfg.apiKey; break; }
            } catch (_) {}
          }
        }
      }

      if (!apiKey) {
        return res.status(400).json({
          message: "Gemini API Key is not configured. Please set GEMINI_API_KEY environment variable or save key in Settings."
        });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      const mimeType = "image/jpeg";
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");


      const prompt = `You are an expert AI catalog data extraction engine for Truckgear Philippines Co., specializing in heavy-duty truck replacement parts (Isuzu, Hino, Fuso, Howo, Shacman, FAW, Foton, Weichai, etc.).

Analyze this physical supplier price book or catalog page and extract ALL product items from grid or tabular layouts.

Requirements:
1. Detect global header/footer page discounts (e.g. "LESS 10%", "DISCOUNT 15%", "NET COST"). If present, extract discount_rate as a number (e.g. 10.0). If no global discount header, set discount_rate to 0.00.
2. For each part item extract:
   - "category": Category header (e.g. "Brake System", "Engine Parts", "Clutch System", "Electrical", "Filters", "Suspension")
   - "subcategory": Subcategory if visible (e.g. "Turbocharger", "Clutch Disc", "Brake Pad")
   - "oem_number": Explicit OEM part number if visible (e.g., "8-97123-456-0")
   - "part_name": Descriptive name of the item
   - "compatible_brand": Target truck brand (e.g., "Isuzu", "Hino", "Fuso", "Howo", "Shacman")
   - "compatible_models": Vehicle fitment models (e.g., "6HK1, Forward", "Fighter 6D16", "500 Series")
   - "supplier_gross_price": Listed gross price in PHP (number only, e.g. 2500.00)
   - "discount_rate": Percentage discount (number only, e.g. 10.00)
   - "net_cost": Computed net cost = supplier_gross_price * (1 - discount_rate / 100)
   - "image_bounding_box": If a product image/diagram is present for this item, return [ymin, xmin, ymax, xmax] as integers normalized to 0-1000. If no product image, set to null.

3. MULTI-VARIANT SPLITTING: If a single table cell or row lists multiple variants (e.g., "Assembly" vs "Repair Kit"), split them into separate item objects in the returned array.

Return ONLY a valid JSON object matching this schema:
{
  "supplier": "Supplier Name or Catalog Title",
  "discountHeader": "LESS 10%",
  "items": [
    {
      "category": "Engine Parts",
      "subcategory": "Turbocharger",
      "oem_number": "8-97123-456-0",
      "part_name": "Turbocharger Assembly 6HK1",
      "compatible_brand": "Isuzu",
      "compatible_models": "6HK1, Forward",
      "supplier_gross_price": 18500.00,
      "discount_rate": 10.00,
      "net_cost": 16650.00,
      "image_bounding_box": [120, 45, 380, 290]
    }
  ]
}`;

      const response = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          }
        }
      ]);

      const rawText = response.response.text();
      let parsedJson: any;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsedJson = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch (err) {
        console.error("[CATALOG_AI_PARSE_ERROR]", rawText);
        return res.status(500).json({ message: "Failed to parse catalog AI output. Try a clearer image." });
      }

      const supplierName = parsedJson.supplier || "Supplier Price Book";
      const discountHeader = parsedJson.discountHeader || "";
      const rawItems = Array.isArray(parsedJson.items) ? parsedJson.items : [];

      let croppedCount = 0;
      const processedItems = await Promise.all(
        rawItems.map(async (item: any) => {
          const gross = parseFloat(item.supplier_gross_price) || 0;
          const disc = parseFloat(item.discount_rate) || 0;
          const net = parseFloat(item.net_cost) || (gross * (1 - disc / 100));

          let croppedPath: string | null = null;
          if (item.image_bounding_box && Array.isArray(item.image_bounding_box) && item.image_bounding_box.length === 4) {
            croppedPath = await cropCatalogItemImage(imageBase64, item.image_bounding_box);
            if (croppedPath) croppedCount++;
          }

          return {
            category: item.category || "General Parts",
            subcategory: item.subcategory || "",
            oemNumber: item.oem_number || `OEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            partName: item.part_name || "Scanned Part",
            compatibleBrand: item.compatible_brand || "TruckGear",
            compatibleModels: item.compatible_models || "Universal",
            supplierGrossPrice: gross.toFixed(2),
            discountRate: disc.toFixed(2),
            netCost: net.toFixed(2),
            imageBoundingBox: item.image_bounding_box || null,
            croppedImagePath: croppedPath,
          };
        })
      );

      // 4. Send Telegram Alert via Agent #5 if Telegram Config is present
      try {
        const telegramConfigPath = path.join(process.cwd(), "data", "telegram_config.json");
        if (fs.existsSync(telegramConfigPath)) {
          const tgConfig = JSON.parse(fs.readFileSync(telegramConfigPath, "utf8"));
          if (tgConfig.token && tgConfig.chatId) {
            const msg = `🛠️ <b>PARTSMAN AI Catalog Alert</b>\n\nStaff scanned a catalog page!\n• <b>Supplier</b>: ${supplierName}\n• <b>Header Discount</b>: ${discountHeader || 'None'}\n• <b>Items Extracted</b>: ${processedItems.length} parts\n• <b>Cropped Thumbnails</b>: ${croppedCount} photos\n\n<i>Pending commit in truckgear-os.</i>`;
            fetch(`https://api.telegram.org/bot${tgConfig.token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: tgConfig.chatId, text: msg, parse_mode: "HTML" })
            }).catch(() => {});
          }
        }
      } catch (_) {}

      res.json({
        supplier: supplierName,
        discountHeader,
        itemsCount: processedItems.length,
        croppedCount,
        items: processedItems,
      });
    } catch (err: any) {
      console.error("[CATALOG_AI_ERROR]", err);
      res.status(500).json({ message: err.message || "Failed to process catalog page with AI." });
    }
  });

  // --- COMMIT CATALOG ITEMS TO POSTGRESQL & AUTO-SYNC KNOWLEDGE FILE ---
  app.post("/api/admin/catalog-ai/commit", async (req, res) => {
    try {
      const { items, syncToProducts } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No items provided for commit" });
      }

      // 1. Insert into supplier_catalog_items PostgreSQL table
      const inserted = await db.insert(supplierCatalogItems).values(items).returning();

      // 2. Auto-sync to knowledge/suppliers/master_pricelist_2026.md
      try {
        const mdPath = path.join(process.cwd(), "knowledge", "suppliers", "master_pricelist_2026.md");
        let mdContent = "";
        if (fs.existsSync(mdPath)) {
          mdContent = fs.readFileSync(mdPath, "utf8");
        } else {
          const mdDir = path.dirname(mdPath);
          if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
          mdContent = "# Master Pricelist 2026 - Suppliers\n\n| Part Name | Part Number | Supplier | Price (PHP) | Notes |\n|-----------|-------------|----------|-------------|-------|\n";
        }

        let newRows = "";
        for (const item of items) {
          const pName = item.partName || "Unknown Part";
          const pNum = item.oemNumber || "N/A";
          const supplier = item.compatibleBrand || "TruckGear Supplier";
          const price = Number(item.netCost || item.supplierGrossPrice || 0).toFixed(2);
          const notes = `${item.category || ''} - ${item.compatibleModels || ''}`.trim();
          newRows += `| ${pName} | ${pNum} | ${supplier} | ${price} | ${notes} |\n`;
        }

        mdContent += newRows;
        fs.writeFileSync(mdPath, mdContent, "utf8");
      } catch (mdErr) {
        console.error("[KNOWLEDGE_SYNC_ERROR]", mdErr);
      }

      // 3. Optional sync to main products table (with 35% selling price margin)
      if (syncToProducts) {
        for (const item of items) {
          if (!item.oemNumber) continue;
          const net = Number(item.netCost || item.supplierGrossPrice || 0);
          const selling = (net * 1.35).toFixed(2);
          await db.insert(products).values({
            sku: item.oemNumber,
            name: item.partName || "Scanned Part",
            category: item.category || "General",
            brand: item.compatibleBrand || "TruckGear",
            costPrice: net.toFixed(2),
            sellingPrice: selling,
            stockQuantity: 0,
            reorderPoint: 5,
          }).onConflictDoUpdate({
            target: products.sku,
            set: {
              name: item.partName,
              costPrice: net.toFixed(2),
              sellingPrice: selling,
            }
          });
        }
      }

      res.json({ success: true, count: inserted.length });
    } catch (err: any) {
      console.error("[CATALOG_COMMIT_ERROR]", err);
      res.status(500).json({ message: err.message || "Failed to commit catalog items" });
    }
  });

  // --- GET SUPPLIER REFERENCE CATALOG POOL (2,565 ITEMS) ---
  app.get("/api/admin/supplier-catalog", async (req, res) => {
    try {
      const items = await db.select().from(supplierCatalogItems).orderBy(desc(supplierCatalogItems.id));
      res.json(items);
    } catch (err: any) {
      console.error("[SUPPLIER_CATALOG_GET_ERROR]", err);
      res.status(500).json({ message: "Failed to fetch supplier reference catalog" });
    }
  });


  // --- Image Upload ---
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Only image files (JPG, PNG, GIF, WEBP) are allowed" });
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  // --- Products ---
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts(req.query.search as string);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const { oemNumbers, compatibility, ...productData } = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(productData, oemNumbers, compatibility);
      res.status(201).json(product);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
      const { oemNumbers, compatibility, ...productData } = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), productData, oemNumbers, compatibility);
      res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (e: any) {
      if (e.code === '23503') {
        return res.status(400).json({ message: "Cannot delete product that is used in existing orders." });
      }
      throw e;
    }
  });

  // --- PARTSMAN CLIENT-SCOPED INVENTORY ENDPOINTS ---
  app.get("/api/inventory/search", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").toLowerCase().trim();
      const vaultPath = getClientInventoryVaultPath();
      let items: any[] = [];
      if (fs.existsSync(vaultPath)) {
        items = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }
      if (q) {
        items = items.filter((p: any) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      }
      const mapped = items.map((p: any) => ({
        id: p.id,
        name: p.name,
        part_number: p.sku || `JET-PART-${p.id}`,
        description: p.description || p.location || "Client Fleet Spare Part",
        quantity: p.quantity ?? 0,
        reorder_level: p.reorder_level ?? 5,
        supplier: p.brand || "Client Depot Stock",
        company: p.company || "PH GLOBAL JET EXPRESS INC.",
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to search client inventory: " + err.message });
    }
  });

  app.post("/api/inventory/create", async (req, res) => {
    try {
      const { sku, name, location, brand, quantity, reorder_level } = req.body;
      const vaultPath = getClientInventoryVaultPath();
      let items: any[] = [];
      if (fs.existsSync(vaultPath)) {
        items = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newItem = {
        id: Date.now(),
        sku: sku || `JET-${Date.now().toString().slice(-4)}`,
        name: name || "New Fleet Spare Part",
        description: `Location: ${location || "Depot Shelf"}`,
        quantity: Number(quantity) || 0,
        reorder_level: Number(reorder_level) || 5,
        location: location || "Depot Shelf",
        brand: brand || "Client Depot Stock",
        company: "PH GLOBAL JET EXPRESS INC."
      };

      items.unshift(newItem);
      fs.writeFileSync(vaultPath, JSON.stringify(items, null, 2));

      res.status(201).json({
        id: newItem.id,
        name: newItem.name,
        part_number: newItem.sku,
        description: newItem.description,
        quantity: newItem.quantity,
        reorder_level: newItem.reorder_level,
        supplier: newItem.brand
      });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create client inventory item: " + err.message });
    }
  });

  // NOTE: PUT /api/inventory/update/:id is defined BELOW after helper functions
  // to ensure getSharedVaultPath is already defined when it executes.

  // --- DYNAMIC CLIENT-SCOPED DATA VAULT TUNNEL HELPERS ---
  const getSharedVaultPath = (fileName: string) => {
    const possibleDirs = [
      "/run/user/1000/gvfs/sftp:host=192.168.254.121,user=bab/home/bab/Documents/truckgear-os/data",
      "/home/bab/Documents/truckgear-os/data",
      path.resolve(process.cwd(), "./data"),
    ];
    for (const d of possibleDirs) {
      if (fs.existsSync(d)) {
        return path.join(d, fileName);
      }
    }
    return path.resolve(process.cwd(), "./data", fileName);
  };

  const getClientInventoryVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`client_inventory_${slug}.json`);
  };

  const getRfqVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`rfq_vault_${slug}.json`);
  };

  const getDispatchLogVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`dispatch_log_${slug}.json`);
  };

  // --- FIXED: PUT /api/inventory/update/:id (properly uses shared vault path) ---
  app.put("/api/inventory/update/:id", async (req, res) => {
    try {
      const { quantity, partNumber, sku, name, description, location, reorder_level, supplier, brand } = req.body;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getClientInventoryVaultPath(company);

      if (!fs.existsSync(vaultPath)) {
        return res.json({ message: "Vault not found, tracked via dispatch log", updated: false });
      }

      let items = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      // Try matching by: id (number), sku (string), or name
      const index = items.findIndex((i: any) =>
        i.id === Number(req.params.id) ||
        i.sku === req.params.id ||
        i.part_number === req.params.id ||
        (partNumber && (i.sku === partNumber || i.part_number === partNumber)) ||
        (sku && (i.sku === sku || i.part_number === sku)) ||
        (name && i.name && i.name.toLowerCase() === name.toLowerCase())
      );

      if (index === -1) {
        return res.json({ message: "Part not found in vault by id/sku, tracked via dispatch log", updated: false });
      }

      if (typeof quantity !== "undefined") items[index].quantity = Math.max(0, Number(quantity));
      if (name) items[index].name = name;
      if (partNumber || sku) {
        items[index].sku = partNumber || sku;
        items[index].part_number = partNumber || sku;
      }
      if (description || location) {
        items[index].description = description || location;
        items[index].location = location || description;
      }
      if (typeof reorder_level !== "undefined") items[index].reorder_level = Number(reorder_level);
      if (supplier || brand) {
        items[index].supplier = supplier || brand;
        items[index].brand = brand || supplier;
      }

      fs.writeFileSync(vaultPath, JSON.stringify(items, null, 2));
      res.json({ ...items[index], updated: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update inventory: " + err.message });
    }
  });

  app.delete("/api/inventory/delete/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getClientInventoryVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Part deleted" });

      let items = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      items = items.filter((i: any) =>
        i.id !== Number(id) && i.sku !== id && i.part_number !== id
      );
      fs.writeFileSync(vaultPath, JSON.stringify(items, null, 2));
      res.json({ message: "Part deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete part: " + err.message });
    }
  });

  // --- DISPATCH LOG: GET & POST ---
  app.get("/api/inventory/dispatch-log", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDispatchLogVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const log = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load dispatch log: " + err.message });
    }
  });

  app.post("/api/inventory/dispatch-log", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDispatchLogVaultPath(company);
      let log: any[] = [];
      if (fs.existsSync(vaultPath)) {
        log = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const entry = {
        id: `DSP-${Date.now()}`,
        timestamp: new Date().toISOString(),
        requestId: req.body.requestId,
        partNumber: req.body.partNumber,
        partName: req.body.partName,
        qty: req.body.qty,
        fleetUnit: req.body.fleetUnit,
        dispatchedBy: req.body.dispatchedBy || "Stock Man",
        previousQty: req.body.previousQty,
        newQty: req.body.newQty,
        company,
      };

      log.unshift(entry);
      fs.writeFileSync(vaultPath, JSON.stringify(log, null, 2));
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to save dispatch log: " + err.message });
    }
  });

  app.get("/api/inventory/rfqs", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getRfqVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const rfqs = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(rfqs);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load RFQ vault: " + err.message });
    }
  });

  app.post("/api/inventory/rfqs", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getRfqVaultPath(company);
      let rfqs: any[] = [];
      if (fs.existsSync(vaultPath)) {
        rfqs = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newRfq = {
        id: req.body.id || `RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: req.body.date || new Date().toISOString().split("T")[0],
        targetFleetUnit: req.body.targetFleetUnit || "Fuso Super Great Cargo Hauler (DEF-5678)",
        preparedBy: req.body.preparedBy || "Procurement Manager",
        status: "Quotation Ready",
        company: company,
        suppliers: req.body.suppliers || [
          { id: "truckgear", name: "TruckGear Philippines Co.", isTruckgear: true },
          { id: "monroe", name: "Monroe Cabin Systems Co." },
          { id: "meritor", name: "Meritor Heavy-Duty Axles" }
        ],
        items: req.body.items || []
      };

      rfqs.unshift(newRfq);
      fs.writeFileSync(vaultPath, JSON.stringify(rfqs, null, 2));
      res.status(201).json(newRfq);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create RFQ record: " + err.message });
    }
  });

  app.put("/api/inventory/rfqs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getRfqVaultPath(company);
      let rfqs: any[] = [];
      if (fs.existsSync(vaultPath)) {
        rfqs = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = rfqs.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        rfqs[idx] = { ...rfqs[idx], ...req.body };
      } else {
        rfqs.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(rfqs, null, 2));
      res.json(idx !== -1 ? rfqs[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update RFQ record: " + err.message });
    }
  });

  app.delete("/api/inventory/rfqs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getRfqVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "RFQ record deleted" });

      let rfqs = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      rfqs = rfqs.filter((r: any) => r.id !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(rfqs, null, 2));
      res.json({ message: "RFQ record deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete RFQ record: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED MAINTENANCE REQUESTS VAULT CRUD ENDPOINTS ---
  const getMaintenanceVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`maintenance_requests_${slug}.json`);
  };

  app.get("/api/inventory/maintenance", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getMaintenanceVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const requests = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));

      // DEDUPLICATE: keep only the entry with the most-priority status per ID
      const statusPriority: Record<string, number> = { "Dispatched": 0, "Completed": 1, "On Order": 2, "Pending Purchase": 3, "Pending Dispatch": 4 };
      const seen: Record<string, any> = {};
      const deduped: any[] = [];
      for (const entry of requests) {
        if (!seen[entry.id]) {
          seen[entry.id] = entry;
          deduped.push(entry);
        } else {
          const existingPriority = statusPriority[seen[entry.id].status] ?? 99;
          const newPriority = statusPriority[entry.status] ?? 99;
          if (newPriority < existingPriority) {
            const idx = deduped.findIndex(e => e.id === entry.id);
            deduped[idx] = entry;
            seen[entry.id] = entry;
          }
        }
      }

      res.json(deduped);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load maintenance requests: " + err.message });
    }
  });

  app.post("/api/inventory/maintenance", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getMaintenanceVaultPath(company);
      let requests: any[] = [];
      if (fs.existsSync(vaultPath)) {
        requests = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newReq = {
        id: req.body.id || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
        fleetUnit: req.body.fleetUnit || "Isuzu Giga (ABC-1234)",
        partNumber: req.body.partNumber,
        name: req.body.name,
        qty: req.body.qty || 1,
        priority: req.body.priority || "Routine",
        status: req.body.status || "Pending Dispatch",
        timestamp: req.body.timestamp || new Date().toLocaleString(),
        partPhotoUrl: req.body.partPhotoUrl || "",
        gpsLocation: req.body.gpsLocation || "",
        mechanicMessage: req.body.mechanicMessage || "",
        company: company
      };

      // PREVENT DUPLICATES: check if an entry with this ID already exists
      const existingIdx = requests.findIndex((r: any) => r.id === newReq.id);
      if (existingIdx !== -1) {
        // Update existing entry instead of creating a duplicate
        requests[existingIdx] = { ...requests[existingIdx], ...newReq };
      } else {
        requests.unshift(newReq);
      }
      fs.writeFileSync(vaultPath, JSON.stringify(requests, null, 2));
      res.status(201).json(newReq);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create maintenance request: " + err.message });
    }
  });

  app.post("/api/inventory/maintenance/upload-photo", upload.single("part_photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No part photo file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const { reqId, company } = req.body;
      if (reqId) {
        const vaultPath = getMaintenanceVaultPath(company || "PH GLOBAL JET EXPRESS INC.");
        if (fs.existsSync(vaultPath)) {
          let requests = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
          const idx = requests.findIndex((r: any) => r.id === reqId);
          if (idx !== -1) {
            requests[idx].partPhotoUrl = imageUrl;
            fs.writeFileSync(vaultPath, JSON.stringify(requests, null, 2));
          }
        }
      }
      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to upload part photo: " + err.message });
    }
  });

  app.put("/api/inventory/maintenance/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getMaintenanceVaultPath(company);
      let requests: any[] = [];
      if (fs.existsSync(vaultPath)) {
        requests = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      // UPDATE ALL entries with this ID (eliminate duplicates at the same time)
      let updated: any = null;
      const seen = new Set<string>();
      const dedupedAndUpdated = requests
        .map((r: any) => {
          if (r.id === id) {
            updated = { ...r, ...req.body };
            return updated;
          }
          return r;
        })
        .filter((r: any) => {
          // Remove duplicate IDs, keep only first occurrence
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

      if (!updated) {
        // ID not found — insert new entry
        updated = { id, ...req.body };
        dedupedAndUpdated.unshift(updated);
      }

      fs.writeFileSync(vaultPath, JSON.stringify(dedupedAndUpdated, null, 2));
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update maintenance request: " + err.message });
    }
  });

  app.delete("/api/inventory/maintenance/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getMaintenanceVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Maintenance request deleted" });

      let requests = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      requests = requests.filter((r: any) => r.id !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(requests, null, 2));
      res.json({ message: "Maintenance request deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete maintenance request: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED FLEET TRUCKS VAULT CRUD ENDPOINTS ---
  const getFleetVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`directory_fleet_${slug}.json`);
  };

  app.get("/api/inventory/fleet", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getFleetVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(fleet);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load fleet vault: " + err.message });
    }
  });

  app.post("/api/inventory/fleet", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getFleetVaultPath(company);
      let fleet: any[] = [];
      if (fs.existsSync(vaultPath)) {
        fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newUnit = {
        id: req.body.id || `UNIT-${Date.now().toString().slice(-4)}`,
        model: req.body.model || req.body.name || "Heavy Logistics Truck",
        name: req.body.name || req.body.model || "Heavy Logistics Truck",
        plate: req.body.plate || "XYZ-1234",
        status: req.body.status || "In Service",
        driver: req.body.driver || "Unassigned Driver",
        route: req.body.route || "Depot Route",
        allocatedParts: req.body.allocatedParts || [],
        company: company
      };

      const existingIdx = fleet.findIndex((f: any) => f.id === newUnit.id || f.plate === newUnit.plate);
      if (existingIdx !== -1) {
        fleet[existingIdx] = { ...fleet[existingIdx], ...newUnit };
      } else {
        fleet.unshift(newUnit);
      }
      fs.writeFileSync(vaultPath, JSON.stringify(fleet, null, 2));
      res.status(201).json(newUnit);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create fleet unit: " + err.message });
    }
  });

  app.put("/api/inventory/fleet/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getFleetVaultPath(company);
      let fleet: any[] = [];
      if (fs.existsSync(vaultPath)) {
        fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = fleet.findIndex((f: any) => f.id === id);
      if (idx !== -1) {
        fleet[idx] = { ...fleet[idx], ...req.body };
      } else {
        fleet.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(fleet, null, 2));
      res.json(idx !== -1 ? fleet[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update fleet unit: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED DIRECTORY SUPPLIERS ENDPOINTS ---
  const getDirectoryVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`directory_suppliers_${slug}.json`);
  };

  app.get("/api/inventory/directory/suppliers", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const suppliers = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load suppliers directory: " + err.message });
    }
  });

  app.post("/api/inventory/directory/suppliers", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryVaultPath(company);
      let suppliers: any[] = [];
      if (fs.existsSync(vaultPath)) {
        suppliers = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newSup = {
        id: req.body.id || `SUP-${Date.now().toString().slice(-4)}`,
        name: req.body.name,
        contactPerson: req.body.contactPerson || "N/A",
        phone: req.body.phone || "N/A",
        email: req.body.email || "N/A",
        specialty: req.body.specialty || "Spares",
        rating: req.body.rating || 5.0,
        company: company
      };

      const existingIdx = suppliers.findIndex((s: any) => s.id === newSup.id || s.name.toLowerCase() === newSup.name.toLowerCase());
      if (existingIdx !== -1) {
        suppliers[existingIdx] = { ...suppliers[existingIdx], ...newSup };
      } else {
        suppliers.unshift(newSup);
      }

      fs.writeFileSync(vaultPath, JSON.stringify(suppliers, null, 2));
      res.status(201).json(newSup);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create directory supplier: " + err.message });
    }
  });

  app.put("/api/inventory/directory/suppliers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryVaultPath(company);
      let suppliers: any[] = [];
      if (fs.existsSync(vaultPath)) {
        suppliers = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = suppliers.findIndex((s: any) => s.id === id);
      if (idx !== -1) {
        suppliers[idx] = { ...suppliers[idx], ...req.body };
      } else {
        suppliers.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(suppliers, null, 2));
      res.json(idx !== -1 ? suppliers[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update directory supplier: " + err.message });
    }
  });

  app.delete("/api/inventory/directory/suppliers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Supplier deleted" });

      let suppliers = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      suppliers = suppliers.filter((s: any) => s.id !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(suppliers, null, 2));
      res.json({ message: "Supplier deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete directory supplier: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED DIRECTORY FLEET ENDPOINTS ---
  const getDirectoryFleetVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`directory_fleet_${slug}.json`);
  };

  app.get("/api/inventory/directory/fleet", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryFleetVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(fleet);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load fleet directory: " + err.message });
    }
  });

  app.post("/api/inventory/directory/fleet", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryFleetVaultPath(company);
      let fleet: any[] = [];
      if (fs.existsSync(vaultPath)) {
        fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newUnit = {
        id: req.body.id || `UNIT-${Date.now().toString().slice(-4)}`,
        model: req.body.model || req.body.name || "Heavy Logistics Truck",
        name: req.body.name || req.body.model || "Heavy Logistics Truck",
        plate: req.body.plate || "XYZ-1234",
        driver: req.body.driver || "Unassigned Driver",
        route: req.body.route || "Depot Route",
        status: req.body.status || "Available",
        allocatedParts: req.body.allocatedParts || [],
        company: company
      };

      const existingIdx = fleet.findIndex((f: any) => f.id === newUnit.id || (newUnit.plate && f.plate === newUnit.plate));
      if (existingIdx !== -1) {
        fleet[existingIdx] = { ...fleet[existingIdx], ...newUnit };
      } else {
        fleet.unshift(newUnit);
      }
      fs.writeFileSync(vaultPath, JSON.stringify(fleet, null, 2));
      res.status(201).json(newUnit);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create fleet unit: " + err.message });
    }
  });

  app.put("/api/inventory/directory/fleet/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryFleetVaultPath(company);
      let fleet: any[] = [];
      if (fs.existsSync(vaultPath)) {
        fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = fleet.findIndex((f: any) => f.id === id || f.plate === id);
      if (idx !== -1) {
        fleet[idx] = { ...fleet[idx], ...req.body };
      } else {
        fleet.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(fleet, null, 2));
      res.json(idx !== -1 ? fleet[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update fleet unit: " + err.message });
    }
  });

  app.delete("/api/inventory/directory/fleet/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getDirectoryFleetVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Fleet unit deleted" });

      let fleet = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      fleet = fleet.filter((f: any) => f.id !== id && f.plate !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(fleet, null, 2));
      res.json({ message: "Fleet unit deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete fleet unit: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED LOGISTICS & DELIVERY RECEIPTS VAULT CRUD ENDPOINTS ---
  const getLogisticsVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`delivery_receipts_${slug}.json`);
  };

  app.get("/api/logistics/dr", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getLogisticsVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const receipts = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(receipts);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load delivery receipts: " + err.message });
    }
  });

  app.post("/api/logistics/dr", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getLogisticsVaultPath(company);
      let receipts: any[] = [];
      if (fs.existsSync(vaultPath)) {
        receipts = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newDr = {
        id: req.body.id || `DR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId: req.body.invoiceId || "INV-5808",
        dispatchDate: req.body.dispatchDate || new Date().toISOString().split("T")[0],
        destinationDepot: req.body.destinationDepot || "Central Distribution Depot",
        truckPlate: req.body.truckPlate || "ABC-1234",
        driver: req.body.driver || "Rodrigo Santos",
        status: req.body.status || "Dispatched",
        company: company,
        podImage: req.body.podImage || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
        items: req.body.items || [],
        notes: req.body.notes || "Dispatched via logistics fleet."
      };

      receipts.unshift(newDr);
      fs.writeFileSync(vaultPath, JSON.stringify(receipts, null, 2));
      res.status(201).json(newDr);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create delivery receipt: " + err.message });
    }
  });

  app.put("/api/logistics/dr/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getLogisticsVaultPath(company);
      let receipts: any[] = [];
      if (fs.existsSync(vaultPath)) {
        receipts = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = receipts.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        receipts[idx] = { ...receipts[idx], ...req.body };
      } else {
        receipts.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(receipts, null, 2));
      res.json(idx !== -1 ? receipts[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update delivery receipt: " + err.message });
    }
  });

  app.delete("/api/logistics/dr/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getLogisticsVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Delivery receipt deleted" });

      let receipts = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      receipts = receipts.filter((r: any) => r.id !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(receipts, null, 2));
      res.json({ message: "Delivery receipt deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete delivery receipt: " + err.message });
    }
  });

  app.post("/api/logistics/upload-pod", upload.single("pod_image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No Delivery Receipt / POD photo file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const { drId, company } = req.body;
      if (drId) {
        const vaultPath = getLogisticsVaultPath(company || "PH GLOBAL JET EXPRESS INC.");
        if (fs.existsSync(vaultPath)) {
          let receipts = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
          const idx = receipts.findIndex((r: any) => r.id === drId);
          if (idx !== -1) {
            receipts[idx].podImage = imageUrl;
            fs.writeFileSync(vaultPath, JSON.stringify(receipts, null, 2));
          }
        }
      }
      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to upload POD photo: " + err.message });
    }
  });

  // --- DYNAMIC CLIENT-SCOPED EXPENDITURE LEDGER VAULT CRUD ENDPOINTS ---
  const getExpenditureVaultPath = (companyName?: string) => {
    let slug = "jetexpress";
    if (companyName && companyName !== "PH GLOBAL JET EXPRESS INC.") {
      slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!slug) slug = "jetexpress";
    }
    return getSharedVaultPath(`expenditures_${slug}.json`);
  };

  app.get("/api/expenditures", async (req, res) => {
    try {
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getExpenditureVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json([]);
      const records = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load expenditure ledger: " + err.message });
    }
  });

  app.post("/api/expenditures", async (req, res) => {
    try {
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getExpenditureVaultPath(company);
      let records: any[] = [];
      if (fs.existsSync(vaultPath)) {
        records = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const newExp = {
        id: req.body.id || `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: req.body.date || new Date().toISOString().split("T")[0],
        invoiceId: req.body.invoiceId || "INV-5808",
        drId: req.body.drId || "DR-2026-8801",
        truckPlate: req.body.truckPlate || "ABC-1234",
        truckModel: req.body.truckModel || "Isuzu Giga 10-Wheeler Dump Truck",
        category: req.body.category || "Engine & Oil Filtration",
        description: req.body.description || "Fleet Spare Parts Purchase",
        qty: req.body.qty || 1,
        amount: req.body.amount || 0,
        status: req.body.status || "UNPAID / OPEN",
        company: company
      };

      records.unshift(newExp);
      fs.writeFileSync(vaultPath, JSON.stringify(records, null, 2));
      res.status(201).json(newExp);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to log expenditure record: " + err.message });
    }
  });

  app.put("/api/expenditures/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = req.body.company || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getExpenditureVaultPath(company);
      let records: any[] = [];
      if (fs.existsSync(vaultPath)) {
        records = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      }

      const idx = records.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...req.body };
      } else {
        records.unshift({ id, ...req.body });
      }

      fs.writeFileSync(vaultPath, JSON.stringify(records, null, 2));
      res.json(idx !== -1 ? records[idx] : req.body);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update expenditure record: " + err.message });
    }
  });

  app.delete("/api/expenditures/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = (req.query.company as string) || (req.user as any)?.company || (req.user as any)?.registeredName || "PH GLOBAL JET EXPRESS INC.";
      const vaultPath = getExpenditureVaultPath(company);
      if (!fs.existsSync(vaultPath)) return res.json({ message: "Expenditure record deleted" });

      let records = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
      records = records.filter((r: any) => r.id !== id);
      fs.writeFileSync(vaultPath, JSON.stringify(records, null, 2));
      res.json({ message: "Expenditure record deleted" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete expenditure record: " + err.message });
    }
  });

  // --- Customers ---
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.post(api.customers.create.path, async (req, res) => {
    const customer = await storage.createCustomer(req.body);
    res.status(201).json(customer);
  });

  app.put("/api/customers/:id", async (req, res) => {
    const customer = await storage.updateCustomer(Number(req.params.id), req.body);
    res.json(customer);
  });

  app.delete("/api/customers/:id", async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.json({ success: true });
  });

  // --- Vendors ---
  app.get(api.vendors.list.path, async (req, res) => {
    const vendors = await storage.getVendors();
    res.json(vendors);
  });

  app.post(api.vendors.create.path, async (req, res) => {
    const vendor = await storage.createVendor(req.body);
    res.status(201).json(vendor);
  });

  app.put("/api/vendors/:id", async (req, res) => {
    const vendor = await storage.updateVendor(Number(req.params.id), req.body);
    res.json(vendor);
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    await storage.deleteVendor(Number(req.params.id));
    res.json({ success: true });
  });

  // --- Sales Orders ---
  app.get(api.salesOrders.list.path, async (req, res) => {
    const orders = await storage.getSalesOrders();
    res.json(orders);
  });

  app.get(api.salesOrders.get.path, async (req, res) => {
    const order = await storage.getSalesOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.salesOrders.create.path, async (req, res) => {
    const { items, ...orderData } = api.salesOrders.create.input.parse(req.body);
    const order = await storage.createSalesOrder(orderData, items);
    res.status(201).json(order);
  });

  app.patch(api.salesOrders.updateStatus.path, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateSalesOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  app.put(api.salesOrders.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getSalesOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'invoiced') return res.status(400).json({ message: "Cannot edit an invoiced order" });
      const { items, ...orderData } = api.salesOrders.update.input.parse(req.body);
      const order = await storage.updateSalesOrder(id, orderData, items);
      res.json(order);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.salesOrders.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getSalesOrder(id);
    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.status === 'invoiced') return res.status(400).json({ message: "Cannot delete an invoiced order" });
    await storage.deleteSalesOrder(id);
    res.json({ message: "Order deleted" });
  });

  // --- Purchase Orders ---
  app.get(api.purchaseOrders.list.path, async (req, res) => {
    const orders = await storage.getPurchaseOrders();
    res.json(orders);
  });

  app.get(api.purchaseOrders.get.path, async (req, res) => {
    const order = await storage.getPurchaseOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.purchaseOrders.create.path, async (req, res) => {
    const { items, ...orderData } = api.purchaseOrders.create.input.parse(req.body);
    const order = await storage.createPurchaseOrder(orderData, items);
    res.status(201).json(order);
  });

  app.patch(api.purchaseOrders.updateStatus.path, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updatePurchaseOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  app.put(api.purchaseOrders.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getPurchaseOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'received') return res.status(400).json({ message: "Cannot edit a received order" });
      const { items, ...orderData } = api.purchaseOrders.update.input.parse(req.body);
      const order = await storage.updatePurchaseOrder(id, orderData, items);
      res.json(order);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.purchaseOrders.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPurchaseOrder(id);
    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.status === 'received') return res.status(400).json({ message: "Cannot delete a received order" });
    await storage.deletePurchaseOrder(id);
    res.json({ message: "Order deleted" });
  });

  // --- Stats & Reports ---
  app.get(api.stats.dashboard.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/reports/activity", async (req, res) => {
    const period = (req.query.period as string) || 'daily';
    const report = await storage.getActivityReport(period);
    res.json(report);
  });

  // --- Business Report (comprehensive) ---
  app.get("/api/reports/business", isAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

      // 1. Today's sales invoices
      const todayInvoices = await db
        .select()
        .from(salesInvoices)
        .where(and(
          gte(salesInvoices.createdAt, new Date(todayStr)),
          lte(salesInvoices.createdAt, new Date(tomorrowStr))
        ));

      const byMethod = { CASH: 0, GCASH: 0, CHECK: 0, NET_DAYS: 0 };
      let invoiceTotal = 0;
      for (const inv of todayInvoices) {
        const amt = Number(inv.totalAmount_Due || 0);
        invoiceTotal += amt;
        const m = (inv.paymentMethod || "CASH").toUpperCase() as keyof typeof byMethod;
        if (m in byMethod) byMethod[m] += amt;
      }
      const paymentsRecorded = byMethod.CASH + byMethod.GCASH + byMethod.CHECK + byMethod.NET_DAYS;
      const discrepancy = Math.abs(invoiceTotal - paymentsRecorded);

      // 2. Today's purchase orders received
      const todayPOs = await db
        .select()
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.status, "received"),
          gte(purchaseOrders.orderDate, new Date(todayStr)),
          lte(purchaseOrders.orderDate, new Date(tomorrowStr))
        ));
      const todayPurchaseTotal = todayPOs.reduce((s, p) => s + Number(p.totalAmount || 0), 0);

      // 3. 30-day revenue vs expense (by day)
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
      const last30Sales = await db.execute(sql`
        SELECT DATE(created_at) as day, SUM(total_amount_due) as total
        FROM sales_invoices
        WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        GROUP BY DATE(created_at)
        ORDER BY day
      `);
      const last30Purchases = await db.execute(sql`
        SELECT DATE(order_date) as day, SUM(total_amount) as total
        FROM purchase_orders
        WHERE status = 'received' AND order_date >= ${thirtyDaysAgo.toISOString()}
        GROUP BY DATE(order_date)
        ORDER BY day
      `);

      // Merge 30-day data
      const dayMap = new Map<string, { day: string; sales: number; purchases: number }>();
      for (const row of last30Sales.rows as any[]) {
        const d = String(row.day).split("T")[0];
        dayMap.set(d, { day: d, sales: Number(row.total || 0), purchases: 0 });
      }
      for (const row of last30Purchases.rows as any[]) {
        const d = String(row.day).split("T")[0];
        const existing = dayMap.get(d);
        if (existing) existing.purchases = Number(row.total || 0);
        else dayMap.set(d, { day: d, sales: 0, purchases: Number(row.total || 0) });
      }
      const thirtyDayData = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day))
        .map((r) => ({ ...r, day: r.day.slice(5) })); // MM-DD format

      // 4. Payment method breakdown (all-time from salesInvoices)
      const pmBreakdown = await db.execute(sql`
        SELECT payment_method, COUNT(*) as count, SUM(total_amount_due) as total
        FROM sales_invoices
        GROUP BY payment_method
      `);

      // 5. AR Aging (UNPAID invoices)
      const arAging = await db.execute(sql`
        SELECT
          SUM(CASE WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN total_amount_due ELSE 0 END) as current_amount,
          SUM(CASE WHEN EXTRACT(DAY FROM NOW() - created_at) > 30 AND EXTRACT(DAY FROM NOW() - created_at) <= 60 THEN total_amount_due ELSE 0 END) as thirty_sixty,
          SUM(CASE WHEN EXTRACT(DAY FROM NOW() - created_at) > 60 THEN total_amount_due ELSE 0 END) as overdue
        FROM sales_invoices
        WHERE status = 'UNPAID'
      `);

      // 6. Cash flow projection (next 4 weeks - supplier check maturity dates)
      const fourWeeksAhead = new Date(today.getTime() + 28 * 86400000);
      const upcomingChecks = await db
        .select()
        .from(counterReceiptChecks)
        .where(and(
          gte(counterReceiptChecks.checkDate, todayStr),
          lte(counterReceiptChecks.checkDate, fourWeeksAhead.toISOString().split("T")[0])
        ));

      // Group by week
      const weekMap = new Map<string, number>();
      for (let w = 0; w < 4; w++) {
        const weekStart = new Date(today.getTime() + w * 7 * 86400000);
        const label = `Week ${w + 1} (${weekStart.toLocaleDateString("en-PH", { month: "short", day: "numeric" })})`;
        weekMap.set(label, 0);
      }
      for (const chk of upcomingChecks) {
        if (!chk.checkDate) continue;
        const chkDate = new Date(chk.checkDate);
        const diffDays = Math.floor((chkDate.getTime() - today.getTime()) / 86400000);
        const weekIdx = Math.min(Math.floor(diffDays / 7), 3);
        const weekStart = new Date(today.getTime() + weekIdx * 7 * 86400000);
        const label = `Week ${weekIdx + 1} (${weekStart.toLocaleDateString("en-PH", { month: "short", day: "numeric" })})`;
        weekMap.set(label, (weekMap.get(label) || 0) + Number(chk.amount || 0));
      }
      const cashFlow = Array.from(weekMap.entries()).map(([week, amount]) => ({ week, amount }));

      // 7. Accounting totals
      const sevenDaysAhead = new Date(today.getTime() + 7 * 86400000);
      const arResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount_due), 0) as total FROM sales_invoices WHERE status = 'UNPAID'
      `);
      const apResult = await db.execute(sql`
        SELECT COALESCE(SUM(amount_due), 0) as total FROM accounts_payable WHERE status IN ('PENDING_COUNTER', 'COUNTERED')
      `);
      const outflowResult = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM counter_receipt_checks
        WHERE check_date >= ${todayStr} AND check_date <= ${sevenDaysAhead.toISOString().split("T")[0]}
      `);
      const pendingAPResult = await db.execute(sql`
        SELECT COALESCE(SUM(amount_due), 0) as total FROM accounts_payable WHERE status = 'PENDING_COUNTER'
      `);

      res.json({
        todaySales: {
          total: invoiceTotal,
          count: todayInvoices.length,
          byMethod,
          paymentsRecorded,
          discrepancy,
        },
        todayPurchases: {
          total: todayPurchaseTotal,
          count: todayPOs.length,
          pendingAP: Number((pendingAPResult.rows[0] as any)?.total || 0),
        },
        thirtyDayData,
        paymentBreakdown: (pmBreakdown.rows as any[]).map((r) => ({
          method: r.payment_method || "CASH",
          count: Number(r.count),
          total: Number(r.total || 0),
        })),
        arAging: {
          current: Number((arAging.rows[0] as any)?.current_amount || 0),
          thirtyToSixty: Number((arAging.rows[0] as any)?.thirty_sixty || 0),
          overdue: Number((arAging.rows[0] as any)?.overdue || 0),
        },
        cashFlow,
        totals: {
          totalAR: Number((arResult.rows[0] as any)?.total || 0),
          totalAP: Number((apResult.rows[0] as any)?.total || 0),
          projectedOutflow: Number((outflowResult.rows[0] as any)?.total || 0),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("business report error:", err);
      res.status(500).json({ error: "Failed to generate business report" });
    }
  });

  // --- POS: Drawer Management ---
  app.get("/api/pos/drawer-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.getActiveDrawerSession(userId);
      res.json({ active: !!session, session: session || null });
    } catch (e) {
      console.error("drawer-status error:", e);
      res.status(500).json({ active: false });
    }
  });

  app.post("/api/pos/drawer-open", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.createDrawerSession({
        userId,
        openingBalance: String(req.body.openingBalance ?? 0),
        status: "OPEN",
        companyId: 1,
      });
      res.json(session);
    } catch (e) {
      console.error("drawer-open error:", e);
      res.status(500).json({ message: "Failed to open drawer" });
    }
  });

  app.post("/api/pos/drawer-close", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.getActiveDrawerSession(userId);
      if (!session) return res.status(404).json({ message: "No active drawer session" });
      await storage.closeDrawerSession(session.id, String(req.body.closingBalance ?? 0));
      res.json({ message: "Drawer closed" });
    } catch (e) {
      console.error("drawer-close error:", e);
      res.status(500).json({ message: "Failed to close drawer" });
    }
  });

  // --- Accounts Payable ---
  app.get("/api/accounts-payable", isAuthenticated, async (req, res) => {
    const { vendorName, status } = req.query as { vendorName?: string; status?: string };
    const bills = await storage.getAccountsPayable(vendorName, status);
    res.json(bills);
  });

  app.post("/api/accounts-payable", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.createAccountsPayable({
        ...req.body,
        status: req.body.status || "PENDING_COUNTER",
      });
      res.status(201).json(bill);
    } catch (e) {
      console.error("accounts-payable create error:", e);
      res.status(500).json({ message: "Failed to create bill" });
    }
  });

  app.put("/api/accounts-payable/:id", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.updateAccountsPayable(Number(req.params.id), req.body);
      res.json(bill);
    } catch (e) {
      console.error("accounts-payable update error:", e);
      res.status(500).json({ message: "Failed to update bill" });
    }
  });

  app.delete("/api/accounts-payable/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAccountsPayable(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      console.error("accounts-payable delete error:", e);
      res.status(500).json({ message: "Failed to delete bill" });
    }
  });

  app.post("/api/accounts-payable/:id/receive", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.receiveAccountsPayable(Number(req.params.id), req.body.vendorDrNumber || "");
      res.json(bill);
    } catch (e) {
      console.error("accounts-payable receive error:", e);
      res.status(500).json({ message: "Failed to mark as received" });
    }
  });

  // --- Counter Receipts ---
  app.get("/api/counter-receipts", isAuthenticated, async (req, res) => {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const receipts = await storage.getCounterReceipts(includeArchived);
      res.json(receipts);
    } catch (e) {
      console.error("counter-receipts list error:", e);
      res.status(500).json({ message: "Failed to fetch counter receipts" });
    }
  });

  app.get("/api/counter-receipts/:id", isAuthenticated, async (req, res) => {
    try {
      const receipt = await storage.getCounterReceiptById(Number(req.params.id));
      if (!receipt) return res.status(404).json({ message: "Not found" });
      res.json(receipt);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch counter receipt" });
    }
  });

  app.post("/api/counter-receipts", isAuthenticated, async (req, res) => {
    try {
      const { receipt, checks, apInvoiceIds } = req.body as {
        receipt: any;
        checks: any[];
        apInvoiceIds: number[];
      };
      const created = await storage.createCounterReceipt(
        { ...receipt, companyId: 1 },
        checks
      );
      if (apInvoiceIds && apInvoiceIds.length > 0) {
        await storage.bulkMarkCountered(apInvoiceIds, created.id);
      }
      res.status(201).json(created);
    } catch (e) {
      console.error("counter-receipts create error:", e);
      res.status(500).json({ message: "Failed to create counter receipt" });
    }
  });

  app.put("/api/counter-receipts/:id", isAuthenticated, async (req, res) => {
    try {
      const { receipt, checks } = req.body as { receipt: any; checks: any[] };
      const updated = await storage.updateCounterReceipt(Number(req.params.id), receipt, checks || []);
      res.json(updated);
    } catch (e) {
      console.error("counter-receipts update error:", e);
      res.status(500).json({ message: "Failed to update counter receipt" });
    }
  });

  app.delete("/api/counter-receipts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCounterReceipt(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      console.error("counter-receipts delete error:", e);
      res.status(500).json({ message: "Failed to delete counter receipt" });
    }
  });

  app.get("/api/counter-receipts/:id/payments", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getCounterReceiptPayments(Number(req.params.id));
      res.json(payments);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/counter-receipts/:id/payments", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.addCounterReceiptPayment(Number(req.params.id), req.body);
      res.status(201).json(payment);
    } catch (e) {
      console.error("cr payment error:", e);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  app.patch("/api/counter-receipts/:id/status", isAuthenticated, async (req, res) => {
    try {
      await storage.updateCounterReceiptStatus(Number(req.params.id), req.body.status);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // --- Billing Collections ---
  app.get("/api/billing-collections", isAuthenticated, async (req, res) => {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const collections = await storage.getBillingCollections(includeArchived);
      res.json(collections);
    } catch (e) {
      console.error("billing-collections list error:", e);
      res.status(500).json({ message: "Failed to fetch billing collections" });
    }
  });

  app.post("/api/billing-collections", isAuthenticated, async (req, res) => {
    try {
      const { collection, items } = req.body as { collection: any; items: any[] };
      const created = await storage.createBillingCollection({ ...collection, companyId: 1 }, items || []);
      res.status(201).json(created);
    } catch (e) {
      console.error("billing-collections create error:", e);
      res.status(500).json({ message: "Failed to create billing collection" });
    }
  });

  app.get("/api/billing-collections/:id/payments", isAuthenticated, async (req, res) => {
    try {
      const coll = await storage.getBillingCollectionById(Number(req.params.id));
      res.json(coll?.payments || []);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/billing-collections/:id/payments", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.addBillingCollectionPayment(Number(req.params.id), req.body);
      res.status(201).json(payment);
    } catch (e) {
      console.error("bc payment error:", e);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  app.patch("/api/billing-collections/:id/status", isAuthenticated, async (req, res) => {
    try {
      await storage.updateBillingCollectionStatus(Number(req.params.id), req.body.status);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/billing-collections/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(billingCollectionItems).where(eq(billingCollectionItems.billingCollectionId, Number(req.params.id)));
      await db.delete(billingCollectionPayments).where(eq(billingCollectionPayments.billingCollectionId, Number(req.params.id)));
      await db.delete(billingCollections).where(eq(billingCollections.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e) {
      console.error("bc delete error:", e);
      res.status(500).json({ message: "Failed to delete billing collection" });
    }
  });

  // --- Admin: User Management ---
  // --- Supplier Checks Report ---
  app.get("/api/supplier-checks-report", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await storage.getSupplierChecksReport(startDate, endDate);
      res.json(data);
    } catch (e) {
      console.error("supplier-checks-report error:", e);
      res.status(500).json({ message: "Failed to fetch supplier checks report" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (e) {
      console.error("admin users error (returning fallback):", e);
      res.json([
        { id: "admin-1", username: "admin", firstName: "System", lastName: "Administrator", role: "admin", isActive: true, companyId: 1 }
      ]);
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const user = await storage.createAdminUser(req.body);
      res.status(201).json(user);
    } catch (e: any) {
      console.error("admin create user error:", e);
      if (e.code === '23505') return res.status(400).json({ message: "Username already taken" });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-status", async (req, res) => {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await storage.toggleUserStatus(userId, req.body.isActive);
      res.json(user);
    } catch (e) {
      console.error("admin toggle status error:", e);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await storage.updateUser(userId, req.body);
      res.json(user);
    } catch (e) {
      console.error("admin update user error:", e);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const sessionUserId = (req.session as any)?.userId;
      if (userId && sessionUserId && userId === sessionUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (e) {
      console.error("admin delete user error:", e);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/companies", async (_req, res) => {
    try {
      const dbList = await storage.getCompanies().catch(() => []);
      const posCustomers = getPosCustomers();

      const primary = { id: 1, name: "TruckGear Philippines Co.", address: "Main Office", phone: "0917-000-0000", tin: "000-000-000", logoUrl: "", isPrimary: true };

      const nameSet = new Set<string>();
      const combined: any[] = [primary];
      nameSet.add(primary.name.toLowerCase());

      for (const item of dbList) {
        if (item.name && !nameSet.has(item.name.toLowerCase())) {
          nameSet.add(item.name.toLowerCase());
          combined.push(item);
        }
      }

      let idCounter = 100;
      for (const c of posCustomers) {
        const cName = (c.name || c.registeredName || c.company || "").trim();
        if (cName && cName.toUpperCase() !== "CASH PAYMENT" && cName.toUpperCase() !== "WALK-IN CUSTOMER" && !nameSet.has(cName.toLowerCase())) {
          nameSet.add(cName.toLowerCase());
          combined.push({
            id: idCounter++,
            name: cName,
            address: c.address || c.businessAddress || "",
            phone: c.phone || c.contact || "",
            tin: c.tin || "",
            logoUrl: "",
            isPosDirectory: true,
          });
        }
      }

      res.json(combined);
    } catch (e) {
      console.error("companies error:", e);
      res.json([
        { id: 1, name: "TruckGear Philippines Co.", address: "Main Office", phone: "0917-000-0000", tin: "000-000-000", logoUrl: "", isPrimary: true },
        { id: 100, name: "PH GLOBAL JET EXPRESS INC.", address: "20TH & 21ST FLOORS, ECOPRIME, BGC, TAGUIG", phone: "", tin: "010-133-971-00000", logoUrl: "", isPosDirectory: true }
      ]);
    }
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (e) {
      console.error("company create error:", e);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.upsertCompany(Number(req.params.id), req.body);
      res.json(company);
    } catch (e) {
      console.error("company upsert error:", e);
      res.status(500).json({ message: "Failed to save company" });
    }
  });

  app.delete("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (id === 1) return res.status(400).json({ message: "Cannot delete the primary company" });
      await storage.deleteCompany(id);
      res.json({ success: true });
    } catch (e) {
      console.error("company delete error:", e);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // --- Sales Invoices List (for Billing Collection & Check Summary) ---
  app.get("/api/sales-invoices", isAuthenticated, async (req, res) => {
    try {
      const { status, paymentMethod, registeredName } = req.query as Record<string, string>;
      const conditions: any[] = [];
      if (status) conditions.push(eq(salesInvoices.status, status));
      if (paymentMethod) conditions.push(eq(salesInvoices.paymentMethod, paymentMethod));
      if (registeredName) conditions.push(ilike(salesInvoices.registeredName, `%${registeredName}%`));
      let q = db.select().from(salesInvoices).$dynamic();
      if (conditions.length === 1) q = q.where(conditions[0]);
      else if (conditions.length > 1) q = q.where(and(...conditions));
      const invoices = await q.orderBy(desc(salesInvoices.date));
      res.json(invoices);
    } catch (err) {
      console.error("sales-invoices list error:", err);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // --- Get single invoice with items ---
  app.get("/api/sales-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      const items = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.salesInvoiceId, id));
      res.json({ ...inv, items });
    } catch (err) {
      console.error("sales-invoice get error:", err);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // --- Update invoice + replace items ---
  app.put("/api/sales-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { items, ...raw } = req.body;
      // Sanitize empty strings → null for date and integer columns to prevent Postgres type errors
      const invoiceData = {
        ...raw,
        checkMaturityDate: raw.checkMaturityDate || null,
        netDays: raw.netDays !== "" && raw.netDays != null ? Number(raw.netDays) : null,
        gcashRef: raw.gcashRef || null,
        checkBankName: raw.checkBankName || null,
        checkNumber: raw.checkNumber || null,
        poNumber: raw.poNumber || null,
      };
      await db.update(salesInvoices).set(invoiceData).where(eq(salesInvoices.id, id));
      if (Array.isArray(items)) {
        await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.salesInvoiceId, id));
        if (items.length > 0) {
          await db.insert(salesInvoiceItems).values(
            items.map((it: any) => ({
              salesInvoiceId: id,
              itemDescription: it.itemDescription || it.description || "",
              quantity: Number(it.quantity) || 1,
              unitPrice: String(it.unitPrice || it.price || 0),
              amount: String(it.amount || (Number(it.quantity) * Number(it.unitPrice || it.price || 0))),
            }))
          );
        }
      }
      const [updated] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
      const updatedItems = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.salesInvoiceId, id));
      res.json({ ...updated, items: updatedItems });
    } catch (err) {
      console.error("sales-invoice update error:", err);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  // --- Delete a sales invoice ---
  app.delete("/api/sales-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.salesInvoiceId, id));
      await db.delete(salesInvoices).where(eq(salesInvoices.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error("sales-invoice delete error:", err);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // --- Bulk update sales invoice status (e.g. mark as BILLED) ---
  app.patch("/api/sales-invoices/bulk-status", isAuthenticated, async (req, res) => {
    try {
      const { ids, status } = req.body as { ids: number[]; status: string };
      if (!ids?.length) return res.json({ updated: 0 });
      await db.update(salesInvoices).set({ status }).where(inArray(salesInvoices.id, ids));
      res.json({ updated: ids.length });
    } catch (err) {
      console.error("bulk-status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // --- POS: VAT Invoices ---
  app.post("/api/vat-invoices", isAuthenticated, async (req, res) => {
    try {
      const { invoice, items } = req.body;
      const method = (invoice.paymentMethod || "CASH").toUpperCase();
      const isNet = method === "NET_DAYS";
      const [newInv] = await db
        .insert(salesInvoices)
        .values({
          invoiceNumber: invoice.invoiceNo,
          registeredName: invoice.customer?.name || "Walk-in Customer",
          tin: invoice.customer?.tin || "",
          businessAddress: invoice.customer?.address || "",
          "totalAmount_Due": String(Number(invoice.totalAmountDue ?? invoice.totalAmount_Due ?? 0).toFixed(2)),
          vatableSales: invoice.vatableSales ? String(Number(invoice.vatableSales).toFixed(2)) : null,
          vatAmount: invoice.vatAmount ? String(Number(invoice.vatAmount).toFixed(2)) : null,
          withholdingTax: invoice.withholdingTax ? String(Number(invoice.withholdingTax).toFixed(2)) : null,
          drawerSessionId: invoice.drawerSessionId || null,
          paymentMethod: method,
          status: isNet ? "UNPAID" : "PAID",
          gcashRef: method === "GCASH" ? (invoice.gcashRef || null) : null,
          checkBankName: method === "CHECK" ? (invoice.checkBankName || null) : null,
          checkNumber: method === "CHECK" ? (invoice.checkNumber || null) : null,
          checkMaturityDate: method === "CHECK" ? (invoice.checkMaturityDate || null) : null,
          netDays: isNet ? (invoice.netDays || null) : null,
          poNumber: isNet ? (invoice.poNumber || null) : null,
          companyId: 1,
          customerId: invoice.customer?.id || null,
          branchArea: invoice.customer?.branchArea || null,
          internalRemarks: invoice.customer?.internalRemarks || null,
        })
        .returning();

      if (items && items.length > 0) {
        await db.insert(salesInvoiceItems).values(
          items.map((item: any) => ({
            salesInvoiceId: newInv.id,
            itemDescription: item.description || item.name,
            quantity: Number(item.qty ?? item.quantity ?? 1),
            unitPrice: String(item.price ?? item.unitPrice ?? 0),
            amount: String((Number(item.qty ?? item.quantity ?? 1)) * Number(item.price ?? item.unitPrice ?? 0)),
          }))
        );

        // Deduct stock for inventory items (those with a productId)
        for (const item of items) {
          const productId = item.productId;
          if (!productId) continue;
          const qty = Number(item.qty ?? item.quantity ?? 1);
          await db
            .update(products)
            .set({ stockQuantity: sql`${products.stockQuantity} - ${qty}` })
            .where(eq(products.id, productId));
          await db.insert(inventoryTransactions).values({
            productId,
            quantity: -qty,
            type: "sale",
            referenceType: "pos_invoice",
            referenceId: newInv.id,
          });
        }
      }

      // Feature 6: Auto-create billing collection for NET_DAYS invoices
      if (isNet) {
        const totalDue = Number(invoice.totalAmountDue ?? invoice.totalAmount_Due ?? 0);
        const [bc] = await db.insert(billingCollections).values({
          customerName: invoice.customer?.name || "Walk-in Customer",
          customerTin: invoice.customer?.tin || null,
          customerAddress: invoice.customer?.address || null,
          collectionDate: new Date().toISOString().split("T")[0],
          totalAmount: String(totalDue.toFixed(2)),
          amountPaid: "0",
          status: "ACTIVE",
          companyId: 1,
        }).returning();
        await db.insert(billingCollectionItems).values({
          billingCollectionId: bc.id,
          salesInvoiceId: newInv.id,
          drNo: null,
          poNo: invoice.poNumber || null,
          amount: String(totalDue.toFixed(2)),
        });
      }

      res.json({ success: true, invoiceId: newInv.id, invoiceNumber: newInv.invoiceNumber });
    } catch (err) {
      console.error("vat-invoices error:", err);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // --- Shopify Integration ---
  function getShopifyClient(): Shopify | null {
    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!storeUrl || !apiKey) return null;
    return new Shopify({
      shopName: storeUrl.replace('.myshopify.com', ''),
      accessToken: apiKey,
      apiVersion: '2024-01',
      autoLimit: true,
    });
  }

  app.get("/api/shopify/status", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.json({ connected: false, message: "Shopify credentials not configured" });
    try {
      const shop = await shopify.shop.get();
      res.json({ connected: true, shop: { name: shop.name, domain: shop.domain, email: shop.email, currency: shop.currency, plan: shop.plan_name } });
    } catch (e: any) {
      res.json({ connected: false, message: e.message || "Failed to connect to Shopify" });
    }
  });

  app.get("/api/shopify/products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const products = await shopify.product.list({ limit: 250 });
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch Shopify products" });
    }
  });

  app.post("/api/shopify/import-products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const shopifyProducts = await shopify.product.list({ limit: 250 });
      let imported = 0, skipped = 0;
      const errors: string[] = [];
      for (const sp of shopifyProducts) {
        const variant = sp.variants?.[0];
        const sku = variant?.sku || `SHOPIFY-${sp.id}`;
        try {
          const existing = await storage.getProductBySku(sku);
          if (existing) { skipped++; continue; }
          await storage.createProduct({
            sku, name: sp.title,
            category: sp.product_type || "Imported",
            brand: sp.vendor || null,
            costPrice: String(variant?.compare_at_price || variant?.price || "0"),
            sellingPrice: String(variant?.price || "0"),
            stockQuantity: variant?.inventory_quantity ?? 0,
            reorderPoint: 5,
            imageUrl: sp.image?.src || null,
          }, [], []);
          imported++;
        } catch (e: any) {
          errors.push(`${sp.title}: ${e.message}`);
        }
      }
      res.json({ imported, skipped, errors, total: shopifyProducts.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to import products" });
    }
  });

  app.post("/api/shopify/export-products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const localProducts = await storage.getProducts();
      let exported = 0, skipped = 0;
      const errors: string[] = [];
      for (const lp of localProducts) {
        try {
          const existing = await shopify.product.list({ limit: 1, title: lp.name });
          if (existing.length > 0) { skipped++; continue; }
          await shopify.product.create({
            title: lp.name, product_type: lp.category, vendor: lp.brand || undefined,
            variants: [{ sku: lp.sku, price: String(lp.sellingPrice), compare_at_price: String(lp.costPrice), inventory_management: "shopify", inventory_quantity: lp.stockQuantity }],
          });
          exported++;
        } catch (e: any) {
          errors.push(`${lp.name}: ${e.message}`);
        }
      }
      res.json({ exported, skipped, errors, total: localProducts.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to export products" });
    }
  });

  app.post("/api/shopify/sync-inventory", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const shopifyProducts = await shopify.product.list({ limit: 250 });
      const localProducts = await storage.getProducts();
      let synced = 0;
      const details: any[] = [];
      for (const sp of shopifyProducts) {
        const variant = sp.variants?.[0];
        if (!variant?.sku) continue;
        const local = localProducts.find((p: any) => p.sku === variant.sku);
        if (!local) continue;
        details.push({ sku: variant.sku, name: sp.title, shopifyQty: variant.inventory_quantity ?? 0, localQty: local.stockQuantity, status: (variant.inventory_quantity ?? 0) === local.stockQuantity ? "in_sync" : "out_of_sync" });
        synced++;
      }
      res.json({ synced, details });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to sync inventory" });
    }
  });

  app.get("/api/shopify/orders", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const orders = await shopify.order.list({ limit: 50, status: "any" });
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch Shopify orders" });
    }
  });

  // ── AI Bridge Endpoint ───────────────────────────────────────────────────
  app.post("/api/ai/execute", async (req, res) => {
    const token = req.headers["x-ai-bridge-token"];
    const expectedToken = process.env.AI_BRIDGE_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ success: false, error: "Unauthorized: invalid or missing AI_BRIDGE_TOKEN" });
    }

    const { action, entity, id, data, search } = req.body as {
      action: string;
      entity: string;
      id?: number;
      data?: any;
      search?: string;
    };

    if (!action || !entity) {
      return res.status(400).json({ success: false, error: "Missing required fields: action and entity" });
    }

    try {
      // PRODUCTS
      if (entity === "products") {
        if (action === "list") {
          const result = await storage.getProducts(search);
          return res.json({ success: true, data: result });
        }
        if (action === "get") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          const result = await storage.getProduct(id);
          if (!result) return res.status(404).json({ success: false, error: "Product not found" });
          return res.json({ success: true, data: result });
        }
        if (action === "create") {
          if (!data) return res.status(400).json({ success: false, error: "data required" });
          const { oemNumbers, compatibility, ...productData } = data;
          const result = await storage.createProduct(productData, oemNumbers, compatibility);
          return res.status(201).json({ success: true, data: result });
        }
        if (action === "update") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          if (!data) return res.status(400).json({ success: false, error: "data required" });
          const { oemNumbers, compatibility, ...productData } = data;
          const result = await storage.updateProduct(id, productData, oemNumbers, compatibility);
          return res.json({ success: true, data: result });
        }
        if (action === "delete") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          await storage.deleteProduct(id);
          return res.json({ success: true, message: "Product deleted" });
        }
      }

      // CUSTOMERS
      if (entity === "customers") {
        if (action === "list") {
          const result = await storage.getCustomers();
          return res.json({ success: true, data: result });
        }
        if (action === "get") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          const result = await storage.getCustomer(id);
          if (!result) return res.status(404).json({ success: false, error: "Customer not found" });
          return res.json({ success: true, data: result });
        }
        if (action === "create") {
          if (!data) return res.status(400).json({ success: false, error: "data required" });
          const result = await storage.createCustomer(data);
          return res.status(201).json({ success: true, data: result });
        }
      }

      // SALES ORDERS
      if (entity === "sales_orders") {
        if (action === "list") {
          const result = await storage.getSalesOrders();
          return res.json({ success: true, data: result });
        }
        if (action === "get") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          const result = await storage.getSalesOrder(id);
          if (!result) return res.status(404).json({ success: false, error: "Sales order not found" });
          return res.json({ success: true, data: result });
        }
      }

      // PURCHASE ORDERS
      if (entity === "purchase_orders") {
        if (action === "list") {
          const result = await storage.getPurchaseOrders();
          return res.json({ success: true, data: result });
        }
        if (action === "get") {
          if (!id) return res.status(400).json({ success: false, error: "id required" });
          const result = await storage.getPurchaseOrder(id);
          if (!result) return res.status(404).json({ success: false, error: "Purchase order not found" });
          return res.json({ success: true, data: result });
        }
      }

      return res.status(400).json({ success: false, error: `Unknown entity '${entity}' or action '${action}'` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  });

  return httpServer;
}
