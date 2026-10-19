import { articlePath, getHomepage } from "@/lib/articles";
import { ArticleLink, CoverCard, DossierCard, SideStory } from "@/components/article-cards";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-chrome";
import { archiveJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: { absolute: site.title },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.title,
    description: site.description,
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      <SiteHeader hero />
      <Suspense fallback={<p className="px-6 py-10 text-sm text-[#737373]">Chargement…</p>}>
        <Newspaper />
      </Suspense>
    </>
  );
}

async function Newspaper() {
  const { articles, tags } = await getHomepage();
  const fil = articles.slice(0, 3);
  const decouvrir = articles.slice(3, 8);
  const featured = articles[8];
  const side = articles.slice(9, 11);
  const selection = articles.slice(11, 15);
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-6 py-6 pb-14">
      <JsonLd data={archiveJsonLd(articles.slice(0, 12), "Archives récentes")} />
      <section id="une" className="grid gap-x-8 lg:grid-cols-3">
        {fil.map((article, index) => (
          <div key={article.slug}>
            <p
              className={`mb-1 text-[11px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase ${
                index === 0 ? "" : "hidden lg:invisible lg:block"
              }`}
            >
              Le fil des archives
            </p>
            <ArticleLink article={article} />
          </div>
        ))}
      </section>

      <section
        id="dossiers"
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_220px_minmax(0,0.95fr)]"
      >
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
            À découvrir
          </p>
          {decouvrir.map((article) => (
            <ArticleLink key={article.slug} article={article} tone="accent" />
          ))}
        </div>
        {featured ? (
          <CoverCard
            article={featured}
            kicker="Archéologie"
            className="min-h-[360px] lg:min-h-[460px]"
            titleClassName="text-[32px] lg:text-[38px]"
          />
        ) : null}
        <div className="flex flex-col gap-6">
          {side[0] ? <SideStory article={side[0]} kicker="Géopolitique" /> : null}
          {side[1] ? <SideStory article={side[1]} kicker="Ésotérisme" /> : null}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
            La sélection
          </p>
          {selection.map((article) => (
            <ArticleLink key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 bg-[#161616] px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
        <p className="font-display text-3xl font-bold tracking-[-0.02em]">Rusty James News</p>
        <p className="text-sm text-white/80">Explorer. Questionner. Comprendre.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[25px] font-bold tracking-[-0.02em]">
          Sciences, histoire & société
        </h2>
        <div className="h-[3px] bg-[#161616]" />
        <div className="grid gap-6 md:grid-cols-2">
          <DossierCard
            href={articlePath("archives/2013/06/25/27508872.html")}
            image="https://framerusercontent.com/images/FsNXf0PgddmMTyZxZVTQoXAZJE.jpg"
            kicker="Politique & société"
            title="Les pouvoirs à l’épreuve des révélations"
          />
          <DossierCard
            href={articlePath("archives/2011/12/27/23054459.html")}
            image="https://framerusercontent.com/images/JC4sANvaPZtsIaSB7Sl4ytqtUA.jpg"
            kicker="Mystères & connaissances"
            title="Traditions, symboles et connaissances oubliées"
          />
        </div>
      </section>

      <section id="categories">
        <h2 className="font-display text-[25px] font-bold tracking-[-0.02em]">Toutes les catégories</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/archives?tag=${encodeURIComponent(tag)}`}
              className="border border-[#e7e7e7] bg-[#f7f7f7] px-3.5 py-2.5 text-[13px] font-bold tracking-[-0.02em]"
            >
              {tag}
            </Link>
          ))}
        </div>
        <Link
          href="/archives"
          className="mt-8 inline-block font-display text-[25px] leading-[1.15] font-bold tracking-[-0.02em]"
        >
          Parcourir les archives
        </Link>
        <div className="mt-4 max-w-3xl">
          {articles.slice(0, 12).map((article) => (
            <ArticleLink key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
