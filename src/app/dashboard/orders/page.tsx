"use client";
import { useState, FormEvent } from "react";
import { Search, Plus, ShoppingCart, Eye, Trash2, X, Printer, CheckCircle, Clock, AlertCircle, Tag } from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus, RoutingMode, OrderItem } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";
import PrintModal from "@/components/ui/PrintModal";
import ClientCombobox from "@/components/ui/ClientCombobox";
import type { ExportColumn } from "@/lib/export";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";

const orderExportCols: ExportColumn[] = [
  { key: "orderNumber", label: "ژمارە" }, { key: "clientName", label: "کڕیار" },
  { key: "repName", label: "نوێنەر" }, { key: "status", label: "بارودۆخ" },
  { key: "totalAmount", label: "کۆی گشتی", format: (v) => String(v) },
  { key: "createdAt", label: "بەروار" },
];

const statusLabels: Record<OrderStatus, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
const statusClasses: Record<OrderStatus, string> = { PENDING: "pending", PROCESSING: "processing", SHIPPED: "shipped", DELIVERED: "delivered", PAID: "paid", CANCELLED: "cancelled" };
const routingLabels: Record<RoutingMode, string> = { DIRECT: "ڕاستەوخۆ", WAREHOUSE: "لە ڕێگای کۆگا", REP_DELIVERY: "گەیاندنی نوێنەر" };

export default function OrdersPage() {
  const { orders, clients, reps, warehouses, products, addOrder, updateOrder, deleteOrder, addDelivery, addTransaction, settings, loading } = useData();
  const { currentUser } = useLayout();

  const isRep = currentUser?.role === "REP";
  // Find the Rep record that matches the logged-in REP user by name
  const myRep = isRep ? reps.find(r => r.name === currentUser?.name || r.isActive) : undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // New order form — repId pre-filled for REP users
  const [form, setForm] = useState({
    clientId: "", clientName: "",
    repId: myRep?.id || "",
    warehouseId: "", routingMode: "DIRECT" as RoutingMode, notes: "",
  });
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: string; }[]>([{ productId: "", quantity: "" }]);

  // New client request flow
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", owner: "", phone: "", city: "", type: "PHARMACY" });
  const [newClientStatus, setNewClientStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const resetForm = () => {
    setForm({ clientId: "", clientName: "", repId: myRep?.id || "", warehouseId: "", routingMode: "DIRECT", notes: "" });
    setOrderItems([{ productId: "", quantity: "" }]);
    setShowNewClientForm(false);
    setNewClientForm({ name: "", owner: "", phone: "", city: "", type: "PHARMACY" });
    setNewClientStatus("idle");
  };

  const handlePrint = (o: Order) => setPrintOrder(o);
  const addItemRow = () => setOrderItems([...orderItems, { productId: "", quantity: "" }]);
  const removeItemRow = (i: number) => setOrderItems(orderItems.filter((_, j) => j !== i));
  const updateItemRow = (i: number, field: string, value: string) =>
    setOrderItems(orderItems.map((item, j) => j === i ? { ...item, [field]: value } : item));

  // Get the selected warehouse and its bonus rules
  const selectedWarehouse = warehouses.find(w => w.id === form.warehouseId);
  const getItemBonusPct = (productId: string): { pct: number; isCustom: boolean } => {
    if (!selectedWarehouse) return { pct: 0, isCustom: false };
    const customRule = (selectedWarehouse.bonusRules || []).find(r => r.productId === productId);
    if (customRule) return { pct: customRule.percent, isCustom: true };
    return { pct: selectedWarehouse.bonusPct, isCustom: false };
  };

  // Live bonus analysis from current form items
  const liveBonusItems = orderItems
    .filter(i => i.productId && i.quantity)
    .map(i => {
      const prod = products.find(p => p.id === i.productId);
      const qty = Number(i.quantity);
      const { pct, isCustom } = getItemBonusPct(i.productId);
      const bonusQty = Math.round(qty * pct / 100);
      return { name: prod?.name || "", qty, pct, isCustom, bonusQty };
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.clientId);

    // Rep: use myRep; Admin/Manager: use selected rep
    let repRecord = isRep ? myRep : reps.find(r => r.id === form.repId);
    if (!client || !repRecord) return;

    const wh = warehouses.find(w => w.id === form.warehouseId);
    const warehouseBonusPct = wh ? wh.bonusPct : 0;

    const items: OrderItem[] = orderItems.filter(i => i.productId && i.quantity).map(i => {
      const prod = products.find(p => p.id === i.productId);
      const qty = Number(i.quantity);
      const { pct, isCustom } = getItemBonusPct(i.productId);
      const bonusQty = Math.round(qty * pct / 100);
      return {
        productId: i.productId,
        productName: prod?.name || "",
        quantity: qty,
        bonusQty,
        unitPrice: prod?.price || 0,
        bonusPct: pct,
      };
    });

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const totalBonusPct = wh ? wh.bonusPct : 0;
    const repBonusPct = 0; // bonus is per-product, not a split anymore
    const bonusNotation = items.map(i => `${i.quantity}+${i.bonusQty}`).join(", ");

    const newOrder = await addOrder({
      clientId: client.id, clientName: client.name,
      repId: repRecord.id, repName: repRecord.name,
      warehouseId: wh?.id || null, warehouseName: wh?.name || null,
      items, status: "PENDING", routingMode: form.routingMode,
      bonusNotation, totalBonusPct, warehouseBonusPct, repBonusPct, totalAmount, notes: form.notes,
    });

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

  // REP: only see own orders
  const filtered = orders.filter((o) => {
    if (isRep && myRep && o.repName !== myRep.name && o.repId !== myRep.id) return false;
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm);
    const matchStatus = statusFilter === "هەموو" || statusLabels[o.status] === statusFilter;
    return matchSearch && matchStatus;
  });

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
        {loading ? (
          <>{[0,1,2,3].map(i => <SkeletonKPI key={i} />)}</>
        ) : [
          { title: "کۆی داواکاری", value: String(filtered.length) },
          { title: "چاوەڕوان", value: String(filtered.filter(o => o.status === "PENDING").length), color: "#FD7E14" },
          { title: "لە پڕۆسەدا", value: String(filtered.filter(o => o.status === "PROCESSING" || o.status === "SHIPPED").length), color: "#339AF0" },
          { title: "کۆی داهات", value: formatIQD(filtered.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0)) },
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
          <thead><tr><th>ژمارە</th><th>کڕیار</th>{!isRep && <th>نوێنەر</th>}<th>شێواز</th><th>بۆنەس</th><th>کۆی گشتی</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={isRep ? 7 : 8} />
            ) : filtered.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{o.orderNumber}</td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{o.clientName}</td>
                {!isRep && <td style={{ fontSize: 13, color: "#6C757D" }}>{o.repName}</td>}
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
                    {!isRep && <button onClick={() => setDeleteId(o.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }} title="سڕینەوە"><Trash2 size={14} /></button>}
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
            <FormField label="کڕیار" required>
              <ClientCombobox
                clients={clients}
                value={form.clientId}
                clientName={form.clientName}
                onChange={(id, name) => setForm({ ...form, clientId: id, clientName: name })}
                onRequestNew={(typedName) => {
                  setNewClientForm({ ...newClientForm, name: typedName });
                  setShowNewClientForm(true);
                  setNewClientStatus("idle");
                }}
              />
            </FormField>

            {/* Rep field: hidden for REP users (auto-filled) */}
            {isRep ? (
              <FormField label="نوێنەر">
                <div style={{ ...inputStyle, background: "#F8F4FF", color: "#7C5CFC", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  👤 {myRep?.name || currentUser?.name} (ئەمەی من)
                </div>
              </FormField>
            ) : (
              <FormField label="نوێنەر" required>
                <select style={selectStyle} required value={form.repId} onChange={(e) => setForm({ ...form, repId: e.target.value })}>
                  <option value="">هەڵبژاردن...</option>
                  {reps.filter(r => r.isActive).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </FormField>
            )}

            <FormField label="شێوازی ڕاستکردن"><select style={selectStyle} value={form.routingMode} onChange={(e) => setForm({ ...form, routingMode: e.target.value as RoutingMode })}>{Object.entries(routingLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            {form.routingMode === "WAREHOUSE" && (
              <FormField label="کۆگا">
                <select style={selectStyle} value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                  <option value="">هەڵبژاردن...</option>
                  {warehouses.filter(w => w.isActive).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.bonusPct}٪{(w.bonusRules || []).length > 0 ? ` + ${w.bonusRules.length} یاسای تایبەت` : ""})
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </FormGrid>

          {/* Inline New Client Request Form */}
          {showNewClientForm && (
            <div style={{ margin: "12px 0", padding: 16, background: "#F3F0FF", borderRadius: 12, border: "1px solid #D0BFFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#5C37D6", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} /> داواکردنی کڕیاری نوێ
                </div>
                <button type="button" onClick={() => setShowNewClientForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={14} /></button>
              </div>
              {newClientStatus === "sent" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2B8A3E", fontSize: 13, fontWeight: 600 }}><CheckCircle size={16} /> داواکاری نێردرا! بەرپرسان پێیان دەگات.</div>
              ) : newClientStatus === "error" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#C92A2A", fontSize: 13 }}><AlertCircle size={16} /> هەڵەیەک ڕووی دا، دووبارە هەوڵ بدەرەوە.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: "#5C37D6", display: "block", marginBottom: 4 }}>ناوی فرۆشگا *</label><input style={{ ...inputStyle, background: "white" }} value={newClientForm.name} onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })} placeholder="داروخانەی ..." /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: "#5C37D6", display: "block", marginBottom: 4 }}>خاوەن</label><input style={{ ...inputStyle, background: "white" }} value={newClientForm.owner} onChange={e => setNewClientForm({ ...newClientForm, owner: e.target.value })} placeholder="دکتۆر ..." /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: "#5C37D6", display: "block", marginBottom: 4 }}>تەلەفۆن</label><input style={{ ...inputStyle, background: "white" }} value={newClientForm.phone} onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value })} placeholder="07..." /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: "#5C37D6", display: "block", marginBottom: 4 }}>شار</label><input style={{ ...inputStyle, background: "white" }} value={newClientForm.city} onChange={e => setNewClientForm({ ...newClientForm, city: e.target.value })} placeholder="هەولێر" /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#5C37D6", display: "block", marginBottom: 4 }}>جۆر</label>
                    <select style={{ ...selectStyle, background: "white" }} value={newClientForm.type} onChange={e => setNewClientForm({ ...newClientForm, type: e.target.value })}>
                      <option value="PHARMACY">داروخانە</option>
                      <option value="HOSPITAL">نەخۆشخانە</option>
                      <option value="CLINIC">کلینیک</option>
                      <option value="WHOLESALE">کڕینی گشتی</option>
                    </select>
                  </div>
                  <button type="button" disabled={!newClientForm.name || newClientStatus === "sending"}
                    onClick={async () => {
                      setNewClientStatus("sending");
                      const res = await fetch("/api/clients/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newClientForm }) });
                      setNewClientStatus(res.ok ? "sent" : "error");
                    }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: "#5C37D6", color: "white", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: (!newClientForm.name || newClientStatus === "sending") ? 0.6 : 1 }}>
                    {newClientStatus === "sending" ? "ناردن..." : "نێردنی داواکاری"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Order Items */}
          <div style={{ marginTop: 24, borderTop: "1px solid #E9ECEF", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>بەرهەمەکان</h4>
              <button type="button" onClick={addItemRow} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> ڕیز</button>
            </div>
            {orderItems.map((item, i) => {
              const { pct, isCustom } = item.productId ? getItemBonusPct(item.productId) : { pct: 0, isCustom: false };
              const bonusQty = item.productId && item.quantity && pct > 0 ? Math.round(Number(item.quantity) * pct / 100) : 0;
              return (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select style={{ ...selectStyle, flex: 2 }} value={item.productId} onChange={(e) => updateItemRow(i, "productId", e.target.value)}>
                    <option value="">بەرهەم هەڵبژێرە...</option>
                    {products.filter(p => p.isActive && p.stock > 0).map((p) => <option key={p.id} value={p.id}>{p.name} — {formatIQD(p.price)} ({p.stock} بەردەست)</option>)}
                  </select>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" min="1" placeholder="بڕ" value={item.quantity} onChange={(e) => updateItemRow(i, "quantity", e.target.value)} />
                  {/* Bonus badge per product */}
                  {item.productId && form.warehouseId && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: isCustom ? "#7C5CFC" : "#4263EB", color: "white", display: "flex", alignItems: "center", gap: 3 }}>
                        {isCustom && <Tag size={9} />}
                        {pct}٪
                      </span>
                      {bonusQty > 0 && <span style={{ fontSize: 10, color: "#40C057", fontWeight: 700 }}>+{bonusQty}</span>}
                    </div>
                  )}
                  {orderItems.length > 1 && (
                    <button type="button" onClick={() => removeItemRow(i)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live bonus analysis */}
          {liveBonusItems.length > 0 && form.warehouseId && liveBonusItems.some(x => x.pct > 0) && (
            <div style={{ marginTop: 16, padding: 14, background: "#F8F4FF", borderRadius: 10, border: "1px solid #E9D7FF" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#7C5CFC", display: "flex", alignItems: "center", gap: 6 }}>
                <Tag size={14} /> شیکاری بۆنەس
              </div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E9D7FF" }}>
                    <th style={{ textAlign: "right", padding: "4px 6px", color: "#6C757D", fontWeight: 600 }}>بەرهەم</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", color: "#6C757D", fontWeight: 600 }}>بڕ</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", color: "#6C757D", fontWeight: 600 }}>ڕێژەی بۆنەس</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", color: "#6C757D", fontWeight: 600 }}>دانەی بۆنەس</th>
                  </tr>
                </thead>
                <tbody>
                  {liveBonusItems.map((x, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F3EEFF" }}>
                      <td style={{ padding: "6px 6px", fontWeight: 600 }}>{x.name}</td>
                      <td style={{ textAlign: "center", padding: "6px 6px" }}>{x.qty}</td>
                      <td style={{ textAlign: "center", padding: "6px 6px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: x.isCustom ? "#7C5CFC" : "#4263EB", color: "white", fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {x.isCustom && <Tag size={9} />}
                          {x.pct}٪ {x.isCustom ? "(تایبەت)" : "(بنەڕەت)"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 6px", fontWeight: 800, color: "#40C057", fontSize: 14 }}>
                        +{x.bonusQty} <span style={{ fontSize: 10, fontWeight: 400, color: "#6C757D" }}>دانە</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

              {/* Per-product bonus breakdown */}
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Tag size={14} color="#7C5CFC" /> شیکاری بۆنەس بەرهەم بەرهەم</h4>
              <div style={{ marginBottom: 20 }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8F4FF", borderBottom: "1px solid #E9D7FF" }}>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#5C37D6" }}>بەرهەم</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#5C37D6" }}>بڕ</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#5C37D6" }}>ڕێژەی بۆنەس</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#5C37D6" }}>دانەی بۆنەس</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailOrder.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F1F3F5" }}>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ textAlign: "center", padding: "8px" }}>{item.quantity}</td>
                        <td style={{ textAlign: "center", padding: "8px" }}>
                          {item.bonusPct > 0 ? (
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: "#4263EB", color: "white", fontWeight: 700, fontSize: 11 }}>
                              {item.bonusPct}٪
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px", fontWeight: 800, color: "#40C057", fontSize: 14 }}>
                          +{item.bonusQty} <span style={{ fontSize: 10, fontWeight: 400, color: "#6C757D" }}>دانە</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>کۆی بەرهەمەکان</h4>
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

      <PrintModal open={!!printOrder} onClose={() => setPrintOrder(null)} order={printOrder} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteOrder(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟" />
    </>
  );
}
