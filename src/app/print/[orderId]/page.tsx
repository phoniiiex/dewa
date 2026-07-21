// ============================================================
// DEWA — /print/[orderId]
// Server component — fetches data, renders PrintDocument.
// Wrapped in PrintShell (client) which:
//   • Covers dashboard chrome with a fixed overlay on screen
//   • Auto-triggers window.print() via useEffect
//   • Hides itself in @media print so only document prints
//
// URL: /print/[orderId]?t=[templateId]&doc=[docType]&preview=true
//   preview=true  →  skip auto-print (view only)
// ============================================================
import { createAdminClient } from "@/lib/supabase";
import { PrintDocument, type PrintOrder, type PrintClient, type PrintSettings } from "@/components/print/PrintDocument";
import { PrintShell } from "@/components/print/PrintShell";
import { DEFAULT_TEMPLATE_OPTIONS } from "@/lib/types";
import type { InvoiceTemplate, TemplateOptions } from "@/lib/types";
import QRCode from "qrcode";

// ── Default template when no saved template is selected ─────
function defaultTemplate(docType = "invoice"): InvoiceTemplate {
  return {
    id: "quick",
    name: "چاپی خێرا",
    docType: docType as InvoiceTemplate["docType"],
    blocks: [
      { id:"header",    label:"سەرپەڕە",         visible:true,  required:true,  type:"builtin" },
      { id:"parties",   label:"کڕیار / نوێنەر",  visible:true,  required:false, type:"builtin" },
      { id:"items",     label:"بەرهەمەکان",       visible:true,  required:true,  type:"builtin" },
      { id:"summary",   label:"کۆی گشتی",         visible:true,  required:false, type:"builtin" },
      { id:"note",      label:"تێبینی",            visible:true,  required:false, type:"builtin" },
      { id:"qr",        label:"QR کۆد",           visible:true,  required:false, type:"builtin" },
      { id:"signature", label:"واژوو",             visible:true,  required:false, type:"builtin" },
      { id:"footer",    label:"پێپەڕە",            visible:true,  required:false, type:"builtin" },
    ],
    showBonusCol: true,
    defaultNote: "",
    defaultTerms: "",
    defaultDiscount: 0,
    options: DEFAULT_TEMPLATE_OPTIONS,
    createdAt: "",
  };
}

// ── DB mappers ──────────────────────────────────────────────
function toOrder(r: Record<string, unknown>): PrintOrder {
  return {
    id:             r.id as string,
    orderNumber:    (r.order_number || "") as string,
    clientId:       (r.client_id   || "") as string,
    clientName:     (r.client_name || "") as string,
    repName:        (r.rep_name    || "") as string,
    warehouseName:  r.warehouse_name as string | null,
    items:          (Array.isArray(r.items) ? r.items : []) as PrintOrder["items"],
    status:         (r.status      || "WAITING") as string,
    totalAmount:    Number(r.total_amount  || 0),
    notes:          (r.notes       || "") as string,
    createdAt:      (r.created_at  || "") as string,
  };
}

function toTemplate(r: Record<string, unknown>): InvoiceTemplate {
  const opts = (r.options as Record<string, unknown>) || {};
  return {
    id:              r.id as string,
    name:            (r.name       || "") as string,
    docType:         (r.doc_type   || "invoice") as InvoiceTemplate["docType"],
    blocks:          (r.blocks     || []) as InvoiceTemplate["blocks"],
    showBonusCol:    r.show_bonus_col !== false,
    defaultNote:     (r.default_note   || "") as string,
    defaultTerms:    (r.default_terms  || "") as string,
    defaultDiscount: Number(r.default_discount || 0),
    options: {
      paperSize:    (opts.paperSize    as TemplateOptions["paperSize"]) || "A4",
      primaryColor: (opts.primaryColor as string) || "#4263EB",
      logoUrl:      opts.logoUrl  as string | undefined,
      watermark:    opts.watermark as string | undefined,
      fontFamily:   (opts.fontFamily   as string) || "system",
    },
    createdAt: (r.created_at || "") as string,
  };
}

// ── Doc label map ────────────────────────────────────────────
const DOC_LABELS: Record<string, string> = {
  invoice:"پسووڵە", receipt:"وەسڵ", delivery:"وەرقەی گەیاندن", quote:"نرخنامە",
};

// ── Page ────────────────────────────────────────────────────
export default async function PrintPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string; preview?: string; doc?: string; silent?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const isPreview = searchParams.preview === "true";
  const isSilent = searchParams.silent === "true";
  const db = createAdminClient();

  // ── Fetch order ──────────────────────────────────────────
  const { data: orderRow } = await db
    .from("orders").select("*").eq("id", params.orderId).single();

  if (!orderRow) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        minHeight:"60vh", color:"#6B7280", fontSize:15 }}>
        داواکاری نەدۆزرایەوە
      </div>
    );
  }
  const order = toOrder(orderRow as Record<string, unknown>);

  // ── Fetch template ───────────────────────────────────────
  let template: InvoiceTemplate;
  if (searchParams.t) {
    const { data: tRow } = await db
      .from("invoice_templates").select("*").eq("id", searchParams.t).single();
    template = tRow
      ? toTemplate(tRow as Record<string, unknown>)
      : defaultTemplate(searchParams.doc);
  } else {
    template = defaultTemplate(searchParams.doc);
  }

  // ── Fetch client ─────────────────────────────────────────
  const { data: clientRow } = await db
    .from("clients").select("*").eq("id", order.clientId).single();

  const client: PrintClient | undefined = clientRow ? {
    name:  (clientRow.name  || "") as string,
    phone: (clientRow.phone || "") as string,
    city:  (clientRow.city  || "") as string,
    type:  (clientRow.type  || "") as string,
  } : undefined;

  // ── Fetch company settings ───────────────────────────────
  const { data: settingsRow } = await db.from("company_settings").select("*").single();
  const settings: PrintSettings = {
    name:    (settingsRow?.name    || "دەوا فارما") as string,
    nameEn:  (settingsRow?.name_en || "") as string,
    phone:   (settingsRow?.phone   || "") as string,
    email:   (settingsRow?.email   || "") as string,
    address: (settingsRow?.address || "") as string,
  };

  // ── Generate QR as base64 PNG ────────────────────────────
  const hasQrBlock = template.blocks.some(b => b.id === "qr" && b.visible);
  let qrDataUrl: string | undefined;

  if (hasQrBlock && clientRow?.qr_token) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const qrUrl = `${baseUrl}/q/${clientRow.qr_token}`;
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  const docLabel = DOC_LABELS[template.docType] ?? template.docType;
  const pageLabel = `${order.orderNumber} — ${docLabel}`;

  // Silent mode: render only the document (for iframe printing)
  if (isSilent) {
    return (
      <PrintDocument
        order={order}
        client={client}
        settings={settings}
        template={template}
        qrDataUrl={qrDataUrl}
      />
    );
  }

  return (
    <PrintShell label={pageLabel} autoPrint={!isPreview}>
      <PrintDocument
        order={order}
        client={client}
        settings={settings}
        template={template}
        qrDataUrl={qrDataUrl}
      />
    </PrintShell>
  );
}
