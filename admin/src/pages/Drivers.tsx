import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Truck, Users as UsersIcon, Star, DollarSign, SlidersHorizontal, UserPlus, Eye, PhoneOff, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
export default function Drivers() {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: () => adminFetch<any[]>("/admin/drivers"),
  });

  const onlineDrivers = drivers.filter((d: any) => d.status === "ONLINE").length;

  return (
    <DashboardLayout searchPlaceholder="Search drivers, vehicle IDs, or regions...">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<Truck className="h-5 w-5" />} label="Total Registered" value={drivers.length.toString()} badge="Overall" badgeColor="success" />
          <StatCard icon={<UsersIcon className="h-5 w-5" />} label="On-Duty" value={onlineDrivers.toString()} badge="Active" badgeColor="success" />
          <StatCard icon={<Star className="h-5 w-5" />} label="Avg. Rating" value="4.8" badge="System" badgeColor="success" />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Fleet Status" value="Healthy" badge="Stable" badgeColor="muted" />
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Loading drivers...</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No drivers found.</td>
                </tr>
              ) : (
                drivers.map((d: any) => (
                  <tr key={d._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                            {d.user?.name?.split(" ").map((n: string) => n[0]).join("") || "D"}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${d.status === "ONLINE" ? "bg-success" : "bg-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{d.user?.name}</p>
                          <p className="text-xs text-muted-foreground">Phone: {d.user?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${d.status === "ONLINE" ? "bg-success" : "bg-muted-foreground"}`} />
                        <span className="text-sm text-foreground">{d.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {d.currentLocation?.coordinates?.join(", ") || "Unknown"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">$0.00</p>
                      <p className="text-xs text-primary">Target: $0</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-foreground">4.8</span>
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <PhoneOff className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {drivers.length} drivers</p>
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
