// ============================================================
// DEWA — /print/[orderId] (Print Route)
//
// Server component that:
//   1. Fetches order, client, settings, template from Supabase
//   2. Generates QR code
//   3. Renders InvoiceDocument
//   4. Auto-triggers window.print() if ?silent=1
// ============================================================

import { createAdminClient } from "@/lib/supabase";
import InvoiceDocument from "@/components/print/InvoiceDocument";
import type { InvoiceData } from "@/components/print/InvoiceDocument";
import type { CompanySettings, InvoiceTemplate, OrderItem } from "@/lib/types";
import { DEFAULT_INVOICE_TEMPLATE, DEFAULT_SECTION_STYLE } from "@/lib/types";
import QRCode from "qrcode";
import PrintShell from "@/components/print/PrintShell";

export default async function PrintPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string; preview?: string; silent?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = createAdminClient();

  // ── 1. Fetch order ──
  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single();

  if (!orderRow) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#999", direction: "rtl" }}>
        داواکاری نەدۆزرایەوە
      </div>
    );
  }

  // ── 2. Fetch client ──
  const { data: clientRow } = await supabase
    .from("clients")
    .select("*")
    .eq("id", orderRow.client_id)
    .single();

  // ── 3. Fetch settings ──
  const { data: settingsRows } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1);
  const settingsRow = settingsRows?.[0] || {};

  // ── 4. Fetch template ──
  let templateRow: Record<string, unknown> | null = null;
  if (searchParams.t) {
    const { data } = await supabase
      .from("invoice_templates")
      .select("*")
      .eq("id", searchParams.t)
      .single();
    templateRow = data;
  }
  if (!templateRow) {
    // Try default
    const { data } = await supabase
      .from("invoice_templates")
      .select("*")
      .eq("is_default", true)
      .limit(1);
    templateRow = data?.[0] || null;
  }

  // ── 5. Map data ──
  const settings: CompanySettings = {
    name: (settingsRow.name || "") as string,
    nameEn: (settingsRow.name_en || "") as string,
    phone: (settingsRow.phone || "") as string,
    email: (settingsRow.email || "") as string,
    city: (settingsRow.city || "") as string,
    address: (settingsRow.address || "") as string,
    currency: (settingsRow.currency || "IQD") as string,
    language: (settingsRow.language || "ckb") as string,
    logo: (settingsRow.logo || "") as string,
    profilePic: (settingsRow.profile_pic || "") as string,
    establishedYear: (settingsRow.established_year || "") as string,
    businessDesc: (settingsRow.business_desc || "") as string,
    phoneAdmin: (settingsRow.phone_admin || "") as string,
    phoneAccounting: (settingsRow.phone_accounting || "") as string,
    phoneIT: (settingsRow.phone_it || "") as string,
    phoneSales: (settingsRow.phone_sales || "") as string,
    telegramBotToken: (settingsRow.telegram_bot_token || "") as string,
    telegramBotUsername: (settingsRow.telegram_bot_username || "") as string,
    telegramNotifyChatIds: Array.isArray(settingsRow.telegram_notify_chat_ids)
      ? settingsRow.telegram_notify_chat_ids as string[]
      : [],
  };

  const template: InvoiceTemplate = templateRow
    ? mapTemplate(templateRow)
    : { id: "default", createdAt: new Date().toISOString(), ...DEFAULT_INVOICE_TEMPLATE } as InvoiceTemplate;

  const items: OrderItem[] = (orderRow.items as OrderItem[]) || [];

  // ── 6. QR code ──
  let qrDataUrl: string | undefined;
  if (template.showQR && clientRow?.qr_token) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dewa.app";
    const qrUrl = `${baseUrl}/q/${clientRow.qr_token}`;
    try {
      qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: template.qr.size * 2,
        margin: 1,
        color: { dark: "#1A1A2E", light: "#FFFFFF" },
      });
    } catch { /* noop */ }
  }

  // ── 7. Build InvoiceData ──
  const invoiceData: InvoiceData = {
    order: {
      id: orderRow.id,
      orderNumber: orderRow.order_number || "",
      clientName: orderRow.client_name || "",
      repName: orderRow.rep_name || "",
      items,
      totalAmount: Number(orderRow.total_amount || 0),
      notes: orderRow.notes || "",
      status: orderRow.status || "",
      createdAt: orderRow.created_at || "",
    },
    client: {
      name: clientRow?.name || orderRow.client_name || "",
      balance: Number(clientRow?.balance || 0),
      qrToken: clientRow?.qr_token || "",
    },
    settings,
    template,
    qrDataUrl,
  };

  const isSilent = searchParams.silent === "1";

  return (
    <PrintShell silent={isSilent} globalFont={template.globalFont}>
      <InvoiceDocument data={invoiceData} />
    </PrintShell>
  );
}

// ── Template mapper (same logic as store.tsx but for server context) ──
function mapTemplate(r: Record<string, unknown>): InvoiceTemplate {
  return {
    id: r.id as string,
    name: (r.name || "") as string,
    isDefault: !!r.is_default,
    paperSize: (r.paper_size || "A4") as InvoiceTemplate["paperSize"],
    globalFont: (r.global_font || "zavi") as InvoiceTemplate["globalFont"],
    primaryColor: (r.primary_color || "#4263EB") as string,
    logoUrl: r.logo_url as string | undefined,
    watermark: r.watermark as string | undefined,
    showHeader: r.show_header !== false,
    showInvoiceMeta: r.show_invoice_meta !== false,
    showItemsTable: r.show_items_table !== false,
    showSummary: r.show_summary !== false,
    showQR: r.show_qr !== false,
    showNotes: r.show_notes !== false,
    showTerms: r.show_terms !== false,
    showSignature: r.show_signature !== false,
    showFooter: r.show_footer !== false,
    header: (r.header || {}) as InvoiceTemplate["header"],
    invoiceMeta: (r.invoice_meta || {}) as InvoiceTemplate["invoiceMeta"],
    table: (r.table || {}) as InvoiceTemplate["table"],
    summary: (r.summary || {}) as InvoiceTemplate["summary"],
    qr: (r.qr || {}) as InvoiceTemplate["qr"],
    signature: (r.signature || {}) as InvoiceTemplate["signature"],
    footer: (r.footer || {}) as InvoiceTemplate["footer"],
    defaultDiscount: Number(r.default_discount || 0),
    createdAt: (r.created_at || "") as string,
  };
}
