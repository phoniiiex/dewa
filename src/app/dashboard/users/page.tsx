"use client";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { useState, useEffect, FormEvent, useRef } from "react";
import {
  Users, Plus, Link2, Copy, Check, Trash2, Edit3,
  Mail, Phone, MapPin, RefreshCw, Shield, AlertCircle, Lock, Key, Camera,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Rep } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const ALL_PERMISSIONS = [
  { key: "dashboard", label: "پێشانگا", group: "سەرەکی" },
  { key: "analytics", label: "شیکاری", group: "سەرەکی" },
  { key: "products", label: "بەرهەمەکان", group: "سەرەکی" },
  { key: "orders", label: "داواکارییەکان", group: "سەرەکی" },
  { key: "invoices", label: "پسوولەکان", group: "سەرەکی" },
  { key: "bonus", label: "بۆنەس", group: "سەرەکی" },
  { key: "clients", label: "کڕیارەکان", group: "بەڕێوەبردن" },
  { key: "reps", label: "نوێنەران", group: "بەڕێوەبردن" },
  { key: "warehouses", label: "کۆگاکان", group: "بەڕێوەبردن" },
  { key: "suppliers", label: "دابینکەران", group: "بەڕێوەبردن" },
  { key: "logistics", label: "گواستنەوە", group: "بەڕێوەبردن" },
  { key: "telegram", label: "بۆتی شۆفێر", group: "بەڕێوەبردن" },
  { key: "finance", label: "دارایی", group: "کۆمپانیا" },
  { key: "settings", label: "ڕێکخستنەکان", group: "کۆمپانیا" },
  { key: "users", label: "بەکارهێنەران", group: "کۆمپانیا" },
];

interface AuthUser {
  id: string; email: string; name: string; role: string;
  phone: string; city: string; is_active: boolean;
  permissions: string[]; created_at: string; has_profile: boolean;
  avatar_url: string; last_seen: string;
}

function isOnline(lastSeen: string): boolean {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 3 * 60 * 1000;
}

const roleBadgeCls: Record<string, string> = {
  ADMIN:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REP:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};
const roleLabel: Record<string, string> = { ADMIN: "ئەدمین", MANAGER: "بەڕێوەبەر", REP: "نوێنەر" };

function PermissionGrid({ permissions, onChange }: { permissions: string[]; onChange: (p: string[]) => void }) {
  const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
  const toggle = (key: string) =>
    onChange(permissions.includes(key) ? permissions.filter(p => p !== key) : [...permissions, key]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs h-7"
          onClick={() => onChange(ALL_PERMISSIONS.map(p => p.key))}>هەموو هەڵبژێرە</Button>
        <Button type="button" variant="outline" size="sm" className="text-xs h-7"
          onClick={() => onChange([])}>هەموو لابە</Button>
      </div>
      {groups.map(g => (
        <div key={g}>
          <p className="text-[10px] font-bold text-muted-foreground mb-2 tracking-wide uppercase">{g}</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_PERMISSIONS.filter(p => p.group === g).map(p => {
              const active = permissions.includes(p.key);
              return (
                <Button key={p.key} type="button" variant={active ? "default" : "outline"} size="sm"
                  onClick={() => toggle(p.key)}
                  className="rounded-full text-xs font-semibold">
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const [tab, setTab] = useState<"auth" | "reps">("auth");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reps, setReps] = useState<Rep[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const repAuthMap = new Map(users.filter(u => u.role === "REP").map(u => [u.email, u.id]));

  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"direct" | "invite">("direct");
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "REP", phone: "", city: "", permissions: [] as string[] });
  const [addLoading, setAddLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [editRole, setEditRole] = useState("REP");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editAvatar, setEditAvatar] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const [disableId, setDisableId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => { loadUsers(); loadReps(); }, []);

  const loadUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/list-users");
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(data.users || []);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  };

  const loadReps = async () => {
    setRepsLoading(true);
    const { data } = await supabase.from("reps").select("*").order("name");
    setReps((data || []).map((r: Record<string, unknown>) => ({
      id:             r.id as string,
      name:           r.name as string,
      phone:          (r.phone || "") as string,
      email:          (r.email || "") as string,
      city:           (r.city || "") as string,
      profilePic:     (r.profile_pic || "") as string,
      telegramChatId: (r.telegram_chat_id || "") as string,
      isActive:       r.is_active !== false,
      createdAt:      (r.created_at || "") as string,
    })));
    setRepsLoading(false);
  };

  const openAdd = () => {
    setAddForm({ name: "", email: "", password: "", role: "REP", phone: "", city: "", permissions: [] });
    setAddMode("direct"); setInviteUrl(""); setCopied(false); setAddOpen(true);
  };
  const openAddFromRep = (r: Rep) => {
    setAddForm({ name: r.name, email: r.email || "", password: "", role: "REP", phone: r.phone, city: r.city, permissions: [] });
    setAddMode("direct"); setInviteUrl(""); setCopied(false); setAddOpen(true);
  };

  const handleDirectAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.password) { alert("وشەی نهێنی پێویستە"); return; }
    setAddLoading(true);
    const res = await fetch("/api/auth/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addForm.name, email: addForm.email, password: addForm.password, role: addForm.role, phone: addForm.phone, city: addForm.city }),
    });
    const d = await res.json();
    setAddLoading(false);
    if (d.error) { alert(d.error); return; }
    if (addForm.permissions.length > 0 && d.user?.id) {
      await fetch("/api/auth/list-users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.user.id, permissions: addForm.permissions }),
      });
    }
    setAddOpen(false); await loadUsers();
  };

  const handleInvite = async () => {
    if (!addForm.email) { alert("ئیمەیل پێویستە"); return; }
    setAddLoading(true);
    const res = await fetch("/api/auth/create-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addForm.email, role: addForm.role, permissions: addForm.permissions }),
    });
    const d = await res.json();
    setAddLoading(false);
    if (d.url) setInviteUrl(d.url);
    else alert(d.error || "Error creating invite");
  };

  const handleCopy = () => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const openEdit = (u: AuthUser) => { setEditUser(u); setEditRole(u.role); setEditPerms(u.permissions || []); setEditAvatar(u.avatar_url || ""); };
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    await fetch("/api/auth/list-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, role: editRole, permissions: editPerms, avatar_url: editAvatar }),
    });
    setEditLoading(false); setEditUser(null); await loadUsers();
  };

  const handleDisable = async () => {
    if (!disableId) return;
    setActionLoading(true);
    const res = await fetch("/api/auth/delete-user", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: disableId }),
    });
    const d = await res.json();
    setActionLoading(false);
    if (d.error) { alert("هەڵە: " + d.error); return; }
    setDisableId(null); await loadUsers();
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(true);
    const res = await fetch("/api/auth/delete-user", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    setActionLoading(false);
    if (d.error) { alert("هەڵە: " + d.error); return; }
    await loadUsers();
  };

  const activeCount = users.filter(u => u.is_active).length;
  const adminCount  = users.filter(u => u.role === "ADMIN").length;
  const repsWithoutAccount = reps.filter(r => !r.email || !repAuthMap.has(r.email));

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">بەکارهێنەران</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی هەموو بەکارهێنەران و مۆڵەتەکان</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { loadUsers(); loadReps(); }}>
            <RefreshCw className="size-3.5" /> نوێکردنەوە
          </Button>
          <Button onClick={openAdd}><Plus className="size-4 me-1" />زیادکردنی بەکارهێنەر</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-12 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card className="card-interactive"><CardContent className="p-4"><p className="text-xl font-black text-primary">{users.length}</p><p className="text-xs text-muted-foreground mt-1">کۆی بەکارهێنەران</p></CardContent></Card>
            <Card className="card-interactive"><CardContent className="p-4"><p className="text-xl font-black text-emerald-600">{activeCount}</p><p className="text-xs text-muted-foreground mt-1">چالاک</p></CardContent></Card>
            <Card className="card-interactive"><CardContent className="p-4"><p className="text-xl font-black text-red-600">{adminCount}</p><p className="text-xs text-muted-foreground mt-1">ئەدمین</p></CardContent></Card>
            <Card className="card-interactive"><CardContent className="p-4">
              <p className="text-xl font-black text-emerald-600">{reps.length} <span className="text-sm text-amber-500">({repsWithoutAccount.length} بێ ئەکاونت)</span></p>
              <p className="text-xs text-muted-foreground mt-1">نوێنەران</p>
            </CardContent></Card>
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex bg-muted p-1 rounded-xl gap-1 w-fit mb-5">
        <Button variant={tab === "auth" ? "secondary" : "ghost"} size="sm"
          onClick={() => setTab("auth")}
          className={cn("gap-1.5 px-4 rounded-lg text-sm font-bold",
            tab === "auth" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          <Shield className="size-3.5" /> بەکارهێنەرانی سیستەم ({users.length})
        </Button>
        <Button variant={tab === "reps" ? "secondary" : "ghost"} size="sm"
          onClick={() => setTab("reps")}
          className={cn("gap-1.5 px-4 rounded-lg text-sm font-bold",
            tab === "reps" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          <UserCheck className="size-3.5" /> نوێنەرانی پزیشکی ({reps.length})
          {repsWithoutAccount.length > 0 && (
            <span className="bg-amber-500 text-white rounded-full px-1.5 text-[10px] font-bold">{repsWithoutAccount.length}</span>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl mb-4 text-sm">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      {/* ── AUTH USERS TAB ── */}
      {tab === "auth" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">بەکارهێنەر</TableHead>
                  <TableHead className="text-right">ئیمەیل</TableHead>
                  <TableHead className="text-right">ڕۆڵ</TableHead>
                  <TableHead className="text-right">مۆڵەتەکان</TableHead>
                  <TableHead className="text-right">بارودۆخ</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">هیچ بەکارهێنەرێک نییە</TableCell></TableRow>
                ) : users.map(u => {
                  const initials = u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || u.email?.[0]?.toUpperCase() || "؟";
                  return (
                    <TableRow key={u.id} className={cn(!u.is_active && "opacity-50")}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <OreoAvatar src={u.avatar_url} name={u.name} size={36} />
                            <div className={cn("absolute bottom-0 end-0 size-2.5 rounded-full border-2 border-background",
                              isOnline(u.last_seen) ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{u.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {u.phone && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Phone className="size-2" />{u.phone}</span>}
                              {u.city && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin className="size-2" />{u.city}</span>}
                              {!u.has_profile && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold">بێ پرۆفایل</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 ltr"><Mail className="size-2.5" />{u.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[11px]", roleBadgeCls[u.role] || roleBadgeCls.REP)}>
                          {roleLabel[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ maxWidth: 200 }}>
                        {(u.permissions || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(u.permissions || []).slice(0, 3).map((perm: string) => (
                              <span key={perm} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold">
                                {ALL_PERMISSIONS.find(ap => ap.key === perm)?.label || perm}
                              </span>
                            ))}
                            {(u.permissions || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(u.permissions || []).length - 3}</span>}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", u.is_active ? "text-emerald-600" : "text-destructive")}>
                          <span className={cn("size-1.5 rounded-full", u.is_active ? "bg-emerald-500" : "bg-destructive")} />
                          {u.is_active ? "چالاک" : "بەندکراو"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => openEdit(u)}>
                            <Edit3 className="size-3" /> دەستکاری
                          </Button>
                          {u.is_active ? (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/5"
                              onClick={() => setDisableId(u.id)} disabled={actionLoading}>
                              <Trash2 className="size-3" /> ناچالاككردن
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => handleReactivate(u.id)} disabled={actionLoading}>
                              <Check className="size-3" /> چالاككردنەوە
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-4 py-2.5 border-t bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
              <span>{users.length} بەکارهێنەر · {activeCount} چالاک</span>
              <span className="flex items-center gap-1"><Shield className="size-3" /> Supabase Auth</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── REPS TAB ── */}
      {tab === "reps" && (
        <Card>
          <CardContent className="p-0">
            {repsWithoutAccount.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="size-4 shrink-0" /> {repsWithoutAccount.length} نوێنەر ئەکاونتی نییە — کلیک لەسەر «دروستکردنی ئەکاونت» بکە
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">نوێنەر</TableHead>
                  <TableHead className="text-right">ئیمەیل / تەلەفۆن</TableHead>
                  <TableHead className="text-right">شار</TableHead>
                  <TableHead className="text-right">بارودۆخ</TableHead>
                  <TableHead className="text-right">ئەکاونت</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {repsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : reps.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">هیچ نوێنەرێک نییە — لە پەڕەی نوێنەران زیادیان بکە</TableCell></TableRow>
                ) : reps.map(r => {
                  const hasAccount = !!(r.email && repAuthMap.has(r.email));
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                            {r.profilePic
                              ? <img src={r.profilePic} className="w-full h-full object-cover" alt={r.name} />
                              : <span className="text-white text-sm font-black">{r.name.charAt(0)}</span>
                            }
                          </div>
                          <p className="font-semibold text-sm">{r.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.email && <div className="flex items-center gap-1 ltr"><Mail className="size-2.5" />{r.email}</div>}
                        {r.phone && <div className="flex items-center gap-1"><Phone className="size-2.5" />{r.phone}</div>}
                      </TableCell>
                      <TableCell><span className="flex items-center gap-1 text-sm"><MapPin className="size-3 text-muted-foreground" />{r.city}</span></TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", r.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                          <span className={cn("size-1.5 rounded-full", r.isActive ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                          {r.isActive ? "چالاک" : "ناچالاک"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasAccount
                          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px]">✅ ئەکاونتی هەیە</Badge>
                          : <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[11px]">⚠️ بێ ئەکاونت</Badge>}
                      </TableCell>
                      <TableCell>
                        {!hasAccount && (
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => openAddFromRep(r)}>
                            <Key className="size-3" /> دروستکردنی ئەکاونت
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
              {reps.length} نوێنەر · {reps.filter(r => r.email && repAuthMap.has(r.email)).length} ئەکاونتیان هەیە
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ADD USER DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>زیادکردنی بەکارهێنەری نوێ</DialogTitle>
            <DialogDescription>بەکارهێنەرێکی نوێ بۆ سیستەمەکە زیاد بکە</DialogDescription>
          </DialogHeader>
          {!inviteUrl ? (
            <>
              <div className="flex bg-muted p-1 rounded-xl gap-1 mb-4">
                {(["direct", "invite"] as const).map(m => (
                  <Button key={m} type="button" variant={addMode === m ? "secondary" : "ghost"} size="sm"
                    onClick={() => setAddMode(m)}
                    className={cn("flex-1 gap-2 px-4 rounded-lg text-sm font-bold",
                      addMode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                    {m === "direct" ? <><Lock className="size-3.5" /> وشەی نهێنی دابنێ</> : <><Link2 className="size-3.5" /> بانگهێشت بە لینک</>}
                  </Button>
                ))}
              </div>
              <div className={cn("px-4 py-3 rounded-xl border-s-4 text-sm text-foreground/80 mb-4",
                addMode === "direct" ? "bg-primary/5 border-primary" : "bg-violet-50 dark:bg-violet-950/20 border-violet-500")}>
                {addMode === "direct" ? "بەکارهێنەر دروست دەکرێت و تۆ خۆت وشەی نهێنی دادەنێی." : "لینکێکی تایبەت دروست دەکرێت. بەکارهێنەرەکە کلیک لە لینکەکە دەکات و خۆی زانیاری و وشەی نهێنی دادەنێت."}
              </div>
              <form onSubmit={addMode === "direct" ? handleDirectAdd : (e) => { e.preventDefault(); handleInvite(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-email">ئیمەیل *</Label>
                    <Input id="add-email" type="email" required value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="user@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role">ڕۆڵ</Label>
                    <Select value={addForm.role} onValueChange={(v: string | null) => v && setAddForm({ ...addForm, role: v })}>
                      <SelectTrigger id="add-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REP">نوێنەر</SelectItem>
                        <SelectItem value="MANAGER">بەڕێوەبەر</SelectItem>
                        <SelectItem value="ADMIN">ئەدمین</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {addMode === "direct" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-name">ناو *</Label>
                        <Input id="add-name" required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-pass">وشەی نهێنی *</Label>
                        <Input id="add-pass" type="password" required value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-phone">تەلەفۆن</Label>
                        <Input id="add-phone" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-city">شار</Label>
                        <Input id="add-city" value={addForm.city} onChange={e => setAddForm({ ...addForm, city: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-semibold mb-3">مۆڵەتەکان</p>
                  <PermissionGrid permissions={addForm.permissions} onChange={p => setAddForm({ ...addForm, permissions: p })} />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>پاشگەزبوونەوە</Button>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading ? "..." : addMode === "direct" ? <><Key className="size-4 me-1" /> زیادکردن</> : <><Link2 className="size-4 me-1" /> دروستکردنی لینک</>}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="size-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Link2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">لینکی بانگهێشت ئامادەیە! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-5">ئەم لینکە بنێرە بۆ بەکارهێشت بکرێ</p>
              <div className="bg-muted rounded-xl px-4 py-3 text-xs font-mono break-all ltr text-start border border-border mb-5">{inviteUrl}</div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleCopy} className={cn("gap-2", copied && "bg-emerald-600 hover:bg-emerald-700")}>
                  {copied ? <><Check className="size-4" /> کۆپیکرا!</> : <><Copy className="size-4" /> کۆپیکردن</>}
                </Button>
                <Button variant="outline" onClick={() => { setInviteUrl(""); setAddOpen(false); loadUsers(); }}>داخستن</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          EDIT USER DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>دەستکاری: {editUser?.name || editUser?.email || ""}</DialogTitle>
            <DialogDescription>ڕۆڵ و مۆڵەتەکان نوێ بکەرەوە</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div onClick={() => editAvatarRef.current?.click()}
                  className="size-16 rounded-full cursor-pointer overflow-hidden border-2 border-primary shrink-0 relative group">
                  {editAvatar ? (
                    <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white text-xl font-black">
                      {editUser.name?.[0] || editUser.email?.[0] || "؟"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="size-4 text-white" />
                  </div>
                </div>
                <input ref={editAvatarRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setEditAvatar(await resizeImage(f)); } catch { alert("گۆڕینی وێنەکە نەکرای"); } }}
                />
                <div>
                  <p className="font-bold text-sm mb-0.5">{editUser.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{editUser.email}</p>
                  <p className="text-[11px] text-muted-foreground">کلیک لەسەر وێنەکە بکە بۆ گۆڕین</p>
                  {editAvatar && <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive h-6 mt-1" onClick={() => setEditAvatar("")}>سڕینەوەی وێنە</Button>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">ڕۆڵ</Label>
                <Select value={editRole} onValueChange={(v: string | null) => v && setEditRole(v)}>
                  <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REP">نوێنەر</SelectItem>
                    <SelectItem value="MANAGER">بەڕێوەبەر</SelectItem>
                    <SelectItem value="ADMIN">ئەدمین</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">مۆڵەتەکان</p>
                <PermissionGrid permissions={editPerms} onChange={setEditPerms} />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setEditUser(null)}>پاشگەزبوونەوە</Button>
                <Button onClick={handleSaveEdit} disabled={editLoading}>
                  {editLoading ? "پاشەکەوتکردن..." : "نوێکردنەوە"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DISABLE USER CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!disableId} onOpenChange={open => !open && setDisableId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>ناچالاككردنی بەکارهێنەر</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت؟ ئەم بەکارهێنەرە ناتوانێت داخڵ بکەت، بەڵام داتای ئەوان بە تەواو دەمێنێت. دوباره دەتوانیت چالاکیان بکەیتەوە.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDisable}>
              ناچالاككردن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
