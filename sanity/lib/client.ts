import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

if (!projectId || !dataset) {
  throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET sont requis.");
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-10-21",
  useCdn: true,
  perspective: "published",
});

export const apiClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-10-21",
  useCdn: false,
  perspective: "published",
});
