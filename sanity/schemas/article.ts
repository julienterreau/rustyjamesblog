import { CategoriesInput } from "../components/categories-input";
import { defineField, defineType } from "sanity";
import { body } from "./objects";

const flags = [
  { title: "Épinglé", value: "pinned" },
  { title: "Sensible", value: "sensitive" },
  { title: "Carrousel", value: "carousel" },
];

export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  groups: [
    { name: "content", title: "Article", default: true },
    { name: "origin", title: "Contenu d'origine" },
    { name: "publication", title: "Publication" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Titre",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "slug",
      title: "Adresse",
      type: "slug",
      group: "content",
      description: "Chemin public complet, identique à l'URL actuelle.",
      options: { source: "title", maxLength: 400 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Chapô",
      type: "text",
      rows: 3,
      group: "content",
    }),
    { ...body, group: "content" },
    defineField({
      name: "legacyHtml",
      title: "HTML d'origine",
      type: "text",
      rows: 18,
      group: "origin",
      readOnly: true,
      description: "Copie exacte du HTML importé. Le site l'affiche tant que le champ Texte est vide.",
    }),
    defineField({
      name: "cover",
      title: "Image de couverture",
      type: "image",
      group: "publication",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "coverUrl",
      title: "URL de couverture d'origine",
      type: "url",
      group: "publication",
      description: "Première URL de l'archive. Le site l'utilise seulement s'il n'y a pas d'image Sanity.",
    }),
    defineField({
      name: "imageUrls",
      title: "URLs d'images d'origine",
      type: "array",
      group: "origin",
      readOnly: true,
      of: [{ type: "url" }],
      description: "Liste d'origine, dans l'ordre. Sert à retrouver la même couverture qu'aujourd'hui.",
    }),
    defineField({
      name: "author",
      title: "Auteur",
      type: "reference",
      to: [{ type: "author" }],
      group: "publication",
    }),
    defineField({
      name: "categories",
      title: "Rubriques",
      type: "array",
      group: "publication",
      description: "Préremplies à partir des mots-clés pour un nouvel article. Le choix reste modifiable.",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      components: { input: CategoriesInput },
    }),
    defineField({
      name: "tags",
      title: "Mots-clés",
      type: "array",
      group: "publication",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "flags",
      title: "Drapeaux",
      type: "array",
      group: "publication",
      of: [{ type: "string" }],
      options: { list: flags },
    }),
    defineField({
      name: "publishedAt",
      title: "Date de publication",
      type: "datetime",
      group: "publication",
    }),
    defineField({
      name: "createdOn",
      title: "Créé le",
      type: "datetime",
      group: "publication",
    }),
    defineField({
      name: "modifiedOn",
      title: "Modifié le",
      type: "datetime",
      group: "publication",
    }),
  ],
  orderings: [
    {
      title: "Date de publication",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current" },
    prepare({ title, subtitle }) {
      return { title: title || "Sans titre", subtitle };
    },
  },
});
