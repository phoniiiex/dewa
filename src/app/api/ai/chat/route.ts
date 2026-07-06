import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are a smart business assistant for a pharmaceutical distribution company in Kurdistan, Iraq.
You help managers analyze sales data, orders, clients, medical representatives, and financial performance.
Always respond in the same language as the user (Kurdish Sorani, Arabic, or English).
Be concise, professional, and data-driven. When given business data, use it to give specific insights.
Current business context:
${context || "No specific data provided."}`,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err: unknown) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
