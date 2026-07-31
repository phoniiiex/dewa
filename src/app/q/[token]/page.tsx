"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function formatIQD(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " د.ع";
}

const STATUS: Record<string, { label: string; emoji: string; color: string }> = {
  WAITING:      { label: "چاوەڕوان",    emoji: "⏳", color: "#E67700" },
  IN_PROGRESS:  { label: "لە پڕۆسەدا", emoji: "🔄", color: "#7C5CFC" },
  READY:        { label: "ئامادەیە",    emoji: "✅", color: "#1098AD" },
  SENT:         { label: "نێردرا",      emoji: "🚚", color: "#4263EB" },
  DELIVERED:    { label: "گەیشت",       emoji: "📦", color: "#F47B35" },
};

interface OrderItem { productName: string; quantity: number; bonusQty?: number; unitPrice: number }
interface OrderData { orderNumber: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }
interface ApiData {
  client: { name: string; type: string; phone: string; city: string; balance: number };
  orders: OrderData[];
  totalUnpaidOrders: number;
  settings: { name: string; nameEn: string; phone: string; logo?: string } | null;
}

function formatDateKurdish(iso: string) {
  const months = ["کانوونی دووەم","شوبات","ئازار","نیسان","ئایار","حوزەیران","تەمموز","ئاب","ئەیلوول","تشرینی یەکەم","تشرینی دووەم","کانوونی یەکەم"];
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return iso?.slice(0, 10) || ""; }
}

// Theme colors
const themes = {
  dark: {
    bg: "#0A0A14", heroBg: "linear-gradient(180deg, #12121F 0%, #0E0E1A 100%)",
    text: "white", textSub: "rgba(255,255,255,0.45)", textMuted: "rgba(255,255,255,0.25)",
    cardBg: "rgba(255,255,255,0.03)", cardBorder: "rgba(255,255,255,0.05)",
    statNum: "#FF6B6B", labelColor: "rgba(255,255,255,0.3)",
    toggleBg: "rgba(255,255,255,0.06)", toggleIcon: "🌙",
  },
  light: {
    bg: "#F5F5F7", heroBg: "linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)",
    text: "#1A1A2E", textSub: "rgba(0,0,0,0.5)", textMuted: "rgba(0,0,0,0.3)",
    cardBg: "white", cardBorder: "rgba(0,0,0,0.08)",
    statNum: "#DC2626", labelColor: "rgba(0,0,0,0.4)",
    toggleBg: "rgba(0,0,0,0.05)", toggleIcon: "☀️",
  },
};

export default function DebtPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [mode, setMode] = useState<"dark" | "light">("dark");

  const t = themes[mode];

  useEffect(() => {
    fetch(`/api/debt/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A14" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zain:wght@400;700;800;900&display=swap');
        @keyframes pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite", color: "white", fontWeight: 900, fontSize: 24 }}>د</div>
        <div style={{ color: "#6C757D", fontSize: 14, fontFamily: "'Zain', sans-serif" }}>چاوەڕوان بکە...</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A14", fontFamily: "'Zain', sans-serif", direction: "rtl" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Zain:wght@400;700;800;900&display=swap');`}</style>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(255,99,99,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FF6B6B", fontSize: 36 }}>⚠</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8 }}>زانیاری نەدۆزرایەوە</h1>
        <p style={{ color: "#6C757D", fontSize: 14 }}>تکایە QR کۆدەکەی پسوولەکە سکان بکەرەوە</p>
      </div>
    </div>
  );

  const { client, orders, totalUnpaidOrders, settings } = data;
  const typeLabel: Record<string, string> = { PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە", CLINIC: "کلینیک" };
  const hasDebt = totalUnpaidOrders > 0;
  const companyName = settings?.name || "";
  const companyNameEn = settings?.nameEn || "";
  const logo = settings?.logo || "";

  return (
    <div style={{ minHeight: "100dvh", background: t.bg, fontFamily: "'Zain', sans-serif", direction: "rtl", transition: "background .3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zain:wght@400;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .fade-up { animation: fadeUp .6s cubic-bezier(.16,1,.3,1) both }
        .scale-in { animation: scaleIn .5s cubic-bezier(.16,1,.3,1) both }
        .d1 { animation-delay: .05s } .d2 { animation-delay: .1s } .d3 { animation-delay: .15s } .d4 { animation-delay: .2s } .d5 { animation-delay: .25s }
        .order-card { transition: all .2s ease; cursor: pointer }
        .order-card:active { transform: scale(0.98) }
      `}</style>

      {/* ── Hero header (always dark) ── */}
      <div style={{
        background: t.heroBg,
        padding: "48px 20px 64px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -120, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,123,53,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Theme toggle */}
        <button
          onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
          style={{
            position: "absolute", top: 16, left: 16, width: 40, height: 40, borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            fontSize: 18, transition: "all .2s",
          }}
        >
          {mode === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="fade-up" style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
          {/* Company branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            {logo ? (
              <img src={logo} alt={companyName} style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", border: "2px solid rgba(255,255,255,0.1)", background: "white" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 20 }}>
                {companyName.charAt(0) || "ت"}
              </div>
            )}
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>{companyName}</div>
              {companyNameEn && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{companyNameEn}</div>}
            </div>
          </div>

          {/* Client info */}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", marginBottom: 8, letterSpacing: "-0.5px", lineHeight: 1.2 }}>{client.name}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            <span>{typeLabel[client.type] || client.type}</span>
            {client.phone && <span>📞 {client.phone}</span>}
            {client.city && <span>📍 {client.city}</span>}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 480, margin: "-36px auto 0", padding: "0 16px", position: "relative" }}>

        {/* Main debt card */}
        <div className="scale-in d1" style={{
          borderRadius: 24, padding: "28px 24px", marginBottom: 14,
          background: hasDebt
            ? "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)"
            : "linear-gradient(135deg, #059669 0%, #065F46 100%)",
          boxShadow: hasDebt
            ? "0 12px 40px rgba(220,38,38,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset"
            : "0 12px 40px rgba(5,150,105,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 3s ease infinite", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", marginBottom: 10, letterSpacing: "0.1em" }}>کۆی قەرز</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: "white", marginBottom: 4, letterSpacing: "-1px" }}>{formatIQD(totalUnpaidOrders)}</div>
            {!hasDebt && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 6 }}>✅ هیچ قەرزێک نییە — سوپاس!</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up d2" style={{ marginBottom: 14 }}>
          <div style={{ background: t.cardBg, borderRadius: 18, padding: "18px 16px", border: `1px solid ${t.cardBorder}`, transition: "all .3s" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: t.labelColor, marginBottom: 8, letterSpacing: "0.05em" }}>داواکارییە نەدراوەکان</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: orders.length > 0 ? t.statNum : "#059669" }}>{orders.length}</div>
          </div>
        </div>

        {/* Orders list */}
        {orders.length > 0 && (
          <div className="fade-up d3">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingRight: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.textSub }}>وردەکارییەکانی قەرز</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>{orders.length} داواکاری</div>
            </div>
            {orders.map((o, idx) => {
              const st = STATUS[o.status] || { label: o.status, emoji: "📋", color: "#6C757D" };
              const isExpanded = expandedOrder === idx;
              return (
                <div key={idx} className={`order-card fade-up d${Math.min(idx + 3, 5)}`}
                  onClick={() => setExpandedOrder(isExpanded ? null : idx)}
                  style={{
                    background: t.cardBg, borderRadius: 18, padding: "16px 18px", marginBottom: 8,
                    border: `1px solid ${isExpanded ? (mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)") : t.cardBorder}`,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: t.text }}>#{o.orderNumber}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{formatDateKurdish(o.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: t.statNum }}>{formatIQD(o.totalAmount)}</div>
                  </div>

                  {isExpanded && o.items?.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
                      {o.items.map((it, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 12 }}>
                          <span style={{ color: t.textSub }}>{it.productName}</span>
                          <div style={{ display: "flex", gap: 14, color: t.textMuted }}>
                            <span>×{it.quantity}</span>
                            <span style={{ color: t.textSub, fontWeight: 700, minWidth: 80, textAlign: "left" }}>{formatIQD(it.quantity * it.unitPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {orders.length === 0 && hasDebt && (
          <div className="fade-up d3" style={{ background: t.cardBg, borderRadius: 20, padding: 36, textAlign: "center", border: `1px solid ${t.cardBorder}` }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ color: t.textSub, fontSize: 13 }}>هیچ داواکارییەکی نەدراوت نییە</div>
          </div>
        )}

        {orders.length === 0 && !hasDebt && (
          <div className="fade-up d3" style={{ background: mode === "dark" ? "rgba(5,150,105,0.08)" : "rgba(5,150,105,0.06)", borderRadius: 20, padding: 36, textAlign: "center", border: "1px solid rgba(5,150,105,0.15)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <div style={{ color: "#059669", fontSize: 14, fontWeight: 700 }}>هیچ قەرزێکت نییە — سوپاس بۆ پارەدانەکانت!</div>
          </div>
        )}

        {/* Footer */}
        <div className="fade-up d5" style={{ textAlign: "center", padding: "32px 0 40px" }}>
          {settings?.phone && <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>📞 {settings.phone}</div>}
          <div style={{ color: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.15)", fontSize: 10 }}>
            {companyName} · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
