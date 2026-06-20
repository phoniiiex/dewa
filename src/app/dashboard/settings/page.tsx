"use client";
import { useState, FormEvent, useRef } from "react";
import { Settings2, Building2, Save, Users, Plus, Edit3, Trash2, RefreshCw, Camera, Upload, Lock, Mail, Shield } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, FormGrid, inputStyle } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const { settings, updateSettings, users, addUser, updateUser, deleteUser, showToast } = useData();
  const [companyForm, setCompanyForm] = useState(settings);
  const [usersTab, setUsersTab] = useState(false);

  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "REP", phone: "", city: "" });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const handleCompanySave = (e: FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
  };

  const handleAddUser = (e: FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const update: Record<string, unknown> = { name: userForm.name, email: userForm.email, role: userForm.role, phone: userForm.phone, city: userForm.city };
      if (userForm.password) update.password = userForm.password;
      updateUser(editingUser.id, update);
    } else {
      if (!userForm.password) { showToast("وشەی نهێنی پێویستە", "error"); return; }
      addUser({
        name: userForm.name, email: userForm.email, password: userForm.password,
        role: userForm.role as "ADMIN" | "MANAGER" | "REP",
        phone: userForm.phone, city: userForm.city, isActive: true,
      });
    }
    setUserModal(false);
  };

  const handleDeleteUser = (id: string) => {
    // Don't allow deleting the last admin
    const admins = users.filter(u => u.role === "ADMIN");
    const target = users.find(u => u.id === id);
    if (target?.role === "ADMIN" && admins.length <= 1) {
      showToast("ناتوانی تاکە ئەدمینەکە بسڕیتەوە", "error");
      return;
    }
    deleteUser(id);
  };

  const handleResetData = () => {
    if (confirm("ئایا دڵنیایت لە سڕینەوەی هەموو داتاکان؟ ئەم کردارە ناگەڕێتەوە.")) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("dewa_"));
      keys.forEach(k => localStorage.removeItem(k));
      showToast("هەموو داتاکان سڕانەوە. لاپەڕەکە نوێ دەبێتەوە...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const roleLabels: Record<string, { label: string; bg: string; color: string }> = {
    ADMIN: { label: "ئەدمین", bg: "#FFE3E3", color: "#C92A2A" },
    MANAGER: { label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" },
    REP: { label: "نوێنەر", bg: "#D3F9D8", color: "#2B8A3E" },
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#F1F3F5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#495057" }}><Settings2 size={20} /></div>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>ڕێکخستنەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>ڕێکخستنی کۆمپانیا و بەکارهێنەران</p></div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F3F5", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setUsersTab(false)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: !usersTab ? "white" : "transparent", color: !usersTab ? "#1A1A2E" : "#6C757D", boxShadow: !usersTab ? "0 1px 3px rgba(0,0,0,0.08)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><Building2 size={14} /> زانیاری کۆمپانیا</button>
        <button onClick={() => setUsersTab(true)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: usersTab ? "white" : "transparent", color: usersTab ? "#1A1A2E" : "#6C757D", boxShadow: usersTab ? "0 1px 3px rgba(0,0,0,0.08)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><Users size={14} /> بەکارهێنەران</button>
      </div>

      {!usersTab ? (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
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

          {/* Danger Zone */}
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #FFC9C9", marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#FA5252" }}>ناوچەی مەترسیدار</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 16 }}>ئەم کردارانە هەموو داتاکان دەسڕنەوە و ناگەڕێنەوە.</p>
            <button onClick={handleResetData} style={{ padding: "10px 24px", borderRadius: 8, background: "#FA5252", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={14} /> سڕینەوەی هەموو داتاکان</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>بەکارهێنەرانی سیستەم</h3>
              <p style={{ fontSize: 12, color: "#ADB5BD", marginTop: 2 }}>بەکارهێنەران دەتوانن بە ئیمەیڵ و وشەی نهێنییان بچنە ژوورەوە</p>
            </div>
            <button onClick={() => { setEditingUser(null); setUserForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "" }); setUserModal(true); }} className="topbar-add-btn"><Plus size={16} /><span>بەکارهێنەری نوێ</span></button>
          </div>

          {/* Users Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {users.map(u => {
              const r = roleLabels[u.role] || roleLabels.REP;
              return (
                <div key={u.id} style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #E9ECEF", display: "flex", flexDirection: "column", gap: 12, transition: "box-shadow 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", color: r.color, fontWeight: 800, fontSize: 14 }}>{u.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#6C757D", display: "flex", alignItems: "center", gap: 4 }}><Mail size={10} />{u.email}</div>
                      </div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: r.bg, color: r.color }}>{r.label}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#6C757D" }}>
                    {u.phone && <span>📞 {u.phone}</span>}
                    {u.city && <span>📍 {u.city}</span>}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #F1F3F5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Lock size={10} color="#ADB5BD" />
                      <span style={{ fontSize: 10, color: "#ADB5BD" }}>{u.password ? "••••••••" : "بێ وشەی نهێنی"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "", city: u.city || "" }); setUserModal(true); }} style={{ padding: "4px 8px", borderRadius: 6, background: "#EDF2FF", color: "#4263EB", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}><Edit3 size={11} /> دەستکاری</button>
                      <button onClick={() => setDeleteUserId(u.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "#FFE3E3", color: "#FA5252", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div style={{ marginTop: 20, padding: 16, background: "#EDF2FF", borderRadius: 10, border: "1px solid #D0BFFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Shield size={14} color="#4263EB" /><span style={{ fontSize: 12, fontWeight: 700, color: "#4263EB" }}>چۆن کاردەکات؟</span></div>
            <ul style={{ fontSize: 11, color: "#495057", lineHeight: 1.8, paddingRight: 16, margin: 0 }}>
              <li>ئەدمین دەتوانێت بەکارهێنەر زیادبکات و ڕۆڵی دابنێت</li>
              <li>هەر بەکارهێنەرێک دەتوانێت بە <strong>ئیمەیڵ</strong> و <strong>وشەی نهێنی</strong> خۆی بچێتە ژوورەوە</li>
              <li>نوێنەران و بەڕێوەبەران هەر لە هەمان لاپەڕەی چوونەژوورەوە بەکاریدێنن</li>
              <li>تاکە ئەدمینەکە ناسڕدرێتەوە</li>
            </ul>
          </div>

          <Modal open={userModal} onClose={() => setUserModal(false)} title={editingUser ? "دەستکاری بەکارهێنەر" : "بەکارهێنەری نوێ"} width={480}>
            <form onSubmit={handleAddUser}>
              <FormGrid cols={1}>
                <FormField label="ناو" required><input style={inputStyle} required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></FormField>
                <FormField label="ئیمەیڵ" required><input style={inputStyle} type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></FormField>
                <FormField label={editingUser ? "وشەی نهێنی (بۆ گۆڕین بنووسە)" : "وشەی نهێنی"} required={!editingUser}><input style={inputStyle} type="password" required={!editingUser} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? "بەتاڵ بهێڵە بۆ نەگۆڕین" : ""} /></FormField>
                <FormGrid>
                  <FormField label="تەلەفۆن"><input style={inputStyle} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></FormField>
                  <FormField label="شار"><input style={inputStyle} value={userForm.city} onChange={(e) => setUserForm({ ...userForm, city: e.target.value })} /></FormField>
                </FormGrid>
                <FormField label="ڕۆل">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { value: "ADMIN", label: "ئەدمین", bg: "#FFE3E3", color: "#C92A2A" },
                      { value: "MANAGER", label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" },
                      { value: "REP", label: "نوێنەر", bg: "#D3F9D8", color: "#2B8A3E" },
                    ].map(r => (
                      <button key={r.value} type="button" onClick={() => setUserForm({ ...userForm, role: r.value })} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `2px solid ${userForm.role === r.value ? r.color : "#DEE2E6"}`, background: userForm.role === r.value ? r.bg : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: userForm.role === r.value ? r.color : "#6C757D" }}>{r.label}</button>
                    ))}
                  </div>
                </FormField>
              </FormGrid>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
                <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>{editingUser ? "نوێکردنەوە" : "زیادکردن"}</button>
                <button type="button" onClick={() => setUserModal(false)} style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>پاشگەزبوونەوە</button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog open={!!deleteUserId} onClose={() => setDeleteUserId(null)} onConfirm={() => { if (deleteUserId) { handleDeleteUser(deleteUserId); setDeleteUserId(null); } }} message="ئایا دڵنیایت لە سڕینەوەی ئەم بەکارهێنەرە؟" />
        </div>
      )}
    </>
  );
}
