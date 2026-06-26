// ============================================================
// DEWA Telegram Bot Utility
// Sends text and voice (MP3) notifications to drivers
// ============================================================

const STORAGE_KEY = "dewa_telegram";

interface TelegramConfig {
  botToken: string;
  botUsername: string;
  isActive: boolean;
  lastTest: string | null;
}

function getConfig(): TelegramConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Send a plain text message to a Telegram chat
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const config = getConfig();
  if (!config?.botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
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
 * Send an MP3 voice/audio file to a Telegram chat by URL
 */
export async function sendTelegramVoice(chatId: string, mp3Url: string, caption?: string): Promise<boolean> {
  const config = getConfig();
  if (!config?.botToken || !chatId || !mp3Url) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendAudio`, {
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
 * Send an order assignment notification to a driver.
 * If mp3Url is provided, sends voice + text. Otherwise just text.
 */
export async function notifyDriverOfOrder(params: {
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

  // Send text notification
  const textSent = await sendTelegramMessage(driverChatId, textMsg);

  // Send voice MP3 if URL provided
  let voiceSent = false;
  if (mp3Url) {
    voiceSent = await sendTelegramVoice(driverChatId, mp3Url, `🚚 ${orderNumber} — ${clientName}`);
  }

  return { ok: textSent, voiceSent };
}

/**
 * Check if the bot is configured and active
 */
export function isTelegramConfigured(): boolean {
  const config = getConfig();
  return !!(config?.botToken && config?.isActive);
}
