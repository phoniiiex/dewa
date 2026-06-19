"use client";
import { useState, createContext, useContext } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Toast from "@/components/ui/Toast";
import { DataProvider } from "@/lib/store";
import "@/styles/dashboard.css";

// Layout context for sidebar collapse + global search + notifications
interface LayoutContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);
export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within DashboardLayout");
  return ctx;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <DataProvider>
      <LayoutContext.Provider value={{
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsed(p => !p),
        searchOpen, setSearchOpen,
        notifOpen, setNotifOpen,
      }}>
        <div className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
          <Sidebar />
          <TopBar />
          <main className="main-content">{children}</main>
          <Toast />
        </div>
      </LayoutContext.Provider>
    </DataProvider>
  );
}
