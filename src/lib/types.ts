// ============================================
// DEWA (دەوا) — Core Type Definitions
// ============================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'REP';
export type ClientType = 'PHARMACY' | 'HOSPITAL' | 'CLINIC' | 'WAREHOUSE';
export type OrderFlow  = 'STANDARD' | 'DIRECT_WAREHOUSE' | 'DIRECT_PHARMACY';
export type OrderStatus = 'WAITING' | 'IN_PROGRESS' | 'NOT_ACCEPTED' | 'READY' | 'SENT' | 'DELIVERED' | 'PAID';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'CASH' | 'TRANSFER';
export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  city: string;
  isActive: boolean;
  lastSeen: string; // ISO timestamp, empty string if never
  createdAt: string;
}

export interface ProductPrice {
  typeId: string;
  typeName: string;
  amount: number;
}

export interface PriceType {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  company: string;
  price: number;
  prices: ProductPrice[];
  stock: number;
  lowStock: number;       // threshold below which stock is considered "low"
  unitType: string;
  origin: string;
  supplier: string;
  issueDate: string;
  expiryDate: string;
  batchNumber: string;
  barcode?: string;
  isSample?: boolean;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  owner: string;
  phone: string;
  city: string;
  type: ClientType;
  repId: string;
  paymentTerms: PaymentTerms;
  balance: number;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
  // Warehouse-specific (only populated when type === 'WAREHOUSE')
  bonusPct:   number;
  bonusRules: BonusRule[];
  address:    string;
  contact:    string;
}

export interface Rep {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  profilePic: string;        // URL to profile photo (shown on map)
  telegramChatId: string;    // linked to telegram_users
  isActive: boolean;
  createdAt: string;
}

export interface BonusRule {
  productId: string;
  productName: string;
  percent: number;
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  address: string;
  contact: string;
  phone: string;
  bonusPct: number;
  bonusRules: BonusRule[];
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  country: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  city: string;
  telegramChatId: string; // used to send MP3 voice via Telegram bot
  isActive: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  bonusQty: number;                       // = totalBonusQty — what the pharmacy receives
  unitPrice: number;
  priceTypeId:   string;                  // which price tier was selected at order time
  priceTypeName: string;                  // denormalized
  bonusPct: number;                       // warehouse standard bonus % for this product
  repBonusPct: number;                    // total bonus % agreed with pharmacy by the rep
  warehouseBonusQty: number;              // units shipped by the warehouse inside the delivery
  repBonusQty: number;                    // units the rep must personally deliver (agentPendingBonusQty)
  overrideWarehouseFulfillment: boolean;  // if true, warehouse ships ALL of totalBonusQty (agentPending = 0)
}

export interface Order {
  id: string;
  orderNumber: string;
  // clientId = billing party (Warehouse client for STANDARD/DIRECT_WAREHOUSE, Pharmacy client for DIRECT_PHARMACY)
  clientId: string;
  clientName: string;
  repId: string;
  repName: string;
  // Order flow determines routing & billing logic
  orderFlow: OrderFlow;
  // Informational pharmacy — only set for STANDARD flow
  pharmacyId:   string | null;
  pharmacyName: string | null;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  notes: string;
  // Driver (assigned when READY → SENT)
  driverId: string;
  driverName: string;
  driverPhone: string;
  // Invoice & Receipt
  signedInvoiceUrl: string;
  signedReceiptUrl: string;
  // Timestamps
  deliveredAt: string;
  paidAt: string;
  // Rejection
  rejectionReason: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  method: PaymentMethod;
  relatedOrderId: string | null;
  createdAt: string;
}

// ── Returns ──────────────────────────────────────────────────
// Company-wide bonus rate applied to returned quantities.
// 30% of returned units are classified as bonus (free) — they
// do NOT reduce the customer's debt.
export const RETURN_BONUS_RATE = 0.30;

export type ReturnStatus = "PENDING" | "PROCESSED" | "REJECTED";

export interface ReturnItem {
  productId: string;
  productName: string;
  returnedQty: number;
  bonusQty: number;       // returnedQty − paidQty
  paidQty: number;        // Math.round(returnedQty / (1 + originalBonusRate))
  originalBonusRate: number; // bonusQty / quantity from the original order (e.g. 0.50 for 50+100)
  unitPrice: number;      // pulled from the matched order
  debtCredit: number;     // paidQty × unitPrice — this reduces client.balance
  fromOrderId: string;    // which order the goods came from
  fromOrderNumber: string;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;        // RET-XXXXXX
  clientId: string;
  clientName: string;
  status: ReturnStatus;
  items: ReturnItem[];
  notes: string;
  // Denormalized totals for fast list display
  totalReturnedUnits: number;
  totalBonusUnits: number;
  totalPaidUnits: number;
  totalDebtCredit: number;     // applied to client.balance when PROCESSED
  createdAt: string;
}

export interface CompanySettings {
  name: string;
  nameEn: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  currency: string;
  language: string;
  logo?: string;
  profilePic?: string;
  telegramBotToken: string;
  telegramBotUsername: string;
  telegramNotifyChatIds: string[]; // Telegram chat IDs of admins who receive driver messages
}

export interface InvoiceBlockConfig {
  id: string;          // header | parties | items | summary | bonus | note | terms | signature | qr | footer | divider | custom
  label: string;
  visible: boolean;
  required?: boolean;
  type: "builtin" | "custom" | "divider";
  customText?: string; // for custom text blocks

  // ── Per-block style overrides (all optional, builder sets them) ──
  fontSize?: number;         // 10–24, default 13
  fontFamily?: string;       // override template font for this block
  fontWeight?: number;       // 400–900
  textAlign?: "right" | "center" | "left";
  bgColor?: string;          // block background (default transparent)
  accentColor?: string;      // override template primaryColor for this block
  showBorder?: boolean;      // draw a visible border around the block
  borderRadius?: number;     // 0–20
  padding?: number;          // 0–32
  marginBottom?: number;     // 0–32
  opacity?: number;          // 0.3–1.0

  // ── Header block ──
  headerLayout?: "classic" | "centered" | "minimal" | "banner";
  showLogo?: boolean;
  logoPosition?: "right" | "left";
  showNameEn?: boolean;
  showContact?: boolean;
  showStatus?: boolean;

  // ── Parties block ──
  showPhone?: boolean;
  showCity?: boolean;
  showRep?: boolean;
  showWarehouse?: boolean;
  partiesLayout?: "side" | "stacked";

  // ── Items table block ──
  showRowNumbers?: boolean;
  showUnitPrice?: boolean;
  stripedRows?: boolean;
  tableStyle?: "standard" | "bordered" | "minimal" | "compact";

  // ── Summary block ──
  summaryPosition?: "right" | "left";
  summaryStyle?: "card" | "inline" | "large";

  // ── Signature block ──
  signatureUrl?: string;       // uploaded/drawn signature data URL
  signatureLabels?: string[];  // e.g. ["واژووی فرۆشیار","واژووی کڕیار"]
  signatureCount?: number;     // 1–4 slots
  showSignatureLine?: boolean;

  // ── QR block ──
  qrSize?: number;             // 80–200px
  qrPosition?: "right" | "left";
  qrLabel?: string;

  // ── Footer block ──
  footerStyle?: "centered" | "minimal" | "full";
  footerText?: string;
}

export interface TemplateOptions {
  paperSize: "A4" | "A5" | "thermal"; // thermal = 80mm receipt
  primaryColor: string;               // accent/heading color, default "#4263EB"
  logoUrl?: string;                   // uploaded company logo
  watermark?: string;                 // faint diagonal background text e.g. "COPY"
  fontFamily?: string;                // "system" | "serif" | "mono" | "naskh"
}

const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  paperSize: "A4",
  primaryColor: "#4263EB",
  fontFamily: "system",
};
export { DEFAULT_TEMPLATE_OPTIONS };

export interface InvoiceTemplate {
  id: string;
  name: string;
  docType: "invoice" | "receipt" | "delivery" | "quote";
  blocks: InvoiceBlockConfig[];
  showBonusCol: boolean;
  defaultNote: string;
  defaultTerms: string;
  defaultDiscount: number;
  options: TemplateOptions; // paper, color, logo, watermark
  isDefault?: boolean;     // user's default template for printing
  createdAt: string;
}


export type SampleStatus = 'PENDING' | 'ACCEPTED' | 'SENT' | 'ARRIVED' | 'DECLINED';

export interface SampleItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface SampleRequest {
  id: string;
  requestNumber: string;
  repId: string;
  repName: string;
  items: SampleItem[];
  doctorName: string;
  status: SampleStatus;
  note: string;
  sentAt: string;
  arrivedAt: string;
  declinedReason: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;       // CREATE_ORDER, APPROVE_ORDER, etc.
  entityType: string;   // ORDER, CLIENT, PRODUCT, etc.
  entityId: string;
  entityName: string;
  meta: Record<string, unknown>;
  createdAt: string;
}
