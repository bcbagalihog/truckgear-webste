import { Link, useLocation } from "wouter";
import logoImg from "@assets/Ben_Anthony_Bagalihog_A_simple,_minimalist_logo_featuring_a_bl_1770796859768.png";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Store,
  LogOut,
  BarChart3,
  Calculator,
  ChevronRight,
  ShieldCheck,
  LayoutGrid, // New icon for the POS Terminal
  MessageSquare,
  BookOpen,
  CreditCard,
} from "lucide-react";
import { SiShopify } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Check if the current user is an admin or Ben
  const isAdmin = user?.role === "admin" || user?.username === "TTPS";

  // Streamlined Staff & Admin Menu Structure
  const menuGroups = [
    {
      group: "Finance & Verification",
      items: [
        { icon: CreditCard, label: "Client Payments Verification", href: "/admin/payments" },
        { icon: Truck, label: "Logistics & DR Manager", href: "/admin/logistics" },
      ],
    },
    {
      group: "Administration",
      items: [
        { icon: Users, label: "Client Accounts Manager", href: "/admin/users" },
      ],
    },
  ];

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "U"
    );
  };

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : "User";

  return (
    <div className="print:hidden h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      <div className="p-6">
        <a
          href="/"
          className="flex items-center gap-3 cursor-pointer group no-underline"
        >
          <img
            src={logoImg}
            alt="TruckGear Logo"
            className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="font-extrabold text-sm tracking-widest uppercase text-white font-mono leading-none">
              TRUCKGEAR
            </h1>
            <p className="text-[10px] text-yellow-400 font-mono tracking-wider uppercase mt-1 font-bold">
              PARTSMAN OS
            </p>
          </div>
        </a>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {menuGroups.map((group) => {
          return (
            <div key={group.group}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 font-mono">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-200 group ${
                        isActive
                          ? "bg-yellow-400 text-slate-950 font-black shadow-lg shadow-yellow-400/25"
                          : "text-slate-400 hover:bg-slate-900 hover:text-yellow-400"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-slate-950 font-bold"
                            : "text-slate-400 group-hover:text-yellow-400"
                        }`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-slate-950" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border ring-2 ring-primary/5">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-none mb-1">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate italic leading-none">
              @{user?.username}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
