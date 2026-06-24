"use client";
import { useState, useRef, ReactNode } from "react";
import {
  X, Package, Tag, ImageIcon, BarChart2, FileText,
  Check, ChevronRight, ChevronLeft, Plus, Upload,
} from "lucide-react";
import { formatIQD } from "@/lib/currency";

const categories = ["ئەنتیبایۆتیک", "ئازارکوژ", "گەدە و هەرس", "شەکرە", "ڤیتامین", "پێستی", "هتد"];
const unitTypes = ["پاکەت", "بوتل", "ئەمپوول", "تیوب", "قوتی"];
const origins = ["تورکیا 🇹🇷", "فەرەنسا 🇫🇷", "ئوردن 🇯🇴", "هندستان 🇮🇳", "سوویسرا 🇨🇭", "عێراق 🇮🇶", "ئەمریکا 🇺🇸"];

export interface WizardFormData {
  name: string; sku: string; category: string; description: string;
  price: string; imageUrl: string; stock: string; unitType: string;
  origin: string; supplier: string; expiryDate: string; batchNumber: string;
  isSample: boolean;
}

interface Step {
  id: number;
  label: string;
  sublabel: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  { id: 1, label: "زانیاری گشتی",    sublabel: "ناو، جۆر و تێبینی",        icon: <Package size={14} /> },
  { id: 2, label: "نرخ",              sublabel: "نرخی فرۆشتن",              icon: <Tag size={14} /> },
  { id: 3, label: "وێنەی بەرهەم",    sublabel: "بارکردنی وێنە",             icon: <ImageIcon size={14} /> },
  { id: 4, label: "کۆگا",             sublabel: "بڕ و یەکەی پێوانە",         icon: <BarChart2 size={14} /> },
  { id: 5, label: "زانیاری زیادە",   sublabel: "بەرواری بەسەرچوون، بەچ",   icon: <FileText size={14} /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData) => void;
}

const EMPTY: WizardFormData = {
  name: "", sku: "", category: categories[0], description: "",
  price: "", imageUrl: "", stock: "", unitType: unitTypes[0],
  origin: origins[0], supplier: "", expiryDate: "", batchNumber: "", isSample: false,
};

// Segmented stock bar (32 segments like Figma)
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

export default function AddProductWizard({ open, onClose, onSubmit }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>(EMPTY);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const set = (k: keyof WizardFormData, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleClose = () => { setStep(1); setForm(EMPTY); onClose(); };
  const handleNext = () => { if (step < 5) setStep(s => s + 1); };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); };
  const handleFinish = () => {
    onSubmit(form);
    setStep(1);
    setForm(EMPTY);
    onClose();
  };

  // Image handling
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => set("imageUrl", e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
  };

  // Live preview values
  const previewName = form.name || "ناوی بەرهەم";
  const previewCategory = form.category || "جۆر";
  const previewPrice = form.price ? formatIQD(Number(form.price)) : "٠ د.ع";
  const previewSku = form.sku || "SKU-000-00";
  const previewStock = Number(form.stock) || 0;
  const previewUnit = form.unitType;
  const stockFilled = Math.round(Math.min(32, (previewStock / Math.max(previewStock, 500)) * 32));

  // ── Input style ──
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
    color: "#495057", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.5)",
      backdropFilter: "blur(8px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <div style={{
        background: "white", borderRadius: 20, width: "min(95vw, 980px)", height: "min(92vh, 680px)",
        display: "grid", gridTemplateColumns: "360px 1fr", overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.15)",
        animation: "cmdSlideIn 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}>

        {/* ── LEFT: Preview Panel ── */}
        <div style={{
          background: "linear-gradient(160deg, #F0F4FF 0%, #F8F4FF 50%, #EFF9F0 100%)",
          padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16,
          borderLeft: "1px solid #E9ECEF",
          position: "relative", overflow: "hidden",
        }}>
          {/* Background decoration */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(66,99,235,0.08) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,252,0.07) 0%, transparent 70%)" }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 2 }}>پێشبینین</div>
            <div style={{ fontSize: 11, color: "#6C757D" }}>ئەمە چۆنێتیی بەرهەمەکەتە لە سیستەمدا</div>
          </div>

          {/* Product Card */}
          <div style={{
            background: "white", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px #E9ECEF",
            overflow: "hidden", flex: 1, display: "flex", flexDirection: "column",
          }}>
            {/* SKU row */}
            <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/>
                <rect x="5" y="2" width="1" height="10" fill="#ADB5BD" rx="0.5"/>
                <rect x="7" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/>
                <rect x="11" y="2" width="2" height="10" fill="#ADB5BD" rx="1"/>
              </svg>
              <span style={{ fontSize: 11, color: "#ADB5BD", fontFamily: "monospace", fontWeight: 600 }}>
                {previewSku}
              </span>
            </div>

            {/* Image area */}
            <div style={{
              margin: "10px 16px", borderRadius: 10, background: "#F8F9FA",
              border: "1.5px dashed #DEE2E6", height: 160, display: "flex",
              alignItems: "center", justifyContent: "center", overflow: "hidden",
              flexShrink: 0,
            }}>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
              ) : (
                <div style={{ textAlign: "center", color: "#CED4DA" }}>
                  <ImageIcon size={28} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 10, fontWeight: 600 }}>وێنەی بەرهەم</div>
                  <div style={{ fontSize: 9 }}>400×400px</div>
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: "0 16px 12px" }}>
              <div style={{ fontSize: 10, color: "#ADB5BD", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {previewCategory}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 6, lineHeight: 1.3 }}>
                {previewName}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {previewPrice}
              </div>
            </div>

            <div style={{ height: 1, background: "#E9ECEF", margin: "0 16px" }} />

            {/* Stock status */}
            <div style={{ padding: "10px 16px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6C757D" }}>بارودۆخی کۆگا</span>
                <span style={{ fontSize: 10, color: "#ADB5BD" }}>
                  {previewStock > 0 ? `${previewStock} ${previewUnit}` : "٠ یەکە"}
                </span>
              </div>
              <StockBar filled={stockFilled} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Steps + Form ── */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", height: "100%" }}>

          {/* Step Sidebar */}
          <div style={{ background: "#FAFAFA", borderLeft: "1px solid #F1F3F5", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1A1A2E", marginBottom: 16, paddingRight: 8 }}>
              بەرهەمی نوێ
            </div>
            {STEPS.map((s) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 10px",
                    borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: active ? "white" : "transparent",
                    boxShadow: active ? "0 1px 6px rgba(0,0,0,0.08), 0 0 0 1px #E9ECEF" : "none",
                    textAlign: "right", width: "100%", transition: "all 0.15s",
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: done ? "#4263EB" : active ? "#EDF2FF" : "#F1F3F5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: done ? "white" : active ? "#4263EB" : "#ADB5BD",
                    fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                  }}>
                    {done ? <Check size={13} /> : s.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#1A1A2E" : done ? "#4263EB" : "#6C757D", lineHeight: 1.2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 9, color: "#ADB5BD", marginTop: 1, lineHeight: 1.2 }}>
                      {s.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <div style={{ display: "flex", flexDirection: "column", padding: "28px 28px 24px", overflow: "auto" }}>

            {/* Close button */}
            <button onClick={handleClose} style={{
              position: "absolute", top: 16, left: 16, width: 32, height: 32,
              borderRadius: 8, border: "none", background: "#F1F3F5", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#6C757D",
            }}>
              <X size={15} />
            </button>

            {/* Step Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#EDF2FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#4263EB", marginBottom: 12,
              }}>
                {STEPS[step - 1].icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", marginBottom: 4 }}>
                {STEPS[step - 1].label}
              </div>
              <div style={{ fontSize: 12, color: "#6C757D" }}>
                {step === 1 && "زانیاری سەرەکی بەرهەمەکەت بنووسە"}
                {step === 2 && "نرخی فرۆشتنی بەرهەم دیاری بکە"}
                {step === 3 && "وێنەیەکی باش بەرهەمەکەت دەبەستێتەوە"}
                {step === 4 && "بڕی کۆگای بەردەست بنووسە"}
                {step === 5 && "زانیاری زیادەی بەرهەم تەواوبکە"}
              </div>
              <div style={{ height: 1, background: "#E9ECEF", marginTop: 16 }} />
            </div>

            {/* Step Forms */}
            <div style={{ flex: 1 }}>
              {/* STEP 1: General Info */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      ناوی بەرهەم *
                    </label>
                    <input value={form.name} onChange={e => set("name", e.target.value)}
                      placeholder="ناوی بەرهەم..." style={iS}
                      onFocus={e => (e.target.style.borderColor = "#4263EB")}
                      onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>SKU</label>
                      <input value={form.sku} onChange={e => set("sku", e.target.value)}
                        placeholder="SKU-000-00" style={{ ...iS, fontFamily: "monospace", fontSize: 12 }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>جۆر</label>
                      <select value={form.category} onChange={e => set("category", e.target.value)}
                        style={{ ...iS, cursor: "pointer" }}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>تێبینی</label>
                    <textarea value={form.description} onChange={e => set("description", e.target.value)}
                      placeholder="کورتەیەکی بەرهەم..." rows={3}
                      style={{ ...iS, resize: "vertical" }}
                      onFocus={e => (e.target.style.borderColor = "#4263EB")}
                      onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                  </div>
                </div>
              )}

              {/* STEP 2: Pricing */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      نرخ (د.ع) *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input type="number" value={form.price} onChange={e => set("price", e.target.value)}
                        placeholder="٠" style={{ ...iS, fontSize: 28, fontWeight: 800, paddingRight: 70, color: "#4263EB" }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "#ADB5BD" }}>
                        د.ع
                      </span>
                    </div>
                    {form.price && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#6C757D", display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#40C057" }} />
                        نرخ: {formatIQD(Number(form.price))}
                      </div>
                    )}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "12px 14px", background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF" }}>
                    <input type="checkbox" checked={form.isSample} onChange={e => set("isSample", e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "#4263EB" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>نموونە (بۆ بەخشین)</div>
                      <div style={{ fontSize: 11, color: "#ADB5BD" }}>ئەم بەرهەمە بۆ بەخشینە، نەك فرۆشتن</div>
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 3: Image */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragging ? "#4263EB" : "#DEE2E6"}`,
                      borderRadius: 14, padding: 32, textAlign: "center", cursor: "pointer",
                      background: dragging ? "#EDF2FF" : "#FAFAFA",
                      transition: "all 0.15s",
                    }}>
                    {form.imageUrl ? (
                      <div>
                        <img src={form.imageUrl} alt="preview" style={{ maxHeight: 160, borderRadius: 10, margin: "0 auto", display: "block" }} />
                        <div style={{ marginTop: 10, fontSize: 12, color: "#4263EB", fontWeight: 600 }}>کرتە بکە بۆ گۆڕین</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EDF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB", margin: "0 auto 12px" }}>
                          <Upload size={20} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>
                          فایل هەڵبژێرە یان ڕابکێشە
                        </div>
                        <div style={{ fontSize: 11, color: "#ADB5BD" }}>PNG، JPEG — تا ٥٠ MB</div>
                        <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          style={{ marginTop: 14, padding: "8px 20px", borderRadius: 8, background: "white", border: "1.5px solid #DEE2E6", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#495057", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Plus size={12} /> هەڵبژاردنی فایل
                        </button>
                      </>
                    )}
                  </div>
                  {form.imageUrl && (
                    <button onClick={() => set("imageUrl", "")}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #FFE3E3", background: "white", color: "#C92A2A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      سڕینەوەی وێنە
                    </button>
                  )}
                  <div style={{ padding: "10px 12px", background: "#FFF8DB", borderRadius: 8, fontSize: 11, color: "#856404", display: "flex", gap: 6 }}>
                    <span>💡</span>
                    <span>وێنەی باش بۆ 400×400 px پێشنیاری دەکرێت بۆ باشترین ئەنجام</span>
                  </div>
                </div>
              )}

              {/* STEP 4: Stock */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      بڕی کۆگا *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)}
                        placeholder="٠" style={{ ...iS, fontSize: 24, fontWeight: 800 }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      یەکەی پێوانە
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {unitTypes.map(u => (
                        <button key={u} onClick={() => set("unitType", u)} type="button"
                          style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            fontFamily: "inherit", cursor: "pointer", transition: "all 0.12s",
                            border: form.unitType === u ? "none" : "1.5px solid #DEE2E6",
                            background: form.unitType === u ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "white",
                            color: form.unitType === u ? "white" : "#6C757D",
                            boxShadow: form.unitType === u ? "0 2px 8px rgba(66,99,235,0.25)" : "none",
                          }}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.stock && (
                    <div style={{ padding: 14, background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6C757D" }}>بارودۆخی کۆگا</span>
                        <span style={{ fontSize: 11, color: "#ADB5BD" }}>{form.stock} {form.unitType}</span>
                      </div>
                      <StockBar filled={stockFilled} />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Extra Info */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>ولاتی بەرهەم</label>
                      <select value={form.origin} onChange={e => set("origin", e.target.value)} style={{ ...iS, cursor: "pointer" }}>
                        {origins.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>دابینکەر</label>
                      <input value={form.supplier} onChange={e => set("supplier", e.target.value)}
                        placeholder="ناوی دابینکەر..." style={iS}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>بەرواری بەسەرچوون *</label>
                      <input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)}
                        style={iS}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>ژمارەی بەچ</label>
                      <input value={form.batchNumber} onChange={e => set("batchNumber", e.target.value)}
                        placeholder="BATCH-000" style={{ ...iS, fontFamily: "monospace", fontSize: 12 }}
                        onFocus={e => (e.target.style.borderColor = "#4263EB")}
                        onBlur={e => (e.target.style.borderColor = "#E9ECEF")} />
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ padding: 14, background: "#F8F9FA", borderRadius: 10, border: "1.5px solid #E9ECEF" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6C757D", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>پوختەی بەرهەم</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { l: "ناو", v: form.name },
                        { l: "SKU", v: form.sku },
                        { l: "جۆر", v: form.category },
                        { l: "نرخ", v: form.price ? formatIQD(Number(form.price)) : "—" },
                        { l: "کۆگا", v: form.stock ? `${form.stock} ${form.unitType}` : "—" },
                        { l: "ولات", v: form.origin },
                      ].map(item => (
                        <div key={item.l}>
                          <div style={{ fontSize: 9, color: "#ADB5BD", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{item.l}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: item.v ? "#1A1A2E" : "#CED4DA" }}>{item.v || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {step > 1 && (
                  <button onClick={handleBack} style={btnBack}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <ChevronRight size={14} /> گەڕانەوە
                    </span>
                  </button>
                )}
                {step < 5 ? (
                  <button onClick={handleNext} style={btnNext} disabled={step === 1 && !form.name}>
                    <span>پێشتر</span> <ChevronLeft size={14} />
                  </button>
                ) : (
                  <button onClick={handleFinish} style={{ ...btnNext, background: "linear-gradient(135deg, #2B8A3E, #40C057)" }}
                    disabled={!form.name || !form.price || !form.stock || !form.expiryDate}>
                    <Check size={14} /> <span>زیادکردنی بەرهەم</span>
                  </button>
                )}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 5 }}>
                {STEPS.map(s => (
                  <div key={s.id} style={{
                    width: step === s.id ? 20 : 6, height: 6, borderRadius: 3,
                    background: s.id < step ? "#4263EB" : step === s.id ? "#4263EB" : "#E9ECEF",
                    transition: "all 0.2s",
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
