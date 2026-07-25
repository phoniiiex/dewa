"use client";
// ============================================================
// DEWA — PrintShell
//
// Wraps print pages. When ?silent=1:
//   - Shows a top print bar with a big "Print" button
//   - Auto-triggers window.print() after content loads
//   - Auto-closes after printing
// ============================================================

import { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Mark ready after fonts + images load
    const init = async () => {
      try {
        await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]);

        const imgs = Array.from(document.querySelectorAll("img"));
        if (imgs.length > 0) {
          await Promise.race([
            Promise.all(imgs.map(img =>
              img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); })
            )),
            new Promise(r => setTimeout(r, 3000)),
          ]);
        }

        await new Promise(r => setTimeout(r, 300));
      } catch { /* proceed anyway */ }
      setReady(true);
    };
    init();
  }, []);

  // Auto-print when ready and silent
  useEffect(() => {
    if (!ready || !silent) return;
    const timer = setTimeout(() => window.print(), 200);
    return () => clearTimeout(timer);
  }, [ready, silent]);

  // Auto-close after print
  useEffect(() => {
    if (!silent) return;
    const close = () => setTimeout(() => { try { window.close(); } catch {} }, 500);
    window.addEventListener("afterprint", close);
    return () => window.removeEventListener("afterprint", close);
  }, [silent]);

  const doPrint = () => window.print();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { margin: 0; }
        body {
          font-family: ${FONT_STACKS[globalFont]};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #f3f4f6 !important;
          margin: 0;
        }
        @media screen {
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
        @media print {
          body { background: #fff !important; }
          .print-bar { display: none !important; }
        }
      `}} />

      {/* Print toolbar — visible on screen, hidden when printing */}
      {silent && (
        <div className="print-bar" style={{
          position: "sticky", top: 0, zIndex: 9999, width: "100%",
          background: "#1A1A2E", color: "white", padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "'Segoe UI', sans-serif", direction: "rtl",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {ready ? "✅ ئامادەیە بۆ چاپکردن" : "⏳ بارکردن..."}
          </span>
          <button
            onClick={doPrint}
            disabled={!ready}
            style={{
              background: ready ? "#059669" : "#4B5563",
              color: "white", border: "none", borderRadius: 8,
              padding: "8px 24px", fontSize: 14, fontWeight: 700,
              cursor: ready ? "pointer" : "wait",
              fontFamily: "'Segoe UI', sans-serif",
              transition: "all 0.2s",
            }}
          >
            🖨️ چاپکردن
          </button>
        </div>
      )}

      <div style={{ padding: silent ? "20px 16px" : "32px 16px", width: "100%", display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </>
  );
}
