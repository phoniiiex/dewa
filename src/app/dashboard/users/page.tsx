"use client";
import { useState, useEffect, FormEvent, useRef } from "react";
import {
  Users, Plus, Link2, Copy, Check, Trash2, Edit3,
  Mail, Phone, MapPin, RefreshCw, Shield, AlertCircle, Lock, Key, Camera,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, inputStyle, selectStyle } from "@/components/ui/FormField";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";

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

interface AuthUser {
  id: string; email: string; name: string; role: string;
  phone: string; city: string; is_active: boolean;
  permissions: string[]; created_at: string; has_profile: boolean;
  avatar_url: string; last_seen: string;
}

function isOnline(lastSeen: string): boolean {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 3 * 60 * 1000; // 3 minutes
}

const roleStyle: Record<string, { label: string; bg: string; color: string }> = {
  ADMIN:   { label: "ئەدمین",    bg: "#FFE3E3", color: "#C92A2A" },
  MANAGER: { label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" },
  REP:     { label: "نوێنەر",    bg: "#D3F9D8", color: "#2B8A3E" },
};

function PermissionGrid({ permissions, onChange }: { permissions: string[]; onChange: (p: string[]) => void }) {
  const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
  const toggle = (key: string) =>
    onChange(permissions.includes(key) ? permissions.filter(p => p !== key) : [...permissions, key]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div style={{ fontSize: 10, fontWeight: 700, color: "#ADB5BD", marginBottom: 6, letterSpacing: 1 }}>{g.toUpperCase()}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_PERMISSIONS.filter(p => p.group === g).map(p => {
              const active = permissions.includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => toggle(p.key)}
                  style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: active ? "none" : "1px solid #DEE2E6", background: active ? "#4263EB" : "white", color: active ? "white" : "#6C757D", transition: "all 0.15s" }}>
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

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Unified Add User Modal ──
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"direct" | "invite">("direct");
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "REP", phone: "", city: "", permissions: [] as string[] });
  const [addLoading, setAddLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Edit user permissions + avatar ──
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [editRole, setEditRole] = useState("REP");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editAvatar, setEditAvatar] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 200;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Deactivate ──
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/list-users");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(data.users || []);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setAddForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "", permissions: [] });
    setAddMode("direct");
    setInviteUrl("");
    setCopied(false);
    setAddOpen(true);
  };

  // ── Submit: direct create ──
  const handleDirectAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.password) { alert("وشەی نهێنی پێویستە"); return; }
    setAddLoading(true);
    const res = await fetch("/api/auth/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addForm.name, email: addForm.email, password: addForm.password, role: addForm.role, phone: addForm.phone, city: addForm.city }),
    });
    const d = await res.json();
    setAddLoading(false);
    if (d.error) { alert(d.error); return; }
    // Also save permissions if any selected
    if (addForm.permissions.length > 0 && d.user?.id) {
      await fetch("/api/auth/list-users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.user.id, permissions: addForm.permissions }),
      });
    }
    setAddOpen(false);
    await loadUsers();
  };

  // ── Submit: invite ──
  const handleInvite = async () => {
    if (!addForm.email) { alert("ئیمەیل پێویستە"); return; }
    setAddLoading(true);
    const res = await fetch("/api/auth/create-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addForm.email, role: addForm.role, permissions: addForm.permissions }),
    });
    const d = await res.json();
    setAddLoading(false);
    if (d.url) setInviteUrl(d.url);
    else alert(d.error || "Error creating invite");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Edit permissions ──
  const openEdit = (u: AuthUser) => { setEditUser(u); setEditRole(u.role); setEditPerms(u.permissions || []); setEditAvatar(u.avatar_url || ""); };
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    await fetch("/api/auth/list-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, role: editRole, permissions: editPerms, avatar_url: editAvatar }),
    });
    setEditLoading(false); setEditUser(null); await loadUsers();
  };

  // ── Deactivate ──
  const handleDeactivate = async () => {
    if (!deactivateId) return;
    await fetch("/api/auth/list-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deactivateId, is_active: false }),
    });
    setDeactivateId(null); await loadUsers();
  };

  const activeCount = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === "ADMIN").length;

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><Users size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>بەکارهێنەران</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی هەموو بەکارهێنەران و مۆڵەتەکان</p></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadUsers} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
            <RefreshCw size={13} /> نوێکردنەوە
          </button>
          <button onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(66,99,235,0.3)" }}>
            <Plus size={16} /> زیادکردنی بەکارهێنەر
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {loading ? (
          <>{[0,1,2,3].map(i => <SkeletonKPI key={i} />)}</>
        ) : (
          <>
            <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>کۆی بەکارهێنەران</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{users.length}</div></div>
            <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>چالاک</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#40C057" }}>{activeCount}</div></div>
            <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>ئەدمین</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#C92A2A" }}>{adminCount}</div></div>
            <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>بێ پرۆفایل</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#F08C00" }}>{users.filter(u => !u.has_profile).length}</div></div>
          </>
        )}
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#FFE3E3", borderRadius: 10, marginBottom: 16, color: "#C92A2A", fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>بەکارهێنەر</th><th>ئیمەیل</th><th>ڕۆڵ</th><th>مۆڵەتەکان</th><th>بارودۆخ</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={6} />
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>هیچ بەکارهێنەرێک نییە</td></tr>
            ) : users.map(u => {
              const r = roleStyle[u.role] || roleStyle.REP;
              const initials = u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || u.email?.[0]?.toUpperCase() || "؟";
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #EDF2FF" }} />
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700 }}>
                            {initials}
                          </div>
                        )}
                        {/* Online status dot */}
                        <div style={{
                          position: "absolute", bottom: 1, right: 1,
                          width: 10, height: 10, borderRadius: "50%",
                          background: isOnline(u.last_seen) ? "#2F9E44" : "#CED4DA",
                          border: "2px solid white",
                        }} title={isOnline(u.last_seen) ? "آنلاین" : "آفلاین"} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                          {u.phone && <span style={{ fontSize: 11, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 3 }}><Phone size={9} />{u.phone}</span>}
                          {u.city && <span style={{ fontSize: 11, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 3 }}><MapPin size={9} />{u.city}</span>}
                          {!u.has_profile && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#FFF3BF", color: "#E67700", fontWeight: 600 }}>بێ پرۆفایل</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{u.email}</div>
                  </td>
                  <td><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.bg, color: r.color }}>{r.label}</span></td>
                  <td style={{ maxWidth: 200 }}>
                    {(u.permissions || []).length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {(u.permissions || []).slice(0, 3).map((perm: string) => (
                          <span key={perm} style={{ padding: "2px 7px", borderRadius: 4, background: "#F1F3F5", fontSize: 10, fontWeight: 600 }}>
                            {ALL_PERMISSIONS.find(ap => ap.key === perm)?.label || perm}
                          </span>
                        ))}
                        {(u.permissions || []).length > 3 && <span style={{ fontSize: 10, color: "#ADB5BD" }}>+{(u.permissions || []).length - 3}</span>}
                      </div>
                    ) : <span style={{ color: "#ADB5BD", fontSize: 11 }}>—</span>}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: u.is_active ? "#2B8A3E" : "#ADB5BD" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? "#40C057" : "#DEE2E6", display: "inline-block" }} />
                      {u.is_active ? "چالاک" : "ناچالاک"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openEdit(u)}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#EDF2FF", color: "#4263EB", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                        <Edit3 size={11} /> دەستکاری
                      </button>
                      {u.is_active && (
                        <button onClick={() => setDeactivateId(u.id)}
                          style={{ padding: "5px 8px", borderRadius: 6, background: "#FFE3E3", color: "#FA5252", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F3F5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="pagination-info">{users.length} بەکارهێنەر</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#ADB5BD" }}>
            <Shield size={11} /> Supabase Auth
          </div>
        </div>
      </div>

      {/* ══════════ UNIFIED ADD USER MODAL ══════════ */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="زیادکردنی بەکارهێنەری نوێ" width={580}>
        {!inviteUrl ? (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#F1F3F5", borderRadius: 10, padding: 4 }}>
              <button type="button" onClick={() => setAddMode("direct")}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: addMode === "direct" ? "white" : "transparent", color: addMode === "direct" ? "#1A1A2E" : "#6C757D", boxShadow: addMode === "direct" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
                <Lock size={14} /> وشەی نهێنی دابنێ
              </button>
              <button type="button" onClick={() => setAddMode("invite")}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: addMode === "invite" ? "white" : "transparent", color: addMode === "invite" ? "#1A1A2E" : "#6C757D", boxShadow: addMode === "invite" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
                <Link2 size={14} /> بانگهێشت بە لینک
              </button>
            </div>

            {/* Mode description */}
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 20, fontSize: 12, color: "#495057", background: addMode === "direct" ? "#EDF2FF" : "#F3F0FF", borderLeft: `3px solid ${addMode === "direct" ? "#4263EB" : "#7C5CFC"}` }}>
              {addMode === "direct"
                ? "بەکارهێنەر دروست دەکرێت و تۆ خۆت وشەی نهێنی دادەنێی. دەتوانی پاشان لینکی بانگهێشت بنێری بۆی."
                : "لینکێکی تایبەت دروست دەکرێت. بەکارهێنەرەکە کلیک لە لینکەکە دەکات و خۆی زانیاری و وشەی نهێنی دادەنێت."}
            </div>

            <form onSubmit={addMode === "direct" ? handleDirectAdd : (e) => { e.preventDefault(); handleInvite(); }}>
              <FormGrid>
                <FormField label="ئیمەیل" required>
                  <input style={inputStyle} type="email" required value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="user@example.com" />
                </FormField>
                <FormField label="ڕۆڵ">
                  <select style={selectStyle} value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                    <option value="REP">نوێنەر</option>
                    <option value="MANAGER">بەڕێوەبەر</option>
                    <option value="ADMIN">ئەدمین</option>
                  </select>
                </FormField>
              </FormGrid>

              {/* Direct-only fields */}
              {addMode === "direct" && (
                <>
                  <div style={{ marginTop: 12 }}>
                    <FormGrid>
                      <FormField label="ناو" required>
                        <input style={inputStyle} required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                      </FormField>
                      <FormField label="وشەی نهێنی" required>
                        <input style={inputStyle} type="password" required value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
                      </FormField>
                    </FormGrid>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <FormGrid>
                      <FormField label="تەلەفۆن">
                        <input style={inputStyle} value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
                      </FormField>
                      <FormField label="شار">
                        <input style={inputStyle} value={addForm.city} onChange={e => setAddForm({ ...addForm, city: e.target.value })} />
                      </FormField>
                    </FormGrid>
                  </div>
                </>
              )}

              {/* Permissions (both modes) */}
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>مۆڵەتەکان</label>
                <PermissionGrid permissions={addForm.permissions} onChange={p => setAddForm({ ...addForm, permissions: p })} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
                <button type="submit" disabled={addLoading}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 8, background: addMode === "direct" ? "#4263EB" : "#7C5CFC", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: addLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {addLoading ? "..." : addMode === "direct" ? (<><Key size={15} /> زیادکردن</>)  : (<><Link2 size={15} /> دروستکردنی لینک</>)}
                </button>
                <button type="button" onClick={() => setAddOpen(false)}
                  style={{ padding: "11px 24px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Invite URL result */
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #EBFBEE, #D3F9D8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#40C057" }}><Link2 size={26} /></div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>لینکی بانگهێشت ئامادەیە! 🎉</h3>
            <p style={{ fontSize: 12, color: "#6C757D", marginBottom: 20 }}>ئەم لینکە بنێرە بۆ بەکارهێشت بکرێ — دەتوانێت خۆی زانیاری و وشەی نهێنییەکەی دابنێت</p>
            <div style={{ background: "#F8F9FA", borderRadius: 10, padding: "14px 18px", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", direction: "ltr", textAlign: "left", border: "1px solid #DEE2E6", marginBottom: 20 }}>{inviteUrl}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={handleCopy}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 28px", borderRadius: 8, background: copied ? "#40C057" : "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
                {copied ? <><Check size={15} /> کۆپیکرا!</> : <><Copy size={15} /> کۆپیکردن</>}
              </button>
              <button onClick={() => { setInviteUrl(""); setAddOpen(false); loadUsers(); }}
                style={{ padding: "11px 22px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                داخستن
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ EDIT PERMISSIONS MODAL ══════════ */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`دەستکاری: ${editUser?.name || editUser?.email || ""}`} width={560}>
        {editUser && (
          <>
            {/* Avatar picker */}
            <div style={{ padding: "14px 16px", background: "var(--color-bg,#F8F9FA)", borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div
                onClick={() => editAvatarRef.current?.click()}
                style={{ width: 64, height: 64, borderRadius: "50%", cursor: "pointer", overflow: "hidden", border: "3px solid #4263EB", flexShrink: 0, position: "relative" }}
              >
                {editAvatar ? (
                  <img src={editAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 800 }}>
                    {editUser.name?.[0] || editUser.email?.[0] || "؟"}
                  </div>
                )}
                <div
                  style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                >
                  <Camera size={16} color="white" />
                </div>
              </div>
              <input ref={editAvatarRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try { setEditAvatar(await resizeImage(f)); } catch { alert("گۆڕینی وێنەکە نەکرای"); }
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{editUser.name}</div>
                <div style={{ fontSize: 12, color: "#6C757D", marginBottom: 8 }}>{editUser.email}</div>
                <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 6 }}>کلیک لەسەر وێنەکە بکە بۆ گۆڕین</div>
                {editAvatar && (
                  <button type="button" onClick={() => setEditAvatar("")}
                    style={{ fontSize: 11, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    سڕینەوەی وێنە
                  </button>
                )}
              </div>
            </div>

            <FormField label="ڕۆڵ">
              <select style={selectStyle} value={editRole} onChange={e => setEditRole(e.target.value)}>
                <option value="REP">نوێنەر</option>
                <option value="MANAGER">بەڕێوەبەر</option>
                <option value="ADMIN">ئەدمین</option>
              </select>
            </FormField>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={editPerms} onChange={setEditPerms} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleSaveEdit} disabled={editLoading}
                style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: editLoading ? 0.7 : 1 }}>
                {editLoading ? "پاشەکەوتکردن..." : "نوێکردنەوە"}
              </button>
              <button onClick={() => setEditUser(null)}
                style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                پاشگەزبوونەوە
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!deactivateId} onClose={() => setDeactivateId(null)} onConfirm={handleDeactivate} title="ناچالاككردنی بەکارهێنەر" message="ئایا دڵنیایت لە ناچالاككردنی ئەم بەکارهێنەرە؟" />
    </>
  );
}
