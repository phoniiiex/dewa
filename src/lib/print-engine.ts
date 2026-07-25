/**
 * DEWA — Print Engine (100% Client-Side)
 *
 * Generates invoice HTML from store data and prints it using a hidden iframe.
 * No server routes, no new tabs — the OS print dialog appears directly.
 */

import type { Order, CompanySettings } from "@/lib/types";

export interface PrintOptions {
  templateId?: string;
  signatureId?: string;
  preview?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ckb-IQ", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ── Build invoice HTML ───────────────────────────────────────────────────────

function buildInvoiceHTML(order: Order, settings: CompanySettings, signatureUrl?: string): string {
  const items = order.items || [];
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const total = order.totalAmount || subtotal;

  const itemRows = items.map((it, i) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:12px;color:#6B7280">${i + 1}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:600">${it.productName}</td>
      ${it.batchNumber ? `<td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:12px">${it.batchNumber}</td>` : ""}
      ${it.category ? `<td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:12px">${it.category}</td>` : ""}
      <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:13px">${it.quantity}</td>
      ${it.bonusQty > 0 ? `<td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:13px;color:#059669">${it.bonusQty}</td>` : ""}
      <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:13px">${formatNumber(it.unitPrice)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:13px;font-weight:700">${formatNumber(it.quantity * it.unitPrice)}</td>
    </tr>
  `).join("");

  const hasBatch = items.some(it => it.batchNumber);
  const hasCat = items.some(it => it.category);
  const hasBonus = items.some(it => it.bonusQty > 0);

  const headerCols = [
    `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">#</th>`,
    `<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">بەرهەم</th>`,
    hasBatch ? `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">باچ</th>` : "",
    hasCat ? `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">جۆر</th>` : "",
    `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">عەدەد</th>`,
    hasBonus ? `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">بۆنەس</th>` : "",
    `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">نرخ</th>`,
    `<th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:#1A1A2E;border-bottom:2px solid #4263EB">کۆ</th>`,
  ].join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
  <meta charset="utf-8">
  <title>وەسڵ - ${order.orderNumber}</title>
  <style>
    @page { margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1A1A2E; background: #fff; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div style="max-width:750px;margin:0 auto;padding:16px">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #1A1A2E;margin-bottom:16px">
      <div>
        ${settings.logo ? `<img src="${settings.logo}" style="height:50px;max-width:140px;object-fit:contain" alt="logo">` : ""}
      </div>
      <div style="text-align:left">
        <div style="font-size:22px;font-weight:800;color:#1A1A2E">${settings.name || ""}</div>
        ${settings.nameEn ? `<div style="font-size:12px;color:#6B7280">${settings.nameEn}</div>` : ""}
        ${settings.phone ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px">📞 ${settings.phone}</div>` : ""}
      </div>
    </div>

    <!-- Invoice Meta -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:13px">
      <div style="background:#F8F9FA;padding:10px 14px;border-radius:8px">
        <span style="color:#6B7280;font-size:11px">ژمارەی وەسڵ</span>
        <div style="font-weight:800;font-size:16px;color:#4263EB">${order.orderNumber}</div>
      </div>
      <div style="background:#F8F9FA;padding:10px 14px;border-radius:8px">
        <span style="color:#6B7280;font-size:11px">بەروار</span>
        <div style="font-weight:600">${formatDate(order.createdAt)}</div>
      </div>
      <div style="background:#F8F9FA;padding:10px 14px;border-radius:8px">
        <span style="color:#6B7280;font-size:11px">کڕیار</span>
        <div style="font-weight:700">${order.clientName}</div>
      </div>
      <div style="background:#F8F9FA;padding:10px 14px;border-radius:8px">
        <span style="color:#6B7280;font-size:11px">نوێنەر</span>
        <div style="font-weight:600">${order.repName || "—"}</div>
      </div>
      ${order.pharmacyName ? `
      <div style="background:#F8F9FA;padding:10px 14px;border-radius:8px;grid-column:span 2">
        <span style="color:#6B7280;font-size:11px">دەرمانخانە</span>
        <div style="font-weight:600">${order.pharmacyName}</div>
      </div>` : ""}
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr>${headerCols}</tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Summary -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <div style="min-width:220px;background:#F8F9FA;border-radius:10px;padding:14px 18px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:#6B7280">کۆی گشتی</span>
          <span style="font-weight:800;font-size:16px;color:#1A1A2E">${formatNumber(total)} ${settings.currency || "IQD"}</span>
        </div>
      </div>
    </div>

    ${order.notes ? `
    <!-- Notes -->
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px">
      <strong style="color:#92400E">تێبینی:</strong> ${order.notes}
    </div>` : ""}

    ${signatureUrl ? `
    <!-- Signature -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <div style="text-align:center">
        <img src="${signatureUrl}" style="max-width:160px;max-height:60px;object-fit:contain" alt="signature">
        <div style="border-top:1px solid #D1D5DB;margin-top:6px;padding-top:4px;font-size:10px;color:#9CA3AF">واژوو</div>
      </div>
    </div>` : ""}

    <!-- Footer -->
    <div style="border-top:2px solid #E5E7EB;padding-top:10px;text-align:center;font-size:10px;color:#9CA3AF">
      ${settings.name || ""} ${settings.phone ? `• ${settings.phone}` : ""} ${settings.address ? `• ${settings.address}` : ""}
    </div>

  </div>
</body>
</html>`;
}

// ── Iframe-based print (no new tab) ──────────────────────────────────────────

function printHTML(html: string): void {
  // Remove any existing print iframe
  const existing = document.getElementById("__dewa_print_frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__dewa_print_frame";
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;border:none;visibility:hidden;";
  iframe.srcdoc = html;

  iframe.onload = () => {
    // Small delay for fonts/rendering
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch {
        // Fallback: open as blob URL
        const blob = new Blob([html], { type: "text/html" });
        window.open(URL.createObjectURL(blob), "_blank");
      }
      // Clean up after print dialog closes
      setTimeout(() => iframe.remove(), 3000);
    }, 300);
  };

  document.body.appendChild(iframe);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Print an order invoice — shows OS print dialog directly, no new tab */
export function printOrder(
  order: Order,
  settings: CompanySettings,
  opts: { signatureUrl?: string } = {}
): void {
  const html = buildInvoiceHTML(order, settings, opts.signatureUrl);
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
    body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; justify-content: center; }
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
/** Print a payment receipt (opens in new tab — needs server-side order aggregation) */
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

