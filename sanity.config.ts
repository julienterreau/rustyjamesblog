"use client";

import { frFRLocale } from "@sanity/locale-fr-fr";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!projectId || !dataset) {
  if (isBuild) {
    console.warn(
      "⚠️ Warning: Sanity build env vars are missing. Using placeholders for static generation."
    );
  } else {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET sont requis."
    );
  }
}

export default defineConfig({
  name: "rusty-james",
  title: "Rusty James",
  basePath: "/studio",
  projectId: projectId || "placeholder-project-id",
  dataset: dataset || "production",
  plugins: [structureTool({ structure }), frFRLocale()],
  schema: { types: schemaTypes },
});
