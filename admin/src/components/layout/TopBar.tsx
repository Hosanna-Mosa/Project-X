import { Search } from "lucide-react";

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
      <div></div>
    </header>
  );
}

