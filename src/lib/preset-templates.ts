/**
 * Pre-designed invoice templates that ship with the app.
 * These appear as "Start from preset..." options when creating a new template.
 * They are NOT stored in Supabase — they live in code.
 */
import type { InvoiceTemplate, InvoiceBlockConfig } from "@/lib/types";

// ── Helper to create a full block list ──────────────────────
function blocks(overrides: Partial<Record<string, Partial<InvoiceBlockConfig>>>): InvoiceBlockConfig[] {
  const base: InvoiceBlockConfig[] = [
    { id: "header",    label: "سەرپەڕە",           visible: true,  type: "builtin" },
    { id: "parties",   label: "کڕیار و نوێنەر",    visible: true,  type: "builtin" },
    { id: "items",     label: "خشتەی بەرهەمەکان",  visible: true,  type: "builtin" },
    { id: "summary",   label: "کۆی گشتی",           visible: true,  type: "builtin" },
    { id: "bonus",     label: "شیکاری بۆنەس",       visible: false, type: "builtin" },
    { id: "note",      label: "تێبینی",              visible: false, type: "builtin" },
    { id: "terms",     label: "مەرجەکان",            visible: false, type: "builtin" },
    { id: "qr",        label: "QR کۆد",              visible: false, type: "builtin" },
    { id: "signature", label: "واژوو",               visible: false, type: "builtin" },
    { id: "footer",    label: "پێپەڕە",              visible: true,  type: "builtin" },
  ];

  return base.map(b => {
    const override = overrides[b.id];
    return override ? { ...b, ...override } : b;
  });
}

// ── Preset Templates ─────────────────────────────────────────

export const PRESET_TEMPLATES: Omit<InvoiceTemplate, "id" | "createdAt">[] = [
  {
    name: "کلاسیکی پڕۆفیشناڵ",
    docType: "invoice",
    blocks: blocks({
      parties:   { visible: true },
      summary:   { visible: true },
      note:      { visible: true, customText: "سوپاس بۆ کڕینەکەت" },
      qr:        { visible: true, qrSize: 120 },
      footer:    { visible: true },
    }),
    showBonusCol: false,
    defaultNote: "سوپاس بۆ کڕینەکەت",
    defaultTerms: "",
    defaultDiscount: 0,
    options: {
      paperSize: "A4",
      primaryColor: "#4263EB",
      fontFamily: "system",
    },
  },
  {
    name: "وەسڵی حەرارەتی",
    docType: "receipt",
    blocks: blocks({
      header:    { visible: true, fontSize: 14 },
      parties:   { visible: true, fontSize: 11 },
      items:     { visible: true, fontSize: 11 },
      summary:   { visible: true, fontSize: 12 },
      bonus:     { visible: false },
      note:      { visible: false },
      terms:     { visible: false },
      qr:        { visible: true, qrSize: 80 },
      signature: { visible: false },
      footer:    { visible: true, fontSize: 10 },
    }),
    showBonusCol: false,
    defaultNote: "",
    defaultTerms: "",
    defaultDiscount: 0,
    options: {
      paperSize: "thermal",
      primaryColor: "#1A1A2E",
      fontFamily: "mono",
    },
  },
  {
    name: "وەرقەی گەیاندن",
    docType: "delivery",
    blocks: blocks({
      header:    { visible: true },
      parties:   { visible: true },
      items:     { visible: true },
      summary:   { visible: false },
      bonus:     { visible: false },
      note:      { visible: true, customText: "تکایە کاڵاکان پشکنین بکە لە کاتی وەرگرتن" },
      terms:     { visible: false },
      qr:        { visible: false },
      signature: { visible: true, signatureLabels: ["واژووی شۆفێر", "واژووی وەرگر"] },
      footer:    { visible: true },
    }),
    showBonusCol: false,
    defaultNote: "تکایە کاڵاکان پشکنین بکە لە کاتی وەرگرتن",
    defaultTerms: "",
    defaultDiscount: 0,
    options: {
      paperSize: "A5",
      primaryColor: "#F47B35",
      fontFamily: "system",
    },
  },
  {
    name: "نرخنامەی ئەلیگانت",
    docType: "quote",
    blocks: blocks({
      header:    { visible: true },
      parties:   { visible: true },
      items:     { visible: true },
      summary:   { visible: true },
      bonus:     { visible: true },
      note:      { visible: true, customText: "ئەم نرخنامەیە بۆ ماوەی ١٤ ڕۆژ دروستە" },
      terms:     { visible: true, customText: "پارەدان پێش گەیاندن\nگەڕاندنەوە نییە دوای کڕین" },
      qr:        { visible: false },
      signature: { visible: true, signatureLabels: ["واژووی کۆمپانیا", "واژووی کڕیار"] },
      footer:    { visible: true },
    }),
    showBonusCol: true,
    defaultNote: "ئەم نرخنامەیە بۆ ماوەی ١٤ ڕۆژ دروستە",
    defaultTerms: "پارەدان پێش گەیاندن\nگەڕاندنەوە نییە دوای کڕین",
    defaultDiscount: 0,
    options: {
      paperSize: "A4",
      primaryColor: "#7C3AED",
      fontFamily: "system",
      watermark: "نرخنامە",
    },
  },
  {
    name: "تەواو تایبەتمەندی",
    docType: "invoice",
    blocks: blocks({
      header:    { visible: true },
      parties:   { visible: true },
      items:     { visible: true },
      summary:   { visible: true },
      bonus:     { visible: true },
      note:      { visible: true },
      terms:     { visible: true },
      qr:        { visible: true, qrSize: 140 },
      signature: { visible: true, signatureLabels: ["واژووی فرۆشیار", "واژووی کڕیار"] },
      footer:    { visible: true },
    }),
    showBonusCol: true,
    defaultNote: "",
    defaultTerms: "",
    defaultDiscount: 0,
    options: {
      paperSize: "A4",
      primaryColor: "#2B8A3E",
      fontFamily: "system",
    },
  },
];

/** Get a preset by name */
export function getPresetByName(name: string) {
  return PRESET_TEMPLATES.find(p => p.name === name);
}
