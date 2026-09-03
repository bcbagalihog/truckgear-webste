import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  FileSpreadsheet,
  BookOpen,
  Image as ImageIcon,
  Bot,
  Pencil,
  Search,
  Grid,
  List,
  Truck,
  Zap,
  Droplet,
  Package,
} from "lucide-react";

interface ExtractedItem {
  id?: string;
  category: string;
  subcategory: string;
  oemNumber: string;
  partName: string;
  compatibleBrand: string;
  compatibleModels: string;
  supplierGrossPrice: string;
  discountRate: string;
  netCost: string;
  imageBoundingBox?: number[] | null;
  croppedImagePath?: string | null;
}

interface CatalogPart {
  id?: number;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  fitment: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  imageUrl?: string;
}

export default function CatalogAiIngestion() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"generator" | "editor">("generator");
  const [editorSource, setEditorSource] = useState<"retail" | "supplier">("retail");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Generator State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [compressedBase64, setCompressedBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [supplierTitle, setSupplierTitle] = useState("");
  const [discountHeader, setDiscountHeader] = useState("");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [syncToProducts, setSyncToProducts] = useState(false);

  // Editor State
  const [editorParts, setEditorParts] = useState<CatalogPart[]>([]);
  const [supplierParts, setSupplierParts] = useState<CatalogPart[]>([]);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedFitment, setSelectedFitment] = useState("ALL");

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogPart | null>(null);

  // Fetch PostgreSQL parts when entering Editor tab or changing source
  useEffect(() => {
    if (activeTab === "editor") {
      fetchEditorParts();
    }
  }, [activeTab, editorSource]);

  const fetchEditorParts = async () => {
    setIsLoadingEditor(true);
    try {
      if (editorSource === "retail") {
        const res = await fetch("/api/products?cb=" + Date.now());
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            const mapped: CatalogPart[] = raw.map((p: any) => ({
              id: p.id,
              sku: p.sku || p.oemNumber || "TG-OEM",
              name: p.name || p.partName || "Genuine Truck Part",
              category: p.category || "General Spares",
              brand: p.brand || p.compatibleBrand || "TruckGear",
              fitment: p.compatibility || p.compatibleModels || "Universal",
              costPrice: parseFloat(p.costPrice || p.cost || p.netCost || 0),
              sellingPrice: parseFloat(p.sellingPrice || p.price || 0) || (parseFloat(p.costPrice || 0) * 1.35),
              stockQuantity: parseInt(p.stockQuantity || p.stock || 10),
              imageUrl: p.imageUrl || p.croppedImagePath || "",
            }));
            setEditorParts(mapped);
          }
        }
      } else {
        const res = await fetch("/api/admin/supplier-catalog?cb=" + Date.now());
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            const mapped: CatalogPart[] = raw.map((s: any) => ({
              id: s.id,
              sku: s.oemNumber || s.sku || "SUP-OEM",
              name: s.partName || s.name || "Scanned Supplier Part",
              category: s.category || "General Parts",
              brand: s.compatibleBrand || "Supplier Reference",
              fitment: s.compatibleModels || "Universal Fitment",
              costPrice: parseFloat(s.netCost || s.supplierGrossPrice || 0),
              sellingPrice: parseFloat(s.netCost || s.supplierGrossPrice || 0) * 1.35,
              stockQuantity: 10,
              imageUrl: s.croppedImagePath || "",
            }));
            setSupplierParts(mapped);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load catalog parts:", err);
    } finally {
      setIsLoadingEditor(false);
    }
  };

  // Compress image on canvas to max 1600px width & ~0.8 quality JPEG
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
    const reader = new FileReader();
    reader.onload = async (event) => {
      let base64Data = event.target?.result as string;

      if (isHeic) {
        try {
          const res = await fetch("/api/convert-heic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64Data }),
          });
          if (res.ok) {
            const data = await res.json();
            base64Data = data.imageBase64;
          }
        } catch (err) {
          console.error("HEIC convert error:", err);
        }
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setPreviewImage(dataUrl);
          setCompressedBase64(dataUrl);
        }
      };
      img.src = base64Data;
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!compressedBase64) {
      toast({
        title: "No Image Selected",
        description: "Please snap or upload a catalog page photo first.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch("/api/agent/scan-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to scan catalog page");
      }

      const result = await response.json();
      setSupplierTitle(result.supplier || "Supplier Price Book");
      setDiscountHeader(result.discountHeader || "");

      const mapped = (result.items || []).map((it: any, idx: number) => ({
        ...it,
        id: `item-${Date.now()}-${idx}`,
      }));
      setItems(mapped);

      toast({
        title: "Scan Successful! 🎉",
        description: `Extracted ${mapped.length} parts and ${result.croppedCount || 0} product thumbnails.`,
      });
    } catch (err: any) {
      toast({
        title: "Catalog Extraction Error",
        description: err.message || "Could not extract catalog page.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ExtractedItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === "supplierGrossPrice" || field === "discountRate") {
        const gross = parseFloat(current.supplierGrossPrice) || 0;
        const disc = parseFloat(current.discountRate) || 0;
        current.netCost = (gross * (1 - disc / 100)).toFixed(2);
      }
      updated[index] = current;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        category: "General",
        subcategory: "",
        oemNumber: `TG-OEM-${Math.floor(1000 + Math.random() * 9000)}`,
        partName: "New Catalog Item",
        compatibleBrand: "Universal",
        compatibleModels: "Universal",
        supplierGrossPrice: "0.00",
        discountRate: "0.00",
        netCost: "0.00",
        croppedImagePath: null,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (items.length === 0) {
      toast({
        title: "No Items to Commit",
        description: "Please scan a page or add items before committing.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/catalog-ai/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, syncToProducts }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to commit items");
      }

      const result = await response.json();
      toast({
        title: "Committed to PostgreSQL! 🚀",
        description: `Successfully ingested ${result.count} parts into inventory & auto-synced master_pricelist_2026.md!`,
      });

      setItems([]);
      setPreviewImage(null);
      setCompressedBase64(null);
      setActiveTab("editor");
    } catch (err: any) {
      toast({
        title: "Commit Error",
        description: err.message || "Failed to commit items.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Editor Actions
  const handleOpenAddModal = () => {
    setEditingItem({
      sku: `TG-PART-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      category: "General Spares",
      brand: "TruckGear",
      fitment: "Universal",
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 10,
      imageUrl: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CatalogPart) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveModalPart = async () => {
    if (!editingItem || !editingItem.name) {
      toast({ title: "Validation Error", description: "Part name is required.", variant: "destructive" });
      return;
    }

    try {
      const isEdit = !!editingItem.id;
      const url = isEdit ? `/api/products/${editingItem.id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        sku: editingItem.sku,
        name: editingItem.name,
        category: editingItem.category,
        brand: editingItem.brand || "TruckGear",
        compatibility: editingItem.fitment,
        costPrice: editingItem.costPrice.toFixed(2),
        sellingPrice: editingItem.sellingPrice.toFixed(2),
        stockQuantity: editingItem.stockQuantity,
        imageUrl: editingItem.imageUrl,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: "Saved to Database! 🎉", description: `Part "${editingItem.name}" updated successfully.` });
        setIsModalOpen(false);
        fetchEditorParts();
      } else {
        const err = await res.json();
        throw new Error(err.message || "Failed to save part");
      }
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePart = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this part from PostgreSQL?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Part Deleted", description: "Product removed from catalog." });
        fetchEditorParts();
      } else {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
  };

  // Filtering editor parts
  const activePartsList = editorSource === "retail" ? editorParts : supplierParts;

  const filteredEditorParts = activePartsList.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesText =
      !q ||
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.fitment.toLowerCase().includes(q);
    const matchesCat = selectedCategory === "ALL" || p.category.toUpperCase().includes(selectedCategory);
    const matchesFit = selectedFitment === "ALL" || p.fitment.toUpperCase().includes(selectedFitment);
    return matchesText && matchesCat && matchesFit;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-amber-500" />
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              AI Catalog Generator & Parts Editor
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 uppercase font-mono font-bold">
              PARTSMAN AI Brain
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Scan supplier price books with AI vision, edit part details & photos, and publish live to PostgreSQL & tgphparts.com/catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "generator" ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.heic,.heif"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 border-slate-700 hover:bg-slate-800 font-bold"
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                Snap / Upload Page
              </Button>

              <Button
                onClick={handleScan}
                disabled={!compressedBase64 || isScanning}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Gemini Vision...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Scan Catalog Page with AI
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleOpenAddModal}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-2 uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              Add New Catalog Part
            </Button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-900 border border-slate-800">
          <TabsTrigger value="generator" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold uppercase tracking-wider text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            AI Catalog Generator
          </TabsTrigger>
          <TabsTrigger value="editor" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold uppercase tracking-wider text-xs">
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Catalog Parts Editor ({editorParts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI CATALOG GENERATOR */}
        <TabsContent value="generator" className="space-y-6 pt-4">
          {previewImage && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 border rounded-xl p-4 bg-card shadow-sm space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <ImageIcon className="h-4 w-4 text-sky-400" />
                  Scanned Page Source
                </h3>
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                  <img src={previewImage} alt="Catalog preview" className="object-cover w-full h-full" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                  <p>• Scaled canvas: Max 1600px width</p>
                  <p>• Quality: 0.8 JPEG (~300KB)</p>
                  <p>• Destination: Agent #6 + PARTSMAN AI</p>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                {items.length === 0 && !isScanning && (
                  <div className="border border-dashed rounded-xl p-12 text-center space-y-3 bg-muted/20">
                    <Bot className="h-10 w-10 mx-auto text-amber-400" />
                    <h3 className="font-semibold text-lg uppercase font-mono">Ready to Scan Supplier Items</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Click <strong>"Scan Catalog Page with AI"</strong> above. Gemini 2.5 Flash will extract OEM numbers, category headers, vehicle fitments, calculate net costs, and crop product photos.
                    </p>
                  </div>
                )}

                {isScanning && (
                  <div className="border rounded-xl p-12 text-center space-y-4 bg-muted/10">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-amber-500" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-foreground uppercase">Analyzing Catalog Grid...</h3>
                      <p className="text-sm text-muted-foreground">
                        Parsing OEM part numbers, vehicle fitments (Isuzu, Hino, Fuso), global discounts, and generating sub-image crops.
                      </p>
                    </div>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="border rounded-xl p-4 bg-card space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
                      <div>
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2 uppercase">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                          Extracted Catalog Items ({items.length})
                        </h3>
                        <p className="text-xs text-amber-400 font-mono">
                          {supplierTitle} {discountHeader && `• Header Discount: ${discountHeader}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                          <Checkbox checked={syncToProducts} onCheckedChange={(c) => setSyncToProducts(!!c)} />
                          Auto-sync to Main Inventory Products (35% Retail Margin)
                        </label>

                        <Button size="sm" variant="outline" onClick={handleAddItem} className="flex items-center gap-1 text-xs border-dashed">
                          <Plus className="h-3.5 w-3.5" /> Add Row
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader className="bg-muted/50 font-mono text-xs uppercase">
                          <TableRow>
                            <TableHead className="w-16 text-center">Photo</TableHead>
                            <TableHead className="w-32">OEM Number</TableHead>
                            <TableHead className="w-48">Part Name</TableHead>
                            <TableHead className="w-28">Category</TableHead>
                            <TableHead className="w-36">Fitment / Models</TableHead>
                            <TableHead className="w-28 text-right">Gross (₱)</TableHead>
                            <TableHead className="w-24 text-right">Disc %</TableHead>
                            <TableHead className="w-28 text-right text-emerald-400">Net Cost (₱)</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => (
                            <TableRow key={item.id || idx}>
                              <TableCell>
                                <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                  {item.croppedImagePath ? (
                                    <img src={item.croppedImagePath} alt="Crop" className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input value={item.oemNumber} onChange={(e) => handleItemChange(idx, "oemNumber", e.target.value)} className="h-8 font-mono text-xs" />
                              </TableCell>
                              <TableCell>
                                <Input value={item.partName} onChange={(e) => handleItemChange(idx, "partName", e.target.value)} className="h-8 text-xs" />
                              </TableCell>
                              <TableCell>
                                <Input value={item.category} onChange={(e) => handleItemChange(idx, "category", e.target.value)} className="h-8 text-xs" />
                              </TableCell>
                              <TableCell>
                                <Input value={item.compatibleModels} onChange={(e) => handleItemChange(idx, "compatibleModels", e.target.value)} className="h-8 text-xs" placeholder="e.g. Isuzu 6HK1" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={item.supplierGrossPrice} onChange={(e) => handleItemChange(idx, "supplierGrossPrice", e.target.value)} className="h-8 text-xs font-semibold text-right" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={item.discountRate} onChange={(e) => handleItemChange(idx, "discountRate", e.target.value)} className="h-8 text-xs text-right text-amber-500 font-bold" />
                              </TableCell>
                              <TableCell className="font-bold text-xs text-emerald-400 text-right font-mono">
                                ₱{Number(item.netCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-red-400">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button onClick={handleCommit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 uppercase tracking-wider">
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving to PostgreSQL & Knowledge Base...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Commit to Inventory & Publish Live
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!previewImage && (
            <div className="border border-dashed rounded-2xl p-16 text-center space-y-4 bg-slate-900/40">
              <BookOpen className="h-16 w-16 mx-auto text-amber-500 opacity-80" />
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase text-white tracking-wide">Ready to Digitize Supplier Price Books</h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto font-medium">
                  Snap or upload a photo of a printed truck parts catalog page. Gemini Vision AI will automatically detect part numbers, prices, and crop product photos.
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-8 py-3 uppercase tracking-widest text-xs">
                Snap / Upload Page Photo
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CATALOG PARTS EDITOR */}
        <TabsContent value="editor" className="space-y-6 pt-4">
          {/* OPTION 1 DATA SOURCE TOGGLE */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <Button
              type="button"
              variant={editorSource === "retail" ? "default" : "ghost"}
              onClick={() => setEditorSource("retail")}
              className={`font-bold font-mono text-xs uppercase tracking-wider ${
                editorSource === "retail" ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4 mr-2" /> 🛒 Public Retail Catalog ({editorParts.length})
            </Button>
            
            <Button
              type="button"
              variant={editorSource === "supplier" ? "default" : "ghost"}
              onClick={() => setEditorSource("supplier")}
              className={`font-bold font-mono text-xs uppercase tracking-wider ${
                editorSource === "supplier" ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" /> 📚 Supplier AI Reference Pool ({supplierParts.length > 0 ? supplierParts.length : 2565})
            </Button>
          </div>

          {/* TOOLBAR */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search SKU, Part Name, Fitment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-xs font-mono"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-amber-400 text-xs font-mono font-bold py-2 px-3 rounded-md"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>Category: {c}</option>
                ))}
              </select>

              <select
                value={selectedFitment}
                onChange={(e) => setSelectedFitment(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-sky-400 text-xs font-mono font-bold py-2 px-3 rounded-md"
              >
                {fitments.map((f) => (
                  <option key={f} value={f}>Fitment: {f}</option>
                ))}
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-2 border border-slate-800 bg-slate-950 p-1 rounded-lg shrink-0">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className={`h-8 text-xs font-bold ${viewMode === "grid" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}
              >
                <Grid className="w-3.5 h-3.5 mr-1" />
                Card Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => setViewMode("table")}
                className={`h-8 text-xs font-bold ${viewMode === "table" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}
              >
                <List className="w-3.5 h-3.5 mr-1" />
                Table List
              </Button>
            </div>
          </div>

          {/* LOADING STATE */}
          {isLoadingEditor && (
            <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-xl">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono font-bold text-slate-400 uppercase">Loading Live PostgreSQL Catalog Parts...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoadingEditor && filteredEditorParts.length === 0 && (
            <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-xl space-y-2">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold uppercase text-white">No Matching Catalog Parts</h3>
              <p className="text-xs text-slate-400">Try adjusting your filters or add a new part above.</p>
            </div>
          )}

          {/* CARD GRID VIEW (Matching tgphparts.com/catalog) */}
          {!isLoadingEditor && filteredEditorParts.length > 0 && viewMode === "grid" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredEditorParts.map((p, idx) => (
                <div key={p.id || idx} className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg">
                  <div>
                    <div className="aspect-video bg-slate-950 relative overflow-hidden border-b border-slate-800 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="text-center p-4">
                          <Truck className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                          <span className="text-[10px] font-mono text-slate-400 font-bold block">TRUCKGEAR GENUINE</span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950/90 text-amber-400 font-mono font-bold text-[10px] rounded border border-slate-800">
                        {p.sku}
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded uppercase">
                          {p.category}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded uppercase">
                          {p.fitment}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                        {p.name}
                      </h3>

                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl flex justify-between items-baseline font-mono text-xs">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">RETAIL PRICE:</span>
                        <span className="text-base font-black text-amber-500">
                          ₱{p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                        <span className="text-emerald-400 font-bold">● {p.stockQuantity > 0 ? `${p.stockQuantity} IN STOCK` : 'AVAILABLE ON ORDER'}</span>
                        <span className="text-slate-500">Cost: ₱{p.costPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEditModal(p)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Part
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDeletePart(p.id)}
                      className="h-8 w-8 border-slate-800 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLE LIST VIEW */}
          {!isLoadingEditor && filteredEditorParts.length > 0 && viewMode === "table" && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-900 font-mono text-xs uppercase">
                  <TableRow>
                    <TableHead className="w-16 text-center">Photo</TableHead>
                    <TableHead className="w-36">SKU / OEM</TableHead>
                    <TableHead>Part Description</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-36">Fitment</TableHead>
                    <TableHead className="w-28 text-right text-emerald-400">Cost (₱)</TableHead>
                    <TableHead className="w-32 text-right text-amber-500">Retail Price (₱)</TableHead>
                    <TableHead className="w-20 text-center">Stock</TableHead>
                    <TableHead className="w-24 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredEditorParts.map((p) => (
                    <TableRow key={p.id} className="border-b border-slate-850">
                      <TableCell className="text-center">
                        <div className="w-10 h-10 rounded border border-slate-800 bg-slate-900 mx-auto overflow-hidden flex items-center justify-center">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Truck className="w-4 h-4 text-amber-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-amber-400">{p.sku}</TableCell>
                      <TableCell className="font-bold text-white">{p.name}</TableCell>
                      <TableCell className="text-slate-400">{p.category}</TableCell>
                      <TableCell className="text-sky-400 font-bold">{p.fitment}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-400">₱{p.costPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-black text-amber-500">₱{p.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold">{p.stockQuantity}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenEditModal(p)} className="h-7 w-7 text-amber-400 hover:text-amber-300">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeletePart(p.id)} className="h-7 w-7 text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ITEM EDITOR MODAL / DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-amber-500 font-mono">
              {editingItem?.id ? "Edit Catalog Item" : "Add New Catalog Part"}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* PHOTO UPLOAD HERO CARD */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                  {editingItem.imageUrl ? (
                    <img src={editingItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Truck className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-amber-400 font-mono font-bold text-xs uppercase">Product Image / Photo</Label>
                  <p className="text-[11px] text-slate-400 font-medium">Upload or snap a new product photo for this item.</p>
                  
                  <input
                    type="file"
                    id="dialog-file-input"
                    accept="image/*,.heic,.heif"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("image", file);
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                        if (res.ok) {
                          const data = await res.json();
                          setEditingItem({ ...editingItem, imageUrl: data.imageUrl });
                        } else {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setEditingItem({ ...editingItem, imageUrl: evt.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      } catch (_) {}
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById("dialog-file-input")?.click()}
                    className="h-7 text-xs border-slate-700 font-bold text-emerald-400 flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> Upload / Snap Photo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">OEM SKU / Part Number</Label>
                  <Input
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-mono font-bold text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">Category</Label>
                  <Input
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-bold text-white"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">Part Description / Name</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-bold text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">Fitment Models</Label>
                  <Input
                    value={editingItem.fitment}
                    onChange={(e) => setEditingItem({ ...editingItem, fitment: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-bold text-sky-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">Stock Quantity</Label>
                  <Input
                    type="number"
                    value={editingItem.stockQuantity}
                    onChange={(e) => setEditingItem({ ...editingItem, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="bg-slate-900 border-slate-800 font-bold text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-emerald-400 uppercase font-mono">Cost Price (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.costPrice}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value) || 0;
                      setEditingItem({
                        ...editingItem,
                        costPrice: cost,
                        sellingPrice: parseFloat((cost * 1.35).toFixed(2)),
                      });
                    }}
                    className="bg-slate-900 border-slate-800 font-mono font-bold text-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-amber-400 uppercase font-mono">Retail Selling Price (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.sellingPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-900 border-slate-800 font-mono font-bold text-amber-500"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-400 uppercase font-mono">Image URL / Path</Label>
                  <Input
                    value={editingItem.imageUrl}
                    onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                    placeholder="/uploads/product.jpg"
                    className="bg-slate-900 border-slate-800 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveModalPart} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase tracking-wider">
              Save to PostgreSQL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
