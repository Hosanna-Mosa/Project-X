import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
  searchPlaceholder?: string;
}

export function DashboardLayout({ children, searchPlaceholder }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_open");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_open", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className={`transition-all duration-300 ease-in-out overflow-hidden flex shrink-0 sticky top-0 h-screen ${isSidebarOpen ? "w-[240px]" : "w-0"}`}>
        <AppSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar searchPlaceholder={searchPlaceholder} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
