// /api/telegram-webhook/route.ts
//
// Flow when admin assigns a driver:
//   1. System inserts a row in pending_voice_forwards (orderId, driverChatId)
//   2. Bot sends a message to each notify-admin saying "please record a voice for driver X"
//   3. Admin records & sends a voice (or any message) in Telegram
//   4. This webhook fires → finds an unfulfilled pending forward for that admin
//   5. Forwards the message to the driver
//   6. Marks the forward as fulfilled
//
// All other messages from drivers are also forwarded to notify-admins as before.

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

    const from       = message.from;
    const fromChatId = String(message.chat?.id ?? from?.id ?? "");
    const messageId  = message.message_id as number;

    if (!fromChatId || !messageId) return NextResponse.json({ ok: true });

    const db = createClient(supabaseUrl, supabaseKey);

    // Load settings
    const { data: settingsRow } = await db
      .from("company_settings")
      .select("telegram_bot_token, telegram_notify_chat_ids")
      .eq("id", 1)
      .single();

    if (!settingsRow?.telegram_bot_token) return NextResponse.json({ ok: true });

    const token     = settingsRow.telegram_bot_token as string;
    const notifyIds = (settingsRow.telegram_notify_chat_ids ?? []) as string[];

    const isNotifyUser = notifyIds.includes(fromChatId);

    // ── Case 1: Message from a NOTIFY USER ──────────────────────────────
    // Check if there's a pending voice forward waiting for this admin
    if (isNotifyUser) {
      const { data: pending } = await db
        .from("pending_voice_forwards")
        .select("*")
        .eq("fulfilled", false)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (pending) {
        // Forward admin's message to the driver
        await tgPost(token, "sendMessage", {
          chat_id: pending.driver_chat_id,
          text: `📦 نامەی ئەوازی تایبەتت هەیە بۆ داواکاری <b>${pending.order_number}</b>`,
          parse_mode: "HTML",
        });
        await tgPost(token, "forwardMessage", {
          chat_id: pending.driver_chat_id,
          from_chat_id: fromChatId,
          message_id: messageId,
        });

        // Mark fulfilled
        await db.from("pending_voice_forwards").update({ fulfilled: true }).eq("id", pending.id);

        // Confirm back to admin
        await tgPost(token, "sendMessage", {
          chat_id: fromChatId,
          text: `✅ نامەکەت نێردرا بۆ شوفێر ${pending.driver_name} — ${pending.order_number}`,
        });

        return NextResponse.json({ ok: true });
      }
    }

    // ── Case 2: Message from a DRIVER → forward to notify admins ────────
    const { data: driverRow } = await db
      .from("drivers")
      .select("name, phone")
      .eq("telegram_chat_id", fromChatId)
      .maybeSingle();

    if (driverRow && notifyIds.length > 0) {
      const msgType = message.voice    ? "🎙️ ئەواز"
                    : message.audio    ? "🎵 دەنگ"
                    : message.photo    ? "📷 وێنە"
                    : message.video    ? "🎥 ڤیدیۆ"
                    : message.document ? "📎 فایل"
                    : message.location ? "📍 شوێن"
                    : "💬 نامە";

      await Promise.all(notifyIds.map(async (notifyId) => {
        await tgPost(token, "sendMessage", {
          chat_id: notifyId,
          text: `🚗 شوفێر: <b>${driverRow.name}</b> (${driverRow.phone})\n${msgType} نێردراوە ⬇️`,
          parse_mode: "HTML",
        });
        await tgPost(token, "forwardMessage", {
          chat_id: notifyId,
          from_chat_id: fromChatId,
          message_id: messageId,
        });
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Dewa Telegram Webhook" });
}
