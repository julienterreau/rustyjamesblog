const SITE_NAME = "Rusty James News";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const site = {
  name: SITE_NAME,
  title: "Rusty James News — Sciences, politique et ésotérisme",
  description:
    "Un autre regard sur le monde. Sciences, politique et traditions ésotériques : les archives du blog Rusty James News depuis 2009.",
  slogan: "Explorer. Questionner. Comprendre.",
  locale: "fr_FR",
  language: "fr-FR",
};
