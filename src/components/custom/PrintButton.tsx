"use client";

import { useCallback } from "react";
import {
  Printer, Eye, Star, Wrench,
  FileText, Receipt, FileCheck, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useData } from "@/lib/store";
import { printOrder } from "@/lib/print-engine";
import type { Order, InvoiceTemplate } from "@/lib/types";
import { useRouter } from "next/navigation";

const DOC_ICONS: Record<string, React.ReactNode> = {
  invoice:  <FileText size={14} />,
  receipt:  <Receipt size={14} />,
  delivery: <FileCheck size={14} />,
  quote:    <FileText size={14} />,
};

const DOC_LABELS: Record<string, string> = {
  invoice:  "پسووڵە",
  receipt:  "وەسڵ",
  delivery: "وەرقەی گەیاندن",
  quote:    "نرخنامە",
};

interface PrintButtonProps {
  order: Order;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

/**
 * Smart print button:
 * - Left click → instant print with default template
 * - Right click → context menu with template selection
 */
export function PrintButton({
  order,
  size = "icon",
  variant = "ghost",
  className,
}: PrintButtonProps) {
  const router = useRouter();
  const { invoiceTemplates } = useData();

  // Find the default template
  const defaultTemplate = invoiceTemplates.find(t => t.isDefault) ?? null;

  // Group templates by doc type
  const templatesByType = invoiceTemplates.reduce<Record<string, InvoiceTemplate[]>>((acc, t) => {
    (acc[t.docType] ??= []).push(t);
    return acc;
  }, {});

  const handleLeftClick = useCallback(() => {
    printOrder(order.id, {
      templateId: defaultTemplate?.id,
      docType: defaultTemplate?.docType ?? "invoice",
    });
  }, [order.id, defaultTemplate]);

  const handlePrintWithTemplate = useCallback((template: InvoiceTemplate) => {
    printOrder(order.id, {
      templateId: template.id,
      docType: template.docType,
    });
  }, [order.id]);

  const handlePreview = useCallback((templateId?: string) => {
    printOrder(order.id, {
      templateId,
      preview: true,
    });
  }, [order.id]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Button
            size={size}
            variant={variant}
            className={size === "icon" ? `size-7 ${className ?? ""}` : className}
            onClick={handleLeftClick}
            title="چاپکردن (ڕاست کلیک بۆ هەڵبژاردنی داڕێژە)"
          />
        }
      >
        <Printer className={size === "icon" ? "size-3.5" : "size-4"} />
        {size !== "icon" && <span className="mr-1.5">چاپکردن</span>}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56" dir="rtl">
        {/* Quick print */}
        <ContextMenuItem
          onClick={handleLeftClick}
          className="gap-2"
        >
          <Printer size={14} />
          <span className="font-semibold">چاپی خێرا</span>
          {defaultTemplate && (
            <span className="text-xs text-muted-foreground mr-auto truncate max-w-24">
              {defaultTemplate.name}
            </span>
          )}
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Templates by doc type */}
        {(["invoice", "receipt", "delivery", "quote"] as const).map(docType => {
          const templates = templatesByType[docType];
          if (!templates?.length) return null;

          return (
            <ContextMenuSub key={docType}>
              <ContextMenuSubTrigger className="gap-2">
                {DOC_ICONS[docType]}
                {DOC_LABELS[docType]}
                <span className="text-xs text-muted-foreground mr-auto">
                  {templates.length}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48" dir="rtl">
                {templates.map(t => (
                  <ContextMenuItem
                    key={t.id}
                    onClick={() => handlePrintWithTemplate(t)}
                    className="gap-2"
                  >
                    {t.isDefault && <Star size={12} className="text-amber-500 fill-amber-500" />}
                    <span className="truncate">{t.name}</span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        })}

        <ContextMenuSeparator />

        {/* Preview */}
        <ContextMenuItem
          onClick={() => handlePreview(defaultTemplate?.id)}
          className="gap-2"
        >
          <Eye size={14} />
          پیشبینی پێش چاپ
        </ContextMenuItem>

        {/* Build new template */}
        <ContextMenuItem
          onClick={() => router.push("/dashboard/invoices/builder")}
          className="gap-2"
        >
          <Wrench size={14} />
          داڕێژەی نوێ دروست بکە
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
