"use client";
import { useState, FormEvent } from "react";
import { Plus, Globe, Edit3, Trash2, Search } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Supplier } from "@/lib/types";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const supplierExportCols = [
  { key: "name", label: "ناو" }, { key: "contact", label: "پەیوەند" },
  { key: "phone", label: "تەلەفۆن" }, { key: "email", label: "ئیمەیل" },
  { key: "country", label: "کۆمەڵ" }, { key: "balance", label: "باڵانس", format: (v: unknown) => String(v) },
];

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", country: "", balance: "0", isActive: true });

  const resetForm = () => setForm({ name: "", contact: "", phone: "", email: "", country: "", balance: "0", isActive: true });
  const openAdd = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, country: s.country, balance: String(s.balance), isActive: s.isActive }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, balance: Number(form.balance) };
    if (editing) updateSupplier(editing.id, data);
    else addSupplier(data);
    setModalOpen(false);
  };

  const filtered = suppliers.filter(s => s.name.includes(searchTerm) || s.country.includes(searchTerm));

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-500">
            <Globe className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">دابینکەرەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی دابینکەرانی نێودەوڵەتی</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={supplierExportCols} filename="suppliers" title="دابینکەرەکان" />
          <Button onClick={openAdd}><Plus className="size-4 me-1" />دابینکەری نوێ</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: "کۆی دابینکەران", value: String(suppliers.length), cls: "text-primary" },
          { title: "چالاک", value: String(suppliers.filter(s => s.isActive).length), cls: "text-emerald-600" },
          { title: "کۆی مامەڵە", value: formatIQD(suppliers.reduce((s, x) => s + x.balance, 0)), cls: "text-violet-600" },
        ].map(k => (
          <Card key={k.title} className="card-interactive">
            <CardContent className="p-4">
              <p className={`text-2xl font-black ${k.cls}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-5 max-w-xs">
        <Search className="size-3.5 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input type="text" placeholder="گەڕان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pe-9" />
      </div>

      {/* ── Data Table ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right">دابینکەر</TableHead>
                <TableHead className="text-right">پەیوەندیدار</TableHead>
                <TableHead className="text-right">تەلەفۆن</TableHead>
                <TableHead className="text-right">ئیمەیڵ</TableHead>
                <TableHead className="text-right">وڵات</TableHead>
                <TableHead className="text-right">مامەڵە</TableHead>
                <TableHead className="text-right">بارودۆخ</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">هیچ دابینکەرێک نەدۆزرایەوە</TableCell>
                </TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contact}</TableCell>
                  <TableCell className="text-xs text-muted-foreground ltr text-right">{s.phone}</TableCell>
                  <TableCell className="text-xs text-primary">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">{s.country}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatIQD(s.balance)}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold",
                      s.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                      <span className={cn("size-1.5 rounded-full", s.isActive ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                      {s.isActive ? "چالاک" : "ناچالاک"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" onClick={() => openEdit(s)}><Edit3 className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive hover:bg-destructive/5" onClick={() => setDeleteId(s.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">{filtered.length} دابینکەر</div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "دەستکاری دابینکەر" : "دابینکەری نوێ"}</DialogTitle>
            <DialogDescription>زانیاری دابینکەر پڕبکەوە</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup-name">ناوی کۆمپانیا *</Label>
                <Input id="sup-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-contact">پەیوەندیدار *</Label>
                <Input id="sup-contact" required value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-phone">تەلەفۆن</Label>
                <Input id="sup-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-email">ئیمەیڵ</Label>
                <Input id="sup-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-country">وڵات</Label>
                <Input id="sup-country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="بۆ نموونە: تورکیا 🇹🇷" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-balance">مامەڵە (د.ع)</Label>
                <Input id="sup-balance" type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
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
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی دابینکەر</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم دابینکەرە؟ ئەم کردارە ناگەڕێتەوە.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteSupplier(deleteId); setDeleteId(null); }}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
