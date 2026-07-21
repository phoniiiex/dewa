"use client";
import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  autoPrint: boolean;
  children: React.ReactNode;
}

export function PrintShell({ label, autoPrint, children }: Props) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <>
      <style>{`
        .ps-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: hsl(var(--muted) / 0.95);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 64px;
          gap: 16px;
        }
        .ps-topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          padding: 8px 12px 8px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          font-size: 13px;
          color: hsl(var(--foreground));
          font-weight: 500;
        }
        .ps-doc {
          box-shadow: 0 4px 32px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04);
          border-radius: 4px;
          background: white;
        }
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
        <div className="ps-topbar">
          <span>{label}</span>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => window.print()}>
            <Printer size={13} /> چاپکردن
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => window.close()}>
            <X size={13} /> داخستن
          </Button>
        </div>
        <div className="ps-doc">
          {children}
        </div>
      </div>
    </>
  );
}
