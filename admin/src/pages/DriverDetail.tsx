import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { 
  Truck, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  User,
  Activity,
  CreditCard,
  Trash2,
  MessageSquare
} from "lucide-react";

interface DriverProfile {
  _id: string;
  status: string;
  isAvailable: boolean;
  vehicleType?: string;
  gender?: string;
  onboardingStatus: string;
  aadhaarNumber?: string;
  aadhaarVerified: boolean;
  panNumber?: string;
  dlNumber?: string;
  dlExpiry?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankVerified: boolean;
  user?: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    isBlocked: boolean;
  };
  preferredZone?: {
    _id: string;
    name: string;
  };
  preferredZones?: {
    _id: string;
    name: string;
  }[];
}

interface OrderItem {
  _id: string;
  serviceType: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  stops: { address?: string }[];
}

interface DriverDetailResponse {
  driver: DriverProfile;
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  };
  orders: OrderItem[];
}

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOrderChat, setSelectedOrderChat] = useState<string | null>(null);
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const [zone1Id, setZone1Id] = useState("");
  const [zone2Id, setZone2Id] = useState("");

  const { data: chatMessages = [], isLoading: isChatLoading } = useQuery<any[]>({
    queryKey: ["order-chat", selectedOrderChat],
    queryFn: () => adminFetch<any[]>(`/admin/orders/${selectedOrderChat}/chat`),
    enabled: !!selectedOrderChat
  });

  const { data: zonesResponse } = useQuery<any>({
    queryKey: ["admin-zones"],
    queryFn: () => adminFetch<any>("/zones"),
  });
  const zones = zonesResponse?.data || [];

  const { data, isLoading, error } = useQuery<DriverDetailResponse>({
    queryKey: ["admin-driver-detail", id],
    queryFn: () => adminFetch<DriverDetailResponse>(`/admin/drivers/${id}`),
    enabled: !!id
  });

  useEffect(() => {
    if (data?.driver) {
      const pZones = data.driver.preferredZones || [];
      setZone1Id(pZones[0]?._id || data.driver.preferredZone?._id || "");
      setZone2Id(pZones[1]?._id || "");
    }
  }, [data]);

  const updateDriverMutation = useMutation({
    mutationFn: (updateData: any) => 
      adminFetch(`/admin/drivers/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      }),
    onSuccess: () => {
      toast.success("Driver dossier updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-driver-detail", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update driver");
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: () => adminFetch(`/admin/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Driver registration deleted successfully");
      navigate("/drivers");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete driver");
    }
  });

  const handleDeleteClick = () => {
    if (confirm("Are you sure you want to permanently remove this driver registration?")) {
      deleteDriverMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <h2 className="text-xl font-bold text-destructive">Error Loading Driver Details</h2>
          <p className="text-muted-foreground">The requested driver profile could not be found or there was an issue retrieving the data.</p>
          <Button onClick={() => navigate("/drivers")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Drivers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { driver, stats, orders } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/drivers")} className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Back to Drivers
          </Button>
          <div className="flex gap-2">
            <Button
              variant={driver.user?.isBlocked ? "outline" : "destructive"}
              className="rounded-xl gap-2"
              onClick={() => updateDriverMutation.mutate({ isBlocked: !driver.user?.isBlocked })}
              disabled={updateDriverMutation.isPending}
            >
              {driver.user?.isBlocked ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-green-500" /> Reactivate Duty
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" /> Block Driver Account
                </>
              )}
            </Button>
            <Button variant="destructive" className="rounded-xl gap-2" onClick={handleDeleteClick}>
              <Trash2 className="h-4.5 w-4.5" /> Remove Driver
            </Button>
          </div>
        </div>

        {/* Identity & Status */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{driver.user?.name}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  driver.status === "ONLINE" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                }`}>
                  {driver.status}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  driver.onboardingStatus === "completed" ? "bg-green-100 text-green-800" :
                  driver.onboardingStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  Onboarding: {driver.onboardingStatus || "not_started"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Phone: {driver.user?.phone} • Email: {driver.user?.email || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-end text-right">
            <div className="flex items-center gap-1.5 justify-end text-sm text-foreground font-semibold text-right">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                Zones: {driver.preferredZones && driver.preferredZones.length > 0 
                  ? driver.preferredZones.map(z => z.name).join(" & ") 
                  : driver.preferredZone?.name || "No Assigned Zones"}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs px-2.5 rounded-lg border-primary/20 hover:border-primary/50 text-primary font-semibold flex items-center gap-1 mt-1"
              onClick={() => setIsZoneOpen(true)}
            >
              Assign Zone
            </Button>
            <span className="text-[10px] text-muted-foreground mt-0.5">Vehicle: {driver.vehicleType || "bike"}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-5 rounded-3xl text-center space-y-1 shadow-sm">
            <Activity className="h-5 w-5 text-blue-500 mx-auto" />
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider font-semibold">Total Trips Received</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl text-center space-y-1 shadow-sm">
            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
            <p className="text-2xl font-bold text-foreground">{stats.completedOrders}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider font-semibold">Completed Trips</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl text-center space-y-1 shadow-sm">
            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
            <p className="text-2xl font-bold text-foreground">{stats.cancelledOrders}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider font-semibold">Cancelled Trips</p>
          </div>
        </div>

        {/* Profile Details & Document Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Document Verifications */}
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-foreground">Documents & Approvals</h3>
              <p className="text-xs text-muted-foreground">Verify driver identities and toggle onboarding status to control route assignments.</p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
                  <div>
                    <span className="font-semibold text-xs text-foreground block">Aadhaar Document</span>
                    <span className="text-[10px] text-muted-foreground">{driver.aadhaarNumber || "Not Provided"}</span>
                  </div>
                  <Button 
                    size="sm"
                    variant={driver.aadhaarVerified ? "outline" : "default"}
                    onClick={() => updateDriverMutation.mutate({ aadhaarVerified: !driver.aadhaarVerified })}
                  >
                    {driver.aadhaarVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
                  <div>
                    <span className="font-semibold text-xs text-foreground block">Bank Settlement Accounts</span>
                    <span className="text-[10px] text-muted-foreground">
                      {driver.bankAccountNumber ? `${driver.bankAccountNumber} (${driver.bankIfsc})` : "Not Provided"}
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    variant={driver.bankVerified ? "outline" : "default"}
                    onClick={() => updateDriverMutation.mutate({ bankVerified: !driver.bankVerified })}
                  >
                    {driver.bankVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                {driver.dlNumber && (
                  <div className="p-3 bg-muted rounded-xl border border-border space-y-1 text-xs">
                    <span className="font-semibold text-foreground block">Driving License (DL)</span>
                    <span className="text-muted-foreground block">DL Number: {driver.dlNumber}</span>
                    {driver.dlExpiry && (
                      <span className="text-muted-foreground block">DL Expiry: {new Date(driver.dlExpiry).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Onboarding Control Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  onClick={() => updateDriverMutation.mutate({ onboardingStatus: "completed", aadhaarVerified: true, bankVerified: true })}
                >
                  Approve Driver
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1 rounded-lg"
                  onClick={() => updateDriverMutation.mutate({ onboardingStatus: "rejected" })}
                >
                  Reject Driver
                </Button>
              </div>
            </div>
          </div>

          {/* Job History / Trips Table */}
          <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-foreground">Executed Trips & Deliveries</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-xs">
                    <th className="table-header-text text-left px-4 py-2.5">Trip ID</th>
                    <th className="table-header-text text-left px-4 py-2.5">Category</th>
                    <th className="table-header-text text-left px-4 py-2.5">Earnings</th>
                    <th className="table-header-text text-left px-4 py-2.5">Status</th>
                    <th className="table-header-text text-left px-4 py-2.5">Date</th>
                    <th className="table-header-text text-left px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No trip logs recorded for this driver account.</td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">
                          <Link to={`/live-orders/${order._id}`} className="hover:underline">
                            {order._id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 uppercase font-medium">{order.serviceType}</td>
                        <td className="px-4 py-3 font-semibold">₹{Math.round(order.totalPrice * 0.8)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            order.status === "COMPLETED" || order.status === "DELIVERED" || order.status === "delivered"
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : order.status === "CANCELLED"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] gap-1 rounded-lg"
                            onClick={() => setSelectedOrderChat(order._id)}
                          >
                            <MessageSquare className="h-3 w-3" /> View Chat
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Assignment Dialog */}
      <Dialog open={isZoneOpen} onOpenChange={setIsZoneOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign Preferred Zones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <p className="text-muted-foreground text-xs">Select up to 2 operational zones for driver {driver.user?.name}.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Zone 1</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={zone1Id}
                onChange={e => setZone1Id(e.target.value)}
              >
                <option value="">No Zone Selected</option>
                {zones.map((zone: any) => (
                  <option key={zone._id} value={zone._id}>{zone.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Zone 2</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={zone2Id}
                onChange={e => setZone2Id(e.target.value)}
              >
                <option value="">No Zone Selected</option>
                {zones.map((zone: any) => (
                  <option key={zone._id} value={zone._id}>{zone.name}</option>
                ))}
              </select>
            </div>
            <Button
              className="w-full rounded-xl mt-2"
              onClick={() => {
                const selectedZones = [zone1Id, zone2Id].filter(Boolean);
                updateDriverMutation.mutate({ 
                  preferredZones: selectedZones,
                  preferredZone: selectedZones[0] || null
                });
                setIsZoneOpen(false);
              }}
              disabled={updateDriverMutation.isPending}
            >
              Confirm Zone Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Chat Dialog */}
      <Dialog open={!!selectedOrderChat} onOpenChange={(open) => !open && setSelectedOrderChat(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Chat Log for {selectedOrderChat}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 h-[400px] overflow-y-auto pr-2">
            {isChatLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading chat messages...</div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No chat history recorded for this trip.</div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => {
                  const isDriver = msg.role === "driver";
                  return (
                    <div key={msg._id} className={`flex flex-col ${isDriver ? "items-start" : "items-end"}`}>
                      <span className="text-[10px] text-muted-foreground font-semibold px-1 mb-0.5">
                        {msg.senderId?.name || (isDriver ? "Driver" : "User")} ({msg.role.toUpperCase()})
                      </span>
                      <div className={`px-3 py-2 rounded-2xl max-w-[80%] text-xs ${
                        isDriver 
                          ? "bg-muted text-foreground rounded-tl-none" 
                          : "bg-primary text-primary-foreground rounded-tr-none"
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground px-1 mt-0.5">{msg.time || new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
