"use client";
import { useState, useEffect, FormEvent, useRef } from "react";
import { Search, Plus, Users, Phone, MapPin, Edit3, Trash2, Eye, X, Building2, Stethoscope, ShoppingBag, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, History, CreditCard, Upload, Printer, Warehouse, TrendingUp, Package, DollarSign, ArrowLeft } from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import { buildDebtReceiptHTML } from "@/lib/debtReceipt";
import type { Client, ClientType, PaymentTerms, Order } from "@/lib/types";
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
const typeColors: Record<string, { bg: string; color: string }> = {
  PHARMACY:  { bg: "#EDF2FF", color: "#4263EB" },
  HOSPITAL:  { bg: "#FEF3EB", color: "#F47B35" },
  CLINIC:    { bg: "#EBFBEE", color: "#40C057" },
  WHOLESALE: { bg: "#FFF3BF", color: "#E67700" },
  WAREHOUSE: { bg: "#F3F0FF", color: "#7950F2" },
};
const typeIcons: Record<string, React.ReactNode> = {
  PHARMACY:  <ShoppingBag size={13} />,
  HOSPITAL:  <Building2   size={13} />,
  CLINIC:    <Stethoscope size={13} />,
  WHOLESALE: <Package     size={13} />,
  WAREHOUSE: <Warehouse   size={13} />,
};
const typeDisplayNames: Record<string, string> = {
  PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە",
  CLINIC: "کلینیک", WHOLESALE: "کڕینی گشتی", WAREHOUSE: "مەخزەن",
};
const paymentLabels: Record<PaymentTerms, string> = { IMMEDIATE: "ڕاستەوخۆ", NET_15: "١٥ ڕۆژ", NET_30: "٣٠ ڕۆژ" };
const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

interface ClientRequest {
  id: string; name: string; owner: string; phone: string;
  city: string; type: string; requested_by: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; notes: string; created_at: string;
}

// Unified row type: either a real Client or a Warehouse acting as a client
interface UnifiedRow {
  id: string;
  name: string;
  owner: string;       // contact for warehouse
  phone: string;
  city: string;
  entityType: "CLIENT" | "WAREHOUSE";
  displayType: string; // PHARMACY | HOSPITAL | CLINIC | WAREHOUSE …
  repId: string;
  paymentTerms: PaymentTerms;
  balance: number;
  isActive: boolean;
  // only for real clients
  clientRef?: Client;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  WAITING:      { label: "چاوەڕوان",   bg: "#FFF3BF", color: "#E67700" },
  IN_PROGRESS:  { label: "دیاریکراو", bg: "#EDF2FF", color: "#4263EB" },
  READY:        { label: "ئامادەیە",  bg: "#F3F0FF", color: "#7950F2" },
  SENT:         { label: "نێردراوە",  bg: "#E0F2FE", color: "#0284C7" },
  DELIVERED:    { label: "گەیشتووە", bg: "#CFFAFE", color: "#0891B2" },
  PAID:         { label: "پارەدراوە", bg: "#D1FAE5", color: "#059669" },
  NOT_ACCEPTED: { label: "ڕەتکراوە",  bg: "#FFE3E3", color: "#C92A2A" },
};

export default function ClientsPage() {
  const { clients, reps, orders, warehouses, settings, addClient, updateClient, deleteClient, markOrdersAsPaid, showToast } = useData();
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  // Tab
  const [tab, setTab] = useState<"clients" | "requests">("clients");

  // Clients tab state
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("هەموو");
  const [typeFilter, setTypeFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailRow, setDetailRow] = useState<UnifiedRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY" as ClientType, repId: "", paymentTerms: "IMMEDIATE" as PaymentTerms, balance: "0", isActive: true });

  // Payment modal state
  const [paymentClient, setPaymentClient] = useState<Client | null>(null);
  const [paymentMode, setPaymentMode] = useState<"all" | "select">("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "receipt">("select");
  const [discount, setDiscount] = useState("0");
  const [receiverName, setReceiverName] = useState("");
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Requests tab state
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteReqId, setDeleteReqId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Build unified rows: real clients + warehouses
  const warehouseRows: UnifiedRow[] = (warehouses || []).map(w => ({
    id: `wh_${w.id}`,
    name: w.name,
    owner: w.contact || "—",
    phone: w.phone || "—",
    city: w.city,
    entityType: "WAREHOUSE",
    displayType: "WAREHOUSE",
    repId: "",
    paymentTerms: "IMMEDIATE",
    balance: 0,
    isActive: w.isActive,
  }));
  const clientRows: UnifiedRow[] = clients.map(c => ({
    id: c.id,
    name: c.name,
    owner: c.owner,
    phone: c.phone,
    city: c.city,
    entityType: "CLIENT",
    displayType: c.type,
    repId: c.repId,
    paymentTerms: c.paymentTerms,
    balance: c.balance,
    isActive: c.isActive,
    clientRef: c,
  }));
  const allRows: UnifiedRow[] = [...clientRows, ...warehouseRows];

  const filtered = allRows.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCity   = cityFilter === "هەموو" || r.city === cityFilter;
    const matchType   = typeFilter === "هەموو" || r.displayType === typeFilter;
    return matchSearch && matchCity && matchType;
  });

  const resetForm = () => setForm({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY", repId: reps[0]?.id || "", paymentTerms: "IMMEDIATE", balance: "0", isActive: true });
  const openAdd  = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, owner: c.owner, phone: c.phone, city: c.city, type: c.type, repId: c.repId, paymentTerms: c.paymentTerms, balance: String(c.balance), isActive: c.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, balance: Number(form.balance) };
    if (editing) updateClient(editing.id, data);
    else addClient(data);
    setModalOpen(false);
  };

  const getRepName = (repId: string) => reps.find(r => r.id === repId)?.name || "—";
  const getClientOrders   = (clientId: string) => orders.filter(o => o.clientId === clientId);
  const getDeliveredOrders = (clientId: string) => orders.filter(o => o.clientId === clientId && o.status === "DELIVERED");

  // For warehouses, match orders by warehouseId
  const getWarehouseOrders = (wId: string) => orders.filter(o => o.warehouseId === wId);

  const loadRequests = async () => {
    setReqLoading(true);
    const res  = await fetch("/api/clients/request");
    const d    = await res.json();
    setRequests(d.requests || []);
    setReqLoading(false);
  };
  useEffect(() => { if (tab === "requests" && isManager) loadRequests(); }, [tab, isManager]);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionId(id);
    await fetch("/api/clients/request", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
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
    if (status === "PENDING")  return { label: "چاوەڕوان",    bg: "#FFF3BF", color: "#E67700", Icon: Clock       };
    if (status === "APPROVED") return { label: "پەسەندکرا",   bg: "#D3F9D8", color: "#2B8A3E", Icon: CheckCircle };
    return                            { label: "ڕەتکرایەوە", bg: "#FFE3E3", color: "#C92A2A", Icon: XCircle     };
  };

  // KPI totals
  const totalDebt = clients.reduce((s, c) => s + c.balance, 0);

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Users size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>کڕیارەکان و مەخزەنەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی کڕیارەکان و مەخزەنەکان</p>
          </div>
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
                <button onClick={() => setShowClearConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 8, border: "1px solid #FFE3E3", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#C92A2A", fontWeight: 600 }}>
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

      {/* ── KPIs ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کڕیارەکان",  value: String(clients.length),                        icon: <Users size={18} />,    color: "#4263EB", bg: "#EDF2FF" },
          { title: "مەخزەنەکان",     value: String((warehouses || []).length),              icon: <Warehouse size={18} />, color: "#7950F2", bg: "#F3F0FF" },
          { title: "قەرزی کۆ",       value: formatIQD(totalDebt),                          icon: <TrendingUp size={18} />,color: "#FA5252", bg: "#FFE3E3" },
          { title: "داواکاری کۆ",    value: String(orders.length),                         icon: <Package size={18} />,  color: "#059669", bg: "#D1FAE5" },
        ].map((k, i) => (
          <div className="kpi-card" key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: k.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: k.color, flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div className="kpi-card-title" style={{ marginBottom: 2 }}>{k.title}</div>
              <div className="kpi-card-value" style={{ fontSize: "1.2rem" }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", gap: 0, background: "#F1F3F5", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        <button onClick={() => setTab("clients")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === "clients" ? "white" : "transparent", color: tab === "clients" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "clients" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
          کڕیارەکان و مەخزەنەکان
        </button>
        {isManager && (
          <button onClick={() => setTab("requests")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === "requests" ? "white" : "transparent", color: tab === "requests" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "requests" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
            داواکارییەکان
            {pendingCount > 0 && <span style={{ padding: "1px 7px", borderRadius: 10, background: "#FA5252", color: "white", fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>}
          </button>
        )}
      </div>

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
              <input type="text" placeholder="گەڕان بە ناو..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: 240, padding: "8px 34px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
            </div>
            {/* City filter */}
            <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
              {["هەموو", ...cities].map(c => (
                <button key={c} onClick={() => setCityFilter(c)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: cityFilter === c ? "white" : "transparent", color: cityFilter === c ? "#1A1A2E" : "#6C757D", boxShadow: cityFilter === c ? "0 1px 2px rgba(0,0,0,.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
              ))}
            </div>
            {/* Type filter */}
            <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
              {["هەموو", "PHARMACY", "HOSPITAL", "CLINIC", "WAREHOUSE"].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: typeFilter === t ? "white" : "transparent", color: typeFilter === t ? "#1A1A2E" : "#6C757D", boxShadow: typeFilter === t ? "0 1px 2px rgba(0,0,0,.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {t === "هەموو" ? "هەموو" : typeDisplayNames[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>ناو</th><th>خاوەن / پەیوەندی</th><th>تەلەفۆن</th><th>شار</th><th>جۆر</th><th>نوێنەر</th><th>قەرز</th><th>بارودۆخ</th><th></th></tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      {row.entityType === "WAREHOUSE" && <Warehouse size={14} style={{ color: "#7950F2", flexShrink: 0 }} />}
                      {row.name}
                    </td>
                    <td style={{ fontSize: 13, color: "#6C757D" }}>{row.owner}</td>
                    <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{row.phone}</td>
                    <td><span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><MapPin size={12} color="#ADB5BD" />{row.city}</span></td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[row.displayType]?.bg || "#F1F3F5", color: typeColors[row.displayType]?.color || "#6C757D" }}>
                        {typeIcons[row.displayType]} {typeDisplayNames[row.displayType] || row.displayType}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "#6C757D" }}>{getRepName(row.repId)}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: row.balance > 0 ? "#FA5252" : "#ADB5BD" }}>
                      {row.balance > 0 ? formatIQD(row.balance) : "—"}
                    </td>
                    <td><span className={`status-badge ${row.isActive ? "paid" : "cancelled"}`}>{row.isActive ? "چالاک" : "ناچالاک"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setDetailRow(row)} style={{ padding: "5px 8px", color: "#4263EB", background: "#EDF2FF", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <Eye size={13} /> بینین
                        </button>
                        {row.entityType === "CLIENT" && row.clientRef && (
                          <>
                            <button onClick={() => openEdit(row.clientRef!)} style={{ padding: "5px 7px", color: "#6C757D", background: "#F1F3F5", border: "none", borderRadius: 7, cursor: "pointer", display: "flex" }}><Edit3 size={13} /></button>
                            <button onClick={() => setDeleteId(row.clientRef!.id)} style={{ padding: "5px 7px", color: "#FA5252", background: "#FFE3E3", border: "none", borderRadius: 7, cursor: "pointer", display: "flex" }}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination"><span className="pagination-info">{filtered.length} تۆمار</span></div>
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
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>ناوی فرۆشگا</th><th>خاوەن</th><th>تەلەفۆن</th><th>شار</th><th>جۆر</th><th>داواکار</th><th>بارودۆخ</th><th>کات</th><th></th></tr></thead>
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
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColors[r.type]?.bg || "#F1F3F5", color: typeColors[r.type]?.color || "#6C757D" }}>{typeDisplayNames[r.type] || r.type}</span></td>
                      <td style={{ fontSize: 13, color: "#6C757D" }}>{r.requested_by || "—"}</td>
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}><BadgeIcon size={11} /> {badge.label}</span></td>
                      <td style={{ fontSize: 11, color: "#ADB5BD" }}>{new Date(r.created_at).toLocaleDateString("ckb", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        {r.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button disabled={actionId === r.id} onClick={() => handleAction(r.id, "APPROVE")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#D3F9D8", color: "#2B8A3E", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: actionId === r.id ? 0.6 : 1 }}><CheckCircle size={12} /> پەسەند</button>
                            <button disabled={actionId === r.id} onClick={() => handleAction(r.id, "REJECT")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#FFE3E3", color: "#C92A2A", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: actionId === r.id ? 0.6 : 1 }}><XCircle size={12} /> ڕەت</button>
                            <button disabled={deleteReqId === r.id} onClick={() => handleDeleteRequest(r.id)} style={{ width: 28, height: 28, borderRadius: 6, background: "#F1F3F5", color: "#ADB5BD", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleteReqId === r.id ? 0.5 : 1 }}><Trash2 size={11} /></button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#ADB5BD" }}>تێپەڕاوە</span>
                            <button disabled={deleteReqId === r.id} onClick={() => handleDeleteRequest(r.id)} style={{ width: 26, height: 26, borderRadius: 6, background: "#FFE3E3", color: "#C92A2A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleteReqId === r.id ? 0.5 : 1 }}><Trash2 size={11} /></button>
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

      {/* ── Add/Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری کڕیار" : "کڕیاری نوێ"}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی کڕیار" required><input style={inputStyle} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="خاوەن" required><input style={inputStyle} required value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></FormField>
            <FormField label="تەلەفۆن" required><input style={inputStyle} required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="شار"><select style={selectStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="جۆر"><select style={selectStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ClientType })}>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            <FormField label="نوێنەر"><select style={selectStyle} value={form.repId} onChange={e => setForm({ ...form, repId: e.target.value })}><option value="">هەڵبژاردن...</option>{reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></FormField>
            <FormField label="مەرجی پارەدان"><select style={selectStyle} value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value as PaymentTerms })}>{Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></FormField>
            <FormField label="قەرز (د.ع)"><input style={inputStyle} type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></FormField>
          </FormGrid>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          DETAIL DRAWER — redesigned
      ════════════════════════════════════════════════════════════════ */}
      {detailRow && (() => {
        const isWH    = detailRow.entityType === "WAREHOUSE";
        // For warehouse: strip the "wh_" prefix to get the real warehouse id
        const realWHId = isWH ? detailRow.id.replace("wh_", "") : "";
        const rowOrders = isWH ? getWarehouseOrders(realWHId) : getClientOrders(detailRow.id);
        const delivered = rowOrders.filter(o => o.status === "DELIVERED");
        const paid      = rowOrders.filter(o => o.status === "PAID");
        const totalPaid = paid.reduce((s, o) => s + o.totalAmount, 0);
        const totalDebt = delivered.reduce((s, o) => s + o.totalAmount, 0);
        const tc        = typeColors[detailRow.displayType] || { bg: "#F1F3F5", color: "#6C757D" };
        return (
          <>
            {/* Overlay */}
            <div onClick={() => setDetailRow(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(15,20,40,0.35)", backdropFilter: "blur(2px)", zIndex: 400 }} />
            {/* Drawer */}
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "#FAFAFA", zIndex: 401, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>

              {/* Drawer header */}
              <div style={{ background: "#fff", borderBottom: "1px solid #F1F3F5", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setDetailRow(null)} style={{ width: 34, height: 34, borderRadius: 8, background: "#F1F3F5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}>
                  <ArrowLeft size={16} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>{detailRow.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color }}>
                      {typeIcons[detailRow.displayType]} {typeDisplayNames[detailRow.displayType]}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: detailRow.isActive ? "#D1FAE5" : "#FFE3E3", color: detailRow.isActive ? "#059669" : "#C92A2A" }}>
                      {detailRow.isActive ? "چالاک" : "ناچالاک"}
                    </span>
                  </div>
                </div>
                {!isWH && detailRow.clientRef && (
                  <button onClick={() => { openEdit(detailRow.clientRef!); setDetailRow(null); }}
                    style={{ width: 34, height: 34, borderRadius: 8, background: "#EDF2FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}>
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Info cards */}
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F3F5", padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ADB5BD", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>زانیاری سەرەکی</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[
                      { icon: <Users size={14} />,   label: isWH ? "پەیوەندیکەر" : "خاوەن",         value: detailRow.owner },
                      { icon: <Phone size={14} />,   label: "تەلەفۆن",     value: detailRow.phone },
                      { icon: <MapPin size={14} />,  label: "شار",          value: detailRow.city },
                      ...(!isWH ? [
                        { icon: <Users size={14} />,  label: "نوێنەر",     value: getRepName(detailRow.repId) },
                        { icon: <Clock size={14} />,  label: "مەرجی پارەدان", value: paymentLabels[detailRow.paymentTerms] },
                      ] : []),
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 30, height: 30, background: "#F8F9FA", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D", flexShrink: 0 }}>{item.icon}</div>
                        <div>
                          <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>{item.value || "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "کۆی داواکارییەکان", value: String(rowOrders.length),     color: "#4263EB", bg: "#EDF2FF", icon: <Package size={16} /> },
                    { label: "پارەدراوە",          value: formatIQD(totalPaid),         color: "#059669", bg: "#D1FAE5", icon: <CheckCircle size={16} /> },
                    { label: "قەرز",               value: totalDebt > 0 ? formatIQD(totalDebt) : "نییە", color: totalDebt > 0 ? "#FA5252" : "#059669", bg: totalDebt > 0 ? "#FFE3E3" : "#D1FAE5", icon: <DollarSign size={16} /> },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #F1F3F5", padding: "12px 14px" }}>
                      <div style={{ width: 32, height: 32, background: s.bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Payment button — only for real clients with delivered orders */}
                {!isWH && delivered.length > 0 && detailRow.clientRef && (
                  <button onClick={() => { setPaymentClient(detailRow.clientRef!); setPaymentMode("all"); setSelectedOrderIds([]); setReceiptFile(null); setPaymentStep("select"); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: "linear-gradient(135deg, #059669, #10B981)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(5,150,105,.3)", transition: "opacity .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    <CreditCard size={18} /> پارەدانی {delivered.length} داواکاری گەیشتووە
                  </button>
                )}

                {/* Orders list */}
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F3F5", overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #F8F9FA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>مێژووی داواکارییەکان</span>
                    <span style={{ fontSize: 12, color: "#ADB5BD" }}>{rowOrders.length} داواکاری</span>
                  </div>
                  {rowOrders.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#ADB5BD", fontSize: 13 }}>هیچ داواکارییەک نییە</div>
                  ) : (
                    <div style={{ maxHeight: 340, overflowY: "auto" }}>
                      {rowOrders.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(o => {
                        const st = STATUS_LABELS[o.status] || { label: o.status, bg: "#F1F3F5", color: "#6C757D" };
                        return (
                          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #F8F9FA" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{o.orderNumber}</div>
                              <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 2 }}>{new Date(o.createdAt).toLocaleDateString("ku")}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", textAlign: "right", minWidth: 90, whiteSpace: "nowrap" }}>{formatIQD(o.totalAmount)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteClient(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم کڕیارە؟" />

      {/* ════════ PAYMENT MODAL ════════ */}
      {paymentClient && (() => {
        const deliveredOrders = getDeliveredOrders(paymentClient.id);
        const targetOrders: Order[] = paymentMode === "all" ? deliveredOrders : deliveredOrders.filter(o => selectedOrderIds.includes(o.id));
        const totalToPay = targetOrders.reduce((s, o) => s + o.totalAmount, 0);
        return (
          <Modal open={true} onClose={() => setPaymentClient(null)} title={`پارەدانی — ${paymentClient.name}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {paymentStep === "select" && (
                <>
                  <div style={{ display: "flex", gap: 0, background: "#F1F3F5", borderRadius: 10, padding: 4 }}>
                    {(["all", "select"] as const).map(m => (
                      <button key={m} onClick={() => { setPaymentMode(m); setSelectedOrderIds([]); }}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: paymentMode === m ? "white" : "transparent", color: paymentMode === m ? "#059669" : "#6C757D", boxShadow: paymentMode === m ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>
                        {m === "all" ? "پارەدانی هەموو" : "هەڵبژاردنی داواکاری"}
                      </button>
                    ))}
                  </div>
                  <div style={{ border: "1px solid #F1F3F5", borderRadius: 10, overflow: "hidden" }}>
                    {deliveredOrders.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#ADB5BD" }}>هیچ داواکارییەکی گەیشتووە نییە</div>
                    ) : deliveredOrders.map(o => {
                      const checked = paymentMode === "all" || selectedOrderIds.includes(o.id);
                      return (
                        <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #F8F9FA", background: checked ? "#F0FDF4" : "white", cursor: paymentMode === "select" ? "pointer" : "default" }}
                          onClick={() => { if (paymentMode !== "select") return; setSelectedOrderIds(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]); }}>
                          {paymentMode === "select" && (
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? "#059669" : "#DEE2E6"}`, background: checked ? "#059669" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {checked && <CheckCircle size={12} color="white" />}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{o.orderNumber}</div>
                            <div style={{ fontSize: 12, color: "#6C757D" }}>{new Date(o.createdAt).toLocaleDateString("ku")}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: "#059669", fontSize: 15 }}>{formatIQD(o.totalAmount)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0" }}>
                    <span style={{ fontWeight: 600 }}>کۆی پارەدان</span>
                    <span style={{ fontWeight: 800, fontSize: 20, color: "#059669" }}>{formatIQD(totalToPay)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setPaymentClient(null)} style={{ padding: "10px 20px", background: "#F8F9FA", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>پاشگەزبوونەوە</button>
                    <button disabled={targetOrders.length === 0} onClick={() => setPaymentStep("receipt")} style={{ padding: "10px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: targetOrders.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: targetOrders.length === 0 ? 0.5 : 1 }}>پێشکەوتن ←</button>
                  </div>
                </>
              )}
              {paymentStep === "receipt" && (() => {
                const discountAmt = Math.max(0, Number(discount) || 0);
                const afterDiscount = totalToPay - discountAmt;
                return (
                  <>
                    {/* Summary bar */}
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#6C757D" }}>{targetOrders.length} داواکاری — کۆی گشتی</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "#059669" }}>{formatIQD(totalToPay)}</div>
                      </div>
                      {discountAmt > 0 && (
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 12, color: "#6C757D" }}>دوای داشکاندن</div>
                          <div style={{ fontWeight: 800, fontSize: 20, color: "#2563EB" }}>{formatIQD(afterDiscount)}</div>
                        </div>
                      )}
                    </div>

                    {/* Discount + Receiver */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 6 }}>داشکاندن (د.ع)</div>
                        <input type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }} placeholder="0" />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 6 }}>وەرگیراوە لە لایەن *</div>
                        <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }} placeholder="ناوی وەرگر..." />
                      </div>
                    </div>

                    {/* Order numbers preview */}
                    <div style={{ background: "#EEF2FF", border: "1px solid #C7D7FD", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4263EB", marginBottom: 4 }}>داواکارییەکانی پارەدراو</div>
                      <div style={{ fontSize: 12, color: "#1A1A2E", lineHeight: 1.8 }}>
                        {targetOrders.map(o => o.orderNumber).join("  |  ")}
                      </div>
                    </div>

                    {/* Upload signed receipt */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 6 }}>بارکردنی پسوولەی واژووکراو (ئەگەر هەبوو)</div>
                      <div style={{ border: "1.5px dashed #DEE2E6", borderRadius: 10, padding: "14px 16px", textAlign: "center", cursor: "pointer", background: receiptFile ? "#F0FDF4" : "#FAFAFA" }}
                        onClick={() => receiptInputRef.current?.click()}>
                        <Upload size={20} style={{ color: "#ADB5BD", display: "block", margin: "0 auto 6px" }} />
                        <div style={{ fontSize: 12, color: receiptFile ? "#059669" : "#6C757D", fontWeight: receiptFile ? 600 : 400 }}>
                          {receiptFile ? `✓ ${receiptFile.name}` : "کرتە بکە یان فایل بخشێنە"}
                        </div>
                        <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>

                    {/* Action row */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setPaymentStep("select")}
                        style={{ padding: "10px 16px", background: "#F8F9FA", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13 }}>
                        ← گەڕانەوە
                      </button>

                      {/* Print receipt */}
                      <button onClick={() => {
                        const html = buildDebtReceiptHTML(
                          paymentClient!.name,
                          targetOrders,
                          totalToPay,
                          discountAmt,
                          receiverName,
                          settings ?? null
                        );
                        const w = window.open("", "_blank");
                        if (!w) return;
                        w.document.write(html);
                        w.document.close();
                      }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#EEF2FF", border: "1px solid #C7D7FD", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, color: "#4263EB" }}>
                        <Printer size={15} /> پرینتی وەسڵ
                      </button>

                      {/* Confirm payment */}
                      <button disabled={paymentUploading} onClick={async () => {
                        setPaymentUploading(true);
                        let receiptUrl = "";
                        if (receiptFile) {
                          const { supabase } = await import("@/lib/supabase");
                          const { data, error } = await supabase.storage.from("order-docs").upload(`receipts/${Date.now()}_${receiptFile.name}`, receiptFile, { upsert: true });
                          if (error) { showToast("هەڵە لە بارکردن: " + error.message, "error"); setPaymentUploading(false); return; }
                          const { data: urlData } = supabase.storage.from("order-docs").getPublicUrl(data.path);
                          receiptUrl = urlData.publicUrl;
                        }
                        await markOrdersAsPaid(targetOrders.map(o => o.id), receiptUrl);
                        setPaymentClient(null);
                        setDiscount("0");
                        setReceiverName("");
                        setPaymentUploading(false);
                      }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: paymentUploading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, opacity: paymentUploading ? 0.7 : 1 }}>
                        <CheckCircle size={15} />
                        {paymentUploading ? "تۆمارکردن..." : "پارەدان دڵنیاکردنەوە"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </Modal>
        );
      })()}

      {/* Clear history confirm */}
      {showClearConfirm && (
        <div onClick={() => setShowClearConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFE3E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#C92A2A", flexShrink: 0 }}><History size={20} /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>سڕینەوەی مێژووی داواکارییەکان</div>
                <div style={{ fontSize: 12, color: "#6C757D", marginTop: 2 }}>هەموو داواکارییەکانی پەسەندکراو و ڕەتکراوەیەوە دەسڕێتەوە</div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "#FFF8DB", borderRadius: 8, fontSize: 12, color: "#856404", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} /> داواکارییەکانی چاوەڕوان دەمێننەوە — تەنها مێژوو دەسڕێتەوە
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleClearHistory} disabled={clearingHistory} style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: "#C92A2A", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: clearingHistory ? 0.7 : 1 }}>
                {clearingHistory ? "بارکردن..." : "بەڵێ، بیسڕەوە"}
              </button>
              <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: "#F1F3F5", color: "#495057", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
