"use client";
import { useState, FormEvent } from "react";
import { Bot, Send, Settings2, CheckCircle, RefreshCw, Bell, BellOff, UserCheck } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, inputStyle } from "@/components/ui/FormField";
import { testTelegramBot, sendTelegramMessage, getTelegramUpdates } from "@/lib/telegram";

type TelegramUser = { chatId: string; firstName: string; lastName: string; username: string };

export default function TelegramPage() {
  const { drivers, settings, updateSettings, showToast } = useData();

  const [tokenInput, setTokenInput]   = useState(settings.telegramBotToken || "");
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"setup" | "notify" | "send">("setup");

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

          {/* Webhook info */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>🔗 Webhook</h3>
            <div style={{ fontSize: 13, color: "#6C757D", lineHeight: 1.8 }}>
              <p>بۆ وەرگرتنی پەیامەکانی شوفێر پێویستە Webhook ڕێکبخەیت. URL ی Webhook:</p>
              <code style={{ display: "block", padding: "8px 12px", background: "#F8F9FA", borderRadius: 8, fontSize: 12, color: "#495057", marginTop: 8, wordBreak: "break-all" }}>
                {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/telegram-webhook
              </code>
              <p style={{ marginTop: 10 }}>ئەم URL ەی لەڕووپەلی <strong>@BotFather</strong> بنووسە یان ئەم کۆمەندە لە Browser Console بکە:</p>
              <code style={{ display: "block", padding: "8px 12px", background: "#F1F3F5", borderRadius: 8, fontSize: 11, marginTop: 6, wordBreak: "break-all", color: "#495057" }}>
                {`fetch('https://api.telegram.org/bot${settings.telegramBotToken || "TOKEN"}/setWebhook?url=${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/telegram-webhook')`}
              </code>
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
