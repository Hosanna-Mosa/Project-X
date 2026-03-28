import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SlidersHorizontal, Plus, MapPin, Clock, Route, CheckCircle, AlertTriangle, MessageSquare, Phone } from "lucide-react";

const stops = [
  { num: "01", name: "Whole Foods Market", address: "1250 N Wells St, Chicago", current: true, items: "14 Packages", dwell: "12:00 Est." },
  { num: "02", name: "Urban Tech Hub", address: "800 W Fulton Market", current: false, distance: "+1.2km" },
  { num: "03", name: "Private Residence", address: "211 E Ohio St", current: false, distance: "+2.8km" },
];

const sequenceSteps = [
  { label: "A", name: "Central Hub", status: "COMPLETED", active: false, completed: true },
  { label: "B", name: "Downtown Pickup", status: "ACTIVE STEP", active: true, completed: false },
  { label: "C", name: "North Station", status: "SCHEDULED", active: false, completed: false },
  { label: "D", name: "End User", status: "ETA 14:20", active: false, completed: false },
];

export default function MultiStopOrders() {
  return (
    <DashboardLayout searchPlaceholder="Search orders, routes, or drivers...">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground">›</span>
          <span className="text-primary font-medium">Multi-Stop Optimization</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Active Multi-Stop Control</h1>
            <p className="page-subtitle">Real-time route orchestration and sequence optimization</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
              <SlidersHorizontal className="h-4 w-4" /> Filter Routes
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              <Plus className="h-4 w-4" /> Dispatch New Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Left - Map & Sequence */}
          <div className="col-span-2 space-y-4">
            {/* Map Card */}
            <div className="section-card overflow-hidden relative">
              <div className="h-[300px] bg-gradient-to-br from-[hsl(200,30%,15%)] to-[hsl(200,40%,20%)] flex items-center justify-center relative">
                <div className="text-primary-foreground/50 text-sm">Route Map Visualization</div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-card/10 backdrop-blur-md rounded-xl px-5 py-3 border border-primary-foreground/10">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Total Distance</p>
                    <p className="text-lg font-bold text-primary-foreground">42.8 <span className="text-sm font-normal">km</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Est. Completion</p>
                    <p className="text-lg font-bold text-primary-foreground">14:20 <span className="text-sm font-normal">PM</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Total Stops</p>
                    <p className="text-lg font-bold text-primary-foreground">04</p>
                    <p className="text-xs text-primary-foreground/60">Points</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="h-7 w-7 rounded-full bg-primary/50 border-2 border-card/20" />
                      <div className="h-7 w-7 rounded-full bg-primary/40 border-2 border-card/20" />
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">
                    <Route className="h-4 w-4" /> Optimize Now
                  </button>
                </div>
              </div>
            </div>

            {/* Sequence Visualization */}
            <div className="section-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Route className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Sequence Visualization</h3>
              </div>
              <div className="flex items-center justify-between px-8">
                {sequenceSteps.map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 relative">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.completed ? "bg-primary text-primary-foreground" :
                      step.active ? "bg-primary/20 text-primary border-2 border-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {step.completed ? <CheckCircle className="h-5 w-5" /> : step.label}
                    </div>
                    <p className="text-sm font-medium text-foreground">{step.name}</p>
                    <p className={`text-xs font-semibold ${step.active ? "text-primary" : step.completed ? "text-success" : "text-muted-foreground"}`}>
                      {step.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="section-card p-5 border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Driver Efficiency</h4>
                  <span className="px-2 py-0.5 bg-[hsl(var(--badge-optimal))] text-[hsl(var(--badge-optimal-text))] rounded text-xs font-semibold">+12%</span>
                </div>
                <p className="text-sm text-muted-foreground">Optimization algorithms reduced idle time by 4.2 minutes per stop today.</p>
              </div>
              <div className="section-card p-5 border-l-4 border-l-warning">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Traffic Alerts</h4>
                  <span className="px-2 py-0.5 bg-[hsl(var(--badge-settled))] text-[hsl(var(--badge-settled-text))] rounded text-xs font-semibold">Active</span>
                </div>
                <p className="text-sm text-muted-foreground">Congestion on I-90. Rerouting Stop C through Avenue B for 8m savings.</p>
              </div>
            </div>

            {/* Rerouting Proposals */}
            <div className="section-card p-6">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-4">Intelligent Rerouting Proposals</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">▶▶</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Express Sequence</p>
                    <p className="text-xs text-muted-foreground">Swapping Stop B & C saves 12% fuel.</p>
                  </div>
                  <button className="text-sm font-semibold text-primary">Apply</button>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Weather Warning</p>
                    <p className="text-xs text-muted-foreground">Heavy rain at 15:00. Buffer added.</p>
                  </div>
                  <button className="text-sm font-semibold text-muted-foreground">Dismiss</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Interactive Stop Queue */}
            <div className="section-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">≡</span>
                <h3 className="font-semibold text-foreground">Interactive Stop Queue</h3>
              </div>
              <div className="space-y-3">
                {stops.map((stop) => (
                  <div key={stop.num} className={`rounded-xl p-4 ${stop.current ? "border-2 border-primary bg-primary/5" : "border border-border"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${stop.current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {stop.num}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                            {stop.current && <span className="px-2 py-0.5 bg-foreground text-card rounded text-[10px] font-bold">CURRENT</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{stop.address}</p>
                        </div>
                      </div>
                      {stop.distance && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {stop.distance}
                        </span>
                      )}
                    </div>
                    {stop.current && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-card rounded-lg p-2 border border-border">
                          <p className="text-[10px] text-muted-foreground">Pickup Items</p>
                          <p className="text-sm font-semibold text-primary">{stop.items}</p>
                        </div>
                        <div className="bg-card rounded-lg p-2 border border-border">
                          <p className="text-[10px] text-muted-foreground">Dwell Time</p>
                          <p className="text-sm font-semibold text-primary">{stop.dwell}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-medium text-muted-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Append Additional Stop
              </button>
            </div>

            {/* Driver Card */}
            <div className="section-card overflow-hidden">
              <div className="bg-primary p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold text-primary-foreground">MR</div>
                  <div>
                    <p className="font-semibold text-primary-foreground">Marco Rossi</p>
                    <p className="text-xs text-primary-foreground/70">Active on Route #7821</p>
                  </div>
                </div>
                <div className="mt-3 bg-primary-foreground/10 rounded-lg p-3">
                  <p className="text-xs text-primary-foreground/90 italic">"Traffic at Fulton Market is heavy. Adjusting speed for Stop 2 eta."</p>
                </div>
              </div>
              <div className="p-4 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                  <MessageSquare className="h-4 w-4" /> Message
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                  <Phone className="h-4 w-4" /> Voice Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
