import { defineArrayMember, defineField, defineType } from "sanity";

export const embed = defineType({
  name: "embed",
  title: "Média intégré",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Adresse",
      type: "url",
      description: "YouTube ou une autre adresse à afficher dans une iframe.",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "title",
      title: "Titre",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "url" },
    prepare({ title, subtitle }) {
      return { title: title || "Média intégré", subtitle };
    },
  },
});

export const tableBlock = defineType({
  name: "tableBlock",
  title: "Tableau",
  type: "object",
  fields: [
    defineField({
      name: "rows",
      title: "Lignes",
      type: "array",
      of: [
        defineArrayMember({
          name: "row",
          title: "Ligne",
          type: "object",
          fields: [
            defineField({
              name: "cells",
              title: "Cellules",
              type: "array",
              of: [{ type: "string" }],
            }),
          ],
          preview: {
            select: { cells: "cells" },
            prepare({ cells }) {
              const values = Array.isArray(cells) ? cells.filter((cell) => typeof cell === "string") : [];
              return { title: values.join(" · ") || "Ligne vide" };
            },
          },
        }),
      ],
    }),
  ],
});

const link = defineArrayMember({
  name: "link",
  title: "Lien",
  type: "object",
  fields: [
    defineField({
      name: "href",
      title: "Adresse",
      type: "string",
      description: "Adresse externe ou chemin interne du site.",
      validation: (rule) => rule.required(),
    }),
  ],
});

export const body = defineField({
  name: "body",
  title: "Texte",
  type: "array",
  description: "Utilisé pour les nouveaux articles. Laisser vide si l'article a encore son HTML d'origine.",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Titre 2", value: "h2" },
        { title: "Titre 3", value: "h3" },
        { title: "Titre 4", value: "h4" },
        { title: "Citation", value: "blockquote" },
      ],
      lists: [
        { title: "Puces", value: "bullet" },
        { title: "Numéros", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Gras", value: "strong" },
          { title: "Italique", value: "em" },
        ],
        annotations: [link],
      },
    }),
    defineArrayMember({
      type: "image",
      title: "Image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texte alternatif",
          type: "string",
        }),
      ],
    }),
    defineArrayMember({ type: "tableBlock" }),
    defineArrayMember({ type: "embed" }),
  ],
});
