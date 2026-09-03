import { useState, useEffect } from "react";
import PartsOperationsLayout from "@/components/PartsOperationsLayout";
import { useAuth } from "@/hooks/use-auth";

interface PartRequest {
  id: string;
  fleetUnit: string;
  partNumber: string;
  name: string;
  qty: number;
  priority: "Routine" | "Urgent" | "AOG (Aircraft on Ground / Truck Down)";
  status: "Pending Dispatch" | "Pending Purchase" | "On Order" | "Ready to Install" | "Dispatched" | "Completed";
  timestamp: string;
  partPhotoUrl?: string;
  gpsLocation?: string;
  mechanicMessage?: string;
}

export default function MaintenanceRequestsView() {
  const { user } = useAuth();
  const clientCompany = user?.registeredName || user?.company || "PH GLOBAL JET EXPRESS INC.";
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>("Ready");
  const [selectedPhotoModalUrl, setSelectedPhotoModalUrl] = useState<string | null>(null);

  const [fleetUnits, setFleetUnits] = useState<{id: string, model: string, plate: string}[]>([
    { id: "UNIT-101", model: "Isuzu Giga", plate: "ABC-1234" },
    { id: "UNIT-102", model: "Fuso Super Great", plate: "DEF-5678" },
    { id: "UNIT-103", model: "Hino 700", plate: "GHI-9012" }
  ]);

  const initialRequests: PartRequest[] = [
    {
      id: "REQ-1021",
      fleetUnit: "Isuzu Giga (ABC-1234)",
      partNumber: "TG-BELT-404",
      name: "Premium Alternator Fan Belt",
      qty: 2,
      priority: "Urgent",
      status: "Pending Dispatch",
      timestamp: "2026-05-17 08:32 AM",
      gpsLocation: "Lat: 14.5082, Long: 120.9984",
      mechanicMessage: "Belt snapped on SLEX near Paranaque exit. Required urgent replacement."
    },
    {
      id: "REQ-1020",
      fleetUnit: "Fuso Super Great (DEF-5678)",
      partNumber: "TG-CLUTCH-99",
      name: "Clutch Assembly Kit v2",
      qty: 1,
      priority: "AOG (Aircraft on Ground / Truck Down)",
      status: "Dispatched",
      timestamp: "2026-05-16 02:15 PM",
      gpsLocation: "Lat: 14.5200, Long: 121.0010",
      mechanicMessage: "Clutch slippage during heavy transport dispatch."
    }
  ];

  const [requests, setRequests] = useState<PartRequest[]>(initialRequests);
  const [form, setForm] = useState({
    fleetUnit: "",
    partNumber: "",
    name: "",
    qty: 1,
    priority: "Routine" as any,
    partPhotoUrl: "",
    gpsLocation: "",
    mechanicMessage: ""
  });

  // Helper to fetch actual phone GPS Location
  const getGpsCoordinates = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("Lat: 14.5082, Long: 120.9984 (Paranaque Depot)");
        return;
      }
      setGpsStatus("Fetching Phone GPS...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locStr = `Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`;
          setGpsStatus(locStr);
          resolve(locStr);
        },
        () => {
          const fallbackLoc = "Lat: 14.5082, Long: 120.9984 (Paranaque Hub)";
          setGpsStatus(fallbackLoc);
          resolve(fallbackLoc);
        },
        { timeout: 5000 }
      );
    });
  };

  // Helper to burn Watermark on Image Canvas (Date, Time, GPS, Truck Plate, Notes)
  const processImageWatermark = async (file: File, gpsText: string, truckUnit: string, notes: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // 1. Draw base photo
        ctx.drawImage(img, 0, 0);

        // 2. Draw watermark banner background
        const bannerHeight = Math.max(90, canvas.height * 0.18);
        ctx.fillStyle = "rgba(7, 9, 14, 0.88)";
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

        // 3. Top accent border line
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, Math.max(3, canvas.height * 0.006));

        // 4. Draw Watermark Typography
        const fontSize = Math.max(14, Math.floor(bannerHeight * 0.18));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const padding = Math.max(15, canvas.width * 0.025);
        let y = canvas.height - bannerHeight + padding + fontSize;

        const dateStr = new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Line 1: GPS & Location (Amber/Yellow)
        ctx.fillStyle = "#F59E0B";
        ctx.fillText(`📍 GPS LOCATION: ${gpsText}`, padding, y);
        y += fontSize * 1.35;

        // Line 2: Timestamp & Truck Unit (White)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`🕒 ${dateStr}  |  🚛 TRUCK: ${truckUnit || "Fleet Unit"}`, padding, y);
        y += fontSize * 1.35;

        // Line 3: Mechanic Field Notes (Cyan)
        if (notes) {
          ctx.fillStyle = "#38BDF8";
          const snippet = notes.length > 55 ? notes.slice(0, 55) + "..." : notes;
          ctx.fillText(`💬 MSG: "${snippet}"`, padding, y);
        }

        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  };

  const handlePartPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCameraCapture: boolean = false, reqId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);

    // Fetch Phone GPS Location
    const gps = await getGpsCoordinates();
    const truckUnit = form.fleetUnit || (fleetUnits.length > 0 ? `${fleetUnits[0].model} (${fleetUnits[0].plate})` : "");
    const notes = form.mechanicMessage;

    // Process Watermarked Blob
    const watermarkedBlob = await processImageWatermark(file, gps, truckUnit, notes);
    const watermarkedFile = new File([watermarkedBlob], `maintenance_${Date.now()}.jpg`, { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("part_photo", watermarkedFile);
    formData.append("company", clientCompany);
    if (reqId) formData.append("reqId", reqId);

    try {
      const res = await fetch("/api/inventory/maintenance/upload-photo", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, partPhotoUrl: data.imageUrl, gpsLocation: gps }));
        if (reqId) {
          const updated = requests.map(r => r.id === reqId ? { ...r, partPhotoUrl: data.imageUrl, gpsLocation: gps } : r);
          const target = updated.find(r => r.id === reqId);
          saveRequestsState(updated, target);
        }
        alert("📷 Photo captured & watermarked with Date, Time & Phone GPS location!");
      }
    } catch (err) {
      console.error("Part photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save requests to LocalStorage & Server Vault
  const saveRequestsState = (updated: PartRequest[], targetReq?: PartRequest) => {
    try {
      setRequests(updated);
      localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(updated));
      setLastSavedTime(new Date().toLocaleTimeString());

      if (targetReq) {
        fetch(`/api/inventory/maintenance/${targetReq.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetReq, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Failed to save maintenance requests:", err);
    }
  };

  // Load from LocalStorage + Server Vault API
  const fetchRequests = async () => {
    try {
      const localData = localStorage.getItem("partsman_maintenance_requests_jetexpress");
      if (localData !== null) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            setRequests(parsed);
            setLastSavedTime("Synced");
          }
        } catch {}
      }

      const res = await fetch("/api/inventory/maintenance");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRequests(data);
          localStorage.setItem("partsman_maintenance_requests_jetexpress", JSON.stringify(data));
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }

      // Load Fleet Directory to link modules
      const fleetLocal = localStorage.getItem("partsman_directory_fleet_jetexpress");
      if (fleetLocal !== null) {
        try {
          const parsedFleet = JSON.parse(fleetLocal);
          if (Array.isArray(parsedFleet)) {
            setFleetUnits(parsedFleet);
            if (parsedFleet.length > 0) {
              setForm(f => ({ ...f, fleetUnit: f.fleetUnit || `${parsedFleet[0].model} (${parsedFleet[0].plate})` }));
            }
          }
        } catch {}
      }

      const fleetRes = await fetch("/api/inventory/directory/fleet");
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (Array.isArray(fleetData)) {
          setFleetUnits(fleetData);
          if (fleetData.length > 0) {
            setForm(f => ({ ...f, fleetUnit: f.fleetUnit || `${fleetData[0].model} (${fleetData[0].plate})` }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch maintenance requests:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const targetFleetUnit = form.fleetUnit || (fleetUnits.length > 0 ? `${fleetUnits[0].model} (${fleetUnits[0].plate})` : "Unassigned Fleet Unit");

    const newReq: PartRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      fleetUnit: targetFleetUnit,
      partNumber: form.partNumber.trim() ? form.partNumber.trim().toUpperCase() : "UNASSIGNED_SKU",
      name: form.name,
      qty: form.qty,
      priority: form.priority,
      status: "Pending Dispatch",
      timestamp: new Date().toLocaleString(),
      partPhotoUrl: form.partPhotoUrl || "",
      gpsLocation: form.gpsLocation || "Lat: 14.5082, Long: 120.9984",
      mechanicMessage: form.mechanicMessage
    };

    const updated = [newReq, ...requests];
    saveRequestsState(updated, newReq);

    // Save to server API
    try {
      await fetch("/api/inventory/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newReq, company: clientCompany })
      });
    } catch (_) {}

    setForm({
      fleetUnit: fleetUnits.length > 0 ? `${fleetUnits[0].model} (${fleetUnits[0].plate})` : "",
      partNumber: "",
      name: "",
      qty: 1,
      priority: "Routine",
      partPhotoUrl: "",
      gpsLocation: "",
      mechanicMessage: ""
    });
    alert(`📱 Maintenance Request #${newReq.id} submitted for ${targetFleetUnit}! Saved to vault & shared with Purchasing & Fleet.`);
  };

  const updateStatus = (id: string, newStatus: PartRequest["status"]) => {
    const updated = requests.map(req => req.id === id ? { ...req, status: newStatus } : req);
    const target = updated.find(r => r.id === id);
    saveRequestsState(updated, target);
  };

  const installToTruck = async (req: PartRequest) => {
    const updated = requests.map(r => r.id === req.id ? { ...r, status: "Completed" as const } : r);
    saveRequestsState(updated, { ...req, status: "Completed" });

    // Extract truck plate & model name
    const plateMatch = req.fleetUnit.match(/\(([^)]+)\)/);
    const targetPlate = plateMatch ? plateMatch[1] : req.fleetUnit;
    const modelName = req.fleetUnit.replace(/\s*\([^)]*\)/, "").trim() || "Heavy Fleet Truck";

    try {
      const fleetRes = await fetch("/api/inventory/directory/fleet");
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        const targetTruck = Array.isArray(fleetData)
          ? fleetData.find((t: any) => t.plate === targetPlate || t.id === targetPlate || (t.plate && req.fleetUnit.includes(t.plate)))
          : null;

        const newAllocation = {
          partNumber: req.partNumber,
          name: req.name,
          installedAt: new Date().toISOString().split("T")[0],
          notes: req.mechanicMessage ? `Installed: ${req.mechanicMessage}` : `Installed via Maintenance Request #${req.id}.`,
          partPhotoUrl: req.partPhotoUrl || ""
        };

        let updatedTruck: any;
        if (targetTruck) {
          const existingAllocations = Array.isArray(targetTruck.allocatedParts) ? targetTruck.allocatedParts : [];
          updatedTruck = {
            ...targetTruck,
            allocatedParts: [newAllocation, ...existingAllocations]
          };
        } else {
          updatedTruck = {
            id: `UNIT-${Date.now().toString().slice(-4)}`,
            model: modelName,
            name: modelName,
            plate: targetPlate || "XYZ-1234",
            driver: "Unassigned Driver",
            route: "Depot Route",
            status: "In Service",
            allocatedParts: [newAllocation],
            company: clientCompany
          };
        }

        await fetch(`/api/inventory/fleet/${updatedTruck.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updatedTruck, company: clientCompany })
        });
      }
    } catch (err) {
      console.error("Failed to sync installed part to Fleet:", err);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm(`Delete Maintenance Request #${id}?`)) return;
    const updated = requests.filter(r => r.id !== id);
    saveRequestsState(updated);

    try {
      await fetch(`/api/inventory/maintenance/${id}`, { method: "DELETE" });
    } catch (_) {}
  };

  return (
    <PartsOperationsLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Mobile & Header Banner */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-mono">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black rounded uppercase tracking-wider">
                📱 MOBILE MECHANIC FIELD PORTAL
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                💾 VAULT {lastSavedTime && `(${lastSavedTime})`}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase font-sans mt-2">
              Maintenance Requests
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Field Part Dispatch & GPS Watermarked Repairs for <span className="text-white font-bold">{clientCompany}</span>
            </p>
          </div>
        </div>

        {/* Responsive Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Mobile-First Form Card */}
          <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-900 bg-slate-950/90 shadow-2xl space-y-5 font-mono">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                <span>🔧</span> Request Stock Parts
              </h2>
              <span className="text-[10px] text-amber-400 font-bold">FIELD INPUT</span>
            </div>

            <form onSubmit={submitRequest} className="space-y-4">
              
              {/* Target Fleet Unit */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Target Fleet Unit / Truck Plate *</label>
                <select 
                  value={form.fleetUnit}
                  onChange={(e) => setForm({...form, fleetUnit: e.target.value})}
                  className="w-full p-3.5 rounded-xl border border-slate-800 bg-black text-white text-xs font-bold cursor-pointer focus:border-amber-500 outline-none"
                  required
                >
                  <option disabled value="">Select Truck Asset</option>
                  {fleetUnits.map((unit) => (
                    <option key={unit.id} value={`${unit.model} (${unit.plate})`}>
                      {unit.model} ({unit.plate})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Part SKU & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Part SKU (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Optional (e.g. TG-BELT-404)" 
                    value={form.partNumber}
                    onChange={(e) => setForm({...form, partNumber: e.target.value})}
                    className="w-full p-3.5 rounded-xl border border-slate-800 bg-black text-white text-xs font-bold font-mono focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Part Description *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Alternator Belt" 
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full p-3.5 rounded-xl border border-slate-800 bg-black text-white text-xs font-bold focus:border-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quantity & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity *</label>
                  <input 
                    type="number" 
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({...form, qty: parseInt(e.target.value) || 1})}
                    className="w-full p-3.5 rounded-xl border border-slate-800 bg-black text-white text-xs font-bold text-center focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Priority *</label>
                  <select 
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value as any})}
                    className="w-full p-3.5 rounded-xl border border-slate-800 bg-black text-white text-xs font-bold cursor-pointer focus:border-amber-500 outline-none"
                  >
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>AOG (Truck Down)</option>
                  </select>
                </div>
              </div>

              {/* Mechanic Field Message / Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">💬 Message / Field Notes from Maintenance</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Belt snapped on SLEX highway near Shell station. Required urgent replacement."
                  value={form.mechanicMessage}
                  onChange={(e) => setForm({ ...form, mechanicMessage: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-800 bg-black text-white text-xs placeholder-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Phone Camera & Photo Inputs */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex justify-between items-center text-[10px] uppercase text-slate-400 font-bold">
                  <span>📷 Damaged Part Photo + GPS Watermark</span>
                  <span className="text-amber-400">{gpsStatus}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Button 1: Camera Trigger (capture="environment") */}
                  <label className="p-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl text-xs font-black uppercase text-center cursor-pointer transition flex items-center justify-center gap-1.5 shadow-md">
                    <span>📸 Camera</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => handlePartPhotoUpload(e, true)} 
                      className="hidden" 
                    />
                  </label>

                  {/* Button 2: Gallery Picker */}
                  <label className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-black uppercase text-center cursor-pointer transition flex items-center justify-center gap-1.5">
                    <span>📁 Gallery</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handlePartPhotoUpload(e, false)} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Image Watermark Preview */}
                {form.partPhotoUrl && (
                  <div className="p-2 bg-black border border-slate-800 rounded-xl flex items-center gap-3">
                    <img src={form.partPhotoUrl} alt="Watermarked Preview" className="h-14 w-14 object-cover rounded-lg border border-amber-500" />
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <div className="text-amber-400 font-bold">✓ Watermarked & Stamped</div>
                      <div>{form.gpsLocation}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="w-full py-4 bg-[#1E4FD8] hover:bg-blue-600 text-white font-black rounded-xl uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(30,79,216,0.4)] transition cursor-pointer mt-2"
              >
                🚀 Submit Maintenance Request
              </button>
            </form>
          </div>

          {/* Right: Active Dispatch Board */}
          <div className="lg:col-span-7 space-y-4 font-mono">
            <div className="flex justify-between items-center pl-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Active Maintenance Dispatch Board ({requests.length} Requests)
              </p>
            </div>

            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl border border-slate-900 bg-slate-950/80 hover:bg-slate-950 transition relative overflow-hidden space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    
                    <div className="space-y-2 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#1E4FD8] bg-[#1E4FD8]/10 px-2 py-0.5 rounded border border-[#1E4FD8]/30">
                          {req.id}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          req.priority.startsWith("AOG") ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          req.priority === "Urgent" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {req.priority.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        {req.partPhotoUrl && (
                          <div
                            onClick={() => setSelectedPhotoModalUrl(req.partPhotoUrl || null)}
                            className="relative group cursor-pointer flex-shrink-0"
                            title="Click to view watermarked photo"
                          >
                            <img
                              src={req.partPhotoUrl}
                              alt={req.name}
                              className="h-16 w-16 object-cover rounded-xl border border-amber-500/50 group-hover:border-amber-400 shadow-md transition"
                            />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-[9px] font-bold">
                              🔍 Zoom
                            </span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <h3 className="font-bold text-white text-base leading-tight">
                            {req.name} <span className="text-amber-400">x{req.qty}</span>
                          </h3>
                          <p className="text-xs text-slate-300">
                            Truck: <span className="text-white font-bold">{req.fleetUnit}</span> (SKU: {(!req.partNumber || req.partNumber === "UNASSIGNED_SKU") ? (
                              <span className="text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">⚠️ UNASSIGNED (Procurement Review)</span>
                            ) : (
                              <span className="text-blue-400 font-bold font-mono">{req.partNumber}</span>
                            )})
                          </p>
                          
                          {/* GPS Location & Timestamp */}
                          <div className="text-[10px] text-slate-400 space-y-0.5 pt-0.5">
                            <div>📍 {req.gpsLocation || "Paranaque Depot"}</div>
                            <div>🕒 {req.timestamp}</div>
                          </div>

                          {/* Mechanic Message */}
                          {req.mechanicMessage && (
                            <p className="text-xs text-sky-400 italic bg-sky-950/20 border border-sky-900/40 p-2 rounded-lg mt-1">
                              💬 "{req.mechanicMessage}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-3">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        req.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        req.status === "Ready to Install" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse" :
                        req.status === "Dispatched" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        req.status === "On Order" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                        req.status === "Pending Purchase" ? "bg-purple-500/20 text-purple-400 border-purple-500/40" :
                        "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 animate-pulse"
                      }`}>
                        {req.status === "Ready to Install" ? "📦 RECEIVED - READY TO INSTALL" : req.status === "On Order" ? "🚚 ON ORDER WITH SUPPLIER" : req.status}
                      </span>

                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {req.status === "Ready to Install" && (
                          <button 
                            onClick={() => installToTruck(req)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-1.5"
                          >
                            <span>🔧</span> INSTALL TO TRUCK
                          </button>
                        )}
                        {req.status === "Pending Dispatch" && (
                          <button 
                            onClick={() => updateStatus(req.id, "Dispatched")}
                            className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition uppercase tracking-wider cursor-pointer"
                          >
                            Dispatch Part
                          </button>
                        )}
                        {req.status === "Dispatched" && (
                          <button 
                            onClick={() => installToTruck(req)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition uppercase tracking-wider cursor-pointer"
                          >
                            Mark Installed
                          </button>
                        )}
                        <button
                          onClick={() => deleteRequest(req.id)}
                          className="px-2.5 py-1.5 bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white rounded-lg text-[10px] uppercase font-bold transition cursor-pointer"
                          title="Delete Request"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Lightbox Modal for Part Photo Zoom */}
        {selectedPhotoModalUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="max-w-2xl bg-[#0A0C10] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">📷 Watermarked Part Photo Lightbox</h3>
                <button onClick={() => setSelectedPhotoModalUrl(null)} className="text-slate-500 hover:text-white font-black cursor-pointer">✕</button>
              </div>
              <img src={selectedPhotoModalUrl} alt="Watermarked Part Zoom" className="max-h-[70vh] object-contain rounded-xl mx-auto border border-slate-800" />
              <button
                onClick={() => setSelectedPhotoModalUrl(null)}
                className="px-5 py-2 bg-[#1E4FD8] text-white font-bold rounded-lg text-xs uppercase hover:bg-blue-600 transition cursor-pointer font-mono"
              >
                Close Zoom
              </button>
            </div>
          </div>
        )}

      </div>
    </PartsOperationsLayout>
  );
}
