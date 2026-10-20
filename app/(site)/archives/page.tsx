import { listArchiveDays, listArticles, PAGE_SIZE } from "@/lib/articles";
import { archivesHref, formatArchiveMonth, formatCivilDate, parseArchiveDate, parseArchiveMonth } from "@/lib/archive-links";
import { ArticleLink } from "@/components/article-cards";
import { ArchiveDateFilter } from "@/components/archive-date-filter";
import { ArchivePager } from "@/components/archive-pager";
import { JsonLd } from "@/components/json-ld";
import { archiveJsonLd } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

type ArchiveParams = { page?: string; tag?: string; date?: string; month?: string; year?: string; from?: string; to?: string };

function yearParam(value?: string) {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1990 && year <= 2100 ? year : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ArchiveParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const label = params.tag?.trim();
  const date = parseArchiveDate(params.date);
  const month = parseArchiveMonth(params.month)?.value ?? null;
  const year = month || date ? null : yearParam(params.year);
  const from = year || month || date ? null : yearParam(params.from);
  const to = year || month || date ? null : yearParam(params.to);
  const periodLabel = date
    ? formatCivilDate(date)
    : month
      ? formatArchiveMonth(month)
      : year
        ? String(year)
        : from && to
          ? `${Math.max(from, to)} – ${Math.min(from, to)}`
          : null;
  const title = periodLabel
    ? `Archives — ${periodLabel}`
    : label
      ? `${label} — archives`
      : page > 1
        ? `Archives, page ${page}`
        : "Archives";
  const description = periodLabel
    ? `Articles des archives Rusty James publiés en ${periodLabel}.`
    : label
      ? `Archives Rusty James classées « ${label} ». Chapôs rédigés pour ce site, textes datés hors du fil d’origine.`
      : "Index des archives Rusty James News : sciences, histoire, politique et traditions, classées et datées pour ce site.";
  const path = archivesHref({ page, tag: label, date, month, year, from, to });

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
  searchParams: Promise<ArchiveParams>;
}) {
  return (
    <>
      <Suspense fallback={<p className="article">Chargement…</p>}>
        <ArchiveList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ArchiveList({ searchParams }: { searchParams: Promise<ArchiveParams> }) {
  const params = await searchParams;
  const date = parseArchiveDate(params.date);
  const month = parseArchiveMonth(params.month)?.value ?? null;
  const year = month || date ? null : yearParam(params.year);
  const from = year || month || date ? null : yearParam(params.from);
  const to = year || month || date ? null : yearParam(params.to);
  const tag = params.tag?.trim() || null;
  const fromYear = year ?? (from && to ? Math.min(from, to) : null);
  const toYear = year ?? (from && to ? Math.max(from, to) : null);
  const periodLabel = date
    ? formatCivilDate(date)
    : month
      ? formatArchiveMonth(month)
      : year
        ? String(year)
        : fromYear && toYear && fromYear !== toYear
          ? `${toYear} – ${fromYear}`
          : null;

  const [days, listing] = await Promise.all([
    listArchiveDays(tag ?? undefined),
    listArticles(Number(params.page ?? "1"), tag ?? undefined, date ?? undefined, {
      month,
      fromYear,
      toYear,
    }),
  ]);
  const { articles, page, total, totalPages, tag: activeTag } = listing;

  return (
    <div className="gazette-archives wrap archive-page">
      <header className="archive-head">
        <div>
          <p className="rubric">ARCHIVES</p>
          <h1 className="h-lg">{periodLabel ?? activeTag ?? "Toutes les archives"}</h1>
          <p className="fil-count">
            {total} articles · {PAGE_SIZE} par page
          </p>
        </div>
        <ArchiveDateFilter
          days={days}
          tag={activeTag}
          date={date}
          month={month}
          year={year}
        />
      </header>
      {activeTag || periodLabel ? (
        <p className="archive-filter">
          {activeTag ? (
            <>
              Catégorie : <span>{activeTag}</span>
            </>
          ) : null}
          {periodLabel ? (
            <>
              {activeTag ? " · " : null}
              Période : <span>{periodLabel}</span>
            </>
          ) : null}{" "}
          <Link href="/archives">Retirer</Link>
        </p>
      ) : null}
      <JsonLd
        data={archiveJsonLd(
          articles,
          date ? `Archives du ${formatCivilDate(date)}` : activeTag ? `Archives : ${activeTag}` : "Toutes les archives",
        )}
      />
      <div className="archive-grid">
        {articles.map((article, index) => (
          <ArticleLink key={article.slug} article={article} image priority={index === 0} />
        ))}
      </div>
      {articles.length === 0 ? (
        <p className="mt-8 text-sm text-[#737373]">Aucun article pour cette sélection.</p>
      ) : null}
      <ArchivePager
        page={page}
        totalPages={totalPages}
        tag={activeTag}
        date={date}
        month={month}
        year={year}
        from={fromYear && toYear && fromYear !== toYear ? fromYear : null}
        to={fromYear && toYear && fromYear !== toYear ? toYear : null}
      />
    </div>
  );
}
