"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Loader2, Upload, AlertCircle, Check, Globe, X, Sparkles, PenLine, Tag, RefreshCcw } from "lucide-react";
import { useData } from "@/lib/store";
import { COUNTRIES } from "@/lib/countries";
import flags from "react-phone-number-input/flags";
import type { Country as PhoneCountry } from "react-phone-number-input";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Product } from "@/lib/types";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface WizardFormData {
  name: string; barcode: string; category: string; company: string;
  prices: { typeId: string; typeName: string; amount: string }[];
  stock: string; lowStock: string; unitType: string;
  origin: string; supplier: string; issueDate: string; expiryDate: string;
  batchNumber: string; imageUrl: string; description: string;
  activeIngredients: string; dosageForm: string;
}
export interface Props {
  open: boolean; onClose: () => void; onSubmit: (data: WizardFormData) => void;
  initialProduct?: Partial<WizardFormData> & { id?: string };
  existingProducts?: Product[];
}
interface ScanResult { name:string;company:string;barcode:string;batchNumber:string;expiryDate:string;issueDate:string;category:string;activeIngredients:string;dosageForm:string;description:string; }

const UNIT_TYPES = ["قاپسوول","حەبە","شووشە","بلیستر","کارتۆن","فینجان","کیسە","ئامپوول","سرینج","پاکێت"];
const CATS = ["ئینتیبایۆتیک","دژەئاغر","وزەبەخش","قەڵبی","شەکر","پرشنگ","دژەهەستەسەختی","دژەفیرۆشێ","فیتامین","پاراستنی ستۆماک"];
const DRAFT_KEY = "product_wizard_draft";

function empty(): WizardFormData { return {name:"",barcode:"",category:"",company:"",prices:[],stock:"0",lowStock:"10",unitType:"حەبە",origin:"",supplier:"",issueDate:"",expiryDate:"",batchNumber:"",imageUrl:"",description:"",activeIngredients:"",dosageForm:""}; }
function saveDraft(f: WizardFormData) { try { localStorage.setItem(DRAFT_KEY,JSON.stringify(f)); } catch {} }
function loadDraft(): WizardFormData|null { try { const r=localStorage.getItem(DRAFT_KEY); return r?{...empty(),...JSON.parse(r)}:null; } catch { return null; } }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

// ─── The exact shadcn content-box class ──────────────────────────────────────
const BOX = "group-data-[swipe-axis=x]/drawer-popup:size-full group-data-[swipe-axis=y]/drawer-popup:w-full";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-[12px] text-muted-foreground">{label}</Label>{children}</div>;
}
function Pills({ options, value, onChange }: { options:string[]; value:string; onChange:(v:string)=>void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map(o=><button key={o} type="button" onClick={()=>onChange(o)} className={cn("px-3 py-1.5 rounded-full text-[12px] border transition-all",value===o?"bg-foreground text-background border-foreground font-semibold":"border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>{o}</button>)}</div>;
}

// ─── Country picker ───────────────────────────────────────────────────────────
function KFlag({title}:{title?:string}){return(<svg viewBox="0 0 513 342" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">{title&&<title>{title}</title>}<g clipPath="url(#kc)"><path d="M0 0H513V342H0z" fill="white"/><path d="M0 0H513V114H0z" fill="#ED2024"/><path d="M0 228H513V342H0z" fill="#278E43"/><path d="M256.5 85.5 263 129 282 89 275 133 305 100 286 140 324 118 294 150 337 140 298 162 342 165 299 175 340 191 297 187 331 215 290 198 315 235 281 207 294 249 269 213 269 257 257 215 244 257 244 213 219 249 232 207 198 235 223 198 182 214 217 187 173 191 214 162 176 140 219 150 189 118 227 140 208 100 238 133 231 89 250 129z" fill="#FEBD11"/></g><defs><clipPath id="kc"><rect width="513" height="342" fill="white"/></clipPath></defs></svg>);}
function CFlag({code,size=16}:{code:string;size?:number}){if(code==="KRD")return <span className="inline-flex items-center justify-center overflow-hidden rounded-[3px] [&_svg]:size-full!" style={{width:size,height:size*0.75}}><KFlag title="Kurdistan"/></span>;const F=flags[code as PhoneCountry];if(F)return <span className="inline-flex items-center justify-center overflow-hidden rounded-[3px] [&_svg:not([class*=size-])]:size-full!" style={{width:size,height:size*0.75}}><F title={code}/></span>;return <span>🏳️</span>;}
function CountryPicker({value,onChange}:{value:string;onChange:(v:string)=>void}){const[open,setOpen]=useState(false);const sel=COUNTRIES.find(c=>c.nameEn===value||c.name===value);return(<Popover open={open} onOpenChange={setOpen}><PopoverTrigger className="inline-flex w-full h-10 items-center justify-between rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted transition-colors"><span className="flex items-center gap-2">{sel?<><CFlag code={sel.code} size={18}/><span>{sel.name}</span></>:<><Globe size={13} className="text-muted-foreground"/><span className="text-muted-foreground">ووڵات هەڵبژێرە…</span></>}</span></PopoverTrigger><PopoverContent className="w-72 p-0" align="start"><Command><CommandInput placeholder="گەڕان…"/><CommandList><CommandEmpty>نەدۆزرایەوە</CommandEmpty><CommandGroup><ScrollArea className="h-56">{COUNTRIES.map(c=>(<CommandItem key={c.code} value={`${c.nameEn} ${c.name} ${c.code}`} onSelect={()=>{onChange(c.nameEn);setOpen(false);}} className="cursor-pointer gap-2"><CFlag code={c.code} size={18}/><span className="flex-1 text-sm">{c.name}</span>{sel?.code===c.code&&<Check size={12} className="text-primary"/>}</CommandItem>))}</ScrollArea></CommandGroup></CommandList></Command></PopoverContent></Popover>);}

// ─── ReviewContent ────────────────────────────────────────────────────────────
function ReviewContent({form}:{form:WizardFormData}){
  const rows=([["ناو",form.name],["کۆمپانیا",form.company],["جۆر",form.category],["بارکۆد",form.barcode],["ستۆک",form.stock?`${form.stock} ${form.unitType}`:""],["ووڵات",form.origin],["دابینکەر",form.supplier],["بەسەرچوون",form.expiryDate],["باچ",form.batchNumber]] as [string,string][]).filter(([,v])=>!!v);
  const prices=form.prices.filter(p=>p.amount);
  return(<div className="space-y-4">
    {form.imageUrl?(<div className="flex gap-3 items-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={form.imageUrl} alt="" className="size-14 rounded-2xl object-cover border shrink-0" onError={e=>(e.currentTarget.style.display="none")}/><div><p className="font-bold text-[15px]">{form.name}</p>{form.company&&<p className="text-[12px] text-muted-foreground">{form.company}</p>}</div></div>):(<p className="font-bold text-[16px]">{form.name}</p>)}
    {rows.length>0&&<div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">{rows.map(([l,v])=><div key={l} className="flex items-center gap-3 px-4 py-2.5"><span className="text-[11px] text-muted-foreground w-20 shrink-0">{l}</span><span className="text-[13px] font-medium flex-1 text-right">{v}</span></div>)}</div>}
    {prices.length>0&&<div className="rounded-2xl border border-border divide-y divide-border/60 overflow-hidden"><div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/30">نرخ</div>{prices.map(p=><div key={p.typeId} className="flex items-center gap-3 px-4 py-2.5"><span className="text-[12px] text-muted-foreground flex-1">{p.typeName}</span><span className="text-[13px] font-bold">{Number(p.amount).toLocaleString()} دینار</span></div>)}</div>}
  </div>);
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AddProductWizard({open,onClose,onSubmit,initialProduct,existingProducts=[]}: Props) {
  const {priceTypes,addPriceType} = useData();
  const isMobile = useIsMobile();
  // In RTL: "left" = start-0 = RIGHT edge. "right" = end-0 = LEFT edge.
  const sw = isMobile ? "down" : "left";
  // Non-mobile: float drawer with gap from edges + round all corners
  const dcStyle = isMobile ? undefined : { "--drawer-inset": "8px" } as React.CSSProperties;
  const dcCls   = isMobile ? "" : "rounded-xl";

  const [form,setForm]           = useState<WizardFormData>(empty);
  const [draftBanner,setDraft]   = useState(false);
  const [dupOpen,setDupOpen]     = useState(false);
  const [scanPhase,setScanPhase] = useState<"capture"|"scanning"|"missing"|"review">("capture");
  const [scanError,setScanError] = useState("");
  const [missingF,setMissingF]   = useState<string[]>([]);
  const [npt,setNpt]             = useState(""); // new price type name
  const [cameraOn,setCameraOn]   = useState(false);
  const imgRef    = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const upd = useCallback((k:keyof WizardFormData,v:WizardFormData[keyof WizardFormData])=>setForm(f=>({...f,[k]:v})),[]);
  const isEdit = !!initialProduct?.id;

  useEffect(()=>{
    if(!open) return;
    if(initialProduct){setForm({...empty(),name:initialProduct.name??"",barcode:initialProduct.barcode??"",category:initialProduct.category??"",company:initialProduct.company??"",prices:(initialProduct.prices??[]).map(p=>({...p,amount:String((p as {amount:number|string}).amount??"")})),stock:String(initialProduct.stock??0),lowStock:String(initialProduct.lowStock??10),unitType:initialProduct.unitType??"حەبە",origin:initialProduct.origin??"",supplier:initialProduct.supplier??"",issueDate:initialProduct.issueDate??"",expiryDate:initialProduct.expiryDate??"",batchNumber:initialProduct.batchNumber??"",imageUrl:initialProduct.imageUrl??"",description:initialProduct.description??"",activeIngredients:initialProduct.activeIngredients??"",dosageForm:initialProduct.dosageForm??""});return;}
    const d=loadDraft(); if(d?.name){setForm(d);setDraft(true);}else setForm(empty());
    setScanPhase("capture");setScanError("");setCameraOn(false);
  },[open,initialProduct]);

  useEffect(()=>{if(priceTypes.length&&!form.prices.length)upd("prices",priceTypes.map(pt=>({typeId:pt.id,typeName:pt.name,amount:""})));},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [priceTypes]);

  const stopCam=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCameraOn(false);},[]);
  const startCam=useCallback(async()=>{try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});streamRef.current=s;if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play();}setCameraOn(true);}catch{setScanError("دەسترسی کامێرا ڕەتکرایەوە");}},[]);
  useEffect(()=>()=>stopCam(),[stopCam]);

  const captureCam=()=>{if(!videoRef.current||!canvasRef.current)return;const v=videoRef.current;const c=canvasRef.current;c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d")?.drawImage(v,0,0);c.toBlob(b=>{if(!b)return;stopCam();runScan(new File([b],"cap.jpg",{type:"image/jpeg"}));},"image/jpeg",0.85);};
  const runScan=async(file:File)=>{setScanPhase("scanning");setScanError("");try{const b64=await new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=e=>res((e.target?.result as string).split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});const resp=await fetch("/api/scan-product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64:b64,mimeType:file.type})});if(!resp.ok)throw new Error("fail");const data:ScanResult=await resp.json();(["name","company","barcode","batchNumber","expiryDate","issueDate","category","activeIngredients","dosageForm","description"] as (keyof ScanResult)[]).forEach(k=>{if(data[k])upd(k as keyof WizardFormData,data[k]);});const mf=["name","expiryDate","batchNumber"].filter(k=>!data[k as keyof ScanResult]);setMissingF(mf);setScanPhase(mf.length?"missing":"review");}catch{setScanError("هەڵەیەک ڕووی دا.");setScanPhase("capture");}};
  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;if(imgRef.current)imgRef.current.value="";runScan(f);};

  const isDup=(f:WizardFormData)=>!isEdit&&existingProducts.some(p=>p.name.trim().toLowerCase()===f.name.trim().toLowerCase()||(f.barcode&&p.barcode&&f.barcode.trim()===p.barcode.trim()));
  const doSubmit=()=>{clearDraft();setDraft(false);onSubmit(form);setForm(empty());setScanPhase("capture");onClose();};
  const handleSubmit=()=>{if(isDup(form)){setDupOpen(true);return;}doSubmit();};
  const addPriceRow=useCallback(()=>{const name=npt.trim();if(!name||form.prices.some(p=>p.typeName.toLowerCase()===name.toLowerCase())){setNpt("");return;}upd("prices",[...form.prices,{typeId:`tmp_${Date.now()}`,typeName:name,amount:""}]);addPriceType(name);setNpt("");},[npt,form.prices,upd,addPriceType]);

  const missingOk=missingF.every(k=>!!(form[k as keyof WizardFormData]));
  const canStep2=form.name.trim().length>0;
  const canStep3=form.category.trim().length>0;
  const canScanNext=(scanPhase==="review")||(scanPhase==="missing"&&missingOk);

  // Price rows (shared between auto+manual)
  // NOTE: called as {priceRows()} not <PriceRows/> — avoids remount on every render
  const priceRows=()=>(<>{form.prices.map((p,i)=>(<div key={p.typeId} className="flex items-center gap-2"><span className="text-[13px] font-medium flex-1 truncate">{p.typeName}</span><Input type="number" min="0" placeholder="0" value={p.amount} onChange={e=>{const n=[...form.prices];n[i]={...n[i],amount:e.target.value};upd("prices",n);}} className="w-28 h-10 rounded-xl text-left font-mono text-[13px]"/><span className="text-[11px] text-muted-foreground">دینار</span><button type="button" onClick={()=>upd("prices",form.prices.filter((_,j)=>j!==i))} className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X size={13}/></button></div>))}</>);

  // Add price type — NESTED drawer (used in step 3 of both flows)
  // NOTE: called as {addTypeDrawer()} not <AddTypeDrawer/> — avoids remount on every render
  const addTypeDrawer=()=>(<Drawer showSwipeHandle={isMobile} swipeDirection={sw}><DrawerTrigger render={<button type="button" className="flex items-center gap-2 text-[12px] text-primary font-medium hover:text-primary/80 transition-colors"><Tag size={12}/>جۆری نرخی نوێ زیاد بکە</button>}/><DrawerContent style={dcStyle} className={dcCls}><DrawerHeader><DrawerTitle dir="rtl">جۆری نرخی نوێ</DrawerTitle><DrawerDescription dir="rtl">ئەم جۆرە دەچێت بۆ هەموو بەرهەمەکان</DrawerDescription></DrawerHeader><div className="flex-1 p-4"><div className={cn(BOX,"space-y-3")} dir="rtl"><Input autoFocus placeholder="نمونە: خەتە، کۆمەڵی…" value={npt} onChange={e=>setNpt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&npt.trim())addPriceRow();}} className="h-10 rounded-xl text-[13px]"/></div></div><DrawerFooter><DrawerClose render={<Button onClick={addPriceRow} disabled={!npt.trim()}><Tag size={13} className="me-1.5"/>زیادکردن</Button>}/><DrawerClose render={<Button variant="outline">داخستن</Button>}/></DrawerFooter></DrawerContent></Drawer>);

  return (
    <>
      <style>{`@keyframes scanLine{0%,100%{transform:translateY(-20px);opacity:.3;}50%{transform:translateY(20px);opacity:1;}}`}</style>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>

      {/* ═══════════════════════ ROOT DRAWER ═══════════════════════ */}
      <Drawer open={open} onOpenChange={v=>{if(!v&&!isEdit)saveDraft(form);if(!v){onClose();setScanPhase("capture");stopCam();}}} swipeDirection={sw} showSwipeHandle={isMobile}>
        <DrawerContent style={dcStyle} className={dcCls}>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle dir="rtl">زیادکردنی بەرهەم</DrawerTitle>
                <DrawerDescription dir="rtl">شێوازی زیادکردن هەڵبژێرە</DrawerDescription>
              </div>
              <DrawerClose render={<button className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><X size={14}/></button>}/>
            </div>
          </DrawerHeader>
          <div className="flex-1 p-4">
            <div className={cn(BOX,"space-y-3")} dir="rtl">
              {draftBanner&&(<div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 text-[12px]"><RefreshCcw size={12} className="text-primary shrink-0"/><span className="flex-1 text-primary font-medium">دراف پێشووەکەت گێڕاوەتەوە</span><button className="text-muted-foreground text-[11px] underline" onClick={()=>{setForm(empty());setDraft(false);clearDraft();}}>بیسڕەوە</button></div>)}

              {/* ── AUTO ── */}
              <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                <DrawerTrigger render={<button className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/3 transition-all text-start"><div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Sparkles size={20} className="text-primary"/></div><div><p className="font-semibold text-sm">ئۆتۆماتیک — AI</p><p className="text-[12px] text-muted-foreground mt-0.5">وێنەی دەرمان بکێش، AI زانیاری دادەمەزرێنێت</p></div></button>}/>
                <DrawerContent style={dcStyle} className={dcCls}>
                  <DrawerHeader><DrawerTitle dir="rtl">01 — وێنەی دەرمان</DrawerTitle><DrawerDescription dir="rtl">وێنە بکێش یان ئەپلۆود بکە</DrawerDescription></DrawerHeader>
                  <div className="flex-1 p-4"><div className={cn(BOX,"space-y-4")} dir="rtl">
                    {scanError&&<div className="flex gap-2 text-[12px] text-destructive bg-destructive/10 rounded-xl px-4 py-3"><AlertCircle size={13} className="shrink-0 mt-0.5"/>{scanError}</div>}
                    {scanPhase==="capture"&&!cameraOn&&(<div className="grid grid-cols-2 gap-3"><button type="button" onClick={startCam} className="flex flex-col items-center gap-2.5 py-8 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/3 transition-all text-[12px] font-medium text-muted-foreground hover:text-foreground"><Camera size={22}/>کامێرا</button><button type="button" onClick={()=>imgRef.current?.click()} className="flex flex-col items-center gap-2.5 py-8 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/3 transition-all text-[12px] font-medium text-muted-foreground hover:text-foreground"><Upload size={22}/>ئەپلۆود</button></div>)}
                    {cameraOn&&(<div className="space-y-2"><div className="relative rounded-2xl overflow-hidden bg-black aspect-video w-full border border-border"><video ref={videoRef} className="w-full h-full object-cover" muted playsInline/><div className="absolute inset-x-6 h-px bg-gradient-to-r from-transparent via-primary to-transparent" style={{animation:"scanLine 1.8s ease-in-out infinite",top:"50%"}}/><button onClick={stopCam} className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white flex items-center justify-center"><X size={11}/></button></div><canvas ref={canvasRef} className="hidden"/><Button className="w-full h-11" onClick={captureCam}><Camera size={15} className="me-2"/>وێنەی بگرە</Button></div>)}
                    {scanPhase==="scanning"&&(<div className="flex flex-col items-center justify-center py-12 gap-4"><div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary"/></div><p className="text-sm font-medium">AI دادەمەزرێنێت…</p></div>)}
                    {scanPhase==="missing"&&(<div className="space-y-4"><div className="flex gap-2 text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl px-4 py-3"><AlertCircle size={13} className="shrink-0 mt-0.5"/>ئەم زانیارییانە کەمن — پڕبکەرەوە</div>{missingF.map(k=><div key={k} className="space-y-1.5"><Label className="text-[12px] text-muted-foreground">{k==="name"?"ناوی بەرهەم":k==="expiryDate"?"بەرواری بەسەرچوون":"ژمارەی باچ"} *</Label><Input value={String(form[k as keyof WizardFormData]??"")} onChange={e=>upd(k as keyof WizardFormData,e.target.value)} className="h-10 rounded-xl"/></div>)}</div>)}
                    {(scanPhase==="review"||(scanPhase==="missing"&&missingOk))&&(<div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 divide-y divide-emerald-100 overflow-hidden text-[12px]">{[["ناو",form.name],["کۆمپانیا",form.company],["باچ",form.batchNumber],["بەسەرچوون",form.expiryDate]].filter(([,v])=>!!v).map(([l,v])=><div key={l} className="flex items-center gap-3 px-3 py-2"><Check size={11} className="text-emerald-500 shrink-0"/><span className="text-muted-foreground w-20 shrink-0">{l}</span><span className="truncate font-medium">{v}</span></div>)}</div>)}
                  </div></div>
                  <DrawerFooter>
                    <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                      <DrawerTrigger render={<Button disabled={!canScanNext}>02 — نرخ و ستۆک</Button>}/>
                      <DrawerContent style={dcStyle} className={dcCls}>
                        <DrawerHeader><DrawerTitle dir="rtl">02 — نرخ و ستۆک</DrawerTitle><DrawerDescription dir="rtl">نرخی هەر جۆرێک و بڕی ستۆک</DrawerDescription></DrawerHeader>
                        <div className="flex-1 p-4"><div className={cn(BOX,"space-y-3")} dir="rtl">
                          {priceRows()}{addTypeDrawer()}
                          <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
                            <Field label="بڕی ستۆک"><Input type="number" min="0" value={form.stock} onChange={e=>upd("stock",e.target.value)} className="h-10 rounded-xl"/></Field>
                            <Field label="یەکە"><select value={form.unitType} onChange={e=>upd("unitType",e.target.value)} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[13px]">{UNIT_TYPES.map(u=><option key={u}>{u}</option>)}</select></Field>
                          </div>
                        </div></div>
                        <DrawerFooter>
                          <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                            <DrawerTrigger render={<Button>03 — پشتڕاستکردنەوە</Button>}/>
                            <DrawerContent style={dcStyle} className={dcCls}>
                              <DrawerHeader><DrawerTitle dir="rtl">03 — پشتڕاستکردنەوە</DrawerTitle><DrawerDescription dir="rtl">زانیاری بەرهەم بپشتڕاست بکەرەوە</DrawerDescription></DrawerHeader>
                              <div className="flex-1 p-4"><div className={cn(BOX)} dir="rtl"><ReviewContent form={form}/></div></div>
                              <DrawerFooter><Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold gap-1.5" onClick={handleSubmit}><Check size={14}/>زیادکردن</Button><DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/></DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                          <DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                    <DrawerClose render={<Button variant="outline">داخستن</Button>}/>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              {/* ── MANUAL: 6 NESTED DRAWERS ── */}
              <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                <DrawerTrigger render={<button className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-foreground/30 hover:bg-muted/30 transition-all text-start"><div className="size-11 rounded-xl bg-muted flex items-center justify-center shrink-0"><PenLine size={20} className="text-foreground/70"/></div><div><p className="font-semibold text-sm">دەستی</p><p className="text-[12px] text-muted-foreground mt-0.5">گامبەگام زانیاری بنووسە</p></div></button>}/>
                {/* STEP 1 */}
                <DrawerContent style={dcStyle} className={dcCls}>
                  <DrawerHeader><DrawerTitle dir="rtl">01 — ناوی بەرهەم</DrawerTitle><DrawerDescription dir="rtl">ناو، کۆمپانیا و بارکۆد</DrawerDescription></DrawerHeader>
                  <div className="flex-1 p-4"><div className={cn(BOX,"space-y-3")} dir="rtl">
                    <Field label="ناوی بەرهەم *"><Input placeholder="Amoxicillin 500mg" value={form.name} onChange={e=>upd("name",e.target.value)} className="h-10 rounded-xl" autoFocus/></Field>
                    <Field label="کۆمپانیا"><Input placeholder="Pfizer…" value={form.company} onChange={e=>upd("company",e.target.value)} className="h-10 rounded-xl"/></Field>
                    <Field label="ژمارەی بارکۆد"><Input placeholder="EAN-13 / UPC" value={form.barcode} onChange={e=>upd("barcode",e.target.value)} className="h-10 rounded-xl font-mono"/></Field>
                    <Field label="وەسف"><Textarea placeholder="وەسفی کورت…" value={form.description} onChange={e=>upd("description",e.target.value)} className="resize-none rounded-xl text-[13px]" rows={2}/></Field>
                  </div></div>
                  <DrawerFooter>
                    <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                      <DrawerTrigger render={<Button disabled={!canStep2}>02 — جۆر ←</Button>}/>
                      {/* STEP 2 */}
                      <DrawerContent style={dcStyle} className={dcCls}>
                        <DrawerHeader><DrawerTitle dir="rtl">02 — جۆری بەرهەم</DrawerTitle><DrawerDescription dir="rtl">جۆر و مادەی چالاک</DrawerDescription></DrawerHeader>
                        <div className="flex-1 p-4"><div className={cn(BOX,"space-y-4")} dir="rtl">
                          <Pills options={CATS} value={form.category} onChange={v=>upd("category",v)}/>
                          <Field label="جۆری تایبەت"><Input placeholder="جۆری دیکە…" value={CATS.includes(form.category)?"":form.category} onChange={e=>upd("category",e.target.value)} className="h-10 rounded-xl"/></Field>
                          <Field label="مادەی چالاک"><Textarea rows={2} value={form.activeIngredients} onChange={e=>upd("activeIngredients",e.target.value)} className="resize-none rounded-xl text-[13px]"/></Field>
                        </div></div>
                        <DrawerFooter>
                          <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                            <DrawerTrigger render={<Button disabled={!canStep3}>03 — نرخ ←</Button>}/>
                            {/* STEP 3 */}
                            <DrawerContent style={dcStyle} className={dcCls}>
                              <DrawerHeader><DrawerTitle dir="rtl">03 — نرخەکان</DrawerTitle><DrawerDescription dir="rtl">نرخی هەر جۆرێک دابنێ</DrawerDescription></DrawerHeader>
                              <div className="flex-1 p-4"><div className={cn(BOX,"space-y-3")} dir="rtl">
                                <p className="text-[11px] text-muted-foreground">جۆرەکان هاوبەشن — نرخی هەر بەرهەمێک جیاوازە</p>
                                {priceRows()}{addTypeDrawer()}
                              </div></div>
                              <DrawerFooter>
                                <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                                  <DrawerTrigger render={<Button>04 — ستۆک ←</Button>}/>
                                  {/* STEP 4 */}
                                  <DrawerContent style={dcStyle} className={dcCls}>
                                    <DrawerHeader><DrawerTitle dir="rtl">04 — ستۆک و سەرچاوە</DrawerTitle><DrawerDescription dir="rtl">بڕی ستۆک، یەکە و دابینکەر</DrawerDescription></DrawerHeader>
                                    <div className="flex-1 p-4"><div className={cn(BOX,"space-y-3")} dir="rtl">
                                      <div className="grid grid-cols-2 gap-3">
                                        <Field label="بڕی ستۆک"><Input type="number" min="0" value={form.stock} onChange={e=>upd("stock",e.target.value)} className="h-10 rounded-xl"/></Field>
                                        <Field label="ستۆکی کەم"><Input type="number" min="0" value={form.lowStock} onChange={e=>upd("lowStock",e.target.value)} className="h-10 rounded-xl"/></Field>
                                      </div>
                                      <Field label="یەکەی ژماردن"><div className="flex flex-wrap gap-1.5">{UNIT_TYPES.map(u=><button key={u} type="button" onClick={()=>upd("unitType",u)} className={cn("px-3 py-1.5 rounded-full text-[12px] border transition-all",form.unitType===u?"bg-foreground text-background border-foreground font-semibold":"border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>{u}</button>)}</div></Field>
                                      <Field label="دابینکەر"><Input placeholder="ناوی دابینکەر…" value={form.supplier} onChange={e=>upd("supplier",e.target.value)} className="h-10 rounded-xl"/></Field>
                                      <Field label="ووڵاتی بەرهەمهێنان"><CountryPicker value={form.origin} onChange={v=>upd("origin",v)}/></Field>
                                    </div></div>
                                    <DrawerFooter>
                                      <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                                        <DrawerTrigger render={<Button>05 — بەروار ←</Button>}/>
                                        {/* STEP 5 */}
                                        <DrawerContent style={dcStyle} className={dcCls}>
                                          <DrawerHeader><DrawerTitle dir="rtl">05 — بەروار و وێنە</DrawerTitle><DrawerDescription dir="rtl">بەرواری بەرهەمهێنان و بەسەرچوون</DrawerDescription></DrawerHeader>
                                          <div className="flex-1 p-4"><div className={cn(BOX,"space-y-4")} dir="rtl">
                                            <div className="grid grid-cols-2 gap-3">
                                              <Field label="بەرهەمهێنان"><Input type="date" value={form.issueDate} onChange={e=>upd("issueDate",e.target.value)} className="h-10 rounded-xl"/></Field>
                                              <Field label="بەسەرچوون"><Input type="date" value={form.expiryDate} onChange={e=>upd("expiryDate",e.target.value)} className="h-10 rounded-xl"/></Field>
                                            </div>
                                            <Field label="ژمارەی باچ"><Input placeholder="BATCH-001" value={form.batchNumber} onChange={e=>upd("batchNumber",e.target.value)} className="h-10 rounded-xl font-mono"/></Field>
                                            <Field label="وێنەی بەرهەم">
                                              <div>
                                                <input type="file" accept="image/*" id="wiz-img" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>upd("imageUrl",(ev.target?.result as string)??"");r.readAsDataURL(f);(e.target as HTMLInputElement).value="";}}/>
                                                {form.imageUrl?(<div className="relative">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={form.imageUrl} alt="" className="w-full h-36 rounded-2xl object-cover border border-border"/><button onClick={()=>upd("imageUrl","")} className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X size={13}/></button></div>):(<label htmlFor="wiz-img" className="w-full h-28 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/3 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all cursor-pointer"><Upload size={20}/><span className="text-[12px]">کلیک بکە بۆ ئەپلۆودکردنی وێنە</span></label>)}
                                              </div>
                                            </Field>
                                          </div></div>
                                          <DrawerFooter>
                                            <Drawer showSwipeHandle={isMobile} swipeDirection={sw}>
                                              <DrawerTrigger render={<Button>06 — پشتڕاستکردنەوە ←</Button>}/>
                                              {/* STEP 6 – REVIEW */}
                                              <DrawerContent style={dcStyle} className={dcCls}>
                                                <DrawerHeader><DrawerTitle dir="rtl">06 — پشتڕاستکردنەوە</DrawerTitle><DrawerDescription dir="rtl">زانیاری بەرهەم بپشتڕاست بکەرەوە</DrawerDescription></DrawerHeader>
                                                <div className="flex-1 p-4"><div className={cn(BOX)} dir="rtl"><ReviewContent form={form}/></div></div>
                                                <DrawerFooter><Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold gap-1.5" onClick={handleSubmit}><Check size={14}/>{isEdit?"پاشەکەوتکردن":"زیادکردن"}</Button><DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/></DrawerFooter>
                                              </DrawerContent>
                                            </Drawer>
                                            <DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/>
                                          </DrawerFooter>
                                        </DrawerContent>
                                      </Drawer>
                                      <DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/>
                                    </DrawerFooter>
                                  </DrawerContent>
                                </Drawer>
                                <DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                          <DrawerClose render={<Button variant="outline">گەڕانەوە</Button>}/>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                    <DrawerClose render={<Button variant="outline">داخستن</Button>}/>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>بەرهەم پێشتر تۆمارکراوە</AlertDialogTitle><AlertDialogDescription>بەرهەمێک بە هەمان ناو یان بارکۆد پێشتر لە سیستەمدایە. دڵنیایت؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel><AlertDialogAction onClick={doSubmit}>زیادکردن بەهەر حاڵ</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
