"use client";

import { frFRLocale } from "@sanity/locale-fr-fr";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

if (!projectId || !dataset) {
  throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID et NEXT_PUBLIC_SANITY_DATASET sont requis.");
}

export default defineConfig({
  name: "rusty-james",
  title: "Rusty James",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool({ structure }), frFRLocale()],
  schema: { types: schemaTypes },
});
