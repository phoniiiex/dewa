"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  context?: string; // Optional business data string to inject
}

const SUGGESTIONS = [
  "کۆی فرۆشتنی ئەم مانگە چەندە؟",
  "کام نوێنەر باشترین ئەنجامی هەیە؟",
  "چەند داواکاری چاوەڕوانە هەیە؟",
  "کام کڕیار زیاترین داواکاری کردووە؟",
];

export default function AIAssistant({ context }: Props) {
  const [open, setOpen]           = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "سڵاو! 👋 من دەستیارتی زیرەکم. دەتوانم یارمەتیت بدەم لە شیکاری فرۆشتن، داواکارییەکان، کڕیاران، و نوێنەران. چی پرسیارت هەیە؟",
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || data.error || "هەڵە ڕووی دا.",
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "پەیوەندی نەکرا. دووبارەی هەوڵبدەوە." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, context]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const width  = maximized ? "min(900px, 95vw)" : "380px";
  const height = maximized ? "min(700px, 90vh)" : "520px";

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, left: 24, zIndex: 1000,
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #4263EB, #7C5CFC)",
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(66,99,235,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          title="دەستیاری زیرەک"
        >
          <Sparkles size={24} color="white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 24, left: 24, zIndex: 1000,
          width, height,
          background: "white",
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          border: "1px solid #E9ECEF",
        }}>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #4263EB, #7C5CFC)",
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={20} color="white" />
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>دەستیاری زیرەک</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#69FF94", display: "inline-block" }} />
                  Gemini AI · چالاک
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => { setMessages([]); }}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}
                title="نوێکردنەوە">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setMaximized(m => !m)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}>
                {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, background: "#F8F9FA" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end", alignItems: "flex-end", gap: 8 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bot size={14} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                  background: m.role === "user" ? "white" : "linear-gradient(135deg, #4263EB, #7C5CFC)",
                  color: m.role === "user" ? "#1A1A2E" : "white",
                  fontSize: 13,
                  lineHeight: 1.6,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  border: m.role === "user" ? "1px solid #E9ECEF" : "none",
                  whiteSpace: "pre-wrap",
                  direction: "rtl",
                  textAlign: "right",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{ padding: "12px 16px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.7)", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only at start) */}
          {messages.length <= 1 && !loading && (
            <div style={{ padding: "8px 14px", background: "#F8F9FA", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid #DEE2E6", background: "white", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#4263EB", fontWeight: 600, transition: "all .15s", direction: "rtl" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "#EDF2FF"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "white"); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #E9ECEF", background: "white", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="پرسیارێک بنووسە..."
              rows={1}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                border: "1.5px solid #DEE2E6", fontSize: 13,
                fontFamily: "inherit", resize: "none", outline: "none",
                direction: "rtl", lineHeight: 1.5, maxHeight: 100,
                transition: "border-color .2s",
              }}
              onFocus={e => (e.target.style.borderColor = "#4263EB")}
              onBlur={e => (e.target.style.borderColor = "#DEE2E6")}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 12, border: "none",
                background: input.trim() && !loading ? "linear-gradient(135deg, #4263EB, #7C5CFC)" : "#E9ECEF",
                color: input.trim() && !loading ? "white" : "#ADB5BD",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all .2s",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
