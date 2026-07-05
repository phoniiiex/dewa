"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Bot, Settings2, Send, CheckCircle, RefreshCw, Wifi,
  Users, Save, AlertTriangle, Link2, Unlink,
} from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, inputStyle } from "@/components/ui/FormField";
import { testTelegramBot, sendTelegramMessage } from "@/lib/telegram";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── UserRow ───────────────────────────────────────────────────────────────────
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

    // Sync telegram_chat_id to related tables
    if (role === "REP"    && linkedId) await supabase.from("reps").update({ telegram_chat_id: user.chat_id }).eq("id", linkedId);
    if (role === "DRIVER" && linkedId) await supabase.from("drivers").update({ telegram_chat_id: user.chat_id }).eq("id", linkedId);

    // Add ADMIN/MANAGEMENT to notify list
    if ((role === "ADMIN" || role === "MANAGEMENT") && !notifyIds.includes(user.chat_id)) {
      const updated = [...notifyIds.filter(Boolean), user.chat_id].slice(0, 2);
      await updateSettings({ telegramNotifyChatIds: updated });
    }
    // Remove from notify if role changed away from ADMIN/MANAGEMENT
    if (role !== "ADMIN" && role !== "MANAGEMENT" && notifyIds.includes(user.chat_id)) {
      await updateSettings({ telegramNotifyChatIds: notifyIds.filter(id => id !== user.chat_id) });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  return (
    <div style={{ background: "white", border: "1px solid #E9ECEF", borderRadius: 14, padding: "14px 16px" }}>
      {/* User info row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>{fullName}</div>
          <div style={{ fontSize: 11, color: "#ADB5BD" }}>
            {user.username ? `@${user.username} · ` : ""}ID: {user.chat_id}
          </div>
        </div>
        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 700, background: meta.bg, color: meta.color, flexShrink: 0 }}>
          {meta.label}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Role selector */}
        <select
          value={role}
          onChange={e => { setRole(e.target.value as TgRole); setLinkedId(""); }}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: "white" }}
        >
          <option value="UNASSIGNED">— نەمشخەسکراو —</option>
          <option value="DRIVER">🚗 شوفێر</option>
          <option value="REP">🩺 نوێنەری پزیشکی</option>
          <option value="MANAGEMENT">🏢 بەڕێوەبەر</option>
          <option value="ADMIN">🔑 ئەدمین (ئاگادار)</option>
        </select>

        {/* Link selector */}
        {needsLink && linkOptions.length > 0 && (
          <select
            value={linkedId}
            onChange={e => setLinkedId(e.target.value)}
            style={{ flex: 1, minWidth: 140, padding: "7px 10px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: "white" }}
          >
            <option value="">— پەیوەندیدار هەڵبژێرە —</option>
            {linkOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        {needsLink && linkOptions.length === 0 && (
          <span style={{ fontSize: 12, color: "#E03131", padding: "7px 10px" }}>⚠️ هیچ {role === "DRIVER" ? "شوفێر" : "نوێنەر"}ێک تۆمار نەکراوە</span>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving || (needsLink && !linkedId)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: saved ? "#2F9E44" : "#4263EB", color: "white", border: "none", borderRadius: 8, cursor: saving || (needsLink && !linkedId) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1, transition: "background .2s", flexShrink: 0, fontFamily: "inherit" }}>
          {saved ? <><CheckCircle size={13} /> پاشەکەوتکرا</> : saving ? "..." : <><Save size={13} /> پاشەکەوتکردن</>}
        </button>
      </div>

      {/* Linked badge */}
      {user.linked_name && (
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 9px", borderRadius: 5, background: "#EDF2FF", color: "#4263EB", fontWeight: 600 }}>
          <Link2 size={9} /> پەیوەندیدار بە: {user.linked_name}
        </div>
      )}
    </div>
  );
}

// Hack to access useData inside UserRow without hooks (pass ref)
let useDataRef: ReturnType<typeof useData>;

// ── ManualAddUser ─────────────────────────────────────────────────────────────
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
    <button onClick={() => setOpen(true)}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "white", border: "1px dashed #CED4DA", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6C757D", fontFamily: "inherit" }}>
      ✏️ دەستی زیادکردنی بەکارهێنەر بە Chat ID
    </button>
  );

  return (
    <form onSubmit={handleAdd} style={{ background: "white", borderRadius: 14, border: "1px solid #4263EB", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#4263EB" }}>✏️ دەستی زیادکردن</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Chat ID (ژمارە)" dir="ltr" required
          style={{ flex: 1, minWidth: 140, padding: "8px 12px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit" }} />
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="ناو (ئارەزوومەندانە)"
          style={{ flex: 2, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit" }} />
        <button type="submit" disabled={saving || !chatId}
          style={{ padding: "8px 16px", background: "#4263EB", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "..." : "زیادکردن"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          style={{ padding: "8px 12px", background: "#F1F3F5", color: "#6C757D", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          داخستن
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#ADB5BD" }}>Chat ID دۆزینەوە: ئەو کەسەی /myid بنێرێت بۆ بۆتەکە، Chat ID ی ئاشکرا دەکرێت.</div>
    </form>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
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

  // Users tab
  const [users, setUsers]           = useState<TgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filter, setFilter]         = useState<TgRole | "ALL">("ALL");

  // Send tab
  const [sendTo, setSendTo]         = useState("");
  const [sendMsg, setSendMsg]       = useState("");
  const [sending, setSending]       = useState(false);

  const notifyIds: string[] = settings.telegramNotifyChatIds ?? [];

  // Load users from DB
  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data: rows } = await supabase
      .from("telegram_users")
      .select("*")
      .order("updated_at", { ascending: false });
    setUsers((rows || []) as TgUser[]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setup handlers ──────────────────────────────────────────────────────
  const handleTestBot = async () => {
    if (!tokenInput.trim()) return;
    setTesting(true);
    setTestResult(null);
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

  // Filtered users
  const shownUsers = filter === "ALL" ? users : users.filter(u => u.role === filter);
  const counts: Record<TgRole | "ALL", number> = {
    ALL:        users.length,
    DRIVER:     users.filter(u => u.role === "DRIVER").length,
    REP:        users.filter(u => u.role === "REP").length,
    MANAGEMENT: users.filter(u => u.role === "MANAGEMENT").length,
    ADMIN:      users.filter(u => u.role === "ADMIN").length,
    UNASSIGNED: users.filter(u => u.role === "UNASSIGNED").length,
  };

  // ── Styles ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "white", borderRadius: 16, padding: "20px 24px",
    border: "1px solid #E9ECEF", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
  };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
    borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700,
    fontSize: 13, fontFamily: "inherit", transition: "all .15s",
    background: active ? "white" : "transparent",
    color: active ? "#4263EB" : "#6C757D",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
  });

  return (
    <div style={{ padding: 24, direction: "rtl", display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, background: "#EDF2FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={22} color="#4263EB" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", margin: 0 }}>بۆتی تێلێگرام</h1>
          <p style={{ fontSize: 12, color: "#6C757D", margin: "3px 0 0" }}>بەڕێوەبردن، ناردن، و دیاریکردنی ڕۆڵی بەکارهێنەران</p>
        </div>
        {settings.telegramBotUsername && (
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#EBFBEE", color: "#2F9E44", fontSize: 12, fontWeight: 700 }}>
            <Wifi size={12} /> @{settings.telegramBotUsername}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 12, padding: 4, width: "fit-content" }}>
        <button style={tabBtn(tab === "setup")} onClick={() => setTab("setup")}><Settings2 size={14} /> ڕێکخستن</button>
        <button style={tabBtn(tab === "users")} onClick={() => setTab("users")}><Users size={14} /> بەکارهێنەران {users.length > 0 && <span style={{ background: "#4263EB", color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{users.length}</span>}</button>
        <button style={tabBtn(tab === "send")}  onClick={() => setTab("send")}><Send size={14} /> ناردنی نامە</button>
      </div>

      {/* ── Setup Tab ───────────────────────────────────────────────────── */}
      {tab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Token */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Settings2 size={16} /> تۆکنی بۆت</h3>
            <FormField label="Bot Token (لە @BotFather وەرگرە)">
              <input style={inputStyle} value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                placeholder="123456789:ABCDEF..." dir="ltr" type="password" />
            </FormField>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={handleTestBot} disabled={testing || !tokenInput}
                style={{ padding: "9px 20px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", opacity: testing ? 0.7 : 1 }}>
                {testing ? "تاقیکردن..." : "🔌 تاقیکردنەوە"}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: testResult.ok ? "#EBFBEE" : "#FFF0F0", color: testResult.ok ? "#2F9E44" : "#E03131" }}>
                {testResult.msg}
              </div>
            )}
          </div>

          {/* Webhook */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>🔗 Webhook</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 14 }}>
              پێویستە Webhook ڕێکبخەیت تا پەیامەکان وەربگیرێن. <b>ئەمەش جگە لەوەیە کە بەکارهێنەران بە ئۆتۆماتیکی تۆمار دەبن.</b>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={handleSetWebhook} disabled={settingWh || !settings.telegramBotToken}
                style={{ padding: "9px 20px", background: settings.telegramBotToken ? "#4263EB" : "#DEE2E6", color: settings.telegramBotToken ? "white" : "#6C757D", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                {settingWh ? "..." : "🔗 Webhook ڕێکبخە"}
              </button>
              <button onClick={handleCheckWebhook} disabled={settingWh || !settings.telegramBotToken}
                style={{ padding: "9px 16px", background: "#F8F9FA", color: "#495057", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}>
                🔍 بینینی بارودۆخ
              </button>
            </div>
            {webhookStatus && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: webhookStatus.startsWith("✅") ? "#EBFBEE" : "#FEF3C7", color: webhookStatus.startsWith("✅") ? "#2F9E44" : "#D97706" }}>
                {webhookStatus}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{ ...card, background: "#F8FAFF", border: "1px solid #DBE4FF" }}>
            <h4 style={{ fontWeight: 700, color: "#4263EB", marginBottom: 10 }}>⚡ چۆن کار دەکات؟</h4>
            <ol style={{ fontSize: 13, color: "#495057", lineHeight: 2.2, paddingRight: 20, margin: 0 }}>
              <li>تۆکن بنووسە و تاقی بکەرەوە</li>
              <li>Webhook ڕێکبخە (یەک جار)</li>
              <li>هەر کەسێک پەیامی بنێرێت بۆ بۆتەکە <b>بە ئۆتۆماتیکی</b> لە تابی «بەکارهێنەران» دەردەکەوێت</li>
              <li>ڕۆڵی هەر کەسێک دیاری بکە: شوفێر، نوێنەر، بەڕێوەبەر، ئەدمین</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Users Tab ────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* How to register */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #E9ECEF", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#4263EB", color: "white" }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>🤖 چۆن بەکارهێنەر تۆمار بکرێت؟</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>سێ ڕێگا هەن — ئاسانترین بکەرە</div>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "10px 14px", background: "#EBFBEE", borderRadius: 10, border: "1px solid #A9E34B" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#2B8A3E", marginBottom: 4 }}>✅ ڕێگای ١ — بەهێزترین (پێشنیار)</div>
                <div style={{ fontSize: 12, color: "#495057" }}>بڵێ بۆتەکە بکەن لە تێلێگرام و <b>/start</b> بنێرن — بۆت بە ئۆتۆماتیکی تۆمارشان دەکات و Chat ID ی ئەوان ئاشکرا دەکات.</div>
              </div>
              <div style={{ padding: "10px 14px", background: "#FFF9DB", borderRadius: 10, border: "1px solid #FFE066" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#E67700", marginBottom: 4 }}>🆔 ڕێگای ٢ — Chat ID ی خۆی</div>
                <div style={{ fontSize: 12, color: "#495057" }}>هەر پەیامێک بنێرن بۆ بۆتەکە. بۆ زانینی Chat ID ی خۆیان <b>/myid</b> بنێرن — بۆت ئەوی ئاشکرا دەکات.</div>
              </div>
              <div style={{ padding: "10px 14px", background: "#F3F0FF", borderRadius: 10, border: "1px solid #BDA9FF" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#7C3AED", marginBottom: 4 }}>✏️ ڕێگای ٣ — دەستی زیادکردن</div>
                <div style={{ fontSize: 12, color: "#495057" }}>Chat ID ی کەسەکە بزانە و خۆت دەستی زیادی بکە لە خوارەوە.</div>
              </div>
            </div>
          </div>

          {/* Manual add form */}
          <ManualAddUser onAdded={loadUsers} showToast={showToast} />

          {/* Filters + Refresh */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(["ALL", "UNASSIGNED", "DRIVER", "REP", "MANAGEMENT", "ADMIN"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                  borderColor: filter === f ? "#4263EB" : "#E9ECEF",
                  background: filter === f ? "#4263EB" : "white",
                  color: filter === f ? "white" : "#495057",
                }}>
                {f === "ALL" ? "هەموو" : ROLE_META[f].label} ({counts[f]})
              </button>
            ))}
            <button onClick={loadUsers} disabled={loadingUsers}
              style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #E9ECEF", background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6C757D", fontFamily: "inherit" }}>
              <RefreshCw size={12} style={{ animation: loadingUsers ? "spin 1s linear infinite" : "none" }} /> نوێکردنەوە
            </button>
          </div>

          {/* User list */}
          {loadingUsers ? (
            <div style={{ textAlign: "center", padding: 40, color: "#ADB5BD" }}>بارکردن...</div>
          ) : shownUsers.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 48 }}>
              <Users size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: "#ADB5BD", marginBottom: 6 }}>هیچ بەکارهێنەرێک نەدۆزرایەوە</div>
              <div style={{ fontSize: 12, color: "#CED4DA" }}>
                {users.length === 0
                  ? "بۆتەکە Webhook پێویستە و کەسێک پەیام بنێرێت"
                  : `هیچ بەکارهێنەرێک بە فلتەری "${filter}" نەدۆزرایەوە`}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shownUsers.map(u => (
                <UserRow key={u.chat_id} user={u} drivers={drivers} reps={reps} notifyIds={notifyIds} onSaved={loadUsers} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Send Tab ─────────────────────────────────────────────────────── */}
      {tab === "send" && (
        <div style={card}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}><Send size={16} /> ناردنی نامە</h3>
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FormField label="ناردن بۆ">
              <select style={{ ...inputStyle, cursor: "pointer" }} value={sendTo} onChange={e => setSendTo(e.target.value)} required>
                <option value="">— هەڵبژێرە —</option>
                {users.filter(u => u.chat_id).map(u => {
                  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || `@${u.username}` || u.chat_id;
                  const meta = ROLE_META[u.role];
                  return <option key={u.chat_id} value={u.chat_id}>{meta.emoji} {name} ({meta.label})</option>;
                })}
              </select>
            </FormField>
            {users.length === 0 && <div style={{ fontSize: 12, color: "#E03131" }}>⚠️ بۆ نمایشی لیست سەرەتا تابی «بەکارهێنەران» بکەشە</div>}
            <FormField label="نامەکە">
              <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
                value={sendMsg} onChange={e => setSendMsg(e.target.value)} placeholder="نامەکەت بنووسە..." required />
            </FormField>
            <button type="submit" disabled={sending || !settings.telegramBotToken || !sendTo}
              style={{ padding: "10px 24px", background: "#4263EB", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", opacity: sending ? 0.7 : 1 }}>
              {sending ? "ناردن..." : "📨 ناردنی نامە"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
