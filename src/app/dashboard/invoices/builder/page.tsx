"use client";
import { useState, useCallback, useRef, useEffect } from "react";
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
  ArrowLeft, Save, Eye, EyeOff, GripVertical, Settings2, Plus,
  Trash2, Type, Users, Table2, Calculator, Gift, StickyNote,
  MessageSquare, QrCode, PenLine, AlignCenter, Minus, ChevronDown,
  Palette, Check, Loader2, X, Star, AlignRight, AlignLeft,
  Copy,
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

// ── Static sample data for the live preview ─────────────────
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

// ── Doc type config ─────────────────────────────────────────
type DocType = InvoiceTemplate["docType"];
const DOC_TYPES: { id: DocType; label: string; color: string }[] = [
  { id:"invoice",  label:"پسووڵە",          color:"#4263EB" },
  { id:"receipt",  label:"وەسڵ",            color:"#2B8A3E" },
  { id:"delivery", label:"وەرقەی گەیاندن",  color:"#F47B35" },
  { id:"quote",    label:"نرخنامە",          color:"#7C3AED" },
];

// ── Default block list ──────────────────────────────────────
const DEFAULT_BLOCKS: InvoiceBlockConfig[] = [
  { id:"header",    label:"سەرپەڕە",           visible:true,  type:"builtin" },
  { id:"parties",   label:"کڕیار و نوێنەر",    visible:true,  type:"builtin" },
  { id:"items",     label:"خشتەی بەرهەمەکان",  visible:true,  type:"builtin" },
  { id:"summary",   label:"کۆی گشتی",           visible:true,  type:"builtin" },
  { id:"bonus",     label:"شیکاری بۆنەس",       visible:false, type:"builtin" },
  { id:"note",      label:"تێبینی",              visible:false, type:"builtin" },
  { id:"terms",     label:"مەرجەکان",            visible:false, type:"builtin" },
  { id:"qr",        label:"QR کۆد",              visible:true,  type:"builtin" },
  { id:"signature", label:"واژوو",               visible:false, type:"builtin" },
  { id:"footer",    label:"پێپەڕە",              visible:true,  type:"builtin" },
];

// ── Block icon map ──────────────────────────────────────────
const BLOCK_ICONS: Record<string, React.ReactNode> = {
  header: <Type size={13}/>, parties: <Users size={13}/>, items: <Table2 size={13}/>,
  summary: <Calculator size={13}/>, bonus: <Gift size={13}/>, note: <StickyNote size={13}/>,
  terms: <MessageSquare size={13}/>, qr: <QrCode size={13}/>, signature: <PenLine size={13}/>,
  footer: <AlignCenter size={13}/>, divider: <Minus size={13}/>, custom: <StickyNote size={13}/>,
};

// ── Sortable block card ──────────────────────────────────────
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
          isSelected
            ? "ring-2 ring-primary/25 bg-primary/5"
            : "bg-background hover:bg-muted/50"
        } border ${isSelected ? "border-primary/40" : "border-border"}`}
        style={{
          boxShadow: isDragOverlay
            ? "0 16px 40px rgba(0,0,0,0.15)"
            : isSelected ? `0 0 0 2px ${accentColor}25` : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center px-2 py-1.5 gap-1.5">
          {/* Drag handle */}
          <Button
            variant="ghost" size="icon"
            className="size-6 cursor-grab shrink-0 text-muted-foreground"
            {...listeners}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={13} />
          </Button>

          {/* Icon + label */}
          <div className="shrink-0" style={{ color: block.visible ? accentColor : undefined }}>
            {BLOCK_ICONS[block.id] || BLOCK_ICONS.custom}
          </div>
          <span className={`text-[11px] font-semibold truncate flex-1 ${
            block.visible ? "text-foreground" : "text-muted-foreground"
          }`}>
            {block.label}
          </span>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost" size="icon"
                  className="size-6"
                  disabled={false}
                  onClick={e => { e.stopPropagation(); onToggleVisibility(); }}
                  style={{ color: block.visible ? accentColor : undefined }}
                />
              }
            >
              {block.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {block.visible ? "شاردنەوە" : "پیشاندان"}
            </TooltipContent>
          </Tooltip>

          {/* Delete */}
          {onDelete && (
            <Button
              variant="ghost" size="icon"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 size={11}/>
            </Button>
          )}

          {/* Selection dot */}
          <div className={`size-1.5 rounded-full shrink-0 transition-colors ${
            isSelected ? "bg-primary" : ""
          }`} />
        </div>
      </div>
    </div>
  );
}

// ── Main builder page ────────────────────────────────────────
export default function TemplateBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const presetName = searchParams.get("preset");

  const { invoiceTemplates, addTemplate, updateTemplate, settings } = useData();

  // Load from preset, existing template, or defaults
  const existing = editId ? invoiceTemplates.find(t => t.id === editId) : null;
  const preset = presetName ? PRESET_TEMPLATES.find(p => p.name === presetName) : null;
  const source = existing ?? preset ?? null;

  const [name, setName]           = useState(source?.name ?? "داڕێژەی نوێ");
  const [docType, setDocType]     = useState<DocType>(source?.docType ?? "invoice");
  const [blocks, setBlocks]       = useState<InvoiceBlockConfig[]>(
    source?.blocks ?? DEFAULT_BLOCKS
  );
  const [opts, setOpts]           = useState<TemplateOptions>(
    source?.options ?? DEFAULT_TEMPLATE_OPTIONS
  );
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
  const [presetDialogOpen, setPresetDialogOpen] = useState(!editId && !presetName);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null;
  const accentColor = opts.primaryColor;

  // Paper width
  const paperWidths: Record<string, number> = { A4: 794, A5: 559, thermal: 302 };
  const paperW = paperWidths[opts.paperSize] ?? 794;

  // Dynamically measure the preview container
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
    name: settings.name || "دەوا فارما",
    nameEn: settings.nameEn || "",
    phone: settings.phone || "",
    email: settings.email || "",
    address: settings.address || "",
  };

  const draftTemplate: InvoiceTemplate = {
    id: editId ?? "preview",
    name, docType, blocks, showBonusCol,
    defaultDiscount: Number(defaultDiscount) || 0,
    defaultNote, defaultTerms,
    options: opts,
    isDefault,
    createdAt: existing?.createdAt ?? "",
  };

  // ── DnD sensors ───────────────────────────────────────────
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

  // ── Block mutations ───────────────────────────────────────
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
      id: uid,
      label: type === "divider" ? "خەتی جیاکار" : "دەق",
      visible: true,
      type,
      customText: type === "custom" ? "" : undefined,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(uid);
    setSettingsTab("block");
  };

  // Re-add a removed builtin block
  const reAddBlock = (blockId: string) => {
    const existing = blocks.find(b => b.id === blockId);
    if (existing) {
      updateBlock(blockId, { visible: true });
      return;
    }
    const defaultBlock = DEFAULT_BLOCKS.find(b => b.id === blockId);
    if (defaultBlock) {
      setBlocks(prev => [...prev, { ...defaultBlock, visible: true }]);
    }
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name, docType, blocks, showBonusCol,
      defaultDiscount: Number(defaultDiscount) || 0,
      defaultNote, defaultTerms, options: opts,
      isDefault,
    };
    if (editId) {
      await updateTemplate(editId, payload);
    } else {
      await addTemplate(payload);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dt = DOC_TYPES.find(d => d.id === docType)!;

  // Blocks that could be re-added (deleted builtins)
  const removableBuiltinIds = DEFAULT_BLOCKS.map(b => b.id);
  const missingBuiltins = removableBuiltinIds.filter(id => !blocks.find(b => b.id === id));

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden" dir="rtl">

      {/* ── Preset picker dialog ── */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>داڕێژەیەک هەڵبژێرە</DialogTitle>
            <DialogDescription>لە داڕێژەیەکی ئامادەکراوەوە دەست پێ بکە یان بەتاڵ دروست بکە</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {/* Blank template */}
            <Button
              variant="outline"
              className="h-auto py-3 px-4 justify-start gap-3 text-right"
              onClick={() => setPresetDialogOpen(false)}
            >
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Plus size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">داڕێژەی بەتاڵ</div>
                <div className="text-xs text-muted-foreground">لە سفرەوە دروست بکە</div>
              </div>
            </Button>

            {PRESET_TEMPLATES.map((preset, i) => {
              const pdt = DOC_TYPES.find(d => d.id === preset.docType)!;
              return (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start gap-3 text-right"
                  onClick={() => {
                    setName(preset.name);
                    setDocType(preset.docType);
                    setBlocks(preset.blocks);
                    setOpts(preset.options);
                    setShowBonusCol(preset.showBonusCol);
                    setDefaultNote(preset.defaultNote);
                    setDefaultTerms(preset.defaultTerms);
                    setDefaultDiscount(String(preset.defaultDiscount));
                    setPresetDialogOpen(false);
                  }}
                >
                  <div
                    className="size-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: pdt.color + "15", color: pdt.color }}
                  >
                    <Copy size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{preset.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0"
                        style={{ borderColor: pdt.color + "60", color: pdt.color }}>
                        {pdt.label}
                      </Badge>
                      {preset.options.paperSize}
                      · {preset.blocks.filter(b => b.visible).length} بلۆک
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard/invoices")}>
          <ArrowLeft size={16}/>
        </Button>
        <Separator orientation="vertical" className="h-5"/>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm font-semibold border-0 shadow-none focus-visible:ring-0 bg-transparent w-48 px-1"
          placeholder="ناوی داڕێژە"
        />
        <Badge variant="outline" style={{ borderColor: dt.color + "60", color: dt.color, background: dt.color + "10" }}>
          {dt.label}
        </Badge>
        {isDefault && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Star size={10} className="fill-amber-500 text-amber-500" /> پێشبینی
          </Badge>
        )}
        <div className="flex-1"/>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          style={{ background: saved ? "#2B8A3E" : undefined }}
        >
          {saving ? <Loader2 size={13} className="animate-spin"/> :
           saved  ? <Check size={13}/> : <Save size={13}/>}
          {saved ? "پاشەکەوتکرا" : "پاشەکەوتکردن"}
        </Button>
      </div>

      {/* ── 3-panel layout ──────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT — Block list */}
        <div className="flex flex-col w-[268px] shrink-0 border-l border-border bg-background overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">بلۆکەکان</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {blocks.map(block => (
                    <SortableBlockCard
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      accentColor={accentColor}
                      onSelect={() => {
                        setSelectedBlockId(block.id);
                        setSettingsTab("block");
                      }}
                      onToggleVisibility={() => toggleVisibility(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration:200, easing:"cubic-bezier(0.23,1,0.32,1)" }}>
                {activeBlock && (
                  <SortableBlockCard
                    block={activeBlock}
                    isSelected={false}
                    isDragOverlay
                    accentColor={accentColor}
                    onSelect={() => {}}
                    onToggleVisibility={() => {}}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Add block */}
          <div className="px-2 py-2 border-t border-border space-y-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8" />
                }
              >
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
                    <Separator className="my-1" />
                    {missingBuiltins.map(id => {
                      const def = DEFAULT_BLOCKS.find(b => b.id === id)!;
                      return (
                        <DropdownMenuItem key={id} onClick={() => reAddBlock(id)} className="gap-2 text-xs">
                          {BLOCK_ICONS[id]} {def.label} (گەڕاندنەوە)
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
            <div
              style={{
                transformOrigin: "top center",
                transform: `scale(${previewScale})`,
                marginBottom: `-${Math.round(paperW * (1 - previewScale) * 0.5)}px`,
              }}
            >
              <div className="shadow-xl shadow-black/10 rounded-sm overflow-hidden ring-1 ring-black/5">
                <PrintDocument
                  order={SAMPLE_ORDER}
                  client={SAMPLE_CLIENT}
                  settings={previewSettings}
                  template={draftTemplate}
                />
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
                <TabsTrigger value="global" className="flex-1 text-xs gap-1">
                  <Settings2 size={11}/> گشتی
                </TabsTrigger>
                <TabsTrigger value="block" className="flex-1 text-xs gap-1" disabled={!selectedBlock}>
                  <Palette size={11}/> بلۆک
                  {selectedBlock && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }}/>}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Global settings tab ── */}
            <TabsContent value="global" className="flex-1 overflow-y-auto px-3 py-3 mt-0 space-y-5">

              {/* Doc type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">جۆری بەڵگە</Label>
                <ToggleGroup value={[docType]} onValueChange={(v) => { if (v.length) setDocType(v[0] as DocType); }}
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

              {/* Paper size */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">قەبارەی کاغەز</Label>
                <ToggleGroup value={[opts.paperSize]} onValueChange={(v) => { if (v.length) setOpts(o => ({ ...o, paperSize: v[0] as TemplateOptions["paperSize"] })); }}
                  className="grid grid-cols-3 gap-1.5">
                  {(["A4","A5","thermal"] as const).map(p => (
                    <ToggleGroupItem key={p} value={p} className="text-xs h-8">
                      {p === "thermal" ? "ثيرمال" : p}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <Separator/>

              {/* Primary color */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ڕەنگی سەرەکی</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={opts.primaryColor}
                    onChange={e => setOpts(o => ({ ...o, primaryColor: e.target.value }))}
                    className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {["#4263EB","#2B8A3E","#F47B35","#7C3AED","#C2255C","#1098AD","#1A1A2E"].map(c => (
                      <Button
                        key={c}
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-md p-0"
                        style={{
                          background: c,
                          outline: opts.primaryColor === c ? `2.5px solid ${c}` : "none",
                          outlineOffset: 2,
                        }}
                        onClick={() => setOpts(o => ({ ...o, primaryColor: c }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Separator/>

              {/* Font family */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوەی نووسین</Label>
                <Select value={opts.fontFamily ?? "system"} onValueChange={v => v != null && setOpts(o => ({ ...o, fontFamily: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system" className="text-xs">سیستەم (پێشبینی)</SelectItem>
                    <SelectItem value="serif" className="text-xs">Serif</SelectItem>
                    <SelectItem value="mono" className="text-xs">Monospace</SelectItem>
                    <SelectItem value="naskh" className="text-xs">Noto Naskh Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator/>

              {/* Watermark */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">نیشانەی شەفاف</Label>
                <Input
                  value={opts.watermark ?? ""}
                  onChange={e => setOpts(o => ({ ...o, watermark: e.target.value || undefined }))}
                  placeholder="COPY, DRAFT, پشكۆپی…"
                  className="h-8 text-xs"
                />
              </div>

              <Separator/>

              {/* Bonus col + discount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">ستوونی بۆنەس</Label>
                  <Switch checked={showBonusCol} onCheckedChange={setShowBonusCol} className="scale-[0.85]"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">داشکاندنی پێشبینی (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={defaultDiscount}
                    onChange={e => setDefaultDiscount(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <Separator/>

              {/* Default template toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Star size={12} className="text-amber-500" /> داڕێژەی پێشبینی
                </Label>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} className="scale-[0.85]"/>
              </div>

              <Separator/>

              {/* Default note + terms */}
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

            {/* ── Block settings tab ── */}
            <TabsContent value="block" className="flex-1 overflow-y-auto px-3 py-3 mt-0">
              {!selectedBlock ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <Settings2 size={28} className="text-muted-foreground/40"/>
                  <p className="text-xs text-muted-foreground">بلۆکێک هەڵبژێرە<br/>بۆ دەستکاریکردنی تايبەتمەندییەکانی</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div style={{ color: accentColor }}>{BLOCK_ICONS[selectedBlock.id] ?? BLOCK_ICONS.custom}</div>
                    <span className="text-sm font-semibold">{selectedBlock.label}</span>
                    <div className="flex-1"/>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setSelectedBlockId(null)}>
                      <X size={12}/>
                    </Button>
                  </div>

                  <Separator/>

                  {/* Label (all blocks — user can rename) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ناو</Label>
                    <Input value={selectedBlock.label}
                      onChange={e => updateBlock(selectedBlock.id, { label: e.target.value })}
                      className="h-8 text-xs"/>
                  </div>

                  {/* Custom text (custom + note + terms blocks) */}
                  {(selectedBlock.type === "custom" || selectedBlock.id === "note" || selectedBlock.id === "terms") && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">دەق</Label>
                      <Textarea
                        value={selectedBlock.customText ?? ""}
                        onChange={e => updateBlock(selectedBlock.id, { customText: e.target.value })}
                        className="text-xs h-24 resize-none"
                        placeholder="دەقت لێرە بنووسە…"
                      />
                    </div>
                  )}

                  {/* Signature block — pad */}
                  {selectedBlock.id === "signature" && (
                    <>
                      <Separator/>
                      <SignaturePadComponent
                        value={selectedBlock.signatureUrl}
                        onChange={url => updateBlock(selectedBlock.id, { signatureUrl: url })}
                        width={260}
                        height={110}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">ناوی واژووەکان (هەر هێڵ = واژوویەک)</Label>
                        <Textarea
                          value={(selectedBlock.signatureLabels ?? ["واژووی فرۆشیار","واژووی کڕیار"]).join("\n")}
                          onChange={e => updateBlock(selectedBlock.id, {
                            signatureLabels: e.target.value.split("\n").filter(Boolean),
                          })}
                          className="text-xs h-16 resize-none"
                          placeholder={"واژووی فرۆشیار\nواژووی کڕیار"}
                        />
                      </div>
                    </>
                  )}

                  {/* QR block — size */}
                  {selectedBlock.id === "qr" && (
                    <>
                      <Separator/>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">قەبارەی QR ({selectedBlock.qrSize ?? 120}px)</Label>
                        <Slider
                          value={[selectedBlock.qrSize ?? 120]}
                          min={60} max={200} step={10}
                          onValueChange={(v) => updateBlock(selectedBlock.id, { qrSize: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                        />
                      </div>
                    </>
                  )}

                  <Separator/>

                  {/* ── Visual overrides ── */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوازی دیتن</Label>

                    {/* Font size */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">قەبارەی نووسین ({selectedBlock.fontSize ?? 13}px)</Label>
                      <Slider
                        value={[selectedBlock.fontSize ?? 13]}
                        min={10} max={24} step={1}
                        onValueChange={(v) => updateBlock(selectedBlock.id, { fontSize: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                      />
                    </div>

                    {/* Font family */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">فۆنت</Label>
                      <Select value={selectedBlock.fontFamily ?? ""} onValueChange={v => v != null && updateBlock(selectedBlock.id, { fontFamily: v || undefined })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="وەک داڕێژە"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">وەک داڕێژە</SelectItem>
                          <SelectItem value="system" className="text-xs">سیستەم</SelectItem>
                          <SelectItem value="serif" className="text-xs">Serif</SelectItem>
                          <SelectItem value="mono" className="text-xs">Monospace</SelectItem>
                          <SelectItem value="naskh" className="text-xs">Naskh Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font weight */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ئاستی ئەستوری</Label>
                      <Select value={String(selectedBlock.fontWeight ?? "")} onValueChange={v => v != null && updateBlock(selectedBlock.id, { fontWeight: v ? Number(v) : undefined })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ئاسایی"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">ئاسایی</SelectItem>
                          <SelectItem value="400" className="text-xs">Regular (400)</SelectItem>
                          <SelectItem value="500" className="text-xs">Medium (500)</SelectItem>
                          <SelectItem value="600" className="text-xs">Semibold (600)</SelectItem>
                          <SelectItem value="700" className="text-xs">Bold (700)</SelectItem>
                          <SelectItem value="900" className="text-xs">Black (900)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Text align */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ئاڕاستەی دەق</Label>
                      <ToggleGroup value={[selectedBlock.textAlign ?? "right"]}
                        onValueChange={(v) => { if (v.length) updateBlock(selectedBlock.id, { textAlign: v[0] as InvoiceBlockConfig["textAlign"] }); }}
                        className="w-full">
                        <ToggleGroupItem value="right" className="flex-1 h-7 text-xs gap-1"><AlignRight size={12}/> ڕاست</ToggleGroupItem>
                        <ToggleGroupItem value="center" className="flex-1 h-7 text-xs gap-1"><AlignCenter size={12}/> ناوەند</ToggleGroupItem>
                        <ToggleGroupItem value="left" className="flex-1 h-7 text-xs gap-1"><AlignLeft size={12}/> چەپ</ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <Separator/>

                    {/* Padding */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ناوخۆ ({selectedBlock.padding ?? 14}px)</Label>
                      <Slider
                        value={[selectedBlock.padding ?? 14]}
                        min={0} max={32} step={2}
                        onValueChange={(v) => updateBlock(selectedBlock.id, { padding: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                      />
                    </div>

                    {/* Margin bottom */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">بۆشایی خوارەوە ({selectedBlock.marginBottom ?? 14}px)</Label>
                      <Slider
                        value={[selectedBlock.marginBottom ?? 14]}
                        min={0} max={32} step={2}
                        onValueChange={(v) => updateBlock(selectedBlock.id, { marginBottom: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                      />
                    </div>

                    {/* Border radius */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">خوارەوەی گۆشە ({selectedBlock.borderRadius ?? 10}px)</Label>
                      <Slider
                        value={[selectedBlock.borderRadius ?? 10]}
                        min={0} max={20} step={1}
                        onValueChange={(v) => updateBlock(selectedBlock.id, { borderRadius: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                      />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ڕوونی ({Math.round((selectedBlock.opacity ?? 1) * 100)}%)</Label>
                      <Slider
                        value={[selectedBlock.opacity ?? 1]}
                        min={0.3} max={1} step={0.05}
                        onValueChange={(v) => updateBlock(selectedBlock.id, { opacity: typeof v === 'number' ? v : Array.isArray(v) ? v[0] : v })}
                      />
                    </div>

                    <Separator/>

                    {/* Border toggle */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">دیوار</Label>
                      <Switch
                        checked={selectedBlock.showBorder ?? false}
                        onCheckedChange={v => updateBlock(selectedBlock.id, { showBorder: v })}
                        className="scale-[0.85]"
                      />
                    </div>

                    {/* Accent color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ڕەنگی تایبەت</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.accentColor ?? accentColor}
                          onChange={e => updateBlock(selectedBlock.id, { accentColor: e.target.value })}
                          className="size-8 rounded-md border border-border cursor-pointer p-0.5 bg-background"
                        />
                        {selectedBlock.accentColor && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateBlock(selectedBlock.id, { accentColor: undefined })}>
                            سڕینەوە
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Background color */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ڕەنگی پشتەوە</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.bgColor ?? "#F8F9FA"}
                          onChange={e => updateBlock(selectedBlock.id, { bgColor: e.target.value })}
                          className="size-8 rounded-md border border-border cursor-pointer p-0.5 bg-background"
                        />
                        {selectedBlock.bgColor && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateBlock(selectedBlock.id, { bgColor: undefined })}>
                            سڕینەوە
                          </Button>
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
