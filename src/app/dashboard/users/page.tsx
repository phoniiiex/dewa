"use client";
import { useState, useEffect, FormEvent } from "react";
import { Users, Plus, Shield, Link2, Copy, Check, Trash2, Edit3, Mail, Lock, Phone, MapPin, RefreshCw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, inputStyle, selectStyle } from "@/components/ui/FormField";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/store";

const ALL_PERMISSIONS = [
  { key: "dashboard", label: "پێشانگا", group: "سەرەکی" },
  { key: "analytics", label: "شیکاری", group: "سەرەکی" },
  { key: "products", label: "بەرهەمەکان", group: "سەرەکی" },
  { key: "orders", label: "داواکارییەکان", group: "سەرەکی" },
  { key: "invoices", label: "پسوولەکان", group: "سەرەکی" },
  { key: "bonus", label: "بۆنەس", group: "سەرەکی" },
  { key: "clients", label: "کڕیارەکان", group: "بەڕێوەبردن" },
  { key: "reps", label: "نوێنەران", group: "بەڕێوەبردن" },
  { key: "warehouses", label: "کۆگاکان", group: "بەڕێوەبردن" },
  { key: "suppliers", label: "دابینکەران", group: "بەڕێوەبردن" },
  { key: "logistics", label: "گواستنەوە", group: "بەڕێوەبردن" },
  { key: "telegram", label: "بۆتی شۆفێر", group: "بەڕێوەبردن" },
  { key: "finance", label: "دارایی", group: "کۆمپانیا" },
  { key: "settings", label: "ڕێکخستنەکان", group: "کۆمپانیا" },
  { key: "users", label: "بەکارهێنەران", group: "کۆمپانیا" },
];

interface Profile {
  id: string; name: string; email: string; role: string;
  phone: string; city: string; is_active: boolean;
  permissions: string[]; created_at: string;
}

// Separate type for local store users
interface LocalUser {
  id: string; name: string; email: string; role: string;
  phone?: string; city?: string; isActive: boolean; password?: string;
}

function PermissionGrid({ permissions, onChange }: { permissions: string[]; onChange: (p: string[]) => void }) {
  const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
  const toggle = (key: string) => onChange(permissions.includes(key) ? permissions.filter(p => p !== key) : [...permissions, key]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onChange(ALL_PERMISSIONS.map(p => p.key))}
          style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #4263EB", background: "#EDF2FF", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#4263EB", fontWeight: 600 }}>
          هەموو هەڵبژێرە
        </button>
        <button type="button" onClick={() => onChange([])}
          style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#6C757D", fontWeight: 600 }}>
          هەموو لابە
        </button>
      </div>
      {groups.map(g => (
        <div key={g}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ADB5BD", marginBottom: 8, textTransform: "uppercase" }}>{g}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_PERMISSIONS.filter(p => p.group === g).map(p => {
              const active = permissions.includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => toggle(p.key)}
                  style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: active ? "none" : "1px solid #DEE2E6", background: active ? "#4263EB" : "white", color: active ? "white" : "#6C757D", transition: "all 0.15s" }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const roleStyle: Record<string, { label: string; bg: string; color: string }> = {
  ADMIN: { label: "ئەدمین", bg: "#FFE3E3", color: "#C92A2A" },
  MANAGER: { label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" },
  REP: { label: "نوێنەر", bg: "#D3F9D8", color: "#2B8A3E" },
};

export default function UsersPage() {
  // Supabase users (onboarded via invite)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Local store users (created directly)
  const { users, addUser, updateUser, deleteUser, showToast } = useData();

  // Tab: "supabase" | "local"
  const [tab, setTab] = useState<"supabase" | "local">("local");

  // Invite flow
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "REP", permissions: [] as string[] });
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Edit Supabase profile permissions
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);

  // Local user add/edit
  const [localUserModal, setLocalUserModal] = useState(false);
  const [editingLocal, setEditingLocal] = useState<LocalUser | null>(null);
  const [localForm, setLocalForm] = useState({ name: "", email: "", password: "", role: "REP", phone: "", city: "" });
  const [deleteLocalId, setDeleteLocalId] = useState<string | null>(null);

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data);
    setLoadingProfiles(false);
  };

  // --- Invite flow ---
  const handleInvite = async () => {
    if (!inviteForm.email) return;
    const res = await fetch("/api/auth/create-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const d = await res.json();
    if (d.url) setInviteUrl(d.url);
    else alert(d.error || "Error creating invite");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Supabase profile edit ---
  const handleUpdateProfile = async () => {
    if (!editProfile) return;
    await supabase.from("profiles").update({ permissions: editProfile.permissions, role: editProfile.role }).eq("id", editProfile.id);
    loadProfiles();
    setEditProfile(null);
  };

  const handleDeactivateProfile = async () => {
    if (!deleteProfileId) return;
    await supabase.from("profiles").update({ is_active: false }).eq("id", deleteProfileId);
    loadProfiles();
    setDeleteProfileId(null);
  };

  // --- Local user CRUD ---
  const openAddLocal = () => { setEditingLocal(null); setLocalForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "" }); setLocalUserModal(true); };
  const openEditLocal = (u: LocalUser) => { setEditingLocal(u); setLocalForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "", city: u.city || "" }); setLocalUserModal(true); };

  const handleSaveLocal = (e: FormEvent) => {
    e.preventDefault();
    if (editingLocal) {
      const upd: Record<string, unknown> = { name: localForm.name, email: localForm.email, role: localForm.role, phone: localForm.phone, city: localForm.city };
      if (localForm.password) upd.password = localForm.password;
      updateUser(editingLocal.id, upd);
    } else {
      if (!localForm.password) { showToast("وشەی نهێنی پێویستە", "error"); return; }
      addUser({ name: localForm.name, email: localForm.email, password: localForm.password, role: localForm.role as "ADMIN" | "MANAGER" | "REP", phone: localForm.phone, city: localForm.city, isActive: true });
    }
    setLocalUserModal(false);
  };

  const handleDeleteLocal = () => {
    if (!deleteLocalId) return;
    const admins = users.filter(u => u.role === "ADMIN");
    const target = users.find(u => u.id === deleteLocalId);
    if (target?.role === "ADMIN" && admins.length <= 1) { showToast("ناتوانی تاکە ئەدمینەکە بسڕیتەوە", "error"); setDeleteLocalId(null); return; }
    deleteUser(deleteLocalId);
    setDeleteLocalId(null);
  };

  const totalUsers = users.length + profiles.length;
  const activeUsers = users.filter(u => u.isActive).length + profiles.filter(p => p.is_active).length;

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><Users size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>بەکارهێنەران</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی هەموو بەکارهێنەران و مۆڵەتەکان</p></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setInviteForm({ email: "", role: "REP", permissions: [] }); setInviteUrl(""); setInviteModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "#F3F0FF", color: "#7C5CFC", fontSize: 13, fontWeight: 600, border: "1px solid #E5DBFF", cursor: "pointer", fontFamily: "inherit" }}>
            <Link2 size={15} /> بانگهێشت بە لینک
          </button>
          <button onClick={openAddLocal}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={15} /> زیادکردنی ڕاستەوخۆ
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>کۆی بەکارهێنەران</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{totalUsers}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>چالاک</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#40C057" }}>{activeUsers}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>ئەدمین</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#C92A2A" }}>{users.filter(u => u.role === "ADMIN").length + profiles.filter(p => p.role === "ADMIN").length}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>بانگهێشتکراو</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#7C5CFC" }}>{profiles.length}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F1F3F5", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("local")} style={{ padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: tab === "local" ? "white" : "transparent", color: tab === "local" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "local" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          بەکارهێنەرانی ڕاستەوخۆ ({users.length})
        </button>
        <button onClick={() => setTab("supabase")} style={{ padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: tab === "supabase" ? "white" : "transparent", color: tab === "supabase" ? "#1A1A2E" : "#6C757D", boxShadow: tab === "supabase" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          بانگهێشتکراوان ({profiles.length})
        </button>
      </div>

      {/* ───── LOCAL USERS TAB ───── */}
      {tab === "local" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {users.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#ADB5BD", fontSize: 13 }}>
                هیچ بەکارهێنەرێک نییە — کلیک بکە لەسەر "زیادکردنی ڕاستەوخۆ"
              </div>
            )}
            {users.map(u => {
              const r = roleStyle[u.role] || roleStyle.REP;
              return (
                <div key={u.id} style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #E9ECEF", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", color: r.color, fontWeight: 800, fontSize: 15 }}>{u.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#6C757D", display: "flex", alignItems: "center", gap: 3 }}><Mail size={10} />{u.email}</div>
                      </div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: r.bg, color: r.color }}>{r.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6C757D" }}>
                    {u.phone && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Phone size={10} />{u.phone}</span>}
                    {u.city && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} />{u.city}</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #F1F3F5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Lock size={10} color="#ADB5BD" />
                      <span style={{ fontSize: 10, color: "#ADB5BD" }}>{u.password ? "••••••••" : "بێ وشەی نهێنی"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: u.isActive ? "#40C057" : "#FA5252" }} />
                      <button onClick={() => openEditLocal(u as LocalUser)} style={{ padding: "4px 10px", borderRadius: 6, background: "#EDF2FF", color: "#4263EB", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}><Edit3 size={11} /> دەستکاری</button>
                      <button onClick={() => setDeleteLocalId(u.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "#FFE3E3", color: "#FA5252", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, padding: 16, background: "#EDF2FF", borderRadius: 10, border: "1px solid #C5D1F8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Shield size={14} color="#4263EB" /><span style={{ fontSize: 12, fontWeight: 700, color: "#4263EB" }}>بەکارهێنەرانی ڕاستەوخۆ</span></div>
            <ul style={{ fontSize: 11, color: "#495057", lineHeight: 1.8, paddingRight: 16, margin: 0 }}>
              <li>ئەم بەکارهێنەرانە لە ئەپەکەدا تۆمارکراون و بە ئیمەیڵ و وشەی نهێنی چوونەژوورەوە بەکاردێنن</li>
              <li>تاکە ئەدمینەکە ناسڕدرێتەوە</li>
              <li>بۆ بەکارهێنەران کە دەتەوێت خۆیان هەژمار دابنێن، "بانگهێشت بە لینک" بەکاربێنە</li>
            </ul>
          </div>
        </div>
      )}

      {/* ───── SUPABASE (INVITED) USERS TAB ───── */}
      {tab === "supabase" && (
        <div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>بەکارهێنەر</th><th>ئیمەیل</th><th>ڕۆڵ</th><th>مۆڵەتەکان</th><th>بارودۆخ</th><th></th></tr></thead>
              <tbody>
                {loadingProfiles ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>بارکردن...</td></tr> :
                profiles.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>هیچ بەکارهێنەرێکی بانگهێشتکراو نییە</td></tr> :
                profiles.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700 }}>
                          {p.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟"}
                        </div>
                        <div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11, color: "#ADB5BD" }}>{p.phone || "—"}</div></div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "#6C757D", fontFamily: "monospace" }}>{p.email}</td>
                    <td><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (roleStyle[p.role] || roleStyle.REP).bg, color: (roleStyle[p.role] || roleStyle.REP).color }}>{(roleStyle[p.role] || roleStyle.REP).label}</span></td>
                    <td style={{ fontSize: 11, color: "#6C757D", maxWidth: 200 }}>
                      {(p.permissions || []).length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {(p.permissions || []).slice(0, 4).map((perm: string) => (
                            <span key={perm} style={{ padding: "2px 8px", borderRadius: 4, background: "#F1F3F5", fontSize: 10, fontWeight: 600 }}>
                              {ALL_PERMISSIONS.find(ap => ap.key === perm)?.label || perm}
                            </span>
                          ))}
                          {(p.permissions || []).length > 4 && <span style={{ fontSize: 10, color: "#ADB5BD" }}>+{(p.permissions || []).length - 4}</span>}
                        </div>
                      ) : <span style={{ color: "#ADB5BD" }}>—</span>}
                    </td>
                    <td><span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: p.is_active ? "#40C057" : "#FA5252" }} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setEditProfile({ ...p, permissions: p.permissions || [] })} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "#6C757D" }} title="دەستکاری"><Edit3 size={14} /></button>
                        <button onClick={() => setDeleteProfileId(p.id)} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "#FA5252" }} title="ناچالاککردن"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #F1F3F5" }}>
              <span className="pagination-info">{profiles.length} بانگهێشتکراو</span>
              <button onClick={loadProfiles} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                <RefreshCw size={12} /> نوێکردنەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── INVITE MODAL ───── */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="بانگهێشتکردنی بەکارهێنەری نوێ" width={560}>
        {!inviteUrl ? (
          <>
            <FormGrid cols={2}>
              <FormField label="ئیمەیل" required><input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" /></FormField>
              <FormField label="ڕۆڵ"><select style={selectStyle} value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}><option value="REP">نوێنەر</option><option value="MANAGER">بەڕێوەبەر</option><option value="ADMIN">ئەدمین</option></select></FormField>
            </FormGrid>
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={inviteForm.permissions} onChange={p => setInviteForm({ ...inviteForm, permissions: p })} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleInvite} style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>دروستکردنی لینک</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EBFBEE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#40C057" }}><Link2 size={24} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>لینکی بانگهێشت ئامادەیە!</h3>
            <p style={{ fontSize: 12, color: "#6C757D", marginBottom: 16 }}>ئەم لینکە بنێرە بۆ بەکارهێنەرەکە تا هەژمارەکەی دروست بکات</p>
            <div style={{ background: "#F8F9FA", borderRadius: 8, padding: "12px 16px", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", direction: "ltr", textAlign: "left", border: "1px solid #DEE2E6", marginBottom: 16 }}>{inviteUrl}</div>
            <button onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 8, background: copied ? "#40C057" : "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {copied ? <><Check size={14} /> کۆپیکرا!</> : <><Copy size={14} /> کۆپیکردن</>}
            </button>
          </div>
        )}
      </Modal>

      {/* ───── LOCAL USER ADD/EDIT MODAL ───── */}
      <Modal open={localUserModal} onClose={() => setLocalUserModal(false)} title={editingLocal ? "دەستکاری بەکارهێنەر" : "زیادکردنی بەکارهێنەر"} width={480}>
        <form onSubmit={handleSaveLocal}>
          <FormGrid cols={1}>
            <FormField label="ناو" required><input style={inputStyle} required value={localForm.name} onChange={e => setLocalForm({ ...localForm, name: e.target.value })} /></FormField>
            <FormField label="ئیمەیل" required><input style={inputStyle} type="email" required value={localForm.email} onChange={e => setLocalForm({ ...localForm, email: e.target.value })} /></FormField>
            <FormField label={editingLocal ? "وشەی نهێنی (بۆ گۆڕین بنووسە)" : "وشەی نهێنی"} required={!editingLocal}>
              <input style={inputStyle} type="password" required={!editingLocal} value={localForm.password} onChange={e => setLocalForm({ ...localForm, password: e.target.value })} placeholder={editingLocal ? "بەتاڵ بهێڵە بۆ نەگۆڕین" : ""} />
            </FormField>
            <FormGrid>
              <FormField label="تەلەفۆن"><input style={inputStyle} value={localForm.phone} onChange={e => setLocalForm({ ...localForm, phone: e.target.value })} /></FormField>
              <FormField label="شار"><input style={inputStyle} value={localForm.city} onChange={e => setLocalForm({ ...localForm, city: e.target.value })} /></FormField>
            </FormGrid>
            <FormField label="ڕۆڵ">
              <div style={{ display: "flex", gap: 8 }}>
                {[{ value: "ADMIN", label: "ئەدمین", bg: "#FFE3E3", color: "#C92A2A" }, { value: "MANAGER", label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" }, { value: "REP", label: "نوێنەر", bg: "#D3F9D8", color: "#2B8A3E" }].map(r => (
                  <button key={r.value} type="button" onClick={() => setLocalForm({ ...localForm, role: r.value })}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `2px solid ${localForm.role === r.value ? r.color : "#DEE2E6"}`, background: localForm.role === r.value ? r.bg : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: localForm.role === r.value ? r.color : "#6C757D" }}>{r.label}</button>
                ))}
              </div>
            </FormField>
          </FormGrid>
          <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
            <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>{editingLocal ? "نوێکردنەوە" : "زیادکردن"}</button>
            <button type="button" onClick={() => setLocalUserModal(false)} style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>پاشگەزبوونەوە</button>
          </div>
        </form>
      </Modal>

      {/* ───── EDIT SUPABASE PROFILE PERMISSIONS ───── */}
      <Modal open={!!editProfile} onClose={() => setEditProfile(null)} title={`دەستکاری مۆڵەتەکانی ${editProfile?.name || ""}`} width={560}>
        {editProfile && (
          <>
            <FormField label="ڕۆڵ">
              <select style={selectStyle} value={editProfile.role} onChange={e => setEditProfile({ ...editProfile, role: e.target.value })}>
                <option value="REP">نوێنەر</option><option value="MANAGER">بەڕێوەبەر</option><option value="ADMIN">ئەدمین</option>
              </select>
            </FormField>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={editProfile.permissions} onChange={p => setEditProfile({ ...editProfile, permissions: p })} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleUpdateProfile} style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>نوێکردنەوە</button>
              <button onClick={() => setEditProfile(null)} style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>پاشگەزبوونەوە</button>
            </div>
          </>
        )}
      </Modal>

      {/* Confirm dialogs */}
      <ConfirmDialog open={!!deleteProfileId} onClose={() => setDeleteProfileId(null)} onConfirm={handleDeactivateProfile} title="ناچالاککردنی بەکارهێنەر" message="ئایا دڵنیایت لە ناچالاککردنی ئەم بەکارهێنەرە؟" />
      <ConfirmDialog open={!!deleteLocalId} onClose={() => setDeleteLocalId(null)} onConfirm={handleDeleteLocal} message="ئایا دڵنیایت لە سڕینەوەی ئەم بەکارهێنەرە؟" />
    </>
  );
}
