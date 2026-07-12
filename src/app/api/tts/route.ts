import { NextRequest, NextResponse } from "next/server";

// Default to "Aria" — ElevenLabs multilingual voice
const DEFAULT_VOICE_ID = "9BWtsMINqrJLrRacOk9x";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TTS API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const text: string = body.text ?? "";
    const voiceId: string = body.voiceId ?? DEFAULT_VOICE_ID;

    if (!text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs TTS error:", err);
      return NextResponse.json({ error: "TTS failed", detail: err }, { status: response.status });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("TTS route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
