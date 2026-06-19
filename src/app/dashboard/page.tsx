"use client";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Users,
  Gift,
  Package,
  MoreHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { formatIQD } from "@/lib/currency";

/* ============ Mock Data ============ */
const kpiData = [
  {
    title: "کۆی فرۆشتن",
    value: 48_294_000,
    currency: true,
    trend: 7.1,
    action: "ڕاپۆرت",
    icon: <TrendingUp size={16} />,
  },
  {
    title: "کۆی داواکارییەکان",
    value: 1248,
    currency: false,
    trend: -1.4,
    action: "ڕاپۆرت",
    icon: <ShoppingCart size={16} />,
  },
  {
    title: "کڕیاری چالاک",
    value: 186,
    currency: false,
    trend: 2.1,
    action: "وردەکاری",
    icon: <Users size={16} />,
  },
  {
    title: "بۆنەسی دابەشکراو",
    value: 3842,
    currency: false,
    trend: 3.2,
    suffix: " یەکە",
    action: "وردەکاری",
    icon: <Gift size={16} />,
  },
  {
    title: "بەرهەمی چالاک",
    value: 248,
    currency: false,
    trend: 1.8,
    action: "وردەکاری",
    icon: <Package size={16} />,
  },
  {
    title: "داواکاری چاوەڕوان",
    value: 28,
    currency: false,
    trend: -2.0,
    action: "سەیرکردن",
    icon: <ShoppingCart size={16} />,
    highlight: true,
  },
];

const salesChartData = [
  { name: "شوبات", value: 35_000_000 },
  { name: "ئازار", value: 42_000_000 },
  { name: "نیسان", value: 38_000_000 },
  { name: "ئایار", value: 48_000_000 },
  { name: "حوزەیران", value: 52_000_000 },
  { name: "تەمووز", value: 48_294_000 },
];

const topProductsData = [
  { name: "پاراسیتامۆل ٥٠٠ملگ", value: 12_500_000, color: "#4263EB" },
  { name: "ئەمۆکسیسیلین ٢٥٠ملگ", value: 9_800_000, color: "#F47B35" },
  { name: "ئۆمیپرازۆل ٢٠ملگ", value: 8_200_000, color: "#40C057" },
  { name: "مێتفۆرمین ٥٠٠ملگ", value: 7_100_000, color: "#7C5CFC" },
  { name: "ئازیترۆمایسین ٥٠٠ملگ", value: 5_400_000, color: "#339AF0" },
];

const clientSegmentData = [
  { name: "دەرمانخانە", value: 45, color: "#4263EB" },
  { name: "نەخۆشخانە", value: 30, color: "#F47B35" },
  { name: "کلینیک", value: 18, color: "#40C057" },
  { name: "کۆمەڵ", value: 7, color: "#7C5CFC" },
];

const recentOrders = [
  {
    id: "#ORD-98745",
    date: "٢٩ تشرینی یەکەم",
    status: "paid",
    statusLabel: "پارەدراو",
    customer: "دەرمانخانەی ئازادی",
    product: "پاراسیتامۆل ٥٠٠ملگ",
    amount: 399_000,
    avatarColor: "#4263EB",
  },
  {
    id: "#ORD-23674",
    date: "٢٨ تشرینی یەکەم",
    status: "processing",
    statusLabel: "لە ئامادەکردن",
    customer: "نەخۆشخانەی سلێمانی",
    product: "ئەمۆکسیسیلین ٢٥٠ملگ",
    amount: 1_299_000,
    avatarColor: "#F47B35",
  },
  {
    id: "#ORD-78967",
    date: "٢٧ تشرینی یەکەم",
    status: "paid",
    statusLabel: "پارەدراو",
    customer: "کلینیکی هەنار",
    product: "ئۆمیپرازۆل ٢٠ملگ",
    amount: 549_000,
    avatarColor: "#40C057",
  },
  {
    id: "#ORD-46578",
    date: "٢٦ تشرینی یەکەم",
    status: "pending",
    statusLabel: "چاوەڕوان",
    customer: "دەرمانخانەی ڕۆژ",
    product: "مێتفۆرمین ٥٠٠ملگ",
    amount: 250_000,
    avatarColor: "#7C5CFC",
  },
  {
    id: "#ORD-12567",
    date: "٢٥ تشرینی یەکەم",
    status: "paid",
    statusLabel: "پارەدراو",
    customer: "دەرمانخانەی ڕۆشنا",
    product: "ئازیترۆمایسین ٥٠٠ملگ",
    amount: 180_000,
    avatarColor: "#339AF0",
  },
];

const periodTabs = [
  { label: "١ ڕۆژ", key: "1D" },
  { label: "١ هەفتە", key: "1W", active: true },
  { label: "١ مانگ", key: "1M" },
  { label: "٣ مانگ", key: "3M" },
  { label: "١ ساڵ", key: "1Y" },
];

/* ============ Dashboard Page ============ */
export default function DashboardPage() {
  const [activePeriod, setActivePeriod] = useState("1W");

  return (
    <>
      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpiData.map((kpi, i) => {
          const isUp = kpi.trend >= 0;
          return (
            <div className={`kpi-card ${kpi.highlight ? "highlight" : ""}`} key={i}>
              <div className="kpi-card-header">
                <span className="kpi-card-title">{kpi.title}</span>
                <span className="kpi-card-action">{kpi.action}</span>
              </div>
              <div className="kpi-card-value">
                {kpi.currency ? (
                  <>
                    <span>{(kpi.value / 1000).toLocaleString("en-US")}</span>
                    <span className="currency">× ١٠٠٠ د.ع</span>
                  </>
                ) : (
                  <span>
                    {kpi.value.toLocaleString("en-US")}
                    {kpi.suffix || ""}
                  </span>
                )}
                <span className={`kpi-badge ${isUp ? "up" : "down"}`}>
                  {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend > 0 ? "+" : ""}
                  {kpi.trend}%
                </span>
              </div>
              {i === 0 && (
                <div className="kpi-period-tabs">
                  {periodTabs.map((tab) => (
                    <button
                      key={tab.key}
                      className={`kpi-period-tab ${activePeriod === tab.key ? "active" : ""}`}
                      onClick={() => setActivePeriod(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        {/* Sales Chart */}
        <div className="chart-card span-2">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">کۆی فرۆشتن</div>
              <div className="chart-card-subtitle">
                ٨,٩٤٤ × ١٠٠٠ د.ع{" "}
                <span className="kpi-badge up" style={{ marginRight: 8 }}>
                  <ArrowUpRight size={10} /> +٢.١٪
                </span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4263EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4263EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6C757D", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6C757D", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                orientation="left"
              />
              <Tooltip
                formatter={(value: any) => [formatIQD(Number(value)), "فرۆشتن"]}
                contentStyle={{
                  background: "#1A1A2E",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontSize: 13,
                  direction: "rtl",
                }}
                labelStyle={{ color: "#ADB5BD" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4263EB"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
                dot={{ fill: "#4263EB", r: 4, strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Client Segments */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">بەشەکانی کڕیار</div>
            <span className="kpi-badge up" style={{ fontSize: 11 }}>+٥.٨٪</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={clientSegmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {clientSegmentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {clientSegmentData.map((seg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: seg.color,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#6C757D" }}>{seg.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{seg.value}٪</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Bar */}
      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card span-2">
          <div className="chart-card-header">
            <div className="chart-card-title">باشترین بەرهەمەکان</div>
            <span className="kpi-card-action">هەمووی ببینە</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProductsData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6C757D", fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#1A1A2E", fontSize: 12 }}
                width={140}
                orientation="right"
              />
              <Tooltip
                formatter={(value: any) => [formatIQD(Number(value)), "داهات"]}
                contentStyle={{
                  background: "#1A1A2E",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontSize: 13,
                  direction: "rtl",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                {topProductsData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">چالاکییە تازەکان</div>
            <span className="kpi-card-action">وردەکاری</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            {[
              { text: "ئینڤێنتۆری نوێکرایەوە: پاراسیتامۆل", time: "١١:٣٠", color: "#4263EB" },
              { text: "گۆڕانکاری نرخ: ئەمۆکسیسیلین", time: "١١:٣٠", color: "#F47B35" },
              { text: "بەرهەمی نوێ زیادکرا: ئۆمیپرازۆل", time: "١١:٣٠", color: "#40C057" },
              { text: "داواکاری تەواوبوو: #ORD-98745", time: "١٠:٤٥", color: "#7C5CFC" },
              { text: "کڕیاری نوێ: دەرمانخانەی هەناو", time: "١٠:٣٠", color: "#339AF0" },
            ].map((act, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: act.color,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#1A1A2E" }}>{act.text}</div>
                </div>
                <div style={{ fontSize: 11, color: "#ADB5BD", whiteSpace: "nowrap" }}>
                  {act.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <span className="data-table-title">داواکارییە تازەکان</span>
          <button className="kpi-card-action">هەمووی ببینە</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ژمارە</th>
              <th>بەروار</th>
              <th>بارودۆخ</th>
              <th>کڕیار</th>
              <th>بەرهەم</th>
              <th>بڕی پارە</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{order.id}</td>
                <td style={{ color: "#6C757D" }}>{order.date}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.statusLabel}
                  </span>
                </td>
                <td>
                  <div className="customer-cell">
                    <div
                      className="customer-avatar"
                      style={{ background: order.avatarColor }}
                    >
                      {order.customer.charAt(0)}
                    </div>
                    <span>{order.customer}</span>
                  </div>
                </td>
                <td>{order.product}</td>
                <td style={{ fontWeight: 600 }}>{formatIQD(order.amount)}</td>
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
          <span className="pagination-info">پەڕەی ١ لە ١٦</span>
          <div className="pagination-buttons">
            <button className="pagination-btn">«</button>
            <button className="pagination-btn">‹</button>
            <button className="pagination-btn active">١</button>
            <button className="pagination-btn">٢</button>
            <button className="pagination-btn">٣</button>
            <button className="pagination-btn">…</button>
            <button className="pagination-btn">١٦</button>
            <button className="pagination-btn">›</button>
            <button className="pagination-btn">»</button>
          </div>
        </div>
      </div>
    </>
  );
}
