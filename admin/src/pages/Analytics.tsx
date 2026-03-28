import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Package, DollarSign, Clock, Truck, Calendar, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const velocityData = [
  { day: "MON", orders: 1800 },
  { day: "TUE", orders: 2200 },
  { day: "WED", orders: 2600 },
  { day: "THU", orders: 2842 },
  { day: "FRI", orders: 2400 },
  { day: "SAT", orders: 3200 },
  { day: "SUN", orders: 2800 },
];

const heatmapData = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  intensity: Math.random(),
}));

const anomalies = [
  { id: "#PN-9284-A", status: "Optimal", statusVariant: "optimal" as const, driver: "Marcus Chen", value: "$4,281.00", activity: "Arrived at Hub B" },
  { id: "#PN-9285-C", status: "Minor Delay", statusVariant: "delay" as const, driver: "Sarah Jenkins", value: "$12,940.50", activity: "Heavy Traffic (Exit 4)" },
  { id: "#PN-9286-K", status: "In-Transit", statusVariant: "transit" as const, driver: "David Miller", value: "$842.12", activity: "Loading Dock 4" },
];

export default function Analytics() {
  return (
    <DashboardLayout searchPlaceholder="Search logistics metrics...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Analytics Performance</h1>
            <p className="page-subtitle">Real-time logistics intelligence and fleet efficiency metrics.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
              <Calendar className="h-4 w-4" /> Last 30 Days
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Orders" value="12,842" badge="+14.2%" badgeColor="success" />
          <StatCard label="Net Revenue" value="$482.5k" badge="+8.4%" badgeColor="success" />
          <StatCard label="Avg. Delivery" value="34.2m" badge="-2.1%" badgeColor="destructive" />
          <StatCard label="Active Drivers" value="842" badge="98% cap." badgeColor="success" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          {/* Orders Velocity */}
          <div className="col-span-2 section-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Orders Velocity</h3>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Last 7 Days</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(185, 80%, 28%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(185, 80%, 28%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(215,15%,50%)' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(214,20%,90%)', fontSize: 12 }}
                  formatter={(value: number) => [`${value.toLocaleString()} Orders`, '']}
                />
                <Area type="monotone" dataKey="orders" stroke="hsl(185, 80%, 28%)" strokeWidth={2.5} fill="url(#colorOrders)" dot={{ r: 4, fill: 'hsl(185, 80%, 28%)', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Stream */}
          <div className="section-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Stream</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              {["W1", "W2", "W3", "W4"].map((w) => (
                <button
                  key={w}
                  className={`text-sm font-medium px-2 py-1 ${w === "W3" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Monthly Growth</span>
              <span className="text-sm font-semibold text-success">+12.4%</span>
            </div>
          </div>
        </div>

        {/* Heatmap + Map */}
        <div className="grid grid-cols-3 gap-4">
          {/* Peak Demand Hours */}
          <div className="section-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Peak Demand Hours</h3>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {heatmapData.map((cell) => (
                <div
                  key={cell.id}
                  className="h-8 rounded-sm"
                  style={{
                    backgroundColor: `hsl(185, 80%, ${85 - cell.intensity * 55}%)`,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>22:00</span><span>02:00</span>
            </div>
          </div>

          {/* Driver Saturation Map */}
          <div className="col-span-2 section-card overflow-hidden h-[300px] bg-gradient-to-br from-primary/10 to-primary/20 relative flex items-center justify-center">
            <div className="absolute top-6 left-6 bg-card/95 backdrop-blur p-4 rounded-xl shadow-sm max-w-[240px]">
              <h4 className="font-semibold text-foreground text-sm">Driver Saturation</h4>
              <p className="text-xs text-muted-foreground mt-1">Live heatmap of metropolitan logistics flow.</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-foreground">Downtown</span>
                  <span className="text-[11px] font-semibold text-destructive">High Density</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full">
                  <div className="h-full w-[85%] bg-primary rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-foreground">Industrial East</span>
                  <span className="text-[11px] font-semibold text-success">Optimal</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full">
                  <div className="h-full w-[45%] bg-primary rounded-full" />
                </div>
              </div>
            </div>
            <div className="text-muted-foreground text-sm">Saturation Map</div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card/90 backdrop-blur px-3 py-2 rounded-lg">
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 border-2 border-card" />
                <div className="h-6 w-6 rounded-full bg-primary/30 border-2 border-card" />
                <div className="h-6 w-6 rounded-full bg-primary/40 border-2 border-card" />
              </div>
              <span className="text-xs font-medium text-foreground">+12 Active Now</span>
            </div>
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-foreground">Real-time Anomaly Detection</h3>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs font-medium text-primary">Live Feed</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">Shipment ID</th>
                <th className="table-header-text text-left px-6 py-3">Route Status</th>
                <th className="table-header-text text-left px-6 py-3">Driver</th>
                <th className="table-header-text text-left px-6 py-3">Est. Value</th>
                <th className="table-header-text text-left px-6 py-3">Activity</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{a.id}</td>
                  <td className="px-6 py-4"><StatusBadge status={a.status} variant={a.statusVariant} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted" />
                      <span className="text-sm text-foreground">{a.driver}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{a.value}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{a.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-center border-t border-border">
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">View All Insights</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
