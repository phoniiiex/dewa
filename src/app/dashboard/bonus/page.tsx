"use client";
import { Gift, ArrowUpRight, TrendingUp, Percent, Package, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { formatIQD } from "@/lib/currency";

const bonusByRep = [
  { name: "ئاکۆ", units: 4200, color: "#4263EB" },
  { name: "هێمن", units: 3100, color: "#F47B35" },
  { name: "شادی", units: 2800, color: "#40C057" },
  { name: "دانا", units: 2200, color: "#7C5CFC" },
  { name: "ڕێبوار", units: 1800, color: "#339AF0" },
  { name: "سەردار", units: 1400, color: "#E64980" },
];

const bonusByWarehouse = [
  { name: "هیمۆ لاب (٢٠٪)", units: 3200, color: "#4263EB" },
  { name: "ڕۆشنبیری (١٥٪)", units: 2400, color: "#F47B35" },
  { name: "سەلامەتی (١٨٪)", units: 1800, color: "#40C057" },
  { name: "ناوەند (٢٢٪)", units: 1500, color: "#7C5CFC" },
];

const splitData = [
  { name: "بۆنەسی کۆگا", value: 45, color: "#4263EB" },
  { name: "بۆنەسی نوێنەر", value: 55, color: "#F47B35" },
];

const recentBonus = [
  { order: "#ORD-98745", client: "دەرمانخانەی ئازادی", rep: "ئاکۆ", warehouse: "هیمۆ لاب", totalPct: 50, whPct: 20, repPct: 30, baseQty: 100, whBonus: 20, repBonus: 30, totalShipped: 150 },
  { order: "#ORD-23674", client: "نەخۆشخانەی سلێمانی", rep: "هێمن", warehouse: "ڕۆشنبیری", totalPct: 40, whPct: 15, repPct: 25, baseQty: 200, whBonus: 30, repBonus: 50, totalShipped: 280 },
  { order: "#ORD-78967", client: "کلینیکی هەنار", rep: "شادی", warehouse: "سەلامەتی", totalPct: 35, whPct: 18, repPct: 17, baseQty: 80, whBonus: 14, repBonus: 14, totalShipped: 108 },
  { order: "#ORD-46578", client: "دەرمانخانەی ڕۆژ", rep: "دانا", warehouse: "ناوەند", totalPct: 60, whPct: 22, repPct: 38, baseQty: 50, whBonus: 11, repBonus: 19, totalShipped: 80 },
];

export default function BonusPage() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EBFBEE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40C057" }}><Gift size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>شیکاری بۆنەس</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>شوێنپێگرتنی سیستەمی بۆنەس و دابەشبوونی لەنێوان کۆگا و نوێنەر</p>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی بۆنەسی دابەشکراو", value: "١٦,٤٠٠ یەکە", icon: <Gift size={16} /> },
          { title: "بۆنەسی کۆگاکان", value: "٨,٩٠٠ یەکە", icon: <Package size={16} /> },
          { title: "بۆنەسی نوێنەران", value: "٧,٥٠٠ یەکە", icon: <Users size={16} /> },
          { title: "ناوەندی ڕێژەی بۆنەس", value: "٣٨٪", icon: <Percent size={16} /> },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card span-2">
          <div className="chart-card-header"><div className="chart-card-title">بۆنەسی دابەشکراو بۆ هەر نوێنەرێک</div></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bonusByRep} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#1A1A2E", fontSize: 12 }} width={60} orientation="right" />
              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} یەکە`, "بۆنەس"]} contentStyle={{ background: "#1A1A2E", border: "none", borderRadius: 8, color: "white", fontSize: 13, direction: "rtl" }} />
              <Bar dataKey="units" radius={[4, 4, 4, 4]} barSize={18}>
                {bonusByRep.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-card-header"><div className="chart-card-title">دابەشبوونی بۆنەس</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={splitData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" startAngle={90} endAngle={450}>
                {splitData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {splitData.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                  <span style={{ color: "#6C757D" }}>{s.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{s.value}٪</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bonus Detail Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header"><span className="data-table-title">وردەکاری بۆنەسی تازە</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>داواکاری</th><th>کڕیار</th><th>نوێنەر</th><th>کۆگا</th><th>بنەڕەت</th>
              <th>کۆی بۆنەس٪</th><th>بۆنەس کۆگا</th><th>بۆنەس نوێنەر</th><th>کۆی نێردراو</th>
            </tr>
          </thead>
          <tbody>
            {recentBonus.map((b, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{b.order}</td>
                <td style={{ fontSize: 13 }}>{b.client}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{b.rep}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{b.warehouse}</td>
                <td style={{ fontWeight: 600 }}>{b.baseQty}</td>
                <td><span style={{ background: "#EDF2FF", color: "#4263EB", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{b.totalPct}٪</span></td>
                <td><span style={{ color: "#4263EB", fontWeight: 600 }}>+{b.whBonus}</span> <span style={{ fontSize: 10, color: "#ADB5BD" }}>({b.whPct}٪)</span></td>
                <td><span style={{ color: "#F47B35", fontWeight: 600 }}>+{b.repBonus}</span> <span style={{ fontSize: 10, color: "#ADB5BD" }}>({b.repPct}٪)</span></td>
                <td style={{ fontWeight: 700, fontSize: 14 }}>{b.totalShipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
