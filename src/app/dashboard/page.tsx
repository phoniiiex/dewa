"use client";
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Truck, AlertTriangle, ArrowUpCircle, Clock, UserCheck } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import Link from "next/link";

export default function DashboardPage() {
  const { orders, products, clients, reps, transactions, deliveries, warehouses } = useData();

  const totalRevenue = orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0);
  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  const nearExpiryProducts = products.filter(p => {
    const diff = new Date(p.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }).length;
  const activeDeliveries = deliveries.filter(d => d.status === "IN_TRANSIT").length;
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
  const statusClasses: Record<string, string> = { PENDING: "pending", PROCESSING: "processing", SHIPPED: "shipped", DELIVERED: "delivered", PAID: "paid", CANCELLED: "cancelled" };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>بەخێربێیت بۆ دەوا 👋</h1>
        <p style={{ fontSize: 14, color: "#6C757D", marginTop: 4 }}>پوختەی گشتی سیستەم</p>
      </div>

      {/* Main KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داهات", value: formatIQD(totalRevenue), icon: <DollarSign size={20} />, color: "#40C057", bg: "#EBFBEE", trend: "+١٢٪" },
          { title: "داواکاری", value: String(orders.length), icon: <ShoppingCart size={20} />, color: "#4263EB", bg: "#EDF2FF" },
          { title: "بەرهەم", value: String(products.length), icon: <Package size={20} />, color: "#7C5CFC", bg: "#F3F0FF" },
          { title: "کڕیار", value: String(clients.length), icon: <Users size={20} />, color: "#F47B35", bg: "#FEF3EB" },
        ].map((k, i) => (
          <div className="kpi-card" key={i} style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
                <div className="kpi-card-value" style={{ fontSize: "1.5rem" }}>{k.value}</div>
                {k.trend && <span style={{ fontSize: 11, color: "#40C057", fontWeight: 600, marginTop: 4, display: "inline-block" }}>{k.trend}</span>}
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.color }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Recent Orders */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Clock size={16} color="#4263EB" /> کۆتا داواکارییەکان</h3>
            <Link href="/dashboard/orders" style={{ fontSize: 12, color: "#4263EB", fontWeight: 600, textDecoration: "none" }}>هەموو →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentOrders.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F8F9FA", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{o.orderNumber}</span>
                  <span style={{ fontSize: 13, color: "#6C757D" }}>{o.clientName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{formatIQD(o.totalAmount)}</span>
                  <span className={`status-badge ${statusClasses[o.status]}`}>{statusLabels[o.status]}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <p style={{ fontSize: 13, color: "#ADB5BD", textAlign: "center", padding: 24 }}>هیچ داواکارییەک نییە</p>}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Alerts */}
          <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>ئاگاداری</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingOrders > 0 && (
                <Link href="/dashboard/orders" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#FFF3BF", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#F08C00", textDecoration: "none" }}>
                  <Clock size={14} /> {pendingOrders} داواکاری چاوەڕوان
                </Link>
              )}
              {nearExpiryProducts > 0 && (
                <Link href="/dashboard/products" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#FFE3E3", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#C92A2A", textDecoration: "none" }}>
                  <AlertTriangle size={14} /> {nearExpiryProducts} بەرهەم نزیکی بەسەرچوونن
                </Link>
              )}
              {activeDeliveries > 0 && (
                <Link href="/dashboard/logistics" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#D0EBFF", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#1971C2", textDecoration: "none" }}>
                  <Truck size={14} /> {activeDeliveries} گەیاندن لە ڕێگادا
                </Link>
              )}
              {pendingOrders === 0 && nearExpiryProducts === 0 && activeDeliveries === 0 && (
                <p style={{ fontSize: 13, color: "#40C057", textAlign: "center", padding: 12 }}>✅ هیچ ئاگادارییەک نییە</p>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2B55)", borderRadius: 14, padding: 20, color: "white" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, opacity: 0.9 }}>پوختەی دارایی</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>داهات</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#40C057" }}>+{formatIQD(totalIncome)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>خەرجی</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FA5252" }}>-{formatIQD(totalExpense)}</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>قازانج</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{formatIQD(totalIncome - totalExpense)}</span>
            </div>
          </div>

          {/* Quick Nav */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "نوێنەران", href: "/dashboard/reps", icon: <UserCheck size={16} />, bg: "#EBFBEE", color: "#40C057" },
              { label: "کۆگاکان", href: "/dashboard/warehouses", icon: <Truck size={16} />, bg: "#F3F0FF", color: "#7C5CFC" },
              { label: "بۆنەس", href: "/dashboard/bonus", icon: <TrendingUp size={16} />, bg: "#FEF3EB", color: "#F47B35" },
              { label: "شیکاری", href: "/dashboard/analytics", icon: <ArrowUpCircle size={16} />, bg: "#EDF2FF", color: "#4263EB" },
            ].map((item, i) => (
              <Link key={i} href={item.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: item.bg, borderRadius: 10, fontSize: 13, fontWeight: 600, color: item.color, textDecoration: "none" }}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
