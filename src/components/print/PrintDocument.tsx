// ============================================================
// DEWA — Print Block Renderers (CSS Module version)
// Shared by /print/[orderId] (server page) and the builder preview.
// All blocks are pure functions — no hooks, no state.
// ============================================================
import type { InvoiceBlockConfig, InvoiceTemplate } from "@/lib/types";
import styles from "./PrintDocument.module.css";

export type PrintOrder = {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  repName: string;
  warehouseName: string | null;
  items: { productName: string; quantity: number; bonusQty: number; unitPrice: number; bonusPct: number }[];
  status: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
};

export type PrintClient = {
  name: string;
  phone: string;
  city: string;
  type: string;
};

export type PrintSettings = {
  name: string;
  nameEn: string;
  phone: string;
  email: string;
  address: string;
};

const STATUS_LABELS: Record<string, string> = {
  WAITING: "چاوەڕوان", IN_PROGRESS: "لە پڕۆسەدا", READY: "ئامادەیە",
  SENT: "نێردراوە", DELIVERED: "گەیشتووە", PAID: "پارەدراوە", NOT_ACCEPTED: "ڕەتکراوە",
};

const DOC_LABELS: Record<string, string> = {
  invoice: "پسووڵە", receipt: "وەسڵ", delivery: "وەرقەی گەیاندن", quote: "نرخنامە",
};

const FONTS: Record<string, string> = {
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
  naskh:  "'Noto Naskh Arabic', 'Segoe UI', Arial, sans-serif",
};

function iqd(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " د.ع";
}

// ── Per-block inline style from config overrides ──────────────
function blockStyle(block: InvoiceBlockConfig): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (block.fontSize) s.fontSize = block.fontSize;
  if (block.fontFamily) s.fontFamily = FONTS[block.fontFamily] ?? block.fontFamily;
  if (block.fontWeight) s.fontWeight = block.fontWeight;
  if (block.textAlign) s.textAlign = block.textAlign;
  if (block.bgColor) s.background = block.bgColor;
  if (block.borderRadius != null) s.borderRadius = block.borderRadius;
  if (block.padding != null) s.padding = block.padding;
  if (block.marginBottom != null) s.marginBottom = block.marginBottom;
  if (block.opacity != null) s.opacity = block.opacity;
  if (block.showBorder && block.accentColor) s.border = `1px solid ${block.accentColor}`;
  return s;
}

// ── Individual block renderers ─────────────────────────────

function BlockHeader({ order, settings, template, block, qrDataUrl }: {
  order: PrintOrder; settings: PrintSettings; template: InvoiceTemplate; block: InvoiceBlockConfig; qrDataUrl?: string;
}) {
  const color = block.accentColor || template.options.primaryColor;
  const docLabel = DOC_LABELS[template.docType] || template.docType;
  const isPaid = order.status === "PAID";
  return (
    <div className={styles.header} style={{ ...blockStyle(block), borderBottomColor: color }}>
      <div className={styles.headerLogo}>
        {template.options.logoUrl
          ? <img src={template.options.logoUrl} alt="logo" className={styles.logoImg} />
          : <div className={styles.logoFallback}>
              {settings.name.charAt(0) || "د"}
            </div>
        }
        <div>
          <div className={styles.companyName}>{settings.name}</div>
          {settings.nameEn && <div className={styles.companyNameEn}>{settings.nameEn}</div>}
          <div className={styles.companyContact}>{settings.phone} | {settings.email}</div>
        </div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.docTitle} style={{ color }}>{docLabel}</div>
        <div className={styles.headerMeta}><strong>ژمارە:</strong> {order.orderNumber}</div>
        <div className={styles.headerMeta}><strong>بەروار:</strong> {order.createdAt.split("T")[0]}</div>
        <div className={styles.headerMeta}>
          <strong>بارودۆخ:</strong>{" "}
          <span className={`${styles.statusBadge} ${isPaid ? styles.statusPaid : styles.statusOther}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function BlockParties({ order, client, block }: { order: PrintOrder; client?: PrintClient; block: InvoiceBlockConfig }) {
  return (
    <div className={styles.parties} style={blockStyle(block)}>
      <div className={styles.partyCard}>
        <div className={styles.partyLabel}>کڕیار</div>
        <div className={styles.partyName}>{order.clientName}</div>
        {client && <div className={styles.partyDetail}>{client.phone} — {client.city}</div>}
      </div>
      <div className={styles.partyCard}>
        <div className={styles.partyLabel}>نوێنەر</div>
        <div className={styles.partyName}>{order.repName}</div>
      </div>
      {order.warehouseName && (
        <div className={styles.partyCard}>
          <div className={styles.partyLabel}>کۆگا</div>
          <div className={styles.partyName}>{order.warehouseName}</div>
        </div>
      )}
    </div>
  );
}

function BlockItemsTable({ order, showBonusCol, template, block }: {
  order: PrintOrder; showBonusCol: boolean; template: InvoiceTemplate; block: InvoiceBlockConfig;
}) {
  const color = block.accentColor || template.options.primaryColor;
  return (
    <table className={styles.itemsTable} style={blockStyle(block)}>
      <thead>
        <tr style={{ background: color }}>
          {["#","بەرهەم","بڕ", ...(showBonusCol?["بۆنەس"]:[]),"نرخی یەکە","کۆ"].map(h => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {order.items.map((it, i) => (
          <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
            <td className={styles.cellIndex}>{i+1}</td>
            <td className={styles.cellProduct}>{it.productName}</td>
            <td>{it.quantity}</td>
            {showBonusCol && (
              <td className={styles.cellBonus}>+{it.bonusQty}</td>
            )}
            <td>{iqd(it.unitPrice)}</td>
            <td className={styles.cellTotal}>{iqd(it.quantity * it.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BlockSummary({ order, template, discount, block }: {
  order: PrintOrder; template: InvoiceTemplate; discount: number; block: InvoiceBlockConfig;
}) {
  const color = block.accentColor || template.options.primaryColor;
  const subtotal = order.items.reduce((s,i) => s + i.quantity * i.unitPrice, 0);
  const disc = subtotal * (discount / 100);
  const total = subtotal - disc;
  return (
    <div className={styles.summary} style={blockStyle(block)}>
      <div className={styles.summaryBox}>
        <div className={styles.summaryRow}>
          <span>کۆی نرخ</span><span>{iqd(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
            <span>داشکاندن ({discount}٪)</span><span>-{iqd(disc)}</span>
          </div>
        )}
        <div className={styles.summaryTotal} style={{ background: color }}>
          <span className={styles.summaryTotalLabel}>کۆی گشتی</span>
          <span className={styles.summaryTotalValue}>{iqd(total)}</span>
        </div>
      </div>
    </div>
  );
}

function BlockBonus({ order, block }: { order: PrintOrder; block: InvoiceBlockConfig }) {
  const total = order.items.reduce((s,i) => s + i.bonusQty, 0);
  if (total === 0) return null;
  return (
    <div className={styles.bonus} style={blockStyle(block)}>
      <div className={styles.bonusTitle}>شیکاری بۆنەس</div>
      <div className={styles.bonusText}>کۆی دانەی بۆنەس: {total} دانە</div>
    </div>
  );
}

function BlockNote({ text, block }: { text: string; block: InvoiceBlockConfig }) {
  if (!text) return null;
  return (
    <div className={styles.note} style={blockStyle(block)}>
      <div className={styles.noteTitle}>تێبینی</div>
      <div className={styles.noteText}>{text}</div>
    </div>
  );
}

function BlockTerms({ text, block }: { text: string; block: InvoiceBlockConfig }) {
  if (!text) return null;
  return (
    <div className={styles.terms} style={blockStyle(block)}>
      <div className={styles.termsTitle}>مەرجەکان</div>
      <div className={styles.termsText}>{text}</div>
    </div>
  );
}

function BlockSignature({ block }: { block: InvoiceBlockConfig }) {
  const labels = block.signatureLabels?.length
    ? block.signatureLabels
    : ["واژووی فرۆشیار", "واژووی کڕیار"];

  return (
    <div className={styles.signature} style={blockStyle(block)}>
      {labels.map(label => (
        <div key={label} className={styles.signatureSlot}>
          {block.signatureUrl ? (
            <img src={block.signatureUrl} alt={label} className={styles.signatureImage} />
          ) : (
            <div className={styles.signatureLine} />
          )}
          <div className={styles.signatureLabel}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function BlockQr({ qrDataUrl, block }: { qrDataUrl?: string; block: InvoiceBlockConfig }) {
  if (!qrDataUrl) return null;
  const size = block.qrSize ?? 120;
  return (
    <div className={styles.qr} style={blockStyle(block)}>
      <img src={qrDataUrl} width={size} height={size} alt="QR" className={styles.qrImage} />
      <div>
        <div className={styles.qrTitle}>QR کۆد</div>
        <div className={styles.qrDescription}>
          ئەم QR کۆدە سکان بکە بۆ بینینی داواکارییەکانت و باڵانسەکەت
        </div>
      </div>
    </div>
  );
}

function BlockFooter({ settings, block }: { settings: PrintSettings; block: InvoiceBlockConfig }) {
  return (
    <div className={styles.footer} style={blockStyle(block)}>
      <div className={styles.footerCompany}>سوپاس — {settings.name}</div>
      <div className={styles.footerContact}>
        {settings.phone} | {settings.email} | {settings.address}
      </div>
    </div>
  );
}

function BlockDivider({ block }: { block: InvoiceBlockConfig }) {
  return (
    <hr className={styles.divider} style={{
      borderTopColor: block.accentColor || "#E9ECEF",
    }} />
  );
}

function BlockCustomText({ block }: { block: InvoiceBlockConfig }) {
  if (!block.customText) return null;
  return (
    <div className={styles.customText} style={{
      ...blockStyle(block),
      background: block.bgColor || "#F1F3F5",
      border: block.showBorder ? `1px solid ${block.accentColor || "#DEE2E6"}` : "none",
    }}>
      {block.label && (
        <div className={styles.customTextLabel}>{block.label}</div>
      )}
      <div className={styles.customTextBody} style={{ fontSize: block.fontSize || 12 }}>
        {block.customText}
      </div>
    </div>
  );
}

// ── Main print renderer ──────────────────────────────────────

export function PrintDocument({
  order, client, settings, template, qrDataUrl,
}: {
  order: PrintOrder;
  client?: PrintClient;
  settings: PrintSettings;
  template: InvoiceTemplate;
  qrDataUrl?: string;
}) {
  const font = FONTS[template.options.fontFamily || "system"];
  const sizeClass = template.options.paperSize === "A5" ? styles.pageA5
    : template.options.paperSize === "thermal" ? styles.pageThermal
    : styles.pageA4;

  return (
    <div
      className={`${styles.page} ${sizeClass} print-page`}
      style={{
        "--print-accent": template.options.primaryColor,
        "--print-font": font,
      } as React.CSSProperties}
    >
      {/* Watermark overlay */}
      {template.options.watermark && (
        <div className={styles.watermark}>
          <div className={styles.watermarkText}>
            {template.options.watermark}
          </div>
        </div>
      )}

      <div className={styles.content}>
        {template.blocks.filter(b => b.visible).map(block => {
          switch (block.id) {
            case "header":
              return <BlockHeader key="header" order={order} settings={settings}
                        template={template} block={block} qrDataUrl={qrDataUrl} />;
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
