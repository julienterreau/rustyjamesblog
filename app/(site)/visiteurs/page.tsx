import { ReaderMap } from "@/components/visits/reader-map";
import { getVisitorStats } from "@/lib/visits/stats";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Visiteurs",
  description: "Nos lecteurs, sur la terre. Pays d'où l'on lit Rusty James News.",
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
        <p className="readers-lede">Chaque point est un pays d&apos;où l&apos;on lit Rusty James News.</p>
      </header>
      <Suspense fallback={<div className="readers-stage" />}>
        <ReaderBoard />
      </Suspense>
    </main>
  );
}

async function ReaderBoard() {
  const stats = await getVisitorStats("tout");
  const countries = stats.countries.length;

  return (
    <>
      <ReaderMap points={stats.points} />
      <div className="readers-foot">
        <aside className="readers-count">
          <p className="readers-label">Visites</p>
          <p className="readers-total">{stats.visits.toLocaleString("fr-FR")}</p>
          <p className="readers-where">{unit(countries, "pays", "pays")}</p>
        </aside>
        <p className="readers-hint">
          {stats.visits === 0 ? "Aucune visite pour l'instant." : stats.points.length > 0 ? "Cliquez sur un point" : "Aucun pays localisé pour l'instant."}
        </p>
      </div>
    </>
  );
}

function unit(count: number, one: string, many: string) {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? many : one}`;
}
