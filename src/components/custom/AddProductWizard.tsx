"use client";
import {
  useState, useRef, useEffect, useCallback,
  type CSSProperties,
} from "react";
import {
  Camera, ScanLine, QrCode, Loader2, Zap, Upload,
  AlertCircle, Check, Globe, ChevronLeft, ChevronRight, Tag, X,
  Sparkles, PenLine, ArrowRight, ImageIcon,
} from "lucide-react";
import { useData } from "@/lib/store";
import { COUNTRIES } from "@/lib/countries";

// UI
import { Drawer, DrawerContent }   from "@/components/ui/drawer";
import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { Label }      from "@/components/ui/label";
import { Textarea }   from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox }   from "@/components/ui/checkbox";
import { Badge }      from "@/components/ui/badge";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Stepper (nav only — content managed via {step===N && ...})
import {
  Stepper, StepperNav, StepperItem, StepperTrigger,
  StepperIndicator, StepperSeparator,
} from "@/components/reui/stepper";

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
export interface Props {
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
const UNIT_TYPES = ["قاپسوول","حەبە","شووشە","بلیستر","کارتۆن","فینجان","کیسە","ئامپوول","سرینج","پاکێت"];
const CATEGORIES = ["ئینتیبایۆتیک","دژەئاغر","وزەبەخش","قەڵبی","شەکر","پرشنگ","دژەهەستەسەختی","دژەفیرۆشێ","فیتامین","پاراستنی ستۆماک"];
const MANUAL_STEPS = [
  { n: 1, q: "ناوی بەرهەم چییە؟"  },
  { n: 2, q: "چ جۆرە؟"             },
  { n: 3, q: "نرخەکان"              },
  { n: 4, q: "ستۆک و سەرچاوە"       },
  { n: 5, q: "بەروار و وێنە"         },
  { n: 6, q: "پشتڕاست بکەرەوە"      },
];
// Inline style to override the drawer's default width CSS var
const DRAWER_WIDTH: CSSProperties = { "--drawer-content-width": "min(94vw, 30rem)" } as CSSProperties;

function empty(): WizardFormData {
  return {
    name:"", sku:"", category:"", company:"",
    prices:[], stock:"0", lowStock:"10", unitType:"حەبە",
    origin:"", supplier:"", issueDate:"", expiryDate:"", batchNumber:"",
    isSample:false, imageUrl:"", barcode:"", description:"",
    activeIngredients:"", dosageForm:"",
  };
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      {value ? (
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-36 rounded-2xl object-cover border border-border" />
          <button onClick={() => onChange("")}
            className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
            <X size={13} />
          </button>
          <button onClick={() => ref.current?.click()}
            className="absolute bottom-2 right-2 h-7 px-2.5 rounded-full bg-black/50 text-white flex items-center gap-1.5 text-[11px] hover:bg-black/70 transition-colors">
            <Upload size={11} /> تازەکردنەوە
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="w-full h-28 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/3 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
        >
          <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[12px]">کلیک بکە بۆ ئەپلۆودکردنی وێنە</span>
          <span className="text-[10px] text-muted-foreground/60">PNG, JPG, WEBP</span>
        </button>
      )}
    </div>
  );
}

// ─── Pill selector ────────────────────────────────────────────────────────────
function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-full text-[12px] border transition-all",
            value === o
              ? "bg-foreground text-background border-foreground font-semibold"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted/50"
          )}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── Country Picker ───────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const sel = COUNTRIES.find(c => c.nameEn === value || c.name === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex w-full h-10 items-center justify-between rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted transition-colors">
        <span className="flex items-center gap-2">
          <Globe size={13} className="text-muted-foreground" />
          {sel ? `${sel.flag} ${sel.nameEn}` : <span className="text-muted-foreground">ووڵات هەڵبژێرە…</span>}
        </span>
        <ChevronRight size={12} className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="گەڕان…" />
          <CommandList>
            <CommandEmpty>نەدۆزرایەوە</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-56">
                {COUNTRIES.map(c => (
                  <CommandItem key={c.nameEn} value={`${c.nameEn} ${c.name}`}
                    onSelect={() => { onChange(c.nameEn); setOpen(false); }} className="cursor-pointer">
                    <span className="mr-2">{c.flag}</span>
                    <span className="flex-1 text-sm">{c.nameEn}</span>
                    {sel?.nameEn === c.nameEn && <Check size={12} className="text-primary" />}
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

// ─── Camera Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }: { onDetected: (c: string) => void; onClose: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const [err, setErr] = useState("");

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    (async () => {
      if (!("BarcodeDetector" in window)) { setErr("بمرۆڤنەمای سکان پشتگیری ناکات."); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const det = new (window as any).BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e","code_39"] });
        const loop = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try { const c = await det.detect(videoRef.current); if (c.length) { stop(); onDetected(c[0].rawValue); return; } } catch {/* */}
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch { setErr("دەسترسی کامێرا ڕەتکرایەوە."); }
    })();
    return () => stop();
  }, [stop, onDetected]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video w-full border border-border">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      {!err && (
        <div className="absolute inset-x-6 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ animation: "scanLine 1.8s ease-in-out infinite", top: "50%" }} />
      )}
      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 text-white text-center px-4 text-sm">
          <AlertCircle size={18} className="text-red-400" />{err}
        </div>
      )}
      <button onClick={() => { stop(); onClose(); }}
        className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white flex items-center justify-center">
        <X size={11} />
      </button>
    </div>
  );
}

async function imgToBarcode(file: File): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  const bmp = await createImageBitmap(file);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const det = new (window as any).BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","upc_a","upc_e"] });
  const c = await det.detect(bmp);
  return c[0]?.rawValue ?? null;
}

// ─── Scan Panel ───────────────────────────────────────────────────────────────
function ScanPanel({ form, upd, onFound }: {
  form: WizardFormData;
  upd: (k: keyof WizardFormData, v: WizardFormData[keyof WizardFormData]) => void;
  onFound?: () => void;
}) {
  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual]     = useState("");
  const [looking, setLooking]   = useState(false);
  const [result, setResult]     = useState<ScanResult | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLooking(true); setCameraOn(false);
    try {
      const res  = await fetch(`/api/lookup-product?barcode=${encodeURIComponent(code.trim())}`);
      const data: ScanResult = await res.json();
      setResult(data);
      upd("barcode", code.trim());
      if (data.found) {
        if (data.name || data.nameEn) upd("name",  data.name || data.nameEn || "");
        if (data.manufacturer)        upd("company",           data.manufacturer);
        if (data.category)            upd("category",          data.category);
        if (data.origin)              upd("origin",            data.origin);
        if (data.imageUrl)            upd("imageUrl",          data.imageUrl);
        if (data.description)         upd("description",       data.description);
        if (data.activeIngredients)   upd("activeIngredients", data.activeIngredients);
        onFound?.();
      }
    } catch { setResult({ found: false, barcode: code }); }
    finally  { setLooking(false); }
  }, [upd, onFound]);

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLooking(true);
    try {
      const code = await imgToBarcode(file);
      if (code) await lookup(code);
      else { setResult({ found: false, barcode: "نەدۆزرایەوە" }); setLooking(false); }
    } catch { setLooking(false); }
    if (imgRef.current) imgRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "کامێرا", icon: Camera, onClick: () => setCameraOn(p => !p), active: cameraOn },
          { label: "وێنە",   icon: Upload, onClick: () => imgRef.current?.click(), active: false  },
          { label: "دەستی",  icon: ScanLine, onClick: () => {},                   active: false  },
        ].map(({ label, icon: Icon, onClick, active }) => (
          <button key={label} type="button" onClick={onClick}
            className={cn(
              "flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 text-[12px] font-medium transition-all",
              active ? "border-foreground bg-foreground/5" : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted/40"
            )}>
            <Icon size={17} />{label}
          </button>
        ))}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />

      {cameraOn && <BarcodeScanner onDetected={c => lookup(c)} onClose={() => setCameraOn(false)} />}

      <div className="flex gap-2">
        <Input placeholder="بارکۆد بنووسە… EAN-13 / QR"
          value={manual} onChange={e => setManual(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup(manual)}
          className="flex-1 h-10 rounded-xl text-[13px]" />
        <Button variant="outline" className="h-10 rounded-xl px-3" onClick={() => lookup(manual)} disabled={looking || !manual.trim()}>
          {looking ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
        </Button>
      </div>

      {looking && !result && (
        <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> گەڕان لە بانکی داتا…
        </p>
      )}

      {result && (
        <div className={cn("rounded-2xl px-4 py-3 text-[13px] border",
          result.found
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800")}>
          {result.found ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Check size={12} /> دۆزرایەوە
              </div>
              <p className="font-medium">{form.name}</p>
              {form.company && <p className="text-[11px] text-muted-foreground">{form.company}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle size={12} /> بارکۆدەکە نەدۆزرایەوە
            </div>
          )}
        </div>
      )}

      {form.barcode && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
          <QrCode size={11} />
          <span className="font-mono flex-1 truncate">{form.barcode}</span>
          {result?.found && <Badge variant="secondary" className="text-[9px] py-0">ئۆتۆماتیک</Badge>}
        </div>
      )}
    </div>
  );
}

// ─── Review content ───────────────────────────────────────────────────────────
function ReviewContent({ form }: { form: WizardFormData }) {
  const rows = ([
    ["ناو",       form.name],
    ["کۆمپانیا",  form.company],
    ["جۆر",       form.category],
    ["SKU",       form.sku],
    ["بارکۆد",    form.barcode],
    ["ستۆک",      form.stock ? `${form.stock} ${form.unitType}` : ""],
    ["ووڵات",     form.origin],
    ["دابینکەر",  form.supplier],
    ["بەسەرچوون", form.expiryDate],
    ["باچ",       form.batchNumber],
  ] as [string, string][]).filter(([, v]) => !!v);

  const prices = form.prices.filter(p => p.amount);

  return (
    <div className="space-y-4">
      {form.imageUrl && (
        <div className="flex gap-3 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.imageUrl} alt={form.name}
            className="size-14 rounded-2xl object-cover border shrink-0"
            onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <p className="font-bold text-[15px]">{form.name}</p>
            {form.company && <p className="text-[12px] text-muted-foreground">{form.company}</p>}
          </div>
        </div>
      )}
      {!form.imageUrl && (
        <div>
          <p className="font-bold text-[16px]">{form.name}</p>
          {form.company && <p className="text-[12px] text-muted-foreground">{form.company}</p>}
        </div>
      )}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">{label}</span>
              <span className="text-[13px] font-medium flex-1 text-right">{value}</span>
            </div>
          ))}
        </div>
      )}
      {prices.length > 0 && (
        <div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/30">نرخ</div>
          {prices.map(p => (
            <div key={p.typeId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[12px] text-muted-foreground flex-1">{p.typeName}</span>
              <span className="text-[13px] font-bold">{Number(p.amount).toLocaleString()} دینار</span>
            </div>
          ))}
        </div>
      )}
      {form.isSample && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Check size={12} className="text-primary" /> سامپڵەیە
        </div>
      )}
    </div>
  );
}

// ─── AUTO MODE ────────────────────────────────────────────────────────────────
function AutoMode({ form, upd, onClose, onDone, onSwitchManual, priceTypes }: {
  form: WizardFormData;
  upd: (k: keyof WizardFormData, v: WizardFormData[keyof WizardFormData]) => void;
  onClose: () => void; onDone: () => void; onSwitchManual: () => void;
  priceTypes: { id: string; name: string }[];
}) {
  const [phase, setPhase] = useState<"scan"|"quick"|"review">("scan");

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
        {phase !== "scan" && (
          <button onClick={() => setPhase(p => p === "review" ? "quick" : "scan")}
            className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
            <ArrowRight size={15} />
          </button>
        )}
        <div className="flex-1">
          <p className="font-semibold text-sm">ئۆتۆماتیک — بارکۆد</p>
          <p className="text-[11px] text-muted-foreground">
            {phase === "scan" ? "بارکۆد بسکێنە" : phase === "quick" ? "زانیاری زیاتر" : "پشتڕاست بکەرەوە"}
          </p>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-5 space-y-5">
          {/* ── Phase 1: Scan ── */}
          {phase === "scan" && (
            <>
              <ScanPanel form={form} upd={upd} onFound={() => setPhase("quick")} />
              <div className="text-center pt-1">
                <button onClick={onSwitchManual}
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                  بچۆ بۆ دەستی داخڵکردن
                </button>
              </div>
            </>
          )}

          {/* ── Phase 2: Quick fill ── */}
          {phase === "quick" && (
            <div className="space-y-5">
              {/* Found summary */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="size-12 rounded-xl object-cover border shrink-0"
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{form.name || "—"}</p>
                  {form.company && <p className="text-[12px] text-muted-foreground">{form.company}</p>}
                  {form.category && <p className="text-[11px] text-muted-foreground">{form.category}</p>}
                </div>
              </div>

              {/* Prices */}
              {priceTypes.length > 0 && form.prices.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">نرخەکان</p>
                  {form.prices.map((p, i) => (
                    <div key={p.typeId} className="flex items-center gap-3">
                      <span className="text-[13px] flex-1 truncate">{p.typeName}</span>
                      <Input type="number" min="0" placeholder="0" value={p.amount}
                        onChange={e => {
                          const next = [...form.prices];
                          next[i] = { ...next[i], amount: e.target.value };
                          upd("prices", next);
                        }}
                        className="w-24 h-9 rounded-xl text-left font-mono text-[12px]" />
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">دینار</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[12px] text-muted-foreground">بڕی ستۆک</Label>
                  <Input type="number" min="0" value={form.stock}
                    onChange={e => upd("stock", e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] text-muted-foreground">یەکە</Label>
                  <select value={form.unitType} onChange={e => upd("unitType", e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[13px]">
                    {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Phase 3: Review ── */}
          {phase === "review" && <ReviewContent form={form} />}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 pb-6 pt-3 border-t border-border shrink-0 space-y-2">
        {phase === "scan" && form.barcode && (
          <Button className="w-full h-10" onClick={() => setPhase("quick")}>
            دواتر <ChevronLeft size={13} className="opacity-70" />
          </Button>
        )}
        {phase === "quick" && (
          <Button className="w-full h-10" onClick={() => setPhase("review")}>
            پشتڕاست بکەرەوە <ChevronLeft size={13} className="opacity-70" />
          </Button>
        )}
        {phase === "review" && (
          <Button className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold gap-1.5" onClick={onDone}>
            <Check size={14} /> زیادکردن
          </Button>
        )}
        {phase !== "scan" && (
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-[12px]" onClick={onSwitchManual}>
            دەستکاری زیاتر لە دەستی
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── MANUAL MODE ──────────────────────────────────────────────────────────────
// KEY FIX: Stepper wraps ONLY the nav (for visual indicator + click-to-go-back).
// Step content uses plain {step === N && ...} — NO StepperPanel/StepperContent
// which would call useStepper() outside the Stepper context and crash.
function ManualMode({ form, upd, onClose, onSwitchAuto, onSubmit, isEdit }: {
  form: WizardFormData;
  upd: (k: keyof WizardFormData, v: WizardFormData[keyof WizardFormData]) => void;
  onClose: () => void; onSwitchAuto: () => void; onSubmit: () => void;
  isEdit: boolean;
}) {
  const [step, setStep] = useState(1);

  const canNext = (): boolean => {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) return form.category.trim().length > 0;
    return true;
  };

  const goTo = (n: number) => { if (n <= step) setStep(n); };
  const next  = () => { if (canNext()) setStep(s => Math.min(s + 1, 6)); };
  const prev  = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="flex flex-col h-full" dir="rtl">

      {/* ── Header with stepper nav ── */}
      <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm">{isEdit ? "دەستکاری بەرهەم" : "بەرهەمی نوێ"}</p>
          <button onClick={onClose} className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X size={14} />
          </button>
        </div>

        {/*
          ── Stepper nav ──
          dir="ltr" forces step bubbles to render left→right (1 2 3 4 5 6)
          regardless of the parent RTL context, so progress reads correctly.
          Completed steps are clickable (disabled={n > step} blocks future only).
        */}
        {/* dir="ltr" wrapper: StepperNav doesn't forward the dir prop, but
            CSS direction is inherited — so wrapping forces the nav's flex-row
            to flow left→right (steps 1,2,3,4,5,6) even inside the RTL drawer */}
        <div dir="ltr" className="w-full">
        <Stepper value={step} onValueChange={goTo}>
          <StepperNav>
            {MANUAL_STEPS.map((s, i) => (
              <StepperItem key={s.n} step={s.n} disabled={s.n > step}>
                <StepperTrigger>
                  <StepperIndicator className={cn(
                    "size-7 text-[11px] font-semibold border-2 transition-all rounded-full",
                    "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "data-[state=completed]:border-primary data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground",
                    "data-[state=inactive]:border-border data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground",
                  )}>
                    {s.n < step ? <Check size={11} /> : s.n}
                  </StepperIndicator>
                </StepperTrigger>
                {i < MANUAL_STEPS.length - 1 && (
                  <StepperSeparator className={s.n < step ? "bg-primary" : "bg-border"} />
                )}
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>
        </div>{/* end dir="ltr" */}
      </div>{/* end header */}

      {/* ── Step heading ── */}
      <div className="px-5 pt-4 pb-1 shrink-0">
        <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/40 mb-1">
          {String(step).padStart(2,"0")} / 06
        </p>
        <h2 className="text-[1.15rem] font-bold">{MANUAL_STEPS[step - 1]?.q}</h2>
      </div>

      {/* ── Step content (plain conditionals — no Stepper context needed) ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-4 space-y-4">

          {/* Step 1 — Name */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">ناوی بەرهەم *</Label>
                <Input placeholder="نمونە: Amoxicillin 500mg" value={form.name}
                  onChange={e => upd("name", e.target.value)} className="h-10 rounded-xl" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">کۆمپانیا</Label>
                <Input placeholder="Pfizer, AstraZeneca…" value={form.company}
                  onChange={e => upd("company", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">SKU</Label>
                <Input placeholder="MED-001" value={form.sku}
                  onChange={e => upd("sku", e.target.value)} className="h-10 rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">وەسف</Label>
                <Textarea placeholder="وەسفی کورت…" value={form.description}
                  onChange={e => upd("description", e.target.value)}
                  className="resize-none rounded-xl text-[13px]" rows={2} />
              </div>
              {form.barcode && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                  <QrCode size={11} /><span className="font-mono truncate">{form.barcode}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Category */}
          {step === 2 && (
            <div className="space-y-4">
              <Pills options={CATEGORIES} value={form.category} onChange={v => upd("category", v)} />
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">جۆری تایبەت</Label>
                <Input placeholder="جۆری دیکە بنووسە…"
                  value={CATEGORIES.includes(form.category) ? "" : form.category}
                  onChange={e => upd("category", e.target.value)} className="h-10 rounded-xl" />
              </div>
              {form.activeIngredients && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">مادەی چالاک</Label>
                  <Textarea rows={2} value={form.activeIngredients}
                    onChange={e => upd("activeIngredients", e.target.value)}
                    className="resize-none rounded-xl text-[13px]" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="sample" checked={form.isSample} onCheckedChange={v => upd("isSample", !!v)} />
                <Label htmlFor="sample" className="cursor-pointer text-[13px]">سامپڵەیە</Label>
              </div>
            </div>
          )}

          {/* Step 3 — Pricing */}
          {step === 3 && (
            <div className="space-y-3">
              {form.prices.length === 0 ? (
                <p className="text-center py-8 text-[13px] text-muted-foreground">
                  جۆری نرخ لە رێکخستنەکان دروست بکە
                </p>
              ) : (
                form.prices.map((p, i) => (
                  <div key={p.typeId} className="flex items-center gap-3">
                    <span className="text-[13px] font-medium flex-1 truncate">{p.typeName}</span>
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
                ))
              )}
            </div>
          )}

          {/* Step 4 — Stock & Origin */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">بڕی ستۆک</Label>
                  <Input type="number" min="0" value={form.stock}
                    onChange={e => upd("stock", e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">ستۆکی کەم</Label>
                  <Input type="number" min="0" value={form.lowStock}
                    onChange={e => upd("lowStock", e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">یەکەی ژماردن</Label>
                <Pills options={UNIT_TYPES} value={form.unitType} onChange={v => upd("unitType", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">دابینکەر</Label>
                <Input placeholder="ناوی دابینکەر…" value={form.supplier}
                  onChange={e => upd("supplier", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">ووڵاتی بەرهەمهێنان</Label>
                <CountryPicker value={form.origin} onChange={v => upd("origin", v)} />
              </div>
            </div>
          )}

          {/* Step 5 — Dates & Image (upload, not URL) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">بەرهەمهێنان</Label>
                  <Input type="date" value={form.issueDate}
                    onChange={e => upd("issueDate", e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">بەسەرچوون</Label>
                  <Input type="date" value={form.expiryDate}
                    onChange={e => upd("expiryDate", e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">ژمارەی باچ</Label>
                <Input placeholder="BATCH-2024-001" value={form.batchNumber}
                  onChange={e => upd("batchNumber", e.target.value)} className="h-10 rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">وێنەی بەرهەم</Label>
                <ImageUpload value={form.imageUrl} onChange={v => upd("imageUrl", v)} />
              </div>
            </div>
          )}

          {/* Step 6 — Review */}
          {step === 6 && <ReviewContent form={form} />}

        </div>
      </ScrollArea>

      {/* ── Footer navigation ── */}
      <div className="px-5 pb-6 pt-3 border-t border-border shrink-0">
        {step < 6 ? (
          <div className="flex gap-2">
            {/* Back: ArrowRight is correct for RTL (points toward start) */}
            <Button variant="outline" className="h-10 rounded-xl px-3 shrink-0" onClick={prev} disabled={step === 1}>
              <ArrowRight size={15} />
            </Button>
            <Button className="flex-1 h-10 rounded-xl gap-1.5 font-semibold" onClick={next} disabled={!canNext()}>
              دواتر
              <ChevronLeft size={13} className="opacity-70" />
            </Button>
          </div>
        ) : (
          <Button
            className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold gap-1.5"
            onClick={onSubmit}>
            <Check size={14} /> {isEdit ? "پاشەکەوتکردن" : "زیادکردن"}
          </Button>
        )}
        {!isEdit && step === 1 && (
          <button onClick={onSwitchAuto}
            className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground text-center transition-colors underline underline-offset-2">
            بارکۆد هەیە؟ ئۆتۆماتیک بسکێنە
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mode Selection ───────────────────────────────────────────────────────────
function ModeSelect({ onSelect, onClose }: { onSelect: (m: "auto"|"manual") => void; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <p className="font-semibold text-sm">زیادکردنی بەرهەم</p>
        <button onClick={onClose} className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-5 pb-10 gap-3">
        <p className="text-[13px] text-muted-foreground text-center mb-1">چۆن دەتەوێت بەرهەم زیاد بکەیت؟</p>
        <button onClick={() => onSelect("auto")}
          className="group flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/3 transition-all text-start">
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">ئۆتۆماتیک</p>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">بارکۆد بسکێنە — زانیاری بە خۆی پڕ دەکرێتەوە</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">📷 کامێرا · 🖼 وێنە · ✏️ دەستی باکۆد</p>
          </div>
        </button>
        <button onClick={() => onSelect("manual")}
          className="group flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-foreground/30 hover:bg-muted/30 transition-all text-start">
          <div className="size-11 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/60 transition-colors">
            <PenLine size={20} className="text-foreground/70" />
          </div>
          <div>
            <p className="font-semibold text-sm">دەستی</p>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">زانیاری هەرکێشەیەک خۆت بنووسە گامبەگام</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">ناو · جۆر · نرخ · ستۆک · بەروار</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function AddProductWizard({ open, onClose, onSubmit, initialProduct }: Props) {
  const { priceTypes } = useData();
  const [mode, setMode] = useState<"auto"|"manual"|null>(null);
  const [form, setForm] = useState<WizardFormData>(empty);
  const isEdit = !!initialProduct?.id;

  const upd = useCallback((k: keyof WizardFormData, v: WizardFormData[keyof WizardFormData]) =>
    setForm(f => ({ ...f, [k]: v })), []);

  // Init on open
  useEffect(() => {
    if (open) {
      setMode(isEdit ? "manual" : null);
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
    }
  }, [open, initialProduct, isEdit]);

  // Seed price rows from price types
  useEffect(() => {
    if (priceTypes.length && !form.prices.length) {
      setForm(f => ({
        ...f,
        prices: priceTypes.map(pt => ({ typeId: pt.id, typeName: pt.name, amount: "" })),
      }));
    }
  }, [priceTypes, form.prices.length]);

  const handleClose  = () => { setMode(null); setForm(empty()); onClose(); };
  const handleSubmit = () => { onSubmit(form); handleClose(); };

  return (
    <>
      <style>{`@keyframes scanLine{0%,100%{transform:translateY(-22px);opacity:.3;}50%{transform:translateY(22px);opacity:1;}}`}</style>
      <Drawer open={open} onOpenChange={v => !v && handleClose()} swipeDirection="left">
        <DrawerContent style={DRAWER_WIDTH}>
          {mode === null && <ModeSelect onSelect={setMode} onClose={handleClose} />}
          {mode === "auto" && (
            <AutoMode form={form} upd={upd} onClose={handleClose} onDone={handleSubmit}
              onSwitchManual={() => setMode("manual")} priceTypes={priceTypes} />
          )}
          {mode === "manual" && (
            <ManualMode form={form} upd={upd} onClose={handleClose}
              onSwitchAuto={() => setMode("auto")} onSubmit={handleSubmit} isEdit={isEdit} />
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
