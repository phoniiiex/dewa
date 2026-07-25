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

    const waitAndPrint = async () => {
      try {
        // 1. Wait for fonts (with 3s timeout)
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]);

        // 2. Wait for all images (with 4s timeout)
        const images = Array.from(document.querySelectorAll("img"));
        if (images.length > 0) {
          await Promise.race([
            Promise.all(
              images.map(img =>
                img.complete
                  ? Promise.resolve()
                  : new Promise<void>(resolve => {
                      img.onload = () => resolve();
                      img.onerror = () => resolve();
                    })
              )
            ),
            new Promise(resolve => setTimeout(resolve, 4000)),
          ]);
        }

        // 3. Small buffer for layout settling
        await new Promise(resolve => setTimeout(resolve, 400));

        if (!cancelled) window.print();
      } catch {
        if (!cancelled) setTimeout(() => window.print(), 2000);
      }
    };

    waitAndPrint();

    // Close window after printing is done
    const handleAfterPrint = () => {
      setTimeout(() => {
        try { window.close(); } catch { /* noop */ }
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
