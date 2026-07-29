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

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" });
  } catch { return iso.slice(0, 10); }
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

function buildInvoiceHTML(
  order: Order,
  settings: CompanySettings,
  template: InvoiceTemplate,
  signatureUrl?: string,
  clientData?: ClientData,
): string {
  const t = template;
  const gs: SectionStyle = { ...DEFAULT_SECTION_STYLE, fontFamily: t.globalFont, accentColor: t.primaryColor };
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  // Use order's own discount if set, otherwise fall back to template default
  const orderDiscountVal = order.discountValue || 0;
  const orderDiscountType = order.discountType || "AMOUNT";
  const discount = orderDiscountVal > 0
    ? (orderDiscountType === "PERCENTAGE" ? subtotal * (orderDiscountVal / 100) : orderDiscountVal)
    : (t.defaultDiscount > 0 ? subtotal * (t.defaultDiscount / 100) : 0);
  const discountLabel = orderDiscountVal > 0
    ? (orderDiscountType === "PERCENTAGE" ? `داشکاندن (${orderDiscountVal}%)` : "داشکاندن")
    : (t.defaultDiscount > 0 ? `داشکاندن (${t.defaultDiscount}%)` : "داشکاندن");
  const netTotal = subtotal - discount;
  const now = new Date();
  const printDate = now.toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" });
  const printTime = now.toLocaleTimeString("ku", { hour: "2-digit", minute: "2-digit" });
  const accent = t.primaryColor || "#4263EB";
  const pageW = t.paperSize === "A5" ? "148mm" : "210mm";
  const pageMinH = t.paperSize === "A5" ? "210mm" : "297mm";

  // ── Table header columns
  const thCells: string[] = [];
  if (t.table.showRowNumbers)   thCells.push("<th>#</th>");
  if (t.table.showProductName)  thCells.push("<th>ناوی بەرهەم</th>");
  if (t.table.showQuantity)     thCells.push("<th>بڕ</th>");
  if (t.table.showFreeQty)      thCells.push("<th>بۆنەس</th>");
  if (t.table.showUnitPrice)    thCells.push("<th>نرخی یەکە</th>");
  if (t.table.showLineTotal)    thCells.push("<th>کۆ</th>");
  if (t.table.showExpiryDate)   thCells.push("<th>بەسەرچوون</th>");
  if (t.table.showCompany)      thCells.push("<th>بەرهەمهێنەر</th>");
  if (t.table.showBatchNumber)  thCells.push("<th>ژمارەی باچ</th>");
  if (t.table.showProductType)  thCells.push("<th>جۆری بەرهەم</th>");

  // ── Table body rows
  const bodyRows = items.map((it, i) => {
    const cells: string[] = [];
    if (t.table.showRowNumbers)   cells.push(`<td>${i + 1}</td>`);
    if (t.table.showProductName)  cells.push(`<td>${it.productName}</td>`);
    if (t.table.showQuantity)     cells.push(`<td>${it.quantity}</td>`);
    if (t.table.showFreeQty)      cells.push(`<td>${it.bonusQty || "—"}</td>`);
    if (t.table.showUnitPrice)    cells.push(`<td>${fmtNum(it.unitPrice)}</td>`);
    if (t.table.showLineTotal)    cells.push(`<td>${fmtNum(it.quantity * it.unitPrice)}</td>`);
    if (t.table.showExpiryDate)   cells.push(`<td>${it.expiryDate || "—"}</td>`);
    if (t.table.showCompany)      cells.push(`<td>${it.company || "—"}</td>`);
    if (t.table.showBatchNumber)  cells.push(`<td>${it.batchNumber || "—"}</td>`);
    if (t.table.showProductType)  cells.push(`<td>${it.category || "—"}</td>`);
    return `<tr>${cells.join("")}</tr>`;
  }).join("");

  // ── Build section HTML blocks
  const headerHTML = !t.showHeader ? "" : `
    <header style="${cssVars(ms(gs, t.header.style))};border-bottom:2px solid ${accent};padding-bottom:16px;margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:16px${t.header.layout === "centered" ? ";flex-direction:column;align-items:center;text-align:center" : ""}">
        ${t.header.showLogo && settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px">` : ""}
        <div style="flex:1">
          ${t.header.showNameKu ? `<div style="font-size:20px;font-weight:800;line-height:1.3">${settings.name}</div>` : ""}
          ${t.header.showNameEn && settings.nameEn ? `<div style="font-size:14px;font-weight:600;opacity:0.7;margin-top:2px">${settings.nameEn}</div>` : ""}
          ${t.header.showEstYear && settings.establishedYear ? `<div style="font-size:11px;opacity:0.6;margin-top:4px">دامەزراوەی ${settings.establishedYear}</div>` : ""}
          ${t.header.showBusinessDesc && settings.businessDesc ? `<div style="font-size:11px;opacity:0.7;margin-top:2px">${settings.businessDesc}</div>` : ""}
          ${t.header.showAddress && (settings.address || settings.city) ? `<div style="font-size:11px;opacity:0.65;margin-top:4px">📍 ${settings.address}${settings.city ? `، ${settings.city}` : ""}</div>` : ""}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:10.5px;opacity:0.65;margin-top:10px;border-top:1px solid rgba(0,0,0,0.06);padding-top:8px">
        ${t.header.showPhoneAdmin && settings.phoneAdmin ? `<span>بەڕێوەبەرایەتی: ${settings.phoneAdmin}</span>` : ""}
        ${t.header.showPhoneAccounting && settings.phoneAccounting ? `<span>ژمێریاری: ${settings.phoneAccounting}</span>` : ""}
        ${t.header.showPhoneIT && settings.phoneIT ? `<span>کۆمپیوتەر: ${settings.phoneIT}</span>` : ""}
        ${t.header.showPhoneSales && settings.phoneSales ? `<span>فرۆشتن: ${settings.phoneSales}</span>` : ""}
      </div>
    </header>`;

  const metaItems: string[] = [];
  if (t.invoiceMeta.showInvoiceNumber) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">ژمارە</span><span style="font-size:13px;font-weight:600">${order.orderNumber}</span></div>`);
  if (t.invoiceMeta.showDate) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">بەروار</span><span style="font-size:13px;font-weight:600">${formatDate(order.createdAt)}</span></div>`);
  if (t.invoiceMeta.showCopyLabel) metaItems.push(`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;opacity:0.5;font-weight:600">نسخە</span><span style="font-size:13px;font-weight:600">نسخەی یەکەم</span></div>`);
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
  if (t.summary.showDiscount && discount > 0) leftRows.push(sumRow(discountLabel, `${fmtNum(discount)} ${cur}`, false, "#DC2626"));
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

  const qrNotesHTML = (notesHTML || termsHTML) ? `
    <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:12px">
      <div style="flex:1">${notesHTML}${termsHTML}</div>
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
    }
  </style>
</head>
<body>
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
export function printOrder(
  order: Order,
  settings: CompanySettings,
  opts: { signatureUrl?: string; template?: InvoiceTemplate; clientData?: ClientData } = {}
): void {
  const t = safeTemplate(opts.template);
  printHTML(buildInvoiceHTML(order, settings, t, opts.signatureUrl, opts.clientData));
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
