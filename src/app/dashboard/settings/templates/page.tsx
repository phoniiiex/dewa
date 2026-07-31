"use client";
// ============================================================
// DEWA — Invoice Template Manager
//
// Full-page template management with:
//   - Template cards (max 3) with add/edit/delete/set-default
//   - Signature canvas drawing + saved signatures list
//   - Opens InvoiceBuilder for editing
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Star, StarOff, ArrowRight,
  FileText, PenLine, CheckCircle,
} from "lucide-react";
import InvoiceBuilder from "@/components/print/InvoiceBuilder";
import SignatureCanvas from "@/components/custom/SignatureCanvas";
import type { InvoiceTemplate, SavedSignature } from "@/lib/types";

const MAX_TEMPLATES = 3;

export default function TemplatesPage() {
  const router = useRouter();
  const {
    invoiceTemplates, deleteTemplate, updateTemplate,
    savedSignatures, addSignature, deleteSignature, setDefaultSignature,
  } = useData();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "template" | "signature"; id: string; name: string } | null>(null);

  // ── Template actions ──
  const openNewTemplate = () => {
    if (invoiceTemplates.length >= MAX_TEMPLATES) return;
    setEditingTemplate(null);
    setBuilderOpen(true);
  };

  const openEditTemplate = (t: InvoiceTemplate) => {
    setEditingTemplate(t);
    setBuilderOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    // Unset all, then set this one
    for (const t of invoiceTemplates) {
      if (t.isDefault && t.id !== id) await updateTemplate(t.id, { isDefault: false });
    }
    await updateTemplate(id, { isDefault: true });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "template") deleteTemplate(deleteTarget.id);
    else deleteSignature(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Signature save ──
  const handleSaveSignature = async (dataUrl: string) => {
    await addSignature({
      name: `واژوو ${savedSignatures.length + 1}`,
      imageUrl: dataUrl,
      isDefault: savedSignatures.length === 0,
      userId: "",
      userName: "",
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8" dir="rtl">
      {/* ── Back ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/settings")} className="gap-1 text-xs">
          <ArrowRight className="size-3.5" /> ڕێکخستنەکان
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TEMPLATES SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" /> داڕێژەکانی چاپ
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              تا {MAX_TEMPLATES} داڕێژە دروستبکە. داڕێژەی بنەڕەتی لەکاتی چاپکردنی خێرادا بەکاردێت.
            </p>
          </div>
          <Button
            onClick={openNewTemplate}
            disabled={invoiceTemplates.length >= MAX_TEMPLATES}
            className="gap-1.5"
          >
            <Plus className="size-4" /> داڕێژەی نوێ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {invoiceTemplates.map(t => (
            <Card key={t.id} className={`relative transition-all ${t.isDefault ? "ring-2 ring-primary/50 border-primary" : ""}`}>
              <CardContent className="p-5">
                {/* Default badge */}
                {t.isDefault && (
                  <Badge className="absolute top-3 left-3 text-[10px] bg-primary/90">بنەڕەتی</Badge>
                )}

                {/* Preview mini */}
                <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border/50 min-h-[120px] flex flex-col justify-center text-center">
                  <div className="text-lg font-bold text-primary/80">{t.name || "بێ ناو"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 space-x-2 space-x-reverse">
                    <span>سەرپەڕە: {t.header.layout}</span>
                    <span>•</span>
                    <span>خشتە: {t.table.layout}</span>
                    <span>•</span>
                    <span>{t.paperSize}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {t.showHeader && <Badge variant="outline" className="text-[8px] px-1.5 py-0">سەرپەڕە</Badge>}
                    {t.showItemsTable && <Badge variant="outline" className="text-[8px] px-1.5 py-0">خشتە</Badge>}
                    {t.showSummary && <Badge variant="outline" className="text-[8px] px-1.5 py-0">کورتە</Badge>}
                    {t.showQR && <Badge variant="outline" className="text-[8px] px-1.5 py-0">QR</Badge>}
                    {t.showSignature && <Badge variant="outline" className="text-[8px] px-1.5 py-0">واژوو</Badge>}
                    {t.watermark && <Badge variant="outline" className="text-[8px] px-1.5 py-0">واتەرمارک</Badge>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="text-xs gap-1 flex-1" onClick={() => openEditTemplate(t)}>
                    <Pencil className="size-3" /> دەستکاری
                  </Button>
                  <Button
                    size="sm"
                    variant={t.isDefault ? "secondary" : "outline"}
                    className="text-xs gap-1"
                    onClick={() => handleSetDefault(t.id)}
                    disabled={t.isDefault}
                  >
                    {t.isDefault ? <Star className="size-3 text-amber-500" /> : <StarOff className="size-3" />}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget({ type: "template", id: t.id, name: t.name })}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add card */}
          {invoiceTemplates.length < MAX_TEMPLATES && (
            <Card
              className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              onClick={openNewTemplate}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                <Plus className="size-10 mb-2 opacity-40" />
                <span className="text-sm">داڕێژەی نوێ زیادبکە</span>
                <span className="text-[10px] mt-1">{invoiceTemplates.length}/{MAX_TEMPLATES}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          SIGNATURES SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <PenLine className="size-5 text-primary" /> واژووەکان
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          واژووت بکێشە و پاشەکەوتی بکە. لەکاتی چاپکردندا واژووی بنەڕەتی یان هەر واژووێکی تر هەڵبژێرە.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas */}
          <div>
            <SignatureCanvas onSave={handleSaveSignature} />
          </div>

          {/* Saved signatures */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">واژووە پاشەکەوتکراوەکان</h3>
            {savedSignatures.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8 border rounded-lg border-dashed">
                هیچ واژووێک پاشەکەوت نەکراوە
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {savedSignatures.map((sig: SavedSignature) => (
                  <div
                    key={sig.id}
                    className={`relative border rounded-lg p-3 transition-all ${
                      sig.isDefault ? "ring-2 ring-primary/40 border-primary" : "border-border"
                    }`}
                  >
                    {sig.isDefault && (
                      <Badge className="absolute top-1.5 left-1.5 text-[8px] bg-primary/80">بنەڕەتی</Badge>
                    )}
                    <div className="bg-white dark:bg-zinc-950 rounded p-2 mb-2 flex items-center justify-center min-h-[60px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sig.imageUrl} alt={sig.name} className="max-h-[50px] max-w-full object-contain" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="text-[10px] flex-1 h-6 gap-0.5"
                        onClick={() => setDefaultSignature(sig.id)}
                        disabled={sig.isDefault}
                      >
                        <CheckCircle className="size-2.5" /> بنەڕەتی
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-[10px] text-destructive h-6"
                        onClick={() => setDeleteTarget({ type: "signature", id: sig.id, name: sig.name })}
                      >
                        <Trash2 className="size-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Invoice Builder Sheet ═══ */}
      <InvoiceBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingTemplate(null); }}
        editTemplate={editingTemplate}
      />

      {/* ═══ Delete Confirm ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوە؟</AlertDialogTitle>
            <AlertDialogDescription>
              ئایا دڵنیایت لە سڕینەوەی <strong>{deleteTarget?.name}</strong>؟ ئەم کارە ناگەڕێتەوە.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
