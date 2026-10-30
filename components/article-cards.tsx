import { ArticleCover } from "@/components/article-cover";
import { CoverImage } from "@/components/cover-image";
import { articlePath, formatDate, type ArticleSummary } from "@/lib/articles";
import Link from "next/link";

export function ArticleLink({
  article,
  tone = "ink",
  image = false,
  stretch = false,
  priority = false,
}: {
  article: ArticleSummary;
  tone?: "ink" | "accent";
  image?: boolean;
  stretch?: boolean;
  priority?: boolean;
}) {
  const date = formatDate(article.published_at);
  return (
    <Link
      href={articlePath(article.slug)}
      className={`group border-b border-[#2b2438] py-3 ${
        stretch ? "flex min-h-0 flex-1 flex-col" : "block"
      }`}
    >
      {image ? (
        article.image ? (
          <CoverImage
            src={article.image}
            alt=""
            width={640}
            height={360}
            priority={priority}
            className="aspect-[16/9] w-full bg-[#161616] object-cover"
          />
        ) : (
          <ArticleCover title={article.title} tags={article.tags} slug={article.slug} />
        )
      ) : null}
      <h3
        className={`text-[15px] font-bold leading-snug underline-offset-2 transition-colors group-hover:underline ${
          tone === "accent" ? "text-[#ff5262] group-hover:text-[#f5f0e9]" : "text-[#f5f0e9]"
        }`}
      >
        {article.title}
      </h3>
      {date ? (
        <time className={`block text-[12px] text-[#847a91] ${stretch ? "mt-auto" : ""}`}>
          {date}
        </time>
      ) : null}
    </Link>
  );
}

export function SideStory({ article, kicker }: { article: ArticleSummary; kicker: string }) {
  return (
    <Link href={articlePath(article.slug)} className="group block">
      {article.image ? (
        <CoverImage src={article.image} alt="" width={640} height={360} className="h-[150px] w-full object-cover" />
      ) : null}
      <p className="mt-2 text-[10px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
        {kicker}
      </p>
      <h3 className="mt-1 text-[15px] font-bold leading-snug underline-offset-2 group-hover:underline">
        {article.title}
      </h3>
    </Link>
  );
}

export function CoverCard({
  article,
  kicker,
  className = "",
  titleClassName = "text-[28px]",
}: {
  article: ArticleSummary;
  kicker: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <Link
      href={articlePath(article.slug)}
      className={`group relative flex items-end overflow-hidden bg-[#161616] ${className}`}
    >
      {article.image ? (
        <CoverImage
          src={article.image}
          alt=""
          width={1200}
          height={675}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="relative w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pb-5 pt-16">
        <p className="text-[10px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
          {kicker}
        </p>
        <h3
          className={`mt-2 font-display font-bold leading-[1.15] tracking-[-0.02em] text-white underline-offset-2 group-hover:underline ${titleClassName}`}
        >
          {article.title}
        </h3>
      </div>
    </Link>
  );
}

export function kickerOf(article: ArticleSummary, fallback: string) {
  return (article.tags[0] || fallback).toLocaleUpperCase("fr-FR");
}
