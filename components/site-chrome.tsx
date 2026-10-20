import { SubscribeForm } from "@/components/subscribe-form";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { Suspense } from "react";

export function SiteHeader({ hero = false }: { hero?: boolean }) {
  return (
    <header>
      {hero ? (
        <div className="relative w-full" style={{ aspectRatio: "1571 / 672" }}>
          <img
            src="/hero.webp"
            alt="Rusty James News : le Capitole sous les éclairs violets"
            width={1571}
            height={672}
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[1600px] px-6">
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1600px] border-t border-[#e7e7e7] px-6 py-6 text-center">
      <p className="font-display text-2xl font-bold tracking-[-0.02em]">Rusty James News</p>
      <SubscribeForm />
      <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-[#737373]">
        Archives et opinions dans leur contexte d’origine. Photographies de une :
        illustrations thématiques, et non images originales des articles.
      </p>
    </footer>
  );
}
