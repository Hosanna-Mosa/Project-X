import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CheckCircle, Truck as TruckIcon, Package, MapPin, Clock, Plus, Minus, Layers } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";

export default function OrderDetail() {
  const { id } = useParams();
  const [zoom, setZoom] = useState(13);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA",
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => adminFetch<any>(`/admin/orders/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <p className="text-muted-foreground text-sm">Loading order details from database...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-foreground">Order Not Found</h2>
          <p className="text-muted-foreground mt-2">The specified order record could not be retrieved from the database.</p>
          <Link to="/live-orders" className="text-primary mt-4 inline-block hover:underline">
            Back to Live Orders
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Construct dynamic timeline steps based on order status and creation/update times
  const timelineSteps = [
    { 
      time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      title: "Order confirmed", 
      desc: "System validated and processed for routing.", 
      status: "completed" 
    },
    { 
      time: order.driver ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "", 
      title: "Driver assigned", 
      desc: order.driver ? `${(order.driver as any).user?.name || "Marcus Rodriguez"} accepted the route.` : "Waiting for driver acceptance...", 
      status: order.driver ? "completed" : "pending",
      label: order.driver ? undefined : "AWAITING DRIVER"
    },
    { 
      time: ["PICKED_UP", "DELIVERED", "COMPLETED"].includes(order.status) ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "", 
      title: "Picked Up", 
      desc: ["PICKED_UP", "DELIVERED", "COMPLETED"].includes(order.status) ? "Items collected from the store / vendor." : "Driver heading to merchant...", 
      status: ["PICKED_UP", "DELIVERED", "COMPLETED"].includes(order.status) ? "completed" : order.status === "DRIVER_ASSIGNED" ? "in_progress" : "pending",
      label: order.status === "DRIVER_ASSIGNED" ? "EN ROUTE TO MERCHANT" : undefined
    },
    { 
      time: ["DELIVERED", "COMPLETED"].includes(order.status) ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "", 
      title: "Delivered", 
      desc: ["DELIVERED", "COMPLETED"].includes(order.status) ? "Final signature and delivery confirmation." : "In transit to destination...", 
      status: ["DELIVERED", "COMPLETED"].includes(order.status) ? "completed" : order.status === "PICKED_UP" ? "in_progress" : "pending",
      label: order.status === "PICKED_UP" ? "IN TRANSIT" : undefined
    }
  ];

  const mapMarkers = order.stops?.map((stop: any, idx: number) => {
    const lng = stop.location?.coordinates?.[0] || 81.8040;
    const lat = stop.location?.coordinates?.[1] || 17.0005;
    return {
      lat: Number(lat),
      lng: Number(lng),
      label: String(idx + 1),
      address: stop.address || "Stop",
      type: stop.type
    };
  }).filter((m: any) => !isNaN(m.lat) && !isNaN(m.lng)) || [];

  const mapCenter = mapMarkers.length > 0 ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : { lat: 17.0005, lng: 81.8040 };
  const polylinePath = mapMarkers.map((m: any) => ({ lat: m.lat, lng: m.lng }));

  return (
    <DashboardLayout searchPlaceholder="Search orders, drivers...">
      <div className="grid grid-cols-2 gap-0 min-h-[calc(100vh-3.5rem)] -m-6">
        {/* Left Panel */}
        <div className="p-6 overflow-auto">
          {/* Order Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {order._id.startsWith("ORD-") ? order._id : `#${order._id.substring(order._id.length - 6).toUpperCase()}`}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={order.status} variant={order.status === "DELIVERED" || order.status === "COMPLETED" ? "delivered" : "transit"} />
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Created: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                if (order.driver) {
                  toast.success(`VoIP call initiated to ${(order.driver as any).user?.name || "Driver"}`);
                } else {
                  toast.error("No driver assigned to this order yet.");
                }
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
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
            {order.stops && order.stops.map((stop: any, index: number) => (
              <div key={index} className="section-card border-l-4 border-l-primary mb-3">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{stop.address || "Stop Address"}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground uppercase">{stop.type}</span>
                </div>
                {stop.items && (
                  <div className="divide-y divide-border">
                    {Array.isArray(stop.items) ? (
                      stop.items.map((item: any, j: number) => (
                        <div key={j} className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-foreground">{item.name}</span>
                          <span className="text-sm font-medium text-muted-foreground">x {item.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        {JSON.stringify(stop.items)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="relative h-full w-full flex-1 min-h-[400px]">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%", minHeight: "100%" }}
              center={mapCenter}
              zoom={zoom}
              mapTypeId={mapType}
              options={{
                zoomControl: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {mapMarkers.map((m: any, i: number) => (
                <Marker
                  key={i}
                  position={{ lat: m.lat, lng: m.lng }}
                  label={m.label}
                  title={`${m.type}: ${m.address}`}
                />
              ))}
              {polylinePath.length > 1 && (
                <Polyline
                  path={polylinePath}
                  options={{
                    strokeColor: "hsl(185, 80%, 28%)",
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            <div className="bg-gradient-to-br from-primary/10 to-primary/20 absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Loading Route Map...
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
            <button 
              onClick={() => setZoom(prev => Math.min(20, prev + 1))}
              className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-4 w-4 text-foreground" />
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(1, prev - 1))}
              className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <Minus className="h-4 w-4 text-foreground" />
            </button>
            <button 
              onClick={() => setMapType(prev => prev === "roadmap" ? "satellite" : "roadmap")}
              className="h-10 w-10 bg-card rounded-lg shadow-sm flex items-center justify-center hover:bg-muted/50 mt-4 transition-colors"
            >
              <Layers className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Vehicle Tracker */}
          {order.driver && (
            <div className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur rounded-xl shadow-lg p-4 z-10">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">Live Tracking</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                    <TruckIcon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{(order.driver as any).user?.name || "Driver"}</p>
                    <p className="text-xs text-muted-foreground">Vehicle: {(order.driver as any).vehicleNumber || "VAN"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">Active <span className="text-sm font-normal text-muted-foreground">GPS</span></p>
                  <p className="text-xs text-muted-foreground">Steady Velocity</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
