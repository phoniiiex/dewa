"use client";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import ErrorBoundary from "@/components/custom/ErrorBoundary";
import { DataProvider } from "@/lib/store";
import { setCurrentActor } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export type DateRange = { from: Date | null; to: Date | null; label: string };

interface LayoutContextType {
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
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  globalStatusFilter: string;
  setGlobalStatusFilter: (s: string) => void;
  openNewOrder: boolean;
  setOpenNewOrder: (v: boolean) => void;
  dashboardEditing: boolean;
  setDashboardEditing: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);
export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within DashboardLayout");
  return ctx;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string; avatarUrl: string; phone: string } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null, label: "هەموو ماوەکان" });
  const [globalStatusFilter, setGlobalStatusFilter] = useState("هەموو");
  const [openNewOrder, setOpenNewOrder] = useState(false);
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const hbIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setCurrentActor(
          session.user.id,
          (profile as Record<string, string>)?.name || session.user.user_metadata?.name || "",
          (profile as Record<string, string>)?.role || "REP"
        );
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="size-10 rounded-full border-[3px] border-muted border-t-primary animate-spin" />
    </div>
  );

  return (
    <ErrorBoundary>
      <DataProvider>
        <LayoutContext.Provider value={{
          searchOpen, setSearchOpen,
          notifOpen, setNotifOpen,
          aiOpen, setAiOpen,
          logout,
          currentUser,
          setCurrentUser,
          updateCurrentUserProfile,
          dateRange, setDateRange,
          globalStatusFilter, setGlobalStatusFilter,
          openNewOrder, setOpenNewOrder,
          dashboardEditing, setDashboardEditing,
        }}>
          <SidebarProvider dir="rtl">
            <AppSidebar />
            <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
              <TopBar />
              <main className="flex-1 p-4 md:p-6 min-w-0">
                {children}
              </main>
              <Toaster position="top-center" richColors />
            </SidebarInset>
          </SidebarProvider>
        </LayoutContext.Provider>
      </DataProvider>
    </ErrorBoundary>
  );
}
