"use client";
import { useState } from "react";
import { Search, Plus, Building2, MapPin, Phone, Edit3, Eye, Percent } from "lucide-react";

const warehouses = [
  { id: "1", name: "کۆگای هیمۆ لاب", city: "سلێمانی", address: "شەقامی سالم، نزیک میدیای شار", contact: "هاوڕێ محەمەد", phone: "0770 100 2000", bonusPct: 20, orders: 120, isActive: true },
  { id: "2", name: "کۆگای ڕۆشنبیری", city: "هەولێر", address: "شەقامی ٦٠ مەتری، لای پشتی مۆڵ", contact: "عەلی جەعفەر", phone: "0750 200 3000", bonusPct: 15, orders: 95, isActive: true },
  { id: "3", name: "کۆگای سەلامەتی", city: "دهۆک", address: "شەقامی بارزان", contact: "ئازاد ئەحمەد", phone: "0770 300 4000", bonusPct: 18, orders: 72, isActive: true },
  { id: "4", name: "کۆگای دەرمانی ناوەند", city: "کەرکوک", address: "شەقامی ئەتار", contact: "سەرکەوت عومەر", phone: "0750 400 5000", bonusPct: 22, orders: 58, isActive: true },
  { id: "5", name: "کۆگای هەڵەبجە فارما", city: "هەڵەبجە", address: "شەقامی شەهید", contact: "بەختیار حەسەن", phone: "0770 500 6000", bonusPct: 25, orders: 35, isActive: false },
];

export default function WarehousesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = warehouses.filter((w) => w.name.includes(searchTerm) || w.city.includes(searchTerm));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FEF3EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#F47B35" }}><Building2 size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>کۆگاکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>هاوبەشییە دەرەکییەکان و ڕێژەی بۆنەسی بنەڕەتی</p>
          </div>
        </div>
        <button className="topbar-add-btn"><Plus size={16} /><span>کۆگای نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کۆگاکان", value: "٥" },
          { title: "کۆگای چالاک", value: "٤" },
          { title: "ناوەندی بۆنەس", value: "٢٠٪" },
          { title: "داواکاری ئەم مانگە", value: "٣٨٠" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان بە ناوی کۆگا..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {filtered.map((wh, i) => (
          <div key={wh.id} className="kpi-card" style={{ animationDelay: `${i * 0.05}s`, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF3EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#F47B35" }}><Building2 size={22} /></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{wh.name}</div>
                    <div style={{ fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {wh.city}</div>
                  </div>
                </div>
                <span className={`status-badge ${wh.isActive ? "paid" : "cancelled"}`}>{wh.isActive ? "چالاک" : "ناچالاک"}</span>
              </div>

              <div style={{ fontSize: 12, color: "#6C757D", marginBottom: 8 }}>{wh.address}</div>
              <div style={{ fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>بەرپرس:</span> {wh.contact}
              </div>
              <div style={{ fontSize: 12, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} /> <span style={{ direction: "ltr" }}>{wh.phone}</span>
              </div>

              {/* Bonus % bar */}
              <div style={{ marginTop: 16, padding: 16, background: "#F8F9FA", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 4 }}><Percent size={12} /> ڕێژەی بۆنەسی بنەڕەتی</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: "#F47B35" }}>{wh.bonusPct}٪</span>
                </div>
                <div style={{ width: "100%", height: 8, background: "#E9ECEF", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${wh.bonusPct * 2}%`, height: "100%", background: "linear-gradient(90deg, #F47B35, #FF9A5C)", borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", borderTop: "1px solid #E9ECEF" }}>
              <div style={{ flex: 1, padding: "12px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#ADB5BD" }}>داواکاری</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{wh.orders}</div>
              </div>
              <div style={{ flex: 1, padding: "12px 20px", textAlign: "center", borderRight: "1px solid #E9ECEF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button style={{ padding: "6px 16px", background: "#4263EB", color: "white", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>وردەکاری</button>
                <button style={{ padding: "6px 16px", border: "1px solid #DEE2E6", borderRadius: 6, fontSize: 12, color: "#6C757D", cursor: "pointer", background: "white", fontFamily: "inherit" }}>دەستکاری</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
