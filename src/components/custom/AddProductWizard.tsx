"use client";
import {
  useState, useRef, useEffect, useCallback, type ReactNode,
} from "react";
import {
  Camera, ScanLine, QrCode, Loader2, Zap, Upload,
  AlertCircle, Check, Globe, ChevronLeft, Tag, X,
} from "lucide-react";
import { useData } from "@/lib/store";
import { COUNTRIES } from "@/lib/countries";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  imageUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const UNIT_TYPES  = ["قاپسوول","حەبە","شووشە","بلیستر","کارتۆن","فینجان","کیسە","ئامپوول","سرینج","پاکێت"];
const CATEGORIES  = ["ئینتیبایۆتیک","دژەئاغر","وزەبەخش","قەڵبی","شەکر","پرشنگ","دژەهەستەسەختی","دژەفیرۆشێ","فیتامین","پاراستنی ستۆماک"];
// Width token applied to every DrawerContent in the wizard
const W = "data-[swipe-axis=x]:[--drawer-content-width:min(94vw,30rem)] data-[swipe-axis=x]:sm:[--drawer-content-width:30rem]";

function empty(): WizardFormData {
  return {
    name:"", sku:"", category:"", company:"",
    prices:[], stock:"0", lowStock:"10", unitType:"حەبە",
    origin:"", supplier:"", issueDate:"", expiryDate:"", batchNumber:"",
    isSample:false, imageUrl:"", barcode:"", description:"",
    activeIngredients:"", dosageForm:"",
  };
}

// ─── Step Shell ───────────────────────────────────────────────────────────────
function StepShell({
  n, question, hint, children, onNext, nextLabel = "دواتر",
  nextDisabled = false, nextVariant = "default", onClose,
}: {
  n: number; question: string; hint?: string; children: ReactNode;
  onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
  nextVariant?: "default" | "success"; onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Top bar */}
      <div className="flex items-start justify-between px-6 pt-6 pb-0 shrink-0">
        <div className="flex-1">
          <p className="text-[10px] font-mono tracking-[0.25em] text-muted-foreground/40 mb-3 select-none">
            {String(n).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
          </p>
          <h2 className="text-[1.3rem] font-bold leading-tight text-foreground">{question}</h2>
          {hint && <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{hint}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors ms-3 mt-0.5 shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 mt-5 mb-0 h-px bg-border/50" />

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-6 py-5 space-y-4">
          {children}
        </div>
      </ScrollArea>

      {/* Footer CTA */}
      <div className="px-6 pb-6 pt-4 shrink-0">
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(
            "w-full h-11 font-semibold text-[13px] gap-1.5 rounded-xl",
            nextVariant === "success" &&
              "bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-md shadow-emerald-500/25"
          )}
        >
          {nextVariant === "success" && <Check size={15} />}
          {nextLabel}
          {nextLabel === "دواتر" && <ChevronLeft size={14} className="opacity-70" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Country Picker ───────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.nameEn === value || c.name === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex w-full h-11 items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm hover:bg-muted transition-colors">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-muted-foreground" />
          {selected
            ? <span>{selected.flag} {selected.nameEn}</span>
            : <span className="text-muted-foreground">ووڵات هەڵبژێرە…</span>}
        </span>
        <ChevronLeft size={13} className="text-muted-foreground rotate-180" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="گەڕان…" />
          <CommandList>
            <CommandEmpty>نەدۆزرایەوە</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-60">
                {COUNTRIES.map(c => (
                  <CommandItem
                    key={c.nameEn}
                    value={`${c.nameEn} ${c.name}`}
                    onSelect={() => { onChange(c.nameEn); setOpen(false); }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">{c.flag}</span>
                    <span className="flex-1">{c.nameEn}</span>
                    {selected?.nameEn === c.nameEn && <Check size={12} className="text-primary" />}
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

// ─── Camera Barcode Scanner ───────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [status, setStatus] = useState<"idle"|"scanning"|"error">("idle");
  const [error, setError]   = useState("");

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      setError("بمرۆڤنەمای سکان پشتگیری ناکات. بارکۆد بە دەست بنووسە.");
      setStatus("error"); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const det = new (window as any).BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e","code_39"] });
      setStatus("scanning");
      const loop = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          if (codes.length) { stopStream(); onDetected(codes[0].rawValue); return; }
        } catch {/* */}
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch { setError("دەسترسی کامێرا ڕەتکرایەوە."); setStatus("error"); }
  }, [stopStream, onDetected]);

  useEffect(() => { start(); return () => stopStream(); }, [start, stopStream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video w-full border border-border">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      {status === "scanning" && (
        <>
          {[["top-2 left-2","border-t-2 border-l-2"],["top-2 right-2","border-t-2 border-r-2"],
            ["bottom-2 left-2","border-b-2 border-l-2"],["bottom-2 right-2","border-b-2 border-r-2"]
          ].map(([pos, b], i) => (
            <div key={i} className={`absolute ${pos} ${b} w-5 h-5 border-primary rounded-sm`} />
          ))}
          <div
            className="absolute inset-x-6 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
            style={{ animation: "scanLine 1.8s ease-in-out infinite", top: "50%" }}
          />
        </>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/70 p-4 text-center text-sm">
          <AlertCircle size={20} className="text-red-400" />
          {error}
        </div>
      )}
      <button onClick={() => { stopStream(); onClose(); }}
        className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white flex items-center justify-center">
        <X size={12} />
      </button>
    </div>
  );
}

async function detectBarcodeFromImage(file: File): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  const bmp = await createImageBitmap(file);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const det = new (window as any).BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e"] });
  const codes = await det.detect(bmp);
  return codes[0]?.rawValue ?? null;
}

// ─── Pill selector ────────────────────────────────────────────────────────────
function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[13px] border transition-all",
            value === o
              ? "bg-foreground text-background border-foreground font-semibold"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted/50"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddProductWizard({ open, onClose, onSubmit, initialProduct }: Props) {
  const { priceTypes } = useData();
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<WizardFormData>(empty);
  const [scanMode, setScanMode]     = useState<"idle"|"camera">("idle");
  const [manual, setManual]         = useState("");
  const [looking, setLooking]       = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialProduct?.id;

  // Init
  useEffect(() => {
    if (open) {
      setStep(initialProduct ? 1 : 0);
      setForm(initialProduct ? {
        ...empty(),
        name:              initialProduct.name              ?? "",
        sku:               initialProduct.sku               ?? "",
        category:          initialProduct.category          ?? "",
        company:           initialProduct.company           ?? "",
        prices:            initialProduct.prices            ?? [],
        stock:             String(initialProduct.stock      ?? 0),
        lowStock:          String(initialProduct.lowStock   ?? 10),
        unitType:          initialProduct.unitType          ?? "حەبە",
        origin:            initialProduct.origin            ?? "",
        supplier:          initialProduct.supplier          ?? "",
        issueDate:         initialProduct.issueDate         ?? "",
        expiryDate:        initialProduct.expiryDate        ?? "",
        batchNumber:       initialProduct.batchNumber       ?? "",
        isSample:          initialProduct.isSample          ?? false,
        imageUrl:          initialProduct.imageUrl          ?? "",
        barcode:           initialProduct.barcode           ?? "",
        description:       initialProduct.description       ?? "",
        activeIngredients: initialProduct.activeIngredients ?? "",
        dosageForm:        initialProduct.dosageForm        ?? "",
      } : empty());
      setScanResult(null); setScanMode("idle"); setManual("");
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

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLooking(true); setScanMode("idle");
    try {
      const res  = await fetch(`/api/lookup-product?barcode=${encodeURIComponent(code.trim())}`);
      const data: ScanResult = await res.json();
      setScanResult(data);
      if (data.found) {
        setForm(f => ({
          ...f, barcode: code.trim(),
          name:              f.name              || data.name    || data.nameEn || "",
          company:           f.company           || data.manufacturer           || "",
          category:          f.category          || data.category               || "",
          origin:            f.origin            || data.origin                 || "",
          imageUrl:          f.imageUrl          || data.imageUrl               || "",
          description:       f.description       || data.description            || "",
          activeIngredients: f.activeIngredients || data.activeIngredients      || "",
        }));
      } else {
        setForm(f => ({ ...f, barcode: code.trim() }));
      }
    } catch { setScanResult({ found: false, barcode: code }); }
    finally  { setLooking(false); }
  }, []);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLooking(true);
    try {
      const code = await detectBarcodeFromImage(file);
      if (code) await lookupBarcode(code);
      else { setScanResult({ found: false, barcode: "نەدۆزرایەوە" }); setLooking(false); }
    } catch { setLooking(false); }
    if (imgRef.current) imgRef.current.value = "";
  };

  const handleClose = () => { setStep(0); setScanResult(null); setScanMode("idle"); onClose(); };
  const handleSubmit = () => { onSubmit(form); handleClose(); };

  const go = (n: number) => setStep(s => Math.max(s, n));

  // ── Content helpers ──────────────────────────────────────────────────────────
  const scanContent = (
    <>
      {/* 3 options */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "کامێرا", icon: Camera,   act: () => setScanMode(scanMode === "camera" ? "idle" : "camera") },
          { label: "وێنە",   icon: Upload,   act: () => imgRef.current?.click() },
          { label: "دەستی",  icon: ScanLine, act: () => {} },
        ].map(({ label, icon: Icon, act }) => (
          <button
            key={label}
            type="button"
            onClick={act}
            className={cn(
              "flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-[12px] font-medium transition-all",
              (label === "کامێرا" && scanMode === "camera")
                ? "border-foreground bg-foreground/5 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageScan} />

      {/* Camera */}
      {scanMode === "camera" && (
        <BarcodeScanner
          onDetected={code => { setScanMode("idle"); lookupBarcode(code); }}
          onClose={() => setScanMode("idle")}
        />
      )}

      {/* Manual */}
      <div className="flex gap-2">
        <Input
          placeholder="بارکۆد بنووسە… EAN-13 / QR"
          value={manual}
          onChange={e => setManual(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookupBarcode(manual)}
          className="flex-1 h-11 rounded-xl"
        />
        <Button
          variant="outline"
          className="shrink-0 h-11 rounded-xl px-3"
          onClick={() => lookupBarcode(manual)}
          disabled={looking || !manual.trim()}
        >
          {looking ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        </Button>
      </div>

      {/* Lookup state */}
      {looking && !scanResult && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <Loader2 size={13} className="animate-spin" /> گەڕان لە بانکی داتا…
        </div>
      )}
      {scanResult && (
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm border",
          scanResult.found
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        )}>
          {scanResult.found ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[13px]">
                <Check size={13} /> دۆزرایەوە
              </div>
              <p className="font-medium">{scanResult.name || scanResult.nameEn}</p>
              {scanResult.manufacturer && <p className="text-[12px] text-muted-foreground">{scanResult.manufacturer}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-[13px]">
              <AlertCircle size={13} /> بارکۆدەکە نەدۆزرایەوە — دەتوانیت خۆت پڕی بکەیتەوە
            </div>
          )}
        </div>
      )}

      {form.barcode && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          <QrCode size={11} />
          <span className="font-mono">{form.barcode}</span>
          {scanResult?.found && <Badge variant="secondary" className="ms-auto text-[10px] py-0">ئۆتۆماتیک</Badge>}
        </div>
      )}
    </>
  );

  const step1Content = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-muted-foreground">ناوی بەرهەم *</Label>
        <Input
          placeholder="نمونە: Amoxicillin 500mg"
          value={form.name}
          onChange={e => upd("name", e.target.value)}
          className="h-11 rounded-xl text-base"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-muted-foreground">کۆمپانیا / بەرهەمهێنەر</Label>
        <Input placeholder="نمونە: Pfizer, AstraZeneca…" value={form.company} onChange={e => upd("company", e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-muted-foreground">SKU / کۆدی بەرهەم</Label>
        <Input placeholder="MED-001" value={form.sku} onChange={e => upd("sku", e.target.value)} className="h-11 rounded-xl font-mono" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-muted-foreground">وەسف (ئارەزوومەند)</Label>
        <Textarea
          placeholder="وەسفی کورت…"
          value={form.description}
          onChange={e => upd("description", e.target.value)}
          className="resize-none rounded-xl text-[13px]"
          rows={2}
        />
      </div>
    </div>
  );

  const step2Content = (
    <div className="space-y-4">
      <Pills options={CATEGORIES} value={form.category} onChange={v => upd("category", v)} />
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">جۆری تایبەت (ئارەزوومەند)</Label>
        <Input
          placeholder="جۆری دیکە بنووسە…"
          value={CATEGORIES.includes(form.category) ? "" : form.category}
          onChange={e => upd("category", e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>
      {form.activeIngredients && (
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground">مادەی چالاک</Label>
          <Textarea rows={2} value={form.activeIngredients} onChange={e => upd("activeIngredients", e.target.value)} className="resize-none rounded-xl text-[13px]" />
        </div>
      )}
      <div className="flex items-center gap-2.5 pt-1">
        <Checkbox id="sample" checked={form.isSample} onCheckedChange={v => upd("isSample", !!v)} />
        <Label htmlFor="sample" className="cursor-pointer text-[13px]">سامپڵەیە (نمونەی بەخشین)</Label>
      </div>
    </div>
  );

  const step3Content = (
    <div className="space-y-3">
      {form.prices.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-[13px] space-y-2">
          <Tag size={24} className="mx-auto opacity-20" />
          <p>جۆری نرخ دروست بکە لە رێکخستنەکان</p>
        </div>
      ) : (
        form.prices.map((p, i) => (
          <div key={p.typeId} className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-foreground flex-1 truncate">{p.typeName}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number" min="0" placeholder="0"
                value={p.amount}
                onChange={e => {
                  const next = [...form.prices];
                  next[i] = { ...next[i], amount: e.target.value };
                  upd("prices", next);
                }}
                className="w-28 h-10 rounded-xl text-left font-mono text-[13px]"
              />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">دینار</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const step4Content = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground">بڕی ستۆک</Label>
          <Input type="number" min="0" value={form.stock} onChange={e => upd("stock", e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground">ستۆکی کەم (ئاگاداری)</Label>
          <Input type="number" min="0" value={form.lowStock} onChange={e => upd("lowStock", e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-[13px] text-muted-foreground">یەکەی ژماردن</Label>
        <Pills options={UNIT_TYPES} value={form.unitType} onChange={v => upd("unitType", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">دابینکەر</Label>
        <Input placeholder="ناوی دابینکەر…" value={form.supplier} onChange={e => upd("supplier", e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">ووڵاتی بەرهەمهێنان</Label>
        <CountryPicker value={form.origin} onChange={v => upd("origin", v)} />
      </div>
    </div>
  );

  const step5Content = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground">بەرواری بەرهەمهێنان</Label>
          <Input type="date" value={form.issueDate} onChange={e => upd("issueDate", e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] text-muted-foreground">بەرواری بەسەرچوون</Label>
          <Input type="date" value={form.expiryDate} onChange={e => upd("expiryDate", e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">ژمارەی باچ</Label>
        <Input placeholder="BATCH-2024-001" value={form.batchNumber} onChange={e => upd("batchNumber", e.target.value)} className="h-11 rounded-xl font-mono" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">بەستەری وێنە (URL)</Label>
        <div className="flex gap-2">
          <Input placeholder="https://…" value={form.imageUrl} onChange={e => upd("imageUrl", e.target.value)} className="h-11 rounded-xl flex-1" />
          {form.imageUrl && (
            <div className="size-11 rounded-xl border overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover"
                onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Review
  const reviewContent = (() => {
    const rows: [string, string, boolean?][] = [
      ["ناو",      form.name,                true ],
      ["کۆمپانیا", form.company,             false],
      ["جۆر",      form.category,            false],
      ["SKU",      form.sku,                 false],
      ["بارکۆد",   form.barcode,             false],
      ["ستۆک",     `${form.stock} ${form.unitType}`, false],
      ["ووڵات",    form.origin,              false],
      ["دابینکەر", form.supplier,            false],
      ["بەسەرچوون",form.expiryDate,          false],
      ["باچ",      form.batchNumber,         false],
    ].filter(([, v]) => !!v) as [string, string, boolean?][];

    const prices = form.prices.filter(p => p.amount);

    return (
      <div className="space-y-4">
        {form.imageUrl && (
          <div className="flex gap-3 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt={form.name}
              className="size-16 rounded-2xl object-cover border border-border shrink-0"
              onError={e => (e.currentTarget.style.display = "none")} />
            <div>
              <p className="font-bold text-[15px] leading-snug">{form.name}</p>
              {form.company && <p className="text-[13px] text-muted-foreground">{form.company}</p>}
              <p className="text-[12px] text-muted-foreground mt-0.5">{form.category}</p>
            </div>
          </div>
        )}
        {!form.imageUrl && (
          <div>
            <p className="font-bold text-[17px] leading-snug">{form.name}</p>
            {form.company && <p className="text-[13px] text-muted-foreground">{form.company}</p>}
          </div>
        )}

        {/* Info rows */}
        <div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
          {rows.map(([label, value, bold]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[12px] text-muted-foreground w-20 shrink-0">{label}</span>
              <span className={cn("text-[13px] flex-1 text-right", bold && "font-semibold")}>{value}</span>
            </div>
          ))}
        </div>

        {/* Prices */}
        {prices.length > 0 && (
          <div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/30">
              نرخەکان
            </div>
            {prices.map(p => (
              <div key={p.typeId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[12px] text-muted-foreground flex-1">{p.typeName}</span>
                <span className="text-[13px] font-semibold">{Number(p.amount).toLocaleString()} دینار</span>
              </div>
            ))}
          </div>
        )}

        {form.isSample && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Check size={13} className="text-primary" /> سامپڵەیە
          </div>
        )}
      </div>
    );
  })();

  // ── Render nested drawers ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes scanLine {
          0%,100% { transform:translateY(-28px); opacity:0.3; }
          50%      { transform:translateY(28px);  opacity:1; }
        }
      `}</style>

      {/* ROOT — Step 0: Scan */}
      <Drawer open={open} onOpenChange={v => !v && handleClose()} swipeDirection="left">
        <DrawerContent className={W} dir="rtl">
          <StepShell
            n={0} question="بارکۆد بسکێنە" hint="ئۆتۆماتیکی پڕ دەکرێتەوە"
            onNext={() => go(1)} nextLabel="بچۆ پێشەوە"
            onClose={handleClose}
          >
            {scanContent}
          </StepShell>

          {/* ── Step 1: Name ── */}
          <Drawer open={step >= 1} onOpenChange={o => !o && setStep(0)} swipeDirection="left">
            <DrawerContent className={W} dir="rtl">
              <StepShell
                n={1} question="ناوی بەرهەم چییە؟"
                onNext={() => go(2)} nextDisabled={!form.name.trim()}
              >
                {step1Content}
              </StepShell>

              {/* ── Step 2: Category ── */}
              <Drawer open={step >= 2} onOpenChange={o => !o && setStep(1)} swipeDirection="left">
                <DrawerContent className={W} dir="rtl">
                  <StepShell
                    n={2} question="چ جۆرە؟" hint="جۆری بەرهەم هەڵبژێرە"
                    onNext={() => go(3)} nextDisabled={!form.category.trim()}
                  >
                    {step2Content}
                  </StepShell>

                  {/* ── Step 3: Pricing ── */}
                  <Drawer open={step >= 3} onOpenChange={o => !o && setStep(2)} swipeDirection="left">
                    <DrawerContent className={W} dir="rtl">
                      <StepShell
                        n={3} question="نرخەکان" hint="نرخ بۆ هەر جۆرێک"
                        onNext={() => go(4)}
                      >
                        {step3Content}
                      </StepShell>

                      {/* ── Step 4: Stock ── */}
                      <Drawer open={step >= 4} onOpenChange={o => !o && setStep(3)} swipeDirection="left">
                        <DrawerContent className={W} dir="rtl">
                          <StepShell
                            n={4} question="ستۆک و سەرچاوە"
                            onNext={() => go(5)}
                          >
                            {step4Content}
                          </StepShell>

                          {/* ── Step 5: Dates ── */}
                          <Drawer open={step >= 5} onOpenChange={o => !o && setStep(4)} swipeDirection="left">
                            <DrawerContent className={W} dir="rtl">
                              <StepShell
                                n={5} question="بەروار و وێنە"
                                onNext={() => go(6)}
                              >
                                {step5Content}
                              </StepShell>

                              {/* ── Step 6: Review ── */}
                              <Drawer open={step >= 6} onOpenChange={o => !o && setStep(5)} swipeDirection="left">
                                <DrawerContent className={W} dir="rtl">
                                  <StepShell
                                    n={6} question={isEdit ? "پاشەکەوت بکە" : "زیاد بکە"}
                                    hint="زانیارییەکان پشتڕاست بکەرەوە"
                                    onNext={handleSubmit}
                                    nextLabel={isEdit ? "پاشەکەوتکردن" : "زیادکردن"}
                                    nextVariant="success"
                                  >
                                    {reviewContent}
                                  </StepShell>
                                </DrawerContent>
                              </Drawer>

                            </DrawerContent>
                          </Drawer>
                        </DrawerContent>
                      </Drawer>
                    </DrawerContent>
                  </Drawer>
                </DrawerContent>
              </Drawer>
            </DrawerContent>
          </Drawer>
        </DrawerContent>
      </Drawer>
    </>
  );
}
