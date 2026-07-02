"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ── Currency formatter ───────────────────────────────────────
function formatIQD(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " د.ع";
}

// ── Status labels (Kurdish Sorani) ───────────────────────────
const STATUS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  WAITING:      { label: "چاوەڕوان",    emoji: "⏳", color: "#E67700", bg: "#FFF3BF" },
  IN_PROGRESS:  { label: "لە پڕۆسەدا", emoji: "🔄", color: "#7C5CFC", bg: "#F3F0FF" },
  READY:        { label: "ئامادەیە",    emoji: "✅", color: "#1098AD", bg: "#C3FAE8" },
  SENT:         { label: "نێردرا",      emoji: "🚚", color: "#4263EB", bg: "#EDF2FF" },
  DELIVERED:    { label: "گەیشت",       emoji: "📦", color: "#F47B35", bg: "#FFF3BF" },
};

interface OrderItem { productName: string; quantity: number; bonusQty?: number; unitPrice: number }
interface OrderData { orderNumber: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }
interface ApiData {
  client: { name: string; type: string; phone: string; city: string; balance: number };
  orders: OrderData[];
  totalDebt: number;
  settings: { name: string; nameEn: string; phone: string } | null;
}

export default function DebtPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/debt/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F1A" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite", color: "white", fontWeight: 900, fontSize: 24 }}>د</div>
        <div style={{ color: "#6C757D", fontSize: 14 }}>چاوەڕوان بکە...</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F1A", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(255,99,99,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FF6B6B", fontSize: 36 }}>⚠</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8 }}>زانیاری نەدۆزرایەوە</h1>
        <p style={{ color: "#6C757D", fontSize: 14 }}>تکایە QR کۆدەکەی پسوولەکە سکان بکەرەوە</p>
      </div>
    </div>
  );

  const { client, orders, totalDebt, settings } = data;
  const typeLabel: Record<string, string> = { PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە", CLINIC: "کلینیک" };
  const hasDebt = client.balance > 0 || orders.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F1A", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .5s ease-out both}
        .fade-up-1{animation-delay:.1s}
        .fade-up-2{animation-delay:.2s}
        .fade-up-3{animation-delay:.3s}
        .fade-up-4{animation-delay:.4s}
      `}</style>

      {/* ── Dark gradient header ── */}
      <div style={{ background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 60%, #0F0F1A 100%)", padding: "44px 20px 56px", position: "relative", overflow: "hidden" }}>
        {/* Decorative glow */}
        <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,123,53,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="fade-up" style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          {/* Company branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 18 }}>د</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{settings?.name || "دەوا فارما"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{settings?.nameEn || "Dewa Pharma"}</div>
            </div>
          </div>

          {/* Client info */}
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "white", marginBottom: 6, letterSpacing: "-0.5px" }}>{client.name}</h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            <span>{typeLabel[client.type] || client.type}</span>
            {client.phone && <span>📞 {client.phone}</span>}
            {client.city && <span>📍 {client.city}</span>}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 560, margin: "-28px auto 0", padding: "0 16px", position: "relative" }}>

        {/* Debt card */}
        <div className="fade-up fade-up-1" style={{
          borderRadius: 20, padding: 28, marginBottom: 16,
          background: hasDebt
            ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
            : "linear-gradient(135deg, #059669 0%, #047857 100%)",
          boxShadow: hasDebt
            ? "0 8px 32px rgba(220,38,38,0.35)"
            : "0 8px 32px rgba(5,150,105,0.35)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8, letterSpacing: 1 }}>
            قەرزی ماوە
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "white", marginBottom: 4 }}>
            {formatIQD(Math.abs(client.balance))}
          </div>
          {!hasDebt && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>✅ هیچ قەرزێک نییە — سوپاس!</div>
          )}
        </div>

        {/* Stats row */}
        <div className="fade-up fade-up-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>داواکارییە نەدراوەکان</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#FF6B6B" }}>{orders.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>کۆی بڕی نەدراو</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#F47B35" }}>{formatIQD(totalDebt)}</div>
          </div>
        </div>

        {/* Unpaid orders list */}
        {orders.length > 0 && (
          <div className="fade-up fade-up-3">
            <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.6)", marginBottom: 12, paddingRight: 4 }}>
              وردەکارییەکانی قەرز
            </div>
            {orders.map((o, idx) => {
              const st = STATUS[o.status] || { label: o.status, emoji: "📋", color: "#6C757D", bg: "#F1F3F5" };
              return (
                <div key={idx} style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px 18px", marginBottom: 10,
                  border: "1px solid rgba(255,255,255,0.06)", transition: "all .2s",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{st.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "white" }}>#{o.orderNumber}</span>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>

                  {/* Products */}
                  {o.items?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {o.items.map((it, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{it.productName}</span>
                          <div style={{ display: "flex", gap: 12, color: "rgba(255,255,255,0.4)" }}>
                            <span>×{it.quantity}</span>
                            <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{formatIQD(it.quantity * it.unitPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{o.createdAt?.split("T")[0]}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#FF6B6B" }}>{formatIQD(o.totalAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No debt */}
        {orders.length === 0 && hasDebt && (
          <div className="fade-up fade-up-3" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>هیچ داواکارییەکی نەدراوت نییە</div>
          </div>
        )}

        {orders.length === 0 && !hasDebt && (
          <div className="fade-up fade-up-3" style={{ background: "rgba(5,150,105,0.1)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid rgba(5,150,105,0.2)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ color: "#059669", fontSize: 14, fontWeight: 700 }}>هیچ قەرزێکت نییە — سوپاس بۆ پارەدانەکانت!</div>
          </div>
        )}

        {/* Footer */}
        <div className="fade-up fade-up-4" style={{ textAlign: "center", padding: "28px 0 32px" }}>
          {settings?.phone && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginBottom: 4 }}>📞 {settings.phone}</div>}
          <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 10 }}>
            {settings?.name || "دەوا فارما"} · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
