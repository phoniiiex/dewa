"use client";
import { useState } from "react";
import { Truck, Plus, Trash2, Edit2, Check, Search, Wifi, RefreshCw, UserPlus } from "lucide-react";
import { useData } from "@/lib/store";
import { getTelegramUpdates } from "@/lib/telegram";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const CITIES = ["هەولێر", "سلێمانی", "کەرکووک", "دهۆک", "زاخۆ", "ڕانیە", "کۆیە", "چەمچەماڵ", "شاری دیگر"];

type TelegramUser = { chatId: string; firstName: string; lastName: string; username: string };

export default function DriversPage() {
  const { drivers, settings, addDriver, updateDriver, deleteDriver, showToast, loading } = useData();

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([]);
  const [scanError, setScanError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm = { name: "", phone: "", city: "", telegramChatId: "", isActive: true };
  const [form, setForm] = useState(emptyForm);

  const filtered = drivers.filter(d =>
    d.name.includes(search) || d.city.includes(search) || d.phone.includes(search)
  );

  const openAdd = (prefill?: Partial<typeof emptyForm>) => {
    setEditId(null);
    setForm({ ...emptyForm, ...prefill });
    setFormOpen(true);
  };

  const openEdit = (d: typeof drivers[0]) => {
    setEditId(d.id);
    setForm({ name: d.name, phone: d.phone, city: d.city, telegramChatId: d.telegramChatId, isActive: d.isActive });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("ناوی شوفێر داخل بکە", "error"); return; }
    if (editId) {
      await updateDriver(editId, form);
      showToast("زانیاری نوێکرایەوە");
    } else {
      await addDriver(form);
      showToast("شوفێر زیادکرا ✅");
    }
    setFormOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handleScan = async () => {
    if (!settings.telegramBotToken) {
      setScanError("تکایە سەرەتا تۆکنی بۆت لە ڕووپەلی تێلێگرام داخل بکە");
      return;
    }
    setScanning(true);
    setScanError("");
    setTelegramUsers([]);
    const users = await getTelegramUpdates(settings.telegramBotToken);
    setScanning(false);
    if (users.length === 0) {
      setScanError("هیچ کەسێک نامەی نەنێردووە بۆ بۆتەکە. تکایە شوفێرەکان داوا بکە پەیامێک بنێرن بۆ بۆتەکە.");
    } else {
      setTelegramUsers(users);
    }
  };

  const handlePickUser = (u: TelegramUser) => {
    setScanOpen(false);
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
    openAdd({ telegramChatId: u.chatId, name: fullName });
  };

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Truck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">شوفێرەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی شوفێران و پەیوەندی تێلێگرامیان</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setScanOpen(true); handleScan(); }}>
            <Wifi className="size-4 me-1" /> کەشفکردن لە بۆت
          </Button>
          <Button onClick={() => openAdd()}>
            <Plus className="size-4 me-1" /> شوفێری نوێ
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <Card className="mb-5">
        <CardContent className="p-3 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="گەڕان بە ناو، شار یان مۆبایل..." className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm" />
        </CardContent>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "کۆی شوفێران",       value: drivers.length,                              cls: "text-primary" },
          { label: "چالاک",              value: drivers.filter(d => d.isActive).length,      cls: "text-emerald-600" },
          { label: "تێلێگرام بەکارهێنان", value: drivers.filter(d => d.telegramChatId).length, cls: "text-violet-600" },
        ].map(k => (
          <Card key={k.label} className="card-interactive">
            <CardContent className="p-4">
              <p className={cn("text-2xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Driver Cards ── */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">هیچ شوفێرێک نەدۆزرایەوە</CardContent></Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map(d => (
            <Card key={d.id} className={cn("card-interactive", !d.isActive && "opacity-55")}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-11 rounded-full flex items-center justify-center text-lg font-bold",
                      d.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>{d.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-base">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.city}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(d)}><Edit2 className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex gap-2 items-center">
                    <span className="text-muted-foreground w-16 text-xs">📞 مۆبایل</span>
                    <span className="font-semibold">{d.phone}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-muted-foreground w-16 text-xs">📱 بۆت</span>
                    {d.telegramChatId
                      ? <span className="text-emerald-600 font-semibold text-xs">✅ پەیوەندیکراوە</span>
                      : <span className="text-muted-foreground text-xs">— بە پەیوەند نییە</span>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-muted-foreground w-16 text-xs">بارودۆخ</span>
                    <Badge variant={d.isActive ? "default" : "secondary"} className="text-[10px]">{d.isActive ? "چالاک" : "ناچالاک"}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editId ? "دەستکاریکردنی شوفێر" : "شوفێری نوێ"}</DialogTitle>
            <DialogDescription>زانیاری شوفێر پڕبکەوە</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {form.telegramChatId && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                <Check className="size-4 shrink-0" />
                <span>Chat ID کەشفکرا: <strong>{form.telegramChatId}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drv-name">ناوی شوفێر *</Label>
                <Input id="drv-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ناوی تەواو..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drv-phone">ژمارەی مۆبایل</Label>
                <Input id="drv-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drv-city">شار</Label>
                <Select value={form.city || null} onValueChange={(v: string | null) => v && setForm({ ...form, city: v })}>
                  <SelectTrigger id="drv-city"><SelectValue placeholder="هەڵبژاردن..." /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <Label htmlFor="drv-active">چالاک</Label>
                  <Switch id="drv-active" checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditId(null); setForm(emptyForm); }}>پاشگەزبوونەوە</Button>
            <Button onClick={handleSave}>{editId ? "پاشەکەوتکردن" : "زیادکردن"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          TELEGRAM SCAN DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>کەشفکردنی شوفێران لە بۆتی تێلێگرام</DialogTitle>
            <DialogDescription>شوفێرەکان پێویستە سەرەتا پەیامێک بنێرن بۆ بۆتەکە</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-primary/5 rounded-lg text-sm text-primary border border-primary/10">
              💡 شوفێرەکان پێویستە سەرەتا پەیامێک بنێرن بۆ بۆتی تێلێگرام (<strong>@{settings.telegramBotUsername || "بۆتەکە"}</strong>) تا دەتوانیت کەشفیان بکەیت.
            </div>

            <Button onClick={handleScan} disabled={scanning} className="w-full">
              <RefreshCw className={cn("size-4 me-1", scanning && "animate-spin")} />
              {scanning ? "گەڕان..." : "دووبارە کەشفکردن"}
            </Button>

            {scanError && (
              <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">{scanError}</div>
            )}

            {telegramUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{telegramUsers.length} کەس دۆزرایەوە:</p>
                {telegramUsers.map(u => {
                  const alreadyAdded = drivers.some(d => d.telegramChatId === u.chatId);
                  return (
                    <div key={u.chatId} className={cn("flex items-center justify-between p-3 rounded-lg border", alreadyAdded ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900" : "bg-muted/50 border-border")}>
                      <div>
                        <p className="font-semibold text-sm">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.username ? `@${u.username} · ` : ""}Chat ID: {u.chatId}</p>
                      </div>
                      {alreadyAdded
                        ? <span className="text-xs text-emerald-600 font-semibold">✅ زیادکراوە</span>
                        : <Button size="sm" onClick={() => handlePickUser(u)}><UserPlus className="size-3 me-1" /> زیادکردن</Button>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی شوفێر</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم شوفێرە؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteDriver(deleteId); setDeleteId(null); }}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
