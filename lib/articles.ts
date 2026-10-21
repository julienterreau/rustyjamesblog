import { pool } from "@/lib/db";
import { THEMES } from "@/lib/themes";
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

type ArticleRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: Date | null;
  author: string | null;
  tags: unknown;
  image_urls: unknown;
  content_html?: string | null;
};

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

function mapArticle(row: ArticleRow): Article {
  const images = asStrings(row.image_urls).map(displayImage).filter(Boolean);
  return {
    slug: row.slug,
    title: row.title?.trim() || titleFromSlug(row.slug),
    excerpt: row.excerpt,
    published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
    author: row.author,
    tags: asStrings(row.tags),
    image: images[0] ?? null,
    content_html: row.content_html ?? null,
  };
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

  const total = await pool.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM articles
     WHERE ($1::text IS NULL OR tags ? $1)
       AND ($2::date IS NULL OR (published_at AT TIME ZONE 'Europe/Paris')::date = $2::date)
       AND ($3::text IS NULL OR to_char(published_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM') = $3)
       AND ($4::int IS NULL OR EXTRACT(YEAR FROM published_at AT TIME ZONE 'Europe/Paris')::int BETWEEN $4 AND $5)`,
    [filter, day, month, fromYear, toYear],
  );
  const count = total.rows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(requested, totalPages);

  const articles = await pool.query<ArticleRow>(
    `SELECT slug, title, excerpt, published_at, author, tags, image_urls
     FROM articles
     WHERE ($3::text IS NULL OR tags ? $3)
       AND ($4::date IS NULL OR (published_at AT TIME ZONE 'Europe/Paris')::date = $4::date)
       AND ($5::text IS NULL OR to_char(published_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM') = $5)
       AND ($6::int IS NULL OR EXTRACT(YEAR FROM published_at AT TIME ZONE 'Europe/Paris')::int BETWEEN $6 AND $7)
     ORDER BY published_at DESC NULLS LAST, id DESC
     LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, (safePage - 1) * PAGE_SIZE, filter, day, month, fromYear, toYear],
  );

  return {
    articles: articles.rows.map((article) => mapArticle(article)),
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
  const result = await pool.query<{ month: string | null }>(
    `SELECT to_char((published_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM') AS month
     FROM articles
     WHERE published_at IS NOT NULL
       AND ($1::text IS NULL OR tags ? $1)
     ORDER BY published_at DESC NULLS LAST
     LIMIT 1`,
    [tag?.trim() || null],
  );
  return result.rows[0]?.month ?? null;
}

export async function listArchiveDays(tag?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const result = await pool.query<{ day: string }>(
    `SELECT DISTINCT to_char((published_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM-DD') AS day
     FROM articles
     WHERE published_at IS NOT NULL
       AND ($1::text IS NULL OR tags ? $1)
     ORDER BY 1`,
    [tag?.trim() || null],
  );
  return result.rows.map((row) => row.day);
}

export async function getHomepage() {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const [latest, tags] = await Promise.all([
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT 18`,
    ),
    pool.query<{ tag: string }>(
      `SELECT tag FROM (
         SELECT jsonb_array_elements_text(tags) AS tag FROM articles
       ) labels
       WHERE length(tag) > 1
       GROUP BY tag
       ORDER BY count(*) DESC
       LIMIT 16`,
    ),
  ]);

  return {
    articles: latest.rows.map((article) => mapArticle(article)),
    tags: tags.rows.map((row) => row.tag),
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
  const result = await pool.query<{ slug: string }>(
    `SELECT slug FROM articles
     WHERE slug = ANY($1::text[])
        OR regexp_replace(slug, '\\.html?$', '') = ANY($1::text[])
        OR (cardinality($2::text[]) > 0 AND split_part(regexp_replace(slug, '\\.html?$', ''), '/', -1) = ANY($2::text[]))`,
    [cleaned, leaves],
  );

  const buckets = new Map<string, Set<string>>();
  const add = (key: string, slug: string) => {
    const set = buckets.get(key) ?? new Set<string>();
    set.add(slug);
    buckets.set(key, set);
  };
  for (const slug of result.rows.map((row) => row.slug)) {
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
  const result = await pool.query<ArticleRow>(
    `SELECT slug, title, excerpt, content_html, published_at, author, tags, image_urls
     FROM articles
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );

  const article = result.rows[0];
  if (!article) return null;

  return mapArticle(article);
}

export async function listSitemapArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");
  const result = await pool.query<{ slug: string; updated: Date | string | null }>(
    `SELECT slug, coalesce(modified_at, published_at) AS updated
     FROM articles
     ORDER BY published_at DESC NULLS LAST, id DESC`,
  );

  return result.rows.map((row) => ({
    slug: row.slug,
    updated: row.updated ? new Date(row.updated).toISOString() : null,
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
  const tagFilter = tags.length ? tags : null;
  const needle = options.q?.trim().replace(/[%_]/g, "").slice(0, 80) || null;
  const like = needle ? `%${needle}%` : null;
  const year = options.year && options.year >= 2000 && options.year <= 2100 ? options.year : null;
  const limit = Math.min(Math.max(options.limit, 1), 80);

  const where = `
    ($1::text[] IS NULL OR tags ?| $1::text[])
    AND ($2::text IS NULL OR title ILIKE $2 OR coalesce(excerpt, '') ILIKE $2)
    AND ($3::int IS NULL OR extract(year FROM published_at AT TIME ZONE 'Europe/Paris') = $3)
  `;

  const themeCountSql = THEMES.map(
    (theme, index) => `count(*) FILTER (WHERE tags ?| $${index + 1}::text[])::int AS ${theme.id}`,
  ).join(", ");
  const [list, filtered, total, months, tagRows, themeCounts, dossiers, featured, callout] = await Promise.all([
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       WHERE ${where}
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $4`,
      [tagFilter, like, year, limit],
    ),
    pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM articles WHERE ${where}`, [tagFilter, like, year]),
    pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM articles`),
    pool.query<{ ym: string; n: number; title: string | null; slug: string | null }>(
      `SELECT to_char((published_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM') AS ym,
              count(*)::int AS n,
              (array_agg(title ORDER BY published_at DESC NULLS LAST))[1] AS title,
              (array_agg(slug ORDER BY published_at DESC NULLS LAST))[1] AS slug
       FROM articles
       WHERE published_at IS NOT NULL
       GROUP BY 1
       ORDER BY 1 DESC`,
    ),
    pool.query<{ tag: string; n: number }>(
      `SELECT tag, count(*)::int AS n
       FROM (SELECT jsonb_array_elements_text(tags) AS tag FROM articles) listed
       WHERE length(tag) > 2
       GROUP BY tag
       ORDER BY n DESC
       LIMIT 24`,
    ),
    pool.query<Record<string, number>>(`SELECT ${themeCountSql} FROM articles`, THEMES.map((theme) => theme.tags)),
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT 6`,
    ),
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       WHERE title ILIKE '%école des mystères%' OR title ILIKE '%ecole des mysteres%'
       ORDER BY published_at DESC NULLS LAST
       LIMIT 1`,
    ),
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       WHERE title ILIKE '%méthylène%' OR title ILIKE '%methylene%' OR coalesce(excerpt, '') ILIKE '%méthylène%'
       ORDER BY published_at DESC NULLS LAST
       LIMIT 1`,
    ),
  ]);

  return {
    articles: list.rows.map((row) => mapArticle(row)),
    dossiers: dossiers.rows.map((row) => mapArticle(row)),
    featured: featured.rows[0] ? mapArticle(featured.rows[0]) : null,
    callout: callout.rows[0] ? mapArticle(callout.rows[0]) : null,
    filtered: filtered.rows[0]?.n ?? 0,
    total: total.rows[0]?.n ?? 0,
    months: months.rows.map((row) => ({
      key: row.ym,
      count: row.n,
      title: row.title,
      slug: row.slug,
    })),
    tags: tagRows.rows.map((row) => ({ tag: row.tag, count: row.n })),
    themes: THEMES.map((theme) => ({ id: theme.id, count: Number(themeCounts.rows[0]?.[theme.id] ?? 0) })),
  };
}
