"use client";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { useState, FormEvent, useMemo, useRef } from "react";
import { Search, Plus, UserCheck, Phone, MapPin, Edit3, Trash2, Camera } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Rep } from "@/lib/types";
import LocationPicker from "@/components/custom/LocationPicker";
import { getRegionNames, getDistricts, getSubDistricts, buildLocationPath } from "@/lib/locations";
import { Separator } from "@/components/ui/separator";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

const cities = getRegionNames();

export default function RepsPage() {
  const { reps, clients, orders, products, addRep, updateRep, deleteRep,
    repAssignments, repCommissions, addRepAssignmentBulk, deleteRepAssignmentByProduct, updateCommissionStatus } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);
  const [detailRep, setDetailRep] = useState<Rep | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<{ productId: string; productName: string; existingRepName: string; regions: string[] } | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true,
    territories: [] as string[], insideLocations: [] as string[],
    insideCityPct: "", outsideCityPct: "",
  });

  const resetForm = () => setForm({
    name: "", phone: "", email: "", city: cities[0], profilePic: "", isActive: true,
    territories: [], insideLocations: [], insideCityPct: "", outsideCityPct: "",
  });
  const openAdd  = () => { resetForm(); setEditing(null); setModalOpen(true); };
  const openEdit = (r: Rep) => {
    setEditing(r);
    setForm({
      name: r.name, phone: r.phone, email: r.email || "", city: r.city,
      profilePic: r.profilePic || "", isActive: r.isActive,
      territories: r.territories || [], insideLocations: r.insideLocations || [],
      insideCityPct: r.insideCityPct ? String(r.insideCityPct) : "",
      outsideCityPct: r.outsideCityPct ? String(r.outsideCityPct) : "",
    });
    setModalOpen(true);
  };

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

  // Build all available locations for selected territories
  const availableInsideLocations = useMemo(() => {
    const locs: string[] = [];
    for (const territory of form.territories) {
      for (const district of getDistricts(territory)) {
        const dPath = buildLocationPath(territory, district.name);
        locs.push(dPath);
        for (const sub of getSubDistricts(territory, district.name)) {
          locs.push(buildLocationPath(territory, district.name, sub.name));
        }
      }
    }
    return locs;
  }, [form.territories]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      insideCityPct: Number(form.insideCityPct) || 0,
      outsideCityPct: Number(form.outsideCityPct) || 0,
    };
    if (editing) updateRep(editing.id, payload);
    else addRep({ ...payload, telegramChatId: "" });
    setModalOpen(false);
  };

  const filtered = useMemo(
    () => reps.filter(r => r.name.includes(searchTerm) || r.phone.includes(searchTerm)),
    [reps, searchTerm]
  );

  const repStats = useMemo(() => {
    const map: Record<string, { clientCount: number; orderCount: number; revenue: number; pendingBonusQty: number }> = {};
    reps.forEach(r => {
      const repOrders = orders.filter(o => o.repId === r.id);
      map[r.id] = {
        clientCount: clients.filter(c => c.repId === r.id).length,
        orderCount:  repOrders.length,
        revenue:     repOrders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
        pendingBonusQty: repOrders
          .filter(o => !["PAID", "NOT_ACCEPTED"].includes(o.status))
          .reduce((s, o) => s + o.items.reduce((si, i) => si + (i.repBonusQty ?? 0), 0), 0),
      };
    });
    return map;
  }, [reps, orders, clients]);

  // All pending bonus lines for a rep (for detail sheet)
  const getRepPendingLines = (repId: string) =>
    orders
      .filter(o => o.repId === repId && !["PAID", "NOT_ACCEPTED"].includes(o.status))
      .flatMap(o =>
        o.items
          .filter(i => (i.repBonusQty ?? 0) > 0)
          .map(i => ({ orderNumber: o.orderNumber, clientName: o.clientName, productName: i.productName, pending: i.repBonusQty ?? 0, status: o.status }))
      );

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
          { title: "👤 بۆنەسی ماوە", value: `${reps.reduce((s,r) => s + (repStats[r.id]?.pendingBonusQty ?? 0), 0)} دانە`, cls: "text-orange-600" },
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
              {r.territories && r.territories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.territories.map(t => <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0">{t}</Badge>)}
                </div>
              )}
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
              {/* Pending bonus badge on card */}
              {(repStats[r.id]?.pendingBonusQty ?? 0) > 0 && (
                <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs text-orange-700">
                  <span>👤</span>
                  <span>بۆنەسی ماوە: <strong>{repStats[r.id]?.pendingBonusQty}</strong> دانە</span>
                </div>
              )}

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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
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
                <LocationPicker label="شوێن" value={form.city} onChange={v => setForm({ ...form, city: v })} />
              </div>
              {/* Territory assignment */}
              <div className="space-y-2">
                <Label>ناوچەکانی کارکردن (تێریتۆری)</Label>
                <p className="text-[11px] text-muted-foreground">ناوچەکان هەڵبژێرە کە ئەم نوێنەرە تێیاندا کار دەکات</p>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map(c => {
                    const isSelected = form.territories.includes(c);
                    return (
                      <button key={c} type="button"
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        }`}
                        onClick={() => setForm({
                          ...form,
                          territories: isSelected
                            ? form.territories.filter(t => t !== c)
                            : [...form.territories, c],
                        })}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inside/Outside city commission rates */}
              {form.territories.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="inside-pct">کۆمیشنی ناو شار %</Label>
                      <Input id="inside-pct" type="number" min={0} max={100} step={0.1}
                        value={form.insideCityPct} onChange={e => setForm({ ...form, insideCityPct: e.target.value })}
                        placeholder="مثلاً ٢" dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="outside-pct">کۆمیشنی دەرەوەی شار %</Label>
                      <Input id="outside-pct" type="number" min={0} max={100} step={0.1}
                        value={form.outsideCityPct} onChange={e => setForm({ ...form, outsideCityPct: e.target.value })}
                        placeholder="مثلاً ٤" dir="ltr" />
                    </div>
                  </div>

                  {/* Inside locations picker */}
                  <div className="space-y-2">
                    <Label>شوێنە ناوخۆییەکان (ناو شار)</Label>
                    <p className="text-[10px] text-muted-foreground">شوێنەکان هەڵبژێرە کە بۆ ئەم نوێنەرە &quot;ناو شار&quot; حیساب دەکرێن. هەر شوێنێکی تر &quot;دەرەوەی شار&quot; دەبێت.</p>
                    <div className="max-h-44 overflow-y-auto border rounded-lg p-2 space-y-0.5">
                      {availableInsideLocations.map(loc => {
                        const checked = form.insideLocations.includes(loc);
                        return (
                          <label key={loc} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer text-[11px]">
                            <input type="checkbox" checked={checked} className="rounded"
                              onChange={() => setForm({
                                ...form,
                                insideLocations: checked
                                  ? form.insideLocations.filter(l => l !== loc)
                                  : [...form.insideLocations, loc],
                              })} />
                            <span className={checked ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{loc.replace(/ > /g, " › ")}</span>
                          </label>
                        );
                      })}
                      {availableInsideLocations.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-3">سەرەتا ناوچەکان هەڵبژێرە</p>
                      )}
                    </div>
                  </div>
                </>
              )}

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
          DETAIL DRAWER (RIGHT SIDE)
      ═══════════════════════════════════════════════════════════ */}
      <Drawer open={!!detailRep} onOpenChange={open => !open && setDetailRep(null)} swipeDirection="left">
        <DrawerContent className="w-[460px] overflow-y-auto p-6">
          <DrawerHeader className="border-b pb-4 mb-4 px-0">
            <DrawerTitle>{detailRep?.name}</DrawerTitle>
          </DrawerHeader>
          {detailRep && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-xs text-muted-foreground mb-1">تەلەفۆن</p><p className="font-semibold text-sm">{detailRep.phone}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">شار</p><p className="font-semibold text-sm">{detailRep.city}</p></div>
              </div>
              {/* Commission rates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
                  <div className="text-[10px] text-emerald-600">کۆمیشنی ناو شار</div>
                  <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{detailRep.insideCityPct}%</div>
                </div>
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                  <div className="text-[10px] text-blue-600">کۆمیشنی دەرەوەی شار</div>
                  <div className="font-bold text-sm text-blue-700 dark:text-blue-400">{detailRep.outsideCityPct}%</div>
                </div>
              </div>
              {/* Inside locations */}
              {detailRep.insideLocations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1.5">شوێنە ناوخۆییەکان (ناو شار)</p>
                  <div className="flex flex-wrap gap-1">
                    {detailRep.insideLocations.map(loc => (
                      <Badge key={loc} variant="secondary" className="text-[10px] font-normal">{loc.replace(/ > /g, " › ")}</Badge>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="flex flex-col gap-1.5 mb-6">
                {orders.filter(o => o.repId === detailRep.id).map(o => (
                  <div key={o.id} className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg">
                    <div><span className="font-semibold text-sm">{o.orderNumber}</span> <span className="text-xs text-muted-foreground">{o.clientName}</span></div>
                    <span className="font-semibold text-sm">{formatIQD(o.totalAmount)}</span>
                  </div>
                ))}
              </div>

              {/* Pending Bonus Deliveries section */}
              {(() => {
                const lines = getRepPendingLines(detailRep.id);
                return (
                  <>
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <span>👤 بۆنەسی ماوەی نوێنەر</span>
                      <span className="ml-auto text-xs font-normal text-orange-600 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-full px-2 py-0.5">
                        {lines.reduce((s, l) => s + l.pending, 0)} دانە
                      </span>
                    </h4>
                    {lines.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-4">بۆنەسی ماوە نییە ✔️</div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {lines.map((l, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-lg">
                            <div>
                              <span className="font-semibold text-sm">{l.productName}</span>
                              <div className="text-[10px] text-muted-foreground">{l.orderNumber} — {l.clientName}</div>
                            </div>
                            <span className="text-orange-600 font-bold text-sm">+{l.pending}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              <Separator className="my-6" />

              {/* ── Product Assignments (Checkbox List) ── */}
              <h4 className="font-bold text-sm mb-3">📦 بەرهەمە تایبەتەکان</h4>
              {detailRep.territories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">سەرەتا ناوچەکان دیاریبکە</p>
              ) : (
                <div className="max-h-52 overflow-y-auto border rounded-lg p-2 space-y-0.5 mb-4">
                  {products.filter(p => p.isActive).map(p => {
                    const isAssigned = repAssignments.some(a => a.repId === detailRep.id && a.productId === p.id);
                    // Check if another rep has this product in any overlapping territory
                    const conflictRep = !isAssigned ? reps.find(r =>
                      r.id !== detailRep.id &&
                      detailRep.territories.some(t =>
                        repAssignments.some(a => a.repId === r.id && a.productId === p.id && a.region === t)
                      )
                    ) : null;
                    const conflictRegions = conflictRep
                      ? detailRep.territories.filter(t =>
                          repAssignments.some(a => a.repId === conflictRep.id && a.productId === p.id && a.region === t)
                        )
                      : [];

                    return (
                      <label key={p.id} className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                        isAssigned ? "bg-emerald-50 dark:bg-emerald-950/15" : "hover:bg-muted/50",
                        conflictRep && "opacity-80"
                      )}>
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Check for conflicts
                              if (conflictRep) {
                                setDupWarning({
                                  productId: p.id,
                                  productName: p.name,
                                  existingRepName: conflictRep.name,
                                  regions: conflictRegions,
                                });
                                return;
                              }
                              addRepAssignmentBulk(detailRep.id, p.id, p.name, detailRep.territories);
                            } else {
                              deleteRepAssignmentByProduct(detailRep.id, p.id);
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm", isAssigned && "font-semibold text-emerald-700 dark:text-emerald-400")}>{p.name}</span>
                          {isAssigned && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {detailRep.territories.map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">{t}</span>
                              ))}
                            </div>
                          )}
                          {conflictRep && (
                            <span className="text-[10px] text-amber-600">⚠ دیاریکراوە بۆ {conflictRep.name}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />

              {/* ── Commission History ── */}
              {(() => {
                const myCommissions = repCommissions.filter(c => c.repId === detailRep.id);
                const totalEarned = myCommissions.reduce((s, c) => s + c.commissionAmount, 0);
                const totalPending = myCommissions.filter(c => c.status === "PENDING").reduce((s, c) => s + c.commissionAmount, 0);
                const totalPaid = myCommissions.filter(c => c.status === "PAID").reduce((s, c) => s + c.commissionAmount, 0);
                return (
                  <>
                    <h4 className="font-bold text-sm mb-2">💰 کۆمیشنەکان</h4>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center px-2 py-1.5 bg-muted/50 rounded-lg">
                        <div className="text-[10px] text-muted-foreground">کۆی گشتی</div>
                        <div className="font-bold text-sm">{formatIQD(totalEarned)}</div>
                      </div>
                      <div className="text-center px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                        <div className="text-[10px] text-amber-600">چاوەڕوان</div>
                        <div className="font-bold text-sm text-amber-600">{formatIQD(totalPending)}</div>
                      </div>
                      <div className="text-center px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                        <div className="text-[10px] text-emerald-600">پارەدراو</div>
                        <div className="font-bold text-sm text-emerald-600">{formatIQD(totalPaid)}</div>
                      </div>
                    </div>
                    {myCommissions.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-3">هیچ کۆمیشنێک نییە</div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                        {myCommissions.slice(0, 50).map(c => (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                            <div>
                              <span className="font-semibold text-xs">{c.productName}</span>
                              <span className="text-[10px] text-muted-foreground ms-1.5">{c.region}</span>
                              <Badge variant="outline" className={`text-[9px] ms-1 ${c.locationType === "INSIDE" ? "border-emerald-300 text-emerald-600" : "border-blue-300 text-blue-600"}`}>
                                {c.locationType === "INSIDE" ? "ناو شار" : "دەرەوەی شار"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{formatIQD(c.commissionAmount)}</span>
                              <button type="button"
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                                  c.status === "PAID" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30"
                                }`}
                                onClick={() => updateCommissionStatus(c.id, c.status === "PAID" ? "PENDING" : "PAID")}>
                                {c.status === "PAID" ? "پارەدراو ✓" : "چاوەڕوان"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* ═══════════════════════════════════════════════════════════
          DUPLICATE PRODUCT WARNING
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!dupWarning} onOpenChange={open => !open && setDupWarning(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>⚠ بەرهەم پێشتر دیاریکراوە</AlertDialogTitle>
            <AlertDialogDescription>
              بەرهەمی <strong>{dupWarning?.productName}</strong> پێشتر بۆ نوێنەری{" "}
              <strong>{dupWarning?.existingRepName}</strong> لە{" "}
              {dupWarning?.regions.join("، ")} دیاریکراوە.
              ناتوانیت هەمان بەرهەم بۆ نوێنەرێکی تر لە هەمان ناوچە دیاریبکەیت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>باشە، تێگەیشتم</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
