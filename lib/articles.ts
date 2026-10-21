import { client } from "@/sanity/lib/client";
import { sanityImageSource } from "@/sanity/lib/image";
import { THEMES } from "@/lib/themes";
import type { PortableTextBlock } from "@portabletext/react";
import { cacheLife, cacheTag } from "next/cache";

export const PAGE_SIZE = 20;

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  author: string | null;
  tags: string[];
  image: string | null;
};

export type Article = ArticleSummary & {
  content_html: string | null;
  body: PortableTextBlock[] | null;
};

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function articleCacheTag(slug: string) {
  const tag = `article:${slug}`;
  if (tag.length <= 240) return tag;
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `article:${(hash >>> 0).toString(16)}`;
}

function titleFromSlug(slug: string) {
  const last = slug.split("/").pop() ?? slug;
  const words = last.replace(/\.html?$/i, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Article sans titre";
  return words.charAt(0).toLocaleUpperCase("fr-FR") + words.slice(1);
}

function displayImage(url: string) {
  if (/\/filters:no_upscale\(\)\/https?%3A/i.test(url)) return "";
  return url.replace(/\/\d{2,4}x\d{2,4}\/smart\//, "/");
}

function iso(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function paris(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  return { year: Number(year), month: `${year}-${month}`, day: `${year}-${month}-${day}` };
}

function compareIdDesc(left: string, right: string) {
  const a = /^article-(\d+)$/.exec(left)?.[1];
  const b = /^article-(\d+)$/.exec(right)?.[1];
  if (a && b) {
    if (a.length !== b.length) return b.length - a.length;
    return a < b ? 1 : a > b ? -1 : 0;
  }
  if (a) return -1;
  if (b) return 1;
  return left < right ? 1 : left > right ? -1 : 0;
}

type RawArticle = {
  id: string;
  slug: string | null;
  title?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  modifiedOn?: string | null;
  author?: string | null;
  tags?: unknown;
  imageUrls?: unknown;
  cover?: { ref?: string | null; crop?: unknown; hotspot?: unknown } | null;
  categories?: unknown;
  legacyHtml?: string | null;
  body?: PortableTextBlock[] | null;
};

type CatalogArticle = ArticleSummary & {
  legacyId: string;
  modified: string | null;
  categories: string[];
  parisDay: string | null;
  parisMonth: string | null;
  parisYear: number | null;
};

const ARTICLE_PROJECTION = `{
  "id": _id,
  "slug": slug.current,
  title,
  excerpt,
  publishedAt,
  modifiedOn,
  "author": author->name,
  tags,
  imageUrls,
  "cover": cover{ "ref": asset._ref, crop, hotspot },
  "categories": categories[]._ref
}`;

function themeIds(value: unknown) {
  const known = new Set<string>(THEMES.map((theme) => theme.id));
  return asStrings(value)
    .map((ref) => (ref.startsWith("category-") ? ref.slice("category-".length) : ""))
    .filter((id) => known.has(id));
}

function coverImage(row: RawArticle) {
  if (row.cover?.ref) {
    return sanityImageSource({
      asset: { _ref: row.cover.ref },
      crop: row.cover.crop,
      hotspot: row.cover.hotspot,
    });
  }
  const images = asStrings(row.imageUrls).map(displayImage).filter(Boolean);
  return images[0] ?? null;
}

function toSummary(row: RawArticle): CatalogArticle | null {
  if (!row.slug) return null;
  const published = iso(row.publishedAt);
  const place = published ? paris(published) : null;
  return {
    legacyId: row.id,
    slug: row.slug,
    title: row.title?.trim() || titleFromSlug(row.slug),
    excerpt: row.excerpt ?? null,
    published_at: published,
    author: row.author ?? null,
    tags: asStrings(row.tags),
    image: coverImage(row),
    modified: iso(row.modifiedOn),
    categories: themeIds(row.categories),
    parisDay: place?.day ?? null,
    parisMonth: place?.month ?? null,
    parisYear: place?.year ?? null,
  };
}

function compareArticles(left: CatalogArticle, right: CatalogArticle) {
  if (left.published_at && right.published_at) {
    const diff = Date.parse(right.published_at) - Date.parse(left.published_at);
    if (diff !== 0) return diff;
    return compareIdDesc(left.legacyId, right.legacyId);
  }
  if (left.published_at) return -1;
  if (right.published_at) return 1;
  return compareIdDesc(left.legacyId, right.legacyId);
}

async function loadCatalog() {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const rows = await client.fetch<RawArticle[]>(`*[_type == "article"]${ARTICLE_PROJECTION}`);
  return rows.flatMap((row) => {
    const article = toSummary(row);
    return article ? [article] : [];
  }).sort(compareArticles);
}

function fold(value: string) {
  return value.toLocaleLowerCase("fr-FR");
}

function themeForTagList(tags: string[] | null) {
  if (!tags?.length) return null;
  return THEMES.find((theme) => theme.tags.length === tags.length && theme.tags.every((tag) => tags.includes(tag))) ?? null;
}

export function articlePath(slug: string) {
  return `/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

export function formatDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(date);
}

export async function listArticles(
  page: number,
  tag?: string,
  date?: string,
  period?: { month?: string | null; fromYear?: number | null; toYear?: number | null },
) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const filter = tag?.trim() || null;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const month = period?.month && /^\d{4}-\d{2}$/.test(period.month) ? period.month : null;
  const fromYear = period?.fromYear && period.toYear ? Math.min(period.fromYear, period.toYear) : null;
  const toYear = period?.fromYear && period.toYear ? Math.max(period.fromYear, period.toYear) : null;
  const catalog = await loadCatalog();
  const matched = catalog.filter((article) => {
    if (filter && !article.tags.includes(filter)) return false;
    if (day && article.parisDay !== day) return false;
    if (month && article.parisMonth !== month) return false;
    if (fromYear !== null && toYear !== null) {
      if (article.parisYear === null || article.parisYear < fromYear || article.parisYear > toYear) return false;
    }
    return true;
  });
  const count = matched.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(requested, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;

  return {
    articles: matched.slice(start, start + PAGE_SIZE),
    page: safePage,
    total: count,
    totalPages,
    tag: filter,
    date: day,
    month,
    fromYear,
    toYear,
  };
}

export async function latestArchiveMonth(tag?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const filter = tag?.trim() || null;
  const catalog = await loadCatalog();
  const article = catalog.find((item) => item.published_at && (!filter || item.tags.includes(filter)));
  return article?.parisMonth ?? null;
}

export async function listArchiveDays(tag?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const filter = tag?.trim() || null;
  const catalog = await loadCatalog();
  const days = new Set<string>();
  for (const article of catalog) {
    if (!article.parisDay) continue;
    if (filter && !article.tags.includes(filter)) continue;
    days.add(article.parisDay);
  }
  return [...days].sort();
}

export async function getHomepage() {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const catalog = await loadCatalog();
  const counts = new Map<string, number>();
  for (const article of catalog) {
    for (const tag of article.tags) {
      if (tag.length > 1) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"))
    .slice(0, 16)
    .map(([tag]) => tag);

  return {
    articles: catalog.slice(0, 18),
    tags,
  };
}

export async function resolveArchiveSlugs(paths: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");

  const cleaned = [
    ...new Set(
      paths
        .map((path) => path.replace(/^\/+|\/+$/g, "").slice(0, 240))
        .filter((path) => path.length > 0 && !path.includes("..")),
    ),
  ].slice(0, 200);
  if (!cleaned.length) return {} as Record<string, string>;

  const leaves = [
    ...new Set(
      cleaned
        .map((path) => path.replace(/\.html?$/i, "").split("/").pop() || "")
        .filter((leaf) => leaf.length > 2),
    ),
  ];
  const cleanedSet = new Set(cleaned);
  const leafSet = new Set(leaves);
  const catalog = await loadCatalog();
  const slugs = catalog
    .filter((article) => {
      const plain = article.slug.replace(/\.html?$/i, "");
      const leaf = plain.split("/").pop() || "";
      return cleanedSet.has(article.slug) || cleanedSet.has(plain) || (leafSet.size > 0 && leafSet.has(leaf));
    })
    .map((article) => article.slug);

  const buckets = new Map<string, Set<string>>();
  const add = (key: string, slug: string) => {
    const set = buckets.get(key) ?? new Set<string>();
    set.add(slug);
    buckets.set(key, set);
  };
  for (const slug of slugs) {
    const plain = slug.replace(/\.html?$/i, "");
    add(slug, slug);
    add(plain, slug);
    const leaf = plain.split("/").pop();
    if (leaf && leaves.includes(leaf)) add(leaf, slug);
  }

  const resolved: Record<string, string> = {};
  for (const path of cleaned) {
    const hits = buckets.get(path);
    if (hits?.size === 1) resolved[path] = [...hits][0];
  }
  return resolved;
}

export async function getArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", articleCacheTag(slug));
  const row = await client.fetch<RawArticle | null>(
    `*[_type == "article" && slug.current == $slug][0]{
      "id": _id,
      "slug": slug.current,
      title,
      excerpt,
      publishedAt,
      modifiedOn,
      "author": author->name,
      tags,
      imageUrls,
      "cover": cover{ "ref": asset._ref, crop, hotspot },
      "categories": categories[]._ref,
      legacyHtml,
      body
    }`,
    { slug },
  );
  const article = row ? toSummary(row) : null;
  if (!article || !row) return null;
  const body = Array.isArray(row.body) && row.body.length > 0 ? row.body : null;
  return {
    ...article,
    content_html: row.legacyHtml ?? null,
    body,
  } satisfies Article;
}

export async function listSitemapArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");
  const catalog = await loadCatalog();
  return catalog.map((article) => ({
    slug: article.slug,
    updated: article.modified ?? article.published_at,
  }));
}

export type GazetteMonth = {
  key: string;
  count: number;
  title: string | null;
  slug: string | null;
};

export type GazetteData = {
  articles: ArticleSummary[];
  dossiers: ArticleSummary[];
  featured: ArticleSummary | null;
  callout: ArticleSummary | null;
  filtered: number;
  total: number;
  months: GazetteMonth[];
  tags: { tag: string; count: number }[];
  themes: { id: string; count: number }[];
};

export async function getGazette(options: {
  tags: string[] | null;
  q: string | null;
  year: number | null;
  limit: number;
}): Promise<GazetteData> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");

  const tags = options.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
  const theme = themeForTagList(tags.length ? tags : null);
  const needle = options.q?.trim().replace(/[%_]/g, "").slice(0, 80) || null;
  const needleFold = needle ? fold(needle) : null;
  const year = options.year && options.year >= 2000 && options.year <= 2100 ? options.year : null;
  const limit = Math.min(Math.max(options.limit, 1), 80);
  const catalog = await loadCatalog();

  const matched = catalog.filter((article) => {
    if (theme) {
      if (!article.categories.includes(theme.id)) return false;
    } else if (tags.length && !tags.some((tag) => article.tags.includes(tag))) {
      return false;
    }
    if (needleFold) {
      const title = fold(article.title);
      const excerpt = fold(article.excerpt ?? "");
      if (!title.includes(needleFold) && !excerpt.includes(needleFold)) return false;
    }
    if (year !== null && article.parisYear !== year) return false;
    return true;
  });

  const months = new Map<string, GazetteMonth>();
  for (const article of catalog) {
    if (!article.parisMonth) continue;
    const month = months.get(article.parisMonth);
    if (month) month.count += 1;
    else months.set(article.parisMonth, { key: article.parisMonth, count: 1, title: article.title, slug: article.slug });
  }

  const tagCounts = new Map<string, number>();
  for (const article of catalog) {
    for (const tag of article.tags) {
      if (tag.length > 2) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const featured = catalog.find((article) => {
    const title = fold(article.title);
    return title.includes(fold("école des mystères")) || title.includes(fold("ecole des mysteres"));
  });
  const callout = catalog.find((article) => {
    const title = fold(article.title);
    const excerpt = fold(article.excerpt ?? "");
    return title.includes(fold("méthylène")) || title.includes(fold("methylene")) || excerpt.includes(fold("méthylène"));
  });

  return {
    articles: matched.slice(0, limit),
    dossiers: catalog.slice(0, 6),
    featured: featured ?? null,
    callout: callout ?? null,
    filtered: matched.length,
    total: catalog.length,
    months: [...months.values()].sort((left, right) => (left.key < right.key ? 1 : left.key > right.key ? -1 : 0)),
    tags: [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"))
      .slice(0, 24)
      .map(([tag, count]) => ({ tag, count })),
    themes: THEMES.map((item) => ({
      id: item.id,
      count: catalog.filter((article) => article.categories.includes(item.id)).length,
    })),
  };
}
