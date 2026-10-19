import { pool } from "@/lib/db";
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

function mapArticle(row: ArticleRow): Article {
  const images = asStrings(row.image_urls);
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

export async function listArticles(page: number, tag?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * PAGE_SIZE;
  const filter = tag?.trim() || null;

  const [articles, total] = await Promise.all([
    pool.query<ArticleRow>(
      `SELECT slug, title, excerpt, published_at, author, tags, image_urls
       FROM articles
       WHERE ($3::text IS NULL OR tags ? $3)
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $1 OFFSET $2`,
      [PAGE_SIZE, offset, filter],
    ),
    pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM articles
       WHERE ($1::text IS NULL OR tags ? $1)`,
      [filter],
    ),
  ]);

  const count = total.rows[0]?.count ?? 0;

  return {
    articles: articles.rows.map((article) => mapArticle(article)),
    page: safePage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    tag: filter,
  };
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

export async function getArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", `article:${slug}`);
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
