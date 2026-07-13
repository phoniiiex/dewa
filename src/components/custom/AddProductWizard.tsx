"use client";
import {
  useState, useRef, useEffect, useCallback,
} from "react";
import {
  Tag, Check, ChevronRight, ChevronLeft,
  Globe, Camera, ScanLine, QrCode, Loader2,
  Pill, Calendar, Warehouse, AlertCircle, Zap,
  Upload, RefreshCw, X,
} from "lucide-react";
import { useData } from "@/lib/store";
import { COUNTRIES } from "@/lib/countries";

import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WizardFormData {
  name: string; sku: string; category: string; company: string;
  prices: { typeId: string; typeName: string; amount: string }[];
  stock: string; lowStock: string; unitType: string;
  origin: string; supplier: string;
  issueDate: string; expiryDate: string; batchNumber: string;
  isSample: boolean; imageUrl: string;
  barcode: string; description: string;
  activeIngredients: string; dosageForm: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData) => void;
  initialProduct?: Partial<WizardFormData> & { id?: string };
}

interface ScanResult {
  found: boolean; barcode: string; name?: string; nameEn?: string;
  manufacturer?: string; description?: string; category?: string;
  origin?: string; activeIngredients?: string; dosageForm?: string;
  strength?: string; imageUrl?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, icon: ScanLine,  label: "سکان"        },
  { id: 1, icon: Pill,      label: "زانیاری"     },
  { id: 2, icon: Tag,       label: "نرخ"          },
  { id: 3, icon: Warehouse, label: "ستۆک"         },
  { id: 4, icon: Calendar,  label: "بەروار"       },
  { id: 5, icon: Check,     label: "پشتڕاست"      },
];

const UNIT_TYPES  = ["قاپسوول","حەبە","شووشە","بلیستر","کارتۆن","فینجان","کیسە","ئامپوول","سرینج","پاکێت"];
const CATEGORIES  = ["ئینتیبایۆتیک","دژەئاغر","وزەبەخش","قەڵبی","شەکر","پرشنگ","دژەهەستەسەختی","دژەفیرۆشێ","فیتامین","پاراستنی ستۆماک"];

function empty(): WizardFormData {
  return {
    name:"", sku:"", category:"", company:"",
    prices:[], stock:"0", lowStock:"10", unitType:"حەبە",
    origin:"", supplier:"", issueDate:"", expiryDate:"", batchNumber:"",
    isSample:false, imageUrl:"", barcode:"", description:"",
    activeIngredients:"", dosageForm:"",
  };
}

// ─── Country Picker ──────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.nameEn === value || c.name === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex w-full h-10 items-center justify-between rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted transition-colors">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-muted-foreground" />
          {selected
            ? `${selected.flag} ${selected.nameEn}`
            : <span className="text-muted-foreground">ووڵات هەڵبژێرە…</span>}
        </span>
        <ChevronRight size={14} className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="گەڕان…" />
          <CommandList>
            <CommandEmpty>نەدۆزرایەوە</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {COUNTRIES.map(c => (
                  <CommandItem
                    key={c.nameEn}
                    value={`${c.nameEn} ${c.name}`}
                    onSelect={() => { onChange(c.nameEn); setOpen(false); }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">{c.flag}</span>
                    <span className="flex-1">{c.nameEn}</span>
                    {selected?.nameEn === c.nameEn && <Check size={13} className="text-primary" />}
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

// ─── Barcode Scanner (Camera) ─────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [status, setStatus] = useState<"idle"|"scanning"|"error">("idle");
  const [error, setError]   = useState("");

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const scan = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      setError("مرۆڤنەمای سکانی بارکۆد پشتگیری ناکات. تکایە بارکۆد بە دەست بنووسە.");
      setStatus("error"); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e","code_39","data_matrix"],
      });
      setStatus("scanning");
      const loop = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) { stopStream(); onDetected(codes[0].rawValue); return; }
        } catch { /* continue */ }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError("دەسترسی کامێرا ڕەتکرایەوە.");
      setStatus("error");
    }
  }, [stopStream, onDetected]);

  useEffect(() => { scan(); return () => stopStream(); }, [scan, stopStream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video w-full">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      {status === "scanning" && (
        <>
          {/* Corner brackets */}
          {["top-2 left-2 border-t-2 border-l-2","top-2 right-2 border-t-2 border-r-2",
            "bottom-2 left-2 border-b-2 border-l-2","bottom-2 right-2 border-b-2 border-r-2"
          ].map((cls, i) => (
            <div key={i} className={`absolute ${cls} w-6 h-6 border-primary rounded`} />
          ))}
          {/* Scan line */}
          <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{ animation: "scanLine 2s ease-in-out infinite", top: "50%" }} />
          <div className="absolute bottom-3 inset-x-0 text-center text-white/70 text-xs">
            بارکۆد بخرە بەرامبەر کامێرا…
          </div>
        </>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/60 p-4 text-center">
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={() => { stopStream(); onClose(); }}
        className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Image barcode scan ───────────────────────────────────────────────────────
async function detectBarcodeFromImage(file: File): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  const bitmap = await createImageBitmap(file);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detector = new (window as any).BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e"] });
  const codes = await detector.detect(bitmap);
  return codes[0]?.rawValue ?? null;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddProductWizard({ open, onClose, onSubmit, initialProduct }: Props) {
  const { priceTypes } = useData();
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<WizardFormData>(empty);
  const [scanMode, setScanMode]     = useState<"idle"|"camera"|"image">("idle");
  const [manualBarcode, setManual]  = useState("");
  const [looking, setLooking]       = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const imgInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialProduct?.id;

  // Init
  useEffect(() => {
    if (open) {
      setStep(initialProduct ? 1 : 0);
      setForm(initialProduct ? {
        ...empty(),
        name:             initialProduct.name             ?? "",
        sku:              initialProduct.sku              ?? "",
        category:         initialProduct.category         ?? "",
        company:          initialProduct.company          ?? "",
        prices:           initialProduct.prices           ?? [],
        stock:            String(initialProduct.stock     ?? 0),
        lowStock:         String(initialProduct.lowStock  ?? 10),
        unitType:         initialProduct.unitType         ?? "حەبە",
        origin:           initialProduct.origin           ?? "",
        supplier:         initialProduct.supplier         ?? "",
        issueDate:        initialProduct.issueDate        ?? "",
        expiryDate:       initialProduct.expiryDate       ?? "",
        batchNumber:      initialProduct.batchNumber      ?? "",
        isSample:         initialProduct.isSample         ?? false,
        imageUrl:         initialProduct.imageUrl         ?? "",
        barcode:          initialProduct.barcode          ?? "",
        description:      initialProduct.description      ?? "",
        activeIngredients:initialProduct.activeIngredients?? "",
        dosageForm:       initialProduct.dosageForm       ?? "",
      } : empty());
      setScanResult(null); setScanMode("idle"); setManual(""); setErrors({});
    }
  }, [open, initialProduct]);

  // Seed price rows
  useEffect(() => {
    if (priceTypes.length && !form.prices.length) {
      setForm(f => ({
        ...f,
        prices: priceTypes.map(pt => ({ typeId: pt.id, typeName: pt.name, amount: "" })),
      }));
    }
  }, [priceTypes]);

  const upd = (k: keyof WizardFormData, v: WizardFormData[typeof k]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Barcode lookup
  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLooking(true); setScanMode("idle");
    try {
      const res  = await fetch(`/api/lookup-product?barcode=${encodeURIComponent(code.trim())}`);
      const data: ScanResult = await res.json();
      setScanResult(data);
      if (data.found) {
        setForm(f => ({
          ...f,
          barcode:           code.trim(),
          name:              f.name              || data.name    || data.nameEn || "",
          company:           f.company           || data.manufacturer            || "",
          category:          f.category          || data.category                || "",
          origin:            f.origin            || data.origin                  || "",
          imageUrl:          f.imageUrl          || data.imageUrl                || "",
          description:       f.description       || data.description             || "",
          activeIngredients: f.activeIngredients || data.activeIngredients       || "",
          dosageForm:        f.dosageForm        || data.dosageForm              || "",
        }));
      } else {
        setForm(f => ({ ...f, barcode: code.trim() }));
      }
    } catch {
      setScanResult({ found: false, barcode: code });
    } finally { setLooking(false); }
  }, []);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanMode("image"); setLooking(true);
    try {
      const code = await detectBarcodeFromImage(file);
      if (code) await lookupBarcode(code);
      else { setScanResult({ found: false, barcode: "نەدۆزرایەوە" }); setLooking(false); }
    } catch { setLooking(false); }
    setScanMode("idle");
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  // Validation
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim())     e.name     = "ناوی بەرهەم پێویستە";
      if (!form.category.trim()) e.category = "جۆر پێویستە";
    }
    if (step === 2) {
      if (!form.prices.some(p => p.amount)) e.prices = "بەلایەنی کەمەوە یەک نرخ بنووسە";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next  = () => { if (!validate()) return; setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev  = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); };
  const reset = () => { setForm(empty()); setStep(0); setScanResult(null); setManual(""); };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form); onClose();
  };

  // ── Step 0 — Scan ────────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="flex flex-col gap-5">
      <div className="text-center py-2">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-3 border border-primary/20">
          <QrCode className="size-7 text-primary" />
        </div>
        <h3 className="font-bold text-base">بارکۆد یان QR Code بسکێنە</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          سکان بکە بۆ ئەوەی زانیاری بەرهەمەکە بە خۆی پڕ بکرێتەوە
        </p>
      </div>

      {/* Scan options */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "کامێرا", icon: Camera, onClick: () => setScanMode(scanMode === "camera" ? "idle" : "camera"), active: scanMode === "camera" },
          { label: "وێنە",   icon: Upload, onClick: () => imgInputRef.current?.click(), active: false },
          { label: "دەستی",  icon: ScanLine, onClick: () => {}, active: false },
        ].map(({ label, icon: Icon, onClick, active }) => (
          <button
            key={label}
            onClick={onClick}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm font-medium",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageScan} />

      {/* Camera */}
      {scanMode === "camera" && (
        <BarcodeScanner
          onDetected={code => { setScanMode("idle"); lookupBarcode(code); }}
          onClose={() => setScanMode("idle")}
        />
      )}

      {/* Manual entry */}
      <div className="flex gap-2">
        <Input
          placeholder="بارکۆد بنووسە… (EAN-13, UPC, QR…)"
          value={manualBarcode}
          onChange={e => setManual(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookupBarcode(manualBarcode)}
          className="flex-1"
        />
        <Button
          onClick={() => lookupBarcode(manualBarcode)}
          disabled={looking || !manualBarcode.trim()}
          variant="outline"
        >
          {looking ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        </Button>
      </div>

      {/* Loading */}
      {looking && !scanResult && (
        <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> گەڕان لە بانکی داتا…
        </div>
      )}

      {/* Result */}
      {scanResult && (
        <div className={cn(
          "rounded-2xl p-4 border text-sm",
          scanResult.found
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        )}>
          {scanResult.found ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                <Check size={14} /> دۆزرایەوە!
              </div>
              <p className="font-semibold">{scanResult.name || scanResult.nameEn}</p>
              {scanResult.manufacturer && <p className="text-muted-foreground text-xs">{scanResult.manufacturer}</p>}
              {scanResult.activeIngredients && <p className="text-xs">💊 {scanResult.activeIngredients}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle size={14} />
              <span>بارکۆدەکە نەدۆزرایەوە — دەتوانیت خۆت پڕی بکەیتەوە</span>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => setStep(1)}>
          <ChevronRight size={13} /> بێ سکان بچۆ پێشەوە
        </Button>
      </div>
    </div>
  );

  // ── Step 1 — Info ────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      {form.barcode && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2.5">
          <QrCode size={12} />
          <span>بارکۆد: <span className="font-mono">{form.barcode}</span></span>
          {scanResult?.found && (
            <Badge variant="secondary" className="ms-auto text-[10px]">ئۆتۆماتیک پڕکرایەوە</Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>ناوی بەرهەم <span className="text-destructive">*</span></Label>
          <Input
            placeholder="ناوی دەرمانەکە…"
            value={form.name}
            onChange={e => upd("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>کۆمپانیا / بەرهەمهێنەر</Label>
          <Input placeholder="ناوی کۆمپانیا…" value={form.company} onChange={e => upd("company", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>SKU / کۆدی بەرهەم</Label>
          <Input placeholder="MED-001…" value={form.sku} onChange={e => upd("sku", e.target.value)} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>جۆری بەرهەم <span className="text-destructive">*</span></Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => upd("category", c)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs border transition-all",
                  form.category === c
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border hover:border-primary/50 hover:bg-muted/70"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Custom category input — only shown when user typed a non-preset value */}
          {!CATEGORIES.includes(form.category) && (
            <Input
              placeholder="جۆری تایبەت…"
              value={form.category}
              onChange={e => upd("category", e.target.value)}
              className="mt-2"
            />
          )}
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>

        {form.activeIngredients ? (
          <div className="col-span-2 space-y-1.5">
            <Label>مادەی چالاک</Label>
            <Textarea rows={2} value={form.activeIngredients} onChange={e => upd("activeIngredients", e.target.value)} className="resize-none" />
          </div>
        ) : null}

        <div className="col-span-2 space-y-1.5">
          <Label>وەسف</Label>
          <Textarea rows={2} placeholder="وەسفی کورتی بەرهەم…" value={form.description} onChange={e => upd("description", e.target.value)} className="resize-none" />
        </div>

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <Checkbox id="sample" checked={form.isSample} onCheckedChange={v => upd("isSample", !!v)} />
          <Label htmlFor="sample" className="cursor-pointer">سامپڵە (نمونە)</Label>
        </div>
      </div>
    </div>
  );

  // ── Step 2 — Pricing ─────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">نرخ بۆ هەر جۆرێک بنووسە</p>
      {errors.prices && <p className="text-xs text-destructive">{errors.prices}</p>}
      <div className="space-y-2.5">
        {form.prices.map((p, i) => (
          <div key={p.typeId} className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3.5 border border-border/60">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Tag size={14} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.typeName}</p>
              <p className="text-[11px] text-muted-foreground">جۆری نرخ</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number" min="0" placeholder="0"
                value={p.amount}
                onChange={e => {
                  const next = [...form.prices];
                  next[i] = { ...next[i], amount: e.target.value };
                  upd("prices", next);
                }}
                className="w-28 text-left font-mono"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">دینار</span>
            </div>
          </div>
        ))}
        {form.prices.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
            <Tag size={28} className="mx-auto opacity-20" />
            <p>جۆری نرخ دروست بکە لە رێکخستنەکان</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3 — Stock ───────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>بڕی ستۆک</Label>
          <Input type="number" min="0" value={form.stock} onChange={e => upd("stock", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>ستۆکی کەم (ئاگاداری)</Label>
          <Input type="number" min="0" value={form.lowStock} onChange={e => upd("lowStock", e.target.value)} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>یەکەی ژماردن</Label>
          <div className="flex flex-wrap gap-1.5">
            {UNIT_TYPES.map(u => (
              <button
                key={u}
                onClick={() => upd("unitType", u)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs border transition-all",
                  form.unitType === u
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border hover:border-primary/50 hover:bg-muted/70"
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>دابینکەر / سوپلایەر</Label>
          <Input placeholder="ناوی دابینکەر…" value={form.supplier} onChange={e => upd("supplier", e.target.value)} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>ووڵاتی بەرهەمهێنان</Label>
          <CountryPicker value={form.origin} onChange={v => upd("origin", v)} />
        </div>
      </div>
    </div>
  );

  // ── Step 4 — Dates ───────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>بەرواری بەرهەمهێنان</Label>
          <Input type="date" value={form.issueDate} onChange={e => upd("issueDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>بەرواری بەسەرچوون</Label>
          <Input type="date" value={form.expiryDate} onChange={e => upd("expiryDate", e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>ژمارەی باچ (Batch Number)</Label>
          <Input placeholder="BATCH-2024-001…" value={form.batchNumber} onChange={e => upd("batchNumber", e.target.value)} className="font-mono" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>بەستەری وێنە (URL)</Label>
          <div className="flex gap-2">
            <Input placeholder="https://…" value={form.imageUrl} onChange={e => upd("imageUrl", e.target.value)} className="flex-1" />
            {form.imageUrl && (
              <div className="size-10 rounded-xl border overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover"
                  onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 5 — Confirm ─────────────────────────────────────────────────────────
  const renderStep5 = () => {
    const filledPrices = form.prices.filter(p => p.amount);
    return (
      <div className="space-y-4">
        {/* Product image preview */}
        {form.imageUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt={form.name} className="h-24 w-24 rounded-2xl object-cover border-2 border-border shadow"
              onError={e => (e.currentTarget.style.display = "none")} />
          </div>
        )}

        {/* Summary grid */}
        <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border/60 overflow-hidden">
          <SummaryRow label="ناو"      value={form.name}     bold />
          <SummaryRow label="کۆمپانیا" value={form.company}  />
          <SummaryRow label="جۆر"      value={form.category} />
          <SummaryRow label="SKU"      value={form.sku}      mono />
          <SummaryRow label="بارکۆد"   value={form.barcode}  mono />
          {form.activeIngredients && <SummaryRow label="مادەی چالاک" value={form.activeIngredients} />}
          <SummaryRow label="ستۆک"  value={`${form.stock} ${form.unitType}`} />
          <SummaryRow label="ووڵات" value={form.origin}    />
          <SummaryRow label="دابینکەر" value={form.supplier} />
          <SummaryRow label="بەسەرچوون" value={form.expiryDate} />
          <SummaryRow label="باچ"  value={form.batchNumber} mono />
          {form.isSample && <SummaryRow label="جۆر" value="✅ سامپڵە" />}
        </div>

        {/* Prices */}
        {filledPrices.length > 0 && (
          <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border/60 overflow-hidden">
            <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              نرخەکان
            </div>
            {filledPrices.map(p => (
              <SummaryRow key={p.typeId} label={p.typeName} value={`${Number(p.amount).toLocaleString()} دینار`} bold />
            ))}
          </div>
        )}
      </div>
    );
  };

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <>
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-40px); opacity: 0.3; }
          50%  { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0.3; }
        }
      `}</style>

      <Drawer
        open={open}
        onOpenChange={v => { if (!v) onClose(); }}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent dir="rtl" className="!rounded-t-3xl max-h-[92dvh] flex flex-col">
          {/* ── Drag Handle ── */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* ── Header ── */}
          <div className="bg-gradient-to-l from-primary/8 to-violet-500/8 border-b border-border px-5 pt-3 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-4.22-7.78-1.42 1.42M7.64 16.36l-1.42 1.42M7.64 7.64 6.22 6.22M16.36 16.36l1.42 1.42"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm leading-none">
                    {isEdit ? "دەستکاریکردنی بەرهەم" : "زیادکردنی بەرهەمی نوێ"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {STEPS[step].label} — گامی {step + 1} لە {STEPS.length}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done   = i < step;
                const active = i === step;
                return (
                  <div key={s.id} className="flex items-center gap-1 flex-1 last:flex-none">
                    <button
                      onClick={() => i < step && setStep(i)}
                      disabled={i > step}
                      title={s.label}
                      className={cn(
                        "size-7 rounded-full flex items-center justify-center transition-all shrink-0",
                        done   ? "bg-primary text-primary-foreground cursor-pointer shadow-sm" :
                        active ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm" :
                                 "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <Check size={12} /> : <Icon size={12} />}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-0.5 rounded transition-all duration-300", done ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5 pb-2">
              {stepContent[step]?.()}
            </div>
          </ScrollArea>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-border px-5 py-4 flex items-center justify-between bg-background/95 backdrop-blur-sm">
            <Button
              variant="ghost" size="sm"
              onClick={step === 0 ? onClose : prev}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={14} />
              {step === 0 ? "داخستن" : "گامی پێشوو"}
            </Button>

            <div className="flex items-center gap-2">
              {step === 0 && (
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                  <RefreshCw size={12} /> ڕیسێت
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button size="sm" onClick={next} className="gap-1.5 min-w-[90px]">
                  دواتر <ChevronRight size={14} />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  className="gap-1.5 min-w-[110px] bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm"
                >
                  <Check size={14} />
                  {isEdit ? "پاشەکەوتکردن" : "زیادکردن"}
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// ── Summary Row ───────────────────────────────────────────────────────────────
function SummaryRow({ label, value, mono, bold }: { label: string; value?: string; mono?: boolean; bold?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <span className={cn(
        "text-sm flex-1 text-right",
        bold ? "font-semibold" : "font-medium",
        mono && "font-mono text-xs"
      )}>
        {value}
      </span>
    </div>
  );
}
