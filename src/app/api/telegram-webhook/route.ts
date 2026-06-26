// /api/telegram-webhook/route.ts
// Receives ALL incoming Telegram messages via webhook.
// Uses forwardMessage API to forward the ORIGINAL message (voice, photo,
// document, sticker, text — anything) to the admin notify users.
// Also sends a brief context header (driver name) before the forwarded message.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function tgPost(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message = body.message ?? body.channel_post;
    if (!message) return NextResponse.json({ ok: true });

    const from      = message.from;
    const fromChatId = String(message.chat?.id ?? from?.id ?? "");
    const messageId  = message.message_id as number;

    if (!fromChatId || !messageId) return NextResponse.json({ ok: true });

    // Load settings
    const db = createClient(supabaseUrl, supabaseKey);
    const { data: settingsRow } = await db
      .from("company_settings")
      .select("telegram_bot_token, telegram_notify_chat_ids")
      .eq("id", 1)
      .single();

    if (!settingsRow?.telegram_bot_token) return NextResponse.json({ ok: true });

    const token     = settingsRow.telegram_bot_token as string;
    const notifyIds = (settingsRow.telegram_notify_chat_ids ?? []) as string[];

    if (notifyIds.length === 0) return NextResponse.json({ ok: true });

    // Check if sender is a known driver
    const { data: driverRow } = await db
      .from("drivers")
      .select("name, phone")
      .eq("telegram_chat_id", fromChatId)
      .maybeSingle();

    // Detect message type for the header
    const msgType = message.voice      ? "🎙️ ئەواز"
                  : message.audio      ? "🎵 دەنگ"
                  : message.photo      ? "📷 وێنە"
                  : message.video      ? "🎥 ڤیدیۆ"
                  : message.document   ? "📎 فایل"
                  : message.sticker    ? "😄 Sticker"
                  : message.location   ? "📍 شوێن"
                  : "💬 نامە";

    const senderLabel = driverRow
      ? `🚗 شوفێر: <b>${driverRow.name}</b> (${driverRow.phone})`
      : `👤 <b>${[from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || fromChatId}</b>`;

    // For each notify user: send a brief header, then forward the original message
    await Promise.all(
      notifyIds.map(async (notifyId) => {
        // 1. Send context header (small text, so admin knows who sent what)
        await tgPost(token, "sendMessage", {
          chat_id: notifyId,
          text: `${senderLabel}\n${msgType} نێردراوە ⬇️`,
          parse_mode: "HTML",
        });

        // 2. Forward the EXACT original message (preserves voice, photo, etc.)
        await tgPost(token, "forwardMessage", {
          chat_id: notifyId,
          from_chat_id: fromChatId,
          message_id: messageId,
        });
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Dewa Telegram Webhook" });
}
