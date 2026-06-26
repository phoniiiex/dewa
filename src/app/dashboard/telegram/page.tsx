"use client";
import { useState, FormEvent, useEffect } from "react";
import { Bot, Send, Settings2, Zap, CheckCircle, XCircle, Truck, MessageSquare, ExternalLink, RefreshCw, UserPlus, Users, Radar } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, FormGrid, inputStyle } from "@/components/ui/FormField";

interface TelegramConfig {
  botToken: string;
  botUsername: string;
  isActive: boolean;
  drivers: { name: string; chatId: string; phone: string }[];
  lastTest: string | null;
}

interface DetectedUser {
  chatId: string;
  firstName: string;
  lastName: string;
  username: string;
}

const defaultConfig: TelegramConfig = {
  botToken: "",
  botUsername: "",
  isActive: false,
  drivers: [],
  lastTest: null,
};

function loadConfig(): TelegramConfig {
  if (typeof window === "undefined") return defaultConfig;
  try {
    const raw = localStorage.getItem("dewa_telegram");
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch { return defaultConfig; }
}

function saveConfig(config: TelegramConfig) {
  if (typeof window !== "undefined") localStorage.setItem("dewa_telegram", JSON.stringify(config));
}

export default function TelegramPage() {
  const { orders, showToast } = useData();
  const [config, setConfig] = useState<TelegramConfig>(defaultConfig);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", chatId: "", phone: "" });
  const [selectedTab, setSelectedTab] = useState<"setup" | "drivers" | "send">("setup");

  // Auto-detect state
  const [detectedUsers, setDetectedUsers] = useState<DetectedUser[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  useEffect(() => { setConfig(loadConfig()); }, []);

  const updateConfig = (partial: Partial<TelegramConfig>) => {
    const newConfig = { ...config, ...partial };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSaveToken = (e: FormEvent) => {
    e.preventDefault();
    saveConfig(config);
    showToast("تۆکنی بۆت پاشەکەوتکرا");
  };

  const handleTestBot = async () => {
    if (!config.botToken) { setTestResult("تکایە تۆکنی بۆت بنووسە"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`);
      const data = await res.json();
      if (data.ok) {
        updateConfig({ botUsername: data.result.username, isActive: true, lastTest: new Date().toLocaleString("ckb") });
        setTestResult(`✅ بۆت سەرکەوتوو بوو! ناو: @${data.result.username}`);
        showToast("بۆت سەرکەوتووانە پەیوەندی کرا");
      } else {
        setTestResult(`❌ هەڵە: ${data.description}`);
        updateConfig({ isActive: false });
      }
    } catch (err) {
      setTestResult("❌ هەڵەی تۆڕ — ناتوانرێ پەیوەندی بکرێت");
      updateConfig({ isActive: false });
    }
    setTesting(false);
  };

  // Fetch users who sent /start to the bot
  const handleDetectUsers = async () => {
    if (!config.botToken) { showToast("تکایە سەرەتا تۆکنی بۆت بنووسە", "error"); return; }
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?limit=100`);
      const data = await res.json();
      if (!data.ok) {
        setDetectError(`هەڵە: ${data.description}`);
        setDetecting(false);
        return;
      }

      // Extract unique users from messages
      const userMap = new Map<string, DetectedUser>();
      for (const update of data.result) {
        const msg = update.message;
        if (msg && msg.from && !msg.from.is_bot) {
          const chatId = String(msg.chat.id);
          if (!userMap.has(chatId)) {
            userMap.set(chatId, {
              chatId,
              firstName: msg.from.first_name || "",
              lastName: msg.from.last_name || "",
              username: msg.from.username || "",
            });
          }
        }
      }

      const users = Array.from(userMap.values());
      // Filter out users already added as drivers
      const existingChatIds = new Set(config.drivers.map(d => d.chatId));
      const newUsers = users.filter(u => !existingChatIds.has(u.chatId));
      setDetectedUsers(newUsers);

      if (users.length === 0) {
        setDetectError("هیچ بەکارهێنەرێک نەدۆزرایەوە. دڵنیابە شۆفێران /start ناردووە بۆ بۆتەکە.");
      } else if (newUsers.length === 0) {
        setDetectError(`${users.length} بەکارهێنەر دۆزرایەوە بەڵام هەموویان پێشتر زیادکراون.`);
      }
    } catch {
      setDetectError("هەڵەی تۆڕ — ناتوانرێ پەیوەندی بکرێت بە تێلێگرام");
    }
    setDetecting(false);
  };

  const handleAddDetectedUser = (user: DetectedUser) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `User ${user.chatId}`;
    updateConfig({ drivers: [...config.drivers, { name, chatId: user.chatId, phone: "" }] });
    setDetectedUsers(prev => prev.filter(u => u.chatId !== user.chatId));
    showToast(`${name} وەک شۆفێر زیادکرا ✅`);
  };

  const handleAddAllDetected = () => {
    const newDrivers = detectedUsers.map(user => ({
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `User ${user.chatId}`,
      chatId: user.chatId,
      phone: "",
    }));
    updateConfig({ drivers: [...config.drivers, ...newDrivers] });
    showToast(`${newDrivers.length} شۆفێر زیادکران ✅`);
    setDetectedUsers([]);
  };

  const handleAddDriver = (e: FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.chatId) return;
    updateConfig({ drivers: [...config.drivers, { ...newDriver }] });
    setNewDriver({ name: "", chatId: "", phone: "" });
    showToast("شۆفێر زیادکرا");
  };

  const handleRemoveDriver = (idx: number) => {
    updateConfig({ drivers: config.drivers.filter((_, i) => i !== idx) });
    showToast("شۆفێر سڕایەوە");
  };

  const handleSendToDriver = async (chatId: string, message: string) => {
    if (!config.botToken || !chatId) { showToast("تۆکن یان Chat ID نییە", "error"); return; }
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });
      const data = await res.json();
      if (data.ok) { showToast("نامە نێردرا ✅"); }
      else { showToast(`هەڵە: ${data.description}`, "error"); }
    } catch { showToast("هەڵەی تۆڕ", "error"); }
  };

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedDriverIdx, setSelectedDriverIdx] = useState<number | null>(null);

  const pendingDeliveries = orders.filter(o => o.status === "SENT" || o.status === "READY");

  const handleSendDeliveryNotif = () => {
    if (selectedDeliveryId === null || selectedDriverIdx === null) return;
    const order = orders.find(o => o.id === selectedDeliveryId);
    const driver = config.drivers[selectedDriverIdx];
    if (!order || !driver) return;
    const itemsSummary = order.items.map(i => `${i.productName} x${i.quantity}`).join("، ");
    const msg = `🚚 <b>داواکاری نێردرا</b>\n\n📦 داواکاری: ${order.orderNumber}\n🏪 کڕیار: ${order.clientName}\n📋 بەرهەمەکان: ${itemsSummary}\n\nتکایە پشتڕاستبکەرەوە ✅`;
    handleSendToDriver(driver.chatId, msg);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "#EDF2FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}><Bot size={20} /></div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>بۆتی تێلێگرام — شۆفێران</h1>
          <p style={{ fontSize: 13, color: "#6C757D" }}>ناردنی ئاگاداری گەیاندن بۆ شۆفێران لە ڕێگەی تێلێگرامەوە</p>
        </div>
        {config.isActive && (
          <span style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 8, background: "#D3F9D8", color: "#2B8A3E", fontSize: 12, fontWeight: 700 }}>
            <CheckCircle size={14} /> چالاک
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F3F5", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([
          { key: "setup", label: "ڕێکخستن", icon: <Settings2 size={14} /> },
          { key: "drivers", label: "شۆفێران", icon: <Truck size={14} /> },
          { key: "send", label: "ناردنی نامە", icon: <Send size={14} /> },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setSelectedTab(tab.key)} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: selectedTab === tab.key ? "white" : "transparent",
            color: selectedTab === tab.key ? "#1A1A2E" : "#6C757D",
            boxShadow: selectedTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* Setup Tab */}
      {selectedTab === "setup" && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Zap size={16} color="#F47B35" /> چۆن بۆت دروست دەکەیت؟</h3>
            <ol style={{ fontSize: 13, color: "#6C757D", paddingRight: 20, lineHeight: 2 }}>
              <li>لە تێلێگرام بگەڕێ بۆ <strong>@BotFather</strong></li>
              <li>بنووسە <code>/newbot</code> و ناوێکی بدە</li>
              <li>تۆکنی بۆتەکە کۆپی بکە و لێرە بیلکێنە</li>
              <li>شۆفێران دەبێ <code>/start</code> بنووسن بۆ بۆتەکەت</li>
              <li>لە تابی <strong>شۆفێران</strong> کلیک بکە لەسەر <strong>"دۆزینەوەی بەکارهێنەران"</strong> بۆ بینینی ئەوانەی /start ناردووە</li>
            </ol>
          </div>

          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>تۆکنی بۆت</h3>
            <form onSubmit={handleSaveToken}>
              <FormField label="Bot Token">
                <input style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }} placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz..." value={config.botToken} onChange={(e) => updateConfig({ botToken: e.target.value })} />
              </FormField>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="submit" style={{ padding: "10px 24px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>پاشەکەوتکردن</button>
                <button type="button" onClick={handleTestBot} disabled={testing} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D", display: "flex", alignItems: "center", gap: 6 }}>
                  {testing ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={14} />} تاقیکردنەوە
                </button>
              </div>
            </form>
            {testResult && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: testResult.startsWith("✅") ? "#D3F9D8" : "#FFE3E3", fontSize: 13, fontWeight: 600, color: testResult.startsWith("✅") ? "#2B8A3E" : "#C92A2A" }}>{testResult}</div>
            )}
            {config.botUsername && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#6C757D" }}>بۆت: <a href={`https://t.me/${config.botUsername}`} target="_blank" style={{ color: "#4263EB", fontWeight: 600 }}>@{config.botUsername} <ExternalLink size={12} style={{ display: "inline" }} /></a></div>
            )}
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {selectedTab === "drivers" && (
        <div style={{ maxWidth: 700 }}>
          {/* Auto-Detect Section */}
          <div style={{ background: "linear-gradient(135deg, #EDF2FF, #F3F0FF)", borderRadius: 14, padding: 28, border: "1px solid #D0BFFF", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Radar size={18} color="#7C5CFC" /> دۆزینەوەی بەکارهێنەران</h3>
                <p style={{ fontSize: 12, color: "#6C757D" }}>ئەو کەسانەی /start ناردووە بۆ بۆتەکەت بینین و زیادکردنیان وەک شۆفێر</p>
              </div>
              <button onClick={handleDetectUsers} disabled={detecting || !config.botToken} style={{
                padding: "10px 20px", borderRadius: 10, background: detecting ? "#ADB5BD" : "linear-gradient(135deg, #7C5CFC, #4263EB)",
                color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: detecting ? "default" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(66,99,235,0.3)",
              }}>
                {detecting ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Radar size={14} />}
                {detecting ? "گەڕان..." : "سکان بکە"}
              </button>
            </div>

            {!config.botToken && (
              <div style={{ padding: 12, borderRadius: 8, background: "#FFF3BF", fontSize: 12, color: "#E67700", fontWeight: 600 }}>
                ⚠️ تکایە سەرەتا تۆکنی بۆت بنووسە لە تابی ڕێکخستن
              </div>
            )}

            {detectError && (
              <div style={{ padding: 12, borderRadius: 8, background: "#FFF8DB", fontSize: 13, color: "#E67700", fontWeight: 500, marginTop: 8 }}>
                {detectError}
              </div>
            )}

            {detectedUsers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#495057" }}>{detectedUsers.length} بەکارهێنەری نوێ دۆزرایەوە</span>
                  <button onClick={handleAddAllDetected} style={{
                    padding: "6px 16px", borderRadius: 8, background: "#40C057", color: "white",
                    fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 4,
                  }}><Users size={12} /> هەمووی زیاد بکە</button>
                </div>
                {detectedUsers.map(user => (
                  <div key={user.chatId} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", background: "white", borderRadius: 10, marginBottom: 8,
                    border: "1px solid #E9ECEF", transition: "all 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16 }}>
                        {user.firstName?.[0] || user.username?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || "بێناو"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6C757D", display: "flex", gap: 8 }}>
                          {user.username && <span>@{user.username}</span>}
                          <span style={{ fontFamily: "monospace", color: "#ADB5BD" }}>ID: {user.chatId}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleAddDetectedUser(user)} style={{
                      padding: "8px 16px", borderRadius: 8, background: "#4263EB", color: "white",
                      fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 4,
                    }}><UserPlus size={14} /> زیادکردن</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Add */}
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>زیادکردنی دەستی</h3>
            <form onSubmit={handleAddDriver}>
              <FormGrid>
                <FormField label="ناوی شۆفێر" required><input style={inputStyle} required value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} /></FormField>
                <FormField label="Chat ID" required><input style={{ ...inputStyle, fontFamily: "monospace" }} required value={newDriver.chatId} onChange={(e) => setNewDriver({ ...newDriver, chatId: e.target.value })} placeholder="123456789" /></FormField>
                <FormField label="ژمارەی مۆبایل"><input style={inputStyle} value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} placeholder="0770 000 0000" /></FormField>
              </FormGrid>
              <button type="submit" style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>زیادکردن</button>
            </form>
          </div>

          {/* Existing Drivers */}
          {config.drivers.length > 0 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Truck size={16} /> شۆفێرانی تۆمارکراو ({config.drivers.length})</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>ناو</th><th>Chat ID</th><th>مۆبایل</th><th>تاقی</th><th></th></tr></thead>
                  <tbody>
                    {config.drivers.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12, color: "#6C757D" }}>{d.chatId}</td>
                        <td style={{ fontSize: 13, color: "#6C757D" }}>{d.phone || "—"}</td>
                        <td>
                          <button onClick={() => handleSendToDriver(d.chatId, `👋 سڵاو ${d.name}!\nئەمە نامەیەکی تاقیکردنەوەیە لە دەوا سیستەم.`)} style={{ padding: "4px 12px", borderRadius: 6, background: "#EDF2FF", color: "#4263EB", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>نامەی تاقی</button>
                        </td>
                        <td>
                          <button onClick={() => handleRemoveDriver(i)} style={{ padding: 4, color: "#FA5252", background: "none", border: "none", cursor: "pointer" }}><XCircle size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Tab */}
      {selectedTab === "send" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} color="#4263EB" /> ناردنی ئاگاداری گەیاندن</h3>

            {!config.isActive ? (
              <div style={{ padding: 24, textAlign: "center", color: "#ADB5BD" }}>
                <Bot size={40} color="#DEE2E6" />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>تکایە سەرەتا بۆتەکەت ڕێکبخە</p>
              </div>
            ) : config.drivers.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#ADB5BD" }}>
                <Truck size={40} color="#DEE2E6" />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>تکایە سەرەتا شۆفێرێک زیاد بکە</p>
              </div>
            ) : (
              <>
                <FormGrid>
                  <FormField label="گەیاندن">
                    <select style={inputStyle} value={selectedDeliveryId || ""} onChange={(e) => setSelectedDeliveryId(e.target.value || null)}>
                      <option value="">— هەڵبژێرە —</option>
                      {pendingDeliveries.map(o => (
                        <option key={o.id} value={o.id}>{o.orderNumber} — {o.clientName}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="شۆفێر">
                    <select style={inputStyle} value={selectedDriverIdx ?? ""} onChange={(e) => setSelectedDriverIdx(e.target.value !== "" ? Number(e.target.value) : null)}>
                      <option value="">— هەڵبژێرە —</option>
                      {config.drivers.map((d, i) => (
                        <option key={i} value={i}>{d.name}</option>
                      ))}
                    </select>
                  </FormField>
                </FormGrid>

                {selectedDeliveryId && selectedDriverIdx !== null && (
                  <div style={{ marginTop: 16, padding: 16, background: "#F8F9FA", borderRadius: 10, border: "1px solid #E9ECEF" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D", marginBottom: 8 }}>پیشاندانی نامە</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                      🚚 <strong>داواکاری نێردرا</strong>{"\n\n"}
                      📦 داواکاری: {orders.find(o => o.id === selectedDeliveryId)?.orderNumber}{"\n"}
                      🏪 کڕیار: {orders.find(o => o.id === selectedDeliveryId)?.clientName}{"\n"}
                      📋 بەرهەمەکان: {orders.find(o => o.id === selectedDeliveryId)?.items.map(i => `${i.productName} x${i.quantity}`).join("، ")}{"\n\n"}
                      تکایە پشتڕاستبکەرەوە ✅
                    </div>
                  </div>
                )}

                <button onClick={handleSendDeliveryNotif} disabled={!selectedDeliveryId || selectedDriverIdx === null} style={{
                  marginTop: 20, padding: "10px 28px", borderRadius: 8, background: selectedDeliveryId && selectedDriverIdx !== null ? "#4263EB" : "#DEE2E6",
                  color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: selectedDeliveryId && selectedDriverIdx !== null ? "pointer" : "default",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                }}><Send size={14} /> ناردنی ئاگاداری</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
