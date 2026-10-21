import { revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import { NextResponse, type NextRequest } from "next/server";

const TYPES = new Set(["article", "category", "author"]);

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(request, secret, true);
    if (!isValidSignature) return NextResponse.json({ ok: false }, { status: 401 });
    if (body?._type && !TYPES.has(body._type)) return NextResponse.json({ ok: true });
    revalidateTag("articles", { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
