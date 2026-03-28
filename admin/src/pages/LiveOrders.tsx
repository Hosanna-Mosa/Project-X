import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RefreshCw, Timer, Truck, SlidersHorizontal, Plus, Download, MoreVertical, Star, GitBranch, MapPin } from "lucide-react";

const orders = [
  { id: "#ORD-9402", user: "James D. Miller", stops: "4 stops", status: "DRIVER ASSIGNED", statusVariant: "assigned" as const, driver: "Carlos Rodriguez", rating: 4.9, eta: "12:45 PM", etaNote: "Late 5m", etaNoteColor: "text-destructive" },
  { id: "#ORD-9403", user: "Sarah McNamara", stops: "1 stop", status: "PICKING ITEMS", statusVariant: "picking" as const, driver: "Elena Kostic", rating: 5.0, eta: "1:15 PM", etaNote: "On schedule", etaNoteColor: "text-success" },
  { id: "#ORD-9404", user: "Ben Thompson", stops: "2 stops", status: "ON THE WAY", statusVariant: "transit" as const, driver: "Marcus Aurelius", rating: 4.7, eta: "12:55 PM", etaNote: "Near destin.", etaNoteColor: "text-primary" },
  { id: "#ORD-9405", user: "Linda Wu", stops: "1 stop", status: "CONFIRMED", statusVariant: "confirmed" as const, driver: "Awaiting assignment...", rating: 0, eta: "--:--", etaNote: "", etaNoteColor: "" },
  { id: "#ORD-9406", user: "Robert Kim", stops: "3 stops", status: "DELIVERED", statusVariant: "delivered" as const, driver: "Sandra Bullock", rating: 4.8, eta: "12:30 PM", etaNote: "Completed", etaNoteColor: "text-success" },
];

export default function LiveOrders() {
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
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Manual Order
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<RefreshCw className="h-5 w-5" />} label="Active Shipments" value="1,284" badge="+12.5%" badgeColor="success" />
          <StatCard icon={<Timer className="h-5 w-5" />} label="Avg. Fulfillment" value="24 min" />
          <StatCard icon={<Truck className="h-5 w-5" />} label="On Road" value="452" />
        </div>

        {/* Table */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse-dot" />
              <h3 className="text-lg font-semibold text-foreground">Ongoing Operations</h3>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
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
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary">{o.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {o.user.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-sm text-foreground">{o.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {o.stops.includes("1") ? <MapPin className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
                      {o.stops}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.status} variant={o.statusVariant} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${o.rating === 0 ? "italic text-muted-foreground" : "text-foreground"}`}>{o.driver}</span>
                      {o.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-warning text-warning" /> {o.rating}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.eta}</p>
                      {o.etaNote && <p className={`text-xs ${o.etaNoteColor}`}>{o.etaNote}</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">5</span> of 24 results</p>
            <div className="flex gap-1">
              <button className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted/50">Previous</button>
              <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium">Next</button>
            </div>
          </div>
        </div>

        {/* FAB */}
        <button className="fixed bottom-6 right-6 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </DashboardLayout>
  );
}
