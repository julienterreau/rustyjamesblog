import { defineField, defineType } from "sanity";

export const visit = defineType({
  name: "visit",
  title: "Visite",
  type: "document",
  description: "Page vue anonyme. Aucune adresse IP n'est stockée. Les lectures filtrent la date (occurredAt), le pays (country) et le chemin (path).",
  fields: [
    defineField({ name: "occurredAt", title: "Date", type: "datetime", validation: (rule) => rule.required() }),
    defineField({ name: "path", title: "Chemin", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "country", title: "Pays (ISO)", type: "string" }),
    defineField({ name: "city", title: "Ville", type: "string" }),
    defineField({ name: "latitude", title: "Latitude", type: "number" }),
    defineField({ name: "longitude", title: "Longitude", type: "number" }),
    defineField({ name: "device", title: "Appareil", type: "string" }),
    defineField({ name: "client", title: "Navigateur et OS", type: "string" }),
    defineField({ name: "source", title: "Source", type: "string" }),
    defineField({ name: "utmSource", title: "utm_source", type: "string" }),
    defineField({ name: "utmMedium", title: "utm_medium", type: "string" }),
    defineField({ name: "utmCampaign", title: "utm_campaign", type: "string" }),
    defineField({ name: "visitorId", title: "Visiteur anonyme", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "durationSec", title: "Lecture (secondes)", type: "number" }),
    defineField({ name: "articleTitle", title: "Article", type: "string" }),
    defineField({ name: "articleCategory", title: "Rubrique", type: "string" }),
    defineField({ name: "articleSlug", title: "Adresse de l'article", type: "string" }),
    defineField({ name: "seeded", title: "Jeu de démonstration", type: "boolean", hidden: true, initialValue: false }),
  ],
  orderings: [
    { title: "Plus récentes", name: "occurredAtDesc", by: [{ field: "occurredAt", direction: "desc" }] },
  ],
  preview: {
    select: { city: "city", country: "country", path: "path", date: "occurredAt" },
    prepare({ city, country, path, date }) {
      const when = typeof date === "string" ? date.slice(0, 16).replace("T", " ") : "";
      return {
        title: [city, country].filter(Boolean).join(", ") || "Lieu inconnu",
        subtitle: [when, path].filter(Boolean).join(" · "),
      };
    },
  },
});
