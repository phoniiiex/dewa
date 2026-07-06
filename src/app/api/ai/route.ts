import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── AI Providers ─────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const GROQ_KEY   = process.env.GROQ_API_KEY!;

// Native Gemini endpoint (uses X-goog-api-key, NOT Authorization: Bearer)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

// Groq fallback — OpenAI-compatible
const GROQ_PROVIDERS = [
  { url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_KEY, model: "llama-3.3-70b-versatile" },
  { url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_KEY, model: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_KEY, model: "llama-3.1-8b-instant" },
];

// ── Supabase ───────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Tool definitions (OpenAI format) ──────────────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List recent orders from the system. Can filter by status or client name.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Max number of orders to return (default 10)" },
          status: { type: "string", description: "Filter by status: WAITING, IN_PROGRESS, READY, SENT, DELIVERED, PAID, NOT_ACCEPTED" },
          client_name: { type: "string", description: "Filter by client name (partial match)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description: "Get today's dashboard statistics: revenue, order count, delivered count.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "List products from the system. Can filter by name or low stock.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Max number of products to return (default 10)" },
          search: { type: "string", description: "Search by product name" },
          low_stock: { type: "boolean", description: "If true, return only low-stock products" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "List clients from the system.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Max number of clients to return (default 10)" },
          search: { type: "string", description: "Search by client name or city" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Create a new order in the system.",
      parameters: {
        type: "object",
        required: ["client_id", "client_name", "items"],
        properties: {
          client_id: { type: "string", description: "The client's ID" },
          client_name: { type: "string", description: "The client's display name" },
          rep_id: { type: "string", description: "The sales rep's ID (optional)" },
          rep_name: { type: "string", description: "The sales rep's name (optional)" },
          warehouse_id: { type: "string", description: "The warehouse ID (optional)" },
          warehouse_name: { type: "string", description: "The warehouse display name (optional)" },
          notes: { type: "string", description: "Order notes" },
          items: {
            type: "array",
            description: "Order line items.",
            items: {
              type: "object",
              properties: {
                product_id:   { type: "string",  description: "Product ID" },
                product_name: { type: "string",  description: "Product name" },
                quantity:     { type: "integer", description: "Quantity" },
                unit_price:   { type: "number",  description: "Unit price in IQD — never 0" },
              },
              required: ["product_id", "product_name", "quantity", "unit_price"],
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Update the status of an existing order.",
      parameters: {
        type: "object",
        required: ["order_id", "new_status"],
        properties: {
          order_id: { type: "string", description: "The order's ID" },
          new_status: { type: "string", description: "New status: WAITING, IN_PROGRESS, READY, SENT, DELIVERED, PAID, NOT_ACCEPTED" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_client_by_name",
      description: "Find a client by their name to get their ID.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Client name to search for" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_product_by_name",
      description: "Find a product by name to get its ID and price.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Product name to search for" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_warehouses",
      description: "List all available warehouses (کۆگاکان) in the system.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Optional: search by warehouse name or city" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_warehouse_by_name",
      description: "Find a warehouse (کۆگا) by name to get its ID. Use this before creating an order that involves a warehouse.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Warehouse name or partial name to search for" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_rep_by_name",
      description: "Find a sales representative (نوێنەر) by name to get their ID. Use this when the user mentions a rep/representative name.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Rep name or partial name to search for" },
        },
      },
    },
  },
];

// ── Kurdish character normalization ───────────────────────────────────────
// Handles variant Unicode chars so searches work regardless of keyboard/font
function kNorm(s: string): string {
  return s
    .replace(/ڵ/g, 'ل')         // Kurdish ll → Arabic l
    .replace(/ڕ/g, 'ر')         // Kurdish rr → Arabic r
    .replace(/ێ/g, 'ی')         // Kurdish ê → Arabic y
    .replace(/ك/g, 'ک')         // Arabic kaf → Farsi/Kurdish kaf
    .replace(/ى/g, 'ی')         // Arabic alef maqsura → ya
    .replace(/ة/g, 'ه')         // ta marbuta → ha
    .replace(/[أإآ]/g, 'ا')     // hamza variants → alef
    .trim();
}

// ── Tool execution ─────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_orders": {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit((args.limit as number) || 10);
      if (args.status) query = query.eq("status", args.status);
      if (args.client_name) query = query.ilike("client_name", `%${args.client_name}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return data?.map((o: Record<string, unknown>) => ({
        id: o.id,
        orderNumber: o.order_number,
        client: o.client_name,
        status: o.status,
        total: o.total_amount,
        createdAt: o.created_at,
      }));
    }

    case "get_dashboard_stats": {
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayOrders } = await supabase.from("orders").select("total_amount, status").gte("created_at", today);
      const totalRevenue = (todayOrders || []).reduce((s: number, o: Record<string, unknown>) => s + ((o.total_amount as number) || 0), 0);
      const delivered = (todayOrders || []).filter((o: Record<string, unknown>) => o.status === "DELIVERED" || o.status === "PAID").length;
      return { todayOrders: todayOrders?.length || 0, todayRevenue: totalRevenue, delivered };
    }

    case "list_products": {
      let query = supabase.from("products").select("*").eq("is_active", true).order("name").limit((args.limit as number) || 10);
      if (args.search) query = query.ilike("name", `%${args.search}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      let products = data || [];
      if (args.low_stock) products = products.filter((p: Record<string, unknown>) => (p.stock as number) <= (p.low_stock as number));
      return products.map((p: Record<string, unknown>) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category }));
    }

    case "list_clients": {
      let query = supabase.from("clients").select("*").eq("is_active", true).order("name").limit((args.limit as number) || 10);
      if (args.search) query = query.or(`name.ilike.%${args.search}%,city.ilike.%${args.search}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return data?.map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, city: c.city, type: c.type, balance: c.balance }));
    }

    case "find_client_by_name": {
      const term = kNorm(String(args.name || ""));
      const { data } = await supabase.from("clients").select("id, name, city").ilike("name", `%${term}%`).limit(5);
      if (!data || data.length === 0) return { notFound: true, term };
      return data;
    }

    case "find_product_by_name": {
      const term = kNorm(String(args.name || ""));
      const { data } = await supabase.from("products").select("id, name, price, stock").ilike("name", `%${term}%`).limit(5);
      return data;
    }

    case "create_order": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (args.items as Record<string, any>[]) || [];

      // Normalize: accept both snake_case and camelCase from the model
      const normalizedItems = items.map(item => ({
        product_id:   String(item.product_id   ?? item.productId   ?? ""),
        product_name: String(item.product_name ?? item.productName ?? ""),
        quantity:     Number(item.quantity  ?? 1),
        unit_price:   Number(item.unit_price ?? item.unitPrice ?? 0),
      }));

      // Validate — refuse to create order with $0 prices
      const zeroPrice = normalizedItems.find(i => i.unit_price === 0);
      if (zeroPrice) return { error: `unit_price is 0 for "${zeroPrice.product_name}" — look up the product first with find_product_by_name` };

      const totalAmount = normalizedItems.reduce((s, item) => s + (item.quantity * item.unit_price), 0);
      const orderNumber = "ORD-" + String(Date.now()).slice(-6);

      const { data, error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        client_id: args.client_id,
        client_name: args.client_name,
        rep_id: args.rep_id || null,
        rep_name: args.rep_name || null,
        warehouse_id: args.warehouse_id || null,
        warehouse_name: args.warehouse_name || null,
        status: "WAITING",
        total_amount: totalAmount,
        notes: args.notes || "",
        items: normalizedItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          bonusQty: 0,
          bonusPct: 0,
        })),
        driver_id: null,
        driver_name: "",
        driver_phone: "",
        signed_invoice_url: "",
        signed_receipt_url: "",
        rejection_reason: "",
      }).select().single();

      if (error) return { error: error.message };
      return {
        success: true,
        orderNumber,
        id: (data as Record<string, unknown>)?.id,
        totalAmount,
        clientName: args.client_name,
        repName: args.rep_name || null,
        warehouseName: args.warehouse_name || null,
        status: "WAITING",
        items: normalizedItems.map(i => ({
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          total: i.quantity * i.unit_price,
        })),
      };
    }

    case "update_order_status": {
      const { error } = await supabase.from("orders").update({ status: args.new_status }).eq("id", args.order_id);
      if (error) return { error: error.message };
      return { success: true, message: `Order status updated to ${args.new_status}` };
    }

    case "list_warehouses": {
      let query = supabase.from("warehouses").select("id, name, city, address, is_active").eq("is_active", true).order("name");
      if (args.search) query = query.or(`name.ilike.%${args.search}%,city.ilike.%${args.search}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return data;
    }

    case "find_warehouse_by_name": {
      const term = kNorm(String(args.name || ""));
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, city, address")
        .ilike("name", `%${term}%`)
        .eq("is_active", true)
        .limit(5);
      if (error) return { error: error.message };
      if (!data || data.length === 0) return { notFound: true, term };
      return data;
    }

    case "find_rep_by_name": {
      const { data, error } = await supabase
        .from("reps")
        .select("id, name")
        .ilike("name", `%${kNorm(String(args.name || ""))}%`)
        .limit(5);
      if (error) return { error: error.message };
      return data;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dewa AI Assistant for the Dewa pharmaceutical management system (دەوا).

RESPOND in Kurdish (Sorani) when user writes Kurdish, English when they write English.

## SMART SEARCH BEHAVIOR:

When searching for products, clients, warehouses, or reps:

1. FUZZY MATCHING: Kurdish spelling varies (e.g. user writes "پاراسیتامۆڵ" but DB has "پاراسیتامۆل 500مغ"). If the first search returns nothing, try a shorter version of the name (e.g. "پاراسیتا" instead of the full word). Always find the closest match.

2. MULTIPLE RESULTS: If search returns more than one result, pick the BEST match (closest to what the user wrote) and mention which one you used in the final reply.

3. ZERO RESULTS: If nothing is found even after a shorter search, call list_products (or list_clients / list_warehouses) to show all options, then ask the user to pick one.

## ORDER CREATION — ONE SHOT:
Complete ALL lookups first, then create the order in a single pass. DO NOT stop mid-flow asking confirmation for each item. Instead:
- Call all find_* tools to get real IDs and prices
- Call create_order once with all real data
- After the order is created, show a clear summary for the user to review

## STRICT RULES:
- NEVER use placeholder IDs like "product_id_" — FORBIDDEN.
- NEVER set unit_price to 0 — always use real price from find_product_by_name.
- NEVER call create_order without real IDs from lookup tools.
- If you cannot find something after 2 attempts, stop and tell the user clearly.

## Kurdish vocabulary:
- "نوێنەر" = sales rep
- "کۆگا" = warehouse
- "کڕیار" / "داروخانە" = client/pharmacy
- "کاڵا" / "دەرمان" = product/medicine

## Order flow (all in ONE turn):
Step 1: find_client_by_name
Step 2: find_product_by_name for each product
Step 3: find_warehouse_by_name (if mentioned)
Step 4: find_rep_by_name (if mentioned)
Step 5: create_order with all real IDs and prices
Step 6: Show summary — order number, client, each product+qty+price, warehouse, rep, total

Format currency as: [amount] دینار`;


// ── Convert OpenAI-format tools → Gemini function declarations ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiTools(openAiTools: any[]) {
  return [{
    functionDeclarations: openAiTools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];
}

// ── Convert OpenAI message history → Gemini contents ────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiContents(msgs: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [];
  for (const m of msgs) {
    if (m.role === "system") continue; // handled via systemInstruction
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content || "" }] });
    } else if (m.role === "assistant") {
      if (m.tool_calls?.length) {
        // Function call turn
        contents.push({
          role: "model",
          parts: m.tool_calls.map((tc: { function: { name: string; arguments: string } }) => ({
            functionCall: { name: tc.function.name, args: JSON.parse(tc.function.arguments || "{}") },
          })),
        });
      } else {
        contents.push({ role: "model", parts: [{ text: m.content || "" }] });
      }
    } else if (m.role === "tool") {
      // Function response
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: m.name || "tool", response: JSON.parse(m.content || "{}") } }],
      });
    }
  }
  return contents;
}

// ── Call native Gemini API ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGemini(systemPrompt: string, msgs: any[]): Promise<{ ok: boolean; data?: any; err?: string }> {
  try {
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: toGeminiContents(msgs),
      tools: toGeminiTools(tools),
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      generationConfig: {
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 }, // disable thinking to avoid thought_signature multi-turn issue
      },
    };
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, err: txt };
    }
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, err: String(e) };
  }
}

// ── Parse Gemini response → { text?, tool_calls? } ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGeminiResponse(data: any): { text?: string; toolCalls?: { id: string; function: { name: string; arguments: string } }[] } {
  const candidate = data.candidates?.[0];
  if (!candidate) return { text: "" };
  const parts = candidate.content?.parts || [];
  const textParts = parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text).join("");
  const fnParts = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
  if (fnParts.length > 0) {
    return {
      toolCalls: fnParts.map((p: { functionCall: { name: string; args: unknown } }, i: number) => ({
        id: `call_${i}`,
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
      })),
    };
  }
  return { text: textParts };
}

// ── Call Groq (OpenAI-compatible) ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGroq(msgs: any[]): Promise<{ ok: boolean; data?: any; err?: string }> {
  for (const provider of GROQ_PROVIDERS) {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${provider.key}` },
      body: JSON.stringify({ model: provider.model, messages: msgs, tools, tool_choice: "auto", parallel_tool_calls: false, max_tokens: 4096 }),
    });
    if (res.ok) return { ok: true, data: await res.json() };
    console.warn(`[Groq ${provider.model}] failed (${res.status})`);
  }
  return { ok: false, err: "All Groq models failed" };
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Pre-load context from DB
    const [
      { data: allProducts },
      { data: allClients },
      { data: allWarehouses },
      { data: allReps },
    ] = await Promise.all([
      supabase.from("products").select("id, name, price, stock").order("name"),
      supabase.from("clients").select("id, name, city").order("name"),
      supabase.from("warehouses").select("id, name, city").eq("is_active", true).order("name"),
      supabase.from("reps").select("id, name").order("name"),
    ]);

    const dbContext = `
## AVAILABLE DATA (use these exact IDs when creating orders):

### Products (کاڵاکان):
${(allProducts || []).map(p => `- ID: ${p.id} | Name: ${p.name} | Price: ${p.price} دینار`).join("\n")}

### Clients / Pharmacies (کڕیارەکان / داروخانەکان):
${(allClients || []).map(c => `- ID: ${c.id} | Name: ${c.name}${c.city ? ` | City: ${c.city}` : ""}`).join("\n")}

### Warehouses (کۆگاکان):
${(allWarehouses || []).map(w => `- ID: ${w.id} | Name: ${w.name}`).join("\n")}

### Sales Reps (نوێنەرەکان):
${(allReps || []).map(r => `- ID: ${r.id} | Name: ${r.name}`).join("\n")}

Since you have all the IDs above, you do NOT need to call find_client_by_name, find_product_by_name, find_warehouse_by_name, or find_rep_by_name. Match names from the user's message to the lists above (use fuzzy/partial matching for Kurdish spelling variants), then call create_order directly with the correct IDs.`;

    const systemPrompt = SYSTEM_PROMPT + dbContext;

    // Build message history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgHistory: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const toolResults: { name: string; result: unknown }[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 6;

    while (iterations < MAX_ITERATIONS) {
      // Call Gemini
      const geminiResult = await callGemini(systemPrompt, msgHistory);

      // Surface the real error if Gemini fails
      if (!geminiResult.ok) {
        console.error("[Gemini] error:", geminiResult.err);
        let errMsg = "هەڵە ڕووی دا لە پەیوەندی بە Gemini.";
        try {
          const parsed = JSON.parse(geminiResult.err || "");
          const detail = parsed?.error?.message || parsed?.error?.status;
          if (detail) errMsg = `Gemini: ${detail}`;
        } catch { /* raw text */ if (geminiResult.err) errMsg = `Gemini: ${geminiResult.err.slice(0, 200)}`; }
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = geminiResult.data as any;

      // Handle safety block or empty candidates
      if (!raw.candidates || raw.candidates.length === 0) {
        const reason = raw.promptFeedback?.blockReason || "UNKNOWN";
        return NextResponse.json({ text: `بەشداری: Gemini داواکاریەکە بڕووشاند (${reason}).`, toolResults });
      }

      const parsed = parseGeminiResponse(raw);
      const { text, toolCalls } = parsed;

      // No tool calls — final answer
      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({ text: text || "", toolResults });
      }

      // Push assistant tool call turn
      msgHistory.push({ role: "assistant", content: null, tool_calls: toolCalls });

      // Execute tools and push results
      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        const toolArgs = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(toolName, toolArgs);
        toolResults.push({ name: toolName, result });
        msgHistory.push({
          role: "tool",
          tool_call_id: tc.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      iterations++;
    }

    return NextResponse.json({ text: "تکایە دووبارە هەوڵ بدەرەوە.", toolResults });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
