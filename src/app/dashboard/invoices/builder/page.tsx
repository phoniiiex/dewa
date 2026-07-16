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
  ChevronRight, Palette, FileText, Receipt, FileCheck, Check,
  Loader2, X,
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
import { useData } from "@/lib/store";
import { DEFAULT_TEMPLATE_OPTIONS } from "@/lib/types";
import { PrintDocument } from "@/components/print/PrintDocument";
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
  { id:"header",    label:"سەرپەڕە",           visible:true,  required:true,  type:"builtin" },
  { id:"parties",   label:"کڕیار و نوێنەر",    visible:true,  required:false, type:"builtin" },
  { id:"items",     label:"خشتەی بەرهەمەکان",  visible:true,  required:true,  type:"builtin" },
  { id:"summary",   label:"کۆی گشتی",           visible:true,  required:false, type:"builtin" },
  { id:"bonus",     label:"شیکاری بۆنەس",        visible:true,  required:false, type:"builtin" },
  { id:"note",      label:"تێبینی",              visible:false, required:false, type:"builtin" },
  { id:"terms",     label:"مەرجەکان",            visible:false, required:false, type:"builtin" },
  { id:"qr",        label:"QR کۆد",              visible:true,  required:false, type:"builtin" },
  { id:"signature", label:"واژوو",               visible:false, required:false, type:"builtin" },
  { id:"footer",    label:"پێپەڕە",              visible:true,  required:false, type:"builtin" },
];

// ── Block icon map ──────────────────────────────────────────
const BLOCK_ICONS: Record<string, React.ReactNode> = {
  header: <Type size={13}/>, parties: <Users size={13}/>, items: <Table2 size={13}/>,
  summary: <Calculator size={13}/>, bonus: <Gift size={13}/>, note: <StickyNote size={13}/>,
  terms: <MessageSquare size={13}/>, qr: <QrCode size={13}/>, signature: <PenLine size={13}/>,
  footer: <AlignCenter size={13}/>, divider: <Minus size={13}/>, custom: <StickyNote size={13}/>,
};

// ── Visual thumbnail for each block type ────────────────────
function BlockThumbnail({ block, color }: { block: InvoiceBlockConfig; color: string }) {
  const s: React.CSSProperties = { borderRadius:4, overflow:"hidden", userSelect:"none", pointerEvents:"none" };
  switch (block.id) {
    case "header": return (
      <div style={{ ...s, display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"6px 8px", background:"#FAFBFC", border:"1px solid #F0F1F3", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:20, height:20, borderRadius:4, background:color, opacity:0.8 }}/>
          <div>
            <div style={{ width:48, height:5, background:"#1A1A2E", borderRadius:2, marginBottom:2 }}/>
            <div style={{ width:32, height:3, background:"#CED4DA", borderRadius:2 }}/>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, fontWeight:800, color, marginBottom:2 }}>پسووڵە</div>
          <div style={{ width:36, height:3, background:"#E9ECEF", borderRadius:2 }}/>
        </div>
      </div>
    );
    case "parties": return (
      <div style={{ ...s, display:"flex", gap:4, padding:"5px 8px",
        background:"#FAFBFC", border:"1px solid #F0F1F3" }}>
        {["کڕیار","نوێنەر"].map(l => (
          <div key={l} style={{ flex:1, background:"white", borderRadius:3, padding:"3px 5px",
            border:"1px solid #E9ECEF" }}>
            <div style={{ fontSize:7, color:"#ADB5BD", marginBottom:2, fontWeight:700 }}>{l}</div>
            <div style={{ width:"70%", height:4, background:"#E9ECEF", borderRadius:2 }}/>
          </div>
        ))}
      </div>
    );
    case "items": return (
      <div style={{ ...s, background:"#FAFBFC", border:"1px solid #F0F1F3" }}>
        <div style={{ background:color, padding:"3px 8px", display:"flex", gap:8 }}>
          {["#","بەرهەم","بڕ","کۆ"].map(h => (
            <div key={h} style={{ flex:1, height:4, background:"rgba(255,255,255,0.6)", borderRadius:2 }}/>
          ))}
        </div>
        {[0,1].map(i => (
          <div key={i} style={{ display:"flex", gap:8, padding:"3px 8px",
            background: i%2===0?"white":"#FAFBFC" }}>
            {[1,0.8,0.5,0.9].map((w,j) => (
              <div key={j} style={{ flex:1, height:4, background:"#E9ECEF", borderRadius:2, opacity:w }}/>
            ))}
          </div>
        ))}
      </div>
    );
    case "summary": return (
      <div style={{ ...s, padding:"5px 8px", background:"#FAFBFC", border:"1px solid #F0F1F3",
        display:"flex", justifyContent:"flex-start" }}>
        <div style={{ width:100, border:"1px solid #E9ECEF", borderRadius:4, overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 6px" }}>
            <div style={{ width:24, height:3, background:"#E9ECEF", borderRadius:2 }}/>
            <div style={{ width:28, height:3, background:"#E9ECEF", borderRadius:2 }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 6px", background:color }}>
            <div style={{ width:20, height:3, background:"rgba(255,255,255,0.7)", borderRadius:2 }}/>
            <div style={{ width:28, height:3, background:"rgba(255,255,255,0.9)", borderRadius:2 }}/>
          </div>
        </div>
      </div>
    );
    case "qr": return (
      <div style={{ ...s, padding:"5px 8px", background:"#FAFBFC", border:"1px solid #F0F1F3",
        display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:32, height:32, background:"white", border:"1px solid #E9ECEF",
          borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <QrCode size={18} color={color} />
        </div>
        <div>
          <div style={{ width:48, height:4, background:"#E9ECEF", borderRadius:2, marginBottom:3 }}/>
          <div style={{ width:36, height:3, background:"#E9ECEF", borderRadius:2 }}/>
        </div>
      </div>
    );
    case "signature": return (
      <div style={{ ...s, padding:"5px 8px", background:"#FAFBFC", border:"1px solid #F0F1F3",
        display:"flex", justifyContent:"space-around" }}>
        {["واژووی فرۆشیار","واژووی کڕیار"].map(l => (
          <div key={l} style={{ textAlign:"center" }}>
            <div style={{ width:48, borderBottom:"1px solid #ADB5BD", margin:"8px auto 3px" }}/>
            <div style={{ fontSize:7, color:"#ADB5BD" }}>{l}</div>
          </div>
        ))}
      </div>
    );
    case "footer": return (
      <div style={{ ...s, padding:"5px 8px", background:"#FAFBFC", border:"1px solid #F0F1F3",
        borderTop:"2px solid #E9ECEF" }}>
        <div style={{ width:"60%", height:4, background:"#E9ECEF", borderRadius:2, margin:"2px auto" }}/>
        <div style={{ width:"40%", height:3, background:"#F1F3F5", borderRadius:2, margin:"2px auto" }}/>
      </div>
    );
    case "bonus": return (
      <div style={{ ...s, padding:"5px 8px", background:"#F3F0FF",
        border:"1px solid #E8E0FF" }}>
        <div style={{ fontSize:8, color:"#7C5CFC", fontWeight:700, marginBottom:3 }}>شیکاری بۆنەس</div>
        <div style={{ width:"60%", height:3, background:"#D0BFFF", borderRadius:2 }}/>
      </div>
    );
    case "note": return (
      <div style={{ ...s, padding:"5px 8px", background:"#FFF8DB", border:"1px solid #FFE066" }}>
        <div style={{ fontSize:8, color:"#E67700", fontWeight:700, marginBottom:3 }}>تێبینی</div>
        <div style={{ width:"70%", height:3, background:"#FFE066", borderRadius:2 }}/>
      </div>
    );
    case "terms": return (
      <div style={{ ...s, padding:"5px 8px", background:"#E8F5E9", border:"1px solid #A5D6A7" }}>
        <div style={{ fontSize:8, color:"#2E7D32", fontWeight:700, marginBottom:3 }}>مەرجەکان</div>
        <div style={{ width:"60%", height:3, background:"#A5D6A7", borderRadius:2 }}/>
      </div>
    );
    case "divider": return (
      <div style={{ ...s, padding:"8px", background:"#FAFBFC", border:"1px solid #F0F1F3",
        display:"flex", alignItems:"center" }}>
        <div style={{ flex:1, borderTop:"1px solid #CED4DA" }}/>
      </div>
    );
    default: return (
      <div style={{ ...s, padding:"5px 8px", background:"#F1F3F5", border:"1px solid #E9ECEF" }}>
        <div style={{ fontSize:8, color:"#6C757D", fontWeight:700, marginBottom:3 }}>{block.label}</div>
        <div style={{ width:"55%", height:3, background:"#DEE2E6", borderRadius:2 }}/>
      </div>
    );
  }
}

// ── Single sortable block card ───────────────────────────────
function SortableBlockCard({
  block, isSelected, isDragOverlay, accentColor, onSelect, onToggleVisibility, onDelete,
}: {
  block: InvoiceBlockConfig; isSelected: boolean; isDragOverlay?: boolean;
  accentColor: string; onSelect: () => void;
  onToggleVisibility: () => void; onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.23,1,0.32,1)",
    opacity: isDragging && !isDragOverlay ? 0.35 : 1,
    zIndex: isDragOverlay ? 100 : "auto",
  };

  const cardStyle: React.CSSProperties = {
    background: isSelected ? `${accentColor}08` : "white",
    border: `1.5px solid ${isSelected ? accentColor + "40" : "#E9ECEF"}`,
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 150ms ease, background 150ms ease, box-shadow 150ms ease",
    boxShadow: isDragOverlay
      ? "0 16px 40px rgba(0,0,0,0.15), 0 0 0 1.5px rgba(0,0,0,0.06)"
      : isSelected
        ? `0 0 0 2px ${accentColor}25`
        : "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={cardStyle} onClick={onSelect}>
        {/* Drag handle row */}
        <div style={{ display:"flex", alignItems:"center", padding:"7px 8px 0",
          gap:6, justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
            {/* Grab handle */}
            <button
              {...listeners}
              style={{ cursor:"grab", color:"#ADB5BD", display:"flex", alignItems:"center",
                background:"none", border:"none", padding:"2px 1px", borderRadius:4,
                transition:"color 150ms ease", flexShrink:0 }}
              onClick={e => e.stopPropagation()}
              title="بکێشە"
            >
              <GripVertical size={13} />
            </button>
            {/* Block icon + label */}
            <div style={{ color: block.visible ? accentColor : "#ADB5BD", flexShrink:0 }}>
              {BLOCK_ICONS[block.id] || BLOCK_ICONS.custom}
            </div>
            <span style={{ fontSize:11, fontWeight:600,
              color: block.visible ? "#1A1A2E" : "#ADB5BD",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {block.label}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
            {/* Visibility toggle */}
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={e => { e.stopPropagation(); onToggleVisibility(); }}
                  disabled={block.required}
                  style={{ width:24, height:24, display:"flex", alignItems:"center",
                    justifyContent:"center", borderRadius:5, border:"none",
                    background: "transparent", cursor: block.required ? "not-allowed" : "pointer",
                    color: block.visible ? accentColor : "#ADB5BD",
                    opacity: block.required ? 0.35 : 1,
                    transition:"color 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={e => { if (!block.required) (e.currentTarget as HTMLButtonElement).style.background = "#F1F3F5"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {block.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {block.required ? "پێویستە" : block.visible ? "شاردنەوە" : "پیشاندان"}
              </TooltipContent>
            </Tooltip>
            {/* Delete (custom/divider only) */}
            {(block.type === "custom" || block.type === "divider") && onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                style={{ width:24, height:24, display:"flex", alignItems:"center",
                  justifyContent:"center", borderRadius:5, border:"none",
                  background:"transparent", cursor:"pointer", color:"#ADB5BD",
                  transition:"color 150ms ease, background 150ms ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#FA5252";
                  (e.currentTarget as HTMLButtonElement).style.background = "#FFF5F5"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ADB5BD";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Trash2 size={11}/>
              </button>
            )}
            {/* Settings indicator */}
            <div style={{ width:6, height:6, borderRadius:"50%",
              background: isSelected ? accentColor : "transparent",
              transition:"background 150ms ease", flexShrink:0 }}/>
          </div>
        </div>
        {/* Thumbnail */}
        <div style={{ padding:"6px 8px 8px", opacity: block.visible ? 1 : 0.4,
          transition:"opacity 150ms ease" }}>
          <BlockThumbnail block={block} color={accentColor} />
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

  const { invoiceTemplates, addTemplate, updateTemplate, settings, orders, clients } = useData();

  // Load existing template or create a new draft
  const existing = editId ? invoiceTemplates.find(t => t.id === editId) : null;

  const [name, setName]           = useState(existing?.name ?? "داڕێژەی نوێ");
  const [docType, setDocType]     = useState<DocType>(existing?.docType ?? "invoice");
  const [blocks, setBlocks]       = useState<InvoiceBlockConfig[]>(
    existing?.blocks ?? DEFAULT_BLOCKS
  );
  const [opts, setOpts]           = useState<TemplateOptions>(
    existing?.options ?? DEFAULT_TEMPLATE_OPTIONS
  );
  const [showBonusCol, setShowBonusCol] = useState(existing?.showBonusCol ?? true);
  const [defaultDiscount, setDefaultDiscount] = useState(String(existing?.defaultDiscount ?? 0));
  const [defaultNote, setDefaultNote]   = useState(existing?.defaultNote ?? "");
  const [defaultTerms, setDefaultTerms] = useState(existing?.defaultTerms ?? "");

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId]    = useState<string | null>(null);
  const [saving, setSaving]        = useState(false);
  const [saved, setSaved]          = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"global" | "block">("global");

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null;
  const accentColor = opts.primaryColor;

  // Paper width — must be declared before the ResizeObserver useEffect
  const paperWidths: Record<string, number> = { A4: 794, A5: 559, thermal: 302 };
  const paperW = paperWidths[opts.paperSize] ?? 794;

  // Dynamically measure the preview container to calculate scale
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

  // Build preview settings from store
  const previewSettings: PrintSettings = {
    name: settings.name || "دەوا فارما",
    nameEn: settings.nameEn || "",
    phone: settings.phone || "",
    email: settings.email || "",
    address: settings.address || "",
  };

  // Draft template for live preview
  const draftTemplate: InvoiceTemplate = {
    id: editId ?? "preview",
    name, docType, blocks, showBonusCol,
    defaultDiscount: Number(defaultDiscount) || 0,
    defaultNote, defaultTerms,
    options: opts,
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
    setBlocks(prev => prev.map(b => b.id === id && !b.required ? { ...b, visible: !b.visible } : b));

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
    setAddMenuOpen(false);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name, docType, blocks, showBonusCol,
      defaultDiscount: Number(defaultDiscount) || 0,
      defaultNote, defaultTerms, options: opts,
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

  // ── Add block menu ─────────────────────────────────────────
  const AddBlockMenu = () => (
    <div style={{ position:"relative" }}>
      <Button
        variant="outline" size="sm"
        onClick={() => setAddMenuOpen(o => !o)}
        className="w-full gap-1.5 text-xs h-8"
      >
        <Plus size={12}/> بلۆکی نوێ <ChevronDown size={10} className={addMenuOpen ? "rotate-180 transition-transform" : "transition-transform"}/>
      </Button>
      {addMenuOpen && (
        <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, right:0,
          background:"white", border:"1px solid #E9ECEF", borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.10)", overflow:"hidden", zIndex:50 }}>
          {[
            { type:"divider" as const, icon:<Minus size={12}/>, label:"خەتی جیاکار" },
            { type:"custom"  as const, icon:<StickyNote size={12}/>, label:"دەقی ئازاد" },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => addBlock(item.type)}
              style={{ width:"100%", padding:"9px 12px", display:"flex", alignItems:"center",
                gap:8, background:"none", border:"none", cursor:"pointer", fontSize:12,
                fontFamily:"inherit", textAlign:"right", color:"#495057",
                transition:"background 0.08s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#F8F9FA"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden" dir="rtl">

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
                      onDelete={block.type !== "builtin" ? () => deleteBlock(block.id) : undefined}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Drag ghost overlay */}
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
          <div className="px-2 py-2 border-t border-border">
            <AddBlockMenu />
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
            {/* Scale wrapper — measured via ResizeObserver */}
            <div
              style={{
                transformOrigin: "top center",
                transform: `scale(${previewScale})`,
                marginBottom: `-${Math.round(paperW * (1 - previewScale) * 0.5)}px`,
              }}
            >
              <div style={{ boxShadow:"0 4px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
                borderRadius:3, overflow:"hidden" }}>
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

            {/* Global settings tab */}
            <TabsContent value="global" className="flex-1 overflow-y-auto px-3 py-3 mt-0 space-y-5">

              {/* Doc type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">جۆری بەڵگە</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DOC_TYPES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDocType(d.id)}
                      style={{
                        padding:"8px 10px", borderRadius:8, fontSize:12, fontWeight:600,
                        border:`1.5px solid ${docType === d.id ? d.color : "#E9ECEF"}`,
                        background: docType === d.id ? d.color + "12" : "white",
                        color: docType === d.id ? d.color : "#6C757D",
                        cursor:"pointer", fontFamily:"inherit",
                        transition:"all 0.1s",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                      }}
                    >
                      {docType === d.id && <Check size={10}/>} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator/>

              {/* Paper size */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">قەبارەی کاغەز</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["A4","A5","thermal"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setOpts(o => ({ ...o, paperSize: p }))}
                      style={{
                        padding:"7px 6px", borderRadius:7, fontSize:11, fontWeight:600,
                        border:`1.5px solid ${opts.paperSize === p ? accentColor : "#E9ECEF"}`,
                        background: opts.paperSize === p ? accentColor + "12" : "white",
                        color: opts.paperSize === p ? accentColor : "#6C757D",
                        cursor:"pointer", fontFamily:"inherit", transition:"all 0.1s",
                      }}
                    >
                      {p === "thermal" ? "ثيرمال" : p}
                    </button>
                  ))}
                </div>
              </div>

              <Separator/>

              {/* Primary color */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ڕەنگی سەرەکی</Label>
                <div className="flex items-center gap-2">
                  <div style={{ position:"relative" }}>
                    <input
                      type="color"
                      value={opts.primaryColor}
                      onChange={e => setOpts(o => ({ ...o, primaryColor: e.target.value }))}
                      style={{ width:36, height:36, borderRadius:8, border:"1.5px solid #E9ECEF",
                        cursor:"pointer", padding:2, background:"white" }}
                      title="ڕەنگی سەرەکی"
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {["#4263EB","#2B8A3E","#F47B35","#7C3AED","#C2255C","#1098AD","#1A1A2E"].map(c => (
                      <button
                        key={c}
                        onClick={() => setOpts(o => ({ ...o, primaryColor: c }))}
                        style={{ width:22, height:22, borderRadius:5, background:c, border:"none",
                          cursor:"pointer",
                          outline: opts.primaryColor === c ? `2.5px solid ${c}` : "none",
                          outlineOffset: 2,
                          transition:"outline 150ms ease, transform 150ms ease",
                          transform: opts.primaryColor === c ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Separator/>

              {/* Font family */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوەی نووسین</Label>
                <Select value={opts.fontFamily ?? "system"} onValueChange={v => setOpts(o => ({ ...o, fontFamily: v || undefined }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system" className="text-xs">سیستەم (پێشبینی)</SelectItem>
                    <SelectItem value="serif" className="text-xs">Serif</SelectItem>
                    <SelectItem value="mono" className="text-xs">Monospace</SelectItem>
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

            {/* Block settings tab */}
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

                  {/* Label (custom blocks only) */}
                  {selectedBlock.type !== "builtin" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ناو</Label>
                      <Input value={selectedBlock.label}
                        onChange={e => updateBlock(selectedBlock.id, { label: e.target.value })}
                        className="h-8 text-xs"/>
                    </div>
                  )}

                  {/* Custom text */}
                  {selectedBlock.type === "custom" && (
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

                  {/* Note override */}
                  {selectedBlock.id === "note" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">دەقی تێبینی (بزانیاری داواکاری بۆشدا)</Label>
                      <Textarea
                        value={selectedBlock.customText ?? ""}
                        onChange={e => updateBlock(selectedBlock.id, { customText: e.target.value })}
                        className="text-xs h-20 resize-none"
                        placeholder="تێبینی تایبەتی ئەم داڕێژەیە…"
                      />
                    </div>
                  )}

                  <Separator/>

                  {/* Visual overrides */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">شێوازی دیتن</Label>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">قەبارەی نووسین ({selectedBlock.fontSize ?? 13}px)</Label>
                      <input
                        type="range" min="10" max="18" step="1"
                        value={selectedBlock.fontSize ?? 13}
                        onChange={e => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">دیوار</Label>
                      <Switch
                        checked={selectedBlock.showBorder ?? false}
                        onCheckedChange={v => updateBlock(selectedBlock.id, { showBorder: v })}
                        className="scale-[0.85]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ڕەنگی تایبەت</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.accentColor ?? accentColor}
                          onChange={e => updateBlock(selectedBlock.id, { accentColor: e.target.value })}
                          style={{ width:32, height:32, borderRadius:6, border:"1.5px solid #E9ECEF",
                            cursor:"pointer", padding:2, background:"white" }}
                        />
                        {selectedBlock.accentColor && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateBlock(selectedBlock.id, { accentColor: undefined })}>
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
