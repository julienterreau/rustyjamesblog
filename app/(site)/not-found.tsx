import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <div className="article">
        <h1>Page introuvable</h1>
        <p className="content">Cet article n’existe pas dans les archives.</p>
        <Link href="/" className="callout-more">
          Retour à l’accueil
        </Link>
      </div>
    </>
  );
}
