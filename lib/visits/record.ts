import "server-only";
import { randomUUID } from "node:crypto";
import { apiClient } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";
import {
  articleSlugFromPath,
  classifyAgent,
  classifySource,
  cleanPath,
  clientIp,
  cloudflareCountry,
  isBot,
  isPrefetch,
  readUtm,
  visitorHash,
} from "@/lib/visits/classify";
import { locate } from "@/lib/visits/geo";

type Incoming = {
  path?: unknown;
  referrer?: unknown;
  utm?: unknown;
};

export async function recordVisit(headers: Headers, body: Incoming) {
  if (isPrefetch(headers)) return null;
  const userAgent = headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return null;

  const path = cleanPath(body.path);
  if (!path) return null;

  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "";
  const utm = readUtm(body.utm);
  const ip = clientIp(headers);
  const place = await locate(ip, cloudflareCountry(headers));
  const agent = classifyAgent(userAgent);
  const slug = articleSlugFromPath(path);
  const article = slug ? await findArticle(slug) : null;
  const id = `visit-${randomUUID()}`;

  await writeClient.create({
    _id: id,
    _type: "visit",
    occurredAt: new Date().toISOString(),
    path,
    country: place.country,
    city: place.city,
    latitude: place.latitude,
    longitude: place.longitude,
    device: agent.device,
    client: agent.client,
    source: classifySource(referrer, utm.source),
    utmSource: utm.source || null,
    utmMedium: utm.medium || null,
    utmCampaign: utm.campaign || null,
    visitorId: visitorHash(ip, userAgent),
    durationSec: null,
    articleTitle: article?.title ?? null,
    articleCategory: article?.category ?? null,
    articleSlug: article?.slug ?? null,
    seeded: false,
  });

  return id;
}

export async function recordDuration(id: unknown, seconds: unknown) {
  if (typeof id !== "string" || !/^visit-[0-9a-f-]{36}$/.test(id)) return;
  const value = typeof seconds === "number" ? seconds : Number(seconds);
  if (!Number.isFinite(value) || value < 1) return;
  const durationSec = Math.min(1800, Math.round(value));
  const existing = await writeClient.fetch<{ _id: string } | null>(`*[_id == $id && _type == "visit"][0]{ _id }`, { id });
  if (!existing) return;
  await writeClient.patch(id).set({ durationSec }).commit();
}

async function findArticle(slug: string) {
  try {
    return await apiClient.fetch<{ title: string | null; slug: string | null; category: string | null } | null>(
      `*[_type == "article" && slug.current == $slug][0]{
        title,
        "slug": slug.current,
        "category": categories[0]->name
      }`,
      { slug },
    );
  } catch {
    return null;
  }
}
