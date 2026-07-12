"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, ArrowUpIcon, RotateCwIcon, X,
  Package, TrendingUp, CheckCircle2, AlertCircle,
  Loader2, ShoppingCart, Users, BarChart3, Warehouse,
  ChevronDown, ChevronUp, PlusIcon, MessageCircleDashedIcon,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── shadcn chat primitives ────────────────────────────────────────────────────
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem { productName: string; quantity: number; unitPrice: number; total: number; }
interface OrderResult { success: boolean; orderNumber?: string; clientName?: string; repName?: string; warehouseName?: string; totalAmount?: number; status?: string; items?: OrderItem[]; error?: string; }
interface BulkResult { bulk: boolean; count: number; orders: OrderResult[]; }
interface ToolResult { name: string; result: unknown; }
interface ChatMessage { id: string; role: "user" | "assistant"; text: string; toolResults?: ToolResult[]; loading?: boolean; error?: boolean; animated?: boolean; }

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n)) + " IQD";
const STATUS_COLOR: Record<string, string> = {
  WAITING: "#f59e0b", IN_PROGRESS: "#3b82f6", READY: "#8b5cf6",
  SENT: "#06b6d4", DELIVERED: "#10b981", PAID: "#22c55e", NOT_ACCEPTED: "#ef4444",
};

// ── Animated text (typewriter) ────────────────────────────────────────────────
function AnimatedText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 8);
    return () => clearInterval(id);
  }, [text]);
  return <span className="whitespace-pre-wrap leading-relaxed">{displayed}</span>;
}

// ── Rich result cards ─────────────────────────────────────────────────────────
function OrderCard({ order }: { order: OrderResult }) {
  const [expanded, setExpanded] = useState(false);
  const ok = order.success && !order.error;
  return (
    <div className={cn("rounded-xl overflow-hidden border", ok ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800")}>
      <div className="flex items-start gap-2.5 p-3">
        {ok ? <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className={cn("font-bold text-sm", ok ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100")}>
            {ok ? order.orderNumber : "فەيل بوو"}
          </div>
          {ok && <div className="text-xs text-green-700 dark:text-green-300">{order.clientName}{order.repName ? ` · ${order.repName}` : ""}</div>}
          {order.error && <div className="text-xs text-red-700 dark:text-red-300">{order.error}</div>}
        </div>
        {ok && (
          <div className="text-right shrink-0">
            <div className="font-black text-sm text-green-700">{fmt(order.totalAmount || 0)}</div>
            <Badge variant="outline" className="text-[9px] mt-0.5" style={{ color: STATUS_COLOR[order.status || "WAITING"] }}>{order.status}</Badge>
          </div>
        )}
      </div>
      {ok && order.items && order.items.length > 0 && (
        <>
          <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-black/5 border-t border-black/5 hover:bg-black/10 transition-colors">
            <Package className="size-3" />{order.items.length} بەرهەم
            {expanded ? <ChevronUp className="size-3 ms-auto" /> : <ChevronDown className="size-3 ms-auto" />}
          </button>
          {expanded && (
            <div className="flex flex-col gap-1 px-3 pb-3 pt-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.productName} <span className="text-muted-foreground">×{item.quantity}</span></span>
                  <span className="font-semibold text-green-700">{fmt(item.total)}</span>
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
        <ShoppingCart className="size-4 text-blue-700" />
        <span className="font-bold text-sm text-blue-900 dark:text-blue-100">{successCount} / {result.count} داواکاری</span>
        <span className="ms-auto text-sm font-semibold text-blue-700">{fmt(result.orders.filter(o => o.success).reduce((s, o) => s + (o.totalAmount || 0), 0))}</span>
      </div>
      {result.orders.map((order, i) => <OrderCard key={i} order={order} />)}
    </div>
  );
}

function StatsCard({ result }: { result: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "داواکارییەکان", value: result.totalOrders, icon: ShoppingCart, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
        { label: "داهات", value: fmt(result.totalRevenue), icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
        { label: "گەیشتووە", value: result.delivered, icon: CheckCircle2, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
        { label: "چاوەڕوان", value: result.waiting, icon: Loader2, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className={cn("rounded-xl p-3 border border-border", color)}>
          <Icon className="size-4 mb-1" />
          <div className="text-lg font-black">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductsCard({ products }: { products: any[] }) {
  return (
    <div className="flex flex-col gap-1">
      {products.slice(0, 8).map((p, i) => (
        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs">
          <span className="font-medium">{p.name}</span>
          <div className="flex gap-2 items-center">
            <span className="text-emerald-600 font-semibold">{fmt(p.price)}</span>
            <Badge variant={p.stock <= 5 ? "destructive" : "outline"} className="text-[9px]">{p.stock}</Badge>
          </div>
        </div>
      ))}
      {products.length > 8 && <div className="text-xs text-muted-foreground text-center pt-1">+{products.length - 8} زیاتر</div>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClientsCard({ clients }: { clients: any[] }) {
  return (
    <div className="flex flex-col gap-1">
      {clients.slice(0, 6).map((c, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs">
          <Users className="size-3 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{c.name}</span>
          {c.city && <span className="text-muted-foreground">{c.city}</span>}
        </div>
      ))}
      {clients.length > 6 && <div className="text-xs text-muted-foreground text-center pt-1">+{clients.length - 6} زیاتر</div>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrdersListCard({ orders }: { orders: any[] }) {
  return (
    <div className="flex flex-col gap-1">
      {orders.slice(0, 6).map((o, i) => (
        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs">
          <div>
            <div className="font-semibold">{o.orderNumber || o.order_number}</div>
            <div className="text-muted-foreground">{o.client || o.client_name}</div>
          </div>
          <div className="text-right">
            <div className="font-bold">{fmt(o.total || o.total_amount || 0)}</div>
            <Badge variant="outline" className="text-[9px]" style={{ color: STATUS_COLOR[o.status] || undefined }}>{o.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function WarehousesCard({ warehouses }: { warehouses: { id: string; name: string; city?: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      {warehouses.map((w, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs">
          <Warehouse className="size-3 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{w.name}</span>
          {w.city && <span className="text-muted-foreground">{w.city}</span>}
        </div>
      ))}
    </div>
  );
}

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

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED = [
  { icon: BarChart3,    label: "ئاماری ئەمڕۆ",  prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { icon: ShoppingCart, label: "داواکاری نوێ",  prompt: "داواکاری نوێ" },
  { icon: Package,      label: "بەرهەمەکان",    prompt: "لیستی بەرهەمەکانم نیشان بدە" },
  { icon: Users,        label: "کڕیارەکان",     prompt: "لیستی کڕیارەکانم نیشان بدە" },
];

// ── Single message row ────────────────────────────────────────────────────────
function ChatRow({ msg, userInitials }: { msg: ChatMessage; userInitials: string }) {
  const isUser = msg.role === "user";

  if (msg.loading) {
    return (
      <Message align="start">
        <MessageAvatar className="size-8 rounded-full bg-primary/10 border border-primary/20 shrink-0">
          <Sparkles className="size-3.5 text-primary" />
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="ghost" align="start">
            <BubbleContent className="flex gap-1.5 items-center py-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="size-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message align={isUser ? "end" : "start"}>
      {!isUser && (
        <MessageAvatar className="size-8 rounded-full bg-primary/10 border border-primary/20 shrink-0">
          <Sparkles className="size-3.5 text-primary" />
        </MessageAvatar>
      )}

      <MessageContent>
        {msg.text && (
          <Bubble
            variant={isUser ? "tinted" : msg.error ? "destructive" : "ghost"}
            align={isUser ? "end" : "start"}
          >
            <BubbleContent className="text-sm leading-relaxed">
              {!isUser && msg.animated
                ? <AnimatedText text={msg.text} />
                : <span className="whitespace-pre-wrap">{msg.text}</span>
              }
            </BubbleContent>
          </Bubble>
        )}
        {msg.toolResults && msg.toolResults.length > 0 && (
          <div className="w-full max-w-[85%]">
            <ToolResultCards toolResults={msg.toolResults} />
          </div>
        )}
      </MessageContent>

      {isUser && (
        <MessageAvatar className="size-8 rounded-full bg-muted border border-border shrink-0">
          <span className="text-foreground font-bold text-xs">{userInitials}</span>
        </MessageAvatar>
      )}
    </Message>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser } = useLayout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const userInitials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2)
    : "؟";

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: text.trim() };
    const loadingMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text || (data.error ? "" : "کێشەیەک ڕوویدا."),
          toolResults: data.toolResults || [],
          error: !!data.error,
          animated: true,
        },
      ]);
      if (data.error) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", text: data.error, error: true }]);
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: crypto.randomUUID(), role: "assistant", text: "پەیوەندی سەرکەوتوو نەبوو.", error: true },
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

  const isEmpty = messages.length === 0;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[420px] p-0 flex flex-col gap-0 overflow-hidden"
        dir="rtl"
      >
        <MessageScrollerProvider>
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Dewa AI</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={() => setMessages([])}
                disabled={loading || isEmpty}
                title="سڕینەوەی مێژوو"
              >
                <RotateCwIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={onClose}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {isEmpty ? (
              /* Empty state */
              <Empty className="flex-1 border-0 rounded-none px-6">
                <EmptyHeader>
                  <EmptyMedia className="size-16 rounded-2xl bg-gradient-to-br from-primary/80 to-violet-500 shadow-lg shadow-primary/20">
                    <Sparkles className="size-7 text-white" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base font-semibold mt-1">Dewa AI</EmptyTitle>
                  <EmptyDescription>
                    داواکاری دروست بکە، ئامار ببینە،<br />بەرهەم و کڕیارەکان بپرسە.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="mt-2">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {SUGGESTED.map(({ icon: Icon, label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => sendMessage(prompt)}
                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-start text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="size-3.5 text-muted-foreground shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </EmptyContent>
              </Empty>
            ) : (
              /* Message list */
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={loading}
                    className="px-4 py-4 gap-4"
                  >
                    {messages.map((msg, idx) => (
                      <MessageScrollerItem
                        key={msg.id}
                        scrollAnchor={msg.role === "user" && idx === messages.length - 2}
                      >
                        <ChatRow msg={msg} userInitials={userInitials} />
                      </MessageScrollerItem>
                    ))}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton direction="end" />
              </MessageScroller>
            )}
          </div>

          {/* ── Input ───────────────────────────────────────────────── */}
          <div className="shrink-0 border-t bg-background px-4 py-3">
            <InputGroup className="rounded-2xl border-input bg-background shadow-sm min-h-[2.75rem]">
              {/* Top addon: new chat button */}
              <InputGroupAddon align="block-start" className="pb-0 pt-2 px-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setMessages([])}
                  disabled={loading || isEmpty}
                  title="گفتوگۆی نوێ"
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </InputGroupAddon>

              {/* Textarea */}
              <InputGroupTextarea
                ref={(el) => {
                  (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                }}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={handleKey}
                placeholder="پەیامێک بنوسە…"
                rows={1}
                disabled={loading}
                className="min-h-[2rem] max-h-[160px] py-2 text-sm resize-none"
              />

              {/* Bottom addon: send button */}
              <InputGroupAddon align="block-end" className="justify-end pb-2 pt-0 px-3">
                <div className="flex items-center gap-1 ms-auto">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {loading ? "جواب دەدرێتەوە…" : "Enter بۆ ناردن"}
                  </span>
                  <InputGroupButton
                    size="icon-sm"
                    variant={input.trim() ? "default" : "ghost"}
                    disabled={!input.trim() || loading}
                    onClick={() => sendMessage(input)}
                    className={cn("transition-all", input.trim() && "shadow-sm")}
                  >
                    {loading
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <ArrowUpIcon className="size-3.5" />
                    }
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
            </InputGroup>

            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Gemini · Dewa {new Date().getFullYear()}
            </p>
          </div>

        </MessageScrollerProvider>
      </SheetContent>
    </Sheet>
  );
}
