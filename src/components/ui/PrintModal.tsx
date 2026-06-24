"use client";
import { useState } from "react";
import {
  Printer, X, FileText, Receipt, FileCheck, LayoutTemplate,
  ChevronLeft, Check,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order, InvoiceTemplate } from "@/lib/types";
import { useRouter } from "next/navigation";

type DocType = InvoiceTemplate["docType"];

const DOC_TYPES: { id: DocType; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: "invoice",  label: "پسووڵە",         color: "#4263EB", bg: "#EBF1FF", icon: <FileText size={14} /> },
  { id: "receipt",  label: "وەسڵ",           color: "#2B8A3E", bg: "#E3F7EC", icon: <Receipt size={14} /> },
  { id: "delivery", label: "وەرقەی گەیاندن", color: "#F47B35", bg: "#FFF3E0", icon: <FileCheck size={14} /> },
  { id: "quote",    label: "نرخنامە",         color: "#7C3AED", bg: "#F3EBFF", icon: <FileText size={14} /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function PrintModal({ open, onClose, order }: Props) {
  const router = useRouter();
  const { invoiceTemplates, clients, settings } = useData();
  const [docTypeFilter, setDocTypeFilter] = useState<DocType>("invoice");
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [step, setStep] = useState<"pick" | "preview">("pick");

  if (!open || !order) return null;

  const client = clients.find(c => c.id === order.clientId);
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const templatesForType = invoiceTemplates.filter(t => t.docType === docTypeFilter);

  const handleSelectTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplate(t);
    setStep("preview");
  };

  const handleQuickPrint = () => {
    // Quick print with default layout (no template)
    const html = buildQuickPrintHTML(order, client, settings, docTypeFilter, subtotal);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
    onClose();
  };

  const handlePrintWithTemplate = () => {
    if (!selectedTemplate) return;
    const html = buildTemplateHTML(order, client, settings, selectedTemplate, subtotal);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
    onClose();
  };

  const handleClose = () => {
    setStep("pick");
    setSelectedTemplate(null);
    onClose();
  };

  const dt = DOC_TYPES.find(d => d.id === docTypeFilter)!;

  return (
    <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, animation: "fadeIn 0.12s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, width: 600, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px #EBEBEB", animation: "cmdSlideIn 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EBEBEB", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {step === "pick" ? "هەڵبژاردنی داڕێژە" : `پێشبینین — ${selectedTemplate?.name}`}
            </div>
            <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 2 }}>
              {order.orderNumber} · {order.clientName}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step === "preview" && (
              <button onClick={() => setStep("pick")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #E9ECEF", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                <ChevronLeft size={13} /> گەڕانەوە
              </button>
            )}
            <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#F1F3F5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Step: Pick template */}
        {step === "pick" && (
          <>
            {/* Doc type tabs */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #EBEBEB", display: "flex", gap: 6 }}>
              {DOC_TYPES.map(d => (
                <button key={d.id} onClick={() => { setDocTypeFilter(d.id); setSelectedTemplate(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${docTypeFilter === d.id ? d.color : "#E9ECEF"}`, background: docTypeFilter === d.id ? d.bg : "white", color: docTypeFilter === d.id ? d.color : "#6C757D", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s" }}>
                  {d.icon} {d.label}
                </button>
              ))}
            </div>

            {/* Template list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Quick Print (no template) */}
              <div onClick={handleQuickPrint} style={{ padding: "14px 20px", borderBottom: "1px solid #F5F5F5", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "background 0.08s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FA")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D", flexShrink: 0 }}>
                  <Printer size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>چاپی خێرا (بێ داڕێژە)</div>
                  <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>شێوازی ستانداردی سیستەم</div>
                </div>
                <ChevronLeft size={14} color="#A3A3A3" />
              </div>

              {/* Saved templates */}
              {templatesForType.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <LayoutTemplate size={32} style={{ margin: "0 auto 10px", display: "block", color: "#DEE2E6" }} />
                  <div style={{ fontSize: 13, color: "#A3A3A3", marginBottom: 12 }}>
                    هیچ داڕێژەیەکی {dt.label} نییە
                  </div>
                  <button onClick={() => { handleClose(); router.push("/dashboard/invoices"); }}
                    style={{ padding: "8px 18px", borderRadius: 8, background: dt.color, color: "white", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    داڕێژە دروست بکە
                  </button>
                </div>
              ) : (
                <div style={{ padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", padding: "6px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>داڕێژەکانی پاشەکەوتکراو</div>
                  {templatesForType.map(t => (
                    <div key={t.id} onClick={() => handleSelectTemplate(t)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 3, border: "1px solid transparent", transition: "all 0.08s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = dt.bg; (e.currentTarget as HTMLElement).style.borderColor = dt.color + "40"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: dt.bg, display: "flex", alignItems: "center", justifyContent: "center", color: dt.color, flexShrink: 0 }}>
                        {dt.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>
                          {t.blocks.filter(b => b.visible).length} بلۆک
                          {t.defaultDiscount > 0 && ` · داشکاندن ${t.defaultDiscount}٪`}
                          {t.showBonusCol && " · بۆنەس"}
                          · {t.createdAt}
                        </div>
                      </div>
                      <ChevronLeft size={14} color={dt.color} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer link to manage templates */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #EBEBEB", background: "#FAFAFA", display: "flex", justifyContent: "center" }}>
              <button onClick={() => { handleClose(); router.push("/dashboard/invoices"); }}
                style={{ fontSize: 12, color: "#4263EB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                <LayoutTemplate size={13} /> بەڕێوەبردنی داڕێژەکان
              </button>
            </div>
          </>
        )}

        {/* Step: Preview + print */}
        {step === "preview" && selectedTemplate && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {/* Mini preview */}
              <div style={{ background: "#F8F9FA", borderRadius: 12, padding: 20, border: "1px solid #E9ECEF", fontSize: 12, direction: "rtl", fontFamily: "inherit" }}>
                {/* Header preview */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #4263EB" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{settings.name || "دەوا فارما"}</div>
                    <div style={{ fontSize: 10, color: "#6C757D" }}>{settings.phone}</div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 900, fontSize: 20, color: DOC_TYPES.find(d => d.id === selectedTemplate.docType)?.color }}>
                      {DOC_TYPES.find(d => d.id === selectedTemplate.docType)?.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#6C757D" }}>{order.orderNumber} · {order.createdAt}</div>
                  </div>
                </div>
                {/* Client */}
                <div style={{ marginBottom: 14, padding: 10, background: "white", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: "#A3A3A3", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>کڕیار</div>
                  <div style={{ fontWeight: 700 }}>{order.clientName}</div>
                  {client && <div style={{ fontSize: 11, color: "#6C757D" }}>{client.phone} — {client.city}</div>}
                </div>
                {/* Items count */}
                <div style={{ padding: "10px 14px", background: "white", borderRadius: 8, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6C757D" }}>{order.items.length} بەرهەم</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#4263EB" }}>{formatIQD(subtotal)}</span>
                </div>
                {/* Blocks used */}
                <div style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 700, marginBottom: 6 }}>بلۆکەکانی داڕێژە:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedTemplate.blocks.filter(b => b.visible).map(b => (
                    <span key={b.id} style={{ padding: "3px 8px", borderRadius: 5, background: "#EDF2FF", color: "#4263EB", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                      <Check size={8} /> {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Print button */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #EBEBEB", background: "white", display: "flex", gap: 10 }}>
              <button onClick={handlePrintWithTemplate} style={{ flex: 1, padding: "11px 20px", borderRadius: 10, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(66,99,235,0.3)" }}>
                <Printer size={16} /> چاپکردن بەم داڕێژەیە
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Build HTML for template-based print ──
function buildTemplateHTML(
  order: Order, client: { name: string; phone: string; city: string } | undefined,
  settings: { name: string; nameEn: string; phone: string; email: string; address: string },
  t: InvoiceTemplate, subtotal: number
): string {
  const docLabel = { invoice: "پسووڵە", receipt: "وەسڵ", delivery: "وەرقەی گەیاندن", quote: "نرخنامە" }[t.docType];
  const disc = subtotal * (t.defaultDiscount / 100);
  const total = subtotal - disc;
  const sc = order.status === "PAID" ? "inv-status-paid" : "inv-status-pending";
  const stL: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
  const parts: string[] = [];

  for (const b of t.blocks.filter(b => b.visible)) {
    if (b.id === "header") parts.push(`<div class="inv-header"><div class="inv-logo-wrap"><div class="inv-logo-fallback">د</div><div><div class="inv-company-name">${settings.name}</div><div class="inv-company-name-en">${settings.nameEn}</div><div class="inv-company-contact">${settings.phone} | ${settings.email}</div></div></div><div class="inv-title-block"><div class="inv-title">${docLabel}</div><div class="inv-meta"><strong>ژمارە:</strong> ${order.orderNumber}</div><div class="inv-meta"><strong>بەروار:</strong> ${order.createdAt}</div><div class="inv-meta"><strong>بارودۆخ:</strong> <span class="inv-status ${sc}">${stL[order.status]}</span></div></div></div>`);
    else if (b.id === "parties") parts.push(`<div class="inv-parties"><div class="inv-party"><div class="inv-party-label">کڕیار</div><div class="inv-party-name">${order.clientName}</div>${client ? `<div class="inv-party-detail">${client.phone} — ${client.city}</div>` : ""}</div><div class="inv-party"><div class="inv-party-label">نوێنەر</div><div class="inv-party-name">${order.repName}</div></div>${order.warehouseName ? `<div class="inv-party"><div class="inv-party-label">کۆگا</div><div class="inv-party-name">${order.warehouseName}</div></div>` : ""}</div>`);
    else if (b.id === "items") {
      const rows = order.items.map((it, i) => `<tr><td style="color:#ADB5BD">${i + 1}</td><td style="font-weight:600">${it.productName}</td><td>${it.quantity}</td>${t.showBonusCol ? `<td style="color:#40C057;font-weight:700">+${it.bonusQty}</td>` : ""}<td>${formatIQD(it.unitPrice)}</td><td style="font-weight:800">${formatIQD(it.quantity * it.unitPrice)}</td></tr>`).join("");
      parts.push(`<table class="inv-table"><thead><tr><th>#</th><th>بەرهەم</th><th>بڕ</th>${t.showBonusCol ? "<th>بۆنەس</th>" : ""}<th>نرخی یەکە</th><th>کۆ</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    else if (b.id === "summary") parts.push(`<div class="inv-summary"><div class="inv-summary-box"><div class="inv-summary-row"><span>کۆی نرخ</span><span>${formatIQD(subtotal)}</span></div>${t.defaultDiscount > 0 ? `<div class="inv-summary-row"><span>داشکاندن (${t.defaultDiscount}٪)</span><span style="color:#FA5252">-${formatIQD(disc)}</span></div>` : ""}<div class="inv-summary-row inv-summary-total"><span class="inv-summary-label">کۆی گشتی</span><span class="inv-summary-value">${formatIQD(total)}</span></div></div></div>`);
    else if (b.id === "bonus" && order.totalBonusPct > 0) parts.push(`<div class="inv-bonus-info"><div style="font-size:11px;font-weight:700;color:#7C5CFC;margin-bottom:4px">شیکاری بۆنەس</div><div style="font-size:12px;color:#6C757D">بۆنەسی گشتی: ${order.totalBonusPct}٪ | کۆگا: ${order.warehouseBonusPct}٪ | نوێنەر: ${order.repBonusPct}٪</div></div>`);
    else if (b.id === "note" && (t.defaultNote || order.notes)) parts.push(`<div class="inv-note"><div style="font-size:11px;font-weight:700;color:#E67700;margin-bottom:4px">تێبینی</div><div style="font-size:12px">${t.defaultNote || order.notes}</div></div>`);
    else if (b.id === "terms" && t.defaultTerms) parts.push(`<div class="inv-terms"><div style="font-size:11px;font-weight:700;color:#2E7D32;margin-bottom:4px">مەرجەکان</div><div style="font-size:12px">${t.defaultTerms}</div></div>`);
    else if (b.id === "signature") parts.push(`<div class="inv-signature"><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی فرۆشیار</div></div><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی کڕیار</div></div></div>`);
    else if (b.id === "footer") parts.push(`<div class="inv-footer"><p style="font-size:13px;color:#868E96;font-weight:600">سوپاس — ${settings.name}</p><p style="font-size:11px;color:#CED4DA;margin-top:4px">${settings.phone} | ${settings.email} | ${settings.address}</p></div>`);
    else if (b.type === "custom" && b.customText) parts.push(`<div class="inv-custom"><div style="font-size:11px;font-weight:700;color:#495057;margin-bottom:4px">${b.label}</div><div class="inv-custom-text">${(b.customText || "").replace(/\n/g, "<br/>")}</div></div>`);
  }

  const CSS = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;color:#1A1A2E;background:#fff}.inv-page{max-width:800px;margin:0 auto;padding:32px}.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #4263EB}.inv-logo-wrap{display:flex;align-items:center;gap:14px}.inv-logo-fallback{width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,#F47B35,#FF9A5C);display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:800}.inv-company-name{font-size:22px;font-weight:800}.inv-company-name-en{font-size:12px;color:#6C757D;margin-top:2px}.inv-company-contact{font-size:11px;color:#868E96;margin-top:4px}.inv-title-block{text-align:left}.inv-title{font-size:32px;font-weight:900;background:linear-gradient(135deg,#4263EB,#7C5CFC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}.inv-meta{font-size:12px;color:#495057;margin-bottom:3px}.inv-meta strong{color:#1A1A2E}.inv-status{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700}.inv-status-paid{background:#D3F9D8;color:#2B8A3E}.inv-status-pending{background:#FFF3BF;color:#E67700}.inv-parties{display:flex;gap:20px;margin-bottom:24px}.inv-party{flex:1;background:#F8F9FA;border-radius:10px;padding:16px;border:1px solid #E9ECEF}.inv-party-label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#ADB5BD;font-weight:700;margin-bottom:6px}.inv-party-name{font-size:15px;font-weight:700}.inv-party-detail{font-size:11px;color:#6C757D;margin-top:3px}.inv-table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden}.inv-table thead tr{background:linear-gradient(135deg,#1A1A2E,#2D2B55)}.inv-table thead th{padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white}.inv-table tbody td{padding:11px 16px;font-size:13px;border-bottom:1px solid #F1F3F5}.inv-table tbody tr:nth-child(even){background:#FAFBFC}.inv-summary{display:flex;justify-content:flex-start;margin-bottom:20px}.inv-summary-box{width:320px;border:1px solid #E9ECEF;border-radius:10px;overflow:hidden}.inv-summary-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;border-bottom:1px solid #F1F3F5}.inv-summary-total{background:linear-gradient(135deg,#4263EB,#7C5CFC)}.inv-summary-total .inv-summary-label,.inv-summary-total .inv-summary-value{color:white;font-size:16px;font-weight:800}.inv-bonus-info{padding:14px 16px;background:#F3F0FF;border-radius:10px;margin-bottom:16px;border:1px solid #E8E0FF}.inv-note{padding:14px 16px;background:#FFF8DB;border-radius:10px;margin-bottom:16px;border:1px solid #FFE066}.inv-terms{padding:14px 16px;background:#E8F5E9;border-radius:10px;margin-bottom:16px;border:1px solid #A5D6A7}.inv-custom{padding:14px 16px;background:#F1F3F5;border-radius:10px;margin-bottom:16px;border:1px solid #DEE2E6}.inv-custom-text{font-size:12px;color:#495057;white-space:pre-line}.inv-signature{display:flex;justify-content:space-between;margin-bottom:20px;padding:16px 0}.inv-sig-box{text-align:center;flex:1}.inv-sig-line{width:140px;border-bottom:1px solid #ADB5BD;margin:30px auto 8px}.inv-sig-label{font-size:11px;color:#6C757D}.inv-footer{border-top:2px solid #E9ECEF;padding-top:16px;margin-top:24px;text-align:center}@media print{.inv-table thead tr,.inv-summary-total,.inv-bonus-info,.inv-note,.inv-party,.inv-terms,.inv-custom{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

  return `<html dir="rtl" lang="ckb"><head><title>${docLabel} — ${order.orderNumber}</title><style>${CSS}</style></head><body><div class="inv-page">${parts.join("")}</div></body></html>`;
}

// ── Quick print (no template) ──
function buildQuickPrintHTML(
  order: Order, client: { name: string; phone: string; city: string } | undefined,
  settings: { name: string; nameEn: string; phone: string; email: string; address: string },
  docType: DocType, subtotal: number
): string {
  const docLabel = { invoice: "پسووڵە", receipt: "وەسڵ", delivery: "وەرقەی گەیاندن", quote: "نرخنامە" }[docType];
  const stL: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
  const rows = order.items.map((it, i) => `<tr><td style="color:#ADB5BD">${i + 1}</td><td style="font-weight:600">${it.productName}</td><td>${it.quantity}</td><td style="color:#40C057;font-weight:700">+${it.bonusQty}</td><td>${formatIQD(it.unitPrice)}</td><td style="font-weight:800">${formatIQD(it.quantity * it.unitPrice)}</td></tr>`).join("");
  const sc = order.status === "PAID" ? "#D3F9D8;color:#2B8A3E" : "#FFF3BF;color:#E67700";
  const body = `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #4263EB">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,#F47B35,#FF9A5C);display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:800">د</div>
    <div><div style="font-size:22px;font-weight:800">${settings.name || "دەوا فارما"}</div><div style="font-size:12px;color:#6C757D">${settings.nameEn}</div><div style="font-size:11px;color:#868E96;margin-top:4px">${settings.phone} | ${settings.email}</div></div>
  </div>
  <div style="text-align:left"><div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,#4263EB,#7C5CFC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">${docLabel}</div><div style="font-size:12px;color:#495057;margin-bottom:3px"><strong>ژمارە:</strong> ${order.orderNumber}</div><div style="font-size:12px;color:#495057;margin-bottom:3px"><strong>بەروار:</strong> ${order.createdAt}</div><div style="font-size:12px"><strong>بارودۆخ:</strong> <span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${sc}">${stL[order.status]}</span></div></div>
</div>
<div style="display:flex;gap:20px;margin-bottom:24px">
  <div style="flex:1;background:#F8F9FA;border-radius:10px;padding:16px;border:1px solid #E9ECEF"><div style="font-size:10px;text-transform:uppercase;color:#ADB5BD;font-weight:700;margin-bottom:6px">کڕیار</div><div style="font-size:15px;font-weight:700">${order.clientName}</div>${client ? `<div style="font-size:11px;color:#6C757D;margin-top:3px">${client.phone} — ${client.city}</div>` : ""}</div>
  <div style="flex:1;background:#F8F9FA;border-radius:10px;padding:16px;border:1px solid #E9ECEF"><div style="font-size:10px;text-transform:uppercase;color:#ADB5BD;font-weight:700;margin-bottom:6px">نوێنەر</div><div style="font-size:15px;font-weight:700">${order.repName}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden"><thead><tr style="background:linear-gradient(135deg,#1A1A2E,#2D2B55)"><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">#</th><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">بەرهەم</th><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">بڕ</th><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">بۆنەس</th><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">نرخی یەکە</th><th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white">کۆ</th></tr></thead><tbody>${rows}</tbody></table>
<div style="display:flex;justify-content:flex-start;margin-bottom:20px"><div style="width:320px;border:1px solid #E9ECEF;border-radius:10px;overflow:hidden"><div style="display:flex;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg,#4263EB,#7C5CFC)"><span style="color:white;font-size:16px;font-weight:800">کۆی گشتی</span><span style="color:white;font-size:16px;font-weight:800">${formatIQD(order.totalAmount)}</span></div></div></div>
${order.notes ? `<div style="padding:14px 16px;background:#FFF8DB;border-radius:10px;margin-bottom:16px;border:1px solid #FFE066"><div style="font-size:11px;font-weight:700;color:#E67700;margin-bottom:4px">تێبینی</div><div style="font-size:12px">${order.notes}</div></div>` : ""}
<div style="border-top:2px solid #E9ECEF;padding-top:16px;margin-top:24px;text-align:center"><p style="font-size:13px;color:#868E96;font-weight:600">سوپاس بۆ هاوکارییەکەتان — ${settings.name || "دەوا"}</p><p style="font-size:11px;color:#CED4DA;margin-top:4px">${settings.phone} | ${settings.address}</p></div>`;

  const CSS = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;color:#1A1A2E;background:#fff;padding:40px}@media print{body{padding:20px}}`;
  return `<html dir="rtl" lang="ckb"><head><title>${docLabel} — ${order.orderNumber}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
