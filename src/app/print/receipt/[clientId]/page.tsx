// ============================================================
// DEWA — /print/receipt/[clientId] (Payment Receipt Route)
//
// Prints a payment receipt for a client's outstanding orders.
// Query params:
//   ?orders=id1,id2  — which orders this payment covers
//   ?silent=1        — trigger auto window.print()
// ============================================================

import { createAdminClient } from "@/lib/supabase";
import PrintShell from "@/components/print/PrintShell";
import type { CompanySettings } from "@/lib/types";
import { amountInWords } from "@/lib/amount-words";

export default async function PaymentReceiptPage(props: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ orders?: string; silent?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = createAdminClient();

  // ── Fetch client ──
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.clientId)
    .single();

  if (!client) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#999", direction: "rtl" }}>
        کڕیار نەدۆزرایەوە
      </div>
    );
  }

  // ── Fetch selected orders ──
  const orderIds = (searchParams.orders || "").split(",").filter(Boolean);
  let orders: Record<string, unknown>[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("id", orderIds);
    orders = data || [];
  }

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

  // ── Compute totals ──
  const totalAmount = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("ku", { hour: "2-digit", minute: "2-digit" });
  const isSilent = searchParams.silent === "1";

  return (
    <PrintShell silent={isSilent} globalFont="zavi">
      <div
        dir="rtl"
        style={{
          fontFamily: "'Zavi Gifts', 'Segoe UI', sans-serif",
          width: "210mm",
          minHeight: "148mm",
          padding: "32px 40px",
          background: "#fff",
          color: "#1A1A2E",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #4263EB", paddingBottom: 16, marginBottom: 20 }}>
          {settings.logo && (
            <img src={settings.logo} alt="Logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{settings.name}</div>
            {settings.nameEn && <div style={{ fontSize: 12, opacity: 0.6 }}>{settings.nameEn}</div>}
            {settings.address && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>📍 {settings.address}{settings.city ? `، ${settings.city}` : ""}</div>}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4263EB" }}>وەسڵی پارەدان</div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{dateStr} — {timeStr}</div>
          </div>
        </div>

        {/* Client Info */}
        <div style={{ display: "flex", gap: 32, marginBottom: 20, background: "#F8F9FF", borderRadius: 12, padding: "14px 20px", border: "1px solid #E8EAFF" }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 600 }}>کڕیار</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{client.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 600 }}>دراو</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{settings.currency}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 600 }}>ژمارەی داواکاری</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{orders.length}</div>
          </div>
        </div>

        {/* Orders Table */}
        {orders.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>ژمارەی داواکاری</th>
                <th style={thStyle}>بەروار</th>
                <th style={thStyle}>بڕ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={String(o.id)}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{String(o.order_number || "—")}</td>
                  <td style={tdStyle}>
                    {o.created_at ? new Date(o.created_at as string).toLocaleDateString("ku", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td style={tdStyle}>{formatIQD(Number(o.total_amount || 0))} {settings.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <div style={{ minWidth: 260, maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 800, fontSize: 15, color: "#4263EB", borderTop: "2px solid #4263EB" }}>
              <span>کۆی گشتی</span>
              <span>{formatIQD(totalAmount)} {settings.currency}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              بڕ بە پیت: {amountInWords(totalAmount)}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-around", gap: 24, marginTop: 40 }}>
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ borderBottom: "1.5px solid #333", height: 40 }} />
            <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.6, marginTop: 6 }}>واژووی وەرگر</div>
          </div>
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ borderBottom: "1.5px solid #333", height: 40 }} />
            <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.6, marginTop: 6 }}>واژووی پارەدەر</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 10, opacity: 0.4, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12, marginTop: 32 }}>
          <span>{dateStr}</span>
          <span>{settings.phone}</span>
        </div>
      </div>
    </PrintShell>
  );
}

// ── Inline styles ──
const thStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 10.5,
  color: "#fff",
  background: "#4263EB",
  padding: "8px 10px",
  textAlign: "right",
  whiteSpace: "nowrap",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

const tdStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderBottom: "1px solid #F0F0F0",
  fontSize: 12,
};

function formatIQD(amount: number): string {
  return amount.toLocaleString("en-US");
}
