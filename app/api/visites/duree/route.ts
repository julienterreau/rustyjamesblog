import { recordDuration } from "@/lib/visits/record";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: unknown; seconds?: unknown };
    await recordDuration(body.id, body.seconds);
  } catch {
    console.error("Durée de lecture non enregistrée.");
  }
  return new NextResponse(null, { status: 204 });
}
