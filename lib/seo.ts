import { articlePath, type Article } from "@/lib/articles";
import { isSanityImage, sanityImageUrl } from "@/sanity/lib/image";
import { absoluteUrl, getSiteUrl, site } from "@/lib/site";
import type { Metadata } from "next";

function metadataImage(src: string | null | undefined) {
  if (!src) return undefined;
  return isSanityImage(src) ? sanityImageUrl(src, 1200) : src;
}

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

export function sameTitle(left: string, right: string) {
  const fold = (value: string) =>
    stripText(value)
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("fr-FR")
      .replace(/[^a-z0-9]+/g, "");
  const a = fold(left);
  const b = fold(right);
  if (!a || !b) return false;
  return a === b || (a.length > 24 && b.length > 24 && (a.startsWith(b) || b.startsWith(a)));
}

export function stripDuplicateHeading(html: string, title: string) {
  return html.replace(/<h[1-2]\b[^>]*>[\s\S]*?<\/h[1-2]>/i, (heading) => (sameTitle(heading, title) ? "" : heading));
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

const OPTIMIZED_WIDTH = 750;

export function optimizedImageUrl(src: string | null | undefined) {
  if (!src || src.startsWith("/") || src.startsWith("data:")) return src ?? null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.protocol !== "https:") return src;
  const host = url.hostname;
  const allowed =
    host === "framerusercontent.com" ||
    host === "canalblog.com" ||
    host.endsWith(".canalblog.com") ||
    host.endsWith(".blogspot.com");
  if (!allowed) return src;
  return `/_next/image?url=${encodeURIComponent(url.href)}&w=${OPTIMIZED_WIDTH}&q=75`;
}

export function firstArticleImage(html: string | null) {
  if (!html) return null;
  const match = html.match(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  return match?.[1] || match?.[2] || match?.[3] || null;
}

const OWN_HOST = /^(?:www\.)?(?:rustyjamesblog\.link|rustyjames\.canalblog\.com)$/i;

export function articleHrefPath(href: string) {
  const value = href.trim();
  if (!value || value.startsWith("#") || /^mailto:/i.test(value) || /^javascript:/i.test(value)) return null;
  if (/^https?:/i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (!OWN_HOST.test(url.hostname)) return null;
    const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "");
    if (!path || path.startsWith("wp-") || path.startsWith("wp-content")) return null;
    return path.slice(0, 240);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  const path = value.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  if (!path || /\s/.test(path) || path.includes("..")) return null;
  if (/^(?:archives\/|\d{4}\/\d{2}\/)/i.test(path) || /\.html?$/i.test(path)) return path.slice(0, 240);
  return null;
}

const BARE_OWN_URL = /https?:\/\/(?:www\.)?(?:rustyjamesblog\.link|rustyjames\.canalblog\.com)\/[^\s<"'()]+/gi;

export function internalLinkPaths(html: string) {
  const paths = new Set<string>();
  const add = (href: string) => {
    const path = articleHrefPath(href);
    if (path) paths.add(path);
  };
  for (const match of html.matchAll(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    add(match[1] || match[2] || "");
  }
  for (const match of html.matchAll(BARE_OWN_URL)) {
    add(match[0].replace(/[.,;:)]+$/, ""));
  }
  return [...paths].slice(0, 200);
}

export function rewriteInternalLinks(html: string, resolved: Record<string, string>) {
  const checked = new Set(internalLinkPaths(html));
  html = html.replace(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!hrefMatch) return full;
    const href = hrefMatch[1] ?? hrefMatch[2] ?? "";
    const path = articleHrefPath(href);
    if (!path || !checked.has(path)) return full;
    const slug = resolved[path];
    if (!slug) return inner;
    const quote = hrefMatch[1] === undefined ? "'" : '"';
    const next = attrs.replace(hrefMatch[0], `href=${quote}${articlePath(slug)}${quote}`);
    return `<a${next}>${inner}</a>`;
  });
  return html.replace(BARE_OWN_URL, (href, offset: number, source: string) => {
    const previous = source[offset - 1] ?? "";
    if (previous === '"' || previous === "'" || previous === "=") return href;
    const trimmed = href.replace(/[.,;:)]+$/, "");
    const suffix = href.slice(trimmed.length);
    const path = articleHrefPath(trimmed);
    if (!path || !checked.has(path)) return href;
    const slug = resolved[path];
    if (!slug) return suffix;
    return `<a href="${articlePath(slug)}">${trimmed}</a>${suffix}`;
  });
}

function unwrapAswiftHosts(html: string) {
  const open = /<div\b[^>]*\bid=["']aswift_\d+_host["'][^>]*>/gi;
  let result = "";
  let cursor = 0;
  for (const match of html.matchAll(open)) {
    const start = match.index ?? 0;
    if (start < cursor) continue;
    const innerStart = start + match[0].length;
    const close = matchingCloseDiv(html, innerStart);
    if (close < 0) continue;
    result += html.slice(cursor, start) + html.slice(innerStart, close);
    cursor = close + "</div>".length;
  }
  return result + html.slice(cursor);
}

function matchingClose(html: string, from: number, tag: string) {
  const token = new RegExp(`</?${tag}\\b[^>]*>`, "gi");
  token.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return match.index;
  }
  return -1;
}

function matchingCloseDiv(html: string, from: number) {
  return matchingClose(html, from, "div");
}

function unwrapAdsByGoogle(html: string) {
  const open = /<ins\b[^>]*\bclass\s*=\s*(?:"[^"]*\badsbygoogle\b[^"]*"|'[^']*\badsbygoogle\b[^']*')[^>]*>/gi;
  let result = "";
  let cursor = 0;
  for (const match of html.matchAll(open)) {
    const start = match.index ?? 0;
    if (start < cursor) continue;
    const innerStart = start + match[0].length;
    const close = matchingClose(html, innerStart, "ins");
    if (close < 0) continue;
    const inner = html.slice(innerStart, close);
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    result += html.slice(cursor, start) + (text.length > 40 ? inner : "");
    cursor = close + "</ins>".length;
  }
  return result + html.slice(cursor);
}

function stripStyleAttributes(html: string) {
  return html.replace(/<[a-zA-Z][^>]*>/g, (tag) => {
    let result = "";
    let index = 0;
    while (index < tag.length) {
      const styleAt = tag.slice(index).search(/\sstyle\s*=/i);
      if (styleAt < 0) return result + tag.slice(index);
      result += tag.slice(index, index + styleAt);
      let cursor = index + styleAt + tag.slice(index + styleAt).match(/^\sstyle\s*=\s*/i)![0].length;
      const quote = tag[cursor];
      if (quote !== '"' && quote !== "'") {
        while (cursor < tag.length && tag[cursor] !== " " && tag[cursor] !== ">") cursor += 1;
        index = cursor;
        continue;
      }
      cursor += 1;
      let end = tag.length - 1;
      for (let mark = cursor; mark < tag.length; mark += 1) {
        if (tag[mark] !== quote) continue;
        const next = tag[mark + 1] ?? "";
        if (next === ">" || /\s/.test(next)) {
          end = mark;
          break;
        }
      }
      index = end + 1;
    }
    return result;
  });
}

export function optimizeArticleHtml(html: string) {
  html = unwrapAswiftHosts(html);
  html = unwrapAdsByGoogle(html);
  html = stripStyleAttributes(html);
  html = html.replace(/<img\b[^>]*\/filters:no_upscale\(\)\/https?%3A[^>]*>/gi, "");
  let seen = false;
  return html.replace(/<img\b([^>]*?)\/?>/gi, (_match, raw: string) => {
    let attrs = String(raw).trim();
    const first = !seen;
    seen = true;
    if (first) {
      const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const src = srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3];
      const optimized = optimizedImageUrl(src);
      if (src && optimized && optimized !== src && srcMatch) {
        attrs = attrs.replace(srcMatch[0], `src="${optimized}"`);
      }
    }
    const has = (name: string) => new RegExp(`\\b${name}\\s*=`, "i").test(attrs);
    const ampWidth = attrs.match(/\bdata-amp-width\s*=\s*"(\d+)"/i)?.[1];
    const ampHeight = attrs.match(/\bdata-amp-height\s*=\s*"(\d+)"/i)?.[1];
    const extra = [
      has("width") ? "" : `width="${ampWidth || "1200"}"`,
      has("height") ? "" : `height="${ampHeight || "675"}"`,
      has("loading") ? "" : first ? 'fetchpriority="high"' : 'loading="lazy"',
      has("decoding") ? "" : 'decoding="async"',
      has("alt") ? "" : 'alt=""',
    ].filter(Boolean);
    return `<img ${attrs}${extra.length ? ` ${extra.join(" ")}` : ""}>`;
  });
}

export function articleMetadata(article: Article): Metadata {
  const description = rewriteExcerpt(article);
  const path = articlePath(article.slug);
  const image = metadataImage(article.image);

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
  const image = metadataImage(article.image);

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
        image: image ? [image] : undefined,
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
