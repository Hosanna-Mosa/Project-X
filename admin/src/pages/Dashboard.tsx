import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Package, Truck, Users, DollarSign, CheckCircle, AlertTriangle, UserPlus, Banknote, MoreVertical } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const barData = [
  { time: "08:00", delivered: 45, target: 60 },
  { time: "10:00", delivered: 80, target: 65 },
  { time: "12:00", delivered: 95, target: 70 },
  { time: "14:00", delivered: 75, target: 72 },
  { time: "16:00", delivered: 60, target: 68 },
  { time: "18:00", delivered: 85, target: 70 },
  { time: "20:00", delivered: 40, target: 55 },
];

const activityLog = [
  { icon: <CheckCircle className="h-4 w-4 text-primary" />, title: "Order #8492 Delivered", desc: "Driver: Marcus Chen • 2 mins ago" },
  { icon: <AlertTriangle className="h-4 w-4 text-warning" />, title: "Route Delay: Sector 7", desc: "Traffic congestion alert • 15 mins ago" },
  { icon: <UserPlus className="h-4 w-4 text-muted-foreground" />, title: "New Driver Registered", desc: "Sarah Jenkins • Fleet A • 1 hr ago" },
  { icon: <Banknote className="h-4 w-4 text-primary" />, title: "Batch Payment Processed", desc: "24 drivers paid • 3 hrs ago" },
];

const manifests = [
  { id: "#ORD-9921", dest: "128 Tech Plaza, San Jose", driver: "Marcus Chen", eta: "14:45 PM", priority: "HIGH" },
  { id: "#ORD-9918", dest: "Port of Oakland, Terminal 3", driver: "Sarah Jenkins", eta: "15:10 PM", priority: "STANDARD" },
  { id: "#ORD-9905", dest: "Bay Area Logistics Hub", driver: "Rick Alvarez", eta: "16:30 PM", priority: "EXPRESS" },
];

const priorityStyles: Record<string, string> = {
  HIGH: "bg-destructive text-destructive-foreground",
  STANDARD: "bg-muted text-muted-foreground",
  EXPRESS: "bg-primary text-primary-foreground",
};

export default function Dashboard() {
  return (
    <DashboardLayout searchPlaceholder="Search orders, drivers, or routes...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Operational Overview</h1>
            <p className="page-subtitle">Real-time supply chain performance metrics.</p>
          </div>
          <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Generate Report
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} label="Total Orders Today" value="1,284" badge="↗ 12%" badgeColor="success" />
          <StatCard icon={<Truck className="h-5 w-5" />} label="Active Deliveries" value="432" badge="↗ 5%" badgeColor="success" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Available Drivers" value="87" badge="↘ 3%" badgeColor="destructive" />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Revenue Today" value="$42,890" badge="↗ 24%" badgeColor="success" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Delivery Performance */}
          <div className="col-span-2 section-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delivery Performance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 24 hours vs Target</p>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-md">WEEKLY</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md">DAILY</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(215, 15%, 50%)' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(214,20%,90%)', fontSize: 12 }}
                />
                <Bar dataKey="delivered" fill="hsl(185, 80%, 28%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="hsl(185, 80%, 88%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Live Activity Log */}
          <div className="section-card p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-4">Live Activity Log</h3>
            <div className="flex-1 space-y-4">
              {activityLog.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
              View All Activity
            </button>
          </div>
        </div>

        {/* Map + Insight */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 section-card overflow-hidden h-[240px] bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative">
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-card/90 backdrop-blur px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs font-medium text-foreground">Live Fleet Positioning</span>
            </div>
            <div className="text-muted-foreground text-sm">Fleet Map Visualization</div>
            <div className="absolute bottom-4 left-4 bg-foreground/80 text-primary-foreground px-4 py-2 rounded-lg">
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">Live Tracking</p>
              <p className="text-sm font-semibold">Manhattan Hub</p>
            </div>
          </div>

          <div className="section-card p-6 bg-primary text-primary-foreground flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">System Insight</p>
              <h3 className="text-xl font-bold mt-1">Optimized Fleet Performance</h3>
              <p className="text-sm mt-3 text-primary-foreground/80 leading-relaxed">
                The current driver distribution is performing 18% more efficiently than average. We recommend deploying 12 additional drivers to the North Bay District to capture surge demand.
              </p>
            </div>
            <button className="mt-4 self-start px-5 py-2.5 bg-card text-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Generate Fleet Report
            </button>
          </div>
        </div>

        {/* Active Manifests */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-foreground">Active Manifests</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filter by Status:</span>
              <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground">
                <option>All Statuses</option>
              </select>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">Order ID</th>
                <th className="table-header-text text-left px-6 py-3">Destination</th>
                <th className="table-header-text text-left px-6 py-3">Driver</th>
                <th className="table-header-text text-left px-6 py-3">Estimated Delivery</th>
                <th className="table-header-text text-left px-6 py-3">Priority</th>
                <th className="table-header-text text-left px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {manifests.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary">{m.id}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{m.dest}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {m.driver.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm text-foreground">{m.driver}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{m.eta}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${priorityStyles[m.priority]}`}>
                      {m.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-muted rounded transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
