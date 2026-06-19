"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { formatIQD } from "@/lib/currency";

const monthlySales = [
  { name: "کانونی دووەم", value: 28_000_000 },
  { name: "شوبات", value: 35_000_000 },
  { name: "ئازار", value: 42_000_000 },
  { name: "نیسان", value: 38_000_000 },
  { name: "ئایار", value: 48_000_000 },
  { name: "حوزەیران", value: 52_000_000 },
];

const repPerformance = [
  { name: "ئاکۆ", orders: 85, revenue: 12_000_000, color: "#4263EB" },
  { name: "هێمن", orders: 72, revenue: 9_800_000, color: "#F47B35" },
  { name: "شادی", orders: 68, revenue: 8_200_000, color: "#40C057" },
  { name: "دانا", orders: 55, revenue: 7_100_000, color: "#7C5CFC" },
  { name: "ڕێبوار", orders: 48, revenue: 5_400_000, color: "#339AF0" },
];

const categoryBreakdown = [
  { name: "ئەنتیبایۆتیک", value: 35, color: "#4263EB" },
  { name: "ئازارکوژ", value: 28, color: "#F47B35" },
  { name: "گەدە و هەرس", value: 18, color: "#40C057" },
  { name: "شەکرە", value: 12, color: "#7C5CFC" },
  { name: "هتد", value: 7, color: "#339AF0" },
];

const cityDistribution = [
  { name: "سلێمانی", value: 320, color: "#4263EB" },
  { name: "هەولێر", value: 280, color: "#F47B35" },
  { name: "دهۆک", value: 180, color: "#40C057" },
  { name: "کەرکوک", value: 150, color: "#7C5CFC" },
  { name: "هەڵەبجە", value: 90, color: "#339AF0" },
];

const weeklyComparison = [
  { name: "شەممە", thisWeek: 4_200_000, lastWeek: 3_800_000 },
  { name: "یەکشەممە", thisWeek: 5_100_000, lastWeek: 4_600_000 },
  { name: "دووشەممە", thisWeek: 6_200_000, lastWeek: 5_900_000 },
  { name: "سێشەممە", thisWeek: 5_800_000, lastWeek: 5_200_000 },
  { name: "چوارشەممە", thisWeek: 7_100_000, lastWeek: 6_400_000 },
  { name: "پێنجشەممە", thisWeek: 6_500_000, lastWeek: 5_800_000 },
  { name: "هەینی", thisWeek: 3_100_000, lastWeek: 2_900_000 },
];

const topClients = [
  { name: "دەرمانخانەی ئازادی", orders: 45, revenue: 8_500_000 },
  { name: "نەخۆشخانەی سلێمانی", orders: 38, revenue: 7_200_000 },
  { name: "کلینیکی هەنار", orders: 32, revenue: 5_100_000 },
  { name: "دەرمانخانەی ڕۆژ", orders: 28, revenue: 4_800_000 },
  { name: "دەرمانخانەی ڕۆشنا", orders: 25, revenue: 3_200_000 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("مانگانە");

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>شیکاری و ڕاپۆرتەکان</h1>
          <p style={{ fontSize: 13, color: "#6C757D" }}>شیکاری تەواوی فرۆشتن، بۆنەس، و ئەدای نوێنەران</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {["ڕۆژانە", "هەفتانە", "مانگانە", "ساڵانە"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: period === p ? "white" : "transparent",
              color: period === p ? "#1A1A2E" : "#6C757D",
              boxShadow: period === p ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داهات", value: "٥٢,٠٠٠,٠٠٠ د.ع", trend: 12.3, up: true },
          { title: "کۆی داواکاری", value: "٤٨٦", trend: 8.1, up: true },
          { title: "نرخی ناوەندی داواکاری", value: "١٠٦,٩٩٥ د.ع", trend: -2.4, up: false },
          { title: "نوێنەری چالاک", value: "١٢", trend: 0, up: true },
        ].map((kpi, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{kpi.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>
              {kpi.value}
              {kpi.trend !== 0 && (
                <span className={`kpi-badge ${kpi.up ? "up" : "down"}`} style={{ marginRight: 8 }}>
                  {kpi.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {kpi.trend > 0 ? "+" : ""}{kpi.trend}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card span-2">
          <div className="chart-card-header">
            <div className="chart-card-title">داهاتی مانگانە</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlySales}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4263EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4263EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} orientation="left" />
              <Tooltip formatter={(value: any) => [formatIQD(Number(value)), "داهات"]} contentStyle={{ background: "#1A1A2E", border: "none", borderRadius: 8, color: "white", fontSize: 13, direction: "rtl" }} />
              <Area type="monotone" dataKey="value" stroke="#4263EB" strokeWidth={2.5} fill="url(#grad1)" dot={{ fill: "#4263EB", r: 4, strokeWidth: 2, stroke: "white" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">جۆرەکانی بەرهەم</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={450}>
                {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {categoryBreakdown.map((seg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, display: "inline-block" }} />
                  <span style={{ color: "#6C757D" }}>{seg.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{seg.value}٪</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card span-2">
          <div className="chart-card-header">
            <div className="chart-card-title">بەراوردی ئەم هەفتە بە هەفتەی پێشوو</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} orientation="left" />
              <Tooltip formatter={(value: any) => [formatIQD(Number(value))]} contentStyle={{ background: "#1A1A2E", border: "none", borderRadius: 8, color: "white", fontSize: 13, direction: "rtl" }} />
              <Line type="monotone" dataKey="thisWeek" name="ئەم هەفتە" stroke="#4263EB" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="lastWeek" name="هەفتەی پێشوو" stroke="#ADB5BD" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">دابەشبوونی شار</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cityDistribution} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#1A1A2E", fontSize: 12 }} width={70} orientation="right" />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={16}>
                {cityDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Rep Performance */}
        <div className="data-table-wrapper">
          <div className="data-table-header">
            <span className="data-table-title">ئەدای نوێنەران</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>نوێنەر</th>
                <th>داواکاری</th>
                <th>داهات</th>
              </tr>
            </thead>
            <tbody>
              {repPerformance.map((rep, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: "#ADB5BD" }}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: rep.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700 }}>
                        {rep.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{rep.name}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{rep.orders}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(rep.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Clients */}
        <div className="data-table-wrapper">
          <div className="data-table-header">
            <span className="data-table-title">باشترین کڕیارەکان</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>کڕیار</th>
                <th>داواکاری</th>
                <th>داهات</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((client, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: "#ADB5BD" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{client.name}</td>
                  <td style={{ fontWeight: 600 }}>{client.orders}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(client.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
