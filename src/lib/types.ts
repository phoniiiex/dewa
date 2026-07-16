// ============================================
// DEWA (دەوا) — Core Type Definitions
// ============================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'REP';
export type ClientType = 'PHARMACY' | 'HOSPITAL' | 'CLINIC';
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
  bonusQty: number;
  unitPrice: number;
  bonusPct: number; // actual bonus % applied (custom rule or warehouse default)
  warehouseBonusQty: number; // bonus units sent through the warehouse
  repBonusQty: number;       // bonus units the representative takes
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  repId: string;
  repName: string;
  warehouseId: string | null;
  warehouseName: string | null;
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
  // Per-block style overrides (all optional, builder sets them)
  fontSize?: number;         // 10–18, default 13
  bgColor?: string;          // block background (default transparent)
  accentColor?: string;      // override template primaryColor for this block
  showBorder?: boolean;      // draw a visible border around the block
}

export interface TemplateOptions {
  paperSize: "A4" | "A5" | "thermal"; // thermal = 80mm receipt
  primaryColor: string;               // accent/heading color, default "#4263EB"
  logoUrl?: string;                   // uploaded company logo
  watermark?: string;                 // faint diagonal background text e.g. "COPY"
  fontFamily?: string;                // "system" | "serif" | "mono"
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
