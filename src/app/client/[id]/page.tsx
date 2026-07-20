"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Phone, MapPin, Wallet, ShoppingCart, CreditCard, TrendingUp, CheckCircle, Clock, Package, AlertTriangle } from "lucide-react";
import { formatIQD } from "@/lib/currency";

interface ClientData {
  name: string;
  type: string;
  phone: string;
  city: string;
  balance: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { productName: string; quantity: number; bonusQty: number; unitPrice: number }[];
}

interface SettingsData {
  name: string;
  nameEn: string;
  phone: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  WAITING:      { label: "چاوەڕوان",       color: "#E67700", bg: "#FFF3BF" },
  IN_PROGRESS:  { label: "لە پڕۆسەدا",    color: "#7C5CFC", bg: "#F3F0FF" },
  READY:        { label: "ئامادەیە",       color: "#1098AD", bg: "#C3FAE8" },
  SENT:         { label: "نێردرا",         color: "#4263EB", bg: "#EDF2FF" },
  DELIVERED:    { label: "گەیشت",          color: "#F47B35", bg: "#FFF3BF" },
  NOT_ACCEPTED: { label: "ڕەتکراوە",       color: "#DC2626", bg: "#FFE3E3" },
  PAID:         { label: "پارەدراوە",      color: "#059669", bg: "#D1FAE5" },
};

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { supabase } = await import("@/lib/supabase");

        // Fetch client
        const { data: clientRow } = await supabase
          .from("clients")
          .select("name, type, phone, city, balance")
          .eq("id", clientId)
          .single();

        if (!clientRow) { setError(true); setLoading(false); return; }
        setClient(clientRow);

        // Fetch orders
        const { data: orderRows } = await supabase
          .from("orders")
          .select("id, orderNumber:order_number, status, totalAmount:total_amount, createdAt:created_at, items")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        setOrders((orderRows || []).map(o => ({
          ...o,
          items: Array.isArray(o.items) ? o.items : (typeof o.items === "string" ? JSON.parse(o.items) : []),
        })));

        // Fetch settings
        const { data: settingsRows } = await supabase
          .from("settings")
          .select("name, nameEn:name_en, phone")
          .limit(1);
        if (settingsRows?.[0]) setSettings(settingsRows[0]);

        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    }
    if (clientId) fetchData();
  }, [clientId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (error || !client) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "#FFE3E3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FA5252", fontSize: 32 }}>!</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>داتا نەدۆزرایەوە</h1>
        <p style={{ color: "#6C757D", fontSize: 14 }}>تکایە QR کۆدەکەی پسوولەکە سکان بکەرەوە</p>
      </div>
    </div>
  );

  const typeLabel: Record<string, string> = { PHARMACY: "دەرمانخانە 💊", HOSPITAL: "نەخۆشخانە 🏥", CLINIC: "کلینیک 🩺", WAREHOUSE: "کۆگا 🏭" };
  const paidOrders = orders.filter(o => o.status === "PAID");
  const unpaidOrders = orders.filter(o => o.status !== "PAID" && o.status !== "NOT_ACCEPTED");
  const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paidAmount = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
  const unpaidAmount = unpaidOrders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F8F9FA 0%, #EDF2FF 100%)", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D2B55 100%)", color: "white", padding: "40px 20px 60px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 20 }}>د</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{settings?.name || "دەوا فارما"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{settings?.nameEn || "Dewa Pharma"}</div>
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{client.name}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} /> {typeLabel[client.type] || client.type}</span>
            {client.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={14} /> {client.phone}</span>}
            {client.city && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {client.city}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ maxWidth: 700, margin: "-30px auto 0", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { label: "باڵانسی ئێستا", value: formatIQD(client.balance), icon: <Wallet size={18} />, color: "#4263EB", bg: "#EDF2FF" },
            { label: "کۆی داواکارییەکان", value: `${orders.length} داواکاری`, icon: <ShoppingCart size={18} />, color: "#7C5CFC", bg: "#F3F0FF" },
            { label: "پارەدراو", value: formatIQD(paidAmount), icon: <CheckCircle size={18} />, color: "#059669", bg: "#D3F9D8" },
            { label: "نەدراو", value: formatIQD(unpaidAmount), icon: <AlertTriangle size={18} />, color: "#E67700", bg: "#FFF3BF" },
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

        {/* Balance Status */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={16} color="#4263EB" /> باڵانس
          </h3>
          <div style={{ padding: 20, borderRadius: 12, background: client.balance > 0 ? "linear-gradient(135deg, #FF6B6B, #EE5A24)" : client.balance < 0 ? "linear-gradient(135deg, #40C057, #2B8A3E)" : "linear-gradient(135deg, #4263EB, #7C5CFC)", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "white" }}>{formatIQD(Math.abs(client.balance))}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: 600 }}>
              {client.balance > 0 ? "قەرزی ماوە (دەبێت بدرێت)" : client.balance < 0 ? "باڵانسی زیادە" : "بەتاڵ — هیچ قەرزێک نییە ✅"}
            </div>
          </div>
        </div>

        {/* Unpaid Orders */}
        {unpaidOrders.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#E67700" }}>
              <Clock size={16} /> داواکارییە نەدراوەکان ({unpaidOrders.length})
            </h3>
            {unpaidOrders.map(o => {
              const st = STATUS_LABELS[o.status] || { label: o.status, color: "#6C757D", bg: "#F1F3F5" };
              return (
                <div key={o.id} style={{ padding: 14, borderRadius: 10, border: "1px solid #FFF3BF", background: "#FFFDF5", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>#{o.orderNumber}</div>
                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6C757D", marginBottom: 6 }}>
                    <span>{o.createdAt?.split("T")[0]}</span>
                    <span style={{ fontWeight: 800, color: "#E67700", fontSize: 14 }}>{formatIQD(o.totalAmount)}</span>
                  </div>
                  {o.items?.length > 0 && (
                    <div style={{ fontSize: 11, color: "#868E96", marginTop: 4 }}>
                      {o.items.map((it, i) => (
                        <span key={i}>{it.productName} ×{it.quantity}{i < o.items.length - 1 ? " · " : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Paid Orders */}
        {paidOrders.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#059669" }}>
              <CheckCircle size={16} /> داواکارییە پارەدراوەکان ({paidOrders.length})
            </h3>
            {paidOrders.map(o => (
              <div key={o.id} style={{ padding: 14, borderRadius: 10, border: "1px solid #D3F9D8", background: "#F0FFF4", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>#{o.orderNumber}</div>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#D1FAE5", color: "#059669" }}>پارەدراوە ✅</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6C757D" }}>
                  <span>{o.createdAt?.split("T")[0]}</span>
                  <span style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>{formatIQD(o.totalAmount)}</span>
                </div>
                {o.items?.length > 0 && (
                  <div style={{ fontSize: 11, color: "#868E96", marginTop: 4 }}>
                    {o.items.map((it, i) => (
                      <span key={i}>{it.productName} ×{it.quantity}{i < o.items.length - 1 ? " · " : ""}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No orders */}
        {orders.length === 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: 40, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16, textAlign: "center" }}>
            <Package size={40} color="#ADB5BD" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#6C757D", fontSize: 14 }}>هیچ داواکارییەک نییە</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "32px 0", color: "#ADB5BD", fontSize: 12 }}>
          <p>پشتگیریکراو لەلایەن {settings?.name || "دەوا فارما"}</p>
          <p style={{ marginTop: 4, fontSize: 10 }}>ئەم لاپەڕەیە بە QR کۆدی پسوولە دروستکراوە</p>
        </div>
      </div>
    </div>
  );
}
