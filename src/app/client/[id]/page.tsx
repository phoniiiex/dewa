"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Phone, MapPin, Wallet, ShoppingCart, CreditCard, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { formatIQD } from "@/lib/currency";

// Compact data format from QR hash
interface QRData {
  n: string;  // name
  t: string;  // type
  p: string;  // phone
  c: string;  // city
  b: number;  // balance
  o: number;  // total orders
  ta: number; // total amount
  pc: number; // paid count
  co: string; // company name
  ce: string; // company name en
}

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [data, setData] = useState<QRData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      // Read data from URL hash (embedded by QR code)
      const hash = window.location.hash;
      const match = hash.match(/d=(.+)/);
      if (match) {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
        setData(decoded);
        setLoaded(true);
        return;
      }
      // No hash data — show error
      setError(true);
      setLoaded(true);
    } catch {
      setError(true);
      setLoaded(true);
    }
  }, [clientId]);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "#FFE3E3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#FA5252", fontSize: 32 }}>!</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>داتا نەدۆزرایەوە</h1>
        <p style={{ color: "#6C757D", fontSize: 14 }}>تکایە QR کۆدەکەی پسوولەکە سکان بکەرەوە</p>
      </div>
    </div>
  );

  const typeLabel: Record<string, string> = { PHARMACY: "دەرمانخانە 💊", HOSPITAL: "نەخۆشخانە 🏥", CLINIC: "کلینیک 🩺", WAREHOUSE: "کۆگا 🏭" };
  const pendingCount = data.o - data.pc;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F8F9FA 0%, #EDF2FF 100%)", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D2B55 100%)", color: "white", padding: "40px 20px 60px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #F47B35, #FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 20 }}>د</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{data.co || "دەوا فارما"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{data.ce || "Dewa Pharma"}</div>
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{data.n}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} /> {typeLabel[data.t] || data.t}</span>
            {data.p && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={14} /> {data.p}</span>}
            {data.c && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {data.c}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ maxWidth: 700, margin: "-30px auto 0", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { label: "باڵانسی ئێستا", value: formatIQD(data.b), icon: <Wallet size={18} />, color: "#4263EB", bg: "#EDF2FF" },
            { label: "کۆی داواکارییەکان", value: `${data.o} داواکاری`, icon: <ShoppingCart size={18} />, color: "#7C5CFC", bg: "#F3F0FF" },
            { label: "کۆی بڕی فرۆشتن", value: formatIQD(data.ta), icon: <CreditCard size={18} />, color: "#F47B35", bg: "#FFF3BF" },
            { label: "پارەدراو / گشتی", value: `${data.pc} / ${data.o}`, icon: <TrendingUp size={18} />, color: "#40C057", bg: "#D3F9D8" },
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
            <div style={{ flex: 1, padding: 16, borderRadius: 10, background: "#D3F9D8", textAlign: "center" }}>
              <CheckCircle size={20} color="#2B8A3E" style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: "#2B8A3E" }}>{data.pc}</div>
              <div style={{ fontSize: 12, color: "#2B8A3E", fontWeight: 600 }}>پارەدراو</div>
            </div>
            <div style={{ flex: 1, padding: 16, borderRadius: 10, background: "#FFF3BF", textAlign: "center" }}>
              <Clock size={20} color="#E67700" style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: "#E67700" }}>{pendingCount}</div>
              <div style={{ fontSize: 12, color: "#E67700", fontWeight: 600 }}>چاوەڕوان</div>
            </div>
            <div style={{ flex: 1, padding: 16, borderRadius: 10, background: "#EDF2FF", textAlign: "center" }}>
              <ShoppingCart size={20} color="#4263EB" style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: "#4263EB" }}>{data.o}</div>
              <div style={{ fontSize: 12, color: "#4263EB", fontWeight: 600 }}>گشتی</div>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={16} color="#4263EB" /> باڵانس
          </h3>
          <div style={{ padding: 20, borderRadius: 12, background: data.b > 0 ? "linear-gradient(135deg, #FF6B6B, #EE5A24)" : data.b < 0 ? "linear-gradient(135deg, #40C057, #2B8A3E)" : "linear-gradient(135deg, #4263EB, #7C5CFC)", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "white" }}>{formatIQD(Math.abs(data.b))}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: 600 }}>
              {data.b > 0 ? "قەرزی ماوە (دەبێت بدرێت)" : data.b < 0 ? "باڵانسی زیادە (بەتاڵ)" : "بەتاڵ — هیچ قەرزێک نییە ✅"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "32px 0", color: "#ADB5BD", fontSize: 12 }}>
          <p>پشتگیریکراو لەلایەن {data.co || "دەوا فارما"}</p>
          <p style={{ marginTop: 4, fontSize: 10 }}>ئەم لاپەڕەیە بە QR کۆدی پسوولە دروستکراوە</p>
        </div>
      </div>
    </div>
  );
}
