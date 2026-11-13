import { recordVisit } from "@/lib/visits/record";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { path?: unknown; referrer?: unknown; utm?: unknown };
    const id = await recordVisit(request.headers, body);
    if (!id) return new NextResponse(null, { status: 204 });
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    console.error("Visite non enregistrée.");
    return new NextResponse(null, { status: 204 });
  }
}
