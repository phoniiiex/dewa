"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Mic, Paperclip, Send, ChevronDown, Sparkles,
  Package, TrendingUp, ClipboardList, AlertTriangle,
  BarChart4, Plus, Users, DollarSign, Search, ShoppingCart,
  Keyboard, ChevronRight, CheckCircle2, Building2, User, MapPin, Trash2,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: { name: string; result: unknown }[];
  loading?: boolean;
}

// ── Quick-action chips ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { Icon: Package,       label: "داواکاری نوێ",   prompt: "داواکاری نوێ بدرێزەوە" },
  { Icon: TrendingUp,    label: "ئاماری ئەمڕۆ",  prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { Icon: ClipboardList, label: "داواکارییەکان",  prompt: "داواکارییە دواییەکانم پیشان بدە" },
  { Icon: BarChart4,     label: "بەرهەمەکان",     prompt: "لیستی بەرهەمەکانم نیشان بدە" },
  { Icon: AlertTriangle, label: "ستۆکی کەم",     prompt: "بەرهەمە کەم‌ستۆکەکانم پیشان بدە" },
  { Icon: Sparkles,      label: "زیاتر",          prompt: "چی دەتوانم بکەم؟" },
];

// ── Commands list (replaces "Shortcuts") ──────────────────────────────────────
const COMMANDS = [
  { Icon: Plus,          color: "#7f56d9", label: "داواکاری نوێ زیاد بکە",    prompt: "داواکاری نوێ بدرێزەوە" },
  { Icon: ShoppingCart,  color: "#0284c7", label: "بەرهەمی نوێ زیاد بکە",     prompt: "بەرهەمی نوێ زیادبکە" },
  { Icon: BarChart4,     color: "#0d9488", label: "داتا شی بکەوە",             prompt: "ئاماری کاری ئەمڕۆم شی بکەرەوە" },
  { Icon: TrendingUp,    color: "#16a34a", label: "ئاماری ئەمڕۆ",             prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { Icon: ClipboardList, color: "#ea580c", label: "داواکارییە دواییەکان",     prompt: "داواکارییە دواییەکانم پیشان بدە" },
  { Icon: AlertTriangle, color: "#dc2626", label: "بەرهەمە کەم‌ستۆکەکان",   prompt: "بەرهەمە کەم‌ستۆکەکانم پیشان بدە" },
  { Icon: Users,         color: "#9333ea", label: "لیستی کڕیارەکان",          prompt: "لیستی کڕیارەکانم نیشان بدە" },
  { Icon: DollarSign,    color: "#0891b2", label: "داهاتی ئەم مانگە",         prompt: "داهاتی ئەم مانگەم پیشان بدە" },
  { Icon: Search,        color: "#64748b", label: "گەڕان بە ناوی کڕیار",      prompt: "کڕیارێک بگەڕێ بە ناوی" },
];

// ── Commands Popover (matches reference design exactly) ───────────────────────
function CommandsPopover({ onClose, onCommand }: { onClose: () => void; onCommand: (p: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute", bottom: "calc(100% + 8px)", right: 0,
        width: 292, background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12, zIndex: 50,
        boxShadow: "0px 8px 24px -4px rgba(0,0,0,0.12), 0px 2px 8px -2px rgba(0,0,0,0.06)",
        animation: "cmdPopIn 0.15s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "12px 14px 10px",
        borderBottom: "1px solid #f0f0f0",
      }}>
        <Keyboard size={14} color="#a3a3a3" strokeWidth={1.5} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#171717", letterSpacing: "-0.01em" }}>
          Commands
        </span>
      </div>

      {/* Command list */}
      <div style={{ padding: "8px 10px" }}>
        {COMMANDS.map(({ Icon, color, label, prompt }) => (
          <button
            key={label}
            onClick={() => { onCommand(prompt); onClose(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "6px 4px",
              borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", fontFamily: "Inter, sans-serif",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: color + "14",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={12} color={color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 12, color: "#525252", fontWeight: 500 }}>{label}</span>
            </div>
            <ChevronRight size={12} color="#d4d4d4" strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{ padding: "4px 14px 10px", borderTop: "1px solid #f0f0f0" }}>
        <p style={{ fontSize: 11, color: "#a3a3a3", margin: 0 }}>
          کلیک بکە بۆ ناردنی فەرمانەکە.
        </p>
      </div>
    </div>
  );
}

// ── Palantir logo ─────────────────────────────────────────────────────────────
function AiLogo({ size = 56 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: "#0a0a0a",
      borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0px 12px 16px -4px rgba(0,0,0,0.08), 0px 4px 6px -2px rgba(0,0,0,0.03), 0px 2px 2px -1px rgba(0,0,0,0.04)",
      flexShrink: 0, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.1) 0%, transparent 60%)",
      }} />
      <Sparkles size={size === 56 ? 22 : 16} color="white" strokeWidth={1.5} />
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ Icon, label, onClick }: { Icon: React.ElementType; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        paddingLeft: 8, paddingRight: 10, paddingTop: 4, paddingBottom: 4,
        background: hovered ? "#fafafa" : "white",
        border: "1px solid #d4d4d4",
        borderRadius: 8,
        boxShadow: "0px 1px 1px rgba(0,0,0,0.05)",
        cursor: "pointer", transition: "background 0.12s",
        fontFamily: "Inter, system-ui, sans-serif", flexShrink: 0,
      }}
    >
      <Icon size={12} color="#404040" strokeWidth={2} />
      <span style={{ fontSize: 14, fontWeight: 500, color: "#404040", whiteSpace: "nowrap", lineHeight: "20px" }}>
        {label}
      </span>
    </button>
  );
}

// ── Tool result pill ──────────────────────────────────────────────────────────
function ToolCard({ name }: { name: string }) {
  const labels: Record<string, string> = {
    list_orders: "داواکارییەکان", list_products: "بەرهەمەکان",
    list_clients: "کڕیارەکان", get_dashboard_stats: "ئاماری ئەمڕۆ",
    create_order: "داواکاری دروستکرا", update_order_status: "بارودۆخ نوێکرایەوە",
    find_client_by_name: "کڕیار", find_product_by_name: "بەرهەم",
  };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#f0fdf4", border: "1px solid #bbf7d0",
      borderRadius: 6, padding: "3px 8px",
      fontSize: 11, color: "#15803d", fontWeight: 500, marginBottom: 4,
    }}>
      <span>✓</span><span>{labels[name] || name}</span>
    </div>
  );
}

// ── Order confirmation card ────────────────────────────────────────────────────
interface OrderResult {
  success: boolean;
  orderNumber: string;
  clientName?: string;
  repName?: string;
  warehouseName?: string;
  status?: string;
  totalAmount: number;
  items?: { productName: string; quantity: number; unitPrice: number; total: number }[];
}

function OrderCard({ order }: { order: OrderResult }) {
  const fmt = (n: number) => n.toLocaleString("en") + " دینار";
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      border: "1px solid #86efac",
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 8,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        padding: "12px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} color="white" strokeWidth={2.5} />
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>داواکاری دروستکرا</span>
        </div>
        <span style={{
          background: "rgba(255,255,255,0.2)",
          color: "white", fontSize: 12, fontWeight: 700,
          padding: "3px 10px", borderRadius: 20,
          letterSpacing: "0.03em",
        }}>{order.orderNumber}</span>
      </div>

      {/* Meta info */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
        {order.clientName && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#166534" }}>
            <Building2 size={12} strokeWidth={2} />
            <span style={{ fontWeight: 600 }}>{order.clientName}</span>
          </div>
        )}
        {order.repName && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803d" }}>
            <User size={12} strokeWidth={2} />
            <span>{order.repName}</span>
          </div>
        )}
        {order.warehouseName && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803d" }}>
            <MapPin size={12} strokeWidth={2} />
            <span>{order.warehouseName}</span>
          </div>
        )}
      </div>

      {/* Items table */}
      {order.items && order.items.length > 0 && (
        <div style={{ margin: "0 12px 10px", borderRadius: 8, overflow: "hidden", border: "1px solid #bbf7d0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#dcfce7" }}>
                <th style={{ textAlign: "left", padding: "5px 8px", color: "#166534", fontWeight: 600 }}>کاڵا</th>
                <th style={{ textAlign: "center", padding: "5px 8px", color: "#166534", fontWeight: 600, whiteSpace: "nowrap" }}>ژمارە</th>
                <th style={{ textAlign: "right", padding: "5px 8px", color: "#166534", fontWeight: 600, whiteSpace: "nowrap" }}>کۆی گشتی</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#f0fdf4", borderTop: "1px solid #dcfce7" }}>
                  <td style={{ padding: "5px 8px", color: "#1a1a1a", fontWeight: 500 }}>{item.productName}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center", color: "#374151" }}>×{item.quantity}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: "#166534", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      <div style={{
        margin: "0 12px 12px",
        background: "white", borderRadius: 8, border: "1px solid #86efac",
        padding: "8px 12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>کۆی گشتی</span>
        <span style={{ fontSize: 15, color: "#15803d", fontWeight: 800 }}>{fmt(order.totalAmount)}</span>
      </div>
    </div>
  );
}

// ── Typing indicator (reference style) ───────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{
      background: "#fafafa",
      border: "1px solid #e5e5e5",
      borderRadius: "0 8px 8px 8px", // top-left flat = bot bubble
      display: "inline-block",
    }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i === 1 ? "#a3a3a3" : "#525252",
            animation: `dotsAnim 1s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Message bubble (matches reference) ───────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const orderResult = msg.toolResults?.find(t => t.name === "create_order" && (t.result as OrderResult)?.success)
    ? (msg.toolResults!.find(t => t.name === "create_order")!.result as OrderResult)
    : null;

  if (msg.loading) {
    return (
      <div style={{ width: "100%", maxWidth: 312, marginBottom: 24 }}>
        <LoadingDots />
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      width: "100%", marginBottom: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Tool pills (skip create_order pill when showing card) */}
        {!isUser && msg.toolResults && msg.toolResults.length > 0 && (
          <div style={{ marginBottom: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {msg.toolResults
              .filter(t => !orderResult || t.name !== "create_order")
              .map((tr, i) => <ToolCard key={i} name={tr.name} />)}
          </div>
        )}
        {/* Bubble — reference style */}
        <div style={{
          position: "relative",
          background: isUser ? "white" : "#fafafa",
          border: "1px solid #e5e5e5",
          borderRadius: isUser ? "8px 8px 8px 8px" : "0 8px 8px 8px",
          width: "100%",
        }}>
          <div style={{ padding: "8px 12px" }}>
            {msg.content && (
              <p style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                lineHeight: "24px",
                color: "#171717",
                fontSize: 14,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>{msg.content}</p>
            )}
            {/* Order card */}
            {orderResult && <OrderCard order={orderResult} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useLayout();
  const STORAGE_KEY = "dewa_ai_history";
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist history to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => !m.loading))); } catch { /* ignore */ }
  }, [messages]);

  const firstName = currentUser?.name?.split(" ")[0] || "بەکارهێنەر";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const loadingMsg: Message = { id: Date.now() + "-l", role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev.filter(m => !m.loading), {
        id: Date.now() + "-ai",
        role: "assistant",
        content: data.text || data.error || "کێشەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.",
        toolResults: data.toolResults || [],
      }]);
    } catch {
      setMessages(prev => [...prev.filter(m => !m.loading), {
        id: Date.now() + "-err", role: "assistant",
        content: "کێشەیەک ڕوویدا لە پەیوەندیدا.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 9998,
        animation: "aiBackdropIn 0.2s ease",
      }} />

      {/* Panel — matches reference: 380px, white, border-left rgba(0,0,0,0.08) */}
      <div style={{
        position: "fixed", top: 0, bottom: 0, right: 0,
        width: 400, zIndex: 9999,
        background: "white",
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0px 20px 24px -4px rgba(0,0,0,0.08), 0px 8px 8px -4px rgba(0,0,0,0.03), 0px 3px 3px -1.5px rgba(0,0,0,0.04)",
        animation: "aiPanelIn 0.22s cubic-bezier(0.32,0.72,0,1)",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}>

        {/* ── Clear history button ── */}
        <button
          onClick={() => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }}
          title="Clear chat history"
          style={{
            position: "absolute", top: 12, right: 56, zIndex: 10,
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", borderRadius: 8,
            cursor: "pointer", color: "#a3a3a3", transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
        >
          <Trash2 size={17} strokeWidth={2} />
        </button>

        {/* ── Close button ── */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", borderRadius: 8,
          cursor: "pointer", color: "#a3a3a3", transition: "all 0.12s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#171717"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* ── Header — reference: pt-24px pb-32px px-24px with logo ── */}
        <div style={{ background: "white", flexShrink: 0 }}>
          {!hasMessages ? (
            /* Welcome state header */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              paddingTop: 64, paddingBottom: 32, paddingLeft: 24, paddingRight: 24,
              gap: 20,
            }}>
              <AiLogo size={56} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: "28px", fontSize: 18, fontWeight: 600 }}>
                  <span style={{ color: "#737373" }}>بەخێربێیتەوە، {firstName}</span>
                  <span style={{ color: "#171717" }}>چۆن یارمەتیت بدەم؟</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 400, color: "#525252", lineHeight: "20px", margin: 0 }}>
                  ئێمەم ئامادەیین بۆ ئەنجامدانی ئەرکەکانت. داواکاریت بدرێزەوە، بەرهەمی زیادبکە، و زۆری تر!
                </p>
              </div>
            </div>
          ) : (
            /* Chat mini header — reference: just logo + gap */
            <div style={{
              display: "flex", alignItems: "center",
              paddingTop: 24, paddingBottom: 20, paddingLeft: 24, paddingRight: 56,
            }}>
              <AiLogo size={40} />
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!hasMessages ? (
            /* Welcome chips */
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center",
                paddingLeft: 24, paddingRight: 24,
              }}>
                {QUICK_ACTIONS.map(a => (
                  <Chip key={a.label} Icon={a.Icon} label={a.label} onClick={() => sendMessage(a.prompt)} />
                ))}
              </div>
              <div style={{ flex: 1 }} />
            </div>
          ) : (
            /* Messages — reference: flex-col gap-24 items-start px-24 pb-24 */
            <div style={{ flex: 1, padding: "0 24px 24px" }}>
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Footer — reference exact: pb-20 px-24, inner box 160px h ── */}
        <div style={{
          flexShrink: 0,
          background: "white",
          paddingLeft: 24, paddingRight: 24, paddingBottom: 20,
        }}>
          <div style={{
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            height: 160,
            display: "flex", flexDirection: "column",
            position: "relative",
            overflow: "visible", // so Commands popover can overflow upward
          }}>
            {/* Textarea */}
            <div style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="هەر شتێک بپرسە..."
                disabled={loading}
                style={{
                  width: "100%", height: "100%",
                  resize: "none", border: "none", background: "transparent",
                  outline: "none",
                  padding: "12px 44px 4px 14px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14, fontWeight: 400,
                  color: "#171717", lineHeight: "24px",
                  caretColor: "#171717", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Footer bar — reference: avatar+name left | shortcuts+attach right */}
            <div style={{
              flexShrink: 0, width: "100%",
              display: "flex", alignItems: "center", gap: 12,
              padding: "0 12px 8px",
            }}>
              {/* Avatar + name */}
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4, minWidth: 0 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                  background: currentUser?.avatarUrl ? undefined : "linear-gradient(135deg, #404040, #737373)",
                  overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {currentUser?.avatarUrl
                    ? <img src={currentUser.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 7, fontWeight: 700, color: "white" }}>{firstName[0]}</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#525252", whiteSpace: "nowrap", lineHeight: "18px" }}>
                  {firstName}
                </span>
              </div>

              {/* Commands (replaces Shortcuts) */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowCommands(p => !p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 6px", borderRadius: 6,
                    border: "none", cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    background: showCommands ? "#f4f0ff" : "transparent",
                    color: showCommands ? "#6941c6" : "#525252",
                    transition: "background 0.1s, color 0.1s",
                  }}
                  onMouseEnter={e => { if (!showCommands) e.currentTarget.style.background = "#f5f5f5"; }}
                  onMouseLeave={e => { if (!showCommands) e.currentTarget.style.background = "transparent"; }}
                >
                  <Keyboard size={14} strokeWidth={1.8} />
                  <span style={{ fontSize: 12, fontWeight: 600, lineHeight: "18px", whiteSpace: "nowrap" }}>Commands</span>
                </button>
                {showCommands && (
                  <CommandsPopover
                    onClose={() => setShowCommands(false)}
                    onCommand={(p) => { sendMessage(p); setShowCommands(false); }}
                  />
                )}
              </div>

              {/* Attach */}
              <button style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 6px", borderRadius: 6,
                border: "none", background: "transparent",
                cursor: "pointer", color: "#525252",
                fontFamily: "Inter, sans-serif",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Paperclip size={14} strokeWidth={1.8} color="#a3a3a3" />
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: "18px", whiteSpace: "nowrap" }}>Attach</span>
              </button>
            </div>

            {/* Mic — absolute top-right inside box */}
            <button style={{
              position: "absolute", top: 8, right: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 6, borderRadius: 6, border: "none",
              background: "transparent", cursor: "pointer",
              color: "#a3a3a3", transition: "background 0.12s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#efefef")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Mic size={16} strokeWidth={1.8} />
            </button>

            {/* Send — absolute bottom-right or inline */}
            {input.trim() && (
              <button
                onClick={() => sendMessage(input)}
                disabled={loading}
                style={{
                  position: "absolute", bottom: 8, right: 8,
                  width: 28, height: 28, borderRadius: 6,
                  border: "1px solid #d4d4d4",
                  background: "#171717", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Send size={13} strokeWidth={2} />
              </button>
            )}

            {/* Resize handle dots (decorative) */}
            <div style={{ position: "absolute", bottom: 6, right: input.trim() ? 42 : 6, pointerEvents: "none" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                <path d="M10 2L2 10" stroke="#D4D4D4" strokeLinecap="round" />
                <path d="M11 7L7 11" stroke="#D4D4D4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiPanelIn    { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes aiBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmdPopIn     { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes dotsAnim {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
