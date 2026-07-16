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
  const { invoiceTemplates, settings } = useData();
  const [docTypeFilter, setDocTypeFilter] = useState<DocType>("invoice");
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [step, setStep] = useState<"pick" | "preview">("pick");

  if (!open || !order) return null;

  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const templatesForType = invoiceTemplates.filter(t => t.docType === docTypeFilter);

  // ── Open the print page in a new tab ──────────────────────
  const openPrint = (templateId?: string) => {
    const url = templateId
      ? `/print/${order.id}?t=${templateId}&doc=${docTypeFilter}`
      : `/print/${order.id}?doc=${docTypeFilter}`;
    window.open(url, "_blank");
    onClose();
  };

  const handleSelectTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplate(t);
    setStep("preview");
  };

  const handleClose = () => {
    setStep("pick");
    setSelectedTemplate(null);
    onClose();
  };

  const dt = DOC_TYPES.find(d => d.id === docTypeFilter)!;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
        backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 500,
        animation: "fadeIn 0.12s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 20, width: 600, maxHeight: "88vh",
          overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 32px 64px rgba(0,0,0,0.18), 0 0 0 1px #EBEBEB",
          animation: "cmdSlideIn 0.15s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EBEBEB",
          display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
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
              <button
                onClick={() => setStep("pick")}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                  borderRadius:8, border:"1px solid #E9ECEF", background:"white",
                  fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"#6C757D",
                  transition:"transform 150ms ease-out",
                }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                <ChevronLeft size={13} /> گەڕانەوە
              </button>
            )}
            <button
              onClick={handleClose}
              style={{ width:32, height:32, borderRadius:8, border:"none",
                background:"#F1F3F5", cursor:"pointer", display:"flex",
                alignItems:"center", justifyContent:"center", color:"#6C757D",
                transition:"transform 150ms ease-out",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Step: Pick */}
        {step === "pick" && (
          <>
            {/* Doc type tabs */}
            <div style={{ padding:"12px 20px", borderBottom:"1px solid #EBEBEB", display:"flex", gap:6 }}>
              {DOC_TYPES.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDocTypeFilter(d.id); setSelectedTemplate(null); }}
                  style={{
                    display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                    borderRadius:8,
                    border: `1.5px solid ${docTypeFilter === d.id ? d.color : "#E9ECEF"}`,
                    background: docTypeFilter === d.id ? d.bg : "white",
                    color: docTypeFilter === d.id ? d.color : "#6C757D",
                    fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                    transition:"all 0.1s",
                  }}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>

            <div style={{ flex:1, overflowY:"auto" }}>
              {/* Quick Print */}
              <div
                onClick={() => openPrint()}
                style={{
                  padding:"14px 20px", borderBottom:"1px solid #F5F5F5", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12,
                  transition:"background 0.08s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FA")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
                onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = "scale(0.99)")}
                onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
              >
                <div style={{ width:38, height:38, borderRadius:10, background:"#F1F3F5",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#6C757D", flexShrink:0 }}>
                  <Printer size={16} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>چاپی خێرا (بێ داڕێژە)</div>
                  <div style={{ fontSize:11, color:"#A3A3A3", marginTop:1 }}>شێوازی ستانداردی سیستەم</div>
                </div>
                <ChevronLeft size={14} color="#A3A3A3" />
              </div>

              {/* Saved templates */}
              {templatesForType.length === 0 ? (
                <div style={{ padding:"32px 20px", textAlign:"center" }}>
                  <LayoutTemplate size={32} style={{ margin:"0 auto 10px", display:"block", color:"#DEE2E6" }} />
                  <div style={{ fontSize:13, color:"#A3A3A3", marginBottom:12 }}>
                    هیچ داڕێژەیەکی {dt.label} نییە
                  </div>
                  <button
                    onClick={() => { handleClose(); router.push("/dashboard/invoices"); }}
                    style={{ padding:"8px 18px", borderRadius:8, background:dt.color,
                      color:"white", fontSize:12, fontWeight:600, border:"none",
                      cursor:"pointer", fontFamily:"inherit" }}
                  >
                    داڕێژە دروست بکە
                  </button>
                </div>
              ) : (
                <div style={{ padding:"8px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#A3A3A3", padding:"6px 8px",
                    textTransform:"uppercase", letterSpacing:0.5 }}>
                    داڕێژەکانی پاشەکەوتکراو
                  </div>
                  {templatesForType.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      style={{
                        display:"flex", alignItems:"center", gap:12, padding:"11px 12px",
                        borderRadius:10, cursor:"pointer", marginBottom:3,
                        border:"1px solid transparent", transition:"all 0.08s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = dt.bg;
                        (e.currentTarget as HTMLElement).style.borderColor = dt.color + "40";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ width:38, height:38, borderRadius:10, background:dt.bg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:dt.color, flexShrink:0 }}>
                        {dt.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</div>
                        <div style={{ fontSize:11, color:"#A3A3A3", marginTop:1 }}>
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

            <div style={{ padding:"12px 20px", borderTop:"1px solid #EBEBEB", background:"#FAFAFA",
              display:"flex", justifyContent:"center" }}>
              <button
                onClick={() => { handleClose(); router.push("/dashboard/invoices"); }}
                style={{ fontSize:12, color:"#4263EB", fontWeight:600, background:"none",
                  border:"none", cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:5 }}
              >
                <LayoutTemplate size={13} /> بەڕێوەبردنی داڕێژەکان
              </button>
            </div>
          </>
        )}

        {/* Step: Preview */}
        {step === "preview" && selectedTemplate && (
          <>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
              {/* Mini card preview */}
              <div style={{ background:"#F8F9FA", borderRadius:12, padding:20,
                border:"1px solid #E9ECEF", fontSize:12, direction:"rtl", fontFamily:"inherit" }}>
                {/* Header mini */}
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14,
                  paddingBottom:10, borderBottom:`2px solid ${selectedTemplate.options.primaryColor}` }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{settings.name || "دەوا فارما"}</div>
                    <div style={{ fontSize:10, color:"#6C757D" }}>{settings.phone}</div>
                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontWeight:900, fontSize:18,
                      color: DOC_TYPES.find(d => d.id === selectedTemplate.docType)?.color }}>
                      {DOC_TYPES.find(d => d.id === selectedTemplate.docType)?.label}
                    </div>
                    <div style={{ fontSize:10, color:"#6C757D" }}>{order.orderNumber}</div>
                  </div>
                </div>
                {/* Client row */}
                <div style={{ marginBottom:12, padding:10, background:"white", borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#A3A3A3", fontWeight:700, marginBottom:3,
                    textTransform:"uppercase" }}>کڕیار</div>
                  <div style={{ fontWeight:700 }}>{order.clientName}</div>
                </div>
                {/* Items count */}
                <div style={{ padding:"8px 12px", background:"white", borderRadius:8, marginBottom:12,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:"#6C757D" }}>{order.items.length} بەرهەم</span>
                  <span style={{ fontWeight:800, fontSize:14,
                    color: selectedTemplate.options.primaryColor }}>
                    {formatIQD(subtotal)}
                  </span>
                </div>
                {/* Visible blocks */}
                <div style={{ fontSize:10, color:"#A3A3A3", fontWeight:700, marginBottom:6 }}>
                  بلۆکەکانی داڕێژە:
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {selectedTemplate.blocks.filter(b => b.visible).map(b => (
                    <span key={b.id} style={{
                      padding:"3px 8px", borderRadius:5,
                      background: selectedTemplate.options.primaryColor + "18",
                      color: selectedTemplate.options.primaryColor,
                      fontSize:10, fontWeight:600,
                      display:"flex", alignItems:"center", gap:3,
                    }}>
                      <Check size={8} /> {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding:"14px 20px", borderTop:"1px solid #EBEBEB",
              background:"white", display:"flex", gap:10 }}>
              <button
                onClick={() => openPrint(selectedTemplate.id)}
                style={{
                  flex:1, padding:"11px 20px", borderRadius:10,
                  background: `linear-gradient(135deg, ${selectedTemplate.options.primaryColor}, #7C5CFC)`,
                  color:"white", fontSize:14, fontWeight:700, border:"none", cursor:"pointer",
                  fontFamily:"inherit", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8,
                  boxShadow:`0 4px 14px ${selectedTemplate.options.primaryColor}40`,
                  transition:"transform 150ms ease-out, opacity 150ms ease-out",
                }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Printer size={16} /> چاپکردن بەم داڕێژەیە
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
