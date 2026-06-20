// ============================================
// DEWA (دەوا) — Data Store with localStorage
// React Context for full CRUD persistence
// ============================================
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  Product, Client, Rep, Warehouse, Supplier, Order,
  Delivery, Transaction, CompanySettings, User, OrderItem,
  InvoiceTemplate,
} from "./types";

// ===== SEED DATA =====
const seedProducts: Product[] = [
  { id: "p1", name: "پاراسیتامۆل ٥٠٠مغ", sku: "PAR-500", category: "ئازارکوژ", price: 5000, stock: 2400, unitType: "پاکەت", origin: "تورکیا 🇹🇷", supplier: "مەدیکۆ تورکیا", expiryDate: "2026-08-15", batchNumber: "BT-2024-001", isSample: false, isActive: true, createdAt: "2025-01-10" },
  { id: "p2", name: "ئەمۆکسیسیلین ٥٠٠مغ", sku: "AMX-500", category: "ئەنتیبایۆتیک", price: 12000, stock: 1200, unitType: "پاکەت", origin: "فەرەنسا 🇫🇷", supplier: "فارما فرانسا", expiryDate: "2026-05-20", batchNumber: "BT-2024-002", isSample: false, isActive: true, createdAt: "2025-01-10" },
  { id: "p3", name: "ئۆمیپرازۆل ٢٠مغ", sku: "OMP-020", category: "گەدە و هەرس", price: 8500, stock: 800, unitType: "پاکەت", origin: "ئوردن 🇯🇴", supplier: "جۆردان فارما", expiryDate: "2026-12-01", batchNumber: "BT-2024-003", isSample: false, isActive: true, createdAt: "2025-02-01" },
  { id: "p4", name: "مێتفۆرمین ٨٥٠مغ", sku: "MET-850", category: "شەکرە", price: 7500, stock: 650, unitType: "پاکەت", origin: "هندستان 🇮🇳", supplier: "ئینتا فارما", expiryDate: "2027-03-10", batchNumber: "BT-2024-004", isSample: false, isActive: true, createdAt: "2025-02-15" },
  { id: "p5", name: "ئازیترۆمایسین ٥٠٠مغ", sku: "AZT-500", category: "ئەنتیبایۆتیک", price: 15000, stock: 420, unitType: "پاکەت", origin: "تورکیا 🇹🇷", supplier: "مەدیکۆ تورکیا", expiryDate: "2026-09-30", batchNumber: "BT-2024-005", isSample: false, isActive: true, createdAt: "2025-03-01" },
  { id: "p6", name: "ئیبوپرۆفین ٤٠٠مغ", sku: "IBU-400", category: "ئازارکوژ", price: 6000, stock: 1800, unitType: "پاکەت", origin: "ئوردن 🇯🇴", supplier: "جۆردان فارما", expiryDate: "2027-01-15", batchNumber: "BT-2024-006", isSample: false, isActive: true, createdAt: "2025-03-10" },
  { id: "p7", name: "سیپرۆفلۆکساسین ٥٠٠مغ", sku: "CIP-500", category: "ئەنتیبایۆتیک", price: 11000, stock: 350, unitType: "پاکەت", origin: "هندستان 🇮🇳", supplier: "ئینتا فارما", expiryDate: "2026-07-20", batchNumber: "BT-2024-007", isSample: false, isActive: true, createdAt: "2025-04-01" },
  { id: "p8", name: "ڤیتامین C ١٠٠٠مغ", sku: "VTC-1000", category: "ڤیتامین", price: 4500, stock: 3000, unitType: "بوتل", origin: "سوویسرا 🇨🇭", supplier: "سوویسرا مەد", expiryDate: "2027-06-01", batchNumber: "BT-2024-008", isSample: false, isActive: true, createdAt: "2025-04-15" },
];

const seedReps: Rep[] = [
  { id: "r1", name: "ئاکۆ مەحموود", phone: "0770 111 2222", city: "سلێمانی", isActive: true, createdAt: "2025-01-01" },
  { id: "r2", name: "هێمن ئەحمەد", phone: "0750 222 3333", city: "سلێمانی", isActive: true, createdAt: "2025-01-01" },
  { id: "r3", name: "شادی عومەر", phone: "0770 333 4444", city: "هەولێر", isActive: true, createdAt: "2025-01-15" },
  { id: "r4", name: "دانا ڕەسوول", phone: "0750 444 5555", city: "دهۆک", isActive: true, createdAt: "2025-02-01" },
  { id: "r5", name: "ڕێبوار کەریم", phone: "0770 555 6666", city: "کەرکوک", isActive: true, createdAt: "2025-02-15" },
];

const seedClients: Client[] = [
  { id: "c1", name: "دەرمانخانەی ئازادی", owner: "ئاراس عەبدوڵا", phone: "0770 123 4567", city: "سلێمانی", type: "PHARMACY", repId: "r1", paymentTerms: "NET_30", balance: 2500000, isActive: true, createdAt: "2025-01-10" },
  { id: "c2", name: "نەخۆشخانەی سلێمانی", owner: "د. کارزان محەمەد", phone: "0750 234 5678", city: "سلێمانی", type: "HOSPITAL", repId: "r2", paymentTerms: "NET_30", balance: 8200000, isActive: true, createdAt: "2025-01-15" },
  { id: "c3", name: "کلینیکی هەنار", owner: "د. ڕۆژان عومەر", phone: "0770 345 6789", city: "هەولێر", type: "CLINIC", repId: "r3", paymentTerms: "IMMEDIATE", balance: 1200000, isActive: true, createdAt: "2025-02-01" },
  { id: "c4", name: "دەرمانخانەی ڕۆژ", owner: "سەرهەنگ عەلی", phone: "0750 456 7890", city: "دهۆک", type: "PHARMACY", repId: "r4", paymentTerms: "IMMEDIATE", balance: 0, isActive: true, createdAt: "2025-02-10" },
  { id: "c5", name: "دەرمانخانەی ڕۆشنا", owner: "نازدار حەسەن", phone: "0770 567 8901", city: "کەرکوک", type: "PHARMACY", repId: "r5", paymentTerms: "NET_15", balance: 3400000, isActive: true, createdAt: "2025-03-01" },
  { id: "c6", name: "نەخۆشخانەی هەولێر", owner: "د. ئاسۆ کەریم", phone: "0750 678 9012", city: "هەولێر", type: "HOSPITAL", repId: "r1", paymentTerms: "NET_30", balance: 5600000, isActive: true, createdAt: "2025-03-15" },
];

const seedWarehouses: Warehouse[] = [
  { id: "w1", name: "کۆگای هیمۆ لاب", city: "سلێمانی", address: "شەقامی سالم، نزیک میدیای شار", contact: "هاوڕێ محەمەد", phone: "0770 100 2000", bonusPct: 20, isActive: true, createdAt: "2025-01-01" },
  { id: "w2", name: "کۆگای ڕۆشنبیری", city: "هەولێر", address: "شەقامی ٦٠ مەتری", contact: "عەلی جەعفەر", phone: "0750 200 3000", bonusPct: 15, isActive: true, createdAt: "2025-01-01" },
  { id: "w3", name: "کۆگای سەلامەتی", city: "دهۆک", address: "شەقامی بارزان", contact: "ئازاد ئەحمەد", phone: "0770 300 4000", bonusPct: 18, isActive: true, createdAt: "2025-02-01" },
];

const seedSuppliers: Supplier[] = [
  { id: "s1", name: "فارما فرانسا", contact: "Jean Dupont", phone: "+33 1 4567 8901", email: "orders@pharmafrance.com", country: "فەرەنسا 🇫🇷", balance: 45000000, isActive: true, createdAt: "2025-01-01" },
  { id: "s2", name: "مەدیکۆ تورکیا", contact: "Ahmet Yilmaz", phone: "+90 212 345 6789", email: "sales@medicoturkey.com", country: "تورکیا 🇹🇷", balance: 32000000, isActive: true, createdAt: "2025-01-01" },
  { id: "s3", name: "جۆردان فارما", contact: "خالد المحمد", phone: "+962 6 123 4567", email: "info@jordanpharma.com", country: "ئوردن 🇯🇴", balance: 15000000, isActive: true, createdAt: "2025-01-15" },
  { id: "s4", name: "ئینتا فارما", contact: "Raj Patel", phone: "+91 22 4567 8901", email: "export@intapharma.in", country: "هندستان 🇮🇳", balance: 28000000, isActive: true, createdAt: "2025-02-01" },
];

const seedOrders: Order[] = [
  { id: "o1", orderNumber: "ORD-001", clientId: "c1", clientName: "دەرمانخانەی ئازادی", repId: "r1", repName: "ئاکۆ مەحموود", warehouseId: "w1", warehouseName: "کۆگای هیمۆ لاب", items: [{ productId: "p1", productName: "پاراسیتامۆل ٥٠٠مغ", quantity: 100, bonusQty: 30, unitPrice: 5000 }], status: "PAID", routingMode: "WAREHOUSE", bonusNotation: "100+50", totalBonusPct: 50, warehouseBonusPct: 20, repBonusPct: 30, totalAmount: 500000, notes: "", createdAt: "2025-10-28" },
  { id: "o2", orderNumber: "ORD-002", clientId: "c2", clientName: "نەخۆشخانەی سلێمانی", repId: "r2", repName: "هێمن ئەحمەد", warehouseId: "w2", warehouseName: "کۆگای ڕۆشنبیری", items: [{ productId: "p2", productName: "ئەمۆکسیسیلین ٥٠٠مغ", quantity: 200, bonusQty: 50, unitPrice: 12000 }], status: "SHIPPED", routingMode: "WAREHOUSE", bonusNotation: "200+40", totalBonusPct: 40, warehouseBonusPct: 15, repBonusPct: 25, totalAmount: 2400000, notes: "", createdAt: "2025-10-29" },
  { id: "o3", orderNumber: "ORD-003", clientId: "c3", clientName: "کلینیکی هەنار", repId: "r3", repName: "شادی عومەر", warehouseId: null, warehouseName: null, items: [{ productId: "p3", productName: "ئۆمیپرازۆل ٢٠مغ", quantity: 80, bonusQty: 14, unitPrice: 8500 }], status: "PROCESSING", routingMode: "DIRECT", bonusNotation: "80+14", totalBonusPct: 17, warehouseBonusPct: 0, repBonusPct: 17, totalAmount: 680000, notes: "گەیاندنی خێرا", createdAt: "2025-10-29" },
];

const seedDeliveries: Delivery[] = [
  { id: "d1", orderId: "o1", orderNumber: "ORD-001", type: "WAREHOUSE", driver: "عومەر سەعید", driverPhone: "0770 900 1111", destination: "کۆگای هیمۆ لاب — سلێمانی", status: "DELIVERED", items: "پاراسیتامۆل × ١٢٠", dispatchedAt: "٢٩/١٠ — ٠٩:٠٠", deliveredAt: "٢٩/١٠ — ١٤:٣٠", createdAt: "2025-10-28" },
  { id: "d2", orderId: "o2", orderNumber: "ORD-002", type: "WAREHOUSE", driver: "ڕۆژگار عەلی", driverPhone: "0750 800 2222", destination: "کۆگای ڕۆشنبیری — هەولێر", status: "IN_TRANSIT", items: "ئەمۆکسیسیلین × ٢٣٠", dispatchedAt: "٢٨/١٠ — ١١:٠٠", deliveredAt: "—", createdAt: "2025-10-29" },
  { id: "d3", orderId: "o3", orderNumber: "ORD-003", type: "DIRECT", driver: "", driverPhone: "", destination: "کلینیکی هەنار — هەولێر", status: "PENDING", items: "ئۆمیپرازۆل × ٩٤", dispatchedAt: "—", deliveredAt: "—", createdAt: "2025-10-29" },
];

const seedTransactions: Transaction[] = [
  { id: "t1", type: "INCOME", description: "پارەدانی دەرمانخانەی ئازادی", amount: 2500000, method: "CASH", relatedOrderId: "o1", createdAt: "2025-10-29" },
  { id: "t2", type: "EXPENSE", description: "کڕینی دەرمان لە فارما فرانسا", amount: 8000000, method: "TRANSFER", relatedOrderId: null, createdAt: "2025-10-29" },
  { id: "t3", type: "INCOME", description: "پارەدانی نەخۆشخانەی سلێمانی", amount: 5200000, method: "TRANSFER", relatedOrderId: "o2", createdAt: "2025-10-28" },
  { id: "t4", type: "EXPENSE", description: "مووچەی نوێنەران", amount: 3200000, method: "CASH", relatedOrderId: null, createdAt: "2025-10-28" },
];

const seedUsers: User[] = [
  { id: "u-admin", name: "ئاسۆ ئەحمەد", email: "admin@dewa.com", password: "dewa2025", role: "ADMIN", phone: "0770 000 1234", city: "سلێمانی", isActive: true, createdAt: "2025-01-01" },
];

const defaultSettings: CompanySettings = {
  name: "دەوا فارما",
  nameEn: "Dewa Pharma",
  phone: "0770 000 1234",
  email: "info@dewapharma.com",
  city: "سلێمانی",
  address: "شەقامی سالم، تاوەری ئازادی، نهۆم ٣",
  currency: "IQD",
  language: "ckb",
};

// ===== HELPER =====
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

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`dewa_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`dewa_${key}`, JSON.stringify(data));
}

// ===== CONTEXT =====
interface DataStore {
  // Data
  products: Product[];
  clients: Client[];
  reps: Rep[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  orders: Order[];
  deliveries: Delivery[];
  transactions: Transaction[];
  settings: CompanySettings;
  users: User[];
  invoiceTemplates: InvoiceTemplate[];

  // Product CRUD
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Client CRUD
  addClient: (c: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, c: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Rep CRUD
  addRep: (r: Omit<Rep, "id" | "createdAt">) => Rep;
  updateRep: (id: string, r: Partial<Rep>) => void;
  deleteRep: (id: string) => void;

  // Warehouse CRUD
  addWarehouse: (w: Omit<Warehouse, "id" | "createdAt">) => Warehouse;
  updateWarehouse: (id: string, w: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  // Supplier CRUD
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Order CRUD
  addOrder: (o: Omit<Order, "id" | "orderNumber" | "createdAt">) => Order;
  updateOrder: (id: string, o: Partial<Order>) => void;
  deleteOrder: (id: string) => void;

  // Delivery CRUD
  addDelivery: (d: Omit<Delivery, "id" | "createdAt">) => Delivery;
  updateDelivery: (id: string, d: Partial<Delivery>) => void;

  // Transaction CRUD
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Transaction;

  // User CRUD
  addUser: (u: Omit<User, "id" | "createdAt">) => User;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Template CRUD
  addTemplate: (t: Omit<InvoiceTemplate, "id" | "createdAt">) => InvoiceTemplate;
  deleteTemplate: (id: string) => void;

  // Settings
  updateSettings: (s: Partial<CompanySettings>) => void;

  // Toast
  showToast: (message: string, type?: "success" | "error") => void;
  toast: { message: string; type: "success" | "error"; visible: boolean };
}

const DataContext = createContext<DataStore | null>(null);

export function useData(): DataStore {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [users, setUsers] = useState<User[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });

  // Load from localStorage on mount
  useEffect(() => {
    setProducts(loadFromStorage("products", seedProducts));
    setClients(loadFromStorage("clients", seedClients));
    setReps(loadFromStorage("reps", seedReps));
    setWarehouses(loadFromStorage("warehouses", seedWarehouses));
    setSuppliers(loadFromStorage("suppliers", seedSuppliers));
    setOrders(loadFromStorage("orders", seedOrders));
    setDeliveries(loadFromStorage("deliveries", seedDeliveries));
    setTransactions(loadFromStorage("transactions", seedTransactions));
    setSettings(loadFromStorage("settings", defaultSettings));
    setUsers(loadFromStorage("users", seedUsers));
    setInvoiceTemplates(loadFromStorage("invoiceTemplates", []));
    setLoaded(true);
  }, []);

  // Auto-save on change
  useEffect(() => { if (loaded) saveToStorage("products", products); }, [products, loaded]);
  useEffect(() => { if (loaded) saveToStorage("clients", clients); }, [clients, loaded]);
  useEffect(() => { if (loaded) saveToStorage("reps", reps); }, [reps, loaded]);
  useEffect(() => { if (loaded) saveToStorage("warehouses", warehouses); }, [warehouses, loaded]);
  useEffect(() => { if (loaded) saveToStorage("suppliers", suppliers); }, [suppliers, loaded]);
  useEffect(() => { if (loaded) saveToStorage("orders", orders); }, [orders, loaded]);
  useEffect(() => { if (loaded) saveToStorage("deliveries", deliveries); }, [deliveries, loaded]);
  useEffect(() => { if (loaded) saveToStorage("transactions", transactions); }, [transactions, loaded]);
  useEffect(() => { if (loaded) saveToStorage("settings", settings); }, [settings, loaded]);
  useEffect(() => { if (loaded) saveToStorage("users", users); }, [users, loaded]);
  useEffect(() => { if (loaded) saveToStorage("invoiceTemplates", invoiceTemplates); }, [invoiceTemplates, loaded]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // === CRUD Functions ===
  const addProduct = useCallback((p: Omit<Product, "id" | "createdAt">) => {
    const np: Product = { ...p, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setProducts((prev) => [np, ...prev]);
    showToast("بەرهەم زیادکرا");
    return np;
  }, [showToast]);

  const updateProduct = useCallback((id: string, p: Partial<Product>) => {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    showToast("بەرهەم نوێکرایەوە");
  }, [showToast]);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((x) => x.id !== id));
    showToast("بەرهەم سڕایەوە");
  }, [showToast]);

  const addClient = useCallback((c: Omit<Client, "id" | "createdAt">) => {
    const nc: Client = { ...c, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setClients((prev) => [nc, ...prev]);
    showToast("کڕیار زیادکرا");
    return nc;
  }, [showToast]);

  const updateClient = useCallback((id: string, c: Partial<Client>) => {
    setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...c } : x)));
    showToast("کڕیار نوێکرایەوە");
  }, [showToast]);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((x) => x.id !== id));
    showToast("کڕیار سڕایەوە");
  }, [showToast]);

  const addRep = useCallback((r: Omit<Rep, "id" | "createdAt">) => {
    const nr: Rep = { ...r, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setReps((prev) => [nr, ...prev]);
    showToast("نوێنەر زیادکرا");
    return nr;
  }, [showToast]);

  const updateRep = useCallback((id: string, r: Partial<Rep>) => {
    setReps((prev) => prev.map((x) => (x.id === id ? { ...x, ...r } : x)));
    showToast("نوێنەر نوێکرایەوە");
  }, [showToast]);

  const deleteRep = useCallback((id: string) => {
    setReps((prev) => prev.filter((x) => x.id !== id));
    showToast("نوێنەر سڕایەوە");
  }, [showToast]);

  const addWarehouse = useCallback((w: Omit<Warehouse, "id" | "createdAt">) => {
    const nw: Warehouse = { ...w, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setWarehouses((prev) => [nw, ...prev]);
    showToast("کۆگا زیادکرا");
    return nw;
  }, [showToast]);

  const updateWarehouse = useCallback((id: string, w: Partial<Warehouse>) => {
    setWarehouses((prev) => prev.map((x) => (x.id === id ? { ...x, ...w } : x)));
    showToast("کۆگا نوێکرایەوە");
  }, [showToast]);

  const deleteWarehouse = useCallback((id: string) => {
    setWarehouses((prev) => prev.filter((x) => x.id !== id));
    showToast("کۆگا سڕایەوە");
  }, [showToast]);

  const addSupplier = useCallback((s: Omit<Supplier, "id" | "createdAt">) => {
    const ns: Supplier = { ...s, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setSuppliers((prev) => [ns, ...prev]);
    showToast("دابینکەر زیادکرا");
    return ns;
  }, [showToast]);

  const updateSupplier = useCallback((id: string, s: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...s } : x)));
    showToast("دابینکەر نوێکرایەوە");
  }, [showToast]);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers((prev) => prev.filter((x) => x.id !== id));
    showToast("دابینکەر سڕایەوە");
  }, [showToast]);

  const addOrder = useCallback((o: Omit<Order, "id" | "orderNumber" | "createdAt">) => {
    const no: Order = { ...o, id: genId(), orderNumber: getNextOrderNumber(orders), createdAt: new Date().toISOString().split("T")[0] };
    setOrders((prev) => [no, ...prev]);
    showToast("داواکاری زیادکرا");
    return no;
  }, [orders, showToast]);

  const updateOrder = useCallback((id: string, o: Partial<Order>) => {
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, ...o } : x)));
    showToast("داواکاری نوێکرایەوە");
  }, [showToast]);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((x) => x.id !== id));
    showToast("داواکاری سڕایەوە");
  }, [showToast]);

  const addDelivery = useCallback((d: Omit<Delivery, "id" | "createdAt">) => {
    const nd: Delivery = { ...d, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setDeliveries((prev) => [nd, ...prev]);
    showToast("گەیاندن زیادکرا");
    return nd;
  }, [showToast]);

  const updateDelivery = useCallback((id: string, d: Partial<Delivery>) => {
    setDeliveries((prev) => prev.map((x) => (x.id === id ? { ...x, ...d } : x)));
    showToast("گەیاندن نوێکرایەوە");
  }, [showToast]);

  const addTransaction = useCallback((t: Omit<Transaction, "id" | "createdAt">) => {
    const nt: Transaction = { ...t, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setTransactions((prev) => [nt, ...prev]);
    showToast(t.type === "INCOME" ? "داهات تۆمارکرا" : "خەرجی تۆمارکرا");
    return nt;
  }, [showToast]);

  const updateSettings = useCallback((s: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
    showToast("ڕێکخستنەکان پاشەکەوتکران");
  }, [showToast]);

  const addUser = useCallback((u: Omit<User, "id" | "createdAt">) => {
    const nu: User = { ...u, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setUsers((prev) => [nu, ...prev]);
    showToast("بەکارهێنەر زیادکرا");
    return nu;
  }, [showToast]);

  const updateUser = useCallback((id: string, u: Partial<User>) => {
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, ...u } : x)));
    showToast("بەکارهێنەر نوێکرایەوە");
  }, [showToast]);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((x) => x.id !== id));
    showToast("بەکارهێنەر سڕایەوە");
  }, [showToast]);

  const addTemplate = useCallback((t: Omit<InvoiceTemplate, "id" | "createdAt">) => {
    const nt: InvoiceTemplate = { ...t, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setInvoiceTemplates((prev) => [nt, ...prev]);
    showToast("داڕێژە پاشەکەوتکرا");
    return nt;
  }, [showToast]);

  const deleteTemplate = useCallback((id: string) => {
    setInvoiceTemplates((prev) => prev.filter((x) => x.id !== id));
    showToast("داڕێژە سڕایەوە");
  }, [showToast]);

  return (
    <DataContext.Provider
      value={{
        products, clients, reps, warehouses, suppliers, orders, deliveries, transactions, settings,
        users, invoiceTemplates,
        addProduct, updateProduct, deleteProduct,
        addClient, updateClient, deleteClient,
        addRep, updateRep, deleteRep,
        addWarehouse, updateWarehouse, deleteWarehouse,
        addSupplier, updateSupplier, deleteSupplier,
        addOrder, updateOrder, deleteOrder,
        addDelivery, updateDelivery,
        addTransaction,
        addUser, updateUser, deleteUser,
        addTemplate, deleteTemplate,
        updateSettings,
        showToast, toast,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
