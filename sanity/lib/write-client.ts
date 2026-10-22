import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset) {
  throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET sont requis.");
}
if (!token) {
  throw new Error("SANITY_API_WRITE_TOKEN est absent.");
}

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-10-21",
  useCdn: false,
  token,
});
