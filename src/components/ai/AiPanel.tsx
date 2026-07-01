"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, Paperclip, Send, Sparkles, ChevronDown } from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: { name: string; result: unknown }[];
  loading?: boolean;
}

// ── Quick action chips (empty state) ──────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: "📦", label: "داواکاری نوێ", prompt: "داواکاری نوێ بدرێزەوە" },
  { icon: "📊", label: "ئاماری ئەمڕۆ", prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { icon: "📋", label: "داواکارییەکان", prompt: "داواکارییە دواییەکانم پیشان بدە" },
  { icon: "🏷️", label: "بەرهەمەکان", prompt: "لیستی بەرهەمەکانم نیشان بدە" },
  { icon: "⚠️", label: "ستۆکی کەم", prompt: "بەرهەمە کەم‌ستۆکەکانم پیشان بدە" },
];

// ── Tool result card ───────────────────────────────────────────────────────
function ToolResultCard({ name, result }: { name: string; result: unknown }) {
  const data = result as Record<string, unknown>;
  if (data?.error) return null;

  const toolLabels: Record<string, string> = {
    list_orders: "داواکارییەکان",
    list_products: "بەرهەمەکان",
    list_clients: "کڕیارەکان",
    get_dashboard_stats: "ئامار",
    create_order: "داواکاری نوێ",
    update_order_status: "نوێکردنەوەی بارودۆخ",
    find_client_by_name: "کڕیار",
    find_product_by_name: "بەرهەم",
  };

  const label = toolLabels[name] || name;
  const isSuccess = data?.success;
  const isArray = Array.isArray(result);

  return (
    <div style={{
      background: "#F8FAFF",
      border: "1px solid #E0E7FF",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 8,
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: "#4263EB", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, background: "#EDF2FF", padding: "2px 6px", borderRadius: 4 }}>
          {label}
        </span>
        {isSuccess && <span style={{ color: "#2F9E44", fontSize: 11 }}>✓ موفەقبوو</span>}
      </div>
      {isSuccess && data.orderNumber && (
        <div style={{ color: "#374151", fontWeight: 600 }}>#{data.orderNumber as string}</div>
      )}
      {isArray && (result as unknown[]).length > 0 && (
        <div style={{ color: "#6B7280" }}>
          {(result as unknown[]).length} خشتە دۆزرایەوە
        </div>
      )}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (msg.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
        <div style={{
          background: "white",
          border: "1px solid #E5E7EB",
          borderRadius: "18px 18px 18px 4px",
          padding: "12px 16px",
          maxWidth: "80%",
        }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#9CA3AF",
                animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16 }}>
      <div style={{ maxWidth: "85%" }}>
        {msg.toolResults && msg.toolResults.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            {msg.toolResults.map((tr, i) => (
              <ToolResultCard key={i} name={tr.name} result={tr.result} />
            ))}
          </div>
        )}
        <div style={{
          background: isUser ? "#4263EB" : "white",
          color: isUser ? "white" : "#111827",
          border: isUser ? "none" : "1px solid #E5E7EB",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          boxShadow: isUser ? "0 2px 8px rgba(66,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.06)",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export default function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useLayout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName = currentUser?.name?.split(" ")[0] || "بەکارهێنەر";
  const hasMessages = messages.length > 0;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };
    const loadingMsg: Message = {
      id: Date.now().toString() + "-loading",
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Build history (exclude loading msg)
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: Date.now().toString() + "-ai",
        role: "assistant",
        content: res.status === 429
          ? "⏳ کوتای ئێستا داموچینراوە. تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە."
          : data.text || data.error || "کێشەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.",
        toolResults: data.toolResults || [],
      };

      setMessages(prev => [...prev.filter(m => !m.loading), aiMsg]);
    } catch {
      setMessages(prev => [...prev.filter(m => !m.loading), {
        id: Date.now().toString() + "-err",
        role: "assistant",
        content: "کێشەیەک ڕوویدا لە پەیوەندی بە سێرڤەرەوە. تکایە دووبارە هەوڵ بدەرەوە.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 9998, backdropFilter: "blur(2px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, bottom: 0, right: 0,
        width: 440, zIndex: 9999,
        background: "white",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        animation: "slideInRight 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: hasMessages ? "1px solid #F3F4F6" : "none",
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #1a1a1a, #3a3a3a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: "none", background: "#F3F4F6",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6B7280", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#E5E7EB")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F3F4F6")}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!hasMessages ? (
            /* Welcome / Empty state */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", padding: "32px 24px",
            }}>
              {/* Large logo */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #1a1a1a, #3a3a3a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                marginBottom: 20,
              }}>
                <Sparkles size={32} color="white" />
              </div>

              <p style={{ fontSize: 16, color: "#6B7280", margin: 0, textAlign: "center" }}>
                بەخێربێیتەوە، {firstName}
              </p>
              <h2 style={{
                fontSize: 22, fontWeight: 700, color: "#111827",
                margin: "8px 0 10px", textAlign: "center", lineHeight: 1.4,
              }}>
                چۆن یارمەتیت بدەم؟
              </h2>
              <p style={{
                fontSize: 14, color: "#9CA3AF", textAlign: "center",
                margin: "0 0 32px", lineHeight: 1.6,
              }}>
                ئێمەم ئامادەیین بۆ ئەنجامدانی ئەرکەکانت.
                داواکاری دروست بکە، بەرهەم زیاد بکە، و زۆری تر!
              </p>

              {/* Quick action chips */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center", width: "100%",
              }}>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 20,
                      border: "1px solid #E5E7EB", background: "white",
                      fontSize: 13, fontWeight: 500, color: "#374151",
                      cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#EEF2FF";
                      e.currentTarget.style.borderColor = "#C7D2FE";
                      e.currentTarget.style.color = "#4263EB";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.color = "#374151";
                    }}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages list */
            <div style={{ flex: 1, padding: "16px 20px" }}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div style={{
          flexShrink: 0,
          background: "#FAFAFA",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          margin: "0 12px 12px",
          overflow: "hidden",
        }}>
          {/* Textarea */}
          <div style={{ position: "relative", padding: "12px 14px 6px" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="هەر شتێک بپرسە..."
              rows={1}
              disabled={loading}
              style={{
                width: "100%", border: "none", background: "transparent",
                resize: "none", outline: "none", fontSize: 15,
                color: "#111827", fontFamily: "inherit", lineHeight: 1.6,
                minHeight: 40,
                caretColor: "#4263EB",
              }}
            />
            {/* Mic icon top-right */}
            <button style={{
              position: "absolute", top: 10, left: 10,
              width: 28, height: 28, borderRadius: 6,
              border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#9CA3AF",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
            >
              <Mic size={15} />
            </button>
          </div>

          {/* Bottom toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 12px 8px",
          }}>
            {/* Left: avatar + model selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "linear-gradient(135deg, #4263EB, #7C5CFC)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "white",
                flexShrink: 0,
              }}>
                {firstName[0] || "?"}
              </div>
              <button style={{
                display: "flex", alignItems: "center", gap: 3,
                border: "none", background: "transparent",
                fontSize: 12, fontWeight: 600, color: "#6B7280",
                cursor: "pointer", fontFamily: "inherit",
                padding: "2px 4px", borderRadius: 4,
              }}>
                <span>{firstName}</span>
                <ChevronDown size={11} />
              </button>
            </div>

            {/* Right: shortcuts + attach + send */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button style={iconBtnStyle} title="Attach">
                <Paperclip size={14} />
              </button>

              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: "1px solid",
                  borderColor: input.trim() && !loading ? "#4263EB" : "#E5E7EB",
                  background: input.trim() && !loading ? "#4263EB" : "white",
                  color: input.trim() && !loading ? "white" : "#9CA3AF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: "none", background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#6B7280",
  transition: "color 0.15s, background 0.15s",
};
