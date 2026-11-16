"use client";

import { subscribeToArticles } from "@/lib/subscribe";
import { useActionState } from "react";

export function GazetteSubscribe({ footer = false, letter = false }: { footer?: boolean; letter?: boolean }) {
  const [state, action, pending] = useActionState(subscribeToArticles, null);

  if (letter) {
    return (
      <form className="letter-form notranslate" action={action} translate="no">
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
            <span>{pending ? "Envoi…" : "S'inscrire"}</span>
            {pending ? null : <span aria-hidden="true"> →</span>}
          </button>
        </div>
        {state?.ok || state?.error ? <span className="letter-note">{state.ok || state.error}</span> : null}
      </form>
    );
  }

  return (
    <form className={footer ? "news-form foot-form notranslate" : "news-form notranslate"} action={action} translate="no">
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
            <span>{pending ? "Envoi…" : "S'abonner"}</span>
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
            <span>{pending ? "Envoi…" : "Rejoindre le Réseau d'Alerte"}</span>
          </button>
        </>
      )}
      <span className="news-note">
        {state?.ok || state?.error || (footer ? "Zéro traçage publicitaire. Désinscription en un clic." : "Chiffrage standard. Zéro pistage commercial.")}
      </span>
    </form>
  );
}
