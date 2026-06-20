"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Phone, MapPin, Wallet, ShoppingCart, CreditCard, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import type { Client, Order, Transaction, CompanySettings } from "@/lib/types";
import { formatIQD } from "@/lib/currency";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`dewa_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const allClients = loadFromStorage<Client[]>("clients", []);
    const allOrders = loadFromStorage<Order[]>("orders", []);
    const allTransactions = loadFromStorage<Transaction[]>("transactions", []);
    const companySettings = loadFromStorage<CompanySettings>("settings", { name: "دەوا فارما", nameEn: "Dewa Pharma", phone: "", email: "", city: "", address: "", currency: "IQD", language: "ckb" });

    const foundClient = allClients.find(c => c.id === clientId);
    setClient(foundClient || null);
    setOrders(allOrders.filter(o => o.clientId === clientId));
    setTransactions(allTransactions.filter(t => {
      const relatedOrder = allOrders.find(o => o.id === t.relatedOrderId);
      return relatedOrder && relatedOrder.clientId === clientId;
    }));
    setSettings(companySettings);
    setLoaded(true);
  }, [clientId]);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!client) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "#FFE3E3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FA5252", fontSize: 32 }}>!</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>کڕیار نەدۆزرایەوە</h1>
        <p style={{ color: "#6C757D", fontSize: 14 }}>ئەم لینکە بەردەست نییە یان کڕیارەکە سڕدرایەوە</p>
      </div>
    </div>
  );

  const totalOrderAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaid = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const paidOrders = orders.filter(o => o.status === "PAID").length;
  const pendingOrders = orders.filter(o => o.status !== "PAID" && o.status !== "CANCELLED").length;
  const typeLabel: Record<string, string> = { PHARMACY: "دەرمانخانە 💊", HOSPITAL: "نەخۆشخانە 🏥", CLINIC: "کلینیک 🩺" };
  const statusLabels: Record<string, string> = { PENDING: "چاوەڕوان", PROCESSING: "لە پڕۆسەدا", SHIPPED: "نێردرا", DELIVERED: "گەیشت", PAID: "پارەدراو", CANCELLED: "هەڵوەشاوە" };
  const statusColors: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: "#FFF3BF", color: "#E67700" }, PROCESSING: { bg: "#D0EBFF", color: "#1971C2" },
    SHIPPED: { bg: "#E8F5E9", color: "#2E7D32" }, DELIVERED: { bg: "#D3F9D8", color: "#2B8A3E" },
    PAID: { bg: "#D3F9D8", color: "#2B8A3E" }, CANCELLED: { bg: "#FFE3E3", color: "#C92A2A" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F8F9FA 0%, #EDF2FF 100%)", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D2B55 100%)", color: "white", padding: "40px 20px 60px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            {settings?.logo ? (
              <img src={settings.logo} alt="logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 20 }}>د</div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{settings?.name || "دەوا فارما"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{settings?.nameEn || "Dewa Pharma"}</div>
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{client.name}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} /> {typeLabel[client.type] || client.type}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={14} /> {client.phone}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {client.city}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ maxWidth: 700, margin: "-30px auto 0", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { label: "باڵانسی ئێستا", value: formatIQD(client.balance), icon: <Wallet size={18} />, color: "#4263EB", bg: "#EDF2FF" },
            { label: "کۆی داواکارییەکان", value: `${orders.length} داواکاری`, icon: <ShoppingCart size={18} />, color: "#7C5CFC", bg: "#F3F0FF" },
            { label: "کۆی پارەدراو", value: formatIQD(totalPaid), icon: <TrendingUp size={18} />, color: "#40C057", bg: "#D3F9D8" },
            { label: "کۆی بڕی فرۆشتن", value: formatIQD(totalOrderAmount), icon: <CreditCard size={18} />, color: "#F47B35", bg: "#FFF3BF" },
          ].map((kpi, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color }}>{kpi.icon}</div>
                <span style={{ fontSize: 11, color: "#6C757D", fontWeight: 600 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Order Status Summary */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={16} color="#4263EB" /> خلاصەی داواکارییەکان
          </h3>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#D3F9D8", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#2B8A3E" }}>{paidOrders}</div>
              <div style={{ fontSize: 11, color: "#2B8A3E", fontWeight: 600 }}>پارەدراو</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#FFF3BF", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#E67700" }}>{pendingOrders}</div>
              <div style={{ fontSize: 11, color: "#E67700", fontWeight: 600 }}>چاوەڕوان</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#EDF2FF", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#4263EB" }}>{orders.length}</div>
              <div style={{ fontSize: 11, color: "#4263EB", fontWeight: 600 }}>گشتی</div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {orders.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={16} color="#7C5CFC" /> مێژووی داواکارییەکان
            </h3>
            {orders.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F3F5" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{o.orderNumber}</div>
                  <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 2 }}>{o.createdAt} · {o.items.length} بەرهەم</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{formatIQD(o.totalAmount)}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: statusColors[o.status]?.bg || "#F1F3F5", color: statusColors[o.status]?.color || "#6C757D" }}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment History */}
        {transactions.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={16} color="#40C057" /> مێژووی پارەدان
            </h3>
            {transactions.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F3F5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: t.type === "INCOME" ? "#D3F9D8" : "#FFE3E3", color: t.type === "INCOME" ? "#2B8A3E" : "#FA5252" }}>
                    {t.type === "INCOME" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: "#ADB5BD" }}>{t.createdAt} · {t.method === "CASH" ? "نەقد" : "ترانسفێر"}</div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.type === "INCOME" ? "#2B8A3E" : "#FA5252" }}>
                  {t.type === "INCOME" ? "+" : "-"}{formatIQD(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "32px 0", color: "#ADB5BD", fontSize: 12 }}>
          <p>پشتگیریکراو لەلایەن {settings?.name || "دەوا فارما"}</p>
          <p style={{ marginTop: 4 }}>{settings?.phone} | {settings?.email}</p>
        </div>
      </div>
    </div>
  );
}
