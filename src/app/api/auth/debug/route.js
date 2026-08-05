import { NextResponse } from "next/server";
import fs from "node:fs";

function debugLog(line) {
  try {
    fs.appendFileSync(
      "auth-debug.log",
      `${new Date().toISOString()} [cliente] ${line}\n`
    );
  } catch {}
}

export async function GET(request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  debugLog(request.nextUrl.searchParams.get("msg") || "");
  return NextResponse.json({ ok: true });
}