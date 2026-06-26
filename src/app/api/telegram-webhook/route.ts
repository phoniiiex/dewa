// /api/telegram-webhook/route.ts
// Receives incoming Telegram messages via webhook.
// When a driver sends any message to the bot, it's forwarded
// to the admin/manager users stored in company_settings.telegram_notify_chat_ids.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function sendMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract sender info from Telegram update
    const message = body.message ?? body.channel_post;
    if (!message) return NextResponse.json({ ok: true });

    const from   = message.from;
    const chatId = String(message.chat?.id ?? from?.id ?? "");
    const text   = message.text ?? "(پەیامی تایبەت)";

    if (!chatId) return NextResponse.json({ ok: true });

    // Load settings from Supabase
    const db = createClient(supabaseUrl, supabaseKey);
    const { data: settingsRow } = await db
      .from("company_settings")
      .select("telegram_bot_token, telegram_notify_chat_ids")
      .eq("id", 1)
      .single();

    if (!settingsRow?.telegram_bot_token) return NextResponse.json({ ok: true });

    const token         = settingsRow.telegram_bot_token as string;
    const notifyIds     = (settingsRow.telegram_notify_chat_ids ?? []) as string[];

    // Check if this sender is a known driver
    const { data: driverRow } = await db
      .from("drivers")
      .select("name, phone")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    // Build forward message
    const senderName = driverRow
      ? `🚗 شوفێر: <b>${driverRow.name}</b> (${driverRow.phone})`
      : `👤 بەکارهێنەر: <b>${from?.first_name ?? ""} ${from?.last_name ?? ""}`.trim() + `</b>`;

    const forward = `${senderName}\n📩 پەیام:\n${text}`;

    // Forward to all notify users
    await Promise.all(notifyIds.map(nid => sendMessage(token, nid, forward)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Telegram also sends HEAD requests during webhook validation
export async function GET() {
  return NextResponse.json({ ok: true, info: "Dewa Telegram Webhook" });
}
