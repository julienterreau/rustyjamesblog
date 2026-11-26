import { CANALBLOG_REDIRECTS } from "@/lib/canalblog-redirects";
import { CANONICAL_HOST } from "@/lib/site";
import { NextResponse, type NextRequest } from "next/server";

const CANALBLOG_PATTERN = /^\/archives\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)\.html$/;

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();

  if (host === `www.${CANONICAL_HOST}`) {
    const target = new URL(url);
    target.protocol = "https:";
    target.host = CANONICAL_HOST;
    return NextResponse.redirect(target, 301);
  }

  const mapped = CANALBLOG_REDIRECTS[url.pathname];
  if (mapped) {
    const target = new URL(mapped, `https://${CANONICAL_HOST}`);
    target.search = url.search;
    return NextResponse.redirect(target, 301);
  }

  // Ne pas renvoyer les URLs Canalblog inconnues vers l'accueil :
  // la plupart des articles gardent encore ce chemin comme slug.
  if (CANALBLOG_PATTERN.test(url.pathname) && host === CANONICAL_HOST) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff2|ttf|xml)$).*)",
  ],
};
