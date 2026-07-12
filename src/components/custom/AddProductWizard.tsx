"use client";
import { useState, useRef, ReactNode, useEffect } from "react";
import {
  X, Package, Tag, ImageIcon, BarChart2, FileText,
  Check, ChevronRight, ChevronLeft, Plus, Upload, Search, Trash2, Edit3, Globe,
} from "lucide-react";
import { formatIQD } from "@/lib/currency";
import { useData } from "@/lib/store";
import type { Product } from "@/lib/types";
import { COUNTRIES } from "@/lib/countries";

// shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Types ────────────────────────────────────────────────────────────────────
const unitTypes = ["پاکەت", "بوتل", "ئەمپوول", "تیوب", "قوتی"];

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
  origin: COUNTRIES[0].name, supplier: "", issueDate: "", expiryDate: "",
  batchNumber: "", isSample: false,
};

// ─── Stock Bar ────────────────────────────────────────────────────────────────
function StockBar({ filled, total = 32 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-[3px] overflow-hidden">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="w-[5px] h-5 rounded-sm flex-shrink-0 transition-colors"
          style={{ background: i < filled ? "#4263EB" : "hsl(var(--muted))" }} />
      ))}
    </div>
  );
}

// ─── Category Combobox (shadcn Command) ───────────────────────────────────────
function CategoryCombobox({ value, onChange, allCategories }: {
  value: string; onChange: (v: string) => void; allCategories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allCategories.filter(c =>
    c.toLowerCase().includes(search.toLowerCase()) || c.includes(search)
  );
  const canAdd = search.trim() && !allCategories.some(c => c === search.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className="inline-flex w-full h-10 items-center justify-between rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted transition-all gap-1.5"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value || "جۆر هەڵبژێرە..."}
        </span>
        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="گەڕان..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {canAdd ? (
                <button className="w-full text-right px-3 py-2 text-sm text-primary font-semibold flex items-center gap-2"
                  onClick={() => { onChange(search.trim()); setOpen(false); setSearch(""); }}>
                  <Plus size={12} /> زیادکردنی &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                <span className="text-muted-foreground text-xs">هیچ نەدۆزرایەوە</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(c => (
                <CommandItem key={c} value={c} onSelect={() => { onChange(c); setOpen(false); setSearch(""); }}>
                  <Check size={12} className={`mr-2 ${value === c ? "opacity-100" : "opacity-0"}`} />
                  {c}
                </CommandItem>
              ))}
              {canAdd && filtered.length > 0 && (
                <CommandItem value={`add-${search}`} onSelect={() => { onChange(search.trim()); setOpen(false); setSearch(""); }}
                  className="text-primary font-semibold">
                  <Plus size={12} className="mr-2" /> زیادکردنی &ldquo;{search.trim()}&rdquo;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Country Combobox ─────────────────────────────────────────────────────────
function CountryCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  const selected = COUNTRIES.find(c => c.name === value || c.nameEn === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className="inline-flex w-full h-10 items-center justify-between rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted transition-all gap-1.5"
      >
        <span className="flex items-center gap-2">
          <Globe size={13} className="text-muted-foreground shrink-0" />
          <span>{selected ? `${selected.flag} ${selected.nameEn}` : "ولات هەڵبژێرە..."}</span>
        </span>
        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="گەڕان بە ناوی ولات..." />
          <CommandList>
            <CommandEmpty>هیچ ولاتێک نەدۆزرایەوە</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-56">
                {COUNTRIES.map(c => (
                  <CommandItem key={c.code} value={`${c.nameEn} ${c.name} ${c.code}`}
                    onSelect={() => { onChange(c.name); setOpen(false); }}>
                    <span className="flex items-center gap-2 w-full">
                      <span className="text-lg leading-none">{c.flag}</span>
                      <span className="flex-1 text-sm">{c.nameEn}</span>
                      {value === c.name && <Check size={12} className="text-primary" />}
                    </span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData) => void;
  initialProduct?: Product;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddProductWizard({ open, onClose, onSubmit, initialProduct }: Props) {
  const { products, priceTypes, addPriceType } = useData();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>(EMPTY);
  const [dragging, setDragging] = useState(false);
  const [newPriceTypeName, setNewPriceTypeName] = useState("");
  const [addingPriceType, setAddingPriceType] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [priceAmounts, setPriceAmounts] = useState<Record<string, string>>({});
  const [removedTypeIds, setRemovedTypeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setPriceAmounts({}); setRemovedTypeIds(new Set()); setForm(EMPTY);
    } else if (initialProduct) {
      const amounts: Record<string, string> = {};
      (initialProduct.prices || []).forEach(pp => {
        if (pp.amount) amounts[pp.typeId] = String(pp.amount);
      });
      priceTypes.forEach(pt => {
        if (!amounts[pt.id]) {
          const byName = (initialProduct.prices || []).find(pp => pp.typeName === pt.name && pp.amount);
          if (byName) amounts[pt.id] = String(byName.amount);
        }
      });
      setPriceAmounts(amounts);
      setRemovedTypeIds(new Set());
      setForm({
        name: initialProduct.name, sku: initialProduct.sku,
        category: initialProduct.category, company: initialProduct.company || "",
        description: "", prices: [], imageUrl: initialProduct.imageUrl || "",
        stock: String(initialProduct.stock), lowStock: String(initialProduct.lowStock ?? 10),
        unitType: initialProduct.unitType, origin: initialProduct.origin,
        supplier: initialProduct.supplier, issueDate: initialProduct.issueDate || "",
        expiryDate: initialProduct.expiryDate || "", batchNumber: initialProduct.batchNumber || "",
        isSample: initialProduct.isSample,
      });
    }
  }, [open, initialProduct, priceTypes]);

  if (!open) return null;

  const allCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const activePriceRows = priceTypes.filter(pt => !removedTypeIds.has(pt.id));
  const buildPrices = (): ProductPriceEntry[] =>
    activePriceRows.map(pt => ({ typeId: pt.id, typeName: pt.name, amount: priceAmounts[pt.id] || "" }));

  const set = (k: keyof WizardFormData, v: string | boolean | ProductPriceEntry[]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleClose = () => { setStep(1); setForm(EMPTY); setNewPriceTypeName(""); onClose(); };
  const handleNext = () => { if (step < 5) setStep(s => s + 1); };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); };
  const handleFinish = () => {
    if (!form.name.trim()) { setStep(1); return; }
    onSubmit({ ...form, prices: buildPrices() });
    setStep(1); setForm(EMPTY); setNewPriceTypeName(""); onClose();
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => set("imageUrl", e.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleImageFile(file);
  };

  const updatePriceAmount = (typeId: string, amount: string) =>
    setPriceAmounts(prev => ({ ...prev, [typeId]: amount }));

  const handleAddNewPriceType = async () => {
    if (!newPriceTypeName.trim()) return;
    if (priceTypes.some(pt => pt.name === newPriceTypeName.trim())) { setNewPriceTypeName(""); return; }
    setAddingPriceType(true);
    const nt = await addPriceType(newPriceTypeName.trim());
    setRemovedTypeIds(prev => { const s = new Set(prev); s.delete(nt.id); return s; });
    setNewPriceTypeName(""); setAddingPriceType(false);
  };

  const removePriceRow = (typeId: string) =>
    setRemovedTypeIds(prev => new Set([...prev, typeId]));

  // Preview values
  const previewName = form.name || "ناوی بەرهەم";
  const previewCategory = form.category || "جۆر";
  const firstPriceRow = activePriceRows.find(pt => priceAmounts[pt.id]);
  const previewPrice = firstPriceRow ? formatIQD(Number(priceAmounts[firstPriceRow.id])) : "٠ د.ع";
  const previewSku = form.sku || "SKU-000-00";
  const previewStock = Number(form.stock) || 0;
  const stockFilled = Math.round(Math.min(32, (previewStock / Math.max(previewStock, 500)) * 32));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden max-w-[min(96vw,1020px)] h-[min(93vh,700px)] flex flex-col"
        dir="rtl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{initialProduct ? "دەستکاری بەرهەم" : "بەرهەمی نوێ"}</DialogTitle>
        </DialogHeader>

        <div className="grid h-full overflow-hidden" style={{ gridTemplateColumns: "340px 1fr" }}>

          {/* ── LEFT: Preview Panel ── */}
          <div className="relative flex flex-col gap-4 p-7 overflow-hidden border-l border-border"
            style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.4) 0%, hsl(var(--background)) 100%)" }}>
            <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(66,99,235,0.08) 0%, transparent 70%)" }} />

            <div className="relative">
              <p className="text-sm font-bold">پێشبینین</p>
              <p className="text-xs text-muted-foreground">ئەمە چۆنێتیی بەرهەمەکەتە لە سیستەمدا</p>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="2" height="10" fill="currentColor" rx="1" opacity=".3"/>
                  <rect x="5" y="2" width="1" height="10" fill="currentColor" rx=".5" opacity=".3"/>
                  <rect x="7" y="2" width="2" height="10" fill="currentColor" rx="1" opacity=".3"/>
                  <rect x="11" y="2" width="2" height="10" fill="currentColor" rx="1" opacity=".3"/>
                </svg>
                <span className="text-[10px] text-muted-foreground font-mono font-semibold">{previewSku}</span>
              </div>

              <div className="mx-4 my-2 rounded-xl border-2 border-dashed border-muted h-36 flex items-center justify-center overflow-hidden shrink-0">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center text-muted-foreground/50">
                    <ImageIcon size={24} className="mb-1 mx-auto" />
                    <div className="text-[10px] font-semibold">وێنەی بەرهەم</div>
                  </div>
                )}
              </div>

              <div className="px-4 pb-2">
                {form.company && <div className="text-[9px] text-primary font-bold mb-0.5 uppercase tracking-wide">{form.company}</div>}
                <div className="text-[10px] text-muted-foreground font-bold mb-1">{previewCategory}</div>
                <div className="text-sm font-extrabold leading-tight mb-1.5">{previewName}</div>
                <div className="text-xl font-black" style={{ background: "linear-gradient(135deg, #4263EB, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {previewPrice}
                </div>
                {activePriceRows.filter(pt => priceAmounts[pt.id]).length > 1 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {activePriceRows.filter(pt => priceAmounts[pt.id]).slice(1).map(pt => (
                      <div key={pt.id} className="text-[10px] text-muted-foreground">
                        {pt.name}: {formatIQD(Number(priceAmounts[pt.id]))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />
              <div className="px-4 py-3">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground">بارودۆخی کۆگا</span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {previewStock > 0 ? `${previewStock} ${form.unitType}` : "٠ یەکە"}
                  </span>
                </div>
                <StockBar filled={stockFilled} />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Step Sidebar + Form ── */}
          <div className="grid h-full overflow-hidden" style={{ gridTemplateColumns: "176px 1fr" }}>

            {/* Step Sidebar */}
            <div className="bg-muted/30 border-l border-border p-4 flex flex-col gap-1">
              <div className="text-xs font-extrabold mb-4 flex items-center gap-1.5">
                {initialProduct ? <><Edit3 size={13} className="text-primary" /> دەستکاری بەرهەم</> : "بەرهەمی نوێ"}
              </div>
              {STEPS.map(s => {
                const done = step > s.id; const active = step === s.id;
                return (
                  <button key={s.id} onClick={() => setStep(s.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-right w-full transition-all ${active ? "bg-background border-border shadow-sm" : "border-transparent hover:bg-muted/50"}`}>
                    <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Check size={12} /> : s.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-bold leading-tight truncate ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</div>
                      <div className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5 truncate">{s.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <div className="flex flex-col p-6 overflow-auto relative">
              {/* Close */}
              <Button variant="ghost" size="icon" onClick={handleClose}
                className="absolute top-3 left-3 h-8 w-8 rounded-lg">
                <X size={14} />
              </Button>

              {/* Step Header */}
              <div className="mb-5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  {STEPS[step - 1].icon}
                </div>
                <h2 className="text-lg font-extrabold leading-tight">{STEPS[step - 1].label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === 1 && "زانیاری سەرەکی و کۆمپانیای بەرهەمەکەت بنووسە"}
                  {step === 2 && "جۆرەکانی نرخ دیاری بکە بۆ ئەم بەرهەمە"}
                  {step === 3 && "وێنەیەکی باش بەرهەمەکەت دەبەستێتەوە"}
                  {step === 4 && "بڕی کۆگای بەردەست بنووسە"}
                  {step === 5 && "زانیاری زیادەی بەرهەم تەواوبکە"}
                </p>
                <Separator className="mt-3" />
              </div>

              {/* ── STEP 1: General Info ── */}
              <div className="flex-1 overflow-auto">
                {step === 1 && (
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel required>ناوی بەرهەم</FieldLabel>
                      <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ناوی بەرهەم..." />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>کۆمپانیا / بەرهەمهێنەر</FieldLabel>
                      <Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="بۆ نموونە: Pfizer, Novartis..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <FieldLabel>SKU</FieldLabel>
                        <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="SKU-000-00" className="font-mono text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>جۆر / پۆل</FieldLabel>
                        <CategoryCombobox value={form.category} onChange={v => set("category", v)} allCategories={allCategories} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>تێبینی</FieldLabel>
                      <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="کورتەیەکی بەرهەم..." rows={2} className="resize-none" />
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Prices ── */}
                {step === 2 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-muted-foreground px-3 py-2 bg-muted rounded-lg">
                      بۆ هەر جۆرێکی نرخ نرخی تایبەتی بنووسە
                    </div>

                    {activePriceRows.map(pt => (
                      <div key={pt.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{pt.name}</div>
                          <div className="relative">
                            <Input type="number" value={priceAmounts[pt.id] || ""} onChange={e => updatePriceAmount(pt.id, e.target.value)}
                              placeholder="٠" className="text-lg font-bold pr-3 pl-12" />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-semibold">د.ع</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removePriceRow(pt.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0">
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}

                    {/* Add new price type */}
                    <div className="flex gap-2 p-3 bg-primary/5 rounded-xl border border-dashed border-primary/30">
                      <Input value={newPriceTypeName} onChange={e => setNewPriceTypeName(e.target.value)}
                        placeholder="جۆری نرخی نوێ..." className="bg-background text-sm"
                        onKeyDown={e => { if (e.key === "Enter") handleAddNewPriceType(); }} />
                      <Button onClick={handleAddNewPriceType} disabled={!newPriceTypeName.trim() || addingPriceType}
                        size="sm" className="shrink-0 gap-1">
                        <Plus size={12} /> زیادکردن
                      </Button>
                    </div>

                    {/* Sample checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted/50 rounded-xl border border-border">
                      <Checkbox checked={form.isSample} onCheckedChange={v => set("isSample", !!v)} />
                      <div>
                        <div className="text-sm font-semibold">نموونە (بۆ بەخشین)</div>
                        <div className="text-[10px] text-muted-foreground">ئەم بەرهەمە بۆ بەخشینە، نەك فرۆشتن</div>
                      </div>
                    </label>
                  </div>
                )}

                {/* ── STEP 3: Image ── */}
                {step === 3 && (
                  <div className="flex flex-col gap-3">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/30 hover:border-primary/50 hover:bg-primary/5"}`}>
                      {form.imageUrl ? (
                        <div>
                          <img src={form.imageUrl} alt="preview" className="max-h-36 rounded-xl mx-auto block" />
                          <p className="mt-2 text-xs text-primary font-semibold">کرتە بکە بۆ گۆڕین</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2.5">
                            <Upload size={18} />
                          </div>
                          <p className="text-sm font-bold mb-1">فایل هەڵبژێرە یان ڕابکێشە</p>
                          <p className="text-[10px] text-muted-foreground">PNG، JPEG — تا ٥٠ MB</p>
                          <Button type="button" variant="outline" size="sm" className="mt-3 gap-1"
                            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Plus size={11} /> هەڵبژاردن
                          </Button>
                        </>
                      )}
                    </div>
                    {form.imageUrl && (
                      <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => set("imageUrl", "")}>
                        سڕینەوەی وێنە
                      </Button>
                    )}
                    <div className="flex gap-1.5 p-2.5 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400">
                      <span>💡</span><span>وێنەی باش بۆ 400×400 px پێشنیاری دەکرێت</span>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Stock ── */}
                {step === 4 && (
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel required>بڕی کۆگا</FieldLabel>
                      <Input type="number" value={form.stock} onChange={e => set("stock", e.target.value)}
                        placeholder="٠" className="text-2xl font-extrabold h-12" />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>یەکەی پێوانە</FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {unitTypes.map(u => (
                          <Button key={u} type="button" variant={form.unitType === u ? "default" : "outline"}
                            size="sm" onClick={() => set("unitType", u)} className="h-8">
                            {u}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <FieldLabel>⚠️ سنووری کەمی کۆگا (Low Stock)</FieldLabel>
                      <div className="flex items-center gap-3 mt-2">
                        <Input type="number" min="0" value={form.lowStock} onChange={e => set("lowStock", e.target.value)}
                          placeholder="10" className="w-24 text-lg font-bold border-yellow-300" />
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                          کاتێک بڕی کۆگا بگاتە ژێر ئەم ژمارەیە<br />
                          <strong>ئاگاداری کەمی کۆگا</strong> دەردەکەوێت
                        </p>
                      </div>
                      {form.stock && form.lowStock && (
                        <p className={`mt-2 text-[11px] font-semibold ${Number(form.stock) <= Number(form.lowStock) ? "text-destructive" : "text-green-600"}`}>
                          {Number(form.stock) <= Number(form.lowStock)
                            ? `⚠ بڕی کۆگا (${form.stock}) لە سنووری کەم (${form.lowStock}) کەمتەرە`
                            : `✓ بڕی کۆگا (${form.stock}) لەسەر سنووری کەم (${form.lowStock}) دەیە`}
                        </p>
                      )}
                    </div>

                    {form.stock && (
                      <div className="p-3 bg-muted/50 rounded-xl border border-border">
                        <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground">بارودۆخی کۆگا</span>
                          <span className="text-[10px] text-muted-foreground/70">{form.stock} {form.unitType}</span>
                        </div>
                        <StockBar filled={stockFilled} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 5: Extra Info ── */}
                {step === 5 && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5 col-span-2">
                        <FieldLabel>ولاتی بەرهەم</FieldLabel>
                        <CountryCombobox value={form.origin} onChange={v => set("origin", v)} />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>دابینکەر</FieldLabel>
                        <Input value={form.supplier} onChange={e => set("supplier", e.target.value)} placeholder="ناوی دابینکەر..." />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>ژمارەی بەچ</FieldLabel>
                        <Input value={form.batchNumber} onChange={e => set("batchNumber", e.target.value)} placeholder="BATCH-000" className="font-mono text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>بەرواری بەرهەمهێنان</FieldLabel>
                        <Input type="date" value={form.issueDate} onChange={e => set("issueDate", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel required>بەرواری بەسەرچوون</FieldLabel>
                        <Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-muted/50 rounded-xl border border-border mt-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">پوختەی بەرهەم</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { l: "ناو", v: form.name }, { l: "کۆمپانیا", v: form.company },
                          { l: "جۆر", v: form.category }, { l: "کۆگا", v: form.stock ? `${form.stock} ${form.unitType}` : "—" },
                          { l: "ولات", v: form.origin },
                        ].map(item => (
                          <div key={item.l}>
                            <div className="text-[9px] text-muted-foreground/70 font-bold">{item.l}</div>
                            <div className={`text-[11px] font-semibold ${item.v ? "" : "text-muted-foreground/30"}`}>{item.v || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Navigation ── */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex gap-2">
                  {step > 1 && (
                    <Button variant="outline" onClick={handleBack} className="flex-1 gap-1">
                      <ChevronRight size={13} /> گەڕانەوە
                    </Button>
                  )}
                  {step < 5 ? (
                    <Button onClick={handleNext} className="flex-1 gap-1"
                      disabled={step === 1 && !form.name}>
                      پێشتر <ChevronLeft size={13} />
                    </Button>
                  ) : (
                    <Button onClick={handleFinish} disabled={!form.name || !form.stock}
                      className="flex-1 gap-1"
                      style={{ background: initialProduct ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "linear-gradient(135deg, #2B8A3E, #40C057)", border: "none" }}>
                      {initialProduct ? <><Edit3 size={13} /> پاشەکەوتکردنی گۆڕانکاری</> : <><Check size={13} /> زیادکردنی بەرهەم</>}
                    </Button>
                  )}
                </div>
                <div className="flex justify-center gap-1 mt-2">
                  {STEPS.map(s => (
                    <div key={s.id} className="h-1 rounded-full transition-all"
                      style={{ width: step === s.id ? 18 : 5, background: s.id <= step ? "#4263EB" : "hsl(var(--muted))" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
