"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Shield, Link2, Copy, Check, Trash2, Edit3, Key } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import { supabase } from "@/lib/supabase";

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

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "REP", permissions: [] as string[] });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    const res = await fetch("/api/auth/create-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const d = await res.json();
    if (d.url) {
      setInviteUrl(d.url);
    } else {
      alert(d.error || "Error creating invite");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdatePermissions = async () => {
    if (!editProfile) return;
    await supabase.from("profiles").update({
      permissions: editProfile.permissions,
      role: editProfile.role,
    }).eq("id", editProfile.id);
    loadProfiles();
    setEditProfile(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Deactivate user
    await supabase.from("profiles").update({ is_active: false }).eq("id", deleteId);
    loadProfiles();
    setDeleteId(null);
  };

  const togglePerm = (perms: string[], key: string) => {
    return perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key];
  };

  const PermissionGrid = ({ permissions, onChange }: { permissions: string[]; onChange: (p: string[]) => void }) => {
    const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
                  <button key={p.key} type="button" onClick={() => onChange(togglePerm(permissions, p.key))}
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
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><Users size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>بەکارهێنەران</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی بەکارهێنەران و مۆڵەتەکان</p></div>
        </div>
        <button onClick={() => { setInviteForm({ email: "", role: "REP", permissions: [] }); setInviteUrl(""); setInviteModalOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, background: "#4263EB", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <Plus size={16} /> بانگهێشتکردن
        </button>
      </div>

      {/* KPI */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>کۆی بەکارهێنەران</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{profiles.length}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>چالاک</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#40C057" }}>{profiles.filter(p => p.is_active).length}</div></div>
        <div className="kpi-card"><div className="kpi-card-title" style={{ marginBottom: 8 }}>بەڕێوەبەر</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: "#4263EB" }}>{profiles.filter(p => p.role === "ADMIN").length}</div></div>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>بەکارهێنەر</th><th>ئیمەیل</th><th>ڕۆڵ</th><th>مۆڵەتەکان</th><th>بارودۆخ</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>بارکردن...</td></tr> :
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
                <td><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.role === "ADMIN" ? "#EDF2FF" : "#EBFBEE", color: p.role === "ADMIN" ? "#4263EB" : "#40C057" }}>{p.role === "ADMIN" ? "بەڕێوەبەر" : "نوێنەر"}</span></td>
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
                    <button onClick={() => setDeleteId(p.id)} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "#FA5252" }} title="ناچالاککردن"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{profiles.length} بەکارهێنەر</span></div>
      </div>

      {/* Invite Modal */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="بانگهێشتکردنی بەکارهێنەری نوێ" width={560}>
        {!inviteUrl ? (
          <>
            <FormGrid cols={2}>
              <FormField label="ئیمەیل" required><input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" /></FormField>
              <FormField label="ڕۆڵ"><select style={selectStyle} value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}><option value="REP">نوێنەر</option><option value="MANAGER">بەڕێوەبەری</option><option value="ADMIN">ئەدمین</option></select></FormField>
            </FormGrid>
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={inviteForm.permissions} onChange={p => setInviteForm({ ...inviteForm, permissions: p })} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleInvite} style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>دروستکردنی لینکی بانگهێشت</button>
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

      {/* Edit Permissions Modal */}
      <Modal open={!!editProfile} onClose={() => setEditProfile(null)} title={`دەستکاری مۆڵەتەکانی ${editProfile?.name || ""}`} width={560}>
        {editProfile && (
          <>
            <FormField label="ڕۆڵ">
              <select style={selectStyle} value={editProfile.role} onChange={e => setEditProfile({ ...editProfile, role: e.target.value })}>
                <option value="REP">نوێنەر</option><option value="MANAGER">بەڕێوەبەری</option><option value="ADMIN">ئەدمین</option>
              </select>
            </FormField>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>مۆڵەتەکان</label>
              <PermissionGrid permissions={editProfile.permissions} onChange={p => setEditProfile({ ...editProfile, permissions: p })} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
              <button onClick={handleUpdatePermissions} style={{ padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>نوێکردنەوە</button>
              <button onClick={() => setEditProfile(null)} style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>پاشگەزبوونەوە</button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="ناچالاککردنی بەکارهێنەر" message="ئایا دڵنیایت لە ناچالاککردنی ئەم بەکارهێنەرە?" />
    </>
  );
}
