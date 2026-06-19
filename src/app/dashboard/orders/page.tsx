"use client";
import { useState, FormEvent, useRef } from "react";
import { Search, Plus, ShoppingCart, Eye, Edit3, Trash2, X, Printer, FileText, Package } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus, RoutingMode, OrderItem } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";

const statusLabels: Record<OrderStatus, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
const statusClasses: Record<OrderStatus, string> = { PENDING: "pending", PROCESSING: "processing", SHIPPED: "shipped", DELIVERED: "delivered", PAID: "paid", CANCELLED: "cancelled" };
const routingLabels: Record<RoutingMode, string> = { DIRECT: "ڕاستەوخۆ", WAREHOUSE: "لە ڕێگای کۆگا", REP_DELIVERY: "گەیاندنی نوێنەر" };

export default function OrdersPage() {
  const { orders, clients, reps, warehouses, products, addOrder, updateOrder, deleteOrder, addDelivery, addTransaction, settings } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // New order form
  const [form, setForm] = useState({ clientId: "", repId: "", warehouseId: "", routingMode: "DIRECT" as RoutingMode, totalBonusPct: "", notes: "" });
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: string; }[]>([{ productId: "", quantity: "" }]);

  const resetForm = () => {
    setForm({ clientId: "", repId: "", warehouseId: "", routingMode: "DIRECT", totalBonusPct: "", notes: "" });
    setOrderItems([{ productId: "", quantity: "" }]);
  };

  const addItemRow = () => setOrderItems([...orderItems, { productId: "", quantity: "" }]);
  const removeItemRow = (i: number) => setOrderItems(orderItems.filter((_, j) => j !== i));
  const updateItemRow = (i: number, field: string, value: string) => setOrderItems(orderItems.map((item, j) => j === i ? { ...item, [field]: value } : item));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.clientId);
    const rep = reps.find(r => r.id === form.repId);
    const wh = warehouses.find(w => w.id === form.warehouseId);
    if (!client || !rep) return;

    const totalBonusPct = Number(form.totalBonusPct) || 0;
    const warehouseBonusPct = wh ? wh.bonusPct : 0;
    const repBonusPct = Math.max(0, totalBonusPct - warehouseBonusPct);

    const items: OrderItem[] = orderItems.filter(i => i.productId && i.quantity).map(i => {
      const prod = products.find(p => p.id === i.productId);
      const qty = Number(i.quantity);
      const bonusQty = Math.round(qty * totalBonusPct / 100);
      return { productId: i.productId, productName: prod?.name || "", quantity: qty, bonusQty, unitPrice: prod?.price || 0 };
    });

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const bonusNotation = items.map(i => `${i.quantity}+${i.bonusQty}`).join(", ");

    const newOrder = addOrder({
      clientId: client.id, clientName: client.name, repId: rep.id, repName: rep.name,
      warehouseId: wh?.id || null, warehouseName: wh?.name || null,
      items, status: "PENDING", routingMode: form.routingMode,
      bonusNotation, totalBonusPct, warehouseBonusPct, repBonusPct, totalAmount, notes: form.notes,
    });

    // Auto-create delivery
    addDelivery({
      orderId: newOrder.id, orderNumber: newOrder.orderNumber,
      type: form.routingMode, driver: "", driverPhone: "",
      destination: `${client.name} — ${client.city}`,
      status: "PENDING",
      items: items.map(i => `${i.productName} × ${i.quantity + i.bonusQty}`).join(", "),
      dispatchedAt: "—", deliveredAt: "—",
    });

    setModalOpen(false);
  };

  const changeStatus = (id: string, status: OrderStatus) => {
    updateOrder(id, { status });
    if (status === "PAID") {
      const order = orders.find(o => o.id === id);
      if (order) {
        addTransaction({ type: "INCOME", description: `پارەدانی ${order.clientName} — ${order.orderNumber}`, amount: order.totalAmount, method: "CASH", relatedOrderId: id });
      }
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm);
    const matchStatus = statusFilter === "هەموو" || statusLabels[o.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const handlePrint = (order: Order) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 300);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FEF3EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#F47B35" }}><ShoppingCart size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>داواکارییەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی داواکاری و سیستەمی بۆنەس</p></div>
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="topbar-add-btn"><Plus size={16} /><span>داواکاری نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داواکاری", value: String(orders.length) },
          { title: "چاوەڕوان", value: String(orders.filter(o => o.status === "PENDING").length), color: "#FD7E14" },
          { title: "لە پڕۆسەدا", value: String(orders.filter(o => o.status === "PROCESSING" || o.status === "SHIPPED").length), color: "#339AF0" },
          { title: "کۆی داهات", value: formatIQD(orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0)) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان بە ژمارە یان ناوی کڕیار..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {["هەموو", ...Object.values(statusLabels)].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: statusFilter === s ? "white" : "transparent", color: statusFilter === s ? "#1A1A2E" : "#6C757D", boxShadow: statusFilter === s ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>ژمارە</th><th>کڕیار</th><th>نوێنەر</th><th>شێواز</th><th>بۆنەس</th><th>کۆی گشتی</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{o.orderNumber}</td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{o.clientName}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{o.repName}</td>
                <td><span style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: o.routingMode === "WAREHOUSE" ? "#EDF2FF" : o.routingMode === "DIRECT" ? "#EBFBEE" : "#FEF3EB", color: o.routingMode === "WAREHOUSE" ? "#4263EB" : o.routingMode === "DIRECT" ? "#40C057" : "#F47B35" }}>{routingLabels[o.routingMode]}</span></td>
                <td style={{ fontWeight: 600, fontSize: 13, color: "#7C5CFC" }}>{o.bonusNotation}</td>
                <td style={{ fontWeight: 600, fontSize: 14 }}>{formatIQD(o.totalAmount)}</td>
                <td>
                  <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #DEE2E6", fontFamily: "inherit", cursor: "pointer", background: "white" }}>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setDetailOrder(o)} style={{ padding: 4, color: "#4263EB", background: "none", border: "none", cursor: "pointer" }} title="وردەکاری"><Eye size={14} /></button>
                    <button onClick={() => handlePrint(o)} style={{ padding: 4, color: "#40C057", background: "none", border: "none", cursor: "pointer" }} title="چاپکردن"><Printer size={14} /></button>
                    <button onClick={() => setDeleteId(o.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }} title="سڕینەوە"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} داواکاری</span></div>
      </div>

      {/* New Order Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="داواکاری نوێ" width={700}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="کڕیار" required><select style={selectStyle} required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">هەڵبژاردن...</option>{clients.filter(c => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
            <FormField label="نوێنەر" required><select style={selectStyle} required value={form.repId} onChange={(e) => setForm({ ...form, repId: e.target.value })}><option value="">هەڵبژاردن...</option>{reps.filter(r => r.isActive).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></FormField>
            <FormField label="شێوازی ڕاستکردن"><select style={selectStyle} value={form.routingMode} onChange={(e) => setForm({ ...form, routingMode: e.target.value as RoutingMode })}>{Object.entries(routingLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            {form.routingMode === "WAREHOUSE" && (
              <FormField label="کۆگا"><select style={selectStyle} value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}><option value="">هەڵبژاردن...</option>{warehouses.filter(w => w.isActive).map((w) => <option key={w.id} value={w.id}>{w.name} ({w.bonusPct}٪)</option>)}</select></FormField>
            )}
            <FormField label="ڕێژەی بۆنەسی گشتی (٪)"><input style={inputStyle} type="number" min="0" value={form.totalBonusPct} onChange={(e) => setForm({ ...form, totalBonusPct: e.target.value })} placeholder="بۆ نموونە: ٥٠" /></FormField>
          </FormGrid>

          {/* Bonus Split Preview */}
          {form.totalBonusPct && form.warehouseId && (
            <div style={{ marginTop: 16, padding: 16, background: "#F8F9FA", borderRadius: 10, border: "1px solid #E9ECEF" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>شیکاری بۆنەس:</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div><span style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی گشتی:</span> <span style={{ fontWeight: 700, color: "#4263EB" }}>{form.totalBonusPct}٪</span></div>
                <div><span style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی کۆگا:</span> <span style={{ fontWeight: 700, color: "#F47B35" }}>{warehouses.find(w => w.id === form.warehouseId)?.bonusPct || 0}٪</span></div>
                <div><span style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی نوێنەر:</span> <span style={{ fontWeight: 700, color: "#40C057" }}>{Math.max(0, Number(form.totalBonusPct) - (warehouses.find(w => w.id === form.warehouseId)?.bonusPct || 0))}٪</span></div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div style={{ marginTop: 24, borderTop: "1px solid #E9ECEF", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>بەرهەمەکان</h4>
              <button type="button" onClick={addItemRow} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> ڕیز</button>
            </div>
            {orderItems.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center" }}>
                <select style={{ ...selectStyle, flex: 2 }} value={item.productId} onChange={(e) => updateItemRow(i, "productId", e.target.value)}>
                  <option value="">بەرهەم هەڵبژێرە...</option>
                  {products.filter(p => p.isActive && p.stock > 0).map((p) => <option key={p.id} value={p.id}>{p.name} — {formatIQD(p.price)} ({p.stock} بەردەست)</option>)}
                </select>
                <input style={{ ...inputStyle, flex: 1 }} type="number" min="1" placeholder="بڕ" value={item.quantity} onChange={(e) => updateItemRow(i, "quantity", e.target.value)} />
                {orderItems.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(i)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>

          <FormField label="تێبینی"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="تێبینی دڵخوازانە..." /></FormField>
          <FormActions onCancel={() => setModalOpen(false)} submitLabel="تۆمارکردنی داواکاری" />
        </form>
      </Modal>

      {/* Order Detail Drawer */}
      {detailOrder && (
        <div onClick={() => setDetailOrder(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400, animation: "fadeIn 0.15s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 480, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", animation: "slideInRight 0.2s ease", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>وردەکاری داواکاری {detailOrder.orderNumber}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePrint(detailOrder)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Printer size={12} /> چاپ</button>
                <button onClick={() => setDetailOrder(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[
                  { l: "کڕیار", v: detailOrder.clientName },
                  { l: "نوێنەر", v: detailOrder.repName },
                  { l: "شێواز", v: routingLabels[detailOrder.routingMode] },
                  { l: "کۆگا", v: detailOrder.warehouseName || "—" },
                  { l: "بارودۆخ", v: statusLabels[detailOrder.status] },
                  { l: "بەروار", v: detailOrder.createdAt },
                ].map((item, i) => (
                  <div key={i}><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>{item.l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{item.v}</div></div>
                ))}
              </div>

              {/* Bonus Breakdown */}
              <div style={{ padding: 16, background: "#F8F9FA", borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>شیکاری بۆنەس</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div><span style={{ fontSize: 12, color: "#6C757D" }}>گشتی:</span> <span style={{ fontWeight: 700, color: "#4263EB" }}>{detailOrder.totalBonusPct}٪</span></div>
                  <div><span style={{ fontSize: 12, color: "#6C757D" }}>کۆگا:</span> <span style={{ fontWeight: 700, color: "#F47B35" }}>{detailOrder.warehouseBonusPct}٪</span></div>
                  <div><span style={{ fontSize: 12, color: "#6C757D" }}>نوێنەر:</span> <span style={{ fontWeight: 700, color: "#40C057" }}>{detailOrder.repBonusPct}٪</span></div>
                </div>
              </div>

              {/* Items */}
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>بەرهەمەکان</h4>
              <table style={{ width: "100%", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "1px solid #E9ECEF" }}><th style={{ textAlign: "right", padding: 8, fontWeight: 600 }}>بەرهەم</th><th style={{ textAlign: "right", padding: 8 }}>بڕ</th><th style={{ textAlign: "right", padding: 8 }}>بۆنەس</th><th style={{ textAlign: "right", padding: 8 }}>نرخ</th><th style={{ textAlign: "right", padding: 8 }}>کۆ</th></tr></thead>
                <tbody>
                  {detailOrder.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F1F3F5" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{item.productName}</td>
                      <td style={{ padding: 8 }}>{item.quantity}</td>
                      <td style={{ padding: 8, color: "#40C057", fontWeight: 600 }}>+{item.bonusQty}</td>
                      <td style={{ padding: 8 }}>{formatIQD(item.unitPrice)}</td>
                      <td style={{ padding: 8, fontWeight: 700 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: "left", marginTop: 12, fontSize: 18, fontWeight: 800 }}>کۆی گشتی: {formatIQD(detailOrder.totalAmount)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Print Invoice (hidden on screen, visible on print) */}
      {printOrder && (
        <div id="print-invoice" style={{ display: "none" }}>
          <style>{`@media print { body * { visibility: hidden !important; } #print-invoice, #print-invoice * { visibility: visible !important; display: block !important; } #print-invoice { position: fixed !important; left: 0; top: 0; width: 100%; padding: 24px; font-family: inherit; direction: rtl; } }`}</style>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>{settings.name}</h1>
              <p style={{ fontSize: 14, color: "#6C757D" }}>{settings.phone} | {settings.email}</p>
              <p style={{ fontSize: 12, color: "#ADB5BD" }}>{settings.address}</p>
            </div>
            <hr style={{ border: "1px solid #E9ECEF", margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div><strong>ژمارەی داواکاری:</strong> {printOrder.orderNumber}</div>
              <div><strong>بەروار:</strong> {printOrder.createdAt}</div>
            </div>
            <div style={{ marginBottom: 16 }}><strong>کڕیار:</strong> {printOrder.clientName} | <strong>نوێنەر:</strong> {printOrder.repName}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "2px solid #1A1A2E" }}><th style={{ textAlign: "right", padding: 8 }}>بەرهەم</th><th style={{ textAlign: "right", padding: 8 }}>بڕ</th><th style={{ textAlign: "right", padding: 8 }}>بۆنەس</th><th style={{ textAlign: "right", padding: 8 }}>نرخ</th><th style={{ textAlign: "right", padding: 8 }}>کۆ</th></tr></thead>
              <tbody>
                {printOrder.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E9ECEF" }}>
                    <td style={{ padding: 8 }}>{item.productName}</td><td style={{ padding: 8 }}>{item.quantity}</td><td style={{ padding: 8 }}>+{item.bonusQty}</td><td style={{ padding: 8 }}>{formatIQD(item.unitPrice)}</td><td style={{ padding: 8, fontWeight: 700 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "left", marginTop: 16, fontSize: 20, fontWeight: 800 }}>کۆی گشتی: {formatIQD(printOrder.totalAmount)}</div>
            <hr style={{ border: "1px solid #E9ECEF", margin: "24px 0" }} />
            <p style={{ textAlign: "center", fontSize: 12, color: "#ADB5BD" }}>سوپاس بۆ هاوکارییەکەتان — {settings.name}</p>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteOrder(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟" />
    </>
  );
}
