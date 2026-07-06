"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, Sparkles, Trash2, Package, TrendingUp,
  CheckCircle2, AlertCircle, Loader2, ShoppingCart,
  Users, BarChart3, Warehouse, ChevronDown, ChevronUp,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";

// ── Types ─────────────────────────────────────────────────────────────────
interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OrderResult {
  success: boolean;
  orderNumber?: string;
  clientName?: string;
  repName?: string;
  warehouseName?: string;
  totalAmount?: number;
  status?: string;
  items?: OrderItem[];
  error?: string;
}

interface BulkResult {
  bulk: boolean;
  count: number;
  orders: OrderResult[];
}

interface ToolResult {
  name: string;
  result: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolResults?: ToolResult[];
  loading?: boolean;
  error?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n)) + " IQD";

const STATUS_COLOR: Record<string, string> = {
  WAITING: "#f59e0b", IN_PROGRESS: "#3b82f6", READY: "#8b5cf6",
  SENT: "#06b6d4", DELIVERED: "#10b981", PAID: "#22c55e", NOT_ACCEPTED: "#ef4444",
};

// ── Cards ──────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: OrderResult }) {
  const [expanded, setExpanded] = useState(false);
  const ok = order.success && !order.error;

  return (
    <div style={{
      background: ok ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
      border: `1.5px solid ${ok ? "#86efac" : "#fca5a5"}`,
      borderRadius: 12, overflow: "hidden", marginTop: 8,
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        {ok
          ? <CheckCircle2 size={18} color="#16a34a" strokeWidth={2.5} />
          : <AlertCircle  size={18} color="#dc2626" strokeWidth={2.5} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: ok ? "#14532d" : "#7f1d1d" }}>
            {ok ? order.orderNumber : "Order Failed"}
          </div>
          {ok && (
            <div style={{ fontSize: 12, color: "#166534" }}>
              {order.clientName}{order.repName ? ` · ${order.repName}` : ""}
            </div>
          )}
          {order.error && <div style={{ fontSize: 12, color: "#991b1b" }}>{order.error}</div>}
        </div>
        {ok && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#15803d" }}>
              {fmt(order.totalAmount || 0)}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              background: STATUS_COLOR[order.status || "WAITING"] + "22",
              color: STATUS_COLOR[order.status || "WAITING"],
              display: "inline-block", marginTop: 2,
            }}>
              {order.status}
            </div>
          </div>
        )}
      </div>

      {/* Items toggle */}
      {ok && order.items && order.items.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              width: "100%", background: "rgba(0,0,0,0.04)", border: "none",
              borderTop: "1px solid rgba(0,0,0,0.06)", padding: "6px 14px",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 12, color: "#374151",
            }}
          >
            <Package size={13} />
            {order.items.length} item{order.items.length > 1 ? "s" : ""}
            {expanded ? <ChevronUp size={13} style={{ marginLeft: "auto" }} /> : <ChevronDown size={13} style={{ marginLeft: "auto" }} />}
          </button>
          {expanded && (
            <div style={{ padding: "8px 14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#374151", fontWeight: 500 }}>
                    {item.productName} <span style={{ color: "#6b7280" }}>×{item.quantity}</span>
                  </span>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>{fmt(item.total)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BulkOrderCard({ result }: { result: BulkResult }) {
  const successCount = result.orders.filter(o => o.success).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      <div style={{
        background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
        border: "1.5px solid #93c5fd", borderRadius: 10,
        padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <ShoppingCart size={16} color="#1d4ed8" />
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a" }}>
          {successCount} / {result.count} Orders Created
        </span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>
          {fmt(result.orders.filter(o => o.success).reduce((s, o) => s + (o.totalAmount || 0), 0))}
        </span>
      </div>
      {result.orders.map((order, i) => <OrderCard key={i} order={order} />)}
    </div>
  );
}

function StatsCard({ result }: { result: Record<string, number> }) {
  const items = [
    { label: "Today's Orders", value: result.totalOrders, icon: ShoppingCart, color: "#3b82f6" },
    { label: "Revenue", value: fmt(result.totalRevenue), icon: TrendingUp, color: "#10b981" },
    { label: "Delivered", value: result.delivered, icon: CheckCircle2, color: "#22c55e" },
    { label: "Waiting", value: result.waiting, icon: Loader2, color: "#f59e0b" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} style={{
          background: color + "12", border: `1.5px solid ${color}33`,
          borderRadius: 10, padding: "10px 12px",
        }}>
          <Icon size={16} color={color} />
          <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductsCard({ products }: { products: any[] }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {products.slice(0, 8).map((p, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "7px 12px", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
        }}>
          <span style={{ fontWeight: 500, color: "#1e293b" }}>{p.name}</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#10b981", fontWeight: 600 }}>{fmt(p.price)}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              background: p.stock <= 5 ? "#fef2f2" : "#f0fdf4",
              color: p.stock <= 5 ? "#dc2626" : "#16a34a",
              border: `1px solid ${p.stock <= 5 ? "#fca5a5" : "#86efac"}`,
            }}>
              {p.stock}
            </span>
          </div>
        </div>
      ))}
      {products.length > 8 && (
        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", paddingTop: 4 }}>
          +{products.length - 8} more
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClientsCard({ clients }: { clients: any[] }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {clients.slice(0, 6).map((c, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
        }}>
          <Users size={13} color="#6b7280" />
          <span style={{ fontWeight: 500, color: "#1e293b", flex: 1 }}>{c.name}</span>
          {c.city && <span style={{ color: "#6b7280", fontSize: 12 }}>{c.city}</span>}
        </div>
      ))}
      {clients.length > 6 && (
        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", paddingTop: 4 }}>
          +{clients.length - 6} more
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrdersListCard({ orders }: { orders: any[] }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {orders.slice(0, 6).map((o, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 12px", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
        }}>
          <div>
            <div style={{ fontWeight: 600, color: "#1e293b" }}>{o.orderNumber || o.order_number}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{o.client || o.client_name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, color: "#374151" }}>{fmt(o.total || o.total_amount || 0)}</div>
            <div style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              background: (STATUS_COLOR[o.status] || "#6b7280") + "22",
              color: STATUS_COLOR[o.status] || "#6b7280",
              display: "inline-block",
            }}>{o.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WarehousesCard({ warehouses }: { warehouses: { id: string; name: string; city?: string }[] }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {warehouses.map((w, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
        }}>
          <Warehouse size={13} color="#6b7280" />
          <span style={{ fontWeight: 500, color: "#1e293b", flex: 1 }}>{w.name}</span>
          {w.city && <span style={{ color: "#6b7280", fontSize: 12 }}>{w.city}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Render tool results as rich cards ──────────────────────────────────────
function ToolResultCards({ toolResults }: { toolResults: ToolResult[] }) {
  return (
    <>
      {toolResults.map((tr, i) => {
        const r = tr.result as Record<string, unknown>;
        if (tr.name === "create_order" && r) return <OrderCard key={i} order={r as unknown as OrderResult} />;
        if (tr.name === "create_bulk_orders" && (r as unknown as BulkResult)?.bulk) return <BulkOrderCard key={i} result={r as unknown as BulkResult} />;
        if (tr.name === "get_dashboard_stats" && r) return <StatsCard key={i} result={r as Record<string, number>} />;
        if (tr.name === "list_products" && Array.isArray(tr.result)) return <ProductsCard key={i} products={tr.result} />;
        if (tr.name === "list_clients" && Array.isArray(tr.result)) return <ClientsCard key={i} clients={tr.result} />;
        if (tr.name === "list_orders" && Array.isArray(tr.result)) return <OrdersListCard key={i} orders={tr.result} />;
        if (tr.name === "list_warehouses" && Array.isArray(tr.result)) return <WarehousesCard key={i} warehouses={tr.result as { id: string; name: string; city?: string }[]} />;
        return null;
      })}
    </>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (msg.loading) {
    return (
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={15} color="white" />
        </div>
        <div style={{
          padding: "10px 14px", background: "white",
          border: "1px solid #e5e7eb", borderRadius: "4px 12px 12px 12px",
          display: "flex", gap: 5, alignItems: "center",
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#6366f1",
              display: "inline-block",
              animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{
          maxWidth: "78%", padding: "10px 14px",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          borderRadius: "12px 12px 4px 12px",
          color: "white", fontSize: 14, lineHeight: "22px",
          fontWeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      {/* Bot avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Sparkles size={15} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Text */}
        {msg.text && (
          <div style={{
            padding: "10px 14px", background: msg.error ? "#fef2f2" : "white",
            border: `1px solid ${msg.error ? "#fca5a5" : "#e5e7eb"}`,
            borderRadius: "4px 12px 12px 12px",
            fontSize: 14, lineHeight: "22px", color: msg.error ? "#dc2626" : "#111827",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {msg.text}
          </div>
        )}
        {/* Tool result cards */}
        {msg.toolResults && msg.toolResults.length > 0 && (
          <ToolResultCards toolResults={msg.toolResults} />
        )}
      </div>
    </div>
  );
}

// ── Quick actions ──────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: BarChart3,    label: "ئاماری ئەمڕۆ",   prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { icon: ShoppingCart, label: "داواکاری نوێ",   prompt: "داواکاری نوێ" },
  { icon: Package,      label: "بەرهەمەکان",     prompt: "لیستی بەرهەمەکانم نیشان بدە" },
  { icon: Users,        label: "کڕیارەکان",      prompt: "لیستی کڕیارەکانم نیشان بدە" },
];

// ── Main Panel ─────────────────────────────────────────────────────────────
export default function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useLayout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now() + "-u", role: "user", text: text.trim() };
    const loadingMsg: Message = { id: Date.now() + "-l", role: "assistant", text: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          id: Date.now() + "-a",
          role: "assistant",
          text:        data.text || (data.error ? "" : "کێشەیەک ڕوویدا."),
          toolResults: data.toolResults || [],
          error:       !!data.error,
        },
      ]);
      if (data.error) {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + "-e", role: "assistant", text: data.error, error: true },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: Date.now() + "-e", role: "assistant", text: "پەیوەندی سەرکەوتوو نەبوو.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); opacity:.4 }
          50%      { transform: translateY(-5px); opacity:1 }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity:0 }
          to   { transform: translateX(0);    opacity:1 }
        }
      `}</style>

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 1000,
        background: "#ffffff",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 40px rgba(0,0,0,0.12)",
        animation: "slideIn 0.22s cubic-bezier(0.32,0.72,0,1)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)",
          padding: "16px 18px",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Dewa AI</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              {currentUser?.name ?? "Assistant"} · Powered by Gemini
            </div>
          </div>

          {/* Clear button */}
          <button
            onClick={() => setMessages([])}
            title="Clear chat"
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            <Trash2 size={16} />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Messages area ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px 16px",
          display: "flex", flexDirection: "column",
        }}>
          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 32 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={28} color="white" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                Dewa AI
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, lineHeight: "21px" }}>
                Ask me to create orders, check stats,<br />list products, clients and more.
              </div>

              {/* Quick actions */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px",
                      background: "#f8f7ff", border: "1.5px solid #e0e7ff",
                      borderRadius: 20, cursor: "pointer", fontSize: 13,
                      color: "#4f46e5", fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#ede9fe";
                      e.currentTarget.style.borderColor = "#a5b4fc";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#f8f7ff";
                      e.currentTarget.style.borderColor = "#e0e7ff";
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid #f3f4f6",
          flexShrink: 0,
          background: "white",
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            background: "#f9fafb", border: "1.5px solid #e5e7eb",
            borderRadius: 14, padding: "8px 8px 8px 14px",
            transition: "border-color 0.15s",
          }}
            onFocus={() => {}}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKey}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", outline: "none",
                fontSize: 14, lineHeight: "22px", color: "#111827",
                fontFamily: "Inter, system-ui, sans-serif",
                maxHeight: 120, overflowY: "auto",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: !input.trim() || loading ? "#e5e7eb" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: !input.trim() || loading ? "#9ca3af" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              {loading
                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                : <Send size={16} />
              }
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 6 }}>
            Gemini · دەوا {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)",
        }}
      />
    </>
  );
}
