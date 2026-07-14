"use client";
import BorderBeam from "border-beam";

import {
  useState, useCallback, useRef, useEffect,
} from "react";
import { StreamingText } from "@/components/ui/streaming-text";
import {
  Sparkles, RotateCwIcon, BarChart3, ShoppingCart,
  Package, Users, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Loader2, TrendingUp,
  Warehouse, Archive, Phone, PhoneOff, Volume2,
  Check, Pencil, X, Gift,
  History, Trash2, MessageSquare, Clock, Plus,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { AiAura } from "@/components/custom/AiAura";
import {
  AIInput,
  type AIInputMenuItem,
  type AIInputFileData,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem { productName: string; quantity: number; unitPrice: number; total: number; bonusQty?: number; bonusPct?: number; }
interface OrderResult { success: boolean; orderNumber?: string; clientName?: string; repName?: string; warehouseName?: string; totalAmount?: number; status?: string; items?: OrderItem[]; error?: string; }
interface PreviewResult { preview: true; clientName: string; repName?: string | null; warehouseName?: string | null; totalAmount: number; totalBonusQty: number; notes?: string; items: OrderItem[]; }
interface BulkResult { bulk: boolean; count: number; orders: OrderResult[]; }
interface ToolResult { name: string; result: unknown; }
interface ChatMessage { id: string; role: "user" | "assistant"; text: string; toolResults?: ToolResult[]; loading?: boolean; error?: boolean; animated?: boolean; }

// Product import types
interface ProductPreviewItem { name: string; sku?: string; category?: string; company?: string; price: number; stock?: number; unitType?: string; origin?: string; supplier?: string; batchNumber?: string; expiryDate?: string; }
interface ProductPreviewResult { preview: true; type: "products"; count: number; items: ProductPreviewItem[]; }
interface ProductBulkResult { success: boolean; count: number; total: number; items: { name: string; success: boolean; error?: string }[]; }

// ─── Session types & localStorage helpers ─────────────────────────────────────
interface AiSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms
}

const STORAGE_KEY = "dewa-ai-sessions";
const MAX_SESSIONS = 50;

function loadSessions(): AiSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiSession[]) : [];
  } catch { return []; }
}

function saveSessions(sessions: AiSession[]) {
  try {
    // Keep only the most recent MAX_SESSIONS
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded — silently fail */ }
}

function deleteSession(id: string) {
  const sessions = loadSessions().filter(s => s.id !== id);
  saveSessions(sessions);
  return sessions;
}

/** Auto-generate a title from the first user message (Kurdish-friendly truncation) */
function autoTitle(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === "user" && m.text.trim());
  if (!first) return "گفتوگۆی نوێ";
  const text = first.text.trim();
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}

/** Human-readable relative time in Kurdish */
function timeAgo(epoch: number): string {
  const diff = Date.now() - epoch;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ئێستا";
  if (mins < 60) return `${mins} خولەک لەمەوبەر`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} کاتژمێر لەمەوبەر`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ڕۆژ لەمەوبەر`;
  return new Date(epoch).toLocaleDateString("ku", { month: "short", day: "numeric" });
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n)) + " IQD";
const STATUS_COLOR: Record<string, string> = {
  WAITING: "#f59e0b", IN_PROGRESS: "#3b82f6", READY: "#8b5cf6",
  SENT: "#06b6d4", DELIVERED: "#10b981", PAID: "#22c55e", NOT_ACCEPTED: "#ef4444",
};

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
                  <span>{item.productName} <span className="text-muted-foreground">×{item.quantity}</span>{(item.bonusQty ?? 0) > 0 && <span className="text-emerald-600 font-semibold"> +{item.bonusQty} بۆنەس</span>}</span>
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

// ─── Order Preview Card (with BorderBeam) ─────────────────────────────────────
function OrderPreviewCard({ preview, onAction }: { preview: PreviewResult; onAction: (action: "confirm" | "edit" | "cancel") => void }) {
  const totalBonus = preview.totalBonusQty;
  return (
    <BorderBeam
      size="md"
      colorVariant="colorful"
      strength={0.9}
      theme="auto"
      borderRadius={14}
    >
      <div className="rounded-[14px] bg-card border-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ShoppingCart className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold">پێشبینی داواکاری</p>
              <p className="text-[10px] text-muted-foreground">تکایە پشتڕاست بکەرەوە</p>
            </div>
          </div>
          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] mt-1">
            <span className="font-semibold">{preview.clientName}</span>
            {preview.repName && <span className="text-muted-foreground">نوێنەر: {preview.repName}</span>}
            {preview.warehouseName && <span className="text-muted-foreground">کۆگا: {preview.warehouseName}</span>}
          </div>
        </div>

        {/* Items table */}
        <div className="px-4 py-3 space-y-1.5">
          {preview.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="font-medium truncate">{item.productName}</span>
                <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                {(item.bonusQty ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 text-emerald-600 border-emerald-300 shrink-0">
                    <Gift className="size-2.5 me-0.5" />+{item.bonusQty}
                  </Badge>
                )}
              </div>
              <span className="font-semibold text-foreground shrink-0 ms-2">{fmt(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mx-4 border-t border-border/50 pt-2.5 pb-1">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted-foreground">کۆی گشتی</span>
            <span className="text-[15px] font-black text-primary">{fmt(preview.totalAmount)}</span>
          </div>
          {totalBonus > 0 && (
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-[11px] text-muted-foreground">کۆی بۆنەس</span>
              <span className="text-[12px] font-semibold text-emerald-600">+{totalBonus} دانە</span>
            </div>
          )}
          {preview.notes && (
            <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
              📝 {preview.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pt-2 pb-4">
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold text-[12px]"
            onClick={() => onAction("confirm")}
          >
            <Check className="size-3.5" /> پەسەندکردن
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-9 rounded-xl text-[12px]"
            onClick={() => onAction("edit")}
          >
            <Pencil className="size-3" /> دەستکاری
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-9 rounded-xl text-[12px] text-muted-foreground hover:text-destructive"
            onClick={() => onAction("cancel")}
          >
            <X className="size-3" /> پاشگەزبوون
          </Button>
        </div>
      </div>
    </BorderBeam>
  );
}

// ─── Products Preview Card ────────────────────────────────────────────────────
function ProductsPreviewCard({ preview, onAction }: { preview: ProductPreviewResult; onAction: (action: "confirm" | "edit" | "cancel") => void }) {
  return (
    <BorderBeam
      className="rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm my-2 max-w-lg"
      colorVariant="colorful"
      strength={0.9}
      borderRadius={16}
    >
      <div className="divide-y divide-border/40">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold">پێشبینی بەرهەمەکان</p>
              <p className="text-[10px] text-muted-foreground">{preview.count} بەرهەم دەردەچن لە فایلەکەوە</p>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="px-4 py-3 space-y-1.5 max-h-[300px] overflow-y-auto">
          {/* Table header */}
          <div className="flex items-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/30">
            <span className="flex-1">ناو</span>
            <span className="w-20 text-center">نرخ</span>
            <span className="w-16 text-center">سەرژمێر</span>
          </div>
          {preview.items.map((item, i) => (
            <div key={i} className="flex items-center text-[12px]">
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{item.name}</span>
                {(item.company || item.category) && (
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {[item.company, item.category].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <span className="w-20 text-center font-semibold text-foreground shrink-0">{item.price > 0 ? fmt(item.price) : "—"}</span>
              <span className="w-16 text-center text-muted-foreground shrink-0">{item.stock ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mx-4 pt-2.5 pb-1">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted-foreground">کۆی بەرهەمەکان</span>
            <span className="text-[15px] font-black text-primary">{preview.count}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pt-2 pb-4">
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-semibold text-[12px]"
            onClick={() => onAction("confirm")}
          >
            <Check className="size-3.5" /> پەسەندکردن
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-9 rounded-xl text-[12px]"
            onClick={() => onAction("edit")}
          >
            <Pencil className="size-3" /> دەستکاری
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-9 rounded-xl text-[12px] text-muted-foreground hover:text-destructive"
            onClick={() => onAction("cancel")}
          >
            <X className="size-3" /> پاشگەزبوون
          </Button>
        </div>
      </div>
    </BorderBeam>
  );
}

// ─── Products Bulk Result Card ────────────────────────────────────────────────
function ProductsBulkResultCard({ result }: { result: ProductBulkResult }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 space-y-3 my-2 max-w-lg">
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-lg flex items-center justify-center ${
          result.success ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}>
          {result.success
            ? <CheckCircle2 className="size-4 text-emerald-600" />
            : <AlertCircle className="size-4 text-red-600" />
          }
        </div>
        <div>
          <p className="text-[13px] font-bold">
            {result.count}/{result.total} بەرهەم زیادکران
          </p>
          <p className="text-[10px] text-muted-foreground">
            {result.success ? "سەرکەوتوو" : "هەندێک بەرهەم زیاد نەکران"}
          </p>
        </div>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            {item.success
              ? <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              : <AlertCircle className="size-3 text-red-500 shrink-0" />
            }
            <span className={item.success ? "" : "text-red-500"}>{item.name}</span>
            {item.error && <span className="text-[10px] text-red-400 ms-auto">{item.error}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolResultCards({ toolResults, onPreviewAction }: { toolResults: ToolResult[]; onPreviewAction: (action: "confirm" | "edit" | "cancel") => void }) {
  return (
    <>
      {toolResults.map((tr, i) => {
        const r = tr.result as Record<string, unknown>;
        if (tr.name === "preview_order" && r && (r as unknown as PreviewResult)?.preview) {
          return <OrderPreviewCard key={i} preview={r as unknown as PreviewResult} onAction={onPreviewAction} />;
        }
        if (tr.name === "create_order" && r) return <OrderCard key={i} order={r as unknown as OrderResult} />;
        if (tr.name === "create_bulk_orders" && (r as unknown as BulkResult)?.bulk) return <BulkOrderCard key={i} result={r as unknown as BulkResult} />;
        if (tr.name === "get_dashboard_stats" && r) return <StatsCard key={i} result={r as Record<string, number>} />;
        if (tr.name === "list_products" && Array.isArray(tr.result)) return <ProductsCard key={i} products={tr.result} />;
        if (tr.name === "list_clients" && Array.isArray(tr.result)) return <ClientsCard key={i} clients={tr.result} />;
        if (tr.name === "list_orders" && Array.isArray(tr.result)) return <OrdersListCard key={i} orders={tr.result} />;
        if (tr.name === "list_warehouses" && Array.isArray(tr.result)) return <WarehousesCard key={i} warehouses={tr.result as { id: string; name: string; city?: string }[]} />;
        // Product import tools
        if (tr.name === "preview_products" && r && (r as unknown as ProductPreviewResult)?.preview) {
          return <ProductsPreviewCard key={i} preview={r as unknown as ProductPreviewResult} onAction={onPreviewAction} />;
        }
        if (tr.name === "create_products" && r) {
          return <ProductsBulkResultCard key={i} result={r as unknown as ProductBulkResult} />;
        }
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
function ChatRow({ msg, user, onPreviewAction }: {
  msg: ChatMessage;
  user: { name: string; avatarUrl: string } | null;
  onPreviewAction: (action: "confirm" | "edit" | "cancel") => void;
}) {
  const isUser = msg.role === "user";

  if (msg.loading) {
    return (
      <Message align="start">
        <MessageAvatar className="size-8 rounded-full overflow-hidden shrink-0 p-0 border-0 bg-transparent">
          <AiAura state="thinking" className="size-8" />
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
        <MessageAvatar className="size-8 rounded-full overflow-hidden shrink-0 p-0 border-0 bg-transparent">
          <AiAura state="idle" className="size-8" />
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
            <ToolResultCards toolResults={msg.toolResults} onPreviewAction={onPreviewAction} />
          </div>
        )}
      </MessageContent>
      {isUser && (
        <MessageAvatar className="size-8 rounded-full overflow-hidden shrink-0 p-0 border-0 bg-transparent">
          <OreoAvatar src={user?.avatarUrl} name={user?.name || "?"} size={32} className="size-8" />
        </MessageAvatar>
      )}
    </Message>
  );
}

// ─── Session Panel ────────────────────────────────────────────────────────────
function SessionPanel({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: {
  sessions: AiSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-sm font-bold">گفتوگۆکان</SheetTitle>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 rounded-lg text-[12px]" onClick={onNew}>
            <Plus className="size-3" /> نوێ
          </Button>
        </div>
      </SheetHeader>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-3 py-3">
          {sessions.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-8">هیچ گفتوگۆیەک نییە</p>
          )}
          {sessions.map(s => {
            const isActive = s.id === activeId;
            const msgCount = s.messages.filter(m => !m.loading).length;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "group w-full text-start rounded-xl px-3.5 py-3 transition-all",
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <MessageSquare className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] font-semibold truncate leading-tight",
                      isActive && "text-primary"
                    )}>
                      {s.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-2.5" /> {timeAgo(s.updatedAt)}
                      </span>
                      <span>{msgCount} پەیام</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    className="size-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AiPage() {
  const { currentUser } = useLayout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [inputValue, setInputValue] = useState("");

  // ── Session management ───────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Auto-save current session whenever messages change (skip empty/loading-only)
  useEffect(() => {
    const realMessages = messages.filter(m => !m.loading);
    if (realMessages.length === 0) return;

    setSessions(prev => {
      const existing = prev.find(s => s.id === sessionId);
      const now = Date.now();
      const title = autoTitle(realMessages);

      let updated: AiSession[];
      if (existing) {
        updated = prev.map(s => s.id === sessionId
          ? { ...s, messages: realMessages, title, updatedAt: now }
          : s
        );
      } else {
        updated = [{ id: sessionId, title, messages: realMessages, createdAt: now, updatedAt: now }, ...prev];
      }
      // Sort by updatedAt descending
      updated.sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessions(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setHistoryOpen(false);
  }, []);

  const switchSession = useCallback((id: string) => {
    const session = loadSessions().find(s => s.id === id);
    if (session) {
      setSessionId(session.id);
      // Mark all messages as non-animated so they render instantly
      setMessages(session.messages.map(m => ({ ...m, animated: false })));
    }
    setHistoryOpen(false);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    const updated = deleteSession(id);
    setSessions(updated);
    // If deleting the active session, start fresh
    if (id === sessionId) {
      setSessionId(crypto.randomUUID());
      setMessages([]);
    }
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string, fileData?: AIInputFileData) => {
    if ((!text.trim() && !fileData) || loading) return;
    const displayText = fileData ? (text.trim() || `📎 ${fileData.name}`) : text.trim();
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: displayText };
    const loadingMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.text }));
      const body: Record<string, unknown> = { messages: history, voiceMode };
      if (fileData) {
        body.fileData = { base64: fileData.base64, mimeType: fileData.mimeType, name: fileData.name };
      }
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [messages, loading, voiceMode]);

  // Preview action handler
  const handlePreviewAction = useCallback((action: "confirm" | "edit" | "cancel") => {
    const prompts = {
      confirm: "بەڵێ, پەسەندە — دروستی بکە",
      edit: "دەتەوێت دەستکاری بکەم",
      cancel: "نەخێر, هەڵیوەشێنەرەوە",
    };
    sendMessage(prompts[action]);
  }, [sendMessage]);

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

  // Stable ref so TTS onended always calls the latest handleMic
  const handleMicRef = useRef(handleMic);
  useEffect(() => { handleMicRef.current = handleMic; }, [handleMic]);

  // ── TTS: play AI response in voice mode ─────────────────────────────────────
  const voiceModeRef = useRef(voiceMode);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Strip markdown for cleaner TTS speech
  const toSpeechText = (raw: string) =>
    raw.replace(/[#*`_~>\[\]()]/g, "").replace(/\n+/g, " ").trim();

  const playTTS = useCallback(async (rawText: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(true);

    const text = toSpeechText(rawText);
    const afterSpeak = () => {
      setSpeaking(false);
      if (voiceModeRef.current) setTimeout(() => handleMicRef.current(), 400);
    };

    // ElevenLabs TTS — eleven_multilingual_v2 understands Kurdish Sorani
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; afterSpeak(); };
        audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; afterSpeak(); };
        await audio.play();
        return;
      }
      console.error("TTS response not ok:", res.status, await res.text());
    } catch (e) {
      console.error("TTS fetch error:", e);
    }
    // If TTS fails, still re-enable mic so conversation can continue
    afterSpeak();
  }, []);

  // Auto-play TTS when a new completed assistant message arrives in voice mode
  useEffect(() => {
    if (!voiceMode) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.loading || !last.text) return;
    playTTS(last.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => {
      const next = !prev;
      if (!next) {
        // Turning OFF: stop playback and recording
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setSpeaking(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        setListening(false);
      }
      return next;
    });
  }, []);

  // When voice mode turns ON, auto-start the mic
  useEffect(() => {
    if (voiceMode && !listening && !speaking && !loading) {
      const t = setTimeout(() => handleMicRef.current(), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between py-4 px-1 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-xl flex items-center justify-center shadow-sm transition-all ${voiceMode ? "bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/30 animate-pulse" : "bg-gradient-to-br from-primary to-violet-500 shadow-primary/30"}`}>
            {voiceMode && speaking ? <Volume2 className="size-4 text-white" /> : <Sparkles className="size-4 text-white" />}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Dewa AI</h1>
            <p className="text-xs text-muted-foreground">
              {voiceMode ? (speaking ? "🔊 گوێدەگرم…" : listening ? "🎙️ قسەبکە…" : "دەنگی چالاکە") : "Gemini · ئاژیاری زیرەک"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={voiceMode ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 ${voiceMode ? "bg-red-500 hover:bg-red-600 border-0 text-white" : ""}`}
            onClick={toggleVoiceMode}
          >
            {voiceMode ? <PhoneOff className="size-3.5" /> : <Phone className="size-3.5" />}
            {voiceMode ? "دەنگ کۆتابی بهێنە" : "گفتوگۆی دەنگی"}
          </Button>
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 relative cursor-pointer"
            >
              <History className="size-3.5" />
              گفتوگۆکان
              {sessions.length > 0 && (
                <span className="absolute -top-1.5 -left-1.5 size-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {sessions.length}
                </span>
              )}
            </SheetTrigger>

            <SheetContent side="left" className="w-80 p-0">
              <SessionPanel
                sessions={sessions}
                activeId={sessionId}
                onSelect={switchSession}
                onDelete={handleDeleteSession}
                onNew={startNewSession}
              />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={startNewSession}
            disabled={isEmpty || loading}
          >
            <RotateCwIcon className="size-3.5" />
            گفتوگۆی نوێ
          </Button>
        </div>
      </div>

      {/* ── Live Voice Overlay ── */}
      {voiceMode && (
        <div className="shrink-0 mx-1 mb-3 rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-muted/20 p-5 flex flex-col items-center gap-4 shadow-inner">
          {/* Animated orb */}
          <div className="relative flex items-center justify-center">
            {/* Outer pulse rings */}
            {speaking && (
              <>
                <div className="absolute size-24 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "1.2s" }} />
                <div className="absolute size-20 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: "0.9s", animationDelay: "0.15s" }} />
              </>
            )}
            {listening && !speaking && (
              <>
                <div className="absolute size-24 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "1.4s" }} />
                <div className="absolute size-20 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: "1.1s", animationDelay: "0.2s" }} />
              </>
            )}
            {/* Central orb */}
            <div className={`size-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              speaking
                ? "bg-gradient-to-br from-primary to-violet-500 shadow-primary/40 scale-110"
                : listening
                ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/40 scale-105"
                : "bg-muted border-2 border-border"
            }`}>
              {speaking
                ? <Volume2 className="size-7 text-white" />
                : listening
                ? <div className="flex items-end gap-[3px] h-7">
                    {[3,5,7,5,4,6,3].map((h, i) => (
                      <div key={i} className="w-[3px] bg-white rounded-full animate-bounce"
                        style={{ height: h * 4, animationDelay: `${i * 80}ms`, animationDuration: "600ms" }} />
                    ))}
                  </div>
                : <Phone className="size-6 text-muted-foreground" />
              }
            </div>
          </div>

          {/* Waveform bars — shown when speaking */}
          {speaking && (
            <div className="flex items-center gap-[3px] h-8">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-[3px] rounded-full bg-primary animate-bounce"
                  style={{
                    height: `${20 + Math.sin(i * 0.8) * 14}px`,
                    animationDelay: `${i * 60}ms`,
                    animationDuration: "700ms",
                  }} />
              ))}
            </div>
          )}

          {/* Status text */}
          <div className="text-center">
            <p className="text-sm font-bold">
              {speaking ? "🔊 ئاژیارەکە وەڵام دەداتەوە…" : listening ? "🎙️ گوێ دەگرێت — قسە بکە" : transcribing ? "⏳ وەرگێڕانی دەنگ…" : "✋ چاوەڕوان…"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {speaking ? "نا، ئاژیارەکە قسە دەکات" : listening ? "کرتەی مایکرۆفۆن بکە بۆ کۆتایی هێنان" : "دەستپێکردنی خودکار…"}
            </p>
          </div>

          {/* Tap to stop / manual controls */}
          <div className="flex gap-2">
            {listening && (
              <Button size="sm" variant="destructive" onClick={handleMic} className="gap-1.5 rounded-full px-4">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                کۆتایی هێنانی تۆمارکردن
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={toggleVoiceMode} className="gap-1.5 rounded-full px-4">
              <PhoneOff className="size-3.5" /> دەرچوون
            </Button>
          </div>
        </div>
      )}

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
                      <ChatRow msg={msg} user={currentUser} onPreviewAction={handlePreviewAction} />
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
        <BorderBeam
          size="md"
          colorVariant="colorful"
          strength={0.9}
          theme="auto"
          borderRadius={16}
        >
        <AIInput
          menuItems={menuItems}
          settingGroups={settingGroups}
          listening={listening}
          onMenuSelect={(value) => {
            const prompt = MENU_PROMPTS[value];
            if (prompt) sendMessage(prompt);
          }}
          onSend={(message, meta) => sendMessage(message, meta?.fileData)}
          onMic={handleMic}
          placeholder={listening ? "🎙️ گوێدەگرم… (دووبارە کلیک بکە بۆ ناردن)" : transcribing ? "⏳ وەرگێڕانی دەنگ…" : loading ? "جواب دەدرێتەوە…" : "پەیامێک بنوسێ…"}
        />
        </BorderBeam>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Gemini · Dewa {new Date().getFullYear()} · هەموو وەڵامەکان دەتوانن هەڵەش بن
        </p>
      </div>
    </div>
  );
}
