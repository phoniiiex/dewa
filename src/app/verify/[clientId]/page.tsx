// ============================================================
// DEWA — /verify/[clientId] (Order Verification Page)
//
// Public page displayed when scanning a QR code sticker.
// Shows: ✅ Legit Order, company name, warehouse, pharmacy name
// ============================================================

import { createAdminClient } from "@/lib/supabase";
import type { CompanySettings } from "@/lib/types";

export default async function VerifyPage(props: {
  params: Promise<{ clientId: string }>;
}) {
  const params = await props.params;
  const supabase = createAdminClient();

  // ── Fetch client ──
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.clientId)
    .single();

  // ── Fetch settings ──
  const { data: settingsRows } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1);
  const s = settingsRows?.[0] || {};

  const settings: CompanySettings = {
    name: (s.name || "") as string,
    nameEn: (s.name_en || "") as string,
    phone: (s.phone || "") as string,
    email: (s.email || "") as string,
    city: (s.city || "") as string,
    address: (s.address || "") as string,
    currency: (s.currency || "IQD") as string,
    language: (s.language || "ckb") as string,
    logo: (s.logo || "") as string,
    profilePic: (s.profile_pic || "") as string,
    establishedYear: (s.established_year || "") as string,
    businessDesc: (s.business_desc || "") as string,
    phoneAdmin: (s.phone_admin || "") as string,
    phoneAccounting: (s.phone_accounting || "") as string,
    phoneIT: (s.phone_it || "") as string,
    phoneSales: (s.phone_sales || "") as string,
    telegramBotToken: "",
    telegramBotUsername: "",
    telegramNotifyChatIds: [],
  };

  // ── Fetch recent orders for context ──
  let warehouseName = "";
  let pharmacyName = "";
  if (client) {
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("client_name, pharmacy_name, order_flow")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recentOrders?.[0]) {
      warehouseName = recentOrders[0].client_name || "";
      pharmacyName = recentOrders[0].pharmacy_name || "";
    }
  }

  const clientType: Record<string, string> = {
    PHARMACY: "دەرمانخانە",
    HOSPITAL: "نەخۆشخانە",
    CLINIC: "کلینیک",
    WAREHOUSE: "کۆگا",
  };

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F1A", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(255,99,99,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FF6B6B", fontSize: 36 }}>⚠</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8 }}>زانیاری نەدۆزرایەوە</h1>
          <p style={{ color: "#6C757D", fontSize: 14 }}>ئەم QR کۆدە نادروستە</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F1A", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        .fade-up{animation:fadeUp .5s ease-out both}
        .fade-up-1{animation-delay:.1s}
        .fade-up-2{animation-delay:.2s}
        .fade-up-3{animation-delay:.3s}
      `}</style>

      {/* ── Gradient header ── */}
      <div style={{ background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 60%, #0F0F1A 100%)", padding: "44px 20px 56px", position: "relative", overflow: "hidden" }}>
        {/* Decorative glow */}
        <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="fade-up" style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          {/* Company branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: 14, objectFit: "contain", background: "rgba(255,255,255,0.1)", padding: 4 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #059669, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 20 }}>{settings.name.charAt(0) || "د"}</div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{settings.name}</div>
              {settings.nameEn && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{settings.nameEn}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 560, margin: "-28px auto 0", padding: "0 16px", position: "relative" }}>

        {/* ✅ Legit order card */}
        <div className="fade-up fade-up-1" style={{
          borderRadius: 20, padding: 28, marginBottom: 16, textAlign: "center",
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          boxShadow: "0 8px 32px rgba(5,150,105,0.35)",
          animation: "fadeUp .5s ease-out .1s both",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "white", marginBottom: 4 }}>
            داواکاریەکی ڕاستە
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            ئەم داواکاریە لە سیستەمی {settings.name} تۆمارکراوە
          </div>
        </div>

        {/* Client info card */}
        <div className="fade-up fade-up-2" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px 18px", marginBottom: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 10, letterSpacing: 1 }}>
            زانیاری کڕیار
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>ناو</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{client.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>جۆر</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{clientType[client.type] || client.type}</span>
            </div>
            {client.city && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>شار</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>📍 {client.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Supply chain info */}
        <div className="fade-up fade-up-3" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px 18px", marginBottom: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 10, letterSpacing: 1 }}>
            زانیاری کۆمپانیا
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>کۆمپانیا</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#10B981" }}>{settings.name}</span>
            </div>
            {warehouseName && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>کۆگا</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{warehouseName}</span>
              </div>
            )}
            {pharmacyName && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>دەرمانخانە</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{pharmacyName}</span>
              </div>
            )}
            {settings.address && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>ناونیشان</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{settings.address}{settings.city ? `، ${settings.city}` : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0 32px" }}>
          {settings.phone && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginBottom: 4 }}>📞 {settings.phone}</div>}
          <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 10 }}>
            {settings.name} · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
