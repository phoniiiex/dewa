"use client";
// ============================================================
// DEWA — PrintButton
//
// Left click  → print immediately with default template
// Right click → popover menu: choose template, signature, or
//               navigate to template editor
// ============================================================

import { useState, useCallback } from "react";
import { Printer, FileText, PenLine, Settings2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const buildClientData = useCallback((): ClientData => {
    const client = clients.find(c => c.id === order.clientId);
    const clientOrders = orders.filter(o => o.clientId === order.clientId && o.status !== "PAID" && o.status !== "NOT_ACCEPTED");
    const clientOrderCount = clientOrders.length;
    const currentBalance = client?.balance ?? 0;
    const previousDebt = currentBalance - order.totalAmount;
    return {
      previousDebt: Math.max(0, previousDebt),
      receivedAmount: 0,
      totalDebt: Math.max(0, currentBalance),
      totalOrderCount: clientOrderCount,
    };
  }, [clients, orders, order]);

  const client = clients.find(c => c.id === order.clientId);
  const qrToken = client?.qrToken || "";

  // Print with default template (left click)
  function handlePrint() {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
    const defaultSig = savedSignatures.find(s => s.isDefault);
    printOrder(order, settings, {
      template,
      clientData: buildClientData(),
      signatureUrl: defaultSig?.imageUrl,
      qrToken,
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
      qrToken,
    });
    setMenuOpen(false);
  }

  // Print with specific signature
  function handlePrintWithSignature(sigUrl: string) {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
    printOrder(order, settings, {
      template,
      clientData: buildClientData(),
      signatureUrl: sigUrl,
      qrToken,
    });
    setMenuOpen(false);
  }

  const defaultTemplate = invoiceTemplates.find(t => t.isDefault);

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger
        render={<Button
          size={iconOnly ? "icon" : "sm"}
          variant="ghost"
          className={iconOnly ? "size-7" : className || ""}
          title="چاپکردن (کلیکی ڕاست بۆ بژاردەکان)"
        />}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePrint();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(true);
        }}
      >
        <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
        {!iconOnly && "چاپ"}
      </PopoverTrigger>

      <PopoverContent dir="rtl" className="w-56 p-1.5" align="start" side="bottom">
        {/* ── Templates ── */}
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
          <FileText className="size-3" /> داڕێژەکان
        </div>
        {invoiceTemplates.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">هیچ داڕێژەیەک نییە</div>
        ) : (
          invoiceTemplates.map(t => (
            <button
              key={t.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/70 transition-colors text-start"
              onClick={(e) => { e.stopPropagation(); handlePrintWithTemplate(t.id); }}
            >
              <div className="size-3.5 flex items-center justify-center">
                {t.id === defaultTemplate?.id && <Check className="size-3 text-primary" />}
              </div>
              {t.name || "بێ ناو"}
              {t.isDefault && <span className="text-[9px] text-primary ms-auto">(بنەڕەتی)</span>}
            </button>
          ))
        )}

        {/* ── Signatures ── */}
        {savedSignatures.length > 0 && (
          <>
            <Separator className="my-1" />
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
              <PenLine className="size-3" /> واژووەکان
            </div>
            {savedSignatures.map(sig => (
              <button
                key={sig.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/70 transition-colors text-start"
                onClick={(e) => { e.stopPropagation(); handlePrintWithSignature(sig.imageUrl); }}
              >
                <div className="size-5 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.imageUrl} alt="" className="max-h-4 max-w-4 object-contain" />
                </div>
                {sig.name}
                {sig.isDefault && <span className="text-[9px] text-primary ms-auto">(بنەڕەتی)</span>}
              </button>
            ))}
          </>
        )}

        <Separator className="my-1" />

        {/* ── Go to editor ── */}
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/70 transition-colors text-start"
          onClick={() => { setMenuOpen(false); router.push("/dashboard/settings/templates"); }}
        >
          <Settings2 className="size-3.5" /> ڕێکخستنی داڕێژەکان
        </button>
      </PopoverContent>
    </Popover>
  );
}
