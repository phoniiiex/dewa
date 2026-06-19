"use client";
import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { formatIQD } from "@/lib/currency";

const orders = [
  { id: "#ORD-98745", date: "٢٩ تشرینی یەکەم، ٠٩:٢٠", status: "paid", statusLabel: "پارەدراو", customer: "دەرمانخانەی ئازادی", product: "پاراسیتامۆل ٥٠٠ملگ", amount: 399_000, avatarColor: "#4263EB", routing: "standard", bonus: "١٠+٢" },
  { id: "#ORD-23674", date: "٢٨ تشرینی یەکەم، ١٠:٣٠", status: "paid", statusLabel: "پارەدراو", customer: "نەخۆشخانەی سلێمانی", product: "ئەمۆکسیسیلین ٢٥٠ملگ", amount: 1_299_000, avatarColor: "#F47B35", routing: "direct", bonus: "٥٠+١٠" },
  { id: "#ORD-78967", date: "٢٧ تشرینی یەکەم، ١١:٤٥", status: "paid", statusLabel: "پارەدراو", customer: "کلینیکی هەنار", product: "ئۆمیپرازۆل ٢٠ملگ", amount: 549_000, avatarColor: "#40C057", routing: "standard", bonus: "٢٠+٥" },
  { id: "#ORD-46578", date: "٢٦ تشرینی یەکەم، ١٩:٢٥", status: "pending", statusLabel: "چاوەڕوان", customer: "دەرمانخانەی ڕۆژ", product: "مێتفۆرمین ٥٠٠ملگ", amount: 250_000, avatarColor: "#7C5CFC", routing: "warehouse", bonus: "١٠٠+٢٠" },
  { id: "#ORD-12567", date: "٢٥ تشرینی یەکەم، ١٨:١٢", status: "processing", statusLabel: "لە ئامادەکردن", customer: "دەرمانخانەی ڕۆشنا", product: "ئازیترۆمایسین ٥٠٠ملگ", amount: 180_000, avatarColor: "#339AF0", routing: "standard", bonus: "٣٠+٥" },
  { id: "#ORD-98678", date: "٢٤ تشرینی یەکەم، ١٧:٥٤", status: "paid", statusLabel: "پارەدراو", customer: "نەخۆشخانەی هەولێر", product: "سیپرۆفلۆکساسین ٥٠٠ملگ", amount: 1_599_000, avatarColor: "#E64980", routing: "direct", bonus: "—" },
  { id: "#ORD-72456", date: "٢٣ تشرینی یەکەم، ٢٠:٢٤", status: "paid", statusLabel: "پارەدراو", customer: "دەرمانخانەی گوڵ", product: "ئایبوپرۆفین ٤٠٠ملگ", amount: 349_000, avatarColor: "#F59F00", routing: "standard", bonus: "١٥+٣" },
  { id: "#ORD-98912", date: "٢٢ تشرینی یەکەم، ٢١:٥٧", status: "cancelled", statusLabel: "هەڵوەشێندراوە", customer: "کلینیکی سۆران", product: "دیکلۆفیناک ٥٠ملگ", amount: 449_000, avatarColor: "#20C997", routing: "warehouse", bonus: "٥٠+١٥" },
];

const kpis = [
  { title: "کۆی داواکارییەکان", value: "١,٢٤٨", change: "+١٢ لەم هەفتەیە" },
  { title: "کۆی داهات", value: formatIQD(48_294_000), change: "+٨٪ بە بەراورد بە هەفتەی پێشوو" },
  { title: "تێچووی ناوەندی داواکاری", value: formatIQD(86_450), change: "-٢٪ لەم هەفتەیە" },
  { title: "داواکاری چاوەڕوان", value: "٢٨", change: "پێویستی بە سەرنج" },
];

const routingLabels: Record<string, string> = {
  standard: "ناوبژیوان",
  direct: "ڕاستەوخۆ",
  warehouse: "بۆ کۆگا",
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      {/* KPI Stats Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{kpi.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.5rem" }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{kpi.change}</div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
              <input
                type="text"
                placeholder="گەڕان لە داواکارییەکان..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="orders-search"
                style={{
                  padding: "8px 36px 8px 12px",
                  border: "1px solid #DEE2E6",
                  borderRadius: 8,
                  fontSize: 13,
                  width: 280,
                  background: "#F8F9FA",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="topbar-date-btn">
              <Calendar size={14} />
              <span>هەفتەی ڕابردوو</span>
              <ChevronDown size={14} />
            </button>
            <button className="topbar-filter-btn">
              <span>هەمو بارودۆخ</span>
              <ChevronDown size={14} />
            </button>
            <button className="topbar-filter-btn">
              <Filter size={14} />
              <span>فلتەر</span>
            </button>
            <button className="topbar-filter-btn">
              <Download size={14} />
              <span>ناردن</span>
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" style={{ accentColor: "#4263EB" }} />
              </th>
              <th>ژمارە</th>
              <th>بەروار</th>
              <th>بارودۆخ</th>
              <th>کڕیار</th>
              <th>بەرهەم</th>
              <th>بۆنەس</th>
              <th>ڕووت</th>
              <th>بڕی پارە</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <input type="checkbox" style={{ accentColor: "#4263EB" }} />
                </td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{order.id}</td>
                <td style={{ color: "#6C757D", fontSize: 13 }}>{order.date}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.statusLabel}
                  </span>
                </td>
                <td>
                  <div className="customer-cell">
                    <div className="customer-avatar" style={{ background: order.avatarColor }}>
                      {order.customer.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13 }}>{order.customer}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{order.product}</td>
                <td>
                  <span style={{
                    background: order.bonus !== "—" ? "#EDF2FF" : "transparent",
                    color: order.bonus !== "—" ? "#4263EB" : "#ADB5BD",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {order.bonus}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "#F8F9FA",
                    color: "#6C757D",
                  }}>
                    {routingLabels[order.routing]}
                  </span>
                </td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(order.amount)}</td>
                <td>
                  <button style={{ padding: 4, color: "#ADB5BD" }}>
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span className="pagination-info">پەڕەی ٢ لە ١٦</span>
          <div className="pagination-buttons">
            <button className="pagination-btn">«</button>
            <button className="pagination-btn">‹</button>
            <button className="pagination-btn">١</button>
            <button className="pagination-btn active">٢</button>
            <button className="pagination-btn">٣</button>
            <button className="pagination-btn">٤</button>
            <button className="pagination-btn">٥</button>
            <button className="pagination-btn">…</button>
            <button className="pagination-btn">١٦</button>
            <button className="pagination-btn">›</button>
            <button className="pagination-btn">»</button>
          </div>
          <span style={{ fontSize: 12, color: "#ADB5BD" }}>٧ / پەڕە</span>
        </div>
      </div>
    </>
  );
}
