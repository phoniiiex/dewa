/**
 * DEWA — Print Engine (100% Client-Side)
 *
 * Renders invoices using the same template config as InvoiceDocument,
 * then prints via hidden iframe. No server routes, no new tabs.
 */

import type { Order, CompanySettings, InvoiceTemplate, SectionStyle } from "@/lib/types";
import { DEFAULT_INVOICE_TEMPLATE, DEFAULT_SECTION_STYLE } from "@/lib/types";

export interface PrintOptions {
  templateId?: string;
  signatureUrl?: string;
  preview?: boolean;
}

// ── Font stacks ──────────────────────────────────────────────────────────────

const FONT_STACKS: Record<SectionStyle["fontFamily"], string> = {
  zavi:   "'Zavi Gifts', 'Segoe UI', Tahoma, sans-serif",
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  naskh:  "'Noto Naskh Arabic', 'Segoe UI', sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const KURDISH_MONTHS = [
  "کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران",
  "تەمموز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم",
];

function formatDateKurdish(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const month = KURDISH_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ی ${month}ی ${year}`;
  } catch { return iso.slice(0, 10); }
}

function formatTimeKurdish(): string {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function fmtNum(n: number): string {
  return `${n.toLocaleString("en-US")} د.ع`;
}

function ms(base: SectionStyle, over: Partial<SectionStyle> = {}): SectionStyle {
  return { ...base, ...over };
}

function cssVars(s: SectionStyle): string {
  return `
    --sec-font: ${FONT_STACKS[s.fontFamily]};
    --sec-size: ${s.fontSize}px;
    --sec-weight: ${s.fontWeight};
    --sec-color: ${s.color};
    --sec-bg: ${s.bgColor};
    --sec-accent: ${s.accentColor};
    --sec-radius: ${s.borderRadius}px;
    --sec-border-w: ${s.borderWidth}px;
    --sec-border-c: ${s.borderColor};
    --sec-pad: ${s.padding}px;
    --sec-align: ${s.textAlign};
  `;
}

// ── Build the full invoice HTML (matches InvoiceDocument exactly) ─────────────

export interface ClientData {
  previousDebt: number;
  receivedAmount: number;
  totalDebt: number;
  totalOrderCount: number;
}

async function buildInvoiceHTML(
  order: Order,
  settings: CompanySettings,
  template: InvoiceTemplate,
  signatureUrl?: string,
  clientData?: ClientData,
  qrToken?: string,
): Promise<string> {
  const t = template;
  const gs: SectionStyle = { ...DEFAULT_SECTION_STYLE, fontFamily: t.globalFont, accentColor: t.primaryColor };
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  // Use order's own discount — no template fallback
  const orderDiscountVal = order.discountValue || 0;
  const orderDiscountType = order.discountType || "AMOUNT";
  const discount = orderDiscountType === "PERCENTAGE"
    ? subtotal * (orderDiscountVal / 100)
    : orderDiscountVal;
  const discountLabel = orderDiscountType === "PERCENTAGE"
    ? `داشکاندن (${orderDiscountVal}%)`
    : "داشکاندن";
  const netTotal = subtotal - discount;
  const now = new Date();
  const printDate = formatDateKurdish(new Date().toISOString());
  const printTime = formatTimeKurdish();
  const accent = t.primaryColor || "#4263EB";
  const pageW = t.paperSize === "A5" ? "148mm" : "210mm";
  const pageMinH = t.paperSize === "A5" ? "210mm" : "297mm";

  // ── Table columns (ordered)
  type ColDef = { show: boolean; th: string; td: (it: typeof items[0], i: number) => string };
  const colDefs: Record<string, ColDef> = {
    rowNumber:   { show: t.table.showRowNumbers,   th: "<th>#</th>",            td: (_it, i) => `<td>${i + 1}</td>` },
    productName: { show: t.table.showProductName,   th: "<th>ناوی بەرهەم</th>",  td: (it) => `<td>${it.productName}</td>` },
    quantity:    { show: t.table.showQuantity,       th: "<th>بڕ</th>",           td: (it) => `<td>${it.quantity}</td>` },
    freeQty:     { show: t.table.showFreeQty,        th: "<th>بۆنەس</th>",       td: (it) => `<td>${it.bonusQty || "—"}</td>` },
    unitPrice:   { show: t.table.showUnitPrice,      th: "<th>نرخی یەکە</th>",   td: (it) => `<td>${fmtNum(it.unitPrice)}</td>` },
    lineTotal:   { show: t.table.showLineTotal,      th: "<th>کۆ</th>",          td: (it) => `<td>${fmtNum(it.quantity * it.unitPrice)}</td>` },
    expiryDate:  { show: t.table.showExpiryDate,     th: "<th>بەسەرچوون</th>",  td: (it) => `<td>${it.expiryDate || "—"}</td>` },
    company:     { show: t.table.showCompany,        th: "<th>بەرهەمهێنەر</th>", td: (it) => `<td>${it.company || "—"}</td>` },
    batchNumber: { show: t.table.showBatchNumber,    th: "<th>ژمارەی باچ</th>",  td: (it) => `<td>${it.batchNumber || "—"}</td>` },
    productType: { show: t.table.showProductType,    th: "<th>جۆری بەرهەم</th>", td: (it) => `<td>${it.category || "—"}</td>` },
  };
  const colOrder = t.table.columnOrder || Object.keys(colDefs);
  const activeCols = colOrder.filter(k => colDefs[k]?.show);

  const thCells = activeCols.map(k => colDefs[k].th);

  // ── Table body rows
  const bodyRows = items.map((it, i) => {
    const cells = activeCols.map(k => colDefs[k].td(it, i));
    return `<tr>${cells.join("")}</tr>`;
  }).join("");

  // ── Build section HTML blocks
  const headerHTML = !t.showHeader ? "" : (() => {
    const isSplit = t.header.layout === "split";
    const isCentered = t.header.layout === "centered";
    const isBanner = t.header.layout === "banner";
    const mainStyle = isSplit
      ? "display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px"
      : `display:flex;align-items:flex-start;gap:16px${isCentered ? ";flex-direction:column;align-items:center;text-align:center" : ""}`;
    const bannerBg = isBanner ? `;background:linear-gradient(135deg,${accent} 0%,#7C4DFF 100%);color:#fff;border-radius:12px;padding:20px 24px;margin:-12px;margin-bottom:0` : "";
    const infoAlign = isSplit ? ";text-align:center" : "";
    const phonesStyle = isSplit
      ? "display:flex;flex-direction:column;gap:4px;font-size:10px;opacity:0.65"
      : "display:flex;flex-wrap:wrap;gap:16px;font-size:10.5px;opacity:0.65;margin-top:10px;border-top:1px solid rgba(0,0,0,0.06);padding-top:8px";
    return `
    <header style="${cssVars(ms(gs, t.header.style))};border-bottom:2px solid ${accent};padding-bottom:16px;margin-bottom:20px">
      <div style="${mainStyle}${bannerBg}">
        ${t.header.showLogo && settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px">` : ""}
        <div style="flex:1${infoAlign}">
          ${t.header.showNameKu ? `<div style="font-size:20px;font-weight:800;line-height:1.3">${settings.name}</div>` : ""}
          ${t.header.showNameEn && settings.nameEn ? `<div style="font-size:14px;font-weight:600;opacity:0.7;margin-top:2px">${settings.nameEn}</div>` : ""}
          ${t.header.showEstYear && settings.establishedYear ? `<div style="font-size:11px;opacity:0.6;margin-top:4px">دامەزراوەی ${settings.establishedYear}</div>` : ""}
          ${t.header.showBusinessDesc && settings.businessDesc ? `<div style="font-size:11px;opacity:0.7;margin-top:2px">${settings.businessDesc}</div>` : ""}
          ${t.header.showAddress && (settings.address || settings.city) ? `<div style="font-size:11px;opacity:0.65;margin-top:4px">📍 ${settings.address}${settings.city ? `، ${settings.city}` : ""}</div>` : ""}
        </div>
        ${isSplit ? `<div style="${phonesStyle}">` : ""}
      </div>
      ${!isSplit ? `<div style="${phonesStyle}">` : ""}
        ${t.header.showPhoneAdmin && settings.phoneAdmin ? `<span>بەڕێوەبەرایەتی: ${settings.phoneAdmin}</span>` : ""}
        ${t.header.showPhoneAccounting && settings.phoneAccounting ? `<span>ژمێریاری: ${settings.phoneAccounting}</span>` : ""}
        ${t.header.showPhoneIT && settings.phoneIT ? `<span>کۆمپیوتەر: ${settings.phoneIT}</span>` : ""}
        ${t.header.showPhoneSales && settings.phoneSales ? `<span>فرۆشتن: ${settings.phoneSales}</span>` : ""}
      </div>
    </header>`;
  })();

  const metaItems: string[] = [];
  if (t.invoiceMeta.showInvoiceNumber) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">ژمارە</span><span style="font-size:13px;font-weight:600">${order.orderNumber}</span></div>`);
  if (t.invoiceMeta.showDate) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">بەروار</span><span style="font-size:13px;font-weight:600">${formatDateKurdish(order.createdAt)}</span></div>`);
  if (t.invoiceMeta.showCopyLabel) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">جۆری نسخە</span><span style="font-size:13px;font-weight:600">ئەسڵی</span></div>`);
  if (t.invoiceMeta.showCustomerName) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">کڕیار</span><span style="font-size:13px;font-weight:600">${order.clientName}</span></div>`);
  if (t.invoiceMeta.showCurrency) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">دراو</span><span style="font-size:13px;font-weight:600">${settings.currency}</span></div>`);
  if (t.invoiceMeta.showRepName) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">نوێنەر</span><span style="font-size:13px;font-weight:600">${order.repName}</span></div>`);
  if (t.invoiceMeta.showPharmacyName && order.pharmacyName) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">فارمۆخانە</span><span style="font-size:13px;font-weight:600">${order.pharmacyName}</span></div>`);

  const metaHTML = !t.showInvoiceMeta ? "" : `
    <div style="${cssVars(ms(gs, t.invoiceMeta.style))};background:#F8F9FF;border-radius:12px;padding:16px 20px;border:1px solid #E8EAFF;margin-bottom:12px">
      <div style="font-size:16px;font-weight:700;color:${accent};margin-bottom:10px">پسووڵە</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px">${metaItems.join("")}</div>
    </div>`;

  const tableLayoutClass = t.table.layout || "default";
  const extraTableStyles = tableLayoutClass === "striped" ? `tbody tr:nth-child(even) { background: #F8F9FF; }` : "";
  const tableBorder = tableLayoutClass === "bordered" ? "border:1px solid #DEE2E6;" : "";
  const thStyle = tableLayoutClass === "minimal"
    ? `background:transparent;color:#1A1A2E;border-bottom:2px solid ${accent};`
    : `color:#fff;background:${accent};`;

  const tableHTML = !t.showItemsTable ? "" : `
    <div style="${cssVars(ms(gs, t.table.style))};margin-bottom:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px;${tableBorder}">
        <thead><tr>${thCells.join("")}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;

  // ── Summary (two-column layout)
  const cur = settings.currency || "IQD";
  const cd = clientData || { previousDebt: 0, receivedAmount: 0, totalDebt: 0, totalOrderCount: 0 };
  const sumRow = (label: string, value: string, bold = false, color = "") =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px dashed rgba(0,0,0,0.08)${bold ? ";font-weight:800;font-size:13px" : ""}${color ? `;color:${color}` : ""}"><span>${label}</span><span>${value}</span></div>`;

  // Left column: Order totals
  const leftRows: string[] = [];
  if (t.summary.showSubtotal) leftRows.push(sumRow("بڕی داواکاری", `${fmtNum(subtotal)} ${cur}`));
  if (t.summary.showDiscount) leftRows.push(sumRow(discountLabel, `${fmtNum(discount)} ${cur}`, false, "#DC2626"));
  if (t.summary.showNetTotal) leftRows.push(`<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:800;color:${accent};border-top:2px solid ${accent};margin-top:4px"><span>کۆی گشتی داواکاری</span><span>${fmtNum(netTotal)} ${cur}</span></div>`);
  if (t.summary.showAmountInWords) leftRows.push(`<div style="font-size:10px;opacity:0.6;padding:3px 0">بڕ بە پیت: ${fmtNum(netTotal)}</div>`);

  // Right column: Debt info
  const rightRows: string[] = [];
  if (t.summary.showPreviousDebt) rightRows.push(sumRow("قەرزی پێشوو", `${fmtNum(cd.previousDebt)} ${cur}`));
  if (t.summary.showReceivedAmount) rightRows.push(sumRow("بڕی وەرگیراو", `${fmtNum(cd.receivedAmount)} ${cur}`, false, cd.receivedAmount > 0 ? "#059669" : ""));
  if (t.summary.showTotalDebt) rightRows.push(`<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:800;color:#DC2626;border-top:2px solid #DC2626;margin-top:4px"><span>کۆی قەرز</span><span>${fmtNum(cd.totalDebt)} ${cur}</span></div>`);
  if (t.summary.showTotalOrderCount) rightRows.push(sumRow("ژمارەی داواکاری", `${cd.totalOrderCount}`));

  const hasRight = rightRows.length > 0;
  const summaryHTML = !t.showSummary ? "" : `
    <div style="${cssVars(ms(gs, t.summary.style))};display:flex;gap:24px;margin-top:12px;margin-bottom:12px">
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:${accent};margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${accent}33">داواکاری</div>
        ${leftRows.join("")}
      </div>
      ${hasRight ? `<div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #DC262633">قەرز</div>
        ${rightRows.join("")}
      </div>` : ""}
    </div>`;

  // ── Notes & Terms
  const notesHTML = t.showNotes && t.footer.showNotes && order.notes ? `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;margin-bottom:3px;color:${accent}">تێبینی</div><div style="font-size:11px;opacity:0.7;line-height:1.6">${order.notes}</div></div>` : "";
  const termsHTML = t.showTerms && t.footer.showTerms && t.footer.customTerms ? `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;margin-bottom:3px;color:${accent}">مەرج و ڕێسا</div><div style="font-size:11px;opacity:0.7;line-height:1.6">${t.footer.customTerms}</div></div>` : "";

  // ── QR Code
  let qrDataUrl = "";
  if (t.showQR && qrToken) {
    try {
      const qrMod = await import("qrcode");
      const toDataURL = qrMod.toDataURL || (qrMod.default && qrMod.default.toDataURL);
      if (toDataURL) {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://dewa.app";
        const qrUrl = `${baseUrl}/q/${qrToken}`;
        qrDataUrl = await toDataURL(qrUrl, {
          width: (t.qr.size || 120) * 2,
          margin: 1,
          color: { dark: "#1A1A2E", light: "#FFFFFF" },
        });
      }
    } catch (e) { console.warn("QR generation failed:", e); }
  }
  const qrImageHTML = qrDataUrl ? `
    <div style="text-align:${t.qr.position === "left" ? "left" : "right"}">
      <img src="${qrDataUrl}" alt="QR" style="width:${t.qr.size || 120}px;height:${t.qr.size || 120}px" />
      ${t.qr.showLabel ? `<div style="font-size:9px;opacity:0.5;margin-top:4px">سکانی بۆ بینینی قەرزەکان</div>` : ""}
    </div>` : "";

  const qrNotesHTML = (notesHTML || termsHTML || qrImageHTML) ? `
    <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:12px">
      <div style="flex:1">${notesHTML}${termsHTML}</div>
      ${qrImageHTML}
    </div>` : "";

  // ── Signature
  const sigBoxes = t.showSignature ? t.signature.labels.slice(0, t.signature.count).map((label, i) => `
    <div style="text-align:center;min-width:120px">
      ${signatureUrl && i === 0 ? `<img src="${signatureUrl}" alt="واژوو" style="max-width:140px;max-height:50px;object-fit:contain;margin-bottom:4px">` : ""}
      ${t.signature.showLine ? `<div style="border-bottom:1.5px solid #333;width:100%;margin-bottom:6px;height:40px"></div>` : ""}
      <div style="font-size:10.5px;font-weight:600;opacity:0.6">${label}</div>
    </div>
  `).join("") : "";
  const signatureHTML = !t.showSignature ? "" : `
    <div style="${cssVars(ms(gs, t.signature.style))};display:flex;justify-content:space-around;gap:24px;margin-top:24px;padding-top:12px">${sigBoxes}</div>`;

  // ── Footer
  const footerParts: string[] = [];
  if (t.footer.showPrintDateTime) footerParts.push(`<span>${printDate} — ${printTime}</span>`);
  if (t.footer.showPageNumber) footerParts.push(`<span>لاپەڕە ١</span>`);
  const footerHTML = !t.showFooter ? "" : `
    <footer style="${cssVars(ms(gs, t.footer.style))};display:flex;justify-content:center;gap:24px;font-size:10px;opacity:0.5;border-top:1px solid rgba(0,0,0,0.06);padding-top:10px;margin-top:auto">${footerParts.join("")}</footer>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
  <meta charset="utf-8">
  <title>پسووڵە - ${order.orderNumber}</title>
  <style>
    @page { margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${FONT_STACKS[t.globalFont]};
      color: #1A1A2E;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table th {
      font-weight: 700; font-size: 10.5px; letter-spacing: 0.03em;
      ${thStyle}
      padding: 8px 10px; text-align: right; white-space: nowrap;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    table th:first-child { border-radius: 0 8px 0 0; }
    table th:last-child  { border-radius: 8px 0 0 0; }
    table td {
      padding: 7px 10px; border-bottom: 1px solid #F0F0F0; font-size: 12px;
    }
    table tbody tr:last-child td { border-bottom: none; }
    ${extraTableStyles}
    @media print {
      body { background: #fff; }
      @page { margin: 8mm; }
    }
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: #999;
      padding: 4px 0;
    }
    @media screen { .page-footer { display: none; } }
  </style>
</head>
<body>
  <div class="page-footer" id="pageFooter"></div>
  <div style="width:${pageW};min-height:${pageMinH};padding:32px 40px;margin:0 auto;position:relative">
    ${t.watermark ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:700;color:rgba(0,0,0,0.04);transform:rotate(-30deg);pointer-events:none;z-index:0;user-select:none">${t.watermark}</div>` : ""}
    <div style="position:relative;z-index:1">
      ${headerHTML}
      ${metaHTML}
      ${tableHTML}
      ${summaryHTML}
      ${qrNotesHTML}
      ${signatureHTML}
      ${footerHTML}
    </div>
  </div>
  <script>
    // Calculate total pages and display page number
    (function() {
      var pageH = ${t.paperSize === "A5" ? 793 : 1123}; // approx A4/A5 height in px at 96dpi
      var contentH = document.body.scrollHeight;
      var totalPages = Math.max(1, Math.ceil(contentH / pageH));
      var footer = document.getElementById("pageFooter");
      if (footer) footer.textContent = "1/" + totalPages;
    })();
  </script>
</body>
</html>`;
}

// ── Print via popup window (most reliable cross-browser method) ──────────────

function printHTML(html: string): void {
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked — fallback to iframe
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    iframe.srcdoc = html;
    iframe.onload = () => {
      setTimeout(() => { try { iframe.contentWindow?.print(); } catch {} }, 500);
      setTimeout(() => iframe.remove(), 5000);
    };
    document.body.appendChild(iframe);
    return;
  }
  w.document.write(html);
  w.document.close();
  // Wait for content to render, then print
  setTimeout(() => {
    w.focus();
    w.print();
    // Auto-close after print dialog closes
    w.addEventListener("afterprint", () => w.close());
    // Fallback close if afterprint doesn't fire
    setTimeout(() => { try { w.close(); } catch {} }, 60000);
  }, 500);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Safely merge a partial template with all defaults */
function safeTemplate(t?: InvoiceTemplate): InvoiceTemplate {
  const d = DEFAULT_INVOICE_TEMPLATE;
  if (!t) return { id: "default", createdAt: new Date().toISOString(), ...d } as InvoiceTemplate;
  return {
    ...d,
    ...t,
    header:      { ...d.header,      ...(t.header || {}) },
    invoiceMeta: { ...d.invoiceMeta, ...(t.invoiceMeta || {}) },
    table:       { ...d.table,       ...(t.table || {}) },
    summary:     { ...d.summary,     ...(t.summary || {}) },
    qr:          { ...d.qr,          ...(t.qr || {}) },
    signature:   { ...d.signature,   ...(t.signature || {}) },
    footer:      { ...d.footer,      ...(t.footer || {}) },
  } as InvoiceTemplate;
}

/** Print an order invoice using the template from the store */
export async function printOrder(
  order: Order,
  settings: CompanySettings,
  opts: { signatureUrl?: string; template?: InvoiceTemplate; clientData?: ClientData; qrToken?: string } = {}
): Promise<void> {
  const t = safeTemplate(opts.template);
  const html = await buildInvoiceHTML(order, settings, t, opts.signatureUrl, opts.clientData, opts.qrToken);
  printHTML(html);
}

/** Print a sticker with customer name */
export function printSticker(order: Order, settings: CompanySettings): void {
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div style="width:75mm;padding:8mm 4mm;text-align:center">
    <div style="font-size:20px;font-weight:800;margin-bottom:6px">${order.clientName}</div>
    <div style="font-size:11px;color:#6B7280;margin-bottom:6px">${order.orderNumber}</div>
    <div style="font-size:10px;color:#9CA3AF">${settings.name || ""}</div>
    ${order.pharmacyName ? `<div style="font-size:10px;color:#9CA3AF">${order.pharmacyName}</div>` : ""}
  </div>
</body>
</html>`;
  printHTML(html);
}

/** Print a payment receipt (opens in new tab — needs server-side data) */
export function printPaymentReceipt(
  clientId: string,
  orderIds: string[],
  opts: { preview?: boolean } = {}
): void {
  const params = new URLSearchParams();
  params.set("orders", orderIds.join(","));
  if (!opts.preview) params.set("silent", "1");
  window.open(`/print/receipt/${encodeURIComponent(clientId)}?${params.toString()}`, "_blank");
}
