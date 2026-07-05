"use client";
import { useState, useEffect, FormEvent } from "react";
import { Bot, Send, Settings2, CheckCircle, RefreshCw, Bell, BellOff, UserCheck, Users, MapPin } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, inputStyle } from "@/components/ui/FormField";
import { testTelegramBot, sendTelegramMessage, getTelegramUpdates } from "@/lib/telegram";
import { supabase } from "@/lib/supabase";

type TelegramUser = { chatId: string; firstName: string; lastName: string; username: string };
type TgRole = "DRIVER" | "REP" | "MANAGEMENT" | "ADMIN" | "UNASSIGNED";
type SavedTgUser = { chat_id: string; first_name: string; last_name: string; username: string; role: TgRole; linked_id: string; linked_name: string; };

// ── UserRoleCard ─────────────────────────────────────────────────────────────
function UserRoleCard({
  chatId, firstName, lastName, username, fullName,
  initialRole, initialLinkedId, initialLinkedName,
  drivers, reps, saving, onSave,
}: {
  chatId: string; firstName: string; lastName: string; username: string; fullName: string;
  initialRole: TgRole; initialLinkedId: string; initialLinkedName: string;
  drivers: { id: string; name: string }[];
  reps:    { id: string; name: string }[];
  saving: boolean;
  onSave: (chatId: string, role: TgRole, linkedId: string, linkedName: string, firstName: string, lastName: string, username: string) => void;
}) {
  const [role, setRole]         = useState<TgRole>(initialRole);
  const [linkedId, setLinkedId] = useState(initialLinkedId);

  const roleLabel: Record<TgRole, string> = {
    DRIVER: "شوفێر", REP: "نوێنەری پزیشکی", MANAGEMENT: "بەڕێوەبەر", ADMIN: "ئەدمین", UNASSIGNED: "— هەڵنەبژێردراو —",
  };
  const roleBg: Record<TgRole, string> = {
    DRIVER: "#EDE9FE", REP: "#D3F9D8", MANAGEMENT: "#EDF2FF", ADMIN: "#FFE3E3", UNASSIGNED: "#F1F3F5",
  };
  const roleColor: Record<TgRole, string> = {
    DRIVER: "#7C3AED", REP: "#2B8A3E", MANAGEMENT: "#4263EB", ADMIN: "#C92A2A", UNASSIGNED: "#6C757D",
  };

  const linkOptions = role === "DRIVER" ? drivers : role === "REP" ? reps : [];
  const linkedName  = linkOptions.find(o => o.id === linkedId)?.name || "";

  return (
    <div style={{ padding: "14px 16px", background: "#F8F9FA", borderRadius: 12, border: "1px solid #E9ECEF" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>{fullName}</div>
          <div style={{ fontSize: 11, color: "#ADB5BD" }}>{username ? `@${username} · ` : ""}Chat ID: {chatId}</div>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 700, background: roleBg[role], color: roleColor[role] }}>{roleLabel[role]}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <select value={role} onChange={e => { setRole(e.target.value as TgRole); setLinkedId(""); }}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: "white" }}>
          <option value="UNASSIGNED">— هەڵنەبژێردراو —</option>
          <option value="DRIVER">🚗 شوفێر</option>
          <option value="REP">🩺 نوێنەری پزیشکی</option>
          <option value="MANAGEMENT">🏢 بەڕێوەبەر</option>
          <option value="ADMIN">🔑 ئەدمین</option>
        </select>
        {linkOptions.length > 0 && (
          <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
            style={{ flex: 1, minWidth: 140, padding: "7px 12px", borderRadius: 8, border: "1px solid #DEE2E6", fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: "white" }}>
            <option value="">— پەیوەندیدار —</option>
            {linkOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        <button onClick={() => onSave(chatId, role, linkedId, linkedName, firstName, lastName, username)}
          disabled={saving}
          style={{ padding: "7px 16px", background: "#4263EB", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}>
          {saving ? "..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </div>
  );
}

export default function TelegramPage() {
  const { drivers, reps, settings, updateSettings, showToast } = useData();

  const [tokenInput, setTokenInput]   = useState(settings.telegramBotToken || "");
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"setup" | "users" | "notify" | "send">("setup");
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [settingWebhook, setSettingWebhook] = useState(false);

  // Users/Role tab
  const [savedUsers, setSavedUsers]   = useState<SavedTgUser[]>([]);
  const [savingRole, setSavingRole]   = useState<string | null>(null);

  // Notify users tab
  const [scanning, setScanning]           = useState(false);
  const [detectedUsers, setDetectedUsers] = useState<TelegramUser[]>([]);
  const [scanError, setScanError]         = useState("");

  // Send tab
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [message, setMessage]                   = useState("");
  const [sending, setSending]                   = useState(false);

  const notifyChatIds: string[] = settings.telegramNotifyChatIds ?? [];

  const handleSaveToken = async (e: FormEvent) => {
    e.preventDefault();
    await updateSettings({ telegramBotToken: tokenInput.trim() });
    showToast("تۆکنی بۆت پاشەکەوتکرا ✅");
  };

  const handleSetWebhook = async () => {
    const token = settings.telegramBotToken || tokenInput.trim();
    if (!token) { setWebhookStatus("❌ تکایە سەرەتا تۆکن بۆت بنووسە و پاشەکەوتبكە"); return; }
    setSettingWebhook(true);
    setWebhookStatus(null);
    try {
      const webhookUrl = `${window.location.origin}/api/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookStatus(`✅ Webhook رێکخرا — ${webhookUrl}`);
        showToast("Webhook بەکارت ھات ✅");
      } else {
        setWebhookStatus(`❌ ھەڵە: ${data.description}`);
      }
    } catch {
      setWebhookStatus("❌ ھەڵەی تۆڕ — ناتوانرێت پەیوەندی بکرێت");
    }
    setSettingWebhook(false);
  };

  const handleCheckWebhook = async () => {
    const token = settings.telegramBotToken || tokenInput.trim();
    if (!token) return;
    setSettingWebhook(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      if (data.ok && data.result?.url) {
        setWebhookStatus(`✅ ئێستا رێکخراوە: ${data.result.url}`);
      } else if (data.ok && !data.result?.url) {
        setWebhookStatus("⚠️ Webhook رێکنەخستراوە");
      } else {
        setWebhookStatus(`❌ ھەڵە: ${data.description}`);
      }
    } catch {
      setWebhookStatus("❌ ھەڵەی تۆڕ");
    }
    setSettingWebhook(false);
  };

  const handleTestBot = async () => {
    if (!tokenInput.trim()) { setTestResult("تکایە تۆکنی بۆت بنووسە"); return; }
    setTesting(true);
    setTestResult(null);
    const result = await testTelegramBot(tokenInput.trim());
    setTesting(false);
    if (result.ok) {
      await updateSettings({ telegramBotToken: tokenInput.trim(), telegramBotUsername: result.username });
      setTestResult(`✅ بۆت سەرکەوتوو — @${result.username}`);
      showToast("بۆت پەیوەندیکرا ✅");
    } else {
      setTestResult(`❌ هەڵە: ${result.error}`);
    }
  };

  const handleScanForNotify = async () => {
    if (!settings.telegramBotToken) { setScanError("تکایە سەرەتا تۆکنی بۆت ڕێکبخە"); return; }
    setScanning(true);
    setScanError("");
    setDetectedUsers([]);
    const users = await getTelegramUpdates(settings.telegramBotToken);
    setScanning(false);
    if (users.length === 0) setScanError("هیچ کەسێک نامەی نەنێردووە بۆ بۆتەکە. تکایە هەر کەسێک بیناردێت پەیامێک.");
    else setDetectedUsers(users);
  };

  const toggleNotifyUser = async (chatId: string) => {
    const current = notifyChatIds;
    const updated = current.includes(chatId)
      ? current.filter(id => id !== chatId)
      : [...current, chatId];
    if (updated.filter(Boolean).length > 2) { showToast("زیاتر لە ٢ بەکارهێنەر ناتوانی هەڵبژێریت", "error"); return; }
    await updateSettings({ telegramNotifyChatIds: updated });
    showToast(current.includes(chatId) ? "لابرا" : "زیادکرا ✅");
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver) { showToast("شوفێر هەڵبژێرە", "error"); return; }
    if (!driver.telegramChatId) { showToast("ئەم شوفێرە Chat ID ی نییە", "error"); return; }
    if (!settings.telegramBotToken) { showToast("تۆکنی بۆت ڕێکنەخستراوە", "error"); return; }
    setSending(true);
    const ok = await sendTelegramMessage(settings.telegramBotToken, driver.telegramChatId, message);
    setSending(false);
    if (ok) { showToast("نامە نێردرا ✅"); setMessage(""); }
    else showToast("هەڵە لە ناردنی نامە", "error");
  };

  // Load saved telegram users from DB
  const loadSavedUsers = async () => {
    const { data } = await supabase.from("telegram_users").select("*").order("updated_at", { ascending: false });
    setSavedUsers((data || []) as SavedTgUser[]);
  };
  useEffect(() => { loadSavedUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveRole = async (
    chatId: string, role: TgRole,
    linkedId: string, linkedName: string,
    firstName: string, lastName: string, username: string
  ) => {
    setSavingRole(chatId);
    await supabase.from("telegram_users").upsert({
      chat_id: chatId, first_name: firstName, last_name: lastName,
      username, role, linked_id: linkedId, linked_name: linkedName,
      updated_at: new Date().toISOString(),
    }, { onConflict: "chat_id" });
    if (role === "REP"    && linkedId) await supabase.from("reps").update({ telegram_chat_id: chatId }).eq("id", linkedId);
    if (role === "DRIVER" && linkedId) await supabase.from("drivers").update({ telegram_chat_id: chatId }).eq("id", linkedId);
    if ((role === "ADMIN" || role === "MANAGEMENT") && !notifyChatIds.includes(chatId)) {
      await updateSettings({ telegramNotifyChatIds: [...notifyChatIds.filter(Boolean), chatId].slice(0, 2) });
    }
    await loadSavedUsers();
    showToast("ڕۆڵ پاشەکەوتکرا ✅");
    setSavingRole(null);
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #F1F3F5", boxShadow: "0 1px 4px rgba(0,0,0,.05)" };


  // Get display name for a chatId from detected users or drivers
  const getDisplayName = (chatId: string) => {
    const fromDetected = detectedUsers.find(u => u.chatId === chatId);
    if (fromDetected) return [fromDetected.firstName, fromDetected.lastName].filter(Boolean).join(" ") || `@${fromDetected.username}` || chatId;
    return `Chat ID: ${chatId}`;
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Bot size={20} /></div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>بۆت</h1>
          <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی بۆتی تێلێگرام، ئاگادارکردنەوە و پەیامەکان</p>
        </div>
        {settings.telegramBotToken && settings.telegramBotUsername && (
          <span style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 8, background: "#D3F9D8", color: "#2B8A3E", fontSize: 12, fontWeight: 700 }}>
            <CheckCircle size={14} /> چالاک — @{settings.telegramBotUsername}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F3F5", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([
          { key: "setup",  label: "ڕێکخستن",       icon: <Settings2 size={14} /> },
          { key: "users",  label: "بەکارهێنەران",     icon: <Users size={14} /> },
          { key: "notify", label: "ئاگادارکردنەوە", icon: <Bell size={14} /> },
          { key: "send",   label: "ناردنی نامە",    icon: <Send size={14} /> },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: selectedTab === tab.key ? "#fff" : "transparent", color: selectedTab === tab.key ? "#4263EB" : "#6C757D", boxShadow: selectedTab === tab.key ? "0 1px 3px rgba(0,0,0,.1)" : "none", transition: "all .15s" }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Setup Tab ─────────────────────────────────────────────── */}
      {selectedTab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Settings2 size={16} /> تۆکنی بۆت</h3>
            <form onSubmit={handleSaveToken} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Bot Token">
                <input style={inputStyle} value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                  placeholder="123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi" dir="ltr" type="password" />
              </FormField>
              <div style={{ fontSize: 12, color: "#6C757D", padding: "8px 12px", background: "#F8F9FA", borderRadius: 8 }}>
                💡 تۆکن لە @BotFather وەرگرە. ئەم زانیارییە لە داتابەیس پاشەکەوت دەبێت — هەموو ئەکاونتەکان هاوبەش بەکارییدەهێنن.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={handleTestBot} disabled={testing}
                  style={{ padding: "9px 18px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, opacity: testing ? 0.7 : 1 }}>
                  {testing ? "تاقیکردن..." : "🔌 تاقیکردن"}
                </button>
                <button type="submit" style={{ padding: "9px 18px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>پاشەکەوتکردن</button>
              </div>
              {testResult && (
                <div style={{ padding: "10px 14px", background: testResult.startsWith("✅") ? "#D1FAE5" : "#FEE2E2", color: testResult.startsWith("✅") ? "#059669" : "#DC2626", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                  {testResult}
                </div>
              )}
            </form>
          </div>

          {/* Webhook — one-click setup */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>🔗 Webhook</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 14 }}>پێویستە Webhook ڕێکبخەیت تا پەیامەکانی شوفێران بگەن بۆ سیستەم. یەک کرتە دەیەوەتەوە.</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleSetWebhook} disabled={settingWebhook || !settings.telegramBotToken}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: settings.telegramBotToken ? "#4263EB" : "#DEE2E6", color: settings.telegramBotToken ? "#fff" : "#6C757D", border: "none", borderRadius: 10, cursor: settings.telegramBotToken && !settingWebhook ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 14 }}>
                {settingWebhook ? "..." : "🔗 Webhook ڕێکبخە"}
              </button>
              <button onClick={handleCheckWebhook} disabled={settingWebhook || !settings.telegramBotToken}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#F8F9FA", color: "#495057", border: "1px solid #DEE2E6", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                {settingWebhook ? "..." : "🔍 بینینی بارودۆخ"}
              </button>
            </div>

            {!settings.telegramBotToken && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#DC2626" }}>⚠️ سەرەتا تۆکن پاشەکەوت بکە دواتر Webhook ڕێکبخە</div>
            )}

            {webhookStatus && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: webhookStatus.startsWith("✅") ? "#D1FAE5" : webhookStatus.startsWith("⚠️") ? "#FEF3C7" : "#FEE2E2", color: webhookStatus.startsWith("✅") ? "#059669" : webhookStatus.startsWith("⚠️") ? "#D97706" : "#DC2626", borderRadius: 10, fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>
                {webhookStatus}
              </div>
            )}

            <div style={{ marginTop: 14, padding: "10px 14px", background: "#F8FAFF", borderRadius: 8, fontSize: 12, color: "#6C757D" }}>
              📌 URL ی Webhook: <code style={{ fontSize: 11 }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/telegram-webhook</code>
            </div>
          </div>

          {/* Status overview */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📊 بارودۆخ</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "بارودۆخ", value: settings.telegramBotToken ? "✅ چالاک" : "❌ ناچالاک", color: settings.telegramBotToken ? "#059669" : "#DC2626" },
                { label: "ناوی بۆت", value: settings.telegramBotUsername ? `@${settings.telegramBotUsername}` : "—", color: "#495057" },
                { label: "شوفێران پەیوەندیکراو", value: String(drivers.filter(d => d.telegramChatId).length), color: "#7C3AED" },
                { label: "ئاگادارکەر", value: String(notifyChatIds.length) + " / 2", color: "#D97706" },
              ].map(s => (
                <div key={s.label} style={{ padding: "12px 16px", background: "#FAFAFA", borderRadius: 10, border: "1px solid #F1F3F5" }}>
                  <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users/Role Assignment Tab ────────────────────────────────── */}
      {selectedTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><Users size={16} /> دیاریکردنی ڕۆڵی بەکارهێنەرانی بۆت</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 16 }}>
              سەرەتا بۆتەکە بکەشە دواتر ڕۆڵی هەر کەسێک دیاری بکە: شوفێر، نوێنەر پزیشکی، بەڕێوەبەری، یان ئەدمین.
            </p>
            <button onClick={async () => {
              if (!settings.telegramBotToken) return;
              setScanning(true); setScanError(""); setDetectedUsers([]);
              const users = await getTelegramUpdates(settings.telegramBotToken);
              setScanning(false);
              if (users.length === 0) setScanError("هیچ کەسێک پەیامی نەنێردووە بۆ بۆتەکە. تکایە هەر کەسێک یەک پەیام بنێرێت.");
              else setDetectedUsers(users);
            }} disabled={scanning || !settings.telegramBotToken}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: scanning ? 0.6 : 1, marginBottom: 16 }}>
              <RefreshCw size={14} style={{ animation: scanning ? "spin 1s linear infinite" : "none" }} />
              {scanning ? "گەڕان..." : "🔍 کەشفکردنی بەکارهێنەران"}
            </button>
            {scanError && <div style={{ padding: "10px 14px", background: "#FEF3C7", borderRadius: 10, fontSize: 13, color: "#D97706", marginBottom: 12 }}>{scanError}</div>}
            {detectedUsers.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {detectedUsers.map(u => {
                  const saved = savedUsers.find(s => s.chat_id === u.chatId);
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || `@${u.username}` || u.chatId;
                  return (
                    <UserRoleCard
                      key={u.chatId}
                      chatId={u.chatId} firstName={u.firstName} lastName={u.lastName} username={u.username}
                      fullName={fullName}
                      initialRole={(saved?.role ?? "UNASSIGNED") as TgRole}
                      initialLinkedId={saved?.linked_id ?? ""}
                      initialLinkedName={saved?.linked_name ?? ""}
                      drivers={drivers} reps={reps}
                      saving={savingRole === u.chatId}
                      onSave={handleSaveRole}
                    />
                  );
                })}
              </div>
            )}
            {savedUsers.length > 0 && detectedUsers.length === 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D", marginBottom: 10 }}>تۆمارکراوە ({savedUsers.length}):</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {savedUsers.map(u => {
                    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || `@${u.username}` || u.chat_id;
                    const roleColors: Record<TgRole, { bg: string; color: string }> = {
                      DRIVER:     { bg: "#EDE9FE", color: "#7C3AED" },
                      REP:        { bg: "#D3F9D8", color: "#2B8A3E" },
                      ADMIN:      { bg: "#FFE3E3", color: "#C92A2A" },
                      MANAGEMENT: { bg: "#EDF2FF", color: "#4263EB" },
                      UNASSIGNED: { bg: "#F1F3F5", color: "#6C757D" },
                    };
                    const rc = roleColors[u.role];
                    return (
                      <div key={u.chat_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F8F9FA", borderRadius: 10, border: "1px solid #E9ECEF" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{fullName}</div>
                          <div style={{ fontSize: 11, color: "#ADB5BD" }}>Chat ID: {u.chat_id}{u.linked_name ? ` · ${u.linked_name}` : ""}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 700, background: rc.bg, color: rc.color }}>{u.role}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ ...card, background: "#F8FAFF" }}>
            <h4 style={{ fontWeight: 700, marginBottom: 8, color: "#4263EB", display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> چۆن نوێنەر شوێنی زیندوو بهێنەوە؟</h4>
            <ol style={{ fontSize: 13, color: "#495057", lineHeight: 2.2, paddingRight: 20, margin: 0 }}>
              <li>بۆتەکە بکەشە لە تێلێگرام</li>
              <li>کرتە بکەن لە 📎 → <b>Location</b></li>
              <li>هەڵبژێرن <b>Share Live Location</b></li>
              <li>کاتی هاوبەشکردن دیاری بکەن (8 کاتژمێر پێشنیاردەکرێت)</li>
            </ol>
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#D3F9D8", borderRadius: 8, fontSize: 12, color: "#2B8A3E", fontWeight: 600 }}>
              ✅ شوێنەکە بە ئۆتۆماتیکی لەسەر نەخشەی داشبۆرد دەردەکەوێت
            </div>
          </div>
        </div>
      )}

      {/* ── Notify Tab ─────────────────────────────────────────────── */}
      {selectedTab === "notify" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Bell size={16} /> بەکارهێنەرانی ئاگادارکردنەوە</h3>
            <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 16, lineHeight: 1.7 }}>
              هەر پەیامێک کە شوفێرێک بۆ بۆتەکە بنێرێت بە ئۆتۆماتیکی دەگاتە ئەم کەسانەی خوارەوە. دەتوانیت هەتا ٢ کەس هەڵبژێریت.
            </p>

            {/* Current notify users */}
            {notifyChatIds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#495057", marginBottom: 8 }}>ئێستا هەڵبژێردراوە:</div>
                {notifyChatIds.map(chatId => (
                  <div key={chatId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#D1FAE5", borderRadius: 10, marginBottom: 6, border: "1px solid #A7F3D0" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#059669" }}>
                      <UserCheck size={14} /> {getDisplayName(chatId)}
                    </span>
                    <button onClick={() => toggleNotifyUser(chatId)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      <BellOff size={12} /> لابردن
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scan section */}
            <div style={{ borderTop: "1px solid #F1F3F5", paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: "#6C757D", marginBottom: 12 }}>
                کەشفکردنی بەکارهێنەران — کەسانی دۆزراو لاوەکی بۆت دەکەوێت.
              </div>
              <button onClick={handleScanForNotify} disabled={scanning}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 10, cursor: scanning ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, opacity: scanning ? 0.7 : 1 }}>
                <RefreshCw size={15} style={{ animation: scanning ? "spin 1s linear infinite" : "none" }} />
                {scanning ? "گەڕان..." : "کەشفکردن"}
              </button>

              {scanError && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF3C7", borderRadius: 10, fontSize: 13, color: "#D97706" }}>{scanError}</div>
              )}

              {detectedUsers.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#495057" }}>{detectedUsers.length} کەس دۆزرایەوە:</div>
                  {detectedUsers.map(u => {
                    const isSelected = notifyChatIds.includes(u.chatId);
                    const isDriver   = drivers.some(d => d.telegramChatId === u.chatId);
                    const fullName   = [u.firstName, u.lastName].filter(Boolean).join(" ") || `@${u.username}` || u.chatId;
                    return (
                      <div key={u.chatId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: isSelected ? "#ECFDF5" : "#F8F9FA", borderRadius: 10, border: `1px solid ${isSelected ? "#A7F3D0" : "#E9ECEF"}` }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? "#059669" : "#212529" }}>
                            {isSelected && "✅ "}{fullName}
                            {isDriver && <span style={{ marginRight: 6, fontSize: 11, background: "#EDE9FE", color: "#7C3AED", padding: "1px 6px", borderRadius: 4 }}>شوفێر</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#6C757D" }}>
                            {u.username ? `@${u.username} · ` : ""}Chat ID: {u.chatId}
                          </div>
                        </div>
                        <button onClick={() => toggleNotifyUser(u.chatId)}
                          disabled={!isSelected && notifyChatIds.length >= 2}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: isSelected ? "#FEE2E2" : "#4263EB", color: isSelected ? "#DC2626" : "#fff", border: "none", borderRadius: 8, cursor: (!isSelected && notifyChatIds.length >= 2) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: (!isSelected && notifyChatIds.length >= 2) ? 0.5 : 1 }}>
                          {isSelected ? <><BellOff size={13} /> لابردن</> : <><Bell size={13} /> هەڵبژاردن</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div style={{ ...card, background: "#F8FAFF" }}>
            <h4 style={{ fontWeight: 700, marginBottom: 8, color: "#4263EB" }}>⚙️ چۆن کار دەکات؟</h4>
            <ol style={{ fontSize: 13, color: "#495057", lineHeight: 2, margin: 0, paddingRight: 20 }}>
              <li>شوفێر داواکارییەک وەردەگرێت و پەیام دەنێرێت بۆ بۆتەکە</li>
              <li>بۆتەکە ئەو پەیامە وەردەگرێت</li>
              <li>پەیامەکە بە ئۆتۆماتیکی دەگاتە هەموو ئاگادارکەرەکان</li>
              <li>ئاگادارکەرەکان ئەو وەڵامەیان دەبینن کە شوفێرەکە ناردووە</li>
            </ol>
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#D97706" }}>
              ⚠️ پێویستی بە Webhook هەیە — دڵنیابە لەوەی Webhook ڕێکخستراوە لە تابی ڕێکخستن.
            </div>
          </div>
        </div>
      )}

      {/* ── Send Tab ─────────────────────────────────────────────── */}
      {selectedTab === "send" && (
        <div style={card}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}><Send size={16} /> ناردنی نامە بۆ شوفێر</h3>
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FormField label="شوفێر">
              <select style={{ ...inputStyle, cursor: "pointer" }} value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} required>
                <option value="">شوفێر هەڵبژێرە...</option>
                {drivers.filter(d => d.isActive && d.telegramChatId).map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.city}</option>
                ))}
              </select>
            </FormField>
            {drivers.filter(d => d.isActive && !d.telegramChatId).length > 0 && (
              <div style={{ fontSize: 12, color: "#ADB5BD", padding: "8px 12px", background: "#F8F9FA", borderRadius: 8 }}>
                ⚠️ {drivers.filter(d => d.isActive && !d.telegramChatId).length} شوفێر Chat ID ی نییە — بڕۆ بۆ شوفێرەکان بۆ کەشفکردن.
              </div>
            )}
            <FormField label="نامەکە">
              <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={4}
                value={message} onChange={e => setMessage(e.target.value)} placeholder="نامەکەت بنووسە..." required />
            </FormField>
            <button type="submit" disabled={sending || !settings.telegramBotToken}
              style={{ padding: "10px 20px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, opacity: sending || !settings.telegramBotToken ? 0.7 : 1 }}>
              {sending ? "ناردن..." : "📨 ناردنی نامە"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
