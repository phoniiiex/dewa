"use client";
import { useState, useRef, ReactNode, useEffect } from "react";
import {
  X, Package, Tag, ImageIcon, BarChart2, FileText,
  Check, ChevronRight, ChevronLeft, Plus, Upload, Search, Trash2, Edit3,
} from "lucide-react";
import { formatIQD } from "@/lib/currency";
import { useData } from "@/lib/store";
import type { Product } from "@/lib/types";

const unitTypes = ["پاکەت", "بوتل", "ئەمپوول", "تیوب", "قوتی"];
const origins = ["تورکیا 🇹🇷", "فەرەنسا 🇫🇷", "ئوردن 🇯🇴", "هندستان 🇮🇳", "سوویسرا 🇨🇭", "عێراق 🇮🇶", "ئەمریکا 🇺🇸"];

export interface ProductPriceEntry { typeId: string; typeName: string; amount: string; }

export interface WizardFormData {
  name: string; sku: string; category: string; company: string; description: string;
  prices: ProductPriceEntry[]; imageUrl: string;
  stock: string; lowStock: string; unitType: string;
  origin: string; supplier: string; issueDate: string; expiryDate: string;
  batchNumber: string; isSample: boolean;
}

interface Step { id: number; label: string; sublabel: string; icon: ReactNode; }
const STEPS: Step[] = [
  { id: 1, label: "زانیاری گشتی",  sublabel: "ناو، کۆمپانیا، جۆر",      icon: <Package size={14} /> },
  { id: 2, label: "نرخەکان",        sublabel: "جۆرەکانی نرخ",             icon: <Tag size={14} /> },
  { id: 3, label: "وێنەی بەرهەم",  sublabel: "بارکردنی وێنە",             icon: <ImageIcon size={14} /> },
  { id: 4, label: "کۆگا",           sublabel: "بڕ و یەکەی پێوانە",         icon: <BarChart2 size={14} /> },
  { id: 5, label: "زانیاری زیادە", sublabel: "بەرواری بەسەرچوون، بەچ",   icon: <FileText size={14} /> },
];

const EMPTY: WizardFormData = {
  name: "", sku: "", category: "", company: "", description: "",
  prices: [], imageUrl: "",
  stock: "", lowStock: "10", unitType: unitTypes[0],
  origin: origins[0], supplier: "", issueDate: "", expiryDate: "",
  batchNumber: "", isSample: false,
};

function StockBar({ filled, total = 32 }: { filled: number; total?: number }) {
  return (
    <div style={{ display: "flex", gap: 2.5, flexWrap: "nowrap", overflow: "hidden" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 5.5, height: 20, borderRadius: 2,
          background: i < filled ? "#4263EB" : "#E9ECEF",
          flexShrink: 0, transition: "background 0.15s",
        }} />
      ))}
    </div>
  );
}

// ── Category combobox with search + add new ──
function CategoryCombobox({ value, onChange, allCategories }: { value: string; onChange: (v: string) => void; allCategories: string[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = allCategories.filter(c => c.toLowerCase().includes(search.toLowerCase()) || c.includes(search));
  const canAdd = search.trim() && !allCategories.some(c => c === search.trim());

  const iS: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #E9ECEF",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "white", boxSizing: "border-box",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => { setOpen(!open); setSearch(""); }}
        style={{ ...iS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderColor: open ? "#4263EB" : "#E9ECEF" }}>
        <span style={{ color: value ? "#1A1A2E" : "#ADB5BD" }}>{value || "جۆر هەڵبژێرە..."}</span>
        <ChevronRight size={14} color="#ADB5BD" style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "0.15s" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1.5px solid #E9ECEF", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 8px 4px", borderBottom: "1px solid #F1F3F5" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="گەڕان..." style={{ width: "100%", padding: "7px 30px 7px 9px", border: "1px solid #E9ECEF", borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); }}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: value === c ? "#EDF2FF" : "white", color: value === c ? "#4263EB" : "#1A1A2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {c} {value === c && <Check size={12} color="#4263EB" />}
              </div>
            ))}
            {canAdd && (
              <div onClick={() => { onChange(search.trim()); setOpen(false); }}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", color: "#4263EB", fontWeight: 600, borderTop: "1px solid #F1F3F5", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={12} /> زیادکردنی "{search.trim()}"
              </div>
            )}
            {filtered.length === 0 && !canAdd && (
              <div style={{ padding: "12px", fontSize: 12, color: "#ADB5BD", textAlign: "center" }}>هیچ نەدۆزرایەوە</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData) => void;
  /** When provided the wizard opens in edit-mode, pre-filled with this product */
  initialProduct?: Product;
}

export default function AddProductWizard({ open, onClose, onSubmit, initialProduct }: Props) {
  const { products, priceTypes, addPriceType } = useData();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>(EMPTY);
  const [dragging, setDragging] = useState(false);
  const [newPriceTypeName, setNewPriceTypeName] = useState("");
  const [addingPriceType, setAddingPriceType] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Separate state: typeId -> amount string.
  // We derive the displayed list from priceTypes (store), never append to a list.
  // This makes duplication impossible because the source of truth for WHICH
  // rows appear is priceTypes, not a local array that could grow out of sync.
  const [priceAmounts, setPriceAmounts] = useState<Record<string, string>>({});
  // Track IDs the user explicitly removed in this session
  const [removedTypeIds, setRemovedTypeIds] = useState<Set<string>>(new Set());

  // Reset per-session price state when the modal opens/closes
  // When editing, seed from the product's existing prices
  useEffect(() => {
    if (!open) {
      setPriceAmounts({});
      setRemovedTypeIds(new Set());
      setForm(EMPTY);
    } else if (initialProduct) {
      // Edit mode: pre-fill form from existing product
      const amounts: Record<string, string> = {};
      (initialProduct.prices || []).forEach(pp => { amounts[pp.typeId] = String(pp.amount); });
      setPriceAmounts(amounts);
      setRemovedTypeIds(new Set());
      setForm({
        name: initialProduct.name,
        sku: initialProduct.sku,
        category: initialProduct.category,
        company: initialProduct.company || "",
        description: "",
        prices: [],
        imageUrl: initialProduct.imageUrl || "",
        stock: String(initialProduct.stock),
        lowStock: String(initialProduct.lowStock ?? 10),
        unitType: initialProduct.unitType,
        origin: initialProduct.origin,
        supplier: initialProduct.supplier,
        issueDate: initialProduct.issueDate || "",
        expiryDate: initialProduct.expiryDate || "",
        batchNumber: initialProduct.batchNumber || "",
        isSample: initialProduct.isSample,
      });
    }
  }, [open, initialProduct]);

  if (!open) return null;

  // The canonical list of price rows = priceTypes minus removed ones
  const activePriceRows = priceTypes.filter(pt => !removedTypeIds.has(pt.id));

  // Build the ProductPriceEntry array for the form (used at submit time)
  const buildPrices = (): ProductPriceEntry[] =>
    activePriceRows.map(pt => ({ typeId: pt.id, typeName: pt.name, amount: priceAmounts[pt.id] || "" }));

  // Collect all existing categories from products
  const allCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const set = (k: keyof WizardFormData, v: string | boolean | ProductPriceEntry[]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleClose = () => { setStep(1); setForm(EMPTY); setNewPriceTypeName(""); onClose(); };
  const handleNext = () => { if (step < 5) setStep(s => s + 1); };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); };
  const handleFinish = () => {
    if (!form.name.trim()) { setStep(1); return; }
    // Inject the built prices into the form before submitting
    onSubmit({ ...form, prices: buildPrices() });
    setStep(1); setForm(EMPTY); setNewPriceTypeName(""); onClose();
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => set("imageUrl", e.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file?.type.startsWith("image/")) handleImageFile(file); };

  const updatePriceAmount = (typeId: string, amount: string) => {
    setPriceAmounts(prev => ({ ...prev, [typeId]: amount }));
  };

  const handleAddNewPriceType = async () => {
    if (!newPriceTypeName.trim()) return;
    // Guard: skip if a priceType with this name already exists
    if (priceTypes.some(pt => pt.name === newPriceTypeName.trim())) {
      setNewPriceTypeName("");
      return;
    }
    setAddingPriceType(true);
    const nt = await addPriceType(newPriceTypeName.trim());
    // Un-remove the new type (in case it was previously removed)
    setRemovedTypeIds(prev => { const s = new Set(prev); s.delete(nt.id); return s; });
    setNewPriceTypeName("");
    setAddingPriceType(false);
  };

  const removePriceRow = (typeId: string) => {
    setRemovedTypeIds(prev => new Set([...prev, typeId]));
  };

  // Preview
  const previewName = form.name || "ناوی بەرهەم";
  const previewCategory = form.category || "جۆر";
  const firstPriceRow = activePriceRows.find(pt => priceAmounts[pt.id]);
  const previewPrice = firstPriceRow
    ? formatIQD(Number(priceAmounts[firstPriceRow.id]))
    : "٠ د.ع";
  const previewSku = form.sku || "SKU-000-00";
  const previewStock = Number(form.stock) || 0;
  const stockFilled = Math.round(Math.min(32, (previewStock / Math.max(previewStock, 500)) * 32));

  const iS: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #E9ECEF",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "white", transition: "border-color 0.15s", boxSizing: "border-box",
  };
  const btnNext: React.CSSProperties = {
    flex: 1, padding: "11px 0", borderRadius: 10, background: "linear-gradient(135deg, #4263EB, #7C5CFC)",
    color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  };
  const btnBack: React.CSSProperties = {
    flex: 1, padding: "11px 0", borderRadius: 10, background: "#F1F3F5",
    color: "#495057", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.5)", backdropFilter: "blur(8px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s ease" }}>
      <div style={{
        background: "white", borderRadius: 20, width: "min(96vw, 1020px)", height: "min(93vh, 700px)",
        display: "grid", gridTemplateColumns: "340px 1fr", overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.2)", animation: "cmdSlideIn 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}>

        {/* LEFT: Preview Panel */}
        <div style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #F8F4FF 50%, #EFF9F0 100%)", padding: "28px 28px", display: "flex", flexDirection: "column", gap: 16, borderLeft: "1px solid #E9ECEF", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(66,99,235,0.08) 0%, transparent 70%)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 2 }}>پێشبینین</div>
            <div style={{ fontSize: 11, color: "#6C757D" }}>ئەمە چۆنێتیی بەرهەمەکەتە لە سیستەمدا</div>
          </div>
          <div style={{ background: "white", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px #E9ECEF", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/><rect x="5" y="2" width="1" height="10" fill="#ADB5BD" rx="0.5"/><rect x="7" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/><rect x="11" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/></svg>
              <span style={{ fontSize: 11, color: "#ADB5BD", fontFamily: "monospace", fontWeight: 600 }}>{previewSku}</span>
            </div>
            <div style={{ margin: "10px 16px", borderRadius: 10, background: "#F8F9FA", border: "1.5px dashed #DEE2E6", height: 150, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
              ) : (
                <div style={{ textAlign: "center", color: "#CED4DA" }}><ImageIcon size={26} style={{ marginBottom: 4 }} /><div style={{ fontSize: 10, fontWeight: 600 }}>وێنەی بەرهەم</div></div>
              )}
            </div>
            <div style={{ padding: "0 16px 10px" }}>
              {form.company && <div style={{ fontSize: 9, color: "#4263EB", fontWeight: 700, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{form.company}</div>}
              <div style={{ fontSize: 10, color: "#ADB5BD", fontWeight: 700, marginBottom: 3 }}>{previewCategory}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 5, lineHeight: 1.3 }}>{previewName}</div>
              <div style={{ fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{previewPrice}</div>
              {activePriceRows.filter(pt => priceAmounts[pt.id]).length > 1 && (
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                  {activePriceRows.filter(pt => priceAmounts[pt.id]).slice(1).map(pt => (
                    <div key={pt.id} style={{ fontSize: 10, color: "#6C757D" }}>{pt.name}: {formatIQD(Number(priceAmounts[pt.id]))}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 1, background: "#E9ECEF", margin: "0 16px" }} />
            <div style={{ padding: "10px 16px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6C757D" }}>بارودۆخی کۆگا</span>
                <span style={{ fontSize: 10, color: "#ADB5BD" }}>{previewStock > 0 ? `${previewStock} ${form.unitType}` : "٠ یەکە"}</span>
              </div>
              <StockBar filled={stockFilled} />
            </div>
          </div>
        </div>

        {/* RIGHT: Steps + Form */}
        <div style={{ display: "grid", gridTemplateColumns: "176px 1fr", height: "100%" }}>

          {/* Step Sidebar */}
          <div style={{ background: "#FAFAFA", borderLeft: "1px solid #F1F3F5", padding: "28px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1A1A2E", marginBottom: 16, paddingRight: 6, display: "flex", alignItems: "center", gap: 5 }}>
              {initialProduct ? <><Edit3 size={13} style={{ color: "#4263EB" }} /> دەستکاری بەرهەم</> : "بەرهەمی نوێ"}
            </div>
            {STEPS.map(s => {
              const done = step > s.id; const active = step === s.id;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 8px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", background: active ? "white" : "transparent", boxShadow: active ? "0 1px 6px rgba(0,0,0,0.08), 0 0 0 1px #E9ECEF" : "none", textAlign: "right", width: "100%", transition: "all 0.15s" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: done ? "#4263EB" : active ? "#EDF2FF" : "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", color: done ? "white" : active ? "#4263EB" : "#ADB5BD", fontSize: 11, fontWeight: 700 }}>
                    {done ? <Check size={12} /> : s.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#1A1A2E" : done ? "#4263EB" : "#6C757D", lineHeight: 1.2 }}>{s.label}</div>
                    <div style={{ fontSize: 9, color: "#ADB5BD", marginTop: 1, lineHeight: 1.2 }}>{s.sublabel}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <div style={{ display: "flex", flexDirection: "column", padding: "24px 24px 20px", overflow: "auto", position: "relative" }}>
            <button onClick={handleClose} style={{ position: "absolute", top: 12, left: 12, width: 30, height: 30, borderRadius: 8, border: "none", background: "#F1F3F5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D" }}>
              <X size={14} />
            </button>

            {/* Step Header */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#EDF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB", marginBottom: 10 }}>
                {STEPS[step - 1].icon}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", marginBottom: 3 }}>{STEPS[step - 1].label}</div>
              <div style={{ fontSize: 11, color: "#6C757D" }}>
                {step === 1 && "زانیاری سەرەکی و کۆمپانیای بەرهەمەکەت بنووسە"}
                {step === 2 && "جۆرەکانی نرخ دیاری بکە بۆ ئەم بەرهەمە"}
                {step === 3 && "وێنەیەکی باش بەرهەمەکەت دەبەستێتەوە"}
                {step === 4 && "بڕی کۆگای بەردەست بنووسە"}
                {step === 5 && "زانیاری زیادەی بەرهەم تەواوبکە"}
              </div>
              <div style={{ height: 1, background: "#E9ECEF", marginTop: 14 }} />
            </div>

            {/* STEP FORMS */}
            <div style={{ flex: 1, overflow: "auto" }}>

              {/* STEP 1: General Info */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>ناوی بەرهەم *</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ناوی بەرهەم..." style={iS}
                      onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>کۆمپانیا / بەرهەمهێنەر</label>
                    <input value={form.company} onChange={e => set("company", e.target.value)} placeholder="بۆ نموونە: Pfizer, Novartis..." style={iS}
                      onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>SKU</label>
                      <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="SKU-000-00" style={{ ...iS, fontFamily: "monospace", fontSize: 12 }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>جۆر / پۆل</label>
                      <CategoryCombobox value={form.category} onChange={v => set("category", v)} allCategories={allCategories} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>تێبینی</label>
                    <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="کورتەیەکی بەرهەم..." rows={2}
                      style={{ ...iS, resize: "vertical" }} onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>
                </div>
              )}

              {/* STEP 2: Price Types */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 11, color: "#6C757D", padding: "8px 12px", background: "#F8F9FA", borderRadius: 8 }}>
                    بۆ هەر جۆرێکی نرخ نرخی تایبەتی بنووسە
                  </div>

                  {activePriceRows.map(pt => (
                    <div key={pt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--color-bg-hover)", borderRadius: 10, border: "1.5px solid var(--color-border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{pt.name}</div>
                        <div style={{ position: "relative" }}>
                          <input type="number" value={priceAmounts[pt.id] || ""} onChange={e => updatePriceAmount(pt.id, e.target.value)}
                            placeholder="٠" style={{ ...iS, paddingLeft: 50, fontSize: 16, fontWeight: 700 }}
                            onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "")} />
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#ADB5BD", fontWeight: 600 }}>د.ع</span>
                        </div>
                      </div>
                      <button onClick={() => removePriceRow(pt.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "#FFE3E3", color: "#C92A2A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add new price type */}
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#F0F4FF", borderRadius: 10, border: "1.5px dashed #C5D8FF" }}>
                    <input value={newPriceTypeName} onChange={e => setNewPriceTypeName(e.target.value)}
                      placeholder="جۆری نرخی نوێ..." style={{ ...iS, background: "white", fontSize: 12 }}
                      onKeyDown={e => { if (e.key === "Enter") handleAddNewPriceType(); }}
                      onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    <button onClick={handleAddNewPriceType} disabled={!newPriceTypeName.trim() || addingPriceType}
                      style={{ padding: "0 14px", borderRadius: 9, border: "none", background: "#4263EB", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: !newPriceTypeName.trim() ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}>
                      <Plus size={12} /> زیادکردن
                    </button>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 12px", background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF" }}>
                    <input type="checkbox" checked={form.isSample} onChange={e => set("isSample", e.target.checked)} style={{ width: 14, height: 14, accentColor: "#4263EB" }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>نموونە (بۆ بەخشین)</div>
                      <div style={{ fontSize: 10, color: "#ADB5BD" }}>ئەم بەرهەمە بۆ بەخشینە، نەك فرۆشتن</div>
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 3: Image */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                  <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${dragging ? "#4263EB" : "#DEE2E6"}`, borderRadius: 14, padding: 28, textAlign: "center", cursor: "pointer", background: dragging ? "#EDF2FF" : "#FAFAFA", transition: "all 0.15s" }}>
                    {form.imageUrl ? (
                      <div><img src={form.imageUrl} alt="preview" style={{ maxHeight: 150, borderRadius: 10, margin: "0 auto", display: "block" }} /><div style={{ marginTop: 8, fontSize: 11, color: "#4263EB", fontWeight: 600 }}>کرتە بکە بۆ گۆڕین</div></div>
                    ) : (
                      <>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EDF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB", margin: "0 auto 10px" }}><Upload size={18} /></div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", marginBottom: 3 }}>فایل هەڵبژێرە یان ڕابکێشە</div>
                        <div style={{ fontSize: 10, color: "#ADB5BD" }}>PNG، JPEG — تا ٥٠ MB</div>
                        <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          style={{ marginTop: 12, padding: "7px 18px", borderRadius: 7, background: "white", border: "1.5px solid #DEE2E6", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#495057", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Plus size={11} /> هەڵبژاردن
                        </button>
                      </>
                    )}
                  </div>
                  {form.imageUrl && <button onClick={() => set("imageUrl", "")} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #FFE3E3", background: "white", color: "#C92A2A", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>سڕینەوەی وێنە</button>}
                  <div style={{ padding: "9px 11px", background: "#FFF8DB", borderRadius: 8, fontSize: 11, color: "#856404", display: "flex", gap: 5 }}>
                    <span>💡</span><span>وێنەی باش بۆ 400×400 px پێشنیاری دەکرێت</span>
                  </div>
                </div>
              )}

              {/* STEP 4: Stock */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Current stock */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>بڕی کۆگا *</label>
                    <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="٠"
                      style={{ ...iS, fontSize: 22, fontWeight: 800 }} onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>

                  {/* Unit type */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>یەکەی پێوانە</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {unitTypes.map(u => (
                        <button key={u} onClick={() => set("unitType", u)} type="button"
                          style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.12s", border: form.unitType === u ? "none" : "1.5px solid #DEE2E6", background: form.unitType === u ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "white", color: form.unitType === u ? "white" : "#6C757D", boxShadow: form.unitType === u ? "0 2px 8px rgba(66,99,235,0.25)" : "none" }}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Low-stock threshold */}
                  <div style={{ padding: "12px 14px", background: "#FFF8DB", borderRadius: 10, border: "1.5px solid #FFE066" }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#856404", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      ⚠️ سنووری کەمی کۆگا (Low Stock Threshold)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="number" min="0" value={form.lowStock} onChange={e => set("lowStock", e.target.value)}
                        placeholder="10"
                        style={{ ...iS, width: 100, fontSize: 18, fontWeight: 700, color: "#856404", borderColor: "#FFD43B" }}
                        onFocus={e => (e.target.style.borderColor = "#F08C00")} onBlur={e => (e.target.style.borderColor = "#FFD43B")} />
                      <div style={{ fontSize: 12, color: "#856404", lineHeight: 1.5 }}>
                        کاتێک بڕی کۆگا بگاتە ژێر ئەم ژمارەیە<br />
                        <strong>ئاگاداری کەمی کۆگا</strong> دەردەکەوێت
                      </div>
                    </div>
                    {form.stock && form.lowStock && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600,
                        color: Number(form.stock) <= Number(form.lowStock) ? "#C92A2A" : "#2F9E44"
                      }}>
                        {Number(form.stock) <= Number(form.lowStock)
                          ? `⚠ بڕی کۆگا (${form.stock}) لە سنووری کەم (${form.lowStock}) کەمتەرە یان یەکسانە`
                          : `✓ بڕی کۆگا (${form.stock}) لەسەر سنووری کەم (${form.lowStock}) دەیە`
                        }
                      </div>
                    )}
                  </div>

                  {/* Stock bar preview */}
                  {form.stock && (
                    <div style={{ padding: 12, background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#6C757D" }}>بارودۆخی کۆگا</span>
                        <span style={{ fontSize: 10, color: "#ADB5BD" }}>{form.stock} {form.unitType}</span>
                      </div>
                      <StockBar filled={stockFilled} />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Extra Info */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>ولاتی بەرهەم</label>
                      <select value={form.origin} onChange={e => set("origin", e.target.value)} style={{ ...iS, cursor: "pointer" }}>
                        {origins.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>دابینکەر</label>
                      <input value={form.supplier} onChange={e => set("supplier", e.target.value)} placeholder="ناوی دابینکەر..." style={iS}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>بەرواری بەرهەمهێنان</label>
                      <input type="date" value={form.issueDate} onChange={e => set("issueDate", e.target.value)} style={iS}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>بەرواری بەسەرچوون *</label>
                      <input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} style={iS}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>ژمارەی بەچ</label>
                      <input value={form.batchNumber} onChange={e => set("batchNumber", e.target.value)} placeholder="BATCH-000" style={{ ...iS, fontFamily: "monospace", fontSize: 12 }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")} onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                  </div>
                  {/* Summary */}
                  <div style={{ padding: 12, background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF", marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6C757D", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>پوختەی بەرهەم</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { l: "ناو", v: form.name }, { l: "کۆمپانیا", v: form.company },
                        { l: "جۆر", v: form.category }, { l: "کۆگا", v: form.stock ? `${form.stock} ${form.unitType}` : "—" },
                      ].map(item => (
                        <div key={item.l}>
                          <div style={{ fontSize: 9, color: "#ADB5BD", fontWeight: 700 }}>{item.l}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: item.v ? "#1A1A2E" : "#CED4DA" }}>{item.v || "—"}</div>
                        </div>
                      ))}
                      {form.prices.filter(p => p.amount).map(p => (
                        <div key={p.typeId}>
                          <div style={{ fontSize: 9, color: "#ADB5BD", fontWeight: 700 }}>{p.typeName}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#4263EB" }}>{formatIQD(Number(p.amount))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {step > 1 && <button onClick={handleBack} style={btnBack}><span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><ChevronRight size={13} /> گەڕانەوە</span></button>}
                {step < 5 ? (
                  <button onClick={handleNext} style={{ ...btnNext, opacity: step === 1 && !form.name ? 0.5 : 1 }} disabled={step === 1 && !form.name}>
                    <span>پێشتر</span> <ChevronLeft size={13} />
                  </button>
                ) : (
                  <button onClick={handleFinish} style={{ ...btnNext, background: initialProduct ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "linear-gradient(135deg, #2B8A3E, #40C057)" }}
                    disabled={!form.name || !form.stock}>
                    {initialProduct ? <><Edit3 size={13} /> <span>پاشەکەوتکردنی گۆڕانکاری</span></> : <><Check size={13} /> <span>زیادکردنی بەرهەم</span></>}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 4 }}>
                {STEPS.map(s => (
                  <div key={s.id} style={{ width: step === s.id ? 18 : 5, height: 5, borderRadius: 3, background: s.id <= step ? "#4263EB" : "#E9ECEF", transition: "all 0.2s" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
