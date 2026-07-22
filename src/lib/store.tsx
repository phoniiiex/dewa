// ============================================
// DEWA (دەوا) — Data Store with Supabase
// React Context for full CRUD persistence
// ============================================
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import type {
  Product, Client, Rep, Supplier, Driver, Order,
  Transaction, CompanySettings, User, InvoiceTemplate, TemplateOptions,
  PriceType, ProductPrice, SampleRequest, ReturnRecord, ReturnStatus,
} from "./types";
import { RETURN_BONUS_RATE } from "./types";

// ===== DB ↔ APP MAPPERS =====
// Supabase uses snake_case, our app uses camelCase
function toProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string, name: r.name as string, sku: r.sku as string,
    category: (r.category || "") as string, company: (r.company || "") as string,
    price: Number(r.price || 0), prices: (r.prices || []) as ProductPrice[],
    stock: Number(r.stock || 0), lowStock: Number(r.low_stock || 10),
    unitType: (r.unit_type || "") as string,
    origin: (r.origin || "") as string, supplier: (r.supplier || "") as string,
    issueDate: (r.issue_date || "") as string, expiryDate: (r.expiry_date || "") as string,
    batchNumber: (r.batch_number || "") as string, barcode: (r.barcode || "") as string, isSample: !!r.is_sample,
    isActive: r.is_active !== false, imageUrl: (r.image_url || "") as string,
    createdAt: (r.created_at || "") as string,
  };
}
function fromProduct(p: Partial<Product>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (p.id !== undefined) m.id = p.id;
  if (p.name !== undefined) m.name = p.name;
  if (p.sku !== undefined) m.sku = p.sku;
  if (p.category !== undefined) m.category = p.category;
  if (p.company !== undefined) m.company = p.company;
  if (p.price !== undefined) m.price = p.price;
  if (p.prices !== undefined) m.prices = p.prices;
  if (p.stock !== undefined) m.stock = p.stock;
  if (p.lowStock !== undefined) m.low_stock = p.lowStock;
  if (p.unitType !== undefined) m.unit_type = p.unitType;
  if (p.origin !== undefined) m.origin = p.origin;
  if (p.supplier !== undefined) m.supplier = p.supplier;
  if (p.issueDate !== undefined) m.issue_date = p.issueDate || null;
  if (p.expiryDate !== undefined) m.expiry_date = p.expiryDate;
  if (p.batchNumber !== undefined) m.batch_number = p.batchNumber;
  if (p.barcode !== undefined) m.barcode = p.barcode;
  if (p.isSample !== undefined) m.is_sample = p.isSample;
  if (p.isActive !== undefined) m.is_active = p.isActive;
  if (p.imageUrl !== undefined) m.image_url = p.imageUrl;
  if (p.createdAt !== undefined) m.created_at = p.createdAt;
  return m;
}

function toClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    name: r.name as string,
    owner: (r.owner || "") as string,
    phone: (r.phone || "") as string,
    city: (r.city || "") as string,
    type: (r.type || "PHARMACY") as Client["type"],
    repId: (r.rep_id || "") as string,
    paymentTerms: (r.payment_terms || "IMMEDIATE") as Client["paymentTerms"],
    balance: Number(r.balance || 0),
    qrToken: (r.qr_token || "") as string,
    isActive: r.is_active !== false,
    createdAt: (r.created_at || "") as string,
    // Warehouse-specific fields
    bonusPct: Number(r.bonus_pct || 0),
    bonusRules: Array.isArray(r.bonus_rules) ? r.bonus_rules as import("./types").BonusRule[] : [],
    address: (r.address || "") as string,
    contact: (r.contact || "") as string,
  };
}
function fromClient(c: Partial<Client>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (c.id !== undefined) m.id = c.id;
  if (c.name !== undefined) m.name = c.name;
  if (c.owner !== undefined) m.owner = c.owner;
  if (c.phone !== undefined) m.phone = c.phone;
  if (c.city !== undefined) m.city = c.city;
  if (c.type !== undefined) m.type = c.type;
  if (c.repId !== undefined) m.rep_id = c.repId;
  if (c.paymentTerms !== undefined) m.payment_terms = c.paymentTerms;
  if (c.balance !== undefined) m.balance = c.balance;
  if (c.qrToken !== undefined) m.qr_token = c.qrToken;
  if (c.isActive !== undefined) m.is_active = c.isActive;
  if (c.createdAt !== undefined) m.created_at = c.createdAt;
  if (c.bonusPct !== undefined) m.bonus_pct = c.bonusPct;
  if (c.bonusRules !== undefined) m.bonus_rules = c.bonusRules;
  if (c.address !== undefined) m.address = c.address;
  if (c.contact !== undefined) m.contact = c.contact;
  return m;
}

function toRep(r: Record<string, unknown>): Rep {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: (r.phone || "") as string,
    email: (r.email || "") as string,
    city: (r.city || "") as string,
    profilePic: (r.profile_pic || "") as string,
    telegramChatId: (r.telegram_chat_id || "") as string,
    isActive: r.is_active !== false,
    createdAt: (r.created_at || "") as string,
  };
}
function fromRep(r: Partial<Rep>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (r.id !== undefined) m.id = r.id;
  if (r.name !== undefined) m.name = r.name;
  if (r.phone !== undefined) m.phone = r.phone;
  if (r.email !== undefined) m.email = r.email;
  if (r.city !== undefined) m.city = r.city;
  if (r.profilePic !== undefined) m.profile_pic = r.profilePic;
  if (r.telegramChatId !== undefined) m.telegram_chat_id = r.telegramChatId;
  if (r.isActive !== undefined) m.is_active = r.isActive;
  if (r.createdAt !== undefined) m.created_at = r.createdAt;
  return m;
}


function toSupplier(r: Record<string, unknown>): Supplier {
  return { id: r.id as string, name: r.name as string, contact: (r.contact || "") as string, phone: (r.phone || "") as string, email: (r.email || "") as string, country: (r.country || "") as string, balance: Number(r.balance || 0), isActive: r.is_active !== false, createdAt: (r.created_at || "") as string };
}
function fromSupplier(s: Partial<Supplier>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (s.id !== undefined) m.id = s.id;
  if (s.name !== undefined) m.name = s.name;
  if (s.contact !== undefined) m.contact = s.contact;
  if (s.phone !== undefined) m.phone = s.phone;
  if (s.email !== undefined) m.email = s.email;
  if (s.country !== undefined) m.country = s.country;
  if (s.balance !== undefined) m.balance = s.balance;
  if (s.isActive !== undefined) m.is_active = s.isActive;
  if (s.createdAt !== undefined) m.created_at = s.createdAt;
  return m;
}

function toOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    orderNumber: (r.order_number || "") as string,
    clientId: (r.client_id || "") as string,
    clientName: (r.client_name || "") as string,
    repId: (r.rep_id || "") as string,
    repName: (r.rep_name || "") as string,
    orderFlow: (r.order_flow || "STANDARD") as Order["orderFlow"],
    pharmacyId: (r.pharmacy_id || null) as string | null,
    pharmacyName: (r.pharmacy_name || null) as string | null,
    items: (r.items || []) as Order["items"],
    status: (r.status || "WAITING") as Order["status"],
    totalAmount: Number(r.total_amount || 0),
    notes: (r.notes || "") as string,
    driverId: (r.driver_id || "") as string,
    driverName: (r.driver_name || "") as string,
    driverPhone: (r.driver_phone || "") as string,
    signedInvoiceUrl: (r.signed_invoice_url || "") as string,
    signedReceiptUrl: (r.signed_receipt_url || "") as string,
    deliveredAt: (r.delivered_at || "") as string,
    paidAt: (r.paid_at || "") as string,
    rejectionReason: (r.rejection_reason || "") as string,
    createdAt: (r.created_at || "") as string,
  };
}
function fromOrder(o: Partial<Order>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (o.id !== undefined) m.id = o.id;
  if (o.orderNumber !== undefined) m.order_number = o.orderNumber;
  if (o.clientId !== undefined) m.client_id = o.clientId;
  if (o.clientName !== undefined) m.client_name = o.clientName;
  if (o.repId !== undefined) m.rep_id = o.repId;
  if (o.repName !== undefined) m.rep_name = o.repName;
  if (o.orderFlow !== undefined) m.order_flow = o.orderFlow;
  if (o.pharmacyId !== undefined) m.pharmacy_id = o.pharmacyId;
  if (o.pharmacyName !== undefined) m.pharmacy_name = o.pharmacyName;
  if (o.items !== undefined) m.items = o.items;
  if (o.status !== undefined) m.status = o.status;
  if (o.totalAmount !== undefined) m.total_amount = o.totalAmount;
  if (o.notes !== undefined) m.notes = o.notes;
  if (o.driverId !== undefined) m.driver_id = o.driverId;
  if (o.driverName !== undefined) m.driver_name = o.driverName;
  if (o.driverPhone !== undefined) m.driver_phone = o.driverPhone;
  if (o.signedInvoiceUrl !== undefined) m.signed_invoice_url = o.signedInvoiceUrl;
  if (o.signedReceiptUrl !== undefined) m.signed_receipt_url = o.signedReceiptUrl;
  if (o.deliveredAt !== undefined) m.delivered_at = o.deliveredAt || null;
  if (o.paidAt !== undefined) m.paid_at = o.paidAt || null;
  if (o.rejectionReason !== undefined) m.rejection_reason = o.rejectionReason;
  if (o.createdAt !== undefined) m.created_at = o.createdAt;
  return m;
}

function toDriver(r: Record<string, unknown>): Driver {
  return {
    id: r.id as string,
    name: (r.name || "") as string,
    phone: (r.phone || "") as string,
    city: (r.city || "") as string,
    telegramChatId: (r.telegram_chat_id || "") as string,
    isActive: r.is_active !== false,
    createdAt: (r.created_at || "") as string,
  };
}
function fromDriver(d: Partial<Driver>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (d.id !== undefined) m.id = d.id;
  if (d.name !== undefined) m.name = d.name;
  if (d.phone !== undefined) m.phone = d.phone;
  if (d.city !== undefined) m.city = d.city;
  if (d.telegramChatId !== undefined) m.telegram_chat_id = d.telegramChatId;
  if (d.isActive !== undefined) m.is_active = d.isActive;
  if (d.createdAt !== undefined) m.created_at = d.createdAt;
  return m;
}

function toTransaction(r: Record<string, unknown>): Transaction {
  return { id: r.id as string, type: (r.type || "INCOME") as Transaction["type"], description: (r.description || "") as string, amount: Number(r.amount || 0), method: (r.method || "CASH") as Transaction["method"], relatedOrderId: (r.related_order_id || null) as string | null, createdAt: (r.created_at || "") as string };
}
function fromTransaction(t: Partial<Transaction>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (t.id !== undefined) m.id = t.id;
  if (t.type !== undefined) m.type = t.type;
  if (t.description !== undefined) m.description = t.description;
  if (t.amount !== undefined) m.amount = t.amount;
  if (t.method !== undefined) m.method = t.method;
  if (t.relatedOrderId !== undefined) m.related_order_id = t.relatedOrderId;
  if (t.createdAt !== undefined) m.created_at = t.createdAt;
  return m;
}

function toReturn(r: Record<string, unknown>): ReturnRecord {
  return {
    id: r.id as string,
    returnNumber: (r.return_number || "") as string,
    clientId: (r.client_id || "") as string,
    clientName: (r.client_name || "") as string,
    status: (r.status || "PENDING") as ReturnStatus,
    items: (Array.isArray(r.items) ? r.items : []) as ReturnRecord["items"],
    notes: (r.notes || "") as string,
    totalReturnedUnits: Number(r.total_returned_units || 0),
    totalBonusUnits: Number(r.total_bonus_units || 0),
    totalPaidUnits: Number(r.total_paid_units || 0),
    totalDebtCredit: Number(r.total_debt_credit || 0),
    createdAt: (r.created_at || "") as string,
  };
}
function fromReturn(r: Partial<ReturnRecord>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (r.id !== undefined) m.id = r.id;
  if (r.returnNumber !== undefined) m.return_number = r.returnNumber;
  if (r.clientId !== undefined) m.client_id = r.clientId;
  if (r.clientName !== undefined) m.client_name = r.clientName;
  if (r.status !== undefined) m.status = r.status;
  if (r.items !== undefined) m.items = r.items;
  if (r.notes !== undefined) m.notes = r.notes;
  if (r.totalReturnedUnits !== undefined) m.total_returned_units = r.totalReturnedUnits;
  if (r.totalBonusUnits !== undefined) m.total_bonus_units = r.totalBonusUnits;
  if (r.totalPaidUnits !== undefined) m.total_paid_units = r.totalPaidUnits;
  if (r.totalDebtCredit !== undefined) m.total_debt_credit = r.totalDebtCredit;
  if (r.createdAt !== undefined) m.created_at = r.createdAt;
  return m;
}

function toSettings(r: Record<string, unknown>): CompanySettings {
  return { name: (r.name || "") as string, nameEn: (r.name_en || "") as string, phone: (r.phone || "") as string, email: (r.email || "") as string, city: (r.city || "") as string, address: (r.address || "") as string, currency: (r.currency || "IQD") as string, language: (r.language || "ckb") as string, logo: (r.logo || "") as string, profilePic: (r.profile_pic || "") as string, telegramBotToken: (r.telegram_bot_token || "") as string, telegramBotUsername: (r.telegram_bot_username || "") as string, telegramNotifyChatIds: Array.isArray(r.telegram_notify_chat_ids) ? r.telegram_notify_chat_ids as string[] : [] };
}
function fromSettings(s: Partial<CompanySettings>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (s.name !== undefined) m.name = s.name;
  if (s.nameEn !== undefined) m.name_en = s.nameEn;
  if (s.phone !== undefined) m.phone = s.phone;
  if (s.email !== undefined) m.email = s.email;
  if (s.city !== undefined) m.city = s.city;
  if (s.address !== undefined) m.address = s.address;
  if (s.currency !== undefined) m.currency = s.currency;
  if (s.language !== undefined) m.language = s.language;
  if (s.logo !== undefined) m.logo = s.logo;
  if (s.profilePic !== undefined) m.profile_pic = s.profilePic;
  if (s.telegramBotToken !== undefined) m.telegram_bot_token = s.telegramBotToken;
  if (s.telegramBotUsername !== undefined) m.telegram_bot_username = s.telegramBotUsername;
  if (s.telegramNotifyChatIds !== undefined) m.telegram_notify_chat_ids = s.telegramNotifyChatIds;
  return m;
}

function toUser(r: Record<string, unknown>): User {
  return { id: r.id as string, name: (r.name || "") as string, email: (r.email || "") as string, password: "", role: (r.role || "REP") as User["role"], phone: (r.phone || "") as string, city: (r.city || "") as string, isActive: r.is_active !== false, lastSeen: (r.last_seen || "") as string, createdAt: (r.created_at ? new Date(r.created_at as string).toISOString().split("T")[0] : "") as string };
}

function toTemplate(r: Record<string, unknown>): InvoiceTemplate {
  const opts = (r.options as Record<string, unknown>) || {};
  return {
    id: r.id as string,
    name: (r.name || "") as string,
    docType: (r.doc_type || "invoice") as InvoiceTemplate["docType"],
    blocks: (r.blocks || []) as InvoiceTemplate["blocks"],
    showBonusCol: r.show_bonus_col !== false,
    defaultNote: (r.default_note || "") as string,
    defaultTerms: (r.default_terms || "") as string,
    defaultDiscount: Number(r.default_discount || 0),
    options: {
      paperSize: (opts.paperSize as TemplateOptions["paperSize"]) || "A4",
      primaryColor: (opts.primaryColor as string) || "#4263EB",
      logoUrl: opts.logoUrl as string | undefined,
      watermark: opts.watermark as string | undefined,
      fontFamily: (opts.fontFamily as string) || "system",
    },
    createdAt: (r.created_at || "") as string,
  };
}
function fromTemplate(t: Partial<InvoiceTemplate>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (t.id !== undefined) m.id = t.id;
  if (t.name !== undefined) m.name = t.name;
  if (t.docType !== undefined) m.doc_type = t.docType;
  if (t.blocks !== undefined) m.blocks = t.blocks;
  if (t.showBonusCol !== undefined) m.show_bonus_col = t.showBonusCol;
  if (t.defaultNote !== undefined) m.default_note = t.defaultNote;
  if (t.defaultTerms !== undefined) m.default_terms = t.defaultTerms;
  if (t.defaultDiscount !== undefined) m.default_discount = t.defaultDiscount;
  if (t.options !== undefined) m.options = t.options;
  if (t.createdAt !== undefined) m.created_at = t.createdAt;
  return m;
}

// ===== HELPERS =====
function toSampleRequest(r: Record<string, unknown>): SampleRequest {
  return {
    id: r.id as string,
    requestNumber: (r.request_number || "") as string,
    repId: (r.rep_id || "") as string,
    repName: (r.rep_name || "") as string,
    items: Array.isArray(r.items) ? r.items as SampleRequest["items"] : [],
    doctorName: (r.doctor_name || "") as string,
    status: (r.status || "PENDING") as SampleRequest["status"],
    note: (r.note || "") as string,
    sentAt: (r.sent_at || "") as string,
    arrivedAt: (r.arrived_at || "") as string,
    declinedReason: (r.declined_reason || "") as string,
    createdAt: (r.created_at || "") as string,
  };
}
function fromSampleRequest(s: Partial<SampleRequest>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (s.requestNumber !== undefined) m.request_number = s.requestNumber;
  if (s.repId !== undefined) m.rep_id = s.repId;
  if (s.repName !== undefined) m.rep_name = s.repName;
  if (s.items !== undefined) m.items = s.items;
  if (s.doctorName !== undefined) m.doctor_name = s.doctorName;
  if (s.status !== undefined) m.status = s.status;
  if (s.note !== undefined) m.note = s.note;
  if (s.sentAt !== undefined) m.sent_at = s.sentAt;
  if (s.arrivedAt !== undefined) m.arrived_at = s.arrivedAt;
  if (s.declinedReason !== undefined) m.declined_reason = s.declinedReason;
  return m;
}

// ===== ACTIVITY LOGGER =====
// currentActor is set by the layout heartbeat whenever a user is logged in
let _actorId = "";
let _actorName = "";
let _actorRole = "";
export function setCurrentActor(id: string, name: string, role: string) {
  _actorId = id; _actorName = name; _actorRole = role;
}
export async function logActivity(
  action: string, entityType: string,
  entityId: string, entityName: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  if (!_actorId) return; // not logged in, skip
  await supabase.from("activity_logs").insert({
    user_id: _actorId, user_name: _actorName, user_role: _actorRole,
    action, entity_type: entityType, entity_id: entityId,
    entity_name: entityName, meta,
  });
}


function genId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getNextOrderNumber(orders: Order[]): string {
  const max = orders.reduce((m, o) => {
    const num = parseInt(o.orderNumber.replace("ORD-", ""), 10);
    return num > m ? num : m;
  }, 0);
  return `ORD-${String(max + 1).padStart(3, "0")}`;
}

const defaultSettings: CompanySettings = {
  name: "", nameEn: "", phone: "",
  email: "", city: "",
  address: "", currency: "IQD", language: "ckb",
  telegramBotToken: "", telegramBotUsername: "", telegramNotifyChatIds: [],
};

// ===== CONTEXT =====
interface DataStore {
  products: Product[]; clients: Client[]; reps: Rep[]; warehouses: Client[];
  suppliers: Supplier[]; orders: Order[]; drivers: Driver[];
  transactions: Transaction[]; settings: CompanySettings; users: User[];
  invoiceTemplates: InvoiceTemplate[]; priceTypes: PriceType[];
  sampleRequests: SampleRequest[]; returns: ReturnRecord[]; loading: boolean;

  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addPriceType: (name: string) => Promise<PriceType>;
  deletePriceType: (id: string) => void;
  addClient: (c: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  updateClient: (id: string, c: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addRep: (r: Omit<Rep, "id" | "createdAt">) => Promise<Rep>;
  updateRep: (id: string, r: Partial<Rep>) => void;
  deleteRep: (id: string) => void;
  addWarehouse: (w: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  updateWarehouse: (id: string, w: Partial<Client>) => void;
  deleteWarehouse: (id: string) => void;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => Promise<Supplier>;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addOrder: (o: Omit<Order, "id" | "orderNumber" | "createdAt">) => Promise<Order>;
  updateOrder: (id: string, o: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  markOrdersAsPaid: (orderIds: string[], receiptUrl: string) => Promise<void>;
  addDriver: (d: Omit<Driver, "id" | "createdAt">) => Promise<Driver>;
  updateDriver: (id: string, d: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
  addUser: (u: Omit<User, "id" | "createdAt">) => Promise<User>;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTemplate: (t: Omit<InvoiceTemplate, "id" | "createdAt">) => Promise<InvoiceTemplate>;
  updateTemplate: (id: string, t: Partial<Omit<InvoiceTemplate, "id" | "createdAt">>) => Promise<void>;
  deleteTemplate: (id: string) => void;
  addSampleRequest: (s: Omit<SampleRequest, "id" | "requestNumber" | "createdAt">) => Promise<SampleRequest>;
  updateSampleRequest: (id: string, s: Partial<SampleRequest>) => void;
  deleteSampleRequest: (id: string) => void;
  addReturn: (r: Omit<ReturnRecord, "id" | "returnNumber" | "createdAt">) => Promise<ReturnRecord>;
  updateReturn: (id: string, r: Partial<ReturnRecord>) => Promise<void>;
  deleteReturn: (id: string) => void;
  updateSettings: (s: Partial<CompanySettings>) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  toast: { message: string; type: "success" | "error"; visible: boolean };
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataStore | null>(null);

// ── Read cache synchronously BEFORE first render ───────────────────────────
// Safe: typeof window guard means this returns null during SSR
const _c: Record<string, unknown> | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('dewa_data_cache_v1');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

export function useData(): DataStore {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cache so first render already has real data (no 0→number flash)
  const [products, setProducts] = useState<Product[]>((_c?.products as Product[]) ?? []);
  const [clients, setClients] = useState<Client[]>((_c?.clients as Client[]) ?? []);
  const [reps, setReps] = useState<Rep[]>((_c?.reps as Rep[]) ?? []);
  // warehouses is now a computed view: clients where type === 'WAREHOUSE'
  const warehouses = clients.filter(c => c.type === 'WAREHOUSE');

  const [suppliers, setSuppliers] = useState<Supplier[]>((_c?.suppliers as Supplier[]) ?? []);
  const [orders, setOrders] = useState<Order[]>((_c?.orders as Order[]) ?? []);
  const [drivers, setDrivers] = useState<Driver[]>((_c?.drivers as Driver[]) ?? []);
  const [transactions, setTransactions] = useState<Transaction[]>((_c?.transactions as Transaction[]) ?? []);
  const [settings, setSettings] = useState<CompanySettings>((_c?.settings as CompanySettings) ?? defaultSettings);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>((_c?.priceTypes as PriceType[]) ?? []);
  const [users, setUsers] = useState<User[]>((_c?.users as User[]) ?? []);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>((_c?.invoiceTemplates as InvoiceTemplate[]) ?? []);
  const [sampleRequests, setSampleRequests] = useState<SampleRequest[]>((_c?.sampleRequests as SampleRequest[]) ?? []);
  const [returns, setReturns] = useState<ReturnRecord[]>((_c?.returns as ReturnRecord[]) ?? []);
  // loading = false immediately if cache exists — no flash, no shimmer needed
  const [loading, setLoading] = useState(!_c);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // Fetch all data from Supabase
  const refreshData = useCallback(async () => {
    try {
      const [pRes, cRes, rRes, sRes, oRes, drRes, tRes, stRes, prRes, itRes, ptRes, srRes, retRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("clients").select("*"),
        supabase.from("reps").select("*"),
        supabase.from("suppliers").select("*"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("drivers").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("company_settings").select("*").single(),
        supabase.from("profiles").select("*"),
        supabase.from("invoice_templates").select("*"),
        supabase.from("price_types").select("*").order("created_at"),
        supabase.from("sample_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("returns").select("*").order("created_at", { ascending: false }),
      ]);

      const fresh = {
        products: pRes.data?.map(toProduct) ?? [],
        clients: cRes.data?.map(toClient) ?? [],
        reps: rRes.data?.map(toRep) ?? [],
        suppliers: sRes.data?.map(toSupplier) ?? [],
        orders: oRes.data?.map(toOrder) ?? [],
        drivers: drRes.data?.map(toDriver) ?? [],
        transactions: tRes.data?.map(toTransaction) ?? [],
        settings: stRes.data ? toSettings(stRes.data) : defaultSettings,
        users: prRes.data?.map(toUser) ?? [],
        invoiceTemplates: itRes.data?.map(toTemplate) ?? [],
        priceTypes: ptRes.data?.map((r) => ({ id: r.id as string, name: r.name as string, createdAt: (r.created_at || "") as string })) ?? [],
        sampleRequests: srRes.data?.map(toSampleRequest) ?? [],
        returns: retRes.data?.map(toReturn) ?? [],
      };

      setProducts(fresh.products);
      setClients(fresh.clients);
      setReps(fresh.reps);
      setSuppliers(fresh.suppliers);
      setOrders(fresh.orders);
      setDrivers(fresh.drivers);
      setTransactions(fresh.transactions);
      setSettings(fresh.settings);
      setUsers(fresh.users);
      setInvoiceTemplates(fresh.invoiceTemplates);
      setPriceTypes(fresh.priceTypes);
      setSampleRequests(fresh.sampleRequests);
      setReturns(fresh.returns);

      // Cache fresh data for next load
      try { localStorage.setItem("dewa_data_cache_v1", JSON.stringify(fresh)); } catch { /* ignore quota errors */ }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // _c module-level IIFE already seeded state with cache synchronously.
    // Just fetch fresh data from Supabase in the background.
    refreshData();
  }, [refreshData]);

  // ── Auto-sync cache whenever state changes ─────────────────────────────
  // Covers ALL mutations automatically — no per-function cache updates needed.
  useEffect(() => {
    if (loading) return; // Don't overwrite cache with empty data during initial load
    try {
      localStorage.setItem("dewa_data_cache_v1", JSON.stringify({
        products, clients, reps, suppliers, orders,
        drivers, transactions, settings, users, invoiceTemplates,
        priceTypes, sampleRequests, returns,
      }));
    } catch { /* ignore quota errors */ }
  }, [products, clients, reps, suppliers, orders, drivers,
    transactions, settings, users, invoiceTemplates, priceTypes, sampleRequests, returns, loading]);


  // ── Supabase Realtime — live updates across users/sessions ────────────
  useEffect(() => {
    const channel = supabase
      .channel("dewa-realtime")
      // Orders: any change updates the orders slice
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        (payload) => setOrders(prev => {
          if (prev.some(o => o.id === (payload.new as Record<string, string>).id)) return prev;
          return [toOrder(payload.new as Record<string, unknown>), ...prev];
        })
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => setOrders(prev =>
          prev.map(o => o.id === (payload.new as Record<string, string>).id
            ? toOrder(payload.new as Record<string, unknown>) : o)
        )
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" },
        (payload) => setOrders(prev => prev.filter(o => o.id !== (payload.old as Record<string, string>).id))
      )
      // Products
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" },
        (payload) => setProducts(prev => {
          if (prev.some(p => p.id === (payload.new as Record<string, string>).id)) return prev;
          return [toProduct(payload.new as Record<string, unknown>), ...prev];
        })
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" },
        (payload) => setProducts(prev =>
          prev.map(p => p.id === (payload.new as Record<string, string>).id
            ? toProduct(payload.new as Record<string, unknown>) : p)
        )
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "products" },
        (payload) => setProducts(prev => prev.filter(p => p.id !== (payload.old as Record<string, string>).id))
      )
      // Clients
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clients" },
        (payload) => setClients(prev => {
          if (prev.some(c => c.id === (payload.new as Record<string, string>).id)) return prev;
          return [toClient(payload.new as Record<string, unknown>), ...prev];
        })
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clients" },
        (payload) => setClients(prev =>
          prev.map(c => c.id === (payload.new as Record<string, string>).id
            ? toClient(payload.new as Record<string, unknown>) : c)
        )
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "clients" },
        (payload) => setClients(prev => prev.filter(c => c.id !== (payload.old as Record<string, string>).id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // === CRUD with Supabase ===
  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt">) => {
    const np: Product = { ...p, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setProducts((prev) => [np, ...prev]); // Optimistic
    const { error } = await supabase.from("products").insert(fromProduct(np));
    if (error) { showToast("هەڵە: " + error.message, "error"); } else { showToast("بەرهەم زیادکرا"); }
    return np;
  }, [showToast]);

  const updateProduct = useCallback(async (id: string, p: Partial<Product>) => {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const { error } = await supabase.from("products").update(fromProduct(p)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("بەرهەم نوێکرایەوە");
  }, [showToast]);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("بەرهەم سڕایەوە");
  }, [showToast]);

  const addPriceType = useCallback(async (name: string): Promise<PriceType> => {
    const nt: PriceType = { id: genId(), name, createdAt: new Date().toISOString() };
    setPriceTypes((prev) => [...prev, nt]);
    const { error } = await supabase.from("price_types").insert({ id: nt.id, name });
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("جۆری نرخ زیادکرا");
    return nt;
  }, [showToast]);

  const deletePriceType = useCallback(async (id: string) => {
    setPriceTypes((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("price_types").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error");
  }, [showToast]);

  const addClient = useCallback(async (c: Omit<Client, "id" | "createdAt">) => {
    const nc: Client = {
      ...c,
      id: genId(),
      createdAt: new Date().toISOString().split("T")[0],
      qrToken: c.qrToken || genId(), // auto-generate QR token if not provided
    };
    setClients((prev) => [nc, ...prev]);
    const { error } = await supabase.from("clients").insert(fromClient(nc));
    if (error) { showToast("هەڵە: " + error.message, "error"); return nc; }
    showToast("کڕیار زیادکرا");
    logActivity("CREATE_CLIENT", "CLIENT", nc.id, nc.name, { type: nc.type, city: nc.city });
    return nc;
  }, [showToast]);

  const updateClient = useCallback(async (id: string, c: Partial<Client>) => {
    setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...c } : x)));
    const { error } = await supabase.from("clients").update(fromClient(c)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("کڕیار نوێکرایەوە");
  }, [showToast]);

  const deleteClient = useCallback(async (id: string) => {
    setClients((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("کڕیار سڕایەوە");
  }, [showToast]);

  const addRep = useCallback(async (r: Omit<Rep, "id" | "createdAt">) => {
    const nr: Rep = { ...r, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setReps((prev) => [nr, ...prev]);
    const { error } = await supabase.from("reps").insert(fromRep(nr));
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("نوێنەر زیادکرا");
    return nr;
  }, [showToast]);

  const updateRep = useCallback(async (id: string, r: Partial<Rep>) => {
    setReps((prev) => prev.map((x) => (x.id === id ? { ...x, ...r } : x)));
    const { error } = await supabase.from("reps").update(fromRep(r)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("نوێنەر نوێکرایەوە");
  }, [showToast]);

  const deleteRep = useCallback(async (id: string) => {
    setReps((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("reps").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("نوێنەر سڕایەوە");
  }, [showToast]);

  // Warehouse CRUD → delegates to clients table (type: 'WAREHOUSE')
  const addWarehouse = useCallback(async (w: Omit<Client, "id" | "createdAt">) => {
    const nc: Client = {
      ...w,
      id: genId(), createdAt: new Date().toISOString().split("T")[0],
      type: 'WAREHOUSE',
    };
    setClients((prev) => [nc, ...prev]);
    const { error } = await supabase.from("clients").insert(fromClient(nc));
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("کۆگا زیادکرا");
    return nc;
  }, [showToast]);

  const updateWarehouse = useCallback(async (id: string, w: Partial<Client>) => {
    setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...w } : x)));
    const { error } = await supabase.from("clients").update(fromClient(w)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("کۆگا نوێکرایەوە");
  }, [showToast]);

  const deleteWarehouse = useCallback(async (id: string) => {
    setClients((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("کۆگا سڕایەوە");
  }, [showToast]);


  const addSupplier = useCallback(async (s: Omit<Supplier, "id" | "createdAt">) => {
    const ns: Supplier = { ...s, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setSuppliers((prev) => [ns, ...prev]);
    const { error } = await supabase.from("suppliers").insert(fromSupplier(ns));
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("دابینکەر زیادکرا");
    return ns;
  }, [showToast]);

  const updateSupplier = useCallback(async (id: string, s: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...s } : x)));
    const { error } = await supabase.from("suppliers").update(fromSupplier(s)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("دابینکەر نوێکرایەوە");
  }, [showToast]);

  const deleteSupplier = useCallback(async (id: string) => {
    setSuppliers((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("دابینکەر سڕایەوە");
  }, [showToast]);

  const addOrder = useCallback(async (o: Omit<Order, "id" | "orderNumber" | "createdAt">) => {
    const no: Order = { ...o, id: genId(), orderNumber: getNextOrderNumber(orders), createdAt: new Date().toISOString() };
    setOrders((prev) => [no, ...prev]);
    const { error } = await supabase.from("orders").insert(fromOrder(no));
    if (error) { showToast("هەڵە: " + error.message, "error"); return no; }
    showToast("داواکاری زیادکرا");
    logActivity("CREATE_ORDER", "ORDER", no.id, no.orderNumber, { clientName: no.clientName, repName: no.repName, totalAmount: no.totalAmount });
    return no;
  }, [orders, showToast]);

  const updateOrder = useCallback(async (id: string, o: Partial<Order>) => {
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, ...o } : x)));
    const { error } = await supabase.from("orders").update(fromOrder(o)).eq("id", id);
    if (error) { showToast("هەڵە: " + error.message, "error"); return; }

    // Log status changes
    if (o.status) {
      const actionMap: Record<string, string> = {
        WAITING: "ORDER_STATUS_WAITING", IN_PROGRESS: "ORDER_STATUS_IN_PROGRESS",
        READY: "ORDER_STATUS_READY", SENT: "ORDER_STATUS_SENT",
        DELIVERED: "ORDER_STATUS_DELIVERED", PAID: "ORDER_STATUS_PAID",
        NOT_ACCEPTED: "ORDER_STATUS_REJECTED",
      };
      const action = actionMap[o.status] || "UPDATE_ORDER";
      logActivity(action, "ORDER", id, id, { status: o.status });
    } else {
      logActivity("EDIT_ORDER", "ORDER", id, id, {});
    }

    // Decrement stock when order is marked DELIVERED
    if (o.status === "DELIVERED") {
      setOrders((prev) => {
        const order = prev.find((x) => x.id === id);
        if (!order) return prev;
        // Optimistic stock update
        setProducts((pp) => pp.map((p) => {
          const item = order.items.find((i) => i.productId === p.id);
          if (!item) return p;
          const newStock = Math.max(0, p.stock - item.quantity);
          supabase.from("products").update({ stock: newStock }).eq("id", p.id);
          return { ...p, stock: newStock };
        }));
        return prev;
      });
    }
  }, [showToast]);

  const deleteOrder = useCallback(async (id: string) => {
    setOrders((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("داواکاری سڕایەوە");
  }, [showToast]);

  const markOrdersAsPaid = useCallback(async (orderIds: string[], receiptUrl: string) => {
    const paidAt = new Date().toISOString();
    setOrders((prev) => prev.map((o) => orderIds.includes(o.id) ? { ...o, status: "PAID" as Order["status"], paidAt, signedReceiptUrl: receiptUrl } : o));
    for (const id of orderIds) {
      await supabase.from("orders").update({ status: "PAID", paid_at: paidAt, signed_receipt_url: receiptUrl }).eq("id", id);
    }
    // Record income transaction for each paid order
    setOrders((prev) => {
      const paidOrders = prev.filter((o) => orderIds.includes(o.id));
      const total = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
      const desc = `پارەدانی ${paidOrders.map(o => o.clientName).filter((v, i, a) => a.indexOf(v) === i).join(", ")} — ${paidOrders.map(o => o.orderNumber).join(", ")}`;
      supabase.from("transactions").insert(fromTransaction({ id: genId(), type: "INCOME", description: desc, amount: total, method: "CASH", relatedOrderId: orderIds[0], createdAt: paidAt }));
      return prev;
    });
    showToast("پارەدان تۆمارکرا");
  }, [showToast]);

  const addDriver = useCallback(async (d: Omit<Driver, "id" | "createdAt">) => {
    // drivers.id is uuid — let Supabase generate it, then use the returned id
    const payload = fromDriver({ ...d, createdAt: new Date().toISOString() });
    delete payload["id"]; // do NOT send custom id — uuid must come from DB
    const { data, error } = await supabase.from("drivers").insert(payload).select().single();
    if (error) {
      showToast("هەڵە: " + error.message, "error");
      const fallback: Driver = { ...d, id: "tmp-" + Date.now(), createdAt: new Date().toISOString() };
      return fallback;
    }
    const nd = toDriver(data as Record<string, unknown>);
    setDrivers((prev) => [nd, ...prev]);
    showToast("شوفێر زیادکرا ✅");
    return nd;
  }, [showToast]);

  const updateDriver = useCallback(async (id: string, d: Partial<Driver>) => {
    setDrivers((prev) => prev.map((x) => (x.id === id ? { ...x, ...d } : x)));
    const { error } = await supabase.from("drivers").update(fromDriver(d)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("شوفێر نوێکرایەوە");
  }, [showToast]);

  const deleteDriver = useCallback(async (id: string) => {
    setDrivers((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("شوفێر سڕایەوە");
  }, [showToast]);

  const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "createdAt">) => {
    const nt: Transaction = { ...t, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setTransactions((prev) => [nt, ...prev]);
    const { error } = await supabase.from("transactions").insert(fromTransaction(nt));
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast(t.type === "INCOME" ? "داهات تۆمارکرا" : "خەرجی تۆمارکرا");
    return nt;
  }, [showToast]);

  const updateSettings = useCallback(async (s: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
    const { error } = await supabase.from("company_settings").update(fromSettings(s)).eq("id", 1);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("ڕێکخستنەکان پاشەکەوتکران");
  }, [showToast]);

  // Users — managed via Supabase Auth + profiles table
  const addUser = useCallback(async (u: Omit<User, "id" | "createdAt">) => {
    const res = await fetch("/api/auth/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, password: u.password, name: u.name, role: u.role, phone: u.phone, city: u.city }),
    });
    const data = await res.json();
    if (!res.ok) { showToast("هەڵە: " + data.error, "error"); return { ...u, id: "", createdAt: "" }; }
    const nu: User = { ...u, id: data.user.id, createdAt: new Date().toISOString().split("T")[0] };
    setUsers((prev) => [nu, ...prev]);
    showToast("بەکارهێنەر زیادکرا");
    return nu;
  }, [showToast]);

  const updateUser = useCallback(async (id: string, u: Partial<User>) => {
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, ...u } : x)));
    const dbData: Record<string, unknown> = {};
    if (u.name !== undefined) dbData.name = u.name;
    if (u.email !== undefined) dbData.email = u.email;
    if (u.role !== undefined) dbData.role = u.role;
    if (u.phone !== undefined) dbData.phone = u.phone;
    if (u.city !== undefined) dbData.city = u.city;
    if (u.isActive !== undefined) dbData.is_active = u.isActive;
    const { error } = await supabase.from("profiles").update(dbData).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("بەکارهێنەر نوێکرایەوە");
  }, [showToast]);

  const deleteUser = useCallback(async (id: string) => {
    setUsers((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("بەکارهێنەر سڕایەوە");
  }, [showToast]);

  const addTemplate = useCallback(async (t: Omit<InvoiceTemplate, "id" | "createdAt">) => {
    const nt: InvoiceTemplate = { ...t, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setInvoiceTemplates((prev) => [nt, ...prev]);
    const { error } = await supabase.from("invoice_templates").insert(fromTemplate(nt));
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("داڕێژە پاشەکەوتکرا");
    return nt;
  }, [showToast]);

  const deleteTemplate = useCallback(async (id: string) => {
    setInvoiceTemplates((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("invoice_templates").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("داڕێژە سڕایەوە");
  }, [showToast]);

  const updateTemplate = useCallback(async (id: string, t: Partial<Omit<InvoiceTemplate, "id" | "createdAt">>) => {
    setInvoiceTemplates((prev) => prev.map((x) => (x.id === id ? { ...x, ...t } : x)));
    const { error } = await supabase.from("invoice_templates").update(fromTemplate(t)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("داڕێژە نوێکرایەوە");
  }, [showToast]);

  const addSampleRequest = useCallback(async (s: Omit<SampleRequest, "id" | "requestNumber" | "createdAt">): Promise<SampleRequest> => {
    const rn = `SR-${String(Date.now()).slice(-6)}`;
    const ns: SampleRequest = { ...s, id: genId(), requestNumber: rn, createdAt: new Date().toISOString() };
    setSampleRequests((prev) => [ns, ...prev]);
    const row = fromSampleRequest(ns);
    row.id = ns.id; row.request_number = rn; row.created_at = ns.createdAt;
    const { error } = await supabase.from("sample_requests").insert(row);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("داواکاری نموونە نێردرا");
    return ns;
  }, [showToast]);

  const updateSampleRequest = useCallback(async (id: string, s: Partial<SampleRequest>) => {
    setSampleRequests((prev) => prev.map((x) => (x.id === id ? { ...x, ...s } : x)));
    const { error } = await supabase.from("sample_requests").update(fromSampleRequest(s)).eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("نموونە نوێکرایەوە");
  }, [showToast]);

  const deleteSampleRequest = useCallback(async (id: string) => {
    setSampleRequests((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("sample_requests").delete().eq("id", id);
    if (error) showToast("هەڵە: " + error.message, "error"); else showToast("نموونە سڕایەوە");
  }, [showToast]);

  // ── Returns CRUD ───────────────────────────────────────────────────────
  const addReturn = useCallback(async (r: Omit<ReturnRecord, "id" | "returnNumber" | "createdAt">) => {
    const now = new Date();
    const seq = String(Date.now()).slice(-6);
    const nr: ReturnRecord = {
      ...r,
      id: `ret-${Date.now()}`,
      returnNumber: `RET-${seq}`,
      createdAt: now.toISOString().split("T")[0],
    };
    setReturns((prev) => [nr, ...prev]);
    const { error } = await supabase.from("returns").insert(fromReturn(nr));
    if (error) showToast("هەڵە: " + error.message, "error");
    else showToast(`گەڕاوە ${nr.returnNumber} تۆمارکرا ✅`);
    return nr;
  }, [showToast]);

  const updateReturn = useCallback(async (id: string, patch: Partial<ReturnRecord>) => {
    // Find current record
    setReturns((prev) => {
      const current = prev.find((x) => x.id === id);
      if (!current) return prev;
      const updated = { ...current, ...patch };

      // On status → PROCESSED: adjust client balance + restore stock + log transaction
      if (patch.status === "PROCESSED" && current.status !== "PROCESSED") {
        const now = new Date();
        // 1. Reduce client debt (balance -= totalDebtCredit)
        if (updated.totalDebtCredit > 0) {
          supabase.from("clients").select("balance").eq("id", updated.clientId).single().then(({ data }) => {
            const oldBal = Number((data as Record<string, unknown>)?.balance ?? 0);
            const newBal = Math.max(0, oldBal - updated.totalDebtCredit);
            supabase.from("clients").update({ balance: newBal }).eq("id", updated.clientId);
            setClients((cp) => cp.map((c) => c.id === updated.clientId ? { ...c, balance: newBal } : c));
          });
          // 2. Log transaction
          const desc = `گەڕاوە ${updated.returnNumber} — ${updated.clientName}`;
          const txn = { id: `txn-${Date.now()}`, type: "INCOME" as const, description: desc, amount: updated.totalDebtCredit, method: "CASH" as const, relatedOrderId: null, createdAt: now.toISOString().split("T")[0] };
          supabase.from("transactions").insert(fromTransaction(txn));
          setTransactions((tp) => [txn, ...tp]);
        }
        // 3. Restore stock for each returned item (all returned qty goes back to stock)
        for (const item of updated.items) {
          supabase.from("products").select("stock").eq("id", item.productId).single().then(({ data }) => {
            const oldStock = Number((data as Record<string, unknown>)?.stock ?? 0);
            const newStock = oldStock + item.returnedQty;
            supabase.from("products").update({ stock: newStock }).eq("id", item.productId);
            setProducts((pp) => pp.map((p) => p.id === item.productId ? { ...p, stock: newStock } : p));
          });
        }
      }

      supabase.from("returns").update(fromReturn(patch)).eq("id", id);
      return prev.map((x) => x.id === id ? updated : x);
    });
  }, [showToast]);

  const deleteReturn = useCallback(async (id: string) => {
    setReturns((prev) => {
      const record = prev.find((x) => x.id === id);
      if (record?.status === "PROCESSED") {
        showToast("گەڕاوەی پەسەندکراو ناتوانرێت بسڕێتەوە", "error");
        return prev;
      }
      supabase.from("returns").delete().eq("id", id).then(({ error }) => {
        if (error) showToast("هەڵە: " + error.message, "error");
        else showToast("گەڕاوە سڕایەوە");
      });
      return prev.filter((x) => x.id !== id);
    });
  }, [showToast]);

  return (
    <DataContext.Provider
      value={{
        products, clients, reps, warehouses, suppliers, orders, drivers, transactions, settings,
        users, invoiceTemplates, priceTypes, sampleRequests, returns, loading,
        addProduct, updateProduct, deleteProduct, addPriceType, deletePriceType,
        addClient, updateClient, deleteClient,
        addRep, updateRep, deleteRep,
        addWarehouse, updateWarehouse, deleteWarehouse,
        addSupplier, updateSupplier, deleteSupplier,
        addOrder, updateOrder, deleteOrder, markOrdersAsPaid,
        addDriver, updateDriver, deleteDriver,
        addTransaction,
        addUser, updateUser, deleteUser,
        addTemplate, updateTemplate, deleteTemplate,
        addSampleRequest, updateSampleRequest, deleteSampleRequest,
        addReturn, updateReturn, deleteReturn,
        updateSettings,
        showToast, toast, refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
