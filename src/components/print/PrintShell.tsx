"use client";
// ============================================================
// DEWA — PrintShell
//
// Wraps the invoice page with:
//   - Auto window.print() for silent mode
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
    if (silent) {
      // Wait for fonts and images to load, then print
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
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
