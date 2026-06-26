"use client";
import { useState } from "react";
import {
  Plus, Search, Edit2, Trash2, Truck, Phone, MapPin,
  CheckCircle, XCircle, MessageCircle, User,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import type { Driver } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";

const CITIES = ["سلێمانی", "هەولێر", "دهۆک", "کەرکووک", "حەڵەبجە", "گەرمیان", "رانیە", "کۆیە"];

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #F1F3F5",
};

const EMPTY_FORM = { name: "", phone: "", city: "", telegramChatId: "", isActive: true };

export default function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver, loading, showToast } = useData();
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("هەموو");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Filter ──
  const cities = ["هەموو", ...new Set(drivers.map(d => d.city).filter(Boolean))];
  const filtered = drivers.filter(d => {
    const matchSearch = !search || d.name.includes(search) || d.phone.includes(search) || d.telegramChatId.includes(search);
    const matchCity = filterCity === "هەموو" || d.city === filterCity;
    const matchActive = filterActive === "all" || (filterActive === "active" ? d.isActive : !d.isActive);
    return matchSearch && matchCity && matchActive;
  });

  // ── KPIs ──
  const kpi = {
    total: drivers.length,
    active: drivers.filter(d => d.isActive).length,
    withTelegram: drivers.filter(d => d.telegramChatId).length,
    cities: new Set(drivers.map(d => d.city).filter(Boolean)).size,
  };

  // ── Handlers ──
  function openNew() {
    setEditDriver(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }
  function openEdit(d: Driver) {
    setEditDriver(d);
    setForm({ name: d.name, phone: d.phone, city: d.city, telegramChatId: d.telegramChatId, isActive: d.isActive });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditDriver(null); setForm({ ...EMPTY_FORM }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showToast("ناوی شوفێر داخڵ بکە", "error"); return; }
    setSaving(true);
    try {
      if (editDriver) {
        updateDriver(editDriver.id, form);
        showToast("شوفێر نوێکرایەوە ✅", "success");
      } else {
        await addDriver(form);
        showToast("شوفێری نوێ زیادکرا ✅", "success");
      }
      closeModal();
    } catch { showToast("کێشەیەک ڕوویدا", "error"); }
    finally { setSaving(false); }
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteDriver(deleteId);
    showToast("شوفێر سڕایەوە", "success");
    setDeleteId(null);
  }

  function toggleActive(d: Driver) {
    updateDriver(d.id, { isActive: !d.isActive });
    showToast(d.isActive ? "شوفێر ناچالاک کرا" : "شوفێر چالاک کرا", "success");
  }

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>شوفێرەکان</h1>
          <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی شوفێرەکان و زانیاری تێلێگرام</p>
        </div>
        {isManager && (
          <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            <Plus size={16} /> شوفێری نوێ
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "کۆی شوفێرەکان", value: kpi.total,       color: "#4263EB", bg: "#EDF2FF" },
          { label: "چالاک",          value: kpi.active,       color: "#059669", bg: "#D1FAE5" },
          { label: "تێلێگرام",       value: kpi.withTelegram, color: "#7C3AED", bg: "#EDE9FE" },
          { label: "شار",            value: kpi.cities,       color: "#D97706", bg: "#FEF3C7" },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ ...card, marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="گەڕان بە ناو یان ژمارە..." style={{ ...inputStyle, paddingLeft: 38 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {cities.map(c => (
            <button key={c} onClick={() => setFilterCity(c)} style={{ padding: "6px 12px", borderRadius: 99, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", borderColor: filterCity === c ? "#4263EB" : "#DEE2E6", background: filterCity === c ? "#EDF2FF" : "#fff", color: filterCity === c ? "#4263EB" : "#495057" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([["all", "هەموو"], ["active", "چالاک"], ["inactive", "ناچالاک"]] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterActive(val)} style={{ padding: "6px 12px", borderRadius: 99, border: "1.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", borderColor: filterActive === val ? "#059669" : "#DEE2E6", background: filterActive === val ? "#D1FAE5" : "#fff", color: filterActive === val ? "#059669" : "#495057" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Driver Cards Grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ ...card, height: 160, background: "#F8F9FA", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60, color: "#ADB5BD" }}>
          <Truck size={48} style={{ display: "block", margin: "0 auto 16px", color: "#DEE2E6" }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>هیچ شوفێرێک نەدۆزرایەوە</div>
          <div style={{ fontSize: 13 }}>زانیاری شوفێرەکان لێرە دەردەکەوێت</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 16 }}>
          {filtered.map(d => (
            <div key={d.id} style={{ ...card, padding: 20, position: "relative", opacity: d.isActive ? 1 : 0.65, borderColor: d.isActive ? "#F1F3F5" : "#DEE2E6" }}>
              {/* Status badge */}
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 8px", background: d.isActive ? "#D1FAE5" : "#F1F3F5", color: d.isActive ? "#059669" : "#6C757D" }}>
                  {d.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                  {d.isActive ? "چالاک" : "ناچالاک"}
                </span>
              </div>

              {/* Avatar + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: d.isActive ? "#EDE9FE" : "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={22} color={d.isActive ? "#7C3AED" : "#ADB5BD"} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#6C757D" }}>شوفێر</div>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {d.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#495057" }}>
                    <Phone size={14} color="#4263EB" /> {d.phone}
                  </div>
                )}
                {d.city && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#495057" }}>
                    <MapPin size={14} color="#D97706" /> {d.city}
                  </div>
                )}
                {d.telegramChatId ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#7C3AED", fontWeight: 600 }}>
                    <MessageCircle size={14} color="#7C3AED" /> Telegram: {d.telegramChatId}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#ADB5BD" }}>
                    <MessageCircle size={13} /> بێ تێلێگرام
                  </div>
                )}
              </div>

              {/* Actions */}
              {isManager && (
                <div style={{ display: "flex", gap: 8, borderTop: "1px solid #F8F9FA", paddingTop: 12 }}>
                  <button onClick={() => openEdit(d)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    <Edit2 size={13} /> دەستکاری
                  </button>
                  <button onClick={() => toggleActive(d)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px", background: d.isActive ? "#FEF3C7" : "#D1FAE5", color: d.isActive ? "#D97706" : "#059669", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    {d.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                    {d.isActive ? "ناچالاک" : "چالاک"}
                  </button>
                  <button onClick={() => setDeleteId(d.id)} style={{ padding: "7px 10px", background: "#FFF5F5", color: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════ */}
      <Modal open={modalOpen} onClose={closeModal} title={editDriver ? "دەستکاریکردنی شوفێر" : "زیادکردنی شوفێری نوێ"} width={520}>
        <form onSubmit={handleSubmit}>
          <FormGrid cols={2}>
            <FormField label="ناوی شوفێر" required>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ناوی تەواو..." required />
            </FormField>
            <FormField label="ژمارەی مۆبایل">
              <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07X XXX XXXX" />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="شار">
              <select style={selectStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
                <option value="">هەڵبژاردن...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="تێلێگرام Chat ID">
              <input style={inputStyle} value={form.telegramChatId} onChange={e => setForm({ ...form, telegramChatId: e.target.value })} placeholder="-100xxxxxxxxxx" />
            </FormField>
          </FormGrid>
          <FormField label="بارودۆخ">
            <div style={{ display: "flex", gap: 10 }}>
              {([true, false] as const).map(v => (
                <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${form.isActive === v ? "#4263EB" : "#DEE2E6"}`, background: form.isActive === v ? "#EDF2FF" : "#fff", color: form.isActive === v ? "#4263EB" : "#6C757D", fontWeight: 600 }}>
                  <input type="radio" style={{ display: "none" }} checked={form.isActive === v} onChange={() => setForm({ ...form, isActive: v })} />
                  {v ? "چالاک" : "ناچالاک"}
                </label>
              ))}
            </div>
          </FormField>
          <div style={{ marginTop: 12, padding: 12, background: "#F0F4FF", borderRadius: 10, fontSize: 13, color: "#4263EB" }}>
            💡 <strong>Chat ID</strong> ی تێلێگرام پێویستە بۆ ناردنی پەیامی دەنگی (MP3) بۆ شوفێر. ئەمە دەتوانیت لە بۆتی تێلێگرام بدۆزیتەوە.
          </div>
          <FormActions onCancel={closeModal} submitLabel={saving ? "تۆمارکردن..." : editDriver ? "نوێکردنەوە" : "زیادکردن"} />
        </form>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteId}
        message="دڵنیای لە سڕینەوەی ئەم شوفێرە؟"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
}
