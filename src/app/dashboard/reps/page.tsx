"use client";
import { useState } from "react";
import { Search, Plus, UserCog, MapPin, Phone, Eye, Edit3, ShoppingCart, Gift } from "lucide-react";
import { formatIQD } from "@/lib/currency";

const reps = [
  { id: "1", name: "ئاکۆ مەحموود", phone: "0770 111 2222", city: "سلێمانی", clients: 28, orders: 85, bonus: 4200, revenue: 12_000_000, isActive: true },
  { id: "2", name: "هێمن ئەحمەد", phone: "0750 222 3333", city: "سلێمانی", clients: 22, orders: 72, bonus: 3100, revenue: 9_800_000, isActive: true },
  { id: "3", name: "شادی عومەر", phone: "0770 333 4444", city: "هەولێر", clients: 18, orders: 68, bonus: 2800, revenue: 8_200_000, isActive: true },
  { id: "4", name: "دانا ڕەسوول", phone: "0750 444 5555", city: "دهۆک", clients: 15, orders: 55, bonus: 2200, revenue: 7_100_000, isActive: true },
  { id: "5", name: "ڕێبوار کەریم", phone: "0770 555 6666", city: "کەرکوک", clients: 12, orders: 48, bonus: 1800, revenue: 5_400_000, isActive: true },
  { id: "6", name: "سەردار حەسەن", phone: "0750 666 7777", city: "هەڵەبجە", clients: 10, orders: 35, bonus: 1400, revenue: 3_800_000, isActive: true },
  { id: "7", name: "ئازاد عەلی", phone: "0770 777 8888", city: "سلێمانی", clients: 8, orders: 25, bonus: 900, revenue: 2_100_000, isActive: false },
];

export default function RepsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = reps.filter((r) => r.name.includes(searchTerm) || r.city.includes(searchTerm));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><UserCog size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>نوێنەری پزیشکی</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی نوێنەرانی پزیشکی و ئەدایان</p>
          </div>
        </div>
        <button className="topbar-add-btn"><Plus size={16} /><span>نوێنەری نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی نوێنەران", value: "١٢" },
          { title: "نوێنەری چالاک", value: "١١" },
          { title: "کۆی بۆنەسی دابەشکراو", value: "١٦,٤٠٠ یەکە" },
          { title: "کۆی داهات", value: formatIQD(48_400_000) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان بە ناوی نوێنەر..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {filtered.map((rep, i) => (
          <div key={rep.id} className="kpi-card" style={{ animationDelay: `${i * 0.05}s`, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `hsl(${i * 50 + 220}, 60%, 55%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16 }}>{rep.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{rep.name}</div>
                    <div style={{ fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {rep.city}</div>
                  </div>
                </div>
                <span className={`status-badge ${rep.isActive ? "paid" : "cancelled"}`}>{rep.isActive ? "چالاک" : "ناچالاک"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}><Phone size={11} /> <span style={{ direction: "ltr" }}>{rep.phone}</span></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, marginTop: 16, borderTop: "1px solid #E9ECEF", textAlign: "center" }}>
              {[
                { label: "کڕیار", value: rep.clients, icon: <UserCog size={12} color="#4263EB" /> },
                { label: "داواکاری", value: rep.orders, icon: <ShoppingCart size={12} color="#F47B35" /> },
                { label: "بۆنەس", value: `${rep.bonus.toLocaleString()}`, icon: <Gift size={12} color="#40C057" /> },
                { label: "داهات", value: `${(rep.revenue / 1_000_000).toFixed(1)}M`, icon: null },
              ].map((s, j) => (
                <div key={j} style={{ padding: "12px 0", borderLeft: j > 0 ? "1px solid #E9ECEF" : "none" }}>
                  <div style={{ fontSize: 10, color: "#ADB5BD", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>{s.icon} {s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
