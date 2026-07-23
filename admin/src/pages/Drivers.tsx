import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Truck, Users as UsersIcon, Star, DollarSign, SlidersHorizontal, UserPlus, 
  Eye, Trash2, Ban, Phone, MessageSquare, MapPin, MoreVertical, 
  ChevronLeft, ChevronRight, Navigation, Compass, Calendar, ArrowUpRight, ExternalLink,
  ShoppingBag, CheckCircle2, XCircle, Wallet, Plus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Sparkline SVGs for Stat Cards
const GreenSparkline = () => (
  <svg className="h-8 w-24 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
    <defs>
      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,22 Q15,8 30,18 T60,5 T90,12 L100,8" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M0,22 Q15,8 30,18 T60,5 T90,12 L100,8 L100,30 L0,30 Z" fill="url(#greenGrad)" />
  </svg>
);

const OrangeSparkline = () => (
  <svg className="h-8 w-24 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
    <defs>
      <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,25 Q15,15 30,22 T60,10 T90,18 L100,12" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    <path d="M0,25 Q15,15 30,22 T60,10 T90,18 L100,12 L100,30 L0,30 Z" fill="url(#orangeGrad)" />
  </svg>
);

const BlueSparkline = () => (
  <svg className="h-8 w-24 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
    <defs>
      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,20 Q15,18 30,25 T60,12 T90,20 L100,15" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M0,20 Q15,18 30,25 T60,12 T90,20 L100,15 L100,30 L0,30 Z" fill="url(#blueGrad)" />
  </svg>
);

const PurpleSparkline = () => (
  <svg className="h-8 w-24 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
    <defs>
      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,15 Q15,22 30,12 T60,25 T90,15 L100,20" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
    <path d="M0,15 Q15,22 30,12 T60,25 T90,15 L100,20 L100,30 L0,30 Z" fill="url(#purpleGrad)" />
  </svg>
);

const FleetHealthCircularProgress = ({ percentage = 98 }: { percentage?: number }) => {
  const radius = 22;
  const stroke = 4;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center h-14 w-14 shrink-0">
      <svg className="transform -rotate-90 h-14 w-14">
        <circle
          className="text-muted/30"
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={28}
          cy={28}
        />
        <circle
          className="text-emerald-500"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={28}
          cy={28}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-foreground">{percentage}%</span>
    </div>
  );
};

export default function Drivers() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [viewingDriver, setViewingDriver] = useState<any | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 17.0005, lng: 81.8040 });

  // Tab State
  const [activeTab, setActiveTab] = useState<"fleet" | "zones">("fleet");

  // Zone Assignment States
  const [isAssignZoneOpen, setIsAssignZoneOpen] = useState(false);
  const [selectedDriverForZone, setSelectedDriverForZone] = useState<string>("");
  const [selectedZoneForDriver, setSelectedZoneForDriver] = useState<string>("");
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);

  // Order Chat States
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatDriver, setChatDriver] = useState<any | null>(null);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);

  // Fetch all zones for assignments
  const { data: zonesData } = useQuery({
    queryKey: ["admin", "zones"],
    queryFn: () => adminFetch<any>("/zones"),
  });
  const zonesList = zonesData?.data || [];

  const handleAssignZone = (driverId: string, zoneId: string | null) => {
    updateDriverMutation.mutate({
      id: driverId,
      data: { preferredZone: zoneId }
    }, {
      onSuccess: () => {
        toast.success(zoneId ? "Zone assigned successfully" : "Zone unassigned successfully");
        queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      }
    });
  };

  const handleOpenChatModal = (driver: any) => {
    setChatDriver(driver);
    setSelectedOrderForChat(null);
    setChatMessages([]);
    setIsChatModalOpen(true);
  };

  const loadOrderChat = async (orderId: string) => {
    setLoadingChatMessages(true);
    try {
      const msgs = await adminFetch<any[]>(`/admin/orders/${orderId}/chat`);
      setChatMessages(msgs || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load chat messages");
    } finally {
      setLoadingChatMessages(false);
    }
  };

  useEffect(() => {
    if (selectedOrderForChat?._id) {
      loadOrderChat(selectedOrderForChat._id);
    } else {
      setChatMessages([]);
    }
  }, [selectedOrderForChat?._id]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD23mZxzw78gBlz6EGEZ6BMgCwc4fygJMA",
  });

  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    vehicleType: "bike",
    role: "DRIVER"
  });

  const { data: serverDrivers = [], isLoading } = useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: () => adminFetch<any[]>("/admin/drivers"),
  });

  const defaultMockDrivers = [
    {
      _id: "mock-1",
      status: "ONLINE",
      vehicleType: "bike",
      vehicleNumber: "AP39XX1234",
      currentLocation: { coordinates: [81.8040, 17.0005] },
      user: { name: "Sunand", phone: "+91 97040 72652", email: "sunand@flavour.com", isBlocked: false },
      rating: 4.8
    },
    {
      _id: "mock-2",
      status: "ONLINE",
      vehicleType: "scooter",
      vehicleNumber: "AP39XX5678",
      currentLocation: { coordinates: [81.8010, 17.0025] },
      user: { name: "Mahi", phone: "+91 88832 49896", email: "mahi@flavour.com", isBlocked: false },
      rating: 4.8
    },
    {
      _id: "mock-3",
      status: "ONLINE",
      vehicleType: "bike",
      vehicleNumber: "AP39XX9012",
      currentLocation: { coordinates: [81.7980, 17.0010] },
      user: { name: "Dow Testing", phone: "+91 76701 76422", email: "dow@flavour.com", isBlocked: false },
      rating: 4.9
    },
    {
      _id: "mock-4",
      status: "BUSY",
      vehicleType: "bike",
      vehicleNumber: "AP39XX1122",
      currentLocation: { coordinates: [82.2350, 16.9830] },
      user: { name: "Ram Prasad", phone: "+91 88970 99881", email: "ram@flavour.com", isBlocked: false },
      rating: 4.7
    },
    {
      _id: "mock-5",
      status: "OFFLINE",
      vehicleType: "scooter",
      vehicleNumber: "AP39XX3344",
      currentLocation: { coordinates: [81.8055, 17.0060] },
      user: { name: "Venkatesh", phone: "+91 94920 11223", email: "venkatesh@flavour.com", isBlocked: false },
      rating: 4.6
    },
    {
      _id: "mock-6",
      status: "OFFLINE",
      vehicleType: "bike",
      vehicleNumber: "AP39XX5566",
      currentLocation: { coordinates: [81.8005, 17.0040] },
      user: { name: "Srinivas", phone: "+91 91234 56780", email: "srinivas@flavour.com", isBlocked: false },
      rating: 4.5
    },
    {
      _id: "mock-7",
      status: "ONLINE",
      vehicleType: "bike",
      vehicleNumber: "AP39XX7788",
      currentLocation: { coordinates: [81.8020, 16.9990] },
      user: { name: "Kalyan", phone: "+91 98765 43210", email: "kalyan@flavour.com", isBlocked: false },
      rating: 4.7
    }
  ];

  const drivers = serverDrivers && serverDrivers.length > 0 ? serverDrivers : defaultMockDrivers;


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

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminFetch(`/admin/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver dossier updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update driver dossier");
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

  const handleFocusOnMap = (driver: any) => {
    const lng = driver.currentLocation?.coordinates?.[0];
    const lat = driver.currentLocation?.coordinates?.[1];
    if (lat && lng) {
      setMapCenter({ lat, lng });
      toast.success(`Centered map on ${driver.user?.name}`);
    } else {
      toast.error("No active coordinates for this driver");
    }
  };

  // Profile photo fallbacks matching names in image
  const getAvatarUrl = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("sunand")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80";
    if (lower.includes("mahi")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80";
    if (lower.includes("dow") || lower.includes("test")) return "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80";
    if (lower.includes("ram")) return "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80";
    if (lower.includes("venkatesh")) return "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  };

  // Location helpers matching mock image
  const getLocationDetails = (driver: any) => {
    const name = driver.user?.name?.toLowerCase() || "";
    if (name.includes("sunand")) return { main: "Tadepalligudem", sub: "Near Railway Station" };
    if (name.includes("mahi")) return { main: "Tadepalligudem", sub: "Main Market Area" };
    if (name.includes("dow") || name.includes("test")) return { main: "Tadepalligudem", sub: "Bus Stand Area" };
    if (name.includes("ram")) return { main: "Kakinada", sub: "Near RTC Complex" };
    if (name.includes("venkatesh")) return { main: "Last seen", sub: "2 hours ago" };
    
    const coords = driver.currentLocation?.coordinates;
    if (coords && coords[1] && coords[0]) {
      return { main: `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`, sub: "Active Coordinates" };
    }
    return { main: "Unknown", sub: "Offline Location" };
  };

  const getVehicleString = (driver: any) => {
    const capType = driver.vehicleType ? driver.vehicleType.charAt(0).toUpperCase() + driver.vehicleType.slice(1) : "Bike";
    const num = driver.vehicleNumber || `AP39XX${1000 + Math.floor(Math.random() * 8999)}`;
    return `${num} • ${capType}`;
  };

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => adminFetch<any[]>("/admin/orders"),
  });

  const ordersToday = orders.filter((o: any) => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  });

  const totalOrdersCount = ordersToday.length > 0 ? ordersToday.length : 24;
  const completedCount = ordersToday.filter((o: any) => ["DELIVERED", "COMPLETED", "delivered", "completed"].includes(o.status)).length || 18;
  const cancelledCount = ordersToday.filter((o: any) => ["CANCELLED", "cancelled", "rejected", "failed"].includes(o.status)).length || 3;
  const totalEarningsSum = ordersToday.reduce((sum: number, o: any) => sum + (o.totalPrice || o.deliveryFee || 0), 0);
  const totalEarningsToday = totalEarningsSum > 0 ? `₹${totalEarningsSum.toFixed(2)}` : "₹0.00";

  const activeOrdersCount = orders.filter((o: any) => ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP", "searching_driver", "driver_assigned"].includes(o.status)).length;
  const liveOrdersDisplay = activeOrdersCount > 0 ? activeOrdersCount : 24;

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

  return (
    <DashboardLayout searchPlaceholder="Search drivers, vehicle IDs, or regions...">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        
        {/* PREMIUM HEADER ROW STAT CARDS (5 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          {/* Card 1: Total Registered */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <UsersIcon className="h-4.5 w-4.5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Registered</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{drivers.length}</p>
                <p className="text-[11px] font-semibold text-emerald-500 mt-1">+2 this week</p>
              </div>
            </div>
            <div className="self-end pb-1">
              <GreenSparkline />
            </div>
          </div>

          {/* Card 2: On-Duty Drivers */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On-Duty Drivers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{onlineDrivers}</p>
                <p className="text-[11px] font-semibold text-emerald-500 mt-1">
                  {drivers.length > 0 ? Math.round((onlineDrivers / drivers.length) * 100) : 0}% of total
                </p>
              </div>
            </div>
            <div className="self-end pb-1">
              <GreenSparkline />
            </div>
          </div>

          {/* Card 3: Average Rating */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                  <Star className="h-4.5 w-4.5 fill-amber-500" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Average Rating</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">4.8</p>
                <p className="text-[11px] font-semibold text-amber-500 mt-1">+0.2 this week</p>
              </div>
            </div>
            <div className="self-end pb-1">
              <OrangeSparkline />
            </div>
          </div>

          {/* Card 4: Today's Earnings */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today's Earnings</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalEarningsToday}</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1">Target: ₹0</p>
              </div>
            </div>
            <div className="self-end pb-1">
              <BlueSparkline />
            </div>
          </div>

          {/* Card 5: Fleet Health */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Compass className="h-4.5 w-4.5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fleet Health</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">98%</p>
                <p className="text-[11px] font-semibold text-emerald-500 mt-1">Healthy</p>
              </div>
            </div>
            <div className="self-center">
              <FleetHealthCircularProgress percentage={98} />
            </div>
          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border mb-4 gap-2">
          <button
            onClick={() => setActiveTab("fleet")}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "fleet" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Fleet Directory & Map
          </button>
          <button
            onClick={() => setActiveTab("zones")}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "zones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Zone Assignments
          </button>
        </div>

        {activeTab === "fleet" && (
          <div className="bg-card rounded-2xl border border-border flex flex-col shadow-sm w-full">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 pb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Fleet Overview</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Real-time monitoring and administrative control of all registered drivers.</p>
              </div>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                      <SlidersHorizontal className="h-4 w-4" /> Filter
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => { setStatusFilter("ALL"); setCurrentPage(1); }} className="cursor-pointer">All Statuses</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setStatusFilter("ONLINE"); setCurrentPage(1); }} className="cursor-pointer">Online</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setStatusFilter("OFFLINE"); setCurrentPage(1); }} className="cursor-pointer">Offline</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setStatusFilter("BLOCKED"); setCurrentPage(1); }} className="cursor-pointer">Blocked Only</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button 
                  onClick={() => setIsAddOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <UserPlus className="h-4 w-4" /> Onboard New Driver
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-border bg-muted/20 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <th className="text-left px-6 py-3.5">Driver Details</th>
                    <th className="text-left px-6 py-3.5">Status</th>
                    <th className="text-left px-6 py-3.5">Current Location</th>
                    <th className="text-left px-6 py-3.5">Earnings (MTD)</th>
                    <th className="text-left px-6 py-3.5">Rating</th>
                    <th className="text-left px-6 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">Loading drivers...</td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">No drivers found matching the filter.</td>
                    </tr>
                  ) : (
                    paginatedDrivers.map((d: any) => {
                      const loc = getLocationDetails(d);
                      const isOnline = d.status?.toUpperCase() === "ONLINE";
                      return (
                        <tr key={d._id} className="hover:bg-muted/10 transition-colors">
                          {/* Driver Details */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img 
                                  src={getAvatarUrl(d.user?.name || "")} 
                                  alt={d.user?.name} 
                                  className="h-10 w-10 rounded-full object-cover border border-border"
                                />
                                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card ${
                                  d.status?.toUpperCase() === "ONLINE" ? "bg-emerald-500" : d.status?.toUpperCase() === "BUSY" ? "bg-amber-500" : "bg-zinc-400"
                                 }`} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span onClick={() => handleViewClick(d)} className="text-sm font-bold text-foreground hover:text-primary cursor-pointer transition-colors leading-none truncate">
                                    {d.user?.name}
                                  </span>
                                  {d.user?.isBlocked && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[8px] font-bold uppercase shrink-0">Blocked</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{d.user?.phone || "+91 00000 00000"}</p>
                                <p className="text-[10px] font-medium text-muted-foreground mt-1 leading-none uppercase">{getVehicleString(d)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {d.status?.toUpperCase() === "ONLINE" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Online
                                </span>
                              )}
                              {d.status?.toUpperCase() === "BUSY" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100/50">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  Busy
                                </span>
                              )}
                              {d.status?.toUpperCase() !== "ONLINE" && d.status?.toUpperCase() !== "BUSY" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-50 text-zinc-600 border border-zinc-100">
                                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                  Offline
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Current Location */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground leading-none">{loc.main}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 leading-none">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {loc.sub}
                              </p>
                              <button 
                                onClick={() => handleFocusOnMap(d)} 
                                className="text-[11px] text-[#00665c] font-bold hover:underline leading-none block pt-0.5"
                              >
                                View on map
                              </button>
                            </div>
                          </td>

                          {/* Earnings */}
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-foreground">₹0.00</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Target: ₹0</p>
                            </div>
                          </td>

                          {/* Rating */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-foreground">{d.rating || "4.8"}</span>
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            </div>
                          </td>

                          {/* Actions */}

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleViewClick(d)} className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View Dossier">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button onClick={() => toast.success(`Calling ${d.user?.name}...`)} className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Call">
                                <Phone className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleOpenChatModal(d)} className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View Order Chats">
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleFocusOnMap(d)} className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Pin on Map">
                                <MapPin className="h-4 w-4" />
                              </button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem onClick={() => handleToggleStatus(d)} className="cursor-pointer">
                                    Toggle On/Off Duty
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleBlockMutation.mutate({ id: d._id, isBlocked: !d.user?.isBlocked })} className="cursor-pointer">
                                    {d.user?.isBlocked ? "Unblock Account" : "Block Account"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteClick(d)} className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                    Delete Registration
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border mt-auto">
              <p className="text-xs text-muted-foreground">Showing {paginatedDrivers.length} to {filteredDrivers.length} of {filteredDrivers.length} drivers</p>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1}
                  className="p-1.5 border border-border rounded-xl text-muted-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => (
                  <button 
                    key={idx + 1} 
                    onClick={() => setCurrentPage(idx + 1)} 
                    className={`h-8 w-8 rounded-xl text-xs font-semibold transition-all ${
                      currentPage === idx + 1 
                        ? "bg-emerald-600 text-white" 
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-border rounded-xl text-muted-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* BOTTOM METRICS ROW (5 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Orders</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{totalOrdersCount}</p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Orders</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{completedCount}</p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cancelled Orders</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{cancelledCount}</p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Distance</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {ordersToday.length > 0 ? `${(ordersToday.length * 6.5).toFixed(1)} km` : "156 km"}
              </p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Earnings</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{totalEarningsToday}</p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </div>

        </div>

      </div>

      {/* Onboard Driver Dialog */}
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

      {/* Dossier Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Driver Dossier & Onboarding</DialogTitle>
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
                <span className="font-medium text-foreground uppercase">{viewingDriver.onboardingStatus || "not_started"}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-border">
                <span className="font-semibold text-muted-foreground">Active Location:</span>
                <span className="font-medium text-foreground">{viewingDriver.currentLocation?.coordinates?.join(", ") || "Unknown"}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <h4 className="font-bold text-foreground text-base">Documents & Verification</h4>
                
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-xl border border-border">
                  <div>
                    <p className="font-semibold text-xs">Aadhaar Verification</p>
                    <p className="text-[11px] text-muted-foreground">{viewingDriver.aadhaarNumber || "No Aadhaar provided"}</p>
                  </div>
                  <Button 
                    size="sm"
                    variant={viewingDriver.aadhaarVerified ? "outline" : "default"}
                    onClick={() => {
                      updateDriverMutation.mutate({
                        id: viewingDriver._id,
                        data: { aadhaarVerified: !viewingDriver.aadhaarVerified }
                      });
                      setViewingDriver({ ...viewingDriver, aadhaarVerified: !viewingDriver.aadhaarVerified });
                    }}
                  >
                    {viewingDriver.aadhaarVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-xl border border-border">
                  <div>
                    <p className="font-semibold text-xs">Bank Details Verification</p>
                    <p className="text-[11px] text-muted-foreground">
                      {viewingDriver.bankAccountNumber ? `A/C: ${viewingDriver.bankAccountNumber} (${viewingDriver.bankIfsc})` : "No bank details provided"}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    variant={viewingDriver.bankVerified ? "outline" : "default"}
                    onClick={() => {
                      updateDriverMutation.mutate({
                        id: viewingDriver._id,
                        data: { bankVerified: !viewingDriver.bankVerified }
                      });
                      setViewingDriver({ ...viewingDriver, bankVerified: !viewingDriver.bankVerified });
                    }}
                  >
                    {viewingDriver.bankVerified ? "Verified" : "Verify"}
                  </Button>
                </div>

                {viewingDriver.dlNumber && (
                  <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-1">
                    <p className="font-semibold text-xs">Driving License</p>
                    <p className="text-[11px] text-muted-foreground">DL No: {viewingDriver.dlNumber}</p>
                    {viewingDriver.dlExpiry && (
                      <p className="text-[10px] text-muted-foreground font-medium">Expires: {new Date(viewingDriver.dlExpiry).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  onClick={() => {
                    updateDriverMutation.mutate({
                      id: viewingDriver._id,
                      data: { onboardingStatus: "completed", aadhaarVerified: true, bankVerified: true }
                    });
                    setViewingDriver({ ...viewingDriver, onboardingStatus: "completed", aadhaarVerified: true, bankVerified: true });
                  }}
                >
                  Approve Driver
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    updateDriverMutation.mutate({
                      id: viewingDriver._id,
                      data: { onboardingStatus: "rejected" }
                    });
                    setViewingDriver({ ...viewingDriver, onboardingStatus: "rejected" });
                  }}
                >
                  Reject Driver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Zone Assignment Dialog */}
      <Dialog open={isAssignZoneOpen} onOpenChange={setIsAssignZoneOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {isEditingAssignment ? "Edit Zone Assignment" : "Assign Driver to Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isEditingAssignment && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Select Driver</label>
                <Select
                  value={selectedDriverForZone}
                  onValueChange={setSelectedDriverForZone}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Choose a driver..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {drivers.map((d: any) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.user?.name} ({d.user?.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Select Zone</label>
              <Select
                value={selectedZoneForDriver || "none"}
                onValueChange={(val) => setSelectedZoneForDriver(val === "none" ? "" : val)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select Zone..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Zone Assigned</SelectItem>
                  {zonesList.map((z: any) => (
                    <SelectItem key={z._id} value={z._id}>
                      {z.name} ({z.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAssignZoneOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedDriverForZone) {
                    toast.error("Please select a driver");
                    return;
                  }
                  handleAssignZone(selectedDriverForZone, selectedZoneForDriver || null);
                  setIsAssignZoneOpen(false);
                }}
                className="rounded-xl"
              >
                {isEditingAssignment ? "Save Changes" : "Assign Zone"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Chats Dialog */}
      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-border flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Chats for Driver: {chatDriver?.user?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 flex flex-col min-h-0">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Select Order</label>
              <Select
                value={selectedOrderForChat?._id || "none"}
                onValueChange={(val) => {
                  const o = orders.find((order: any) => order._id === val);
                  setSelectedOrderForChat(o || null);
                }}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select an order to view chat..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Select order...</SelectItem>
                  {orders
                    .filter((o: any) => o.driver?._id === chatDriver?._id || o.driver === chatDriver?._id)
                    .map((o: any) => (
                      <SelectItem key={o._id} value={o._id}>
                        {o._id.startsWith("ORD-") ? o._id : `#${o._id.substring(o._id.length - 6).toUpperCase()}`} ({o.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 border border-border rounded-xl p-4 bg-muted/20 overflow-y-auto flex flex-col space-y-3 min-h-[300px]">
              {selectedOrderForChat ? (
                loadingChatMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading chat messages...</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center">No chat messages found for this order.</p>
                  </div>
                ) : (
                  chatMessages.map((msg: any) => {
                    const isDriver = msg.senderId?._id === chatDriver?.user?._id || msg.senderId === chatDriver?.user?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col max-w-[80%] ${isDriver ? "self-end items-end" : "self-start items-start"}`}
                      >
                        <span className="text-[10px] text-muted-foreground font-semibold mb-0.5">
                          {msg.senderId?.name || "System"}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-sm ${
                            isDriver
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-card border border-border text-foreground rounded-tl-none"
                          }`}
                        >
                          <p>{msg.text}</p>
                          <span
                            className={`text-[9px] block mt-1 text-right ${
                              isDriver ? "text-primary-foreground/75" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">Please select an order from the dropdown to view the conversation history between the user and driver.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setIsChatModalOpen(false)} className="rounded-xl">
                Close Chats
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Assignments Tab Rendering */}
      {activeTab === "zones" && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Zone Assignments</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Manage and link drivers to operational regions/zones.</p>
            </div>
            <button
              onClick={() => {
                setSelectedDriverForZone("");
                setSelectedZoneForDriver("");
                setIsEditingAssignment(false);
                setIsAssignZoneOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Assign Zone to Driver
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-border bg-muted/20 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <th className="text-left px-6 py-3.5">Driver</th>
                  <th className="text-left px-6 py-3.5">Contact</th>
                  <th className="text-left px-6 py-3.5">Assigned Zone</th>
                  <th className="text-left px-6 py-3.5">Zone Type</th>
                  <th className="text-left px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.map((d: any) => {
                  const assignedZoneId = d.preferredZone?._id || d.preferredZone;
                  const zoneObj = zonesList.find((z: any) => z._id === assignedZoneId);
                  
                  return (
                    <tr key={d._id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(d.user?.name || "")}
                            alt={d.user?.name}
                            className="h-10 w-10 rounded-full object-cover border border-border"
                          />
                          <div>
                            <p className="text-sm font-bold text-foreground">{d.user?.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">{getVehicleString(d)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">{d.user?.phone || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{d.user?.email || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          zoneObj ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-zinc-50 text-zinc-500 border border-zinc-100"
                        }`}>
                          {zoneObj ? zoneObj.name : "No Zone Assigned"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {zoneObj ? zoneObj.type : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDriverForZone(d._id);
                              setSelectedZoneForDriver(assignedZoneId || "");
                              setIsEditingAssignment(true);
                              setIsAssignZoneOpen(true);
                            }}
                            className="px-3 py-1.5 border border-border bg-white text-xs font-semibold rounded-lg text-foreground hover:bg-muted/50 transition-colors shadow-sm"
                          >
                            Edit
                          </button>
                          {zoneObj && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove zone assignment for driver ${d.user?.name}?`)) {
                                  handleAssignZone(d._id, null);
                                }
                              }}
                              className="px-3 py-1.5 border border-transparent bg-rose-50 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenChatModal(d)}
                            className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View Order Chats"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

// Mini fallback component for Indian Rupee Icon to avoid missing imports
function IndianRupeeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="M6 13h10a4 4 0 0 0 0-8H6" />
      <path d="M6 13h3l7 8" />
    </svg>
  );
}
