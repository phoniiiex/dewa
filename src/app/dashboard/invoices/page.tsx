"use client";
import { useState, useEffect, ReactNode } from "react";
import { FileText, Printer, Eye, EyeOff, GripVertical, QrCode, Type, Users as UsersIcon, Table, Calculator, Gift, StickyNote, Image as ImageIcon, MessageSquare, Plus, Trash2, Save, FolderOpen, X } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import { generateQRSvg } from "@/lib/qr-c2";
import type { InvoiceBlockConfig, InvoiceTemplate } from "@/lib/types";

// ==================== BLOCK DEFINITIONS ====================
type BuiltinBlockId = "header" | "parties" | "items" | "summary" | "bonus" | "note" | "qr" | "footer" | "signature" | "terms";

const BLOCK_ICONS: Record<string, ReactNode> = {
  header: <Type size={14} />, parties: <UsersIcon size={14} />, items: <Table size={14} />,
  summary: <Calculator size={14} />, bonus: <Gift size={14} />, note: <StickyNote size={14} />,
  terms: <MessageSquare size={14} />, qr: <QrCode size={14} />, signature: <ImageIcon size={14} />,
  footer: <Type size={14} />, custom: <StickyNote size={14} />,
};

const DEFAULT_BLOCKS: InvoiceBlockConfig[] = [
  { id: "header", label: "سەرپەڕە", visible: true, required: true, type: "builtin" },
  { id: "parties", label: "کڕیار و نوێنەر", visible: true, type: "builtin" },
  { id: "items", label: "خشتەی بەرهەمەکان", visible: true, required: true, type: "builtin" },
  { id: "summary", label: "کۆی گشتی", visible: true, required: true, type: "builtin" },
  { id: "bonus", label: "شیکاری بۆنەس", visible: true, type: "builtin" },
  { id: "note", label: "تێبینی", visible: false, type: "builtin" },
  { id: "terms", label: "مەرجەکان", visible: false, type: "builtin" },
  { id: "qr", label: "QR کۆد", visible: true, type: "builtin" },
  { id: "signature", label: "واژوو", visible: false, type: "builtin" },
  { id: "footer", label: "پێپەڕە", visible: true, type: "builtin" },
];

// ==================== PRINT CSS ====================
const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1A1A2E; background: #fff; }
  .inv-page { max-width: 800px; margin: 0 auto; padding: 32px; }
  .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #4263EB; }
  .inv-logo-wrap { display: flex; align-items: center; gap: 14px; }
  .inv-logo { width: 60px; height: 60px; border-radius: 14px; object-fit: cover; }
  .inv-logo-fallback { width: 60px; height: 60px; border-radius: 14px; background: linear-gradient(135deg, #F47B35, #FF9A5C); display: flex; align-items: center; justify-content: center; color: white; font-size: 26px; font-weight: 800; }
  .inv-company-name { font-size: 22px; font-weight: 800; }
  .inv-company-name-en { font-size: 12px; color: #6C757D; margin-top: 2px; }
  .inv-company-contact { font-size: 11px; color: #868E96; margin-top: 4px; }
  .inv-title-block { text-align: left; }
  .inv-title { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #4263EB, #7C5CFC); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
  .inv-meta { font-size: 12px; color: #495057; margin-bottom: 3px; }
  .inv-meta strong { color: #1A1A2E; }
  .inv-status { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
  .inv-status-paid { background: #D3F9D8; color: #2B8A3E; }
  .inv-status-pending { background: #FFF3BF; color: #E67700; }
  .inv-parties { display: flex; gap: 20px; margin-bottom: 24px; }
  .inv-party { flex: 1; background: #F8F9FA; border-radius: 10px; padding: 16px; border: 1px solid #E9ECEF; }
  .inv-party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #ADB5BD; font-weight: 700; margin-bottom: 6px; }
  .inv-party-name { font-size: 15px; font-weight: 700; }
  .inv-party-detail { font-size: 11px; color: #6C757D; margin-top: 3px; }
  .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 10px; overflow: hidden; }
  .inv-table thead tr { background: linear-gradient(135deg, #1A1A2E, #2D2B55); }
  .inv-table thead th { padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 700; color: white; }
  .inv-table tbody td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid #F1F3F5; }
  .inv-table tbody tr:nth-child(even) { background: #FAFBFC; }
  .inv-summary { display: flex; justify-content: flex-start; margin-bottom: 20px; }
  .inv-summary-box { width: 320px; border: 1px solid #E9ECEF; border-radius: 10px; overflow: hidden; }
  .inv-summary-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #F1F3F5; }
  .inv-summary-total { background: linear-gradient(135deg, #4263EB, #7C5CFC); }
  .inv-summary-total .inv-summary-label, .inv-summary-total .inv-summary-value { color: white; font-size: 16px; font-weight: 800; }
  .inv-bonus-info { padding: 14px 16px; background: #F3F0FF; border-radius: 10px; margin-bottom: 16px; border: 1px solid #E8E0FF; }
  .inv-note { padding: 14px 16px; background: #FFF8DB; border-radius: 10px; margin-bottom: 16px; border: 1px solid #FFE066; }
  .inv-terms { padding: 14px 16px; background: #E8F5E9; border-radius: 10px; margin-bottom: 16px; border: 1px solid #A5D6A7; }
  .inv-custom { padding: 14px 16px; background: #F1F3F5; border-radius: 10px; margin-bottom: 16px; border: 1px solid #DEE2E6; }
  .inv-custom-text { font-size: 12px; color: #495057; white-space: pre-line; }
  .inv-signature { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 16px 0; }
  .inv-sig-box { text-align: center; flex: 1; }
  .inv-sig-line { width: 140px; border-bottom: 1px solid #ADB5BD; margin: 30px auto 8px; }
  .inv-sig-label { font-size: 11px; color: #6C757D; }
  .inv-footer { border-top: 2px solid #E9ECEF; padding-top: 16px; margin-top: 24px; text-align: center; }
  .inv-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 16px; }
  .inv-qr-wrap svg { width: 100px; height: 100px; }
  .inv-qr-label { font-size: 8px; color: #ADB5BD; font-weight: 600; }
  @media print {
    .inv-table thead tr, .inv-summary-total, .inv-bonus-info, .inv-note, .inv-party, .inv-terms, .inv-custom { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ==================== COMPONENT ====================
export default function InvoicesPage() {
  const { orders, clients, settings, invoiceTemplates, addTemplate, deleteTemplate, showToast } = useData();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<InvoiceBlockConfig[]>(DEFAULT_BLOCKS);
  const [customNote, setCustomNote] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [customDiscount, setCustomDiscount] = useState(0);
  const [showBonusCol, setShowBonusCol] = useState(true);
  const [qrSvg, setQrSvg] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [customBlockText, setCustomBlockText] = useState("");
  const [customBlockLabel, setCustomBlockLabel] = useState("");
  const [showAddBlock, setShowAddBlock] = useState(false);

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const client = selectedOrder ? clients.find(c => c.id === selectedOrder.clientId) : null;
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
  const subtotal = selectedOrder ? selectedOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
  const discountAmount = subtotal * (customDiscount / 100);
  const finalTotal = subtotal - discountAmount;
  const visibleBlocks = blocks.filter(b => b.visible);

  // QR
  useEffect(() => {
    if (!selectedOrder || !client) { setQrSvg(""); return; }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const clientOrders = orders.filter(o => o.clientId === client.id);
    const data = { n: client.name, t: client.type, p: client.phone, c: client.city, b: client.balance, o: clientOrders.length, ta: clientOrders.reduce((s, o) => s + o.totalAmount, 0), pc: clientOrders.filter(o => o.status === "PAID").length, co: settings.name, ce: settings.nameEn };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    generateQRSvg(`${baseUrl}/client/${client.id}#d=${encoded}`, 200).then(setQrSvg).catch(() => setQrSvg(""));
  }, [selectedOrder, client, orders, settings]);

  // Drag & Drop
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

  // Add custom text block
  const addCustomBlock = () => {
    if (!customBlockLabel.trim()) return;
    const newBlock: InvoiceBlockConfig = {
      id: `custom_${Date.now()}`, label: customBlockLabel, visible: true, type: "custom", customText: customBlockText,
    };
    setBlocks(prev => [...prev.slice(0, -1), newBlock, ...prev.slice(-1)]); // Insert before footer
    setCustomBlockLabel(""); setCustomBlockText(""); setShowAddBlock(false);
  };

  // Template save/load
  const saveTemplate = () => {
    if (!templateName.trim()) return;
    addTemplate({ name: templateName, blocks, showBonusCol, defaultNote: customNote, defaultTerms: customTerms, defaultDiscount: customDiscount });
    setTemplateName(""); setShowSaveModal(false);
  };

  const loadTemplate = (t: InvoiceTemplate) => {
    setBlocks(t.blocks); setShowBonusCol(t.showBonusCol); setCustomNote(t.defaultNote); setCustomTerms(t.defaultTerms); setCustomDiscount(t.defaultDiscount);
    setShowLoadModal(false); showToast(`داڕێژەی "${t.name}" بارکرا`);
  };

  // Update custom block text
  const updateBlockText = (id: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, customText: text } : b));
  };

  // ==================== BLOCK RENDERERS ====================
  const renderBlock = (block: InvoiceBlockConfig) => {
    if (!selectedOrder || !client) return null;
    switch (block.id) {
      case "header": return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "3px solid #4263EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {settings.logo ? <img src={settings.logo} alt="logo" style={{ width: 60, height: 60, borderRadius: 14, objectFit: "cover" }} /> : <div style={{ width: 60, height: 60, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 26, fontWeight: 800 }}>د</div>}
            <div><div style={{ fontSize: 22, fontWeight: 800 }}>{settings.name}</div><div style={{ fontSize: 12, color: "#6C757D", marginTop: 2 }}>{settings.nameEn}</div><div style={{ fontSize: 11, color: "#868E96", marginTop: 4 }}>{settings.phone} | {settings.email}</div></div>
          </div>
          <div style={{ textAlign: "left" }}><div style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>پسوولە</div><div style={{ fontSize: 12, color: "#495057", marginBottom: 3 }}><strong>ژمارە:</strong> {selectedOrder.orderNumber}</div><div style={{ fontSize: 12, color: "#495057", marginBottom: 3 }}><strong>بەروار:</strong> {selectedOrder.createdAt}</div><div style={{ fontSize: 12 }}><strong>بارودۆخ:</strong> <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: selectedOrder.status === "PAID" ? "#D3F9D8" : "#FFF3BF", color: selectedOrder.status === "PAID" ? "#2B8A3E" : "#E67700" }}>{statusLabels[selectedOrder.status]}</span></div></div>
        </div>
      );
      case "parties": return (
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>کڕیار</div><div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.clientName}</div>{client && <div style={{ fontSize: 11, color: "#6C757D", marginTop: 3 }}>{client.phone} — {client.city}</div>}</div>
          <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>نوێنەر</div><div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.repName}</div></div>
          {selectedOrder.warehouseName && <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>کۆگا</div><div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.warehouseName}</div></div>}
        </div>
      );
      case "items": return (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, borderRadius: 10, overflow: "hidden" }}>
          <thead><tr style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2B55)" }}>
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>#</th>
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بەرهەم</th>
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بڕ</th>
            {showBonusCol && <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بۆنەس</th>}
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>نرخی یەکە</th>
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>کۆ</th>
          </tr></thead>
          <tbody>{selectedOrder.items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? "#FAFBFC" : "white", borderBottom: "1px solid #F1F3F5" }}>
              <td style={{ padding: "11px 16px", fontSize: 13, color: "#ADB5BD" }}>{i + 1}</td>
              <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600 }}>{item.productName}</td>
              <td style={{ padding: "11px 16px", fontSize: 13 }}>{item.quantity.toLocaleString()}</td>
              {showBonusCol && <td style={{ padding: "11px 16px", fontSize: 13, color: "#40C057", fontWeight: 700 }}>+{item.bonusQty}</td>}
              <td style={{ padding: "11px 16px", fontSize: 13 }}>{formatIQD(item.unitPrice)}</td>
              <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 800 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}</tbody>
        </table>
      );
      case "summary": return (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
          <div style={{ width: 320, border: "1px solid #E9ECEF", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}><span style={{ color: "#6C757D" }}>کۆی نرخ</span><span style={{ fontWeight: 700 }}>{formatIQD(subtotal)}</span></div>
            {customDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}><span style={{ color: "#6C757D" }}>داشکاندن ({customDiscount}٪)</span><span style={{ fontWeight: 700, color: "#FA5252" }}>-{formatIQD(discountAmount)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(135deg, #4263EB, #7C5CFC)" }}><span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>کۆی گشتی</span><span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>{formatIQD(finalTotal)}</span></div>
          </div>
        </div>
      );
      case "bonus": return selectedOrder.totalBonusPct > 0 ? <div style={{ padding: 14, background: "#F3F0FF", borderRadius: 10, marginBottom: 16, border: "1px solid #E8E0FF" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#7C5CFC", marginBottom: 4 }}>شیکاری بۆنەس</div><div style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی گشتی: {selectedOrder.totalBonusPct}٪ | کۆگا: {selectedOrder.warehouseBonusPct}٪ | نوێنەر: {selectedOrder.repBonusPct}٪</div></div> : null;
      case "note": return customNote ? <div style={{ padding: 14, background: "#FFF8DB", borderRadius: 10, marginBottom: 16, border: "1px solid #FFE066" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#E67700", marginBottom: 4 }}>تێبینی</div><div style={{ fontSize: 12, color: "#495057" }}>{customNote}</div></div> : null;
      case "terms": return customTerms ? <div style={{ padding: 14, background: "#E8F5E9", borderRadius: 10, marginBottom: 16, border: "1px solid #A5D6A7" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#2E7D32", marginBottom: 4 }}>مەرجەکان</div><div style={{ fontSize: 12, color: "#495057", whiteSpace: "pre-line" }}>{customTerms}</div></div> : null;
      case "qr": return qrSvg ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 16 }}><div dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: 100, height: 100, lineHeight: 0 }} /><span style={{ fontSize: 8, color: "#ADB5BD", fontWeight: 600 }}>سکان بکە بۆ زانیاری دارایی</span></div> : null;
      case "signature": return <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, padding: "16px 0" }}><div style={{ textAlign: "center", flex: 1 }}><div style={{ width: 140, borderBottom: "1px solid #ADB5BD", margin: "30px auto 8px" }} /><div style={{ fontSize: 11, color: "#6C757D" }}>واژووی فرۆشیار</div></div><div style={{ textAlign: "center", flex: 1 }}><div style={{ width: 140, borderBottom: "1px solid #ADB5BD", margin: "30px auto 8px" }} /><div style={{ fontSize: 11, color: "#6C757D" }}>واژووی کڕیار</div></div></div>;
      case "footer": return <div style={{ borderTop: "2px solid #E9ECEF", paddingTop: 16, marginTop: 24, textAlign: "center" }}><p style={{ fontSize: 13, color: "#868E96", fontWeight: 600 }}>سوپاس بۆ هاوکارییەکەتان — {settings.name}</p><p style={{ fontSize: 11, color: "#CED4DA", marginTop: 4 }}>{settings.phone} | {settings.email} | {settings.address}</p></div>;
      default: // Custom block
        if (block.type === "custom") return <div style={{ padding: 14, background: "#F1F3F5", borderRadius: 10, marginBottom: 16, border: "1px solid #DEE2E6" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#495057", marginBottom: 4 }}>{block.label}</div><div style={{ fontSize: 12, color: "#495057", whiteSpace: "pre-line" }}>{block.customText || ""}</div></div>;
        return null;
    }
  };

  // ==================== PRINT HTML ====================
  const buildPrintHTML = () => {
    if (!selectedOrder || !client) return "";
    const logo = settings.logo ? `<img src="${settings.logo}" class="inv-logo" alt="logo" />` : `<div class="inv-logo-fallback">د</div>`;
    const sc = selectedOrder.status === "PAID" ? "inv-status-paid" : "inv-status-pending";
    const parts: string[] = [];
    for (const b of visibleBlocks) {
      if (b.id === "header") parts.push(`<div class="inv-header"><div class="inv-logo-wrap">${logo}<div><div class="inv-company-name">${settings.name}</div><div class="inv-company-name-en">${settings.nameEn}</div><div class="inv-company-contact">${settings.phone} | ${settings.email}</div></div></div><div class="inv-title-block"><div class="inv-title">پسوولە</div><div class="inv-meta"><strong>ژمارە:</strong> ${selectedOrder.orderNumber}</div><div class="inv-meta"><strong>بەروار:</strong> ${selectedOrder.createdAt}</div><div class="inv-meta"><strong>بارودۆخ:</strong> <span class="inv-status ${sc}">${statusLabels[selectedOrder.status]}</span></div></div></div>`);
      else if (b.id === "parties") parts.push(`<div class="inv-parties"><div class="inv-party"><div class="inv-party-label">کڕیار</div><div class="inv-party-name">${selectedOrder.clientName}</div>${client ? `<div class="inv-party-detail">${client.phone} — ${client.city}</div>` : ""}</div><div class="inv-party"><div class="inv-party-label">نوێنەر</div><div class="inv-party-name">${selectedOrder.repName}</div></div>${selectedOrder.warehouseName ? `<div class="inv-party"><div class="inv-party-label">کۆگا</div><div class="inv-party-name">${selectedOrder.warehouseName}</div></div>` : ""}</div>`);
      else if (b.id === "items") { const rows = selectedOrder.items.map((it, i) => `<tr><td style="color:#ADB5BD">${i+1}</td><td style="font-weight:600">${it.productName}</td><td>${it.quantity}</td>${showBonusCol?`<td style="color:#40C057;font-weight:700">+${it.bonusQty}</td>`:""}<td>${formatIQD(it.unitPrice)}</td><td style="font-weight:800">${formatIQD(it.quantity*it.unitPrice)}</td></tr>`).join(""); parts.push(`<table class="inv-table"><thead><tr><th>#</th><th>بەرهەم</th><th>بڕ</th>${showBonusCol?"<th>بۆنەس</th>":""}<th>نرخی یەکە</th><th>کۆ</th></tr></thead><tbody>${rows}</tbody></table>`); }
      else if (b.id === "summary") { const disc = customDiscount>0?`<div class="inv-summary-row"><span class="inv-summary-label">داشکاندن (${customDiscount}٪)</span><span class="inv-summary-value" style="color:#FA5252">-${formatIQD(discountAmount)}</span></div>`:""; parts.push(`<div class="inv-summary"><div class="inv-summary-box"><div class="inv-summary-row"><span class="inv-summary-label">کۆی نرخ</span><span class="inv-summary-value">${formatIQD(subtotal)}</span></div>${disc}<div class="inv-summary-row inv-summary-total"><span class="inv-summary-label">کۆی گشتی</span><span class="inv-summary-value">${formatIQD(finalTotal)}</span></div></div></div>`); }
      else if (b.id === "bonus" && selectedOrder.totalBonusPct > 0) parts.push(`<div class="inv-bonus-info"><div style="font-size:11px;font-weight:700;color:#7C5CFC;margin-bottom:4px">شیکاری بۆنەس</div><div style="font-size:12px;color:#6C757D">بۆنەسی گشتی: ${selectedOrder.totalBonusPct}٪ | کۆگا: ${selectedOrder.warehouseBonusPct}٪ | نوێنەر: ${selectedOrder.repBonusPct}٪</div></div>`);
      else if (b.id === "note" && customNote) parts.push(`<div class="inv-note"><div style="font-size:11px;font-weight:700;color:#E67700;margin-bottom:4px">تێبینی</div><div style="font-size:12px;color:#495057">${customNote}</div></div>`);
      else if (b.id === "terms" && customTerms) parts.push(`<div class="inv-terms"><div style="font-size:11px;font-weight:700;color:#2E7D32;margin-bottom:4px">مەرجەکان</div><div style="font-size:12px;color:#495057">${customTerms.replace(/\n/g,"<br/>")}</div></div>`);
      else if (b.id === "qr" && qrSvg) parts.push(`<div class="inv-qr-wrap">${qrSvg}<div class="inv-qr-label">سکان بکە بۆ زانیاری دارایی</div></div>`);
      else if (b.id === "signature") parts.push(`<div class="inv-signature"><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی فرۆشیار</div></div><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی کڕیار</div></div></div>`);
      else if (b.id === "footer") parts.push(`<div class="inv-footer"><div style="font-size:13px;color:#868E96;font-weight:600">سوپاس بۆ هاوکارییەکەتان — ${settings.name}</div><div style="font-size:11px;color:#CED4DA;margin-top:4px">${settings.phone} | ${settings.email} | ${settings.address}</div></div>`);
      else if (b.type === "custom" && b.customText) parts.push(`<div class="inv-custom"><div style="font-size:11px;font-weight:700;color:#495057;margin-bottom:4px">${b.label}</div><div class="inv-custom-text">${(b.customText||"").replace(/\n/g,"<br/>")}</div></div>`);
    }
    return `<html dir="rtl" lang="ckb"><head><title>پسوولە — ${selectedOrder.orderNumber}</title><style>${PRINT_CSS}</style></head><body><div class="inv-page">${parts.join("")}</div></body></html>`;
  };

  const handlePrint = () => { const h = buildPrintHTML(); if (!h) return; const w = window.open("","_blank"); if (!w) return; w.document.write(h); w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close();},600); };

  // ==================== MODAL STYLES ====================
  const modalBg: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
  const modalBox: React.CSSProperties = { background: "white", borderRadius: 16, padding: 28, width: 400, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, fontFamily: "inherit" };
  const btnPrimary: React.CSSProperties = { padding: "8px 20px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" };

  return (
    <>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#E8F5E9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#2E7D32" }}><FileText size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>پسوولە و وەسڵ</h1><p style={{ fontSize: 13, color: "#6C757D" }}>دروستکردن و چاپکردنی پسوولە بۆ داواکارییەکان</p></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* LEFT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Order List */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 13 }}>هەڵبژاردنی داواکاری</div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {orders.length === 0 ? <p style={{ padding: 16, textAlign: "center", color: "#ADB5BD", fontSize: 12 }}>هیچ داواکارییەک نییە</p> : orders.map(o => (
                <div key={o.id} onClick={() => { setSelectedOrderId(o.id); setCustomNote(""); setCustomTerms(""); setCustomDiscount(0); }} style={{ padding: "8px 14px", borderBottom: "1px solid #F1F3F5", cursor: "pointer", background: selectedOrderId === o.id ? "#EDF2FF" : "white", borderRight: selectedOrderId === o.id ? "3px solid #4263EB" : "3px solid transparent", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontWeight: 700, fontSize: 11, fontFamily: "monospace" }}>{o.orderNumber}</span><span style={{ fontSize: 10, color: "#ADB5BD" }}>{o.createdAt}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "#6C757D" }}>{o.clientName}</span><span style={{ fontSize: 11, fontWeight: 700 }}>{formatIQD(o.totalAmount)}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Block Editor */}
          {selectedOrder && (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>بلۆکەکان</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setShowAddBlock(!showAddBlock)} title="زیادکردنی بلۆک" style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#4263EB", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={12} /></button>
                  <button onClick={() => setShowSaveModal(true)} title="پاشەکەوتکردنی داڕێژە" style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#40C057", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Save size={12} /></button>
                  <button onClick={() => setShowLoadModal(true)} title="بارکردنی داڕێژە" style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#F47B35", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FolderOpen size={12} /></button>
                </div>
              </div>

              {/* Add custom block form */}
              {showAddBlock && (
                <div style={{ padding: 12, borderBottom: "1px solid #E9ECEF", background: "#F8F9FA" }}>
                  <input placeholder="ناوی بلۆک..." value={customBlockLabel} onChange={e => setCustomBlockLabel(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
                  <textarea placeholder="ناوەڕۆک..." value={customBlockText} onChange={e => setCustomBlockText(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={addCustomBlock} style={{ ...btnPrimary, flex: 1, fontSize: 11 }}><Plus size={12} /> زیادکردن</button>
                    <button onClick={() => setShowAddBlock(false)} style={{ ...btnPrimary, flex: 1, fontSize: 11, background: "#6C757D" }}>پاشگەزبوونەوە</button>
                  </div>
                </div>
              )}

              <div style={{ padding: 6 }}>
                {blocks.map((block, idx) => (
                  <div key={block.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, marginBottom: 2, cursor: "grab", fontSize: 11, background: dragOverIdx === idx ? "#EDF2FF" : dragIdx === idx ? "#F8F9FA" : "transparent", border: dragOverIdx === idx ? "1px dashed #4263EB" : "1px solid transparent", opacity: block.visible ? 1 : 0.4, transition: "all 0.15s" }}>
                    <GripVertical size={12} color="#CED4DA" style={{ flexShrink: 0 }} />
                    <span style={{ color: "#6C757D", flexShrink: 0 }}>{BLOCK_ICONS[block.type === "custom" ? "custom" : block.id] || <StickyNote size={14} />}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: "#495057", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.label}</span>
                    <button onClick={() => toggleBlock(block.id)} disabled={block.required} style={{ width: 20, height: 20, borderRadius: 5, border: "none", cursor: block.required ? "default" : "pointer", background: block.visible ? "#4263EB" : "#E9ECEF", color: block.visible ? "white" : "#ADB5BD", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {block.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    {!block.required && <button onClick={() => removeBlock(block.id)} style={{ width: 20, height: 20, borderRadius: 5, border: "none", cursor: "pointer", background: "#FFE3E3", color: "#FA5252", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={10} /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {selectedOrder && (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>ڕێکخستنەکان</div>
              <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: "#495057", display: "block", marginBottom: 3 }}>داشکاندن (٪)</label><input type="number" min="0" max="100" value={customDiscount} onChange={e => setCustomDiscount(Number(e.target.value))} style={inputStyle} /></div>
              <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: "#495057", display: "block", marginBottom: 3 }}>تێبینی</label><textarea value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="تێبینی ئارەزوومەندانە..." rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
              <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: "#495057", display: "block", marginBottom: 3 }}>مەرجەکان</label><textarea value={customTerms} onChange={e => setCustomTerms(e.target.value)} placeholder="مەرجی پارەدان..." rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
              {/* Custom block text editors */}
              {blocks.filter(b => b.type === "custom" && b.visible).map(b => (
                <div key={b.id} style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: "#495057", display: "block", marginBottom: 3 }}>{b.label}</label><textarea value={b.customText || ""} onChange={e => updateBlockText(b.id, e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#6C757D", cursor: "pointer" }}><input type="checkbox" checked={showBonusCol} onChange={e => setShowBonusCol(e.target.checked)} style={{ width: 13, height: 13 }} />ستوونی بۆنەس</label>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Preview */}
        <div>
          {!selectedOrder ? (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 60, textAlign: "center" }}><FileText size={48} color="#DEE2E6" /><h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 16, color: "#6C757D" }}>داواکارییەک هەڵبژێرە</h3><p style={{ fontSize: 13, color: "#ADB5BD", marginTop: 4 }}>لە لیستی لای ڕاست داواکارییەک هەڵبژێرە</p></div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={handlePrint} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(66,99,235,0.3)" }}><Printer size={16} /> چاپکردن</button>
              </div>
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 40, minHeight: 500 }}>
                {visibleBlocks.map(b => { const c = renderBlock(b); return c ? <div key={b.id}>{c}</div> : null; })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && <div style={modalBg} onClick={() => setShowSaveModal(false)}><div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 16, fontWeight: 700 }}>پاشەکەوتکردنی داڕێژە</h3><button onClick={() => setShowSaveModal(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button></div>
        <input placeholder="ناوی داڕێژە..." value={templateName} onChange={e => setTemplateName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <p style={{ fontSize: 11, color: "#6C757D", marginBottom: 12 }}>ئەم داڕێژەیە بلۆکەکان، ڕێکخستنەکان و شێوازی پسوولەکە پاشەکەوت دەکات.</p>
        <button onClick={saveTemplate} style={{ ...btnPrimary, width: "100%" }}>پاشەکەوتکردن</button>
      </div></div>}

      {/* Load Template Modal */}
      {showLoadModal && <div style={modalBg} onClick={() => setShowLoadModal(false)}><div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 16, fontWeight: 700 }}>بارکردنی داڕێژە</h3><button onClick={() => setShowLoadModal(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button></div>
        {invoiceTemplates.length === 0 ? <p style={{ textAlign: "center", color: "#ADB5BD", fontSize: 13, padding: 20 }}>هیچ داڕێژەیەک نییە</p> : invoiceTemplates.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #E9ECEF", borderRadius: 8, marginBottom: 6 }}>
            <div><div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>{t.blocks.filter(b => b.visible).length} بلۆک · {t.createdAt}</div></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => loadTemplate(t)} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 11 }}>بارکردن</button>
              <button onClick={() => deleteTemplate(t.id)} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 11, background: "#FA5252" }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div></div>}
    </>
  );
}
