"use client";
import { useState, FormEvent, useRef } from "react";

import {
  Search, Plus, ShoppingCart, Eye, Trash2, X, Printer,
  CheckCircle, Clock, Package, Truck, Upload, XCircle, DollarSign,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus, OrderItem } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";
import PrintModal from "@/components/ui/PrintModal";
import ClientCombobox from "@/components/ui/ClientCombobox";
import type { ExportColumn } from "@/lib/export";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";
import { notifyDriverOfOrder, sendTelegramMessage } from "@/lib/telegram";


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

const STATUS_TABS = ["هەموو", ...Object.values(STATUS).map(s => s.label)];

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status] ?? { label: status, color: "#6C757D", bg: "#F1F3F5", icon: <Clock size={13} /> };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  );
}

function actionBtn(color: string, bg: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: bg, color, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" as const };
}

export default function OrdersPage() {
  const { orders, clients, reps, warehouses, products, drivers, settings, addOrder, updateOrder, deleteOrder, showToast, loading } = useData();
  const { currentUser } = useLayout();

  const isRep     = currentUser?.role === "REP";
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const myRep     = isRep ? reps.find(r => r.name === currentUser?.name) ?? reps.find(r => r.isActive) : undefined;

  // ── Filters ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("هەموو");

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


  // ── New order form ────────────────────────────────────────────────────
  const [form, setForm] = useState({ clientId: "", clientName: "", repId: myRep?.id || "", warehouseId: "", notes: "" });
  // Each item: productId, quantity, manualBonusPct (only for direct orders)
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: string; manualBonusPct: string }[]>([{ productId: "", quantity: "", manualBonusPct: "" }]);

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", repId: myRep?.id || "", warehouseId: "", notes: "" });
    setOrderItems([{ productId: "", quantity: "", manualBonusPct: "" }]);
  };

  const isDirect = !form.warehouseId;
  const selectedWarehouse = warehouses.find(w => w.id === form.warehouseId);

  // Bonus calculation — warehouse order: use warehouse rules; direct order: use manual %
  const getItemBonusPct = (productId: string, manualPct: string): { pct: number; isCustom: boolean } => {
    if (isDirect) {
      const pct = parseFloat(manualPct) || 0;
      return { pct, isCustom: false };
    }
    if (!selectedWarehouse) return { pct: 0, isCustom: false };
    const rule = (selectedWarehouse.bonusRules || []).find(r => r.productId === productId);
    return rule ? { pct: rule.percent, isCustom: true } : { pct: selectedWarehouse.bonusPct, isCustom: false };
  };

  const liveBonusItems = orderItems.filter(i => i.productId && i.quantity).map((i, idx) => {
    const prod = products.find(p => p.id === i.productId);
    const qty = Number(i.quantity);
    const { pct, isCustom } = getItemBonusPct(i.productId, orderItems[idx].manualBonusPct);
    return { name: prod?.name || "", qty, pct, isCustom, bonusQty: Math.round(qty * pct / 100) };
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.clientId);
    if (!client) { showToast("تکایە کڕیارێک هەڵبژێرە", "error"); return; }
    const repRecord = isRep ? myRep : reps.find(r => r.id === form.repId);
    if (!repRecord) { showToast("تکایە نوێنەرێک هەڵبژێرە", "error"); return; }

    const wh = warehouses.find(w => w.id === form.warehouseId);
    const items: OrderItem[] = orderItems.filter(i => i.productId && i.quantity).map((i) => {
      const prod = products.find(p => p.id === i.productId);
      const qty  = Number(i.quantity);
      const { pct } = getItemBonusPct(i.productId, i.manualBonusPct);
      return { productId: i.productId, productName: prod?.name || "", quantity: qty, bonusQty: Math.round(qty * pct / 100), unitPrice: prod?.price || 0, bonusPct: pct };
    });
    if (items.length === 0) { showToast("تکایە بەرهەمێک زیادبکە", "error"); return; }

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    await addOrder({
      clientId: client.id, clientName: client.name,
      repId: repRecord.id, repName: repRecord.name,
      warehouseId: wh?.id || null, warehouseName: wh?.name || null,
      items, status: "WAITING", totalAmount, notes: form.notes,
      driverId: "", driverName: "", driverPhone: "",
      signedInvoiceUrl: "", signedReceiptUrl: "",
      deliveredAt: "", paidAt: "", rejectionReason: "",
    });
    setNewOrderOpen(false);
    resetForm();
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

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (isRep && myRep && o.repId !== myRep.id && o.repName !== myRep.name) return false;
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm) || o.repName.includes(searchTerm);
    const matchStatus = statusFilter === "هەموو" || STATUS[o.status]?.label === statusFilter;
    return matchSearch && matchStatus;
  });

  const kpi = {
    total:   filtered.length,
    waiting: filtered.filter(o => o.status === "WAITING").length,
    sent:    filtered.filter(o => o.status === "SENT").length,
    paid:    filtered.filter(o => o.status === "PAID").length,
    amount:  filtered.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #F1F3F5", boxShadow: "0 1px 4px rgba(0,0,0,.05)" };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FEF3EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#F47B35" }}><ShoppingCart size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>داواکارییەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی داواکارییەکان و جەریانی کاری</p></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportCols} filename="orders" title="داواکارییەکان" />
          <button onClick={() => setNewOrderOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            <Plus size={16} /> داواکاری نوێ
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {loading ? <SkeletonKPI /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "کۆی داواکارییەکان", value: kpi.total,           color: "#4263EB", bg: "#EDF2FF" },
            { label: "چاوەڕوان",          value: kpi.waiting,          color: "#D97706", bg: "#FEF3C7" },
            { label: "نێردراوە",          value: kpi.sent,             color: "#7C3AED", bg: "#EDE9FE" },
            { label: "پارەدراوە",        value: kpi.paid,             color: "#059669", bg: "#D1FAE5" },
            { label: "کۆی داهات",        value: formatIQD(kpi.amount), color: "#0891B2", bg: "#CFFAFE" },
          ].map(k => (
            <div key={k.label} style={card}>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ ...card, marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="گەڕان بە ژمارە یان کڕیار..." style={{ ...inputStyle, paddingLeft: 38, width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setStatusFilter(t)} style={{ padding: "6px 14px", borderRadius: 99, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", borderColor: statusFilter === t ? "#4263EB" : "#DEE2E6", background: statusFilter === t ? "#EDF2FF" : "#fff", color: statusFilter === t ? "#4263EB" : "#495057", transition: "all .15s" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F3F5", background: "#FAFAFA" }}>
                {["ژمارە", "کڕیار", "نوێنەر", "بارودۆخ", "کۆی گشتی", "بەروار", "کردار"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#495057", fontSize: 13, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTableRows cols={7} /> : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#ADB5BD" }}>هیچ داواکارییەک نەدۆزرایەوە</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #F8F9FA", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#4263EB" }}>{o.orderNumber}</td>
                  <td style={{ padding: "12px 16px" }}>{o.clientName}</td>
                  <td style={{ padding: "12px 16px", color: "#6C757D", fontSize: 13 }}>{o.repName}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{formatIQD(o.totalAmount)}</td>
                  <td style={{ padding: "12px 16px", color: "#6C757D", fontSize: 13 }}>{new Date(o.createdAt).toLocaleDateString("ku")}</td>

                  {/* ── Inline action buttons ── */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {/* Status-specific actions (manager only) */}
                      {isManager && o.status === "WAITING" && <>
                        <button onClick={() => acceptOrder(o)} style={actionBtn("#059669", "#D1FAE5")}><CheckCircle size={12} /> قبووڵکردن</button>
                        <button onClick={() => setRejectOrder(o)} style={actionBtn("#DC2626", "#FEE2E2")}><XCircle size={12} /> ڕەتکردن</button>
                      </>}
                      {isManager && o.status === "IN_PROGRESS" && (
                        <button onClick={() => openSendModal(o)} style={actionBtn("#059669", "#D1FAE5")}><CheckCircle size={12} /> ئامادەیە</button>
                      )}
                      {isManager && o.status === "READY" && (
                        <button onClick={() => updateOrder(o.id, { status: "SENT" })} style={actionBtn("#7C3AED", "#EDE9FE")}><Truck size={12} /> نێردراوە ✓</button>
                      )}
                      {isManager && o.status === "SENT" && (
                        <button onClick={() => setInvoiceModalOrder(o)} style={actionBtn("#0891B2", "#CFFAFE")}><Upload size={12} /> گەیشتووە</button>
                      )}
                      {isManager && o.status === "DELIVERED" && (
                        <button onClick={() => { setPayModalOrder(o); setPayMethod("CASH"); }} style={actionBtn("#059669", "#D1FAE5")}><DollarSign size={12} /> پارەدان</button>
                      )}
                      {/* Always available */}
                      <button onClick={() => setDetailOrder(o)} style={{ padding: "5px 8px", background: "#F1F3F5", color: "#495057", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}><Eye size={13} /></button>
                      <button onClick={() => setPrintOrder(o)} style={{ padding: "5px 8px", background: "#F1F3F5", color: "#495057", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}><Printer size={13} /></button>
                      {isManager && <button onClick={() => setDeleteId(o.id)} style={{ padding: "5px 8px", background: "#FFF5F5", color: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          NEW ORDER MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={newOrderOpen} onClose={() => { setNewOrderOpen(false); resetForm(); }} title="داواکاری نوێ" width={720}>
        <form onSubmit={handleSubmit}>
          <FormGrid cols={2}>
            <FormField label="کڕیار" required>
              <ClientCombobox clients={clients} value={form.clientId} clientName={form.clientName}
                onChange={(id, name) => setForm({ ...form, clientId: id, clientName: name })}
                onRequestNew={(name) => setForm({ ...form, clientName: name })} />
            </FormField>
            {!isRep ? (
              <FormField label="نوێنەر" required>
                <select style={selectStyle} value={form.repId} onChange={e => setForm({ ...form, repId: e.target.value })} required>
                  <option value="">هەڵبژاردن...</option>
                  {reps.filter(r => r.isActive).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </FormField>
            ) : (
              <FormField label="نوێنەر">
                <div style={{ padding: "8px 12px", background: "#EDF2FF", borderRadius: 8, fontSize: 14, color: "#4263EB", fontWeight: 600 }}>{myRep?.name || currentUser?.name}</div>
              </FormField>
            )}
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="کۆگا">
              <select style={selectStyle} value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">— ڕاستەوخۆ (بێ کۆگا) —</option>
                {warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormField>
            <FormField label="تێبینی">
              <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="تێبینی..." />
            </FormField>
          </FormGrid>

          {/* Warehouse bonus info banner */}
          {selectedWarehouse && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: "#EDE9FE", borderRadius: 10, fontSize: 13, color: "#7C3AED" }}>
              🏪 <strong>{selectedWarehouse.name}</strong> — بۆنەسی بنەڕەتی: <strong>{selectedWarehouse.bonusPct}%</strong>
              {selectedWarehouse.bonusRules.length > 0 && <span> · {selectedWarehouse.bonusRules.length} ڕێگەی تایبەت</span>}
            </div>
          )}
          {isDirect && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FEF3C7", borderRadius: 10, fontSize: 13, color: "#D97706" }}>
              📦 داواکاری ڕاستەوخۆ — دەتوانی بۆ هەر بەرهەمێک بۆنەسی دیاری بکەیت (ئەگەر بەتاڵ بهێڵیتەوە = بۆنەس نییە)
            </div>
          )}

          {/* Product rows */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>بەرهەمەکان</span>
              <button type="button" onClick={() => setOrderItems([...orderItems, { productId: "", quantity: "", manualBonusPct: "" }])}
                style={{ background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ زیادکردن</button>
            </div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: isDirect ? "1fr 120px 110px auto" : "1fr 120px auto", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6C757D" }}>بەرهەم</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6C757D" }}>ژمارە</div>
              {isDirect && <div style={{ fontSize: 12, fontWeight: 600, color: "#D97706" }}>بۆنەس %</div>}
              <div />
            </div>
            {orderItems.map((item, idx) => {
              const { pct, isCustom } = getItemBonusPct(item.productId, item.manualBonusPct);
              const bonusQty = item.quantity && item.productId ? Math.round(Number(item.quantity) * pct / 100) : 0;
              return (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: isDirect ? "1fr 120px 110px auto" : "1fr 120px auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select style={selectStyle} value={item.productId} onChange={e => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, productId: e.target.value } : x))}>
                    <option value="">بەرهەم هەڵبژێرە...</option>
                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div style={{ position: "relative" }}>
                    <input type="number" min={1} style={inputStyle} placeholder="ژمارە" value={item.quantity}
                      onChange={e => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                    {!isDirect && bonusQty > 0 && (
                      <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: isCustom ? "#D1FAE5" : "#EDE9FE", color: isCustom ? "#059669" : "#7C3AED", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 6px", pointerEvents: "none" }}>
                        +{bonusQty}{isCustom ? "★" : ""}
                      </span>
                    )}
                  </div>
                  {isDirect && (
                    <div style={{ position: "relative" }}>
                      <input type="number" min={0} max={100} style={{ ...inputStyle, paddingRight: 28 }} placeholder="0" value={item.manualBonusPct}
                        onChange={e => setOrderItems(orderItems.map((x, i) => i === idx ? { ...x, manualBonusPct: e.target.value } : x))} />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#ADB5BD", pointerEvents: "none" }}>%</span>
                      {bonusQty > 0 && (
                        <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", background: "#FEF3C7", color: "#D97706", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 4px", pointerEvents: "none" }}>
                          +{bonusQty}
                        </span>
                      )}
                    </div>
                  )}
                  {orderItems.length > 1 && (
                    <button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                      style={{ background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 8, width: 34, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bonus preview */}
          {liveBonusItems.some(i => i.pct > 0) && (
            <div style={{ marginTop: 14, padding: 12, background: "#FAFAFA", borderRadius: 10, border: "1px solid #E9ECEF" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#495057" }}>داڕێژەی بۆنەس</div>
              {liveBonusItems.filter(i => i.pct > 0).map((i, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#495057", padding: "3px 0" }}>
                  <span>{i.name}</span>
                  <span style={{ color: isDirect ? "#D97706" : "#059669", fontWeight: 600 }}>{i.qty} + {i.bonusQty} = {i.qty + i.bonusQty} ({i.pct}%{i.isCustom ? " ★" : ""})</span>
                </div>
              ))}
            </div>
          )}

          <FormActions onCancel={() => { setNewOrderOpen(false); resetForm(); }} submitLabel="تۆمارکردنی داواکاری" />
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          ORDER DETAIL DRAWER (view only)
      ════════════════════════════════════════════════════════════════ */}
      {detailOrder && (() => {
        const o = orders.find(x => x.id === detailOrder.id) || detailOrder;
        return (
          <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`داواکاری — ${o.orderNumber}`} width={700}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <StatusBadge status={o.status} />
                {o.driverName && <span style={{ fontSize: 13, color: "#6C757D" }}>— شوفێر: <strong>{o.driverName}</strong> · {o.driverPhone}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "کڕیار", value: o.clientName },
                  { label: "نوێنەر", value: o.repName },
                  { label: "کۆگا", value: o.warehouseName || "ڕاستەوخۆ" },
                  { label: "کۆی گشتی", value: formatIQD(o.totalAmount) },
                  { label: "بەروار", value: new Date(o.createdAt).toLocaleDateString("ku") },
                  ...(o.rejectionReason ? [{ label: "هۆی ڕەتکردن", value: o.rejectionReason }] : []),
                  ...(o.deliveredAt ? [{ label: "بەرواری گەیشتن", value: new Date(o.deliveredAt).toLocaleDateString("ku") }] : []),
                  ...(o.paidAt ? [{ label: "بەرواری پارەدان", value: new Date(o.paidAt).toLocaleDateString("ku") }] : []),
                ].map(f => (
                  <div key={f.label} style={{ padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, border: "1px solid #F1F3F5" }}>
                    <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid #F1F3F5", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#FAFAFA" }}>
                    {["بەرهەم", "ژمارە", "بۆنەس", "نرخ", "کۆ"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#495057" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {o.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: "1px solid #F8F9FA" }}>
                        <td style={{ padding: "10px 14px" }}>{item.productName}</td>
                        <td style={{ padding: "10px 14px" }}>{item.quantity}</td>
                        <td style={{ padding: "10px 14px", color: "#059669", fontWeight: 600 }}>{item.bonusQty > 0 ? `+${item.bonusQty}` : "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{formatIQD(item.unitPrice)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {o.signedInvoiceUrl && <a href={o.signedInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4263EB", fontSize: 13, fontWeight: 600 }}>📄 پسوولەی واژووکراو</a>}
              {o.signedReceiptUrl && <a href={o.signedReceiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#059669", fontSize: 13, fontWeight: 600 }}>🧾 پسوولەی پارەدان</a>}
              {o.notes && <p style={{ fontSize: 13, color: "#6C757D", background: "#FAFAFA", padding: "10px 14px", borderRadius: 10, margin: 0 }}>{o.notes}</p>}
            </div>
          </Modal>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          COMBINED READY + SEND MODAL (IN_PROGRESS → SENT)
          Clicking "ئامادەیە+ناردن" opens this immediately
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={!!sendModalOrder} onClose={() => setSendModalOrder(null)} title="ئامادەیە — هەڵبژاردنی شوفێر" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sendModalOrder && (
            <div style={{ padding: "10px 14px", background: "#F8F9FA", borderRadius: 10, fontSize: 13 }}>
              <span style={{ color: "#6C757D" }}>داواکاری </span>
              <strong style={{ color: "#4263EB" }}>{sendModalOrder.orderNumber}</strong>
              <span style={{ color: "#6C757D" }}> — {sendModalOrder.clientName}</span>
            </div>
          )}
          <FormField label="شوفێر" required>
            <select style={selectStyle} value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
              <option value="">هەڵبژاردن...</option>
              {drivers.filter(d => d.isActive).map(d => (
                <option key={d.id} value={d.id}>{d.name} — {d.city} ({d.phone})</option>
              ))}
            </select>
          </FormField>
          {selectedDriverId && (() => {
            const d = drivers.find(x => x.id === selectedDriverId);
            return d ? (
              <div style={{ padding: 14, background: "#EDE9FE", borderRadius: 10 }}>
                <div style={{ fontWeight: 700, color: "#7C3AED", fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 13, color: "#6C757D", marginTop: 2 }}>{d.phone} · {d.city}</div>
                {d.telegramChatId
                  ? <div style={{ fontSize: 12, color: "#7C3AED", marginTop: 4 }}>📱 تێلێگرام: ئاگاداری دەنێردرێت</div>
                  : <div style={{ fontSize: 12, color: "#ADB5BD", marginTop: 4 }}>⚠️ Chat ID نییە — ئاگاداری نانێردرێت</div>
                }
              </div>
            ) : null;
          })()}
          {/* Telegram voice info banner */}
          <div style={{ padding: "12px 14px", background: "#F0F4FF", borderRadius: 10, border: "1px solid #C5D2FF" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4263EB", marginBottom: 4 }}>🎙️ ئەوازی تێبینی</div>
            <div style={{ fontSize: 12, color: "#495057", lineHeight: 1.8 }}>
              دوای کرتەکردن لەسەر <b>"✔ ئامادەیە"</b>، بۆتی تێلێگرام پەیامێک دەنێرێت بۆ ئاگادارکەرەکان داوا دەکات تۆمارکردنی ئەوازی تێبینی.
              ئەو ئەوازەیان بینێرن بۆ بۆتەکە — بۆتەکە بەخۆی دەیدرێتە شوفێرەکە.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setSendModalOrder(null)} style={{ padding: "9px 18px", background: "#F8F9FA", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer" }}>پاشگەزبوونەوە</button>
            <button onClick={confirmSend} disabled={sending || !selectedDriverId} style={{ padding: "9px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, opacity: sending || !selectedDriverId ? 0.6 : 1 }}>
              {sending ? "ناردن..." : "✔ ئامادەیە"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          INVOICE UPLOAD (SENT → DELIVERED)
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={!!invoiceModalOrder} onClose={() => { setInvoiceModalOrder(null); setInvoiceFiles([]); }} title="بارکردنی پسوولەی واژووکراو">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Drop zone */}
          <div
            onClick={() => invoiceRef.current?.click()}
            onDragOver={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.style.borderColor = "#4263EB";
              e.currentTarget.style.background  = "#EDF2FF";
            }}
            onDragLeave={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.style.borderColor = "#D1D1D1";
              e.currentTarget.style.background  = "#FAFAFA";
            }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.style.borderColor = "#D1D1D1";
              e.currentTarget.style.background  = "#FAFAFA";
              const dropped = Array.from(e.dataTransfer.files);
              if (dropped.length) setInvoiceFiles(prev => [...prev, ...dropped]);
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#4263EB")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#D1D1D1")}
            style={{ border: "1.5px dashed #D1D1D1", borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "border-color .2s, background .2s" }}
          >
            <Upload size={24} style={{ color: "#ADB5BD" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#171717" }}>فایلێک هەڵبژێرە یان ئێرە بیکێشە (چەند فایل دەتوانیت)</div>
              <div style={{ fontSize: 12, color: "#5C5C5C", marginTop: 4 }}>وێنە، PDF، تا ٥٠ MB</div>
            </div>
            <div style={{ padding: "6px 14px", background: "#fff", border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 13, color: "#5C5C5C", fontWeight: 500, boxShadow: "0 1px 2px rgba(10,13,20,.03)" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoiceFiles.map((file, idx) => (
                <div key={idx} style={{ border: `1px solid ${uploading ? "#E8E8E8" : "#D1FAE5"}`, borderRadius: 12, padding: "12px 14px", background: uploading ? "#fff" : "#F0FDF4", display: "flex", flexDirection: "column", gap: 10, transition: "all .3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: "#FEE2E2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#171717", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#5C5C5C" }}>{(file.size / 1024).toFixed(0)} KB</span>
                        <span style={{ fontSize: 11, color: "#5C5C5C" }}>∙</span>
                        {uploading ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#171717" }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #4263EB", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            بارکردن...
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#059669", fontWeight: 600 }}>
                            <CheckCircle size={11} /> تەواوبوو
                          </span>
                        )}
                      </div>
                    </div>
                    {!uploading && (
                      <button onClick={() => setInvoiceFiles(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#ADB5BD", flexShrink: 0, display: "flex" }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {uploading && (
                    <div style={{ height: 5, background: "#EBEBEB", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#4263EB", borderRadius: 999, animation: "progress-pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes progress-pulse {
              0%   { width: 10%; } 50% { width: 70%; } 100% { width: 90%; }
            }
          `}</style>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setInvoiceModalOrder(null); setInvoiceFiles([]); }}
              style={{ flex: 1, padding: "9px 18px", background: "#fff", border: "1px solid #E8E8E8", borderRadius: 10, cursor: "pointer", fontWeight: 500, color: "#5C5C5C", boxShadow: "0 1px 2px rgba(10,13,20,.03)" }}>
              پاشگەزبوونەوە
            </button>
            <button onClick={confirmDelivered} disabled={uploading}
              style={{ flex: 1, padding: "9px 18px", background: "#FA7319", color: "#fff", border: "none", borderRadius: 10, cursor: uploading ? "not-allowed" : "pointer", fontWeight: 600, opacity: uploading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <CheckCircle size={16} />
              {uploading ? "بارکردن..." : "گەیشت"}
            </button>
          </div>
        </div>
      </Modal>


      {/* ════════════════════════════════════════════════════════════════
          REJECT MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={!!rejectOrder} onClose={() => { setRejectOrder(null); setRejectReason(""); }} title="ڕەتکردنەوەی داواکاری">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 14, color: "#6C757D", margin: 0 }}>هۆی ڕەتکردنەوە بنووسە (ئەگەر پێویست بوو).</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="هۆی ڕەتکردنەوە..." style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setRejectOrder(null); setRejectReason(""); }} style={{ padding: "9px 18px", background: "#F8F9FA", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer" }}>پاشگەزبوونەوە</button>
            <button onClick={confirmReject} style={{ padding: "9px 18px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>ڕەتکردنەوە ✓</button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          PAYMENT MODAL (DELIVERED → PAID)
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={!!payModalOrder} onClose={() => setPayModalOrder(null)} title="پارەدانی داواکاری" width={420}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {payModalOrder && (
            <>
              {/* Order summary */}
              <div style={{ background: "#F8F9FA", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#6C757D" }}>داواکاری</span>
                  <strong style={{ color: "#4263EB" }}>{payModalOrder.orderNumber}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#6C757D" }}>کڕیار</span>
                  <span style={{ fontWeight: 600 }}>{payModalOrder.clientName}</span>
                </div>
                <div style={{ borderTop: "1px solid #E9ECEF", marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 16 }}>
                  <span style={{ color: "#6C757D", fontWeight: 600 }}>کۆی گشتی</span>
                  <strong style={{ color: "#059669", fontSize: 18 }}>
                    {new Intl.NumberFormat("ar-IQ").format(payModalOrder.totalAmount)} IQD
                  </strong>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#495057", marginBottom: 10 }}>ڕێگای پارەدان</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["CASH", "TRANSFER"] as const).map(method => (
                    <button key={method} type="button"
                      onClick={() => setPayMethod(method)}
                      style={{
                        flex: 1, padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, transition: "all .15s",
                        border: `2px solid ${payMethod === method ? (method === "CASH" ? "#059669" : "#4263EB") : "#E9ECEF"}`,
                        background: payMethod === method ? (method === "CASH" ? "#D1FAE5" : "#EDF2FF") : "#fff",
                        color: payMethod === method ? (method === "CASH" ? "#059669" : "#4263EB") : "#6C757D",
                      }}>
                      {method === "CASH" ? "💵 کاش" : "🏦 حەواڵە"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPayModalOrder(null)}
                  style={{ flex: 1, padding: "10px 18px", background: "#fff", border: "1px solid #E8E8E8", borderRadius: 10, cursor: "pointer", fontWeight: 500, color: "#5C5C5C" }}>
                  پاشگەزبوونەوە
                </button>
                <button onClick={confirmPayment} disabled={paying}
                  style={{ flex: 1, padding: "10px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: paying ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, opacity: paying ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <DollarSign size={16} />
                  {paying ? "پرۆسەکردن..." : "پارەدراوە ✔"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog open={!!deleteId} message="دڵنیای لە سڕینەوەی ئەم داواکارییە؟" onConfirm={() => { if (deleteId) { deleteOrder(deleteId); setDeleteId(null); } }} onClose={() => setDeleteId(null)} />

      {/* ── Print ── */}
      {printOrder && <PrintModal open={true} order={printOrder} onClose={() => setPrintOrder(null)} />}
    </>
  );
}
