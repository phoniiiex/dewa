"use client";
import { useState, useEffect } from "react";
import {
  Package, Users, ShoppingCart, DollarSign, TrendingUp, Truck,
  AlertTriangle, Clock, UserCheck, GripVertical, Plus, X,
  Wallet, BarChart2, CheckCircle, Building2,
  Settings2, ArrowUpRight, Boxes, Activity,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────
type WidgetSize = "sm" | "md" | "lg";
interface WidgetDef { id: string; label: string; icon: React.ReactNode; defaultSize: WidgetSize; }

const WIDGET_DEFS: WidgetDef[] = [
  { id: "kpi-revenue",   label: "کۆی داهات",             icon: <DollarSign size={14} />,   defaultSize: "sm" },
  { id: "kpi-orders",    label: "داواکارییەکان",          icon: <ShoppingCart size={14} />, defaultSize: "sm" },
  { id: "kpi-products",  label: "بەرهەمەکان",             icon: <Package size={14} />,      defaultSize: "sm" },
  { id: "kpi-clients",   label: "کڕیارەکان",              icon: <Users size={14} />,        defaultSize: "sm" },
  { id: "recent-orders", label: "کۆتا داواکارییەکان",    icon: <Clock size={14} />,        defaultSize: "lg" },
  { id: "alerts",        label: "ئاگاداریەکان",           icon: <AlertTriangle size={14} />, defaultSize: "md" },
  { id: "financial",     label: "پوختەی دارایی",          icon: <Wallet size={14} />,       defaultSize: "md" },
  { id: "order-status",  label: "بارودۆخی داواکاری",      icon: <BarChart2 size={14} />,    defaultSize: "md" },
  { id: "stock-alerts",  label: "ئاگاداری کۆگا",          icon: <Boxes size={14} />,        defaultSize: "md" },
  { id: "rep-perf",      label: "ئەنجامی نوێنەران",       icon: <UserCheck size={14} />,    defaultSize: "md" },
  { id: "top-clients",   label: "باشترین کڕیارەکان",      icon: <TrendingUp size={14} />,   defaultSize: "md" },
  { id: "quick-nav",     label: "بەستەری خێرا",           icon: <Activity size={14} />,     defaultSize: "sm" },
];

const DEFAULT_LAYOUT = [
  "kpi-revenue", "kpi-orders", "kpi-products", "kpi-clients",
  "recent-orders",
  "alerts", "financial",
  "order-status", "stock-alerts",
  "rep-perf", "top-clients", "quick-nav",
];
const STORAGE_KEY = "dewa_dashboard_layout_v3";

const colSpan: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 4 };

// ─── Sparkline SVG ───────────────────────────────────────
function Sparkline({ data, color = "#4263EB" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 80, H = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPts = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const span = colSpan[size];
  return (
    <div
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragEnd={onDragEnd}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        gridColumn: `span ${span}`,
        background: "white",
        borderRadius: 16,
        border: isDragOver ? "2px dashed #4263EB" : "1px solid #E9ECEF",
        boxShadow: isDragOver ? "0 0 0 4px #EDF2FF" : "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
        transition: "border 0.15s, box-shadow 0.15s, opacity 0.15s",
        cursor: isEditing ? "grab" : "default",
      }}
    >
      {isEditing && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(237,242,255,0.15)", zIndex: 5, pointerEvents: "none", borderRadius: 15 }} />
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "white", border: "1px solid #E9ECEF", display: "flex", alignItems: "center", justifyContent: "center", color: "#ADB5BD", cursor: "grab", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <GripVertical size={13} />
            </div>
            <button onClick={onRemove} style={{ width: 26, height: 26, borderRadius: 7, background: "white", border: "1px solid #FFE3E3", color: "#FA5252", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <X size={12} />
            </button>
          </div>
        </>
      )}
      {children}
    </div>
  );
}

// ─── Individual Widgets ───────────────────────────────────
function WidgetHeader({ title, link, color = "#4263EB" }: { title: string; link?: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{title}</span>
      {link && (
        <Link href={link} style={{ fontSize: 11, color, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
          وردەکاری <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function DashboardPage() {
  const { orders, products, clients, reps, transactions } = useData();

  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  // Load saved layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLayout(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveLayout = (l: string[]) => {
    setLayout(l);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = [...layout];
    const fromIdx = next.indexOf(draggingId);
    const toIdx = next.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    saveLayout(next);
    setDraggingId(null);
    setDragOverId(null);
  };

  const removeWidget = (id: string) => saveLayout(layout.filter(w => w !== id));
  const addWidget = (id: string) => { saveLayout([...layout, id]); setShowCatalog(false); };

  const hiddenWidgets = WIDGET_DEFS.filter(d => !layout.includes(d.id));

  // ─── Data derivations ───
  const totalRevenue = orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0);
  const pendingOrders = orders.filter(o => o.status === "WAITING").length;
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const activeDeliveries = orders.filter(o => o.status === "SENT").length;
  const nearExpiryProducts = products.filter(p => {
    if (!p.expiryDate) return false;
    const diff = new Date(p.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });
  const expiredProducts = products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() < Date.now());
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 50);

  // Last 7 days order counts for sparkline
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    return orders.filter(o => o.createdAt?.startsWith(ds)).length;
  });

  const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const statusBreakdown = [
    { label: "چاوەڕوان",    key: "WAITING",      color: "#D97706" },
    { label: "لە پڕۆسەدا",  key: "IN_PROGRESS",  color: "#339AF0" },
    { label: "ڕەتکراوە",   key: "NOT_ACCEPTED", color: "#FA5252" },
    { label: "ئامادەیە",   key: "READY",        color: "#059669" },
    { label: "نێردراوە",   key: "SENT",         color: "#7C3AED" },
    { label: "گەیشتووە",  key: "DELIVERED",    color: "#0891B2" },
    { label: "پارەدراوە", key: "PAID",         color: "#2B8A3E" },
  ].map(s => ({ ...s, count: orders.filter(o => o.status === s.key).length }));

  const repStats = reps.slice(0, 5).map(r => ({
    name: r.name,
    count: orders.filter(o => o.repId === r.id).length,
    total: orders.filter(o => o.repId === r.id).reduce((s, o) => s + o.totalAmount, 0),
  })).sort((a, b) => b.count - a.count);

  const clientStats = clients.slice(0, 5).map(c => ({
    name: c.name,
    city: c.city,
    count: orders.filter(o => o.clientId === c.id).length,
  })).sort((a, b) => b.count - a.count);

  const statusClasses: Record<string, string> = { WAITING: "pending", IN_PROGRESS: "processing", NOT_ACCEPTED: "cancelled", READY: "shipped", SENT: "shipped", DELIVERED: "delivered", PAID: "paid" };
  const statusLabels: Record<string, string> = { WAITING: "چاوەڕوان", IN_PROGRESS: "لە پڕۆسەدا", NOT_ACCEPTED: "ڕەتکراوە", READY: "ئامادەیە", SENT: "نێردراوە", DELIVERED: "گەیشتووە", PAID: "پارەدراوە" };

  // ─── Render each widget ───
  const iS: React.CSSProperties = { padding: "20px 20px 18px" };

  function renderWidget(id: string) {
    switch (id) {

      case "kpi-revenue": return (
        <div style={iS}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>کۆی داهات</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1A1A2E", lineHeight: 1.1 }}>{formatIQD(totalRevenue)}</div>
              <div style={{ fontSize: 11, color: "#40C057", fontWeight: 600, marginTop: 5, display: "flex", alignItems: "center", gap: 3 }}>
                <ArrowUpRight size={11} /> داهاتی پارەدراو
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EBFBEE", display: "flex", alignItems: "center", justifyContent: "center", color: "#40C057" }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Sparkline data={last7} color="#40C057" /></div>
        </div>
      );

      case "kpi-orders": return (
        <div style={iS}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>داواکارییەکان</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1A1A2E", lineHeight: 1.1 }}>{orders.length}</div>
              {pendingOrders > 0 && (
                <div style={{ fontSize: 11, color: "#FD7E14", fontWeight: 600, marginTop: 5 }}>{pendingOrders} چاوەڕوان</div>
              )}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EDF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Sparkline data={last7} color="#4263EB" /></div>
        </div>
      );

      case "kpi-products": return (
        <div style={iS}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>بەرهەمەکان</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1A1A2E", lineHeight: 1.1 }}>{products.length}</div>
              {nearExpiryProducts.length > 0 && (
                <div style={{ fontSize: 11, color: "#FA5252", fontWeight: 600, marginTop: 5 }}>{nearExpiryProducts.length} نزیکی بەسەرچوون</div>
              )}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Sparkline data={[products.length, products.length, products.length]} color="#7C5CFC" /></div>
        </div>
      );

      case "kpi-clients": return (
        <div style={iS}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>کڕیارەکان</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1A1A2E", lineHeight: 1.1 }}>{clients.length}</div>
              <div style={{ fontSize: 11, color: "#6C757D", fontWeight: 600, marginTop: 5 }}>{clients.filter(c => c.isActive).length} چالاک</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF3EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#F47B35" }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Sparkline data={[clients.length - 3, clients.length - 1, clients.length]} color="#F47B35" /></div>
        </div>
      );

      case "recent-orders": return (
        <div style={iS}>
          <WidgetHeader title="کۆتا داواکارییەکان" link="/dashboard/orders" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentOrders.length === 0 ? (
              <p style={{ fontSize: 13, color: "#ADB5BD", textAlign: "center", padding: 24 }}>هیچ داواکارییەک نییە</p>
            ) : recentOrders.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F8F9FA", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#4263EB" }}>{o.orderNumber}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{o.clientName}</span>
                  <span style={{ fontSize: 11, color: "#ADB5BD" }}>{o.repName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{formatIQD(o.totalAmount)}</span>
                  <span className={`status-badge ${statusClasses[o.status]}`}>{statusLabels[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      case "alerts": return (
        <div style={iS}>
          <WidgetHeader title="ئاگاداریەکان" color="#FD7E14" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingOrders > 0 && (
              <Link href="/dashboard/orders" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFF3BF", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#F08C00", textDecoration: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F08C0020", display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={13} /></div>
                {pendingOrders} داواکاری چاوەڕوانن
              </Link>
            )}
            {nearExpiryProducts.length > 0 && (
              <Link href="/dashboard/products" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFE3E3", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#C92A2A", textDecoration: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#C92A2A20", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={13} /></div>
                {nearExpiryProducts.length} بەرهەم نزیکی بەسەرچوون
              </Link>
            )}
            {expiredProducts.length > 0 && (
              <Link href="/dashboard/products" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFE3E3", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#C92A2A", textDecoration: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#C92A2A20", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></div>
                {expiredProducts.length} بەرهەمی بەسەرچوو
              </Link>
            )}
            {activeDeliveries > 0 && (
              <Link href="/dashboard/logistics" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#D0EBFF", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#1971C2", textDecoration: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#1971C220", display: "flex", alignItems: "center", justifyContent: "center" }}><Truck size={13} /></div>
                {activeDeliveries} گەیاندن لە ڕێگادا
              </Link>
            )}
            {pendingOrders === 0 && nearExpiryProducts.length === 0 && expiredProducts.length === 0 && activeDeliveries === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#EBFBEE", borderRadius: 10, fontSize: 13, color: "#2B8A3E", fontWeight: 600 }}>
                <CheckCircle size={16} /> هیچ ئاگادارییەک نییە
              </div>
            )}
          </div>
        </div>
      );

      case "financial": return (
        <div style={{ ...iS, background: "linear-gradient(135deg, #1A1A2E 0%, #2D2B55 60%, #1A2456 100%)", borderRadius: 15, color: "white" }}>
          <WidgetHeader title="پوختەی دارایی" color="rgba(255,255,255,0.6)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "داهات", value: totalIncome, color: "#40C057" },
              { label: "خەرجی", value: totalExpense, color: "#FA5252" },
              { label: "قازانج", value: totalIncome - totalExpense, color: "#7C5CFC" },
            ].map(item => (
              <div key={item.label} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.06)", borderRadius: 10, backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{formatIQD(item.value)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>کۆی مامەڵەکان</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{transactions.length} مامەڵە</span>
          </div>
        </div>
      );

      case "order-status": return (
        <div style={iS}>
          <WidgetHeader title="بارودۆخی داواکاری" link="/dashboard/orders" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {statusBreakdown.filter(s => s.count > 0).map(s => (
              <div key={s.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#495057" }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: 6, background: "#F1F3F5", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: s.color, width: `${orders.length ? (s.count / orders.length) * 100 : 0}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
            {statusBreakdown.every(s => s.count === 0) && (
              <p style={{ fontSize: 13, color: "#ADB5BD", textAlign: "center", padding: 16 }}>هیچ داواکارییەک نییە</p>
            )}
          </div>
        </div>
      );

      case "stock-alerts": return (
        <div style={iS}>
          <WidgetHeader title="ئاگاداری کۆگا" link="/dashboard/products" color="#FA5252" />
          {nearExpiryProducts.length === 0 && lowStockProducts.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#EBFBEE", borderRadius: 10, fontSize: 13, color: "#2B8A3E", fontWeight: 600 }}>
              <CheckCircle size={16} /> کۆگا باشە
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...nearExpiryProducts.slice(0, 3), ...lowStockProducts.slice(0, 2)].map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#FFF5F5", borderRadius: 9, gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={12} color="#FA5252" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A2E" }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#FA5252", padding: "2px 7px", background: "#FFE3E3", borderRadius: 5 }}>
                    {p.expiryDate ? p.expiryDate : `${p.stock} بەردەست`}
                  </span>
                </div>
              ))}
              {(nearExpiryProducts.length + lowStockProducts.length) > 5 && (
                <Link href="/dashboard/products" style={{ fontSize: 11, color: "#FA5252", fontWeight: 600, textAlign: "center", padding: 6, textDecoration: "none" }}>
                  + {nearExpiryProducts.length + lowStockProducts.length - 5} زیاتر
                </Link>
              )}
            </div>
          )}
        </div>
      );

      case "rep-perf": return (
        <div style={iS}>
          <WidgetHeader title="ئەنجامی نوێنەران" link="/dashboard/reps" />
          {repStats.length === 0 ? (
            <p style={{ fontSize: 13, color: "#ADB5BD", textAlign: "center", padding: 16 }}>هیچ داتایەک نییە</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {repStats.map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "#F0F4FF" : "#F8F9FA", borderRadius: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: i === 0 ? "#4263EB" : "#DEE2E6", display: "flex", alignItems: "center", justifyContent: "center", color: i === 0 ? "white" : "#6C757D", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "#ADB5BD" }}>{r.count} داواکاری</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4263EB" }}>{formatIQD(r.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      case "top-clients": return (
        <div style={iS}>
          <WidgetHeader title="باشترین کڕیارەکان" link="/dashboard/clients" />
          {clientStats.length === 0 ? (
            <p style={{ fontSize: 13, color: "#ADB5BD", textAlign: "center", padding: 16 }}>هیچ داتایەک نییە</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientStats.map((c, i) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F8F9FA", borderRadius: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: ["#4263EB", "#7C5CFC", "#40C057", "#F47B35", "#FA5252"][i] + "20", display: "flex", alignItems: "center", justifyContent: "center", color: ["#4263EB", "#7C5CFC", "#40C057", "#F47B35", "#FA5252"][i], flexShrink: 0 }}>
                    <Building2 size={12} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#ADB5BD" }}>{c.city}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", padding: "2px 7px", background: "#E9ECEF", borderRadius: 5 }}>{c.count} داواکاری</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      case "quick-nav": return (
        <div style={iS}>
          <WidgetHeader title="بەستەری خێرا" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "نوێنەران", href: "/dashboard/reps", icon: <UserCheck size={14} />, color: "#40C057", bg: "#EBFBEE" },
              { label: "کۆگاکان", href: "/dashboard/warehouses", icon: <Truck size={14} />, color: "#7C5CFC", bg: "#F3F0FF" },
              { label: "شیکاری", href: "/dashboard/analytics", icon: <BarChart2 size={14} />, color: "#4263EB", bg: "#EDF2FF" },
              { label: "دارایی", href: "/dashboard/finance", icon: <Wallet size={14} />, color: "#F47B35", bg: "#FEF3EB" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: item.bg, borderRadius: 8, fontSize: 12, fontWeight: 600, color: item.color, textDecoration: "none" }}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      );

      default: return <div style={{ padding: 20, fontSize: 12, color: "#ADB5BD" }}>{id}</div>;
    }
  }

  return (
    <>
      {/* Customize button only — welcome header is in TopBar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <button onClick={() => { setIsEditing(!isEditing); if (isEditing) setShowCatalog(false); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: isEditing ? "none" : "1.5px solid var(--color-border)", background: isEditing ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "var(--color-surface)", color: isEditing ? "white" : "var(--color-text-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: isEditing ? "0 4px 14px rgba(66,99,235,0.3)" : "none", transition: "all 0.15s" }}>
          {isEditing ? <><CheckCircle size={15} /> تەواوکردن</> : <><Settings2 size={15} /> تەرخانکردن</>}
        </button>
      </div>

      {/* Edit Mode Toolbar */}
      {isEditing && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg, #EDF2FF, #F3F0FF)", borderRadius: 12, border: "1.5px dashed #C5D8FF", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 0.15s ease" }}>
          <div style={{ fontSize: 13, color: "#4263EB", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <GripVertical size={14} /> ویجێتەکان بڕکێشە بۆ گۆڕینی شوێنیان
          </div>
          <button onClick={() => setShowCatalog(!showCatalog)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={13} /> زیادکردنی ویجێت
          </button>
        </div>
      )}

      {/* Widget Catalog (hidden widgets) */}
      {isEditing && showCatalog && hiddenWidgets.length > 0 && (
        <div style={{ marginBottom: 16, padding: 14, background: "white", borderRadius: 12, border: "1px solid #E9ECEF", animation: "fadeIn 0.15s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D", marginBottom: 10 }}>ویجێتە شاراوەکان</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hiddenWidgets.map(d => (
              <button key={d.id} onClick={() => addWidget(d.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1.5px solid #E9ECEF", background: "#F8F9FA", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#495057" }}>
                <Plus size={11} color="#4263EB" /> {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {isEditing && showCatalog && hiddenWidgets.length === 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#EBFBEE", borderRadius: 10, fontSize: 13, color: "#2B8A3E", fontWeight: 600 }}>
          ✅ هەموو ویجێتەکان زیادکراون
        </div>
      )}

      {/* Widget Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {layout.map(id => {
          const def = WIDGET_DEFS.find(d => d.id === id);
          if (!def) return null;
          const size = def.defaultSize;
          const isDragOver = dragOverId === id;
          return (
            <WidgetCard
              key={id} id={id} size={size} isEditing={isEditing}
              isDragOver={isDragOver}
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
        <div style={{ textAlign: "center", padding: "80px 24px", color: "#ADB5BD" }}>
          <LayoutDashboard size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>داشبۆرد بەتاڵە</div>
          <div style={{ fontSize: 13 }}>کرتە بکە لە "تەرخانکردن" بۆ زیادکردنی ویجێت</div>
        </div>
      )}
    </>
  );
}
