"use client";
import { useState } from "react";
import { Search, Plus, Factory, MapPin, Phone, Globe, Eye, Edit3, Trash2 } from "lucide-react";
import { formatIQD } from "@/lib/currency";

const suppliers = [
  { id: "1", name: "فارما فرانسا", contact: "Jean Dupont", phone: "+33 1 4567 8901", email: "orders@pharmafrance.com", country: "فەرەنسا 🇫🇷", products: 28, balance: 45_000_000, isActive: true },
  { id: "2", name: "مەدیکۆ تورکیا", contact: "Ahmet Yilmaz", phone: "+90 212 345 6789", email: "sales@medicoturkey.com", country: "تورکیا 🇹🇷", products: 35, balance: 32_000_000, isActive: true },
  { id: "3", name: "جۆردان فارما", contact: "خالد المحمد", phone: "+962 6 123 4567", email: "info@jordanpharma.com", country: "ئوردن 🇯🇴", products: 18, balance: 15_000_000, isActive: true },
  { id: "4", name: "ئینتا فارما", contact: "Raj Patel", phone: "+91 22 4567 8901", email: "export@intapharma.in", country: "هندستان 🇮🇳", products: 42, balance: 28_000_000, isActive: true },
  { id: "5", name: "سوویسرا مەد", contact: "Hans Mueller", phone: "+41 44 567 8901", email: "info@swissmed.ch", country: "سوویسرا 🇨🇭", products: 12, balance: 0, isActive: false },
];

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = suppliers.filter((s) => s.name.includes(searchTerm) || s.country.includes(searchTerm));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EBFBEE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40C057" }}><Factory size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>دابینکەرەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی دابینکەری دەرمان و قەرزەکانیان</p>
          </div>
        </div>
        <button className="topbar-add-btn"><Plus size={16} /><span>دابینکەری نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی دابینکەران", value: "٥" },
          { title: "دابینکەری چالاک", value: "٤" },
          { title: "کۆی بەرهەمی دابینکراو", value: "١٣٥" },
          { title: "کۆی قەرزی دابینکەر", value: formatIQD(120_000_000) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان بە ناوی دابینکەر..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>دابینکەر</th><th>بەرپرس</th><th>تەلەفۆن</th><th>ئیمەیڵ</th><th>ولات</th><th>بەرهەم</th><th>قەرز (ئێمە پێیان)</th><th>بارودۆخ</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{s.contact}</td>
                <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{s.phone}</td>
                <td style={{ fontSize: 12, color: "#4263EB" }}>{s.email}</td>
                <td style={{ fontSize: 13 }}>{s.country}</td>
                <td style={{ fontWeight: 600 }}>{s.products}</td>
                <td style={{ fontWeight: 600, fontSize: 13, color: s.balance > 0 ? "#FA5252" : "#40C057" }}>{s.balance > 0 ? formatIQD(s.balance) : "—"}</td>
                <td><span className={`status-badge ${s.isActive ? "paid" : "cancelled"}`}>{s.isActive ? "چالاک" : "ناچالاک"}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={{ padding: 4, color: "#4263EB" }}><Eye size={14} /></button>
                    <button style={{ padding: 4, color: "#6C757D" }}><Edit3 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
