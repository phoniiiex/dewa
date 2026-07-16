// ============================================================
// DEWA — /print/[orderId]
// Server-rendered print page. Opens in a new tab, auto-prints.
// URL: /print/[orderId]?t=[templateId]&preview=true
// preview=true → shows the page without triggering window.print()
// ============================================================
import { createAdminClient } from "@/lib/supabase";
import { PrintDocument, type PrintOrder, type PrintClient, type PrintSettings } from "@/components/print/PrintDocument";
import type { InvoiceTemplate, TemplateOptions } from "@/lib/types";
import QRCode from "qrcode";
import { DEFAULT_TEMPLATE_OPTIONS } from "@/lib/types";

// ── Default quick-print template (no saved template selected) ──
function defaultTemplate(docType: string = "invoice"): InvoiceTemplate {
  return {
    id: "quick",
    name: "چاپی خێرا",
    docType: docType as InvoiceTemplate["docType"],
    blocks: [
      { id:"header",    label:"سەرپەڕە",        visible:true,  required:true, type:"builtin" },
      { id:"parties",   label:"کڕیار / نوێنەر", visible:true,  required:false, type:"builtin" },
      { id:"items",     label:"بەرهەمەکان",      visible:true,  required:true, type:"builtin" },
      { id:"summary",   label:"کۆی گشتی",        visible:true,  required:false, type:"builtin" },
      { id:"note",      label:"تێبینی",           visible:true,  required:false, type:"builtin" },
      { id:"qr",        label:"QR کۆد",          visible:true,  required:false, type:"builtin" },
      { id:"signature", label:"واژوو",            visible:true,  required:false, type:"builtin" },
      { id:"footer",    label:"خوارپەڕە",         visible:true,  required:false, type:"builtin" },
    ],
    showBonusCol: true,
    defaultNote: "",
    defaultTerms: "",
    defaultDiscount: 0,
    options: DEFAULT_TEMPLATE_OPTIONS,
    createdAt: "",
  };
}

// ── Map Supabase rows ──────────────────────────────────────
function toOrder(r: Record<string, unknown>): PrintOrder {
  return {
    id: r.id as string,
    orderNumber: (r.order_number || "") as string,
    clientId: (r.client_id || "") as string,
    clientName: (r.client_name || "") as string,
    repName: (r.rep_name || "") as string,
    warehouseName: r.warehouse_name as string | null,
    items: (Array.isArray(r.items) ? r.items : []) as PrintOrder["items"],
    status: (r.status || "WAITING") as string,
    totalAmount: Number(r.total_amount || 0),
    notes: (r.notes || "") as string,
    createdAt: (r.created_at || "") as string,
  };
}

function toTemplate(r: Record<string, unknown>): InvoiceTemplate {
  const opts = (r.options as Record<string, unknown>) || {};
  return {
    id: r.id as string,
    name: (r.name || "") as string,
    docType: (r.doc_type || "invoice") as InvoiceTemplate["docType"],
    blocks: (r.blocks || []) as InvoiceTemplate["blocks"],
    showBonusCol: r.show_bonus_col !== false,
    defaultNote: (r.default_note || "") as string,
    defaultTerms: (r.default_terms || "") as string,
    defaultDiscount: Number(r.default_discount || 0),
    options: {
      paperSize: (opts.paperSize as TemplateOptions["paperSize"]) || "A4",
      primaryColor: (opts.primaryColor as string) || "#4263EB",
      logoUrl: opts.logoUrl as string | undefined,
      watermark: opts.watermark as string | undefined,
      fontFamily: (opts.fontFamily as string) || "system",
    },
    createdAt: (r.created_at || "") as string,
  };
}

// ── @media print CSS (injected into <head>) ────────────────
const PRINT_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#E5E7EB}
  
  /* Screen: show page centred on a grey bg with a shadow */
  @media screen {
    .print-shell {
      min-height:100vh;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-start;
      padding:32px 16px 64px;
      gap:16px;
    }
    .print-page{
      box-shadow:0 4px 40px rgba(0,0,0,0.14);
      border-radius:4px;
    }
    .print-topbar{
      display:flex;
      align-items:center;
      gap:12px;
    }
    .print-btn{
      padding:9px 20px;
      border-radius:8px;
      background:#1A1A2E;
      color:white;
      font-size:13px;
      font-weight:700;
      border:none;
      cursor:pointer;
      font-family:inherit;
      transition:opacity 150ms ease-out, transform 150ms ease-out;
    }
    .print-btn:hover{opacity:0.85}
    .print-btn:active{transform:scale(0.97)}
    .print-label{font-size:13px;color:#6B7280;font-family:'Segoe UI',sans-serif}
  }

  /* Print: hide UI chrome, show only the document */
  @media print {
    html,body{background:white!important}
    .print-shell{display:block;padding:0}
    .print-topbar{display:none!important}
    .print-page{
      box-shadow:none!important;
      border-radius:0!important;
      width:100%!important;
    }
    thead tr, .inv-sum-total { -webkit-print-color-adjust:exact; print-color-adjust:exact }
  }
`;

// ── Auto-print script (runs only when ?preview is absent) ──
const AUTO_PRINT_SCRIPT = `
  window.addEventListener('load', function() {
    // Small delay to ensure images (QR) are fully rendered
    setTimeout(function(){ window.print(); }, 600);
  });
`;

// ── Page ──────────────────────────────────────────────────
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { t?: string; preview?: string; doc?: string };
}) {
  const isPreview = searchParams.preview === "true";
  const db = createAdminClient();

  // Fetch order
  const { data: orderRow } = await db
    .from("orders").select("*").eq("id", params.orderId).single();

  if (!orderRow) {
    return (
      <html lang="ckb" dir="rtl">
        <body style={{ fontFamily:"sans-serif", display:"flex", alignItems:"center",
          justifyContent:"center", minHeight:"100vh", color:"#6B7280" }}>
          <div>داواکاری نەدۆزرایەوە</div>
        </body>
      </html>
    );
  }

  const order = toOrder(orderRow as Record<string, unknown>);

  // Fetch template (or use default)
  let template: InvoiceTemplate;
  if (searchParams.t) {
    const { data: tRow } = await db
      .from("invoice_templates").select("*").eq("id", searchParams.t).single();
    template = tRow ? toTemplate(tRow as Record<string, unknown>) : defaultTemplate(searchParams.doc);
  } else {
    template = defaultTemplate(searchParams.doc);
  }

  // Fetch client (for QR token + contact details)
  const { data: clientRow } = await db
    .from("clients").select("*").eq("id", order.clientId).single();

  const client: PrintClient | undefined = clientRow ? {
    name: (clientRow.name || "") as string,
    phone: (clientRow.phone || "") as string,
    city: (clientRow.city || "") as string,
    type: (clientRow.type || "") as string,
  } : undefined;

  // Fetch company settings
  const { data: settingsRow } = await db.from("company_settings").select("*").single();
  const settings: PrintSettings = settingsRow ? {
    name: (settingsRow.name || "دەوا فارما") as string,
    nameEn: (settingsRow.name_en || "") as string,
    phone: (settingsRow.phone || "") as string,
    email: (settingsRow.email || "") as string,
    address: (settingsRow.address || "") as string,
  } : { name:"دەوا فارما", nameEn:"", phone:"", email:"", address:"" };

  // Generate QR (only if template has the qr block visible)
  const hasQrBlock = template.blocks.some(b => b.id === "qr" && b.visible);
  let qrDataUrl: string | undefined;
  if (hasQrBlock && clientRow?.qr_token) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const qrUrl = `${baseUrl}/q/${clientRow.qr_token}`;
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 150, margin: 1,
      color: { dark:"#000000", light:"#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  const docLabel = { invoice:"پسووڵە", receipt:"وەسڵ",
    delivery:"وەرقەی گەیاندن", quote:"نرخنامە" }[template.docType] || "";

  return (
    <html lang="ckb" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{docLabel} — {order.orderNumber}</title>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
        {!isPreview && (
          <script dangerouslySetInnerHTML={{ __html: AUTO_PRINT_SCRIPT }} />
        )}
      </head>
      <body>
        <div className="print-shell">
          {/* Top bar (hidden when printing) */}
          <div className="print-topbar">
            <span className="print-label">{order.orderNumber} — {docLabel}</span>
            <button className="print-btn" onClick={() => window.print()}>
              🖨 چاپکردن
            </button>
            <button className="print-btn"
              style={{ background:"#6B7280" }}
              onClick={() => window.close()}>
              داخستن
            </button>
          </div>

          {/* The actual document */}
          <PrintDocument
            order={order}
            client={client}
            settings={settings}
            template={template}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </body>
    </html>
  );
}
