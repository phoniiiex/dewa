"use client";
import { useState, FormEvent, useEffect } from "react";
import { Bot, Send, Settings2, Zap, CheckCircle, XCircle, Truck, MessageSquare, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useData } from "@/lib/store";
import { FormField, FormGrid, inputStyle } from "@/components/ui/FormField";

interface TelegramConfig {
  botToken: string;
  botUsername: string;
  isActive: boolean;
  drivers: { name: string; chatId: string; phone: string }[];
  lastTest: string | null;
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
  const { deliveries, showToast } = useData();
  const [config, setConfig] = useState<TelegramConfig>(defaultConfig);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", chatId: "", phone: "" });
  const [selectedTab, setSelectedTab] = useState<"setup" | "drivers" | "send">("setup");

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

  const pendingDeliveries = deliveries.filter(d => d.status === "PENDING" || d.status === "IN_TRANSIT");

  const handleSendDeliveryNotif = () => {
    if (selectedDeliveryId === null || selectedDriverIdx === null) return;
    const del = deliveries.find(d => d.id === selectedDeliveryId);
    const driver = config.drivers[selectedDriverIdx];
    if (!del || !driver) return;
    const msg = `🚚 <b>گەیاندنی نوێ</b>\n\n📦 داواکاری: ${del.orderNumber}\n📍 شوێن: ${del.destination}\n📋 بەرهەمەکان: ${del.items}\n\nتکایە پشتڕاستبکەرەوە ✅`;
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
              <li>Chat ID یان پەیامێکی فۆروارد بکە بۆ <strong>@userinfobot</strong> بۆ وەرگرتنی Chat ID</li>
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
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #E9ECEF", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>زیادکردنی شۆفێر</h3>
            <form onSubmit={handleAddDriver}>
              <FormGrid>
                <FormField label="ناوی شۆفێر" required><input style={inputStyle} required value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} /></FormField>
                <FormField label="Chat ID" required><input style={{ ...inputStyle, fontFamily: "monospace" }} required value={newDriver.chatId} onChange={(e) => setNewDriver({ ...newDriver, chatId: e.target.value })} placeholder="123456789" /></FormField>
                <FormField label="ژمارەی مۆبایل"><input style={inputStyle} value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} placeholder="0770 000 0000" /></FormField>
              </FormGrid>
              <button type="submit" style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>زیادکردن</button>
            </form>
          </div>

          {config.drivers.length > 0 && (
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
                      {pendingDeliveries.map(d => (
                        <option key={d.id} value={d.id}>{d.orderNumber} — {d.destination}</option>
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
                      🚚 <strong>گەیاندنی نوێ</strong>{"\n\n"}
                      📦 داواکاری: {deliveries.find(d => d.id === selectedDeliveryId)?.orderNumber}{"\n"}
                      📍 شوێن: {deliveries.find(d => d.id === selectedDeliveryId)?.destination}{"\n"}
                      📋 بەرهەمەکان: {deliveries.find(d => d.id === selectedDeliveryId)?.items}{"\n\n"}
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
