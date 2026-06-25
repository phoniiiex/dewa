"use client";
import { Gift, Warehouse as WarehouseIcon, UserCheck, Package, Tag } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";

export default function BonusPage() {
  const { orders, warehouses, reps } = useData();

  const bonusOrders = orders.filter(o => o.items.some(i => i.bonusQty > 0));

  // Per-warehouse breakdown with per-product analysis
  const warehouseStats = warehouses.map(w => {
    const wo = orders.filter(o => o.warehouseId === w.id);
    const totalBonusUnits = wo.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
    const totalBonusValue = wo.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);
    return { ...w, orders: wo.length, totalBonusUnits, totalBonusValue };
  });

  // Per-rep breakdown
  const repStats = reps.map(r => {
    const ro = orders.filter(o => o.repId === r.id);
    const totalBonusUnits = ro.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
    const totalBonusValue = ro.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);
    return { ...r, orders: ro.length, totalBonusUnits, totalBonusValue };
  });

  // Flat list of all bonus items across all orders for the detail table
  const allBonusRows = bonusOrders.flatMap(o =>
    o.items
      .filter(i => i.bonusQty > 0)
      .map(i => ({
        orderNumber: o.orderNumber,
        clientName: o.clientName,
        repName: o.repName,
        warehouseName: o.warehouseName,
        productName: i.productName,
        quantity: i.quantity,
        bonusPct: i.bonusPct ?? o.warehouseBonusPct,
        bonusQty: i.bonusQty,
        unitPrice: i.unitPrice,
      }))
  );

  const totalBonusUnits = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
  const totalBonusValue = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #7C5CFC, #4263EB)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><Gift size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>سیستەمی بۆنەس</h1><p style={{ fontSize: 13, color: "#6C757D" }}>شیکاری بۆنەسی کۆگاکان — بە دانە و ڕێژە</p></div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "داواکاری بە بۆنەس", value: String(bonusOrders.length) },
          { title: "کۆی دانەی بۆنەس", value: String(totalBonusUnits) + " دانە", color: "#7C5CFC" },
          { title: "نرخی بۆنەسی کۆ", value: formatIQD(totalBonusValue), color: "#4263EB" },
          { title: "ڕیزی بۆنەس", value: String(allBonusRows.length) + " ڕیز" },
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
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>هەر کۆگایەک ڕێژەیەکی بنەڕەت هەیە (بۆ نموونە: ٢٠٪) بۆ هەموو بەرهەمەکان</p>
          </div>
          <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#7C5CFC", display: "flex", alignItems: "center", gap: 4 }}><Tag size={12} /> ٢. یاسای تایبەت بە بەرهەم</div>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>هەر بەرهەمێک دەتوانێت ڕێژەی بۆنەسی تایبەتی خۆی هەبێت (بۆ نموونە: پاراسیتامۆڵ ٣٠٪)</p>
          </div>
          <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#40C057" }}>٣. دانەی بۆنەس</div>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>بڕ × ڕێژەی بۆنەس = دانەی بۆنەسی دەنێردرێت (بۆ نموونە: ١٠ لاکتێنس × ٢٠٪ = ٢ دانە بۆنەس)</p>
          </div>
        </div>
      </div>

      {/* Warehouse Bonus Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><WarehouseIcon size={18} color="#7C5CFC" /> بۆنەسی کۆگاکان</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>کۆگا</th><th>شار</th><th>ڕێژەی بنەڕەت</th><th>یاسای تایبەت</th><th>داواکاری</th><th>کۆی دانەی بۆنەس</th><th>نرخی بۆنەسی کۆ</th></tr></thead>
            <tbody>
              {warehouseStats.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td style={{ color: "#6C757D" }}>{w.city}</td>
                  <td><span style={{ padding: "4px 12px", borderRadius: 8, background: "linear-gradient(135deg, #7C5CFC, #4263EB)", color: "white", fontWeight: 700, fontSize: 14 }}>{w.bonusPct}٪</span></td>
                  <td>
                    {(w.bonusRules || []).length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {w.bonusRules.map((r, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#F3F0FF", color: "#7C5CFC", fontWeight: 700, border: "1px solid #E9D7FF" }}>
                            {r.productName}: {r.percent}٪
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ color: "#ADB5BD", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{w.orders}</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{w.totalBonusUnits} دانە</td>
                  <td style={{ fontWeight: 700, color: "#7C5CFC" }}>{formatIQD(w.totalBonusValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rep Bonus Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><UserCheck size={18} color="#40C057" /> بۆنەسی نوێنەران</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>نوێنەر</th><th>شار</th><th>داواکاری</th><th>کۆی دانەی بۆنەس</th><th>نرخی بۆنەسی کۆ</th></tr></thead>
            <tbody>
              {repStats.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "#6C757D" }}>{r.city}</td>
                  <td style={{ fontWeight: 600 }}>{r.orders}</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{r.totalBonusUnits} دانە</td>
                  <td style={{ fontWeight: 700, color: "#40C057" }}>{formatIQD(r.totalBonusValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-product bonus detail — the key new section */}
      <div style={{ marginTop: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={18} color="#F47B35" /> شیکاری بۆنەس بەرهەم بەرهەم
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6C757D" }}>— چەند دانە دەنێردرێت هەر داواکارییەک</span>
        </h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ژمارەی داواکاری</th>
                <th>کڕیار</th>
                <th>نوێنەر</th>
                <th>کۆگا</th>
                <th>بەرهەم</th>
                <th>بڕی داواکراو</th>
                <th>ڕێژەی بۆنەس</th>
                <th>دانەی بۆنەس دەنێردرێت</th>
              </tr>
            </thead>
            <tbody>
              {allBonusRows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#ADB5BD", padding: 24 }}>هیچ بۆنەسێک تۆمار نەکراوە</td></tr>
              ) : allBonusRows.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.orderNumber}</td>
                  <td style={{ fontSize: 13 }}>{row.clientName}</td>
                  <td style={{ fontSize: 13, color: "#6C757D" }}>{row.repName}</td>
                  <td style={{ fontSize: 13, color: "#6C757D" }}>{row.warehouseName || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{row.productName}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{row.quantity}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 6, background: "linear-gradient(135deg, #7C5CFC, #4263EB)", color: "white", fontWeight: 700, fontSize: 13 }}>
                      {row.bonusPct}٪
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "4px 14px", borderRadius: 8, background: "#EBFBEE", color: "#2B8A3E", fontWeight: 800, fontSize: 16 }}>
                      +{row.bonusQty}
                    </span>
                    <span style={{ fontSize: 11, color: "#6C757D", marginRight: 4 }}>دانە</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
