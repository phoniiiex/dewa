"use client";

/**
 * Instant print engine — renders documents in a hidden iframe
 * and triggers the browser print dialog without navigating away.
 *
 * Usage:
 *   printOrder(orderId)                  → prints with default template
 *   printOrder(orderId, { templateId })  → prints with specific template
 *   printOrder(orderId, { preview: true }) → opens preview tab instead
 */

const FRAME_ID = "dewa-print-frame";

export interface PrintOptions {
  templateId?: string;
  docType?: string;
  preview?: boolean;
}

function getOrCreateFrame(): HTMLIFrameElement {
  let frame = document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = FRAME_ID;
    frame.name = FRAME_ID;
    Object.assign(frame.style, {
      position: "fixed",
      width: "0",
      height: "0",
      border: "none",
      top: "-9999px",
      left: "-9999px",
      visibility: "hidden",
    });
    document.body.appendChild(frame);
  }
  return frame;
}

function buildPrintUrl(orderId: string, opts: PrintOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  if (opts.docType) params.set("doc", opts.docType);
  params.set("silent", "true");
  return `/print/${orderId}?${params.toString()}`;
}

/**
 * Print an order instantly using a hidden iframe.
 * Falls back to opening a new tab if iframe printing fails.
 */
export function printOrder(orderId: string, opts: PrintOptions = {}): void {
  // Preview mode — open in new tab with PrintShell overlay
  if (opts.preview) {
    const params = new URLSearchParams();
    if (opts.templateId) params.set("t", opts.templateId);
    if (opts.docType) params.set("doc", opts.docType);
    params.set("preview", "true");
    window.open(`/print/${orderId}?${params.toString()}`, "_blank");
    return;
  }

  // Instant print — hidden iframe
  const frame = getOrCreateFrame();
  const url = buildPrintUrl(orderId, opts);

  // Clean up previous listener
  frame.onload = null;

  frame.onload = () => {
    try {
      // Small delay to ensure CSS/fonts are loaded
      setTimeout(() => {
        frame.contentWindow?.print();
      }, 300);
    } catch {
      // Cross-origin fallback — open in new tab
      window.open(url.replace("silent=true", ""), "_blank");
    }
  };

  frame.src = url;
}

/**
 * Print a debt receipt for a client.
 * Routes to `/print/debt/[clientId]` endpoint.
 */
export function printDebtReceipt(
  clientId: string,
  opts: { templateId?: string; preview?: boolean } = {}
): void {
  if (opts.preview) {
    const params = new URLSearchParams();
    if (opts.templateId) params.set("t", opts.templateId);
    params.set("preview", "true");
    window.open(`/print/debt/${clientId}?${params.toString()}`, "_blank");
    return;
  }

  const frame = getOrCreateFrame();
  const params = new URLSearchParams();
  if (opts.templateId) params.set("t", opts.templateId);
  params.set("silent", "true");
  const url = `/print/debt/${clientId}?${params.toString()}`;

  frame.onload = null;
  frame.onload = () => {
    try {
      setTimeout(() => {
        frame.contentWindow?.print();
      }, 300);
    } catch {
      window.open(url.replace("silent=true", ""), "_blank");
    }
  };
  frame.src = url;
}
