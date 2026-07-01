import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = "REDACTED";
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];
function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Tool definitions ───────────────────────────────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: "list_orders",
        description: "List recent orders from the system. Can filter by status or client name.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: { type: "INTEGER", description: "Max number of orders to return (default 10)" },
            status: { type: "STRING", description: "Filter by status: WAITING, IN_PROGRESS, READY, SENT, DELIVERED, PAID, NOT_ACCEPTED" },
            client_name: { type: "STRING", description: "Filter by client name (partial match)" },
          },
        },
      },
      {
        name: "get_dashboard_stats",
        description: "Get today's dashboard statistics: revenue, order count, delivered count.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "list_products",
        description: "List products from the system. Can filter by name or category.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: { type: "INTEGER", description: "Max number of products to return (default 10)" },
            search: { type: "STRING", description: "Search by product name" },
            low_stock: { type: "BOOLEAN", description: "If true, return only low-stock products" },
          },
        },
      },
      {
        name: "list_clients",
        description: "List clients from the system.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: { type: "INTEGER", description: "Max number of clients to return (default 10)" },
            search: { type: "STRING", description: "Search by client name or city" },
          },
        },
      },
      {
        name: "create_order",
        description: "Create a new order in the system.",
        parameters: {
          type: "OBJECT",
          required: ["client_id", "client_name", "items"],
          properties: {
            client_id: { type: "STRING", description: "The client's ID" },
            client_name: { type: "STRING", description: "The client's display name" },
            rep_id: { type: "STRING", description: "The sales rep's ID (optional)" },
            rep_name: { type: "STRING", description: "The sales rep's name (optional)" },
            notes: { type: "STRING", description: "Order notes" },
            items: {
              type: "ARRAY",
              description: "Order line items",
              items: {
                type: "OBJECT",
                properties: {
                  product_id: { type: "STRING" },
                  product_name: { type: "STRING" },
                  quantity: { type: "INTEGER" },
                  unit_price: { type: "NUMBER" },
                },
              },
            },
          },
        },
      },
      {
        name: "update_order_status",
        description: "Update the status of an existing order.",
        parameters: {
          type: "OBJECT",
          required: ["order_id", "new_status"],
          properties: {
            order_id: { type: "STRING", description: "The order's ID" },
            new_status: { type: "STRING", description: "New status: WAITING, IN_PROGRESS, READY, SENT, DELIVERED, PAID, NOT_ACCEPTED" },
          },
        },
      },
      {
        name: "find_client_by_name",
        description: "Find a client by their name to get their ID.",
        parameters: {
          type: "OBJECT",
          required: ["name"],
          properties: {
            name: { type: "STRING", description: "Client name to search for" },
          },
        },
      },
      {
        name: "find_product_by_name",
        description: "Find a product by name to get its ID and price.",
        parameters: {
          type: "OBJECT",
          required: ["name"],
          properties: {
            name: { type: "STRING", description: "Product name to search for" },
          },
        },
      },
    ],
  },
];

// ── Tool execution ────────────────────────────────────────────────────────
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
      const { data } = await supabase.from("clients").select("id, name, city").ilike("name", `%${args.name}%`).limit(5);
      return data;
    }

    case "find_product_by_name": {
      const { data } = await supabase.from("products").select("id, name, price, stock").ilike("name", `%${args.name}%`).limit(5);
      return data;
    }

    case "create_order": {
      const items = (args.items as Record<string, unknown>[]) || [];
      const totalAmount = items.reduce((s, item) => s + ((item.quantity as number) * (item.unit_price as number)), 0);
      const orderNumber = "ORD-" + String(Date.now()).slice(-6);

      const { data, error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        client_id: args.client_id,
        client_name: args.client_name,
        rep_id: args.rep_id || null,
        rep_name: args.rep_name || null,
        status: "WAITING",
        total_amount: totalAmount,
        notes: args.notes || "",
        items: items.map(item => ({
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
        warehouse_id: null,
        warehouse_name: null,
        signed_invoice_url: "",
        signed_receipt_url: "",
        rejection_reason: "",
      }).select().single();

      if (error) return { error: error.message };
      return { success: true, orderNumber, id: (data as Record<string, unknown>)?.id, totalAmount };
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

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dewa AI Assistant — an intelligent AGI for the Dewa pharmaceutical management system (دەوا سیستەمی بەڕێوەبردنی دەرمانسازی).

You can:
- List and search orders, products, clients
- Create new orders on behalf of the user
- Update order statuses
- Show dashboard statistics
- Help with any data-related task in the system

Respond in Kurdish (Sorani/ckb) when the user writes in Kurdish, or English when they write in English. Be concise, helpful, and action-oriented.

When creating orders: always first find the client and products by name using the search tools, then create the order with the correct IDs and prices.

Format currency as: [amount] IQD
Format numbers with commas for thousands.

When you complete an action (like creating an order), summarize what you did clearly.`;

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Convert message history to Gemini format
    const geminiHistory = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Add system prompt as first user turn (Gemini Flash approach)
    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "بەجێ. من ئامادەم بۆ یارمەتیدانت. چی پێویستتە؟" }] },
      ...geminiHistory,
    ];

    // Try each model until one works (handles quota errors)
    let response!: Response;
    let activeModel = MODELS[0];
    for (const model of MODELS) {
      response = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, tools }),
      });
      if (response.ok) { activeModel = model; break; }
      const errText = await response.text();
      // Only retry on quota errors
      if (!errText.includes("429") && !errText.includes("quota") && !errText.includes("RESOURCE_EXHAUSTED")) {
        return NextResponse.json({ error: errText }, { status: 500 });
      }
      console.warn(`Model ${model} quota exceeded, trying next...`);
    }
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `All models quota exceeded. Try again later. (${err.slice(0, 200)})` }, { status: 429 });
    }

    let data = await response.json();

    // ── Agentic function-calling loop ─────────────────────────────────────
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    const toolResults: { name: string; result: unknown }[] = [];

    while (iterations < MAX_ITERATIONS) {
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check for function calls
      const functionCalls = parts.filter((p: Record<string, unknown>) => p.functionCall);

      if (functionCalls.length === 0) break; // No more tool calls — we have the final answer

      // Execute all tool calls
      const functionResponseParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall as { name: string; args: Record<string, unknown> };
        const result = await executeTool(name, args || {});
        toolResults.push({ name, result });
        functionResponseParts.push({
          functionResponse: { name, response: { result } },
        });
      }

      // Add assistant's tool call turn + tool results turn
      contents.push({ role: "model", parts });
      contents.push({ role: "user", parts: functionResponseParts });

      // Call Gemini again with results
      response = await fetch(geminiUrl(activeModel), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, tools }),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ error: err }, { status: 500 });
      }

      data = await response.json();
      iterations++;
    }

    // Extract final text answer
    const finalParts = data.candidates?.[0]?.content?.parts || [];
    const text = finalParts.map((p: Record<string, unknown>) => p.text || "").join("").trim();

    return NextResponse.json({ text, toolResults });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
