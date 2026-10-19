import { articlePath, formatDate, type ArticleSummary } from "@/lib/articles";
import Image from "next/image";
import Link from "next/link";

export function ArticleLink({
  article,
  tone = "ink",
}: {
  article: ArticleSummary;
  tone?: "ink" | "accent";
}) {
  const date = formatDate(article.published_at);
  return (
    <Link href={articlePath(article.slug)} className="block border-b border-[#e7e7e7] py-3">
      <h3
        className={`text-[15px] font-bold leading-snug ${
          tone === "accent" ? "text-[#c4453c]" : "text-[#161616]"
        }`}
      >
        {article.title}
      </h3>
      {date ? <time className="mt-1.5 block text-[12px] text-[#6e6e6e]">{date}</time> : null}
    </Link>
  );
}

export function SideStory({ article, kicker }: { article: ArticleSummary; kicker: string }) {
  return (
    <Link href={articlePath(article.slug)} className="block">
      {article.image ? (
        <img
          src={article.image}
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="h-[150px] w-full object-cover"
        />
      ) : null}
      <p className="mt-2 text-[10px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
        {kicker}
      </p>
      <h3 className="mt-1 text-[15px] font-bold leading-snug">{article.title}</h3>
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
      className={`relative flex items-end overflow-hidden bg-[#161616] ${className}`}
    >
      {article.image ? (
        <img
          src={article.image}
          alt=""
          width={1200}
          height={675}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="relative w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pb-5 pt-16">
        <p className="text-[10px] font-bold tracking-[-0.02em] text-[#d4003c] uppercase">
          {kicker}
        </p>
        <h3
          className={`mt-2 font-display font-bold leading-[1.15] tracking-[-0.02em] text-white ${titleClassName}`}
        >
          {article.title}
        </h3>
      </div>
    </Link>
  );
}

export function DossierCard({
  href,
  image,
  kicker,
  title,
}: {
  href: string;
  image: string;
  kicker: string;
  title: string;
}) {
  return (
    <Link href={href} className="relative flex h-[280px] items-end overflow-hidden bg-[#161616]">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="relative z-10 w-full bg-gradient-to-t from-black/85 to-transparent px-5 pt-12 pb-5">
        <p className="text-[10px] font-bold tracking-[-0.02em] text-white uppercase">{kicker}</p>
        <h3 className="mt-2 font-display text-[38px] leading-[1.15] font-bold tracking-[-0.02em] text-white">
          {title}
        </h3>
      </div>
    </Link>
  );
}

export function kickerOf(article: ArticleSummary, fallback: string) {
  return (article.tags[0] || fallback).toLocaleUpperCase("fr-FR");
}
