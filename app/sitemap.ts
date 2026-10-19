import { articlePath, listSitemapArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

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
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: absoluteUrl(articlePath(article.slug)),
      lastModified: article.updated ?? undefined,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
