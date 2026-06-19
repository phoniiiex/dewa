"use client";
import { useState } from "react";
import { Settings, Building2, Globe, Bell, Shield, Users, Palette, Save, Check } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState("دەوا فارما");
  const [companyNameEn, setCompanyNameEn] = useState("Dewa Pharma");
  const [phone, setPhone] = useState("0770 000 1234");
  const [email, setEmail] = useState("info@dewapharma.com");
  const [city, setCity] = useState("سلێمانی");
  const [address, setAddress] = useState("شەقامی سالم، تاوەری ئازادی، نهۆم ٣");
  const [currency, setCurrency] = useState("IQD");
  const [language, setLanguage] = useState("ckb");

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#F8F9FA" };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block", color: "#495057" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F1F3F5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}><Settings size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>ڕێکخستنەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>ڕێکخستنی کۆمپانیا و سیستەم</p>
          </div>
        </div>
        <button onClick={handleSave} className="topbar-add-btn" style={{ background: saved ? "#40C057" : undefined }}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          <span>{saved ? "پاشەکەوتکرا!" : "پاشەکەوتکردن"}</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
        {/* Sidebar Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { icon: <Building2 size={16} />, label: "زانیاری کۆمپانیا", active: true },
            { icon: <Globe size={16} />, label: "زمان و دراو", active: false },
            { icon: <Bell size={16} />, label: "ئاگاداری", active: false },
            { icon: <Shield size={16} />, label: "ئاسایش", active: false },
            { icon: <Users size={16} />, label: "بەکارهێنەران", active: false },
            { icon: <Palette size={16} />, label: "تەم", active: false },
          ].map((tab, i) => (
            <button key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              borderRadius: 8, fontSize: 13, fontWeight: tab.active ? 600 : 400,
              background: tab.active ? "#EDF2FF" : "transparent",
              color: tab.active ? "#4263EB" : "#6C757D",
              border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "right",
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          <div className="kpi-card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} /> زانیاری کۆمپانیا
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div><label style={labelStyle}>ناوی کۆمپانیا (کوردی)</label><input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div><label style={labelStyle}>ناوی کۆمپانیا (ئینگلیزی)</label><input style={inputStyle} value={companyNameEn} onChange={(e) => setCompanyNameEn(e.target.value)} /></div>
              <div><label style={labelStyle}>تەلەفۆن</label><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><label style={labelStyle}>ئیمەیڵ</label><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label style={labelStyle}>شار</label><input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><label style={labelStyle}>ناونیشان</label><input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </div>
          </div>

          <div className="kpi-card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={18} /> زمان و دراو
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={labelStyle}>زمانی سیستەم</label>
                <select style={inputStyle} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="ckb">کوردی سۆرانی</option>
                  <option value="ar">عەرەبی</option>
                  <option value="en">ئینگلیزی</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>دراو</label>
                <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="IQD">دینار عێراقی (د.ع)</option>
                  <option value="USD">دۆلاری ئەمریکی ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} /> ئاگاداری
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "ئاگاداری بۆتی تێلێگرام بۆ شۆفێران", desc: "نامە بنێرە بۆ شۆفێران بەشێوەی ئۆتۆماتیکی", checked: true },
                { label: "ئاگاداری بەسەرچوونی بەرهەم", desc: "هەڵسەنگاندنی بەرهەمە نزیکی بەسەرچووەکان", checked: true },
                { label: "ئاگاداری کەمبوونی کۆگا", desc: "کاتێ بەرهەمێک لە ئاستی کەمەوە بێت", checked: false },
                { label: "ئاگاداری ئیمەیڵ", desc: "ئیمەیڵی ڕۆژانە بۆ خولاسەی فرۆشتن", checked: false },
              ].map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 3 ? "1px solid #E9ECEF" : "none" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                    <div style={{ fontSize: 12, color: "#ADB5BD" }}>{n.desc}</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                    <input type="checkbox" defaultChecked={n.checked} style={{ display: "none" }} />
                    <span style={{
                      position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                      background: n.checked ? "#4263EB" : "#DEE2E6", borderRadius: 24, transition: "0.3s",
                    }}>
                      <span style={{
                        position: "absolute", content: '""', height: 18, width: 18, bottom: 3,
                        left: n.checked ? 3 : 23, background: "white", borderRadius: "50%", transition: "0.3s",
                      }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
