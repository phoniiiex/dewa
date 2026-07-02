"use client";
import { useState, useEffect, ReactNode } from "react";
import {
  FileText, Printer, Eye, EyeOff, GripVertical, QrCode,
  Type, Users as UsersIcon, Table, Calculator, Gift,
  StickyNote, Image as ImageIcon, MessageSquare, Plus,
  Trash2, Save, X, Receipt, FileCheck, LayoutTemplate,
  Edit3, Copy,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { InvoiceBlockConfig, InvoiceTemplate } from "@/lib/types";

// ── Doc types ──
type DocType = InvoiceTemplate["docType"];

const DOC_TYPES: { id: DocType; label: string; color: string; bg: string; icon: ReactNode }[] = [
  { id: "invoice",  label: "پسووڵە",         color: "#4263EB", bg: "#EBF1FF", icon: <FileText size={14} /> },
  { id: "receipt",  label: "وەسڵ",           color: "#2B8A3E", bg: "#E3F7EC", icon: <Receipt size={14} /> },
  { id: "delivery", label: "وەرقەی گەیاندن", color: "#F47B35", bg: "#FFF3E0", icon: <FileCheck size={14} /> },
  { id: "quote",    label: "نرخنامە",         color: "#7C3AED", bg: "#F3EBFF", icon: <FileText size={14} /> },
];

const DOC_LABEL: Record<DocType, string> = {
  invoice: "پسووڵە", receipt: "وەسڵ", delivery: "وەرقەی گەیاندن", quote: "نرخنامە",
};

// ── Block definitions ──
const BLOCK_ICONS: Record<string, ReactNode> = {
  header: <Type size={14} />, parties: <UsersIcon size={14} />, items: <Table size={14} />,
  summary: <Calculator size={14} />, bonus: <Gift size={14} />, note: <StickyNote size={14} />,
  terms: <MessageSquare size={14} />, qr: <QrCode size={14} />, signature: <ImageIcon size={14} />,
  footer: <Type size={14} />, custom: <StickyNote size={14} />,
};

const DEFAULT_BLOCKS: InvoiceBlockConfig[] = [
  { id: "header",    label: "سەرپەڕە",           visible: true,  required: true,  type: "builtin" },
  { id: "parties",   label: "کڕیار و نوێنەر",    visible: true,  type: "builtin" },
  { id: "items",     label: "خشتەی بەرهەمەکان", visible: true,  required: true,  type: "builtin" },
  { id: "summary",   label: "کۆی گشتی",          visible: true,  required: true,  type: "builtin" },
  { id: "bonus",     label: "شیکاری بۆنەس",       visible: true,  type: "builtin" },
  { id: "note",      label: "تێبینی",             visible: false, type: "builtin" },
  { id: "terms",     label: "مەرجەکان",           visible: false, type: "builtin" },
  { id: "qr",        label: "QR کۆد",             visible: true,  type: "builtin" },
  { id: "signature", label: "واژوو",              visible: false, type: "builtin" },
  { id: "footer",    label: "پێپەڕە",             visible: true,  type: "builtin" },
];

// ── FALLBACK (no real orders yet) ──
const FALLBACK_ORDER = {
  orderNumber: "ORD-001",
  clientName: "دەرمانخانەی هەوار",
  repName: "ئەحمەد کەریم",
  warehouseName: "کۆگای سەنتەر",
  status: "PAID",
  createdAt: new Date().toISOString().split("T")[0],
  totalBonusPct: 5, warehouseBonusPct: 3, repBonusPct: 2,
  totalAmount: 1_250_000, notes: "تێبینیەک بۆ داواکاری",
  items: [
    { productName: "پاراسیتامۆل ٥٠٠mg", quantity: 24, bonusQty: 2, unitPrice: 15000 },
    { productName: "ئامۆکسیسیلین ٢٥٠mg", quantity: 12, bonusQty: 1, unitPrice: 22000 },
  ],
};
const FALLBACK_CLIENT = { name: "دەرمانخانەی هەوار", phone: "0750 123 4567", city: "سلێمانی", type: "PHARMACY" };

export default function TemplatesPage() {
  const { invoiceTemplates, addTemplate, deleteTemplate, settings, showToast, orders, clients } = useData();

  // Use most recent real order for preview, fall back to static dummy
  const latestOrder = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const previewOrder = latestOrder ? {
    orderNumber:       latestOrder.orderNumber,
    clientName:        latestOrder.clientName,
    repName:           latestOrder.repName,
    warehouseName:     latestOrder.warehouseName || "دەرباز بێ کۆگا",
    status:            latestOrder.status,
    createdAt:         latestOrder.createdAt?.split("T")[0] ?? "",
    totalBonusPct:     latestOrder.items.reduce((s, i) => s + i.bonusPct, 0) / Math.max(latestOrder.items.length, 1),
    warehouseBonusPct: 0,
    repBonusPct:       0,
    totalAmount:       latestOrder.totalAmount,
    notes:             latestOrder.notes,
    items:             latestOrder.items.map(i => ({ productName: i.productName, quantity: i.quantity, bonusQty: i.bonusQty, unitPrice: i.unitPrice })),
  } : FALLBACK_ORDER;
  const latestClient = latestOrder ? clients.find(c => c.id === latestOrder.clientId) : null;
  const previewClient = latestClient ? {
    name: latestClient.name, phone: latestClient.phone, city: latestClient.city, type: latestClient.type,
  } : FALLBACK_CLIENT;

  // Left panel state
  const [filterType, setFilterType] = useState<DocType | "all">("all");
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);

  // Editor state
  const [editorDocType, setEditorDocType] = useState<DocType>("invoice");
  const [editorName, setEditorName] = useState("");
  const [blocks, setBlocks] = useState<InvoiceBlockConfig[]>(DEFAULT_BLOCKS);
  const [showBonusCol, setShowBonusCol] = useState(true);
  const [customNote, setCustomNote] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [customDiscount, setCustomDiscount] = useState(0);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [customBlockLabel, setCustomBlockLabel] = useState("");
  const [customBlockText, setCustomBlockText] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);

  const filteredTemplates = filterType === "all"
    ? invoiceTemplates
    : invoiceTemplates.filter(t => t.docType === filterType);

  // ── Open new template editor ──
  const openNew = (docType: DocType = "invoice") => {
    setIsNew(true);
    setEditingTemplate(null);
    setEditorDocType(docType);
    setEditorName("");
    setBlocks(DEFAULT_BLOCKS);
    setShowBonusCol(true);
    setCustomNote("");
    setCustomTerms("");
    setCustomDiscount(0);
    setIsEditorOpen(true);
  };

  // ── Open existing template ──
  const openEdit = (t: InvoiceTemplate) => {
    setIsNew(false);
    setEditingTemplate(t);
    setEditorDocType(t.docType);
    setEditorName(t.name);
    setBlocks(t.blocks);
    setShowBonusCol(t.showBonusCol);
    setCustomNote(t.defaultNote);
    setCustomTerms(t.defaultTerms);
    setCustomDiscount(t.defaultDiscount);
    setIsEditorOpen(true);
  };

  // ── Duplicate ──
  const duplicateTemplate = (t: InvoiceTemplate) => {
    addTemplate({ ...t, name: `${t.name} (کۆپی)` });
    showToast("داڕێژە کۆپی کرا");
  };

  // ── Save ──
  const saveTemplate = () => {
    if (!editorName.trim()) { showToast("ناوی داڕێژە بنووسە", "error"); return; }
    addTemplate({ name: editorName, docType: editorDocType, blocks, showBonusCol, defaultNote: customNote, defaultTerms: customTerms, defaultDiscount: customDiscount });
    showToast(`داڕێژەی "${editorName}" پاشەکەوت کرا`);
    setIsEditorOpen(false);
  };

  // ── Block drag ──
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const updated = [...blocks]; const [moved] = updated.splice(dragIdx, 1); updated.splice(targetIdx, 0, moved);
    setBlocks(updated); setDragIdx(null); setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const toggleBlock = (id: string) => setBlocks(prev => prev.map(b => b.id === id && !b.required ? { ...b, visible: !b.visible } : b));
  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));

  const addCustomBlock = () => {
    if (!customBlockLabel.trim()) return;
    setBlocks(prev => [...prev.slice(0, -1), { id: `custom_${Date.now()}`, label: customBlockLabel, visible: true, type: "custom", customText: customBlockText }, ...prev.slice(-1)]);
    setCustomBlockLabel(""); setCustomBlockText(""); setShowAddBlock(false);
  };

  // ── Print preview of a template ──
  const previewPrint = (t: InvoiceTemplate) => {
    const html = buildPreviewHTML(t, settings, previewOrder, previewClient);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  const visibleBlocks = blocks.filter(b => b.visible);
  const subtotal = previewOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = subtotal * (customDiscount / 100);
  const finalTotal = subtotal - discountAmt;

  // ── Shared styles ──
  const iS: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const btnP: React.CSSProperties = { padding: "8px 20px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 };

  return (
    <>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EBF1FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}>
            <LayoutTemplate size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>داڕێژەی چاپ</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی داڕێژەی پسووڵە، وەسڵ، گەیاندن و نرخنامە</p>
          </div>
        </div>
        <button onClick={() => openNew()} style={btnP}>
          <Plus size={14} /> داڕێژەی نوێ
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: isEditorOpen ? "300px 1fr" : "1fr", gap: 20, alignItems: "start" }}>

        {/* ── TEMPLATE LIBRARY ── */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #E9ECEF", overflow: "hidden" }}>
          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: 2, padding: "10px 12px", borderBottom: "1px solid #E9ECEF", flexWrap: "wrap" }}>
            <button onClick={() => setFilterType("all")} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: filterType === "all" ? "#1A1A2E" : "#F1F3F5", color: filterType === "all" ? "white" : "#6C757D" }}>
              هەموو ({invoiceTemplates.length})
            </button>
            {DOC_TYPES.map(dt => (
              <button key={dt.id} onClick={() => setFilterType(dt.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, background: filterType === dt.id ? dt.color : "#F1F3F5", color: filterType === dt.id ? "white" : "#6C757D" }}>
                {dt.icon} {dt.label} ({invoiceTemplates.filter(t => t.docType === dt.id).length})
              </button>
            ))}
          </div>

          {/* Template list */}
          <div style={{ maxHeight: isEditorOpen ? "calc(100vh - 260px)" : "auto", overflowY: "auto" }}>
            {filteredTemplates.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#ADB5BD" }}>
                <LayoutTemplate size={32} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>هیچ داڕێژەیەک نییە</div>
                <button onClick={() => openNew(filterType === "all" ? "invoice" : filterType)} style={{ ...btnP, margin: "12px auto 0", fontSize: 11 }}>
                  <Plus size={12} /> داڕێژەی نوێ
                </button>
              </div>
            ) : (
              <>
                {/* Group by type */}
                {(filterType === "all" ? DOC_TYPES : DOC_TYPES.filter(d => d.id === filterType)).map(dt => {
                  const group = filteredTemplates.filter(t => t.docType === dt.id);
                  if (group.length === 0) return null;
                  return (
                    <div key={dt.id}>
                      {filterType === "all" && (
                        <div style={{ padding: "6px 16px", background: dt.bg, fontSize: 10, fontWeight: 700, color: dt.color, display: "flex", alignItems: "center", gap: 5, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          {dt.icon} {dt.label}
                        </div>
                      )}
                      {group.map(t => (
                        <div key={t.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F1F3F5", cursor: "pointer", background: editingTemplate?.id === t.id ? "#EDF2FF" : "white", borderRight: editingTemplate?.id === t.id ? "3px solid #4263EB" : "3px solid transparent", transition: "all 0.15s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }} onClick={() => openEdit(t)}>
                              <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: DOC_TYPES.find(d => d.id === t.docType)?.bg, color: DOC_TYPES.find(d => d.id === t.docType)?.color }}>
                                  {DOC_LABEL[t.docType]}
                                </span>
                                <span style={{ fontSize: 10, color: "#ADB5BD" }}>{t.blocks.filter(b => b.visible).length} بلۆک</span>
                                <span style={{ fontSize: 10, color: "#ADB5BD" }}>· {t.createdAt}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                              <button onClick={() => previewPrint(t)} title="چاپکردن" style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#E3F7EC", color: "#2B8A3E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Printer size={12} /></button>
                              <button onClick={() => duplicateTemplate(t)} title="کۆپی" style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#EDF2FF", color: "#4263EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Copy size={12} /></button>
                              <button onClick={() => { if (confirm("دەتەوێت بیسڕیتەوە؟")) deleteTemplate(t.id); }} title="سڕینەوە" style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#FFE3E3", color: "#FA5252", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── TEMPLATE EDITOR + PREVIEW ── */}
        {isEditorOpen && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>

            {/* Editor panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Editor header */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{isNew ? "داڕێژەی نوێ" : "دەستکاریکردن"}</div>
                  <button onClick={() => setIsEditorOpen(false)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#F1F3F5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}><X size={12} /></button>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>ناوی داڕێژە</label>
                  <input value={editorName} onChange={e => setEditorName(e.target.value)} placeholder="ناوی داڕێژە..." style={iS} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>جۆری ڕێکەوت</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {DOC_TYPES.map(dt => (
                      <button key={dt.id} onClick={() => setEditorDocType(dt.id)} style={{ padding: "6px 8px", borderRadius: 7, border: `1.5px solid ${editorDocType === dt.id ? dt.color : "#E9ECEF"}`, background: editorDocType === dt.id ? dt.bg : "white", color: editorDocType === dt.id ? dt.color : "#6C757D", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                        {dt.icon} {dt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={saveTemplate} style={{ ...btnP, width: "100%", justifyContent: "center" }}>
                  <Save size={13} /> پاشەکەوتکردن
                </button>
              </div>

              {/* Blocks */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>بلۆکەکان</span>
                  <button onClick={() => setShowAddBlock(!showAddBlock)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "#4263EB", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={11} /></button>
                </div>

                {showAddBlock && (() => {
                  const deletedBuiltins = DEFAULT_BLOCKS.filter(db => !db.required && !blocks.find(b => b.id === db.id));
                  return (
                    <div style={{ padding: 10, borderBottom: "1px solid #E9ECEF", background: "#F8F9FA" }}>
                      {deletedBuiltins.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#6C757D", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>بلۆکی سڕاوەکان</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {deletedBuiltins.map(db => (
                              <button key={db.id} onClick={() => setBlocks(prev => [...prev, { ...db, visible: true }])} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #D0BFFF", background: "#F3F0FF", color: "#7C5CFC", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                                {BLOCK_ICONS[db.id]} {db.label} <Plus size={9} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#6C757D", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>بلۆکی تایبەت</div>
                      <input placeholder="ناو..." value={customBlockLabel} onChange={e => setCustomBlockLabel(e.target.value)} style={{ ...iS, marginBottom: 4, fontSize: 11 }} />
                      <textarea placeholder="ناوەڕۆک..." value={customBlockText} onChange={e => setCustomBlockText(e.target.value)} rows={2} style={{ ...iS, resize: "vertical", marginBottom: 4, fontSize: 11 }} />
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={addCustomBlock} style={{ ...btnP, flex: 1, fontSize: 10, padding: "5px 8px", justifyContent: "center" }}><Plus size={10} /> زیادکردن</button>
                        <button onClick={() => setShowAddBlock(false)} style={{ ...btnP, flex: 1, fontSize: 10, padding: "5px 8px", justifyContent: "center", background: "#6C757D" }}>پاشگەزبوونەوە</button>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ padding: 6 }}>
                  {blocks.map((block, idx) => (
                    <div key={block.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 7px", borderRadius: 7, marginBottom: 2, cursor: "grab", fontSize: 11, background: dragOverIdx === idx ? "#EDF2FF" : dragIdx === idx ? "#F8F9FA" : "transparent", border: dragOverIdx === idx ? "1px dashed #4263EB" : "1px solid transparent", opacity: block.visible ? 1 : 0.4, transition: "all 0.12s" }}>
                      <GripVertical size={11} color="#CED4DA" style={{ flexShrink: 0 }} />
                      <span style={{ color: "#6C757D", flexShrink: 0 }}>{BLOCK_ICONS[block.type === "custom" ? "custom" : block.id]}</span>
                      <span style={{ flex: 1, fontWeight: 600, color: "#495057", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{block.label}</span>
                      <button onClick={() => toggleBlock(block.id)} disabled={block.required} style={{ width: 18, height: 18, borderRadius: 4, border: "none", cursor: block.required ? "default" : "pointer", background: block.visible ? "#4263EB" : "#E9ECEF", color: block.visible ? "white" : "#ADB5BD", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {block.visible ? <Eye size={9} /> : <EyeOff size={9} />}
                      </button>
                      {!block.required && <button onClick={() => removeBlock(block.id)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", cursor: "pointer", background: "#FFE3E3", color: "#FA5252", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={9} /></button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>ڕێکخستنەکان</div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>داشکاندن (٪)</label>
                  <input type="number" min="0" max="100" value={customDiscount} onChange={e => setCustomDiscount(Number(e.target.value))} style={iS} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>تێبینی پێش‌گەراو</label>
                  <textarea value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="تێبینی..." rows={2} style={{ ...iS, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>مەرجەکانی پارەدان</label>
                  <textarea value={customTerms} onChange={e => setCustomTerms(e.target.value)} placeholder="مەرجەکان..." rows={2} style={{ ...iS, resize: "vertical" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#6C757D", cursor: "pointer" }}>
                  <input type="checkbox" checked={showBonusCol} onChange={e => setShowBonusCol(e.target.checked)} style={{ width: 13, height: 13 }} />
                  ستوونی بۆنەس
                </label>
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D" }}>پێشبینینی داڕێژە (نموونە)</div>
                <button onClick={saveTemplate} style={{ ...btnP, fontSize: 12 }}>
                  <Save size={14} /> پاشەکەوت
                </button>
              </div>
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 40, minHeight: 500, fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
                {renderPreview({ blocks: visibleBlocks, showBonusCol, customNote, customTerms, customDiscount, discountAmt, finalTotal, subtotal, editorDocType, settings, previewOrder, previewClient })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Inline preview renderer ──
function renderPreview({ blocks, showBonusCol, customNote, customTerms, customDiscount, discountAmt, finalTotal, subtotal, editorDocType, settings, previewOrder, previewClient }: {
  blocks: InvoiceBlockConfig[]; showBonusCol: boolean; customNote: string; customTerms: string;
  customDiscount: number; discountAmt: number; finalTotal: number; subtotal: number;
  editorDocType: string; settings: { name: string; nameEn: string; phone: string; email: string; address: string; logo?: string };
  previewOrder: { orderNumber: string; clientName: string; repName: string; warehouseName: string; totalAmount: number; notes?: string | null; items: { productName: string; quantity: number; bonusQty: number; unitPrice: number }[] };
  previewClient: { name: string; phone: string; city: string; type: string };
}) {
  const docLabel = DOC_LABEL[editorDocType as InvoiceTemplate["docType"]] || "ڕێکەوت";
  return (
    <>
      {blocks.map(block => {
        if (block.id === "header") return (
          <div key="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "3px solid #4263EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 800 }}>د</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{settings.name || "دەوا فارما"}</div>
                <div style={{ fontSize: 11, color: "#6C757D" }}>{settings.nameEn}</div>
                <div style={{ fontSize: 10, color: "#868E96", marginTop: 2 }}>{settings.phone}</div>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 26, fontWeight: 900, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>{docLabel}</div>
              <div style={{ fontSize: 11, color: "#495057" }}><strong>ژمارە:</strong> ORD-001</div>
              <div style={{ fontSize: 11, color: "#495057" }}><strong>بەروار:</strong> {new Date().toISOString().split("T")[0]}</div>
            </div>
          </div>
        );
        if (block.id === "parties") return (
          <div key="parties" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {[
              { label: "کڕیار", val: previewClient.name, sub: `${previewClient.phone} — ${previewClient.city}` },
              { label: "نوێنەر", val: previewOrder.repName, sub: "" },
              { label: "کۆگا", val: previewOrder.warehouseName, sub: "" },
            ].map(p => (
              <div key={p.label} style={{ flex: 1, background: "#F8F9FA", borderRadius: 8, padding: 12, border: "1px solid #E9ECEF" }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.val}</div>
                {p.sub && <div style={{ fontSize: 10, color: "#6C757D", marginTop: 2 }}>{p.sub}</div>}
              </div>
            ))}
          </div>
        );
        if (block.id === "items") return (
          <table key="items" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, borderRadius: 8, overflow: "hidden" }}>
            <thead><tr style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2B55)" }}>
              {["#", "بەرهەم", "بڕ", ...(showBonusCol ? ["بۆنەس"] : []), "نرخی یەکە", "کۆ"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "white" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{previewOrder.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? "#FAFBFC" : "white", borderBottom: "1px solid #F1F3F5" }}>
                <td style={{ padding: "9px 12px", fontSize: 12, color: "#ADB5BD" }}>{i + 1}</td>
                <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600 }}>{item.productName}</td>
                <td style={{ padding: "9px 12px", fontSize: 12 }}>{item.quantity}</td>
                {showBonusCol && <td style={{ padding: "9px 12px", fontSize: 12, color: "#40C057", fontWeight: 700 }}>+{item.bonusQty}</td>}
                <td style={{ padding: "9px 12px", fontSize: 12 }}>{formatIQD(item.unitPrice)}</td>
                <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 800 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}</tbody>
          </table>
        );
        if (block.id === "summary") return (
          <div key="summary" style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 280, border: "1px solid #E9ECEF", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 12, borderBottom: "1px solid #F1F3F5" }}><span style={{ color: "#6C757D" }}>کۆی نرخ</span><span style={{ fontWeight: 700 }}>{formatIQD(subtotal)}</span></div>
              {customDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 12, borderBottom: "1px solid #F1F3F5" }}><span style={{ color: "#6C757D" }}>داشکاندن ({customDiscount}٪)</span><span style={{ fontWeight: 700, color: "#FA5252" }}>-{formatIQD(discountAmt)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "linear-gradient(135deg, #4263EB, #7C5CFC)" }}><span style={{ color: "white", fontSize: 15, fontWeight: 800 }}>کۆی گشتی</span><span style={{ color: "white", fontSize: 15, fontWeight: 800 }}>{formatIQD(finalTotal)}</span></div>
            </div>
          </div>
        );
        if (block.id === "bonus") return <div key="bonus" style={{ padding: 12, background: "#F3F0FF", borderRadius: 8, marginBottom: 12, border: "1px solid #E8E0FF", fontSize: 12, color: "#7C5CFC" }}>بۆنەسی گشتی: %٥ | کۆگا: %٣ | نوێنەر: %٢</div>;
        if (block.id === "note" && customNote) return <div key="note" style={{ padding: 12, background: "#FFF8DB", borderRadius: 8, marginBottom: 12, border: "1px solid #FFE066" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#E67700", marginBottom: 3 }}>تێبینی</div><div style={{ fontSize: 12, color: "#495057" }}>{customNote}</div></div>;
        if (block.id === "terms" && customTerms) return <div key="terms" style={{ padding: 12, background: "#E8F5E9", borderRadius: 8, marginBottom: 12, border: "1px solid #A5D6A7" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#2E7D32", marginBottom: 3 }}>مەرجەکان</div><div style={{ fontSize: 12, color: "#495057" }}>{customTerms}</div></div>;
        if (block.id === "signature") return <div key="sig" style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, padding: "12px 0" }}>{["واژووی فرۆشیار", "واژووی کڕیار"].map(l => <div key={l} style={{ textAlign: "center", flex: 1 }}><div style={{ width: 120, borderBottom: "1px solid #ADB5BD", margin: "24px auto 6px" }} /><div style={{ fontSize: 10, color: "#6C757D" }}>{l}</div></div>)}</div>;
        if (block.id === "qr") return <div key="qr" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#F8F9FA", borderRadius: 8, marginBottom: 12, border: "1px dashed #CED4DA" }}><div style={{ width: 80, height: 80, background: "#E9ECEF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📱</div><div><div style={{ fontSize: 12, fontWeight: 700, color: "#495057" }}>QR کۆد</div><div style={{ fontSize: 11, color: "#868E96" }}>لەکاتی چاپدا QR کۆد دروست دەبێت — کڕیار دەتوانێت سکانی بکات بۆ بینینی داواکارییەکانی</div></div></div>;
        if (block.id === "footer") return <div key="footer" style={{ borderTop: "2px solid #E9ECEF", paddingTop: 12, marginTop: 20, textAlign: "center" }}><p style={{ fontSize: 12, color: "#868E96", fontWeight: 600 }}>سوپاس بۆ هاوکارییەکەتان — {settings.name || "دەوا"}</p><p style={{ fontSize: 10, color: "#CED4DA", marginTop: 3 }}>{settings.phone} | {settings.email}</p></div>;
        if (block.type === "custom" && block.customText) return <div key={block.id} style={{ padding: 12, background: "#F1F3F5", borderRadius: 8, marginBottom: 12, border: "1px solid #DEE2E6" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#495057", marginBottom: 3 }}>{block.label}</div><div style={{ fontSize: 12, color: "#495057", whiteSpace: "pre-line" }}>{block.customText}</div></div>;
        return null;
      })}
    </>
  );
}

// ── Build print HTML for a saved template ──
function buildPreviewHTML(
  t: InvoiceTemplate,
  settings: { name: string; nameEn: string; phone: string; email: string; address: string },
  pOrder = FALLBACK_ORDER,
  pClient = FALLBACK_CLIENT,
) {
  const docLabel = DOC_LABEL[t.docType] || "ڕێکەوت";
  const subtotal = pOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const disc = subtotal * (t.defaultDiscount / 100);
  const total = subtotal - disc;
  const parts: string[] = [];

  for (const b of t.blocks.filter(b => b.visible)) {
    if (b.id === "header") parts.push(`<div class="inv-header"><div class="inv-logo-wrap"><div class="inv-logo-fallback">د</div><div><div class="inv-company-name">${settings.name}</div><div class="inv-company-name-en">${settings.nameEn}</div><div class="inv-company-contact">${settings.phone} | ${settings.email}</div></div></div><div class="inv-title-block"><div class="inv-title">${docLabel}</div><div class="inv-meta"><strong>ژمارە:</strong> ORD-XXX</div><div class="inv-meta"><strong>بەروار:</strong> ${new Date().toISOString().split("T")[0]}</div></div></div>`);
    else if (b.id === "parties") parts.push(`<div class="inv-parties"><div class="inv-party"><div class="inv-party-label">کڕیار</div><div class="inv-party-name">${pClient.name}</div><div class="inv-party-detail">${pClient.phone} — ${pClient.city}</div></div><div class="inv-party"><div class="inv-party-label">نوێنەر</div><div class="inv-party-name">${pOrder.repName}</div></div></div>`);
    else if (b.id === "items") {
      const rows = pOrder.items.map((it, i) => `<tr><td style="color:#ADB5BD">${i + 1}</td><td style="font-weight:600">${it.productName}</td><td>${it.quantity}</td>${t.showBonusCol ? `<td style="color:#40C057;font-weight:700">+${it.bonusQty}</td>` : ""}<td>${formatIQD(it.unitPrice)}</td><td style="font-weight:800">${formatIQD(it.quantity * it.unitPrice)}</td></tr>`).join("");
      parts.push(`<table class="inv-table"><thead><tr><th>#</th><th>بەرهەم</th><th>بڕ</th>${t.showBonusCol ? "<th>بۆنەس</th>" : ""}<th>نرخی یەکە</th><th>کۆ</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    else if (b.id === "summary") parts.push(`<div class="inv-summary"><div class="inv-summary-box"><div class="inv-summary-row"><span>کۆی نرخ</span><span>${formatIQD(subtotal)}</span></div>${t.defaultDiscount > 0 ? `<div class="inv-summary-row"><span>داشکاندن (${t.defaultDiscount}٪)</span><span style="color:#FA5252">-${formatIQD(disc)}</span></div>` : ""}<div class="inv-summary-row inv-summary-total"><span class="inv-summary-label">کۆی گشتی</span><span class="inv-summary-value">${formatIQD(total)}</span></div></div></div>`);
    else if (b.id === "note" && t.defaultNote) parts.push(`<div class="inv-note"><div style="font-size:11px;font-weight:700;color:#E67700;margin-bottom:4px">تێبینی</div><div style="font-size:12px">${t.defaultNote}</div></div>`);
    else if (b.id === "terms" && t.defaultTerms) parts.push(`<div class="inv-terms"><div style="font-size:11px;font-weight:700;color:#2E7D32;margin-bottom:4px">مەرجەکان</div><div style="font-size:12px">${t.defaultTerms}</div></div>`);
    else if (b.id === "signature") parts.push(`<div class="inv-signature"><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی فرۆشیار</div></div><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی کڕیار</div></div></div>`);
    else if (b.id === "footer") parts.push(`<div class="inv-footer"><p style="font-size:13px;color:#868E96;font-weight:600">سوپاس بۆ هاوکارییەکەتان — ${settings.name}</p><p style="font-size:11px;color:#CED4DA;margin-top:4px">${settings.phone} | ${settings.email} | ${settings.address}</p></div>`);
    else if (b.type === "custom" && b.customText) parts.push(`<div class="inv-custom"><div style="font-size:11px;font-weight:700;color:#495057;margin-bottom:4px">${b.label}</div><div class="inv-custom-text">${(b.customText || "").replace(/\n/g, "<br/>")}</div></div>`);
  }

  const CSS = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;color:#1A1A2E;background:#fff}.inv-page{max-width:800px;margin:0 auto;padding:32px}.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #4263EB}.inv-logo-wrap{display:flex;align-items:center;gap:14px}.inv-logo-fallback{width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,#F47B35,#FF9A5C);display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:800}.inv-company-name{font-size:22px;font-weight:800}.inv-company-name-en{font-size:12px;color:#6C757D;margin-top:2px}.inv-company-contact{font-size:11px;color:#868E96;margin-top:4px}.inv-title-block{text-align:left}.inv-title{font-size:32px;font-weight:900;background:linear-gradient(135deg,#4263EB,#7C5CFC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}.inv-meta{font-size:12px;color:#495057;margin-bottom:3px}.inv-meta strong{color:#1A1A2E}.inv-parties{display:flex;gap:20px;margin-bottom:24px}.inv-party{flex:1;background:#F8F9FA;border-radius:10px;padding:16px;border:1px solid #E9ECEF}.inv-party-label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#ADB5BD;font-weight:700;margin-bottom:6px}.inv-party-name{font-size:15px;font-weight:700}.inv-party-detail{font-size:11px;color:#6C757D;margin-top:3px}.inv-table{width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:10px;overflow:hidden}.inv-table thead tr{background:linear-gradient(135deg,#1A1A2E,#2D2B55)}.inv-table thead th{padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:white}.inv-table tbody td{padding:11px 16px;font-size:13px;border-bottom:1px solid #F1F3F5}.inv-table tbody tr:nth-child(even){background:#FAFBFC}.inv-summary{display:flex;justify-content:flex-start;margin-bottom:20px}.inv-summary-box{width:320px;border:1px solid #E9ECEF;border-radius:10px;overflow:hidden}.inv-summary-row{display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;border-bottom:1px solid #F1F3F5}.inv-summary-total{background:linear-gradient(135deg,#4263EB,#7C5CFC)}.inv-summary-total .inv-summary-label,.inv-summary-total .inv-summary-value{color:white;font-size:16px;font-weight:800}.inv-note{padding:14px 16px;background:#FFF8DB;border-radius:10px;margin-bottom:16px;border:1px solid #FFE066}.inv-terms{padding:14px 16px;background:#E8F5E9;border-radius:10px;margin-bottom:16px;border:1px solid #A5D6A7}.inv-custom{padding:14px 16px;background:#F1F3F5;border-radius:10px;margin-bottom:16px;border:1px solid #DEE2E6}.inv-custom-text{font-size:12px;color:#495057;white-space:pre-line}.inv-signature{display:flex;justify-content:space-between;margin-bottom:20px;padding:16px 0}.inv-sig-box{text-align:center;flex:1}.inv-sig-line{width:140px;border-bottom:1px solid #ADB5BD;margin:30px auto 8px}.inv-sig-label{font-size:11px;color:#6C757D}.inv-footer{border-top:2px solid #E9ECEF;padding-top:16px;margin-top:24px;text-align:center}@media print{.inv-table thead tr,.inv-summary-total,.inv-note,.inv-party,.inv-terms,.inv-custom{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

  return `<html dir="rtl" lang="ckb"><head><title>${docLabel} — نموونە</title><style>${CSS}</style></head><body><div class="inv-page">${parts.join("")}</div></body></html>`;
}
