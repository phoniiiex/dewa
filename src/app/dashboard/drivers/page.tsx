"use client";
import { useState } from "react";
import { Truck, Plus, Trash2, Edit2, X, Check, Search, Wifi, RefreshCw, UserPlus } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { getTelegramUpdates } from "@/lib/telegram";
import { SkeletonKPI } from "@/components/ui/Skeleton";

const CITIES = ["هەولێر", "سلێمانی", "کەرکووک", "دهۆک", "زاخۆ", "ڕانیە", "کۆیە", "چەمچەماڵ", "شاری دیگر"];

type TelegramUser = { chatId: string; firstName: string; lastName: string; username: string };

export default function DriversPage() {
  const { drivers, settings, addDriver, updateDriver, deleteDriver, showToast, loading } = useData();

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([]);
  const [scanError, setScanError] = useState("");
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);

  const emptyForm = { name: "", phone: "", city: "", telegramChatId: "", isActive: true };
  const [form, setForm] = useState(emptyForm);

  const filtered = drivers.filter(d =>
    d.name.includes(search) || d.city.includes(search) || d.phone.includes(search)
  );

  const openAdd = (prefill?: Partial<typeof emptyForm>) => {
    setEditId(null);
    setForm({ ...emptyForm, ...prefill });
    setFormOpen(true);
  };

  const openEdit = (d: typeof drivers[0]) => {
    setEditId(d.id);
    setForm({ name: d.name, phone: d.phone, city: d.city, telegramChatId: d.telegramChatId, isActive: d.isActive });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("ناوی شوفێر داخل بکە", "error"); return; }
    if (editId) {
      await updateDriver(editId, form);
      showToast("زانیاری نوێکرایەوە");
    } else {
      await addDriver(form);
      showToast("شوفێر زیادکرا ✅");
    }
    setFormOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  // ── Telegram scan ──────────────────────────────────────────────────
  const handleScan = async () => {
    if (!settings.telegramBotToken) {
      setScanError("تکایە سەرەتا تۆکنی بۆت لە ڕووپەلی تێلێگرام داخل بکە");
      return;
    }
    setScanning(true);
    setScanError("");
    setTelegramUsers([]);
    const users = await getTelegramUpdates(settings.telegramBotToken);
    setScanning(false);
    if (users.length === 0) {
      setScanError("هیچ کەسێک نامەی نەنێردووە بۆ بۆتەکە. تکایە شوفێرەکان داوا بکە پەیامێک بنێرن بۆ بۆتەکە.");
    } else {
      setTelegramUsers(users);
    }
  };

  const handlePickUser = (u: TelegramUser) => {
    setSelectedUser(u);
    setScanOpen(false);
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
    openAdd({ telegramChatId: u.chatId, name: fullName });
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #F1F3F5", boxShadow: "0 1px 4px rgba(0,0,0,.05)" };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDE9FE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C3AED" }}><Truck size={20} /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>شوفێرەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی شوفێران و پەیوەندی تێلێگرامیان</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setScanOpen(true); handleScan(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#EDE9FE", color: "#7C3AED", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            <Wifi size={16} /> کەشفکردن لە بۆت
          </button>
          <button onClick={() => openAdd()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            <Plus size={16} /> شوفێری نوێ
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <Search size={16} style={{ color: "#ADB5BD" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="گەڕان بە ناو، شار یان مۆبایل..."
          style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent" }} />
      </div>

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "کۆی شوفێران", value: drivers.length, color: "#4263EB", bg: "#EDF2FF" },
          { label: "چالاک", value: drivers.filter(d => d.isActive).length, color: "#059669", bg: "#D1FAE5" },
          { label: "تێلێگرام بەکارهێنان", value: drivers.filter(d => d.telegramChatId).length, color: "#7C3AED", bg: "#EDE9FE" },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: "16px 20px" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Drivers grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[0,1,2].map(i => <SkeletonKPI key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: "center", color: "#ADB5BD" }}>
          هیچ شوفێرێک نەدۆزرایەوە
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ ...card, padding: "20px", opacity: d.isActive ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: d.isActive ? "#EDE9FE" : "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", color: d.isActive ? "#7C3AED" : "#ADB5BD", fontSize: 18, fontWeight: 700 }}>
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "#6C757D" }}>{d.city}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(d)} style={{ width: 30, height: 30, border: "none", background: "#EDF2FF", color: "#4263EB", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Edit2 size={13} /></button>
                  <button onClick={() => deleteDriver(d.id)} style={{ width: 30, height: 30, border: "none", background: "#FEE2E2", color: "#DC2626", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#6C757D", minWidth: 60 }}>📞 مۆبایل</span>
                  <span style={{ fontWeight: 600 }}>{d.phone}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#6C757D", minWidth: 60 }}>📱 بۆت</span>
                  {d.telegramChatId
                    ? <span style={{ color: "#059669", fontWeight: 600 }}>✅ پەیوەندیکراوە</span>
                    : <span style={{ color: "#ADB5BD" }}>— بە پەیوەند نییە</span>
                  }
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#6C757D", minWidth: 60 }}>بارودۆخ</span>
                  <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: d.isActive ? "#D1FAE5" : "#F1F3F5", color: d.isActive ? "#059669" : "#6C757D" }}>
                    {d.isActive ? "چالاک" : "ناچالاک"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ Add/Edit Modal ══ */}
      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); setForm(emptyForm); }} title={editId ? "دەستکاریکردنی شوفێر" : "شوفێری نوێ"} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {form.telegramChatId && (
            <div style={{ padding: "10px 14px", background: "#D1FAE5", borderRadius: 10, fontSize: 13, color: "#059669", display: "flex", gap: 8, alignItems: "center" }}>
              <Check size={15} /> <span>Chat ID کەشفکرا: <strong>{form.telegramChatId}</strong></span>
            </div>
          )}
          <FormGrid cols={2}>
            <FormField label="ناوی شوفێر" required>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ناوی تەواو..." />
            </FormField>
            <FormField label="ژمارەی مۆبایل">
              <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxxx" />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="شار">
              <select style={selectStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
                <option value="">هەڵبژاردن...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="بارودۆخ">
              <select style={selectStyle} value={form.isActive ? "1" : "0"} onChange={e => setForm({ ...form, isActive: e.target.value === "1" })}>
                <option value="1">چالاک</option>
                <option value="0">ناچالاک</option>
              </select>
            </FormField>
          </FormGrid>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #F1F3F5" }}>
            <button onClick={() => { setFormOpen(false); setEditId(null); setForm(emptyForm); }}
              style={{ padding: "9px 18px", background: "#F8F9FA", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer" }}>پاشگەزبوونەوە</button>
            <button onClick={handleSave}
              style={{ padding: "9px 18px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
              {editId ? "پاشەکەوتکردن" : "زیادکردن ✓"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ Telegram Scan Modal ══ */}
      <Modal open={scanOpen} onClose={() => setScanOpen(false)} title="کەشفکردنی شوفێران لە بۆتی تێلێگرام" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px 16px", background: "#EDE9FE", borderRadius: 10, fontSize: 13, color: "#7C3AED" }}>
            💡 شوفێرەکان پێویستە سەرەتا پەیامێک بنێرن بۆ بۆتی تێلێگرام (<strong>@{settings.telegramBotUsername || "بۆتەکە"}</strong>) تا دەتوانیت کەشفیان بکەیت.
          </div>

          <button onClick={handleScan} disabled={scanning}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, cursor: scanning ? "not-allowed" : "pointer", fontWeight: 600, opacity: scanning ? 0.7 : 1 }}>
            <RefreshCw size={16} style={{ animation: scanning ? "spin 1s linear infinite" : "none" }} />
            {scanning ? "گەڕان..." : "دووبارە کەشفکردن"}
          </button>

          {scanError && (
            <div style={{ padding: "12px 16px", background: "#FEE2E2", borderRadius: 10, fontSize: 13, color: "#DC2626" }}>{scanError}</div>
          )}

          {telegramUsers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#495057" }}>{telegramUsers.length} کەس دۆزرایەوە:</div>
              {telegramUsers.map(u => {
                const alreadyAdded = drivers.some(d => d.telegramChatId === u.chatId);
                return (
                  <div key={u.chatId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8F9FA", borderRadius: 10, border: `1px solid ${alreadyAdded ? "#D1FAE5" : "#E9ECEF"}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</div>
                      <div style={{ fontSize: 12, color: "#6C757D" }}>
                        {u.username ? `@${u.username} · ` : ""}Chat ID: {u.chatId}
                      </div>
                    </div>
                    {alreadyAdded
                      ? <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>✅ زیادکراوە</span>
                      : <button onClick={() => handlePickUser(u)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                          <UserPlus size={13} /> زیادکردن
                        </button>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
