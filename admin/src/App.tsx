import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import LiveOrders from "./pages/LiveOrders";
import Drivers from "./pages/Drivers";
import Analytics from "./pages/Analytics";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import SupportIssues from "./pages/SupportIssues";
import SupportChat from "./pages/SupportChat";
import OrderDetail from "./pages/OrderDetail";
import Users from "./pages/Users";
import Vendors from "./pages/Vendors";
import MeatCenters from "./pages/MeatCenters";
import MeatPricing from "./pages/MeatPricing";
import VendorLogin from "./pages/VendorLogin";
import Zones from "./pages/Zones";

import VendorDashboard from "./pages/VendorDashboard";
import VendorScheduledOrders from "./pages/VendorScheduledOrders";
import VendorMenu from "./pages/VendorMenu";
import VendorMeatMenu from "./pages/VendorMeatMenu";
import VendorSettings from "./pages/VendorSettings";
import Coupons from "./pages/Coupons";
import UserDetail from "./pages/UserDetail";
import DriverDetail from "./pages/DriverDetail";
import NotFound from "./pages/NotFound";
import AppVersions from "./pages/AppVersions";
import DevDrivers from "./pages/DevDrivers";

const RootRedirect = () => {
  const adminToken = localStorage.getItem("admin_token");
  const vendorToken = localStorage.getItem("vendor_token");
  const supportToken = localStorage.getItem("support_token");
  
  if (adminToken) return <Dashboard />;
  if (supportToken) return <Navigate to="/support-cases" replace />;
  if (vendorToken) return <Navigate to="/vendor/dashboard" replace />;
  return <Navigate to="/vendor-login" replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/live-orders" element={<LiveOrders />} />
          <Route path="/live-orders/:id" element={<OrderDetail />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/dev-drivers" element={<DevDrivers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support-cases" element={<SupportIssues />} />
          <Route path="/support/chats" element={<SupportChat />} />
          <Route path="/support/chats/:id" element={<SupportChat />} />
          <Route path="/users" element={<Users />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/meat-centers" element={<MeatCenters />} />
          <Route path="/meat-pricing" element={<MeatPricing />} />
          <Route path="/zones" element={<Zones />} />
          <Route path="/vendor-login" element={<VendorLogin />} />

          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/scheduled-orders" element={<VendorScheduledOrders />} />
          <Route path="/vendor/menu" element={<VendorMenu />} />
          <Route path="/vendor/meat-menu" element={<VendorMeatMenu />} />
          <Route path="/vendor/settings" element={<VendorSettings />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/drivers/:id" element={<DriverDetail />} />
          <Route path="/app-updates" element={<AppVersions />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
