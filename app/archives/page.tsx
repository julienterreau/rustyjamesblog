import { listArticles, PAGE_SIZE } from "@/lib/articles";
import { ArticleLink } from "@/components/article-cards";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-chrome";
import { archiveJsonLd } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>;
}): Promise<Metadata> {
  const { page: pageParam, tag } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const label = tag?.trim();
  const title = label ? `${label} — archives` : page > 1 ? `Archives, page ${page}` : "Archives";
  const description = label
    ? `Archives Rusty James classées « ${label} ». Chapôs rédigés pour ce site, textes datés hors du fil d’origine.`
    : "Index des archives Rusty James News : sciences, histoire, politique et traditions, classées et datées pour ce site.";
  const query = new URLSearchParams();
  if (label) query.set("tag", label);
  if (page > 1) query.set("page", String(page));
  const path = query.size ? `/archives?${query.toString()}` : "/archives";

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<p className="px-6 py-10 text-sm text-[#737373]">Chargement…</p>}>
        <ArchiveList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ArchiveList({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const { page: pageParam, tag } = await searchParams;
  const { articles, page, total, totalPages, tag: activeTag } = await listArticles(
    Number(pageParam ?? "1"),
    tag,
  );
  const query = activeTag ? `&tag=${encodeURIComponent(activeTag)}` : "";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <p className="text-[10px] font-bold tracking-[-0.02em] text-[#d4003c]">ARCHIVES</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.02em]">
        {activeTag ?? "Toutes les archives"}
      </h1>
      <p className="mt-2 text-xs text-[#737373]">
        {total} articles · {PAGE_SIZE} par page
      </p>
      <JsonLd
        data={archiveJsonLd(articles, activeTag ? `Archives : ${activeTag}` : "Toutes les archives")}
      />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {articles.map((article) => (
          <ArticleLink key={article.slug} article={article} />
        ))}
      </div>
      {articles.length === 0 ? (
        <p className="mt-8 text-sm text-[#737373]">Aucun article pour cette sélection.</p>
      ) : null}
      <nav className="mt-10 flex items-center justify-between text-[13px] font-bold">
        {page > 1 ? (
          <Link href={`/archives?page=${page - 1}${query}`}>Précédent</Link>
        ) : (
          <span />
        )}
        <span className="font-normal text-[#737373]">
          Page {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={`/archives?page=${page + 1}${query}`}>Suivant</Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
