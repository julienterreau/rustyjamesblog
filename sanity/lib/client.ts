import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
const hasSanityConfig = Boolean(projectId && dataset);

if (!hasSanityConfig) {
  console.warn(
    "NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET ne sont pas configurés. Le site continuera à démarrer, mais les données Sanity ne seront pas chargées tant que les variables ne sont pas définies.",
  );
}

export const client = createClient({
  projectId: projectId || "dummy-project",
  dataset: dataset || "production",
  apiVersion: "2026-10-21",
  useCdn: false,
  perspective: "published",
});
