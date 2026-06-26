"use client";
import { useState } from "react";
import { Truck, Search, Eye, MapPin, Package, CheckCircle, Clock, User, Upload } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import { inputStyle } from "@/components/ui/FormField";

type ActiveStatus = "SENT" | "DELIVERED";

const STATUS_META: Partial<Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }>> = {
  SENT:      { label: "نێردراوە",   color: "#7C3AED", bg: "#EDE9FE", icon: <Truck size={13} /> },
  DELIVERED: { label: "گەیشتووە",  color: "#0891B2", bg: "#CFFAFE", icon: <CheckCircle size={13} /> },
};

const TABS: { key: ActiveStatus | "all"; label: string }[] = [
  { key: "all",       label: "هەموو" },
  { key: "SENT",      label: "لە ڕێگادا" },
  { key: "DELIVERED", label: "گەیشتووە" },
];

export default function LogisticsPage() {
  const { orders, drivers, updateOrder, showToast } = useData();

  const [tab, setTab] = useState<"all" | ActiveStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Only show in-flight orders
  const inFlight = orders.filter(o => o.status === "SENT" || o.status === "DELIVERED");
  const filtered = inFlight.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm) || o.driverName.includes(searchTerm);
    return matchTab && matchSearch;
  });

  const kpi = {
    sent:      inFlight.filter(o => o.status === "SENT").length,
    delivered: inFlight.filter(o => o.status === "DELIVERED").length,
    drivers:   new Set(inFlight.filter(o => o.driverId).map(o => o.driverId)).size,
    value:     inFlight.filter(o => o.status === "SENT").reduce((s, o) => s + o.totalAmount, 0),
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #F1F3F5", boxShadow: "0 1px 4px rgba(0,0,0,.05)" };

  const confirmDelivered = async () => {
    if (!detailOrder) return;
    setUploading(true);
    let invoiceUrl = "";
    if (invoiceFile) {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.storage
        .from("order-docs")
        .upload(`invoices/${detailOrder.id}_${Date.now()}`, invoiceFile, { upsert: true });
      if (error) { showToast("هەڵە لە بارکردن: " + error.message, "error"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("order-docs").getPublicUrl(data.path);
      invoiceUrl = urlData.publicUrl;
    }
    await updateOrder(detailOrder.id, {
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      signedInvoiceUrl: invoiceUrl,
    });
    showToast("گەیشتووە — تۆمارکرا ✓");
    setUploading(false);
    setDetailOrder(null);
    setInvoiceFile(null);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#EDE9FE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C3AED" }}><Truck size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>لۆجستیک</h1><p style={{ fontSize: 13, color: "#6C757D" }}>شوفێرەکان و داواکارییەکانی لە ڕێگادا</p></div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "لە ڕێگادا",   value: kpi.sent,              color: "#7C3AED", bg: "#EDE9FE" },
          { label: "گەیشتووە",   value: kpi.delivered,          color: "#0891B2", bg: "#CFFAFE" },
          { label: "شوفێری چالاک", value: kpi.drivers,           color: "#059669", bg: "#D1FAE5" },
          { label: "نرخی لە ڕێگادا", value: formatIQD(kpi.value), color: "#D97706", bg: "#FEF3C7" },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ ...card, marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 0, background: "#F1F3F5", borderRadius: 10, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? "#7C3AED" : "#6C757D", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="گەڕان بە کڕیار، ژمارە، یان شوفێر..."
            style={{ ...inputStyle, paddingLeft: 38, width: "100%", boxSizing: "border-box" as const }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F3F5", background: "#FAFAFA" }}>
                {["ژمارە", "کڕیار", "شوفێر", "تەلەفۆن", "بارودۆخ", "نرخ", "کردار"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#495057", fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#ADB5BD" }}>هیچ داواکارییەک نەدۆزرایەوە</td></tr>
              ) : filtered.map(o => {
                const meta = STATUS_META[o.status as ActiveStatus];
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid #F8F9FA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#4263EB" }}>{o.orderNumber}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{o.clientName}</div>
                      <div style={{ fontSize: 12, color: "#ADB5BD" }}>{new Date(o.createdAt).toLocaleDateString("ku")}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 28, height: 28, background: "#EDE9FE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C3AED", flexShrink: 0 }}><User size={13} /></div>
                        <span style={{ fontWeight: 600 }}>{o.driverName || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#6C757D" }}>{o.driverPhone || "—"}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {meta && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: meta.bg, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>{formatIQD(o.totalAmount)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => { setDetailOrder(o); setInvoiceFile(null); }}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Eye size={13} /> بینین
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drivers panel */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>شوفێرەکانی چالاک</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {drivers.filter(d => d.isActive).map(d => {
            const activeCount = inFlight.filter(o => o.status === "SENT" && o.driverId === d.id).length;
            return (
              <div key={d.id} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeCount > 0 ? "#EDE9FE" : "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", color: activeCount > 0 ? "#7C3AED" : "#ADB5BD", flexShrink: 0 }}>
                  <User size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#6C757D" }}>{d.phone}</div>
                  <div style={{ fontSize: 12, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><MapPin size={10} /> {d.city}</div>
                  {activeCount > 0 && (
                    <span style={{ display: "inline-block", marginTop: 6, padding: "2px 8px", background: "#EDE9FE", color: "#7C3AED", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{activeCount} داواکاری</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {detailOrder && (
        <Modal open={true} onClose={() => setDetailOrder(null)} title={`${detailOrder.orderNumber} — وردەکاری`} width={580}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "کڕیار",     value: detailOrder.clientName },
                { label: "نوێنەر",    value: detailOrder.repName },
                { label: "شوفێر",     value: detailOrder.driverName || "—" },
                { label: "تەلەفۆن",   value: detailOrder.driverPhone || "—" },
                { label: "نرخ",       value: formatIQD(detailOrder.totalAmount) },
                { label: "بارودۆخ",   value: STATUS_META[detailOrder.status as ActiveStatus]?.label || detailOrder.status },
              ].map(f => (
                <div key={f.label} style={{ padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, border: "1px solid #F1F3F5" }}>
                  <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Items */}
            <div style={{ border: "1px solid #F1F3F5", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAFAFA" }}>
                  {["بەرهەم", "ژمارە", "بۆنەس", "نرخ"].map(h => <th key={h} style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#495057" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {detailOrder.items.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid #F8F9FA" }}>
                      <td style={{ padding: "9px 14px" }}>{item.productName}</td>
                      <td style={{ padding: "9px 14px" }}>{item.quantity}</td>
                      <td style={{ padding: "9px 14px", color: "#059669", fontWeight: 600 }}>{item.bonusQty > 0 ? `+${item.bonusQty}` : "—"}</td>
                      <td style={{ padding: "9px 14px" }}>{formatIQD(item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signed invoice link if already delivered */}
            {detailOrder.signedInvoiceUrl && (
              <a href={detailOrder.signedInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4263EB", fontSize: 13, fontWeight: 600 }}>📄 پسوولەی واژووکراو</a>
            )}

            {/* Mark as delivered (only if status = SENT) */}
            {detailOrder.status === "SENT" && (
              <div style={{ paddingTop: 10, borderTop: "1px solid #F1F3F5" }}>
                <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 10 }}>پسوولەی واژووکراو بارکە تا گەیشتووە تۆمار بکرێت.</p>
                <div style={{ border: "2px dashed #DEE2E6", borderRadius: 10, padding: 18, textAlign: "center", cursor: "pointer", marginBottom: 12 }}
                  onClick={() => document.getElementById("log-inv-file")?.click()}>
                  <Upload size={22} style={{ color: "#ADB5BD", marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 12, color: "#6C757D" }}>{invoiceFile ? invoiceFile.name : "هەڵبژاردنی فایل (ئەگەر هەبوو)"}</div>
                  <input id="log-inv-file" type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={confirmDelivered} disabled={uploading}
                  style={{ width: "100%", padding: "11px 0", background: "#0891B2", color: "#fff", border: "none", borderRadius: 10, cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? "بارکردن..." : "✓ گەیشتووە — تۆمارکردن"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
