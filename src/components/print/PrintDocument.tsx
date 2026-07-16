// ============================================================
// DEWA — Print Block Renderers
// Shared by /print/[orderId] (server page) and the builder preview.
// All blocks are pure functions — no hooks, no state.
// ============================================================
import type { InvoiceBlockConfig, InvoiceTemplate, Order, CompanySettings } from "@/lib/types";

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

function iqd(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " د.ع";
}

// ── Font families ──────────────────────────────────────────
const FONTS: Record<string, string> = {
  system: "'Segoe UI', Tahoma, Arial, sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "'Courier New', Courier, monospace",
};

// ── Individual block renderers ─────────────────────────────

function BlockHeader({ order, settings, template, qrDataUrl }: {
  order: PrintOrder; settings: PrintSettings; template: InvoiceTemplate; qrDataUrl?: string;
}) {
  const color = template.options.primaryColor;
  const docLabel = DOC_LABELS[template.docType] || template.docType;
  const isPaid = order.status === "PAID";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      marginBottom:28, paddingBottom:20, borderBottom:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        {template.options.logoUrl
          ? <img src={template.options.logoUrl} alt="logo"
              style={{ width:56, height:56, borderRadius:12, objectFit:"cover",
                outline:"1px solid rgba(0,0,0,0.08)" }} />
          : <div style={{ width:56, height:56, borderRadius:12,
              background:"linear-gradient(135deg,#F47B35,#FF9A5C)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"white", fontSize:24, fontWeight:900 }}>
              {settings.name.charAt(0) || "د"}
            </div>
        }
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>{settings.name}</div>
          {settings.nameEn && <div style={{ fontSize:11, color:"#6C757D", marginTop:2 }}>{settings.nameEn}</div>}
          <div style={{ fontSize:11, color:"#868E96", marginTop:3 }}>{settings.phone} | {settings.email}</div>
        </div>
      </div>
      <div style={{ textAlign:"left" }}>
        <div style={{ fontSize:30, fontWeight:900, color, marginBottom:8 }}>{docLabel}</div>
        <div style={{ fontSize:12, color:"#495057", marginBottom:2 }}><strong>ژمارە:</strong> {order.orderNumber}</div>
        <div style={{ fontSize:12, color:"#495057", marginBottom:2 }}><strong>بەروار:</strong> {order.createdAt.split("T")[0]}</div>
        <div style={{ fontSize:12 }}>
          <strong>بارودۆخ:</strong>{" "}
          <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700,
            background: isPaid ? "#D3F9D8" : "#FFF3BF",
            color: isPaid ? "#2B8A3E" : "#E67700" }}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function BlockParties({ order, client }: { order: PrintOrder; client?: PrintClient }) {
  return (
    <div style={{ display:"flex", gap:16, marginBottom:20 }}>
      <div style={{ flex:1, background:"#F8F9FA", borderRadius:10, padding:14,
        border:"1px solid #E9ECEF" }}>
        <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:0.5,
          color:"#ADB5BD", fontWeight:700, marginBottom:6 }}>کڕیار</div>
        <div style={{ fontSize:14, fontWeight:700 }}>{order.clientName}</div>
        {client && <div style={{ fontSize:11, color:"#6C757D", marginTop:3 }}>{client.phone} — {client.city}</div>}
      </div>
      <div style={{ flex:1, background:"#F8F9FA", borderRadius:10, padding:14,
        border:"1px solid #E9ECEF" }}>
        <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:0.5,
          color:"#ADB5BD", fontWeight:700, marginBottom:6 }}>نوێنەر</div>
        <div style={{ fontSize:14, fontWeight:700 }}>{order.repName}</div>
      </div>
      {order.warehouseName && (
        <div style={{ flex:1, background:"#F8F9FA", borderRadius:10, padding:14,
          border:"1px solid #E9ECEF" }}>
          <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:0.5,
            color:"#ADB5BD", fontWeight:700, marginBottom:6 }}>کۆگا</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{order.warehouseName}</div>
        </div>
      )}
    </div>
  );
}

function BlockItemsTable({ order, showBonusCol, template }: {
  order: PrintOrder; showBonusCol: boolean; template: InvoiceTemplate;
}) {
  const color = template.options.primaryColor;
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:20,
      borderRadius:10, overflow:"hidden" }}>
      <thead>
        <tr style={{ background: color }}>
          {["#","بەرهەم","بڕ", ...(showBonusCol?["بۆنەس"]:[]),"نرخی یەکە","کۆ"].map(h => (
            <th key={h} style={{ padding:"11px 14px", textAlign:"right",
              fontSize:11, fontWeight:700, color:"white" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {order.items.map((it, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#FAFBFC" }}>
            <td style={{ padding:"10px 14px", fontSize:12, color:"#ADB5BD" }}>{i+1}</td>
            <td style={{ padding:"10px 14px", fontSize:12, fontWeight:600 }}>{it.productName}</td>
            <td style={{ padding:"10px 14px", fontSize:12 }}>{it.quantity}</td>
            {showBonusCol && (
              <td style={{ padding:"10px 14px", fontSize:12, color:"#40C057", fontWeight:700 }}>
                +{it.bonusQty}
              </td>
            )}
            <td style={{ padding:"10px 14px", fontSize:12 }}>{iqd(it.unitPrice)}</td>
            <td style={{ padding:"10px 14px", fontSize:12, fontWeight:800 }}>
              {iqd(it.quantity * it.unitPrice)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BlockSummary({ order, template, discount }: {
  order: PrintOrder; template: InvoiceTemplate; discount: number;
}) {
  const color = template.options.primaryColor;
  const subtotal = order.items.reduce((s,i) => s + i.quantity * i.unitPrice, 0);
  const disc = subtotal * (discount / 100);
  const total = subtotal - disc;
  return (
    <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:20 }}>
      <div style={{ width:300, border:"1px solid #E9ECEF", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px",
          fontSize:13, borderBottom:"1px solid #F1F3F5" }}>
          <span>کۆی نرخ</span><span>{iqd(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px",
            fontSize:13, color:"#FA5252", borderBottom:"1px solid #F1F3F5" }}>
            <span>داشکاندن ({discount}٪)</span><span>-{iqd(disc)}</span>
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 14px",
          background: color }}>
          <span style={{ color:"white", fontSize:15, fontWeight:800 }}>کۆی گشتی</span>
          <span style={{ color:"white", fontSize:15, fontWeight:800 }}>{iqd(total)}</span>
        </div>
      </div>
    </div>
  );
}

function BlockBonus({ order }: { order: PrintOrder }) {
  const total = order.items.reduce((s,i) => s + i.bonusQty, 0);
  if (total === 0) return null;
  return (
    <div style={{ padding:14, background:"#F3F0FF", borderRadius:10, marginBottom:14,
      border:"1px solid #E8E0FF" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#7C5CFC", marginBottom:4 }}>شیکاری بۆنەس</div>
      <div style={{ fontSize:12, color:"#6C757D" }}>کۆی دانەی بۆنەس: {total} دانە</div>
    </div>
  );
}

function BlockNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ padding:14, background:"#FFF8DB", borderRadius:10, marginBottom:14,
      border:"1px solid #FFE066" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#E67700", marginBottom:4 }}>تێبینی</div>
      <div style={{ fontSize:12 }}>{text}</div>
    </div>
  );
}

function BlockTerms({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ padding:14, background:"#E8F5E9", borderRadius:10, marginBottom:14,
      border:"1px solid #A5D6A7" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#2E7D32", marginBottom:4 }}>مەرجەکان</div>
      <div style={{ fontSize:12 }}>{text}</div>
    </div>
  );
}

function BlockSignature() {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, paddingTop:8 }}>
      {["واژووی فرۆشیار","واژووی کڕیار"].map(label => (
        <div key={label} style={{ textAlign:"center", flex:1 }}>
          <div style={{ width:140, borderBottom:"1px solid #ADB5BD", margin:"30px auto 8px" }} />
          <div style={{ fontSize:11, color:"#6C757D" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function BlockQr({ qrDataUrl }: { qrDataUrl?: string }) {
  if (!qrDataUrl) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, padding:16,
      background:"#F8F9FA", borderRadius:10, marginBottom:14, border:"1px solid #E9ECEF" }}>
      <img src={qrDataUrl} width={120} height={120} alt="QR"
        style={{ display:"block", borderRadius:8, flexShrink:0,
          outline:"1px solid rgba(0,0,0,0.06)" }} />
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:"#495057", marginBottom:4 }}>QR کۆد</div>
        <div style={{ fontSize:11, color:"#868E96" }}>
          ئەم QR کۆدە سکان بکە بۆ بینینی داواکارییەکانت و باڵانسەکەت
        </div>
      </div>
    </div>
  );
}

function BlockFooter({ settings, template }: { settings: PrintSettings; template: InvoiceTemplate }) {
  return (
    <div style={{ borderTop:"2px solid #E9ECEF", paddingTop:14, marginTop:20, textAlign:"center" }}>
      <div style={{ fontSize:13, color:"#868E96", fontWeight:600 }}>
        سوپاس — {settings.name}
      </div>
      <div style={{ fontSize:11, color:"#CED4DA", marginTop:4 }}>
        {settings.phone} | {settings.email} | {settings.address}
      </div>
    </div>
  );
}

function BlockDivider({ block }: { block: InvoiceBlockConfig }) {
  return (
    <hr style={{ border:"none", borderTop:`1px solid ${block.accentColor || "#E9ECEF"}`,
      margin:"12px 0" }} />
  );
}

function BlockCustomText({ block }: { block: InvoiceBlockConfig }) {
  if (!block.customText) return null;
  return (
    <div style={{
      padding:14,
      background: block.bgColor || "#F1F3F5",
      borderRadius:10,
      marginBottom:14,
      border: block.showBorder ? `1px solid ${block.accentColor || "#DEE2E6"}` : "none",
    }}>
      {block.label && (
        <div style={{ fontSize:11, fontWeight:700, color:"#495057", marginBottom:4 }}>{block.label}</div>
      )}
      <div style={{ fontSize: block.fontSize || 12, color:"#495057", whiteSpace:"pre-line" }}>
        {block.customText}
      </div>
    </div>
  );
}

// ── Main print renderer (composed by /print/[orderId] page) ──

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
  const subtotal = order.items.reduce((s,i) => s + i.quantity * i.unitPrice, 0);

  // Paper width (used for scaling in preview)
  const paperWidths: Record<string, number> = { A4: 794, A5: 559, thermal: 302 };
  const paperW = paperWidths[template.options.paperSize] ?? 794;

  return (
    <div
      className="print-page"
      style={{
        width: paperW,
        margin:"0 auto",
        padding: template.options.paperSize === "thermal" ? "20px 16px" : "40px 48px",
        fontFamily: font,
        direction:"rtl",
        color:"#1A1A2E",
        background:"white",
        minHeight: template.options.paperSize === "thermal" ? undefined : "1123px",
        position:"relative",
        // Watermark
        ...(template.options.watermark ? {
          backgroundImage:"none",
        } : {}),
      }}
    >
      {/* Watermark overlay */}
      {template.options.watermark && (
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", pointerEvents:"none", zIndex:0,
          overflow:"hidden",
        }}>
          <div style={{
            fontSize: 80, fontWeight:900, color:"rgba(0,0,0,0.04)",
            transform:"rotate(-35deg)", whiteSpace:"nowrap", userSelect:"none",
            letterSpacing:8,
          }}>
            {template.options.watermark}
          </div>
        </div>
      )}

      <div style={{ position:"relative", zIndex:1 }}>
        {template.blocks.filter(b => b.visible).map(block => {
          switch (block.id) {
            case "header":
              return <BlockHeader key="header" order={order} settings={settings}
                        template={template} qrDataUrl={qrDataUrl} />;
            case "parties":
              return <BlockParties key="parties" order={order} client={client} />;
            case "items":
              return <BlockItemsTable key="items" order={order}
                        showBonusCol={template.showBonusCol} template={template} />;
            case "summary":
              return <BlockSummary key="summary" order={order} template={template}
                        discount={template.defaultDiscount} />;
            case "bonus":
              return <BlockBonus key="bonus" order={order} />;
            case "note":
              return <BlockNote key="note" text={block.customText || template.defaultNote || order.notes} />;
            case "terms":
              return <BlockTerms key="terms" text={block.customText || template.defaultTerms} />;
            case "signature":
              return <BlockSignature key="signature" />;
            case "qr":
              return <BlockQr key="qr" qrDataUrl={qrDataUrl} />;
            case "footer":
              return <BlockFooter key="footer" settings={settings} template={template} />;
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
