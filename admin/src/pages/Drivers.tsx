import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Truck, Users as UsersIcon, Star, DollarSign, SlidersHorizontal, UserPlus, Eye, PhoneOff, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const drivers = [
  { name: "Marcus Rodriguez", id: "DX-92102", status: "Online", online: true, location: "North Bay District, Sector 4", earnings: "$4,280.50", earningsNote: "12% above avg", rating: 4.92, suspended: false },
  { name: "Sarah Jenkins", id: "DX-92105", status: "Offline", online: false, location: "Last active: 2h ago", earnings: "$3,120.00", earningsNote: "Target met", rating: 4.75, suspended: false },
  { name: "David Miller", id: "DX-92110", status: "Online", online: true, location: "South Industrial Loop", earnings: "$5,540.20", earningsNote: "Top Earner", rating: 4.98, suspended: false },
  { name: "Kevin Thorne", id: "DX-91882", status: "Suspended", online: false, location: "Since Mar 12", earnings: "$0.00", earningsNote: "", rating: 3.20, suspended: true },
];

export default function Drivers() {
  return (
    <DashboardLayout searchPlaceholder="Search drivers, vehicle IDs, or regions...">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<Truck className="h-5 w-5" />} label="Total Active Drivers" value="1,284" badge="+12% vs last week" badgeColor="success" />
          <StatCard icon={<UsersIcon className="h-5 w-5" />} label="On-Duty Fleet" value="942" badge="Stable" badgeColor="muted" />
          <StatCard icon={<Star className="h-5 w-5" />} label="Avg. Rating" value="4.85" badge="Top Rated" badgeColor="success" />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Weekly Payouts" value="$38.5k" badge="$42k target" badgeColor="muted" />
        </div>

        {/* Fleet Overview */}
        <div className="section-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Fleet Overview</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Real-time monitoring and administrative control of all registered drivers.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
                <UserPlus className="h-4 w-4" /> Onboard New Driver
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                <th className="table-header-text text-left px-6 py-3">Driver Details</th>
                <th className="table-header-text text-left px-6 py-3">Status</th>
                <th className="table-header-text text-left px-6 py-3">Current Location</th>
                <th className="table-header-text text-left px-6 py-3">Earnings (MTD)</th>
                <th className="table-header-text text-left px-6 py-3">Rating</th>
                <th className="table-header-text text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                          {d.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${d.online ? "bg-success" : d.suspended ? "bg-destructive" : "bg-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">ID: #{d.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {d.suspended ? (
                      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[hsl(var(--badge-suspended))] text-[hsl(var(--badge-suspended-text))]">Suspended</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${d.online ? "bg-success" : "bg-muted-foreground"}`} />
                        <span className="text-sm text-foreground">{d.status}</span>
                        <div className={`w-9 h-5 rounded-full flex items-center ${d.online ? "bg-primary justify-end" : "bg-muted justify-start"} p-0.5`}>
                          <div className="h-4 w-4 rounded-full bg-card shadow-sm" />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {d.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-foreground">{d.earnings}</p>
                    {d.earningsNote && <p className="text-xs text-primary">{d.earningsNote}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-foreground">{d.rating}</span>
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      {d.suspended ? (
                        <button className="px-3 py-1 border border-primary text-primary rounded-full text-xs font-medium hover:bg-primary/5">Activate</button>
                      ) : (
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <PhoneOff className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing 1 to 4 of 1,284 drivers</p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronLeft className="h-4 w-4" /></button>
              <button className="h-8 w-8 rounded bg-primary text-primary-foreground text-sm font-medium">1</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">2</button>
              <button className="h-8 w-8 rounded text-sm text-muted-foreground hover:bg-muted/50">3</button>
              <button className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-3 gap-4">
          {/* Map */}
          <div className="col-span-2 section-card overflow-hidden h-[280px] bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative">
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-card/90 backdrop-blur px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs font-medium text-foreground">Live Fleet Positioning</span>
            </div>
            <div className="text-muted-foreground text-sm">Fleet Map Visualization</div>
          </div>

          {/* Insight */}
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
      </div>
    </DashboardLayout>
  );
}
