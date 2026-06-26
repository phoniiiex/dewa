"use client";
import { useState, FormEvent } from "react";
import { Bot, Send, Settings2, CheckCircle, XCircle } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, inputStyle } from "@/components/ui/FormField";
import { testTelegramBot, sendTelegramMessage } from "@/lib/telegram";

export default function TelegramPage() {
  const { orders, drivers, settings, updateSettings, showToast } = useData();

  const [tokenInput, setTokenInput] = useState(settings.telegramBotToken || "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"setup" | "send">("setup");

  // Send tab
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const pendingOrders = orders.filter(o => o.status === "SENT" || o.status === "READY");

  const handleSaveToken = async (e: FormEvent) => {
    e.preventDefault();
    await updateSettings({ telegramBotToken: tokenInput.trim(), telegramBotUsername: settings.telegramBotUsername });
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

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Bot size={20} /></div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>بۆتی تێلێگرام</h1>
          <p style={{ fontSize: 13, color: "#6C757D" }}>ڕێکخستنی بۆت و ناردنی ئاگاداری بۆ شوفێران</p>
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
          { key: "setup", label: "ڕێکخستن", icon: <Settings2 size={14} /> },
          { key: "send",  label: "ناردنی نامە", icon: <Send size={14} /> },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: selectedTab === tab.key ? "#fff" : "transparent", color: selectedTab === tab.key ? "#4263EB" : "#6C757D", boxShadow: selectedTab === tab.key ? "0 1px 3px rgba(0,0,0,.1)" : "none", transition: "all .15s" }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Setup Tab */}
      {selectedTab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, color: "#212529", display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={16} /> تۆکنی بۆت
            </h3>
            <form onSubmit={handleSaveToken} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Bot Token">
                <input
                  style={inputStyle}
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
                  dir="ltr"
                  type="password"
                />
              </FormField>
              <div style={{ fontSize: 12, color: "#6C757D", padding: "8px 12px", background: "#F8F9FA", borderRadius: 8 }}>
                💡 تۆکن لە @BotFather وەرگرە. ئەم زانیارییە لە داتابەیس پاشەکەوت دەبێت — هەموو ئەکاونتەکان هاوبەش بەکارییدەهێنن.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={handleTestBot} disabled={testing}
                  style={{ padding: "9px 18px", background: "#EDF2FF", color: "#4263EB", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, opacity: testing ? 0.7 : 1 }}>
                  {testing ? "تاقیکردن..." : "🔌 تاقیکردن"}
                </button>
                <button type="submit"
                  style={{ padding: "9px 18px", background: "#4263EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
                  پاشەکەوتکردن
                </button>
              </div>
              {testResult && (
                <div style={{ padding: "10px 14px", background: testResult.startsWith("✅") ? "#D1FAE5" : "#FEE2E2", color: testResult.startsWith("✅") ? "#059669" : "#DC2626", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                  {testResult}
                </div>
              )}
            </form>
          </div>

          {/* Status card */}
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, color: "#212529" }}>📊 بارودۆخی بۆت</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "بارودۆخ", value: settings.telegramBotToken ? "✅ چالاک" : "❌ ناچالاک", color: settings.telegramBotToken ? "#059669" : "#DC2626" },
                { label: "ناوی بۆت", value: settings.telegramBotUsername ? `@${settings.telegramBotUsername}` : "—", color: "#495057" },
                { label: "شوفێران پەیوەندیکراو", value: String(drivers.filter(d => d.telegramChatId).length), color: "#7C3AED" },
                { label: "داواکاریی لەڕێگادا", value: String(pendingOrders.length), color: "#D97706" },
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

      {/* Send Tab */}
      {selectedTab === "send" && (
        <div style={card}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, color: "#212529", display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={16} /> ناردنی نامە بۆ شوفێر
          </h3>
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
                ⚠️ {drivers.filter(d => d.isActive && !d.telegramChatId).length} شوفێر Chat ID ی نییە — لە لیستەوە دەرکراون. بڕۆ بۆ ڕووپەلی شوفێرەکان بۆ کەشفکردن.
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
            {!settings.telegramBotToken && (
              <div style={{ fontSize: 12, color: "#DC2626" }}>⚠️ تۆکنی بۆت ڕێکنەخستراوە — سەرەتا بڕۆ بۆ تابی ڕێکخستن</div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
