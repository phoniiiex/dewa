import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_KEY = (process.env.GEMINI_API_KEY ?? "").trim();
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Shared item schema (used by create_order, preview_order, create_bulk_orders) ──
const orderItemSchema = {
  type: "object",
  required: ["product_id", "product_name", "quantity", "unit_price"],
  properties: {
    product_id:          { type: "string" },
    product_name:        { type: "string" },
    quantity:            { type: "integer", description: "Number of units" },
    unit_price:          { type: "number", description: "Price in IQD — never 0" },
    bonus_qty:           { type: "integer", description: "Bonus units (free items) given to client. Default 0." },
    bonus_pct:           { type: "number", description: "Bonus percentage applied. Default 0." },
    warehouse_bonus_qty: { type: "integer", description: "Bonus units sent through the warehouse. Default 0." },
    rep_bonus_qty:       { type: "integer", description: "Bonus units the representative keeps. Default 0." },
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
  items: {
    type: "array",
    description: "Line items for the order",
    items: orderItemSchema,
  },
};

// ── Gemini function declarations ───────────────────────────────────────────
const functionDeclarations = [
  {
    name: "get_dashboard_stats",
    description: "Get today's sales stats: total orders, revenue, delivered count, waiting count.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_orders",
    description: "List recent orders, optionally filtered by status or client name.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 10)" },
        status: { type: "string", description: "WAITING | IN_PROGRESS | READY | SENT | DELIVERED | PAID | NOT_ACCEPTED" },
        client_name: { type: "string", description: "Partial client name to filter by" },
      },
    },
  },
  {
    name: "list_products",
    description: "List products, optionally filtered by name or low-stock flag.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        search: { type: "string", description: "Product name to search" },
        low_stock: { type: "boolean", description: "If true, return only low-stock products" },
      },
    },
  },
  {
    name: "list_clients",
    description: "List clients / pharmacies, optionally filtered by name or city.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        search: { type: "string" },
      },
    },
  },
  {
    name: "list_warehouses",
    description: "List all active warehouses.",
    parameters: {
      type: "object",
      properties: { search: { type: "string" } },
    },
  },
  {
    name: "preview_order",
    description:
      "Build a detailed preview of an order WITHOUT creating it. " +
      "Returns a structured object so the user can review before confirming. " +
      "ALWAYS call this before create_order — never create directly.",
    parameters: {
      type: "object",
      required: ["client_id", "client_name", "items"],
      properties: orderParamsProperties,
    },
  },
  {
    name: "create_order",
    description:
      "Create and save a single order to the database. " +
      "Only call AFTER the user has confirmed a preview_order result. " +
      "Use real IDs and prices from the preloaded data. Never use 0 as unit_price.",
    parameters: {
      type: "object",
      required: ["client_id", "client_name", "items"],
      properties: orderParamsProperties,
    },
  },
  {
    name: "create_bulk_orders",
    description:
      "Create MULTIPLE orders at once. Ideal for bulk entry where many clients get orders in one request. " +
      "Still requires preview confirmation for each.",
    parameters: {
      type: "object",
      required: ["orders"],
      properties: {
        orders: {
          type: "array",
          description: "Array of orders to create",
          items: {
            type: "object",
            required: ["client_id", "client_name", "items"],
            properties: orderParamsProperties,
          },
        },
      },
    },
  },
  {
    name: "update_order_status",
    description: "Update the status of an existing order.",
    parameters: {
      type: "object",
      required: ["order_id", "new_status"],
      properties: {
        order_id:   { type: "string" },
        new_status: { type: "string", description: "WAITING | IN_PROGRESS | READY | SENT | DELIVERED | PAID | NOT_ACCEPTED" },
      },
    },
  },
];

// ── Tool executors ──────────────────────────────────────────────────────────

/** Normalise an item coming from Gemini into a consistent shape */
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

/** Build an order preview WITHOUT inserting into DB */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPreview(args: Record<string, any>): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (args.items as Record<string, any>[]) || [];
  const items = raw.map(normaliseItem);

  const zeroItem = items.find(i => i.unit_price === 0);
  if (zeroItem) return { error: `unit_price is 0 for "${zeroItem.product_name}" — use the real price` };

  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalBonusQty = items.reduce((s, i) => s + i.bonus_qty, 0);

  return {
    preview:       true,
    clientId:      args.client_id,
    clientName:    args.client_name,
    repId:         args.rep_id    || null,
    repName:       args.rep_name  || null,
    warehouseId:   args.warehouse_id   || null,
    warehouseName: args.warehouse_name || null,
    notes:         args.notes || "",
    totalAmount,
    totalBonusQty,
    items: items.map(i => ({
      productName: i.product_name,
      quantity:    i.quantity,
      unitPrice:   i.unit_price,
      total:       i.quantity * i.unit_price,
      bonusQty:    i.bonus_qty,
      bonusPct:    i.bonus_pct,
    })),
  };
}

/** Actually create one order in the database */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createOneOrder(args: Record<string, any>): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (args.items as Record<string, any>[]) || [];
  const items = raw.map(normaliseItem);

  const zeroItem = items.find(i => i.unit_price === 0);
  if (zeroItem) return { error: `unit_price is 0 for "${zeroItem.product_name}" — use the real price` };

  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const orderNumber = "ORD-" + String(Date.now()).slice(-6);

  const { data, error } = await supabase.from("orders").insert({
    order_number:        orderNumber,
    client_id:           args.client_id,
    client_name:         args.client_name,
    rep_id:              args.rep_id    || null,
    rep_name:            args.rep_name  || null,
    warehouse_id:        args.warehouse_id   || null,
    warehouse_name:      args.warehouse_name || null,
    status:              "WAITING",
    total_amount:        totalAmount,
    notes:               args.notes || "",
    items:               items.map(i => ({
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
    success:       true,
    orderNumber,
    id:            (data as Record<string, unknown>)?.id,
    clientName:    args.client_name,
    repName:       args.rep_name    || null,
    warehouseName: args.warehouse_name || null,
    totalAmount,
    status:        "WAITING",
    items:         items.map(i => ({
      productName: i.product_name, quantity: i.quantity,
      unitPrice: i.unit_price, total: i.quantity * i.unit_price,
      bonusQty: i.bonus_qty,
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
        totalOrders:  orders.length,
        totalRevenue: orders.reduce((s, o) => s + ((o.total_amount as number) || 0), 0),
        delivered:    orders.filter(o => o.status === "DELIVERED" || o.status === "PAID").length,
        waiting:      orders.filter(o => o.status === "WAITING").length,
      };
    }

    case "list_orders": {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit((args.limit as number) || 10);
      if (args.status)      q = q.eq("status", args.status);
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
      let products: any[] = data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (args.low_stock) products = products.filter((p: any) => p.stock <= (p.low_stock_threshold ?? p.low_stock ?? 10));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return products.map((p: any) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category }));
    }

    case "list_clients": {
      let q = supabase.from("clients").select("*").eq("is_active", true).order("name").limit((args.limit as number) || 20);
      if (args.search) q = q.or(`name.ilike.%${args.search}%,city.ilike.%${args.search}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data?.map((c: any) => ({ id: c.id, name: c.name, city: c.city, type: c.type }));
    }

    case "list_warehouses": {
      let q = supabase.from("warehouses").select("id, name, city").eq("is_active", true).order("name");
      if (args.search) q = q.or(`name.ilike.%${args.search}%,city.ilike.%${args.search}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return data;
    }

    case "preview_order":
      return buildPreview(args as Record<string, unknown>);

    case "create_order":
      return createOneOrder(args as Record<string, unknown>);

    case "create_bulk_orders": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderArgs = (args.orders as Record<string, any>[]) || [];
      const results = await Promise.all(orderArgs.map(o => createOneOrder(o)));
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

// ── System prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dewa AI — a smart assistant for the Dewa pharmaceutical distribution system (دەوا).

Language: Respond in the same language the user writes in (Kurdish Sorani, Arabic, or English).

## IMPORTANT RULES:
- You have ALL products, clients, warehouses, and reps preloaded below with their exact IDs.
- Match names using fuzzy matching (Kurdish spelling variants, partial names).
- NEVER set unit_price to 0. Always use the real price from the preloaded data.
- NEVER fabricate IDs. Use only IDs from the preloaded lists.
- After creating orders, summarize what was done.

## ORDER CREATION WORKFLOW (CRITICAL — follow exactly):
1. When the user wants to create an order, gather ALL required information FIRST by asking follow-up questions:
   - **Client** (REQUIRED) — "بۆ کام کڕیار؟" if not mentioned
   - **Products + quantities** (REQUIRED) — "کام بەرهەم و چەند دانە؟" if not mentioned
   - **Representative** (REQUIRED) — "کام نوێنەر؟" if not mentioned
   - **Warehouse** (OPTIONAL) — "ڕاستەوخۆیە یان لە ڕێگەی کۆگاوە؟" if not clear
   - **Bonus** (OPTIONAL) — "بۆنەس زیاد بکەم؟" if not mentioned
   - **Notes** (OPTIONAL) — you may skip asking about notes unless it feels natural

2. If ANY required field is missing, ask a polite follow-up. Do NOT guess or skip required fields.

3. Once ALL required data is gathered, call **preview_order** FIRST — NEVER call create_order directly.

4. After preview_order returns, the frontend will show a confirmation card. Wait for the user's response:
   - If user says yes/confirm/بەڵێ → call create_order with the SAME data
   - If user wants to edit → ask what to change, then call preview_order again
   - If user cancels → acknowledge and do NOT create the order

5. For multiple orders: gather all info, preview each, then create_bulk_orders after confirmation.

## Currency format: [amount] دینار`;

// Voice mode: always Kurdish Sorani, short & spoken
const VOICE_SYSTEM_PROMPT = `تۆ دەوا AI یت — یاریدەدەری زیرەک بۆ سیستەمی دابەشکردنی دەرمانی دەوا.

## زمان:
هەمیشە بە کوردی سۆرانی وەڵام بدەرەوە — تەنها کوردی، هیچ زمانێکی تر نەبێت.
وەڵامەکانت کورت و گفتوگۆیی بێت — وەک کە ئەواتە قسە دەکەیت بۆ کەس، نەک نووسین.
جووڵەی کەمتر بکەرەوە، ژمارە کەمتر، تەنها کتێبی دەنگی ئاسان.
دواتر: هیچ markdown (*, #, _) بەکار مەهێنە — تەنها دەنگی ساف.

## ڕێگای دروستکردنی داواکاری (گرنگ):
1. سەرەتا هەموو زانیاری پێویست کۆبکەوە — کڕیار، بەرهەم، نوێنەر — بپرسە ئەگەر نەبوو.
2. پاشان preview_order بانگ بکە — هیچکات ڕاستەوخۆ create_order بانگ مەکە.
3. چاوەڕوانی پەسەندکردنی بەکارهێنەر بکە.
4. ئەگەر بەکارهێنەر بەڵێ گوت، create_order بانگ بکە بە هەمان داتا.

## دەستووری گرنگ:
- هەموو کاڵا، کڕیار، کۆگا، و نوێنەرەکان لێرەیان خوارەوە بارکراون.
- لگەڵ ناوەکان فێری فووچ-میتچ بکە (جیاوازی ئیملای کوردی، ناوی نیوەیی).
- هیچکات unit_price ٠ مەکەرەوە. هەمیشە نرخی ڕاستەقینە بەکار بهێنە.
- هیچ IDی جەعڵی مەکەرەوە. تەنها IDی لیستەکانی خوارەوە بەکار بهێنە.
- بۆ داواکاریەک: preview_order بەکار بهێنە سەرەتا.
- بۆ چەند داواکاری لەیەکدا: create_bulk_orders (یەک بانگهێشت بۆ هەمووی) — دوای پەسەندکردن.
- دوای دروستکردنی داواکاری، کورتەی ئەنجامەکان بگو.

## فۆرمتی دراوسێ: [مبلغ] دینار`;


// ── Main handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages, voiceMode } = await req.json() as {
      messages: { role: string; content: string }[];
      voiceMode?: boolean;
    };

    // Pre-load all reference data into the system prompt
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
${(products || []).map(p => `ID:${p.id} | ${p.name} | ${p.price}دینار | stock:${p.stock}`).join("\n")}

### Clients (کڕیارەکان):
${(clients || []).map(c => `ID:${c.id} | ${c.name}${c.city ? ` | ${c.city}` : ""}`).join("\n")}

### Warehouses (کۆگاکان):
${(warehouses || []).map(w => `ID:${w.id} | ${w.name}`).join("\n")}

### Reps (نوێنەرەکان):
${(reps || []).map(r => `ID:${r.id} | ${r.name}`).join("\n")}`;

    const systemPrompt = (voiceMode ? VOICE_SYSTEM_PROMPT : SYSTEM_PROMPT) + dataContext;

    // Build Gemini-native conversation history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geminiHistory: Array<{ role: "user" | "model"; parts: any[] }> = [
      ...messages.slice(0, -1).map(m => ({
        role: (m.role === "user" ? "user" : "model") as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: messages[messages.length - 1].content }] },
    ];

    const toolResults: { name: string; result: unknown }[] = [];

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
        let msg = raw;
        try { msg = JSON.parse(raw)?.error?.message ?? raw; } catch { /* noop */ }
        console.error("[Gemini] error:", msg);
        return NextResponse.json({ error: `Gemini: ${msg}` }, { status: 500 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      const candidate = data.candidates?.[0];

      if (!candidate) {
        const reason = data.promptFeedback?.blockReason ?? "NO_CANDIDATE";
        return NextResponse.json({ error: `Gemini blocked: ${reason}` }, { status: 500 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = candidate.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fnCalls = parts.filter((p: any) => p.functionCall);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textParts = parts.filter((p: any) => p.text);

      if (fnCalls.length === 0) {
        const text = textParts.map((p: { text: string }) => p.text).join("");
        return NextResponse.json({ text, toolResults });
      }

      // Push model turn (with function calls)
      geminiHistory.push({ role: "model", parts });

      // Execute tools, collect responses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseParts: any[] = [];
      for (const part of fnCalls) {
        const fc = part.functionCall as { name: string; args: Record<string, unknown> };
        const result = await executeTool(fc.name, fc.args);
        toolResults.push({ name: fc.name, result });
        // Gemini's functionResponse.response must be a proto Struct (object), never an array.
        // Wrap any array result in { items: [...] } to satisfy the schema.
        const geminiResult = Array.isArray(result) ? { items: result } : (result as Record<string, unknown>);
        responseParts.push({ functionResponse: { name: fc.name, response: geminiResult } });
      }

      // Push function responses as user turn (Gemini native format)
      geminiHistory.push({ role: "user", parts: responseParts });
    }

    return NextResponse.json({ text: "تکایە دووبارە هەوڵ بدەرەوە.", toolResults });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
