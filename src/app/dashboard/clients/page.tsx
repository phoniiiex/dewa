"use client";
import { useState, useEffect, FormEvent, useRef, useMemo } from "react";
import { Search, Plus, Users, Phone, MapPin, Edit3, Trash2, Eye, X, Building2, Stethoscope, ShoppingBag, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, History, CreditCard, Upload, Printer, Warehouse, TrendingUp, Package, DollarSign, ArrowLeft } from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import { printPaymentReceipt } from "@/lib/print-engine";
import type { Client, ClientType, PaymentTerms, Order } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

const clientExportCols = [
  { key: "name", label: "ناو" }, { key: "owner", label: "خاوەن" },
  { key: "phone", label: "تەلەفۆن" }, { key: "city", label: "شار" },
  { key: "type", label: "جۆر" }, { key: "balance", label: "باڵانس", format: (v: unknown) => String(v) },
];

const typeLabels: Record<ClientType, string> = { PHARMACY: "دەرمانخانە", HOSPITAL: "نەخۆشخانە", CLINIC: "کلینیک", WAREHOUSE: "کۆگا" };
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
  const { allRows, filtered } = useMemo(() => {
    const warehouseRows: UnifiedRow[] = (warehouses || []).map(w => ({
      id: `wh_${w.id}`,
      name: w.name,
      owner: w.contact || "—",
      phone: w.phone || "—",
      city: w.city,
      entityType: "WAREHOUSE" as const,
      displayType: "WAREHOUSE",
      repId: "",
      paymentTerms: "IMMEDIATE" as PaymentTerms,
      balance: 0,
      isActive: w.isActive,
    }));
    const clientRows: UnifiedRow[] = clients.map(c => ({
      id: c.id,
      name: c.name,
      owner: c.owner,
      phone: c.phone,
      city: c.city,
      entityType: "CLIENT" as const,
      displayType: c.type,
      repId: c.repId,
      paymentTerms: c.paymentTerms,
      balance: c.balance,
      isActive: c.isActive,
      clientRef: c,
    }));
    const all: UnifiedRow[] = [...clientRows, ...warehouseRows];
    const filt = all.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.owner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity   = cityFilter === "هەموو" || r.city === cityFilter;
      const matchType   = typeFilter === "هەموو" || r.displayType === typeFilter;
      return matchSearch && matchCity && matchType;
    });
    return { allRows: all, filtered: filt };
  }, [clients, warehouses, searchTerm, cityFilter, typeFilter]);

  const resetForm = () => setForm({ name: "", owner: "", phone: "", city: cities[0], type: "PHARMACY", repId: reps[0]?.id || "", paymentTerms: "IMMEDIATE", balance: "0", isActive: true });
  const openAdd  = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, owner: c.owner, phone: c.phone, city: c.city, type: c.type, repId: c.repId, paymentTerms: c.paymentTerms, balance: String(c.balance), isActive: c.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, balance: Number(form.balance), qrToken: "", bonusPct: 0, bonusRules: [], address: "", contact: "" };
    if (editing) updateClient(editing.id, data);
    else addClient(data);
    setModalOpen(false);
  };

  const getRepName = (repId: string) => reps.find(r => r.id === repId)?.name || "—";
  const getClientOrders   = (clientId: string) => orders.filter(o => o.clientId === clientId);
  const getDeliveredOrders = (clientId: string) => orders.filter(o => o.clientId === clientId && o.status === "DELIVERED");

  const getWarehouseOrders = (wId: string) => orders.filter(o => o.clientId === wId);

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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">کڕیارەکان و مەخزەنەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی کڕیارەکان و مەخزەنەکان</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === "clients" && (
            <>
              <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={clientExportCols} filename="clients" title="کڕیارەکان" />
              <Button onClick={openAdd}><Plus className="size-4 me-1" />کڕیاری نوێ</Button>
            </>
          )}
          {tab === "requests" && (
            <div className="flex gap-2">
              {requests.filter(r => r.status !== "PENDING").length > 0 && (
                <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/5 text-xs" onClick={() => setShowClearConfirm(true)}>
                  <History className="size-3.5 me-1" /> سڕینەوەی مێژوو
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs" onClick={loadRequests}>
                <RefreshCw className="size-3.5 me-1" /> نوێکردنەوە
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { title: "کۆی کڕیارەکان",  value: clients.length,               icon: <Users className="size-4" />,      cls: "bg-blue-50 dark:bg-blue-950/40 text-primary" },
          { title: "مەخزەنەکان",     value: (warehouses || []).length,     icon: <Warehouse className="size-4" />,  cls: "bg-violet-50 dark:bg-violet-950/40 text-violet-600" },
          { title: "قەرزی کۆ",       value: formatIQD(totalDebt),           icon: <TrendingUp className="size-4" />, cls: "bg-red-50 dark:bg-red-950/40 text-destructive" },
          { title: "داواکاری کۆ",    value: orders.length,                  icon: <Package className="size-4" />,    cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" },
        ].map(k => (
          <Card key={k.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", k.cls)}>{k.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{k.title}</p>
                <p className="text-base font-black">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-5 w-fit">
        <Button variant={tab === "clients" ? "secondary" : "ghost"} size="sm"
          onClick={() => setTab("clients")}
          className={cn("px-5 rounded-lg text-sm font-semibold",
            tab === "clients" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          کڕیارەکان و مەخزەنەکان
        </Button>
        {isManager && (
          <Button variant={tab === "requests" ? "secondary" : "ghost"} size="sm"
            onClick={() => setTab("requests")}
            className={cn("px-5 rounded-lg text-sm font-semibold gap-2",
              tab === "requests" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            داواکارییەکان
            {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">{pendingCount}</span>}
          </Button>
        )}
      </div>

      {/* CLIENTS TAB */}
      {tab === "clients" && (
        <>
          {/* Filters */}
          <div className="flex gap-2.5 mb-4 flex-wrap items-center">
            <div className="relative">
              <Search className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" placeholder="گەڕان بە ناو..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-56 h-9 pe-8 text-sm" />
            </div>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
              {["\u0647ەموو", ...cities].map(c => (
                <Button key={c} variant={cityFilter === c ? "secondary" : "ghost"} size="sm"
                  onClick={() => setCityFilter(c)}
                  className={cn("px-2.5 h-7 rounded-md text-[11px] font-medium",
                    cityFilter === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{c}</Button>
              ))}
            </div>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
              {["هەموو", "PHARMACY", "HOSPITAL", "CLINIC", "WAREHOUSE"].map(t => (
                <Button key={t} variant={typeFilter === t ? "secondary" : "ghost"} size="sm"
                  onClick={() => setTypeFilter(t)}
                  className={cn("px-2.5 h-7 rounded-md text-[11px] font-medium",
                    typeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{t === "هەموو" ? "هەموو" : typeDisplayNames[t]}</Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["ناو","خاوەن / پەیوەندی","تەلەفۆن","شار","جۆر","نوێنەر","قەرز","بارودۆخ",""].map(h => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {row.entityType === "WAREHOUSE" && <Warehouse className="size-3.5 text-violet-600 shrink-0" />}
                            {row.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.owner}</TableCell>
                        <TableCell className="text-xs text-muted-foreground ltr text-right">{row.phone}</TableCell>
                        <TableCell><span className="flex items-center gap-1 text-sm"><MapPin className="size-3 text-muted-foreground" />{row.city}</span></TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{ background: typeColors[row.displayType]?.bg || "#F1F3F5", color: typeColors[row.displayType]?.color || "#6C757D" }}>
                            {typeIcons[row.displayType]} {typeDisplayNames[row.displayType] || row.displayType}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getRepName(row.repId)}</TableCell>
                        <TableCell className={cn("font-semibold", row.balance > 0 ? "text-destructive" : "text-muted-foreground")}>
                          {row.balance > 0 ? formatIQD(row.balance) : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold",
                            row.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                            <span className={cn("size-1.5 rounded-full", row.isActive ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                            {row.isActive ? "چالاک" : "ناچالاک"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" className="h-7 px-2 text-xs text-primary" onClick={() => setDetailRow(row)}>
                              <Eye className="size-3 me-1" /> بینین
                            </Button>
                            {row.entityType === "CLIENT" && row.clientRef && (
                              <>
                                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" onClick={() => openEdit(row.clientRef!)}><Edit3 className="size-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:bg-destructive/5" onClick={() => setDeleteId(row.clientRef!.id)}><Trash2 className="size-3.5" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">{filtered.length} تۆمار</div>
            </CardContent>
          </Card>
        </>
      )}

      {/* REQUESTS TAB */}
      {tab === "requests" && isManager && (
        <Card>
          <CardContent className="p-0 overflow-hidden">
          {reqLoading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">بارکردن...</div>
          ) : requests.length === 0 ? (
            <Empty className="py-16 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CheckCircle className="size-4" /></EmptyMedia>
                <EmptyTitle>هیچ داواکارییەک نییە</EmptyTitle>
                <EmptyDescription>هەموو داواکارییەکان جێبەجێ کراون</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["ناوی فرۆشگا","خاوەن","تەلەفۆن","شار","جۆر","داواکار","بارودۆخ","کات",""].map(h => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => {
                  const badge = statusBadge(r.status);
                  const BadgeIcon = badge.Icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.owner || "\u2014"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground ltr text-right">{r.phone || "\u2014"}</TableCell>
                      <TableCell>{r.city || "\u2014"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{ background: typeColors[r.type]?.bg || "#F1F3F5", color: typeColors[r.type]?.color || "#6C757D" }}>
                          {typeDisplayNames[r.type] || r.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.requested_by || "\u2014"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: badge.bg, color: badge.color }}>
                          <BadgeIcon className="size-3" /> {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("ckb", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        {r.status === "PENDING" ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" disabled={actionId === r.id} onClick={() => handleAction(r.id, "APPROVE")}
                              className="h-7 px-2.5 text-[11px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle className="size-3 me-1" /> پەسەند
                            </Button>
                            <Button size="sm" disabled={actionId === r.id} onClick={() => handleAction(r.id, "REJECT")}
                              className="h-7 px-2.5 text-[11px] bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400">
                              <XCircle className="size-3 me-1" /> ڕەت
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" disabled={deleteReqId === r.id} onClick={() => handleDeleteRequest(r.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">تێپەڕاوە</span>
                            <Button size="icon" variant="ghost" className="size-6 text-destructive hover:bg-destructive/5" disabled={deleteReqId === r.id} onClick={() => handleDeleteRequest(r.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
          <div className="border-t border-border px-4 py-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="size-3 text-amber-500" /> {requests.filter(r => r.status === "PENDING").length} چاوەڕوان</span>
            <span className="flex items-center gap-1"><CheckCircle className="size-3 text-emerald-600" /> {requests.filter(r => r.status === "APPROVED").length} پەسەندکرا</span>
            <span className="flex items-center gap-1"><XCircle className="size-3 text-destructive" /> {requests.filter(r => r.status === "REJECTED").length} ڕەتکرایەوە</span>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={open => !open && setModalOpen(false)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "دەستکاری کڕیار" : "کڕیاری نوێ"}</DialogTitle>
            <DialogDescription>زانیاری کڕیار پڕبکەوە</DialogDescription>
          </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>ناوی کڕیار *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>خاوەن *</Label><Input required value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></div>
            <div className="space-y-2"><Label>تەلەفۆن *</Label><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>شار</Label>
              <Select value={form.city} onValueChange={(v: string | null) => v && setForm({ ...form, city: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>جۆر</Label>
              <Select value={form.type} onValueChange={(v: string | null) => v && setForm({ ...form, type: v as ClientType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوێنەر</Label>
              <Select value={form.repId || "__none__"} onValueChange={(v: string | null) => setForm({ ...form, repId: v === "__none__" ? "" : (v || "") })}>
                <SelectTrigger><SelectValue placeholder="هەڵبژاردن..." /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">هەڵبژاردن...</SelectItem>{reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مەرجی پارەدان</Label>
              <Select value={form.paymentTerms} onValueChange={(v: string | null) => v && setForm({ ...form, paymentTerms: v as PaymentTerms })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(paymentLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>قەرز (د.ع)</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>پاشگەزبوونەوە</Button>
            <Button type="submit">{editing ? "پاشەکەوتکردن" : "تۆمارکردن"}</Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL */}
      {detailRow && (() => {
        const isWH     = detailRow.entityType === "WAREHOUSE";
        const realWHId = isWH ? detailRow.id.replace("wh_", "") : "";
        const rowOrders = isWH ? getWarehouseOrders(realWHId) : getClientOrders(detailRow.id);
        const delivered = rowOrders.filter(o => o.status === "DELIVERED");
        const paid      = rowOrders.filter(o => o.status === "PAID");
        const totalPaid = paid.reduce((s, o) => s + o.totalAmount, 0);
        const totalDebt = delivered.reduce((s, o) => s + o.totalAmount, 0);
        const tc        = typeColors[detailRow.displayType] || { bg: "#F1F3F5", color: "hsl(var(--muted-foreground))" };

        const modalTitle = (
          <div className="flex items-center gap-2">
            <span>{detailRow.name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ background: tc.bg, color: tc.color }}>
              {typeIcons[detailRow.displayType]} {typeDisplayNames[detailRow.displayType]}
            </span>
            <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold",
              detailRow.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400")}>
              {detailRow.isActive ? "چالاک" : "ناچالاک"}
            </span>
          </div>
        );

        return (
          <Dialog open={true} onOpenChange={open => !open && setDetailRow(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader><DialogTitle>{modalTitle}</DialogTitle><DialogDescription>وردەکاری کڕیار</DialogDescription></DialogHeader>
            <div className="flex flex-col gap-4">
              {!isWH && detailRow.clientRef && (
                <Button size="sm" variant="secondary" className="w-fit text-primary" onClick={() => { openEdit(detailRow.clientRef!); setDetailRow(null); }}>
                  <Edit3 className="size-3.5 me-1.5" /> دەستکاریکردن
                </Button>
              )}

              {/* Info grid */}
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">زانیاری سەرەکی</p>
                <div className="grid grid-cols-2 gap-3.5">
                  {[
                    { icon: <Users className="size-3.5" />,  label: isWH ? "پەیوەندیکەر" : "خاوەن",      value: detailRow.owner },
                    { icon: <Phone className="size-3.5" />,  label: "تەلەفۆن",                             value: detailRow.phone },
                    { icon: <MapPin className="size-3.5" />, label: "شار",                                 value: detailRow.city },
                    ...(!isWH ? [
                      { icon: <Users className="size-3.5" />, label: "نوێنەر",         value: getRepName(detailRow.repId) },
                      { icon: <Clock className="size-3.5" />, label: "مەرجی پارەدان",  value: paymentLabels[detailRow.paymentTerms] },
                    ] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="size-7 bg-background rounded-lg border border-border flex items-center justify-center text-muted-foreground shrink-0">{item.icon}</div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="text-[13px] font-semibold">{item.value || "\u2014"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "کۆی داواکارییەکان", value: String(rowOrders.length), icon: <Package className="size-4" />, cls: "bg-blue-50 dark:bg-blue-950/40 text-primary" },
                  { label: "پارەدراوە",          value: formatIQD(totalPaid), icon: <CheckCircle className="size-4" />, cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" },
                  { label: "قەرز",               value: totalDebt > 0 ? formatIQD(totalDebt) : "نییە", icon: <DollarSign className="size-4" />, cls: totalDebt > 0 ? "bg-red-50 dark:bg-red-950/40 text-destructive" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" },
                ].map((s, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3.5">
                    <div className={cn("size-8 rounded-lg flex items-center justify-center mb-2", s.cls)}>{s.icon}</div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">{s.label}</p>
                    <p className={cn("text-sm font-bold", s.cls.includes("destructive") ? "text-destructive" : s.cls.includes("emerald") ? "text-emerald-600" : "text-primary")}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Payment CTA */}
              {!isWH && delivered.length > 0 && detailRow.clientRef && (
                <Button className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                  onClick={() => { setPaymentClient(detailRow.clientRef!); setPaymentMode("all"); setSelectedOrderIds([]); setReceiptFile(null); setPaymentStep("select"); setDetailRow(null); }}>
                  <CreditCard className="size-4" /> پارەدانی {delivered.length} داواکاری گەیشتووە
                </Button>
              )}

              {/* Order history */}
              <div className="bg-muted/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                  <span className="text-sm font-bold">مێژووی داواکارییەکان</span>
                  <span className="text-xs text-muted-foreground">{rowOrders.length} داواکاری</span>
                </div>
                {rowOrders.length === 0 ? (
                  <div className="p-7 text-center text-sm text-muted-foreground">هیچ داواکارییەک نییە</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {rowOrders.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(o => {
                      const st = STATUS_LABELS[o.status] || { label: o.status, bg: "#F1F3F5", color: "hsl(var(--muted-foreground))" };
                      return (
                        <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold">{o.orderNumber}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ku")}</p>
                          </div>
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <p className="text-[13px] font-bold min-w-[90px] text-left whitespace-nowrap">{formatIQD(o.totalAmount)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی کڕیار</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم کڕیارە؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteClient(deleteId); setDeleteId(null); }}>سڕینەوە</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PAYMENT MODAL */}
      {paymentClient && (() => {
        const deliveredOrders = getDeliveredOrders(paymentClient.id);
        const targetOrders: Order[] = paymentMode === "all" ? deliveredOrders : deliveredOrders.filter(o => selectedOrderIds.includes(o.id));
        const totalToPay = targetOrders.reduce((s, o) => s + o.totalAmount, 0);
        return (
          <Dialog open={true} onOpenChange={open => !open && setPaymentClient(null)}>
            <DialogContent className="sm:max-w-lg" dir="rtl">
              <DialogHeader><DialogTitle>{`پارەدانی — ${paymentClient.name}`}</DialogTitle><DialogDescription>داواکارییەکان هەڵبژێرە بۆ پارەدان</DialogDescription></DialogHeader>
            <div className="flex flex-col gap-4">
              {paymentStep === "select" && (
                <>
                  <div className="flex gap-0 bg-muted p-1 rounded-xl">
                    {(["all", "select"] as const).map(m => (
                      <Button key={m} variant={paymentMode === m ? "secondary" : "ghost"} size="sm"
                        onClick={() => { setPaymentMode(m); setSelectedOrderIds([]); }}
                        className={cn("flex-1 rounded-lg text-sm font-semibold",
                          paymentMode === m ? "bg-background text-emerald-600 shadow-sm" : "text-muted-foreground")}>
                        {m === "all" ? "پارەدانی هەموو" : "هەڵبژاردنی داواکاری"}
                      </Button>
                    ))}
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    {deliveredOrders.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">هیچ داواکارییەکی گەیشتووە نییە</div>
                    ) : deliveredOrders.map(o => {
                      const checked = paymentMode === "all" || selectedOrderIds.includes(o.id);
                      return (
                        <div key={o.id}
                          className={cn("flex items-center gap-3 px-4 py-3 border-b border-border transition-colors",
                            checked ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-background",
                            paymentMode === "select" && "cursor-pointer")}
                          onClick={() => { if (paymentMode !== "select") return; setSelectedOrderIds(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]); }}>
                          {paymentMode === "select" && (
                            <div className={cn("size-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                              checked ? "bg-emerald-600 border-emerald-600" : "bg-background border-border")}>
                              {checked && <CheckCircle className="size-3 text-white" />}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-sm">{o.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ku")}</p>
                          </div>
                          <p className="font-bold text-emerald-600 text-[15px]">{formatIQD(o.totalAmount)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    <span className="font-semibold text-sm">کۆی پارەدان</span>
                    <span className="font-black text-xl text-emerald-600">{formatIQD(totalToPay)}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setPaymentClient(null)}>پاشگەزبوونەوە</Button>
                    <Button disabled={targetOrders.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setPaymentStep("receipt")}>پێشکەوتن ←</Button>
                  </div>
                </>
              )}
              {paymentStep === "receipt" && (() => {
                const discountAmt = Math.max(0, Number(discount) || 0);
                const afterDiscount = totalToPay - discountAmt;
                return (
                  <>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{targetOrders.length} داواکاری — کۆی گشتی</p>
                        <p className="font-black text-xl text-emerald-600">{formatIQD(totalToPay)}</p>
                      </div>
                      {discountAmt > 0 && (
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">دوای داشکاندن</p>
                          <p className="font-black text-xl text-primary">{formatIQD(afterDiscount)}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">داشکاندن (د.ع)</label>
                        <Input type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)} className="w-full" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">وەرگیراوە لە لایەن *</label>
                        <Input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)} className="w-full" placeholder="ناوی وەرگر..." />
                      </div>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                      <p className="text-[11px] font-bold text-primary mb-1">داواکارییەکانی پارەدراو</p>
                      <p className="text-xs text-foreground leading-relaxed">{targetOrders.map(o => o.orderNumber).join("  |  ")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">بارکردنی پسووڵەی واژووکراو (ئەگەر هەبوو)</p>
                      <div className={cn("border-2 border-dashed rounded-xl py-4 px-4 text-center cursor-pointer transition-colors",
                        receiptFile ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border bg-muted/30")}
                        onClick={() => receiptInputRef.current?.click()}>
                        <Upload className="size-5 text-muted-foreground mx-auto mb-1.5" />
                        <p className={cn("text-xs", receiptFile ? "text-emerald-600 font-semibold" : "text-muted-foreground")}>
                          {receiptFile ? `✓ ${receiptFile.name}` : "کرتە بکە یان فایل بخشێنە"}
                        </p>
                        <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPaymentStep("select")}>\u2190 گەڕانەوە</Button>
                      <Button variant="outline" className="text-primary border-primary/30"
                        onClick={() => {
                          if (!paymentClient) return;
                          const orderIds = selectedOrderIds.length > 0 ? selectedOrderIds : getDeliveredOrders(paymentClient.id).map(o => o.id);
                          printPaymentReceipt(paymentClient.id, orderIds);
                        }}>
                        <Printer className="size-3.5 me-1" /> پرینتی وەسڵ
                      </Button>
                      <Button disabled={paymentUploading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white justify-center"
                        onClick={async () => {
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
                        }}>
                        <CheckCircle className="size-4 me-1" />
                        {paymentUploading ? "تۆمارکردن..." : "پارەدان دڵنیاکردنەوە"}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Clear history confirm */}
      {showClearConfirm && (
        <div onClick={() => setShowClearConfirm(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[600]">
          <div onClick={e => e.stopPropagation()}
            className="bg-background rounded-2xl p-7 w-96 shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-destructive shrink-0">
                <History className="size-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold">سڕینەوەی مێژووی داواکارییەکان</p>
                <p className="text-xs text-muted-foreground mt-1">هەموو داواکارییەکانی پەسەندکراو و ڕەتکراوەیەوە دەسڕێتەوە</p>
              </div>
            </div>
            <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-400 mb-5 flex items-center gap-2">
              <AlertCircle className="size-3.5 shrink-0" /> داواکارییەکانی چاوەڕوان دەمێننەوە — تەنها مێژوو دەسڕێتەوە
            </div>
            <div className="flex gap-2.5">
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={clearingHistory} onClick={handleClearHistory}>
                {clearingHistory ? "بارکردن..." : "بەڵێ، بیسڕەوە"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowClearConfirm(false)}>پاشگەزبوونەوە</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
