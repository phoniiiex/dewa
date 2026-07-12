"use client";
import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  Stethoscope, Plus, Search, Edit3, Trash2, Phone, MapPin,
  X, Save, Building2, User, FileText, Map, List, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const DoctorMap = dynamic(() => import("./DoctorMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-muted/50 flex items-center justify-center rounded-2xl">
      <div className="text-center text-muted-foreground">
        <Map className="size-8 mb-2 opacity-30 mx-auto" />
        <p className="text-sm">نەخشەکە بارئەکرێت...</p>
      </div>
    </div>
  ),
});

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  secretary_phone: string;
  clinic_name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rep_id: string;
  notes: string;
  created_at: string;
}

const SPECIALTIES = [
  "پزیشکی گشتی", "پزیشکی دڵ", "پزیشکی مێشک و دەمار", "پزیشکی منداڵ",
  "پزیشکی ژن و منداڵبوون", "پزیشکی ئەندام و بازووکان", "چاوپزیشکی",
  "پزیشکی گوێ لووت قووچ", "پزیشکی پێست", "پزیشکی مژارچی", "دیابێت و ئۆرمۆن",
  "پزیشکی گورچیلە", "پزیشکی سروو", "پزیشکی دانتیستی", "تر",
];

const EMPTY: Omit<Doctor, "id" | "created_at"> = {
  name: "", specialty: "", phone: "", secretary_phone: "",
  clinic_name: "", city: "", address: "",
  latitude: null, longitude: null, rep_id: "", notes: "",
};

const AVATAR_COLORS = ["#6D28D9", "#7C5CFC", "#F47B35", "#2F9E44", "#1098AD", "#E67700"];

function DoctorAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const color = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}>
      {initials}
    </div>
  );
}

export default function DoctorsPage() {
  const { reps } = useData();
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deleteDoctor, setDeleteDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<Omit<Doctor, "id" | "created_at">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("doctors").select("*").order("name");
    setDoctors((data || []) as Doctor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialty?.toLowerCase().includes(q) ||
      d.clinic_name?.toLowerCase().includes(q) ||
      d.city?.toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const withCoords = useMemo(() => filtered.filter(d => d.latitude && d.longitude), [filtered]);

  const geocodeAddress = async () => {
    const query = [form.clinic_name, form.address, form.city, "Iraq"].filter(Boolean).join(", ");
    if (!query.trim()) { showToast("ناونیشان داخڵ بکە", false); return; }
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        setForm(f => ({ ...f, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
        showToast("شوێن دۆزرایەوە ✓");
      } else {
        showToast("شوێن نەدۆزرایەوە، دەستی بنووسە", false);
      }
    } catch { showToast("هەڵە لە دۆزینەوەی شوێن", false); }
    setGeocoding(false);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { showToast("ناو پێویستە", false); return; }
    setSaving(true);
    const { error } = await supabase.from("doctors").insert({ ...form, id: undefined });
    setSaving(false);
    if (error) { showToast("هەڵە: " + error.message, false); return; }
    showToast("پزیشک زیادکرا ✓");
    setAddOpen(false);
    setForm(EMPTY);
    fetchDoctors();
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDoctor) return;
    setSaving(true);
    const { error } = await supabase.from("doctors").update(form).eq("id", editDoctor.id);
    setSaving(false);
    if (error) { showToast("هەڵە: " + error.message, false); return; }
    showToast("پزیشک نوێکرایەوە ✓");
    setEditDoctor(null);
    fetchDoctors();
  };

  const handleDelete = async () => {
    if (!deleteDoctor) return;
    await supabase.from("doctors").delete().eq("id", deleteDoctor.id);
    showToast("پزیشک سڕایەوە");
    setDeleteDoctor(null);
    fetchDoctors();
  };

  const openEdit = (d: Doctor) => {
    setEditDoctor(d);
    setForm({
      name: d.name, specialty: d.specialty || "", phone: d.phone || "",
      secretary_phone: d.secretary_phone || "", clinic_name: d.clinic_name || "",
      city: d.city || "", address: d.address || "",
      latitude: d.latitude, longitude: d.longitude,
      rep_id: d.rep_id || "", notes: d.notes || "",
    });
  };

  const repName = (id: string) => reps.find(r => r.id === id)?.name || "";

  // ── Shared Doctor Form (used in both add & edit dialogs) ──
  const DoctorForm = () => (
    <form onSubmit={editDoctor ? handleEdit : handleAdd} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="doc-name">ناوی پزیشک *</Label>
          <Input id="doc-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="د. ئەحمەد..." required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-spec">پسپۆڕی</Label>
          <Select value={form.specialty || null} onValueChange={(v: string | null) => v && setForm(f => ({ ...f, specialty: v }))}>
            <SelectTrigger id="doc-spec"><SelectValue placeholder="— هەڵبژێرە —" /></SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-phone">ژمارەی تەلەفۆن</Label>
          <Input id="doc-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XX XXX XXXX" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-sec">ژمارەی منشی</Label>
          <Input id="doc-sec" value={form.secretary_phone} onChange={e => setForm(f => ({ ...f, secretary_phone: e.target.value }))} placeholder="07XX XXX XXXX" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-clinic">ناوی کلینیک / نەخۆشخانە</Label>
          <Input id="doc-clinic" value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} placeholder="کلینیکی..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-city">شار</Label>
          <Input id="doc-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="هەولێر، سلێمانی..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-addr">ناونیشان</Label>
        <Input id="doc-addr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ناونیشانی تەواو..." />
      </div>

      {/* Location block */}
      <div className="bg-muted/50 rounded-xl p-3.5">
        <p className="text-xs font-bold text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <MapPin className="size-3" /> شوێن لەسەر نەخشە
        </p>
        <Button type="button" variant="outline" size="sm" onClick={geocodeAddress} disabled={geocoding} className="w-full mb-2.5 gap-2">
          {geocoding ? "🔍 دەگەڕێت..." : "🔍 شوێن بدۆزەوە"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input type="number" step="any" value={form.latitude ?? ""} onChange={e => setForm(f => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="36.19..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input type="number" step="any" value={form.longitude ?? ""} onChange={e => setForm(f => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="44.00..." />
          </div>
        </div>
        {form.latitude && form.longitude && (
          <p className="text-[11px] text-emerald-600 font-semibold mt-1.5">✓ شوێن دیاریکراوە ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-rep">نوێنەری پەیوەندیدار</Label>
        <Select value={form.rep_id || null} onValueChange={(v: string | null) => setForm(f => ({ ...f, rep_id: v || "" }))}>
          <SelectTrigger id="doc-rep"><SelectValue placeholder="— هیچ —" /></SelectTrigger>
          <SelectContent>
            {reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-notes">تێبینی</Label>
        <Textarea id="doc-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="هەر زانیارییەکی تر..." className="min-h-[72px]" />
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditDoctor(null); }}>
          <X className="size-3.5 me-1" /> پاشگەزبوونەوە
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-3.5 me-1" /> {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-64px)] page-stagger" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-white font-bold text-sm z-[9999] shadow-lg",
          toast.ok ? "bg-emerald-600" : "bg-red-600")}>
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Stethoscope className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">پزیشکەکان</h1>
            <p className="text-sm text-muted-foreground">{doctors.length} پزیشک تۆمارکراوە</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted p-1 rounded-xl gap-1">
            {(["list", "map"] as const).map(v => (
              <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm"
                onClick={() => setView(v)}
                className={cn("px-3.5 rounded-lg text-xs font-bold gap-1.5",
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                {v === "list" ? <><List className="size-3" />لیست</> : <><Map className="size-3" />نەخشە</>}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={fetchDoctors} className="size-9">
            <RefreshCw className="size-3.5" />
          </Button>
          <Button onClick={() => { setForm(EMPTY); setAddOpen(true); }}>
            <Plus className="size-4 me-1" /> پزیشکی نوێ
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="size-3.5 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="گەڕان بە ناو، پسپۆڕی، شار..." className="ps-3 pe-9" />
      </div>

      {/* ── Content ── */}
      {view === "list" ? (
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-2xl">
              <Stethoscope className="size-10 opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">{search ? "هیچ پزیشکێک نەدۆزرایەوە" : "هێشتا هیچ پزیشکێک زیاد نەکراوە"}</p>
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {filtered.map(d => (
                <Card key={d.id}
                  onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                  className={cn("card-interactive cursor-pointer",
                    selectedId === d.id ? "border-primary ring-4 ring-primary/10" : "")}>
                  <CardContent className="p-4">
                    <div className="flex gap-3 items-start">
                      <DoctorAvatar name={d.name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm mb-1">{d.name}</p>
                        {d.specialty && (
                          <Badge variant="secondary" className="text-[10px] mb-1.5 bg-primary/10 text-primary hover:bg-primary/15">{d.specialty}</Badge>
                        )}
                        <div className="flex flex-col gap-1">
                          {d.clinic_name && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="size-2.5" />{d.clinic_name}</p>}
                          {d.city && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="size-2.5" />{d.city}{d.address ? ` — ${d.address}` : ""}</p>}
                          {d.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="size-2.5" />{d.phone}</p>}
                          {d.secretary_phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="size-2.5" />منشی: {d.secretary_phone}</p>}
                          {d.rep_id && repName(d.rep_id) && (
                            <Badge variant="outline" className="text-[10px] w-fit mt-0.5 border-emerald-300 text-emerald-700 bg-emerald-50">
                              <User className="size-2 me-1" />{repName(d.rep_id)}
                            </Badge>
                          )}
                          {d.latitude && d.longitude && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">📍 شوێن ئامادەیە</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="icon" className="size-7" onClick={e => { e.stopPropagation(); openEdit(d); }}>
                          <Edit3 className="size-3" />
                        </Button>
                        {isManager && (
                          <Button variant="outline" size="icon" className="size-7 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={e => { e.stopPropagation(); setDeleteDoctor(d); }}>
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {d.notes && (
                      <div className="mt-3 text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                        <FileText className="size-2.5 shrink-0 mt-0.5" />{d.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex gap-3.5 min-h-0">
          <div className="w-72 flex flex-col gap-1.5 overflow-auto shrink-0">
            {withCoords.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                هیچ پزیشکێک شوێنی نییە<br />
                <span className="text-[11px]">لە فۆرمەکەدا &quot;شوێن بدۆزەوە&quot; بکە</span>
              </div>
            ) : withCoords.map(d => (
              <div key={d.id} onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                className={cn("bg-background rounded-xl border p-2.5 cursor-pointer transition-all",
                  selectedId === d.id ? "border-primary shadow-sm" : "border-border hover:border-primary/40")}>
                <div className="flex items-center gap-2">
                  <DoctorAvatar name={d.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{d.name}</p>
                    {d.specialty && <p className="text-[10px] text-primary">{d.specialty}</p>}
                    {d.city && <p className="text-[10px] text-muted-foreground">{d.city}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DoctorMap
            doctors={withCoords as { id: string; name: string; specialty: string; clinic_name: string; city: string; address: string; phone: string; latitude: number; longitude: number }[]}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ADD DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[660px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>زیادکردنی پزیشکی نوێ</DialogTitle>
            <DialogDescription>زانیاری پزیشک پڕبکەوە</DialogDescription>
          </DialogHeader>
          <DoctorForm />
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          EDIT DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!editDoctor} onOpenChange={open => !open && setEditDoctor(null)}>
        <DialogContent className="sm:max-w-[660px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>دەستکاریکردنی — {editDoctor?.name || ""}</DialogTitle>
            <DialogDescription>زانیاری پزیشک نوێ بکەرەوە</DialogDescription>
          </DialogHeader>
          <DoctorForm />
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteDoctor} onOpenChange={open => !open && setDeleteDoctor(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی پزیشک</AlertDialogTitle>
            <AlertDialogDescription>دڵنیایت لە سڕینەوەی {deleteDoctor?.name}؟ ئەم کردارە ناگەڕێتەوە.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
