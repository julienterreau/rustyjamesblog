import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/#une", label: "À la une" },
  { href: "/#dossiers", label: "Dossiers" },
  { href: "/#categories", label: "Catégories" },
  { href: "/archives", label: "Archives" },
];

const HERO =
  "https://framerusercontent.com/images/Cb0QLJCrXm8ekn3uGr4BvCaHWcg.jpg";

export function SiteHeader({ hero = false }: { hero?: boolean }) {
  return (
    <header>
      {hero ? (
        <div className="relative w-full" style={{ aspectRatio: "1571 / 672" }}>
          <Image
            src={HERO}
            alt="Rusty James News : le Capitole sous les éclairs violets"
            fill
            preload
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[1600px] px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-y border-[#e7e7e7] py-3.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-bold tracking-[-0.02em] text-[#737373]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1600px] border-t border-[#e7e7e7] px-6 py-6">
      <p className="font-display text-2xl font-bold tracking-[-0.02em]">Rusty James News</p>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#737373]">
        Archives et opinions dans leur contexte d’origine. Photographies de une :
        illustrations thématiques, et non images originales des articles.
      </p>
    </footer>
  );
}
