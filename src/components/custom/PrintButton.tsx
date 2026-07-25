"use client";
// ============================================================
// DEWA — PrintButton (Client-Side Print)
//
// Left-click  → instant print via hidden iframe
// Right-click → context menu: quick print, print with signature
// ============================================================

import { useCallback } from "react";
import { Printer, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

  // ── Left-click: instant print ──
  const handleClick = useCallback(() => {
    printOrder(order, settings, { template: defaultTemplate });
  }, [order, settings, defaultTemplate]);

  // ── Print with signature ──
  const handlePrintWithSig = (sigUrl: string) => {
    printOrder(order, settings, { signatureUrl: sigUrl, template: defaultTemplate });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Button
          size={iconOnly ? "icon" : "sm"}
          variant="ghost"
          className={iconOnly ? "size-7" : className || ""}
          title="چاپکردن (ڕاست‌کلیک بۆ بژاردەکان)"
          onPointerDown={(e) => {
            if (e.button === 0) { // left click only
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
          {!iconOnly && "چاپ"}
        </Button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52 print-context-menu" dir="rtl">
        {/* Quick Print */}
        <ContextMenuItem onClick={() => printOrder(order, settings, { template: defaultTemplate })} className="gap-2">
          <Printer className="size-3.5" />
          چاپی خێرا
        </ContextMenuItem>

        {/* Print with Signature */}
        {savedSignatures.length > 0 && (
          <>
            <ContextMenuSeparator />
            {savedSignatures.map(sig => (
              <ContextMenuItem
                key={sig.id}
                onClick={() => handlePrintWithSig(sig.imageUrl)}
                className="gap-2"
              >
                <PenLine className="size-3.5" />
                <span className="text-xs truncate flex-1">چاپ بە واژوو{savedSignatures.length > 1 ? ` (${sig.name})` : ""}</span>
                {sig.isDefault && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">بنەڕەت</span>
                )}
              </ContextMenuItem>
            ))}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
