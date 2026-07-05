"use client";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Toast from "@/components/ui/Toast";
import AiPanel from "@/components/ai/AiPanel";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { DataProvider } from "@/lib/store";
import { setCurrentActor } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import "@/styles/dashboard.css";

type SidebarPosition = "right" | "left" | "top";

export type DateRange = { from: Date | null; to: Date | null; label: string };

interface LayoutContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  logout: () => void;
  currentUser: { id: string; email: string; name: string; role: string; avatarUrl: string; phone: string } | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<{ id: string; email: string; name: string; role: string; avatarUrl: string; phone: string } | null>>;
  updateCurrentUserProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  globalStatusFilter: string;
  setGlobalStatusFilter: (s: string) => void;
  openNewOrder: boolean;
  setOpenNewOrder: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);
export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within DashboardLayout");
  return ctx;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string; avatarUrl: string; phone: string } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarPosition, setSidebarPositionState] = useState<SidebarPosition>("right");
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null, label: "هەموو ماوەکان" });
  const [globalStatusFilter, setGlobalStatusFilter] = useState("هەموو");
  const [openNewOrder, setOpenNewOrder] = useState(false);
  const hbIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load appearance preferences from localStorage
  useEffect(() => {
    const savedDark = localStorage.getItem("dewa_dark_mode") === "true";
    const savedPos = (localStorage.getItem("dewa_sidebar_pos") || "right") as SidebarPosition;
    setDarkMode(savedDark);
    setSidebarPositionState(savedPos);
    document.documentElement.setAttribute("data-theme", savedDark ? "dark" : "light");
    document.documentElement.setAttribute("data-sidebar", savedPos);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("dewa_dark_mode", String(next));
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  const setSidebarPosition = (pos: SidebarPosition) => {
    setSidebarPositionState(pos);
    localStorage.setItem("dewa_sidebar_pos", pos);
    document.documentElement.setAttribute("data-sidebar", pos);
  };

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name: (profile as Record<string, string>)?.name || session.user.user_metadata?.name || "",
          role: (profile as Record<string, string>)?.role || session.user.user_metadata?.role || "REP",
          avatarUrl: (profile as Record<string, string>)?.avatar_url || "",
          phone: (profile as Record<string, string>)?.phone || "",
        });
        // Set actor for activity logging
        setCurrentActor(
          session.user.id,
          (profile as Record<string, string>)?.name || session.user.user_metadata?.name || "",
          (profile as Record<string, string>)?.role || "REP"
        );
        // Heartbeat: update last_seen via admin API (bypasses RLS)
        const accessToken = session.access_token;
        const updateLastSeen = () =>
          fetch("/api/auth/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });
        updateLastSeen();
        const hbInterval = setInterval(updateLastSeen, 60_000);
        hbIntervalRef.current = hbInterval;
        setAuthed(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/");
    });

    return () => {
      subscription.unsubscribe();
      if (hbIntervalRef.current) clearInterval(hbIntervalRef.current);
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const updateCurrentUserProfile = async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
    if (!currentUser) return;
    const update: Record<string, string> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
    await supabase.from("profiles").update(update).eq("id", currentUser.id);
    setCurrentUser(prev => prev ? {
      ...prev,
      name: data.name ?? prev.name,
      phone: data.phone ?? prev.phone,
      avatarUrl: data.avatarUrl ?? prev.avatarUrl,
    } : prev);
  };

  if (!authed) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <ErrorBoundary>
      <DataProvider>
        <LayoutContext.Provider value={{
          sidebarCollapsed,
          toggleSidebar: () => setSidebarCollapsed(p => !p),
          searchOpen, setSearchOpen,
          notifOpen, setNotifOpen,
          aiOpen, setAiOpen,
          logout,
          currentUser,
          setCurrentUser,
          updateCurrentUserProfile,
          darkMode,
          toggleDarkMode,
          sidebarPosition,
          setSidebarPosition,
          dateRange, setDateRange,
          globalStatusFilter, setGlobalStatusFilter,
          openNewOrder, setOpenNewOrder,
        }}>
          <div className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
            <Sidebar />
            <TopBar />
            <main className="main-content">{children}</main>
            <Toast />
            <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
          </div>
        </LayoutContext.Provider>
      </DataProvider>
    </ErrorBoundary>
  );
}
