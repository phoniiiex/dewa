// ============================================================
// DEWA — /print/sticker/[orderId] (QR Sticker Print Route)
//
// Prints a compact sticker with:
//   - Customer name (large)
//   - QR code linking to /verify/[clientId]
//   - Order number
//   - Company name
// ============================================================

import { createAdminClient } from "@/lib/supabase";
import PrintShell from "@/components/print/PrintShell";

export default async function StickerPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ silent?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = createAdminClient();

  // ── Fetch order ──
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single();

  if (!order) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "#999", direction: "rtl" }}>
        داواکاری نەدۆزرایەوە
      </div>
    );
  }

  // ── Fetch settings ──
  const { data: settingsRows } = await supabase
    .from("company_settings")
    .select("name, name_en, logo")
    .limit(1);
  const settings = (settingsRows?.[0] || {}) as Record<string, unknown>;

  // ── Generate QR code (dynamic import) ──
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dewa.app";
  const verifyUrl = `${baseUrl}/verify/${order.client_id}`;
  let qrDataUrl = "";
  try {
    const QRCode = (await import("qrcode")).default;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 1,
      color: { dark: "#1A1A2E", light: "#FFFFFF" },
    });
  } catch { /* QR generation failed — continue without it */ }

  const isSilent = searchParams.silent === "1";
  const companyName = (settings.name || "") as string;
  const pharmacyName = (order.pharmacy_name || "") as string;

  return (
    <PrintShell silent={isSilent} globalFont="zavi">
      <div
        dir="rtl"
        style={{
          fontFamily: "'Zavi Gifts', 'Segoe UI', sans-serif",
          width: "80mm",
          padding: "12mm 8mm",
          background: "#fff",
          color: "#1A1A2E",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* Company name */}
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, marginBottom: 6 }}>
          {companyName}
        </div>

        {/* Customer name (large) */}
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, lineHeight: 1.3 }}>
          {order.client_name}
        </div>

        {/* Pharmacy name if exists */}
        {pharmacyName && (
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, marginBottom: 6 }}>
            {pharmacyName}
          </div>
        )}

        {/* Order number */}
        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.4, marginBottom: 10 }}>
          #{order.order_number}
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={qrDataUrl}
              alt="QR"
              style={{ width: 120, height: 120, borderRadius: 8, border: "1px solid #E8EAFF" }}
            />
          </div>
        )}

        {/* Label under QR */}
        <div style={{ fontSize: 8, opacity: 0.35 }}>
          سکان بکە بۆ پشتڕاستکردنەوە
        </div>
      </div>
    </PrintShell>
  );
}
