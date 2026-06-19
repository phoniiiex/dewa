"use client";
import { useState } from "react";
import { Search, Plus, Users, Phone, MapPin, MoreHorizontal, Edit3, Eye, Building2, Stethoscope, ShoppingBag } from "lucide-react";
import { formatIQD } from "@/lib/currency";

const clients = [
  { id: "1", name: "دەرمانخانەی ئازادی", owner: "ئاراس عەبدوڵا", phone: "0770 123 4567", city: "سلێمانی", type: "دەرمانخانە", typeBadge: "pharmacy", orders: 45, balance: 2_500_000, rep: "ئاکۆ", paymentTerms: "net_30", isActive: true },
  { id: "2", name: "نەخۆشخانەی سلێمانی", owner: "د. کارزان محەمەد", phone: "0750 234 5678", city: "سلێمانی", type: "نەخۆشخانە", typeBadge: "hospital", orders: 38, balance: 8_200_000, rep: "هێمن", paymentTerms: "net_30", isActive: true },
  { id: "3", name: "کلینیکی هەنار", owner: "د. ڕۆژان عومەر", phone: "0770 345 6789", city: "هەولێر", type: "کلینیک", typeBadge: "clinic", orders: 32, balance: 1_200_000, rep: "شادی", paymentTerms: "immediate", isActive: true },
  { id: "4", name: "دەرمانخانەی ڕۆژ", owner: "سەرهەنگ عەلی", phone: "0750 456 7890", city: "دهۆک", type: "دەرمانخانە", typeBadge: "pharmacy", orders: 28, balance: 0, rep: "دانا", paymentTerms: "immediate", isActive: true },
  { id: "5", name: "دەرمانخانەی ڕۆشنا", owner: "نازدار حەسەن", phone: "0770 567 8901", city: "کەرکوک", type: "دەرمانخانە", typeBadge: "pharmacy", orders: 25, balance: 3_400_000, rep: "ڕێبوار", paymentTerms: "net_15", isActive: true },
  { id: "6", name: "نەخۆشخانەی هەولێر", owner: "د. ئاسۆ کەریم", phone: "0750 678 9012", city: "هەولێر", type: "نەخۆشخانە", typeBadge: "hospital", orders: 22, balance: 5_600_000, rep: "ئاکۆ", paymentTerms: "net_30", isActive: true },
  { id: "7", name: "دەرمانخانەی گوڵ", owner: "گوڵاڵە عومەر", phone: "0770 789 0123", city: "هەڵەبجە", type: "دەرمانخانە", typeBadge: "pharmacy", orders: 18, balance: 800_000, rep: "هێمن", paymentTerms: "immediate", isActive: true },
  { id: "8", name: "کلینیکی سۆران", owner: "د. شەهلا ئەحمەد", phone: "0750 890 1234", city: "سلێمانی", type: "کلینیک", typeBadge: "clinic", orders: 15, balance: 0, rep: "شادی", paymentTerms: "immediate", isActive: false },
];

const typeColors: Record<string, { bg: string; color: string }> = {
  pharmacy: { bg: "#EDF2FF", color: "#4263EB" },
  hospital: { bg: "#FEF3EB", color: "#F47B35" },
  clinic: { bg: "#EBFBEE", color: "#40C057" },
};

const typeIcons: Record<string, React.ReactNode> = {
  pharmacy: <ShoppingBag size={14} />,
  hospital: <Building2 size={14} />,
  clinic: <Stethoscope size={14} />,
};

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("هەموو");
  const cities = ["هەموو", "سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.includes(searchTerm) || c.owner.includes(searchTerm);
    const matchCity = cityFilter === "هەموو" || c.city === cityFilter;
    return matchSearch && matchCity;
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Users size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>کڕیارەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی دەرمانخانە، نەخۆشخانە، و کلینیکەکان</p>
          </div>
        </div>
        <button className="topbar-add-btn"><Plus size={16} /><span>کڕیاری نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کڕیارەکان", value: "١٨٦" },
          { title: "کڕیاری چالاک", value: "١٧٨" },
          { title: "قەرزی کۆ", value: formatIQD(21_700_000) },
          { title: "داواکاری ئەم مانگە", value: "٤٨٦" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان بە ناوی کڕیار یان خاوەن..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {cities.map((c) => (
            <button key={c} onClick={() => setCityFilter(c)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: cityFilter === c ? "white" : "transparent", color: cityFilter === c ? "#1A1A2E" : "#6C757D", boxShadow: cityFilter === c ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>کڕیار</th><th>خاوەن</th><th>تەلەفۆن</th><th>شار</th><th>جۆر</th><th>نوێنەر</th><th>داواکاری</th><th>قەرز</th><th>بارودۆخ</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{c.owner}</td>
                <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{c.phone}</td>
                <td><span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><MapPin size={12} color="#ADB5BD" />{c.city}</span></td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[c.typeBadge].bg, color: typeColors[c.typeBadge].color }}>
                    {typeIcons[c.typeBadge]} {c.type}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{c.rep}</td>
                <td style={{ fontWeight: 600 }}>{c.orders}</td>
                <td style={{ fontWeight: 600, fontSize: 13, color: c.balance > 0 ? "#FA5252" : "#40C057" }}>{c.balance > 0 ? formatIQD(c.balance) : "—"}</td>
                <td><span className={`status-badge ${c.isActive ? "paid" : "cancelled"}`}>{c.isActive ? "چالاک" : "ناچالاک"}</span></td>
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
        <div className="pagination">
          <span className="pagination-info">نیشاندانی {filtered.length} لە {clients.length} کڕیار</span>
          <div className="pagination-buttons"><button className="pagination-btn active">١</button><button className="pagination-btn">٢</button></div>
        </div>
      </div>
    </>
  );
}
