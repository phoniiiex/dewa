"use client";
import { Gift, Warehouse, UserCheck, ShoppingCart } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";

export default function BonusPage() {
  const { orders, warehouses, reps } = useData();
  const warehouseOrders = orders.filter(o => o.routingMode === "WAREHOUSE");

  // Per-warehouse breakdown
  const warehouseStats = warehouses.map(w => {
    const wo = orders.filter(o => o.warehouseId === w.id);
    const totalBonus = wo.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);
    return { ...w, orders: wo.length, totalBonus };
  });

  // Per-rep breakdown
  const repStats = reps.map(r => {
    const ro = orders.filter(o => o.repId === r.id);
    const totalRepBonus = ro.reduce((s, o) => {
      const repBonusFraction = o.repBonusPct / 100;
      return s + o.items.reduce((a, i) => a + Math.round(i.quantity * repBonusFraction) * i.unitPrice, 0);
    }, 0);
    return { ...r, orders: ro.length, totalRepBonus };
  });

  const totalBonusValue = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #7C5CFC, #4263EB)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><Gift size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>سیستەمی بۆنەس</h1><p style={{ fontSize: 13, color: "#6C757D" }}>شیکاری بۆنەسی کۆگاکان و نوێنەران</p></div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داواکاری بە بۆنەس", value: String(orders.filter(o => o.totalBonusPct > 0).length) },
          { title: "لە ڕێگای کۆگا", value: String(warehouseOrders.length) },
          { title: "نرخی بۆنەسی کۆ", value: formatIQD(totalBonusValue), color: "#7C5CFC" },
          { title: "ڕێژەی بۆنەسی تێکڕا", value: orders.length > 0 ? `${Math.round(orders.reduce((s, o) => s + o.totalBonusPct, 0) / orders.length)}٪` : "٠٪" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div></div>
        ))}
      </div>

      {/* How Bonus Works */}
      <div style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2B55)", color: "white", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>چۆنیەتی کارکردنی سیستەمی بۆنەس</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#F47B35" }}>١. بۆنەسی بنەڕەتی کۆگا</div>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>بەڕێوەبەر ڕێژەیەکی دیاریکراو بۆ هەر کۆگایەک دادەنێت (بۆ نموونە: ٢٠٪)</p>
          </div>
          <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#4263EB" }}>٢. بۆنەسی نوێنەر</div>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>نوێنەر ڕێژەی بۆنەسی کۆ دادەنێت (بۆ نموونە: ٥٠٪) بۆ داواکارییەکە</p>
          </div>
          <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#40C057" }}>٣. شیکاری ئۆتۆماتیکی</div>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>سیستەم بۆنەسی کۆگا لە کۆی بۆنەس دەسڕێتەوە (٥٠٪ - ٢٠٪ = ٣٠٪ بۆ نوێنەر)</p>
          </div>
        </div>
      </div>

      {/* Warehouse Bonus Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Warehouse size={18} color="#7C5CFC" /> بۆنەسی کۆگاکان</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>کۆگا</th><th>شار</th><th>ڕێژەی بنەڕەت</th><th>داواکاری</th><th>نرخی بۆنەسی کۆ</th></tr></thead>
            <tbody>
              {warehouseStats.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td style={{ color: "#6C757D" }}>{w.city}</td>
                  <td><span style={{ padding: "4px 12px", borderRadius: 8, background: "linear-gradient(135deg, #7C5CFC, #4263EB)", color: "white", fontWeight: 700, fontSize: 14 }}>{w.bonusPct}٪</span></td>
                  <td style={{ fontWeight: 600 }}>{w.orders}</td>
                  <td style={{ fontWeight: 700, color: "#7C5CFC" }}>{formatIQD(w.totalBonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rep Bonus Table */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><UserCheck size={18} color="#40C057" /> بۆنەسی نوێنەران</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>نوێنەر</th><th>شار</th><th>داواکاری</th><th>بۆنەسی نوێنەر</th></tr></thead>
            <tbody>
              {repStats.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "#6C757D" }}>{r.city}</td>
                  <td style={{ fontWeight: 600 }}>{r.orders}</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{formatIQD(r.totalRepBonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Orders Bonus Detail */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><ShoppingCart size={18} color="#F47B35" /> وردەکاری بۆنەسی داواکارییەکان</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>ژمارە</th><th>کڕیار</th><th>نوێنەر</th><th>کۆگا</th><th>بۆنەسی کۆ</th><th>بۆنەسی کۆگا</th><th>بۆنەسی نوێنەر</th><th>بۆنەس نۆتەیشن</th></tr></thead>
            <tbody>
              {orders.filter(o => o.totalBonusPct > 0).map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{o.orderNumber}</td>
                  <td style={{ fontSize: 13 }}>{o.clientName}</td>
                  <td style={{ fontSize: 13, color: "#6C757D" }}>{o.repName}</td>
                  <td style={{ fontSize: 13, color: "#6C757D" }}>{o.warehouseName || "—"}</td>
                  <td style={{ fontWeight: 700, color: "#4263EB" }}>{o.totalBonusPct}٪</td>
                  <td style={{ fontWeight: 700, color: "#F47B35" }}>{o.warehouseBonusPct}٪</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{o.repBonusPct}٪</td>
                  <td style={{ fontWeight: 600, color: "#7C5CFC" }}>{o.bonusNotation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
