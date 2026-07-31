"use client";
// ============================================================
// DEWA — PrintButton
//
// Left click  → print immediately with default template
// Right click → context menu: choose template, signature, or
//               navigate to template editor
// ============================================================

import { Printer, FileText, PenLine, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuLabel,
  ContextMenuRadioGroup, ContextMenuRadioItem,
} from "@/components/ui/context-menu";
import { useData } from "@/lib/store";
import { printOrder } from "@/lib/print-engine";
import type { Order } from "@/lib/types";
import type { ClientData } from "@/lib/print-engine";

interface Props {
  order: Order;
  className?: string;
  iconOnly?: boolean;
}

export function PrintButton({ order, className, iconOnly = true }: Props) {
  const { settings, invoiceTemplates, savedSignatures, clients, orders } = useData();
  const router = useRouter();

  function buildClientData(): ClientData {
    const client = clients.find(c => c.id === order.clientId);
    const clientOrderCount = orders.filter(o => o.clientId === order.clientId).length;
    const currentBalance = client?.balance ?? 0;
    const previousDebt = currentBalance - order.totalAmount;
    return {
      previousDebt: Math.max(0, previousDebt),
      receivedAmount: 0,
      totalDebt: Math.max(0, currentBalance),
      totalOrderCount: clientOrderCount,
    };
  }

  // Print with default template (left click)
  function handlePrint() {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
    const defaultSig = savedSignatures.find(s => s.isDefault);
    printOrder(order, settings, {
      template,
      clientData: buildClientData(),
      signatureUrl: defaultSig?.imageUrl,
    });
  }

  // Print with specific template
  function handlePrintWithTemplate(templateId: string) {
    const template = invoiceTemplates.find(t => t.id === templateId) || invoiceTemplates[0];
    const defaultSig = savedSignatures.find(s => s.isDefault);
    printOrder(order, settings, {
      template,
      clientData: buildClientData(),
      signatureUrl: defaultSig?.imageUrl,
    });
  }

  // Print with specific signature
  function handlePrintWithSignature(sigUrl: string) {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
    printOrder(order, settings, {
      template,
      clientData: buildClientData(),
      signatureUrl: sigUrl,
    });
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Button
          size={iconOnly ? "icon" : "sm"}
          variant="ghost"
          className={iconOnly ? "size-7" : className || ""}
          title="چاپکردن (کلیکی ڕاست بۆ بژاردەکان)"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePrint();
          }}
        >
          <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
          {!iconOnly && "چاپ"}
        </Button>
      </ContextMenuTrigger>

      <ContextMenuContent dir="rtl" className="w-56">
        {/* ── Templates ── */}
        <ContextMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <FileText className="size-3" /> داڕێژەکان
        </ContextMenuLabel>
        {invoiceTemplates.length === 0 ? (
          <ContextMenuItem disabled className="text-xs text-muted-foreground">
            هیچ داڕێژەیەک نییە
          </ContextMenuItem>
        ) : (
          <ContextMenuRadioGroup value={invoiceTemplates.find(t => t.isDefault)?.id || ""}>
            {invoiceTemplates.map(t => (
              <ContextMenuRadioItem
                key={t.id}
                value={t.id}
                className="text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePrintWithTemplate(t.id);
                }}
              >
                {t.name || "بێ ناو"}
                {t.isDefault && <span className="text-[9px] text-primary ms-1">(بنەڕەتی)</span>}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        )}

        <ContextMenuSeparator />

        {/* ── Signatures ── */}
        {savedSignatures.length > 0 && (
          <>
            <ContextMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <PenLine className="size-3" /> واژووەکان
            </ContextMenuLabel>
            {savedSignatures.map(sig => (
              <ContextMenuItem
                key={sig.id}
                className="text-xs gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePrintWithSignature(sig.imageUrl);
                }}
              >
                <div className="size-5 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.imageUrl} alt="" className="max-h-4 max-w-4 object-contain" />
                </div>
                {sig.name}
                {sig.isDefault && <span className="text-[9px] text-primary ms-1">(بنەڕەتی)</span>}
              </ContextMenuItem>
            ))}
            <ContextMenuSeparator />
          </>
        )}

        {/* ── Go to editor ── */}
        <ContextMenuItem
          className="text-xs gap-1.5"
          onClick={() => router.push("/dashboard/settings/templates")}
        >
          <Settings2 className="size-3" /> ڕێکخستنی داڕێژەکان
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
