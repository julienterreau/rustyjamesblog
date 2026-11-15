import { articlePath, listFeedArticles } from "@/lib/articles";
import { absoluteUrl, site } from "@/lib/site";
import { cacheLife, cacheTag } from "next/cache";

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plain(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function feedDocument() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");
  const articles = await listFeedArticles();
  const self = absoluteUrl("/rss.xml");
  const home = absoluteUrl("/");
  const updated = articles.find((article) => article.published_at)?.published_at;
  const items = articles
    .map((article) => {
      const link = absoluteUrl(articlePath(article.slug));
      const description = plain(article.excerpt ?? "").slice(0, 500) || article.title;
      const when = article.published_at ? new Date(article.published_at).toUTCString() : "";
      const categories = article.tags.map((tag) => `      <category>${xml(tag)}</category>`).join("\n");
      return `    <item>
      <title>${xml(article.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>${when ? `\n      <pubDate>${when}</pubDate>` : ""}
      <description>${xml(description)}</description>
      <dc:creator>${xml(article.author || "Rusty James")}</dc:creator>
${categories}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(home)}</link>
    <description>${xml(site.description)}</description>
    <language>fr-fr</language>
    <lastBuildDate>${new Date(updated ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export async function GET() {
  const body = await feedDocument();
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
