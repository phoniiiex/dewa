import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = (process.env.GEMINI_API_KEY ?? "").trim();
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = (await req.json()) as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const prompt = `You are analyzing a pharmaceutical product image.
Extract ALL visible information and return ONLY a valid JSON object — no markdown, no extra text.

Return this exact JSON shape (use empty string "" for fields you cannot read):
{
  "name": "full medicine name including strength e.g. Amoxicillin 500mg",
  "company": "manufacturer / company name",
  "barcode": "the printed barcode or QR code number if visible as text",
  "batchNumber": "batch/lot number — often labeled LOT, Batch",
  "expiryDate": "expiry date in YYYY-MM-DD format — look for EXP, Expiry",
  "issueDate": "manufacturing date in YYYY-MM-DD format — look for MFG, MFD",
  "category": "medicine category e.g. Antibiotic, Analgesic, Vitamin",
  "activeIngredients": "active ingredients / composition if visible",
  "dosageForm": "e.g. Tablet, Capsule, Syrup, Injection, Cream",
  "description": "any other useful info from the label"
}

Return ONLY the JSON object, nothing else.`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("[scan-product] Gemini error:", raw);
      return NextResponse.json({ error: "AI scan failed" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(clean); } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({
      name:              String(parsed.name              ?? ""),
      company:           String(parsed.company           ?? ""),
      barcode:           String(parsed.barcode           ?? ""),
      batchNumber:       String(parsed.batchNumber       ?? ""),
      expiryDate:        String(parsed.expiryDate        ?? ""),
      issueDate:         String(parsed.issueDate         ?? ""),
      category:          String(parsed.category          ?? ""),
      activeIngredients: String(parsed.activeIngredients ?? ""),
      dosageForm:        String(parsed.dosageForm        ?? ""),
      description:       String(parsed.description       ?? ""),
    });
  } catch (err) {
    console.error("[scan-product] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
