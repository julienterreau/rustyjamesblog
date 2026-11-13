"use client";

import type { LiveSnapshot } from "@/lib/visits/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const LiveContext = createContext<LiveSnapshot>({ online: 0, visits: [] });

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
        .then((payload: LiveSnapshot | null) => {
          if (!stopped && payload && Array.isArray(payload.visits)) setData(payload);
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
    <p className="obs-live" aria-live="polite">
      <span className="obs-dot" aria-hidden="true" />
      {label}
    </p>
  );
}

export function LiveFeed() {
  const { visits } = useContext(LiveContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!visits.length) {
    return <p className="obs-quiet">En attente du premier lecteur.</p>;
  }

  return (
    <ul className="obs-feed">
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
