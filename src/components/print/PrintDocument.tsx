// ═══════════════════════════════════════════════════════════
// PrintDocument – renders the printable invoice/receipt/delivery/quote
// Each block has layout variants driven by InvoiceBlockConfig
// ═══════════════════════════════════════════════════════════
import styles from "./PrintDocument.module.css";
import type { InvoiceTemplate, InvoiceBlockConfig } from "@/lib/types";

// ── Public prop types ──────────────────────────────────────
export type PrintOrder = {
  id: string; orderNumber: string; clientId: string;
  clientName: string; repName: string; warehouseName?: string | null;
  items: { productName: string; quantity: number; bonusQty?: number; unitPrice: number; bonusPct?: number }[];
  status: string; totalAmount: number; notes: string; createdAt: string;
};
export type PrintClient = { name: string; phone: string; city: string; type: string };
export type PrintSettings = { name: string; nameEn: string; phone: string; email: string; address: string };

// ── Font map ───────────────────────────────────────────────
const FONTS: Record<string, string> = {
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  zavi:   "'Zavi Gifts', 'Segoe UI', Tahoma, sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
  naskh:  "'Noto Naskh Arabic', 'Segoe UI', Arial, sans-serif",
};

const DOC_LABELS: Record<string, string> = {
  invoice:"پسووڵە", receipt:"وەسڵ", delivery:"وەرقەی گەیاندن", quote:"نرخنامە",
};

// ── Block style helper ─────────────────────────────────────
function blockStyle(b: InvoiceBlockConfig): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (b.fontSize) s.fontSize = b.fontSize;
  if (b.fontFamily && FONTS[b.fontFamily]) s.fontFamily = FONTS[b.fontFamily];
  if (b.fontWeight) s.fontWeight = b.fontWeight;
  if (b.textAlign) s.textAlign = b.textAlign;
  if (b.bgColor) s.background = b.bgColor;
  if (b.showBorder) s.border = `1px solid ${b.accentColor || '#DEE2E6'}`;
  if (b.borderRadius != null) s.borderRadius = b.borderRadius;
  if (b.padding != null) s.padding = b.padding;
  if (b.marginBottom != null) s.marginBottom = b.marginBottom;
  if (b.opacity != null) s.opacity = b.opacity;
  return s;
}

function fmtNumber(n: number) { return n.toLocaleString("en-US"); }

// ════════════════════════════════════════════════════════════
// BLOCK: Header
// ════════════════════════════════════════════════════════════
function BlockHeader({ order, settings, template, block }: {
  order: PrintOrder; settings: PrintSettings; template: InvoiceTemplate; block: InvoiceBlockConfig;
}) {
  const color = block.accentColor || template.options.primaryColor;
  const docLabel = DOC_LABELS[template.docType] || template.docType;
  const isPaid = order.status === "PAID";
  const layout = block.headerLayout ?? "classic";
  const showLogo = block.showLogo !== false;
  const showNameEn = block.showNameEn !== false;
  const showContact = block.showContact !== false;
  const showStatus = block.showStatus !== false;
  const logoLeft = block.logoPosition === "left";

  const logo = showLogo && (
    template.options.logoUrl
      ? <img src={template.options.logoUrl} alt="logo" className={styles.logoImg} />
      : <div className={styles.logoFallback}>{settings.name.charAt(0) || "د"}</div>
  );

  const meta = (
    <>
      <div className={styles.headerMeta}><strong>ژمارە:</strong> {order.orderNumber}</div>
      <div className={styles.headerMeta}>
        <strong>بەروار:</strong> {new Date(order.createdAt).toLocaleDateString("ku", { year:"numeric", month:"long", day:"numeric" })}
      </div>
      {showStatus && (
        <div className={`${styles.statusBadge} ${isPaid ? styles.statusPaid : styles.statusUnpaid}`}>
          {isPaid ? "پارەدراو" : "پارەنەدراو"}
        </div>
      )}
    </>
  );

  // ── Centered ──
  if (layout === "centered") {
    return (
      <div className={styles.headerCentered} style={blockStyle(block)}>
        {logo}
        <div className={styles.companyName}>{settings.name}</div>
        {showNameEn && settings.nameEn && <div className={styles.companyNameEn}>{settings.nameEn}</div>}
        {showContact && <div className={styles.companyContact}>{settings.phone} | {settings.email}</div>}
        <div className={styles.docTitle} style={{ color }}>{docLabel}</div>
        {meta}
      </div>
    );
  }

  // ── Minimal ──
  if (layout === "minimal") {
    return (
      <div className={styles.headerMinimal} style={blockStyle(block)}>
        <div className={styles.companyName}>{settings.name}</div>
        <div>
          <div className={styles.docTitle} style={{ color }}>{docLabel}</div>
          {meta}
        </div>
      </div>
    );
  }

  // ── Banner ──
  if (layout === "banner") {
    return (
      <div className={styles.headerBanner} style={{ ...blockStyle(block), background: color }}>
        <div className={styles.headerLogo} style={logoLeft ? { order: 2 } : {}}>
          {logo}
          <div>
            <div className={styles.companyName}>{settings.name}</div>
            {showNameEn && settings.nameEn && <div className={styles.companyNameEn}>{settings.nameEn}</div>}
            {showContact && <div className={styles.companyContact}>{settings.phone} | {settings.email}</div>}
          </div>
        </div>
        <div className={styles.headerRight} style={logoLeft ? { order: 1, textAlign: "right" } : {}}>
          <div className={styles.docTitle}>{docLabel}</div>
          {meta}
        </div>
      </div>
    );
  }

  // ── Classic (default) ──
  return (
    <div className={styles.header} style={{ ...blockStyle(block), borderBottomColor: color }}>
      <div className={styles.headerLogo} style={logoLeft ? { order: 2 } : {}}>
        {logo}
        <div>
          <div className={styles.companyName}>{settings.name}</div>
          {showNameEn && settings.nameEn && <div className={styles.companyNameEn}>{settings.nameEn}</div>}
          {showContact && <div className={styles.companyContact}>{settings.phone} | {settings.email}</div>}
        </div>
      </div>
      <div className={styles.headerRight} style={logoLeft ? { order: 1, textAlign: "right" } : {}}>
        <div className={styles.docTitle} style={{ color }}>{docLabel}</div>
        {meta}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Parties
// ════════════════════════════════════════════════════════════
function BlockParties({ order, client, block }: {
  order: PrintOrder; client?: PrintClient; block: InvoiceBlockConfig;
}) {
  const showPhone = block.showPhone !== false;
  const showCity = block.showCity !== false;
  const showRep = block.showRep !== false;
  const showWarehouse = block.showWarehouse !== false;
  const stacked = block.partiesLayout === "stacked";

  return (
    <div className={`${styles.parties} ${stacked ? styles.partiesStacked : ""}`} style={blockStyle(block)}>
      <div className={styles.partyCard}>
        <div className={styles.partyLabel}>کڕیار</div>
        <div className={styles.partyName}>{client?.name || order.clientName}</div>
        {showPhone && client?.phone && <div className={styles.partyDetail}>📞 {client.phone}</div>}
        {showCity && client?.city && <div className={styles.partyDetail}>📍 {client.city}</div>}
      </div>
      {(showRep || showWarehouse) && (
        <div className={styles.partyCard}>
          {showRep && (
            <>
              <div className={styles.partyLabel}>نوێنەر</div>
              <div className={styles.partyName}>{order.repName}</div>
            </>
          )}
          {showWarehouse && order.warehouseName && (
            <div className={styles.partyDetail}>🏭 {order.warehouseName}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Items Table
// ════════════════════════════════════════════════════════════
function BlockItemsTable({ order, showBonusCol, template, block }: {
  order: PrintOrder; showBonusCol: boolean; template: InvoiceTemplate; block: InvoiceBlockConfig;
}) {
  const showRowNums = block.showRowNumbers !== false;
  const showUnitPrice = block.showUnitPrice !== false;
  const variant = block.tableStyle ?? "standard";
  const striped = block.stripedRows !== false;

  const tableClasses = [
    styles.itemsTable,
    variant === "bordered" ? styles.tableBordered : "",
    variant === "minimal" ? styles.tableMinimal : "",
    variant === "compact" ? styles.tableCompact : "",
    striped ? styles.tableStriped : "",
  ].filter(Boolean).join(" ");

  return (
    <table className={tableClasses} style={blockStyle(block)}>
      <thead>
        <tr>
          {showRowNums && <th className={styles.rowNum}>#</th>}
          <th>بەرهەم</th>
          <th>عەدەد</th>
          {showBonusCol && <th>بۆنەس</th>}
          {showUnitPrice && <th>نرخی یەکە</th>}
          <th>کۆ</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item, i) => (
          <tr key={i}>
            {showRowNums && <td className={styles.rowNum}>{i + 1}</td>}
            <td>{item.productName}</td>
            <td>{item.quantity}</td>
            {showBonusCol && <td>{item.bonusQty || 0}</td>}
            {showUnitPrice && <td>{fmtNumber(item.unitPrice)}</td>}
            <td style={{ fontWeight: 600 }}>{fmtNumber(item.quantity * item.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Summary
// ════════════════════════════════════════════════════════════
function BlockSummary({ order, template, discount, block }: {
  order: PrintOrder; template: InvoiceTemplate; discount: number; block: InvoiceBlockConfig;
}) {
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = discount > 0 ? subtotal * (discount / 100) : 0;
  const total = subtotal - discountAmt;
  const variant = block.summaryStyle ?? "card";
  const pos = block.summaryPosition ?? "right";

  const posClass = pos === "left" ? styles.summaryLeft : styles.summaryRight;
  const variantClass =
    variant === "inline" ? styles.summaryInline :
    variant === "large" ? styles.summaryLarge : "";

  return (
    <div className={`${styles.summary} ${posClass} ${variantClass}`} style={blockStyle(block)}>
      <div className={styles.summaryRow}><span>کۆی بەرهەمەکان</span><span>{fmtNumber(subtotal)}</span></div>
      {discount > 0 && (
        <div className={styles.summaryRow}><span>داشکاندن ({discount}%)</span><span>-{fmtNumber(discountAmt)}</span></div>
      )}
      <div className={styles.summaryTotal}><span>کۆی گشتی</span><span>{fmtNumber(total)} د.ع</span></div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Bonus
// ════════════════════════════════════════════════════════════
function BlockBonus({ order, block }: { order: PrintOrder; block: InvoiceBlockConfig }) {
  const bonusItems = order.items.filter(i => (i.bonusQty ?? 0) > 0);
  if (!bonusItems.length) return null;
  return (
    <div className={styles.bonus} style={blockStyle(block)}>
      <div className={styles.bonusTitle}>شیکاری بۆنەس</div>
      <ul className={styles.bonusList}>
        {bonusItems.map((item, i) => (
          <li key={i}>{item.productName}: {item.bonusQty} دانە ({item.bonusPct ?? 0}%)</li>
        ))}
      </ul>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Note
// ════════════════════════════════════════════════════════════
function BlockNote({ text, block }: { text: string; block: InvoiceBlockConfig }) {
  if (!text) return null;
  return (
    <div className={styles.note} style={blockStyle(block)}>
      <div className={styles.noteTitle}>📝 تێبینی</div>
      <div className={styles.noteBody}>{text}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Terms
// ════════════════════════════════════════════════════════════
function BlockTerms({ text, block }: { text: string; block: InvoiceBlockConfig }) {
  if (!text) return null;
  return (
    <div className={styles.terms} style={blockStyle(block)}>
      <div className={styles.termsTitle}>📋 مەرجەکان</div>
      <div className={styles.termsBody}>{text}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Signature
// ════════════════════════════════════════════════════════════
function BlockSignature({ block }: { block: InvoiceBlockConfig }) {
  const count = block.signatureCount ?? 2;
  const showLine = block.showSignatureLine !== false;
  const labels = block.signatureLabels?.length
    ? block.signatureLabels.slice(0, count)
    : Array.from({ length: count }, (_, i) => i === 0 ? "واژووی فرۆشیار" : `واژووی ${i + 1}`);

  return (
    <div className={styles.signature} style={blockStyle(block)}>
      {labels.map((label, i) => (
        <div key={i} className={styles.signatureSlot}>
          {block.signatureUrl && i === 0 ? (
            <img src={block.signatureUrl} alt={label} className={styles.signatureImage} />
          ) : showLine ? (
            <div className={styles.signatureLine} />
          ) : (
            <div style={{ height: 40 }} />
          )}
          <div className={styles.signatureLabel}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: QR Code
// ════════════════════════════════════════════════════════════
function BlockQr({ qrDataUrl, block }: { qrDataUrl?: string; block: InvoiceBlockConfig }) {
  const size = block.qrSize ?? 120;
  const reverse = block.qrPosition === "left";
  const label = block.qrLabel ?? "ئەم QR کۆدە سکان بکە بۆ بینینی قەرزەکانت";

  return (
    <div className={`${styles.qr} ${reverse ? styles.qrReverse : ""}`} style={blockStyle(block)}>
      {qrDataUrl ? (
        <img src={qrDataUrl} width={size} height={size} alt="QR" className={styles.qrImage} />
      ) : (
        <div className={styles.qrPlaceholder} style={{ width: size, height: size }}>QR</div>
      )}
      <div>
        <div className={styles.qrTitle}>QR کۆد</div>
        <div className={styles.qrDescription}>{label}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Footer
// ════════════════════════════════════════════════════════════
function BlockFooter({ settings, block }: { settings: PrintSettings; block: InvoiceBlockConfig }) {
  const variant = block.footerStyle ?? "centered";
  const customText = block.footerText;

  if (variant === "minimal") {
    return (
      <div className={styles.footerMinimal} style={blockStyle(block)}>
        <div className={styles.footerCompany}>سوپاس — {settings.name}</div>
        {customText && <div className={styles.footerContact}>{customText}</div>}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={styles.footerFull} style={blockStyle(block)}>
        <div className={styles.footerCompany}>{settings.name}</div>
        <div className={styles.footerContact}>
          {settings.phone} | {settings.email}
          {settings.address && ` | ${settings.address}`}
        </div>
        {customText && <div className={styles.footerContact}>{customText}</div>}
      </div>
    );
  }

  // Centered (default)
  return (
    <div className={styles.footer} style={blockStyle(block)}>
      <div className={styles.footerCompany}>{settings.name}</div>
      <div className={styles.footerContact}>
        {settings.phone} | {settings.email}
      </div>
      {customText && <div className={styles.footerContact} style={{ marginTop: 4 }}>{customText}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK: Divider
// ════════════════════════════════════════════════════════════
function BlockDivider({ block }: { block: InvoiceBlockConfig }) {
  return <hr className={styles.divider} style={blockStyle(block)} />;
}

// ════════════════════════════════════════════════════════════
// BLOCK: Custom Text
// ════════════════════════════════════════════════════════════
function BlockCustomText({ block }: { block: InvoiceBlockConfig }) {
  if (!block.customText) return null;
  return (
    <div className={styles.customText} style={blockStyle(block)}>
      <div className={styles.customTextBody}>{block.customText}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════
export function PrintDocument({
  order, client, settings, template, qrDataUrl,
}: {
  order: PrintOrder; client?: PrintClient; settings: PrintSettings;
  template: InvoiceTemplate; qrDataUrl?: string;
}) {
  const font = FONTS[template.options.fontFamily || "system"] || FONTS.system;
  const sizeClass =
    template.options.paperSize === "A5" ? styles.pageA5 :
    template.options.paperSize === "thermal" ? styles.pageThermal :
    styles.pageA4;

  return (
    <div
      className={`${styles.page} ${sizeClass} print-page`}
      style={{
        "--print-accent": template.options.primaryColor,
        "--print-font": font,
      } as React.CSSProperties}
    >
      {template.options.watermark && (
        <div className={styles.watermark}>
          <div className={styles.watermarkText}>{template.options.watermark}</div>
        </div>
      )}

      <div className={styles.content}>
        {template.blocks.filter(b => b.visible).map(block => {
          switch (block.id) {
            case "header":
              return <BlockHeader key="header" order={order} settings={settings}
                        template={template} block={block} />;
            case "parties":
              return <BlockParties key="parties" order={order} client={client} block={block} />;
            case "items":
              return <BlockItemsTable key="items" order={order}
                        showBonusCol={template.showBonusCol} template={template} block={block} />;
            case "summary":
              return <BlockSummary key="summary" order={order} template={template}
                        discount={template.defaultDiscount} block={block} />;
            case "bonus":
              return <BlockBonus key="bonus" order={order} block={block} />;
            case "note":
              return <BlockNote key="note" text={block.customText || template.defaultNote || order.notes} block={block} />;
            case "terms":
              return <BlockTerms key="terms" text={block.customText || template.defaultTerms} block={block} />;
            case "signature":
              return <BlockSignature key="signature" block={block} />;
            case "qr":
              return <BlockQr key="qr" qrDataUrl={qrDataUrl} block={block} />;
            case "footer":
              return <BlockFooter key="footer" settings={settings} block={block} />;
            case "divider":
              return <BlockDivider key={block.id} block={block} />;
            default:
              if (block.type === "custom") return <BlockCustomText key={block.id} block={block} />;
              return null;
          }
        })}
      </div>
    </div>
  );
}
