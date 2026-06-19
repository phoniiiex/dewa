"use client";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Receipt, CreditCard, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { formatIQD } from "@/lib/currency";

const revenueData = [
  { name: "کانونی دووەم", income: 28_000_000, expense: 22_000_000 },
  { name: "شوبات", income: 35_000_000, expense: 25_000_000 },
  { name: "ئازار", income: 42_000_000, expense: 30_000_000 },
  { name: "نیسان", income: 38_000_000, expense: 28_000_000 },
  { name: "ئایار", income: 48_000_000, expense: 32_000_000 },
  { name: "حوزەیران", income: 52_000_000, expense: 35_000_000 },
];

const expenseBreakdown = [
  { name: "کڕینی دەرمان", value: 25_000_000, color: "#4263EB" },
  { name: "مووچە و کرێ", value: 8_000_000, color: "#F47B35" },
  { name: "گواستنەوە", value: 3_500_000, color: "#40C057" },
  { name: "کرێی کۆگا", value: 2_000_000, color: "#7C5CFC" },
  { name: "هتد", value: 1_500_000, color: "#339AF0" },
];

const transactions = [
  { id: "TRX-001", date: "٢٩/١٠/٢٠٢٥", type: "income", typeLabel: "داهات", description: "پارەدانی دەرمانخانەی ئازادی", amount: 2_500_000, method: "کاش" },
  { id: "TRX-002", date: "٢٩/١٠/٢٠٢٥", type: "expense", typeLabel: "خەرجی", description: "کڕینی دەرمان لە فارما فرانسا", amount: 8_000_000, method: "حاوالە" },
  { id: "TRX-003", date: "٢٨/١٠/٢٠٢٥", type: "income", typeLabel: "داهات", description: "پارەدانی نەخۆشخانەی سلێمانی", amount: 5_200_000, method: "حاوالە" },
  { id: "TRX-004", date: "٢٨/١٠/٢٠٢٥", type: "expense", typeLabel: "خەرجی", description: "مووچەی نوێنەران", amount: 3_200_000, method: "کاش" },
  { id: "TRX-005", date: "٢٧/١٠/٢٠٢٥", type: "income", typeLabel: "داهات", description: "پارەدانی کلینیکی هەنار", amount: 1_200_000, method: "کاش" },
  { id: "TRX-006", date: "٢٧/١٠/٢٠٢٥", type: "expense", typeLabel: "خەرجی", description: "کرێی گواستنەوە", amount: 800_000, method: "کاش" },
  { id: "TRX-007", date: "٢٦/١٠/٢٠٢٥", type: "income", typeLabel: "داهات", description: "پارەدانی دەرمانخانەی ڕۆژ", amount: 850_000, method: "حاوالە" },
];

export default function FinancePage() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FFF9DB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#FD7E14" }}><Wallet size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>دارایی</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>داهات، خەرجی، قەرز، و مامەڵەکان</p>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داهات (ئەم مانگە)", value: formatIQD(52_000_000), trend: 12.3, up: true },
          { title: "کۆی خەرجی (ئەم مانگە)", value: formatIQD(35_000_000), trend: 8.5, up: true },
          { title: "قازانج", value: formatIQD(17_000_000), trend: 18.2, up: true },
          { title: "قەرزی نەوەسێندراو", value: formatIQD(21_700_000), trend: -5.0, up: false },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.3rem" }}>
              {k.value}
              <span className={`kpi-badge ${k.up ? "up" : "down"}`} style={{ marginRight: 8 }}>
                {k.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {k.trend > 0 ? "+" : ""}{k.trend}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-card span-2">
          <div className="chart-card-header"><div className="chart-card-title">داهات و خەرجی</div></div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#40C057" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#40C057" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FA5252" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FA5252" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} orientation="left" />
              <Tooltip formatter={(value: any) => [formatIQD(Number(value))]} contentStyle={{ background: "#1A1A2E", border: "none", borderRadius: 8, color: "white", fontSize: 13, direction: "rtl" }} />
              <Area type="monotone" dataKey="income" name="داهات" stroke="#40C057" strokeWidth={2} fill="url(#incomeGrad)" dot={{ r: 3 }} />
              <Area type="monotone" dataKey="expense" name="خەرجی" stroke="#FA5252" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-card-header"><div className="chart-card-title">دابەشبوونی خەرجی</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expenseBreakdown} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6C757D", fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#1A1A2E", fontSize: 11 }} width={100} orientation="right" />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={14}>
                {expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header"><span className="data-table-title">مامەڵەکانی تازە</span></div>
        <table className="data-table">
          <thead>
            <tr><th>کۆد</th><th>بەروار</th><th>جۆر</th><th>وەسف</th><th>شێوازی پارەدان</th><th>بڕ</th></tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, fontSize: 12, color: "#6C757D" }}>{t.id}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{t.date}</td>
                <td>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: t.type === "income" ? "#EBFBEE" : "#FFF5F5",
                    color: t.type === "income" ? "#40C057" : "#FA5252",
                  }}>
                    {t.type === "income" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {t.typeLabel}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{t.description}</td>
                <td style={{ fontSize: 12, color: "#6C757D" }}>{t.method}</td>
                <td style={{ fontWeight: 700, fontSize: 14, color: t.type === "income" ? "#40C057" : "#FA5252" }}>
                  {t.type === "income" ? "+" : "-"}{formatIQD(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
