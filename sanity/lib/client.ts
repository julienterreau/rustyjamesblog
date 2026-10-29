import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

if (!projectId || !dataset) {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    typeof window === "undefined"
  ) {
    console.warn(
      "⚠️ Warning: Sanity variables are missing during build. Using fallbacks."
    );
  } else {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET sont requis."
    );
  }
}

export const client = createClient({
  projectId: projectId || "placeholder-project-id",
  dataset: dataset || "production",
  apiVersion: "2026-10-21",
  useCdn: false,
  perspective: "published",
});
