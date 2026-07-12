"use client";

import {
  useState, useCallback, useRef,
} from "react";
import { StreamingText } from "@/components/ui/streaming-text";
import {
  Sparkles, RotateCwIcon, BarChart3, ShoppingCart,
  Package, Users, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Loader2, TrendingUp,
  Warehouse, Archive, Camera, LayoutGrid, Plug,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AIInput,
  type AIInputMenuItem,
  type PromptSettingGroup,
} from "@/components/ui/ai-input";
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

// ─── Types ────────────────────────────────────────────────────────────────────
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

// (AnimatedText replaced by StreamingText from @iconiq/streaming-text)

// ─── Rich result cards ────────────────────────────────────────────────────────
function OrderCard({ order }: { order: OrderResult }) {
  const [expanded, setExpanded] = useState(false);
  const ok = order.success && !order.error;
  return (
    <div className={cn("rounded-xl overflow-hidden border text-sm", ok ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800")}>
      <div className="flex items-start gap-2.5 p-3">
        {ok ? <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className={cn("font-bold", ok ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100")}>{ok ? order.orderNumber : "فەيل بوو"}</div>
          {ok && <div className="text-xs text-green-700 dark:text-green-300">{order.clientName}{order.repName ? ` · ${order.repName}` : ""}</div>}
          {order.error && <div className="text-xs text-red-700 dark:text-red-300">{order.error}</div>}
        </div>
        {ok && (
          <div className="text-right shrink-0">
            <div className="font-black text-green-700">{fmt(order.totalAmount || 0)}</div>
            <Badge variant="outline" className="text-[9px] mt-0.5" style={{ color: STATUS_COLOR[order.status || "WAITING"] }}>{order.status}</Badge>
          </div>
        )}
      </div>
      {ok && order.items && order.items.length > 0 && (
        <>
          <Button variant="ghost" onClick={() => setExpanded(e => !e)} className="w-full gap-1.5 px-3 py-1.5 h-auto rounded-none text-xs text-muted-foreground bg-black/5 border-t border-black/5 hover:bg-black/10">
            <Package className="size-3" />{order.items.length} بەرهەم
            {expanded ? <ChevronUp className="size-3 ms-auto" /> : <ChevronDown className="size-3 ms-auto" />}
          </Button>
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
      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 text-sm">
        <ShoppingCart className="size-4 text-blue-700" />
        <span className="font-bold text-blue-900 dark:text-blue-100">{successCount} / {result.count} داواکاری</span>
        <span className="ms-auto font-semibold text-blue-700">{fmt(result.orders.filter(o => o.success).reduce((s, o) => s + (o.totalAmount || 0), 0))}</span>
      </div>
      {result.orders.map((order, i) => <OrderCard key={i} order={order} />)}
    </div>
  );
}

function StatsCard({ result }: { result: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
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
      {clients.slice(0, 8).map((c, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
          <Users className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{c.name}</span>
          {c.city && <span className="text-muted-foreground text-xs">{c.city}</span>}
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrdersListCard({ orders }: { orders: any[] }) {
  return (
    <div className="flex flex-col gap-1">
      {orders.slice(0, 6).map((o, i) => (
        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
          <div>
            <div className="font-semibold">{o.orderNumber || o.order_number}</div>
            <div className="text-muted-foreground text-xs">{o.client || o.client_name}</div>
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
        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
          <Warehouse className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{w.name}</span>
          {w.city && <span className="text-muted-foreground text-xs">{w.city}</span>}
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

// ─── AI Input config ──────────────────────────────────────────────────────────
const settingGroups: PromptSettingGroup[] = [
  {
    id: "model",
    label: "Model",
    display: "featured",
    options: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "زۆر ئەندازە" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "خێرا" },
    ],
  },
  {
    id: "effort",
    label: "Effort",
    display: "submenu",
    options: [
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
];

const menuItems: AIInputMenuItem[] = [
  { value: "stats", label: "ئاماری ئەمڕۆ", icon: BarChart3 },
  { value: "products", label: "بەرهەمەکان", icon: Package },
  { value: "clients", label: "کڕیارەکان", icon: Users },
  { value: "sep-1", type: "separator" },
  { value: "new-order", label: "داواکاری نوێ", icon: ShoppingCart },
  { value: "warehouses", label: "کۆگاکان", icon: Archive },
];

const SUGGESTED = [
  { icon: BarChart3, label: "ئاماری ئەمڕۆ", prompt: "ئاماری ئەمڕۆم پیشان بدە" },
  { icon: ShoppingCart, label: "داواکاری نوێ", prompt: "داواکاری نوێ" },
  { icon: Package, label: "بەرهەمەکان", prompt: "لیستی بەرهەمەکانم نیشان بدە" },
  { icon: Users, label: "کڕیارەکان", prompt: "لیستی کڕیارەکانم نیشان بدە" },
];

const MENU_PROMPTS: Record<string, string> = {
  stats: "ئاماری ئەمڕۆم پیشان بدە",
  products: "لیستی بەرهەمەکانم نیشان بدە",
  clients: "لیستی کڕیارەکانم نیشان بدە",
  "new-order": "داواکاری نوێ",
  warehouses: "لیستی کۆگاکانم نیشان بدە",
};

// ─── Chat row ─────────────────────────────────────────────────────────────────
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
          <Bubble variant={isUser ? "tinted" : msg.error ? "destructive" : "ghost"} align={isUser ? "end" : "start"}>
            <BubbleContent className="text-sm leading-relaxed">
              {!isUser && msg.animated
                ? <StreamingText text={msg.text} speed={40} settleDelay={200} />
                : <span className="whitespace-pre-wrap">{msg.text}</span>
              }
            </BubbleContent>
          </Bubble>
        )}
        {msg.toolResults && msg.toolResults.length > 0 && (
          <div className="w-full">
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AiPage() {
  const { currentUser } = useLayout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [inputValue, setInputValue] = useState("");

  const userInitials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2)
    : "؟";

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: text.trim() };
    const loadingMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
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
          text: data.text || "",
          toolResults: data.toolResults || [],
          error: !!data.error,
          animated: true,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: crypto.randomUUID(), role: "assistant", text: "پەیوەندی سەرکەوتوو نەبوو.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleMic = useCallback(async () => {
    // ── Stop recording → transcribe ───────────────────────────────────────────
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop(); // triggers onstop below
      return;
    }

    // ── Start recording ───────────────────────────────────────────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("مایکرۆفۆن بەردەست نییە. تکایە ڕووتینی دەسترسی بدە.");
      return;
    }

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Stop all tracks to release mic indicator
      stream.getTracks().forEach(t => t.stop());
      setListening(false);
      mediaRecorderRef.current = null;

      const chunks = audioChunksRef.current;
      if (chunks.length === 0) return;

      setTranscribing(true);
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const form = new FormData();
        form.append("file", blob, "audio.webm");
        // model_id and language_code set server-side in /api/stt

        const res = await fetch("/api/stt", { method: "POST", body: form });
        const data = await res.json();
        const transcript = (data.transcript as string)?.trim();
        if (transcript) {
          sendMessage(transcript);
        }
      } catch (e) {
        console.error("STT error:", e);
      } finally {
        setTranscribing(false);
        setInputValue("");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setListening(true);
  }, [sendMessage]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between py-4 px-1 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm shadow-primary/30">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Dewa AI</h1>
            <p className="text-xs text-muted-foreground">Gemini · ئاژیاری زیرەک</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setMessages([])}
          disabled={isEmpty || loading}
        >
          <RotateCwIcon className="size-3.5" />
          گفتوگۆی نوێ
        </Button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isEmpty ? (
          <Empty className="h-full border-0 rounded-none">
            <EmptyHeader>
              <EmptyMedia className="size-20 rounded-3xl bg-gradient-to-br from-primary/80 to-violet-500 shadow-xl shadow-primary/20">
                <Sparkles className="size-9 text-white" />
              </EmptyMedia>
              <EmptyTitle className="text-xl font-bold mt-2">چۆن یارمەتیت بدەم؟</EmptyTitle>
              <EmptyDescription className="text-base">
                داواکاری دروست بکە، ئامار ببینە، بەرهەم و کڕیارەکان بپرسە.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="mt-4">
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTED.map(({ icon: Icon, label, prompt }) => (
                  <Button
                    key={label}
                    variant="outline"
                    onClick={() => sendMessage(prompt)}
                    className="gap-2 rounded-xl bg-muted/40 px-3 py-3 h-auto text-start text-sm font-medium justify-start"
                  >
                    <Icon className="size-4 text-muted-foreground shrink-0" />
                    {label}
                  </Button>
                ))}
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller className="h-full">
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={loading} className="px-2 py-4 gap-4">
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
          </MessageScrollerProvider>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 py-4">
        <AIInput
          menuItems={menuItems}
          settingGroups={settingGroups}
          listening={listening}
          onMenuSelect={(value) => {
            const prompt = MENU_PROMPTS[value];
            if (prompt) sendMessage(prompt);
          }}
          onSend={(message) => sendMessage(message)}
          onMic={handleMic}
          placeholder={listening ? "🎙️ گوێدەگرم… (دووبارە کلیک بکە بۆ ناردن)" : transcribing ? "⏳ وەرگێڕانی دەنگ…" : loading ? "جواب دەدرێتەوە…" : "پەیامێک بنوسە…"}
        />
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Gemini · Dewa {new Date().getFullYear()} · هەموو وەڵامەکان دەتوانن هەڵەش بن
        </p>
      </div>
    </div>
  );
}
