"use client";
import { useState, FormEvent } from "react";
import { Plus, Warehouse as WarehouseIcon, Edit3, Trash2, MapPin, Phone, Percent, Tag, X } from "lucide-react";
import { useData } from "@/lib/store";
import type { Warehouse, BonusRule } from "@/lib/types";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const warehouseExportCols = [
  { key: "name", label: "ناو" }, { key: "city", label: "شار" },
  { key: "contact", label: "پەیوەند" }, { key: "phone", label: "تەلەفۆن" },
  { key: "bonusPct", label: "ڕێژەی بۆنەس", format: (v: unknown) => `${v}%` },
];

const cities = ["سلێمانی", "هەولێر", "دهۆک", "کەرکوک", "هەڵەبجە"];

export default function WarehousesPage() {
  const { warehouses, orders, products, addWarehouse, updateWarehouse, deleteWarehouse, loading } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", city: cities[0], address: "", contact: "", phone: "",
    bonusPct: "15", isActive: true,
  });
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);

  const resetForm = () => {
    setForm({ name: "", city: cities[0], address: "", contact: "", phone: "", bonusPct: "15", isActive: true });
    setBonusRules([]);
  };
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({ name: w.name, city: w.city, address: w.address, contact: w.contact, phone: w.phone, bonusPct: String(w.bonusPct), isActive: w.isActive });
    setBonusRules(w.bonusRules || []);
    setModalOpen(true);
  };

  const addRule = () => setBonusRules([...bonusRules, { productId: "", productName: "", percent: 0 }]);
  const removeRule = (idx: number) => setBonusRules(bonusRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setBonusRules(bonusRules.map((r, i) => i === idx ? { ...r, productId, productName: prod?.name || "" } : r));
  };
  const updateRulePct = (idx: number, percent: number) => {
    setBonusRules(bonusRules.map((r, i) => i === idx ? { ...r, percent } : r));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validRules = bonusRules.filter(r => r.productId && r.percent > 0);
    const data = { ...form, bonusPct: Number(form.bonusPct), bonusRules: validRules };
    if (editing) updateWarehouse(editing.id, data);
    else addWarehouse(data);
    setModalOpen(false);
  };

  const getWarehouseOrders = (whId: string) => orders.filter(o => o.warehouseId === whId);

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <WarehouseIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">کۆگاکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی هاوبەشی کۆگاکان و ڕێژەی بۆنەس</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={warehouses as unknown as Record<string, unknown>[]} columns={warehouseExportCols} filename="warehouses" title="کۆگاکان" />
          <Button onClick={openAdd}><Plus className="size-4 me-1" />کۆگای نوێ</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: "کۆی کۆگاکان", value: warehouses.length, cls: "text-primary" },
          { title: "چالاک", value: warehouses.filter(w => w.isActive).length, cls: "text-emerald-600" },
          { title: "داواکاری لە ڕێگەی کۆگا", value: orders.filter(o => o.warehouseId).length, cls: "text-violet-600" },
        ].map(k => (
          <Card key={k.title} className="card-interactive">
            <CardContent className="p-4">
              <p className={`text-2xl font-black ${k.cls}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Warehouse Cards ── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
        {loading ? (
          [0, 1, 2].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-6 w-3/4 mb-3" /><Skeleton className="h-4 w-1/2 mb-6" /><Skeleton className="h-20" /></CardContent></Card>
          ))
        ) : warehouses.map(w => {
          const rules = w.bonusRules || [];
          return (
            <Card key={w.id} className="card-interactive">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-bold mb-1">{w.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />{w.city} — {w.address}
                    </div>
                  </div>
                  <div className="gradient-primary text-white px-3 py-1.5 rounded-lg text-lg font-black flex items-center gap-1">
                    {w.bonusPct}<Percent className="size-3.5" />
                  </div>
                </div>

                {/* Contact */}
                <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Phone className="size-3" /> {w.phone}</div>
                  <div>پەیوەندی: {w.contact}</div>
                </div>

                {/* Bonus Rules */}
                {rules.length > 0 && (
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[11px] font-bold text-primary mb-2 flex items-center gap-1">
                      <Tag className="size-3" /> یاسای تایبەت ({rules.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {rules.map((r, i) => (
                        <Badge key={i} className="text-[10px] font-semibold">
                          {r.productName}: {r.percent}قۆ
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg mb-4">
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{getWarehouseOrders(w.id).length}</p>
                    <p className="text-[10px] text-muted-foreground">داواکاری</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-violet-600">{w.bonusPct}قۆ</p>
                    <p className="text-[10px] text-muted-foreground">بۆنەسی بنەڕەت</p>
                  </div>
                  {rules.length > 0 && (
                    <div className="text-center">
                      <p className="text-xl font-black text-orange-500">{rules.length}</p>
                      <p className="text-[10px] text-muted-foreground">یاسای تایبەت</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openEdit(w)}>
                    <Edit3 className="size-3 me-1" /> دەستکاری
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive/40 hover:bg-destructive/5" onClick={() => setDeleteId(w.id)}>
                    <Trash2 className="size-3 me-1" /> سڕینەوە
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT DIALOG (replaces custom Modal)
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "دەستکاری کۆگا" : "کۆگای نوێ"}</DialogTitle>
            <DialogDescription>زانیاری کۆگا و ڕێژەی بۆنەس پڕبکەوە</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-name">ناوی کۆگا *</Label>
                <Input id="wh-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ناوی کۆگا" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-city">شار</Label>
                <Select value={form.city || cities[0]} onValueChange={(v: string | null) => v && setForm({ ...form, city: v })}>
                  <SelectTrigger id="wh-city"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-address">ناونیشان</Label>
                <Input id="wh-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="ناونیشان" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-contact">پەیوەندیدار</Label>
                <Input id="wh-contact" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="ناوی پەیوەندیدار" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-phone">تەلەفۆن</Label>
                <Input id="wh-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-bonus">ڕێژەی بۆنەسی بنەڕەت (٪) *</Label>
                <Input id="wh-bonus" type="number" min={0} max={100} required value={form.bonusPct} onChange={e => setForm({ ...form, bonusPct: e.target.value })} />
              </div>
            </div>

            {/* ── Product-specific bonus rules ── */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-bold flex items-center gap-1.5"><Tag className="size-3.5 text-primary" /> یاسای بۆنەسی تایبەت بە بەرهەم</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">هەر بەرهەمێک دەتوانێت ڕێژەی بۆنەسی خۆی هەبێت کە جیاوازە لە ڕێژەی بنەڕەت</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addRule} className="text-primary border-dashed border-primary/30 hover:bg-primary/5 text-xs h-7">
                  <Plus className="size-3 me-1" /> بەرهەمی تایبەت
                </Button>
              </div>
              {bonusRules.length === 0 ? (
                <div className="py-3.5 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
                  هیچ یاسایەکی تایبەت نەهاتووە — هەموو بەرهەمەکان ڕێژەی بنەڕەت ({form.bonusPct}٪) بەکاردەهێنن
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {bonusRules.map((rule, i) => (
                    <div key={i} className="flex gap-2 items-center p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                      <Select value={rule.productId || ""} onValueChange={(v: string | null) => v && updateRule(i, v)}>
                        <SelectTrigger className="flex-[2]"><SelectValue placeholder="بەرهەم هەڵبژێرە..." /></SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.isActive).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" min={0} max={100}
                          value={rule.percent || ""}
                          onChange={e => updateRulePct(i, Number(e.target.value))}
                          placeholder="٪"
                          className="w-[70px] text-center"
                        />
                        <span className="text-sm font-bold text-primary">٪</span>
                      </div>
                      {rule.productId && rule.percent > 0 && (
                        <Badge className="text-[10px] whitespace-nowrap">
                          بۆ {rule.productName}: {rule.percent}٪
                        </Badge>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="size-6 text-destructive shrink-0" onClick={() => removeRule(i)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>پاشگەزبوونەوە</Button>
              <Button type="submit">{editing ? "نوێکردنەوە" : "زیادکردن"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRM (replaces custom ConfirmDialog)
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی کۆگا</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم کۆگایە؟ ئەم کردارە ناگەڕێتەوە.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteWarehouse(deleteId); setDeleteId(null); }}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
