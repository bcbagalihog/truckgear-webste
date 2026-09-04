import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import POS from "./pages/POS";
import Inventory from "@/pages/Inventory";
import Purchases from "@/pages/Purchases";
import Customers from "@/pages/Customers";
import Vendors from "@/pages/Vendors";
import Reports from "@/pages/Reports";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Accounting from "@/pages/accounting";
import UserManagement from "@/pages/UserManagement";
import PendingPaymentsList from "@/pages/PendingPaymentsList";
import PaymentCenterPage from "@/pages/PaymentCenterPage";
import PortalHubPage from "@/pages/PortalHubPage";
import OperationsDashboardView from "@/pages/operations/OperationsDashboardView";
import WarehouseInventoryView from "@/pages/operations/WarehouseInventoryView";
import FleetOperationsView from "@/pages/operations/FleetOperationsView";
import MaintenanceRequestsView from "@/pages/operations/MaintenanceRequestsView";
import ReliabilityAnalyticsView from "@/pages/operations/ReliabilityAnalyticsView";
import DirectoryView from "@/pages/operations/DirectoryView";
import RfqComparisonView from "@/pages/operations/RfqComparisonView";
import ProcurementView from "@/pages/operations/ProcurementView";
import LogisticsModuleView from "@/pages/LogisticsModuleView";
import ClientExpenditureLedgerView from "@/pages/ClientExpenditureLedgerView";
import PublicCompanyWebsite from "@/pages/PublicCompanyWebsite";
import PartsmanLandingPage from "@/pages/PartsmanLandingPage";
import PublicCatalogPage from "@/pages/PublicCatalogPage";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* ─── PUBLIC WEBSITE & LANDING PAGES ─── */}
      <Route path="/" component={PublicCompanyWebsite} />
      <Route path="/partsman" component={PartsmanLandingPage} />
      <Route path="/catalog" component={PublicCatalogPage} />

      {/* ─── AUTHENTICATION GATEWAY ─── */}
      <Route path="/login" component={Login} />
      <Route path="/portal/login" component={Login} />

      {/* ─── CLIENT PORTAL SUITE ─── */}
      <Route path="/portal" component={PortalHubPage} />
      <Route path="/payment" component={PaymentCenterPage} />
      <Route path="/logistics" component={LogisticsModuleView} />
      <Route path="/expenditure" component={ClientExpenditureLedgerView} />

      {/* ─── CLIENT PARTS OPERATIONS SUITE ─── */}
      <Route path="/inventory" component={OperationsDashboardView} />
      <Route path="/inventory/parts" component={WarehouseInventoryView} />
      <Route path="/inventory/fleet" component={FleetOperationsView} />
      <Route path="/inventory/maintenance" component={MaintenanceRequestsView} />
      <Route path="/inventory/rfq" component={RfqComparisonView} />
      <Route path="/inventory/reliability" component={ReliabilityAnalyticsView} />
      <Route path="/inventory/directory" component={DirectoryView} />
      <Route path="/inventory/procurement" component={ProcurementView} />

      {/* ─── STAFF ADMIN SUITE ─── */}
      <Route path="/admin/payments">
        <ProtectedRoute component={PendingPaymentsList} />
      </Route>
      <Route path="/admin/logistics">
        <ProtectedRoute component={LogisticsModuleView} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={UserManagement} />
      </Route>
      <Route path="/admin/inventory">
        <ProtectedRoute component={Inventory} />
      </Route>
      <Route path="/pos">
        <ProtectedRoute component={POS} />
      </Route>

      {/* ─── INTERNAL LEDGERS & DIRECTORIES ─── */}
      <Route path="/purchases">
        <ProtectedRoute component={Purchases} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={Customers} />
      </Route>
      <Route path="/vendors">
        <ProtectedRoute component={Vendors} />
      </Route>
      <Route path="/accounting">
        <ProtectedRoute component={Accounting} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>

      {/* ─── LEGACY FALLBACK REDIRECTS ─── */}
      <Route path="/sales">
        <Redirect to="/pos" />
      </Route>
      <Route path="/vat-invoice">
        <Redirect to="/pos" />
      </Route>
      <Route path="/products">
        <Redirect to="/catalog" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
