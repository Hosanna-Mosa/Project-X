import { useState, useEffect } from "react";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { Utensils, Star, Clock, IndianRupee, ChevronRight, TrendingUp, Package, Drumstick, MapPin, Phone, User, Check, ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { socketService } from "@/lib/socketService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.6);
    
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn("Failed to play chime:", e);
  }
};

export default function VendorDashboard() {
  const queryClient = useQueryClient();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const isMeatVendor = vendorData.role === "meat_vendor";
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendor-orders", vendorData._id],
    queryFn: () => adminFetch<any[]>(`/orders/vendor/${vendorData._id}`),
    enabled: !!vendorData._id
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: [isMeatVendor ? "meat-menu" : "vendor-menu", vendorData._id],
    queryFn: () => adminFetch<any[]>(isMeatVendor ? `/meat/menu/${vendorData._id}` : `/food/vendor/${vendorData._id}`),
    enabled: !!vendorData._id
  });

  useEffect(() => {
    if (!vendorData._id) return;

    // Connect and Join
    socketService.connect();
    socketService.join(vendorData._id, "VENDOR");

    // Listen for new orders
    const handleNewOrder = (data: any) => {
      console.log("[SOCKET] New order received:", data);
      playChime();
      toast.success(`New order received! Order #${data.id.slice(-6).toUpperCase()}`, {
        duration: 8000,
        action: {
          label: "Refresh",
          onClick: () => queryClient.invalidateQueries({ queryKey: ["vendor-orders", vendorData._id] })
        }
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders", vendorData._id] });
    };

    // Listen for order status updates
    const handleStatusUpdate = (data: any) => {
      console.log("[SOCKET] Order status updated:", data);
      queryClient.invalidateQueries({ queryKey: ["vendor-orders", vendorData._id] });
      
      // If the currently open modal's order is updated, we fetch it or update local state
      if (selectedOrder && selectedOrder._id === data.orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: data.status } : null);
      }
    };

    socketService.on("new_order_vendor", handleNewOrder);
    socketService.on("order_status_update_vendor", handleStatusUpdate);

    return () => {
      socketService.off("new_order_vendor", handleNewOrder);
      socketService.off("order_status_update_vendor", handleStatusUpdate);
    };
  }, [vendorData._id, selectedOrder]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminFetch<any>(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders", vendorData._id] });
      toast.success("Order status updated successfully!");
      setSelectedOrder(updatedOrder);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update order status");
    }
  });

  const markAsReady = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: "picking_items" });
  };

  const totalRevenue = orders?.reduce((acc, order) => acc + (order.totalPrice || 0), 0) || 0;

  const stats = [
    { title: "Today's Orders", value: orders?.length.toString() || "0", icon: Clock, color: "bg-blue-500/10 text-blue-500" },
    { title: isMeatVendor ? "Active Meat Items" : "Active Menu Items", value: menu?.length.toString() || "0", icon: isMeatVendor ? Drumstick : Utensils, color: "bg-green-500/10 text-green-500" },
    { title: "Average Rating", value: "4.8", icon: Star, color: "bg-yellow-500/10 text-yellow-500" },
    { title: "Total Revenue", value: `₹${totalRevenue}`, icon: IndianRupee, color: "bg-purple-500/10 text-purple-500" },
  ];

  // Helper to extract items list from stops
  const getOrderItems = (order: any) => {
    const dropStop = order?.stops?.find((s: any) => s.type === "drop");
    return dropStop?.items?.lines || [];
  };

  // Helper to get formatted status text & colors
  const getStatusDisplay = (status: string) => {
    const s = status ? status.toLowerCase() : "";
    switch (s) {
      case "created":
      case "searching_driver":
        return { text: "Searching Driver", color: "bg-blue-500/10 text-blue-600 border-blue-200" };
      case "driver_assigned":
        return { text: "Driver Assigned", color: "bg-amber-500/10 text-amber-600 border-amber-200" };
      case "arrived_pickup":
        return { text: "Driver Arrived", color: "bg-violet-500/10 text-violet-600 border-violet-200" };
      case "picking_items":
        return { text: "Preparing / Pick Up", color: "bg-pink-500/10 text-pink-600 border-pink-200" };
      case "en_route_delivery":
      case "in_transit":
        return { text: "Out for Delivery", color: "bg-sky-500/10 text-sky-600 border-sky-200" };
      case "arrived_delivery":
        return { text: "Driver at Customer", color: "bg-purple-500/10 text-purple-600 border-purple-200" };
      case "delivered":
      case "completed":
        return { text: "Delivered", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" };
      default:
        return { text: status || "UNKNOWN", color: "bg-gray-500/10 text-gray-600 border-gray-200" };
    }
  };

  return (
    <VendorLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {vendorData.name}</h1>
          <p className="text-muted-foreground">
            {vendorData.role === "meat_vendor" 
              ? "Here's what's happening with your meat center today."
              : "Here's what's happening with your restaurant today."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-success">
                  <TrendingUp className="h-3 w-3" />
                  +0%
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <button className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
                View all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {ordersLoading ? (
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            ) : !orders || orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">No orders yet</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mt-2">New orders from customers will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 10).map((order) => {
                  const display = getStatusDisplay(order.status);
                  return (
                    <div 
                      key={order._id} 
                      onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Order #{order._id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.name || "Anonymous"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">₹{order.totalPrice}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${display.color}`}>
                          {display.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Menu Performance</h2>
              <button className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
                Manage Menu <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Utensils className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{isMeatVendor ? "Your meat inventory is empty" : "Your menu is empty"}</h3>
              <p className="text-sm text-muted-foreground max-w-[250px] mt-2">
                {isMeatVendor ? "Add your first meat items to start receiving orders." : "Add your first food items to start receiving orders."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Order Details</span>
              {selectedOrder && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${getStatusDisplay(selectedOrder.status).color}`}>
                  {getStatusDisplay(selectedOrder.status).text}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 pt-4">
              {/* Basic Info */}
              <div className="flex justify-between items-center text-sm border-b pb-3 border-border">
                <div>
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-bold text-foreground ml-1 text-primary">
                    #{selectedOrder._id.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Placed At:</span>
                  <span className="font-medium text-foreground ml-1">
                    {format(new Date(selectedOrder.createdAt), "hh:mm a")}
                  </span>
                </div>
              </div>

              {/* Restaurant Pickup Code */}
              {selectedOrder.restaurantPickupCode && (
                <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-2xl flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4.5 w-4.5 text-primary shrink-0" />
                    <span className="font-bold text-foreground">Restaurant Pickup Code:</span>
                  </div>
                  <span className="font-extrabold text-xl text-primary tracking-wider bg-primary/10 px-3 py-1 rounded-xl">
                    {selectedOrder.restaurantPickupCode}
                  </span>
                </div>
              )}

              {/* Customer Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer info</h4>
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-2">
                  <div className="flex items-center gap-2.5 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-foreground">{selectedOrder.user?.name || "Anonymous"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{selectedOrder.user?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground leading-snug">
                      {selectedOrder.stops?.find((s: any) => s.type === "drop")?.items?.deliveryAddress?.formattedAddress || 
                       selectedOrder.stops?.find((s: any) => s.type === "drop")?.address || 
                       "No delivery address specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items in Order</h4>
                <div className="bg-muted/10 border rounded-2xl p-4 divide-y divide-border/60">
                  {getOrderItems(selectedOrder).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-2 text-sm first:pt-0 last:pb-0">
                      <div className="flex gap-2">
                        <span className="font-bold text-primary">{item.quantity}x</span>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {getOrderItems(selectedOrder).length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No items specified in the stops
                    </div>
                  )}
                  
                  {/* Total price calculation */}
                  <div className="flex justify-between items-center pt-3 mt-2 font-bold text-base text-foreground">
                    <span>Total Amount</span>
                    <span>₹{selectedOrder.totalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Driver Section */}
              {selectedOrder.driver ? (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Driver</h4>
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedOrder.driver.user?.name || "Assigned Driver"}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.driver.vehicleType || "Delivery Partner"}</p>
                    </div>
                    {selectedOrder.driver.user?.phone && (
                      <a 
                        href={`tel:${selectedOrder.driver.user.phone}`} 
                        className="h-10 w-10 bg-primary/10 hover:bg-primary/20 rounded-xl flex items-center justify-center text-primary transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 leading-snug">
                    Awaiting driver assignment. We'll show the driver details here once they accept this order.
                  </p>
                </div>
              )}

              {/* Vendor Actions */}
              {["created", "searching_driver", "driver_assigned", "arrived_pickup"].includes(selectedOrder.status ? selectedOrder.status.toLowerCase() : "") && (
                <div className="pt-2">
                  <Button
                    onClick={() => markAsReady(selectedOrder._id)}
                    disabled={updateStatusMutation.isPending}
                    className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/95 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
                  >
                    {updateStatusMutation.isPending ? (
                      <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Mark as Ready for Pickup
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
