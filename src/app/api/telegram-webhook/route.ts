// /api/telegram-webhook/route.ts
//
// Message routing by role (stored in telegram_users table):
//   DRIVER    → messages forwarded to notify-admins (voice, location, etc.)
//   REP       → live location upserted into rep_locations table
//   ADMIN /
//   MANAGEMENT → treated as notify user; pending voice forwards fulfilled
//   UNASSIGNED → ignored (or logged)
//
// Live location flow for REPs:
//   1. Rep shares live location in Telegram
//   2. Telegram sends message.location (with live_period set)
//   3. As rep moves, Telegram sends edited_message.location updates
//   4. Webhook upserts rep_locations on every update

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

    // Handle both regular messages and live-location edits
    const message      = body.message ?? body.channel_post;
    const editedMsg    = body.edited_message;

    // ── Handle live location update (edited_message) ──────────────────────
    if (editedMsg?.location) {
      const db       = createClient(supabaseUrl, supabaseKey);
      const chatId   = String(editedMsg.chat?.id ?? editedMsg.from?.id ?? "");
      const location = editedMsg.location as { latitude: number; longitude: number; accuracy?: number; live_period?: number };

      if (chatId) {
        const { data: tgUser } = await db
          .from("telegram_users")
          .select("role, linked_name")
          .eq("chat_id", chatId)
          .maybeSingle();

        if (tgUser?.role === "REP") {
          await db.from("rep_locations").upsert({
            chat_id:     chatId,
            rep_name:    tgUser.linked_name || "نوێنەر",
            latitude:    location.latitude,
            longitude:   location.longitude,
            accuracy:    location.accuracy ?? null,
            live_period: location.live_period ?? null,
            is_live:     true,
            updated_at:  new Date().toISOString(),
          }, { onConflict: "chat_id" });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!message) return NextResponse.json({ ok: true });

    const from       = message.from;
    const fromChatId = String(message.chat?.id ?? from?.id ?? "");
    const messageId  = message.message_id as number;

    if (!fromChatId || !messageId) return NextResponse.json({ ok: true });

    const db = createClient(supabaseUrl, supabaseKey);

    // ── Auto-register every sender in telegram_users ──────────────────────
    // This runs before any other logic so the bot page can see all users.
    const senderName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || "";
    await db.from("telegram_users").upsert({
      chat_id:    fromChatId,
      first_name: from?.first_name || "",
      last_name:  from?.last_name  || "",
      username:   from?.username   || "",
      // Only set role/linked fields if row doesn't exist yet (upsert preserves existing role)
    }, {
      onConflict:        "chat_id",
      ignoreDuplicates:  true,   // don't overwrite role once assigned
    });

    // Load settings
    const { data: settingsRow } = await db
      .from("company_settings")
      .select("telegram_bot_token, telegram_notify_chat_ids")
      .eq("id", 1)
      .single();

    if (!settingsRow?.telegram_bot_token) return NextResponse.json({ ok: true });

    const token     = settingsRow.telegram_bot_token as string;
    const notifyIds = (settingsRow.telegram_notify_chat_ids ?? []) as string[];

    // ── Lookup role from telegram_users table ─────────────────────────────
    const { data: tgUser } = await db
      .from("telegram_users")
      .select("role, linked_name, linked_id")
      .eq("chat_id", fromChatId)
      .maybeSingle();

    const role = tgUser?.role ?? (notifyIds.includes(fromChatId) ? "ADMIN" : "UNASSIGNED");

    // ── REP: initial live location share ────────────────────────────────
    if (role === "REP" && message.location) {
      const location = message.location as { latitude: number; longitude: number; accuracy?: number; live_period?: number };
      await db.from("rep_locations").upsert({
        chat_id:     fromChatId,
        rep_name:    tgUser?.linked_name || "نوێنەر",
        latitude:    location.latitude,
        longitude:   location.longitude,
        accuracy:    location.accuracy ?? null,
        live_period: location.live_period ?? null,
        is_live:     !!(location.live_period),
        updated_at:  new Date().toISOString(),
      }, { onConflict: "chat_id" });

      // Acknowledge to rep
      const isLive = !!(location.live_period);
      await tgPost(token, "sendMessage", {
        chat_id: fromChatId,
        text: isLive
          ? `✅ شوێنی ژیانت وەرگیرا. داشبۆردەکە نوێدەبێتەوە بە شێوەیەکی ئۆتۆماتیکی.`
          : `📍 شوێنەکەت تۆمارکرا.`,
      });
      return NextResponse.json({ ok: true });
    }

    // ── ADMIN / MANAGEMENT: check for pending voice forwards ─────────────
    const isNotifyUser = role === "ADMIN" || role === "MANAGEMENT" || notifyIds.includes(fromChatId);

    if (isNotifyUser) {
      const { data: pending } = await db
        .from("pending_voice_forwards")
        .select("*")
        .eq("fulfilled", false)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (pending) {
        await tgPost(token, "sendMessage", {
          chat_id: pending.driver_chat_id,
          text: `📦 نامەی ئەوازی تایبەتت هەیە بۆ داواکاری <b>${pending.order_number}</b>`,
          parse_mode: "HTML",
        });
        await tgPost(token, "forwardMessage", {
          chat_id:      pending.driver_chat_id,
          from_chat_id: fromChatId,
          message_id:   messageId,
        });
        await db.from("pending_voice_forwards").update({ fulfilled: true }).eq("id", pending.id);
        await tgPost(token, "sendMessage", {
          chat_id: fromChatId,
          text: `✅ نامەکەت نێردرا بۆ شوفێر ${pending.driver_name} — ${pending.order_number}`,
        });
        return NextResponse.json({ ok: true });
      }
    }

    // ── DRIVER: forward message to notify admins ──────────────────────────
    if (role === "DRIVER") {
      if (notifyIds.length > 0) {
        const msgType = message.voice    ? "🎙️ ئەواز"
                      : message.audio    ? "🎵 دەنگ"
                      : message.photo    ? "📷 وێنە"
                      : message.video    ? "🎥 ڤیدیۆ"
                      : message.document ? "📎 فایل"
                      : message.location ? "📍 شوێن"
                      : "💬 نامە";

        const driverName = tgUser?.linked_name || from?.first_name || "شوفێر";
        await Promise.all(notifyIds.map(async (notifyId) => {
          await tgPost(token, "sendMessage", {
            chat_id: notifyId,
            text: `🚗 شوفێر: <b>${driverName}</b>\n${msgType} نێردراوە ⬇️`,
            parse_mode: "HTML",
          });
          await tgPost(token, "forwardMessage", {
            chat_id:      notifyId,
            from_chat_id: fromChatId,
            message_id:   messageId,
          });
        }));
      }
      return NextResponse.json({ ok: true });
    }

    // ── Fallback: try legacy driver lookup by chat_id in drivers table ────
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
          chat_id:      notifyId,
          from_chat_id: fromChatId,
          message_id:   messageId,
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
