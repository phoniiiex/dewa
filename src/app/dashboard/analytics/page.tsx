"use client";
import { BarChart3, TrendingUp, Users, Package, ShoppingCart, DollarSign, MapPin, Truck } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";

export default function AnalyticsPage() {
  const { orders, products, clients, reps, transactions, deliveries, warehouses } = useData();

  const totalRevenue = orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0);
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  // City distribution
  const cityStats = clients.reduce((acc, c) => {
    acc[c.city] = (acc[c.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Category distribution
  const categoryStats = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Order status distribution
  const statusStats = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };

  // Top products by order count
  const productOrderCount = orders.flatMap(o => o.items).reduce((acc, i) => {
    acc[i.productName] = (acc[i.productName] || 0) + i.quantity;
    return acc;
  }, {} as Record<string, number>);
  const topProducts = Object.entries(productOrderCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top reps
  const topReps = reps.map(r => ({
    name: r.name,
    orders: orders.filter(o => o.repId === r.id).length,
    revenue: orders.filter(o => o.repId === r.id && o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
  })).sort((a, b) => b.revenue - a.revenue);

  const barMax = (entries: [string, number][]) => Math.max(...entries.map(e => e[1]), 1);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><BarChart3 size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>شیکاری و ڕاپۆرتەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>شیکاری گشتی ئەدای سیستەم</p></div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داهات", value: formatIQD(totalRevenue), icon: <DollarSign size={16} />, color: "#40C057" },
          { title: "داواکاری", value: String(orders.length), icon: <ShoppingCart size={16} />, color: "#4263EB" },
          { title: "بەرهەم", value: String(products.length), icon: <Package size={16} />, color: "#7C5CFC" },
          { title: "کڕیار", value: String(clients.length), icon: <Users size={16} />, color: "#F47B35" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>{k.icon} {k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Revenue Summary */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>پوختەی دارایی</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#D3F9D8", borderRadius: 8 }}>
              <span style={{ fontWeight: 600, color: "#2B8A3E" }}>کۆی داهات</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#2B8A3E" }}>{formatIQD(totalIncome)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#FFE3E3", borderRadius: 8 }}>
              <span style={{ fontWeight: 600, color: "#C92A2A" }}>کۆی خەرجی</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#C92A2A" }}>{formatIQD(totalExpense)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#EDF2FF", borderRadius: 8 }}>
              <span style={{ fontWeight: 600, color: "#4263EB" }}>قازانجی تەوا</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#4263EB" }}>{formatIQD(totalIncome - totalExpense)}</span>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>بارودۆخی داواکارییەکان</h3>
          {Object.entries(statusStats).map(([status, count]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 12, width: 80, color: "#6C757D" }}>{statusLabels[status] || status}</span>
              <div style={{ flex: 1, height: 24, background: "#F1F3F5", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${(count / Math.max(orders.length, 1)) * 100}%`, height: "100%", background: "linear-gradient(90deg, #4263EB, #7C5CFC)", borderRadius: 6, transition: "width 0.5s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, minWidth: 30 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Top Products */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>پەرفرۆشترین بەرهەمەکان</h3>
          {topProducts.map(([name, qty], i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 ? "#FFD43B" : i === 1 ? "#ADB5BD" : i === 2 ? "#D2691E" : "#E9ECEF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? "white" : "#6C757D" }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#4263EB" }}>{qty.toLocaleString()}</span>
            </div>
          ))}
          {topProducts.length === 0 && <p style={{ fontSize: 13, color: "#ADB5BD" }}>هیچ داتایەک نییە</p>}
        </div>

        {/* City Distribution */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>دابەشبوونی کڕیاران بە شار</h3>
          {Object.entries(cityStats).map(([city, count]) => (
            <div key={city} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <MapPin size={14} color="#ADB5BD" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{city}</span>
              <div style={{ width: 100, height: 20, background: "#F1F3F5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(count / barMax(Object.entries(cityStats))) * 100}%`, height: "100%", background: "linear-gradient(90deg, #F47B35, #FA5252)", borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: "center" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Reps */}
      <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>ئەدای نوێنەران</h3>
        <div className="data-table-wrapper" style={{ boxShadow: "none" }}>
          <table className="data-table">
            <thead><tr><th>نوێنەر</th><th>داواکاری</th><th>داهات</th></tr></thead>
            <tbody>
              {topReps.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ fontWeight: 600, color: "#4263EB" }}>{r.orders}</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{formatIQD(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
