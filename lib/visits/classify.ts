import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import type { SourceName } from "@/lib/visits/types";

const BOTS = [
  /bot\b/i,
  /spider/i,
  /crawler/i,
  /slurp/i,
  /facebookexternalhit/i,
  /embedly/i,
  /quora link preview/i,
  /pinterestbot/i,
  /slackbot/i,
  /whatsapp/i,
  /wget\//i,
  /curl\//i,
  /python-requests/i,
  /headless/i,
  /lighthouse/i,
  /pagespeed/i,
  /pingdom/i,
  /uptimerobot/i,
  /semrush/i,
  /ahrefs/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /amazonbot/i,
  /bingbot/i,
  /googlebot/i,
  /yandex/i,
  /duckduckbot/i,
  /baiduspider/i,
  /applebot/i,
  /ia_archiver/i,
];

const OWN_HOSTS = new Set(["rustyjamesblog.link", "localhost", "127.0.0.1"]);

export function isBot(userAgent: string) {
  const ua = userAgent.trim();
  if (!ua || ua.length < 8) return true;
  return BOTS.some((pattern) => pattern.test(ua));
}

export function isPrefetch(headers: Headers) {
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch")) return true;
  if (headers.get("next-router-prefetch") === "1") return true;
  if (headers.get("x-middleware-prefetch") === "1") return true;
  return false;
}

/** Première adresse publique : Cloudflare, puis la chaîne transmise, puis X-Real-IP. */
export function clientIp(headers: Headers) {
  const cloudflare = publicAddress(headers.get("cf-connecting-ip"));
  if (cloudflare) return cloudflare;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    for (const part of forwarded.split(",")) {
      const address = publicAddress(part);
      if (address) return address;
    }
  }
  return publicAddress(headers.get("x-real-ip")) ?? "";
}

function publicAddress(value: string | null | undefined) {
  const address = value?.trim() ?? "";
  if (!address || isPrivateAddress(address)) return null;
  return address;
}

function isPrivateAddress(address: string) {
  const value = address.toLowerCase();
  if (value === "::1" || value === "0.0.0.0" || value.startsWith("127.")) return true;
  if (value.startsWith("10.") || value.startsWith("192.168.") || value.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
  if (value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return true;
  if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
  return false;
}

/** Pays annoncé par Cloudflare, s'il est un vrai code ISO. */
export function cloudflareCountry(headers: Headers) {
  const code = headers.get("cf-ipcountry")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === "XX" || code === "T1" || code === "A1" || code === "A2") return null;
  return code;
}

export function visitorHash(ip: string, userAgent: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const salt = process.env.VISITOR_SALT || "rj-visites";
  return createHash("sha256").update(`${ip}\n${userAgent}\n${salt}\n${day}`).digest("hex").slice(0, 32);
}

export function cleanPath(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.length > 500) return null;
  if (/[\u0000-\u001f\s]/.test(value)) return null;
  return value;
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text.length > max) return text.slice(0, max);
  return text;
}

export function readUtm(value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    source: clip(source.source, 80),
    medium: clip(source.medium, 80),
    campaign: clip(source.campaign, 120),
    content: clip(source.content, 120),
    term: clip(source.term, 120),
  };
}

function namedSource(value: string): SourceName | null {
  const text = value.toLowerCase();
  if (!text) return null;
  if (/facebook|instagram|\bfb\b/.test(text)) return "Facebook";
  if (/google/.test(text)) return "Google";
  if (/telegram|^tg$/.test(text)) return "Telegram";
  if (/(^|[^a-z])x([^a-z]|$)|twitter|^tw$/.test(text)) return "X";
  return null;
}

export function classifySource(referrer: string, utmSource: string): SourceName {
  const fromUtm = namedSource(utmSource);
  if (fromUtm) return fromUtm;
  if (!referrer) return "Accès direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Accès direct";
  }
  if (OWN_HOSTS.has(host) || host.endsWith(".localhost")) return "Accès direct";
  if (host === "t.co" || host === "x.com" || host.endsWith("twitter.com")) return "X";
  if (host === "t.me" || host.endsWith("telegram.org") || host.endsWith("telegram.me")) return "Telegram";
  if (host.endsWith("facebook.com") || host.endsWith("fb.com") || host.endsWith("instagram.com")) return "Facebook";
  if (host.startsWith("google.") || host.includes(".google.")) return "Google";
  return namedSource(host) ?? "Autres sites";
}

export function classifyAgent(userAgent: string) {
  const parsed = new UAParser(userAgent).getResult();
  const kind = parsed.device.type;
  const device = kind === "mobile" ? "Mobile" : kind === "tablet" ? "Tablette" : kind ? "Autre" : "Ordinateur";
  const os = parsed.os.name || "";
  const browser = /FBAN|FBAV|FB_IAB/i.test(userAgent) ? "Facebook in-app" : parsed.browser.name || "Autre";
  const client = browser === "Facebook in-app" || !os ? browser : `${browser} · ${os}`;
  return { device, client };
}

export function articleSlugFromPath(pathname: string) {
  if (pathname === "/" || pathname === "/visiteurs" || pathname === "/archives") return null;
  if (pathname.startsWith("/studio") || pathname.startsWith("/api")) return null;
  try {
    const slug = decodeURIComponent(pathname.slice(1));
    if (!slug || slug.includes("..")) return null;
    return slug;
  } catch {
    return null;
  }
}
