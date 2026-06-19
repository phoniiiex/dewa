"use client";
import { useState, FormEvent } from "react";
import { Plus, Globe, Edit3, Trash2, Search, Phone, Mail } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Supplier } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle } from "@/components/ui/FormField";

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", country: "", balance: "0", isActive: true });

  const resetForm = () => setForm({ name: "", contact: "", phone: "", email: "", country: "", balance: "0", isActive: true });
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, country: s.country, balance: String(s.balance), isActive: s.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, balance: Number(form.balance) };
    if (editing) updateSupplier(editing.id, data);
    else addSupplier(data);
    setModalOpen(false);
  };

  const filtered = suppliers.filter(s => s.name.includes(searchTerm) || s.country.includes(searchTerm));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FFF3BF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#FAB005" }}><Globe size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>دابینکەرەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی دابینکەرانی نێودەوڵەتی</p></div>
        </div>
        <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>دابینکەری نوێ</span></button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی دابینکەران", value: String(suppliers.length) },
          { title: "چالاک", value: String(suppliers.filter(s => s.isActive).length) },
          { title: "کۆی مامەڵە", value: formatIQD(suppliers.reduce((s, x) => s + x.balance, 0)) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>دابینکەر</th><th>پەیوەندیدار</th><th>تەلەفۆن</th><th>ئیمەیڵ</th><th>وڵات</th><th>مامەڵە</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{s.contact}</td>
                <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{s.phone}</td>
                <td style={{ fontSize: 12, color: "#4263EB" }}>{s.email}</td>
                <td><span style={{ padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#FFF3BF", color: "#F08C00" }}>{s.country}</span></td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(s.balance)}</td>
                <td><span className={`status-badge ${s.isActive ? "paid" : "cancelled"}`}>{s.isActive ? "چالاک" : "ناچالاک"}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(s)} style={{ padding: 4, color: "#6C757D", background: "none", border: "none", cursor: "pointer" }}><Edit3 size={14} /></button>
                    <button onClick={() => setDeleteId(s.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} دابینکەر</span></div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری دابینکەر" : "دابینکەری نوێ"}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی کۆمپانیا" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="پەیوەندیدار" required><input style={inputStyle} required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></FormField>
            <FormField label="تەلەفۆن"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="ئیمەیڵ"><input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
            <FormField label="وڵات"><input style={inputStyle} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="بۆ نموونە: تورکیا 🇹🇷" /></FormField>
            <FormField label="مامەڵە (د.ع)"><input style={inputStyle} type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></FormField>
          </FormGrid>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteSupplier(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم دابینکەرە؟" />
    </>
  );
}
