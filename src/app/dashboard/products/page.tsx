"use client";
import { useState, FormEvent } from "react";
import {
  Search, Plus, Package, Edit3, Trash2, Eye, X,
  Grid3X3, List, AlertTriangle, ImageIcon, MoreVertical, ChevronDown, ChevronUp,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Product } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";
import type { ExportColumn } from "@/lib/export";
import { SkeletonKPI, SkeletonTableRows } from "@/components/ui/Skeleton";
import AddProductWizard, { type WizardFormData } from "@/components/ui/AddProductWizard";

const productExportCols: ExportColumn[] = [
  { key: "name", label: "ناوی بەرهەم" },
  { key: "sku", label: "SKU" },
  { key: "company", label: "کۆمپانیا" },
  { key: "category", label: "جۆر" },
  { key: "price", label: "نرخ", format: (v) => String(v) },
  { key: "stock", label: "کۆگا" },
  { key: "origin", label: "سەرچاوە" },
  { key: "issueDate", label: "بەرواری بەرهەمهێنان" },
  { key: "expiryDate", label: "بەسەرچوون" },
];

const unitTypes = ["پاکەت", "بوتل", "ئەمپوول", "تیوب", "قوتی"];
const origins = ["تورکیا 🇹🇷", "فەرەنسا 🇫🇷", "ئوردن 🇯🇴", "هندستان 🇮🇳", "سوویسرا 🇨🇭", "عێراق 🇮🇶", "ئەمریکا 🇺🇸"];

function isNearExpiry(date: string): boolean {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
}
function isExpired(date: string): boolean {
  return !!date && new Date(date).getTime() < Date.now();
}

const stockLabel = (s: number) => s > 500 ? "بەردەست" : s > 100 ? "کەم" : "کەمە";
const stockColor = (s: number) => s > 500 ? "#40C057" : s > 100 ? "#FD7E14" : "#FA5252";

// ── Figma-style Grid Card ──
function ProductGridCard({ p, onEdit, onDelete, onView }: { p: Product; onEdit: () => void; onDelete: () => void; onView: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mainPrice = p.prices?.[0];

  return (
    <div style={{
      background: "white", borderRadius: 16, border: "1px solid #E9ECEF",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden",
      transition: "box-shadow 0.2s, transform 0.15s",
      cursor: "default",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* Slider dots + 3-dot menu */}
      <div style={{ padding: "12px 12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 16, height: 4, borderRadius: 2, background: "#4263EB" }} />
          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#DEE2E6" }} />
          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#DEE2E6" }} />
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#F8F9FA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}>
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div onClick={() => setMenuOpen(false)}
              style={{ position: "absolute", left: 0, top: 28, background: "white", border: "1px solid #E9ECEF", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 120, overflow: "hidden" }}>
              {[
                { icon: <Eye size={12} />, label: "وردەکاری", action: onView },
                { icon: <Edit3 size={12} />, label: "دەستکاری", action: onEdit },
                { icon: <Trash2 size={12} />, label: "سڕینەوە", action: onDelete, danger: true },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: "100%", padding: "8px 12px", border: "none", background: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: item.danger ? "#FA5252" : "#1A1A2E", display: "flex", alignItems: "center", gap: 7, textAlign: "right" }}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Image */}
      <div style={{ margin: "8px 16px", height: 138, borderRadius: 10, background: "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center", color: "#CED4DA" }}>
            <ImageIcon size={28} style={{ marginBottom: 4 }} />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", lineHeight: 1.3, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
              {p.name}
            </div>
            <div style={{ fontSize: 11, color: "#ADB5BD" }}>
              {p.company || p.category}
            </div>
          </div>
          <div style={{ color: "#ADB5BD", marginTop: 2, flexShrink: 0 }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>

        {/* Expanded Detail (Figma: price + stock + action) */}
        {expanded && (
          <div style={{ marginTop: 12, animation: "fadeIn 0.12s ease" }}>
            <div style={{ height: 1, background: "#F1F3F5", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#ADB5BD", marginBottom: 2 }}>
                  {mainPrice ? mainPrice.typeName : "نرخ"}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A2E" }}>
                  {mainPrice ? formatIQD(mainPrice.amount) : (p.price ? formatIQD(p.price) : "—")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#ADB5BD", marginBottom: 2 }}>کۆگا</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: stockColor(p.stock) }}>{p.stock.toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: "#ADB5BD" }}>{p.unitType}</span>
                </div>
              </div>
            </div>

            {/* Additional prices */}
            {p.prices && p.prices.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {p.prices.slice(1).map(pr => (
                  <div key={pr.typeId} style={{ padding: "3px 8px", background: "#EDF2FF", borderRadius: 5, fontSize: 10, color: "#4263EB" }}>
                    {pr.typeName}: {formatIQD(pr.amount)}
                  </div>
                ))}
              </div>
            )}

            {/* Expiry badge */}
            {p.expiryDate && (
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                  background: isExpired(p.expiryDate) ? "#FFF5F5" : isNearExpiry(p.expiryDate) ? "#FFF4E6" : "#F0FFF4",
                  color: isExpired(p.expiryDate) ? "#FA5252" : isNearExpiry(p.expiryDate) ? "#FD7E14" : "#40C057",
                }}>
                  {isExpired(p.expiryDate) ? "⚠ بەسەرچووە" : `بەسەرچوون: ${p.expiryDate}`}
                </span>
              </div>
            )}

            <button onClick={onEdit}
              style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "1.5px solid #E9ECEF", background: "white", color: "#1A1A2E", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4 }}>
              <Edit3 size={12} /> دەستکاری بەرهەم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("هەموو");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dynamic categories from actual products
  const allCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Edit form state
  const [form, setForm] = useState({
    name: "", sku: "", company: "", category: "", price: "", stock: "",
    unitType: unitTypes[0], origin: origins[0], supplier: "",
    issueDate: "", expiryDate: "", batchNumber: "", isSample: false, isActive: true,
  });

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, sku: p.sku, company: p.company || "", category: p.category,
      price: String(p.price), stock: String(p.stock), unitType: p.unitType,
      origin: p.origin, supplier: p.supplier, issueDate: p.issueDate || "",
      expiryDate: p.expiryDate, batchNumber: p.batchNumber,
      isSample: p.isSample, isActive: p.isActive,
    });
    setEditModalOpen(true);
  };

  const handleWizardSubmit = (data: WizardFormData) => {
    const firstPrice = data.prices.find(p => p.amount);
    addProduct({
      name: data.name, sku: data.sku, category: data.category, company: data.company,
      price: firstPrice ? Number(firstPrice.amount) : 0,
      prices: data.prices.filter(p => p.amount).map(p => ({ typeId: p.typeId, typeName: p.typeName, amount: Number(p.amount) })),
      stock: Number(data.stock), unitType: data.unitType,
      origin: data.origin, supplier: data.supplier,
      issueDate: data.issueDate, expiryDate: data.expiryDate,
      batchNumber: data.batchNumber, isSample: data.isSample,
      isActive: true, imageUrl: data.imageUrl,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: form.name, sku: form.sku, company: form.company, category: form.category,
        price: Number(form.price), stock: Number(form.stock), unitType: form.unitType,
        origin: form.origin, supplier: form.supplier,
        issueDate: form.issueDate, expiryDate: form.expiryDate,
        batchNumber: form.batchNumber, isSample: form.isSample, isActive: form.isActive,
      });
    }
    setEditModalOpen(false);
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || (p.company || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "هەموو" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

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
          <button onClick={() => setModalOpen(true)} className="topbar-add-btn"><Plus size={16} /><span>بەرهەمی نوێ</span></button>
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
            <input type="text" placeholder="گەڕان بە ناو، کۆمپانیا..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 260, padding: "8px 34px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 3, background: "#F1F3F5", borderRadius: 8, padding: 2, flexWrap: "wrap" }}>
            {["هەموو", ...allCategories.slice(0, 5)].map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: categoryFilter === c ? "white" : "transparent", color: categoryFilter === c ? "#1A1A2E" : "#6C757D", boxShadow: categoryFilter === c ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          <button onClick={() => setViewMode("list")} style={{ padding: 6, borderRadius: 6, background: viewMode === "list" ? "white" : "transparent", border: "none", cursor: "pointer", color: viewMode === "list" ? "#1A1A2E" : "#ADB5BD" }}><List size={16} /></button>
          <button onClick={() => setViewMode("grid")} style={{ padding: 6, borderRadius: 6, background: viewMode === "grid" ? "white" : "transparent", border: "none", cursor: "pointer", color: viewMode === "grid" ? "#1A1A2E" : "#ADB5BD" }}><Grid3X3 size={16} /></button>
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: "#F8F9FA", borderRadius: 16, height: 240, animation: "pulse 1.5s ease infinite" }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#ADB5BD" }}>
              <Package size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>هیچ بەرهەمێک نەدۆزرایەوە</div>
            </div>
          ) : filtered.map((p) => (
            <ProductGridCard key={p.id} p={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteId(p.id)}
              onView={() => setDetailProduct(p)}
            />
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>بەرهەم</th>
                <th>کۆمپانیا</th>
                <th>SKU</th>
                <th>جۆر</th>
                <th>نرخ</th>
                <th>کۆگا</th>
                <th>بارودۆخ</th>
                <th>ولات</th>
                <th>بەسەرچوون</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={6} cols={10} />
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: "#6C757D" }}>{p.company || "—"}</td>
                  <td style={{ fontSize: 11, color: "#6C757D", fontFamily: "monospace" }}>{p.sku}</td>
                  <td><span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: "#EDF2FF", color: "#4263EB" }}>{p.category}</span></td>
                  <td>
                    {p.prices && p.prices.length > 0 ? (
                      <div>
                        {p.prices.map(pr => (
                          <div key={pr.typeId} style={{ fontSize: 11 }}>
                            <span style={{ color: "#ADB5BD", fontSize: 10 }}>{pr.typeName}: </span>
                            <span style={{ fontWeight: 700 }}>{formatIQD(pr.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.price ? formatIQD(p.price) : "—"}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: stockColor(p.stock) }}>{p.stock.toLocaleString()}</span>{" "}
                    <span style={{ fontSize: 10, color: "#ADB5BD" }}>{p.unitType}</span>
                  </td>
                  <td><span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: stockColor(p.stock) + "15", color: stockColor(p.stock) }}>{stockLabel(p.stock)}</span></td>
                  <td style={{ fontSize: 12 }}>{p.origin}</td>
                  <td>
                    {isExpired(p.expiryDate) ? (
                      <span style={{ color: "#FA5252", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> بەسەرچووە</span>
                    ) : isNearExpiry(p.expiryDate) ? (
                      <span style={{ color: "#FD7E14", fontSize: 12, fontWeight: 600 }}>{p.expiryDate}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#6C757D" }}>{p.expiryDate || "—"}</span>
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
      )}

      {/* ── Wizard: Add product ── */}
      <AddProductWizard open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleWizardSubmit} />

      {/* ── Edit Modal ── */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="دەستکاری بەرهەم" width={680}>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="ناوی بەرهەم" required><input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="کۆمپانیا / بەرهەمهێنەر"><input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Pfizer, Novartis..." /></FormField>
            <FormField label="SKU"><input style={inputStyle} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></FormField>
            <FormField label="جۆر"><input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="edit-categories" /><datalist id="edit-categories">{allCategories.map(c => <option key={c} value={c} />)}</datalist></FormField>
            <FormField label="نرخی سەرەکی (د.ع)"><input style={inputStyle} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></FormField>
            <FormField label="بڕی کۆگا" required><input style={inputStyle} type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></FormField>
            <FormField label="یەکەی پێوانە"><select style={selectStyle} value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>{unitTypes.map((u) => <option key={u} value={u}>{u}</option>)}</select></FormField>
            <FormField label="ولاتی بەرهەمهێنان"><select style={selectStyle} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>{origins.map((o) => <option key={o} value={o}>{o}</option>)}</select></FormField>
            <FormField label="دابینکەر"><input style={inputStyle} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="ناوی دابینکەر" /></FormField>
            <FormField label="ژمارەی بەچ"><input style={inputStyle} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></FormField>
            <FormField label="بەرواری بەرهەمهێنان"><input style={inputStyle} type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></FormField>
            <FormField label="بەرواری بەسەرچوون" required><input style={inputStyle} type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></FormField>
          </FormGrid>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isSample} onChange={(e) => setForm({ ...form, isSample: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#4263EB" }} />
              نموونە (بۆ بەخشین)
            </label>
          </div>
          <FormActions onCancel={() => setEditModalOpen(false)} isEdit={true} />
        </form>
      </Modal>

      {/* ── Detail Drawer ── */}
      {detailProduct && (
        <div onClick={() => setDetailProduct(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 400, animation: "fadeIn 0.15s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 440, background: "white", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", animation: "slideInRight 0.2s ease", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E9ECEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>وردەکاری بەرهەم</h3>
              <button onClick={() => setDetailProduct(null)} style={{ background: "#F1F3F5", borderRadius: 8, padding: 6, border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            {detailProduct.imageUrl && (
              <img src={detailProduct.imageUrl} alt={detailProduct.name} style={{ width: "100%", height: 200, objectFit: "cover" }} />
            )}
            <div style={{ padding: 24 }}>
              {detailProduct.company && <div style={{ fontSize: 11, color: "#4263EB", fontWeight: 700, marginBottom: 4 }}>{detailProduct.company}</div>}
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{detailProduct.name}</h2>
              <span style={{ fontSize: 12, color: "#6C757D", fontFamily: "monospace" }}>{detailProduct.sku}</span>

              {/* Price types */}
              {detailProduct.prices && detailProduct.prices.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: "#ADB5BD", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>نرخەکان</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {detailProduct.prices.map(pr => (
                      <div key={pr.typeId} style={{ padding: "8px 12px", background: "#EDF2FF", borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: "#6C757D" }}>{pr.typeName}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#4263EB" }}>{formatIQD(pr.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20 }}>
                {[
                  { l: "جۆر", v: detailProduct.category },
                  { l: "کۆگا", v: `${detailProduct.stock} ${detailProduct.unitType}` },
                  { l: "بارودۆخ", v: stockLabel(detailProduct.stock) },
                  { l: "ولات", v: detailProduct.origin },
                  { l: "دابینکەر", v: detailProduct.supplier },
                  { l: "بەرواری بەرهەمهێنان", v: detailProduct.issueDate || "—" },
                  { l: "بەرواری بەسەرچوون", v: detailProduct.expiryDate || "—" },
                  { l: "ژمارەی بەچ", v: detailProduct.batchNumber || "—" },
                  { l: "نموونە", v: detailProduct.isSample ? "بەڵێ" : "نەخێر" },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: "#ADB5BD", marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{item.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.v || "—"}</div>
                  </div>
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
