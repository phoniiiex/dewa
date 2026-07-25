/**
 * DEWA — Print Engine
 *
 * Opens print pages in a new browser tab. Simple and reliable.
 * The print page (PrintShell) auto-triggers window.print() when ready.
 */

export interface PrintOptions {
  templateId?: string;
  preview?: boolean;
  signatureId?: string;
}

function buildPrintUrl(orderId: string, opts: PrintOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  if (opts.signatureId) params.set("sig", opts.signatureId);
  if (!opts.preview) params.set("silent", "1");
  const qs = params.toString();
  return `/print/${encodeURIComponent(orderId)}${qs ? "?" + qs : ""}`;
}

/** Open a URL for printing — always opens as a new tab */
function openForPrint(url: string): void {
  window.open(url, "_blank");
}

/** Print an order invoice */
export function printOrder(orderId: string, opts: PrintOptions = {}): void {
  openForPrint(buildPrintUrl(orderId, opts));
}

/** Print a payment receipt */
export function printPaymentReceipt(
  clientId: string,
  orderIds: string[],
  opts: { preview?: boolean } = {}
): void {
  const params = new URLSearchParams();
  params.set("orders", orderIds.join(","));
  if (!opts.preview) params.set("silent", "1");
  openForPrint(`/print/receipt/${encodeURIComponent(clientId)}?${params.toString()}`);
}

/** Print a customer sticker with QR code */
export function printSticker(orderId: string): void {
  openForPrint(`/print/sticker/${encodeURIComponent(orderId)}?silent=1`);
}
