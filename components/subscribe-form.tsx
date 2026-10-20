"use client";

import { subscribeToArticles } from "@/lib/subscribe";
import { useActionState } from "react";

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribeToArticles, null);

  return (
    <form action={action} className="mx-auto mt-5 flex max-w-md flex-col items-center gap-2">
      <p className="text-[13px] font-bold">Recevoir les nouveaux articles</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Votre email"
          className="min-w-0 flex-1 border border-[#e7e7e7] px-3 py-2 text-sm outline-none focus:border-[#161616]"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-[#161616] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#333] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? "Envoi…" : "S’inscrire"}
        </button>
      </div>
      {state?.ok ? <p className="text-xs text-[#737373]">{state.ok}</p> : null}
      {state?.error ? <p className="text-xs text-[#d4003c]">{state.error}</p> : null}
    </form>
  );
}
