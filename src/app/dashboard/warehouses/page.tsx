"use client";
import { useState, FormEvent } from "react";
import { Plus, Warehouse as WarehouseIcon, Edit3, Trash2, MapPin, Phone, Percent, Tag, X } from "lucide-react";
import { useData } from "@/lib/store";
import type { Warehouse, BonusRule } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";

const warehouseExportCols = [
  { key: "name", label: "ناو" }, { key: "city", label: "شار" },
  { key: "contact", label: "پەیوەند" }, { key: "phone", label: "تەلەفۆن" },
  { key: "bonusPct", label: "ڕێژەی بۆنەس", format: (v: unknown) => `${v}%` },
];

const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function WarehousesPage() {
  const { warehouses, orders, products, addWarehouse, updateWarehouse, deleteWarehouse } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", city: cities[0], address: "", contact: "", phone: "",
    bonusPct: "15", isActive: true,
  });
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);

  const resetForm = () => {
    setForm({ name: "", city: cities[0], address: "", contact: "", phone: "", bonusPct: "15", isActive: true });
    setBonusRules([]);
  };
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({ name: w.name, city: w.city, address: w.address, contact: w.contact, phone: w.phone, bonusPct: String(w.bonusPct), isActive: w.isActive });
    setBonusRules(w.bonusRules || []);
    setModalOpen(true);
  };

  const addRule = () => setBonusRules([...bonusRules, { productId: "", productName: "", percent: 0 }]);
  const removeRule = (idx: number) => setBonusRules(bonusRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setBonusRules(bonusRules.map((r, i) => i === idx ? { ...r, productId, productName: prod?.name || "" } : r));
  };
  const updateRulePct = (idx: number, percent: number) => {
    setBonusRules(bonusRules.map((r, i) => i === idx ? { ...r, percent } : r));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validRules = bonusRules.filter(r => r.productId && r.percent > 0);
    const data = { ...form, bonusPct: Number(form.bonusPct), bonusRules: validRules };
    if (editing) updateWarehouse(editing.id, data);
    else addWarehouse(data);
    setModalOpen(false);
  };

  const getWarehouseOrders = (whId: string) => orders.filter(o => o.warehouseId === whId);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F3F0FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFC" }}><WarehouseIcon size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>کۆگاکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی هاوبەشی کۆگاکان و ڕێژەی بۆنەس</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton data={warehouses as unknown as Record<string, unknown>[]} columns={warehouseExportCols} filename="warehouses" title="کۆگاکان" />
          <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>کۆگای نوێ</span></button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی کۆگاکان", value: String(warehouses.length) },
          { title: "چالاک", value: String(warehouses.filter(w => w.isActive).length) },
          { title: "داواکاری لە ڕێگای کۆگا", value: String(orders.filter(o => o.warehouseId).length) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem" }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {warehouses.map(w => {
          const rules = w.bonusRules || [];
          return (
            <div key={w.id} style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{w.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6C757D" }}><MapPin size={12} />{w.city} — {w.address}</div>
                </div>
                <div style={{ background: "linear-gradient(135deg, #7C5CFC, #4263EB)", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>{w.bonusPct}<Percent size={14} /></div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, color: "#6C757D" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {w.phone}</div>
                <div>پەیوەندی: {w.contact}</div>
              </div>

              {/* Custom bonus rules preview */}
              {rules.length > 0 && (
                <div style={{ marginBottom: 14, padding: "10px 12px", background: "#F8F4FF", borderRadius: 8, border: "1px solid #E9D7FF" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7C5CFC", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <Tag size={11} /> یاسای تایبەت ({rules.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {rules.map((r, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "#7C5CFC", color: "white", fontWeight: 600 }}>
                        {r.productName}: {r.percent}٪
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, padding: 12, background: "#F8F9FA", borderRadius: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#4263EB" }}>{getWarehouseOrders(w.id).length}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>داواکاری</div></div>
                <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#7C5CFC" }}>{w.bonusPct}٪</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>بۆنەسی بنەڕەت</div></div>
                {rules.length > 0 && <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#F47B35" }}>{rules.length}</div><div style={{ fontSize: 10, color: "#ADB5BD" }}>یاسای تایبەت</div></div>}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(w)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #DEE2E6", background: "white", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={12} /> دەستکاری</button>
                <button onClick={() => setDeleteId(w.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #FFC9C9", background: "#FFF5F5", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, color: "#FA5252" }}><Trash2 size={12} /> سڕینەوە</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "دەستکاری کۆگا" : "کۆگای نوێ"} width={620}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی کۆگا" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="شار"><select style={selectStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="ناونیشان"><input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></FormField>
            <FormField label="پەیوەندیدار"><input style={inputStyle} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></FormField>
            <FormField label="تەلەفۆن"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="ڕێژەی بۆنەسی بنەڕەت (٪)" required>
              <input style={inputStyle} type="number" min="0" max="100" required value={form.bonusPct} onChange={(e) => setForm({ ...form, bonusPct: e.target.value })} />
            </FormField>
          </FormGrid>

          {/* Custom product bonus rules */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Tag size={14} color="#7C5CFC" /> یاسای بۆنەسی تایبەت بە بەرهەم</div>
                <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 2 }}>هەر بەرهەمێک دەتوانێت ڕێژەی بۆنەسی خۆی هەبێت کە جیاوازە لە ڕێژەی بنەڕەت</div>
              </div>
              <button type="button" onClick={addRule} style={{ padding: "5px 12px", borderRadius: 6, border: "1px dashed #7C5CFC", background: "#F8F4FF", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, color: "#7C5CFC", fontWeight: 600 }}>
                <Plus size={12} /> بەرهەمی تایبەت
              </button>
            </div>

            {bonusRules.length === 0 ? (
              <div style={{ padding: "14px", textAlign: "center", color: "#ADB5BD", fontSize: 12, background: "#F8F9FA", borderRadius: 8, border: "1px dashed #DEE2E6" }}>
                هیچ یاسایەکی تایبەت نەهاتووە — هەموو بەرهەمەکان ڕێژەی بنەڕەت ({form.bonusPct}٪) بەکاردەهێنن
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bonusRules.map((rule, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "#F8F4FF", borderRadius: 8, border: "1px solid #E9D7FF" }}>
                    <select
                      style={{ ...selectStyle, flex: 2, background: "white" }}
                      value={rule.productId}
                      onChange={e => updateRule(i, e.target.value)}
                    >
                      <option value="">بەرهەم هەڵبژێرە...</option>
                      {products.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number" min="0" max="100"
                        value={rule.percent || ""}
                        onChange={e => updateRulePct(i, Number(e.target.value))}
                        placeholder="٪"
                        style={{ ...inputStyle, width: 70, background: "white", textAlign: "center" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#7C5CFC" }}>٪</span>
                    </div>
                    {rule.productId && rule.percent > 0 && (
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "#7C5CFC", color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>
                        بۆ {rule.productName}: {rule.percent}٪
                      </span>
                    )}
                    <button type="button" onClick={() => removeRule(i)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editing} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteWarehouse(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم کۆگایە؟" />
    </>
  );
}
