import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Public API — no auth required
// Returns client debt info + unpaid orders for the QR code page
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Find client by qr_token
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, type, phone, city, balance")
      .eq("qr_token", token)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Fetch unpaid orders (everything except PAID and NOT_ACCEPTED)
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at, items")
      .eq("client_id", client.id)
      .not("status", "in", '("PAID","NOT_ACCEPTED")')
      .order("created_at", { ascending: false });

    const orders = (orderRows || []).map((o: Record<string, unknown>) => ({
      orderNumber: o.order_number,
      status: o.status,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
      items: Array.isArray(o.items) ? o.items : [],
    }));

    // Fetch company settings
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("name, name_en, phone")
      .limit(1);
    const settings = settingsRows?.[0] || null;

    // Total unpaid amount
    const totalDebt = orders.reduce((s: number, o) => s + (Number(o.totalAmount) || 0), 0);

    return NextResponse.json({
      client: {
        name: client.name,
        type: client.type,
        phone: client.phone,
        city: client.city,
        balance: client.balance,
      },
      orders,
      totalDebt,
      settings: settings ? { name: settings.name, nameEn: settings.name_en, phone: settings.phone } : null,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
