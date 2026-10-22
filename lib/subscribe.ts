"use server";

import { addNewsletterContact } from "@/lib/newsletter";
import { writeClient } from "@/sanity/lib/write-client";
import { createHash } from "node:crypto";

function subscriberId(email: string) {
  return `subscriber-${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
}

export async function subscribeToArticles(
  _previous: { ok?: string; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: string; error?: string }> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }

  try {
    const id = subscriberId(email);
    const [existing] = await Promise.all([
      writeClient.getDocument(id),
      addNewsletterContact(email),
    ]);
    if (!existing) await writeClient.createIfNotExists({ _id: id, _type: "subscriber", email });
    return existing ? { ok: "Vous êtes déjà inscrit." } : { ok: "Inscription enregistrée." };
  } catch {
    return { error: "L’inscription est indisponible pour le moment." };
  }
}
