/**
 * DEWA — Print Engine (Simple & Reliable)
 *
 * Opens the print page in a new window. The page's PrintShell component
 * handles auto-triggering window.print() when ?silent=1 is set.
 *
 *   printOrder(orderId)                         → opens print page + auto-prints
 *   printOrder(orderId, { templateId })         → prints with specific template
 *   printOrder(orderId, { preview: true })      → opens preview (no auto-print)
 *   printOrder(orderId, { signatureId })        → prints with a saved signature
 *   printPaymentReceipt(clientId, orderIds)     → prints payment receipt
 *   printSticker(orderId)                       → prints customer sticker with QR
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintOptions {
  templateId?: string;   // specific template, else default
  preview?: boolean;     // true = no auto-print, false/undefined = auto-print
  signatureId?: string;  // saved signature to include on the invoice
}

// ── Build URL ────────────────────────────────────────────────────────────────

function buildPrintUrl(orderId: string, opts: PrintOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  if (opts.signatureId) params.set("sig", opts.signatureId);
  if (!opts.preview) params.set("silent", "1");
  const qs = params.toString();
  return `/print/${encodeURIComponent(orderId)}${qs ? "?" + qs : ""}`;
}

// ── Simple window.open approach ──────────────────────────────────────────────

function openPrintPage(url: string): void {
  // Open in a new window/tab. PrintShell auto-calls window.print()
  // when it detects ?silent=1, then closes the window after printing.
  const w = window.open(url, "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");
  if (!w) {
    // Popup blocked — try as regular tab
    window.open(url, "_blank");
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Print an order invoice */
export function printOrder(orderId: string, opts: PrintOptions = {}): void {
  const url = buildPrintUrl(orderId, opts);
  openPrintPage(url);
}

/** Print a payment receipt for a client (debt payment) */
export function printPaymentReceipt(
  clientId: string,
  orderIds: string[],
  opts: { preview?: boolean } = {}
): void {
  const params = new URLSearchParams();
  params.set("orders", orderIds.join(","));
  if (!opts.preview) params.set("silent", "1");
  const url = `/print/receipt/${encodeURIComponent(clientId)}?${params.toString()}`;
  openPrintPage(url);
}

/** Print a customer sticker with QR code for an order */
export function printSticker(orderId: string): void {
  const url = `/print/sticker/${encodeURIComponent(orderId)}?silent=1`;
  openPrintPage(url);
}
