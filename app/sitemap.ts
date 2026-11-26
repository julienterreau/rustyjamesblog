import { articlePath, listSitemapArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Uniquement les URLs indexables — pas /visiteurs, ni pages paginées, ni filtres. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listSitemapArticles();

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/archives"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...articles.map((article) => ({
      url: absoluteUrl(articlePath(article.slug)),
      lastModified: article.updated ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
