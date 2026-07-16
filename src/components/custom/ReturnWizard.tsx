"use client";
import { useState, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, ChevronRight, ChevronLeft, PackageX,
  Search, X, Plus, AlertCircle, Info, TrendingDown,
  ShoppingBag, Award, CircleDot,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order, ReturnItem, ReturnRecord } from "@/lib/types";
import { RETURN_BONUS_RATE } from "@/lib/types";

// ── Inline alert box (Alert component not available) ─────────────────────────
function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "success" }) {
  const styles = {
    info:    "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    warn:    "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
  };
  const icons = {
    info: <Info size={13} className="shrink-0 mt-0.5"/>,
    warn: <AlertCircle size={13} className="shrink-0 mt-0.5"/>,
    success: <CheckCircle2 size={13} className="shrink-0 mt-0.5"/>,
  };
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2 text-xs ${styles[variant]}`}>
      {icons[variant]}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcBonus(qty: number) { return Math.floor(qty * RETURN_BONUS_RATE); }
function calcPaid(qty: number)  { return qty - calcBonus(qty); }

// ── Order match scoring ───────────────────────────────────────────────────────
interface OrderMatch {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  originalQty: number;
  unitPrice: number;
  alreadyReturned: number;
  returnable: number;
  canTake: number;
  coverageScore: number;
  confidence: "high" | "medium" | "low";
}

function getMatches(
  clientId: string,
  productId: string,
  returnedQty: number,
  orders: Order[],
  existingReturns: ReturnRecord[],
): OrderMatch[] {
  const now = Date.now();
  const eligible = orders.filter(
    (o) =>
      o.clientId === clientId &&
      ["SENT", "DELIVERED", "PAID"].includes(o.status) &&
      o.items.some((i) => i.productId === productId),
  );

  return eligible
    .map((order) => {
      const item = order.items.find((i) => i.productId === productId)!;
      const originalQty = item.quantity + item.bonusQty;
      const unitPrice = item.unitPrice;

      const alreadyReturned = existingReturns
        .filter((r) => r.status !== "REJECTED")
        .flatMap((r) => r.items)
        .filter((ri) => ri.fromOrderId === order.id && ri.productId === productId)
        .reduce((s, ri) => s + ri.returnedQty, 0);

      const returnable = Math.max(0, originalQty - alreadyReturned);
      const canTake = Math.min(returnedQty, returnable);
      const coverageScore = returnedQty === 0 ? 0 : canTake / returnedQty;
      const ageDays = (now - new Date(order.createdAt).getTime()) / 86_400_000;

      const confidence: OrderMatch["confidence"] =
        coverageScore >= 0.9 && ageDays < 60 ? "high" :
        coverageScore >= 0.5 || ageDays < 60 ? "medium" : "low";

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        originalQty,
        unitPrice,
        alreadyReturned,
        returnable,
        canTake,
        coverageScore,
        confidence: returnable === 0 ? "low" : confidence,
      };
    })
    .sort(
      (a, b) =>
        b.coverageScore - a.coverageScore ||
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    )
    .slice(0, 5);
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfBadge({ c }: { c: OrderMatch["confidence"] }) {
  const map = {
    high:   { label: "پێشنیاری بەرز",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", dot: "bg-emerald-500" },
    medium: { label: "پێشنیاری ناوەند",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",   dot: "bg-amber-500" },
    low:    { label: "پێشنیاری کەم",     cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",       dot: "bg-rose-500" },
  };
  const { label, cls, dot } = map[c];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      <span className={`size-1.5 rounded-full ${dot}`}/>{label}
    </span>
  );
}

// ── Step bar ──────────────────────────────────────────────────────────────────
const STEPS = ["کڕیار", "بەرهەم", "داواکاری", "پشتڕاستکردن"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1 py-4 px-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                i < step  ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle2 size={13}/> : i + 1}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${i === step ? "text-primary" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-6 mb-4 transition-colors ${i < step ? "bg-primary" : "bg-border"}`}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Draft item ────────────────────────────────────────────────────────────────
interface DraftItem {
  productId: string;
  productName: string;
  returnedQty: number;
  selectedOrderId: string | null;
  selectedOrderNumber: string;
  unitPrice: number;
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  editReturn?: ReturnRecord | null;
}

export function ReturnWizard({ open, onClose, editReturn }: Props) {
  const { clients, products, orders, returns, addReturn, updateReturn, showToast } = useData();
  const [step, setStep] = useState(0);

  // Step 1
  const [clientId, setClientId]       = useState(editReturn?.clientId ?? "");
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen]   = useState(false);

  // Step 2
  const [draftItems, setDraftItems] = useState<DraftItem[]>(
    editReturn?.items.map((ri) => ({
      productId: ri.productId,
      productName: ri.productName,
      returnedQty: ri.returnedQty,
      selectedOrderId: ri.fromOrderId || null,
      selectedOrderNumber: ri.fromOrderNumber || "",
      unitPrice: ri.unitPrice,
    })) ?? [],
  );
  const [productSearch, setProductSearch] = useState("");
  const [productOpen, setProductOpen]     = useState(false);

  // Step 4
  const [notes, setNotes] = useState(editReturn?.notes ?? "");

  const selectedClient = clients.find((c) => c.id === clientId);

  // Build final items from drafts
  const finalItems: ReturnItem[] = draftItems.map((d) => {
    const bonusQty = calcBonus(d.returnedQty);
    const paidQty  = calcPaid(d.returnedQty);
    return {
      productId: d.productId,
      productName: d.productName,
      returnedQty: d.returnedQty,
      bonusQty,
      paidQty,
      unitPrice: d.unitPrice,
      debtCredit: paidQty * d.unitPrice,
      fromOrderId: d.selectedOrderId ?? "",
      fromOrderNumber: d.selectedOrderNumber,
    };
  });

  const totalReturnedUnits = finalItems.reduce((s, i) => s + i.returnedQty, 0);
  const totalBonusUnits    = finalItems.reduce((s, i) => s + i.bonusQty,    0);
  const totalPaidUnits     = finalItems.reduce((s, i) => s + i.paidQty,     0);
  const totalDebtCredit    = finalItems.reduce((s, i) => s + i.debtCredit,  0);

  function reset() {
    setStep(0);
    setClientId("");
    setClientSearch("");
    setDraftItems([]);
    setNotes("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleConfirm() {
    if (!selectedClient) return;
    const payload = {
      clientId,
      clientName: selectedClient.name,
      status: "PENDING" as const,
      items: finalItems,
      notes,
      totalReturnedUnits,
      totalBonusUnits,
      totalPaidUnits,
      totalDebtCredit,
    };
    if (editReturn) {
      await updateReturn(editReturn.id, payload);
      showToast("گەڕاوە نوێکرایەوە ✅");
    } else {
      await addReturn(payload);
    }
    handleClose();
  }

  // ── Step 1: Customer ─────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <Label className="text-sm font-semibold mb-2 block">کڕیار / داروخانە هەڵبژێرە</Label>
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger>
            <div className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors">
              {selectedClient ? (
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{selectedClient.name}</span>
                  <span className="text-muted-foreground text-xs">{selectedClient.city}</span>
                </span>
              ) : <span className="text-muted-foreground">کڕیار هەڵبژێرە...</span>}
              <Search size={14} className="text-muted-foreground"/>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <Command>
              <CommandInput placeholder="گەڕان بەناو..." value={clientSearch} onValueChange={setClientSearch}/>
              <CommandList>
                <CommandEmpty>کڕیارێک نەدۆزرایەوە</CommandEmpty>
                <CommandGroup>
                  {clients
                    .filter((c) => c.isActive && c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                    .slice(0, 30)
                    .map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => { setClientId(c.id); setClientOpen(false); }}
                      >
                        <div className="flex justify-between w-full">
                          <span>{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.city}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedClient && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <p className="font-bold text-base">{selectedClient.name}</p>
          <p className="text-muted-foreground text-xs">{selectedClient.city} · {selectedClient.phone}</p>
          <Separator className="my-2"/>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">قەرزی ئێستا</span>
            <span className="font-bold text-rose-600">{formatIQD(selectedClient.balance)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>داواکارییەکانی تەواو</span>
            <span>{orders.filter((o) => o.clientId === selectedClient.id && ["SENT","DELIVERED","PAID"].includes(o.status)).length} داواکاری</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: Items ────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">بەرهەمی گەڕاوە زیاد بکە</Label>
        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger>
            <div className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-input bg-background cursor-pointer hover:bg-accent/50 transition-colors font-medium">
              <Plus size={12}/> بەرهەم زیادکردن
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="end">
            <Command>
              <CommandInput placeholder="گەڕان بەناو..." value={productSearch} onValueChange={setProductSearch}/>
              <CommandList>
                <CommandEmpty>بەرهەمێک نەدۆزرایەوە</CommandEmpty>
                <CommandGroup>
                  {products
                    .filter((p) => p.isActive && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .slice(0, 40)
                    .map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.id}
                        disabled={draftItems.some((d) => d.productId === p.id)}
                        onSelect={() => {
                          if (draftItems.some((d) => d.productId === p.id)) return;
                          setDraftItems((prev) => [
                            ...prev,
                            { productId: p.id, productName: p.name, returnedQty: 1, selectedOrderId: null, selectedOrderNumber: "", unitPrice: p.price },
                          ]);
                          setProductOpen(false);
                          setProductSearch("");
                        }}
                      >
                        <div className="flex justify-between w-full">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">{formatIQD(p.price)}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {draftItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
          <PackageX size={32} className="mx-auto mb-2 opacity-30"/>
          هیچ بەرهەمێک زیادنەکراوە
        </div>
      ) : (
        <div className="space-y-3">
          {draftItems.map((d, idx) => {
            const bonus = calcBonus(d.returnedQty);
            const paid  = calcPaid(d.returnedQty);
            return (
              <div key={d.productId} className="border rounded-xl p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{d.productName}</span>
                  <button
                    className="size-6 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X size={13}/>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground shrink-0">بڕی گەڕاو</Label>
                  <Input
                    type="number"
                    min={1}
                    value={d.returnedQty}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((x, i) => i === idx ? { ...x, returnedQty: Math.max(1, +e.target.value) } : x)
                      )
                    }
                    className="h-8 w-24 text-center text-sm"
                  />
                </div>

                {/* 30% breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/60 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground font-medium">کۆی گەڕاوە</p>
                    <p className="font-bold text-sm">{d.returnedQty}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 border border-amber-200/50">
                    <p className="text-[10px] text-amber-600 font-medium flex items-center justify-center gap-0.5">
                      <Award size={9}/> بۆنەس ٣٠٪
                    </p>
                    <p className="font-bold text-sm text-amber-700 dark:text-amber-300">{bonus}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2 border border-emerald-200/50">
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-0.5">
                      <TrendingDown size={9}/> قەرز کەم دەبێت
                    </p>
                    <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300">{paid}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t">
                  <span>کەمکردنەوەی قەرز:</span>
                  <span className="font-bold text-foreground">{formatIQD(paid * d.unitPrice)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Step 3: Order matching ────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="flex flex-col gap-4 p-6">
      <InfoBox variant="info">
        سیستەمەکە داواکارییەکانی پێشنیارکراوی پیدەبینێت بەپێی کڕیار و بەرهەم. دەتوانیت بگۆڕیتەوە.
      </InfoBox>

      <ScrollArea className="max-h-[420px] pr-1">
        <div className="space-y-6">
          {draftItems.map((d, idx) => {
            const matches = getMatches(clientId, d.productId, d.returnedQty, orders, returns);

            return (
              <div key={d.productId} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShoppingBag size={14} className="text-primary"/>
                  <span className="font-semibold text-sm">{d.productName}</span>
                  <Badge variant="secondary" className="text-[10px]">{d.returnedQty} دانە</Badge>
                </div>

                {matches.length === 0 ? (
                  <InfoBox variant="warn">
                    هیچ داواکارییەکی گونجاو نەدۆزرایەوە — داواکارییەکی تر نییە بۆ ئەم کڕیارە
                  </InfoBox>
                ) : (
                  <div className="space-y-2">
                    {matches.map((m) => {
                      const isSelected = d.selectedOrderId === m.orderId ||
                        (d.selectedOrderId === null && matches[0].orderId === m.orderId);
                      return (
                        <button
                          key={m.orderId}
                          type="button"
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? { ...x, selectedOrderId: m.orderId, selectedOrderNumber: m.orderNumber, unitPrice: m.unitPrice }
                                  : x
                              )
                            )
                          }
                          className={`w-full text-right border rounded-xl p-3 transition-all text-sm ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{m.orderNumber}</span>
                                <ConfBadge c={m.confidence}/>
                              </div>
                              <p className="text-xs text-muted-foreground">{m.orderDate}</p>
                              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-1">
                                <span>ڕەسەن: <b className="text-foreground">{m.originalQty}</b></span>
                                <span>گەڕاوەی پێشوو: <b className="text-foreground">{m.alreadyReturned}</b></span>
                                <span className="text-emerald-600">ماوەی گەڕاندن: <b>{m.returnable}</b></span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xs font-semibold">{formatIQD(m.unitPrice)}/دانە</span>
                              {isSelected && <CheckCircle2 size={16} className="text-primary"/>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  // ── Step 4: Summary ──────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="flex flex-col gap-5 p-6">
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-bold">بەرهەم</TableHead>
              <TableHead className="text-xs font-bold text-center">گەڕاوە</TableHead>
              <TableHead className="text-xs font-bold text-center text-amber-600">بۆنەس ٣٠٪</TableHead>
              <TableHead className="text-xs font-bold text-center text-emerald-600">پارەدار ٧٠٪</TableHead>
              <TableHead className="text-xs font-bold text-right">کەمکردنەوەی قەرز</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalItems.map((item) => (
              <TableRow key={item.productId}>
                <TableCell className="text-xs font-medium">
                  <div>{item.productName}</div>
                  {item.fromOrderNumber && (
                    <div className="text-[10px] text-muted-foreground">{item.fromOrderNumber}</div>
                  )}
                </TableCell>
                <TableCell className="text-center text-xs font-bold">{item.returnedQty}</TableCell>
                <TableCell className="text-center text-xs font-bold text-amber-600">{item.bonusQty}</TableCell>
                <TableCell className="text-center text-xs font-bold text-emerald-600">{item.paidQty}</TableCell>
                <TableCell className="text-right text-xs font-bold">{formatIQD(item.debtCredit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">کۆی گەڕاوە</span>
          <span className="font-bold">{totalReturnedUnits} دانە</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-amber-600 flex items-center gap-1"><Award size={12}/> بۆنەس (٣٠٪)</span>
          <span className="font-bold text-amber-700 dark:text-amber-300">{totalBonusUnits} دانە</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-emerald-600 flex items-center gap-1"><CircleDot size={12}/> پارەدار (٧٠٪)</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300">{totalPaidUnits} دانە</span>
        </div>
        <Separator/>
        <div className="flex justify-between text-base font-bold">
          <span className="flex items-center gap-1.5"><TrendingDown size={14}/> کەمکردنەوەی قەرز</span>
          <span className="text-primary text-lg">{formatIQD(totalDebtCredit)}</span>
        </div>
        {selectedClient && (
          <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>قەرز دوای پەسەندکردن</span>
            <span className="font-semibold text-foreground">
              {formatIQD(Math.max(0, selectedClient.balance - totalDebtCredit))}
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">تێبینی (ئەختیاری)</Label>
        <Textarea
          placeholder="تێبینیەک لێرە بنووسە..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <InfoBox variant="warn">
        ئەم گەڕاوەیە دەکرێت تا کاتی پەسەندکردنی بەڕێوەبەر قەرزەکە کەم نەکاتەوە و بەرهەم نەگەڕێتەوە بۆ ئەنبار.
      </InfoBox>
    </div>
  );

  // ── Can proceed ──────────────────────────────────────────────────────────
  const canNext = useMemo(() => {
    if (step === 0) return !!clientId;
    if (step === 1) return draftItems.length > 0 && draftItems.every((d) => d.returnedQty > 0);
    return true;
  }, [step, clientId, draftItems]);

  const stepContent = [renderStep1(), renderStep2(), renderStep3(), renderStep4()];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <PackageX size={18} className="text-rose-500"/>
            {editReturn ? "گۆڕینی گەڕاوە" : "گەڕاوەی نوێ"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {editReturn ? `گۆڕینی ${editReturn.returnNumber}` : "تۆمارکردنی گەڕاندنەوەی بەرهەم لە کڕیار"}
          </SheetDescription>
        </SheetHeader>

        <StepBar step={step}/>
        <Separator/>

        <ScrollArea className="flex-1">
          {stepContent[step]}
        </ScrollArea>

        {/* Footer navigation */}
        <div className="border-t p-4 flex items-center justify-between shrink-0 bg-background">
          <Button
            variant="ghost"
            onClick={() => step === 0 ? handleClose() : setStep((s) => s - 1)}
            className="gap-1"
          >
            <ChevronRight size={14}/>
            {step === 0 ? "هەڵوەشاندنەوە" : "دواوە"}
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="gap-1">
              دواتر <ChevronLeft size={14}/>
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <CheckCircle2 size={14}/>
              {editReturn ? "گۆڕین پاشەکەوت بکە" : "تۆمارکردنی گەڕاوە"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
