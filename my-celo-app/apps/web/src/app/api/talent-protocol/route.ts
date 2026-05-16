import { NextRequest, NextResponse } from "next/server";

// Proxy to avoid CORS. Called from profile page: GET /api/talent-protocol?wallet=0x...
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const apiKey = process.env.TALENT_PROTOCOL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "api_key_not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.talentprotocol.com/api/v2/passports/${encodeURIComponent(wallet)}`,
      {
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // cache for 5 min
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ passport: null }, { status: 200 });
      }
      return NextResponse.json({ error: "talent_protocol_error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ passport: data.passport ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "fetch_error" }, { status: 500 });
  }
}
