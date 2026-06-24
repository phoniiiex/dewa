"use client";
import { useState, FormEvent } from "react";
import { Search, Plus, Users, Phone, MapPin, Edit3, Trash2, Eye, X, Building2, Stethoscope, ShoppingBag } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Client, ClientType, PaymentTerms } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";

const clientExportCols = [
  { key: "name", label: "ناو" }, { key: "owner", label: "خاوەن" },
  { key: "phone", label: "تەلەفۆن" }, { key: "city", label: "شار" },
  { key: "type", label: "جۆر" }, { key: "balance", label: "باڵانس", format: (v: unknown) => String(v) },
];

const typeLabels: Record<ClientType, string> = { PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە", CLINIC: "کلینیک" };
const typeColors: Record<ClientType, { bg: string; color: string }> = { PHARMACY: { bg: "#EDF2FF", color: "#4263EB" }, HOSPITAL: { bg: "#FEF3EB", color: "#F47B35" }, CLINIC: { bg: "#EBFBEE", color: "#40C057" } };
const typeIcons: Record<ClientType, React.ReactNode> = { PHARMACY: <ShoppingBag size={14} />, HOSPITAL: <Building2 size={14} />, CLINIC: <Stethoscope size={14} /> };
const paymentLabels: Record<PaymentTerms, string> = { IMMEDIATE: "ڕاستەوخۆ", NET_15: "١٥ ڕۆژ", NET_30: "٣٠ ڕۆژ" };
const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function ClientsPage() {
  const { clients, reps, orders, addClient, updateClient, deleteClient } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY" as ClientType, repId: "", paymentTerms: "IMMEDIATE" as PaymentTerms, balance: "0", isActive: true });

  const resetForm = () => setForm({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY", repId: reps[0]?.id || "", paymentTerms: "IMMEDIATE", balance: "0", isActive: true });
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, owner: c.owner, phone: c.phone, city: c.city, type: c.type, repId: c.repId, paymentTerms: c.paymentTerms, balance: String(c.balance), isActive: c.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, balance: Number(form.balance) };
    if (editing) updateClient(editing.id, data);
    else addClient(data);
    setModalOpen(false);
  };

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.includes(searchTerm) || c.owner.includes(searchTerm);
    const matchCity = cityFilter === "هەموو" || c.city === cityFilter;
    return matchSearch && matchCity;
  });

  const getRepName = (repId: string) => reps.find((r) => r.id === repId)?.name || "—";
  const getClientOrders = (clientId: string) => orders.filter((o) => o.clientId === clientId);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Users size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>کڕیارەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی دەرمانخانە، نەخۆشخانە، و کلینیکەکان</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={clientExportCols} filename="clients" title="کڕیارەکان" />
          <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>کڕیاری نوێ</span></button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کڕیارەکان", value: String(clients.length) },
          { title: "کڕیاری چالاک", value: String(clients.filter(c => c.isActive).length) },
          { title: "قەرزی کۆ", value: formatIQD(clients.reduce((s, c) => s + c.balance, 0)) },
          { title: "داواکاری کۆ", value: String(orders.length) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {["هەموو", ...cities].map((c) => (
            <button key={c} onClick={() => setCityFilter(c)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: cityFilter === c ? "white" : "transparent", color: cityFilter === c ? "#1A1A2E" : "#6C757D", boxShadow: cityFilter === c ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>کڕیار</th><th>خاوەن</th><th>تەلەفۆن</th><th>شار</th><th>جۆر</th><th>نوێنەر</th><th>قەرز</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{c.owner}</td>
                <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{c.phone}</td>
                <td><span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><MapPin size={12} color="#ADB5BD" />{c.city}</span></td>
                <td><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[c.type].bg, color: typeColors[c.type].color }}>{typeIcons[c.type]} {typeLabels[c.type]}</span></td>
                <td style={{ fontSize: 13, color: "#6C757D" }}>{getRepName(c.repId)}</td>
                <td style={{ fontWeight: 600, fontSize: 13, color: c.balance > 0 ? "#FA5252" : "#40C057" }}>{c.balance > 0 ? formatIQD(c.balance) : "—"}</td>
                <td><span className={`status-badge ${c.isActive ? "paid" : "cancelled"}`}>{c.isActive ? "چالاک" : "ناچالاک"}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setDetailClient(c)} style={{ padding: 4, color: "#4263EB", background: "none", border: "none", cursor: "pointer" }}><Eye size={14} /></button>
                    <button onClick={() => openEdit(c)} style={{ padding: 4, color: "#6C757D", background: "none", border: "none", cursor: "pointer" }}><Edit3 size={14} /></button>
                    <button onClick={() => setDeleteId(c.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} کڕیار</span></div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری کڕیار" : "کڕیاری نوێ"}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی کڕیار" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="خاوەن" required><input style={inputStyle} required value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></FormField>
            <FormField label="تەلەفۆن" required><input style={inputStyle} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="شار"><select style={selectStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="جۆر"><select style={selectStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            <FormField label="نوێنەر"><select style={selectStyle} value={form.repId} onChange={(e) => setForm({ ...form, repId: e.target.value })}><option value="">هەڵبژاردن...</option>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></FormField>
            <FormField label="مەرجی پارەدان"><select style={selectStyle} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value as PaymentTerms })}>{Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            <FormField label="قەرز (د.ع)"><input style={inputStyle} type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></FormField>
          </FormGrid>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      {/* Detail Drawer */}
      {detailClient && (
        <div onClick={() => setDetailClient(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400, animation: "fadeIn 0.15s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 440, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", animation: "slideInRight 0.2s ease", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>وردەکاری کڕیار</h3>
              <button onClick={() => setDetailClient(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{detailClient.name}</h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[detailClient.type].bg, color: typeColors[detailClient.type].color, marginTop: 4 }}>{typeIcons[detailClient.type]} {typeLabels[detailClient.type]}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
                {[
                  { l: "خاوەن", v: detailClient.owner },
                  { l: "تەلەفۆن", v: detailClient.phone },
                  { l: "شار", v: detailClient.city },
                  { l: "نوێنەر", v: getRepName(detailClient.repId) },
                  { l: "مەرجی پارەدان", v: paymentLabels[detailClient.paymentTerms] },
                  { l: "قەرز", v: detailClient.balance > 0 ? formatIQD(detailClient.balance) : "نییە" },
                ].map((item, i) => (
                  <div key={i}><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>{item.l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{item.v}</div></div>
                ))}
              </div>
              {/* Client Orders */}
              <div style={{ marginTop: 24, borderTop: "1px solid #E9ECEF", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>داواکارییەکان ({getClientOrders(detailClient.id).length})</h4>
                {getClientOrders(detailClient.id).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#ADB5BD" }}>هیچ داواکارییەک نییە</p>
                ) : (
                  getClientOrders(detailClient.id).map((o) => (
                    <div key={o.id} style={{ padding: "10px 12px", background: "#F8F9FA", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><span style={{ fontWeight: 600, fontSize: 13 }}>{o.orderNumber}</span><span style={{ fontSize: 11, color: "#ADB5BD", marginRight: 8 }}>{o.createdAt}</span></div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(o.totalAmount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteClient(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم کڕیارە؟" />
    </>
  );
}
