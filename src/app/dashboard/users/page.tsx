"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Users, Plus, Link2, Copy, Check, Trash2, Edit3,
  Mail, Phone, MapPin, RefreshCw, Shield, AlertCircle
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, inputStyle, selectStyle } from "@/components/ui/FormField";

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

  // Invite flow
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "REP", permissions: [] as string[] });
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Direct add flow
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "REP", phone: "", city: "" });
  const [addLoading, setAddLoading] = useState(false);

  // Edit user
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [editRole, setEditRole] = useState("REP");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Deactivate
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/list-users");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(data.users || []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // --- Invite ---
  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviteLoading(true);
    const res = await fetch("/api/auth/create-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const d = await res.json();
    setInviteLoading(false);
    if (d.url) setInviteUrl(d.url);
    else alert(d.error || "Error creating invite");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Direct Add ---
  const handleDirectAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.password) { alert("وشەی نهێنی پێویستە"); return; }
    setAddLoading(true);
    const res = await fetch("/api/auth/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const d = await res.json();
    setAddLoading(false);
    if (d.error) { alert(d.error); return; }
    setAddModalOpen(false);
    setAddForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "" });
    await loadUsers();
  };

  // --- Edit permissions ---
  const openEdit = (u: AuthUser) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditPerms(u.permissions || []);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    await fetch("/api/auth/list-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, role: editRole, permissions: editPerms }),
    });
    setEditLoading(false);
    setEditUser(null);
    await loadUsers();
  };

  // --- Deactivate ---
  const handleDeactivate = async () => {
    if (!deactivateId) return;
    await fetch("/api/auth/list-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deactivateId, is_active: false }),
    });
    setDeactivateId(null);
    await loadUsers();
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
          <button onClick={() => { setInviteForm({ email: "", role: "REP", permissions: [] }); setInviteUrl(""); setInviteModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "#F3F0FF", color: "#7C5CFC", fontSize: 13, fontWeight: 600, border: "1px solid #E5DBFF", cursor: "pointer", fontFamily: "inherit" }}>
            <Link2 size={14} /> بانگهێشت بە لینک
          </button>
          <button onClick={() => { setAddForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "" }); setAddModalOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={14} /> زیادکردنی ڕاستەوخۆ
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>کۆی بەکارهێنەران</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{users.length}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>چالاک</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#40C057" }}>{activeCount}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>ئەدمین</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#C92A2A" }}>{adminCount}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>بێ پرۆفایل</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#F08C00" }}>{users.filter(u => !u.has_profile).length}</div></div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#FFE3E3", borderRadius: 10, marginBottom: 16, color: "#C92A2A", fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* User Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>بەکارهێنەر</th>
              <th>ئیمەیل</th>
              <th>ڕۆڵ</th>
              <th>مۆڵەتەکان</th>
              <th>بارودۆخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>بارکردن...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>هیچ بەکارهێنەرێک نییە</td></tr>
            ) : users.map(u => {
              const r = roleStyle[u.role] || roleStyle.REP;
              const initials = u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || u.email?.[0]?.toUpperCase() || "؟";
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {initials}
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
                  <td>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.bg, color: r.color }}>{r.label}</span>
                  </td>
                  <td style={{ fontSize: 11, color: "#6C757D", maxWidth: 200 }}>
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
            <Shield size={11} /> بەکارهێنەرانی نووسراون لە Supabase Auth
          </div>
        </div>
      </div>

      {/* ── INVITE MODAL ── */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="بانگهێشتکردنی بەکارهێنەری نوێ" width={560}>
        {!inviteUrl ? (
          <>
            <FormGrid cols={2}>
              <FormField label="ئیمەیل" required>
                <input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" />
              </FormField>
              <FormField label="ڕۆڵ">
                <select style={selectStyle} value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                  <option value="REP">نوێنەر</option>
                  <option value="MANAGER">بەڕێوەبەر</option>
                  <option value="ADMIN">ئەدمین</option>
                </select>
              </FormField>
            </FormGrid>
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={inviteForm.permissions} onChange={p => setInviteForm({ ...inviteForm, permissions: p })} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleInvite} disabled={inviteLoading}
                style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: inviteLoading ? 0.7 : 1 }}>
                {inviteLoading ? "دروستکردن..." : "دروستکردنی لینک"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EBFBEE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#40C057" }}><Link2 size={24} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>لینکی بانگهێشت ئامادەیە!</h3>
            <p style={{ fontSize: 12, color: "#6C757D", marginBottom: 16 }}>ئەم لینکە بنێرە بۆ بەکارهێنەرەکە تا هەژمارەکەی دروست بکات</p>
            <div style={{ background: "#F8F9FA", borderRadius: 8, padding: "12px 16px", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", direction: "ltr", textAlign: "left", border: "1px solid #DEE2E6", marginBottom: 16 }}>{inviteUrl}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={handleCopy}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 8, background: copied ? "#40C057" : "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? <><Check size={14} /> کۆپیکرا!</> : <><Copy size={14} /> کۆپیکردن</>}
              </button>
              <button onClick={() => { setInviteUrl(""); setInviteModalOpen(false); loadUsers(); }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
                داخستن
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── DIRECT ADD MODAL ── */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="زیادکردنی بەکارهێنەری نوێ" width={480}>
        <form onSubmit={handleDirectAdd}>
          <FormGrid cols={1}>
            <FormField label="ناو" required><input style={inputStyle} required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></FormField>
            <FormField label="ئیمەیل" required><input style={inputStyle} type="email" required value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></FormField>
            <FormField label="وشەی نهێنی" required><input style={inputStyle} type="password" required value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} /></FormField>
            <FormGrid>
              <FormField label="تەلەفۆن"><input style={inputStyle} value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} /></FormField>
              <FormField label="شار"><input style={inputStyle} value={addForm.city} onChange={e => setAddForm({ ...addForm, city: e.target.value })} /></FormField>
            </FormGrid>
            <FormField label="ڕۆڵ">
              <div style={{ display: "flex", gap: 8 }}>
                {[{ value: "ADMIN", label: "ئەدمین", bg: "#FFE3E3", color: "#C92A2A" }, { value: "MANAGER", label: "بەڕێوەبەر", bg: "#EDF2FF", color: "#4263EB" }, { value: "REP", label: "نوێنەر", bg: "#D3F9D8", color: "#2B8A3E" }].map(r => (
                  <button key={r.value} type="button" onClick={() => setAddForm({ ...addForm, role: r.value })}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `2px solid ${addForm.role === r.value ? r.color : "#DEE2E6"}`, background: addForm.role === r.value ? r.bg : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: addForm.role === r.value ? r.color : "#6C757D" }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </FormField>
          </FormGrid>
          <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
            <button type="submit" disabled={addLoading}
              style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: addLoading ? 0.7 : 1 }}>
              {addLoading ? "دروستکردن..." : "زیادکردن"}
            </button>
            <button type="button" onClick={() => setAddModalOpen(false)}
              style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
              پاشگەزبوونەوە
            </button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT PERMISSIONS MODAL ── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`دەستکاری: ${editUser?.name || editUser?.email || ""}`} width={560}>
        {editUser && (
          <>
            <div style={{ padding: "12px 16px", background: "#F8F9FA", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700 }}>
                {editUser.name?.[0] || editUser.email?.[0] || "؟"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{editUser.name}</div>
                <div style={{ fontSize: 12, color: "#6C757D" }}>{editUser.email}</div>
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

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={handleDeactivate}
        title="ناچالاككردنی بەکارهێنەر"
        message="ئایا دڵنیایت لە ناچالاككردنی ئەم بەکارهێنەرە؟"
      />
    </>
  );
}
