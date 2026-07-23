"use client";
// ============================================================
// DEWA — PrintButton (New Print System)
//
// Left-click  → instant print with default template
// Right-click → context menu: template picker + build new + preview
// ============================================================

import { useState, useCallback } from "react";
import { Printer, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useData } from "@/lib/store";
import { printOrder } from "@/lib/print-engine";
import type { Order, InvoiceTemplate } from "@/lib/types";
import InvoiceBuilder from "@/components/print/InvoiceBuilder";

interface PrintButtonProps {
  order: Order;
  className?: string;
  iconOnly?: boolean;
}

export function PrintButton({ order, className, iconOnly = true }: PrintButtonProps) {
  const { invoiceTemplates } = useData();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTemplate, setBuilderTemplate] = useState<InvoiceTemplate | null>(null);

  // Find default template (first with isDefault, or first available)
  const defaultTemplate = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];

  // ── Left-click: instant print with default ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    printOrder(order.id, { templateId: defaultTemplate?.id });
  }, [order.id, defaultTemplate?.id]);

  // ── Context menu item: print with specific template ──
  const handlePrintWith = (templateId: string) => {
    printOrder(order.id, { templateId });
  };

  // ── Context menu item: preview ──
  const handlePreview = () => {
    printOrder(order.id, { preview: true, templateId: defaultTemplate?.id });
  };

  // ── Context menu item: new template ──
  const handleNewTemplate = () => {
    setBuilderTemplate(null);
    setBuilderOpen(true);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            className="inline-flex"
            title="چاپکردن (ڕاست‌کلیک بۆ بژاردەکان)"
          >
            <Button
              size={iconOnly ? "icon" : "sm"}
              variant="ghost"
              className={iconOnly ? "size-7 pointer-events-none" : `${className || ""} pointer-events-none`}
              tabIndex={-1}
            >
              <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
              {!iconOnly && "چاپ"}
            </Button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 print-context-menu" dir="rtl">
          {/* Quick Print (default) */}
          <ContextMenuItem onClick={() => printOrder(order.id, { templateId: defaultTemplate?.id })} className="gap-2">
            <Printer className="size-3.5" />
            چاپی خێرا
            {defaultTemplate && (
              <span className="text-[10px] text-muted-foreground ms-auto truncate max-w-20">{defaultTemplate.name}</span>
            )}
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Saved templates */}
          {invoiceTemplates.length > 0 && (
            <>
              {invoiceTemplates.map(t => (
                <ContextMenuItem
                  key={t.id}
                  onClick={() => handlePrintWith(t.id)}
                  className="gap-2"
                >
                  <span className="text-xs truncate flex-1">{t.name}</span>
                  {t.isDefault && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">بنەڕەت</span>
                  )}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
            </>
          )}

          {/* New template */}
          <ContextMenuItem onClick={handleNewTemplate} className="gap-2 text-primary">
            <Plus className="size-3.5" />
            داڕێژەی نوێ
          </ContextMenuItem>

          {/* Preview */}
          <ContextMenuItem onClick={handlePreview} className="gap-2">
            <Eye className="size-3.5" />
            پیشبینی
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Invoice Builder Drawer */}
      {builderOpen && (
        <InvoiceBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          editTemplate={builderTemplate}
        />
      )}
    </>
  );
}
