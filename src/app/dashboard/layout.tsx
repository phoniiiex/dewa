"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Toast from "@/components/ui/Toast";
import { DataProvider } from "@/lib/store";
import { supabase } from "@/lib/supabase";
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
  currentUser: { id: string; email: string; name: string; role: string } | null;
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
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);

  // Auth guard — redirect to login if no Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
      } else {
        // Get user profile from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", session.user.id)
          .single();

        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.name || session.user.user_metadata?.name || "",
          role: profile?.role || session.user.user_metadata?.role || "REP",
        });
        setAuthed(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
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
        currentUser,
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
