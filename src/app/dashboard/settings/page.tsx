"use client";
import { useState, useEffect, FormEvent, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Settings2, Building2, Save, RefreshCw, Camera, Upload, Users, ArrowLeft,
  Sun, Moon, Trash2, Download, AlertTriangle, Shield, User, Phone, Mail, BadgeCheck,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function ImageUploader({ value, onChange, label, shape }: { value?: string; onChange: (v: string) => void; label: string; shape: "square" | "circle" }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("فایلەکە زۆر گەورەیە (حد: 500KB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) onChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  };
  const sz = shape === "circle" ? 100 : 80;
  const radius = shape === "circle" ? "50%" : "14px";
  return (
    <div className="flex flex-col items-center gap-2">
      <div onClick={() => ref.current?.click()} className="cursor-pointer relative overflow-hidden border-2 border-dashed border-border transition-all hover:border-primary"
        style={{ width: sz, height: sz, borderRadius: radius, background: value ? `url(${value}) center/cover no-repeat` : "linear-gradient(135deg,#F1F3F5,#E9ECEF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!value && <Upload className="size-5 text-muted-foreground" />}
        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center" style={{ borderRadius: radius }}>
          <Camera className="size-5 text-white" />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value && <Button variant="link" size="sm" onClick={() => onChange("")} className="text-[10px] text-destructive h-auto p-0">سڕینەوە</Button>}
    </div>
  );
}


export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useData();
  const { currentUser, updateCurrentUserProfile } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [companyForm, setCompanyForm] = useState(settings);

  const profileFileRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    avatar: currentUser?.avatarUrl || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileForm(p => ({
        name: p.name || currentUser.name || "",
        phone: p.phone || currentUser.phone || "",
        avatar: p.avatar || currentUser.avatarUrl || "",
      }));
    }
  }, [currentUser?.id]);

  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
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

  const handleProfileAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setProfileForm(p => ({ ...p, avatar: resized }));
    } catch { alert("گۆڕینی وێنەکە نەکرای"); }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateCurrentUserProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim(), avatarUrl: profileForm.avatar });
      showToast("زانیاری کەسی پاشەکەوتکرا", "success");
    } catch {
      showToast("هەڵەیەک ڕوویدا — دوبارە هەوڵ بکەیتەوە", "error");
    }
    setProfileSaving(false);
  };

  const roleLabel = currentUser?.role === "ADMIN" ? "بەڕێوەبەر" : currentUser?.role === "MANAGER" ? "بەڕێوەبەری مامناوەند" : "نوێنەر";
  const roleColor = currentUser?.role === "ADMIN" ? "#4263EB" : currentUser?.role === "MANAGER" ? "#7C5CFC" : "#40C057";

  const handleCompanySave = (e: FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
    showToast("زانیاری کۆمپانیا پاشەکەوتکرا", "success");
  };

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [deleteLog, setDeleteLog] = useState<string[]>([]);

  const handleResetData = async () => {
    setDeleteStep("working");
    setDeleteLog([]);
    const log = (msg: string) => setDeleteLog(prev => [...prev, msg]);
    try {
      const { supabase } = await import("@/lib/supabase");
      log("داتا هێنانی باکئەپ...");
      const tables = ["products","clients","reps","warehouses","suppliers","orders","drivers","transactions","invoice_templates","price_types","sample_requests"];
      const backup: Record<string, unknown[]> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backup[table] = data || [];
        log(`✓ ${table} (${backup[table].length} ڕیکۆرد)`);
      }
      backup._backup_date = [new Date().toISOString()];
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `dewa_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log("⬇ باکئەپ دابەزاند");
      const deleteOrder = ["transactions","sample_requests","orders","clients","products","reps","warehouses","suppliers","drivers","invoice_templates","price_types"];
      for (const table of deleteOrder) {
        const { error } = await supabase.from(table).delete().neq("id", "__never__");
        if (error) { log(`✗ ${table}: ${error.message}`); } else { log(`🗑 ${table} سڕایەوە`); }
      }
      log("✅ هەموو داتاکان سڕانەوە!");
      setDeleteStep("done");
      showToast("داتاکان سڕانەوە و باکئەپ داونلۆدکرا", "success");
      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      log(`❌ هەڵە: ${String(err)}`);
      showToast("هەڵەیەک ڕوویدا", "error");
      setDeleteStep("confirm");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
          <Settings2 className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">ڕێکخستنەکان</h1>
          <p className="text-sm text-muted-foreground">ڕێکخستنی سیستەم و جوانکاری</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 max-w-2xl">

          {/* My Profile Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-primary" /> پرۆفایلی من
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave}>
                {/* Avatar picker row */}
                <div className="flex items-center gap-6 p-5 bg-muted/50 rounded-xl mb-6">
                  <div className="relative shrink-0">
                    <div onClick={() => profileFileRef.current?.click()}
                      className="size-[88px] rounded-full cursor-pointer overflow-hidden border-2 border-primary relative">
                      {profileForm.avatar ? (
                        <img src={profileForm.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-violet-400 flex items-center justify-center text-3xl font-black text-white">
                          {profileForm.name?.[0] || currentUser?.name?.[0] || "؟"}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="size-5 text-white" />
                      </div>
                    </div>
                    <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileAvatarFile} />
                  </div>

                  <div className="flex-1">
                    <div className="text-[17px] font-black mb-1 flex items-center gap-1.5">
                      {currentUser?.name || "بەکارهێنەر"}
                      <BadgeCheck className="size-4" style={{ color: roleColor }} />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: `${roleColor}18`, color: roleColor }}>{roleLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">کلیک لەسەر وێنەکە بکە بۆ گۆڕینی</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ناو</Label>
                    <div className="relative">
                      <User className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pe-8" value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="ناوی خۆت بنووسە" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ژمارەی مۆبایل</Label>
                    <div className="relative">
                      <Phone className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pe-8" value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="07XX XXX XXXX" type="tel" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ئیمەیڵ (ناگۆڕدرێت)</Label>
                    <div className="relative">
                      <Mail className="size-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pe-8 opacity-60 cursor-not-allowed"
                        value={currentUser?.email || ""} readOnly />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ئەندازە (ناگۆڕدرێت)</Label>
                    <Input className="opacity-60 cursor-not-allowed" value={roleLabel} readOnly />
                  </div>
                </div>

                {profileForm.avatar && (
                  <Button type="button" variant="link" size="sm" onClick={() => setProfileForm(p => ({ ...p, avatar: "" }))}
                    className="mt-3 text-[11px] text-destructive h-auto p-0">
                    سڕینەوەی وێنەی پڕۆفایل
                  </Button>
                )}

                <div className="mt-5">
                  <Button type="submit" disabled={profileSaving || !profileForm.name.trim()} className="gap-2">
                    <Save className="size-3.5" /> {profileSaving ? "پاشەکەوتکردن..." : "پاشەکەوتکردنی پرۆفایل"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {isDark ? <Moon className="size-4 text-violet-500" /> : <Sun className="size-4 text-amber-500" />}
                دیداری سیستەم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3.5">
                  <div className={cn("size-11 rounded-xl flex items-center justify-center",
                    isDark ? "bg-gradient-to-br from-slate-800 to-violet-950" : "bg-gradient-to-br from-amber-50 to-orange-100")}>
                    {isDark ? <Moon className="size-5 text-violet-400" /> : <Sun className="size-5 text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{isDark ? "دۆخی تاریک" : "دۆخی ڕووناک"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDark ? "دیدارێکی تاریک بۆ کارکردن لە شەو" : "دیدارێکی ڕووناک بۆ رۆژانە"}
                    </p>
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={() => setTheme(isDark ? "light" : "dark")} />
              </div>
            </CardContent>
          </Card>

          {/* Company Info Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4" /> زانیاری کۆمپانیا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8 mb-7 p-5 bg-muted/50 rounded-xl justify-center">
                <ImageUploader value={companyForm.logo} onChange={(v) => setCompanyForm({ ...companyForm, logo: v })} label="لۆگۆی کۆمپانیا" shape="square" />
                <div className="flex flex-col justify-center gap-1">
                  <span className="text-sm font-semibold">لۆگۆی کۆمپانیا</span>
                  <span className="text-[11px] text-muted-foreground">وێنەیەک بۆ پسوولەکان و سایدبار</span>
                  <span className="text-[11px] text-muted-foreground">وێنەی پرۆفایل: کلیک بکە لەسەر وێنەکەت لە سایدبار</span>
                </div>
              </div>
              <form onSubmit={handleCompanySave}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>ناوی کۆمپانیا (کوردی)</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>ناوی کۆمپانیا (ئینگلیزی)</Label><Input value={companyForm.nameEn} onChange={(e) => setCompanyForm({ ...companyForm, nameEn: e.target.value })} /></div>
                  <div className="space-y-2"><Label>تەلەفۆن</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>ئیمەیڵ</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>شار</Label><Input value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>دراو</Label><Input value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })} /></div>
                </div>
                <div className="space-y-2 mt-4"><Label>ناونیشان</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} /></div>
                <div className="mt-6">
                  <Button type="submit" className="gap-2"><Save className="size-3.5" /> پاشەکەوتکردن</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Users shortcut */}
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-violet-50 dark:bg-violet-950/40 rounded-xl flex items-center justify-center text-violet-600">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">بەڕێوەبردنی بەکارهێنەران</p>
                    <p className="text-xs text-muted-foreground mt-0.5">زیادکردن، دەستکاری، و مۆڵەتدانی بەکارهێنەران</p>
                  </div>
                </div>
                <Link href="/dashboard/users">
                  <Button variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/30">
                    <ArrowLeft className="size-3.5" /> بچۆ بۆ بەکارهێنەران
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="mb-6 border-destructive/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" /> ناوچەی مەترسیدار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-5">سڕینەوەی هەموو داتاکان لە سوپابەیس. پێش سڕینەوە باکئەپی خۆکار داونلۆد دەکرێت.</p>

              {deleteStep === "idle" && (
                <Button variant="destructive" onClick={() => setDeleteStep("confirm")} className="gap-2">
                  <Trash2 className="size-3.5" /> سڕینەوەی هەموو داتاکان
                </Button>
              )}

              {deleteStep === "confirm" && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Shield className="size-5 text-destructive" />
                    <span className="font-bold text-destructive text-sm">دڵنیابووەیت؟ ئەم کردارە ناگەڕێتەوە</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    هەموو داتاکانت (داواکاری، کڕیار، بەرهەم، ...) دەسڕێنەوە.<br />
                    <strong>باکئەپی JSON خۆکار داونلۆد دەکرێت پێش سڕینەوە.</strong>
                  </p>
                  <div className="flex gap-2.5">
                    <Button variant="destructive" onClick={handleResetData} className="gap-2">
                      <Download className="size-3.5" /> باکئەپ بکە و بیسڕەوە
                    </Button>
                    <Button variant="outline" onClick={() => setDeleteStep("idle")}>پاشگەزبوونەوە</Button>
                  </div>
                </div>
              )}

              {deleteStep === "working" && (
                <div className="bg-muted/50 border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <RefreshCw className="size-4 animate-spin" />
                    <span className="font-semibold text-sm">کارەکە بەردەوامە...</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto font-mono text-xs text-muted-foreground flex flex-col gap-1">
                    {deleteLog.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              )}

              {deleteStep === "done" && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/40 rounded-xl p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ✅ هەموو داتاکان سڕانەوە. لاپەڕەکە نوێ دەبێتەوە...
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
