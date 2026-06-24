"use client";
import { useState, useEffect, FormEvent } from "react";
import { Search, Plus, Users, Phone, MapPin, Edit3, Trash2, Eye, X, Building2, Stethoscope, ShoppingBag, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, History } from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
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
const allTypeLabels: Record<string, string> = { PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە", CLINIC: "کلینیک", WHOLESALE: "کڕینی گشتی" };
const typeColors: Record<string, { bg: string; color: string }> = {
  PHARMACY: { bg: "#EDF2FF", color: "#4263EB" },
  HOSPITAL: { bg: "#FEF3EB", color: "#F47B35" },
  CLINIC: { bg: "#EBFBEE", color: "#40C057" },
  WHOLESALE: { bg: "#FFF3BF", color: "#E67700" },
};
const typeIcons: Record<ClientType, React.ReactNode> = { PHARMACY: <ShoppingBag size={14} />, HOSPITAL: <Building2 size={14} />, CLINIC: <Stethoscope size={14} /> };
const paymentLabels: Record<PaymentTerms, string> = { IMMEDIATE: "ڕاستەوخۆ", NET_15: "١٥ ڕۆژ", NET_30: "٣٠ ڕۆژ" };
const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

interface ClientRequest {
  id: string; name: string; owner: string; phone: string;
  city: string; type: string; requested_by: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; notes: string; created_at: string;
}

export default function ClientsPage() {
  const { clients, reps, orders, addClient, updateClient, deleteClient } = useData();
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  // Tab
  const [tab, setTab] = useState<"clients" | "requests">("clients");

  // Clients tab state
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY" as ClientType, repId: "", paymentTerms: "IMMEDIATE" as PaymentTerms, balance: "0", isActive: true });

  // Requests tab state
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteReqId, setDeleteReqId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

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

  // Load requests when tab is switched
  const loadRequests = async () => {
    setReqLoading(true);
    const res = await fetch("/api/clients/request");
    const d = await res.json();
    setRequests(d.requests || []);
    setReqLoading(false);
  };

  useEffect(() => {
    if (tab === "requests" && isManager) loadRequests();
  }, [tab, isManager]);

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionId(id);
    await fetch("/api/clients/request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActionId(null);
    await loadRequests();
  };

  const handleDeleteRequest = async (id: string) => {
    setDeleteReqId(id);
    await fetch(`/api/clients/request?id=${id}`, { method: "DELETE" });
    setRequests(prev => prev.filter(r => r.id !== id));
    setDeleteReqId(null);
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    await fetch("/api/clients/request?clearAll=true", { method: "DELETE" });
    await loadRequests();
    setClearingHistory(false);
    setShowClearConfirm(false);
  };

  const statusBadge = (status: string) => {
    if (status === "PENDING")  return { label: "چاوەڕوان", bg: "#FFF3BF", color: "#E67700", Icon: Clock };
    if (status === "APPROVED") return { label: "پەسەندکرا", bg: "#D3F9D8", color: "#2B8A3E", Icon: CheckCircle };
    return { label: "ڕەتکرایەوە", bg: "#FFE3E3", color: "#C92A2A", Icon: XCircle };
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Users size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>کڕیارەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی دەرمانخانە، نەخۆشخانە، و کلینیکەکان</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {tab === "clients" && (
            <>
              <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={clientExportCols} filename="clients" title="کڕیارەکان" />
              <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>کڕیاری نوێ</span></button>
            </>
          )}
          {tab === "requests" && (
            <div style={{ display: "flex", gap: 8 }}>
              {requests.filter(r => r.status !== "PENDING").length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 8, border: "1px solid #FFE3E3", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#C92A2A", fontWeight: 600 }}
                >
                  <History size={13} /> سڕینەوەی مێژوو
                </button>
              )}
              <button onClick={loadRequests} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                <RefreshCw size={13} /> نوێکردنەوە
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
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

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 0, background: "#F1F3F5", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        <button onClick={() => setTab("clients")}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === "clients" ? "white" : "transparent", color: tab === "clients" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "clients" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
          کڕیارەکان
        </button>
        {isManager && (
          <button onClick={() => setTab("requests")}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === "requests" ? "white" : "transparent", color: tab === "requests" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "requests" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
            داواکارییەکان
            {pendingCount > 0 && (
              <span style={{ padding: "1px 7px", borderRadius: 10, background: "#FA5252", color: "white", fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>
            )}
          </button>
        )}
      </div>

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <>
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
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[c.type]?.bg || "#F1F3F5", color: typeColors[c.type]?.color || "#6C757D" }}>{typeIcons[c.type as ClientType]} {typeLabels[c.type as ClientType] || c.type}</span></td>
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
        </>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab === "requests" && isManager && (
        <div className="data-table-wrapper">
          {reqLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#ADB5BD" }}>بارکردن...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#ADB5BD" }}><CheckCircle size={24} /></div>
              <p style={{ fontSize: 14, color: "#6C757D", fontWeight: 600 }}>هیچ داواکارییەک نییە</p>
              <p style={{ fontSize: 12, color: "#ADB5BD", marginTop: 4 }}>کاتێک نوێنەرەکان داوای کڕیاری نوێ دەکەن، ئێرە دەردەکەون</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ناوی فرۆشگا</th>
                  <th>خاوەن</th>
                  <th>تەلەفۆن</th>
                  <th>شار</th>
                  <th>جۆر</th>
                  <th>داواکار</th>
                  <th>بارودۆخ</th>
                  <th>کات</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const badge = statusBadge(r.status);
                  const BadgeIcon = badge.Icon;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</td>
                      <td style={{ fontSize: 13, color: "#6C757D" }}>{r.owner || "—"}</td>
                      <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{r.phone || "—"}</td>
                      <td style={{ fontSize: 13 }}>{r.city || "—"}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[r.type]?.bg || "#F1F3F5", color: typeColors[r.type]?.color || "#6C757D" }}>
                          {allTypeLabels[r.type] || r.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "#6C757D" }}>{r.requested_by || "—"}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                          <BadgeIcon size={11} /> {badge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: "#ADB5BD" }}>
                        {new Date(r.created_at).toLocaleDateString("ckb", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        {r.status === "PENDING" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              disabled={actionId === r.id}
                              onClick={() => handleAction(r.id, "APPROVE")}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#D3F9D8", color: "#2B8A3E", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: actionId === r.id ? 0.6 : 1 }}>
                              <CheckCircle size={12} /> پەسەند
                            </button>
                            <button
                              disabled={actionId === r.id}
                              onClick={() => handleAction(r.id, "REJECT")}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#FFE3E3", color: "#C92A2A", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: actionId === r.id ? 0.6 : 1 }}>
                              <XCircle size={12} /> ڕەت
                            </button>
                            <button
                              disabled={deleteReqId === r.id}
                              onClick={() => handleDeleteRequest(r.id)}
                              title="سڕینەوە"
                              style={{ width: 28, height: 28, borderRadius: 6, background: "#F1F3F5", color: "#ADB5BD", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleteReqId === r.id ? 0.5 : 1 }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                        {r.status !== "PENDING" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#ADB5BD" }}>تێپەڕاوە</span>
                            <button
                              disabled={deleteReqId === r.id}
                              onClick={() => handleDeleteRequest(r.id)}
                              title="سڕینەوەی مێژوو"
                              style={{ width: 26, height: 26, borderRadius: 6, background: "#FFE3E3", color: "#C92A2A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleteReqId === r.id ? 0.5 : 1 }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F3F5", display: "flex", gap: 16, fontSize: 12, color: "#6C757D" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} color="#E67700" /> {requests.filter(r => r.status === "PENDING").length} چاوەڕوان</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={12} color="#2B8A3E" /> {requests.filter(r => r.status === "APPROVED").length} پەسەندکرا</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><XCircle size={12} color="#C92A2A" /> {requests.filter(r => r.status === "REJECTED").length} ڕەتکرایەوە</span>
          </div>
        </div>
      )}

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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[detailClient.type]?.bg || "#F1F3F5", color: typeColors[detailClient.type]?.color || "#6C757D", marginTop: 4 }}>
                {typeIcons[detailClient.type as ClientType]} {typeLabels[detailClient.type as ClientType] || detailClient.type}
              </span>
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

      {/* Clear history confirm */}
      {showClearConfirm && (
        <div onClick={() => setShowClearConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFE3E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#C92A2A", flexShrink: 0 }}>
                <History size={20} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>سڕینەوەی مێژووی داواکارییەکان</div>
                <div style={{ fontSize: 12, color: "#6C757D", marginTop: 2 }}>هەموو داواکارییەکانی پەسەندکراو و ڕەتکراوەیەوە دەسڕێتەوە</div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "#FFF8DB", borderRadius: 8, fontSize: 12, color: "#856404", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} />
              داواکارییەکانی چاوەڕوان دەمێننەوە — تەنها مێژوو دەسڕێتەوە
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: "#C92A2A", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: clearingHistory ? 0.7 : 1 }}
              >
                {clearingHistory ? "بارکردن..." : "بەڵێ، بیسڕەوە"}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: "#F1F3F5", color: "#495057", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
