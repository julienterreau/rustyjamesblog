import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { articlePath } from "@/lib/articles";
import { apiClient } from "@/sanity/lib/client";
import { projectCity } from "@/lib/visits/projection";
import type {
  ArticleRank,
  Bar,
  ChartBar,
  CountryRank,
  DeviceSlice,
  Kpi,
  LiveSnapshot,
  LiveVisit,
  MapPoint,
  Period,
  VisitRow,
  VisitorStats,
} from "@/lib/visits/types";

const LIMIT = 12000;
const SOURCE_HINT: Record<string, string> = {
  Facebook: "Réseau social",
  Google: "Recherche",
  Telegram: "Messagerie",
  X: "Réseau social",
};

const ROW = `{
  occurredAt, path, country, city, latitude, longitude, device, client, source,
  visitorId, durationSec, articleTitle, articleCategory, articleSlug
}`;

type Range = { from: Date; to: Date; previousFrom: Date | null };

export async function getVisitorStats(period: Period): Promise<VisitorStats> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag("visits");

  const now = new Date();
  const range = periodRange(period, now);
  const start = range.previousFrom ?? range.from;
  const rows = await fetchRows(start, range.to);
  const partial = rows.length >= LIMIT;
  const stats = assemble(rows, period, now, partial);
  const live = await queryLive();
  return { ...stats, live };
}

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  return queryLive();
}

function periodRange(period: Period, now: Date): Range {
  if (period === "tout") {
    return { from: new Date("2000-01-01T00:00:00.000Z"), to: now, previousFrom: null };
  }
  const span = period === "24h" ? 86_400_000 : period === "7j" ? 7 * 86_400_000 : 30 * 86_400_000;
  const from = new Date(now.getTime() - span);
  return { from, to: now, previousFrom: new Date(from.getTime() - span) };
}

async function fetchRows(from: Date, to: Date) {
  const rows = await apiClient.fetch<VisitRow[]>(
    `*[_type == "visit" && occurredAt >= $from && occurredAt < $to] | order(occurredAt desc)[0...${LIMIT}] ${ROW}`,
    { from: from.toISOString(), to: to.toISOString() },
  );
  return Array.isArray(rows) ? rows : [];
}

async function queryLive(): Promise<LiveSnapshot> {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const [online, rows] = await Promise.all([
    apiClient.fetch<number>(`count(array::unique(*[_type == "visit" && occurredAt >= $since].visitorId))`, { since }),
    apiClient.fetch<Array<VisitRow & { _id?: string }>>(
      `*[_type == "visit"] | order(occurredAt desc)[0...10]{
        _id, occurredAt, path, country, city, latitude, longitude, device, client, source,
        visitorId, durationSec, articleTitle, articleCategory, articleSlug
      }`,
    ),
  ]);
  return {
    online: typeof online === "number" ? online : 0,
    visits: (Array.isArray(rows) ? rows : []).map((row, index) => toLive(row, row._id || `live-${index}`)),
  };
}

function assemble(rows: VisitRow[], period: Period, now: Date, partial: boolean): Omit<VisitorStats, "live"> {
  const range = periodRange(period, now);
  const current = rows.filter((row) => inRange(row, range.from, range.to));
  const previous = range.previousFrom ? rows.filter((row) => inRange(row, range.previousFrom as Date, range.from)) : [];
  const compare = period !== "tout" && !partial;
  const visits = current.length;
  const uniques = distinct(current);
  const prevVisits = previous.length;
  const prevUniques = distinct(previous);
  const countries = rankCountries(current);
  const prevCountries = new Set(previous.map((row) => row.country).filter(Boolean)).size;
  const pages = uniques === 0 ? 0 : visits / uniques;
  const prevPages = prevUniques === 0 ? 0 : prevVisits / prevUniques;
  const read = averageRead(current);
  const prevRead = averageRead(previous);
  const unknown = current.filter((row) => !row.country).length;

  const hint = compareHint(period);
  const kpis: Kpi[] = [
    { label: "Visites", value: formatNumber(visits), ...percentDelta(visits, prevVisits, compare), hint },
    { label: "Visiteurs uniques", value: formatNumber(uniques), ...percentDelta(uniques, prevUniques, compare), hint },
    {
      label: "Pays",
      value: formatNumber(countries.length),
      ...countDelta(countries.length, prevCountries, compare),
      hint: compare ? "par rapport à la période précédente" : "sur l'ensemble",
    },
    {
      label: "Pages / visite",
      value: uniques === 0 ? "—" : formatDecimal(pages),
      ...decimalDelta(pages, prevPages, compare && prevUniques > 0),
      hint: compare ? hint : "",
    },
    {
      label: "Temps de lecture",
      value: read == null ? "—" : formatDuration(read),
      ...percentDelta(read ?? 0, prevRead ?? 0, compare && read != null && prevRead != null),
      hint: "moyenne",
    },
  ];

  return {
    period,
    generatedAt: now.toISOString(),
    partial,
    visits,
    kpis,
    points: mapPoints(current),
    countries,
    unknown,
    unknownShare: visits === 0 ? "0" : formatPercent(unknown / visits),
    sources: bars(current, (row) => row.source || "Autres sites", SOURCE_HINT),
    devices: devices(current),
    browsers: bars(current, (row) => row.client || "Autre"),
    chart: chart(current, period, range, now),
    chartTitle: period === "24h" ? "heure par heure" : "jour par jour",
    chartHint: chartHint(period),
    articles: articles(current),
  };
}

function inRange(row: VisitRow, from: Date, to: Date) {
  const time = new Date(row.occurredAt).getTime();
  return time >= from.getTime() && time < to.getTime();
}

function distinct(rows: VisitRow[]) {
  return new Set(rows.map((row) => row.visitorId).filter(Boolean)).size;
}

function averageRead(rows: VisitRow[]) {
  const values = rows.map((row) => row.durationSec).filter((value): value is number => typeof value === "number" && value > 0);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentDelta(current: number, previous: number, enabled: boolean) {
  if (!enabled || previous <= 0) return { delta: null, negative: false };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { delta: null, negative: false };
  return { delta: `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`, negative: pct < 0 };
}

function countDelta(current: number, previous: number, enabled: boolean) {
  if (!enabled) return { delta: null, negative: false };
  const diff = current - previous;
  if (diff === 0) return { delta: null, negative: false };
  return { delta: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`, negative: diff < 0 };
}

function decimalDelta(current: number, previous: number, enabled: boolean) {
  if (!enabled) return { delta: null, negative: false };
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return { delta: null, negative: false };
  const text = formatDecimal(Math.abs(diff));
  return { delta: `${diff > 0 ? "+" : "−"}${text}`, negative: diff < 0 };
}

function compareHint(period: Period) {
  if (period === "24h") return "vs. 24 h précédentes";
  if (period === "7j") return "vs. 7 j précédents";
  if (period === "30j") return "vs. 30 j précédents";
  return "";
}

function chartHint(period: Period) {
  if (period === "24h") return "24 dernières heures";
  if (period === "7j") return "7 derniers jours";
  if (period === "30j") return "30 derniers jours";
  return "Depuis le lancement";
}

function mapPoints(rows: VisitRow[]): MapPoint[] {
  const groups = new Map<string, MapPoint>();
  for (const row of rows) {
    if (typeof row.latitude !== "number" || typeof row.longitude !== "number") continue;
    const projected = projectCity(row.longitude, row.latitude);
    if (!projected) continue;
    const city = row.city || "Ville inconnue";
    const code = row.country || "";
    const key = `${code}|${city}|${row.latitude.toFixed(2)}|${row.longitude.toFixed(2)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      city,
      country: countryName(code),
      code,
      count: 1,
      x: projected[0],
      y: projected[1],
    });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function rankCountries(rows: VisitRow[]): CountryRank[] {
  const groups = new Map<string, { count: number; cities: Map<string, number> }>();
  for (const row of rows) {
    if (!row.country) continue;
    const group = groups.get(row.country) ?? { count: 0, cities: new Map() };
    group.count += 1;
    if (row.city) group.cities.set(row.city, (group.cities.get(row.city) ?? 0) + 1);
    groups.set(row.country, group);
  }
  const total = rows.length || 1;
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([code, group]) => ({
      code,
      name: countryName(code),
      flag: flagEmoji(code),
      count: group.count,
      share: formatPercent(group.count / total),
      cities: [...group.cities.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([city]) => city)
        .join(" · "),
    }));
}

function bars(rows: VisitRow[], labelOf: (row: VisitRow) => string, hints: Record<string, string> = {}): Bar[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = labelOf(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = ranked[0]?.[1] ?? 1;
  const total = rows.length || 1;
  return ranked.map(([label, count]) => ({
    label,
    hint: hints[label] ?? "",
    count,
    share: formatPercent(count / total),
    width: Math.max(2, Math.round((count / max) * 100)),
  }));
}

function devices(rows: VisitRow[]): DeviceSlice[] {
  const order = ["Mobile", "Ordinateur", "Tablette", "Autre"];
  const counts = new Map(order.map((label) => [label, 0]));
  for (const row of rows) {
    const label = row.device && counts.has(row.device) ? row.device : "Autre";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return order
    .map((label) => ({ label, count: counts.get(label) ?? 0, share: Math.round(((counts.get(label) ?? 0) / total) * 100) }))
    .filter((item) => item.count > 0);
}

function chart(rows: VisitRow[], period: Period, range: Range, now: Date): ChartBar[] {
  if (period === "24h") {
    const buckets = new Map<string, ChartBar>();
    for (let index = 23; index >= 0; index -= 1) {
      const date = new Date(now.getTime() - index * 3_600_000);
      const key = hourKey(date);
      if (buckets.has(key)) continue;
      const hour = key.slice(11, 13);
      buckets.set(key, { label: `${Number(hour)} h`, title: `${Number(hour)} h`, value: 0 });
    }
    for (const row of rows) {
      if (!inRange(row, range.from, range.to)) continue;
      const bucket = buckets.get(hourKey(new Date(row.occurredAt)));
      if (bucket) bucket.value += 1;
    }
    return [...buckets.values()];
  }

  const startKey = dayKey(period === "tout" ? firstDay(rows, range.from) : range.from);
  const endKey = dayKey(now);
  const keys = daysBetween(startKey, endKey);
  const grouped = keys.length > 90 ? byWeek(keys) : keys.map((key) => ({ key, keys: [key] }));
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!inRange(row, range.from, range.to)) continue;
    const key = dayKey(new Date(row.occurredAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return grouped.map((group) => {
    const value = group.keys.reduce((sum, key) => sum + (counts.get(key) ?? 0), 0);
    return { label: dayLabel(group.key), title: dayTitle(group.key), value };
  });
}

function articles(rows: VisitRow[]): ArticleRank[] {
  const groups = new Map<string, { title: string; slug: string; category: string; count: number; read: number[] }>();
  for (const row of rows) {
    if (!row.articleSlug || !row.articleTitle) continue;
    const group = groups.get(row.articleSlug) ?? {
      title: row.articleTitle,
      slug: row.articleSlug,
      category: row.articleCategory || "Article",
      count: 0,
      read: [],
    };
    group.count += 1;
    if (typeof row.durationSec === "number" && row.durationSec > 0) group.read.push(row.durationSec);
    groups.set(row.articleSlug, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((group) => {
      const mean = group.read.length ? group.read.reduce((sum, value) => sum + value, 0) / group.read.length : null;
      const read = mean == null ? "" : `${formatDuration(mean)} de lecture`;
      return {
        title: group.title,
        href: articlePath(group.slug),
        meta: [group.category, read].filter(Boolean).join(" · "),
        count: group.count,
      };
    });
}

function pageName(path: string) {
  if (path === "/") return "Accueil";
  if (path === "/visiteurs") return "Visiteurs";
  if (path === "/archives") return "Archives";
  return path;
}

function toLive(row: VisitRow, id: string): LiveVisit {
  const place = row.city && row.country ? `${row.city}, ${countryName(row.country)}` : "Lieu inconnu";
  return {
    id,
    at: row.occurredAt,
    place,
    device: row.device || "Appareil",
    source: row.source || "Accès direct",
    page: row.articleTitle || pageName(row.path),
  };
}

function firstDay(rows: VisitRow[], fallback: Date) {
  let oldest = fallback.getTime();
  for (const row of rows) {
    const time = new Date(row.occurredAt).getTime();
    if (Number.isFinite(time) && time < oldest) oldest = time;
  }
  return new Date(oldest);
}

function hourKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}`;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function daysBetween(start: string, end: string) {
  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end && keys.length < 400) {
    keys.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return keys;
}

function shiftDay(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function byWeek(keys: string[]) {
  const groups: { key: string; keys: string[] }[] = [];
  for (const key of keys) {
    const current = groups[groups.length - 1];
    if (!current || current.keys.length >= 7) groups.push({ key, keys: [key] });
    else current.keys.push(key);
  }
  return groups;
}

function dayLabel(key: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00.000Z`));
}

function dayTitle(key: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00.000Z`));
}

const regions = new Intl.DisplayNames(["fr"], { type: "region" });

function countryName(code: string | null) {
  if (!code) return "Lieu inconnu";
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

function flagEmoji(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return [...code].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value * 100);
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (minutes < 1) return `${rounded} s`;
  if (!rest) return `${minutes} min`;
  return `${minutes} min ${rest}`;
}
