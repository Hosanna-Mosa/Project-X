import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import LiveOrders from "./pages/LiveOrders";
import Drivers from "./pages/Drivers";
import Analytics from "./pages/Analytics";
import MultiStopOrders from "./pages/MultiStopOrders";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import OrderDetail from "./pages/OrderDetail";
import Users from "./pages/Users";
import Vendors from "./pages/Vendors";
import MeatCenters from "./pages/MeatCenters";
import MeatPricing from "./pages/MeatPricing";
import VendorLogin from "./pages/VendorLogin";

import VendorDashboard from "./pages/VendorDashboard";
import VendorMenu from "./pages/VendorMenu";
import VendorMeatMenu from "./pages/VendorMeatMenu";
import VendorSettings from "./pages/VendorSettings";
import NotFound from "./pages/NotFound";

const RootRedirect = () => {
  const adminToken = localStorage.getItem("admin_token");
  const vendorToken = localStorage.getItem("vendor_token");
  
  if (adminToken) return <Dashboard />;
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
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/multi-stop" element={<MultiStopOrders />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/support" element={<Support />} />
          <Route path="/users" element={<Users />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/meat-centers" element={<MeatCenters />} />
          <Route path="/meat-pricing" element={<MeatPricing />} />
          <Route path="/vendor-login" element={<VendorLogin />} />

          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/menu" element={<VendorMenu />} />
          <Route path="/vendor/meat-menu" element={<VendorMeatMenu />} />
          <Route path="/vendor/settings" element={<VendorSettings />} />
          <Route path="/settings" element={<NotFound />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
