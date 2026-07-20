"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, Bell, Calendar, SlidersHorizontal, Plus,
  Sparkles, CheckCircle2, AlertTriangle, Clock, GripVertical,
} from "lucide-react";
import { useLayout, type DateRange } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import CommandMenu from "@/components/custom/CommandMenu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ── Date period helpers ──────────────────────────────────────────────────────
function buildDateRange(period: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "ئەمڕۆ":
      return { from: today, to: new Date(today.getTime() + 86399999), label: "ئەمڕۆ" };
    case "حەفتەی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 6);
      return { from, to: new Date(today.getTime() + 86399999), label: "حەفتەی ڕابردوو" };
    }
    case "مانگی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 29);
      return { from, to: new Date(today.getTime() + 86399999), label: "مانگی ڕابردوو" };
    }
    case "٣ مانگی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 89);
      return { from, to: new Date(today.getTime() + 86399999), label: "٣ مانگی ڕابردوو" };
    }
    case "ساڵی ئێستا": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: new Date(today.getTime() + 86399999), label: "ساڵی ئێستا" };
    }
    default:
      return { from: null, to: null, label: "هەموو ماوەکان" };
  }
}

const DATE_PERIODS = ["هەموو ماوەکان", "ئەمڕۆ", "حەفتەی ڕابردوو", "مانگی ڕابردوو", "٣ مانگی ڕابردوو", "ساڵی ئێستا"];

const STATUS_FILTERS = [
  { key: "all",          label: "هەموو" },
  { key: "WAITING",      label: "چاوەڕوان" },
  { key: "IN_PROGRESS",  label: "لە پڕۆسەدا" },
  { key: "NOT_ACCEPTED", label: "ڕەتکراوە" },
  { key: "READY",        label: "ئامادەیە" },
  { key: "SENT",         label: "نێردراوە" },
  { key: "DELIVERED",    label: "گەیشتووە" },
  { key: "PAID",         label: "پارەدراوە" },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    searchOpen, setSearchOpen,
    notifOpen, setNotifOpen,
    currentUser,
    dateRange, setDateRange,
    globalStatusFilter, setGlobalStatusFilter,
    setOpenNewOrder,
    dashboardEditing, setDashboardEditing,
  } = useLayout();

  const { orders, products } = useData();
  const [datePopOpen, setDatePopOpen] = useState(false);
  const [filterPopOpen, setFilterPopOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString("ckb", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  // Live notifications from data
  const notifications = useMemo(() => {
    const now = Date.now();
    const notes: { id: string; text: string; time: string; read: boolean; type: "warn" | "ok" | "clock" }[] = [];

    orders.filter(o => o.status === "WAITING").slice(0, 3).forEach(o => {
      const hrs = Math.floor((now - new Date(o.createdAt).getTime()) / 3_600_000);
      if (hrs >= 1) notes.push({ id: `wait-${o.id}`, text: `داواکاری ${o.orderNumber} چاوەڕوانە (${hrs} کاتژمێر)`, time: `${hrs} کاتژمێر پێشتر`, read: false, type: "clock" });
    });

    orders.filter(o => o.status === "DELIVERED").slice(0, 2).forEach(o => {
      notes.push({ id: `unpaid-${o.id}`, text: `${o.clientName} — گەیشتووە و پارەی نەداوە`, time: new Date(o.createdAt).toLocaleDateString("ar-IQ"), read: false, type: "warn" });
    });

    products.filter(p => { if (!p.expiryDate) return false; const diff = new Date(p.expiryDate).getTime() - now; return diff > 0 && diff < 60 * 86_400_000; }).slice(0, 3).forEach(p => {
      const days = Math.floor((new Date(p.expiryDate!).getTime() - now) / 86_400_000);
      notes.push({ id: `exp-${p.id}`, text: `${p.name} — بەسەرچوون لە ${days} رۆژ`, time: `${days} رۆژ`, read: true, type: "warn" });
    });

    return notes.slice(0, 6);
  }, [orders, products]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const firstName = currentUser?.name?.split(" ")[0] || "بەکارهێنەر";
  const initials = currentUser?.name
    ? currentUser.name.trim().split(" ").slice(0, 2).map((w: string) => w[0]).join("")
    : "؟";

  const NotifIcon = ({ type }: { type: "warn" | "ok" | "clock" }) => {
    if (type === "warn") return <AlertTriangle className="size-3.5 text-orange-500 shrink-0 mt-0.5" />;
    if (type === "ok") return <CheckCircle2 className="size-3.5 text-green-500 shrink-0 mt-0.5" />;
    return <Clock className="size-3.5 text-primary shrink-0 mt-0.5" />;
  };

  return (
    <>
      {/* ── TopBar ── */}
      <header
        id="topbar"
        className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-4 supports-[backdrop-filter]:bg-background/60"
      >
        {/* Right: welcome */}
        <div className="flex items-center gap-3">
          <OreoAvatar src={currentUser?.avatarUrl} name={currentUser?.name || "بەکارهێنەر"} size={36} className="border-2 border-primary/20" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight">بەخێربێیتەوە، {firstName}</p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {/* Left: actions */}
        <div className="flex items-center gap-1.5">
          {/* Sidebar toggle */}
          <SidebarTrigger className="size-9" />

          {/* Search */}
          <Button
            id="topbar-search"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="گەڕان"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
          </Button>

          {/* AI */}
          <Button
            id="topbar-ai"
            variant={pathname === "/dashboard/ai" ? "default" : "outline"}
            size="sm"
            className="flex gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground data-[variant=default]:border-primary data-[variant=default]:bg-primary data-[variant=default]:text-primary-foreground"
            onClick={() => router.push("/dashboard/ai")}
          >
            <Sparkles className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">دەوا AI</span>
          </Button>

          {/* Dashboard customize — only on home */}
          {pathname === "/dashboard" && (
            <Button
              id="topbar-customize"
              variant={dashboardEditing ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setDashboardEditing(!dashboardEditing)}
            >
              <GripVertical className="size-3.5" />
              <span className="hidden sm:inline">
                {dashboardEditing ? "مووچکردن" : "تەرخانکردن"}
              </span>
            </Button>
          )}

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger className="relative inline-flex size-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent" id="topbar-notifications" aria-label="ئاگادارییەکان">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-0.5 -start-0.5 size-4 p-0 flex items-center justify-center text-[9px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-0" dir="rtl">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-bold text-sm flex items-center gap-2">
                  ئاگادارییەکان
                  {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5">{unreadCount}</Badge>}
                </span>
              </div>
              <ScrollArea className="max-h-72">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">هیچ ئاگادارییەک نییە ✓</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={cn("flex gap-2.5 px-4 py-3 border-b last:border-0", !n.read && "bg-amber-50 dark:bg-amber-950/20")}>
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", !n.read && "font-semibold")}>{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <Separator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full text-primary text-xs"
                  onClick={() => { router.push("/dashboard/orders"); setNotifOpen(false); }}>
                  بینینی هەموو داواکارییەکان
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date filter */}
          <Popover open={datePopOpen} onOpenChange={setDatePopOpen}>
            <PopoverTrigger className={cn(
              "hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent",
              dateRange.from ? "border-primary text-primary" : "border-border"
            )} id="topbar-date" aria-label="فلتەری بەروار">
              <Calendar className="size-3.5" />
              {dateRange.label || formattedDate}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2" dir="rtl">
              <p className="font-bold text-xs text-muted-foreground px-2 mb-1">ماوەی کات</p>
              {DATE_PERIODS.map(period => (
                <button key={period} onClick={() => { setDateRange(buildDateRange(period)); setDatePopOpen(false); }}
                  className={cn(
                    "w-full text-right px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent",
                    dateRange.label === period && "bg-primary/10 text-primary font-semibold"
                  )}>
                  {period}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Status filter */}
          <Popover open={filterPopOpen} onOpenChange={setFilterPopOpen}>
            <PopoverTrigger className={cn(
              "hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent",
              globalStatusFilter !== "هەموو" ? "border-primary text-primary" : "border-border"
            )} id="topbar-filter" aria-label="فلتەری بارودۆخ">
              <SlidersHorizontal className="size-3.5" />
              {globalStatusFilter !== "هەموو" ? globalStatusFilter : "فلتەر"}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2" dir="rtl">
              <p className="font-bold text-xs text-muted-foreground px-2 mb-1">بارودۆخ</p>
              {STATUS_FILTERS.map(f => (
                <button key={f.key}
                  onClick={() => { setGlobalStatusFilter(f.key === "all" ? "هەموو" : f.label); setFilterPopOpen(false); router.push("/dashboard/orders"); }}
                  className={cn(
                    "w-full text-right px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent",
                    globalStatusFilter === f.label && "bg-primary/10 text-primary font-semibold"
                  )}>
                  {f.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* New order */}
          <Button
            id="topbar-add"
            size="sm"
            className="gap-1.5 hidden sm:flex"
            onClick={() => { setOpenNewOrder(true); router.push("/dashboard/orders"); }}
          >
            <Plus className="size-4" />
            داواکاری نوێ
          </Button>

          {/* Dark mode toggle */}
          <ModeToggle />
        </div>
      </header>

      <CommandMenu open={searchOpen} onClose={() => setSearchOpen(false)} onNewOrder={() => setOpenNewOrder(true)} />
    </>
  );
}
