"use client";
// ============================================================
// DEWA — PrintButton
//
// One click → print with client debt data included.
// ============================================================

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { settings, invoiceTemplates, clients, orders } = useData();

  function handlePrint() {
    const template = invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0];

    // Compute client data for the right column of the summary
    const client = clients.find(c => c.id === order.clientId);
    const clientOrderCount = orders.filter(o => o.clientId === order.clientId).length;

    // client.balance is the current total debt
    const currentBalance = client?.balance ?? 0;
    // Previous debt = current balance minus this order's amount (since balance already includes it)
    const previousDebt = currentBalance - order.totalAmount;

    const clientData: ClientData = {
      previousDebt: Math.max(0, previousDebt),
      receivedAmount: 0,   // Would need payment history; 0 for now
      totalDebt: Math.max(0, currentBalance),
      totalOrderCount: clientOrderCount,
    };

    printOrder(order, settings, { template, clientData });
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
