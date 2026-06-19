"use client";
import { useState } from "react";
import { Search, Truck, MapPin, Phone, User, Clock } from "lucide-react";
import { useData } from "@/lib/store";
import type { DeliveryStatus } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";

const statusLabels: Record<DeliveryStatus, string> = { PENDING: "چاوەڕوان", IN_TRANSIT: "لە ڕێگادا", DELIVERED: "گەیشت", FAILED: "شکستی هێنا" };
const statusColors: Record<DeliveryStatus, { bg: string; color: string }> = { PENDING: { bg: "#FFF3BF", color: "#F08C00" }, IN_TRANSIT: { bg: "#D0EBFF", color: "#1971C2" }, DELIVERED: { bg: "#D3F9D8", color: "#2B8A3E" }, FAILED: { bg: "#FFE3E3", color: "#C92A2A" } };

export default function LogisticsPage() {
  const { deliveries, updateDelivery } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("هەموو");
  const [editId, setEditId] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState({ driver: "", driverPhone: "" });

  const filtered = deliveries.filter(d => {
    const matchSearch = d.orderNumber.includes(searchTerm) || d.destination.includes(searchTerm) || d.driver.includes(searchTerm);
    const matchStatus = statusFilter === "هەموو" || statusLabels[d.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = (id: string, status: DeliveryStatus) => {
    const now = new Date().toLocaleString("ckb-IQ");
    const updates: Record<string, string | DeliveryStatus> = { status };
    if (status === "IN_TRANSIT") updates.dispatchedAt = now;
    if (status === "DELIVERED") updates.deliveredAt = now;
    updateDelivery(id, updates);
  };

  const openDriverModal = (id: string) => {
    const d = deliveries.find(x => x.id === id);
    setDriverForm({ driver: d?.driver || "", driverPhone: d?.driverPhone || "" });
    setEditId(id);
  };

  const saveDriver = () => {
    if (editId) updateDelivery(editId, driverForm);
    setEditId(null);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#D0EBFF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#1971C2" }}><Truck size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>لۆجستیک و گەیاندن</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەدواداچوونی هەموو گەیاندنەکان</p></div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی گەیاندن", value: String(deliveries.length) },
          { title: "چاوەڕوان", value: String(deliveries.filter(d => d.status === "PENDING").length), color: "#F08C00" },
          { title: "لە ڕێگادا", value: String(deliveries.filter(d => d.status === "IN_TRANSIT").length), color: "#1971C2" },
          { title: "گەیشتوو", value: String(deliveries.filter(d => d.status === "DELIVERED").length), color: "#2B8A3E" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {["هەموو", ...Object.values(statusLabels)].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: statusFilter === s ? "white" : "transparent", color: statusFilter === s ? "#1A1A2E" : "#6C757D", boxShadow: statusFilter === s ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>داواکاری</th><th>شوفێر</th><th>مەنزڵ</th><th>کاڵا</th><th>نێردراوە</th><th>گەیشتووە</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{d.orderNumber}</td>
                <td>
                  {d.driver ? (
                    <div><span style={{ fontSize: 13, fontWeight: 600 }}>{d.driver}</span><div style={{ fontSize: 11, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{d.driverPhone}</div></div>
                  ) : (
                    <button onClick={() => openDriverModal(d.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #4263EB", background: "#EDF2FF", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#4263EB", fontWeight: 600 }}>دیاریکردنی شوفێر</button>
                  )}
                </td>
                <td style={{ fontSize: 12, maxWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} color="#ADB5BD" />{d.destination}</div></td>
                <td style={{ fontSize: 11, color: "#6C757D", maxWidth: 160 }}>{d.items}</td>
                <td style={{ fontSize: 12, color: "#6C757D" }}>{d.dispatchedAt}</td>
                <td style={{ fontSize: 12, color: "#6C757D" }}>{d.deliveredAt}</td>
                <td>
                  <select value={d.status} onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #DEE2E6", fontFamily: "inherit", cursor: "pointer", background: statusColors[d.status].bg, color: statusColors[d.status].color }}>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td>
                  <button onClick={() => openDriverModal(d.id)} style={{ padding: 4, color: "#6C757D", background: "none", border: "none", cursor: "pointer" }} title="دەستکاری شوفێر"><User size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} گەیاندن</span></div>
      </div>

      {/* Driver Assignment Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="دیاریکردنی شوفێر" width={420}>
        <FormGrid cols={1}>
          <FormField label="ناوی شوفێر"><input style={inputStyle} value={driverForm.driver} onChange={(e) => setDriverForm({ ...driverForm, driver: e.target.value })} placeholder="ناوی شوفێر" /></FormField>
          <FormField label="تەلەفۆنی شوفێر"><input style={inputStyle} value={driverForm.driverPhone} onChange={(e) => setDriverForm({ ...driverForm, driverPhone: e.target.value })} placeholder="0770 XXX XXXX" /></FormField>
        </FormGrid>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
          <button onClick={saveDriver} style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>پاشەکەوتکردن</button>
          <button onClick={() => setEditId(null)} style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>پاشگەزبوونەوە</button>
        </div>
      </Modal>
    </>
  );
}
