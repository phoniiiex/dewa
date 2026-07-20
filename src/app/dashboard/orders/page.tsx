"use client";
import { useState, FormEvent, useRef, useMemo, useEffect } from "react";
import {
  Search, Plus, ShoppingCart, Eye, Trash2, X, Printer,
  CheckCircle, Clock, Package, Truck, Upload, XCircle, DollarSign, Pencil,
  PackageCheck, TriangleAlert, Tag,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus, OrderItem, OrderFlow } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExportButton from "@/components/custom/ExportButton";
import PrintModal from "@/components/custom/PrintModal";
import ClientCombobox from "@/components/custom/ClientCombobox";
import type { ExportColumn } from "@/lib/export";
import { notifyDriverOfOrder, sendTelegramMessage } from "@/lib/telegram";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";


const exportCols: ExportColumn[] = [
  { key: "orderNumber", label: "ژمارە" }, { key: "clientName", label: "کڕیار" },
  { key: "repName", label: "نوێنەر" }, { key: "status", label: "بارودۆخ" },
  { key: "totalAmount", label: "کۆی گشتی", format: (v) => String(v) },
  { key: "createdAt", label: "بەروار" },
];

type StatusMeta = { label: string; color: string; bg: string; icon: React.ReactNode };
const STATUS: Record<OrderStatus, StatusMeta> = {
  WAITING:      { label: "چاوەڕوان",    color: "#D97706", bg: "#FEF3C7", icon: <Clock size={13} /> },
  IN_PROGRESS:  { label: "لە پڕۆسەدا",  color: "#2563EB", bg: "#DBEAFE", icon: <Package size={13} /> },
  NOT_ACCEPTED: { label: "ڕەتکراوە",    color: "#DC2626", bg: "#FEE2E2", icon: <XCircle size={13} /> },
  READY:        { label: "ئامادەیە",    color: "#059669", bg: "#D1FAE5", icon: <CheckCircle size={13} /> },
  SENT:         { label: "نێردراوە",    color: "#7C3AED", bg: "#EDE9FE", icon: <Truck size={13} /> },
  DELIVERED:    { label: "گەیشتووە",   color: "#0891B2", bg: "#CFFAFE", icon: <CheckCircle size={13} /> },
  PAID:         { label: "پارەدراوە",  color: "#059669", bg: "#D1FAE5", icon: <DollarSign size={13} /> },
};

const STATUS_TABS = ["هەموو", ...Object.values(STATUS).map(s => s.label), "📝 گۆڕانکاری", "👤 ماوەی نوێنەر"];

const STATUS_BADGE_CLS: Record<string, string> = {
  WAITING:      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  IN_PROGRESS:  "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  NOT_ACCEPTED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  READY:        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  SENT:         "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
  DELIVERED:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400",
  PAID:         "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status] ?? { label: status, icon: <Clock className="size-3" /> };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold", STATUS_BADGE_CLS[status] || "bg-muted text-muted-foreground")}>
      {s.icon} {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const { orders, clients, reps, warehouses, products, drivers, settings, addOrder, updateOrder, deleteOrder, showToast, loading } = useData();
  const { currentUser, globalStatusFilter, openNewOrder, setOpenNewOrder } = useLayout();

  const isRep     = currentUser?.role === "REP";
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const myRep     = isRep ? reps.find(r => r.name === currentUser?.name) ?? reps.find(r => r.isActive) : undefined;

  // ── Filters ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState(globalStatusFilter || "هەموو");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Sync when TopBar status filter changes
  useEffect(() => {
    setStatusFilter(globalStatusFilter);
    setPage(1);
  }, [globalStatusFilter]);

  // Open new-order modal when triggered from TopBar
  useEffect(() => {
    if (openNewOrder) {
      setNewOrderOpen(true);
      setOpenNewOrder(false);
    }
  }, [openNewOrder, setOpenNewOrder]);

  // ── Modal visibility ─────────────────────────────────────────────────
  const [newOrderOpen, setNewOrderOpen]       = useState(false);
  const [detailOrder, setDetailOrder]         = useState<Order | null>(null);
  const [deleteId, setDeleteId]               = useState<string | null>(null);
  const [printOrder, setPrintOrder]           = useState<Order | null>(null);

  // Combined "Mark Ready + Assign Driver" modal
  const [sendModalOrder, setSendModalOrder]   = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [sending, setSending]                 = useState(false);

  // Reject modal
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Invoice upload (SENT → DELIVERED)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [invoiceFiles, setInvoiceFiles]           = useState<File[]>([]);
  const [uploading, setUploading]                 = useState(false);
  const invoiceRef = useRef<HTMLInputElement>(null);

  // Payment (DELIVERED → PAID)
  const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod]         = useState<"CASH" | "TRANSFER">("CASH");
  const [paying, setPaying]               = useState(false);

  // Draft order number shown in the drawer header while creating
  const [draftOrderNumber, setDraftOrderNumber] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  useEffect(() => {
    if (newOrderOpen && !editOrder) setDraftOrderNumber("ORD-" + String(Date.now()).slice(-6));
    if (!newOrderOpen) setPendingConfirm(false);
  }, [newOrderOpen]);

  // ── New order form ────────────────────────────────────────────────────
  const [form, setForm] = useState<{
    clientId: string; clientName: string; repId: string;
    orderFlow: OrderFlow; pharmacyId: string; notes: string; priceTypeId: string;
  }>({ clientId: "", clientName: "", repId: myRep?.id || "", orderFlow: "STANDARD", pharmacyId: "", notes: "", priceTypeId: "" });
  type ItemForm = { productId: string; quantity: string; repBonusPct: string; overrideWarehouseFulfillment: boolean; bonusRounding: 'floor' | 'ceil' | null; fullBonusToWarehouse: boolean };
  const [orderItems, setOrderItems] = useState<ItemForm[]>([{ productId: "", quantity: "", repBonusPct: "", overrideWarehouseFulfillment: false, bonusRounding: null, fullBonusToWarehouse: false }]);
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", repId: myRep?.id || "", orderFlow: "STANDARD", pharmacyId: "", notes: "", priceTypeId: "" });
    setOrderItems([{ productId: "", quantity: "", repBonusPct: "", overrideWarehouseFulfillment: false, bonusRounding: null, fullBonusToWarehouse: false }]);
    setEditOrder(null);
    setPendingConfirm(false);
  };

  const isDirect = form.orderFlow === "DIRECT_PHARMACY";
  const selectedWarehouse = !isDirect ? clients.find(c => c.id === form.clientId && c.type === "WAREHOUSE") : undefined;

  // Returns the warehouse's standard bonus % for a product
  const getWarehousePct = (productId: string): number => {
    if (!selectedWarehouse) return 0;
    const rule = (selectedWarehouse.bonusRules || []).find(r => r.productId === productId);
    return rule ? rule.percent : selectedWarehouse.bonusPct;
  };

  // Derived list of all unique price types across all active products
  const allPriceTypes = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => (p.prices || []).forEach(pt => map.set(pt.typeId, pt.typeName)));
    return Array.from(map.entries()).map(([typeId, typeName]) => ({ typeId, typeName }));
  }, [products]);

  // ── Split Bonus Fulfillment Calculation ──────────────────────────────────
  // Rule 1: Total Bonus% >= Warehouse Base%  → belowMinimum    (STANDARD only)
  // Rule 2: Bonus qty must be whole number   → isFraction + floor/ceil choice (STANDARD/DIRECT_PHARMACY)
  // Rule 3: Full Bonus to Warehouse toggle   → fullBonusToWarehouse (STANDARD only)
  // Rule 4: Direct Warehouse auto-applies base%; fractional qty → adjust qty alert

  const liveBonusItems = orderItems.filter(i => i.productId && i.quantity).map((i, idx) => {
    const prod = products.find(p => p.id === i.productId);
    const qty  = Number(i.quantity);

    if (isDirect) { // DIRECT_PHARMACY
      const pct          = parseFloat(i.repBonusPct) || 0;
      const rawTotal     = qty * pct / 100;
      const isFraction   = !Number.isInteger(rawTotal);
      const pendingRounding = isFraction && i.bonusRounding === null;
      const totalBonusQty = isFraction
        ? (i.bonusRounding === 'ceil' ? Math.ceil(rawTotal) : Math.floor(rawTotal))
        : rawTotal;
      return { idx, name: prod?.name || "", qty, warehousePct: 0, repAgreedPct: pct, rawTotal, isFraction, isDWFraction: false, pendingRounding, belowMinimum: false, totalBonusQty, warehouseBonusQty: 0, agentPendingQty: totalBonusQty, fullBonusToWarehouse: false };
    }

    if (form.orderFlow === 'DIRECT_WAREHOUSE') {
      // Rule 4: auto-apply warehouse base%, user does NOT enter a bonus%
      const warehousePct  = getWarehousePct(i.productId);
      const rawTotal      = qty * warehousePct / 100;
      // Rule 4B: fractional → user must adjust qty (no floor/ceil — different from Rule 2)
      const isDWFraction  = !Number.isInteger(rawTotal);
      const pendingRounding = isDWFraction; // blocks submit until qty is fixed
      const totalBonusQty = isDWFraction ? Math.floor(rawTotal) : rawTotal;
      return { idx, name: prod?.name || "", qty, warehousePct, repAgreedPct: warehousePct, rawTotal, isFraction: false, isDWFraction, pendingRounding, belowMinimum: false, totalBonusQty, warehouseBonusQty: totalBonusQty, agentPendingQty: 0, fullBonusToWarehouse: false };
    }

    // STANDARD flow
    const warehousePct    = getWarehousePct(i.productId);
    const repAgreedPct    = parseFloat(i.repBonusPct) || warehousePct;
    const belowMinimum    = repAgreedPct < warehousePct;
    const rawTotal        = qty * repAgreedPct / 100;
    // Rule 1 has priority — only evaluate Rule 2 if Rule 1 passes
    const isFraction      = !belowMinimum && !Number.isInteger(rawTotal);
    const pendingRounding = isFraction && i.bonusRounding === null;
    const totalBonusQty   = belowMinimum ? 0
      : isFraction
        ? (i.bonusRounding === 'ceil' ? Math.ceil(rawTotal) : Math.floor(rawTotal))
        : rawTotal;
    // Rule 3: Full Bonus to Warehouse override
    const warehouseBonusQty = i.fullBonusToWarehouse
      ? totalBonusQty
      : Math.floor(qty * warehousePct / 100);
    const agentPendingQty = totalBonusQty - warehouseBonusQty;
    return { idx, name: prod?.name || "", qty, warehousePct, repAgreedPct, rawTotal, isFraction, isDWFraction: false, pendingRounding, belowMinimum, totalBonusQty, warehouseBonusQty, agentPendingQty, fullBonusToWarehouse: i.fullBonusToWarehouse };
  });

  const hasAnyViolation = liveBonusItems.some(i => i.belowMinimum || i.pendingRounding);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const billingClient = clients.find(c => c.id === form.clientId);
    if (!billingClient) { showToast("تکایە کڕیارێک هەڵبژێرە", "error"); return; }

    const repRecord = isRep ? myRep : reps.find(r => r.id === form.repId);
    if (!repRecord) { showToast("تکایە نوێنەرێک هەڵبژێرە", "error"); return; }

    const pharmacyClient = form.orderFlow === "STANDARD" ? clients.find(c => c.id === form.pharmacyId) : null;

    const items: OrderItem[] = orderItems.filter(i => i.productId && i.quantity).map((i) => {
      const prod = products.find(p => p.id === i.productId);
      const qty  = Number(i.quantity);
      const priceEntry = prod?.prices.find(p => p.typeId === form.priceTypeId);
      const unitPrice = priceEntry?.amount ?? prod?.price ?? 0;
      const priceTypeName = priceEntry?.typeName ?? "";
      if (isDirect) {
        const pct        = parseFloat(i.repBonusPct) || 0;
        const rawTotal   = qty * pct / 100;
        const isFraction = !Number.isInteger(rawTotal);
        const totalBonus = isFraction ? (i.bonusRounding === 'ceil' ? Math.ceil(rawTotal) : Math.floor(rawTotal)) : rawTotal;
        return { productId: i.productId, productName: prod?.name || "", quantity: qty, bonusQty: totalBonus, unitPrice, priceTypeId: form.priceTypeId, priceTypeName, bonusPct: 0, repBonusPct: pct, warehouseBonusQty: 0, repBonusQty: totalBonus, overrideWarehouseFulfillment: false };
      }
      if (form.orderFlow === 'DIRECT_WAREHOUSE') {
        // Rule 4: auto bonus = warehousePct, all goes to warehouse
        const warehousePct  = getWarehousePct(i.productId);
        const rawTotal      = qty * warehousePct / 100;
        const totalBonusQty = Number.isInteger(rawTotal) ? rawTotal : Math.floor(rawTotal);
        return { productId: i.productId, productName: prod?.name || "", quantity: qty, bonusQty: totalBonusQty, unitPrice, priceTypeId: form.priceTypeId, priceTypeName, bonusPct: warehousePct, repBonusPct: 0, warehouseBonusQty: totalBonusQty, repBonusQty: 0, overrideWarehouseFulfillment: false };
      }
      // STANDARD flow
      const warehousePct      = getWarehousePct(i.productId);
      const repAgreedPct      = parseFloat(i.repBonusPct) || warehousePct;
      const rawTotal          = qty * repAgreedPct / 100;
      const isFraction        = !Number.isInteger(rawTotal);
      const totalBonusQty     = isFraction ? (i.bonusRounding === 'ceil' ? Math.ceil(rawTotal) : Math.floor(rawTotal)) : rawTotal;
      // Rule 3: Full Bonus to Warehouse override
      const warehouseBonusQty = i.fullBonusToWarehouse ? totalBonusQty : Math.floor(qty * warehousePct / 100);
      const agentPendingQty   = totalBonusQty - warehouseBonusQty;
      return {
        productId: i.productId, productName: prod?.name || "", quantity: qty,
        bonusQty: totalBonusQty, unitPrice, priceTypeId: form.priceTypeId, priceTypeName,
        bonusPct: warehousePct, repBonusPct: repAgreedPct,
        warehouseBonusQty, repBonusQty: agentPendingQty,
        overrideWarehouseFulfillment: i.fullBonusToWarehouse,
      };
    });
    if (items.length === 0) { showToast("تکایە بەرهەمێک زیادبکە", "error"); return; }
    if (hasAnyViolation) { showToast("تکایە کێشەکانی بۆنەس چارەسەر بکە", "error"); return; }

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const orderPayload = {
      clientId: billingClient.id, clientName: billingClient.name,
      repId: repRecord.id, repName: repRecord.name,
      orderFlow: form.orderFlow,
      pharmacyId: pharmacyClient?.id || null,
      pharmacyName: pharmacyClient?.name || null,
      items, totalAmount, notes: form.notes,
    };

    if (editOrder) {
      if (isManager) {
        await updateOrder(editOrder.id, orderPayload);
        showToast("داواکاری نوێکرایەوە");
      } else {
        await updateOrder(editOrder.id, { notes: `[EDIT_REQUEST]:${JSON.stringify(orderPayload)}` });
        showToast("داوای گۆڕانکاری نێردرا — چاوەڕوانی ڕەزامەندی بەڕێوەبەر");
      }
      setNewOrderOpen(false); resetForm(); return;
    }

    // ── NEW ORDER — two-step: preview → confirm ──
    if (!pendingConfirm) {
      // Step 1: validation passed — lock in order number, flip button
      setDraftOrderNumber("ORD-" + String(Date.now()).slice(-6));
      setPendingConfirm(true);
      return;
    }
    // Step 2: user confirmed — create the order
    await addOrder({
      ...orderPayload,
      status: "WAITING",
      driverId: "", driverName: "", driverPhone: "",
      signedInvoiceUrl: "", signedReceiptUrl: "",
      deliveredAt: "", paidAt: "", rejectionReason: "",
    });
    setNewOrderOpen(false);
    resetForm();
  };


  // ── Open edit modal (pre-fill form from existing order) ──
  const openEditModal = (o: Order) => {
    setEditOrder(o);
    setForm({
      clientId: o.clientId, clientName: o.clientName,
      repId: o.repId,
      orderFlow: o.orderFlow || "STANDARD",
      pharmacyId: o.pharmacyId || "",
      notes: o.notes.startsWith("[EDIT_REQUEST]:") ? "" : o.notes,
      priceTypeId: o.items[0]?.priceTypeId || "",
    });
    setOrderItems(o.items.map(i => ({
      productId: i.productId, quantity: String(i.quantity),
      repBonusPct: String(i.repBonusPct || i.bonusPct || ""),
      overrideWarehouseFulfillment: i.overrideWarehouseFulfillment ?? false,
      bonusRounding: null,
      fullBonusToWarehouse: i.overrideWarehouseFulfillment ?? false,
    })));
    setNewOrderOpen(true);
  };

  // ── Approve / Reject edit request (manager only) ──
  const approveEditRequest = (o: Order) => {
    try {
      const payload = JSON.parse(o.notes.replace("[EDIT_REQUEST]:", ""));
      updateOrder(o.id, { ...payload, notes: payload.notes || "" });
      showToast("گۆڕانکاری قبووڵکرا");
    } catch { showToast("هەڵە لە خوێندنەوەی داواکاری", "error"); }
  };
  const rejectEditRequest = (o: Order) => {
    updateOrder(o.id, { notes: "" });
    showToast("داوای گۆڕانکاری ڕەتکرایەوە");
  };

  // ── Workflow actions ──────────────────────────────────────────────────
  const acceptOrder = (o: Order) => { updateOrder(o.id, { status: "IN_PROGRESS" }); showToast("داواکاری قبووڵکرا"); };

  const openSendModal = (o: Order) => { setSendModalOrder(o); setSelectedDriverId(""); };

  const confirmSend = async () => {
    if (!sendModalOrder) return;
    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver) { showToast("تکایە شوفێرێک هەڵبژێرە", "error"); return; }
    setSending(true);
    try {
      await updateOrder(sendModalOrder.id, {
        status: "READY",
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
      });
      showToast("شوفێر دەستنیشانکرا — داواکاری ئامادەیە ✔️");

      if (driver.telegramChatId && settings.telegramBotToken) {
        const client = clients.find(c => c.id === sendModalOrder.clientId);
        // 1. Send text notification to driver
        const result = await notifyDriverOfOrder(settings.telegramBotToken, {
          driverChatId: driver.telegramChatId,
          driverName: driver.name,
          orderNumber: sendModalOrder.orderNumber,
          clientName: sendModalOrder.clientName,
          clientCity: client?.city,
          items: sendModalOrder.items,
          notes: sendModalOrder.notes,
        });
        if (result.ok) showToast("📱 ئاگاداری تێلێگرام نێردرا ✅");

        // 2. If there are notify admins configured, insert a pending voice forward
        //    and ask each admin to record a voice note for the driver
        if (settings.telegramNotifyChatIds?.length > 0) {
          const { supabase } = await import("@/lib/supabase");
          await supabase.from("pending_voice_forwards").insert({
            order_id: sendModalOrder.id,
            order_number: sendModalOrder.orderNumber,
            driver_chat_id: driver.telegramChatId,
            driver_name: driver.name,
          });

          const voicePrompt = `🎙️ داواکاری <b>${sendModalOrder.orderNumber}</b> دەستنیشانکرا بۆ شوفێر <b>${driver.name}</b>\n\nئەگەر دەتەوێت نامەی ئەوازی بنێریتە بۆ شوفێرەکە، ئێستا تۆماربکە و بینێرە بۆ ئەم بۆتە — بوتەکە بەخۆدیی دەیدرێتە شوفێرەکە\n\n⚠️ پێویستە نامەکەت بنێریت `;
          await Promise.all(
            settings.telegramNotifyChatIds.map(chatId =>
              sendTelegramMessage(settings.telegramBotToken, chatId, voicePrompt)
            )
          );
        }
      }
    } finally {
      setSending(false);
      setSendModalOrder(null);
      setSelectedDriverId("");
    }
  };


  const confirmDelivered = async () => {
    if (!invoiceModalOrder) return;
    setUploading(true);
    let invoiceUrl = "";
    if (invoiceFiles.length > 0) {
      const { supabase } = await import("@/lib/supabase");
      const uploads = await Promise.all(
        invoiceFiles.map((file, idx) =>
          supabase.storage
            .from("order-docs")
            .upload(`invoices/${invoiceModalOrder.id}_${Date.now()}_${idx}_${file.name}`, file, { upsert: true })
        )
      );
      const firstErr = uploads.find(u => u.error);
      if (firstErr?.error) { showToast("هەڵە لە بارکردن: " + firstErr.error.message, "error"); setUploading(false); return; }
      // store first file's URL in signedInvoiceUrl
      if (uploads[0].data) {
        const { data: urlData } = supabase.storage.from("order-docs").getPublicUrl(uploads[0].data.path);
        invoiceUrl = urlData.publicUrl;
      }
    }
    await updateOrder(invoiceModalOrder.id, { status: "DELIVERED", deliveredAt: new Date().toISOString(), signedInvoiceUrl: invoiceUrl });
    showToast("بارودۆخ گۆڕدرا: گەیشتووە");
    setUploading(false);
    setInvoiceModalOrder(null);
    setInvoiceFiles([]);
  };


  const confirmReject = async () => {
    if (!rejectOrder) return;
    await updateOrder(rejectOrder.id, { status: "NOT_ACCEPTED", rejectionReason: rejectReason });
    showToast("داواکاری ڕەتکرایەوە");
    setRejectOrder(null); setRejectReason("");
  };

  const confirmPayment = async () => {
    if (!payModalOrder) return;
    setPaying(true);
    await updateOrder(payModalOrder.id, { status: "PAID", paidAt: new Date().toISOString() });
    // Record a transaction in the finance ledger
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("transactions").insert({
        type: "INCOME",
        description: `پارەدانی داواکاری ${payModalOrder.orderNumber} — ${payModalOrder.clientName}`,
        amount: payModalOrder.totalAmount,
        method: payMethod,
        related_order_id: payModalOrder.id,
      });
    } catch { /* transactions table may not exist yet — ignore */ }
    showToast("داواکاری پارەدراو ✔️");
    setPaying(false);
    setPayModalOrder(null);
  };

  // ── Filtered + paginated list ─────────────────────────────────────────
  const filtered = useMemo(() => orders.filter(o => {
    if (isRep && myRep && o.repId !== myRep.id && o.repName !== myRep.name) return false;
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm) || o.repName.includes(searchTerm);
    if (statusFilter === "📝 گۆڕانکاری") return matchSearch && o.notes.startsWith("[EDIT_REQUEST]:");
    if (statusFilter === "👤 ماوەی نوێنەر") return matchSearch && o.items.some(i => (i.repBonusQty ?? 0) > 0);
    const matchStatus = statusFilter === "هەموو" || STATUS[o.status]?.label === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, isRep, myRep, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpi = {
    total:   filtered.length,
    waiting: filtered.filter(o => o.status === "WAITING").length,
    sent:    filtered.filter(o => o.status === "SENT").length,
    paid:    filtered.filter(o => o.status === "PAID").length,
    amount:  filtered.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
  };

  return (
    <>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-orange-500">
            <ShoppingCart className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">داواکارییەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی داواکارییەکان و جەریانی کاری</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportCols} filename="orders" title="داواکارییەکان" />
          <Button onClick={() => setNewOrderOpen(true)}>
            <Plus className="size-4 me-1" /> داواکاری نوێ
          </Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 page-stagger">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-7 w-16" /></CardContent></Card>
        )) : [
          { label: "کۆی داواکارییەکان", value: kpi.total,            cls: "text-primary" },
          { label: "چاوەڕوان",          value: kpi.waiting,           cls: "text-amber-600" },
          { label: "نێردراوە",          value: kpi.sent,              cls: "text-violet-600" },
          { label: "پارەدراوە",         value: kpi.paid,              cls: "text-emerald-600" },
          { label: "کۆی داهات",         value: formatIQD(kpi.amount), cls: "text-cyan-600" },
        ].map(k => (
          <Card key={k.label} className="card-interactive">
            <CardContent className="p-4">
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card className="mb-5">
        <CardContent className="p-3 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="گەڕان بە ژمارە یان کڕیار..." className="pe-9 text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map(t => {
              const isEditTab = t === "📝 گۆڕانکاری";
              const editCount = isEditTab ? orders.filter(o => o.notes.startsWith("[EDIT_REQUEST]:")).length : 0;
              const active = statusFilter === t;
              return (
                <Button key={t} variant={active ? (isEditTab ? "outline" : "default") : "outline"} size="sm"
                  onClick={() => { setStatusFilter(t); setPage(1); }}
                  className={cn(
                    "gap-1 rounded-full text-xs font-semibold",
                    active
                      ? isEditTab ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : ""
                      : "text-muted-foreground"
                  )}>
                  {t}
                  {isEditTab && editCount > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-px text-[10px] font-bold">{editCount}</span>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {["ژمارە", "کڕیار", "نوێنەر", "بارودۆخ", "کۆی گشتی", "بەروار", "کردار"].map(h => (
                <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="table-stagger">
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <Empty className="py-16 border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><ShoppingCart className="size-4" /></EmptyMedia>
                      <EmptyTitle>هیچ داواکارییەک نەدۆزرایەوە</EmptyTitle>
                      <EmptyDescription>داواکاری نوێ زیاد بکە یان فلتەرەکان بگۆڕە</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" onClick={() => { setOpenNewOrder(true); }}><Plus className="size-4 me-1" />داواکاری نوێ</Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : paged.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-bold text-primary">{o.orderNumber}</TableCell>
                <TableCell className="font-medium">{o.clientName}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{o.repName}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="font-semibold">{formatIQD(o.totalAmount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString("ku")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {o.notes.startsWith("[EDIT_REQUEST]:") && (
                      <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">📝 داوای گۆڕانکاری</Badge>
                    )}
                    {isManager && o.notes.startsWith("[EDIT_REQUEST]:") && <>
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2 text-xs" onClick={() => approveEditRequest(o)}><CheckCircle className="size-3 me-1" />قبووڵ</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 px-2 text-xs" onClick={() => rejectEditRequest(o)}><XCircle className="size-3 me-1" />ڕەت</Button>
                    </>}
                    {isManager && o.status === "WAITING" && !o.notes.startsWith("[EDIT_REQUEST]:") && <>
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2 text-xs" onClick={() => acceptOrder(o)}><CheckCircle className="size-3 me-1" />قبووڵ</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive hover:bg-destructive/10 px-2 text-xs" onClick={() => setRejectOrder(o)}><XCircle className="size-3 me-1" />ڕەت</Button>
                    </>}
                    {isManager && o.status === "IN_PROGRESS" && (
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2 text-xs" onClick={() => openSendModal(o)}><CheckCircle className="size-3 me-1" />ئامادەیە</Button>
                    )}
                    {isManager && o.status === "READY" && (
                      <Button size="sm" variant="ghost" className="h-7 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 px-2 text-xs" onClick={() => updateOrder(o.id, { status: "SENT" })}><Truck className="size-3 me-1" />نێردراوە</Button>
                    )}
                    {isManager && o.status === "SENT" && (
                      <Button size="sm" variant="ghost" className="h-7 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 px-2 text-xs" onClick={() => setInvoiceModalOrder(o)}><Upload className="size-3 me-1" />گەیشتووە</Button>
                    )}
                    {isManager && o.status === "DELIVERED" && (
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2 text-xs" onClick={() => { setPayModalOrder(o); setPayMethod("CASH"); }}><DollarSign className="size-3 me-1" />پارەدان</Button>
                    )}
                    {((isManager && (o.status === "WAITING" || o.status === "IN_PROGRESS")) || (isRep && o.status === "WAITING" && o.repId === myRep?.id)) && (
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditModal(o)}><Pencil className="size-3.5" /></Button>
                    )}
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => setDetailOrder(o)}><Eye className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => setPrintOrder(o)}><Printer className="size-3.5" /></Button>
                    {isManager && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(o.id)}><Trash2 className="size-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} داواکاری — لاپەڕە {page} لە {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>→</Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page + i - 2;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <Button key={pg} variant={page === pg ? "default" : "outline"} size="sm" onClick={() => setPage(pg)} className="min-w-8">{pg}</Button>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>←</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          NEW / EDIT ORDER — DRAWER (right-side panel)
      ════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes orderNumberPop {
          0%   { transform: scale(0.85) translateY(-4px); opacity: 0; }
          60%  { transform: scale(1.05) translateY(0);   opacity: 1; }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes orderNumberGlow {
          0%, 100% { box-shadow: 0 0 0 0   rgba(249,115,22,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(249,115,22,0);   }
        }
        .order-badge-pop {
          animation:
            orderNumberPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards,
            orderNumberGlow 1.1s ease 0.55s 3;
        }
      `}</style>

      <Drawer
        open={newOrderOpen}
        onOpenChange={open => { if (!open) { setNewOrderOpen(false); resetForm(); } }}
        swipeDirection="left"
      >
        <DrawerContent
          style={{ "--drawer-content-width": "min(92vw, 620px)", "--drawer-inset": "8px" } as React.CSSProperties}
          className="flex flex-col rounded-xl"
        >
          <DrawerHeader className="border-b shrink-0 px-6 py-4" dir="rtl">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-500" />
                {editOrder ? `گۆڕینی داواکاری` : "داواکاری نوێ"}
              </DrawerTitle>
              <span
                key={pendingConfirm ? "confirmed" : "draft"}
                className={cn(
                  "text-[11px] font-mono rounded-md px-2.5 py-1 tracking-wide transition-colors duration-300",
                  pendingConfirm && !editOrder
                    ? "bg-orange-500 border border-orange-400 text-white font-bold order-badge-pop"
                    : "bg-muted border border-border text-muted-foreground"
                )}
              >
              {editOrder ? editOrder.orderNumber : (pendingConfirm ? draftOrderNumber : "")}
              </span>
            </div>
            <DrawerDescription>زانیاری داواکاری پڕبکەوە</DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 overflow-auto">
          <form id="order-form" onSubmit={handleSubmit} dir="rtl">
          <fieldset disabled={pendingConfirm && !editOrder} className="block border-0 p-0 m-0">
            <div className="px-6 py-5 space-y-5">

          {/* ── Order Flow Picker ── */}
          {!editOrder && (
            <div className="space-y-2">
              <Label>جۆری داواکاری *</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'STANDARD'        , label: '🏪 ئەرکی — کۆگا → فارمۆخانە' , clr: 'violet' },
                  { value: 'DIRECT_WAREHOUSE', label: '📦 کۆگا بۆ خۆی'               , clr: 'blue'   },
                  { value: 'DIRECT_PHARMACY' , label: '⚡ ڕاستەوخۆ'                   , clr: 'amber'  },
                ] as { value: OrderFlow; label: string; clr: string }[]).map(f => (
                  <button type="button" key={f.value}
                    onClick={() => setForm({ ...form, orderFlow: f.value, clientId: '', clientName: '', pharmacyId: '' })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold border-[1.5px] transition-all',
                      form.orderFlow === f.value
                        ? f.clr === 'violet' ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700'
                          : f.clr === 'blue'   ? 'border-blue-500   bg-blue-50   dark:bg-blue-950/30   text-blue-700'
                          :                     'border-amber-500  bg-amber-50  dark:bg-amber-950/30  text-amber-700'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Billing client — filters by flow */}
            <div className="space-y-2">
              <Label>{form.orderFlow === 'DIRECT_PHARMACY' ? 'فارمۆخانە (کڕیار) *' : 'کۆگا (کڕیار) *'}</Label>
              <ClientCombobox
                clients={form.orderFlow === 'DIRECT_PHARMACY'
                  ? clients.filter(c => c.type !== 'WAREHOUSE')
                  : clients.filter(c => c.type === 'WAREHOUSE')}
                value={form.clientId} clientName={form.clientName}
                onChange={(id, name) => {
                  // In STANDARD flow: auto-set all items' bonus% to warehouse base bonus
                  if (form.orderFlow === 'STANDARD') {
                    const wh = clients.find(c => c.id === id);
                    if (wh?.bonusPct) {
                      setOrderItems(prev => prev.map(x => ({ ...x, repBonusPct: String(wh.bonusPct), bonusRounding: null })));
                    }
                  }
                  setForm({ ...form, clientId: id, clientName: name });
                }}
                onRequestNew={(name) => setForm({ ...form, clientName: name })} />
            </div>
            {!isRep ? (
              <div className="space-y-2">
                <Label>نوێنەر *</Label>
                <Select value={form.repId || null} onValueChange={(v: string | null) => v && setForm({ ...form, repId: v })}>
                  <SelectTrigger><SelectValue placeholder="هەڵبژاردن..." /></SelectTrigger>
                  <SelectContent>{reps.filter(r => r.isActive).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>نوێنەر</Label>
                <div className="px-3 py-2 bg-primary/10 rounded-lg text-sm text-primary font-semibold">{myRep?.name || currentUser?.name}</div>
              </div>
            )}
          </div>

          {/* Pharmacy + Price type — STANDARD only */}
          {form.orderFlow === 'STANDARD' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>فارمۆخانە (زانیاری — لازم نییە) *</Label>
                <ClientCombobox
                  clients={clients.filter(c => c.type !== 'WAREHOUSE')}
                  value={form.pharmacyId}
                  clientName={clients.find(c => c.id === form.pharmacyId)?.name || ''}
                  onChange={(id) => setForm({ ...form, pharmacyId: id })}
                  onRequestNew={() => {}} />
              </div>
              {allPriceTypes.length > 0 ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Tag size={13}/>جۆری نرخ</Label>
                  <Select value={form.priceTypeId || null} onValueChange={(v: string | null) => v && setForm({ ...form, priceTypeId: v })}>
                    <SelectTrigger><SelectValue placeholder="جۆری نرخ هەڵبژێرە..." /></SelectTrigger>
                    <SelectContent>{allPriceTypes.map(pt => <SelectItem key={pt.typeId} value={pt.typeId}>{pt.typeName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : <div />}
            </div>
          )}
          {/* Price type — non-STANDARD (before notes) */}
          {form.orderFlow !== 'STANDARD' && allPriceTypes.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="flex items-center gap-1.5"><Tag size={13}/>جۆری نرخ</Label>
              <Select value={form.priceTypeId || null} onValueChange={(v: string | null) => v && setForm({ ...form, priceTypeId: v })}>
                <SelectTrigger><SelectValue placeholder="جۆری نرخ هەڵبژێرە (ئارەزووی)..." /></SelectTrigger>
                <SelectContent>{allPriceTypes.map(pt => <SelectItem key={pt.typeId} value={pt.typeId}>{pt.typeName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {/* Notes — always below price type */}
          <div className="mt-4 space-y-2">
            <Label>تێبینی</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="تێبینی..." />
          </div>

          {/* Warehouse bonus info banner (no global rep input anymore) */}
          {selectedWarehouse && (
            <div className="mb-3 px-3.5 py-2.5 bg-violet-100 dark:bg-violet-950/30 rounded-[10px] text-[13px] text-violet-600">
              🏪 <strong>{selectedWarehouse.name}</strong> — بۆنەسی کۆگا: <strong>{selectedWarehouse.bonusPct}%</strong>
              {selectedWarehouse.bonusRules.length > 0 && <span> · {selectedWarehouse.bonusRules.length} ڕێگەی تایبەت</span>}
            </div>
          )}
          {isDirect && (
            <div className="mb-3 px-3.5 py-2.5 bg-amber-100 dark:bg-amber-950/30 rounded-[10px] text-[13px] text-amber-600">
              📦 داواکاری ڕاستەوخۆ — دەتوانی بۆ هەر بەرهەمێک بۆنەسی دیاری بکەیت (ئەگەر بەتاڵ بهێڵیتەوە = بۆنەس نییە)
            </div>
          )}

          {/* Product rows */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-muted-foreground"/>
                <span className="font-semibold text-sm">بەرهەمەکان</span>
              </div>
              <Button type="button" variant="ghost" size="sm"
                className="bg-primary/10 text-primary hover:bg-primary/20 text-[13px] font-semibold"
              onClick={() => setOrderItems([...orderItems, { productId: "", quantity: "", repBonusPct: "", overrideWarehouseFulfillment: false, bonusRounding: null, fullBonusToWarehouse: false }])}>
                + زیادکردن
              </Button>
            </div>
            {/* Column headers */}
            <div className="mb-1 grid gap-2" style={{ gridTemplateColumns: form.orderFlow === 'DIRECT_WAREHOUSE' ? '1fr 100px auto' : '1fr 100px 100px auto' }}>
              <div className="text-xs font-semibold text-muted-foreground">بەرهەم</div>
              <div className="text-xs font-semibold text-muted-foreground">ژمارە</div>
              {form.orderFlow !== 'DIRECT_WAREHOUSE' && <div className={`text-xs font-semibold ${isDirect ? 'text-amber-600' : 'text-violet-600'}`}>{isDirect ? 'بۆنەس %' : 'کۆی بۆنەس %'}</div>}
              <div />
            </div>
            {orderItems.map((item, idx) => {
              const live = liveBonusItems.find(l => l.idx === idx);
              return (
              <div key={idx} className="mb-2.5 space-y-1.5">
                <div className="grid gap-2 items-start"
                  style={{ gridTemplateColumns: form.orderFlow === 'DIRECT_WAREHOUSE' ? '1fr 100px auto' : '1fr 100px 100px auto' }}>
                  <Select value={item.productId || null} onValueChange={(v: string | null) => {
                    if (!v) return;
                    setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, productId: v } : x));
                  }}>
                    <SelectTrigger><SelectValue placeholder="بەرهەم هەڵبژێرە..." /></SelectTrigger>
                    <SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min={1} placeholder="ژمارە" value={item.quantity}
                    onChange={e => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, quantity: e.target.value, bonusRounding: null } : x))} />
                  {/* Bonus % input — hidden for DIRECT_WAREHOUSE */}
                  {form.orderFlow !== 'DIRECT_WAREHOUSE' && (
                    <div className="relative">
                      <Input type="number" min={0} max={200}
                        className={`ps-7 ${live?.belowMinimum ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                        placeholder="0"
                        value={item.repBonusPct}
                        onChange={e => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, repBonusPct: e.target.value, bonusRounding: null } : x))} />
                      <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                    </div>
                  )}
                  {orderItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="size-9 bg-red-100 dark:bg-red-950/30 text-red-600 hover:bg-red-200"
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
                {/* Per-item price badge — shows price for the order-level selected type */}
                {item.productId && (() => {
                  const prod = products.find(p => p.id === item.productId);
                  if (!prod) return null;
                  const priceEntry = form.priceTypeId
                    ? prod.prices.find(p => p.typeId === form.priceTypeId)
                    : null;
                  const price = priceEntry?.amount ?? prod.price ?? 0;
                  const label = priceEntry?.typeName || (form.priceTypeId ? 'نرخی تایبەت نییە' : 'نرخی بنچینە');
                  return (
                    <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground" dir="rtl">
                      <Tag size={11}/>
                      <span>{label}:</span>
                      <span className="font-mono font-medium">{price.toLocaleString()} دینار</span>
                    </div>
                  );
                })()}
                {/* Rule 1: below-minimum warning */}
                {live?.belowMinimum && (
                  <div className="flex items-center gap-1.5 text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                    <span>⚠️</span>
                    <span>کۆی بۆنەس ({live.repAgreedPct}%) کەمتر نابێت لە بۆنەسی کۆگا ({live.warehousePct}%)</span>
                  </div>
                )}
                {/* Rule 2: fraction alert with floor/ceil choice (STANDARD / DIRECT_PHARMACY) */}
                {live?.isFraction && item.quantity && (
                  <div className="flex items-center gap-2 text-[12px] bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                    <span>🔢</span>
                    <span className="flex-1 text-blue-700 dark:text-blue-300">ژمارەی بۆنەس <strong>{live.rawTotal.toFixed(2)}</strong> دانەیە — ژمارەی تەواو نییە</span>
                    <button type="button"
                      onClick={() => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, bonusRounding: 'floor' } : x))}
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors ${
                        item.bonusRounding === 'floor' ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                      }`}>↓ {Math.floor(live.rawTotal)}</button>
                    <button type="button"
                      onClick={() => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, bonusRounding: 'ceil' } : x))}
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors ${
                        item.bonusRounding === 'ceil' ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                      }`}>↑ {Math.ceil(live.rawTotal)}</button>
                  </div>
                )}
                {/* Rule 4B: DW fraction alert — user must adjust qty, no floor/ceil choice */}
                {live?.isDWFraction && item.quantity && (
                  <div className="flex items-center gap-2 text-[12px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span className="text-amber-700 dark:text-amber-300">
                      <strong>{live.qty}</strong> دانە × <strong>{live.warehousePct}%</strong> = <strong>{live.rawTotal.toFixed(2)}</strong> — ژمارەی تەواو نییە. ژمارەی بەرهەم بگۆڕە.
                    </span>
                  </div>
                )}
                {/* Rule 3: Full Bonus to Warehouse toggle (STANDARD only, when bonus is valid) */}
                {form.orderFlow === 'STANDARD' && item.productId && !live?.belowMinimum && !live?.pendingRounding && (live?.totalBonusQty ?? 0) > 0 && (
                  <div className="flex items-center gap-2 px-1" dir="rtl">
                    <Switch
                      size="sm"
                      checked={item.fullBonusToWarehouse}
                      onCheckedChange={(v) => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, fullBonusToWarehouse: v } : x))}
                    />
                    <span className="text-[11px] text-muted-foreground">هەموو بۆنەس بۆ کۆگا</span>
                  </div>
                )}
              </div>
            );
            })}
          </div>

          {/* Bonus split preview — Rule 5: hidden entirely when any item has belowMinimum */}
          {liveBonusItems.some(i => (i.totalBonusQty > 0 || i.isDWFraction) && !i.belowMinimum) && (
            <div className="p-4 bg-muted/60 rounded-xl border border-border space-y-3">
              <div className="font-semibold text-[13px] text-muted-foreground flex items-center gap-1.5">
                <PackageCheck size={14}/> داڕێژەی بۆنەس
              </div>
              {liveBonusItems.filter(i => (i.totalBonusQty > 0 || i.isDWFraction) && !i.belowMinimum).map((i, idx) => (
                <div key={idx} className="bg-card rounded-lg border border-border p-3 space-y-1.5">
                  <div className="font-bold text-[13px]">{i.name}</div>
                  {form.orderFlow === 'DIRECT_WAREHOUSE' ? (
                    // Rule 4A: breakdown display — qty + auto bonus = total
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                        <span>🏪 کۆگا کۆیی دەگیرێت:</span>
                        <strong>{i.qty} + {i.totalBonusQty} = {i.qty + i.totalBonusQty}</strong>
                        <span className="text-muted-foreground">دانە</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {i.qty} دانە + {i.warehousePct}% بۆنەسی کۆگا ({i.totalBonusQty} دانە) = کۆیی {i.qty + i.totalBonusQty} دانە
                      </div>
                    </>
                  ) : isDirect ? (
                    <>
                      <div className="text-xs text-muted-foreground">دەبێیت: <strong>{i.qty} + {i.totalBonusQty} = {i.qty + i.totalBonusQty}</strong> دانە</div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <span>📦</span>
                        <span>بۆنەس: <strong>+{i.totalBonusQty}</strong> ({i.repAgreedPct}%)</span>
                      </div>
                    </>
                  ) : (
                    // STANDARD
                    <>
                      <div className="text-xs text-muted-foreground">دەبێیت: <strong>{i.qty} + {i.totalBonusQty} = {i.qty + i.totalBonusQty}</strong> دانە</div>
                      {i.fullBonusToWarehouse ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded px-2 py-1">
                          <CheckCircle size={11}/>
                          <span>کۆگا هەمووی ئەگوێرێت: <strong>+{i.warehouseBonusQty}</strong> — نوێنەر: 0</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-violet-600">
                            <span>🏪 کۆگا دەنێرێت:</span>
                            <strong>+{i.warehouseBonusQty}</strong>
                            <span className="text-muted-foreground">({i.warehousePct}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-orange-600">
                            <span>👤 نوێنەر خۆی دەگواستێنەوە:</span>
                            <strong>+{i.agentPendingQty}</strong>
                            <span className="text-muted-foreground">({Math.max(0, i.repAgreedPct - i.warehousePct)}%)</span>
                          </div>
                        </>
                      )}
                      <div className="text-[10px] text-muted-foreground border-t pt-1">
                        کۆی بۆنەس: <strong>{i.totalBonusQty}</strong> دانە ({i.repAgreedPct}%)
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

            </div>{/* end px-6 py-5 space-y-5 */}
          </fieldset>
          </form>
          </ScrollArea>

          <DrawerFooter className="border-t shrink-0 px-6 py-4" dir="rtl">
            <div className="flex gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (pendingConfirm && !editOrder) { setPendingConfirm(false); return; }
                  setNewOrderOpen(false); resetForm();
                }}
              >
                {pendingConfirm && !editOrder ? "گۆڕین / دەستکاری" : "پاشگەزبوونەوە"}
              </Button>
              <Button
                type="submit"
                form="order-form"
                disabled={hasAnyViolation}
                className={cn(
                  "transition-all duration-300",
                  pendingConfirm && !editOrder && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 scale-105"
                )}
              >
                {editOrder
                  ? (isManager ? "پاشەکەوتکردنی گۆڕانکاری" : "ناردنی داوای گۆڕانکاری")
                  : pendingConfirm
                    ? "✓ پەسەندکردن"
                    : "تۆمارکردنی داواکاری"
                }
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ════════════════════════════════════════════════════════════════
          ORDER DETAIL DRAWER (view only)
      ════════════════════════════════════════════════════════════════ */}
      {detailOrder && (() => {
        const o = orders.find(x => x.id === detailOrder.id) || detailOrder;
        return (
          <Dialog open={!!detailOrder} onOpenChange={open => !open && setDetailOrder(null)}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader><DialogTitle>داواکاری — {o.orderNumber}</DialogTitle><DialogDescription>وردەکاری داواکاری</DialogDescription></DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2.5 flex-wrap items-center">
                <StatusBadge status={o.status} />
                {o.driverName && <span className="text-[13px] text-muted-foreground">— شوفێر: <strong>{o.driverName}</strong> · {o.driverPhone}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "کڕیار", value: o.clientName },
                  { label: "نوێنەر", value: o.repName },
                  { label: "فارمۆخانە", value: o.pharmacyName || "ڕاستەوخۆ" },
                  { label: "کۆی گشتی", value: formatIQD(o.totalAmount) },
                  { label: "بەروار", value: new Date(o.createdAt).toLocaleDateString("ku") },
                  ...(o.rejectionReason ? [{ label: "هۆی ڕەتکردن", value: o.rejectionReason }] : []),
                  ...(o.deliveredAt ? [{ label: "بەرواری گەیشتن", value: new Date(o.deliveredAt).toLocaleDateString("ku") }] : []),
                  ...(o.paidAt ? [{ label: "بەرواری پارەدان", value: new Date(o.paidAt).toLocaleDateString("ku") }] : []),
                ].map(f => (
                  <div key={f.label} className="px-3.5 py-2.5 bg-muted rounded-[10px] border border-border">
                    <div className="text-[11px] text-muted-foreground mb-0.5">{f.label}</div>
                    <div className="font-semibold text-sm">{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="border border-border rounded-[10px] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["بەرهەم", "ژمارە", "🏪 کۆگا", "👤 ماوەی نوێنەر", "نرخ", "کۆ"].map(h => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {o.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-violet-600 font-semibold">{(item.warehouseBonusQty || 0) > 0 ? `+${item.warehouseBonusQty}` : "—"}</TableCell>
                        <TableCell className="text-orange-600 font-semibold">{(item.repBonusQty || 0) > 0 ? `+${item.repBonusQty}` : "—"}</TableCell>
                        <TableCell>{formatIQD(item.unitPrice)}</TableCell>
                        <TableCell className="font-semibold">{formatIQD(item.quantity * item.unitPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Rep pending banner */}
              {o.items.some(i => (i.repBonusQty ?? 0) > 0) && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-[10px] text-[13px] text-orange-700">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                  <span>
                    نوێنەر پێویستە <strong>{o.items.reduce((s,i) => s + (i.repBonusQty ?? 0), 0)}</strong> دانە بۆنەس خۆی بگواستێنەوە بە داروخانەکە
                  </span>
                </div>
              )}
              {o.signedInvoiceUrl && <a href={o.signedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-[13px] font-semibold">📄 پسوولەی واژووکراو</a>}
              {o.signedReceiptUrl && <a href={o.signedReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 text-[13px] font-semibold">🧾 پسوولەی پارەدان</a>}
              {o.notes && <p className="text-[13px] text-muted-foreground bg-muted px-3.5 py-2.5 rounded-[10px] m-0">{o.notes}</p>}
            </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          COMBINED READY + SEND MODAL (IN_PROGRESS → SENT)
          Clicking "ئامادەیە+ناردن" opens this immediately
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!sendModalOrder} onOpenChange={open => !open && setSendModalOrder(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ئامادەیە — هەڵبژاردنی شوفێر</DialogTitle><DialogDescription>شوفێرێک هەڵبژێرە بۆ ناردنی داواکاری</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-4 modal-stagger">
          {sendModalOrder && (
            <div className="px-3.5 py-2.5 bg-muted rounded-[10px] text-[13px]">
              <span className="text-muted-foreground">داواکاری </span>
              <strong className="text-primary">{sendModalOrder.orderNumber}</strong>
              <span className="text-muted-foreground"> — {sendModalOrder.clientName}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>شوفێر *</Label>
            <Select value={selectedDriverId || null} onValueChange={(v: string | null) => v && setSelectedDriverId(v)}>
              <SelectTrigger><SelectValue placeholder="هەڵبژاردن..." /></SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.isActive).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name} — {d.city} ({d.phone})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDriverId && (() => {
            const d = drivers.find(x => x.id === selectedDriverId);
            return d ? (
              <div className="p-3.5 bg-violet-100 dark:bg-violet-950/30 rounded-[10px]">
                <div className="font-bold text-violet-600 text-[15px]">{d.name}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">{d.phone} · {d.city}</div>
                {d.telegramChatId
                  ? <div className="text-xs text-violet-600 mt-1">📱 تێلێگرام: ئاگاداری دەنێردرێت</div>
                  : <div className="text-xs text-muted-foreground mt-1">⚠️ Chat ID نییە — ئاگاداری نانێردرێت</div>
                }
              </div>
            ) : null;
          })()}
          {/* Telegram voice info banner */}
          <div className="px-3.5 py-3 bg-primary/5 rounded-[10px] border border-primary/20">
            <div className="text-[13px] font-bold text-primary mb-1">🎙️ ئەوازی تێبینی</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              دوای کرتەکردن لەسەر <b>"✔ ئامادەیە"</b>، بۆتی تێلێگرام پەیامێک دەنێرێت بۆ ئاگادارکەرەکان داوا دەکات تۆمارکردنی ئەوازی تێبینی.
              ئەو ئەوازەیان بینێرن بۆ بۆتەکە — بۆتەکە بەخۆی دەیدرێتە شوفێرەکە.
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSendModalOrder(null)}>پاشگەزبوونەوە</Button>
            <Button onClick={confirmSend} disabled={sending || !selectedDriverId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {sending ? "ناردن..." : "✔ ئامادەیە"}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* INVOICE UPLOAD */}
      <Dialog open={!!invoiceModalOrder} onOpenChange={open => { if (!open) { setInvoiceModalOrder(null); setInvoiceFiles([]); } }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>بارکردنی پسوولەی واژووکراو</DialogTitle><DialogDescription>فایلی پسوولەی واژووکراو باربکە</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-4 modal-stagger">

          {/* Drop zone */}
          <div
            onClick={() => invoiceRef.current?.click()}
            onDragOver={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.classList.add('drop-zone--active');
            }}
            onDragLeave={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.classList.remove('drop-zone--active');
            }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.classList.remove('drop-zone--active');
              const dropped = Array.from(e.dataTransfer.files);
              if (dropped.length) setInvoiceFiles(prev => [...prev, ...dropped]);
            }}
            className="drop-zone"
          >
            <Upload size={24} style={{ color: "hsl(var(--muted-foreground))" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#171717" }}>فایلێک هەڵبژێرە یان ئێرە بیکێشە (چەند فایل دەتوانیت)</div>
              <div style={{ fontSize: 12, color: "#5C5C5C", marginTop: 4 }}>وێنە، PDF، تا ٥٠ MB</div>
            </div>
            <div style={{ padding: "6px 14px", background: "hsl(var(--card))", border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 13, color: "#5C5C5C", fontWeight: 500, boxShadow: "0 1px 2px rgba(10,13,20,.03)" }}>
              هەڵبژاردنی فایل
            </div>
            <input ref={invoiceRef} type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }}
              onChange={e => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length) setInvoiceFiles(prev => [...prev, ...picked]);
                e.target.value = ""; // reset so same file can be re-added
              }} />
          </div>

          {/* File cards — one per file */}
          {invoiceFiles.length > 0 && (
            <div className="flex flex-col gap-2">
              {invoiceFiles.map((file, idx) => (
                <div key={idx} className={`rounded-xl p-3 flex flex-col gap-2.5 transition-all border ${uploading ? 'border-border bg-card' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-red-100 dark:bg-red-950/30 rounded-lg flex items-center justify-center shrink-0 text-base">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{file.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                        <span className="text-[11px] text-muted-foreground">∙</span>
                        {uploading ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            <span className="inline-block w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            بارکردن...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                            <CheckCircle size={11} /> تەواوبوو
                          </span>
                        )}
                      </div>
                    </div>
                    {!uploading && (
                      <Button variant="ghost" size="icon" onClick={() => setInvoiceFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="size-6 shrink-0">
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                  {uploading && (
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <style>{`
            @keyframes progress-pulse {
              0%   { width: 10%; } 50% { width: 70%; } 100% { width: 90%; }
            }
          `}</style>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setInvoiceModalOrder(null); setInvoiceFiles([]); }}>
              پاشگەزبوونەوە
            </Button>
            <Button onClick={confirmDelivered} disabled={uploading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
              <CheckCircle size={16} />
              {uploading ? "بارکردن..." : "گەیشت"}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={!!rejectOrder} onOpenChange={open => { if (!open) { setRejectOrder(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ڕەتکردنەوەی داواکاری</DialogTitle><DialogDescription>هۆی ڕەتکردنەوە بنووسە</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-3.5 modal-stagger">
          <p className="text-sm text-muted-foreground m-0">هۆی ڕەتکردنەوە بنووسە (ئەگەر پێویست بوو).</p>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="هۆی ڕەتکردنەوە..." className="resize-y min-h-[80px]" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setRejectOrder(null); setRejectReason(""); }}>پاشگەزبوونەوە</Button>
            <Button variant="destructive" onClick={confirmReject}>ڕەتکردنەوە ✓</Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* PAYMENT DIALOG */}
      <Dialog open={!!payModalOrder} onOpenChange={open => !open && setPayModalOrder(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>پارەدانی داواکاری</DialogTitle><DialogDescription>ڕێگای پارەدان دیاری بکە</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-4 modal-stagger">
          {payModalOrder && (
            <>
              {/* Order summary */}
              <div className="bg-muted rounded-xl px-4 py-3.5 flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">داواکاری</span>
                  <strong className="text-primary">{payModalOrder.orderNumber}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">کڕیار</span>
                  <span className="font-semibold">{payModalOrder.clientName}</span>
                </div>
                <div className="border-t border-border mt-1 pt-2 flex justify-between text-base">
                  <span className="text-muted-foreground font-semibold">کۆی گشتی</span>
                  <strong className="text-emerald-600 text-lg">
                    {new Intl.NumberFormat("ar-IQ").format(payModalOrder.totalAmount)} IQD
                  </strong>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <div className="text-[13px] font-bold text-muted-foreground mb-2.5">ڕێگای پارەدان</div>
                <div className="flex gap-2.5">
                  {(["CASH", "TRANSFER"] as const).map(method => (
                    <Button key={method} type="button" variant={payMethod === method ? "outline" : "ghost"}
                      onClick={() => setPayMethod(method)}
                      className={cn("flex-1 py-3 rounded-[10px] font-bold text-sm border-2",
                        payMethod === method
                          ? method === "CASH"
                            ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600"
                            : "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      )}>
                      {method === "CASH" ? "💵 کاش" : "🏦 حەواڵە"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayModalOrder(null)}>
                  پاشگەزبوونەوە
                </Button>
                <Button onClick={confirmPayment} disabled={paying} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <DollarSign size={16} />
                  {paying ? "پرۆسەکردن..." : "پارەدراوە ✔"}
                </Button>
              </div>
            </>
          )}
        </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی داواکاری</AlertDialogTitle>
            <AlertDialogDescription>دڵنیای لە سڕینەوەی ئەم داواکارییە؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { deleteOrder(deleteId); setDeleteId(null); } }}>سڕینەوە</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Print ── */}
      {printOrder && <PrintModal open={true} order={printOrder} onClose={() => setPrintOrder(null)} />}
    </>
  );
}
