import { articlePath, formatDate, getArticle, resolveArchiveSlugs } from "@/lib/articles";
import { JsonLd } from "@/components/json-ld";
import {
  articleJsonLd,
  articleMetadata,
  firstArticleImage,
  internalLinkPaths,
  optimizeArticleHtml,
  optimizedImageUrl,
  rewriteExcerpt,
  rewriteInternalLinks,
  stripDuplicateHeading,
} from "@/lib/seo";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { preload } from "react-dom";
import { Suspense } from "react";

type ArticleParams = { slug: string[] };

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticleParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug.join("/"));
  if (!article) return { title: "Article introuvable", robots: { index: false, follow: true } };

  const image = optimizedImageUrl(firstArticleImage(article.content_html) ?? article.image);
  if (image) preload(image, { as: "image", fetchPriority: "high" });

  return articleMetadata(article);
}

export default function ArticlePage({
  params,
}: {
  params: Promise<ArticleParams>;
}) {
  return (
    <>
      <Suspense
        fallback={
          <p className="article" style={{ color: "#847a91" }}>
            Chargement de l’article…
          </p>
        }
      >
        <ArticleView params={params} />
      </Suspense>
    </>
  );
}

async function ArticleView({ params }: { params: Promise<ArticleParams> }) {
  const { slug } = await params;
  const article = await getArticle(slug.join("/"));
  if (!article) {
    if (slug.length === 1) {
      const found = await resolveArchiveSlugs([decodeURIComponent(slug[0])]);
      const target = found[decodeURIComponent(slug[0]).replace(/\/+$/g, "")];
      if (target) redirect(articlePath(target));
    }
    notFound();
  }

  const date = formatDate(article.published_at);
  const description = rewriteExcerpt(article);
  const published = article.published_at ?? undefined;

  return (
    <article className="article">
      <JsonLd data={articleJsonLd(article, description)} />
      <span className="kicker">{article.tags[0] ?? "Actualités"}</span>
      <h1>{article.title}</h1>
      <div className="byline">
        <b>Par {article.author || "rusty james"}</b>
        {date ? <time dateTime={published}>{date}</time> : null}
      </div>
      {article.content_html ? (
        <ArticleHtml html={article.content_html} title={article.title} />
      ) : null}
    </article>
  );
}

async function ArticleHtml({ html, title }: { html: string; title: string }) {
  const resolved = await resolveArchiveSlugs(internalLinkPaths(html));
  const body = stripDuplicateHeading(html, title);
  return (
    <div
      className="content article-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: rewriteInternalLinks(optimizeArticleHtml(body), resolved) }}
    />
  );
}
