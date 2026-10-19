import { articlePath, type Article } from "@/lib/articles";
import { absoluteUrl, getSiteUrl, site } from "@/lib/site";
import type { Metadata } from "next";

const LEADS = ["Note de lecture", "Repère d’archive", "Dossier relu", "Fiche de lecture"] as const;

function stripText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function clipAtWord(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[.,;:]+$/, "").trim()}…`;
}

function sentences(plain: string) {
  return plain
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 50 && sentence.length <= 220);
}

export function rewriteExcerpt(article: {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
}) {
  const plain = stripText(article.excerpt ?? "");
  const title = article.title.toLocaleLowerCase("fr-FR");
  const body = plain.toLocaleLowerCase("fr-FR");
  const topic = article.tags
    .map((tag) => tag.trim())
    .find((tag) => {
      if (tag.length < 3 || tag.length > 28) return false;
      const needle = tag.toLocaleLowerCase("fr-FR");
      if (title.includes(needle)) return false;
      return body.includes(needle);
    });
  const hash = [...article.slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const lead = LEADS[hash % LEADS.length];
  const follow = sentences(plain)[1];
  const where = topic ? ` Classement : ${topic}.` : "";
  const base = `${lead} : ${article.title}.${where}`;
  const rest = follow ?? "Texte daté, relu pour cette édition sans reprendre l’accroche d’origine.";

  return clipAtWord(`${base} ${rest}`, 160);
}

export function optimizeArticleHtml(html: string) {
  return html.replace(/<img\b([^>]*?)\/?>/gi, (_match, raw: string) => {
    const attrs = String(raw).trim();
    const has = (name: string) => new RegExp(`\\b${name}\\s*=`, "i").test(attrs);
    const extra = [
      has("width") ? "" : 'width="1200"',
      has("height") ? "" : 'height="675"',
      has("loading") ? "" : 'loading="lazy"',
      has("decoding") ? "" : 'decoding="async"',
      has("alt") ? "" : 'alt=""',
    ].filter(Boolean);
    return `<img ${attrs}${extra.length ? ` ${extra.join(" ")}` : ""}>`;
  });
}

export function articleMetadata(article: Article): Metadata {
  const description = rewriteExcerpt(article);
  const path = articlePath(article.slug);
  const image = article.image ?? undefined;

  return {
    title: article.title,
    description,
    keywords: article.tags.slice(0, 8),
    alternates: { canonical: path },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: site.locale,
      url: path,
      siteName: site.name,
      title: article.title,
      description,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.published_at ?? undefined,
      authors: [article.author || "Rusty James"],
      tags: article.tags.slice(0, 8),
      images: image ? [{ url: image, alt: article.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: article.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function siteGraph() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: site.name,
        description: site.description,
        inLanguage: site.language,
        publisher: { "@id": `${url}/#publisher` },
      },
      {
        "@type": "Organization",
        "@id": `${url}/#publisher`,
        name: site.name,
        url,
        slogan: site.slogan,
        description: site.description,
      },
    ],
  };
}

export function articleJsonLd(article: Article, description: string) {
  const url = absoluteUrl(articlePath(article.slug));
  const home = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: article.title,
        description,
        inLanguage: site.language,
        datePublished: article.published_at ?? undefined,
        dateModified: article.published_at ?? undefined,
        articleSection: article.tags[0],
        keywords: article.tags.slice(0, 8).join(", ") || undefined,
        image: article.image ? [article.image] : undefined,
        author: {
          "@type": "Person",
          name: article.author || "Rusty James",
        },
        publisher: { "@id": `${home}/#publisher` },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: home },
          { "@type": "ListItem", position: 2, name: "Archives", item: absoluteUrl("/archives") },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}

export function archiveJsonLd(articles: { slug: string; title: string }[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: articles.length,
    itemListElement: articles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: absoluteUrl(articlePath(article.slug)),
    })),
  };
}
