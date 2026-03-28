import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CheckCircle, Truck as TruckIcon, Package, MapPin, Clock, Plus, Minus, Layers } from "lucide-react";

const timelineSteps = [
  { time: "08:30 AM", title: "Order confirmed", desc: "System validated and processed for routing.", status: "completed" },
  { time: "09:15 AM", title: "Driver assigned", desc: "Marcus Rodriguez (Van #402) accepted the route.", status: "completed" },
  { time: "", title: "Pickup A completed", desc: "74 items collected from Global Distribution Center.", status: "in_progress", label: "IN PROGRESS" },
  { time: "", title: "Pickup B completed", desc: "Expected arrival at Regional Hub in 14 mins.", status: "pending", label: "PENDING" },
  { time: "", title: "Delivered", desc: "Final signature and delivery confirmation.", status: "pending", label: "PENDING" },
];

const inventoryStops = [
  {
    num: 1,
    name: "North Star Distribution",
    skus: "24 SKUs",
    items: [
      { name: "Precision Bearings (Set of 12)", qty: "x 12" },
      { name: "Industrial Hydraulic Fluid 5L", qty: "x 8" },
      { name: "Pneumatic Valves V-10", qty: "x 4" },
    ],
  },
];

export default function OrderDetail() {
  return (
    <DashboardLayout searchPlaceholder="Search orders, drivers...">
      <div className="grid grid-cols-2 gap-0 min-h-[calc(100vh-3.5rem)] -m-6">
        {/* Left Panel */}
        <div className="p-6 overflow-auto">
          {/* Order Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Order #PX-99201</h1>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status="IN-TRANSIT" variant="transit" />
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Estimated Arrival: 4:30 PM
                </span>
              </div>
            </div>
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              Contact Driver
            </button>
          </div>

          {/* Timeline */}
          <div className="section-card p-6 mb-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-6">Order Logistics Flow</p>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex gap-4 relative">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === "completed" ? "bg-primary text-primary-foreground" :
                      step.status === "in_progress" ? "bg-primary/20 text-primary border-2 border-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {step.status === "completed" ? <CheckCircle className="h-4 w-4" /> :
                       step.status === "in_progress" ? <TruckIcon className="h-4 w-4" /> :
                       <Package className="h-4 w-4" />}
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className={`w-0.5 h-16 ${step.status === "completed" ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    {step.time && <p className="text-xs text-primary font-medium">{step.time}</p>}
                    {step.label && <p className={`text-xs font-semibold ${step.status === "in_progress" ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label} {step.status === "in_progress" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary ml-1 animate-pulse-dot" />}
                    </p>}
                    <p className={`text-sm font-semibold mt-0.5 ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.title}</p>
                    <p className={`text-xs mt-0.5 ${step.status === "pending" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Inventory */}
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-4">Route Inventory Stops</p>
            {inventoryStops.map((stop) => (
              <div key={stop.num} className="section-card border-l-4 border-l-primary">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{stop.num}</span>
                    <span className="text-sm font-semibold text-foreground">{stop.name}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">{stop.skus}</span>
                </div>
                <div className="divide-y divide-border">
                  {stop.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-foreground">{item.name}</span>
                      <span className="text-sm font-medium text-muted-foreground">{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/20 relative flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Route Map Visualization</div>

          {/* Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2">
            <button className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50">
              <Plus className="h-4 w-4 text-foreground" />
            </button>
            <button className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50">
              <Minus className="h-4 w-4 text-foreground" />
            </button>
            <button className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50 mt-4">
              <Layers className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Vehicle Tracker */}
          <div className="absolute bottom-6 left-6 right-6 bg-card rounded-xl shadow-lg p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">Live Tracking</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <TruckIcon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Vehicle #402 - Marcus R.</p>
                  <p className="text-xs text-muted-foreground">Currently traversing Kennedy Expressway (I-90)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-foreground">45 <span className="text-sm font-normal text-muted-foreground">mph</span></p>
                <p className="text-xs text-muted-foreground">Steady Velocity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
