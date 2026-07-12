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
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Live Orders", url: "/live-orders", icon: ShoppingCart },
  { title: "Drivers", url: "/drivers", icon: Truck },
  { title: "Users", url: "/users", icon: Users },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Meat Centers", url: "/meat-centers", icon: Drumstick },
  { title: "Meat Pricing", url: "/meat-pricing", icon: IndianRupee },
  { title: "Zones", url: "/zones", icon: Map },

  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Support", url: "/support", icon: Headphones },
  { title: "Coupons", url: "/coupons", icon: Ticket },
  { title: "App Updates", url: "/app-updates", icon: RefreshCw },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("vendor_token");
    localStorage.removeItem("vendor_data");
    navigate("/vendor-login");
  };

  return (
    <aside className="w-[220px] min-h-screen bg-card border-r border-border flex flex-col justify-between shrink-0">
      <div>
        <div className="px-5 py-6">
          <h1 className="text-lg font-bold text-primary">FLAVOUR</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Food & Service
          </p>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "sidebar-active"
                    : "text-sidebar-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-border space-y-2">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">AP</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Admin Profile</p>
            <p className="text-xs text-muted-foreground">Fleet Master</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout (Vendor Portal)
        </button>
      </div>
    </aside>
  );
}
