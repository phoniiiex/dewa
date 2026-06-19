"use client";
import { Truck, MapPin, Phone, Clock, CheckCircle2, AlertCircle, XCircle, Package } from "lucide-react";

const deliveries = [
  { id: "DEL-001", order: "#ORD-98745", type: "warehouse_shipment", typeLabel: "گواستنەوە بۆ کۆگا", driver: "عومەر سەعید", phone: "0770 900 1111", destination: "کۆگای هیمۆ لاب — سلێمانی", status: "delivered", statusLabel: "گەیشت", items: "پاراسیتامۆل × ١٢٠", dispatchedAt: "٢٩/١٠ — ٠٩:٠٠", deliveredAt: "٢٩/١٠ — ١٤:٣٠" },
  { id: "DEL-002", order: "#ORD-98745", type: "rep_delivery", typeLabel: "گەیاندنی نوێنەر", driver: "ئاکۆ مەحموود", phone: "0770 111 2222", destination: "دەرمانخانەی ئازادی — سلێمانی", status: "delivered", statusLabel: "گەیشت", items: "پاراسیتامۆل × ٣٠ (بۆنەس)", dispatchedAt: "٢٩/١٠ — ١٠:٠٠", deliveredAt: "٢٩/١٠ — ١٢:٠٠" },
  { id: "DEL-003", order: "#ORD-23674", type: "warehouse_shipment", typeLabel: "گواستنەوە بۆ کۆگا", driver: "ڕۆژگار عەلی", phone: "0750 800 2222", destination: "کۆگای ڕۆشنبیری — هەولێر", status: "in_transit", statusLabel: "لە ڕێگایە", items: "ئەمۆکسیسیلین × ٢٣٠", dispatchedAt: "٢٨/١٠ — ١١:٠٠", deliveredAt: "—" },
  { id: "DEL-004", order: "#ORD-78967", type: "direct_delivery", typeLabel: "ڕاستەوخۆ بۆ کڕیار", driver: "کاروان حەسەن", phone: "0770 700 3333", destination: "کلینیکی هەنار — هەولێر", status: "in_transit", statusLabel: "لە ڕێگایە", items: "ئۆمیپرازۆل × ٩٤", dispatchedAt: "٢٧/١٠ — ٠٨:٣٠", deliveredAt: "—" },
  { id: "DEL-005", order: "#ORD-46578", type: "warehouse_shipment", typeLabel: "گواستنەوە بۆ کۆگا", driver: "—", phone: "—", destination: "کۆگای ناوەند — کەرکوک", status: "pending", statusLabel: "چاوەڕوان", items: "مێتفۆرمین × ٦١", dispatchedAt: "—", deliveredAt: "—" },
  { id: "DEL-006", order: "#ORD-12567", type: "direct_delivery", typeLabel: "ڕاستەوخۆ بۆ کڕیار", driver: "عومەر سەعید", phone: "0770 900 1111", destination: "دەرمانخانەی ڕۆشنا — کەرکوک", status: "failed", statusLabel: "شکست", items: "ئازیترۆمایسین × ٣٥", dispatchedAt: "٢٥/١٠ — ١٤:٠٠", deliveredAt: "—" },
];

const statusConfig: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  delivered: { bg: "#EBFBEE", color: "#40C057", icon: <CheckCircle2 size={14} /> },
  in_transit: { bg: "#E7F5FF", color: "#339AF0", icon: <Truck size={14} /> },
  pending: { bg: "#FFF9DB", color: "#FD7E14", icon: <Clock size={14} /> },
  failed: { bg: "#FFF5F5", color: "#FA5252", icon: <XCircle size={14} /> },
};

const typeConfig: Record<string, { bg: string; color: string }> = {
  warehouse_shipment: { bg: "#EDF2FF", color: "#4263EB" },
  rep_delivery: { bg: "#FEF3EB", color: "#F47B35" },
  direct_delivery: { bg: "#EBFBEE", color: "#40C057" },
};

export default function LogisticsPage() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#E7F5FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#339AF0" }}><Truck size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>گواستنەوە و گەیاندن</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>شوێنپێگرتنی هەموو گەیاندنەکان و بارودۆخیان</p>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی گەیاندنەکان", value: "٤٨٢", color: undefined },
          { title: "لە ڕێگایە", value: "٢", color: "#339AF0" },
          { title: "چاوەڕوانی شۆفێر", value: "١", color: "#FD7E14" },
          { title: "شکست", value: "١", color: "#FA5252" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header"><span className="data-table-title">گەیاندنەکان</span></div>
        <table className="data-table">
          <thead>
            <tr><th>کۆد</th><th>داواکاری</th><th>جۆر</th><th>شۆفێر</th><th>مەنزیل</th><th>بەرهەم</th><th>نێردراو</th><th>گەیشت</th><th>بارودۆخ</th></tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const sc = statusConfig[d.status];
              const tc = typeConfig[d.type];
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600, fontSize: 12, color: "#6C757D" }}>{d.id}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{d.order}</td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color }}>{d.typeLabel}</span></td>
                  <td>
                    {d.driver !== "—" ? (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.driver}</div>
                        <div style={{ fontSize: 11, color: "#ADB5BD", direction: "ltr", textAlign: "right" }}>{d.phone}</div>
                      </div>
                    ) : (
                      <span style={{ color: "#FD7E14", fontSize: 12, fontWeight: 600 }}>دیاری نەکراو</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} color="#ADB5BD" /> {d.destination}</div>
                  </td>
                  <td style={{ fontSize: 12, color: "#6C757D" }}>{d.items}</td>
                  <td style={{ fontSize: 12, color: "#6C757D" }}>{d.dispatchedAt}</td>
                  <td style={{ fontSize: 12, color: "#6C757D" }}>{d.deliveredAt}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {sc.icon} {d.statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
