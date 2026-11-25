import { getLiveSnapshot } from "@/lib/visits/stats";
import { connection } from "next/server";
import { NextResponse } from "next/server";

export async function GET() {
  await connection();
  try {
    const live = await getLiveSnapshot();
    return NextResponse.json(live, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ online: 0, visits: [] }, { headers: { "cache-control": "no-store" } });
  }
}
