import { Search, Bell, Building2, User } from "lucide-react";

interface TopBarProps {
  searchPlaceholder?: string;
}

export function TopBar({ searchPlaceholder = "Search orders, drivers..." }: TopBarProps) {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="relative w-[360px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Building2 className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="text-sm text-muted-foreground">City Selector</span>
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <span className="text-sm font-medium text-foreground">Admin Profile</span>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
