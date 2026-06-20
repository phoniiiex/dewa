"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
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
  logout: () => void;
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
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  // Auth guard — redirect to login if no session
  useEffect(() => {
    const session = localStorage.getItem("dewa_session");
    if (!session) {
      router.replace("/");
    } else {
      setAuthed(true);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("dewa_session");
    router.replace("/");
  };

  if (!authed) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <DataProvider>
      <LayoutContext.Provider value={{
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsed(p => !p),
        searchOpen, setSearchOpen,
        notifOpen, setNotifOpen,
        logout,
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
