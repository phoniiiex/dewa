"use client";
// ============================================================
// DEWA — PrintButton
//
// Dead simple: one button, one click, one print.
// ============================================================

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { printOrder } from "@/lib/print-engine";
import type { Order } from "@/lib/types";

interface Props {
  order: Order;
  className?: string;
  iconOnly?: boolean;
}

export function PrintButton({ order, className, iconOnly = true }: Props) {
  const { settings, invoiceTemplates } = useData();

  function handlePrint() {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];
    printOrder(order, settings, { template });
  }

  return (
    <Button
      size={iconOnly ? "icon" : "sm"}
      variant="ghost"
      className={iconOnly ? "size-7" : className || ""}
      title="چاپکردن"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      }}
    >
      <Printer className={iconOnly ? "size-3.5" : "size-3.5 me-1"} />
      {!iconOnly && "چاپ"}
    </Button>
  );
}
