import { useState, useEffect, useRef, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  UserPlus, ShieldCheck, Lock, Unlock, Loader2,
  Building2, ArrowLeft, Pencil, Trash2, X, Upload, ImagePlus, Save, PlusCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_COMPANY = { name: "", address: "", phone: "", tin: "", logoUrl: "" };

export default function UserManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "companies">("users");

  // ── Users State ──
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({ username: "", password: "", firstName: "", lastName: "", role: "staff", companyId: 1 });

  const [editUser, setEditUser] = useState<any>(null);
  const [editData, setEditData] = useState({ username: "", firstName: "", lastName: "", role: "staff", companyId: 1, newPassword: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Company State ──
  const [companyForms, setCompanyForms] = useState<any[]>([]);
  const [savingCompany, setSavingCompany] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<number | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState<any>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ ...EMPTY_COMPANY });
  const [isSavingNew, setIsSavingNew] = useState(false);
  const logoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [posCustomers, setPosCustomers] = useState<any[]>([]);

  // Fetch on mount
  useEffect(() => { 
    fetchAll(); 
    fetchPosCustomers();
  }, []);

  const fetchPosCustomers = async () => {
    try {
      const res = await fetch("/api/pos/customers");
      if (res.ok) {
        const data = await res.json();
        setPosCustomers(data);
      }
    } catch (err) {
      console.error("Failed to load POS customer vault:", err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/companies", { credentials: "include" }),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const companiesData = companiesRes.ok ? await companiesRes.json() : [];
      setUsers(usersData);
      setCompanies(companiesData);
      setCompanyForms(companiesData.map((c: any) => ({ ...c })));
    } catch {
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Unified Robust Company List for Dropdown Selection ──
  const companyList = useMemo(() => {
    const map = new Map<string, any>();
    
    // Always add primary company first
    map.set("truckgear philippines co.", { id: 1, name: "TruckGear Philippines Co. (Primary Staff)" });

    // Add companies from API
    for (const c of companies) {
      if (c.name && !map.has(c.name.toLowerCase())) {
        map.set(c.name.toLowerCase(), { id: c.id, name: c.name, isPos: c.isPosDirectory });
      }
    }

    // Add from POS Customers vault
    let posCounter = 100;
    for (const pc of posCustomers) {
      const pName = (pc.name || pc.registeredName || pc.company || "").trim();
      if (pName && pName.toUpperCase() !== "CASH PAYMENT" && pName.toUpperCase() !== "WALK-IN CUSTOMER" && !map.has(pName.toLowerCase())) {
        map.set(pName.toLowerCase(), { id: pc.id || posCounter++, name: pName, isPos: true });
      }
    }

    // Emergency fallbacks so dropdown is NEVER empty
    if (!map.has("ph global jet express inc.")) {
      map.set("ph global jet express inc.", { id: 100, name: "PH GLOBAL JET EXPRESS INC.", isPos: true });
    }
    if (!map.has("acs manufacturing corporation")) {
      map.set("acs manufacturing corporation", { id: 101, name: "ACS MANUFACTURING CORPORATION", isPos: true });
    }
    if (!map.has("fdrp")) {
      map.set("fdrp", { id: 102, name: "FDRP", isPos: true });
    }

    return Array.from(map.values());
  }, [companies, posCustomers]);

  const getCompanyName = (companyId: number) => {
    const c = companyList.find(c => Number(c.id) === Number(companyId));
    return c?.name || (companyId === 1 ? "TruckGear Philippines Co." : "PH GLOBAL JET EXPRESS INC.");
  };

  // ── Create User ──
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        toast({ title: "Account created!" });
        setNewUser({ username: "", password: "", firstName: "", lastName: "", role: "staff", companyId: companies[0]?.id || 1 });
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsCreating(false); }
  };

  // ── Toggle Status ──
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    if (res.ok) { toast({ title: "Access updated" }); fetchAll(); }
  };

  // ── Edit User ──
  const openEdit = (u: any) => {
    setEditUser(u);
    setEditData({
      username: u.username || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      role: u.role,
      companyId: u.companyId,
      newPassword: ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setIsSavingEdit(true);
    try {
      const payload: any = {
        username: editData.username,
        firstName: editData.firstName,
        lastName: editData.lastName,
        role: editData.role,
        companyId: editData.companyId
      };
      if (editData.newPassword.trim()) payload.password = editData.newPassword.trim();
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "User updated" });
        setEditUser(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsSavingEdit(false); }
  };

  // ── Delete User ──
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Account deleted" });
        setDeleteTarget(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsDeleting(false); }
  };

  // ── Company helpers ──
  const updateCompanyForm = (id: number, field: string, value: string) => {
    setCompanyForms(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // ── Save Existing Company ──
  const handleSaveCompany = async (company: any) => {
    setSavingCompany(company.id);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: company.name, address: company.address, phone: company.phone, tin: company.tin, logoUrl: company.logoUrl }),
      });
      if (res.ok) {
        toast({ title: `${company.name || "Company"} saved` });
        fetchAll();
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setSavingCompany(null); }
  };

  // ── Add New Company ──
  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setIsSavingNew(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        toast({ title: `${newCompany.name} added!` });
        setNewCompany({ ...EMPTY_COMPANY });
        setIsAddingCompany(false);
        fetchAll();
      } else {
        toast({ title: "Failed to add company", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setIsSavingNew(false); }
  };

  // ── Delete Company ──
  const handleDeleteCompany = async () => {
    if (!confirmDeleteCompany) return;
    setDeletingCompany(confirmDeleteCompany.id);
    try {
      const res = await fetch(`/api/companies/${confirmDeleteCompany.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: `${confirmDeleteCompany.name} removed` });
        setConfirmDeleteCompany(null);
        fetchAll();
      } else {
        const err = await res.json();
        toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setDeletingCompany(null); }
  };

  // ── Logo Upload ──
  const handleLogoUpload = async (companyId: number, file: File) => {
    setUploadingLogo(companyId);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { imageUrl } = await res.json();
        const updatedForms = companyForms.map(c => c.id === companyId ? { ...c, logoUrl: imageUrl } : c);
        setCompanyForms(updatedForms);
        const updated = updatedForms.find(c => c.id === companyId);
        if (updated) {
          await fetch(`/api/companies/${companyId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          toast({ title: "Logo uploaded!" });
          fetchAll();
        }
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch { toast({ title: "Upload error", variant: "destructive" }); }
    finally { setUploadingLogo(null); }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Sidebar />
      <main className="flex-1 pl-64 p-8 space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-widest uppercase text-white flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-amber-500" />
              Client Accounts Manager
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Manage staff accounts and customer directory profiles.</p>
          </div>
        </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
        {[{ key: "users", label: "User Accounts", icon: UserPlus }, { key: "companies", label: "Company Settings", icon: Building2 }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${activeTab === key ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20" : "text-slate-400 hover:text-white"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ══ USERS TAB ══ */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden sticky top-6">
              <div className="bg-slate-950 border-b border-slate-800 p-4">
                <h2 className="font-bold text-white uppercase tracking-wider text-xs font-mono flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-yellow-400" /> Add New Employee
                </h2>
              </div>
              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">First Name</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400"
                      value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Last Name</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400"
                      value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Login Username</label>
                  <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400"
                    value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Temporary Password</label>
                  <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400"
                    value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Role</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400 font-bold"
                      value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="staff">Staff (Internal / Limited)</option>
                      <option value="client">Client Account (Portal Access)</option>
                      <option value="admin">System Admin (Full Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Company / Client</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-yellow-400 font-bold"
                      value={newUser.companyId} onChange={(e) => setNewUser({ ...newUser, companyId: Number(e.target.value) })}>
                      {companyList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isPos ? " [POS Vault Client]" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button disabled={isCreating} type="submit"
                  className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs py-3 rounded-lg transition-all shadow-lg shadow-yellow-400/20 flex justify-center items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </button>
              </form>
            </div>
          </div>

          {/* User Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-bold">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Role & Company</th>
                    <th className="p-4 text-center">Access</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-800/80 text-slate-200">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id} className={`hover:bg-muted/50 transition-colors ${!u.isActive ? "opacity-60 bg-muted/30" : ""}`}>
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {u.firstName?.[0] || "U"}{u.lastName?.[0] || ""}
                          </div>
                          {u.firstName} {u.lastName}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">@{u.username}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-max px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-secondary text-secondary-foreground"}`}>
                            {u.role}
                          </span>
                          <span className="flex items-center text-[11px] text-muted-foreground font-medium">
                            <Building2 className="h-3 w-3 mr-1" />{getCompanyName(u.companyId)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                          {u.isActive ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {u.isActive ? "ACTIVE" : "LOCKED"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => toggleUserStatus(u.id, u.isActive)} className="text-xs font-medium text-primary hover:text-primary/80 hover:underline">
                            {u.isActive ? "Disable" : "Restore"}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setDeleteTarget(u)} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:underline">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPANY SETTINGS TAB ══ */}
      {activeTab === "companies" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-mono">
              {companyForms.length} {companyForms.length === 1 ? "company" : "companies"} registered.
              Company names appear in user account dropdowns.
            </p>
            <button onClick={() => { setIsAddingCompany(true); setNewCompany({ ...EMPTY_COMPANY }); }}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-400/20 font-mono uppercase tracking-wider cursor-pointer">
              <PlusCircle className="h-4 w-4" /> Add Company
            </button>
          </div>

          {/* ── Add Company Form ── */}
          {isAddingCompany && (
            <div className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 shadow-2xl space-y-4">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
                <PlusCircle className="h-4 w-4" /> New Company
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 font-mono">Company Name <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g. Sister Company 3" autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-bold font-mono"
                    value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 font-mono">Business Address</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-mono"
                    value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 font-mono">Phone</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-mono"
                    value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 font-mono">TIN</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-mono"
                    value={newCompany.tin} onChange={(e) => setNewCompany({ ...newCompany, tin: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsAddingCompany(false)} className="px-4 py-2 text-xs font-mono border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleAddCompany} disabled={isSavingNew}
                  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black px-5 py-2 rounded-lg transition-all shadow-lg shadow-yellow-400/20 font-mono uppercase tracking-wider">
                  {isSavingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save New Company
                </button>
              </div>
            </div>
          )}

          {/* ── Existing Company Cards ── */}
          {loading ? (
            <div className="text-center py-12 text-yellow-400 font-mono"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading companies...</div>
          ) : companyForms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono border-2 border-dashed border-slate-800 rounded-2xl">
              No companies yet. Click "Add Company" to create one.
            </div>
          ) : companyForms.map((company) => (
            <div key={company.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6">
              <div className="flex items-start justify-between mb-5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Building2 className="h-4 w-4 text-yellow-400" />
                  {company.name || `Company ${company.id}`}
                  {company.id === 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-full uppercase tracking-wider font-mono">Primary</span>
                  )}
                  {company.isPosDirectory && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 rounded-full uppercase tracking-wider font-mono">POS Vault Client</span>
                  )}
                </h3>
                {company.id !== 1 && (
                  <button onClick={() => setConfirmDeleteCompany(company)}
                    className="flex items-center gap-1.5 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 px-2.5 py-1 rounded-lg transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center bg-slate-950 overflow-hidden">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-slate-600" />
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                    ref={el => { logoInputRefs.current[company.id] = el; }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(company.id, f); }} />
                  <button type="button" onClick={() => logoInputRefs.current[company.id]?.click()}
                    disabled={uploadingLogo === company.id}
                    className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 border border-slate-800 rounded-lg hover:bg-slate-950 transition-colors text-slate-300">
                    {uploadingLogo === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {company.logoUrl ? "Change Logo" : "Upload Logo"}
                  </button>
                  {company.logoUrl && (
                    <button type="button" onClick={() => updateCompanyForm(company.id, "logoUrl", "")}
                      className="text-xs font-mono text-red-400 hover:text-red-300">Remove logo</button>
                  )}
                </div>

                {/* Fields */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Company Name</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-bold"
                      value={company.name} onChange={(e) => updateCompanyForm(company.id, "name", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Business Address</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none"
                      value={company.address || ""} onChange={(e) => updateCompanyForm(company.id, "address", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none"
                      value={company.phone || ""} onChange={(e) => updateCompanyForm(company.id, "phone", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">TIN</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-mono"
                      value={company.tin || ""} onChange={(e) => updateCompanyForm(company.id, "tin", e.target.value)} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button type="button" onClick={() => handleSaveCompany(company)} disabled={savingCompany === company.id}
                      className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-400/20 font-mono uppercase tracking-wider">
                      {savingCompany === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ EDIT USER MODAL ══ */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
              <h2 className="font-bold text-white text-xs font-mono uppercase tracking-wider">Edit Account — @{editUser.username}</h2>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 font-mono text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Login Username / Email</label>
                <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-bold font-mono"
                  value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">First Name</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none"
                    value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Last Name</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none"
                    value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Role</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-bold"
                    value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                    <option value="staff">Staff (Internal / Limited)</option>
                    <option value="client">Client Account (Portal Access)</option>
                    <option value="admin">System Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Company / Client</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-bold"
                    value={editData.companyId} onChange={(e) => setEditData({ ...editData, companyId: Number(e.target.value) })}>
                    {companyList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isPos ? " [POS Vault Client]" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  New Password <span className="text-slate-500 normal-case font-normal">(leave blank to keep current)</span>
                </label>
                <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-yellow-400 outline-none font-mono"
                  placeholder="••••••••" value={editData.newPassword} onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-950">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-xs font-mono border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSavingEdit}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-400/20 uppercase font-mono">
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE USER MODAL ══ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-950/50 border border-red-900/50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm font-mono">Delete Account?</h2>
                <p className="text-xs text-slate-400 font-mono">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 my-4">
              Permanently delete the account for <span className="font-bold text-white">{deleteTarget.firstName} {deleteTarget.lastName}</span> (@{deleteTarget.username})?
            </p>
            <div className="flex justify-end gap-3 font-mono text-xs">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleDeleteUser} disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-lg transition-colors">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE COMPANY MODAL ══ */}
      {confirmDeleteCompany && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm font-mono">Remove Company?</h2>
                <p className="text-xs text-slate-400 font-mono">Users assigned to this company will keep their assignment but the company name will no longer appear.</p>
              </div>
            </div>
            <p className="text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 my-4">
              Remove <span className="font-bold text-white">{confirmDeleteCompany.name}</span> from the company list?
            </p>
            <div className="flex justify-end gap-3 font-mono text-xs">
              <button onClick={() => setConfirmDeleteCompany(null)} className="px-4 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleDeleteCompany} disabled={deletingCompany === confirmDeleteCompany.id}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-lg transition-colors">
                {deletingCompany === confirmDeleteCompany.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
