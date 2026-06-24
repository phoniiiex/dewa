"use client";
import { useState, FormEvent, useRef } from "react";
import { Settings2, Building2, Save, RefreshCw, Camera, Upload, Users, ArrowLeft } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, FormGrid, inputStyle } from "@/components/ui/FormField";
import Link from "next/link";

function ImageUploader({ value, onChange, label, shape }: { value?: string; onChange: (v: string) => void; label: string; shape: "square" | "circle" }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("فایلەکە زۆر گەورەیە (حد: 500KB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) onChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  };
  const sz = shape === "circle" ? 100 : 80;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div onClick={() => ref.current?.click()} style={{
        width: sz, height: sz, borderRadius: shape === "circle" ? "50%" : 14,
        border: "2px dashed #DEE2E6", overflow: "hidden", cursor: "pointer", position: "relative",
        background: value ? `url(${value}) center/cover no-repeat` : "linear-gradient(135deg, #F1F3F5, #E9ECEF)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
      }}>
        {!value && <Upload size={20} color="#ADB5BD" />}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s", borderRadius: shape === "circle" ? "50%" : 14 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
          <Camera size={20} color="white" />
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6C757D" }}>{label}</span>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {value && <button onClick={() => onChange("")} style={{ fontSize: 10, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>سڕینەوە</button>}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useData();
  const [companyForm, setCompanyForm] = useState(settings);

  const handleCompanySave = (e: FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
    showToast("زانیاری کۆمپانیا پاشەکەوتکرا", "success");
  };

  const handleResetData = () => {
    if (confirm("ئایا دڵنیایت لە سڕینەوەی هەموو داتاکان؟ ئەم کردارە ناگەڕێتەوە.")) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("dewa_"));
      keys.forEach(k => localStorage.removeItem(k));
      showToast("هەموو داتاکان سڕانەوە. لاپەڕەکە نوێ دەبێتەوە...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#F1F3F5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#495057" }}><Settings2 size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>ڕێکخستنەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>ڕێکخستنی زانیاری کۆمپانیا</p></div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, maxWidth: 700 }}>
          {/* Company Info Card */}
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}><Building2 size={18} /> زانیاری کۆمپانیا</h3>

            <div style={{ display: "flex", gap: 32, marginBottom: 28, padding: 20, background: "#F8F9FA", borderRadius: 12, justifyContent: "center" }}>
              <ImageUploader value={companyForm.logo} onChange={(v) => setCompanyForm({ ...companyForm, logo: v })} label="لۆگۆی کۆمپانیا" shape="square" />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#495057" }}>لۆگۆی کۆمپانیا</span>
                <span style={{ fontSize: 11, color: "#ADB5BD" }}>وێنەیەک بۆ پسوولەکان و سایدبار</span>
                <span style={{ fontSize: 11, color: "#ADB5BD" }}>وێنەی پرۆفایل: کلیک بکە لەسەر وێنەکەت لە سایدبار</span>
              </div>
            </div>

            <form onSubmit={handleCompanySave}>
              <FormGrid>
                <FormField label="ناوی کۆمپانیا (کوردی)"><input style={inputStyle} value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} /></FormField>
                <FormField label="ناوی کۆمپانیا (ئینگلیزی)"><input style={inputStyle} value={companyForm.nameEn} onChange={(e) => setCompanyForm({ ...companyForm, nameEn: e.target.value })} /></FormField>
                <FormField label="تەلەفۆن"><input style={inputStyle} value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></FormField>
                <FormField label="ئیمەیڵ"><input style={inputStyle} type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></FormField>
                <FormField label="شار"><input style={inputStyle} value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} /></FormField>
                <FormField label="دراو"><input style={inputStyle} value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })} /></FormField>
              </FormGrid>
              <FormField label="ناونیشان"><input style={{ ...inputStyle, marginTop: 16 }} value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} /></FormField>
              <div style={{ marginTop: 24 }}>
                <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><Save size={14} /> پاشەکەوتکردن</button>
              </div>
            </form>
          </div>

          {/* Users shortcut card */}
          <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><Users size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>بەڕێوەبردنی بەکارهێنەران</div>
                  <div style={{ fontSize: 12, color: "#6C757D", marginTop: 2 }}>زیادکردن، دەستکاری، و مۆڵەتدانی بەکارهێنەران</div>
                </div>
              </div>
              <Link href="/dashboard/users" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#F3F0FF", color: "#7C5CFC", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "1px solid #E5DBFF" }}>
                <ArrowLeft size={14} /> بچۆ بۆ بەکارهێنەران
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #FFC9C9" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#FA5252" }}>ناوچەی مەترسیدار</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 16 }}>ئەم کردارانە هەموو داتاکان دەسڕنەوە و ناگەڕێنەوە.</p>
            <button onClick={handleResetData} style={{ padding: "10px 24px", borderRadius: 8, background: "#FA5252", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={14} /> سڕینەوەی هەموو داتاکان</button>
          </div>
        </div>
      </div>
    </>
  );
}
