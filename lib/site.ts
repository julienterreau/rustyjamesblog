const SITE_NAME = "Rusty James News";

export const CANONICAL_HOST = "rustyjamesblog.link";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") return `https://${CANONICAL_HOST}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const site = {
  name: SITE_NAME,
  alternateName: "Rusty James Blog",
  title: "Rusty James News — Sciences, politique et ésotérisme depuis 2009",
  description:
    "Recherche indépendante sur la géopolitique, les révolutions scientifiques occultées, l'histoire interdite et les traditions ésotériques. Articles et archives depuis 2009.",
  slogan: "Explorer. Questionner. Comprendre.",
  locale: "fr_FR",
  language: "fr-FR",
  themeColor: "#8B1A1A",
  defaultOgImage: "/gazette/capitol-hero.jpg",
};
