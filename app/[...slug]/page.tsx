import { getArticle, formatDate } from "@/lib/articles";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-chrome";
import { articleJsonLd, articleMetadata, optimizeArticleHtml, rewriteExcerpt } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type ArticleParams = { slug: string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticleParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug.join("/"));
  if (!article) return { title: "Article introuvable", robots: { index: false, follow: true } };

  return articleMetadata(article);
}

export default function ArticlePage({
  params,
}: {
  params: Promise<ArticleParams>;
}) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<p className="px-6 py-10 text-sm text-[#737373]">Chargement de l’article…</p>}>
        <ArticleView params={params} />
      </Suspense>
    </>
  );
}

async function ArticleView({ params }: { params: Promise<ArticleParams> }) {
  const { slug } = await params;
  const article = await getArticle(slug.join("/"));
  if (!article) notFound();

  const date = formatDate(article.published_at);
  const description = rewriteExcerpt(article);
  const published = article.published_at ?? undefined;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-8">
      <JsonLd data={articleJsonLd(article, description)} />
      <Link href="/" className="text-[13px] font-bold text-[#737373]">
        Accueil
      </Link>
      {article.tags[0] ? (
        <p className="mt-6 text-[10px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
          {article.tags[0]}
        </p>
      ) : null}
      <h1 className="mt-3 font-display text-4xl font-bold leading-[1.15] tracking-[-0.02em] lg:text-5xl">
        {article.title}
      </h1>
      <p className="mt-3 text-xs text-[#737373]">
        {date ? <time dateTime={published}>{date}</time> : null}
        {date ? " · " : null}
        {article.author || "Rusty James"}
      </p>
      {article.image ? (
        <div className="mt-6 aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-[#f7f7f7]">
          <img
            src={article.image}
            alt={article.title}
            width={1200}
            height={675}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <p className="mt-6 text-lg leading-8 text-[#737373]">{description}</p>
      {article.content_html ? (
        <div
          className="article-body prose prose-zinc mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: optimizeArticleHtml(article.content_html) }}
        />
      ) : null}
    </article>
  );
}
