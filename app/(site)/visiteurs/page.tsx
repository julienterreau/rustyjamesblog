import { LiveProvider, LiveReaderMap, LiveReadersCount, LiveReadersHint } from "@/components/visits/live";
import { getArchiveVisits, getLiveSnapshot } from "@/lib/visits/stats";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Visiteurs",
  description: "Nos lecteurs, sur la terre. Pays d'où l'on lit Rusty James News en ce moment.",
  alternates: { canonical: "/visiteurs" },
};

export default function VisitorsPage() {
  return (
    <main className="readers">
      <header className="readers-intro">
        <p className="readers-kicker">Visiteurs</p>
        <h1>
          Nos lecteurs,
          <br />
          <em>sur la terre.</em>
        </h1>
        <p className="readers-lede">Chaque point est un pays d&apos;où l&apos;on lit Rusty James News en ce moment.</p>
      </header>
      <Suspense fallback={<div className="readers-stage" />}>
        <ReaderBoard />
      </Suspense>
    </main>
  );
}

async function ReaderBoard() {
  const [archive, live] = await Promise.all([getArchiveVisits(), getLiveSnapshot()]);

  return (
    <LiveProvider initial={live} preview={false}>
      <LiveReaderMap />
      <div className="readers-foot notranslate" translate="no">
        <div className="readers-counts">
          <aside className="readers-count">
            <p className="readers-label">Visiteurs</p>
            <p className="readers-total">{archive.toLocaleString("fr-FR")}</p>
            <p className="readers-where">Depuis 2009</p>
          </aside>
          <LiveReadersCount />
        </div>
        <div className="readers-aside">
          <LiveReadersHint />
        </div>
      </div>
    </LiveProvider>
  );
}
