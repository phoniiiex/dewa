"use client";
import { useState, FormEvent, useMemo, useRef } from "react";
import { Search, Plus, UserCheck, Phone, MapPin, Edit3, Trash2, X, Camera } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Rep } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";

const repExportCols = [
  { key: "name", label: "ناو" }, { key: "phone", label: "تەلەفۆن" },
  { key: "city", label: "شار" }, { key: "isActive", label: "بارودۆخ", format: (v: unknown) => v ? "چالاک" : "ناچالاک" },
];

const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function RepsPage() {
  const { reps, clients, orders, addRep, updateRep, deleteRep } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);
  const [detailRep, setDetailRep] = useState<Rep | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true });

  const resetForm = () => setForm({ name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true });
  const openAdd  = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (r: Rep) => { setEditing(r); setForm({ name: r.name, phone: r.phone, email: r.email || "", city: r.city, profilePic: r.profilePic || "", isActive: r.isActive }); setModalOpen(true); };

  const picInputRef = useRef<HTMLInputElement>(null);

  // Resize image to ≤200px and return base64 JPEG
  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) updateRep(editing.id, form);
    else addRep({ ...form, telegramChatId: "" });
    setModalOpen(false);
  };

  const filtered = useMemo(
    () => reps.filter(r => r.name.includes(searchTerm) || r.phone.includes(searchTerm)),
    [reps, searchTerm]
  );

  // Pre-compute per-rep stats once instead of calling filter() per row per render
  const repStats = useMemo(() => {
    const map: Record<string, { clientCount: number; orderCount: number; revenue: number }> = {};
    reps.forEach(r => {
      const repOrders = orders.filter(o => o.repId === r.id);
      map[r.id] = {
        clientCount: clients.filter(c => c.repId === r.id).length,
        orderCount:  repOrders.length,
        revenue:     repOrders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
      };
    });
    return map;
  }, [reps, orders, clients]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EBFBEE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40C057" }}><UserCheck size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>نوێنەرانی فرۆشتن</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی نوێنەرانی فرۆشتنی دەرمان</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={repExportCols} filename="reps" title="نوێنەران" />
          <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>نوێنەری نوێ</span></button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی نوێنەران", value: String(reps.length) },
          { title: "چالاک", value: String(reps.filter(r => r.isActive).length) },
          { title: "کۆی کڕیاران", value: String(clients.length) },
          { title: "کۆی داهات", value: formatIQD(orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0)) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
      </div>

      {/* Rep Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320, 1fr))", gap: 16 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", transition: "transform 0.15s", cursor: "pointer" }} onClick={() => setDetailRep(r)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar: photo or gradient initials */}
                <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "2px solid #E9ECEF", flexShrink: 0, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.profilePic
                    ? <img src={r.profilePic} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : <span style={{ color: "white", fontSize: 18, fontWeight: 800 }}>{r.name.charAt(0)}</span>
                  }
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6C757D", marginTop: 2 }}><MapPin size={12} />{r.city}</div>
                </div>
              </div>
              <span className={`status-badge ${r.isActive ? "paid" : "cancelled"}`}>{r.isActive ? "چالاک" : "ناچالاک"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6C757D", marginBottom: 12 }}><Phone size={12} /> <span style={{ direction: "ltr" }}>{r.phone}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 12, background: "#F8F9FA", borderRadius: 8 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#4263EB" }}>{repStats[r.id]?.clientCount ?? 0}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>کڕیار</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#F47B35" }}>{repStats[r.id]?.orderCount ?? 0}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>داواکاری</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: "#40C057" }}>{formatIQD(repStats[r.id]?.revenue ?? 0)}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>داهات</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={12} /> دەستکاری</button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #FFC9C9", background: "#FFF5F5", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, color: "#FA5252" }}><Trash2 size={12} /> سڕینەوە</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری نوێنەر" : "نوێنەری نوێ"} width={480}>
        <form onSubmit={handleSubmit}>
          {/* Clickable avatar upload */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div
              onClick={() => picInputRef.current?.click()}
              style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid #4263EB", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {form.profilePic
                ? <img src={form.profilePic} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>{form.name.charAt(0) || "?"}</span>
              }
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                <Camera size={18} color="white" />
              </div>
            </div>
            <input ref={picInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { setForm(prev => ({ ...prev, profilePic: "" })); const b64 = await resizeImage(f); setForm(prev => ({ ...prev, profilePic: b64 })); }
                catch { alert("وێنەکە بارنەبوو"); }
              }}
            />
          </div>
          {form.profilePic && (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, profilePic: "" }))}
                style={{ fontSize: 11, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                سڕینەوەی وێنە
              </button>
            </div>
          )}
          <FormGrid cols={1}>
            <FormField label="ناوی نوێنەر" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="ئیمەیڵ"><input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rep@example.com" dir="ltr" /></FormField>
            <FormField label="تەلەفۆن" required><input style={inputStyle} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0770 XXX XXXX" /></FormField>
            <FormField label="شار"><select style={selectStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
          </FormGrid>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} style={{ width: 16, height: 16 }} />
              چالاک
            </label>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      {/* Detail Drawer */}
      {detailRep && (
        <div onClick={() => setDetailRep(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400, animation: "fadeIn 0.15s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 440, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", animation: "slideInRight 0.2s ease", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{detailRep.name}</h3>
              <button onClick={() => setDetailRep(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>تەلەفۆن</div><div style={{ fontSize: 14, fontWeight: 600 }}>{detailRep.phone}</div></div>
                <div><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>شار</div><div style={{ fontSize: 14, fontWeight: 600 }}>{detailRep.city}</div></div>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>کڕیارانی تایبەت ({clients.filter(c => c.repId === detailRep.id).length})</h4>
              {clients.filter(c => c.repId === detailRep.id).map(c => (
                <div key={c.id} style={{ padding: "10px 12px", background: "#F8F9FA", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: "#6C757D" }}>{c.city}</span>
                </div>
              ))}
              <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>داواکارییەکان ({orders.filter(o => o.repId === detailRep.id).length})</h4>
              {orders.filter(o => o.repId === detailRep.id).map(o => (
                <div key={o.id} style={{ padding: "10px 12px", background: "#F8F9FA", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                  <div><span style={{ fontWeight: 600, fontSize: 13 }}>{o.orderNumber}</span> <span style={{ fontSize: 11, color: "#ADB5BD" }}>{o.clientName}</span></div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(o.totalAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteRep(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم نوێنەرە؟" />
    </>
  );
}
