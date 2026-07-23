/**
 * DEWA — Print Engine
 *
 * Handles printing via popup window (instant print) or new tab (preview).
 *
 *   printOrder(orderId)                         → prints with default template
 *   printOrder(orderId, { templateId })         → prints with specific template
 *   printOrder(orderId, { preview: true })      → opens preview tab instead
 *   printPaymentReceipt(clientId, orderIds)     → prints payment receipt
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintOptions {
  templateId?: string;   // specific template, else default
  preview?: boolean;     // true = open tab, false/undefined = silent popup print
}

// ── Build URL ────────────────────────────────────────────────────────────────

function buildPrintUrl(orderId: string, opts: PrintOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  if (!opts.preview) params.set("silent", "1");
  const qs = params.toString();
  return `/print/${encodeURIComponent(orderId)}${qs ? "?" + qs : ""}`;
}

// ── Print via popup window ───────────────────────────────────────────────────

function silentPrint(url: string): void {
  // Open a small popup window — PrintShell will trigger window.print() then close
  const popup = window.open(
    url,
    "__dewa_print",
    "width=900,height=700,menubar=no,toolbar=no,status=no,scrollbars=yes"
  );

  // If popup was blocked, fall back to new tab
  if (!popup) {
    window.open(url, "_blank");
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Print an order invoice (left-click = silent popup, preview = new tab) */
export function printOrder(orderId: string, opts: PrintOptions = {}): void {
  const url = buildPrintUrl(orderId, opts);

  if (opts.preview) {
    window.open(url, "_blank");
  } else {
    silentPrint(url);
  }
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

  if (opts.preview) {
    window.open(url, "_blank");
  } else {
    silentPrint(url);
  }
}
