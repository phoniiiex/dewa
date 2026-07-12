import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STT API key not configured" }, { status: 500 });
  }

  try {
    // Forward the raw multipart form directly to ElevenLabs
    const formData = await req.formData();

    // Ensure model and language are set
    if (!formData.has("model_id")) formData.set("model_id", "scribe_v1");
    if (!formData.has("language_code")) formData.set("language_code", "kur"); // Kurdish Sorani

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs STT error:", err);
      return NextResponse.json({ error: "Transcription failed", detail: err }, { status: response.status });
    }

    const data = await response.json();
    // ElevenLabs returns { text: "..." }
    return NextResponse.json({ transcript: data.text ?? "" });
  } catch (e) {
    console.error("STT route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
