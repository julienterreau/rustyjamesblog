"use client";

import { ReaderMap } from "@/components/visits/reader-map";
import type { LiveSnapshot, MapPoint } from "@/lib/visits/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const EMPTY: LiveSnapshot = { online: 0, countries: 0, points: [], visits: [] };
const LiveContext = createContext<LiveSnapshot>(EMPTY);

function asLive(payload: Partial<LiveSnapshot> | null): LiveSnapshot | null {
  if (!payload || !Array.isArray(payload.visits)) return null;
  return {
    online: typeof payload.online === "number" ? payload.online : 0,
    countries: typeof payload.countries === "number" ? payload.countries : 0,
    points: Array.isArray(payload.points) ? (payload.points as MapPoint[]) : [],
    visits: payload.visits,
  };
}

export function LiveProvider({
  initial,
  preview,
  children,
}: {
  initial: LiveSnapshot;
  preview: boolean;
  children: ReactNode;
}) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    if (preview) return;
    let stopped = false;
    const tick = () => {
      void fetch("/api/visites/direct")
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: Partial<LiveSnapshot> | null) => {
          const next = asLive(payload);
          if (!stopped && next) setData(next);
        })
        .catch(() => undefined);
    };
    const id = window.setInterval(tick, 20_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [preview]);

  return <LiveContext.Provider value={data}>{children}</LiveContext.Provider>;
}

export function OnlineNow() {
  const { online } = useContext(LiveContext);
  const label = online > 1 ? `${online} lecteurs en ce moment` : online === 1 ? "1 lecteur en ce moment" : "Aucun lecteur en ce moment";
  return (
    <p className="obs-live notranslate" aria-live="polite" translate="no">
      <span className="obs-dot" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

export function LiveReadersCount() {
  const { online, countries } = useContext(LiveContext);
  const where =
    online === 0
      ? "En direct"
      : countries > 0
        ? `En direct · ${countries.toLocaleString("fr-FR")} pays`
        : "En direct · pays non localisés";

  return (
    <aside className="readers-count" aria-live="polite">
      <p className="readers-label">Visiteurs</p>
      <p className="readers-total">{online.toLocaleString("fr-FR")}</p>
      <p className="readers-where">{where}</p>
    </aside>
  );
}

export function LiveReaderMap({ lands = true }: { lands?: boolean }) {
  const { points } = useContext(LiveContext);
  return <ReaderMap points={points} lands={lands} />;
}

export function LiveReadersHint() {
  const { online, points } = useContext(LiveContext);
  const hint =
    points.length > 0
      ? "Cliquez sur un point"
      : online > 0
        ? "Des lecteurs sont en ligne, mais leur pays n’est pas encore connu."
        : "Aucun lecteur localisé en ce moment.";
  return <p className="readers-hint">{hint}</p>;
}

export function LiveFeed() {
  const { visits } = useContext(LiveContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!visits.length) {
    return (
      <p className="obs-quiet notranslate" translate="no">
        En attente du premier lecteur.
      </p>
    );
  }

  return (
    <ul className="obs-feed notranslate" translate="no">
      {visits.map((visit) => (
        <li key={visit.id}>
          <span className="when">{relative(visit.at)}</span>
          <div>
            <p className="who">{visit.place}</p>
            <p className="what">
              <span className="obs-chip">{visit.device}</span>
              <span className="obs-chip is-red">{visit.source}</span>
              <span>→ {visit.page}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function relative(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
