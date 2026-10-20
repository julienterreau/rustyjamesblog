"use client";

import { subscribeToArticles } from "@/lib/subscribe";
import { useActionState } from "react";

export function GazetteSubscribe({ footer = false, letter = false }: { footer?: boolean; letter?: boolean }) {
  const [state, action, pending] = useActionState(subscribeToArticles, null);

  if (letter) {
    return (
      <form className="letter-form" action={action}>
        <div className="letter-row">
          <input
            type="email"
            name="email"
            required
            placeholder="votre@email.fr"
            aria-label="Adresse électronique"
            autoComplete="email"
          />
          <button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "S'inscrire"}
            {pending ? null : <span aria-hidden="true"> →</span>}
          </button>
        </div>
        {state?.ok || state?.error ? <span className="letter-note">{state.ok || state.error}</span> : null}
      </form>
    );
  }

  return (
    <form className={footer ? "news-form foot-form" : "news-form"} action={action}>
      {footer ? (
        <div className="ff-row">
          <input
            type="email"
            name="email"
            required
            placeholder="Votre adresse électronique…"
            aria-label="Adresse électronique"
          />
          <button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "S'abonner"}
          </button>
        </div>
      ) : (
        <>
          <input
            type="email"
            name="email"
            required
            placeholder="Votre adresse confidentielle…"
            aria-label="Adresse électronique"
          />
          <button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Rejoindre le Réseau d'Alerte"}
          </button>
        </>
      )}
      <span className="news-note">
        {state?.ok || state?.error || (footer ? "Zéro traçage publicitaire. Désinscription en un clic." : "Chiffrage standard. Zéro pistage commercial.")}
      </span>
    </form>
  );
}
