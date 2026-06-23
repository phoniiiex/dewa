"use client";
import { useRef, useState, useEffect } from "react";
import { Printer, X, FileText, Receipt, FileCheck } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order } from "@/lib/types";

type DocumentType = "invoice" | "receipt" | "delivery" | "quote";

const DOC_LABELS: Record<DocumentType, { label: string; icon: React.ReactNode; color: string }> = {
  invoice:  { label: "پسوولە",      icon: <FileText size={14} />,  color: "#4263EB" },
  receipt:  { label: "وەسڵ",        icon: <Receipt size={14} />,   color: "#40C057" },
  delivery: { label: "وەرقەی گەیاندن", icon: <FileCheck size={14} />, color: "#F47B35" },
  quote:    { label: "نرخنامە",     icon: <FileText size={14} />,  color: "#7C5CFC" },
};

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  documentType?: DocumentType;
}

export default function PrintModal({ open, onClose, order, documentType = "invoice" }: PrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, clients, reps } = useData();
  const [activeDocType, setActiveDocType] = useState<DocumentType>(documentType);

  useEffect(() => { setActiveDocType(documentType); }, [documentType]);

  if (!open || !order) return null;

  const client = clients.find(c => c.id === order.clientId);
  const rep = reps.find(r => r.id === order.repId);
  const docInfo = DOC_LABELS[activeDocType];
  const subtotal = order.items.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);
  const hasBonusItems = order.items.some(item => item.bonusQty > 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ckb"><head><meta charset="UTF-8"/>
<title>${docInfo.label} — ${order.orderNumber}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Arabic',sans-serif;direction:rtl;padding:40px;background:white;color:#1a1a2e;font-size:13px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}thead{background:#1a1a2e;color:white}
th{padding:10px 14px;font-size:12px;font-weight:700;text-align:right}td{padding:10px 14px;font-size:13px;border-bottom:1px solid #E9ECEF}
tr:nth-child(even){background:#F8F9FA}@media print{body{padding:20px}}</style>
</head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#F8F9FA", borderRadius: 16, width: "90%", maxWidth: 900, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #E9ECEF", background: "white", borderRadius: "16px 16px 0 0", position: "sticky", top: 0, zIndex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{docInfo.label} — {order.orderNumber}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(Object.keys(DOC_LABELS) as DocumentType[]).map(dt => (
              <button key={dt} onClick={() => setActiveDocType(dt)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: activeDocType === dt ? "none" : "1px solid #DEE2E6", background: activeDocType === dt ? DOC_LABELS[dt].color : "white", color: activeDocType === dt ? "white" : "#6C757D" }}>
                {DOC_LABELS[dt].icon} {DOC_LABELS[dt].label}
              </button>
            ))}
            <div style={{ width: 1, height: 24, background: "#DEE2E6", margin: "0 4px" }} />
            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              <Printer size={14} /> چاپکردن
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D", background: "#F1F3F5", border: "none", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding: 32 }}>
          <div ref={printRef} style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", padding: 40, maxWidth: 700, margin: "0 auto", fontFamily: "'Noto Sans Arabic', sans-serif", direction: "rtl" }}>
            {/* Doc Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 20, borderBottom: "2px solid #1a1a2e" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{settings.name || "دەوا"}</h1>
                <p style={{ fontSize: 12, color: "#6C757D" }}>{settings.address || "سیستەمی بەڕێوەبردنی دەرمانسازی"}</p>
                {settings.phone && <p style={{ fontSize: 12, color: "#6C757D" }}>تەلەفۆن: {settings.phone}</p>}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: docInfo.color, marginBottom: 8 }}>{docInfo.label}</div>
                <div style={{ fontSize: 13, color: "#6C757D" }}>ژمارە: {order.orderNumber}</div>
                <div style={{ fontSize: 12, color: "#ADB5BD" }}>بەروار: {order.createdAt}</div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
              <div style={{ padding: 16, background: "#F8F9FA", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#ADB5BD", fontWeight: 700, marginBottom: 8 }}>بۆ</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{client?.name || order.clientName}</div>
                <div style={{ fontSize: 12, color: "#6C757D" }}>{client?.city || ""}</div>
                <div style={{ fontSize: 12, color: "#6C757D" }}>{client?.phone || ""}</div>
              </div>
              <div style={{ padding: 16, background: "#F8F9FA", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#ADB5BD", fontWeight: 700, marginBottom: 8 }}>نوێنەر</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{rep?.name || order.repName}</div>
                <div style={{ fontSize: 12, color: "#6C757D" }}>{rep?.phone || ""}</div>
              </div>
            </div>

            {/* Items */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead><tr style={{ background: "#1a1a2e", color: "white" }}>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>#</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>بەرهەم</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>ژمارە</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>نرخی تاک</th>
                {activeDocType !== "delivery" && <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>کۆ</th>}
                {hasBonusItems && activeDocType === "invoice" && <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>بۆنەس</th>}
              </tr></thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? "#F8F9FA" : "white" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #E9ECEF" }}>{i + 1}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #E9ECEF" }}>{item.productName}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #E9ECEF" }}>{item.quantity}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #E9ECEF" }}>{formatIQD(item.unitPrice)}</td>
                    {activeDocType !== "delivery" && <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #E9ECEF" }}>{formatIQD(item.quantity * item.unitPrice)}</td>}
                    {hasBonusItems && activeDocType === "invoice" && <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #E9ECEF", color: "#40C057" }}>{item.bonusQty ? `+${item.bonusQty}` : "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            {activeDocType !== "delivery" && (
              <div style={{ maxWidth: 280, marginRight: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                  <span style={{ color: "#6C757D" }}>کۆی ناوەکی</span>
                  <span style={{ fontWeight: 600 }}>{formatIQD(subtotal)}</span>
                </div>
                {hasBonusItems && activeDocType === "invoice" && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "#40C057" }}>بۆنەس</span>
                    <span style={{ fontWeight: 600, color: "#40C057" }}>{order.bonusNotation}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 16, fontWeight: 800, borderTop: "2px solid #1a1a2e", marginTop: 8 }}>
                  <span>کۆی گشتی</span>
                  <span>{formatIQD(order.totalAmount)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div style={{ marginTop: 24, padding: 16, background: "#F8F9FA", borderRadius: 10, borderRight: `4px solid ${docInfo.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: docInfo.color }}>تێبینی</div>
                <p style={{ fontSize: 12, color: "#6C757D", lineHeight: 1.6 }}>{order.notes}</p>
              </div>
            )}

            {/* Signatures */}
            <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
              <div style={{ borderTop: "1px solid #DEE2E6", paddingTop: 8, textAlign: "center", fontSize: 11, color: "#ADB5BD", marginTop: 48 }}>واژووی فرۆشیار</div>
              <div style={{ borderTop: "1px solid #DEE2E6", paddingTop: 8, textAlign: "center", fontSize: 11, color: "#ADB5BD", marginTop: 48 }}>واژووی کڕیار</div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #DEE2E6", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ADB5BD" }}>
              <span>{settings.name || "دەوا"} © {new Date().getFullYear()}</span>
              <span>دروستکراوە بە سیستەمی دەوا</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
