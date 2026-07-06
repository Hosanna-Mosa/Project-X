import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RefreshCw, Timer, Truck, SlidersHorizontal, Plus, Download, MoreVertical, Star, GitBranch, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LiveOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    customer: "",
    pickup: "",
    dropoff: "",
    deliveryFee: "150"
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => adminFetch<any[]>("/admin/orders"),
  });

  const activeOrdersCount = orders.filter((o: any) => ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP", "searching_driver", "driver_assigned"].includes(o.status)).length;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrder.customer || !manualOrder.pickup || !manualOrder.dropoff) {
      toast.error("Please fill in all order details.");
      return;
    }
    toast.success(`Manual dispatch initiated for ${manualOrder.customer}! Searching closest driver...`);
    setIsManualOpen(false);
    setManualOrder({ customer: "", pickup: "", dropoff: "", deliveryFee: "150" });
  };

  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  return (
    <DashboardLayout searchPlaceholder="Search orders, drivers...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Live Orders</h1>
            <p className="page-subtitle">Real-time monitoring of all active shipments across the network.</p>
          </div>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <SlidersHorizontal className="h-4 w-4" /> Filter: {statusFilter}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("ALL")} className="cursor-pointer">All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("SEARCHING_DRIVER")} className="cursor-pointer">Searching Driver</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("DRIVER_ASSIGNED")} className="cursor-pointer">Driver Assigned</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("IN_TRANSIT")} className="cursor-pointer">In Transit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("DELIVERED")} className="cursor-pointer">Delivered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("CANCELLED")} className="cursor-pointer">Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button 
              onClick={() => setIsManualOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Manual Order
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<RefreshCw className="h-5 w-5" />} label="Total Orders" value={orders.length.toString()} badge="Overall" badgeColor="success" />
          <StatCard icon={<Timer className="h-5 w-5" />} label="Active Operations" value={activeOrdersCount.toString()} />
          <StatCard icon={<Truck className="h-5 w-5" />} label="Live In-Transit" value={orders.filter((o: any) => o.status === "PICKED_UP").length.toString()} />
        </div>

        {/* Table */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse-dot" />
              <h3 className="text-lg font-semibold text-foreground">Ongoing Operations</h3>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">Order ID</th>
                <th className="table-header-text text-left px-6 py-3">User</th>
                <th className="table-header-text text-left px-6 py-3">Stops</th>
                <th className="table-header-text text-left px-6 py-3">Status</th>
                <th className="table-header-text text-left px-6 py-3">Assigned Driver</th>
                <th className="table-header-text text-left px-6 py-3">ETA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Loading orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No orders found matching the filter.</td>
                </tr>
              ) : (
                filteredOrders.map((o: any) => (
                  <tr key={o._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      <Link to={`/live-orders/${o._id}`} className="hover:underline">
                        {o._id.startsWith("ORD-") ? o._id : `#${o._id.substring(o._id.length - 6).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {o.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "U"}
                        </div>
                        <span className="text-sm text-foreground">{o.user?.name || "Unknown User"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {o.stops?.length === 1 ? <MapPin className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
                        {o.stops?.length || 0} stops
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={o.status} variant={o.status === "DELIVERED" ? "delivered" : o.status === "PICKED_UP" ? "transit" : "assigned"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!o.driver ? "italic text-muted-foreground" : "text-foreground"}`}>{o.driver?.user?.name || "Awaiting assignment..."}</span>
                        {o.driver && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-warning text-warning" /> 4.8
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className={`text-xs text-muted-foreground`}>Created</p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{orders.length}</span> results</p>
            <div className="flex gap-1">
              <button 
                onClick={() => toast.info("No previous pages")}
                className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted/50"
              >
                Previous
              </button>
              <button 
                onClick={() => toast.info("No next pages")}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* FAB */}
        <button 
          onClick={() => setIsManualOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Manual Dispatch Dialog */}
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manual Order Dispatch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name</label>
              <Input 
                value={manualOrder.customer} 
                onChange={e => setManualOrder({...manualOrder, customer: e.target.value})} 
                placeholder="e.g. Alice Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup Location (Store / Restaurant)</label>
              <Input 
                value={manualOrder.pickup} 
                onChange={e => setManualOrder({...manualOrder, pickup: e.target.value})} 
                placeholder="e.g. McDonald's - Downtown"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dropoff Destination</label>
              <Input 
                value={manualOrder.dropoff} 
                onChange={e => setManualOrder({...manualOrder, dropoff: e.target.value})} 
                placeholder="e.g. 456 Elm St, Suite 4"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Delivery Fare (₹)</label>
              <Input 
                value={manualOrder.deliveryFee} 
                onChange={e => setManualOrder({...manualOrder, deliveryFee: e.target.value})} 
                placeholder="150"
              />
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground">
              Dispatch Order
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
