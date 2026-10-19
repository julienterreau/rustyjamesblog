import { SiteHeader } from "@/components/site-chrome";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Page introuvable</h1>
        <p className="mt-3 text-sm text-[#737373]">Cet article n’existe pas dans les archives.</p>
        <Link href="/" className="mt-6 inline-block text-[13px] font-bold text-[#d4003c]">
          Retour à l’accueil
        </Link>
      </div>
    </>
  );
}
