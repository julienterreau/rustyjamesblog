"use client";

import { archivesHref, formatArchiveMonth, formatCivilDate, todayParis } from "@/lib/archive-links";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type Draft = { year: string; month: string; day: string };

function currentYear() {
  return todayParis().slice(0, 4);
}

function draftFromQuery(date: string | null, month: string | null, year: number | null): Draft {
  if (date) {
    const [draftYear, draftMonth, draftDay] = date.split("-");
    return { year: draftYear, month: draftMonth, day: draftDay };
  }
  if (month) {
    const [draftYear, draftMonth] = month.split("-");
    return { year: draftYear, month: draftMonth, day: "" };
  }
  return { year: year ? String(year) : currentYear(), month: "", day: "" };
}

export function ArchiveDateFilter({
  days,
  tag,
  date,
  month,
  year,
}: {
  days: string[];
  tag: string | null;
  date: string | null;
  month: string | null;
  year: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const yearId = useId();
  const monthId = useId();
  const dayId = useId();
  const [draft, setDraft] = useState<Draft>(() => draftFromQuery(date, month, year));

  useEffect(() => {
    setDraft(draftFromQuery(date, month, year));
  }, [date, month, year]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const today = todayParis();
  const [todayYear, todayMonth, todayDay] = today.split("-");
  const yearOptions = [...new Set([...days.map((day) => day.slice(0, 4)), todayYear])].sort(
    (left, right) => Number(right) - Number(left),
  );
  const monthOptions = [...new Set(days.filter((day) => day.startsWith(`${draft.year}-`)).map((day) => day.slice(5, 7)))].sort();
  const dayOptions = draft.month
    ? [...new Set(days.filter((day) => day.startsWith(`${draft.year}-${draft.month}-`)).map((day) => day.slice(8, 10)))].sort()
    : [];

  const activeLabel = date ? formatCivilDate(date) : month ? formatArchiveMonth(month) : year ? String(year) : null;
  const summary = draft.day
    ? { badge: "Jour", text: formatCivilDate(`${draft.year}-${draft.month}-${draft.day}`) }
    : draft.month
      ? { badge: "Mois", text: formatArchiveMonth(`${draft.year}-${draft.month}`) }
      : { badge: "Année", text: `Toute l'année ${draft.year}` };

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  function chooseYear(value: string) {
    setDraft((current) => {
      const nextMonth = current.month && days.some((day) => day.startsWith(`${value}-${current.month}-`)) ? current.month : "";
      const nextDay =
        nextMonth && days.includes(`${value}-${nextMonth}-${current.day}`) ? current.day : "";
      return { year: value, month: nextMonth, day: nextDay };
    });
  }

  function chooseMonth(value: string) {
    setDraft((current) => {
      if (!value) return { ...current, month: "", day: "" };
      const nextDay = days.includes(`${current.year}-${value}-${current.day}`) ? current.day : "";
      return { ...current, month: value, day: nextDay };
    });
  }

  function apply() {
    if (draft.day && draft.month) {
      go(archivesHref({ tag, date: `${draft.year}-${draft.month}-${draft.day}` }));
      return;
    }
    if (draft.month) {
      go(archivesHref({ tag, month: `${draft.year}-${draft.month}` }));
      return;
    }
    go(archivesHref({ tag, year: Number(draft.year) }));
  }

  function reset() {
    setDraft({ year: currentYear(), month: "", day: "" });
    go(archivesHref({ tag }));
  }

  return (
    <div ref={root} className="period">
      <button
        type="button"
        className={`period-trigger${open || activeLabel ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{activeLabel ? `Période : ${activeLabel}` : "Période"}</span>
        <CalendarIcon aria-hidden="true" />
      </button>
      {open ? (
        <div id={panelId} role="dialog" aria-label="Filtrer par période" className="period-panel">
          <h2 className="period-title">Filtrer par période</h2>
          <p className="period-help">Choisissez une année, puis affinez si besoin avec un mois et un jour.</p>
          <div className="period-shortcuts">
            <button
              type="button"
              disabled={!days.includes(today)}
              className={draft.year === todayYear && draft.month === todayMonth && draft.day === todayDay ? "is-active" : undefined}
              onClick={() => setDraft({ year: todayYear, month: todayMonth, day: todayDay })}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              disabled={!days.some((day) => day.startsWith(`${todayYear}-${todayMonth}-`))}
              className={draft.year === todayYear && draft.month === todayMonth && !draft.day ? "is-active" : undefined}
              onClick={() => setDraft({ year: todayYear, month: todayMonth, day: "" })}
            >
              Ce mois-ci
            </button>
            <button
              type="button"
              disabled={!days.some((day) => day.startsWith(`${todayYear}-`))}
              className={draft.year === todayYear && !draft.month && !draft.day ? "is-active" : undefined}
              onClick={() => setDraft({ year: todayYear, month: "", day: "" })}
            >
              Cette année
            </button>
          </div>
          <div className="period-field">
            <label htmlFor={yearId}>Année</label>
            <div className="period-select">
              <select id={yearId} value={draft.year} onChange={(event) => chooseYear(event.target.value)}>
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="period-field">
            <label htmlFor={monthId}>Mois</label>
            <div className="period-select">
              <select id={monthId} value={draft.month} onChange={(event) => chooseMonth(event.target.value)}>
                <option value="">Tous les mois</option>
                {monthOptions.map((option) => (
                  <option key={option} value={option}>
                    {MONTHS[Number(option) - 1]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="period-field">
            <label htmlFor={dayId}>Jour</label>
            <div className="period-select">
              <select
                id={dayId}
                value={draft.day}
                disabled={!draft.month}
                onChange={(event) => setDraft((current) => ({ ...current, day: event.target.value }))}
              >
                <option value="">Tous les jours</option>
                {dayOptions.map((option) => (
                  <option key={option} value={option}>
                    {Number(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="period-summary">
            <span className="period-badge">{summary.badge}</span>
            <span>{summary.text}</span>
          </div>
          <div className="period-actions">
            <button type="button" className="period-reset" onClick={reset}>
              Réinitialiser
            </button>
            <button type="button" className="period-apply" onClick={apply}>
              Appliquer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
