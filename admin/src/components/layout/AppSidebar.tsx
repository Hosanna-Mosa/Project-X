import { useLocation, Link } from "react-router-dom";
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
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Live Orders", url: "/live-orders", icon: ShoppingCart },
  { title: "Drivers", url: "/drivers", icon: Truck },
  { title: "Users", url: "/users", icon: Users },
  { title: "Multi-Stop Orders", url: "/multi-stop", icon: GitBranch },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Support", url: "/support", icon: Headphones },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-[220px] min-h-screen bg-card border-r border-border flex flex-col justify-between shrink-0">
      <div>
        <div className="px-5 py-6">
          <h1 className="text-lg font-bold text-primary">Precision Nav</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Logistics Fluidity
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

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">AP</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Admin Profile</p>
            <p className="text-xs text-muted-foreground">Fleet Master</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
