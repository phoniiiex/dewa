"use client";
import { useEffect } from "react";

interface Props {
  label: string;
  autoPrint: boolean;
  children: React.ReactNode;
}

// This client component:
// - Covers the dashboard chrome with a fixed overlay (screen)
// - Fires window.print() automatically on mount (when autoPrint=true)
// - Provides Print / Close buttons
// @media print rules hide the overlay frame itself
export function PrintShell({ label, autoPrint, children }: Props) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <>
      <style>{`
        /* ── Screen: full-viewport overlay so sidebar/nav are hidden ── */
        .ps-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #E5E7EB;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 64px;
          gap: 16px;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        }
        .ps-topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border-radius: 10px;
          padding: 8px 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          font-size: 13px;
          color: #374151;
          font-weight: 500;
        }
        .ps-btn {
          padding: 7px 18px;
          border-radius: 7px;
          background: #1A1A2E;
          color: white;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 150ms, transform 150ms cubic-bezier(0.23,1,0.32,1);
        }
        .ps-btn:hover  { opacity: 0.82; }
        .ps-btn:active { transform: scale(0.97); }
        .ps-btn-grey   { background: #6B7280; }
        .ps-doc {
          box-shadow: 0 4px 32px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04);
          border-radius: 4px;
          background: white;
        }

        /* ── Print: show only the document, hide everything else ── */
        @media print {
          .ps-root {
            position: static;
            background: white;
            padding: 0;
            display: block;
          }
          .ps-topbar { display: none !important; }
          .ps-doc {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
          }
          thead tr,
          .print-color-exact {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="ps-root">
        {/* Top bar — hidden when printing */}
        <div className="ps-topbar">
          <span>{label}</span>
          <button className="ps-btn" onClick={() => window.print()}>🖨 چاپکردن</button>
          <button className="ps-btn ps-btn-grey" onClick={() => window.close()}>✕ داخستن</button>
        </div>

        {/* The document itself */}
        <div className="ps-doc">
          {children}
        </div>
      </div>
    </>
  );
}
