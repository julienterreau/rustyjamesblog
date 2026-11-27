import { CANALBLOG_REDIRECTS } from "@/lib/canalblog-redirects";
import { CANONICAL_HOST } from "@/lib/site";
import { NextResponse, type NextRequest } from "next/server";

const CANALBLOG_PATTERN = /^\/archives\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)\.html$/;
const SITE_ORIGIN = `https://${CANONICAL_HOST}`;

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();

  // Filet de sécurité www → apex (Coolify reste la source principale).
  // Jamais d'host/port issus de la requête : origine fixe uniquement.
  if (host === `www.${CANONICAL_HOST}`) {
    const target = new URL(url.pathname + url.search, SITE_ORIGIN);
    return NextResponse.redirect(target, 308);
  }

  const mapped = CANALBLOG_REDIRECTS[url.pathname];
  if (mapped) {
    // Host/port uniquement depuis SITE_ORIGIN ; seul le chemin mappé + la query de la requête.
    const target = new URL(mapped, SITE_ORIGIN);
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
