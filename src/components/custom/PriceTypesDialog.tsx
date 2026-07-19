"use client";
import { useState } from "react";
import { Tag, Plus, Trash2, Hash } from "lucide-react";
import { useData } from "@/lib/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PriceTypesDialog({ open, onClose }: Props) {
  const { priceTypes, addPriceType, deletePriceType } = useData();
  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError]       = useState("");

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (priceTypes.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError("ئەم جۆرە پێشتر هەیە");
      return;
    }
    setError("");
    setAdding(true);
    await addPriceType(name);
    setNewName("");
    setAdding(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={o => !o && onClose()}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag size={14} className="text-primary" />
              </div>
              جۆرەکانی نرخ
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              جۆرەکانی نرخ بەرێوەببە — زیادکردن و سڕینەوە
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-1.5">
            {priceTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Tag size={28} className="opacity-20" />
                <p className="text-sm">هیچ جۆرێکی نرخ نییە</p>
              </div>
            ) : (
              priceTypes.map((pt, i) => (
                <div
                  key={pt.id}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    "bg-muted/40 hover:bg-muted border border-transparent hover:border-border"
                  )}
                >
                  <div className="size-6 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
                    <Hash size={10} className="text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-semibold">{pt.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteId(pt.id)}
                    className="size-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="سڕینەوە"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t px-4 py-4 bg-muted/20 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              زیادکردنی جۆری نوێ
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="بۆ نموونە: نرخی هاوپەیمان، نرخی کۆگا..."
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && !adding && handleAdd()}
                className="flex-1 h-9 text-[13px]"
                dir="rtl"
              />
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || adding}
                size="sm"
                className="h-9 px-4"
              >
                <Plus size={14} className="me-1" />
                زیادکردن
              </Button>
            </div>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی جۆری نرخ</AlertDialogTitle>
            <AlertDialogDescription>
              دڵنیایت؟ ئەم جۆرەی نرخ دەسڕێتەوە. بەرهەمەکانی کە ئەم جۆرەیان هەیە کاریگەر دەبێت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deletePriceType(deleteId); setDeleteId(null); }}
            >
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
