"use client";
import { useState, FormEvent } from "react";
import { Plus, Warehouse as WarehouseIcon, Edit3, Trash2, MapPin, Phone, Percent } from "lucide-react";
import { useData } from "@/lib/store";
import type { Warehouse } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";

const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function WarehousesPage() {
  const { warehouses, orders, addWarehouse, updateWarehouse, deleteWarehouse } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: cities[0], address: "", contact: "", phone: "", bonusPct: "15", isActive: true });

  const resetForm = () => setForm({ name: "", city: cities[0], address: "", contact: "", phone: "", bonusPct: "15", isActive: true });
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setForm({ name: w.name, city: w.city, address: w.address, contact: w.contact, phone: w.phone, bonusPct: String(w.bonusPct), isActive: w.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, bonusPct: Number(form.bonusPct) };
    if (editing) updateWarehouse(editing.id, data);
    else addWarehouse(data);
    setModalOpen(false);
  };

  const getWarehouseOrders = (whId: string) => orders.filter(o => o.warehouseId === whId);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><WarehouseIcon size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>کۆگاکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی هاوبەشی کۆگاکان و ڕێژەی بۆنەس</p></div>
        </div>
        <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>کۆگای نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کۆگاکان", value: String(warehouses.length) },
          { title: "چالاک", value: String(warehouses.filter(w => w.isActive).length) },
          { title: "داواکاری لە ڕێگای کۆگا", value: String(orders.filter(o => o.routingMode === "WAREHOUSE").length) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {warehouses.map(w => (
          <div key={w.id} style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{w.name}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6C757D" }}><MapPin size={12} />{w.city} — {w.address}</div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #7C5CFC, #4263EB)", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>{w.bonusPct}<Percent size={14} /></div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, color: "#6C757D" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {w.phone}</div>
              <div>پەیوەندی: {w.contact}</div>
            </div>
            <div style={{ display: "flex", gap: 12, padding: 12, background: "#F8F9FA", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#4263EB" }}>{getWarehouseOrders(w.id).length}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>داواکاری</div></div>
              <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#7C5CFC" }}>{w.bonusPct}٪</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>بۆنەسی بنەڕەت</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => openEdit(w)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={12} /> دەستکاری</button>
              <button onClick={() => setDeleteId(w.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #FFC9C9", background: "#FFF5F5", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, color: "#FA5252" }}><Trash2 size={12} /> سڕینەوە</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری کۆگا" : "کۆگای نوێ"}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی کۆگا" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="شار"><select style={selectStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="ناونیشان"><input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></FormField>
            <FormField label="پەیوەندیدار"><input style={inputStyle} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></FormField>
            <FormField label="تەلەفۆن"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="ڕێژەی بۆنەس (٪)" required><input style={inputStyle} type="number" min="0" max="100" required value={form.bonusPct} onChange={(e) => setForm({ ...form, bonusPct: e.target.value })} /></FormField>
          </FormGrid>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteWarehouse(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم کۆگایە؟" />
    </>
  );
}
