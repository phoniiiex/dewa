"use client";
import { useState, FormEvent, useRef } from "react";
import {
  Settings2, Building2, Save, RefreshCw, Camera, Upload, Users, ArrowLeft,
  Sun, Moon, AlignRight, AlignLeft, AlignCenter, Check,
  Trash2, Download, AlertTriangle, Shield, User, Phone, Mail, BadgeCheck,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
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

// Toggle switch component
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: value ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "#DEE2E6",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, right: value ? 3 : undefined, left: value ? undefined : 3,
        width: 20, height: 20, borderRadius: "50%", background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "all 0.2s",
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useData();
  const { darkMode, toggleDarkMode, sidebarPosition, setSidebarPosition, currentUser, updateCurrentUserProfile } = useLayout();
  const [companyForm, setCompanyForm] = useState(settings);

  // ── My Profile state ────────────────────────────────────
  const profileFileRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    avatar: currentUser?.avatarUrl || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const handleProfileAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700_000) { alert("فایلەکە زۆر گەورەیە (حد: 700KB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setProfileForm(p => ({ ...p, avatar: ev.target!.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    await updateCurrentUserProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim(), avatarUrl: profileForm.avatar });
    setProfileSaving(false);
    showToast("زانیاری کەسی پاشەکەوتکرا", "success");
  };

  const roleLabel = currentUser?.role === "ADMIN" ? "بەڕێوەبەر" : currentUser?.role === "MANAGER" ? "بەڕێوەبەری مامناوەند" : "نوێنەر";
  const roleColor = currentUser?.role === "ADMIN" ? "#4263EB" : currentUser?.role === "MANAGER" ? "#7C5CFC" : "#40C057";

  const handleCompanySave = (e: FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
    showToast("زانیاری کۆمپانیا پاشەکەوتکرا", "success");
  };

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [deleteLog, setDeleteLog] = useState<string[]>([]);

  const handleResetData = async () => {
    setDeleteStep("working");
    setDeleteLog([]);
    const log = (msg: string) => setDeleteLog(prev => [...prev, msg]);
    try {
      const { supabase } = await import("@/lib/supabase");

      // ── 1. Fetch all data for backup ──────────────────────────────
      log("داتا هێنانی باکئەپ...");
      const tables = [
        "products", "clients", "reps", "warehouses", "suppliers",
        "orders", "drivers", "transactions", "invoice_templates",
        "price_types", "sample_requests",
      ];
      const backup: Record<string, unknown[]> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backup[table] = data || [];
        log(`✓ ${table} (${backup[table].length} ڕیکۆرد)`);
      }
      backup._backup_date = [new Date().toISOString()];

      // ── 2. Trigger JSON download ───────────────────────────────────
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `dewa_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log("⬇ باکئەپ دابەزاند");

      // ── 3. Delete all rows from each table ────────────────────────
      // Order matters: orders before clients (FK), transactions before orders, etc.
      const deleteOrder = [
        "transactions", "sample_requests", "orders",
        "clients", "products", "reps", "warehouses",
        "suppliers", "drivers", "invoice_templates", "price_types",
      ];
      for (const table of deleteOrder) {
        const { error } = await supabase.from(table).delete().neq("id", "__never__");
        if (error) {
          log(`✗ ${table}: ${error.message}`);
        } else {
          log(`🗑 ${table} سڕایەوە`);
        }
      }

      log("✅ هەموو داتاکان سڕانەوە!");
      setDeleteStep("done");
      showToast("داتاکان سڕانەوە و باکئەپ داونلۆدکرا", "success");
      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      log(`❌ هەڵە: ${String(err)}`);
      showToast("هەڵەیەک ڕوویدا", "error");
      setDeleteStep("confirm");
    }
  };

  const sidebarOptions: { value: "right" | "left" | "top"; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "right", label: "ڕاست", icon: <AlignRight size={20} />, desc: "ئەستانداردی کوردی (RTL)" },
    { value: "left",  label: "چەپ",  icon: <AlignLeft size={20} />,  desc: "چەپی پەیجی" },
    { value: "top",   label: "سەرەوە", icon: <AlignCenter size={20} />, desc: "ناڤیگەیشنی ئاسۆیی" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "var(--color-bg-card)",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid var(--color-border-light)",
    marginBottom: 24,
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "var(--color-bg-hover)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
          <Settings2 size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>ڕێکخستنەکان</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>ڕێکخستنی سیستەم و جوانکاری</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, maxWidth: 700 }}>

        {/* ─── My Profile Card ─── */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} color="#4263EB" /> پرۆفایلی من
            </h3>

            <form onSubmit={handleProfileSave}>
              {/* Avatar picker row */}
              <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px", background: "var(--color-bg)", borderRadius: 14, marginBottom: 24 }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    onClick={() => profileFileRef.current?.click()}
                    style={{ width: 88, height: 88, borderRadius: "50%", cursor: "pointer", overflow: "hidden", border: "3px solid #4263EB", position: "relative" }}
                  >
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white" }}>
                        {profileForm.name?.[0] || currentUser?.name?.[0] || "؟"}
                      </div>
                    )}
                    {/* hover overlay */}
                    <div
                      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                    >
                      <Camera size={20} color="white" />
                    </div>
                  </div>
                  <input ref={profileFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfileAvatarFile} />
                </div>

                {/* Info beside avatar */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    {currentUser?.name || "بەکارهێنەر"}
                    <BadgeCheck size={16} color={roleColor} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${roleColor}15`, color: roleColor }}>{roleLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{currentUser?.email}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>کلیک لەسەر وێنەکە بکە بۆ گۆڕینی</div>
                </div>
              </div>

              {/* Fields */}
              <FormGrid>
                <FormField label="ناو">
                  <div style={{ position: "relative" }}>
                    <User size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
                    <input
                      style={{ ...inputStyle, paddingRight: 30 }}
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="ناوی خۆت بنووسە"
                    />
                  </div>
                </FormField>

                <FormField label="ژمارەی مۆبایل">
                  <div style={{ position: "relative" }}>
                    <Phone size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
                    <input
                      style={{ ...inputStyle, paddingRight: 30 }}
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="07XX XXX XXXX"
                      type="tel"
                    />
                  </div>
                </FormField>

                <FormField label="ئیمەیڵ (ناگۆڕدرێت)">
                  <div style={{ position: "relative" }}>
                    <Mail size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
                    <input
                      style={{ ...inputStyle, paddingRight: 30, opacity: 0.6, cursor: "not-allowed" }}
                      value={currentUser?.email || ""}
                      readOnly
                    />
                  </div>
                </FormField>

                <FormField label="ئەندازە (ناگۆڕدرێت)">
                  <input
                    style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
                    value={roleLabel}
                    readOnly
                  />
                </FormField>
              </FormGrid>

              {profileForm.avatar && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={() => setProfileForm(p => ({ ...p, avatar: "" }))} style={{ fontSize: 11, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    سڕینەوەی وێنەی پرۆفایل
                  </button>
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  disabled={profileSaving || !profileForm.name.trim()}
                  style={{ padding: "10px 28px", borderRadius: 8, background: profileSaving ? "#ADB5BD" : "linear-gradient(135deg,#4263EB,#7C5CFC)", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: profileSaving ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Save size={14} /> {profileSaving ? "پاشەکەوتکردن..." : "پاشەکەوتکردنی پرۆفایل"}
                </button>
              </div>
            </form>
          </div>

          {/* ─── Appearance Card ─── */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
              {darkMode ? <Moon size={18} color="#7C5CFC" /> : <Sun size={18} color="#F47B35" />}
              دیداری سیستەم
            </h3>

            {/* Dark mode row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--color-bg)", borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: darkMode ? "linear-gradient(135deg, #1A1A2E, #2D2B55)" : "linear-gradient(135deg, #FEF3EB, #FFD6A5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {darkMode ? <Moon size={20} color="#7C5CFC" /> : <Sun size={20} color="#F47B35" />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{darkMode ? "دۆخی تاریک" : "دۆخی ڕووناک"}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {darkMode ? "دیدارێکی تاریک بۆ کارکردن لە شەو" : "دیدارێکی ڕووناک بۆ رۆژانە"}
                  </div>
                </div>
              </div>
              <Toggle value={darkMode} onChange={toggleDarkMode} />
            </div>

            {/* Sidebar position */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 12 }}>شوێنی سایدبار</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {sidebarOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSidebarPosition(opt.value)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 12,
                      border: sidebarPosition === opt.value ? "2px solid #4263EB" : "2px solid var(--color-border)",
                      background: sidebarPosition === opt.value ? "linear-gradient(135deg, #EDF2FF, #F3F0FF)" : "var(--color-bg)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      position: "relative",
                      transition: "all 0.15s",
                    }}
                  >
                    {sidebarPosition === opt.value && (
                      <div style={{ position: "absolute", top: 6, left: 6, width: 18, height: 18, borderRadius: "50%", background: "#4263EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                    )}
                    {/* Mini layout preview */}
                    <div style={{ width: 64, height: 40, borderRadius: 6, border: "1px solid var(--color-border)", overflow: "hidden", background: "var(--color-bg-card)", display: "flex", position: "relative" }}>
                      {opt.value === "right" && (
                        <>
                          <div style={{ width: 16, height: "100%", background: "#4263EB15", borderRight: "1px solid #4263EB30", position: "absolute", right: 0 }} />
                          <div style={{ flex: 1, marginRight: 16, padding: 4 }}>
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, marginBottom: 3 }} />
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, width: "70%" }} />
                          </div>
                        </>
                      )}
                      {opt.value === "left" && (
                        <>
                          <div style={{ width: 16, height: "100%", background: "#4263EB15", borderLeft: "1px solid #4263EB30", position: "absolute", left: 0 }} />
                          <div style={{ flex: 1, marginLeft: 16, padding: 4 }}>
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, marginBottom: 3 }} />
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, width: "70%" }} />
                          </div>
                        </>
                      )}
                      {opt.value === "top" && (
                        <>
                          <div style={{ height: 10, width: "100%", background: "#4263EB15", borderBottom: "1px solid #4263EB30", position: "absolute", top: 0 }} />
                          <div style={{ flex: 1, marginTop: 10, padding: 4 }}>
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, marginBottom: 3 }} />
                            <div style={{ height: 4, background: "#DEE2E6", borderRadius: 2, width: "70%" }} />
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: sidebarPosition === opt.value ? "#4263EB" : "var(--color-text-primary)" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "center" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Company Info Card ─── */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} /> زانیاری کۆمپانیا
            </h3>

            <div style={{ display: "flex", gap: 32, marginBottom: 28, padding: 20, background: "var(--color-bg)", borderRadius: 12, justifyContent: "center" }}>
              <ImageUploader value={companyForm.logo} onChange={(v) => setCompanyForm({ ...companyForm, logo: v })} label="لۆگۆی کۆمپانیا" shape="square" />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>لۆگۆی کۆمپانیا</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>وێنەیەک بۆ پسوولەکان و سایدبار</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>وێنەی پرۆفایل: کلیک بکە لەسەر وێنەکەت لە سایدبار</span>
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
                <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  <Save size={14} /> پاشەکەوتکردن
                </button>
              </div>
            </form>
          </div>

          {/* ─── Users shortcut ─── */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><Users size={20} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>بەڕێوەبردنی بەکارهێنەران</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>زیادکردن، دەستکاری، و مۆڵەتدانی بەکارهێنەران</div>
                </div>
              </div>
              <Link href="/dashboard/users" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#F3F0FF", color: "#7C5CFC", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "1px solid #E5DBFF" }}>
                <ArrowLeft size={14} /> بچۆ بۆ بەکارهێنەران
              </Link>
            </div>
          </div>

          {/* ─── Danger Zone ─── */}
          <div style={{ ...cardStyle, border: "1px solid #FFC9C9" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#FA5252", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} /> ناوچەی مەترسیدار
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>سڕینەوەی هەموو داتاکان لە سوپابەیس. پێش سڕینەوە باکئەپی خۆکار داونلۆد دەکرێت.</p>

            {deleteStep === "idle" && (
              <button
                onClick={() => setDeleteStep("confirm")}
                style={{ padding: "10px 24px", borderRadius: 8, background: "#FA5252", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> سڕینەوەی هەموو داتاکان
              </button>
            )}

            {deleteStep === "confirm" && (
              <div style={{ background: "#FFF5F5", border: "1px solid #FFC9C9", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Shield size={20} color="#FA5252" />
                  <span style={{ fontWeight: 700, color: "#FA5252", fontSize: 14 }}>دڵنیابووەیت؟ ئەم کردارە ناگەڕێتەوە</span>
                </div>
                <p style={{ fontSize: 12, color: "#6C757D", marginBottom: 16, lineHeight: 1.6 }}>
                  هەموو داتاکانت (داواکاری، کڕیار، بەرهەم، ...) دەسڕێنەوە.<br/>
                  <strong>باکئەپی JSON خۆکار داونلۆد دەکرێت پێش سڕینەوە.</strong>
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleResetData}
                    style={{ padding: "10px 20px", borderRadius: 8, background: "#FA5252", color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> باکئەپ بکە و بیسڕەوە
                  </button>
                  <button
                    onClick={() => setDeleteStep("idle")}
                    style={{ padding: "10px 20px", borderRadius: 8, background: "var(--color-bg-hover)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, border: "1px solid var(--color-border)", cursor: "pointer", fontFamily: "inherit" }}>
                    پاشگەزبوونەوە
                  </button>
                </div>
              </div>
            )}

            {deleteStep === "working" && (
              <div style={{ background: "#F8F9FA", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>کارەکە بەردەوامە...</span>
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                  {deleteLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {deleteStep === "done" && (
              <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 12, padding: 16, fontSize: 13, fontWeight: 600, color: "#059669" }}>
                ✅ هەموو داتاکان سڕانەوە. لاپەڕەکە نوێ دەبێتەوە...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
