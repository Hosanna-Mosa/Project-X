import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Users,
  GitBranch,
  CreditCard,
  BarChart3,
  Headphones,
  Settings,
  Store,
  Drumstick,
  LogOut,
  IndianRupee,
  Map,
  Ticket,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  ChevronDown,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Live Orders", url: "/live-orders", icon: ShoppingCart },
  { title: "Drivers", url: "/drivers", icon: Truck },
  { title: "Dev Drivers", url: "/dev-drivers", icon: SlidersHorizontal },
  { title: "Users", url: "/users", icon: Users },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Meal Centers", url: "/meat-centers", icon: Drumstick },
  { title: "Meal Pricing", url: "/meat-pricing", icon: IndianRupee },
  { title: "Zones", url: "/zones", icon: Map },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Support", url: "/support", icon: Headphones },
  { title: "Support Cases", url: "/support-cases", icon: Headphones },
  { title: "Active Chats", url: "/support/chats", icon: MessageSquare },
  { title: "Coupons", url: "/coupons", icon: Ticket },
  { title: "App Updates", url: "/app-updates", icon: RefreshCw },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_data");
    localStorage.removeItem("vendor_token");
    localStorage.removeItem("vendor_data");
    localStorage.removeItem("support_token");
    localStorage.removeItem("support_data");
    navigate("/vendor-login");
  };

  return (
    <aside className="w-[240px] min-h-screen bg-card border-r border-border flex flex-col justify-between shrink-0">
      <div>
        <div className="px-6 py-6">
          <h1 className="text-xl font-extrabold text-[#00665c] tracking-wide">FLAVOUR</h1>
          <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-bold mt-0.5">
            FOOD & SERVICES
          </p>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5">
          {(() => {
            const isSupport = !!localStorage.getItem("support_token");
            const filteredNavItems = isSupport
              ? navItems.filter(item => item.url === "/support-cases" || item.url === "/support/chats")
              : navItems;
            
            return filteredNavItems.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center justify-between pl-6 pr-4 py-2.5 text-sm transition-colors rounded-r-full mr-4 ${
                  isActive
                    ? "bg-[#e6f4f2] text-[#00665c] font-bold"
                    : "text-sidebar-foreground hover:bg-muted/50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-[#00665c]" : "text-muted-foreground"}`} />
                  <span>{item.title}</span>
                </div>
                {item.title === "Live Orders" && (
                  <span className="text-[10px] font-bold bg-[#eefcfb] text-[#00665c] px-2 py-0.5 rounded-full border border-[#00665c]/10">
                    24
                  </span>
                )}
              </Link>
            );
          })
        })()}
        </nav>
      </div>

      <div className="space-y-4 pb-4">
        {/* Need Help? Box */}
        <div className="mx-4 p-4 rounded-2xl bg-[#f8fafc] border border-border flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-muted-foreground shrink-0 border border-border shadow-sm">
              <Headphones className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Need Help?</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Contact support for assistance.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/support")}
            className="w-full py-2 border border-border bg-white text-xs font-semibold rounded-xl text-foreground hover:bg-muted/50 transition-colors shadow-sm"
          >
            Contact Support
          </button>
        </div>

        {/* Light Mode Selector */}
        <div className="px-6 pt-3 border-t border-border flex items-center justify-between">
          <button className="flex items-center gap-2.5 text-xs font-semibold text-foreground w-full justify-between py-1">
            <span className="flex items-center gap-2">
              <Sun className="h-4.5 w-4.5 text-amber-500" />
              Light Mode
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Logout Button */}
        <div className="px-6 pt-3 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
