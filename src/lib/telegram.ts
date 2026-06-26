// ============================================================
// DEWA Telegram Bot Utility
// Token is stored in Supabase company_settings (server-side)
// and passed in from the store — NOT from localStorage
// ============================================================

/**
 * Send a plain text message to a Telegram chat
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Send an MP3 audio file to a Telegram chat by URL
 */
export async function sendTelegramVoice(botToken: string, chatId: string, mp3Url: string, caption?: string): Promise<boolean> {
  if (!botToken || !chatId || !mp3Url) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        audio: mp3Url,
        caption: caption ?? "",
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Fetch users who have recently messaged the bot (for driver detection)
 */
export async function getTelegramUpdates(botToken: string): Promise<{
  chatId: string;
  firstName: string;
  lastName: string;
  username: string;
}[]> {
  if (!botToken) return [];
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
    const data = await res.json();
    if (!data.ok) return [];
    const seen = new Set<string>();
    const users: { chatId: string; firstName: string; lastName: string; username: string }[] = [];
    for (const update of data.result) {
      const from = update.message?.from ?? update.callback_query?.from;
      if (!from || from.is_bot) continue;
      const chatId = String(from.id);
      if (seen.has(chatId)) continue;
      seen.add(chatId);
      users.push({
        chatId,
        firstName: from.first_name || "",
        lastName: from.last_name || "",
        username: from.username || "",
      });
    }
    return users;
  } catch {
    return [];
  }
}

/**
 * Test bot token — returns bot username if valid
 */
export async function testTelegramBot(botToken: string): Promise<{ ok: boolean; username: string; error?: string }> {
  if (!botToken) return { ok: false, username: "", error: "تۆکن بەتاڵە" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    if (data.ok) return { ok: true, username: data.result.username };
    return { ok: false, username: "", error: data.description };
  } catch {
    return { ok: false, username: "", error: "هەڵەی تۆڕ" };
  }
}

/**
 * Send order assignment notification to a driver
 */
export async function notifyDriverOfOrder(botToken: string, params: {
  driverChatId: string;
  driverName: string;
  orderNumber: string;
  clientName: string;
  clientCity?: string;
  items: { productName: string; quantity: number; bonusQty?: number }[];
  notes?: string;
  mp3Url?: string;
}): Promise<{ ok: boolean; voiceSent: boolean }> {
  const { driverChatId, driverName, orderNumber, clientName, clientCity, items, notes, mp3Url } = params;

  const itemLines = items
    .map(i => `• ${i.productName} × ${i.quantity}${(i.bonusQty ?? 0) > 0 ? ` (+${i.bonusQty} بۆنەس)` : ""}`)
    .join("\n");

  const textMsg = [
    `🚚 <b>داواکاری نوێ نێردرا بۆ ${driverName}</b>`,
    ``,
    `📦 ژمارەی داواکاری: <b>${orderNumber}</b>`,
    `🏪 کڕیار: <b>${clientName}</b>`,
    clientCity ? `📍 شار: <b>${clientCity}</b>` : "",
    ``,
    `📋 بەرهەمەکان:\n${itemLines}`,
    notes ? `\n📝 تێبینی: ${notes}` : "",
    ``,
    `✅ تکایە مطمئن ببە و ئاگاداری بگەیەنە`,
  ]
    .filter(Boolean)
    .join("\n");

  const textSent = await sendTelegramMessage(botToken, driverChatId, textMsg);

  let voiceSent = false;
  if (mp3Url) {
    voiceSent = await sendTelegramVoice(botToken, driverChatId, mp3Url, `🚚 ${orderNumber} — ${clientName}`);
  }

  return { ok: textSent, voiceSent };
}
