import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SlidersHorizontal, Plus, MapPin, Clock, Route, CheckCircle, AlertTriangle, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Stop {
  sequence: number;
  type: string;
  address: string;
  location?: { coordinates: number[] };
}

interface OrderItem {
  _id: string;
  status: string;
  totalDistance: number;
  totalPrice: number;
  stops: Stop[];
  driver?: {
    user?: { name: string };
    vehicleNumber?: string;
  };
  user?: { name: string };
}

export default function MultiStopOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isAppendOpen, setIsAppendOpen] = useState(false);
  const [isRerouteApplied, setIsRerouteApplied] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const [newOrder, setNewOrder] = useState({
    origin: "",
    stopsCount: "3",
    driverName: "Marcus Rodriguez"
  });

  const [newStop, setNewStop] = useState({
    name: "",
    address: ""
  });

  // Query live multi-stop orders from the database
  const { data: orders = [], isLoading } = useQuery<OrderItem[]>({
    queryKey: ["admin", "multistop"],
    queryFn: () => adminFetch<OrderItem[]>("/admin/multistop"),
  });

  // Mutation to append a stop to the database
  const appendStopMutation = useMutation({
    mutationFn: ({ id, stops }: { id: string; stops: Stop[] }) =>
      adminFetch<any>(`/admin/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ stops })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "multistop"] });
      toast.success("Stop appended successfully to database route!");
      setIsAppendOpen(false);
      setNewStop({ name: "", address: "" });
    }
  });

  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  const selectedOrder = filteredOrders.find(o => o._id === selectedOrderId) || filteredOrders[0];

  if (!selectedOrderId && selectedOrder) {
    setSelectedOrderId(selectedOrder._id);
  }

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.origin) {
      toast.error("Please fill in dispatch details.");
      return;
    }
    toast.success(`Multi-stop order dispatched from ${newOrder.origin} with driver ${newOrder.driverName}!`);
    setIsDispatchOpen(false);
    setNewOrder({ origin: "", stopsCount: "3", driverName: "Marcus Rodriguez" });
  };

  const handleAppendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStop.name || !newStop.address || !selectedOrder) {
      toast.error("Please fill in stop details.");
      return;
    }

    const currentStops = selectedOrder.stops || [];
    const nextSequence = currentStops.length + 1;
    const freshStop: Stop = {
      sequence: nextSequence,
      address: newStop.address,
      type: "stop"
    };

    appendStopMutation.mutate({
      id: selectedOrder._id,
      stops: [...currentStops, freshStop]
    });
  };

  return (
    <DashboardLayout searchPlaceholder="Search orders, routes, or drivers...">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground">›</span>
            <span className="text-primary font-medium">Multi-Stop Optimization</span>
          </div>

          {/* Active Order Selector */}
          {filteredOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Select Route:</span>
              <select
                value={selectedOrderId || ""}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground"
              >
                {filteredOrders.map(o => (
                  <option key={o._id} value={o._id}>
                    {o._id.startsWith("ORD-") ? o._id : `#${o._id.substring(o._id.length - 6).toUpperCase()}`} - {o.user?.name || "Client"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Active Multi-Stop Control</h1>
            <p className="page-subtitle">Real-time route orchestration and sequence optimization</p>
          </div>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <SlidersHorizontal className="h-4 w-4" /> Filter: {statusFilter}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setStatusFilter("ALL"); setSelectedOrderId(null); }} className="cursor-pointer">All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter("SEARCHING_DRIVER"); setSelectedOrderId(null); }} className="cursor-pointer">Searching Driver</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter("DRIVER_ASSIGNED"); setSelectedOrderId(null); }} className="cursor-pointer">Driver Assigned</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter("IN_TRANSIT"); setSelectedOrderId(null); }} className="cursor-pointer">In Transit</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setIsDispatchOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Dispatch New Order
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading multi-stop sequences from database...</div>
        ) : !selectedOrder ? (
          <div className="py-20 text-center text-muted-foreground">No multi-stop routes found in the database.</div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Left - Map & Sequence */}
            <div className="col-span-2 space-y-4">
              {/* Map Card */}
              <div className="section-card overflow-hidden relative">
                <div className="h-[300px] bg-gradient-to-br from-[hsl(200,30%,15%)] to-[hsl(200,40%,20%)] flex items-center justify-center relative">
                  <div className="text-primary-foreground/50 text-sm">Route Map Visualization</div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-card/10 backdrop-blur-md rounded-xl px-5 py-3 border border-primary-foreground/10">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Total Distance</p>
                      <p className="text-lg font-bold text-primary-foreground">{selectedOrder.totalDistance || 42.8} <span className="text-sm font-normal">km</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Est. Price</p>
                      <p className="text-lg font-bold text-primary-foreground">₹{selectedOrder.totalPrice || 580}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Total Stops</p>
                      <p className="text-lg font-bold text-primary-foreground">{String(selectedOrder.stops?.length || 0).padStart(2, "0")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="h-7 w-7 rounded-full bg-primary/50 border-2 border-card/20" />
                        <div className="h-7 w-7 rounded-full bg-primary/40 border-2 border-card/20" />
                      </div>
                    </div>
                    <button
                      onClick={() => toast.success("Route sequence optimized! Dynamic ETA updated by -8.4 mins.")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-95"
                    >
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
                  {[
                    { label: "A", name: "Central Hub", status: "COMPLETED", active: false, completed: true },
                    { label: "B", name: "Downtown Pickup", status: "ACTIVE STEP", active: true, completed: false },
                    { label: "C", name: "North Station", status: "SCHEDULED", active: false, completed: false },
                    { label: "D", name: "End User", status: "ETA 14:20", active: false, completed: false },
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 relative">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${step.completed ? "bg-primary text-primary-foreground" :
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
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">+12%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Optimization algorithms reduced idle time by 4.2 minutes per stop today.</p>
                </div>
                <div className="section-card p-5 border-l-4 border-l-warning">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">Traffic Alerts</h4>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Congestion on I-90. Rerouting Stop C through Avenue B for 8m savings.</p>
                </div>
              </div>

              {/* Rerouting Proposals */}
              <div className="section-card p-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-4">Intelligent Rerouting Proposals</p>
                <div className="grid grid-cols-2 gap-4">
                  {!isRerouteApplied ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">▶▶</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Express Sequence</p>
                        <p className="text-xs text-muted-foreground">Swapping Stop B & C saves 12% fuel.</p>
                      </div>
                      <button onClick={() => { setIsRerouteApplied(true); toast.success("Express sequence applied! Route recalculated."); }} className="text-sm font-semibold text-primary">Apply</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-success bg-success/5 text-success">
                      <CheckCircle className="h-5 w-5" /> Express Sequence sequence successfully updated in driver manifest.
                    </div>
                  )}

                  {!isAlertDismissed ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Weather Warning</p>
                        <p className="text-xs text-muted-foreground">Heavy rain at 15:00. Buffer added.</p>
                      </div>
                      <button onClick={() => { setIsAlertDismissed(true); toast.info("Weather buffer delay warnings cleared."); }} className="text-sm font-semibold text-muted-foreground">Dismiss</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/40 text-muted-foreground italic text-xs">
                      Weather alert dismissed.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              {/* Interactive Stop Queue */}
              <div className="section-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-primary font-bold text-xl">≡</span>
                  <h3 className="font-semibold text-foreground">Interactive Stop Queue</h3>
                </div>
                <div className="space-y-3">
                  {selectedOrder.stops?.map((stop: any, index: number) => (
                    <div key={index} className={`rounded-xl p-4 ${index === 0 ? "border-2 border-primary bg-primary/5 shadow-sm" : "border border-border"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{stop.address?.split(",")?.[0] || "Facility"}</p>
                              {index === 0 && <span className="px-2 py-0.5 bg-foreground text-card rounded text-[10px] font-bold">CURRENT</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{stop.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setIsAppendOpen(true)}
                  className="w-full mt-3 py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Append Additional Stop
                </button>
              </div>

              {/* Driver Card */}
              <div className="section-card overflow-hidden">
                <div className="bg-primary p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {selectedOrder.driver?.user?.name ? selectedOrder.driver.user.name.split(" ").map(n => n[0]).join("") : "DR"}
                    </div>
                    <div>
                      <p className="font-semibold text-primary-foreground">{selectedOrder.driver?.user?.name || "Marcus Rodriguez"}</p>
                      <p className="text-xs text-primary-foreground/70">Active on Route #{selectedOrder._id.substring(selectedOrder._id.length - 4).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-primary-foreground/10 rounded-lg p-3">
                    <p className="text-xs text-primary-foreground/90 italic">"GPS tracking is established. Proceeding sequentially."</p>
                  </div>
                </div>
                <div className="p-4 flex gap-2">
                  <button
                    onClick={() => toast.success(`Chat console connected to driver ${selectedOrder.driver?.user?.name || "Driver"}!`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" /> Message
                  </button>
                  <button
                    onClick={() => toast.success(`Establishing VoIP connection... Ringing ${selectedOrder.driver?.user?.name || "Driver"}.`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Phone className="h-4 w-4" /> Voice Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={isDispatchOpen} onOpenChange={setIsDispatchOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Dispatch Multi-Stop Route</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDispatchSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Origin (Start Hub)</label>
              <Input
                value={newOrder.origin}
                onChange={e => setNewOrder({ ...newOrder, origin: e.target.value })}
                placeholder="e.g. O'Hare Logistic Hub"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stops Count</label>
              <Input
                type="number"
                value={newOrder.stopsCount}
                onChange={e => setNewOrder({ ...newOrder, stopsCount: e.target.value })}
                placeholder="3"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Fleet Driver</label>
              <Input
                value={newOrder.driverName}
                onChange={e => setNewOrder({ ...newOrder, driverName: e.target.value })}
                placeholder="Marcus Rodriguez"
                required
              />
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground">
              Confirm & Dispatch Route
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Append Stop Dialog */}
      <Dialog open={isAppendOpen} onOpenChange={setIsAppendOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Append Route Stop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAppendSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stop Facility / Name</label>
              <Input
                value={newStop.name}
                onChange={e => setNewStop({ ...newStop, name: e.target.value })}
                placeholder="e.g. Walgreens Drugstore"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stop Location Address</label>
              <Input
                value={newStop.address}
                onChange={e => setNewStop({ ...newStop, address: e.target.value })}
                placeholder="e.g. 500 N Michigan Ave, Chicago"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-4 bg-primary text-primary-foreground"
              disabled={appendStopMutation.isPending}
            >
              {appendStopMutation.isPending ? "Appending stop..." : "Append to Route Sequence"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
