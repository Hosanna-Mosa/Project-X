import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live-orders" element={<LiveOrders />} />
          <Route path="/live-orders/:id" element={<OrderDetail />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/multi-stop" element={<MultiStopOrders />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/support" element={<Support />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
