"use client";
// ============================================================
// DEWA — PrintButton (Client-Side Print)
//
// Click       → instant print via hidden iframe
// Right-click → context menu: quick print, print with signature
// ============================================================

import { useCallback, useState, useRef, useEffect } from "react";
import { Printer, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { printOrder } from "@/lib/print-engine";
import type { Order } from "@/lib/types";

interface PrintButtonProps {
  order: Order;
  className?: string;
  iconOnly?: boolean;
}

export function PrintButton({ order, className, iconOnly = true }: PrintButtonProps) {
  const { settings, savedSignatures, invoiceTemplates } = useData();
  const defaultTemplate = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // ── Left-click: instant print ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    printOrder(order, settings, { template: defaultTemplate });
  }, [order, settings, defaultTemplate]);

  // ── Right-click: show menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(prev => !prev);
  }, []);

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <Button
        size={iconOnly ? "icon" : "sm"}
        variant="ghost"
        className={iconOnly ? "size-7" : className || ""}
        title="چاپکردن (ڕاست‌کلیک بۆ بژاردەکان)"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
        {!iconOnly && "چاپ"}
      </Button>

      {/* Custom context menu */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          dir="rtl"
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            onClick={() => {
              printOrder(order, settings, { template: defaultTemplate });
              setMenuOpen(false);
            }}
          >
            <Printer className="size-3.5" />
            چاپی خێرا
          </button>

          {savedSignatures.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              {savedSignatures.map(sig => (
                <button
                  key={sig.id}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    printOrder(order, settings, { signatureUrl: sig.imageUrl, template: defaultTemplate });
                    setMenuOpen(false);
                  }}
                >
                  <PenLine className="size-3.5" />
                  <span className="truncate flex-1 text-right">چاپ بە واژوو{savedSignatures.length > 1 ? ` (${sig.name})` : ""}</span>
                  {sig.isDefault && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">بنەڕەت</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
