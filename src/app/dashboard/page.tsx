"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Package, Users, ShoppingCart, DollarSign, TrendingUp, Truck,
  AlertTriangle, Clock, UserCheck, GripVertical, Plus, X,
  Wallet, BarChart2, CheckCircle, Building2,
  ArrowUpRight, Boxes, Activity,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Sparkline } from "@/components/dither-kit/sparkline";
import type { DitherColor } from "@/components/dither-kit/palette";
import { AreaChart as DitherAreaChart } from "@/components/dither-kit/area-chart";
import dynamic from "next/dynamic";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
const LiveActivityChart = dynamic(
  () => import("@/components/custom/LiveActivityChart").then(m => ({ default: m.LiveActivityChart })),
  { ssr: false, loading: () => <div className="w-full h-40 animate-pulse bg-white/5 rounded-lg" /> }
);
import { Area as DitherArea } from "@/components/dither-kit/area";
import { XAxis as DXAxis } from "@/components/dither-kit/x-axis";
import { Tooltip as DTooltip } from "@/components/dither-kit/tooltip";
import { Grid } from "@/components/dither-kit/grid";

// ─── Types ───────────────────────────────────────────────
type WidgetSize = "sm" | "md" | "lg";
interface WidgetDef { id: string; label: string; icon: React.ReactNode; defaultSize: WidgetSize; }

const WIDGET_DEFS: WidgetDef[] = [
  { id: "kpi-revenue",   label: "کۆی داهات",                     icon: <DollarSign className="size-3.5" />,   defaultSize: "sm" },
  { id: "kpi-orders",    label: "داواکارییەکان",                  icon: <ShoppingCart className="size-3.5" />, defaultSize: "sm" },
  { id: "kpi-products",  label: "بەرهەمەکان",                     icon: <Package className="size-3.5" />,      defaultSize: "sm" },
  { id: "kpi-clients",   label: "کڕیارەکان",                      icon: <Users className="size-3.5" />,        defaultSize: "sm" },
  { id: "recent-orders", label: "کۆتا داواکارییەکان",             icon: <Clock className="size-3.5" />,        defaultSize: "lg" },
  { id: "alerts",        label: "ئاگاداریەکان",                   icon: <AlertTriangle className="size-3.5" />, defaultSize: "md" },
  { id: "financial",     label: "پوختەی دارایی",                  icon: <Wallet className="size-3.5" />,       defaultSize: "md" },
  { id: "order-status",  label: "بارودۆخی داواکاری",              icon: <BarChart2 className="size-3.5" />,    defaultSize: "md" },
  { id: "stock-alerts",  label: "ئاگاداری کۆگا",                  icon: <Boxes className="size-3.5" />,        defaultSize: "md" },
  { id: "rep-perf",      label: "ئەنجامی نوێنەران",               icon: <UserCheck className="size-3.5" />,    defaultSize: "md" },
  { id: "top-clients",   label: "باشترین کڕیارەکان",              icon: <TrendingUp className="size-3.5" />,   defaultSize: "md" },
  { id: "user-status",   label: "بەکارهێنەران ئۆنلاین/ئۆفلاین",  icon: <UserCheck className="size-3.5" />,    defaultSize: "md" },
  { id: "quick-nav",     label: "بەستەری خێرا",                   icon: <Activity className="size-3.5" />,     defaultSize: "sm" },
];

const DEFAULT_LAYOUT = [
  "kpi-revenue", "kpi-orders", "kpi-products", "kpi-clients",
  "recent-orders",
  "alerts", "financial",
  "order-status", "stock-alerts",
  "rep-perf", "top-clients",
  "user-status", "quick-nav",
];
const STORAGE_KEY = "dewa_dashboard_layout_v4";
const colSpan: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 4 };

// ─── Dither-kit Sparkline ─────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: DitherColor }) {
  return (
    <Sparkline
      data={data}
      color={color}
      variant="gradient"
      bloomOnHover
      className="h-9 w-full"
    />
  );
}

// ─── Widget Wrapper ───────────────────────────────────────
function WidgetCard({
  id, size, isEditing, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop, onRemove, children,
}: {
  id: string; size: WidgetSize; isEditing: boolean; isDragOver: boolean;
  onDragStart: () => void; onDragOver: () => void; onDragEnd: () => void; onDrop: () => void;
  onRemove: () => void; children: React.ReactNode;
}) {
  return (
    <Card
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragEnd={onDragEnd}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{ gridColumn: `span ${colSpan[size]}` }}
      className={cn(
        "relative overflow-hidden card-interactive",
        isEditing && "cursor-grab",
        isDragOver && "border-primary border-dashed shadow-[0_0_0_4px_hsl(263_70%_50%/0.1)]"
      )}
    >
      {isEditing && (
        <div className="absolute top-2 end-2 z-10 flex items-center gap-1">
          <div className="size-6 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground shadow-sm cursor-grab">
            <GripVertical className="size-3" />
          </div>
          <Button variant="outline" size="icon" onClick={onRemove} className="size-6 border-destructive/30 text-destructive hover:bg-destructive/10">
            <X className="size-3" />
          </Button>
        </div>
      )}
      {children}
    </Card>
  );
}

// ─── Widget Header ────────────────────────────────────────
function WHeader({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold">{title}</span>
      {link && (
        <Link href={link} className="text-[11px] text-primary font-semibold flex items-center gap-0.5 hover:underline">
          وردەکاری <ArrowUpRight className="size-2.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  NOT_ACCEPTED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  SENT: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
  DELIVERED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};
const STATUS_LABELS: Record<string, string> = {
  WAITING: "چاوەڕوان", IN_PROGRESS: "لە پڕۆسەدا", NOT_ACCEPTED: "ڕەتکراوە",
  READY: "ئامادەیە", SENT: "نێردراوە", DELIVERED: "گەیشتووە", PAID: "پارەدراوە",
};

// ─── Main Page ────────────────────────────────────────────
export default function DashboardPage() {
  const { orders, products, clients, reps, transactions, loading } = useData();

  const { dashboardEditing: isEditing, setDashboardEditing: setIsEditing } = useLayout();
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string; avatar_url: string; last_seen: string }[]>([]);

  // Close catalog when editing stops
  useEffect(() => { if (!isEditing) setShowCatalog(false); }, [isEditing]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/auth/list-users");
        const { users } = await res.json();
        setAllUsers((users || []) as typeof allUsers);
      } catch { /* ignore */ }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLayout(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveLayout = (l: string[]) => { setLayout(l); localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); };
  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = [...layout];
    const fromIdx = next.indexOf(draggingId), toIdx = next.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1); next.splice(toIdx, 0, draggingId);
    saveLayout(next); setDraggingId(null); setDragOverId(null);
  };
  const removeWidget = (id: string) => saveLayout(layout.filter(w => w !== id));
  const addWidget = (id: string) => { saveLayout([...layout, id]); setShowCatalog(false); };
  const hiddenWidgets = WIDGET_DEFS.filter(d => !layout.includes(d.id));

  const {
    totalRevenue, pendingOrders, totalIncome, totalExpense,
    activeDeliveries, nearExpiryProducts, expiredProducts, lowStockProducts,
    last7, recentOrders, statusBreakdown, repStats, clientStats,
    todayOrders, todayRevenue, todayDelivered, todayPending,
  } = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === "PAID");
    const waitingOrders = orders.filter(o => o.status === "WAITING");
    const now = Date.now();
    const near = products.filter(p => { if (!p.expiryDate) return false; const diff = new Date(p.expiryDate).getTime() - now; return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000; });
    const sparkline = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return orders.filter(o => o.createdAt?.startsWith(d.toISOString().split("T")[0])).length; });
    const breakdown = [
      { label: "چاوەڕوان", key: "WAITING", color: "#D97706" },
      { label: "لە پڕۆسەدا", key: "IN_PROGRESS", color: "#339AF0" },
      { label: "ڕەتکراوە", key: "NOT_ACCEPTED", color: "#FA5252" },
      { label: "ئامادەیە", key: "READY", color: "#059669" },
      { label: "نێردراوە", key: "SENT", color: "#7C3AED" },
      { label: "گەیشتووە", key: "DELIVERED", color: "#0891B2" },
      { label: "پارەدراوە", key: "PAID", color: "#2B8A3E" },
    ].map(s => ({ ...s, count: orders.filter(o => o.status === s.key).length }));
    const rStats = reps.slice(0, 5).map(r => ({ name: r.name, count: orders.filter(o => o.repId === r.id).length, total: orders.filter(o => o.repId === r.id).reduce((s, o) => s + o.totalAmount, 0) })).sort((a, b) => b.count - a.count);
    const cStats = clients.slice(0, 5).map(c => ({ name: c.name, city: c.city, count: orders.filter(o => o.clientId === c.id).length })).sort((a, b) => b.count - a.count);
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      totalRevenue: paidOrders.reduce((s, o) => s + o.totalAmount, 0),
      pendingOrders: waitingOrders.length,
      totalIncome: transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      totalExpense: transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
      activeDeliveries: orders.filter(o => o.status === "SENT").length,
      nearExpiryProducts: near,
      expiredProducts: products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() < now),
      lowStockProducts: products.filter(p => p.stock > 0 && p.stock < 50),
      last7: sparkline,
      recentOrders: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      statusBreakdown: breakdown,
      repStats: rStats,
      clientStats: cStats,
      todayOrders: orders.filter(o => o.createdAt?.startsWith(todayStr)).length,
      todayRevenue: orders.filter(o => o.paidAt?.startsWith(todayStr)).reduce((s, o) => s + o.totalAmount, 0),
      todayDelivered: orders.filter(o => o.deliveredAt?.startsWith(todayStr)).length,
      todayPending: waitingOrders.length,
    };
  }, [orders, products, clients, reps, transactions]);

  const onlineUsers = useMemo(() => {
    const t = Date.now() - 3 * 60 * 1000;
    return allUsers.filter(u => u.last_seen && new Date(u.last_seen).getTime() > t);
  }, [allUsers]);

  function timeAgoShort(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "چەند ثانیە";
    if (diff < 3600) return `${Math.floor(diff / 60)} خولەک`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} کاتژمێر`;
    return `${Math.floor(diff / 86400)} ڕۆژ`;
  }

  // ─── Render each widget ───
  function renderWidget(id: string) {
    switch (id) {

      case "kpi-revenue": return (
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">کۆی داهات</p>
              <p className="text-[22px] font-black leading-tight">{loading ? <Skeleton className="w-28 h-6" /> : formatIQD(totalRevenue)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5"><ArrowUpRight className="size-2.5" /> داهاتی پارەدراو</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600"><DollarSign className="size-5" /></div>
          </div>
          <MiniChart data={last7} color="green" />
        </CardContent>
      );

      case "kpi-orders": return (
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">داواکارییەکان</p>
              <p className="text-[22px] font-black leading-tight">{loading ? <Skeleton className="w-14 h-6" /> : orders.length}</p>
              {!loading && pendingOrders > 0 && <p className="text-[10px] text-amber-600 font-semibold mt-1">{pendingOrders} چاوەڕوان</p>}
            </div>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><ShoppingCart className="size-5" /></div>
          </div>
          <MiniChart data={last7} color="purple" />
        </CardContent>
      );

      case "kpi-products": return (
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">بەرهەمەکان</p>
              <p className="text-[22px] font-black leading-tight">{loading ? <Skeleton className="w-14 h-6" /> : products.length}</p>
              {!loading && nearExpiryProducts.length > 0 && <p className="text-[10px] text-red-500 font-semibold mt-1">{nearExpiryProducts.length} نزیکی بەسەرچوون</p>}
            </div>
            <div className="size-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600"><Package className="size-5" /></div>
          </div>
          <MiniChart data={[products.length - 5, products.length - 2, products.length]} color="purple" />
        </CardContent>
      );

      case "kpi-clients": return (
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">کڕیارەکان</p>
              <p className="text-[22px] font-black leading-tight">{loading ? <Skeleton className="w-14 h-6" /> : clients.length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">{loading ? <Skeleton className="w-16 h-3" /> : `${clients.filter(c => c.isActive).length} چالاک`}</p>
            </div>
            <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-500"><Users className="size-5" /></div>
          </div>
          <MiniChart data={[clients.length - 3, clients.length - 1, clients.length]} color="orange" />
        </CardContent>
      );

      case "recent-orders": return (
        <CardContent className="p-4">
          <WHeader title="کۆتا داواکارییەکان" link="/dashboard/orders" />
          <div className="flex flex-col gap-1.5">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">هیچ داواکارییەک نییە</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex justify-between items-center px-3 py-2 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold font-mono text-primary">{o.orderNumber}</span>
                  <span className="text-sm font-semibold">{o.clientName}</span>
                  <span className="text-xs text-muted-foreground">{o.repName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{formatIQD(o.totalAmount)}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[o.status])}>{STATUS_LABELS[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      );

      case "alerts": return (
        <CardContent className="p-4">
          <WHeader title="ئاگاداریەکان" />
          <div className="flex flex-col gap-2">
            {pendingOrders > 0 && (
              <Link href="/dashboard/orders" className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-400 no-underline hover:bg-amber-100 transition-colors">
                <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"><Clock className="size-3.5 text-amber-600" /></div>
                {pendingOrders} داواکاری چاوەڕوانن
              </Link>
            )}
            {nearExpiryProducts.length > 0 && (
              <Link href="/dashboard/products" className="flex items-center gap-2.5 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400 no-underline hover:bg-red-100 transition-colors">
                <div className="size-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center"><AlertTriangle className="size-3.5 text-red-600" /></div>
                {nearExpiryProducts.length} بەرهەم نزیکی بەسەرچوون
              </Link>
            )}
            {expiredProducts.length > 0 && (
              <Link href="/dashboard/products" className="flex items-center gap-2.5 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400 no-underline hover:bg-red-100 transition-colors">
                <div className="size-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center"><X className="size-3.5 text-red-600" /></div>
                {expiredProducts.length} بەرهەمی بەسەرچوو
              </Link>
            )}
            {activeDeliveries > 0 && (
              <Link href="/dashboard/logistics" className="flex items-center gap-2.5 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-sm font-semibold text-blue-700 dark:text-blue-400 no-underline hover:bg-blue-100 transition-colors">
                <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><Truck className="size-3.5 text-blue-600" /></div>
                {activeDeliveries} گەیاندن لە ڕێگادا
              </Link>
            )}
            {pendingOrders === 0 && nearExpiryProducts.length === 0 && expiredProducts.length === 0 && activeDeliveries === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="size-4" /> هیچ ئاگادارییەک نییە
              </div>
            )}
          </div>
        </CardContent>
      );

      case "financial": return (
        <CardContent className="p-4 bg-gradient-to-br from-slate-900 via-primary/90 to-violet-900 rounded-[calc(var(--radius)-1px)]">
          <WHeader title="پوختەی دارایی" />
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "داهات",  value: totalIncome,              color: "text-emerald-400" },
              { label: "خەرجی",  value: totalExpense,             color: "text-red-400" },
              { label: "قازانج", value: totalIncome - totalExpense, color: "text-violet-300" },
            ].map(item => (
              <div key={item.label} className="p-3 bg-white/5 rounded-xl backdrop-blur-sm">
                <p className="text-[10px] text-white/60 font-semibold mb-1.5">{item.label}</p>
                <p className={cn("text-sm font-black", item.color)}>{formatIQD(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 px-3 py-2 bg-white/5 rounded-xl flex justify-between items-center">
            <span className="text-xs text-white/60">کۆی مامەڵەکان</span>
            <span className="text-sm font-bold text-white">{transactions.length} مامەڵە</span>
          </div>
        </CardContent>
      );

      case "order-status": {
        // Build last-7-day trend for dither-kit
        const trendData = last7.map((count, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { day: d.toLocaleDateString("en-US", { weekday: "short" }), orders: count };
        });
        const trendConfig = {
          orders: { label: "داواکاری", color: "purple" },
        } as const;
        return (
          <CardContent className="p-4">
            <WHeader title="تریندی داواکارییەکان" link="/dashboard/orders" />
            {/* Dither-kit 7-day area chart */}
            <div className="h-[120px] w-full mb-3">
              <DitherAreaChart
                data={trendData}
                config={trendConfig}
                bloom="aura"
                className="h-full w-full"
                margins={{ top: 6, right: 8, bottom: 18, left: 28 }}
              >
                <Grid />
                <DXAxis dataKey="day" />
                <DTooltip labelKey="day" />
                <DitherArea dataKey="orders" variant="gradient" />
              </DitherAreaChart>
            </div>
            {/* Status pills */}
            <div className="flex flex-wrap gap-1.5">
              {statusBreakdown.filter(s => s.count > 0).map(s => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: s.color + "22", color: s.color }}
                >
                  <span className="size-1.5 rounded-full inline-block" style={{ background: s.color }} />
                  {s.label} · {s.count}
                </span>
              ))}
              {statusBreakdown.every(s => s.count === 0) && (
                <p className="text-xs text-muted-foreground">هیچ داواکارییەک نییە</p>
              )}
            </div>
          </CardContent>
        );
      }

      case "stock-alerts": return (
        <CardContent className="p-4">
          <WHeader title="ئاگاداری کۆگا" link="/dashboard/products" />
          {nearExpiryProducts.length === 0 && lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="size-4" /> کۆگا باشە
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...nearExpiryProducts.slice(0, 3), ...lowStockProducts.slice(0, 2)].map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-red-50/60 dark:bg-red-950/20 rounded-lg gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold">{p.name}</span>
                  </div>
                  <Badge variant="destructive" className="text-[9px]">
                    {p.expiryDate ? p.expiryDate : `${p.stock} بەردەست`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      );

      case "rep-perf": return (
        <CardContent className="p-4">
          <WHeader title="ئەنجامی نوێنەران" link="/dashboard/reps" />
          {repStats.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">هیچ داتایەک نییە</p> : (
            <div className="flex flex-col gap-2">
              {repStats.map((r, i) => (
                <div key={r.name} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg", i === 0 ? "bg-primary/10" : "bg-muted/40")}>
                  <div className={cn("size-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0", i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.count} داواکاری</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{formatIQD(r.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      );

      case "top-clients": return (
        <CardContent className="p-4">
          <WHeader title="باشترین کڕیارەکان" link="/dashboard/clients" />
          {clientStats.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">هیچ داتایەک نییە</p> : (
            <div className="flex flex-col gap-2">
              {clientStats.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2.5 px-3 py-2 bg-muted/40 rounded-lg">
                  <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.city}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px]">{c.count} داواکاری</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      );

      case "quick-nav": return (
        <CardContent className="p-4">
          <WHeader title="بەستەری خێرا" />
          <div className="flex flex-col gap-1.5">
            {[
              { label: "نوێنەران", href: "/dashboard/reps",       icon: <UserCheck className="size-3.5" />, className: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100" },
              { label: "کۆگاکان", href: "/dashboard/warehouses", icon: <Truck className="size-3.5" />,     className: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100" },
              { label: "شیکاری",  href: "/dashboard/analytics",  icon: <BarChart2 className="size-3.5" />, className: "bg-primary/10 text-primary hover:bg-primary/15" },
              { label: "دارایی",  href: "/dashboard/finance",     icon: <Wallet className="size-3.5" />,   className: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100" },
            ].map(item => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors no-underline", item.className)}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </CardContent>
      );

      case "user-status": {
        const threeMinsAgo = Date.now() - 3 * 60 * 1000;
        const online = allUsers.filter(u => u.last_seen && new Date(u.last_seen).getTime() > threeMinsAgo);
        const offline = allUsers.filter(u => !u.last_seen || new Date(u.last_seen).getTime() <= threeMinsAgo);
        const roleBadge: Record<string, string> = { ADMIN: "ئەدمین", MANAGER: "بەڕێوبەر", REP: "نوێنەر" };
        const roleCls: Record<string, string> = { ADMIN: "bg-red-100 text-red-700", MANAGER: "bg-primary/10 text-primary", REP: "bg-green-100 text-green-700" };
        function UserRow({ u, isOnline }: { u: typeof allUsers[0]; isOnline: boolean }) {
          const initials = u.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
          return (
            <div className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
              <div className="relative shrink-0">
                <Avatar className="size-8">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className={cn("absolute bottom-0 end-0 size-2.5 rounded-full border-2 border-background", isOnline ? "bg-green-500" : "bg-muted-foreground/40")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{u.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", roleCls[u.role] || roleCls.REP)}>{roleBadge[u.role] || u.role}</span>
                  {isOnline ? <span className="text-[10px] text-green-600 font-semibold">● ئۆنلاین</span>
                    : u.last_seen ? <span className="text-[10px] text-muted-foreground">{timeAgoShort(u.last_seen)} پێش</span>
                    : <span className="text-[10px] text-muted-foreground/50">هەرگیز</span>}
                </div>
              </div>
            </div>
          );
        }
        return (
          <CardContent className="p-4">
            <WHeader title="بەکارهێنەران" link="/dashboard/users" />
            {allUsers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">چاوەڕوان بکە...</p> : (
              <div className="overflow-auto max-h-[280px]">
                {online.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 mb-2">
                      <span className="size-1.5 rounded-full bg-green-500 inline-block" />ئۆنلاین ({online.length})
                    </div>
                    {online.map(u => <UserRow key={u.id} u={u} isOnline={true} />)}
                    {offline.length > 0 && <div className="h-px bg-border my-2" />}
                  </>
                )}
                {offline.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-2">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 inline-block" />ئۆفلاین ({offline.length})
                    </div>
                    {offline.map(u => <UserRow key={u.id} u={u} isOnline={false} />)}
                  </>
                )}
              </div>
            )}
          </CardContent>
        );
      }

      default: return <CardContent className="p-4 text-xs text-muted-foreground">{id}</CardContent>;
    }
  }

  return (
    <>
      {/* ── Today KPI Strip ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 page-stagger">
          {[
            { label: "داواکارییەکانی ئەمڕۆ", value: todayOrders,           icon: <ShoppingCart className="size-3.5" />, cls: "bg-primary/10 text-primary" },
            { label: "داهاتی ئەمڕۆ",          value: formatIQD(todayRevenue), icon: <DollarSign className="size-3.5" />,   cls: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" },
            { label: "گەیاندنی ئەمڕۆ",        value: todayDelivered,         icon: <Truck className="size-3.5" />,         cls: "bg-violet-100 dark:bg-violet-950/40 text-violet-600" },
            { label: "چاوەڕوانن",              value: todayPending,           icon: <Clock className="size-3.5" />,         cls: "bg-orange-100 dark:bg-orange-950/40 text-orange-600" },
          ].map(k => (
            <Card key={k.label} className="card-interactive">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", k.cls)}>{k.icon}</div>
                <div>
                  <p className="text-base font-black leading-none">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Live Activity Chart ── */}
      {!loading && (
        <Card className="mb-4 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="px-4 pt-3 pb-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-violet-500 animate-pulse inline-block" />
              <CardTitle className="text-sm font-bold dark:text-white">چالاکیی ڕستەیی</CardTitle>
              <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-300 dark:border-violet-500/30">زیندوو</Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">80ms</span>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="h-40">
              <LiveActivityChart />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Online Users Strip ── */}
      {onlineUsers.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
              <span className="size-2 rounded-full bg-green-500 inline-block animate-pulse" />
              ئێستا ئۆنلاینن
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {onlineUsers.map(u => {
                const initials = u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "؟";
                return (
                  <div key={u.id} title={u.name} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <OreoAvatar src={u.avatar_url} name={u.name} size={16} />
                    {u.name}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Edit Mode Toolbar ── */}
      {isEditing && (
        <div className="mb-4 px-4 py-3 bg-primary/5 border border-primary/20 border-dashed rounded-xl flex items-center justify-between">
          <div className="text-sm text-primary font-semibold flex items-center gap-1.5">
            <GripVertical className="size-3.5" /> ویجێتەکان بڕکێشە بۆ گۆڕینی شوێنیان
          </div>
          <Button size="sm" onClick={() => setShowCatalog(!showCatalog)}>
            <Plus className="size-3.5 me-1" /> زیادکردنی ویجێت
          </Button>
        </div>
      )}

      {/* ── Widget Catalog ── */}
      {isEditing && showCatalog && hiddenWidgets.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2.5">ویجێتە شاراوەکان</p>
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map(d => (
                <Button key={d.id} variant="outline" size="sm" className="text-xs" onClick={() => addWidget(d.id)}>
                  <Plus className="size-3 me-1 text-primary" /> {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {isEditing && showCatalog && hiddenWidgets.length === 0 && (
        <div className="mb-4 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
          ✅ هەموو ویجێتەکان زیادکراون
        </div>
      )}


      {/* ── Widget Grid ── */}
      <div className="grid grid-cols-4 gap-4 page-stagger">
        {layout.map(id => {
          const def = WIDGET_DEFS.find(d => d.id === id);
          if (!def) return null;
          return (
            <WidgetCard
              key={id} id={id} size={def.defaultSize} isEditing={isEditing}
              isDragOver={dragOverId === id}
              onDragStart={() => setDraggingId(id)}
              onDragOver={() => setDragOverId(id)}
              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              onDrop={() => handleDrop(id)}
              onRemove={() => removeWidget(id)}
            >
              {renderWidget(id)}
            </WidgetCard>
          );
        })}
      </div>

      {layout.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Boxes className="size-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-bold mb-1">داشبۆرد بەتاڵە</p>
          <p className="text-sm">کرتە بکە لە "تەرخانکردن" بۆ زیادکردنی ویجێت</p>
        </div>
      )}
    </>
  );
}
