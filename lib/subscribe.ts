"use server";

import config from "@payload-config";
import { getPayload } from "payload";

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
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "subscribers",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    });
    if (existing.totalDocs > 0) return { ok: "Vous êtes déjà inscrit." };

    await payload.create({
      collection: "subscribers",
      data: { email },
      overrideAccess: true,
    });
    return { ok: "Inscription enregistrée. Les prochains articles vous seront envoyés." };
  } catch {
    return { error: "L’inscription est indisponible pour le moment." };
  }
}
