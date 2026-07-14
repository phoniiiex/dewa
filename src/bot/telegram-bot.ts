/**
 * Dewa Telegram Bot
 * 
 * A full AI assistant for the Dewa pharmaceutical system, running on Telegram.
 * Uses the same Gemini AI + Supabase tools as the web app.
 * 
 * Run: npx tsx src/bot/telegram-bot.ts
 */

import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const GEMINI_KEY = (process.env.GEMINI_API_KEY ?? "").trim();
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

if (!BOT_TOKEN) { console.error("❌ TELEGRAM_BOT_TOKEN is missing"); process.exit(1); }
if (!GEMINI_KEY) { console.error("❌ GEMINI_API_KEY is missing"); process.exit(1); }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Conversation history per chat ──────────────────────────────────────────
const chatHistories = new Map<number, Array<{ role: string; content: string }>>();
const MAX_HISTORY = 30; // max messages per chat

function getHistory(chatId: number) {
  if (!chatHistories.has(chatId)) chatHistories.set(chatId, []);
  return chatHistories.get(chatId)!;
}

function addToHistory(chatId: number, role: string, content: string) {
  const h = getHistory(chatId);
  h.push({ role, content });
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
}

// ── Tool definitions (same as route.ts) ────────────────────────────────────
const orderItemSchema = {
  type: "object",
  required: ["product_id", "product_name", "quantity", "unit_price"],
  properties: {
    product_id:          { type: "string" },
    product_name:        { type: "string" },
    quantity:            { type: "integer" },
    unit_price:          { type: "number" },
    bonus_qty:           { type: "integer" },
    bonus_pct:           { type: "number" },
    warehouse_bonus_qty: { type: "integer" },
    rep_bonus_qty:       { type: "integer" },
  },
};

const orderParamsProperties = {
  client_id:      { type: "string" },
  client_name:    { type: "string" },
  rep_id:         { type: "string" },
  rep_name:       { type: "string" },
  warehouse_id:   { type: "string" },
  warehouse_name: { type: "string" },
  notes:          { type: "string" },
  items: { type: "array", items: orderItemSchema },
};

const functionDeclarations = [
  {
    name: "get_dashboard_stats",
    description: "Get today's sales stats: total orders, revenue, delivered, waiting.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_orders",
    description: "List recent orders, optionally filtered by status or client.",
    parameters: {
      type: "object",
      properties: {
        status:      { type: "string", enum: ["WAITING", "DELIVERED", "PAID", "CANCELLED", "RETURNED"] },
        client_name: { type: "string" },
        limit:       { type: "integer" },
      },
    },
  },
  {
    name: "list_products",
    description: "List products, optionally filtered by name.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit:  { type: "integer" },
      },
    },
  },
  {
    name: "list_clients",
    description: "List clients, optionally filtered by name.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit:  { type: "integer" },
      },
    },
  },
  {
    name: "preview_order",
    description: "Build a preview of an order WITHOUT creating it. ALWAYS call this before create_order.",
    parameters: { type: "object", required: ["client_id", "client_name", "items"], properties: orderParamsProperties },
  },
  {
    name: "create_order",
    description: "Create and save a single order. Only after user confirms preview.",
    parameters: { type: "object", required: ["client_id", "client_name", "items"], properties: orderParamsProperties },
  },
  {
    name: "create_bulk_orders",
    description: "Create multiple orders at once.",
    parameters: {
      type: "object",
      required: ["orders"],
      properties: { orders: { type: "array", items: { type: "object", required: ["client_id", "client_name", "items"], properties: orderParamsProperties } } },
    },
  },
  {
    name: "update_order_status",
    description: "Update status of an existing order.",
    parameters: {
      type: "object",
      required: ["order_id", "new_status"],
      properties: {
        order_id:   { type: "string" },
        new_status: { type: "string", enum: ["WAITING", "DELIVERED", "PAID", "CANCELLED", "RETURNED"] },
      },
    },
  },
];

// ── Tool executors ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseItem(i: Record<string, any>) {
  return {
    product_id:          String(i.product_id   ?? i.productId   ?? ""),
    product_name:        String(i.product_name ?? i.productName ?? ""),
    quantity:            Number(i.quantity  ?? 1),
    unit_price:          Number(i.unit_price ?? i.unitPrice ?? 0),
    bonus_qty:           Number(i.bonus_qty ?? i.bonusQty ?? 0),
    bonus_pct:           Number(i.bonus_pct ?? i.bonusPct ?? 0),
    warehouse_bonus_qty: Number(i.warehouse_bonus_qty ?? i.warehouseBonusQty ?? 0),
    rep_bonus_qty:       Number(i.rep_bonus_qty ?? i.repBonusQty ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPreview(args: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (args.items as Record<string, any>[]) || [];
  const items = raw.map(normaliseItem);
  const zeroItem = items.find(i => i.unit_price === 0);
  if (zeroItem) return { error: `unit_price is 0 for "${zeroItem.product_name}" — use the real price` };
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalBonusQty = items.reduce((s, i) => s + i.bonus_qty, 0);
  return {
    preview: true, clientName: args.client_name, repName: args.rep_name || null,
    warehouseName: args.warehouse_name || null, notes: args.notes || "",
    totalAmount, totalBonusQty,
    items: items.map(i => ({
      productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price,
      total: i.quantity * i.unit_price, bonusQty: i.bonus_qty,
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createOneOrder(args: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (args.items as Record<string, any>[]) || [];
  const items = raw.map(normaliseItem);
  const zeroItem = items.find(i => i.unit_price === 0);
  if (zeroItem) return { error: `unit_price is 0 for "${zeroItem.product_name}"` };
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const orderNumber = "ORD-" + String(Date.now()).slice(-6);
  const { data, error } = await supabase.from("orders").insert({
    order_number: orderNumber, client_id: args.client_id, client_name: args.client_name,
    rep_id: args.rep_id || null, rep_name: args.rep_name || null,
    warehouse_id: args.warehouse_id || null, warehouse_name: args.warehouse_name || null,
    status: "WAITING", total_amount: totalAmount, notes: args.notes || "",
    items: items.map(i => ({
      productId: i.product_id, productName: i.product_name,
      quantity: i.quantity, unitPrice: i.unit_price,
      bonusQty: i.bonus_qty, bonusPct: i.bonus_pct,
      warehouseBonusQty: i.warehouse_bonus_qty, repBonusQty: i.rep_bonus_qty,
    })),
    driver_id: null, driver_name: "", driver_phone: "",
    signed_invoice_url: "", signed_receipt_url: "", rejection_reason: "",
  }).select().single();
  if (error) return { error: error.message };
  return {
    success: true, orderNumber, id: (data as Record<string, unknown>)?.id,
    clientName: args.client_name, repName: args.rep_name || null,
    warehouseName: args.warehouse_name || null, totalAmount, status: "WAITING",
    items: items.map(i => ({
      productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price,
      total: i.quantity * i.unit_price, bonusQty: i.bonus_qty,
    })),
  };
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_dashboard_stats": {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("orders").select("total_amount, status").gte("created_at", today);
      const orders = data || [];
      return {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((s, o) => s + ((o.total_amount as number) || 0), 0),
        delivered: orders.filter(o => o.status === "DELIVERED" || o.status === "PAID").length,
        waiting: orders.filter(o => o.status === "WAITING").length,
      };
    }
    case "list_orders": {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit((args.limit as number) || 10);
      if (args.status) q = q.eq("status", args.status);
      if (args.client_name) q = q.ilike("client_name", `%${args.client_name}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data?.map((o: any) => ({ id: o.id, orderNumber: o.order_number, client: o.client_name, status: o.status, total: o.total_amount, items: o.items, createdAt: o.created_at }));
    }
    case "list_products": {
      let q = supabase.from("products").select("*").eq("is_active", true).order("name").limit((args.limit as number) || 20);
      if (args.search) q = q.ilike("name", `%${args.search}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data?.map((p: any) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category }));
    }
    case "list_clients": {
      let q = supabase.from("clients").select("*").eq("is_active", true).order("name").limit((args.limit as number) || 20);
      if (args.search) q = q.ilike("name", `%${args.search}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data?.map((c: any) => ({ id: c.id, name: c.name, city: c.city, phone: c.phone }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "preview_order": return buildPreview(args as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "create_order": return createOneOrder(args as any);
    case "create_bulk_orders": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordersArr = (args.orders as any[]) || [];
      const results = [];
      for (const o of ordersArr) results.push(await createOneOrder(o));
      return { bulk: true, count: results.length, orders: results };
    }
    case "update_order_status": {
      const { error } = await supabase.from("orders").update({ status: args.new_status }).eq("id", args.order_id);
      if (error) return { error: error.message };
      return { success: true, message: `Order status updated to ${args.new_status}` };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dewa Bot — the Telegram assistant for the Dewa pharmaceutical distribution system (دەوا).

Language: Respond in the same language the user writes in (Kurdish Sorani, Arabic, or English).
Keep responses SHORT and telegram-friendly — no long paragraphs. Use emojis for visual clarity.

## IMPORTANT RULES:
- You have ALL products, clients, warehouses, and reps preloaded below with their exact IDs.
- Match names using fuzzy matching (Kurdish spelling variants, partial names).
- NEVER set unit_price to 0. Always use the real price from the preloaded data.
- NEVER fabricate IDs. Use only IDs from the preloaded lists.
- After creating orders, summarize what was done.
- Format numbers with commas and "IQD" suffix.
- Use Telegram formatting: *bold*, _italic_, \`code\`.

## ORDER CREATION WORKFLOW (CRITICAL):
1. Gather ALL required info first by asking follow-up questions:
   - **Client** (REQUIRED) — "بۆ کام کڕیار؟"
   - **Products + quantities** (REQUIRED) — "کام بەرهەم و چەند دانە؟"
   - **Representative** (REQUIRED) — "کام نوێنەر؟"
   - **Warehouse** (OPTIONAL)
   - **Bonus** (OPTIONAL)
2. If ANY required field is missing, ask politely.
3. Call preview_order FIRST — never create directly.
4. Show the preview as a formatted message and ask user to confirm.
5. If user confirms → create_order. If edit → ask what to change. If cancel → stop.

## FOR STATS / QUERIES:
When user asks about orders, stats, products, clients — use the appropriate tool and format results nicely.

## Currency format: [amount] IQD`;

// ── Gemini AI call ─────────────────────────────────────────────────────────
async function askGemini(chatId: number, userText: string): Promise<string> {
  // Load reference data
  const [
    { data: products },
    { data: clients },
    { data: warehouses },
    { data: reps },
  ] = await Promise.all([
    supabase.from("products").select("id, name, price, stock").eq("is_active", true).order("name"),
    supabase.from("clients").select("id, name, city").eq("is_active", true).order("name"),
    supabase.from("warehouses").select("id, name, city").eq("is_active", true).order("name"),
    supabase.from("reps").select("id, name").order("name"),
  ]);

  const dataContext = `

## PRELOADED DATA (use these exact IDs):

### Products (کاڵاکان):
${(products || []).map(p => `ID:${p.id} | ${p.name} | ${p.price}IQD | stock:${p.stock}`).join("\n")}

### Clients (کڕیارەکان):
${(clients || []).map(c => `ID:${c.id} | ${c.name}${c.city ? ` | ${c.city}` : ""}`).join("\n")}

### Warehouses (کۆگاکان):
${(warehouses || []).map(w => `ID:${w.id} | ${w.name}`).join("\n")}

### Reps (نوێنەرەکان):
${(reps || []).map(r => `ID:${r.id} | ${r.name}`).join("\n")}`;

  const systemPrompt = SYSTEM_PROMPT + dataContext;

  // Build history
  addToHistory(chatId, "user", userText);
  const history = getHistory(chatId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geminiHistory: Array<{ role: "user" | "model"; parts: any[] }> = history.map(m => ({
    role: (m.role === "user" ? "user" : "model") as "user" | "model",
    parts: [{ text: m.content }],
  }));

  // Tool execution loop (max 8 iterations)
  for (let iter = 0; iter < 8; iter++) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiHistory,
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: {
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("[Gemini] error:", raw);
      return "⚠️ هەڵەیەک ڕوویدا لە پەیوەندی لەگەڵ AI.";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const candidate = data.candidates?.[0];
    if (!candidate) return "⚠️ AI نەیتوانی وەڵام بدات.";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = candidate.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnCalls = parts.filter((p: any) => p.functionCall);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textParts = parts.filter((p: any) => p.text);

    // No function calls — return text
    if (fnCalls.length === 0) {
      const text = textParts.map((p: { text: string }) => p.text).join("");
      addToHistory(chatId, "assistant", text);
      return text;
    }

    // Push model turn
    geminiHistory.push({ role: "model", parts });

    // Execute tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseParts: any[] = [];
    for (const part of fnCalls) {
      const fc = part.functionCall as { name: string; args: Record<string, unknown> };
      console.log(`  🔧 Tool: ${fc.name}`);
      const result = await executeTool(fc.name, fc.args);
      const geminiResult = Array.isArray(result) ? { items: result } : (result as Record<string, unknown>);
      responseParts.push({ functionResponse: { name: fc.name, response: geminiResult } });
    }

    geminiHistory.push({ role: "user", parts: responseParts });
  }

  return "تکایە دووبارە هەوڵ بدەرەوە.";
}

// ── Start the bot ──────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("🤖 Dewa Telegram Bot is running! (@dewaadminbot)");
console.log("   Press Ctrl+C to stop.\n");

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  chatHistories.delete(chatId); // reset history
  bot.sendMessage(chatId,
    "👋 *بەخێربێیت بۆ دەوا بۆت!*\n\n" +
    "من یاریدەدەرەکەی تۆم بۆ سیستەمی دابەشکردنی دەرمانی دەوا.\n\n" +
    "دەتوانم یارمەتیت بدەم لە:\n" +
    "📦 *داواکاری نوێ* — داواکاری دروست بکە\n" +
    "📊 *ئامار* — ئامار و ڕاپۆرتی ڕۆژانە\n" +
    "📋 *لیست* — لیستی بەرهەم، کڕیار، داواکاری\n" +
    "❓ *پرسیار* — هەر پرسیارێک بیت هەیە\n\n" +
    "تەنها پەیامێک بنوسە و من بۆت ئەنجامی دەدەم! 🚀",
    { parse_mode: "Markdown" }
  );
});

// /clear command — reset conversation
bot.onText(/\/clear/, (msg) => {
  chatHistories.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "🗑️ مێژووی گفتوگۆ پاککرایەوە. ئامادەم بۆ گفتوگۆیەکی نوێ!");
});

// /stats command — quick stats
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendChatAction(chatId, "typing");
  const reply = await askGemini(chatId, "ئامارەکانی ئەمڕۆ چییە؟");
  bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
});

// /orders command — recent orders
bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendChatAction(chatId, "typing");
  const reply = await askGemini(chatId, "لیستی دوایین داواکاریەکان نیشانم بدە");
  bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
});

// Handle all other messages
bot.on("message", async (msg) => {
  // Skip commands (already handled)
  if (msg.text?.startsWith("/")) return;
  if (!msg.text) return;

  const chatId = msg.chat.id;

  // Show typing indicator
  bot.sendChatAction(chatId, "typing");

  try {
    const reply = await askGemini(chatId, msg.text);

    // Split long messages (Telegram 4096 char limit)
    if (reply.length > 4000) {
      const chunks = reply.match(/[\s\S]{1,4000}/g) || [reply];
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" }).catch(() => {
          // Fallback without markdown if parsing fails
          bot.sendMessage(chatId, chunk);
        });
      }
    } else {
      await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" }).catch(() => {
        bot.sendMessage(chatId, reply);
      });
    }
  } catch (err) {
    console.error("Error processing message:", err);
    bot.sendMessage(chatId, "⚠️ ببورە، هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.");
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stopPolling();
  process.exit(0);
});
