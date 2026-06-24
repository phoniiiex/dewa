"use client";
import { useState, FormEvent } from "react";
import { Search, Plus, Package, Edit3, Trash2, Eye, X, Grid3X3, List, AlertTriangle } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Product } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";
import type { ExportColumn } from "@/lib/export";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";

const productExportCols: ExportColumn[] = [
  { key: "name", label: "ناوی بەرهەم" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "جۆر" },
  { key: "price", label: "نرخ", format: (v) => String(v) },
  { key: "stock", label: "کۆگا" },
  { key: "origin", label: "سەرچاوە" },
  { key: "expiryDate", label: "بەسەرچوون" },
];

const categories = ["ئەنتیبایۆتیک", "ئازارکوژ", "گەدە و هەرس", "شەکرە", "ڤیتامین", "پێستی", "هتد"];
const unitTypes = ["پاکەت", "بوتل", "ئەمپوول", "تیوب", "قوتی"];
const origins = ["تورکیا 🇹🇷", "فەرەنسا 🇫🇷", "ئوردن 🇯🇴", "هندستان 🇮🇳", "سوویسرا 🇨🇭", "عێراق 🇮🇶", "ئەمریکا 🇺🇸"];

function isNearExpiry(date: string): boolean {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000; // 90 days
}

function isExpired(date: string): boolean {
  return new Date(date).getTime() < Date.now();
}

export default function ProductsPage() {
  const { products, suppliers, addProduct, updateProduct, deleteProduct, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("هەموو");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ name: "", sku: "", category: categories[0], price: "", stock: "", unitType: unitTypes[0], origin: origins[0], supplier: "", expiryDate: "", batchNumber: "", isSample: false, isActive: true });

  const resetForm = () => setForm({ name: "", sku: "", category: categories[0], price: "", stock: "", unitType: unitTypes[0], origin: origins[0], supplier: "", expiryDate: "", batchNumber: "", isSample: false, isActive: true });

  const openAdd = () => { resetForm(); setEditingProduct(null); setModalOpen(true); };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, price: String(p.price), stock: String(p.stock), unitType: p.unitType, origin: p.origin, supplier: p.supplier, expiryDate: p.expiryDate, batchNumber: p.batchNumber, isSample: p.isSample, isActive: p.isActive });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { name: form.name, sku: form.sku, category: form.category, price: Number(form.price), stock: Number(form.stock), unitType: form.unitType, origin: form.origin, supplier: form.supplier, expiryDate: form.expiryDate, batchNumber: form.batchNumber, isSample: form.isSample, isActive: form.isActive };
    if (editingProduct) updateProduct(editingProduct.id, data);
    else addProduct(data);
    setModalOpen(false);
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "هەموو" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const stockLabel = (s: number) => s > 500 ? "بەردەست" : s > 100 ? "کەم" : "کەمە";
  const stockColor = (s: number) => s > 500 ? "#40C057" : s > 100 ? "#FD7E14" : "#FA5252";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Package size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>بەرهەمەکان</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی هەموو بەرهەمەکان و کۆگا</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={productExportCols} filename="products" title="بەرهەمەکان" />
          <button onClick={openAdd} className="topbar-add-btn"><Plus size={16} /><span>بەرهەمی نوێ</span></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {loading ? (
          <>{[0,1,2,3].map(i => <SkeletonKPI key={i} />)}</>
        ) : [
          { title: "کۆی بەرهەم", value: String(products.length) },
          { title: "کۆی کۆگا", value: products.reduce((s, p) => s + p.stock, 0).toLocaleString() },
          { title: "نزیکی بەسەرچوون", value: String(products.filter(p => isNearExpiry(p.expiryDate)).length), color: "#FD7E14" },
          { title: "بەسەرچووە", value: String(products.filter(p => isExpired(p.expiryDate)).length), color: "#FA5252" },
        ].map((k, i) => (
          <div className="kpi-card" key={i}><div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div><div className="kpi-card-value" style={{ fontSize: "1.4rem", color: k.color }}>{k.value}</div></div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", maxWidth: 320 }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
            <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
            {["هەموو", ...categories.slice(0, 4)].map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: categoryFilter === c ? "white" : "transparent", color: categoryFilter === c ? "#1A1A2E" : "#6C757D", boxShadow: categoryFilter === c ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          <button onClick={() => setViewMode("list")} style={{ padding: 6, borderRadius: 6, background: viewMode === "list" ? "white" : "transparent", border: "none", cursor: "pointer", color: viewMode === "list" ? "#1A1A2E" : "#ADB5BD" }}><List size={16} /></button>
          <button onClick={() => setViewMode("grid")} style={{ padding: 6, borderRadius: 6, background: viewMode === "grid" ? "white" : "transparent", border: "none", cursor: "pointer", color: viewMode === "grid" ? "#1A1A2E" : "#ADB5BD" }}><Grid3X3 size={16} /></button>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>بەرهەم</th><th>SKU</th><th>جۆر</th><th>نرخ</th><th>کۆگا</th><th>بارودۆخ</th><th>ولاتی بەرهەم</th><th>بەسەرچوون</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={6} cols={9} />
            ) : filtered.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                <td style={{ fontSize: 12, color: "#6C757D", fontFamily: "monospace" }}>{p.sku}</td>
                <td><span style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#EDF2FF", color: "#4263EB" }}>{p.category}</span></td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(p.price)}</td>
                <td><span style={{ fontWeight: 600, color: stockColor(p.stock) }}>{p.stock.toLocaleString()}</span> <span style={{ fontSize: 10, color: "#ADB5BD" }}>{p.unitType}</span></td>
                <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: stockColor(p.stock) + "15", color: stockColor(p.stock) }}>{stockLabel(p.stock)}</span></td>
                <td style={{ fontSize: 12 }}>{p.origin}</td>
                <td>
                  {isExpired(p.expiryDate) ? (
                    <span style={{ color: "#FA5252", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> بەسەرچووە</span>
                  ) : isNearExpiry(p.expiryDate) ? (
                    <span style={{ color: "#FD7E14", fontSize: 12, fontWeight: 600 }}>{p.expiryDate}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#6C757D" }}>{p.expiryDate}</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setDetailProduct(p)} style={{ padding: 4, color: "#4263EB", background: "none", border: "none", cursor: "pointer" }}><Eye size={14} /></button>
                    <button onClick={() => openEdit(p)} style={{ padding: 4, color: "#6C757D", background: "none", border: "none", cursor: "pointer" }}><Edit3 size={14} /></button>
                    <button onClick={() => setDeleteId(p.id)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} بەرهەم</span></div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? "دەستکاری بەرهەم" : "بەرهەمی نوێ"} width={640}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی بەرهەم" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="SKU" required><input style={inputStyle} required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></FormField>
            <FormField label="جۆر"><select style={selectStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="نرخ (د.ع)" required><input style={inputStyle} type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></FormField>
            <FormField label="بڕی کۆگا" required><input style={inputStyle} type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></FormField>
            <FormField label="یەکەی پێوانە"><select style={selectStyle} value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>{unitTypes.map((u) => <option key={u} value={u}>{u}</option>)}</select></FormField>
            <FormField label="ولاتی بەرهەمهێنان"><select style={selectStyle} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>{origins.map((o) => <option key={o} value={o}>{o}</option>)}</select></FormField>
            <FormField label="دابینکەر"><input style={inputStyle} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="ناوی دابینکەر" /></FormField>
            <FormField label="بەرواری بەسەرچوون" required><input style={inputStyle} type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></FormField>
            <FormField label="ژمارەی بەچ"><input style={inputStyle} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></FormField>
          </FormGrid>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isSample} onChange={(e) => setForm({ ...form, isSample: e.target.checked })} style={{ width: 16, height: 16 }} />
              نموونە (بۆ بەخشین)
            </label>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} isEdit={!!editingProduct} />
        </form>
      </Modal>

      {/* Detail Drawer */}
      {detailProduct && (
        <div onClick={() => setDetailProduct(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400, animation: "fadeIn 0.15s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 420, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", animation: "slideInRight 0.2s ease", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>وردەکاری بەرهەم</h3>
              <button onClick={() => setDetailProduct(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{detailProduct.name}</h2>
              <span style={{ fontSize: 12, color: "#6C757D", fontFamily: "monospace" }}>{detailProduct.sku}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
                {[
                  { l: "جۆر", v: detailProduct.category },
                  { l: "نرخ", v: formatIQD(detailProduct.price) },
                  { l: "کۆگا", v: `${detailProduct.stock} ${detailProduct.unitType}` },
                  { l: "ولات", v: detailProduct.origin },
                  { l: "دابینکەر", v: detailProduct.supplier },
                  { l: "بەسەرچوون", v: detailProduct.expiryDate },
                  { l: "ژمارەی بەچ", v: detailProduct.batchNumber },
                  { l: "نموونە", v: detailProduct.isSample ? "بەڵێ" : "نەخێر" },
                ].map((item, i) => (
                  <div key={i}><div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>{item.l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{item.v || "—"}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteProduct(deleteId); setDeleteId(null); }} message="ئایا دڵنیایت لە سڕینەوەی ئەم بەرهەمە؟" />
    </>
  );
}
