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
  expiryDate?: string;                    // product expiry, denormalized at order time
  company?: string;                       // manufacturing company, from Product.company
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
  establishedYear?: string;          // e.g. "2015"
  businessDesc?: string;             // e.g. "فرۆشتنی دەرمان و بەرهەمی پزیشکی"
  phoneAdmin?: string;               // بەڕێوەبەرایەتی
  phoneAccounting?: string;          // ژمێریاری
  phoneIT?: string;                  // کۆمپیوتەر
  phoneSales?: string;               // فرۆشتن/گەڕاندنەوە
  telegramBotToken: string;
  telegramBotUsername: string;
  telegramNotifyChatIds: string[]; // Telegram chat IDs of admins who receive driver messages
}

// ── Invoice Template System ─────────────────────────────────

/** Per-section style — every printable section can override these */
export interface SectionStyle {
  fontFamily: "zavi" | "system" | "naskh" | "serif" | "mono";
  fontSize: number;         // 10–24
  fontWeight: number;        // 300–900
  color: string;             // text color
  bgColor: string;           // background color
  accentColor: string;       // borders, highlights
  borderRadius: number;      // 0–20px
  borderWidth: number;       // 0–3px
  borderColor: string;
  padding: number;           // 0–32px
  textAlign: "right" | "center" | "left";
}

export type HeaderLayout = "classic" | "centered" | "banner" | "minimal";
export type TableLayout = "standard" | "bordered" | "minimal" | "compact" | "striped";

export interface InvoiceTemplate {
  id: string;
  name: string;
  isDefault?: boolean;

  // ── Global ──
  paperSize: "A4" | "A5";
  globalFont: SectionStyle["fontFamily"];
  primaryColor: string;
  logoUrl?: string;
  watermark?: string;

  // ── Section visibility (master toggles) ──
  showHeader: boolean;
  showInvoiceMeta: boolean;
  showItemsTable: boolean;
  showSummary: boolean;
  showQR: boolean;
  showNotes: boolean;
  showTerms: boolean;
  showSignature: boolean;
  showFooter: boolean;

  // ── Header config + metadata toggles ──
  header: {
    layout: HeaderLayout;
    style: Partial<SectionStyle>;
    showLogo: boolean;
    showNameKu: boolean;
    showNameEn: boolean;
    showEstYear: boolean;
    showBusinessDesc: boolean;
    showAddress: boolean;
    showPhoneAdmin: boolean;
    showPhoneAccounting: boolean;
    showPhoneIT: boolean;
    showPhoneSales: boolean;
  };

  // ── Invoice meta config ──
  invoiceMeta: {
    style: Partial<SectionStyle>;
    showDate: boolean;
    showInvoiceNumber: boolean;
    showCopyLabel: boolean;
    showCustomerName: boolean;
    showCurrency: boolean;
    showRepName: boolean;
  };

  // ── Items table config ──
  table: {
    layout: TableLayout;
    style: Partial<SectionStyle>;
    showRowNumbers: boolean;
    showProductName: boolean;
    showQuantity: boolean;
    showFreeQty: boolean;
    showUnitPrice: boolean;
    showLineTotal: boolean;
    showExpiryDate: boolean;
    showCompany: boolean;
  };

  // ── Summary config ──
  summary: {
    style: Partial<SectionStyle>;
    position: "right" | "left" | "full";
    showSubtotal: boolean;
    showDiscount: boolean;
    showNetTotal: boolean;
    showAmountInWords: boolean;
    showCustomerBalance: boolean;
  };

  // ── QR config ──
  qr: {
    style: Partial<SectionStyle>;
    size: number;           // 80–200
    position: "right" | "left";
    showLabel: boolean;
  };

  // ── Signature config ──
  signature: {
    style: Partial<SectionStyle>;
    count: number;          // 1–4
    labels: string[];
    showLine: boolean;
  };

  // ── Footer config ──
  footer: {
    style: Partial<SectionStyle>;
    showSystemUser: boolean;
    showPrintDateTime: boolean;
    showPrintUsername: boolean;
    showPageNumber: boolean;
    showNotes: boolean;
    showTerms: boolean;
    customTerms: string;
    customNote: string;
  };

  // ── Defaults ──
  defaultDiscount: number;

  createdAt: string;
}

/** Default section style */
export const DEFAULT_SECTION_STYLE: SectionStyle = {
  fontFamily: "zavi",
  fontSize: 13,
  fontWeight: 400,
  color: "#1A1A2E",
  bgColor: "transparent",
  accentColor: "#4263EB",
  borderRadius: 8,
  borderWidth: 0,
  borderColor: "#DEE2E6",
  padding: 12,
  textAlign: "right",
};

/** Default invoice template with all metadata visible */
export const DEFAULT_INVOICE_TEMPLATE: Omit<InvoiceTemplate, "id" | "createdAt"> = {
  name: "داڕێژەی ستاندارد",
  isDefault: true,
  paperSize: "A4",
  globalFont: "zavi",
  primaryColor: "#4263EB",

  showHeader: true,
  showInvoiceMeta: true,
  showItemsTable: true,
  showSummary: true,
  showQR: true,
  showNotes: true,
  showTerms: true,
  showSignature: true,
  showFooter: true,

  header: {
    layout: "classic",
    style: {},
    showLogo: true,
    showNameKu: true,
    showNameEn: true,
    showEstYear: true,
    showBusinessDesc: true,
    showAddress: true,
    showPhoneAdmin: true,
    showPhoneAccounting: true,
    showPhoneIT: true,
    showPhoneSales: true,
  },

  invoiceMeta: {
    style: {},
    showDate: true,
    showInvoiceNumber: true,
    showCopyLabel: true,
    showCustomerName: true,
    showCurrency: true,
    showRepName: true,
  },

  table: {
    layout: "standard",
    style: {},
    showRowNumbers: true,
    showProductName: true,
    showQuantity: true,
    showFreeQty: true,
    showUnitPrice: true,
    showLineTotal: true,
    showExpiryDate: true,
    showCompany: true,
  },

  summary: {
    style: {},
    position: "right",
    showSubtotal: true,
    showDiscount: true,
    showNetTotal: true,
    showAmountInWords: true,
    showCustomerBalance: true,
  },

  qr: {
    style: {},
    size: 120,
    position: "right",
    showLabel: true,
  },

  signature: {
    style: {},
    count: 2,
    labels: ["واژووی فرۆشیار", "واژووی کڕیار"],
    showLine: true,
  },

  footer: {
    style: {},
    showSystemUser: true,
    showPrintDateTime: true,
    showPrintUsername: true,
    showPageNumber: true,
    showNotes: true,
    showTerms: true,
    customTerms: "کاڵا دوای ٩٠ ڕۆژ ناگەڕێتەوە — پارەی نەقدی دوای ٣٠ ڕۆژ کۆدەکرێتەوە",
    customNote: "",
  },

  defaultDiscount: 0,
};


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
