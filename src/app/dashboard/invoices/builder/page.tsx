"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, ArrowRight, Save, Eye, EyeOff, GripVertical, Settings2, Plus,
  Trash2, Type, Users, Table2, Calculator, Gift, StickyNote,
  MessageSquare, QrCode, PenLine, AlignCenter, Minus, ChevronDown,
  Palette, Check, Loader2, X, Star, AlignRight, AlignLeft,
  Copy, Wand2, Wrench, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useData } from "@/lib/store";
import { DEFAULT_TEMPLATE_OPTIONS } from "@/lib/types";
import { PrintDocument } from "@/components/print/PrintDocument";
import { SignaturePadComponent } from "@/components/custom/SignaturePad";
import { PRESET_TEMPLATES } from "@/lib/preset-templates";
import type { InvoiceTemplate, InvoiceBlockConfig, TemplateOptions } from "@/lib/types";
import type { PrintOrder, PrintClient, PrintSettings } from "@/components/print/PrintDocument";

// ── Sample data for live preview ────────────────────────────
const SAMPLE_ORDER: PrintOrder = {
  id: "preview", orderNumber: "ORD-2025-001", clientId: "c1",
  clientName: "دەرمانخانەی هەوار", repName: "ئەحمەد کەریم",
  warehouseName: "کۆگای سەنتەر", status: "PAID",
  totalAmount: 1_250_000, notes: "تێبینیەک بۆ تاقیکردنەوە",
  createdAt: new Date().toISOString(),
  items: [
    { productName: "پاراسیتامۆل ٥٠٠mg", quantity: 24, bonusQty: 2, unitPrice: 15000, bonusPct: 5 },
    { productName: "ئامۆکسیسیلین ٢٥٠mg", quantity: 12, bonusQty: 1, unitPrice: 22000, bonusPct: 5 },
    { productName: "ئیبووپرۆفین ٤٠٠mg",  quantity: 18, bonusQty: 0, unitPrice: 18000, bonusPct: 0 },
  ],
};
const SAMPLE_CLIENT: PrintClient = { name:"دەرمانخانەی هەوار", phone:"0750 123 4567", city:"سلێمانی", type:"PHARMACY" };

// Simple inline QR placeholder (1x1 transparent png as data url for preview)
const SAMPLE_QR = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
  '<rect width="120" height="120" fill="#fff" rx="6"/>' +
  '<rect x="10" y="10" width="30" height="30" fill="#000" rx="3"/>' +
  '<rect x="80" y="10" width="30" height="30" fill="#000" rx="3"/>' +
  '<rect x="10" y="80" width="30" height="30" fill="#000" rx="3"/>' +
  '<rect x="15" y="15" width="20" height="20" fill="#fff" rx="2"/>' +
  '<rect x="85" y="15" width="20" height="20" fill="#fff" rx="2"/>' +
  '<rect x="15" y="85" width="20" height="20" fill="#fff" rx="2"/>' +
  '<rect x="20" y="20" width="10" height="10" fill="#000" rx="1"/>' +
  '<rect x="90" y="20" width="10" height="10" fill="#000" rx="1"/>' +
  '<rect x="20" y="90" width="10" height="10" fill="#000" rx="1"/>' +
  '<rect x="50" y="50" width="20" height="20" fill="#000" rx="2"/>' +
  '<rect x="55" y="55" width="10" height="10" fill="#fff" rx="1"/>' +
  '</svg>'
);

type DocType = InvoiceTemplate["docType"];
const DOC_TYPES: { id: DocType; label: string; color: string }[] = [
  { id:"invoice",  label:"پسووڵە",          color:"#4263EB" },
  { id:"receipt",  label:"وەسڵ",            color:"#2B8A3E" },
  { id:"delivery", label:"وەرقەی گەیاندن",  color:"#F47B35" },
  { id:"quote",    label:"نرخنامە",          color:"#7C3AED" },
];

const DEFAULT_BLOCKS: InvoiceBlockConfig[] = [
  { id:"header",    label:"سەرپەڕە",           visible:true,  type:"builtin", headerLayout:"classic", showLogo:true, showNameEn:true, showContact:true, showStatus:true },
  { id:"parties",   label:"کڕیار و نوێنەر",    visible:true,  type:"builtin", showPhone:true, showCity:true, showRep:true, showWarehouse:true, partiesLayout:"side" },
  { id:"items",     label:"خشتەی بەرهەمەکان",  visible:true,  type:"builtin", showRowNumbers:true, showUnitPrice:true, stripedRows:true, tableStyle:"standard" },
  { id:"summary",   label:"کۆی گشتی",           visible:true,  type:"builtin", summaryStyle:"card", summaryPosition:"right" },
  { id:"bonus",     label:"شیکاری بۆنەس",       visible:false, type:"builtin" },
  { id:"note",      label:"تێبینی",              visible:true,  type:"builtin" },
  { id:"terms",     label:"مەرجەکان",            visible:false, type:"builtin" },
  { id:"qr",        label:"QR کۆد",              visible:true,  type:"builtin", qrSize:120, qrPosition:"right" },
  { id:"signature", label:"واژوو",               visible:false, type:"builtin", signatureCount:2, showSignatureLine:true },
  { id:"footer",    label:"پێپەڕە",              visible:true,  type:"builtin", footerStyle:"centered" },
];

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  header: <Type size={13}/>, parties: <Users size={13}/>, items: <Table2 size={13}/>,
  summary: <Calculator size={13}/>, bonus: <Gift size={13}/>, note: <StickyNote size={13}/>,
  terms: <MessageSquare size={13}/>, qr: <QrCode size={13}/>, signature: <PenLine size={13}/>,
  footer: <AlignCenter size={13}/>, divider: <Minus size={13}/>, custom: <StickyNote size={13}/>,
};

// ════════════════════════════════════════════════════════════
// EASY BUILDER — Step-by-step wizard
// ════════════════════════════════════════════════════════════

type WizardStep = "docType" | "header" | "table" | "summary" | "signature" | "footer" | "name";

const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: "docType",   label: "جۆری بەڵگە" },
  { key: "header",    label: "سەرپەڕە" },
  { key: "table",     label: "خشتەی بەرهەمەکان" },
  { key: "summary",   label: "کۆی گشتی" },
  { key: "signature", label: "واژوو" },
  { key: "footer",    label: "پێپەڕە" },
  { key: "name",      label: "ناو و پاشەکەوتکردن" },
];

type VariantCard = { id: string; label: string; description: string };

const HEADER_VARIANTS: VariantCard[] = [
  { id: "classic",  label: "کلاسیک", description: "لۆگۆ لە ڕاستەوە، ناوی بەڵگە لە چەپەوە" },
  { id: "centered", label: "ناوەندی", description: "هەموو شتەکان لە ناوەندی" },
  { id: "minimal",  label: "سادە", description: "بێ لۆگۆ، ناوی کۆمپانیا و بەڵگە تەنها" },
  { id: "banner",   label: "بانەر", description: "پشتەوەی ڕەنگاوڕەنگ بە نووسینی سپی" },
];

const TABLE_VARIANTS: VariantCard[] = [
  { id: "standard", label: "ستاندارد", description: "سەرەتای ڕەنگین، ڕیزی جۆراوجۆر" },
  { id: "bordered", label: "سنووردار", description: "هەموو خانەکان سنووریان هەیە" },
  { id: "minimal",  label: "سادە", description: "بێ سنوور، هێڵی نەرم لە خوارەوە" },
  { id: "compact",  label: "پەستاو", description: "بچووکتر، بۆ A5 و ثيرمال" },
];

const SUMMARY_VARIANTS: VariantCard[] = [
  { id: "card",   label: "کارت", description: "سندوقی ئامادە بە کۆی ڕەنگین" },
  { id: "inline", label: "هێڵی", description: "ڕیزەکان بێ سندوق" },
  { id: "large",  label: "گەورە", description: "کۆی گشتی بە ژمارەی گەورە" },
];

const SIG_VARIANTS: VariantCard[] = [
  { id: "none",  label: "بێ واژوو", description: "بلۆکی واژوو نییە" },
  { id: "lines", label: "هێڵ", description: "هێڵی واژوو بە ناو" },
  { id: "drawn", label: "وێنەی واژوو", description: "واژووی کەشراو/بارکراو" },
];

const FOOTER_VARIANTS: VariantCard[] = [
  { id: "centered", label: "ناوەندی", description: "ناوی کۆمپانیا لە ناوەندی" },
  { id: "minimal",  label: "سادە", description: "تەنها سوپاس و ناو" },
  { id: "full",     label: "تەواو", description: "ناونیشان و ئیمەیڵ و تەلەفۆن" },
];

function VariantCardButton({ v, selected, accent, onSelect }: {
  v: VariantCard; selected: boolean; accent: string; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-4 rounded-xl text-right border-2 transition-all duration-150 cursor-pointer w-full ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20"
      }`}
    >
      <div className="text-sm font-bold mb-0.5">{v.label}</div>
      <div className="text-xs text-muted-foreground">{v.description}</div>
      {selected && <div className="mt-2"><Badge style={{ background: accent, color:"#fff" }} className="text-[10px]">هەڵبژێردراو</Badge></div>}
    </button>
  );
}

function EasyBuilder({
  onFinish, onSwitchAdvanced, settings,
}: {
  onFinish: (template: Omit<InvoiceTemplate, "id" | "createdAt">) => void;
  onSwitchAdvanced: (blocks: InvoiceBlockConfig[], opts: TemplateOptions, docType: DocType) => void;
  settings: PrintSettings;
}) {
  const [step, setStep] = useState<WizardStep>("docType");
  const [docType, setDocType] = useState<DocType>("invoice");
  const [headerLayout, setHeaderLayout] = useState("classic");
  const [tableStyle, setTableStyle] = useState("standard");
  const [summaryStyle, setSummaryStyle] = useState("card");
  const [sigStyle, setSigStyle] = useState("lines");
  const [footerStyle, setFooterStyle] = useState("centered");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const accent = DOC_TYPES.find(d => d.id === docType)?.color || "#4263EB";
  const stepIdx = WIZARD_STEPS.findIndex(s => s.key === step);
  const isLast = step === "name";
  const isFirst = step === "docType";

  const buildBlocks = (): InvoiceBlockConfig[] => {
    const blocks = [...DEFAULT_BLOCKS];
    // Header
    const hdr = blocks.find(b => b.id === "header")!;
    hdr.headerLayout = headerLayout as InvoiceBlockConfig["headerLayout"];
    hdr.showLogo = headerLayout !== "minimal";

    // Table
    const tbl = blocks.find(b => b.id === "items")!;
    tbl.tableStyle = tableStyle as InvoiceBlockConfig["tableStyle"];
    tbl.stripedRows = tableStyle === "standard";

    // Summary
    const sum = blocks.find(b => b.id === "summary")!;
    sum.summaryStyle = summaryStyle as InvoiceBlockConfig["summaryStyle"];

    // Signature
    const sig = blocks.find(b => b.id === "signature")!;
    if (sigStyle === "none") {
      sig.visible = false;
    } else {
      sig.visible = true;
      sig.showSignatureLine = sigStyle === "lines";
    }

    // Footer
    const ftr = blocks.find(b => b.id === "footer")!;
    ftr.footerStyle = footerStyle as InvoiceBlockConfig["footerStyle"];

    return blocks;
  };

  const buildTemplate = (): Omit<InvoiceTemplate, "id" | "createdAt"> => ({
    name: name || "داڕێژەی نوێ",
    docType,
    blocks: buildBlocks(),
    showBonusCol: true,
    defaultDiscount: 0,
    defaultNote: "",
    defaultTerms: "",
    options: { ...DEFAULT_TEMPLATE_OPTIONS, primaryColor: accent },
    isDefault,
  });

  // Live preview template
  const previewTemplate: InvoiceTemplate = {
    id: "wizard-preview", createdAt: "", ...buildTemplate(),
  };

  const previewSettings: PrintSettings = {
    name: settings.name || "دەوا فارما",
    nameEn: settings.nameEn || "",
    phone: settings.phone || "",
    email: settings.email || "",
    address: settings.address || "",
  };

  const goNext = () => {
    const idx = stepIdx + 1;
    if (idx < WIZARD_STEPS.length) setStep(WIZARD_STEPS[idx].key);
  };
  const goPrev = () => {
    const idx = stepIdx - 1;
    if (idx >= 0) setStep(WIZARD_STEPS[idx].key);
  };

  const handleSave = async () => {
    setSaving(true);
    await onFinish(buildTemplate());
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.history.back()}>
          <ArrowLeft size={16}/>
        </Button>
        <Separator orientation="vertical" className="h-5"/>
        <Wand2 size={16} style={{ color: accent }}/>
        <span className="text-sm font-semibold">دروستکردنی ئاسان</span>
        <div className="flex-1"/>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
          onClick={() => onSwitchAdvanced(buildBlocks(), { ...DEFAULT_TEMPLATE_OPTIONS, primaryColor: accent }, docType)}>
          <Wrench size={12}/> گۆڕین بۆ پێشکەوتوو
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border bg-background/80 shrink-0">
        <div className="flex items-center gap-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIdx ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          هەنگاوی {stepIdx + 1} لە {WIZARD_STEPS.length} — {WIZARD_STEPS[stepIdx].label}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — options */}
        <div className="w-[360px] shrink-0 border-l border-border bg-background overflow-y-auto p-5 space-y-4">
          {step === "docType" && (
            <>
              <h2 className="text-base font-bold">جۆری بەڵگە هەڵبژێرە</h2>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map(d => (
                  <VariantCardButton key={d.id} v={{ id: d.id, label: d.label, description: "" }}
                    selected={docType === d.id} accent={d.color}
                    onSelect={() => setDocType(d.id)} />
                ))}
              </div>
            </>
          )}
          {step === "header" && (
            <>
              <h2 className="text-base font-bold">شێوەی سەرپەڕە هەڵبژێرە</h2>
              <div className="grid gap-2">
                {HEADER_VARIANTS.map(v => (
                  <VariantCardButton key={v.id} v={v} selected={headerLayout === v.id}
                    accent={accent} onSelect={() => setHeaderLayout(v.id)} />
                ))}
              </div>
            </>
          )}
          {step === "table" && (
            <>
              <h2 className="text-base font-bold">شێوەی خشتە هەڵبژێرە</h2>
              <div className="grid gap-2">
                {TABLE_VARIANTS.map(v => (
                  <VariantCardButton key={v.id} v={v} selected={tableStyle === v.id}
                    accent={accent} onSelect={() => setTableStyle(v.id)} />
                ))}
              </div>
            </>
          )}
          {step === "summary" && (
            <>
              <h2 className="text-base font-bold">شێوەی کۆی گشتی هەڵبژێرە</h2>
              <div className="grid gap-2">
                {SUMMARY_VARIANTS.map(v => (
                  <VariantCardButton key={v.id} v={v} selected={summaryStyle === v.id}
                    accent={accent} onSelect={() => setSummaryStyle(v.id)} />
                ))}
              </div>
            </>
          )}
          {step === "signature" && (
            <>
              <h2 className="text-base font-bold">شێوەی واژوو هەڵبژێرە</h2>
              <div className="grid gap-2">
                {SIG_VARIANTS.map(v => (
                  <VariantCardButton key={v.id} v={v} selected={sigStyle === v.id}
                    accent={accent} onSelect={() => setSigStyle(v.id)} />
                ))}
              </div>
            </>
          )}
          {step === "footer" && (
            <>
              <h2 className="text-base font-bold">شێوەی پێپەڕە هەڵبژێرە</h2>
              <div className="grid gap-2">
                {FOOTER_VARIANTS.map(v => (
                  <VariantCardButton key={v.id} v={v} selected={footerStyle === v.id}
                    accent={accent} onSelect={() => setFooterStyle(v.id)} />
                ))}
              </div>
            </>
          )}
          {step === "name" && (
            <>
              <h2 className="text-base font-bold">ناوی داڕێژە</h2>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ناوی داڕێژە بنووسە" className="h-10"/>
              <div className="flex items-center justify-between mt-3">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Star size={12} className="text-amber-500" /> داڕێژەی پێشبینی
                </Label>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} className="scale-[0.85]"/>
              </div>
            </>
          )}

          {/* Nav buttons */}
          <div className="flex gap-2 pt-4">
            {!isFirst && (
              <Button variant="outline" onClick={goPrev} className="flex-1 gap-1.5">
                <ArrowRight size={14}/> پێشتر
              </Button>
            )}
            {isLast ? (
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1.5"
                style={{ background: accent }}>
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                پاشەکەوتکردن
              </Button>
            ) : (
              <Button onClick={goNext} className="flex-1 gap-1.5" style={{ background: accent }}>
                دواتر <ChevronLeft size={14}/>
              </Button>
            )}
          </div>
        </div>

        {/* Right — Live preview */}
        <div className="flex-1 bg-muted/50 overflow-auto flex items-start justify-center p-8">
          <div style={{ transform: "scale(0.6)", transformOrigin: "top center" }}>
            <div className="shadow-xl shadow-black/10 rounded-sm overflow-hidden ring-1 ring-black/5">
              <PrintDocument
                order={SAMPLE_ORDER}
                client={SAMPLE_CLIENT}
                settings={previewSettings}
                template={previewTemplate}
                qrDataUrl={SAMPLE_QR}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SORTABLE BLOCK CARD (for Advanced builder)
// ════════════════════════════════════════════════════════════

function SortableBlockCard({
  block, isSelected, isDragOverlay, accentColor, onSelect, onToggleVisibility, onDelete,
}: {
  block: InvoiceBlockConfig; isSelected: boolean; isDragOverlay?: boolean;
  accentColor: string; onSelect: () => void;
  onToggleVisibility: () => void; onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms cubic-bezier(0.23,1,0.32,1)",
        opacity: isDragging && !isDragOverlay ? 0.35 : 1,
        zIndex: isDragOverlay ? 100 : "auto",
      }}
      {...attributes}
    >
      <div
        onClick={onSelect}
        className={`rounded-[10px] overflow-hidden cursor-pointer transition-all duration-150 ${
          isSelected ? "ring-2 ring-primary/25 bg-primary/5" : "bg-background hover:bg-muted/50"
        } border ${isSelected ? "border-primary/40" : "border-border"}`}
        style={{
          boxShadow: isDragOverlay ? "0 16px 40px rgba(0,0,0,0.15)"
            : isSelected ? `0 0 0 2px ${accentColor}25` : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center px-2 py-1.5 gap-1.5">
          <Button variant="ghost" size="icon" className="size-6 cursor-grab shrink-0 text-muted-foreground"
            {...listeners} onClick={e => e.stopPropagation()}>
            <GripVertical size={13} />
          </Button>
          <div className="shrink-0" style={{ color: block.visible ? accentColor : undefined }}>
            {BLOCK_ICONS[block.id] || BLOCK_ICONS.custom}
          </div>
          <span className={`text-[11px] font-semibold truncate flex-1 ${block.visible ? "text-foreground" : "text-muted-foreground"}`}>
            {block.label}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className="size-6"
                  onClick={e => { e.stopPropagation(); onToggleVisibility(); }}
                  style={{ color: block.visible ? accentColor : undefined }} />
              }
            >
              {block.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{block.visible ? "شاردنەوە" : "پیشاندان"}</TooltipContent>
          </Tooltip>
          {onDelete && (
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 size={11}/>
            </Button>
          )}
          <div className={`size-1.5 rounded-full shrink-0 transition-colors ${isSelected ? "bg-primary" : ""}`} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BLOCK-SPECIFIC SETTINGS PANEL
// ════════════════════════════════════════════════════════════

function BlockSpecificSettings({ block, onUpdate, accentColor }: {
  block: InvoiceBlockConfig;
  onUpdate: (patch: Partial<InvoiceBlockConfig>) => void;
  accentColor: string;
}) {
  switch (block.id) {
    case "header":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی سەرپەڕە</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شێوە</Label>
            <ToggleGroup value={[block.headerLayout ?? "classic"]}
              onValueChange={v => { if (v.length) onUpdate({ headerLayout: v[0] as InvoiceBlockConfig["headerLayout"] }); }}
              className="grid grid-cols-2 gap-1.5">
              {HEADER_VARIANTS.map(h => (
                <ToggleGroupItem key={h.id} value={h.id} className="text-xs h-7">{h.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">پیشاندانی لۆگۆ</Label>
            <Switch checked={block.showLogo !== false} onCheckedChange={v => onUpdate({ showLogo: v })} className="scale-[0.8]"/>
          </div>
          {block.showLogo !== false && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">شوێنی لۆگۆ</Label>
              <ToggleGroup value={[block.logoPosition ?? "right"]}
                onValueChange={v => { if (v.length) onUpdate({ logoPosition: v[0] as "right" | "left" }); }}
                className="w-full">
                <ToggleGroupItem value="right" className="flex-1 h-7 text-xs">ڕاست</ToggleGroupItem>
                <ToggleGroupItem value="left" className="flex-1 h-7 text-xs">چەپ</ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs">ناوی ئینگلیزی</Label>
            <Switch checked={block.showNameEn !== false} onCheckedChange={v => onUpdate({ showNameEn: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">پەیوەندی</Label>
            <Switch checked={block.showContact !== false} onCheckedChange={v => onUpdate({ showContact: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">حاڵەت (پارەدراو/نەدراو)</Label>
            <Switch checked={block.showStatus !== false} onCheckedChange={v => onUpdate({ showStatus: v })} className="scale-[0.8]"/>
          </div>
        </div>
      );

    case "parties":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی کڕیار</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شێوە</Label>
            <ToggleGroup value={[block.partiesLayout ?? "side"]}
              onValueChange={v => { if (v.length) onUpdate({ partiesLayout: v[0] as "side" | "stacked" }); }}
              className="w-full">
              <ToggleGroupItem value="side" className="flex-1 h-7 text-xs">لاولا</ToggleGroupItem>
              <ToggleGroupItem value="stacked" className="flex-1 h-7 text-xs">سەرەوخوارەوە</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">تەلەفۆن</Label>
            <Switch checked={block.showPhone !== false} onCheckedChange={v => onUpdate({ showPhone: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">شار</Label>
            <Switch checked={block.showCity !== false} onCheckedChange={v => onUpdate({ showCity: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">نوێنەر</Label>
            <Switch checked={block.showRep !== false} onCheckedChange={v => onUpdate({ showRep: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">کۆگا</Label>
            <Switch checked={block.showWarehouse !== false} onCheckedChange={v => onUpdate({ showWarehouse: v })} className="scale-[0.8]"/>
          </div>
        </div>
      );

    case "items":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی خشتە</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شێوە</Label>
            <ToggleGroup value={[block.tableStyle ?? "standard"]}
              onValueChange={v => { if (v.length) onUpdate({ tableStyle: v[0] as InvoiceBlockConfig["tableStyle"] }); }}
              className="grid grid-cols-2 gap-1.5">
              {TABLE_VARIANTS.map(t => (
                <ToggleGroupItem key={t.id} value={t.id} className="text-xs h-7">{t.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">ژمارەی ڕیز</Label>
            <Switch checked={block.showRowNumbers !== false} onCheckedChange={v => onUpdate({ showRowNumbers: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">نرخی یەکە</Label>
            <Switch checked={block.showUnitPrice !== false} onCheckedChange={v => onUpdate({ showUnitPrice: v })} className="scale-[0.8]"/>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">ڕیزی جۆراوجۆر</Label>
            <Switch checked={block.stripedRows !== false} onCheckedChange={v => onUpdate({ stripedRows: v })} className="scale-[0.8]"/>
          </div>
        </div>
      );

    case "summary":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی کۆی گشتی</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شێوە</Label>
            <ToggleGroup value={[block.summaryStyle ?? "card"]}
              onValueChange={v => { if (v.length) onUpdate({ summaryStyle: v[0] as InvoiceBlockConfig["summaryStyle"] }); }}
              className="w-full">
              {SUMMARY_VARIANTS.map(s => (
                <ToggleGroupItem key={s.id} value={s.id} className="flex-1 h-7 text-xs">{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شوێن</Label>
            <ToggleGroup value={[block.summaryPosition ?? "right"]}
              onValueChange={v => { if (v.length) onUpdate({ summaryPosition: v[0] as "right" | "left" }); }}
              className="w-full">
              <ToggleGroupItem value="right" className="flex-1 h-7 text-xs">ڕاست</ToggleGroupItem>
              <ToggleGroupItem value="left" className="flex-1 h-7 text-xs">چەپ</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      );

    case "qr":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی QR</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">قەبارە ({block.qrSize ?? 120}px)</Label>
            <Slider value={[block.qrSize ?? 120]} min={60} max={200} step={10}
              onValueChange={v => onUpdate({ qrSize: typeof v === "number" ? v : Array.isArray(v) ? v[0] : v })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شوێن</Label>
            <ToggleGroup value={[block.qrPosition ?? "right"]}
              onValueChange={v => { if (v.length) onUpdate({ qrPosition: v[0] as "right" | "left" }); }}
              className="w-full">
              <ToggleGroupItem value="right" className="flex-1 h-7 text-xs">ڕاست</ToggleGroupItem>
              <ToggleGroupItem value="left" className="flex-1 h-7 text-xs">چەپ</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">دەقی QR</Label>
            <Input value={block.qrLabel ?? ""} onChange={e => onUpdate({ qrLabel: e.target.value || undefined })}
              className="h-8 text-xs" placeholder="ئەم QR کۆدە سکان بکە…"/>
          </div>
        </div>
      );

    case "signature":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی واژوو</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">ژمارەی واژوو ({block.signatureCount ?? 2})</Label>
            <Slider value={[block.signatureCount ?? 2]} min={1} max={4} step={1}
              onValueChange={v => onUpdate({ signatureCount: typeof v === "number" ? v : Array.isArray(v) ? v[0] : v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">هێڵی واژوو</Label>
            <Switch checked={block.showSignatureLine !== false} onCheckedChange={v => onUpdate({ showSignatureLine: v })} className="scale-[0.8]"/>
          </div>
          <Separator/>
          <SignaturePadComponent
            value={block.signatureUrl}
            onChange={url => onUpdate({ signatureUrl: url })}
            width={260} height={110}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">ناوی واژووەکان</Label>
            <Textarea
              value={(block.signatureLabels ?? []).join("\n")}
              onChange={e => onUpdate({ signatureLabels: e.target.value.split("\n").filter(Boolean) })}
              className="text-xs h-16 resize-none" placeholder={"واژووی فرۆشیار\nواژووی کڕیار"}/>
          </div>
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تایبەتمەندی پێپەڕە</Label>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">شێوە</Label>
            <ToggleGroup value={[block.footerStyle ?? "centered"]}
              onValueChange={v => { if (v.length) onUpdate({ footerStyle: v[0] as InvoiceBlockConfig["footerStyle"] }); }}
              className="w-full">
              {FOOTER_VARIANTS.map(f => (
                <ToggleGroupItem key={f.id} value={f.id} className="flex-1 h-7 text-xs">{f.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">دەقی تایبەت</Label>
            <Input value={block.footerText ?? ""} onChange={e => onUpdate({ footerText: e.target.value || undefined })}
              className="h-8 text-xs" placeholder="دەقی ئەختیاری…"/>
          </div>
        </div>
      );

    case "note":
    case "terms":
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{block.label}</Label>
          <Textarea value={block.customText ?? ""} onChange={e => onUpdate({ customText: e.target.value })}
            className="text-xs h-24 resize-none" placeholder="دەقت لێرە بنووسە…"/>
        </div>
      );

    default:
      if (block.type === "custom") {
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">دەقی ئازاد</Label>
            <Textarea value={block.customText ?? ""} onChange={e => onUpdate({ customText: e.target.value })}
              className="text-xs h-24 resize-none" placeholder="دەقت لێرە بنووسە…"/>
          </div>
        );
      }
      return null;
  }
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE — routes between Easy and Advanced
// ════════════════════════════════════════════════════════════
export default function TemplateBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const presetName = searchParams.get("preset");

  const { invoiceTemplates, addTemplate, updateTemplate, settings } = useData();

  const existing = editId ? invoiceTemplates.find(t => t.id === editId) : null;
  const preset = presetName ? PRESET_TEMPLATES.find(p => p.name === presetName) : null;
  const source = existing ?? preset ?? null;

  // Mode: easy (wizard) or advanced (3-panel)
  const [mode, setMode] = useState<"choose" | "easy" | "advanced">(editId ? "advanced" : "choose");

  // Advanced builder state
  const [name, setName]           = useState(source?.name ?? "داڕێژەی نوێ");
  const [docType, setDocType]     = useState<DocType>(source?.docType ?? "invoice");
  const [blocks, setBlocks]       = useState<InvoiceBlockConfig[]>(source?.blocks ?? DEFAULT_BLOCKS);
  const [opts, setOpts]           = useState<TemplateOptions>(source?.options ?? DEFAULT_TEMPLATE_OPTIONS);
  const [showBonusCol, setShowBonusCol] = useState(source?.showBonusCol ?? true);
  const [defaultDiscount, setDefaultDiscount] = useState(String(source?.defaultDiscount ?? 0));
  const [defaultNote, setDefaultNote]   = useState(source?.defaultNote ?? "");
  const [defaultTerms, setDefaultTerms] = useState(source?.defaultTerms ?? "");
  const [isDefault, setIsDefault]       = useState(existing?.isDefault ?? false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId]    = useState<string | null>(null);
  const [saving, setSaving]        = useState(false);
  const [saved, setSaved]          = useState(false);
  const [settingsTab, setSettingsTab] = useState<"global" | "block">("global");

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null;
  const accentColor = opts.primaryColor;
  const paperWidths: Record<string, number> = { A4: 794, A5: 559, thermal: 302 };
  const paperW = paperWidths[opts.paperSize] ?? 794;

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.65);
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 64;
      setPreviewScale(Math.min(0.85, available / paperW));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [paperW]);

  const previewSettings: PrintSettings = {
    name: settings.name || "دەوا فارما", nameEn: settings.nameEn || "",
    phone: settings.phone || "", email: settings.email || "", address: settings.address || "",
  };

  const draftTemplate: InvoiceTemplate = {
    id: editId ?? "preview", name, docType, blocks, showBonusCol,
    defaultDiscount: Number(defaultDiscount) || 0, defaultNote, defaultTerms,
    options: opts, isDefault, createdAt: existing?.createdAt ?? "",
  };

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const handleDragEnd   = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };
  const activeBlock = blocks.find(b => b.id === activeId);

  const toggleVisibility = (id: string) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  const updateBlock = (id: string, patch: Partial<InvoiceBlockConfig>) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };
  const addBlock = (type: "divider" | "custom") => {
    const uid = `${type}-${Date.now()}`;
    const newBlock: InvoiceBlockConfig = {
      id: uid, label: type === "divider" ? "خەتی جیاکار" : "دەق",
      visible: true, type, customText: type === "custom" ? "" : undefined,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(uid);
    setSettingsTab("block");
  };
  const reAddBlock = (blockId: string) => {
    if (blocks.find(b => b.id === blockId)) {
      updateBlock(blockId, { visible: true }); return;
    }
    const def = DEFAULT_BLOCKS.find(b => b.id === blockId);
    if (def) setBlocks(prev => [...prev, { ...def, visible: true }]);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name, docType, blocks, showBonusCol,
      defaultDiscount: Number(defaultDiscount) || 0,
      defaultNote, defaultTerms, options: opts, isDefault,
    };
    if (editId) await updateTemplate(editId, payload);
    else await addTemplate(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dt = DOC_TYPES.find(d => d.id === docType)!;
  const missingBuiltins = DEFAULT_BLOCKS.map(b => b.id).filter(id => !blocks.find(b => b.id === id));

  // ── Mode chooser ──
  if (mode === "choose") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 gap-6" dir="rtl">
        <h1 className="text-xl font-bold">چۆن داڕێژە دروست بکەیت؟</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          شێوازی دروستکردنی داڕێژە هەڵبژێرە
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setMode("easy")}
            className="flex flex-col items-center gap-3 p-8 bg-background border-2 border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer w-52"
          >
            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 size={28} className="text-primary" />
            </div>
            <div className="text-sm font-bold">ئاسان</div>
            <div className="text-xs text-muted-foreground text-center">هەنگاو بە هەنگاو شێوازەکان هەڵبژێرە</div>
          </button>
          <button
            onClick={() => setMode("advanced")}
            className="flex flex-col items-center gap-3 p-8 bg-background border-2 border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer w-52"
          >
            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench size={28} className="text-primary" />
            </div>
            <div className="text-sm font-bold">پێشکەوتوو</div>
            <div className="text-xs text-muted-foreground text-center">کۆنتڕۆڵی تەواو بۆ هەموو بلۆکێک</div>
          </button>
        </div>
      </div>
    );
  }

  // ── Easy Builder ──
  if (mode === "easy") {
    return (
      <EasyBuilder
        settings={previewSettings}
        onFinish={async (tmpl) => {
          await addTemplate(tmpl);
          router.push("/dashboard/invoices");
        }}
        onSwitchAdvanced={(b, o, d) => {
          setBlocks(b); setOpts(o); setDocType(d); setMode("advanced");
        }}
      />
    );
  }

  // ── Advanced Builder ──
  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard/invoices")}>
          <ArrowLeft size={16}/>
        </Button>
        <Separator orientation="vertical" className="h-5"/>
        <Input value={name} onChange={e => setName(e.target.value)}
          className="h-8 text-sm font-semibold border-0 shadow-none focus-visible:ring-0 bg-transparent w-48 px-1"
          placeholder="ناوی داڕێژە"/>
        <Badge variant="outline" style={{ borderColor: dt.color + "60", color: dt.color, background: dt.color + "10" }}>
          {dt.label}
        </Badge>
        {isDefault && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Star size={10} className="fill-amber-500 text-amber-500" /> پێشبینی
          </Badge>
        )}
        <div className="flex-1"/>
        <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 gap-1.5 text-xs"
          style={{ background: saved ? "#2B8A3E" : undefined }}>
          {saving ? <Loader2 size={13} className="animate-spin"/> : saved ? <Check size={13}/> : <Save size={13}/>}
          {saved ? "پاشەکەوتکرا" : "پاشەکەوتکردن"}
        </Button>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — Block list */}
        <div className="flex flex-col w-[268px] shrink-0 border-l border-border bg-background overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">بلۆکەکان</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {blocks.map(block => (
                    <SortableBlockCard key={block.id} block={block}
                      isSelected={selectedBlockId === block.id} accentColor={accentColor}
                      onSelect={() => { setSelectedBlockId(block.id); setSettingsTab("block"); }}
                      onToggleVisibility={() => toggleVisibility(block.id)}
                      onDelete={() => deleteBlock(block.id)} />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration:200, easing:"cubic-bezier(0.23,1,0.32,1)" }}>
                {activeBlock && <SortableBlockCard block={activeBlock} isSelected={false} isDragOverlay
                  accentColor={accentColor} onSelect={() => {}} onToggleVisibility={() => {}} />}
              </DragOverlay>
            </DndContext>
          </div>
          <div className="px-2 py-2 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8"/>}>
                <Plus size={12}/> بلۆکی نوێ <ChevronDown size={10}/>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" dir="rtl" className="w-48">
                <DropdownMenuItem onClick={() => addBlock("divider")} className="gap-2 text-xs">
                  <Minus size={12}/> خەتی جیاکار
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock("custom")} className="gap-2 text-xs">
                  <StickyNote size={12}/> دەقی ئازاد
                </DropdownMenuItem>
                {missingBuiltins.length > 0 && (
                  <>
                    <Separator className="my-1"/>
                    {missingBuiltins.map(id => {
                      const def = DEFAULT_BLOCKS.find(b => b.id === id)!;
                      return (
                        <DropdownMenuItem key={id} onClick={() => reAddBlock(id)} className="gap-2 text-xs">
                          {BLOCK_ICONS[id]} {def.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* CENTER — Live preview */}
        <div className="flex-1 flex flex-col bg-muted/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
            <span className="text-xs text-muted-foreground font-medium">پیشبینی زیندوو</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{opts.paperSize}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
            </div>
          </div>
          <div ref={previewContainerRef} className="flex-1 overflow-auto flex items-start justify-center p-8">
            <div style={{ transformOrigin: "top center", transform: `scale(${previewScale})`,
              marginBottom: `-${Math.round(paperW * (1 - previewScale) * 0.5)}px` }}>
              <div className="shadow-xl shadow-black/10 rounded-sm overflow-hidden ring-1 ring-black/5">
                <PrintDocument order={SAMPLE_ORDER} client={SAMPLE_CLIENT}
                  settings={previewSettings} template={draftTemplate} qrDataUrl={SAMPLE_QR} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Settings */}
        <div className="flex flex-col w-[300px] shrink-0 border-r border-border bg-background overflow-hidden">
          <Tabs value={settingsTab} onValueChange={v => setSettingsTab(v as "global" | "block")}
            className="flex flex-col h-full">
            <div className="px-3 pt-2 shrink-0">
              <TabsList className="w-full h-8 text-xs">
                <TabsTrigger value="global" className="flex-1 text-xs gap-1"><Settings2 size={11}/> گشتی</TabsTrigger>
                <TabsTrigger value="block" className="flex-1 text-xs gap-1" disabled={!selectedBlock}>
                  <Palette size={11}/> بلۆک
                  {selectedBlock && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }}/>}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Global settings */}
            <TabsContent value="global" className="flex-1 overflow-y-auto px-3 py-3 mt-0 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">جۆری بەڵگە</Label>
                <ToggleGroup value={[docType]} onValueChange={v => { if (v.length) setDocType(v[0] as DocType); }}
                  className="grid grid-cols-2 gap-1.5">
                  {DOC_TYPES.map(d => (
                    <ToggleGroupItem key={d.id} value={d.id} className="text-xs gap-1 h-8"
                      style={docType === d.id ? { borderColor: d.color, color: d.color, background: d.color + "12" } : {}}>
                      {docType === d.id && <Check size={10}/>} {d.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <Separator/>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">قەبارەی کاغەز</Label>
                <ToggleGroup value={[opts.paperSize]} onValueChange={v => { if (v.length) setOpts(o => ({ ...o, paperSize: v[0] as TemplateOptions["paperSize"] })); }}
                  className="grid grid-cols-3 gap-1.5">
                  {(["A4","A5","thermal"] as const).map(p => (
                    <ToggleGroupItem key={p} value={p} className="text-xs h-8">{p === "thermal" ? "ثيرمال" : p}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <Separator/>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ڕەنگی سەرەکی</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={opts.primaryColor}
                    onChange={e => setOpts(o => ({ ...o, primaryColor: e.target.value }))}
                    className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"/>
                  <div className="flex gap-1.5 flex-wrap">
                    {["#4263EB","#2B8A3E","#F47B35","#7C3AED","#C2255C","#1098AD","#1A1A2E"].map(c => (
                      <Button key={c} variant="ghost" size="icon" className="size-6 rounded-md p-0"
                        style={{ background: c, outline: opts.primaryColor === c ? `2.5px solid ${c}` : "none", outlineOffset: 2 }}
                        onClick={() => setOpts(o => ({ ...o, primaryColor: c }))} />
                    ))}
                  </div>
                </div>
              </div>
              <Separator/>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوەی نووسین</Label>
                <Select value={opts.fontFamily ?? "system"} onValueChange={v => v != null && setOpts(o => ({ ...o, fontFamily: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system" className="text-xs">سیستەم</SelectItem>
                    <SelectItem value="zavi" className="text-xs">Zavi Gifts</SelectItem>
                    <SelectItem value="serif" className="text-xs">Serif</SelectItem>
                    <SelectItem value="mono" className="text-xs">Monospace</SelectItem>
                    <SelectItem value="naskh" className="text-xs">Noto Naskh Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator/>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">نیشانەی شەفاف</Label>
                <Input value={opts.watermark ?? ""} onChange={e => setOpts(o => ({ ...o, watermark: e.target.value || undefined }))}
                  placeholder="COPY, DRAFT…" className="h-8 text-xs"/>
              </div>
              <Separator/>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">ستوونی بۆنەس</Label>
                  <Switch checked={showBonusCol} onCheckedChange={setShowBonusCol} className="scale-[0.85]"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">داشکاندنی پێشبینی (%)</Label>
                  <Input type="number" min="0" max="100" step="1" value={defaultDiscount}
                    onChange={e => setDefaultDiscount(e.target.value)} className="h-8 text-xs"/>
                </div>
              </div>
              <Separator/>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Star size={12} className="text-amber-500" /> داڕێژەی پێشبینی
                </Label>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} className="scale-[0.85]"/>
              </div>
              <Separator/>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">تێبینی سەرجەمی</Label>
                  <Textarea value={defaultNote} onChange={e => setDefaultNote(e.target.value)}
                    className="text-xs h-16 resize-none" placeholder="تێبینیەکی بنەڕەت…"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">مەرجەکانی سەرجەمی</Label>
                  <Textarea value={defaultTerms} onChange={e => setDefaultTerms(e.target.value)}
                    className="text-xs h-16 resize-none" placeholder="مەرجی بنەڕەت…"/>
                </div>
              </div>
            </TabsContent>

            {/* Block settings */}
            <TabsContent value="block" className="flex-1 overflow-y-auto px-3 py-3 mt-0">
              {!selectedBlock ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <Settings2 size={28} className="text-muted-foreground/40"/>
                  <p className="text-xs text-muted-foreground">بلۆکێک هەڵبژێرە</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div style={{ color: accentColor }}>{BLOCK_ICONS[selectedBlock.id] ?? BLOCK_ICONS.custom}</div>
                    <span className="text-sm font-semibold">{selectedBlock.label}</span>
                    <div className="flex-1"/>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedBlockId(null)}>
                      <X size={12}/>
                    </Button>
                  </div>
                  <Separator/>

                  {/* Label rename */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ناو</Label>
                    <Input value={selectedBlock.label} onChange={e => updateBlock(selectedBlock.id, { label: e.target.value })}
                      className="h-8 text-xs"/>
                  </div>

                  {/* Block-specific controls */}
                  <Separator/>
                  <BlockSpecificSettings block={selectedBlock}
                    onUpdate={patch => updateBlock(selectedBlock.id, patch)} accentColor={accentColor} />

                  {/* Generic visual overrides */}
                  <Separator/>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوازی دیتن</Label>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">قەبارەی نووسین ({selectedBlock.fontSize ?? 13}px)</Label>
                      <Slider value={[selectedBlock.fontSize ?? 13]} min={10} max={24} step={1}
                        onValueChange={v => updateBlock(selectedBlock.id, { fontSize: typeof v === "number" ? v : Array.isArray(v) ? v[0] : v })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">فۆنت</Label>
                      <Select value={selectedBlock.fontFamily ?? ""} onValueChange={v => v != null && updateBlock(selectedBlock.id, { fontFamily: v || undefined })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="وەک داڕێژە"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">وەک داڕێژە</SelectItem>
                          <SelectItem value="system" className="text-xs">سیستەم</SelectItem>
                          <SelectItem value="zavi" className="text-xs">Zavi Gifts</SelectItem>
                          <SelectItem value="serif" className="text-xs">Serif</SelectItem>
                          <SelectItem value="mono" className="text-xs">Monospace</SelectItem>
                          <SelectItem value="naskh" className="text-xs">Naskh Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ناوخۆ ({selectedBlock.padding ?? 14}px)</Label>
                      <Slider value={[selectedBlock.padding ?? 14]} min={0} max={32} step={2}
                        onValueChange={v => updateBlock(selectedBlock.id, { padding: typeof v === "number" ? v : Array.isArray(v) ? v[0] : v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">دیوار</Label>
                      <Switch checked={selectedBlock.showBorder ?? false}
                        onCheckedChange={v => updateBlock(selectedBlock.id, { showBorder: v })} className="scale-[0.85]"/>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ڕەنگی پشتەوە</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedBlock.bgColor ?? "#F8F9FA"}
                          onChange={e => updateBlock(selectedBlock.id, { bgColor: e.target.value })}
                          className="size-8 rounded-md border border-border cursor-pointer p-0.5 bg-background"/>
                        {selectedBlock.bgColor && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateBlock(selectedBlock.id, { bgColor: undefined })}>سڕینەوە</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
