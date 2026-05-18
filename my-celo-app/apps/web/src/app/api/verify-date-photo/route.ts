import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType = "image/jpeg" } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this photo and determine if it's evidence of an in-person date between two people.
Return ONLY a JSON object with these fields:
{
  "twoOrMorePeople": boolean,
  "appearsGenuineInPerson": boolean,
  "confidence": number between 0 and 1,
  "notes": "brief explanation"
}
twoOrMorePeople: true if 2+ people are visible
appearsGenuineInPerson: true if it looks like a real in-person meeting (not a screenshot, not a video call)
confidence: your confidence level in the assessment`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const verified =
      parsed.twoOrMorePeople === true &&
      parsed.appearsGenuineInPerson === true &&
      (parsed.confidence ?? 0) >= 0.7;

    return NextResponse.json(
      {
        verified,
        confidence: parsed.confidence ?? 0,
        twoOrMorePeople: parsed.twoOrMorePeople ?? false,
        appearsGenuineInPerson: parsed.appearsGenuineInPerson ?? false,
        notes: parsed.notes ?? "",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err: any) {
    console.error("verify-date-photo error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
