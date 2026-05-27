import { VendorLayout } from "@/components/layout/VendorLayout";
import { Utensils, Star, Clock, IndianRupee, ChevronRight, TrendingUp, Package, Drumstick } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { format } from "date-fns";

export default function VendorDashboard() {
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");
  const isMeatVendor = vendorData.role === "meat_vendor";

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

  const totalRevenue = orders?.reduce((acc, order) => acc + (order.totalPrice || 0), 0) || 0;

  const stats = [
    { title: "Today's Orders", value: orders?.length.toString() || "0", icon: Clock, color: "bg-blue-500/10 text-blue-500" },
    { title: isMeatVendor ? "Active Meat Items" : "Active Menu Items", value: menu?.length.toString() || "0", icon: isMeatVendor ? Drumstick : Utensils, color: "bg-green-500/10 text-green-500" },
    { title: "Average Rating", value: "4.8", icon: Star, color: "bg-yellow-500/10 text-yellow-500" },
    { title: "Total Revenue", value: `₹${totalRevenue}`, icon: IndianRupee, color: "bg-purple-500/10 text-purple-500" },
  ];

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
                {orders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        order.status === "DELIVERED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
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
    </VendorLayout>
  );
}
