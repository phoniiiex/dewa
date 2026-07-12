"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Bot, Settings2, Send, CheckCircle, RefreshCw, Wifi,
  Users, Save, Link2,
} from "lucide-react";
import { useData } from "@/lib/store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { testTelegramBot, sendTelegramMessage } from "@/lib/telegram";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TgRole = "DRIVER" | "REP" | "MANAGEMENT" | "ADMIN" | "UNASSIGNED";
interface TgUser {
  chat_id:    string;
  first_name: string;
  last_name:  string;
  username:   string;
  role:       TgRole;
  linked_id:  string;
  linked_name: string;
  updated_at: string;
}

const ROLE_META: Record<TgRole, { label: string; emoji: string; color: string; bg: string }> = {
  DRIVER:     { label: "شوفێر",           emoji: "🚗", color: "#7C3AED", bg: "#EDE9FE" },
  REP:        { label: "نوێنەری پزیشکی",  emoji: "🩺", color: "#2B8A3E", bg: "#D3F9D8" },
  MANAGEMENT: { label: "بەڕێوەبەر",       emoji: "🏢", color: "#4263EB", bg: "#EDF2FF" },
  ADMIN:      { label: "ئەدمین",           emoji: "🔑", color: "#C92A2A", bg: "#FFE3E3" },
  UNASSIGNED: { label: "نەمشخەسکراو",     emoji: "❓", color: "#6C757D", bg: "#F1F3F5" },
};

// Hack to access useData inside UserRow without hooks (pass ref)
let useDataRef: ReturnType<typeof useData>;

function UserRow({
  user, drivers, reps, notifyIds, onSaved,
}: {
  user: TgUser;
  drivers: { id: string; name: string }[];
  reps:    { id: string; name: string }[];
  notifyIds: string[];
  onSaved: () => void;
}) {
  const [role, setRole]         = useState<TgRole>(user.role);
  const [linkedId, setLinkedId] = useState(user.linked_id || "");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const linkOptions = role === "DRIVER" ? drivers : role === "REP" ? reps : [];
  const needsLink   = role === "DRIVER" || role === "REP";
  const linkedName  = linkOptions.find(o => o.id === linkedId)?.name || "";
  const meta        = ROLE_META[role];
  const fullName    = [user.first_name, user.last_name].filter(Boolean).join(" ") || `@${user.username}` || user.chat_id;

  const handleSave = async () => {
    setSaving(true);
    const { updateSettings } = useDataRef;
    await supabase.from("telegram_users").upsert({
      chat_id:     user.chat_id,
      first_name:  user.first_name,
      last_name:   user.last_name,
      username:    user.username,
      role,
      linked_id:   linkedId,
      linked_name: linkedName,
      updated_at:  new Date().toISOString(),
    }, { onConflict: "chat_id" });

    if (role === "REP"    && linkedId) await supabase.from("reps").update({ telegram_chat_id: user.chat_id }).eq("id", linkedId);
    if (role === "DRIVER" && linkedId) await supabase.from("drivers").update({ telegram_chat_id: user.chat_id }).eq("id", linkedId);

    if ((role === "ADMIN" || role === "MANAGEMENT") && !notifyIds.includes(user.chat_id)) {
      const updated = [...notifyIds.filter(Boolean), user.chat_id].slice(0, 2);
      await updateSettings({ telegramNotifyChatIds: updated });
    }
    if (role !== "ADMIN" && role !== "MANAGEMENT" && notifyIds.includes(user.chat_id)) {
      await updateSettings({ telegramNotifyChatIds: notifyIds.filter(id => id !== user.chat_id) });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="size-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: meta.bg }}>
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{fullName}</p>
          <p className="text-[11px] text-muted-foreground">
            {user.username ? `@${user.username} · ` : ""}ID: {user.chat_id}
          </p>
        </div>
        <Badge style={{ background: meta.bg, color: meta.color }} className="text-[11px] border-0 shrink-0">
          {meta.label}
        </Badge>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Select value={role} onValueChange={(v: string | null) => { if (v) { setRole(v as TgRole); setLinkedId(""); } }}>
          <SelectTrigger className="w-auto min-w-[160px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNASSIGNED">— نەمشخەسکراو —</SelectItem>
            <SelectItem value="DRIVER">🚗 شوفێر</SelectItem>
            <SelectItem value="REP">🩺 نوێنەری پزیشکی</SelectItem>
            <SelectItem value="MANAGEMENT">🏢 بەڕێوەبەر</SelectItem>
            <SelectItem value="ADMIN">🔑 ئەدمین (ئاگادار)</SelectItem>
          </SelectContent>
        </Select>

        {needsLink && linkOptions.length > 0 && (
          <Select value={linkedId || null} onValueChange={(v: string | null) => v && setLinkedId(v)}>
            <SelectTrigger className="flex-1 min-w-36 text-sm">
              <SelectValue placeholder="— پەیوەندیدار هەڵبژێرە —" />
            </SelectTrigger>
            <SelectContent>
              {linkOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {needsLink && linkOptions.length === 0 && (
          <span className="text-xs text-destructive px-2.5 py-1.5">
            ⚠️ هیچ {role === "DRIVER" ? "شوفێر" : "نوێنەر"}ێک تۆمار نەکراوە
          </span>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving || (needsLink && !linkedId)}
          className={cn("gap-1.5 shrink-0 transition-colors", saved ? "bg-emerald-600 hover:bg-emerald-600" : "")}>
          {saved ? <><CheckCircle className="size-3" />پاشەکەوتکرا</> : saving ? "..." : <><Save className="size-3" />پاشەکەوتکردن</>}
        </Button>
      </div>

      {user.linked_name && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
          <Link2 className="size-2.5" /> پەیوەندیدار بە: {user.linked_name}
        </div>
      )}
    </div>
  );
}

function ManualAddUser({ onAdded, showToast }: { onAdded: () => void; showToast: (m: string, t?: "success" | "error") => void }) {
  const [open, setOpen]         = useState(false);
  const [chatId, setChatId]     = useState("");
  const [firstName, setFirstName] = useState("");
  const [saving, setSaving]     = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("telegram_users").upsert({
      chat_id:    chatId.trim(),
      first_name: firstName.trim() || "کەسی نەناسراو",
      last_name:  "",
      username:   "",
      role:       "UNASSIGNED",
      linked_id:  "",
      linked_name: "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "chat_id" });
    setSaving(false);
    if (error) { showToast("هەڵە: " + error.message, "error"); return; }
    showToast("زیادکرا ✅");
    setChatId(""); setFirstName(""); setOpen(false);
    onAdded();
  };

  if (!open) return (
    <Button variant="outline" onClick={() => setOpen(true)}
      className="border-dashed gap-2">
      ✏️ دەستی زیادکردنی بەکارهێنەر بە Chat ID
    </Button>
  );

  return (
    <form onSubmit={handleAdd} className="bg-background rounded-2xl border border-primary p-4 flex flex-col gap-2.5">
      <p className="font-bold text-sm text-primary">✏️ دەستی زیادکردن</p>
      <div className="flex gap-2 flex-wrap">
        <Input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Chat ID (ژمارە)" dir="ltr" required
          className="flex-1 min-w-36" />
        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="ناو (ئارەزوومەندانە)"
          className="flex-[2] min-w-40" />
        <Button type="submit" disabled={saving || !chatId} size="sm">
          {saving ? "..." : "زیادکردن"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>داخستن</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Chat ID دۆزینەوە: ئەو کەسەی /myid بنێرێت بۆ بۆتەکە، Chat ID ی ئاشکرا دەکرێت.</p>
    </form>
  );
}

export default function TelegramPage() {
  const data = useData();
  useDataRef = data;
  const { drivers, reps, settings, updateSettings, showToast } = data;

  const [tab, setTab]               = useState<"setup" | "users" | "send">("setup");
  const [tokenInput, setTokenInput] = useState(settings.telegramBotToken || "");
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [settingWh, setSettingWh]   = useState(false);

  const [users, setUsers]           = useState<TgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filter, setFilter]         = useState<TgRole | "ALL">("ALL");

  const [sendTo, setSendTo]         = useState("");
  const [sendMsg, setSendMsg]       = useState("");
  const [sending, setSending]       = useState(false);

  const notifyIds: string[] = settings.telegramNotifyChatIds ?? [];

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data: rows } = await supabase
      .from("telegram_users").select("*").order("updated_at", { ascending: false });
    setUsers((rows || []) as TgUser[]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestBot = async () => {
    if (!tokenInput.trim()) return;
    setTesting(true); setTestResult(null);
    const res = await testTelegramBot(tokenInput.trim());
    if (res.ok) {
      await updateSettings({ telegramBotToken: tokenInput.trim(), telegramBotUsername: res.username });
      setTestResult({ ok: true, msg: `✅ بۆت پەیوەندیکرا — @${res.username}` });
      showToast("بۆت پەیوەندیکرا ✅");
    } else {
      setTestResult({ ok: false, msg: `❌ هەڵە: ${res.error}` });
    }
    setTesting(false);
  };

  const handleSetWebhook = async () => {
    const token = settings.telegramBotToken || tokenInput.trim();
    if (!token) { setWebhookStatus("⚠️ سەرەتا تۆکن تاقی بکەرەوە"); return; }
    setSettingWh(true);
    const url = `${window.location.origin}/api/telegram-webhook`;
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await res.json();
    setWebhookStatus(d.ok ? `✅ Webhook ڕێکخرا` : `❌ ${d.description}`);
    setSettingWh(false);
  };

  const handleCheckWebhook = async () => {
    const token = settings.telegramBotToken || tokenInput.trim();
    if (!token) return;
    setSettingWh(true);
    const res  = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const d    = await res.json();
    setWebhookStatus(d.ok && d.result?.url ? `✅ ئێستا چالاکە: ${d.result.url}` : "⚠️ Webhook ڕێکنەخستراوە");
    setSettingWh(false);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings.telegramBotToken || !sendTo) return;
    setSending(true);
    const ok = await sendTelegramMessage(settings.telegramBotToken, sendTo, sendMsg);
    setSending(false);
    if (ok) { showToast("نامە نێردرا ✅"); setSendMsg(""); }
    else showToast("هەڵە لە ناردنی نامە", "error");
  };

  const shownUsers = filter === "ALL" ? users : users.filter(u => u.role === filter);
  const counts: Record<TgRole | "ALL", number> = {
    ALL: users.length,
    DRIVER: users.filter(u => u.role === "DRIVER").length,
    REP: users.filter(u => u.role === "REP").length,
    MANAGEMENT: users.filter(u => u.role === "MANAGEMENT").length,
    ADMIN: users.filter(u => u.role === "ADMIN").length,
    UNASSIGNED: users.filter(u => u.role === "UNASSIGNED").length,
  };

  const TABS = [
    { id: "setup" as const, icon: <Settings2 className="size-3.5" />, label: "ڕێکخستن" },
    { id: "users" as const, icon: <Users className="size-3.5" />, label: "بەکارهێنەران" },
    { id: "send"  as const, icon: <Send  className="size-3.5" />, label: "ناردنی نامە" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-3xl" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-11 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-primary">
          <Bot className="size-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black">بۆتی تێلێگرام</h1>
          <p className="text-xs text-muted-foreground">بەڕێوەبردن، ناردن، و دیاریکردنی ڕۆڵی بەکارهێنەران</p>
        </div>
        {settings.telegramBotUsername && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <Wifi className="size-3" /> @{settings.telegramBotUsername}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "secondary" : "ghost"} size="sm"
            onClick={() => setTab(t.id)}
            className={cn("gap-1.5 px-4 rounded-lg text-sm font-bold",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            {t.icon}
            {t.label}
            {t.id === "users" && users.length > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">{users.length}</span>
            )}
          </Button>
        ))}
      </div>

      {/* ── Setup Tab ── */}
      {tab === "setup" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Settings2 className="size-4" />تۆکنی بۆت</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Bot Token (لە @BotFather وەرگرە)</Label>
                <Input value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                  placeholder="123456789:ABCDEF..." dir="ltr" type="password" />
              </div>
              <div className="mt-3">
                <Button variant="secondary" onClick={handleTestBot} disabled={testing || !tokenInput} className="gap-2">
                  {testing ? "تاقیکردن..." : "🔌 تاقیکردنەوە"}
                </Button>
              </div>
              {testResult && (
                <div className={cn("mt-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold",
                  testResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400")}>
                  {testResult.msg}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🔗 Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                پێویستە Webhook ڕێکبخەیت تا پەیامەکان وەربگیرێن. <b>ئەمەش جگە لەوەیە کە بەکارهێنەران بە ئۆتۆماتیکی تۆمار دەبن.</b>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSetWebhook} disabled={settingWh || !settings.telegramBotToken} className="gap-2">
                  {settingWh ? "..." : "🔗 Webhook ڕێکبخە"}
                </Button>
                <Button variant="outline" onClick={handleCheckWebhook} disabled={settingWh || !settings.telegramBotToken}>
                  🔍 بینینی بارودۆخ
                </Button>
              </div>
              {webhookStatus && (
                <div className={cn("mt-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold",
                  webhookStatus.startsWith("✅") ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                                 : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400")}>
                  {webhookStatus}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40">
            <CardContent className="pt-4">
              <h4 className="font-bold text-primary mb-2.5">⚡ چۆن کار دەکات؟</h4>
              <ol className="text-sm text-muted-foreground leading-[2.2] pe-5 list-decimal m-0">
                <li>تۆکن بنووسە و تاقی بکەرەوە</li>
                <li>Webhook ڕێکبخە (یەک جار)</li>
                <li>هەر کەسێک پەیامی بنێرێت بۆ بۆتەکە <b>بە ئۆتۆماتیکی</b> لە تابی «بەکارهێنەران» دەردەکەوێت</li>
                <li>ڕۆڵی هەر کەسێک دیاری بکە: شوفێر، نوێنەر، بەڕێوەبەر، ئەدمین</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="flex flex-col gap-4">
          {/* How to register info */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground">
              <p className="font-black text-sm mb-0.5">🤖 چۆن بەکارهێنەر تۆمار بکرێت؟</p>
              <p className="text-xs opacity-85">سێ ڕێگا هەن — ئاسانترین بکەرە</p>
            </div>
            <CardContent className="pt-3 pb-4 flex flex-col gap-2.5">
              <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-800/40">
                <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-1">✅ ڕێگای ١ — بەهێزترین (پێشنیار)</p>
                <p className="text-xs text-muted-foreground">بڵێ بۆتەکە بکەن لە تێلێگرام و <b>/start</b> بنێرن — بۆت بە ئۆتۆماتیکی تۆمارشان دەکات.</p>
              </div>
              <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-800/40">
                <p className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-1">🆔 ڕێگای ٢ — Chat ID ی خۆی</p>
                <p className="text-xs text-muted-foreground">هەر پەیامێک بنێرن بۆ بۆتەکە. بۆ زانینی Chat ID ی خۆیان <b>/myid</b> بنێرن.</p>
              </div>
              <div className="px-3.5 py-2.5 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-300 dark:border-violet-800/40">
                <p className="font-bold text-sm text-violet-700 dark:text-violet-400 mb-1">✏️ ڕێگای ٣ — دەستی زیادکردن</p>
                <p className="text-xs text-muted-foreground">Chat ID ی کەسەکە بزانە و خۆت دەستی زیادی بکە لە خوارەوە.</p>
              </div>
            </CardContent>
          </Card>

          <ManualAddUser onAdded={loadUsers} showToast={showToast} />

          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            {(["ALL", "UNASSIGNED", "DRIVER", "REP", "MANAGEMENT", "ADMIN"] as const).map(f => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
                onClick={() => setFilter(f)}
                className="rounded-lg text-xs font-semibold">
                {f === "ALL" ? "هەموو" : ROLE_META[f].label} ({counts[f]})
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers} className="me-auto gap-1.5">
              <RefreshCw className={cn("size-3", loadingUsers && "animate-spin")} /> نوێکردنەوە
            </Button>
          </div>

          {/* User list */}
          {loadingUsers ? (
            <div className="text-center py-10 text-muted-foreground text-sm">بارکردن...</div>
          ) : shownUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Users className="size-10 opacity-20 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">هیچ بەکارهێنەرێک نەدۆزرایەوە</p>
                <p className="text-xs text-muted-foreground/60">
                  {users.length === 0
                    ? "بۆتەکە Webhook پێویستە و کەسێک پەیام بنێرێت"
                    : `هیچ بەکارهێنەرێک بە فلتەری "${filter}" نەدۆزرایەوە`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {shownUsers.map(u => (
                <UserRow key={u.chat_id} user={u} drivers={drivers} reps={reps} notifyIds={notifyIds} onSaved={loadUsers} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Send Tab ── */}
      {tab === "send" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Send className="size-4" />ناردنی نامە</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="flex flex-col gap-3.5">
              <div className="space-y-2">
                <Label>ناردن بۆ</Label>
                <Select value={sendTo || null} onValueChange={(v: string | null) => v && setSendTo(v)}>
                  <SelectTrigger><SelectValue placeholder="— هەڵبژێرە —" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.chat_id).map(u => {
                      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || `@${u.username}` || u.chat_id;
                      const meta = ROLE_META[u.role];
                      return <SelectItem key={u.chat_id} value={u.chat_id}>{meta.emoji} {name} ({meta.label})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              {users.length === 0 && <p className="text-xs text-destructive">⚠️ بۆ نمایشی لیست سەرەتا تابی «بەکارهێنەران» بکەشە</p>}
              <div className="space-y-2">
                <Label>نامەکە</Label>
                <Textarea className="min-h-[100px] resize-y"
                  value={sendMsg} onChange={e => setSendMsg(e.target.value)} placeholder="نامەکەت بنووسە..." required />
              </div>
              <Button type="submit" disabled={sending || !settings.telegramBotToken || !sendTo} className="gap-2">
                {sending ? "ناردن..." : "📨 ناردنی نامە"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
