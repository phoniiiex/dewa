/**
 * DEWA — Print Engine
 *
 * Handles printing via hidden iframe (instant print) or new tab (preview).
 *
 *   printOrder(orderId)                         → prints with default template
 *   printOrder(orderId, { templateId })         → prints with specific template
 *   printOrder(orderId, { preview: true })      → opens preview tab instead
 *   printPaymentReceipt(clientId, orderIds)     → prints payment receipt
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintOptions {
  templateId?: string;   // specific template, else default
  preview?: boolean;     // true = open tab, false/undefined = silent iframe print
}

// ── Build URL ────────────────────────────────────────────────────────────────

function buildPrintUrl(orderId: string, opts: PrintOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  if (!opts.preview) params.set("silent", "1");
  const qs = params.toString();
  return `/print/${encodeURIComponent(orderId)}${qs ? "?" + qs : ""}`;
}

// ── Print via hidden iframe (silent printing) ────────────────────────────────

function silentPrint(url: string): void {
  // Create a hidden iframe, load the print page, trigger window.print() from it
  const existing = document.getElementById("__dewa_print_frame") as HTMLIFrameElement | null;
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__dewa_print_frame";
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;opacity:0;pointer-events:none";
  iframe.src = url;
  document.body.appendChild(iframe);

  // Auto-cleanup after 30s
  setTimeout(() => {
    try { iframe.remove(); } catch { /* noop */ }
  }, 30_000);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Print an order invoice (left-click = silent, preview = new tab) */
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
