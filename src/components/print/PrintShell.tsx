"use client";
// ============================================================
// DEWA — PrintShell
//
// Wraps the invoice page with:
//   - Reliable font/image loading detection
//   - postMessage to parent for iframe-based printing
//   - Auto window.print() for standalone popup/tab mode
//   - Print-optimized styles via <style> tag
// ============================================================

import { useEffect } from "react";
import type { SectionStyle } from "@/lib/types";

const FONT_STACKS: Record<SectionStyle["fontFamily"], string> = {
  zavi:   "'Zavi Gifts', 'Segoe UI', Tahoma, sans-serif",
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  naskh:  "'Noto Naskh Arabic', 'Segoe UI', sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
};

interface PrintShellProps {
  children: React.ReactNode;
  silent?: boolean;
  globalFont?: SectionStyle["fontFamily"];
}

export default function PrintShell({ children, silent, globalFont = "zavi" }: PrintShellProps) {
  useEffect(() => {
    if (!silent) return;

    let cancelled = false;

    const triggerPrint = () => {
      if (cancelled) return;

      // Notify parent iframe (if we're inside one) that we're ready
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage("__dewa_print_ready", "*");
          // When inside an iframe, the parent handles printing — don't auto-print
          return;
        }
      } catch {
        // Cross-origin — we're in a popup, auto-print below
      }

      // Standalone popup/tab mode — trigger print ourselves
      window.print();
    };

    // Wait for fonts AND images to load, then trigger print
    const waitAndPrint = async () => {
      try {
        // 1. Wait for fonts to load (with 3s timeout)
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]);

        // 2. Wait for all images to load (with 4s timeout)
        const images = Array.from(document.querySelectorAll("img"));
        if (images.length > 0) {
          await Promise.race([
            Promise.all(
              images.map(img =>
                img.complete
                  ? Promise.resolve()
                  : new Promise<void>(resolve => {
                      img.onload = () => resolve();
                      img.onerror = () => resolve(); // Don't block on failed images
                    })
              )
            ),
            new Promise(resolve => setTimeout(resolve, 4000)),
          ]);
        }

        // 3. Small buffer for layout settling
        await new Promise(resolve => setTimeout(resolve, 300));

        triggerPrint();
      } catch {
        // If anything fails, still try to print after a delay
        setTimeout(triggerPrint, 2000);
      }
    };

    waitAndPrint();

    // Close popup after printing is done (standalone mode only)
    const handleAfterPrint = () => {
      setTimeout(() => {
        try {
          if (window.parent === window) window.close();
        } catch { /* noop */ }
      }, 300);
    };
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [silent]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { margin: 0; }
        body {
          font-family: ${FONT_STACKS[globalFont]};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: ${silent ? '#fff' : '#f3f4f6'} !important;
        }
        @media screen {
          body {
            display: flex;
            justify-content: center;
            padding: ${silent ? '0' : '32px 16px'};
          }
        }
        @media print {
          body { background: #fff !important; }
        }
      `}} />
      {children}
    </>
  );
}
