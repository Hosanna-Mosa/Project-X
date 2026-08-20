import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  LogOut,
  Search,
  Drumstick,
  CalendarClock
} from "lucide-react";
import { TopBar } from "./TopBar";
import { NotificationBell } from "./NotificationBell";

interface VendorLayoutProps {
  children: ReactNode;
  searchPlaceholder?: string;
}

const navItems = [
  { title: "Dashboard", url: "/vendor/dashboard", icon: LayoutDashboard },
  { title: "Scheduled Orders", url: "/vendor/scheduled-orders", icon: CalendarClock },
  { title: "Menu Items", url: "/vendor/menu", icon: UtensilsCrossed },
  { title: "Settings", url: "/vendor/settings", icon: Settings },
];

export function VendorLayout({ children, searchPlaceholder }: VendorLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const vendorData = JSON.parse(localStorage.getItem("vendor_data") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("vendor_token");
    localStorage.removeItem("vendor_data");
    navigate("/vendor-login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-[240px] h-screen bg-card border-r border-border flex flex-col justify-between shrink-0 sticky top-0 overflow-y-auto">
        <div>
          <div className="px-6 py-8">
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              {vendorData.role === "meat_vendor" ? (
                <Drumstick className="h-6 w-6" />
              ) : (
                <UtensilsCrossed className="h-6 w-6" />
              )}
              {vendorData.role === "meat_vendor" ? "Meat Center" : "VendorHub"}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-1">
              {vendorData.role === "meat_vendor" ? "Fresh Supplies" : "Precision Logistics"}
            </p>
          </div>


          <nav className="mt-4 flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              let title = item.title;
              let url = item.url;
              let Icon = item.icon;

              if (vendorData.role === "meat_vendor" && item.title === "Menu Items") {
                title = "Meat Inventory";
                url = "/vendor/meat-menu";
                Icon = Drumstick;
              }

              const isActive = location.pathname === url;
              return (
                <Link
                  key={title}
                  to={url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="bg-muted/40 p-4 rounded-2xl mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {vendorData.name?.[0] || "V"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{vendorData.name || "Vendor"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{vendorData.email || "Partner"}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="relative w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={searchPlaceholder || "Search dashboard..."}
              className="w-full bg-muted/50 border-none rounded-xl h-10 pl-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-foreground hidden md:block">Active Shop</p>
              <div className="h-2 w-2 bg-success rounded-full animate-pulse-dot" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
