/**
 * DEWA — Print Engine (Reliable iframe-based printing)
 *
 * Uses a hidden iframe to load the print page, then triggers window.print()
 * once the page is fully loaded. Falls back to window.open if iframe fails.
 *
 *   printOrder(orderId)                         → prints with default template
 *   printOrder(orderId, { templateId })         → prints with specific template
 *   printOrder(orderId, { preview: true })      → opens preview tab instead
 *   printOrder(orderId, { signatureId })        → prints with a saved signature
 *   printPaymentReceipt(clientId, orderIds)     → prints payment receipt
 *   printSticker(orderId)                       → prints customer sticker with QR
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintOptions {
  templateId?: string;   // specific template, else default
  preview?: boolean;     // true = open tab, false/undefined = silent iframe print
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

// ── Iframe-based silent print ────────────────────────────────────────────────

let activeIframe: HTMLIFrameElement | null = null;

function cleanupIframe() {
  if (activeIframe) {
    try { activeIframe.remove(); } catch { /* noop */ }
    activeIframe = null;
  }
}

function iframePrint(url: string): void {
  // Clean up any previous iframe
  cleanupIframe();

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;opacity:0;pointer-events:none;";
  iframe.setAttribute("aria-hidden", "true");

  activeIframe = iframe;

  // Timeout safety — if nothing happens in 15 seconds, clean up and fall back
  const fallbackTimer = setTimeout(() => {
    cleanupIframe();
    // Fall back to opening in a new tab
    window.open(url, "_blank");
  }, 15000);

  iframe.onload = () => {
    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        clearTimeout(fallbackTimer);
        cleanupIframe();
        window.open(url, "_blank");
        return;
      }

      // Listen for the "ready-to-print" message from PrintShell
      const handleMessage = (e: MessageEvent) => {
        if (e.data === "__dewa_print_ready") {
          window.removeEventListener("message", handleMessage);
          clearTimeout(fallbackTimer);

          try {
            iframeWindow.print();
          } catch {
            // If print fails, open in new tab
            window.open(url, "_blank");
          }

          // Clean up iframe after a delay (give print dialog time to complete)
          setTimeout(cleanupIframe, 2000);
        }
      };
      window.addEventListener("message", handleMessage);

      // Also set a secondary timeout in case PrintShell message never fires
      // (e.g. template without the new PrintShell)
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        clearTimeout(fallbackTimer);
        try {
          iframeWindow.print();
        } catch {
          window.open(url, "_blank");
        }
        setTimeout(cleanupIframe, 2000);
      }, 5000);

    } catch {
      // Cross-origin or security error — fall back
      clearTimeout(fallbackTimer);
      cleanupIframe();
      window.open(url, "_blank");
    }
  };

  iframe.onerror = () => {
    clearTimeout(fallbackTimer);
    cleanupIframe();
    window.open(url, "_blank");
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Print an order invoice (left-click = silent iframe, preview = new tab) */
export function printOrder(orderId: string, opts: PrintOptions = {}): void {
  const url = buildPrintUrl(orderId, opts);

  if (opts.preview) {
    window.open(url, "_blank");
  } else {
    iframePrint(url);
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
    iframePrint(url);
  }
}

/** Print a customer sticker with QR code for an order */
export function printSticker(orderId: string): void {
  const params = new URLSearchParams();
  params.set("silent", "1");
  const url = `/print/sticker/${encodeURIComponent(orderId)}?${params.toString()}`;
  iframePrint(url);
}
