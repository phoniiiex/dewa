"use client";
import { useState, useEffect } from "react";
import { FileText, Printer, Edit3, Eye, QrCode } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import { generateQRSvg } from "@/lib/qr-c2";

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
  .inv-table thead th:first-child { border-radius: 0 8px 0 0; }
  .inv-table thead th:last-child { border-radius: 8px 0 0 0; }
  .inv-table tbody td { padding: 11px 16px; font-size: 13px; border-bottom: 1px solid #F1F3F5; }
  .inv-table tbody tr:last-child td { border-bottom: none; }
  .inv-table tbody tr:nth-child(even) { background: #FAFBFC; }
  .inv-bonus-cell { color: #40C057; font-weight: 700; }
  .inv-total-cell { font-weight: 800; color: #1A1A2E; }
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
  .inv-footer { border-top: 2px solid #E9ECEF; padding-top: 16px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .inv-footer-text { text-align: center; flex: 1; }
  .inv-footer-thanks { font-size: 13px; color: #868E96; font-weight: 600; }
  .inv-footer-contact { font-size: 11px; color: #CED4DA; margin-top: 4px; }
  .inv-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .inv-qr-wrap svg { width: 100px; height: 100px; }
  .inv-qr-label { font-size: 8px; color: #ADB5BD; font-weight: 600; text-align: center; }
  .inv-watermark { position: fixed; bottom: 20px; left: 20px; font-size: 10px; color: #DEE2E6; }
  @media print {
    body { padding: 0; }
    .inv-page { padding: 20px; }
    .inv-header { border-bottom-color: #4263EB !important; }
    .inv-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv-summary-total { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .inv-bonus-info, .inv-note, .inv-party { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export default function InvoicesPage() {
  const { orders, clients, settings } = useData();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [customDiscount, setCustomDiscount] = useState(0);
  const [showLogo, setShowLogo] = useState(true);
  const [showBonus, setShowBonus] = useState(true);
  const [showQR, setShowQR] = useState(true);
  const [qrSvg, setQrSvg] = useState<string>("");

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const client = selectedOrder ? clients.find(c => c.id === selectedOrder.clientId) : null;
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };

  const subtotal = selectedOrder ? selectedOrder.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
  const discountAmount = subtotal * (customDiscount / 100);
  const finalTotal = subtotal - discountAmount;

  // Generate QR code when order/client changes — embed data in URL so it works on any device
  useEffect(() => {
    if (!selectedOrder || !client) { setQrSvg(""); return; }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    // Build compact financial summary for the QR
    const clientOrders = orders.filter(o => o.clientId === client.id);
    const totalAmount = clientOrders.reduce((s, o) => s + o.totalAmount, 0);
    const paidCount = clientOrders.filter(o => o.status === "PAID").length;
    const data = {
      n: client.name,
      t: client.type,
      p: client.phone,
      c: client.city,
      b: client.balance,
      o: clientOrders.length,
      ta: totalAmount,
      pc: paidCount,
      co: settings.name,
      ce: settings.nameEn,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${baseUrl}/client/${client.id}#d=${encoded}`;
    generateQRSvg(url, 200).then(svg => setQrSvg(svg)).catch(() => setQrSvg(""));
  }, [selectedOrder, client, orders, settings]);

  const buildInvoiceHTML = () => {
    if (!selectedOrder) return "";
    const logoHTML = showLogo ? (settings.logo
      ? `<img src="${settings.logo}" class="inv-logo" alt="logo" />`
      : `<div class="inv-logo-fallback">د</div>`) : "";
    const statusClass = selectedOrder.status === "PAID" ? "inv-status-paid" : "inv-status-pending";
    const itemsHTML = selectedOrder.items.map((item, i) => `
      <tr>
        <td style="color:#ADB5BD">${i + 1}</td>
        <td style="font-weight:600">${item.productName}</td>
        <td>${item.quantity.toLocaleString()}</td>
        ${showBonus ? `<td class="inv-bonus-cell">+${item.bonusQty}</td>` : ""}
        <td>${formatIQD(item.unitPrice)}</td>
        <td class="inv-total-cell">${formatIQD(item.quantity * item.unitPrice)}</td>
      </tr>`).join("");
    const bonusHTML = showBonus && selectedOrder.totalBonusPct > 0 ? `
      <div class="inv-bonus-info">
        <div class="inv-bonus-title">شیکاری بۆنەس</div>
        <div class="inv-bonus-detail">بۆنەسی گشتی: ${selectedOrder.totalBonusPct}٪ | کۆگا: ${selectedOrder.warehouseBonusPct}٪ | نوێنەر: ${selectedOrder.repBonusPct}٪</div>
      </div>` : "";
    const noteHTML = customNote ? `
      <div class="inv-note"><div class="inv-note-title">تێبینی</div><div class="inv-note-text">${customNote}</div></div>` : "";
    const discountHTML = customDiscount > 0 ? `
      <div class="inv-summary-row"><span class="inv-summary-label">داشکاندن (${customDiscount}٪)</span><span class="inv-summary-value inv-discount-value">-${formatIQD(discountAmount)}</span></div>` : "";
    const qrHTML = showQR && qrSvg ? `
      <div class="inv-qr-wrap">
        ${qrSvg}
        <div class="inv-qr-label">سکان بکە بۆ زانیاری دارایی</div>
      </div>` : "";

    return `<html dir="rtl" lang="ckb"><head><title>پسوولە — ${selectedOrder.orderNumber}</title><style>${PRINT_CSS}</style></head><body>
    <div class="inv-page">
      <div class="inv-header">
        <div class="inv-logo-wrap">${logoHTML}<div><div class="inv-company-name">${settings.name}</div><div class="inv-company-name-en">${settings.nameEn}</div><div class="inv-company-contact">${settings.phone} | ${settings.email}</div></div></div>
        <div class="inv-title-block"><div class="inv-title">پسوولە</div><div class="inv-meta"><strong>ژمارە:</strong> ${selectedOrder.orderNumber}</div><div class="inv-meta"><strong>بەروار:</strong> ${selectedOrder.createdAt}</div><div class="inv-meta"><strong>بارودۆخ:</strong> <span class="inv-status ${statusClass}">${statusLabels[selectedOrder.status] || selectedOrder.status}</span></div></div>
      </div>
      <div class="inv-parties">
        <div class="inv-party"><div class="inv-party-label">کڕیار</div><div class="inv-party-name">${selectedOrder.clientName}</div>${client ? `<div class="inv-party-detail">${client.phone} — ${client.city}</div>` : ""}</div>
        <div class="inv-party"><div class="inv-party-label">نوێنەر</div><div class="inv-party-name">${selectedOrder.repName}</div></div>
        ${selectedOrder.warehouseName ? `<div class="inv-party"><div class="inv-party-label">کۆگا</div><div class="inv-party-name">${selectedOrder.warehouseName}</div></div>` : ""}
      </div>
      <table class="inv-table"><thead><tr><th>#</th><th>بەرهەم</th><th>بڕ</th>${showBonus ? "<th>بۆنەس</th>" : ""}<th>نرخی یەکە</th><th>کۆ</th></tr></thead><tbody>${itemsHTML}</tbody></table>
      <div class="inv-summary"><div class="inv-summary-box">
        <div class="inv-summary-row"><span class="inv-summary-label">کۆی نرخ</span><span class="inv-summary-value">${formatIQD(subtotal)}</span></div>
        ${discountHTML}
        <div class="inv-summary-row inv-summary-total"><span class="inv-summary-label">کۆی گشتی</span><span class="inv-summary-value">${formatIQD(finalTotal)}</span></div>
      </div></div>
      ${bonusHTML}${noteHTML}
      <div class="inv-footer">
        ${qrHTML}
        <div class="inv-footer-text"><div class="inv-footer-thanks">سوپاس بۆ هاوکارییەکەتان — ${settings.name}</div><div class="inv-footer-contact">${settings.phone} | ${settings.email} | ${settings.address}</div></div>
      </div>
    </div></body></html>`;
  };

  const handlePrint = () => {
    const html = buildInvoiceHTML();
    if (!html) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
  };

  // For the in-page preview, render same structure
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#E8F5E9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#2E7D32" }}><FileText size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>پسوولە و وەسڵ</h1><p style={{ fontSize: 13, color: "#6C757D" }}>دروستکردن و چاپکردنی پسوولە بۆ داواکارییەکان</p></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        {/* Left: Order List */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 14 }}>هەڵبژاردنی داواکاری</div>
          <div style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
            {orders.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", color: "#ADB5BD", fontSize: 13 }}>هیچ داواکارییەک نییە</p>
            ) : orders.map(o => (
              <div key={o.id} onClick={() => { setSelectedOrderId(o.id); setCustomNote(""); setCustomDiscount(0); }} style={{
                padding: "14px 20px", borderBottom: "1px solid #F1F3F5", cursor: "pointer",
                background: selectedOrderId === o.id ? "#EDF2FF" : "white",
                borderRight: selectedOrderId === o.id ? "3px solid #4263EB" : "3px solid transparent",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{o.orderNumber}</span>
                  <span style={{ fontSize: 11, color: "#ADB5BD" }}>{o.createdAt}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#6C757D" }}>{o.clientName}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{formatIQD(o.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Invoice Preview & Editor */}
        <div>
          {!selectedOrder ? (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 60, textAlign: "center" }}>
              <FileText size={48} color="#DEE2E6" />
              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 16, color: "#6C757D" }}>داواکارییەک هەڵبژێرە</h3>
              <p style={{ fontSize: 13, color: "#ADB5BD", marginTop: 4 }}>لە لیستی لای ڕاست داواکارییەک هەڵبژێرە بۆ دروستکردنی پسوولە</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setEditMode(!editMode)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DEE2E6", background: editMode ? "#EDF2FF" : "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, color: editMode ? "#4263EB" : "#6C757D" }}>
                    {editMode ? <><Eye size={14} /> پیشاندان</> : <><Edit3 size={14} /> دەستکاری</>}
                  </button>
                  <label style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, color: "#6C757D" }}>
                    <input type="checkbox" checked={showBonus} onChange={(e) => setShowBonus(e.target.checked)} style={{ width: 14, height: 14 }} /> بۆنەس
                  </label>
                  <label style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, color: "#6C757D" }}>
                    <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} style={{ width: 14, height: 14 }} /> لۆگۆ
                  </label>
                  <label style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DEE2E6", background: showQR ? "#F3F0FF" : "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, color: showQR ? "#7C5CFC" : "#6C757D" }}>
                    <input type="checkbox" checked={showQR} onChange={(e) => setShowQR(e.target.checked)} style={{ width: 14, height: 14 }} /> <QrCode size={14} /> QR
                  </label>
                </div>
                <button onClick={handlePrint} style={{ padding: "8px 20px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  <Printer size={14} /> چاپکردن
                </button>
              </div>

              {/* Editor fields */}
              {editMode && (
                <div style={{ background: "#F8F9FA", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", gap: 16, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#495057", display: "block", marginBottom: 4 }}>داشکاندن (٪)</label>
                    <input type="number" min="0" max="100" value={customDiscount} onChange={(e) => setCustomDiscount(Number(e.target.value))} style={{ width: "100%", padding: "8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white" }} />
                  </div>
                  <div style={{ flex: 3 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#495057", display: "block", marginBottom: 4 }}>تێبینی تایبەت</label>
                    <input type="text" value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="تێبینی ئارەزوومەندانە بۆ پسوولەکە..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "white" }} />
                  </div>
                </div>
              )}

              {/* Invoice Preview (same design as print) */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", padding: 40, minHeight: 500 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "3px solid #4263EB" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {showLogo && (settings.logo ? (
                      <img src={settings.logo} alt="logo" style={{ width: 60, height: 60, borderRadius: 14, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 60, height: 60, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 26, fontWeight: 800 }}>د</div>
                    ))}
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

                {/* Parties */}
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

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, borderRadius: 10, overflow: "hidden" }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2B55)" }}>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white", borderRadius: "0 8px 0 0" }}>#</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بەرهەم</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بڕ</th>
                      {showBonus && <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>بۆنەس</th>}
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white" }}>نرخی یەکە</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "white", borderRadius: "8px 0 0 0" }}>کۆ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 1 ? "#FAFBFC" : "white", borderBottom: "1px solid #F1F3F5" }}>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#ADB5BD" }}>{i + 1}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13 }}>{item.quantity.toLocaleString()}</td>
                        {showBonus && <td style={{ padding: "11px 16px", fontSize: 13, color: "#40C057", fontWeight: 700 }}>+{item.bonusQty}</td>}
                        <td style={{ padding: "11px 16px", fontSize: 13 }}>{formatIQD(item.unitPrice)}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 800 }}>{formatIQD(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
                  <div style={{ width: 320, border: "1px solid #E9ECEF", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}>
                      <span style={{ color: "#6C757D" }}>کۆی نرخ</span>
                      <span style={{ fontWeight: 700 }}>{formatIQD(subtotal)}</span>
                    </div>
                    {customDiscount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #F1F3F5" }}>
                        <span style={{ color: "#6C757D" }}>داشکاندن ({customDiscount}٪)</span>
                        <span style={{ fontWeight: 700, color: "#FA5252" }}>-{formatIQD(discountAmount)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(135deg, #4263EB, #7C5CFC)" }}>
                      <span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>کۆی گشتی</span>
                      <span style={{ color: "white", fontSize: 16, fontWeight: 800 }}>{formatIQD(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                {showBonus && selectedOrder.totalBonusPct > 0 && (
                  <div style={{ padding: 14, background: "#F3F0FF", borderRadius: 10, marginBottom: 16, border: "1px solid #E8E0FF" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7C5CFC", marginBottom: 4 }}>شیکاری بۆنەس</div>
                    <div style={{ fontSize: 12, color: "#6C757D" }}>بۆنەسی گشتی: {selectedOrder.totalBonusPct}٪ | کۆگا: {selectedOrder.warehouseBonusPct}٪ | نوێنەر: {selectedOrder.repBonusPct}٪</div>
                  </div>
                )}
                {customNote && (
                  <div style={{ padding: 14, background: "#FFF8DB", borderRadius: 10, marginBottom: 16, border: "1px solid #FFE066" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#E67700", marginBottom: 4 }}>تێبینی</div>
                    <div style={{ fontSize: 12, color: "#495057" }}>{customNote}</div>
                  </div>
                )}

                {/* Footer with QR */}
                <div style={{ borderTop: "2px solid #E9ECEF", paddingTop: 16, marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {showQR && qrSvg && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: 100, height: 100, lineHeight: 0 }} />
                      <span style={{ fontSize: 8, color: "#ADB5BD", fontWeight: 600 }}>سکان بکە بۆ زانیاری دارایی</span>
                    </div>
                  )}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <p style={{ fontSize: 13, color: "#868E96", fontWeight: 600 }}>سوپاس بۆ هاوکارییەکەتان — {settings.name}</p>
                    <p style={{ fontSize: 11, color: "#CED4DA", marginTop: 4 }}>{settings.phone} | {settings.email} | {settings.address}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
