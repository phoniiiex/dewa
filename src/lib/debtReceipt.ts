/**
 * buildDebtReceiptHTML
 * Generates a fully self-contained, printable HTML receipt
 * for a client debt-payment transaction.
 *
 * Structure:
 *  ┌── Document Header ──────────────────────────────────────┐
 *  │  Store Name  |  Business Description  |  Document Title │
 *  ├── Company Contact Info ─────────────────────────────────┤
 *  │  Physical Address  |  Contact Person & Phone Number     │
 *  ├── Transaction Details ──────────────────────────────────┤
 *  │  All order numbers for this payment  |  Date            │
 *  ├── Payment Details ──────────────────────────────────────┤
 *  │  Received By  |  Receiver Name  |  Amount in Words      │
 *  ├── Financial Table ──────────────────────────────────────┤
 *  │  Amount Before Discount | Discount | After | Total | IQD│
 *  └─────────────────────────────────────────────────────────┘
 */

import type { Order, CompanySettings } from "@/lib/types";

// ── Arabic / Kurdish number-to-words (simplified IQD) ──────────────────────
function amountInWords(amount: number): string {
  if (amount === 0) return "سفر دینار";
  const ones = ["", "یەک", "دوو", "سێ", "چوار", "پێنج", "شەش", "حەوت", "هەشت", "نۆ", "دە",
    "یازدە", "دوازدە", "سیازدە", "چواردە", "پازدە", "شازدە", "حەڤدە", "هەژدە", "نۆزدە"];
  const tens  = ["", "", "بیست", "سی", "چل", "پەنجا", "شەست", "حەفتا", "هەشتا", "نەوەد"];
  const pows  = ["", "هەزار", "ملیۆن", "ملیار"];

  function chunk(n: number): string {
    if (n === 0) return "";
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (h > 0) result += ones[h] + " سەد ";
    if (t > 1)  result += tens[t] + (o > 0 ? " و " + ones[o] : "");
    else if (t === 1) result += ones[10 + o];
    else if (o > 0)  result += ones[o];
    return result.trim();
  }

  const groups: string[] = [];
  let remaining = Math.round(amount);
  let idx = 0;
  while (remaining > 0) {
    const g = remaining % 1000;
    if (g !== 0) groups.unshift(chunk(g) + (pows[idx] ? " " + pows[idx] : ""));
    remaining = Math.floor(remaining / 1000);
    idx++;
  }
  return groups.join(" و ") + " دینار";
}

// ── Main builder ────────────────────────────────────────────────────────────
export function buildDebtReceiptHTML(
  clientName: string,
  orders: Order[],
  totalAmount: number,
  discount: number,
  receivedBy: string,
  settings: CompanySettings | null
): string {
  const afterDiscount = totalAmount - discount;
  const now  = new Date();
  const date = now.toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString("ku", { hour: "2-digit", minute: "2-digit" });
  const companyName = settings?.name || "کۆمپانیا";
  const companyAddr = settings?.address || "";
  const companyCity = settings?.city || "";
  const companyPhone = settings?.phone || "";
  const currency    = settings?.currency || "IQD";
  const receiptNo   = `REC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;
  const orderNums   = orders.map(o => o.orderNumber).join("  |  ");
  const amtWords    = amountInWords(afterDiscount);

  const fmt = (n: number) => new Intl.NumberFormat("ar-IQ").format(n);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
<meta charset="UTF-8">
<title>وەسڵی پارەدان — ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Naskh Arabic', 'Segoe UI', Arial, sans-serif;
    direction: rtl;
    color: #1a1a2e;
    background: #fff;
    font-size: 13px;
    line-height: 1.6;
  }

  .page {
    width: 210mm;
    min-height: 148mm;
    margin: 0 auto;
    padding: 12mm 14mm;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 10px;
    border-bottom: 2.5px solid #1a1a2e;
    margin-bottom: 14px;
  }
  .company-block { display: flex; flex-direction: column; gap: 3px; }
  .company-name  { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 0.5px; }
  .company-desc  { font-size: 11px; color: #555; margin-top: 1px; }
  .doc-title-block { text-align: left; }
  .doc-title     { font-size: 18px; font-weight: 700; color: #1a1a2e; border: 2px solid #1a1a2e; padding: 4px 14px; border-radius: 6px; display: inline-block; }
  .receipt-no    { font-size: 11px; color: #777; margin-top: 4px; }

  /* ── TWO-COLUMN INFO BAND ── */
  .info-band {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .info-section {
    padding: 10px 14px;
    border-left: 1px solid #ddd;
  }
  .info-section:last-child { border-left: none; }
  .info-section-title {
    font-size: 10px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px dashed #e0e0e0;
  }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
  .info-label { color: #666; }
  .info-value { font-weight: 600; color: #1a1a2e; }

  /* ── AMOUNT IN WORDS ── */
  .words-band {
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .words-label { font-size: 11px; color: #777; white-space: nowrap; }
  .words-value { font-size: 13px; font-weight: 700; color: #1a1a2e; flex: 1; }

  /* ── FINANCIAL TABLE ── */
  .fin-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }
  .fin-table thead tr {
    background: #1a1a2e;
    color: #fff;
  }
  .fin-table th, .fin-table td {
    padding: 9px 14px;
    text-align: center;
    border-left: 1px solid rgba(255,255,255,0.15);
    font-size: 12px;
  }
  .fin-table th { font-weight: 700; font-size: 11px; letter-spacing: 0.4px; }
  .fin-table tbody tr { background: #fff; }
  .fin-table tbody tr:nth-child(even) { background: #fafafa; }
  .fin-table td { border-color: #eee; color: #1a1a2e; font-weight: 600; }
  .fin-table .total-row td { background: #eef2ff; font-weight: 800; font-size: 14px; }
  .fin-table .total-row .grand { color: #2b6cb0; font-size: 15px; }
  .currency { font-size: 10px; color: #888; font-weight: 400; }

  /* ── ORDER NUMBERS ── */
  .orders-band {
    background: #f0f4ff;
    border: 1px solid #c7d7fd;
    border-radius: 8px;
    padding: 8px 14px;
    margin-bottom: 14px;
  }
  .orders-title { font-size: 10px; color: #4263eb; font-weight: 700; margin-bottom: 4px; }
  .orders-nums  { font-size: 12px; color: #1a1a2e; font-weight: 600; line-height: 1.8; }

  /* ── FOOTER ── */
  .footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px dashed #ccc;
  }
  .sig-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .sig-line {
    width: 100%;
    height: 1px;
    background: #1a1a2e;
    margin-bottom: 4px;
  }
  .sig-label { font-size: 11px; color: #555; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 8mm 10mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ══ DOCUMENT HEADER ══ -->
  <div class="header">
    <div class="company-block">
      <div class="company-name">${companyName}</div>
      <div class="company-desc">فرۆشتنی دەرمان و بەرهەمی پزیشکی</div>
      <div class="company-desc" style="margin-top:4px; color:#444;">
        📍 ${companyAddr}${companyCity ? "، " + companyCity : ""}
        ${companyPhone ? "  &nbsp;|&nbsp;  📞 " + companyPhone : ""}
      </div>
    </div>
    <div class="doc-title-block">
      <div class="doc-title">وەسڵی پارەدان</div>
      <div class="receipt-no" style="text-align:center; margin-top:6px;">${receiptNo}</div>
      <div class="receipt-no" style="text-align:center; color:#555;">${date} — ${time}</div>
    </div>
  </div>

  <!-- ══ INFO BAND ══ -->
  <div class="info-band">
    <!-- Transaction Details -->
    <div class="info-section">
      <div class="info-section-title">وردەکاری کڕیار</div>
      <div class="info-row"><span class="info-label">کڕیار</span><span class="info-value">${clientName}</span></div>
      <div class="info-row"><span class="info-label">بەروار</span><span class="info-value">${date}</span></div>
      <div class="info-row"><span class="info-label">کات</span><span class="info-value">${time}</span></div>
    </div>
    <!-- Payment Details -->
    <div class="info-section">
      <div class="info-section-title">وردەکاری پارەدان</div>
      <div class="info-row"><span class="info-label">وەرگیراوە لە لایەن</span><span class="info-value">${receivedBy || "—"}</span></div>
      <div class="info-row"><span class="info-label">ژمارەی داواکارییەکان</span><span class="info-value">${orders.length}</span></div>
    </div>
  </div>

  <!-- ══ ORDER NUMBERS ══ -->
  ${orders.length > 0 ? `
  <div class="orders-band">
    <div class="orders-title">ژمارەی داواکارییەکانی پارەدراو</div>
    <div class="orders-nums">${orderNums}</div>
  </div>` : ""}

  <!-- ══ AMOUNT IN WORDS ══ -->
  <div class="words-band">
    <span class="words-label">بڕ بە پیت:</span>
    <span class="words-value">${amtWords}</span>
  </div>

  <!-- ══ FINANCIAL TABLE ══ -->
  <table class="fin-table">
    <thead>
      <tr>
        <th>بڕی پێش داشکاندن</th>
        <th>داشکاندن</th>
        <th>بڕی دوای داشکاندن</th>
        <th>کۆی گشتی</th>
        <th>دراو</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${fmt(totalAmount)} <span class="currency">${currency}</span></td>
        <td style="color:${discount > 0 ? "#e53e3e" : "#aaa"}">
          ${discount > 0 ? fmt(discount) + " <span class=\"currency\">" + currency + "</span>" : "—"}
        </td>
        <td>${fmt(afterDiscount)} <span class="currency">${currency}</span></td>
        <td>${fmt(afterDiscount)} <span class="currency">${currency}</span></td>
        <td>${currency}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right; font-size:12px; color:#555;">کۆی گشتی پارەدراو</td>
        <td class="grand" colspan="1">${fmt(afterDiscount)}</td>
        <td>${currency}</td>
      </tr>
    </tfoot>
  </table>

  <!-- ══ SIGNATURE FOOTER ══ -->
  <div class="footer">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">واژووی وەرگر</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">واژووی دەردەر</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">واژووی کڕیار</div>
    </div>
  </div>

</div>

<script>
  window.onload = function() { window.print(); };
</script>
</body>
</html>`;
}
