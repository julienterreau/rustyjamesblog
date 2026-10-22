import { sendNewArticle } from "@/lib/newsletter";
import { revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import { NextResponse, type NextRequest } from "next/server";

const TYPES = new Set(["article", "category", "author"]);

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  try {
    const { isValidSignature, body } = await parseBody<{ _id?: string; _type?: string }>(request, secret, true);
    if (!isValidSignature) return NextResponse.json({ ok: false }, { status: 401 });
    if (body?._type && !TYPES.has(body._type)) return NextResponse.json({ ok: true });
    revalidateTag("articles", { expire: 0 });

    const operation = request.headers.get("sanity-operation");
    if (body?._type === "article" && body._id && operation === "create") {
      try {
        await sendNewArticle(body._id);
      } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
