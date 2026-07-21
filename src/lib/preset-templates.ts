/**
 * Pre-designed invoice templates that ship with the app.
 * Each uses the new variant system for headers, tables, summaries, and footers.
 */
import type { InvoiceTemplate, InvoiceBlockConfig } from "@/lib/types";

function blocks(overrides: Partial<Record<string, Partial<InvoiceBlockConfig>>>): InvoiceBlockConfig[] {
  const base: InvoiceBlockConfig[] = [
    { id: "header",    label: "سەرپەڕە",           visible: true,  type: "builtin", headerLayout: "classic", showLogo: true, showNameEn: true, showContact: true, showStatus: true },
    { id: "parties",   label: "کڕیار و نوێنەر",    visible: true,  type: "builtin", showPhone: true, showCity: true, showRep: true, showWarehouse: true, partiesLayout: "side" },
    { id: "items",     label: "خشتەی بەرهەمەکان",  visible: true,  type: "builtin", showRowNumbers: true, showUnitPrice: true, stripedRows: true, tableStyle: "standard" },
    { id: "summary",   label: "کۆی گشتی",           visible: true,  type: "builtin", summaryStyle: "card", summaryPosition: "right" },
    { id: "bonus",     label: "شیکاری بۆنەس",       visible: false, type: "builtin" },
    { id: "note",      label: "تێبینی",              visible: false, type: "builtin" },
    { id: "terms",     label: "مەرجەکان",            visible: false, type: "builtin" },
    { id: "qr",        label: "QR کۆد",              visible: true,  type: "builtin", qrSize: 120, qrPosition: "right" },
    { id: "signature", label: "واژوو",               visible: false, type: "builtin", signatureCount: 2, showSignatureLine: true },
    { id: "footer",    label: "پێپەڕە",              visible: true,  type: "builtin", footerStyle: "centered" },
  ];
  return base.map(b => {
    const override = overrides[b.id];
    return override ? { ...b, ...override } : b;
  });
}

export const PRESET_TEMPLATES: Omit<InvoiceTemplate, "id" | "createdAt">[] = [
  // 1. Classic Professional — standard header, striped table, card summary
  {
    name: "کلاسیکی پڕۆفیشناڵ",
    docType: "invoice",
    blocks: blocks({
      header:    { headerLayout: "classic" },
      items:     { tableStyle: "standard", stripedRows: true },
      summary:   { summaryStyle: "card" },
      note:      { visible: true, customText: "سوپاس بۆ کڕینەکەت" },
      qr:        { visible: true },
      footer:    { footerStyle: "centered" },
    }),
    showBonusCol: true,
    defaultDiscount: 0,
    defaultNote: "سوپاس بۆ کڕینەکەت",
    defaultTerms: "",
    options: { paperSize: "A4", primaryColor: "#4263EB", fontFamily: "system" },
  },

  // 2. Bold Banner — banner header, bordered table, large total
  {
    name: "بانەری ئاوەدان",
    docType: "invoice",
    blocks: blocks({
      header:    { headerLayout: "banner" },
      items:     { tableStyle: "bordered", stripedRows: false },
      summary:   { summaryStyle: "large" },
      signature: { visible: true, signatureCount: 2, showSignatureLine: true },
      footer:    { footerStyle: "full" },
    }),
    showBonusCol: true,
    defaultDiscount: 0,
    defaultNote: "",
    defaultTerms: "",
    options: { paperSize: "A4", primaryColor: "#C2255C", fontFamily: "system" },
  },

  // 3. Thermal Receipt — minimal header, compact table, inline summary
  {
    name: "وەسڵی حەرارەتی",
    docType: "receipt",
    blocks: blocks({
      header:    { headerLayout: "centered", showLogo: false, showNameEn: false, showContact: false },
      parties:   { partiesLayout: "stacked", showCity: false, showWarehouse: false },
      items:     { tableStyle: "compact", showRowNumbers: false, showUnitPrice: false, stripedRows: false },
      summary:   { summaryStyle: "inline" },
      qr:        { visible: false },
      signature: { visible: false },
      footer:    { footerStyle: "minimal" },
    }),
    showBonusCol: false,
    defaultDiscount: 0,
    defaultNote: "",
    defaultTerms: "",
    options: { paperSize: "thermal", primaryColor: "#1A1A2E", fontFamily: "system" },
  },

  // 4. Elegant Quote — centered header, minimal table, card summary
  {
    name: "نرخنامەی ئەلیگانت",
    docType: "quote",
    blocks: blocks({
      header:    { headerLayout: "centered" },
      items:     { tableStyle: "minimal", stripedRows: false },
      summary:   { summaryStyle: "card" },
      terms:     { visible: true, customText: "ئەم نرخنامەیە ٣٠ ڕۆژ ماوەی هەیە" },
      signature: { visible: true, signatureCount: 1, showSignatureLine: true },
      footer:    { footerStyle: "centered" },
    }),
    showBonusCol: false,
    defaultDiscount: 0,
    defaultNote: "",
    defaultTerms: "ئەم نرخنامەیە ٣٠ ڕۆژ ماوەی هەیە",
    options: { paperSize: "A4", primaryColor: "#7C3AED", fontFamily: "system" },
  },

  // 5. Delivery Slip — minimal header, bordered table, no signature
  {
    name: "وەرقەی گەیاندن",
    docType: "delivery",
    blocks: blocks({
      header:    { headerLayout: "minimal", showStatus: true },
      parties:   { showPhone: true, showCity: true, showWarehouse: true },
      items:     { tableStyle: "bordered", showUnitPrice: false, showRowNumbers: true },
      summary:   { visible: false },
      qr:        { visible: false },
      signature: { visible: true, signatureCount: 2, showSignatureLine: true,
                   signatureLabels: ["واژووی شۆفێر", "واژووی وەرگر"] },
      footer:    { footerStyle: "minimal" },
    }),
    showBonusCol: false,
    defaultDiscount: 0,
    defaultNote: "",
    defaultTerms: "",
    options: { paperSize: "A5", primaryColor: "#F47B35", fontFamily: "system" },
  },
];
