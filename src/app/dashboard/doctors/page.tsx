"use client";
import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  Stethoscope, Plus, Search, Edit3, Trash2, Phone, MapPin,
  X, Save, Building2, User, FileText, Map, List, RefreshCw,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, inputStyle, selectStyle } from "@/components/ui/FormField";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";

// ── Dynamic map import (SSR-safe) ─────────────────────────────────────────────
const DoctorMap = dynamic(() => import("./DoctorMap"), { ssr: false, loading: () => (
  <div style={{ flex: 1, background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16 }}>
    <div style={{ textAlign: "center", color: "#ADB5BD" }}>
      <Map size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>نەخشەکە بارئەکرێت...</div>
    </div>
  </div>
)});

// ── Types ──────────────────────────────────────────────────────────────────────
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  secretary_phone: string;
  clinic_name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rep_id: string;
  notes: string;
  created_at: string;
}

const SPECIALTIES = [
  "پزیشکی گشتی", "پزیشکی دڵ", "پزیشکی مێشک و دەمار", "پزیشکی منداڵ",
  "پزیشکی ژن و منداڵبوون", "پزیشکی ئەندام و بازووکان", "چاوپزیشکی",
  "پزیشکی گوێ لووت قووچ", "پزیشکی پێست", "پزیشکی مژارچی", "دیابێت و ئۆرمۆن",
  "پزیشکی گورچیلە", "پزیشکی سروو", "پزیشکی دانتیستی", "تر",
];

const EMPTY: Omit<Doctor, "id" | "created_at"> = {
  name: "", specialty: "", phone: "", secretary_phone: "",
  clinic_name: "", city: "", address: "",
  latitude: null, longitude: null, rep_id: "", notes: "",
};

function DoctorAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
  const colors = ["#4263EB", "#7950F2", "#F47B35", "#2F9E44", "#1098AD", "#E67700"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const color = colors[Math.abs(h) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: size * 0.32, fontWeight: 800, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const { reps } = useData();
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deleteDoctor, setDeleteDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<Omit<Doctor, "id" | "created_at">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("doctors").select("*").order("name");
    setDoctors((data || []) as Doctor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialty?.toLowerCase().includes(q) ||
      d.clinic_name?.toLowerCase().includes(q) ||
      d.city?.toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const withCoords = useMemo(() => filtered.filter(d => d.latitude && d.longitude), [filtered]);

  // ── Geocode address → lat/lng via free Nominatim ──────────────────────────
  const geocodeAddress = async () => {
    const query = [form.clinic_name, form.address, form.city, "Iraq"].filter(Boolean).join(", ");
    if (!query.trim()) { showToast("ناونیشان داخڵ بکە", false); return; }
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        setForm(f => ({ ...f, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
        showToast("شوێن دۆزرایەوە ✓");
      } else {
        showToast("شوێن نەدۆزرایەوە، دەستی بنووسە", false);
      }
    } catch { showToast("هەڵە لە دۆزینەوەی شوێن", false); }
    setGeocoding(false);
  };

  // ── Save (add) ────────────────────────────────────────────────────────────
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { showToast("ناو پێویستە", false); return; }
    setSaving(true);
    const { error } = await supabase.from("doctors").insert({ ...form, id: undefined });
    setSaving(false);
    if (error) { showToast("هەڵە: " + error.message, false); return; }
    showToast("پزیشک زیادکرا ✓");
    setAddOpen(false);
    setForm(EMPTY);
    fetchDoctors();
  };

  // ── Save (edit) ────────────────────────────────────────────────────────────
  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDoctor) return;
    setSaving(true);
    const { error } = await supabase.from("doctors").update(form).eq("id", editDoctor.id);
    setSaving(false);
    if (error) { showToast("هەڵە: " + error.message, false); return; }
    showToast("پزیشک نوێکرایەوە ✓");
    setEditDoctor(null);
    fetchDoctors();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDoctor) return;
    await supabase.from("doctors").delete().eq("id", deleteDoctor.id);
    showToast("پزیشک سڕایەوە");
    setDeleteDoctor(null);
    fetchDoctors();
  };

  const openEdit = (d: Doctor) => {
    setEditDoctor(d);
    setForm({
      name: d.name, specialty: d.specialty || "", phone: d.phone || "",
      secretary_phone: d.secretary_phone || "", clinic_name: d.clinic_name || "",
      city: d.city || "", address: d.address || "",
      latitude: d.latitude, longitude: d.longitude,
      rep_id: d.rep_id || "", notes: d.notes || "",
    });
  };

  const selectedDoctor = doctors.find(d => d.id === selectedId) || null;
  const repName = (id: string) => reps.find(r => r.id === id)?.name || "";

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (color: string, bg: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
    borderRadius: 10, border: "none", background: bg, color, fontWeight: 700,
    fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "opacity .15s",
  });
  const iS = inputStyle;

  const DoctorForm = () => (
    <form onSubmit={editDoctor ? handleEdit : handleAdd} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormGrid cols={2}>
        <FormField label="ناوی پزیشک *">
          <input style={iS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="د. ئەحمەد..." required />
        </FormField>
        <FormField label="پسپۆڕی">
          <select style={selectStyle} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
            <option value="">— هەڵبژێرە —</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="ژمارەی تەلەفۆن">
          <input style={iS} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XX XXX XXXX" />
        </FormField>
        <FormField label="ژمارەی منشی">
          <input style={iS} value={form.secretary_phone} onChange={e => setForm(f => ({ ...f, secretary_phone: e.target.value }))} placeholder="07XX XXX XXXX" />
        </FormField>
        <FormField label="ناوی کلینیک / نەخۆشخانە">
          <input style={iS} value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} placeholder="کلینیکی..." />
        </FormField>
        <FormField label="شار">
          <input style={iS} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="هەولێر، سلێمانی..." />
        </FormField>
      </FormGrid>
      <FormField label="ناونیشان">
        <input style={iS} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ناونیشانی تەواو..." />
      </FormField>

      {/* Location */}
      <div style={{ background: "#F8F9FA", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={13} /> شوێن لەسەر نەخشە</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={geocodeAddress} disabled={geocoding}
            style={{ ...btn("#fff", "#4263EB"), flex: 1, justifyContent: "center", opacity: geocoding ? 0.6 : 1 }}>
            {geocoding ? "🔍 دەگەڕێت..." : "🔍 شوێن بدۆزەوە"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <FormField label="Latitude">
            <input style={iS} type="number" step="any" value={form.latitude ?? ""} onChange={e => setForm(f => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="36.19..." />
          </FormField>
          <FormField label="Longitude">
            <input style={iS} type="number" step="any" value={form.longitude ?? ""} onChange={e => setForm(f => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="44.00..." />
          </FormField>
        </div>
        {form.latitude && form.longitude && (
          <div style={{ fontSize: 11, color: "#2F9E44", marginTop: 6, fontWeight: 600 }}>✓ شوێن دیاریکراوە ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})</div>
        )}
      </div>

      {/* Rep */}
      <FormGrid cols={2}>
        <FormField label="نوێنەری پەیوەندیدار">
          <select style={selectStyle} value={form.rep_id} onChange={e => setForm(f => ({ ...f, rep_id: e.target.value }))}>
            <option value="">— هیچ —</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
      </FormGrid>

      <FormField label="تێبینی">
        <textarea style={{ ...iS, minHeight: 72, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="هەر زانیارییەکی تر..." />
      </FormField>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={() => { setAddOpen(false); setEditDoctor(null); }}
          style={{ ...btn("#6C757D", "#F1F3F5") }}><X size={14} /> پاشگەزبوونەوە</button>
        <button type="submit" disabled={saving}
          style={{ ...btn("#fff", "#4263EB"), opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}</button>
      </div>
    </form>
  );

  return (
    <div style={{ padding: 24, direction: "rtl", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#2F9E44" : "#E03131", color: "white", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Stethoscope size={22} color="#4263EB" /> پزیشکەکان
          </h1>
          <p style={{ color: "#6C757D", fontSize: 13, margin: "4px 0 0" }}>{doctors.length} پزیشک تۆمارکراوە</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "#F1F3F5", borderRadius: 10, padding: 3, gap: 2 }}>
            {(["list", "map"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: view === v ? "white" : "transparent", color: view === v ? "#4263EB" : "#6C757D", boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
                {v === "list" ? <><List size={13} /> لیست</> : <><Map size={13} /> نەخشە</>}
              </button>
            ))}
          </div>
          <button onClick={fetchDoctors} style={{ ...btn("#6C757D", "#F1F3F5"), padding: "8px 12px" }}><RefreshCw size={14} /></button>
          <button onClick={() => { setForm(EMPTY); setAddOpen(true); }} style={btn("#fff", "#4263EB")}><Plus size={14} /> پزیشکی نوێ</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 380 }}>
        <Search size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="گەڕان بە ناو، پسپۆڕی، شار..."
          style={{ ...iS, paddingRight: 36, paddingLeft: 12 }} />
      </div>

      {/* Content */}
      {view === "list" ? (
        /* ── LIST VIEW ── */
        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
              <tbody><SkeletonTableRows rows={6} cols={5} /></tbody>
            </table>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, background: "#F8F9FA", borderRadius: 16 }}>
              <Stethoscope size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ color: "#ADB5BD", fontSize: 13 }}>{search ? "هیچ پزیشکێک نەدۆزرایەوە" : "هێشتا هیچ پزیشکێک زیاد نەکراوە"}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {filtered.map(d => (
                <div key={d.id} onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                  style={{ background: "white", borderRadius: 16, border: selectedId === d.id ? "2px solid #4263EB" : "1px solid #E9ECEF", padding: 18, cursor: "pointer", boxShadow: selectedId === d.id ? "0 0 0 4px #EDF2FF" : "0 1px 4px rgba(0,0,0,0.06)", transition: "all .15s" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <DoctorAvatar name={d.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1A1A2E", marginBottom: 3 }}>{d.name}</div>
                      {d.specialty && <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#EDF2FF", color: "#4263EB", fontWeight: 600, display: "inline-block", marginBottom: 6 }}>{d.specialty}</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {d.clinic_name && <div style={{ fontSize: 12, color: "#495057", display: "flex", alignItems: "center", gap: 5 }}><Building2 size={11} color="#ADB5BD" />{d.clinic_name}</div>}
                        {d.city && <div style={{ fontSize: 12, color: "#495057", display: "flex", alignItems: "center", gap: 5 }}><MapPin size={11} color="#ADB5BD" />{d.city}{d.address ? ` — ${d.address}` : ""}</div>}
                        {d.phone && <div style={{ fontSize: 12, color: "#495057", display: "flex", alignItems: "center", gap: 5 }}><Phone size={11} color="#ADB5BD" />{d.phone}</div>}
                        {d.secretary_phone && <div style={{ fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 5 }}><User size={11} color="#ADB5BD" />منشی: {d.secretary_phone}</div>}
                        {d.rep_id && repName(d.rep_id) && <div style={{ fontSize: 11, padding: "1px 7px", borderRadius: 5, background: "#D3F9D8", color: "#2B8A3E", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}><User size={9} />{repName(d.rep_id)}</div>}
                        {d.latitude && d.longitude && <div style={{ fontSize: 10, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={9} />📍 شوێن ئامادەیە</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(d); }}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #DEE2E6", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}>
                        <Edit3 size={12} />
                      </button>
                      {isManager && (
                        <button onClick={e => { e.stopPropagation(); setDeleteDoctor(d); }}
                          style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #FFE3E3", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#FA5252" }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {d.notes && <div style={{ marginTop: 10, fontSize: 11, color: "#6C757D", background: "#F8F9FA", borderRadius: 7, padding: "6px 10px", display: "flex", gap: 5 }}><FileText size={10} style={{ flexShrink: 0, marginTop: 1 }} />{d.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── MAP VIEW ── */
        <div style={{ flex: 1, display: "flex", gap: 14, minHeight: 0 }}>
          {/* Side list */}
          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flexShrink: 0 }}>
            {withCoords.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#ADB5BD", fontSize: 12 }}>
                هیچ پزیشکێک شوێنی نییە<br />
                <span style={{ fontSize: 11 }}>لە فۆرمەکەدا "شوێن بدۆزەوە" بکە</span>
              </div>
            ) : withCoords.map(d => (
              <div key={d.id} onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                style={{ background: "white", borderRadius: 12, border: selectedId === d.id ? "2px solid #4263EB" : "1px solid #E9ECEF", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <DoctorAvatar name={d.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#1A1A2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                    {d.specialty && <div style={{ fontSize: 10, color: "#7950F2" }}>{d.specialty}</div>}
                    {d.city && <div style={{ fontSize: 10, color: "#ADB5BD" }}>{d.city}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Map */}
          <DoctorMap
            doctors={withCoords as { id: string; name: string; specialty: string; clinic_name: string; city: string; address: string; phone: string; latitude: number; longitude: number }[]}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="زیادکردنی پزیشکی نوێ" width={660}>
        <DoctorForm />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editDoctor} onClose={() => setEditDoctor(null)} title={`دەستکاریکردنی — ${editDoctor?.name || ""}`} width={660}>
        <DoctorForm />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteDoctor}
        onClose={() => setDeleteDoctor(null)}
        title="سڕینەوەی پزیشک"
        message={`دڵنیایت لە سڕینەوەی ${deleteDoctor?.name}؟`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
