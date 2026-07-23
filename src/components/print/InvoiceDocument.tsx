"use client";
// ============================================================
// DEWA — InvoiceDocument (Printable Invoice Renderer)
//
// Renders a printable invoice based on an InvoiceTemplate config.
// Only renders sections/fields that are toggled ON in the template.
// Driven entirely by CSS custom properties from the template.
// ============================================================

import type { InvoiceTemplate, SectionStyle, CompanySettings, OrderItem } from "@/lib/types";
import { DEFAULT_SECTION_STYLE } from "@/lib/types";
import { amountInWords } from "@/lib/amount-words";
import { formatIQD } from "@/lib/currency";
import styles from "./InvoiceDocument.module.css";

// ── Font stacks ──────────────────────────────────────────────────────────────

const FONT_STACKS: Record<SectionStyle["fontFamily"], string> = {
  zavi:   "'Zavi Gifts', 'Segoe UI', Tahoma, sans-serif",
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  naskh:  "'Noto Naskh Arabic', 'Segoe UI', sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  order: {
    id: string;
    orderNumber: string;
    clientName: string;
    repName: string;
    items: OrderItem[];
    totalAmount: number;
    notes: string;
    status: string;
    createdAt: string;
  };
  client: {
    name: string;
    balance: number;
    qrToken: string;
  };
  settings: CompanySettings;
  template: InvoiceTemplate;
  qrDataUrl?: string;          // base64 QR image
  printUser?: string;          // who clicked print
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mergeStyle(base: SectionStyle, override: Partial<SectionStyle>): SectionStyle {
  return { ...base, ...override };
}

function sectionCssVars(s: SectionStyle): React.CSSProperties {
  return {
    "--sec-font": FONT_STACKS[s.fontFamily],
    "--sec-size": `${s.fontSize}px`,
    "--sec-weight": String(s.fontWeight),
    "--sec-color": s.color,
    "--sec-bg": s.bgColor,
    "--sec-accent": s.accentColor,
    "--sec-radius": `${s.borderRadius}px`,
    "--sec-border-w": `${s.borderWidth}px`,
    "--sec-border-c": s.borderColor,
    "--sec-pad": `${s.padding}px`,
    "--sec-align": s.textAlign,
  } as React.CSSProperties;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toLocaleDateString("ku", { year: "numeric", month: "long", day: "numeric" }),
    time: now.toLocaleTimeString("ku", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { order, client, settings, template: t, qrDataUrl, printUser } = data;

  const globalStyle: SectionStyle = { ...DEFAULT_SECTION_STYLE, fontFamily: t.globalFont, accentColor: t.primaryColor };
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discount = t.defaultDiscount > 0 ? subtotal * (t.defaultDiscount / 100) : 0;
  const netTotal = subtotal - discount;
  const { date: printDate, time: printTime } = formatDateTime();
  const activeColumns = getActiveColumns(t);

  return (
    <div
      className={`${styles.page} ${styles[t.paperSize]}`}
      style={{
        "--inv-font": FONT_STACKS[t.globalFont],
        "--inv-accent": t.primaryColor,
      } as React.CSSProperties}
      dir="rtl"
    >
      {/* Watermark */}
      {t.watermark && <div className={styles.watermark}>{t.watermark}</div>}

      {/* ═══ HEADER ═══ */}
      {t.showHeader && (
        <header
          className={`${styles.section} ${styles.header} ${styles[`header_${t.header.layout}`]}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.header.style))}
        >
          <div className={styles.headerMain}>
            {t.header.showLogo && settings.logo && (
              <img src={settings.logo} alt="Logo" className={styles.logo} />
            )}
            <div className={styles.companyInfo}>
              {t.header.showNameKu && <div className={styles.companyName}>{settings.name}</div>}
              {t.header.showNameEn && settings.nameEn && <div className={styles.companyNameEn}>{settings.nameEn}</div>}
              {t.header.showEstYear && settings.establishedYear && (
                <div className={styles.estYear}>دامەزراوەی {settings.establishedYear}</div>
              )}
              {t.header.showBusinessDesc && settings.businessDesc && (
                <div className={styles.businessDesc}>{settings.businessDesc}</div>
              )}
              {t.header.showAddress && (settings.address || settings.city) && (
                <div className={styles.address}>📍 {settings.address}{settings.city ? `، ${settings.city}` : ""}</div>
              )}
            </div>
          </div>
          {/* Categorized phones */}
          <div className={styles.phones}>
            {t.header.showPhoneAdmin && settings.phoneAdmin && (
              <span>بەڕێوەبەرایەتی: {settings.phoneAdmin}</span>
            )}
            {t.header.showPhoneAccounting && settings.phoneAccounting && (
              <span>ژمێریاری: {settings.phoneAccounting}</span>
            )}
            {t.header.showPhoneIT && settings.phoneIT && (
              <span>کۆمپیوتەر: {settings.phoneIT}</span>
            )}
            {t.header.showPhoneSales && settings.phoneSales && (
              <span>فرۆشتن: {settings.phoneSales}</span>
            )}
          </div>
        </header>
      )}

      {/* ═══ INVOICE META ═══ */}
      {t.showInvoiceMeta && (
        <div
          className={`${styles.section} ${styles.invoiceMeta}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.invoiceMeta.style))}
        >
          <div className={styles.metaTitle}>پسووڵە</div>
          <div className={styles.metaGrid}>
            {t.invoiceMeta.showInvoiceNumber && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ژمارە</span>
                <span className={styles.metaValue}>{order.orderNumber}</span>
              </div>
            )}
            {t.invoiceMeta.showDate && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>بەروار</span>
                <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
              </div>
            )}
            {t.invoiceMeta.showCopyLabel && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>نسخە</span>
                <span className={styles.metaValue}>نسخەی یەکەم</span>
              </div>
            )}
            {t.invoiceMeta.showCustomerName && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>کڕیار</span>
                <span className={styles.metaValue}>{client.name}</span>
              </div>
            )}
            {t.invoiceMeta.showCurrency && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>دراو</span>
                <span className={styles.metaValue}>{settings.currency}</span>
              </div>
            )}
            {t.invoiceMeta.showRepName && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>نوێنەر</span>
                <span className={styles.metaValue}>{order.repName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ITEMS TABLE ═══ */}
      {t.showItemsTable && (
        <div
          className={`${styles.section} ${styles.itemsTable}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.table.style))}
        >
          <table className={`${styles.table} ${styles[`table_${t.table.layout}`]}`}>
            <thead>
              <tr>
                {t.table.showRowNumbers && <th>#</th>}
                {t.table.showProductName && <th>ناوی بەرهەم</th>}
                {t.table.showQuantity && <th>بڕ</th>}
                {t.table.showFreeQty && <th>بۆنەس</th>}
                {t.table.showUnitPrice && <th>نرخی یەکە</th>}
                {t.table.showLineTotal && <th>کۆ</th>}
                {t.table.showExpiryDate && <th>بەسەرچوون</th>}
                {t.table.showCompany && <th>بەرهەمهێنەر</th>}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  {t.table.showRowNumbers && <td>{idx + 1}</td>}
                  {t.table.showProductName && <td>{item.productName}</td>}
                  {t.table.showQuantity && <td>{item.quantity}</td>}
                  {t.table.showFreeQty && <td>{item.bonusQty || "—"}</td>}
                  {t.table.showUnitPrice && <td>{formatIQD(item.unitPrice)}</td>}
                  {t.table.showLineTotal && <td>{formatIQD(item.quantity * item.unitPrice)}</td>}
                  {t.table.showExpiryDate && <td>{item.expiryDate || "—"}</td>}
                  {t.table.showCompany && <td>{item.company || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SUMMARY ═══ */}
      {t.showSummary && (
        <div
          className={`${styles.section} ${styles.summary} ${styles[`summary_${t.summary.position}`]}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.summary.style))}
        >
          <div className={styles.summaryInner}>
            {t.summary.showSubtotal && (
              <div className={styles.summaryRow}>
                <span>کۆی ناخاوەن</span>
                <span>{formatIQD(subtotal)} {settings.currency}</span>
              </div>
            )}
            {t.summary.showDiscount && discount > 0 && (
              <div className={styles.summaryRow}>
                <span>داشکاندن ({t.defaultDiscount}%)</span>
                <span className={styles.discountVal}>{formatIQD(discount)} {settings.currency}</span>
              </div>
            )}
            {t.summary.showNetTotal && (
              <div className={`${styles.summaryRow} ${styles.netTotal}`}>
                <span>کۆی خاوەن</span>
                <span>{formatIQD(netTotal)} {settings.currency}</span>
              </div>
            )}
            {t.summary.showAmountInWords && (
              <div className={styles.amountWords}>
                <span className={styles.wordsLabel}>بڕ بە پیت:</span>
                <span className={styles.wordsValue}>{amountInWords(netTotal)}</span>
              </div>
            )}
            {t.summary.showCustomerBalance && (
              <div className={styles.summaryRow}>
                <span>باڵانسی کڕیار</span>
                <span>{formatIQD(client.balance)} {settings.currency}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ QR + NOTES/TERMS ROW ═══ */}
      {(t.showQR || t.showNotes || t.showTerms) && (
        <div className={`${styles.section} ${styles.qrNotesRow}`}>
          {/* QR Code */}
          {t.showQR && qrDataUrl && (
            <div
              className={styles.qrBlock}
              style={{
                ...sectionCssVars(mergeStyle(globalStyle, t.qr.style)),
                [t.qr.position === "left" ? "order" : ""]: t.qr.position === "left" ? 2 : undefined,
              } as React.CSSProperties}
            >
              <img src={qrDataUrl} alt="QR" width={t.qr.size} height={t.qr.size} className={styles.qrImg} />
              {t.qr.showLabel && <div className={styles.qrLabel}>سکان بکە بۆ بینینی قەرزەکان</div>}
            </div>
          )}

          {/* Notes & Terms */}
          <div className={styles.notesTerms}>
            {t.showNotes && t.footer.showNotes && order.notes && (
              <div className={styles.noteBlock}>
                <div className={styles.noteTitle}>تێبینی</div>
                <div className={styles.noteText}>{order.notes}</div>
              </div>
            )}
            {t.showTerms && t.footer.showTerms && t.footer.customTerms && (
              <div className={styles.termsBlock}>
                <div className={styles.termsTitle}>مەرج و ڕێسا</div>
                <div className={styles.termsText}>{t.footer.customTerms}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SIGNATURE ═══ */}
      {t.showSignature && (
        <div
          className={`${styles.section} ${styles.signatureSection}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.signature.style))}
        >
          {t.signature.labels.slice(0, t.signature.count).map((label, i) => (
            <div key={i} className={styles.sigBox}>
              {t.signature.showLine && <div className={styles.sigLine} />}
              <div className={styles.sigLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      {t.showFooter && (
        <footer
          className={`${styles.section} ${styles.footer}`}
          style={sectionCssVars(mergeStyle(globalStyle, t.footer.style))}
        >
          {t.footer.showSystemUser && printUser && (
            <span>بەکارهێنەر: {printUser}</span>
          )}
          {t.footer.showPrintDateTime && (
            <span>{printDate} — {printTime}</span>
          )}
          {t.footer.showPrintUsername && printUser && (
            <span>چاپکراوە لەلایەن: {printUser}</span>
          )}
          {t.footer.showPageNumber && (
            <span className={styles.pageNum}>لاپەڕە <span className={styles.pageCounter} /></span>
          )}
        </footer>
      )}
    </div>
  );
}

// Helper to count active columns for table spanning
function getActiveColumns(t: InvoiceTemplate): number {
  let count = 0;
  if (t.table.showRowNumbers) count++;
  if (t.table.showProductName) count++;
  if (t.table.showQuantity) count++;
  if (t.table.showFreeQty) count++;
  if (t.table.showUnitPrice) count++;
  if (t.table.showLineTotal) count++;
  if (t.table.showExpiryDate) count++;
  if (t.table.showCompany) count++;
  return count;
}
