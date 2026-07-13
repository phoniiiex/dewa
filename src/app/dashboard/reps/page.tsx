"use client";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { useState, FormEvent, useMemo, useRef } from "react";
import { Search, Plus, UserCheck, Phone, MapPin, Edit3, Trash2, Camera } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Rep } from "@/lib/types";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const repExportCols = [
  { key: "name", label: "ناو" }, { key: "phone", label: "تەلەفۆن" },
  { key: "city", label: "شار" }, { key: "isActive", label: "بارودۆخ", format: (v: unknown) => v ? "چالاک" : "ناچالاک" },
];

const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function RepsPage() {
  const { reps, clients, orders, addRep, updateRep, deleteRep } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);
  const [detailRep, setDetailRep] = useState<Rep | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true });

  const resetForm = () => setForm({ name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true });
  const openAdd  = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (r: Rep) => { setEditing(r); setForm({ name: r.name, phone: r.phone, email: r.email || "", city: r.city, profilePic: r.profilePic || "", isActive: r.isActive }); setModalOpen(true); };

  const picInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const MAX = 200;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) updateRep(editing.id, form);
    else addRep({ ...form, telegramChatId: "" });
    setModalOpen(false);
  };

  const filtered = useMemo(
    () => reps.filter(r => r.name.includes(searchTerm) || r.phone.includes(searchTerm)),
    [reps, searchTerm]
  );

  const repStats = useMemo(() => {
    const map: Record<string, { clientCount: number; orderCount: number; revenue: number }> = {};
    reps.forEach(r => {
      const repOrders = orders.filter(o => o.repId === r.id);
      map[r.id] = {
        clientCount: clients.filter(c => c.repId === r.id).length,
        orderCount:  repOrders.length,
        revenue:     repOrders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
      };
    });
    return map;
  }, [reps, orders, clients]);

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">نوێنەرانی فرۆشتن</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی نوێنەرانی فرۆشتنی دەرمان</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={repExportCols} filename="reps" title="نوێنەران" />
          <Button onClick={openAdd}><Plus className="size-4 me-1" />نوێنەری نوێ</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { title: "کۆی نوێنەران",  value: reps.length,                                                                      cls: "text-primary" },
          { title: "چالاک",           value: reps.filter(r => r.isActive).length,                                               cls: "text-emerald-600" },
          { title: "کۆی کڕیاران",  value: clients.length,                                                                    cls: "text-sky-600" },
          { title: "کۆی داهات",   value: formatIQD(orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0)), cls: "text-cyan-600" },
        ].map(k => (
          <Card key={k.title} className="card-interactive">
            <CardContent className="p-4">
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search ── */}
      <Card className="mb-5">
        <CardContent className="p-3 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input type="text" placeholder="گەڕان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm" />
        </CardContent>
      </Card>

      {/* ── Rep Cards ── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {filtered.map(r => (
          <Card key={r.id} className="card-interactive cursor-pointer" onClick={() => setDetailRep(r)}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                <OreoAvatar src={r.profilePic} name={r.name} size={48} />
                  <div>
                    <h3 className="font-bold text-base">{r.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="size-3" />{r.city}</div>
                  </div>
                </div>
                <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px]">{r.isActive ? "چالاک" : "ناچالاک"}</Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Phone className="size-3" />
                <span dir="ltr">{r.phone}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg mb-3">
                <div className="text-center">
                  <p className="text-lg font-black text-primary">{repStats[r.id]?.clientCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">کڕیار</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-orange-500">{repStats[r.id]?.orderCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">داواکاری</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-emerald-600">{formatIQD(repStats[r.id]?.revenue ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground">داهات</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); openEdit(r); }}>
                  <Edit3 className="size-3 me-1" /> دەستکاری
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive/40 hover:bg-destructive/5" onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}>
                  <Trash2 className="size-3 me-1" /> سڕینەوە
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "دەستکاری نوێنەر" : "نوێنەری نوێ"}</DialogTitle>
            <DialogDescription>زانیاری نوێنەری فرۆشتن پڕبکەوە</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center">
              <OreoAvatar src={form.profilePic} name={form.name || "?"} size={80} className="cursor-pointer" />
              <div className="absolute bottom-1 right-1 size-6 bg-primary rounded-full flex items-center justify-center"><Camera className="size-3 text-white" /></div>
              <input ref={picInputRef} type="file" accept="image/*" className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try { setForm(prev => ({ ...prev, profilePic: "" })); const b64 = await resizeImage(f); setForm(prev => ({ ...prev, profilePic: b64 })); }
                  catch { alert("وێنەکە بارنەبوو"); }
                }}
              />
            </div>
            {form.profilePic && (
              <div className="text-center">
                <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => setForm(prev => ({ ...prev, profilePic: "" }))}>
                  سڕینەوەی وێنە
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rep-name">ناوی نوێنەر *</Label>
                <Input id="rep-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-email">ئیمەیڵ</Label>
                <Input id="rep-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="rep@example.com" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-phone">تەلەفۆن *</Label>
                <Input id="rep-phone" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0770 XXX XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-city">شار</Label>
                <Select value={form.city || cities[0]} onValueChange={(v: string | null) => v && setForm({ ...form, city: v })}>
                  <SelectTrigger id="rep-city"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="rep-active">چالاک</Label>
                <Switch id="rep-active" checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>پاشگەزبوونەوە</Button>
              <Button type="submit">{editing ? "نوێکردنەوە" : "زیادکردن"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DETAIL SHEET
      ═══════════════════════════════════════════════════════════ */}
      <Sheet open={!!detailRep} onOpenChange={open => !open && setDetailRep(null)}>
        <SheetContent side="left" className="w-[440px] overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle>{detailRep?.name}</SheetTitle>
          </SheetHeader>
          {detailRep && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-xs text-muted-foreground mb-1">تەلەفۆن</p><p className="font-semibold text-sm">{detailRep.phone}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">شار</p><p className="font-semibold text-sm">{detailRep.city}</p></div>
              </div>
              <h4 className="font-bold text-sm mb-3">کڕیارانی تایبەت ({clients.filter(c => c.repId === detailRep.id).length})</h4>
              <div className="flex flex-col gap-1.5 mb-6">
                {clients.filter(c => c.repId === detailRep.id).map(c => (
                  <div key={c.id} className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.city}</span>
                  </div>
                ))}
              </div>
              <h4 className="font-bold text-sm mb-3">داواکارییەکان ({orders.filter(o => o.repId === detailRep.id).length})</h4>
              <div className="flex flex-col gap-1.5">
                {orders.filter(o => o.repId === detailRep.id).map(o => (
                  <div key={o.id} className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg">
                    <div><span className="font-semibold text-sm">{o.orderNumber}</span> <span className="text-xs text-muted-foreground">{o.clientName}</span></div>
                    <span className="font-semibold text-sm">{formatIQD(o.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی نوێنەر</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم نوێنەرە؟ ئەم کردارە ناگەڕێتەوە.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteRep(deleteId); setDeleteId(null); }}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
