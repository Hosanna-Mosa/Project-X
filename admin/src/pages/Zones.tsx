import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Map as MapIcon, MapPin, Compass, Trash2, Plus, SlidersHorizontal, ToggleLeft, ToggleRight, X, AlertTriangle, RefreshCw, Eye, Undo, Clock, ShieldCheck, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { GoogleMap, useJsApiLoader, Polygon as MapPolygon, Circle as MapCircle, Marker } from "@react-google-maps/api";

const defaultCenter = { lat: 12.9200, lng: 77.6400 }; // HSR Layout, Bangalore

const AVAILABLE_SERVICES = [
  { id: "bike", label: "Bike" },
  { id: "auto", label: "Auto" },
  { id: "cab", label: "Cab" },
  { id: "cab_prime", label: "Cab Prime" },
  { id: "delivery", label: "Delivery" },
  { id: "helper", label: "Helper" },
];

// Helper to compute distance between two coordinates in meters
const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3; // meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Zones() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Selection State for Preview
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("polygon");
  const [multiplier, setMultiplier] = useState("1.5");
  const [isActive, setIsActive] = useState(true);
  
  // Circle State
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [radius, setRadius] = useState("1000"); // 1km default
  const [autoSurge, setAutoSurge] = useState(false);
  
  // Polygon State - starts empty so users can draw from scratch
  const [polyCoords, setPolyCoords] = useState("[]");

  // Advanced Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Live Modal Preview Map State
  const [modalMapCenter, setModalMapCenter] = useState(defaultCenter);
  const [modalMapZoom, setModalMapZoom] = useState(13);
  const [previewCircleCenter, setPreviewCircleCenter] = useState<any>(null);
  const [previewPolygonPath, setPreviewPolygonPath] = useState<any[]>([]);

  // Google Maps Loader
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA",
  });

  const { data: response = { data: [] }, isLoading } = useQuery({
    queryKey: ["admin", "zones"],
    queryFn: () => adminFetch<{ data: any[] }>("/zones"),
  });

  const zones = response.data || [];

  // Set first zone as selected on load
  useEffect(() => {
    if (zones.length > 0 && !selectedZone) {
      handleSelectZone(zones[0]);
    }
  }, [zones]);

  // Sync modal coordinates to live preview on change
  useEffect(() => {
    if (type === "circle") {
      const lat = parseFloat(centerLat);
      const lng = parseFloat(centerLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const centerObj = { lat, lng };
        setPreviewCircleCenter(centerObj);
        setModalMapCenter(centerObj);
      } else {
        setPreviewCircleCenter(null);
      }
    } else {
      try {
        const coords = JSON.parse(polyCoords);
        if (Array.isArray(coords) && coords.length > 0) {
          const path = coords.map(([lng, lat]: any) => ({
            lat: Number(lat),
            lng: Number(lng),
          }));
          setPreviewPolygonPath(path);
          // Only shift map center if path was just created or explicitly changed
          if (path.length > 0 && modalMapCenter.lat === defaultCenter.lat && modalMapCenter.lng === defaultCenter.lng) {
            setModalMapCenter(path[0]);
          }
        } else {
          setPreviewPolygonPath([]);
        }
      } catch (e) {
        // Quietly catch JSON parsing errors during typing
      }
    }
  }, [centerLat, centerLng, polyCoords, type]);

  const handleSelectZone = (zone: any) => {
    setSelectedZone(zone);
    
    if (zone.type === "circle" && zone.center?.coordinates) {
      const lat = zone.center.coordinates[1];
      const lng = zone.center.coordinates[0];
      setMapCenter({ lat, lng });
      setMapZoom(14);
    } else if (zone.type === "polygon" && zone.boundary?.coordinates?.[0]?.[0]) {
      const firstNode = zone.boundary.coordinates[0][0];
      const lat = firstNode[1];
      const lng = firstNode[0];
      setMapCenter({ lat, lng });
      setMapZoom(13);
    }
  };

  const createZoneMutation = useMutation({
    mutationFn: (newZone: any) =>
      adminFetch<any>("/zones", {
        method: "POST",
        body: JSON.stringify(newZone),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "zones"] });
      toast.success("Zone created successfully");
      setIsAddOpen(false);
      
      if (res && res.data) {
        handleSelectZone(res.data);
      }
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create zone");
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) =>
      adminFetch<any>(`/zones/${zoneId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "zones"] });
      toast.success("Zone deleted successfully");
      if (selectedZone && zones.length > 1) {
        const remaining = zones.filter((z: any) => z._id !== selectedZone._id);
        if (remaining.length > 0) handleSelectZone(remaining[0]);
      } else {
        setSelectedZone(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete zone");
    },
  });

  const toggleZoneMutation = useMutation({
    mutationFn: ({ zoneId, data }: { zoneId: string; data: any }) =>
      adminFetch<any>(`/zones/${zoneId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "zones"] });
      toast.success("Zone updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update zone");
    },
  });

  const resetForm = () => {
    setName("");
    setType("polygon");
    setMultiplier("1.5");
    setIsActive(true);
    setAutoSurge(false);
    setCenterLat("");
    setCenterLng("");
    setRadius("1000");
    setPolyCoords("[]");
    setPreviewCircleCenter(null);
    setPreviewPolygonPath([]);
    setModalMapCenter(defaultCenter);
    
    // Advanced
    setDescription("");
    setSelectedServices([]);
    setStartTime("");
    setEndTime("");
    setShowAdvanced(false);
  };

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Zone name is required");

    let payload: any = {
      name,
      type,
      pricingMultiplier: parseFloat(multiplier),
      isActive,
      description: description || undefined,
      allowedServices: selectedServices.length > 0 ? selectedServices : undefined,
      autoSurgeEnabled: autoSurge,
    };

    if (startTime || endTime) {
      payload.activeHours = {
        start: startTime || "00:00",
        end: endTime || "23:59",
      };
    }

    if (type === "circle") {
      const lat = parseFloat(centerLat);
      const lng = parseFloat(centerLng);
      const rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lng)) {
        return toast.error("Center coordinates must be valid numbers");
      }
      if (isNaN(rad) || rad <= 0) {
        return toast.error("Radius must be a positive number");
      }

      payload.center = {
        coordinates: [lng, lat],
      };
      payload.radius = rad;
    } else {
      try {
        const coords = JSON.parse(polyCoords);
        if (!Array.isArray(coords) || coords.length < 3) {
          return toast.error("Polygon must contain at least 3 coordinates");
        }
        
        const first = coords[0];
        const last = coords[coords.length - 1];
        const isClosed = first[0] === last[0] && first[1] === last[1];
        const normalizedCoords = isClosed ? coords : [...coords, first];

        payload.boundary = {
          coordinates: [normalizedCoords],
        };
      } catch (err: any) {
        return toast.error(`Invalid coordinates format: ${err.message}`);
      }
    }

    createZoneMutation.mutate(payload);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this zone?")) {
      deleteZoneMutation.mutate(id);
    }
  };

  const handleToggleActive = (zone: any, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleZoneMutation.mutate({
      zoneId: zone._id,
      data: { isActive: !zone.isActive },
    });
  };

  // Smart Coordinate Insertion using segment proximity calculation to prevent overlapping polygon lines
  const handleModalMapClick = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (!lat || !lng) return;

    if (type === "circle") {
      setCenterLat(lat.toFixed(6));
      setCenterLng(lng.toFixed(6));
      toast.info(`Set circle center to: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } else {
      try {
        let current: any[] = [];
        try {
          current = JSON.parse(polyCoords);
        } catch {
          current = [];
        }

        if (!Array.isArray(current)) current = [];

        const newCoord = [Number(lng.toFixed(6)), Number(lat.toFixed(6))];

        if (current.length < 3) {
          // 1. If we have less than 3 points, simply append the coordinates
          current.push(newCoord);
          
          // Once the third coordinate is added, automatically close the polygon loop
          if (current.length === 3) {
            current.push(current[0]);
          }
          toast.info(`Added node ${current.length >= 3 ? current.length - 1 : current.length}: [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
        } else {
          // 2. We have 3 or more points. Find the segment where this point fits best to prevent crossovers
          const first = current[0];
          const last = current[current.length - 1];
          const isClosed = first[0] === last[0] && first[1] === last[1];
          
          if (isClosed) {
            current.pop(); // Temp pop the closing node for cost checks
          }

          let bestIndex = current.length;
          let minCost = Infinity;

          // Build a loop path to evaluate cost of inserting into all segments including (last, first)
          const path = current.map(([ln, lt]) => ({ lat: lt, lng: ln }));
          path.push(path[0]); // Complete loop

          for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];

            const d1 = getDistanceInMeters(p1.lat, p1.lng, lat, lng);
            const d2 = getDistanceInMeters(p2.lat, p2.lng, lat, lng);
            const d12 = getDistanceInMeters(p1.lat, p1.lng, p2.lat, p2.lng);

            // Cost formula: Distance(p1, new) + Distance(new, p2) - Distance(p1, p2)
            const cost = d1 + d2 - d12;
            if (cost < minCost) {
              minCost = cost;
              bestIndex = i + 1; // Insert after node i
            }
          }

          // Insert at optimal position
          current.splice(bestIndex, 0, newCoord);

          // Re-close the polygon loop
          current.push(current[0]);
          toast.info(`Inserted node at segment position ${bestIndex}: [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
        }

        setPolyCoords(JSON.stringify(current));
      } catch (err) {
        setPolyCoords(JSON.stringify([[Number(lng.toFixed(6)), Number(lat.toFixed(6))]]));
      }
    }
  };

  // Dragging vertex markers to change polygon coordinates visually
  const handleMarkerDragEnd = (index: number, e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (!lat || !lng) return;

    try {
      const current = JSON.parse(polyCoords);
      if (Array.isArray(current)) {
        current[index] = [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
        
        // If we updated the first node, ensure the last closing node matches
        if (index === 0 && current.length >= 3) {
          current[current.length - 1] = current[0];
        }
        
        setPolyCoords(JSON.stringify(current));
        toast.success(`Moved node ${index + 1} to: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
      console.error("Failed updating marker position:", err);
    }
  };

  const handleUndoCoordinate = () => {
    try {
      let current = JSON.parse(polyCoords);
      if (!Array.isArray(current) || current.length === 0) {
        toast.info("No coordinates to undo");
        return;
      }

      // Remove closing node if present
      if (current.length >= 3) {
        const first = current[0];
        const last = current[current.length - 1];
        if (first[0] === last[0] && first[1] === last[1]) {
          current.pop();
        }
      }

      // Pop the last node
      const popped = current.pop();
      
      // Re-close the loop if we still have at least 3 nodes
      if (current.length >= 3) {
        current.push(current[0]);
      }

      setPolyCoords(JSON.stringify(current));
      if (popped) {
        toast.success(`Removed point: [${popped[0].toFixed(4)}, ${popped[1].toFixed(4)}]`);
      }
    } catch (err) {
      toast.error("Failed to undo coordinate");
    }
  };

  const clearModalCoordinates = () => {
    if (type === "circle") {
      setCenterLat("");
      setCenterLng("");
    } else {
      setPolyCoords("[]");
    }
    toast.success("Coordinates cleared");
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(s => s !== serviceId) 
        : [...prev, serviceId]
    );
  };

  // Map Polygon/Circle Helper functions for selected zone
  const getGoogleCoords = (zone: any) => {
    if (!zone?.boundary?.coordinates?.[0]) return [];
    return zone.boundary.coordinates[0].map(([lng, lat]: any) => ({
      lat: Number(lat),
      lng: Number(lng),
    }));
  };

  const getGoogleCenter = (zone: any) => {
    if (!zone?.center?.coordinates) return defaultCenter;
    return {
      lat: Number(zone.center.coordinates[1]),
      lng: Number(zone.center.coordinates[0]),
    };
  };

  // Exclude duplicate/closing node marker to avoid overlapping rendering in polygon
  const getPolygonMarkers = () => {
    if (previewPolygonPath.length === 0) return [];
    const first = previewPolygonPath[0];
    const last = previewPolygonPath[previewPolygonPath.length - 1];
    if (previewPolygonPath.length >= 3 && first.lat === last.lat && first.lng === last.lng) {
      return previewPolygonPath.slice(0, -1);
    }
    return previewPolygonPath;
  };

  // Determine pricing overlay colors based on multiplier
  const getZoneColors = (multiplier: number) => {
    if (multiplier >= 2.0) {
      return { fill: "#ef4444", stroke: "#dc2626" }; // Crimson red
    } else if (multiplier >= 1.5) {
      return { fill: "#f97316", stroke: "#ea580c" }; // Vivid orange
    } else if (multiplier > 1.0) {
      return { fill: "#eab308", stroke: "#ca8a04" }; // Yellow/amber
    }
    return { fill: "#6366f1", stroke: "#4f46e5" }; // Slate/indigo
  };

  const activeZonesCount = zones.filter((z: any) => z.isActive).length;
  const maxMultiplier = zones.length > 0 ? Math.max(...zones.map((z: any) => z.pricingMultiplier)) : 1.0;

  return (
    <DashboardLayout searchPlaceholder="Search zones...">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={<MapIcon className="h-5 w-5 text-indigo-500" />} label="Total Zones" value={zones.length.toString()} badge="Configured" badgeColor="success" />
          <StatCard icon={<Compass className="h-5 w-5 text-emerald-500" />} label="Active Zones" value={activeZonesCount.toString()} badge="Live Geofences" badgeColor="success" />
          <StatCard icon={<MapPin className="h-5 w-5 text-amber-500" />} label="Surge Multipliers" value={`${maxMultiplier}x Max`} badge="Dynamic Pricing" badgeColor="warning" />
          <div className="stat-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 flex flex-col justify-between p-5 rounded-xl border">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Dynamic Control</p>
              <h4 className="text-2xl font-bold text-foreground mt-1.5">Map Engine</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Visualizing operational boundaries using Google Cloud.</p>
          </div>
        </div>

        {/* Main Grid: Zones List (Col 2/3) and Map Preview (Col 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zones Table (Left Side) */}
          <div className="lg:col-span-2 section-card flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Operational Zones</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Define coordinates and dynamic pricing settings.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { resetForm(); setIsAddOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> Create Zone
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-border">
                      <th className="table-header-text text-left px-6 py-3">Zone Details</th>
                      <th className="table-header-text text-left px-6 py-3">Type</th>
                      <th className="table-header-text text-left px-6 py-3">Pricing (Base)</th>
                      <th className="table-header-text text-left px-6 py-3">Live Surge</th>
                      <th className="table-header-text text-left px-6 py-3">Supply / Demand</th>
                      <th className="table-header-text text-left px-6 py-3">Restrictions</th>
                      <th className="table-header-text text-left px-6 py-3">Status</th>
                      <th className="table-header-text text-left px-6 py-3">Auto-Surge</th>
                      <th className="table-header-text text-left px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                          Loading zones...
                        </td>
                      </tr>
                    ) : zones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          No operational zones found. Click "Create Zone" to define one.
                        </td>
                      </tr>
                    ) : (
                      zones.map((z: any) => {
                        const isSelected = selectedZone?._id === z._id;
                        const hasTimeLimits = z.activeHours?.start && z.activeHours?.end;
                        const hasServiceLimits = z.allowedServices && z.allowedServices.length > 0;
                        
                        return (
                          <tr 
                            key={z._id} 
                            onClick={() => handleSelectZone(z)}
                            className={`border-t border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                              isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                }`}>
                                  <MapIcon className="h-4.5 w-4.5" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{z.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{z.description || "No description"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                z.type === "circle" 
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" 
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              }`}>
                                {z.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-foreground">{z.pricingMultiplier}x</span>
                            </td>
                            <td className="px-6 py-4">
                              {z.autoSurgeEnabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-bold animate-pulse shadow">
                                  <Flame className="h-3 w-3" /> {z.currentSurge || z.pricingMultiplier}x
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Static</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-xs text-foreground gap-0.5">
                                <span>Drivers: <span className="font-semibold text-success">{z.supplyCount || 0}</span></span>
                                <span>Orders: <span className="font-semibold text-primary">{z.demandCount || 0}</span></span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                                {hasTimeLimits && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-amber-500" /> {z.activeHours.start} - {z.activeHours.end}
                                  </span>
                                )}
                                {hasServiceLimits ? (
                                  <span className="flex items-center gap-1 truncate max-w-[120px]" title={z.allowedServices.join(", ")}>
                                    <ShieldCheck className="h-3 w-3 text-indigo-500" /> {z.allowedServices.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded w-max text-muted-foreground">All Services</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={(e) => handleToggleActive(z, e)}
                                className="flex items-center gap-1.5 focus:outline-none"
                              >
                                {z.isActive ? (
                                  <>
                                    <ToggleRight className="h-6 w-6 text-success" />
                                    <span className="text-xs font-semibold text-success">Live</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">Disabled</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleZoneMutation.mutate({
                                    zoneId: z._id,
                                    data: { autoSurgeEnabled: !z.autoSurgeEnabled },
                                  });
                                }}
                                className="flex items-center gap-1.5 focus:outline-none"
                                title="Toggle Auto-Surge Pricing"
                              >
                                {z.autoSurgeEnabled ? (
                                  <>
                                    <ToggleRight className="h-6 w-6 text-amber-500" />
                                    <span className="text-xs font-semibold text-amber-500">Auto</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">Static</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSelectZone(z); }}
                                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                  title="View on Map"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={(e) => handleDelete(z._id, e)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  title="Delete Zone"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Map Preview Panel (Right Side) */}
          <div className="lg:col-span-1 section-card flex flex-col overflow-hidden h-[500px] lg:h-auto min-h-[450px]">
            <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <MapIcon className="h-4.5 w-4.5 text-primary" /> Live Zone Geofence
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedZone ? `Previewing: ${selectedZone.name}` : "Select a zone to preview"}
                </p>
              </div>
              {selectedZone && (
                <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                  {selectedZone.pricingMultiplier}x
                </span>
              )}
            </div>

            {/* Map Frame Container */}
            <div className="flex-1 w-full h-full bg-muted/40 relative">
              {!isLoaded ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mb-2 text-primary" />
                  <p className="text-xs font-medium">Loading Google Map Engine...</p>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={(map) => { mapRef.current = map; }}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                  }}
                >
                  {selectedZone && selectedZone.type === "circle" && selectedZone.center?.coordinates && (
                    <>
                      <Marker position={getGoogleCenter(selectedZone)} />
                      <MapCircle
                        center={getGoogleCenter(selectedZone)}
                        radius={Number(selectedZone.radius)}
                        options={{
                          fillColor: getZoneColors(selectedZone.pricingMultiplier).fill,
                          fillOpacity: 0.35,
                          strokeColor: getZoneColors(selectedZone.pricingMultiplier).stroke,
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                          clickable: false,
                          editable: false,
                          zIndex: 1,
                        }}
                      />
                    </>
                  )}

                  {selectedZone && selectedZone.type === "polygon" && selectedZone.boundary?.coordinates?.[0] && (
                    <MapPolygon
                      paths={getGoogleCoords(selectedZone)}
                      options={{
                        fillColor: getZoneColors(selectedZone.pricingMultiplier).fill,
                        fillOpacity: 0.35,
                        strokeColor: getZoneColors(selectedZone.pricingMultiplier).stroke,
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        clickable: false,
                        editable: false,
                        zIndex: 1,
                      }}
                    />
                  )}
                </GoogleMap>
              )}

              {/* Legends Overlay */}
              <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg border border-border shadow-md text-[10px] space-y-1.5 z-10">
                <p className="font-semibold text-foreground uppercase tracking-wider mb-1">Surge Legend</p>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-red-500/40 border border-red-500" />
                  <span className="text-muted-foreground font-medium">Critical (&gt;= 2.0x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-orange-500/40 border border-orange-500" />
                  <span className="text-muted-foreground font-medium">High (1.5x - 1.9x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-yellow-500/40 border border-yellow-500" />
                  <span className="text-muted-foreground font-medium">Moderate (1.1x - 1.4x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-indigo-500/40 border border-indigo-500" />
                  <span className="text-muted-foreground font-medium">Standard (1.0x)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Zone Dialog/Modal - Double Column Layout */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 bg-card">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-base">Create Dynamic Pricing Zone</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2">
              {/* Left Column: Form Details */}
              <form onSubmit={handleCreateZone} className="p-6 space-y-4 border-r border-border overflow-y-auto max-h-[75vh]">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Zone Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Airport High Demand Area"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Geofence Type</label>
                    <select 
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value);
                        if (e.target.value === "circle") {
                          setPolyCoords("[]");
                        } else {
                          setCenterLat("");
                          setCenterLng("");
                        }
                      }}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="polygon">Polygon (Custom shape)</option>
                      <option value="circle">Circular Radius</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price Multiplier (Surge)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={multiplier}
                      onChange={(e) => setMultiplier(e.target.value)}
                      placeholder="e.g. 1.5"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    id="autoSurge"
                    checked={autoSurge}
                    onChange={(e) => setAutoSurge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="autoSurge" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Enable Automatic Pricing Surge (Dynamic Supply vs. Demand scaling)
                  </label>
                </div>

                {type === "circle" ? (
                  <div className="bg-muted/30 p-4 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-primary" /> Circle Center (Click map or enter below)
                      </p>
                      <button 
                        type="button" 
                        onClick={clearModalCoordinates}
                        className="text-[10px] text-destructive hover:underline font-semibold"
                      >
                        Clear coords
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Latitude</label>
                        <input 
                          type="number" 
                          step="0.000001"
                          value={centerLat}
                          onChange={(e) => setCenterLat(e.target.value)}
                          placeholder="e.g. 12.9200"
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Longitude</label>
                        <input 
                          type="number" 
                          step="0.000001"
                          value={centerLng}
                          onChange={(e) => setCenterLng(e.target.value)}
                          placeholder="e.g. 77.6400"
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Radius (in Meters)</label>
                      <input 
                        type="number" 
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-4 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Polygon coordinates (Click map to draw)
                      </p>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={handleUndoCoordinate}
                          className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                          title="Remove Last Point"
                        >
                          <Undo className="h-3 w-3" /> Undo Point
                        </button>
                        <button 
                          type="button" 
                          onClick={clearModalCoordinates}
                          className="text-[10px] text-destructive hover:underline font-semibold"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    <div>
                      <textarea 
                        rows={3}
                        value={polyCoords}
                        onChange={(e) => setPolyCoords(e.target.value)}
                        placeholder="[[lng, lat], [lng, lat], ...]"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                      <div className="flex items-start gap-1.5 mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-lg">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-normal">
                          Coordinate format expects an array of <strong>[longitude, latitude]</strong> points.
                          You can click points directly on the preview map to construct the shape, or drag existing nodes to refine them!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Advanced Options Panel */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-4 py-3 bg-muted/40 hover:bg-muted/70 flex items-center justify-between transition-colors border-b border-border"
                  >
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Advanced Configurations
                    </span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="p-4 space-y-4 bg-background">
                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zone Notes / Description</label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Surge applied during peak hours or heavy traffic seasons"
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Applicable Services */}
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Restricted Service Types (None = All Allowed)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_SERVICES.map(s => {
                            const isSelected = selectedServices.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleServiceSelection(s.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                  isSelected 
                                    ? "bg-primary/10 border-primary text-primary" 
                                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Window */}
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Active Time Slot Restrictions</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-muted-foreground mb-1 uppercase">Start Time</label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-muted-foreground mb-1 uppercase">End Time</label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1.5">
                          If configured, dynamic pricing will only be applied to orders placed within this time interval.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 border-input rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-foreground">Activate immediately</label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createZoneMutation.isPending}
                    className="px-5 py-2 bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 rounded-lg flex items-center gap-1"
                  >
                    {createZoneMutation.isPending ? "Creating..." : "Save Zone"}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Modal Map Preview */}
              <div className="h-[350px] md:h-auto bg-muted/40 relative flex flex-col justify-end">
                <div className="absolute top-4 left-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border shadow-md text-[11px] z-10 space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <MapIcon className="h-3.5 w-3.5 text-primary" /> Live Drawing Engine
                  </p>
                  <p className="text-muted-foreground leading-normal">
                    {type === "circle" 
                      ? "Click anywhere on the map to set the circular center point. Drag the blue marker to adjust center location."
                      : "Click points sequentially on the map to outline the polygon geofence shape. Drag node markers (1, 2, 3...) to adjust vertices live."}
                  </p>
                </div>

                {!isLoaded ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mb-2 text-primary" />
                    <p className="text-xs">Loading Live Preview Map...</p>
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={modalMapCenter}
                    zoom={modalMapZoom}
                    onClick={handleModalMapClick}
                    options={{
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {type === "circle" && previewCircleCenter && (
                      <>
                        <Marker 
                          position={previewCircleCenter} 
                          draggable={true}
                          onDragEnd={(e) => {
                            const lat = e.latLng?.lat();
                            const lng = e.latLng?.lng();
                            if (lat && lng) {
                              setCenterLat(lat.toFixed(6));
                              setCenterLng(lng.toFixed(6));
                            }
                          }}
                        />
                        <MapCircle
                          center={previewCircleCenter}
                          radius={Number(radius) || 1000}
                          options={{
                            fillColor: "#3b82f6",
                            fillOpacity: 0.25,
                            strokeColor: "#2563eb",
                            strokeOpacity: 0.7,
                            strokeWeight: 2,
                            clickable: false,
                            editable: false,
                          }}
                        />
                      </>
                    )}

                    {type === "polygon" && previewPolygonPath.length > 0 && (
                      <>
                        {getPolygonMarkers().map((pt, i) => (
                          <Marker 
                            key={i} 
                            position={pt}
                            draggable={true}
                            onDragEnd={(e) => handleMarkerDragEnd(i, e)}
                            label={{
                              text: (i + 1).toString(),
                              color: "#ffffff",
                              fontSize: "11px",
                              fontWeight: "bold",
                            }}
                          />
                        ))}
                        <MapPolygon
                          paths={previewPolygonPath}
                          options={{
                            fillColor: "#8b5cf6",
                            fillOpacity: 0.25,
                            strokeColor: "#7c3aed",
                            strokeOpacity: 0.7,
                            strokeWeight: 2.5,
                            clickable: false,
                            editable: false,
                          }}
                        />
                      </>
                    )}
                  </GoogleMap>
                )}

                {/* Map Action Info Overlay */}
                <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-md text-[10px] font-semibold text-muted-foreground z-10 uppercase tracking-wider">
                  Interactive Drawing Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
