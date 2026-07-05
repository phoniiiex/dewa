// /api/telegram-webhook/route.ts
//
// Update types handled:
//   message            → driver/rep/admin routing + auto-register sender
//   edited_message     → live location updates from REPs
//   my_chat_member     → user unblocked bot (register them)
//   /start command     → explicit registration + reply with Chat ID
//
// User registration flow:
//   Any of the above → upsert telegram_users (update name/username, preserve role)

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

// Register or update a user's name/username — NEVER overwrites role
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registerUser(db: any, chatId: string, from: { first_name?: string; last_name?: string; username?: string } | null | undefined) {
  if (!chatId || !from) return;
  // Insert new row (ignoreDuplicates keeps existing roles intact)
  await db.from("telegram_users").upsert({
    chat_id:     chatId,
    first_name:  from.first_name  || "",
    last_name:   from.last_name   || "",
    username:    from.username    || "",
    role:        "UNASSIGNED",
    linked_id:   "",
    linked_name: "",
    updated_at:  new Date().toISOString(),
  }, { onConflict: "chat_id", ignoreDuplicates: true });

  // Update name/username for already-existing rows (never touches role)
  await db.from("telegram_users").update({
    first_name:  from.first_name  || "",
    last_name:   from.last_name   || "",
    username:    from.username    || "",
    updated_at:  new Date().toISOString(),
  }).eq("chat_id", chatId);
}


export async function POST(req: NextRequest) {
  // Always respond immediately to avoid Telegram timeouts
  const bodyText = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(bodyText); } catch { return NextResponse.json({ ok: true }); }

  // Process async (don't block the response)
  processUpdate(body).catch(err => console.error("[webhook]", err));

  return NextResponse.json({ ok: true });
}

async function processUpdate(body: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(supabaseUrl, supabaseKey) as any;

  // Load bot token
  const { data: settingsRow } = await db
    .from("company_settings")
    .select("telegram_bot_token, telegram_notify_chat_ids")
    .eq("id", 1)
    .single();

  const token     = (settingsRow?.telegram_bot_token as string) || "";
  const notifyIds = (settingsRow?.telegram_notify_chat_ids ?? []) as string[];

  // ── my_chat_member: user unblocked/restarted bot ────────────────────────
  const memberUpdate = body.my_chat_member as Record<string, unknown> | undefined;
  if (memberUpdate) {
    const from   = memberUpdate.from as Record<string, string> | undefined;
    const chatId = String((memberUpdate.chat as Record<string, unknown>)?.id ?? from?.id ?? "");
    if (chatId && from) {
      await registerUser(db, chatId, from);
      // Send welcome if they just re-enabled the bot
      const newStatus = (memberUpdate.new_chat_member as Record<string, string>)?.status;
      if (token && (newStatus === "member" || newStatus === "creator")) {
        await tgPost(token, "sendMessage", {
          chat_id: chatId,
          text: `👋 خۆشی دیدنت!\n\nبۆتی تەوژمی دەریا. Chat ID ت:\n<code>${chatId}</code>\n\nئەدمینەکە ڕۆڵت دیاری دەکات.`,
          parse_mode: "HTML",
        });
      }
    }
    return;
  }

  // ── edited_message: live location update from REP ───────────────────────
  const editedMsg = body.edited_message as Record<string, unknown> | undefined;
  if (editedMsg?.location) {
    const chatId   = String((editedMsg.chat as Record<string, unknown>)?.id ?? (editedMsg.from as Record<string, unknown>)?.id ?? "");
    const location = editedMsg.location as { latitude: number; longitude: number; accuracy?: number; live_period?: number };
    if (chatId) {
      const { data: tgUser } = await db.from("telegram_users").select("role, linked_name, linked_id").eq("chat_id", chatId).maybeSingle();
      if (tgUser?.role === "REP") {
        // Fetch profile pic from reps table
        const { data: repRow } = await db.from("reps").select("profile_pic").eq("id", tgUser.linked_id || "").maybeSingle();
        await db.from("rep_locations").upsert({
          chat_id: chatId, rep_name: tgUser.linked_name || "نوێنەر",
          latitude: location.latitude, longitude: location.longitude,
          accuracy: location.accuracy ?? null, live_period: location.live_period ?? null,
          is_live: true,
          profile_pic_url: repRow?.profile_pic || "",
          updated_at: new Date().toISOString(),
        }, { onConflict: "chat_id" });
      }
    }
    return;
  }

  // ── Regular message ──────────────────────────────────────────────────────
  const message = (body.message ?? body.channel_post) as Record<string, unknown> | undefined;
  if (!message) return;

  const from       = message.from as Record<string, string | boolean> | undefined;
  const fromChatId = String((message.chat as Record<string, unknown>)?.id ?? from?.id ?? "");
  const messageId  = message.message_id as number;
  const text       = (message.text as string) || "";

  if (!fromChatId || from?.is_bot) return;

  // Always register the sender
  await registerUser(db, fromChatId, from as { first_name?: string; last_name?: string; username?: string });

  if (!token) return;

  // ── /start command: send welcome with Chat ID ─────────────────────────
  if (text === "/start" || text.startsWith("/start ")) {
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || "بەکارهێنەر";
    await tgPost(token, "sendMessage", {
      chat_id: fromChatId,
      text: `👋 سڵاو ${name}!\n\n✅ تۆمارکرایتی لە سیستەمی تەوژمی دەریا.\n\nChat ID ت:\n<code>${fromChatId}</code>\n\nئەدمینەکە زوو ڕۆڵت دیاری دەکات.`,
      parse_mode: "HTML",
    });
    return;
  }

  // ── /myid command ─────────────────────────────────────────────────────
  if (text === "/myid") {
    await tgPost(token, "sendMessage", {
      chat_id: fromChatId,
      text: `🪪 Chat ID ت:\n<code>${fromChatId}</code>`,
      parse_mode: "HTML",
    });
    return;
  }

  // ── Lookup role ───────────────────────────────────────────────────────
  const { data: tgUser } = await db
    .from("telegram_users")
    .select("role, linked_name, linked_id")
    .eq("chat_id", fromChatId)
    .maybeSingle();

  const role = tgUser?.role ?? (notifyIds.includes(fromChatId) ? "ADMIN" : "UNASSIGNED");

  // ── REP: live location share ──────────────────────────────────────────
  if (role === "REP" && message.location) {
    const location = message.location as { latitude: number; longitude: number; accuracy?: number; live_period?: number };
    await db.from("rep_locations").upsert({
      chat_id: fromChatId, rep_name: tgUser?.linked_name || "نوێنەر",
      latitude: location.latitude, longitude: location.longitude,
      accuracy: location.accuracy ?? null, live_period: location.live_period ?? null,
      is_live: !!(location.live_period), updated_at: new Date().toISOString(),
    }, { onConflict: "chat_id" });
    await tgPost(token, "sendMessage", {
      chat_id: fromChatId,
      text: location.live_period
        ? "✅ شوێنی زیندووت وەرگیرا. داشبۆردەکە نوێدەبێتەوە بە ئۆتۆماتیکی."
        : "📍 شوێنەکەت تۆمارکرا.",
    });
    return;
  }

  // ── ADMIN / MANAGEMENT: fulfill pending voice forwards ────────────────
  const isNotifyUser = role === "ADMIN" || role === "MANAGEMENT" || notifyIds.includes(fromChatId);
  if (isNotifyUser) {
    const { data: pending } = await db
      .from("pending_voice_forwards")
      .select("*").eq("fulfilled", false)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (pending) {
      await tgPost(token, "sendMessage", { chat_id: pending.driver_chat_id, text: `📦 نامەی ئەوازی تایبەتت هەیە بۆ <b>${pending.order_number}</b>`, parse_mode: "HTML" });
      await tgPost(token, "forwardMessage", { chat_id: pending.driver_chat_id, from_chat_id: fromChatId, message_id: messageId });
      await db.from("pending_voice_forwards").update({ fulfilled: true }).eq("id", pending.id);
      await tgPost(token, "sendMessage", { chat_id: fromChatId, text: `✅ نامەکەت نێردرا بۆ شوفێر ${pending.driver_name} — ${pending.order_number}` });
      return;
    }
  }

  // ── DRIVER: forward to notify admins ─────────────────────────────────
  if (role === "DRIVER" && notifyIds.length > 0) {
    const msgType = message.voice ? "🎙️ ئەواز" : message.audio ? "🎵 دەنگ" : message.photo ? "📷 وێنە" : message.video ? "🎥 ڤیدیۆ" : message.document ? "📎 فایل" : message.location ? "📍 شوێن" : "💬 نامە";
    const driverName = tgUser?.linked_name || (from?.first_name as string) || "شوفێر";
    await Promise.all(notifyIds.map(async (notifyId) => {
      await tgPost(token, "sendMessage", { chat_id: notifyId, text: `🚗 شوفێر: <b>${driverName}</b>\n${msgType} نێردراوە ⬇️`, parse_mode: "HTML" });
      await tgPost(token, "forwardMessage", { chat_id: notifyId, from_chat_id: fromChatId, message_id: messageId });
    }));
    return;
  }

  // ── Legacy: driver lookup by old telegram_chat_id field ──────────────
  const { data: driverRow } = await db.from("drivers").select("name, phone").eq("telegram_chat_id", fromChatId).maybeSingle();
  if (driverRow && notifyIds.length > 0) {
    const msgType = message.voice ? "🎙️ ئەواز" : message.audio ? "🎵 دەنگ" : "💬 نامە";
    await Promise.all(notifyIds.map(async (notifyId) => {
      await tgPost(token, "sendMessage", { chat_id: notifyId, text: `🚗 شوفێر: <b>${driverRow.name}</b> (${driverRow.phone})\n${msgType} نێردراوە ⬇️`, parse_mode: "HTML" });
      await tgPost(token, "forwardMessage", { chat_id: notifyId, from_chat_id: fromChatId, message_id: messageId });
    }));
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Dewa Telegram Webhook — active" });
}
