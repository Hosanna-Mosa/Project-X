import { Menu } from "lucide-react";

interface TopBarProps {
  searchPlaceholder?: string;
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-6">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
            alt="Super Admin"
            className="h-9 w-9 rounded-full object-cover border border-border shadow-sm"
          />
          <div className="text-left">
            <p className="text-xs font-extrabold text-foreground leading-none">Admin</p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1 leading-none">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}

