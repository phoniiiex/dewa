"use client";
import { useState, FormEvent, useRef } from "react";
import {
  FlaskConical, Plus, Eye, Trash2, X, Printer, CheckCircle, XCircle,
  Clock, Send, Package, User, ChevronDown,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import type { SampleRequest, SampleStatus } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";

// ── Status config ──────────────────────────────────────────
const statusConfig: Record<SampleStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: "چاوەڕوان",  color: "#F47B35", bg: "#FEF3EB", icon: <Clock size={12} /> },
  ACCEPTED: { label: "پەسەندکرا", color: "#4263EB", bg: "#EDF2FF", icon: <CheckCircle size={12} /> },
  SENT:     { label: "نێردرا",    color: "#7C5CFC", bg: "#F3F0FF", icon: <Send size={12} /> },
  ARRIVED:  { label: "گەیشت",    color: "#40C057", bg: "#EBFBEE", icon: <Package size={12} /> },
  DECLINED: { label: "ڕەتکرایەوە", color: "#FA5252", bg: "#FFF5F5", icon: <XCircle size={12} /> },
};

const statusFlow: SampleStatus[] = ["PENDING", "ACCEPTED", "SENT", "ARRIVED"];

// ── Receipt print component ─────────────────────────────────
function SampleReceipt({ sr }: { sr: SampleRequest }) {
  return (
    <div style={{ fontFamily: "inherit", padding: 32, maxWidth: 600, margin: "0 auto", direction: "rtl" }}>
      <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #1A1A2E", paddingBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E" }}>داواکاری نموونە</div>
        <div style={{ fontSize: 13, color: "#6C757D", marginTop: 4 }}>Sample Request Receipt</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#7C5CFC", marginTop: 8 }}>{sr.requestNumber}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, fontSize: 13 }}>
        <div><span style={{ color: "#ADB5BD" }}>نوێنەر: </span><strong>{sr.repName}</strong></div>
        <div><span style={{ color: "#ADB5BD" }}>بارودۆخ: </span><strong>{statusConfig[sr.status].label}</strong></div>
        {sr.doctorName && <div><span style={{ color: "#ADB5BD" }}>دکتۆر: </span><strong>{sr.doctorName}</strong></div>}
        <div><span style={{ color: "#ADB5BD" }}>بەروار: </span><strong>{new Date(sr.createdAt).toLocaleDateString("ar-IQ")}</strong></div>
        {sr.sentAt && <div><span style={{ color: "#ADB5BD" }}>نێردراو لە: </span><strong>{sr.sentAt}</strong></div>}
        {sr.arrivedAt && <div><span style={{ color: "#ADB5BD" }}>گەیشتووە لە: </span><strong>{sr.arrivedAt}</strong></div>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#1A1A2E", color: "white" }}>
            <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>بەرهەم</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>بڕ</th>
          </tr>
        </thead>
        <tbody>
          {sr.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E9ECEF", background: i % 2 === 0 ? "white" : "#F8F9FA" }}>
              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.productName}</td>
              <td style={{ padding: "8px 12px", textAlign: "center" }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sr.note && (
        <div style={{ padding: 12, background: "#F8F9FA", borderRadius: 8, fontSize: 12, color: "#6C757D", borderRight: "3px solid #7C5CFC" }}>
          <strong>تێبینی:</strong> {sr.note}
        </div>
      )}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ADB5BD", borderTop: "1px dashed #DEE2E6", paddingTop: 12 }}>
        <span>دەوا فارما</span>
        <span>{sr.requestNumber}</span>
        <span>{new Date().toLocaleDateString("ar-IQ")}</span>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function SamplesPage() {
  const { sampleRequests, products, reps, addSampleRequest, updateSampleRequest, deleteSampleRequest, loading } = useData();
  const { currentUser } = useLayout();
  const isRep = currentUser?.role === "REP";
  const myRep = isRep ? reps.find(r => r.name === currentUser?.name) : undefined;

  const [modalOpen, setModalOpen] = useState(false);
  const [detailSr, setDetailSr] = useState<SampleRequest | null>(null);
  const [printSr, setPrintSr] = useState<SampleRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SampleStatus>("ALL");
  const printRef = useRef<HTMLDivElement>(null);

  // Form state
  const [form, setForm] = useState({ doctorName: "", note: "" });
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: "", quantity: "" }]);

  const resetForm = () => {
    setForm({ doctorName: "", note: "" });
    setItems([{ productId: "", quantity: "" }]);
  };

  const addItemRow = () => setItems([...items, { productId: "", quantity: "" }]);
  const removeItemRow = (i: number) => setItems(items.filter((_, j) => j !== i));
  const updateItem = (i: number, field: string, value: string) =>
    setItems(items.map((it, j) => j === i ? { ...it, [field]: value } : it));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.productId && it.quantity);
    if (validItems.length === 0) return;

    const srItems = validItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return { productId: it.productId, productName: prod?.name || "", quantity: Number(it.quantity) };
    });

    const repRecord = isRep ? myRep : undefined;

    await addSampleRequest({
      repId: repRecord?.id || currentUser?.id || "",
      repName: repRecord?.name || currentUser?.name || "",
      items: srItems,
      doctorName: form.doctorName,
      status: "PENDING",
      note: form.note,
      sentAt: "", arrivedAt: "", declinedReason: "",
    });

    resetForm();
    setModalOpen(false);
  };

  // Status transitions
  const advance = (sr: SampleRequest) => {
    const idx = statusFlow.indexOf(sr.status);
    if (idx < 0 || idx >= statusFlow.length - 1) return;
    const next = statusFlow[idx + 1];
    const now = new Date().toLocaleDateString("ar-IQ");
    const extra: Partial<SampleRequest> = { status: next };
    if (next === "SENT") extra.sentAt = now;
    if (next === "ARRIVED") extra.arrivedAt = now;
    updateSampleRequest(sr.id, extra);
  };

  const decline = (id: string) => {
    updateSampleRequest(id, { status: "DECLINED", declinedReason: declineReason });
    setDeclineId(null);
    setDeclineReason("");
  };

  const handlePrint = (sr: SampleRequest) => {
    setPrintSr(sr);
    setTimeout(() => {
      if (printRef.current) {
        const w = window.open("", "_blank", "width=700,height=900");
        if (w) {
          w.document.write(`<html><head><title>${sr.requestNumber}</title><style>body{direction:rtl;font-family:system-ui,sans-serif;margin:0;padding:0}*{box-sizing:border-box}</style></head><body>`);
          w.document.write(printRef.current.innerHTML);
          w.document.write("</body></html>");
          w.document.close();
          w.focus();
          setTimeout(() => { w.print(); w.close(); }, 300);
        }
      }
    }, 100);
  };

  // Filter
  const filtered = sampleRequests.filter(sr => {
    if (isRep && sr.repName !== (myRep?.name || currentUser?.name)) return false;
    if (statusFilter !== "ALL" && sr.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = sampleRequests.filter(s => s.status === "PENDING").length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #7C5CFC22, #4263EB22)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC", border: "1px solid #E9D7FF" }}>
            <FlaskConical size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>نموونەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>داواکاری نموونە و شوێنکەوتنی بارودۆخ</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="topbar-add-btn">
          <Plus size={16} /><span>داواکاری نموونە</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {loading ? <>{[0,1,2,3].map(i => <SkeletonKPI key={i} />)}</> : [
          { title: "کۆی داواکاری", value: String(sampleRequests.length) },
          { title: "چاوەڕوان", value: String(pendingCount), color: "#F47B35" },
          { title: "نێردراو", value: String(sampleRequests.filter(s => s.status === "SENT").length), color: "#7C5CFC" },
          { title: "گەیشتووە", value: String(sampleRequests.filter(s => s.status === "ARRIVED").length), color: "#40C057" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2, marginBottom: 20, width: "fit-content" }}>
        {(["ALL", ...statusFlow, "DECLINED"] as ("ALL" | SampleStatus)[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: statusFilter === s ? "white" : "transparent",
              color: statusFilter === s ? "#1A1A2E" : "#6C757D",
              boxShadow: statusFilter === s ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>
            {s === "ALL" ? "هەموو" : statusConfig[s as SampleStatus].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ژمارە</th>
              {!isRep && <th>نوێنەر</th>}
              <th>بەرهەمەکان</th>
              <th>دکتۆر</th>
              <th>بارودۆخ</th>
              <th>بەروار</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows rows={5} cols={isRep ? 6 : 7} /> :
              filtered.length === 0 ? (
                <tr><td colSpan={isRep ? 6 : 7} style={{ textAlign: "center", color: "#ADB5BD", padding: 32 }}>هیچ داواکارییەک نەدۆزرایەوە</td></tr>
              ) : filtered.map(sr => {
                const cfg = statusConfig[sr.status];
                const nextIdx = statusFlow.indexOf(sr.status);
                const canAdvance = !isRep && nextIdx >= 0 && nextIdx < statusFlow.length - 1;
                const canDecline = !isRep && (sr.status === "PENDING" || sr.status === "ACCEPTED");
                return (
                  <tr key={sr.id}>
                    <td style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace", color: "#7C5CFC" }}>{sr.requestNumber}</td>
                    {!isRep && <td style={{ fontWeight: 600, fontSize: 13 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><User size={12} color="#ADB5BD" />{sr.repName}</div></td>}
                    <td style={{ fontSize: 12 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {sr.items.map((it, i) => (
                          <span key={i} style={{ padding: "2px 8px", background: "#F3F0FF", borderRadius: 5, fontSize: 11, color: "#7C5CFC", fontWeight: 600 }}>
                            {it.productName} ×{it.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "#6C757D" }}>{sr.doctorName || "—"}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "#6C757D" }}>{new Date(sr.createdAt).toLocaleDateString("ar-IQ")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={() => setDetailSr(sr)} style={{ padding: 4, color: "#4263EB", background: "none", border: "none", cursor: "pointer" }} title="وردەکاری"><Eye size={14} /></button>
                        <button onClick={() => handlePrint(sr)} style={{ padding: 4, color: "#40C057", background: "none", border: "none", cursor: "pointer" }} title="چاپ"><Printer size={14} /></button>

                        {/* Admin/Manager actions */}
                        {canAdvance && (
                          <button onClick={() => advance(sr)}
                            style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#EDF2FF", color: "#4263EB", border: "1px solid #BFD0FF", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                            <ChevronDown size={10} /> {statusConfig[statusFlow[nextIdx + 1]].label}
                          </button>
                        )}
                        {canDecline && (
                          <button onClick={() => { setDeclineId(sr.id); setDeclineReason(""); }}
                            style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#FFF5F5", color: "#FA5252", border: "1px solid #FFC9C9", cursor: "pointer", fontFamily: "inherit" }}>
                            ڕەت
                          </button>
                        )}
                        {!isRep && <button onClick={() => setDeleteId(sr.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }} title="سڕینەوە"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} داواکاری</span></div>
      </div>

      {/* New Request Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="داواکاری نموونەی نوێ" width={600}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            {/* Rep display */}
            {isRep ? (
              <FormField label="نوێنەر">
                <div style={{ ...inputStyle, background: "#F8F4FF", color: "#7C5CFC", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  👤 {myRep?.name || currentUser?.name}
                </div>
              </FormField>
            ) : null}
            <FormField label="ناوی دکتۆر (ئارەزووی)">
              <input style={inputStyle} value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} placeholder="دکتۆر ..." />
            </FormField>
          </FormGrid>

          {/* Product rows */}
          <div style={{ marginTop: 20, borderTop: "1px solid #E9ECEF", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>بەرهەمەکان</h4>
              <button type="button" onClick={addItemRow} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> زیادکردن</button>
            </div>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <select style={{ ...selectStyle, flex: 2 }} value={it.productId} onChange={e => updateItem(i, "productId", e.target.value)}>
                  <option value="">بەرهەم هەڵبژێرە...</option>
                  {products.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input style={{ ...inputStyle, flex: 1 }} type="number" min="1" placeholder="بڕ" value={it.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(i)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>

          <FormField label="تێبینی">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="تێبینی دڵخوازانە..." />
          </FormField>
          <FormActions onCancel={() => setModalOpen(false)} submitLabel="نێردنی داواکاری" />
        </form>
      </Modal>

      {/* Detail Drawer */}
      {detailSr && (
        <div onClick={() => setDetailSr(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 460, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>وردەکاری {detailSr.requestNumber}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePrint(detailSr)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Printer size={12} /> چاپ</button>
                <button onClick={() => setDetailSr(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {/* Status badge */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 24px", borderRadius: 10, fontSize: 14, fontWeight: 800, background: statusConfig[detailSr.status].bg, color: statusConfig[detailSr.status].color }}>
                  {statusConfig[detailSr.status].icon} {statusConfig[detailSr.status].label}
                </span>
              </div>

              {/* Timeline */}
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 }}>
                {statusFlow.map((s, i) => {
                  const idx = statusFlow.indexOf(detailSr.status);
                  const done = i <= idx && detailSr.status !== "DECLINED";
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? statusConfig[s].color : "#F1F3F5", color: done ? "white" : "#ADB5BD", fontSize: 10, fontWeight: 700, transition: "all 0.3s" }}>
                        {i + 1}
                      </div>
                      {i < statusFlow.length - 1 && <div style={{ width: 24, height: 2, background: i < idx && detailSr.status !== "DECLINED" ? "#40C057" : "#E9ECEF" }} />}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {[
                  { l: "نوێنەر", v: detailSr.repName },
                  { l: "دکتۆر", v: detailSr.doctorName || "—" },
                  { l: "بەروار", v: new Date(detailSr.createdAt).toLocaleDateString("ar-IQ") },
                  { l: "نێردراو لە", v: detailSr.sentAt || "—" },
                  { l: "گەیشتووە لە", v: detailSr.arrivedAt || "—" },
                  ...(detailSr.declinedReason ? [{ l: "هۆکاری ڕەتکردنەوە", v: detailSr.declinedReason }] : []),
                ].map((it, i) => (
                  <div key={i}><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 3 }}>{it.l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{it.v}</div></div>
                ))}
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>بەرهەمەکان</h4>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#F8F4FF" }}><th style={{ padding: "6px 8px", textAlign: "right", color: "#7C5CFC", fontWeight: 600 }}>بەرهەم</th><th style={{ padding: "6px 8px", textAlign: "center", color: "#7C5CFC", fontWeight: 600 }}>بڕ</th></tr></thead>
                <tbody>
                  {detailSr.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F1F3F5" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{it.productName}</td>
                      <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: "#7C5CFC" }}>{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailSr.note && (
                <div style={{ marginTop: 16, padding: 12, background: "#F8F9FA", borderRadius: 8, fontSize: 12, color: "#6C757D", borderRight: "3px solid #7C5CFC" }}>
                  <strong>تێبینی:</strong> {detailSr.note}
                </div>
              )}

              {/* Admin actions from drawer */}
              {!isRep && (
                <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {statusFlow.indexOf(detailSr.status) >= 0 && statusFlow.indexOf(detailSr.status) < statusFlow.length - 1 && (
                    <button onClick={() => { advance(detailSr); setDetailSr(prev => prev ? { ...prev, status: statusFlow[statusFlow.indexOf(prev.status) + 1] } : prev); }}
                      style={{ flex: 1, padding: "8px 16px", borderRadius: 8, background: "#4263EB", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <ChevronDown size={14} /> {statusConfig[statusFlow[statusFlow.indexOf(detailSr.status) + 1]]?.label}
                    </button>
                  )}
                  {(detailSr.status === "PENDING" || detailSr.status === "ACCEPTED") && (
                    <button onClick={() => { setDeclineId(detailSr.id); setDetailSr(null); }}
                      style={{ padding: "8px 16px", borderRadius: 8, background: "#FFF5F5", color: "#FA5252", border: "1px solid #FFC9C9", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      ڕەتکردنەوە
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decline modal */}
      {declineId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#FA5252" }}>ڕەتکردنەوەی داواکاری</h3>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="هۆکاری ڕەتکردنەوە (ئارەزووی)..."
              style={{ ...inputStyle, width: "100%", minHeight: 80, resize: "vertical", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => decline(declineId!)} style={{ flex: 1, padding: "8px 16px", borderRadius: 8, background: "#FA5252", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>ڕەتکردنەوە</button>
              <button onClick={() => setDeclineId(null)} style={{ flex: 1, padding: "8px 16px", borderRadius: 8, background: "#F1F3F5", color: "#1A1A2E", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>هەڵوەشاندنەوە</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area */}
      <div ref={printRef} style={{ display: "none" }}>
        {printSr && <SampleReceipt sr={printSr} />}
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteSampleRequest(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟" />
    </>
  );
}
