"use client";
// ============================================================
// DEWA — Invoice Design Builder
//
// A sheet/drawer with tabs for:
//   1. Sections & Metadata toggles
//   2. Per-section styling
//   3. Global settings
//   4. Live preview (right panel)
// ============================================================

import { useState, useCallback, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Save, FileText, Table2, BarChart3, QrCode, PenLine, FootprintsIcon,
  ChevronDown, ChevronRight, Palette, LayoutTemplate, Settings2,
  Eye, EyeOff, Type, Plus, Minus,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { InvoiceTemplate, SectionStyle, HeaderLayout, TableLayout } from "@/lib/types";
import { DEFAULT_INVOICE_TEMPLATE, DEFAULT_SECTION_STYLE } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract first value from base-ui Slider's onValueChange param */
function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? (v as number[])[0] : v as number;
}

// ── Font options ─────────────────────────────────────────────────────────────

const FONT_OPTIONS: { id: SectionStyle["fontFamily"]; label: string; stack: string }[] = [
  { id: "zavi",   label: "زاڤی",     stack: "'Zavi Gifts', sans-serif" },
  { id: "system", label: "سیستەم",   stack: "'Segoe UI', Tahoma, sans-serif" },
  { id: "naskh",  label: "نەسخ",     stack: "'Noto Naskh Arabic', sans-serif" },
  { id: "serif",  label: "سێریف",   stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono",   label: "مۆنۆ",     stack: "'Courier New', Courier, monospace" },
];

const HEADER_LAYOUTS: { id: HeaderLayout; label: string }[] = [
  { id: "classic",  label: "کلاسیک" },
  { id: "centered", label: "ناوەند" },
  { id: "banner",   label: "بانەر" },
  { id: "minimal",  label: "ساکار" },
];

const TABLE_LAYOUTS: { id: TableLayout; label: string }[] = [
  { id: "standard", label: "ستاندارد" },
  { id: "bordered", label: "سنووردار" },
  { id: "minimal",  label: "ساکار" },
  { id: "compact",  label: "تەنک" },
  { id: "striped",  label: "هێڵاوی" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface InvoiceBuilderProps {
  open: boolean;
  onClose: () => void;
  editTemplate?: InvoiceTemplate | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function InvoiceBuilder({ open, onClose, editTemplate }: InvoiceBuilderProps) {
  const { addTemplate, updateTemplate } = useData();

  // Build initial state from editTemplate or defaults
  const initial = useMemo<Omit<InvoiceTemplate, "id" | "createdAt">>(() => {
    if (editTemplate) {
      const { id: _id, createdAt: _ca, ...rest } = editTemplate;
      return rest;
    }
    return { ...DEFAULT_INVOICE_TEMPLATE };
  }, [editTemplate]);

  const [template, setTemplate] = useState(initial);
  const [activeTab, setActiveTab] = useState<"sections" | "style" | "global">("sections");
  const [expandedSection, setExpandedSection] = useState<string | null>("header");
  const [saving, setSaving] = useState(false);

  // ── Update helpers ──
  const update = useCallback(<K extends keyof typeof template>(key: K, value: (typeof template)[K]) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateNested = useCallback(<K extends "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer">(
    section: K, key: string, value: unknown
  ) => {
    setTemplate(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const updateStyle = useCallback(<K extends "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer">(
    section: K, key: keyof SectionStyle, value: unknown
  ) => {
    setTemplate(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        style: { ...(prev[section] as { style: Partial<SectionStyle> }).style, [key]: value },
      },
    }));
  }, []);

  // ── Save handler ──
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTemplate) {
        await updateTemplate(editTemplate.id, template);
      } else {
        await addTemplate(template as Omit<InvoiceTemplate, "id" | "createdAt">);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
  };

  // ── Sections config ──
  const sections = [
    { key: "header",      label: "سەرپەڕە",        icon: FileText,     toggle: "showHeader" as const },
    { key: "invoiceMeta", label: "زانیاری پسووڵە",  icon: LayoutTemplate, toggle: "showInvoiceMeta" as const },
    { key: "table",       label: "خشتەی کاڵاکان",   icon: Table2,       toggle: "showItemsTable" as const },
    { key: "summary",     label: "کورتەی دارایی",   icon: BarChart3,    toggle: "showSummary" as const },
    { key: "qr",          label: "کۆدی QR",        icon: QrCode,       toggle: "showQR" as const },
    { key: "signature",   label: "واژوو",          icon: PenLine,      toggle: "showSignature" as const },
    { key: "footer",      label: "پێپەڕە",         icon: FootprintsIcon, toggle: "showFooter" as const },
  ];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
        dir="rtl"
      >
        {/* ── Title Bar ── */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="text-lg font-bold">
            {editTemplate ? "دەستکاری داڕێژە" : "داڕێژەی نوێ"}
          </SheetTitle>
        </SheetHeader>

        {/* ── Template Name ── */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <Label className="text-xs text-muted-foreground mb-1 block">ناوی داڕێژە</Label>
          <Input
            value={template.name}
            onChange={e => update("name", e.target.value)}
            placeholder="ناوی داڕێژە..."
            className="h-9"
          />
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex border-b border-border flex-shrink-0 px-5">
          {([
            { id: "sections" as const, label: "بەشەکان", icon: LayoutTemplate },
            { id: "style" as const,    label: "ستایل",    icon: Palette },
            { id: "global" as const,   label: "گشتی",    icon: Settings2 },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <ScrollArea className="flex-1 px-5 py-4">
          {/* ═══ TAB: Sections & Metadata ═══ */}
          {activeTab === "sections" && (
            <div className="space-y-1">
              {sections.map(sec => {
                const isVisible = template[sec.toggle];
                const isExpanded = expandedSection === sec.key;
                return (
                  <div key={sec.key} className="border border-border rounded-lg overflow-hidden">
                    {/* Section header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                      <button
                        className="flex items-center gap-2 flex-1 text-start"
                        onClick={() => toggleSection(sec.key)}
                      >
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        <sec.icon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{sec.label}</span>
                      </button>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={v => update(sec.toggle, v)}
                        className="scale-75"
                      />
                    </div>

                    {/* Section metadata toggles */}
                    {isExpanded && isVisible && (
                      <div className="px-4 py-3 space-y-2 border-t border-border bg-background">
                        {renderMetadataToggles(sec.key, template, updateNested)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ TAB: Style ═══ */}
          {activeTab === "style" && (
            <div className="space-y-1">
              {sections.map(sec => {
                if (!template[sec.toggle]) return null;
                const isExpanded = expandedSection === sec.key;
                const sectionData = template[sec.key as keyof typeof template] as { style?: Partial<SectionStyle> };
                const style = sectionData?.style || {};

                return (
                  <div key={sec.key} className="border border-border rounded-lg overflow-hidden">
                    <button
                      className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 w-full text-start transition-colors"
                      onClick={() => toggleSection(sec.key)}
                    >
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      <Palette className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{sec.label}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-3 space-y-3 border-t border-border bg-background">
                        {/* Layout presets for header/table */}
                        {sec.key === "header" && (
                          <div>
                            <Label className="text-[11px] text-muted-foreground mb-1 block">شێوەی سەرپەڕە</Label>
                            <Select
                              value={template.header.layout}
                              onValueChange={v => updateNested("header", "layout", v)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {HEADER_LAYOUTS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {sec.key === "table" && (
                          <div>
                            <Label className="text-[11px] text-muted-foreground mb-1 block">شێوەی خشتە</Label>
                            <Select
                              value={template.table.layout}
                              onValueChange={v => updateNested("table", "layout", v)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TABLE_LAYOUTS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {sec.key === "summary" && (
                          <div>
                            <Label className="text-[11px] text-muted-foreground mb-1 block">شوێنی کورتە</Label>
                            <Select
                              value={template.summary.position}
                              onValueChange={v => updateNested("summary", "position", v)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="right">ڕاست</SelectItem>
                                <SelectItem value="left">چەپ</SelectItem>
                                <SelectItem value="full">تەواو</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Style controls */}
                        {renderStyleControls(sec.key as "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer", style, updateStyle)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ TAB: Global ═══ */}
          {activeTab === "global" && (
            <div className="space-y-5">
              {/* Paper Size */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">قەبارەی کاغەز</Label>
                <Select value={template.paperSize} onValueChange={v => update("paperSize", v as "A4" | "A5")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Global Font */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">فۆنتی سەرەکی</Label>
                <Select value={template.globalFont} onValueChange={v => update("globalFont", v as SectionStyle["fontFamily"])}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Color */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">ڕەنگی سەرەکی</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.primaryColor}
                    onChange={e => update("primaryColor", e.target.value)}
                    className="size-8 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={template.primaryColor}
                    onChange={e => update("primaryColor", e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>

              {/* Watermark */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">واتەرمارک</Label>
                <Input
                  value={template.watermark || ""}
                  onChange={e => update("watermark", e.target.value || undefined)}
                  placeholder="بۆ نموونە: نوسخە"
                  className="h-8 text-xs"
                />
              </div>

              <Separator />

              {/* Default Discount */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">داشکاندنی بنەڕەت (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={template.defaultDiscount}
                  onChange={e => update("defaultDiscount", Number(e.target.value) || 0)}
                  className="h-8 text-xs w-24"
                />
              </div>

              {/* Set as default */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">داڕێژەی بنەڕەت بۆ چاپ</Label>
                <Switch
                  checked={!!template.isDefault}
                  onCheckedChange={v => update("isDefault", v)}
                  className="scale-75"
                />
              </div>

              {/* Signature labels */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">ناونیشانی واژوو</Label>
                {template.signature.labels.map((label, i) => (
                  <div key={i} className="flex items-center gap-1 mb-1">
                    <Input
                      value={label}
                      onChange={e => {
                        const labels = [...template.signature.labels];
                        labels[i] = e.target.value;
                        updateNested("signature", "labels", labels);
                      }}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      size="icon" variant="ghost" className="size-7"
                      onClick={() => {
                        const labels = template.signature.labels.filter((_, j) => j !== i);
                        updateNested("signature", "labels", labels);
                        updateNested("signature", "count", labels.length);
                      }}
                    >
                      <Minus className="size-3" />
                    </Button>
                  </div>
                ))}
                {template.signature.labels.length < 4 && (
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs mt-1"
                    onClick={() => {
                      const labels = [...template.signature.labels, "واژوو"];
                      updateNested("signature", "labels", labels);
                      updateNested("signature", "count", labels.length);
                    }}
                  >
                    <Plus className="size-3 me-1" /> واژووی نوێ
                  </Button>
                )}
              </div>

              {/* Footer terms */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">مەرج و ڕێسا</Label>
                <Textarea
                  value={template.footer.customTerms}
                  onChange={e => updateNested("footer", "customTerms", e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              {/* Footer note */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">تێبینی بنەڕەت</Label>
                <Textarea
                  value={template.footer.customNote}
                  onChange={e => updateNested("footer", "customNote", e.target.value)}
                  rows={2}
                  className="text-xs"
                  placeholder="تێبینی..."
                />
              </div>
            </div>
          )}
        </ScrollArea>

        {/* ── Save Button ── */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs">
            پاشگەزبوونەوە
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !template.name.trim()}
            className="h-9 text-xs gap-1.5"
          >
            <Save className="size-3.5" />
            {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// Metadata toggle renderers per section
// ═══════════════════════════════════════════════════════════════════════════════

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {checked ? <Eye className="size-3 text-primary" /> : <EyeOff className="size-3 text-muted-foreground/50" />}
        <Switch checked={checked} onCheckedChange={onChange} className="scale-[0.6]" />
      </div>
    </div>
  );
}

function renderMetadataToggles(
  sectionKey: string,
  template: Omit<InvoiceTemplate, "id" | "createdAt">,
  updateNested: <K extends "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer">(section: K, key: string, value: unknown) => void,
) {
  switch (sectionKey) {
    case "header":
      return (
        <>
          <ToggleRow label="لۆگۆ" checked={template.header.showLogo} onChange={v => updateNested("header", "showLogo", v)} />
          <ToggleRow label="ناوی کوردی" checked={template.header.showNameKu} onChange={v => updateNested("header", "showNameKu", v)} />
          <ToggleRow label="ناوی ئینگلیزی" checked={template.header.showNameEn} onChange={v => updateNested("header", "showNameEn", v)} />
          <ToggleRow label="ساڵی دامەزراندن" checked={template.header.showEstYear} onChange={v => updateNested("header", "showEstYear", v)} />
          <ToggleRow label="وەسفی کار" checked={template.header.showBusinessDesc} onChange={v => updateNested("header", "showBusinessDesc", v)} />
          <ToggleRow label="ناونیشان" checked={template.header.showAddress} onChange={v => updateNested("header", "showAddress", v)} />
          <ToggleRow label="ژ. بەڕێوەبەرایەتی" checked={template.header.showPhoneAdmin} onChange={v => updateNested("header", "showPhoneAdmin", v)} />
          <ToggleRow label="ژ. ژمێریاری" checked={template.header.showPhoneAccounting} onChange={v => updateNested("header", "showPhoneAccounting", v)} />
          <ToggleRow label="ژ. کۆمپیوتەر" checked={template.header.showPhoneIT} onChange={v => updateNested("header", "showPhoneIT", v)} />
          <ToggleRow label="ژ. فرۆشتن" checked={template.header.showPhoneSales} onChange={v => updateNested("header", "showPhoneSales", v)} />
        </>
      );

    case "invoiceMeta":
      return (
        <>
          <ToggleRow label="بەروار" checked={template.invoiceMeta.showDate} onChange={v => updateNested("invoiceMeta", "showDate", v)} />
          <ToggleRow label="ژمارەی پسووڵە" checked={template.invoiceMeta.showInvoiceNumber} onChange={v => updateNested("invoiceMeta", "showInvoiceNumber", v)} />
          <ToggleRow label="نسخە (کۆپی)" checked={template.invoiceMeta.showCopyLabel} onChange={v => updateNested("invoiceMeta", "showCopyLabel", v)} />
          <ToggleRow label="ناوی کڕیار" checked={template.invoiceMeta.showCustomerName} onChange={v => updateNested("invoiceMeta", "showCustomerName", v)} />
          <ToggleRow label="جۆری دراو" checked={template.invoiceMeta.showCurrency} onChange={v => updateNested("invoiceMeta", "showCurrency", v)} />
          <ToggleRow label="ناوی نوێنەر" checked={template.invoiceMeta.showRepName} onChange={v => updateNested("invoiceMeta", "showRepName", v)} />
        </>
      );

    case "table":
      return (
        <>
          <ToggleRow label="ژمارەی ریز (#)" checked={template.table.showRowNumbers} onChange={v => updateNested("table", "showRowNumbers", v)} />
          <ToggleRow label="ناوی بەرهەم" checked={template.table.showProductName} onChange={v => updateNested("table", "showProductName", v)} />
          <ToggleRow label="بڕ" checked={template.table.showQuantity} onChange={v => updateNested("table", "showQuantity", v)} />
          <ToggleRow label="بڕی بۆنەس" checked={template.table.showFreeQty} onChange={v => updateNested("table", "showFreeQty", v)} />
          <ToggleRow label="نرخی یەکە" checked={template.table.showUnitPrice} onChange={v => updateNested("table", "showUnitPrice", v)} />
          <ToggleRow label="کۆی ریز" checked={template.table.showLineTotal} onChange={v => updateNested("table", "showLineTotal", v)} />
          <ToggleRow label="بەرواری بەسەرچوون" checked={template.table.showExpiryDate} onChange={v => updateNested("table", "showExpiryDate", v)} />
          <ToggleRow label="کۆمپانیای بەرهەمهێنەر" checked={template.table.showCompany} onChange={v => updateNested("table", "showCompany", v)} />
        </>
      );

    case "summary":
      return (
        <>
          <ToggleRow label="کۆی ناخاوەن" checked={template.summary.showSubtotal} onChange={v => updateNested("summary", "showSubtotal", v)} />
          <ToggleRow label="داشکاندن" checked={template.summary.showDiscount} onChange={v => updateNested("summary", "showDiscount", v)} />
          <ToggleRow label="کۆی خاوەن" checked={template.summary.showNetTotal} onChange={v => updateNested("summary", "showNetTotal", v)} />
          <ToggleRow label="بڕ بە پیت" checked={template.summary.showAmountInWords} onChange={v => updateNested("summary", "showAmountInWords", v)} />
          <ToggleRow label="باڵانسی کڕیار" checked={template.summary.showCustomerBalance} onChange={v => updateNested("summary", "showCustomerBalance", v)} />
        </>
      );

    case "qr":
      return (
        <>
          <ToggleRow label="لێبەلی QR" checked={template.qr.showLabel} onChange={v => updateNested("qr", "showLabel", v)} />
          <div className="pt-1">
            <Label className="text-[11px] text-muted-foreground mb-1 block">قەبارەی QR ({template.qr.size}px)</Label>
            <Slider
              min={80} max={200} step={10}
              value={[template.qr.size]}
              onValueChange={v => updateNested("qr", "size", v)}
              className="w-full"
            />
          </div>
          <div className="pt-1">
            <Label className="text-[11px] text-muted-foreground mb-1 block">شوێن</Label>
            <Select value={template.qr.position} onValueChange={v => updateNested("qr", "position", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="right">ڕاست</SelectItem>
                <SelectItem value="left">چەپ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case "signature":
      return (
        <>
          <ToggleRow label="هێڵی واژوو" checked={template.signature.showLine} onChange={v => updateNested("signature", "showLine", v)} />
          <div className="pt-1">
            <Label className="text-[11px] text-muted-foreground mb-1 block">ژمارەی واژوو</Label>
            <div className="flex items-center gap-2">
              <Slider
                min={1} max={4} step={1}
                value={[template.signature.count]}
                onValueChange={v => updateNested("signature", "count", v)}
                className="flex-1"
              />
              <span className="text-xs font-mono w-4 text-center">{template.signature.count}</span>
            </div>
          </div>
        </>
      );

    case "footer":
      return (
        <>
          <ToggleRow label="بەکارهێنەری سیستەم" checked={template.footer.showSystemUser} onChange={v => updateNested("footer", "showSystemUser", v)} />
          <ToggleRow label="بەروار/کاتی چاپ" checked={template.footer.showPrintDateTime} onChange={v => updateNested("footer", "showPrintDateTime", v)} />
          <ToggleRow label="ناوی چاپکەر" checked={template.footer.showPrintUsername} onChange={v => updateNested("footer", "showPrintUsername", v)} />
          <ToggleRow label="ژمارەی لاپەڕە" checked={template.footer.showPageNumber} onChange={v => updateNested("footer", "showPageNumber", v)} />
          <ToggleRow label="تێبینی" checked={template.footer.showNotes} onChange={v => updateNested("footer", "showNotes", v)} />
          <ToggleRow label="مەرج و ڕێسا" checked={template.footer.showTerms} onChange={v => updateNested("footer", "showTerms", v)} />
        </>
      );

    default:
      return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// Style controls renderer
// ═══════════════════════════════════════════════════════════════════════════════

function renderStyleControls(
  section: "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer",
  style: Partial<SectionStyle>,
  updateStyleFn: (section: "header" | "invoiceMeta" | "table" | "summary" | "qr" | "signature" | "footer", key: keyof SectionStyle, value: unknown) => void,
) {
  const s = { ...DEFAULT_SECTION_STYLE, ...style };

  return (
    <>
      <Separator className="my-2" />
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">ستایل</p>

      {/* Font */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">فۆنت</Label>
          <Select value={s.fontFamily} onValueChange={v => updateStyleFn(section, "fontFamily", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">قەبارە ({s.fontSize})</Label>
          <Slider min={10} max={24} step={1} value={[s.fontSize]} onValueChange={v => updateStyleFn(section, "fontSize", v)} />
        </div>
      </div>

      {/* Weight & Align */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ئەستووری ({s.fontWeight})</Label>
          <Slider min={300} max={900} step={100} value={[s.fontWeight]} onValueChange={v => updateStyleFn(section, "fontWeight", v)} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ڕێزبەندی</Label>
          <Select value={s.textAlign} onValueChange={v => updateStyleFn(section, "textAlign", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="right">ڕاست</SelectItem>
              <SelectItem value="center">ناوەند</SelectItem>
              <SelectItem value="left">چەپ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ڕەنگی تێکست</Label>
          <input type="color" value={s.color} onChange={e => updateStyleFn(section, "color", e.target.value)} className="size-7 rounded border cursor-pointer" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">پاشبنەما</Label>
          <input type="color" value={s.bgColor === "transparent" ? "#ffffff" : s.bgColor} onChange={e => updateStyleFn(section, "bgColor", e.target.value)} className="size-7 rounded border cursor-pointer" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ڕەنگی گرنگ</Label>
          <input type="color" value={s.accentColor} onChange={e => updateStyleFn(section, "accentColor", e.target.value)} className="size-7 rounded border cursor-pointer" />
        </div>
      </div>

      {/* Border & Radius */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">گۆشەخواری ({s.borderRadius})</Label>
          <Slider min={0} max={20} step={1} value={[s.borderRadius]} onValueChange={v => updateStyleFn(section, "borderRadius", v)} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ئەستووری سنوور ({s.borderWidth})</Label>
          <Slider min={0} max={3} step={0.5} value={[s.borderWidth]} onValueChange={v => updateStyleFn(section, "borderWidth", v)} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">ڕەنگی سنوور</Label>
          <input type="color" value={s.borderColor} onChange={e => updateStyleFn(section, "borderColor", e.target.value)} className="size-7 rounded border cursor-pointer" />
        </div>
      </div>

      {/* Padding */}
      <div className="mt-2">
        <Label className="text-[11px] text-muted-foreground mb-1 block">بۆشایی ناوەوە ({s.padding}px)</Label>
        <Slider min={0} max={32} step={2} value={[s.padding]} onValueChange={v => updateStyleFn(section, "padding", v)} />
      </div>
    </>
  );
}
