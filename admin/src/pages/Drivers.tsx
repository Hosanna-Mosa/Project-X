import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { Truck, Users as UsersIcon, Star, DollarSign, SlidersHorizontal, UserPlus, Eye, PhoneOff, ChevronLeft, ChevronRight, MapPin, Trash2, Ban, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { DownloadReportDialog } from "@/components/shared/DownloadReportDialog";

export default function Drivers() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [viewingDriver, setViewingDriver] = useState<any | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA",
  });

  // New Driver Form State
  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    vehicleType: "bike",
    role: "DRIVER"
  });

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: () => adminFetch<any[]>("/admin/drivers"),
  });

  const createDriverMutation = useMutation({
    mutationFn: (data: any) => adminFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver onboarded successfully");
      setIsAddOpen(false);
      setNewDriver({ name: "", email: "", phone: "", password: "", vehicleType: "bike", role: "DRIVER" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to onboard driver");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminFetch(`/admin/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update driver status");
    }
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) => adminFetch(`/admin/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isBlocked })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver block status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update block status");
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: string) => adminFetch(`/admin/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver registration deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete driver");
    }
  });

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone) {
      toast.error("Name and phone are required");
      return;
    }
    createDriverMutation.mutate(newDriver);
  };

  const handleToggleStatus = (driver: any) => {
    const nextStatus = driver.status === "ONLINE" ? "OFFLINE" : "ONLINE";
    toggleStatusMutation.mutate({ id: driver._id, status: nextStatus });
  };

  const handleDeleteClick = (driver: any) => {
    if (confirm(`Are you sure you want to remove driver ${driver.user?.name}?`)) {
      deleteDriverMutation.mutate(driver._id);
    }
  };

  const handleViewClick = (driver: any) => {
    setViewingDriver(driver);
    setIsViewOpen(true);
  };

  const onlineDrivers = drivers.filter((d: any) => d.status === "ONLINE").length;

  const filteredDrivers = drivers.filter((d: any) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ONLINE") return d.status === "ONLINE";
    if (statusFilter === "OFFLINE") return d.status === "OFFLINE";
    if (statusFilter === "BLOCKED") return d.user?.isBlocked === true;
    return true;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDrivers = filteredDrivers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const driverMarkers = drivers.map((d: any) => {
    const lng = d.currentLocation?.coordinates?.[0] || 81.8040;
    const lat = d.currentLocation?.coordinates?.[1] || 17.0005;
    return {
      lat: Number(lat),
      lng: Number(lng),
      name: d.user?.name || "Driver",
      vehicle: d.vehicleNumber || "VAN",
      status: d.status
    };
  }).filter((m: any) => !isNaN(m.lat) && !isNaN(m.lng));

  const defaultCenter = { lat: 17.0005, lng: 81.8040 };

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50">
                    <SlidersHorizontal className="h-4 w-4" /> Filter: {statusFilter}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setStatusFilter("ALL"); setCurrentPage(1); }} className="cursor-pointer">All Statuses</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter("ONLINE"); setCurrentPage(1); }} className="cursor-pointer">Online</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter("OFFLINE"); setCurrentPage(1); }} className="cursor-pointer">Offline</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter("BLOCKED"); setCurrentPage(1); }} className="cursor-pointer">Blocked Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
              >
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
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No drivers found matching the filter.</td>
                </tr>
              ) : (
                paginatedDrivers.map((d: any) => (
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{d.user?.name}</p>
                            {d.user?.isBlocked && (
                              <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-bold uppercase">Blocked</span>
                            )}
                          </div>
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
                      <p className="text-sm font-semibold text-foreground">₹0.00</p>
                      <p className="text-xs text-primary">Target: ₹0</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-foreground">4.8</span>
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleViewClick(d)} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="View Details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => toast.success(`Initiating call with ${d.user?.name || "Driver"} at ${d.user?.phone}...`)} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Call Driver">
                          <Phone className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(d)} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Toggle On/Off Duty">
                          <PhoneOff className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => toggleBlockMutation.mutate({ id: d._id, isBlocked: !d.user?.isBlocked })} 
                          className={`p-1.5 rounded-full transition-colors ${d.user?.isBlocked ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                          title={d.user?.isBlocked ? "Unblock Driver Account" : "Block Driver Account"}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(d)} className="p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Remove Driver">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Showing {paginatedDrivers.length} of {filteredDrivers.length} drivers</p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => (
                <button 
                  key={idx + 1} 
                  onClick={() => setCurrentPage(idx + 1)} 
                  className={`h-8 w-8 rounded text-sm font-medium transition-all ${
                    currentPage === idx + 1 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-border rounded text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-3 gap-4">
          {/* Map */}
          <div className="col-span-2 section-card overflow-hidden h-[280px] relative">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={defaultCenter}
                zoom={12}
                options={{
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                {driverMarkers.map((m: any, i: number) => (
                  <Marker
                    key={i}
                    position={{ lat: m.lat, lng: m.lng }}
                    title={`${m.name} (${m.vehicle}) - ${m.status}`}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Loading Fleet Map...
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-card/90 backdrop-blur px-3 py-1.5 rounded-full z-10 shadow">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs font-medium text-foreground">Live Fleet Positioning</span>
            </div>
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
            <button 
              onClick={() => setIsDownloadOpen(true)}
              className="mt-4 self-start px-5 py-2.5 bg-card text-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Generate Fleet Report
            </button>
          </div>
        </div>

        <DownloadReportDialog
          open={isDownloadOpen}
          onOpenChange={setIsDownloadOpen}
          title="Fleet Drivers Report"
          data={drivers.map((d: any) => ({
            "Driver Name": d.user?.name || "N/A",
            "Email": d.user?.email || "N/A",
            "Phone": d.user?.phone || "N/A",
            "Vehicle Type": d.vehicleType || "N/A",
            "Vehicle Number": d.vehicleNumber || "N/A",
            "Duty Status": d.status || "N/A",
            "Onboarding Status": d.onboardingStatus || "N/A"
          }))}
        />
      </div>

      {/* Add/Onboard Driver Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Onboard New Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOnboardSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Driver Full Name</label>
              <Input 
                value={newDriver.name} 
                onChange={e => setNewDriver({...newDriver, name: e.target.value})} 
                placeholder="e.g. David Miller"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email"
                value={newDriver.email} 
                onChange={e => setNewDriver({...newDriver, email: e.target.value})} 
                placeholder="david@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input 
                value={newDriver.phone} 
                onChange={e => setNewDriver({...newDriver, phone: e.target.value})} 
                placeholder="e.g. 9876543211"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password"
                value={newDriver.password} 
                onChange={e => setNewDriver({...newDriver, password: e.target.value})} 
                placeholder="Set driver portal password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Category</label>
              <select 
                value={newDriver.vehicleType} 
                onChange={e => setNewDriver({...newDriver, vehicleType: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="bike">Motorcycle / Bicycle (bike)</option>
                <option value="auto">Three-Wheeler Auto (auto)</option>
                <option value="car">Delivery Van / Car (car)</option>
              </select>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createDriverMutation.isPending}>
              {createDriverMutation.isPending ? "Onboarding..." : "Onboard Driver"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Driver Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Driver Dossier</DialogTitle>
          </DialogHeader>
          {viewingDriver && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Full Name:</span>
                <span className="font-medium text-foreground">{viewingDriver.user?.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Phone:</span>
                <span className="font-medium text-foreground">{viewingDriver.user?.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground">{viewingDriver.user?.email || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Vehicle Type:</span>
                <span className="font-medium text-foreground uppercase">{viewingDriver.vehicleType || "bike"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Duty Status:</span>
                <span className="font-medium text-foreground">{viewingDriver.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Onboarding Status:</span>
                <span className="font-medium text-foreground uppercase">{viewingDriver.onboardingStatus}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Active Location:</span>
                <span className="font-medium text-foreground">{viewingDriver.currentLocation?.coordinates?.join(", ") || "Unknown"}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
