"use client";
import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { FileText, Printer, Eye, GripVertical, EyeOff, QrCode, Type, Users as UsersIcon, Table, Calculator, Gift, StickyNote, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import { generateQRSvg } from "@/lib/qr-c2";

// ==================== BLOCK DEFINITIONS ====================
type BlockId = "header" | "parties" | "items" | "summary" | "bonus" | "note" | "qr" | "footer" | "signature" | "terms";

interface Block {
  id: BlockId;
  label: string;
  icon: ReactNode;
  visible: boolean;
  required?: boolean; // Can't be hidden
}

const DEFAULT_BLOCKS: Block[] = [
  { id: "header", label: "سەرپەڕە", icon: <Type size={14} />, visible: true, required: true },
  { id: "parties", label: "کڕیار و نوێنەر", icon: <UsersIcon size={14} />, visible: true },
  { id: "items", label: "خشتەی بەرهەمەکان", icon: <Table size={14} />, visible: true, required: true },
  { id: "summary", label: "کۆی گشتی", icon: <Calculator size={14} />, visible: true, required: true },
  { id: "bonus", label: "شیکاری بۆنەس", icon: <Gift size={14} />, visible: true },
  { id: "note", label: "تێبینی", icon: <StickyNote size={14} />, visible: false },
  { id: "terms", label: "مەرجەکان", icon: <MessageSquare size={14} />, visible: false },
  { id: "qr", label: "QR کۆد", icon: <QrCode size={14} />, visible: true },
  { id: "signature", label: "واژوو", icon: <ImageIcon size={14} />, visible: false },
  { id: "footer", label: "پێپەڕە", icon: <Type size={14} />, visible: true },
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
  .inv-company-name { font-size: 22px; font-weight: 800; color: #1A1A2E; }
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
  .inv-party-name { font-size: 15px; font-weight: 700; color: #1A1A2E; }
  .inv-party-detail { font-size: 11px; color: #6C757D; margin-top: 3px; }
  .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 10px; overflow: hidden; }
  .inv-table thead tr { background: linear-gradient(135deg, #1A1A2E, #2D2B55); }
  .inv-table thead th { padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.3px; }
  .inv-table tbody td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid #F1F3F5; }
  .inv-table tbody tr:last-child td { border-bottom: none; }
  .inv-table tbody tr:nth-child(even) { background: #FAFBFC; }
  .inv-summary { display: flex; justify-content: flex-start; margin-bottom: 20px; }
  .inv-summary-box { width: 320px; border: 1px solid #E9ECEF; border-radius: 10px; overflow: hidden; }
  .inv-summary-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #F1F3F5; }
  .inv-summary-row:last-child { border-bottom: none; }
  .inv-summary-label { color: #6C757D; }
  .inv-summary-value { font-weight: 700; }
  .inv-summary-total { background: linear-gradient(135deg, #4263EB, #7C5CFC); }
  .inv-summary-total .inv-summary-label, .inv-summary-total .inv-summary-value { color: white; font-size: 16px; font-weight: 800; }
  .inv-discount-value { color: #FA5252; }
  .inv-bonus-info { padding: 14px 16px; background: #F3F0FF; border-radius: 10px; margin-bottom: 16px; border: 1px solid #E8E0FF; }
  .inv-bonus-title { font-size: 11px; font-weight: 700; color: #7C5CFC; margin-bottom: 4px; }
  .inv-bonus-detail { font-size: 12px; color: #6C757D; }
  .inv-note { padding: 14px 16px; background: #FFF8DB; border-radius: 10px; margin-bottom: 16px; border: 1px solid #FFE066; }
  .inv-note-title { font-size: 11px; font-weight: 700; color: #E67700; margin-bottom: 4px; }
  .inv-note-text { font-size: 12px; color: #495057; }
  .inv-terms { padding: 14px 16px; background: #E8F5E9; border-radius: 10px; margin-bottom: 16px; border: 1px solid #A5D6A7; }
  .inv-terms-title { font-size: 11px; font-weight: 700; color: #2E7D32; margin-bottom: 4px; }
  .inv-terms-text { font-size: 12px; color: #495057; }
  .inv-signature { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 16px 0; }
  .inv-sig-box { text-align: center; flex: 1; }
  .inv-sig-line { width: 140px; border-bottom: 1px solid #ADB5BD; margin: 30px auto 8px; }
  .inv-sig-label { font-size: 11px; color: #6C757D; }
  .inv-footer { border-top: 2px solid #E9ECEF; padding-top: 16px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .inv-footer-text { text-align: center; flex: 1; }
  .inv-footer-thanks { font-size: 13px; color: #868E96; font-weight: 600; }
  .inv-footer-contact { font-size: 11px; color: #CED4DA; margin-top: 4px; }
  .inv-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 16px; }
  .inv-qr-wrap svg { width: 100px; height: 100px; }
  .inv-qr-label { font-size: 8px; color: #ADB5BD; font-weight: 600; text-align: center; }
  @media print {
    body { padding: 0; }
    .inv-page { padding: 20px; }
    .inv-header { border-bottom-color: #4263EB !important; }
    .inv-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv-summary-total { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv-bonus-info, .inv-note, .inv-party, .inv-terms { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ==================== MAIN COMPONENT ====================
export default function InvoicesPage() {
  const { orders, clients, settings } = useData();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS);
  const [customNote, setCustomNote] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [customDiscount, setCustomDiscount] = useState(0);
  const [showBonusCol, setShowBonusCol] = useState(true);
  const [qrSvg, setQrSvg] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const client = selectedOrder ? clients.find(c => c.id === selectedOrder.clientId) : null;
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };

  const subtotal = selectedOrder ? selectedOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
  const discountAmount = subtotal * (customDiscount / 100);
  const finalTotal = subtotal - discountAmount;
  const visibleBlocks = blocks.filter(b => b.visible);

  // QR generation
  useEffect(() => {
    if (!selectedOrder || !client) { setQrSvg(""); return; }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const clientOrders = orders.filter(o => o.clientId === client.id);
    const data = {
      n: client.name, t: client.type, p: client.phone, c: client.city, b: client.balance,
      o: clientOrders.length, ta: clientOrders.reduce((s, o) => s + o.totalAmount, 0),
      pc: clientOrders.filter(o => o.status === "PAID").length, co: settings.name, ce: settings.nameEn,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    generateQRSvg(`${baseUrl}/client/${client.id}#d=${encoded}`, 200).then(setQrSvg).catch(() => setQrSvg(""));
  }, [selectedOrder, client, orders, settings]);

  // ==================== DRAG & DROP ====================
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const updated = [...blocks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setBlocks(updated);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const toggleBlock = (id: BlockId) => {
    setBlocks(prev => prev.map(b => b.id === id && !b.required ? { ...b, visible: !b.visible } : b));
  };

  // ==================== BLOCK RENDERERS (Preview) ====================
  const renderBlockPreview = (block: Block) => {
    if (!selectedOrder || !client) return null;
    switch (block.id) {
      case "header":
        return (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "3px solid #4263EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {settings.logo ? <img src={settings.logo} alt="logo" style={{ width: 60, height: 60, borderRadius: 14, objectFit: "cover" }} /> : <div style={{ width: 60, height: 60, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 26, fontWeight: 800 }}>د</div>}
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{settings.name}</div>
                <div style={{ fontSize: 12, color: "#6C757D", marginTop: 2 }}>{settings.nameEn}</div>
                <div style={{ fontSize: 11, color: "#868E96", marginTop: 4 }}>{settings.phone} | {settings.email}</div>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>پسوولە</div>
              <div style={{ fontSize: 12, color: "#495057", marginBottom: 3 }}><strong>ژمارە:</strong> {selectedOrder.orderNumber}</div>
              <div style={{ fontSize: 12, color: "#495057", marginBottom: 3 }}><strong>بەروار:</strong> {selectedOrder.createdAt}</div>
              <div style={{ fontSize: 12 }}><strong>بارودۆخ:</strong> <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: selectedOrder.status === "PAID" ? "#D3F9D8" : "#FFF3BF", color: selectedOrder.status === "PAID" ? "#2B8A3E" : "#E67700" }}>{statusLabels[selectedOrder.status]}</span></div>
            </div>
          </div>
        );
      case "parties":
        return (
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>کڕیار</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.clientName}</div>
              {client && <div style={{ fontSize: 11, color: "#6C757D", marginTop: 3 }}>{client.phone} — {client.city}</div>}
            </div>
            <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>نوێنەر</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.repName}</div>
            </div>
            {selectedOrder.warehouseName && (
              <div style={{ flex: 1, background: "#F8F9FA", borderRadius: 10, padding: 16, border: "1px solid #E9ECEF" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ADB5BD", fontWeight: 700, marginBottom: 6 }}>کۆگا</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedOrder.warehouseName}</div>
              </div>
            )}
          </div>
        );
      case "items":
        return (
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
      case "summary":
        return (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
            <div style={{ width: 320, border: "1px solid #E9ECEF", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}>
                <span style={{ color: "#6C757D" }}>کۆی نرخ</span><span style={{ fontWeight: 700 }}>{formatIQD(subtotal)}</span>
              </div>
              {customDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}>
                <span style={{ color: "#6C757D" }}>داشکاندن ({customDiscount}٪)</span><span style={{ fontWeight: 700, color: "#FA5252" }}>-{formatIQD(discountAmount)}</span>
              </div>}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(135deg, #4263EB, #7C5CFC)" }}>
                <span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>کۆی گشتی</span>
                <span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>{formatIQD(finalTotal)}</span>
              </div>
            </div>
          </div>
        );
      case "bonus":
        return selectedOrder.totalBonusPct > 0 ? (
          <div style={{ padding: 14, background: "#F3F0FF", borderRadius: 10, marginBottom: 16, border: "1px solid #E8E0FF" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7C5CFC", marginBottom: 4 }}>شیکاری بۆنەس</div>
            <div style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی گشتی: {selectedOrder.totalBonusPct}٪ | کۆگا: {selectedOrder.warehouseBonusPct}٪ | نوێنەر: {selectedOrder.repBonusPct}٪</div>
          </div>
        ) : null;
      case "note":
        return customNote ? (
          <div style={{ padding: 14, background: "#FFF8DB", borderRadius: 10, marginBottom: 16, border: "1px solid #FFE066" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#E67700", marginBottom: 4 }}>تێبینی</div>
            <div style={{ fontSize: 12, color: "#495057" }}>{customNote}</div>
          </div>
        ) : null;
      case "terms":
        return customTerms ? (
          <div style={{ padding: 14, background: "#E8F5E9", borderRadius: 10, marginBottom: 16, border: "1px solid #A5D6A7" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2E7D32", marginBottom: 4 }}>مەرجەکان</div>
            <div style={{ fontSize: 12, color: "#495057", whiteSpace: "pre-line" }}>{customTerms}</div>
          </div>
        ) : null;
      case "qr":
        return qrSvg ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: 100, height: 100, lineHeight: 0 }} />
            <span style={{ fontSize: 8, color: "#ADB5BD", fontWeight: 600 }}>سکان بکە بۆ زانیاری دارایی</span>
          </div>
        ) : null;
      case "signature":
        return (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, padding: "16px 0" }}>
            <div style={{ textAlign: "center", flex: 1 }}><div style={{ width: 140, borderBottom: "1px solid #ADB5BD", margin: "30px auto 8px" }} /><div style={{ fontSize: 11, color: "#6C757D" }}>واژووی فرۆشیار</div></div>
            <div style={{ textAlign: "center", flex: 1 }}><div style={{ width: 140, borderBottom: "1px solid #ADB5BD", margin: "30px auto 8px" }} /><div style={{ fontSize: 11, color: "#6C757D" }}>واژووی کڕیار</div></div>
          </div>
        );
      case "footer":
        return (
          <div style={{ borderTop: "2px solid #E9ECEF", paddingTop: 16, marginTop: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#868E96", fontWeight: 600 }}>سوپاس بۆ هاوکارییەکەتان — {settings.name}</p>
            <p style={{ fontSize: 11, color: "#CED4DA", marginTop: 4 }}>{settings.phone} | {settings.email} | {settings.address}</p>
          </div>
        );
      default: return null;
    }
  };

  // ==================== PRINT HTML BUILDER ====================
  const buildInvoiceHTML = () => {
    if (!selectedOrder || !client) return "";
    const logoHTML = settings.logo ? `<img src="${settings.logo}" class="inv-logo" alt="logo" />` : `<div class="inv-logo-fallback">د</div>`;
    const sc = selectedOrder.status === "PAID" ? "inv-status-paid" : "inv-status-pending";
    const parts: string[] = [];

    for (const block of visibleBlocks) {
      switch (block.id) {
        case "header":
          parts.push(`<div class="inv-header"><div class="inv-logo-wrap">${logoHTML}<div><div class="inv-company-name">${settings.name}</div><div class="inv-company-name-en">${settings.nameEn}</div><div class="inv-company-contact">${settings.phone} | ${settings.email}</div></div></div><div class="inv-title-block"><div class="inv-title">پسوولە</div><div class="inv-meta"><strong>ژمارە:</strong> ${selectedOrder.orderNumber}</div><div class="inv-meta"><strong>بەروار:</strong> ${selectedOrder.createdAt}</div><div class="inv-meta"><strong>بارودۆخ:</strong> <span class="inv-status ${sc}">${statusLabels[selectedOrder.status]}</span></div></div></div>`);
          break;
        case "parties":
          parts.push(`<div class="inv-parties"><div class="inv-party"><div class="inv-party-label">کڕیار</div><div class="inv-party-name">${selectedOrder.clientName}</div>${client ? `<div class="inv-party-detail">${client.phone} — ${client.city}</div>` : ""}</div><div class="inv-party"><div class="inv-party-label">نوێنەر</div><div class="inv-party-name">${selectedOrder.repName}</div></div>${selectedOrder.warehouseName ? `<div class="inv-party"><div class="inv-party-label">کۆگا</div><div class="inv-party-name">${selectedOrder.warehouseName}</div></div>` : ""}</div>`);
          break;
        case "items": {
          const rows = selectedOrder.items.map((item, i) => `<tr><td style="color:#ADB5BD">${i + 1}</td><td style="font-weight:600">${item.productName}</td><td>${item.quantity.toLocaleString()}</td>${showBonusCol ? `<td style="color:#40C057;font-weight:700">+${item.bonusQty}</td>` : ""}<td>${formatIQD(item.unitPrice)}</td><td style="font-weight:800">${formatIQD(item.quantity * item.unitPrice)}</td></tr>`).join("");
          parts.push(`<table class="inv-table"><thead><tr><th>#</th><th>بەرهەم</th><th>بڕ</th>${showBonusCol ? "<th>بۆنەس</th>" : ""}<th>نرخی یەکە</th><th>کۆ</th></tr></thead><tbody>${rows}</tbody></table>`);
          break;
        }
        case "summary": {
          const disc = customDiscount > 0 ? `<div class="inv-summary-row"><span class="inv-summary-label">داشکاندن (${customDiscount}٪)</span><span class="inv-summary-value inv-discount-value">-${formatIQD(discountAmount)}</span></div>` : "";
          parts.push(`<div class="inv-summary"><div class="inv-summary-box"><div class="inv-summary-row"><span class="inv-summary-label">کۆی نرخ</span><span class="inv-summary-value">${formatIQD(subtotal)}</span></div>${disc}<div class="inv-summary-row inv-summary-total"><span class="inv-summary-label">کۆی گشتی</span><span class="inv-summary-value">${formatIQD(finalTotal)}</span></div></div></div>`);
          break;
        }
        case "bonus":
          if (selectedOrder.totalBonusPct > 0) parts.push(`<div class="inv-bonus-info"><div class="inv-bonus-title">شیکاری بۆنەس</div><div class="inv-bonus-detail">بۆنەسی گشتی: ${selectedOrder.totalBonusPct}٪ | کۆگا: ${selectedOrder.warehouseBonusPct}٪ | نوێنەر: ${selectedOrder.repBonusPct}٪</div></div>`);
          break;
        case "note":
          if (customNote) parts.push(`<div class="inv-note"><div class="inv-note-title">تێبینی</div><div class="inv-note-text">${customNote}</div></div>`);
          break;
        case "terms":
          if (customTerms) parts.push(`<div class="inv-terms"><div class="inv-terms-title">مەرجەکان</div><div class="inv-terms-text">${customTerms.replace(/\n/g, "<br/>")}</div></div>`);
          break;
        case "qr":
          if (qrSvg) parts.push(`<div class="inv-qr-wrap">${qrSvg}<div class="inv-qr-label">سکان بکە بۆ زانیاری دارایی</div></div>`);
          break;
        case "signature":
          parts.push(`<div class="inv-signature"><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی فرۆشیار</div></div><div class="inv-sig-box"><div class="inv-sig-line"></div><div class="inv-sig-label">واژووی کڕیار</div></div></div>`);
          break;
        case "footer":
          parts.push(`<div class="inv-footer"><div class="inv-footer-text"><div class="inv-footer-thanks">سوپاس بۆ هاوکارییەکەتان — ${settings.name}</div><div class="inv-footer-contact">${settings.phone} | ${settings.email} | ${settings.address}</div></div></div>`);
          break;
      }
    }
    return `<html dir="rtl" lang="ckb"><head><title>پسوولە — ${selectedOrder.orderNumber}</title><style>${PRINT_CSS}</style></head><body><div class="inv-page">${parts.join("")}</div></body></html>`;
  };

  const handlePrint = () => {
    const html = buildInvoiceHTML();
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  };

  // ==================== RENDER ====================
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#E8F5E9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#2E7D32" }}><FileText size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>پسوولە و وەسڵ</h1><p style={{ fontSize: 13, color: "#6C757D" }}>دروستکردن و چاپکردنی پسوولە بۆ داواکارییەکان</p></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* LEFT PANEL: Order List + Block Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Order List */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 13 }}>هەڵبژاردنی داواکاری</div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {orders.length === 0 ? <p style={{ padding: 20, textAlign: "center", color: "#ADB5BD", fontSize: 12 }}>هیچ داواکارییەک نییە</p> : orders.map(o => (
                <div key={o.id} onClick={() => { setSelectedOrderId(o.id); setCustomNote(""); setCustomTerms(""); setCustomDiscount(0); }} style={{
                  padding: "10px 16px", borderBottom: "1px solid #F1F3F5", cursor: "pointer",
                  background: selectedOrderId === o.id ? "#EDF2FF" : "white",
                  borderRight: selectedOrderId === o.id ? "3px solid #4263EB" : "3px solid transparent",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{o.orderNumber}</span>
                    <span style={{ fontSize: 10, color: "#ADB5BD" }}>{o.createdAt}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#6C757D" }}>{o.clientName}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{formatIQD(o.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block Editor (drag & drop) */}
          {selectedOrder && (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                بلۆکەکان
                <span style={{ fontSize: 10, color: "#ADB5BD", fontWeight: 400 }}>ڕاکێشە بۆ ڕێکخستن</span>
              </div>
              <div style={{ padding: 8 }}>
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 8, marginBottom: 4, cursor: "grab", fontSize: 12,
                      background: dragOverIdx === idx ? "#EDF2FF" : dragIdx === idx ? "#F8F9FA" : "transparent",
                      border: dragOverIdx === idx ? "1px dashed #4263EB" : "1px solid transparent",
                      opacity: block.visible ? 1 : 0.4,
                      transition: "all 0.15s",
                    }}
                  >
                    <GripVertical size={14} color="#CED4DA" style={{ flexShrink: 0 }} />
                    <span style={{ color: "#6C757D", flexShrink: 0 }}>{block.icon}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: "#495057" }}>{block.label}</span>
                    <button
                      onClick={() => toggleBlock(block.id)}
                      disabled={block.required}
                      style={{
                        width: 24, height: 24, borderRadius: 6, border: "none", cursor: block.required ? "default" : "pointer",
                        background: block.visible ? "#4263EB" : "#E9ECEF", color: block.visible ? "white" : "#ADB5BD",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0,
                      }}
                    >
                      {block.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {selectedOrder && (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>ڕێکخستنەکان</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#495057", display: "block", marginBottom: 4 }}>داشکاندن (٪)</label>
                <input type="number" min="0" max="100" value={customDiscount} onChange={(e) => setCustomDiscount(Number(e.target.value))} style={{ width: "100%", padding: "7px 10px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#495057", display: "block", marginBottom: 4 }}>تێبینی</label>
                <textarea value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="تێبینی ئارەزوومەندانە..." rows={2} style={{ width: "100%", padding: "7px 10px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#495057", display: "block", marginBottom: 4 }}>مەرجەکان</label>
                <textarea value={customTerms} onChange={(e) => setCustomTerms(e.target.value)} placeholder="مەرجی پارەدان، گەڕاندنەوە..." rows={2} style={{ width: "100%", padding: "7px 10px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#6C757D", cursor: "pointer" }}>
                <input type="checkbox" checked={showBonusCol} onChange={(e) => setShowBonusCol(e.target.checked)} style={{ width: 14, height: 14 }} />
                پیشاندانی ستوونی بۆنەس لە خشتەدا
              </label>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Invoice Preview */}
        <div>
          {!selectedOrder ? (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 60, textAlign: "center" }}>
              <FileText size={48} color="#DEE2E6" />
              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 16, color: "#6C757D" }}>داواکارییەک هەڵبژێرە</h3>
              <p style={{ fontSize: 13, color: "#ADB5BD", marginTop: 4 }}>لە لیستی لای ڕاست داواکارییەک هەڵبژێرە بۆ دروستکردنی پسوولە</p>
            </div>
          ) : (
            <>
              {/* Print Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={handlePrint} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(66,99,235,0.3)" }}>
                  <Printer size={16} /> چاپکردن
                </button>
              </div>

              {/* Live Invoice Preview */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 40, minHeight: 500 }}>
                {visibleBlocks.map(block => {
                  const content = renderBlockPreview(block);
                  return content ? <div key={block.id}>{content}</div> : null;
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
