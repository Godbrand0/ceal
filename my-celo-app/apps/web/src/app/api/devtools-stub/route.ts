import { NextResponse } from "next/server";

/**
 * Chrome DevTools probes /.well-known/appspecific/com.chrome.devtools.json on
 * every page load. Without a handler Next.js logs a 404 warning on every request.
 * This stub silences it by returning an empty JSON object.
 */
export async function GET() {
  return NextResponse.json({});
}
