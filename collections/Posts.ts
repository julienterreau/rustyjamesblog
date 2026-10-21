import type { CollectionConfig } from "payload";
import { canPost, postAccess } from "@/lib/roles";
import { syncPublishedPost } from "../lib/publish-post";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const Posts: CollectionConfig = {
  slug: "posts",
  labels: { singular: "Article", plural: "Articles" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "updatedAt"],
  },
  versions: {
    drafts: true,
  },
  access: {
    create: postAccess,
    update: postAccess,
    delete: postAccess,
    readVersions: postAccess,
    read: ({ req }) => {
      if (canPost(req.user)) return true;
      return { _status: { equals: "published" } };
    },
  },
  hooks: {
    afterChange: [syncPublishedPost],
    afterDelete: [
      async ({ doc }) => {
        if (doc && typeof doc === "object" && "slug" in doc && typeof doc.slug === "string") {
          const { removePublishedPost } = await import("@/lib/publish-post");
          await removePublishedPost(doc.slug);
        }
      },
    ],
  },
  fields: [
    {
      name: "title",
      label: "Titre",
      type: "text",
      required: true,
    },
    {
      name: "excerpt",
      label: "Description",
      type: "textarea",
      admin: {
        description: "Résumé affiché sous le titre, et dans l’email.",
      },
    },
    {
      name: "content",
      label: "Texte",
      type: "richText",
    },
    {
      name: "image",
      label: "Image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      admin: { hidden: true },
      hooks: {
        beforeValidate: [
          async ({ data, originalDoc, req }) => {
            const title = data && typeof data.title === "string" ? data.title : "";
            const base = (slugify(title) || "article").slice(0, 74);
            const currentId = originalDoc && typeof originalDoc === "object" && "id" in originalDoc ? originalDoc.id : undefined;
            let candidate = base;
            let suffix = 2;

            while (suffix < 50) {
              const existing = await req.payload.find({
                collection: "posts",
                where: { slug: { equals: candidate } },
                depth: 0,
                limit: 1,
                overrideAccess: true,
              });
              const hit = existing.docs[0];
              if (!hit || hit.id === currentId) return candidate;
              candidate = `${base}-${suffix}`.slice(0, 80);
              suffix += 1;
            }

            return candidate;
          },
        ],
      },
    },
    {
      name: "author",
      label: "Auteur",
      type: "text",
      defaultValue: "Rusty James",
      admin: { position: "sidebar" },
    },
    {
      name: "tags",
      label: "Mots-clés",
      type: "text",
      admin: {
        position: "sidebar",
        description: "Remplis à partir du titre et de la description. Cliquez une suggestion pour l’ajouter.",
        components: {
          Field: "@/components/admin/keyword-field#KeywordField",
        },
      },
    },
    {
      name: "publishedAt",
      label: "Date de publication",
      type: "date",
      admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "sendByEmail",
      label: "Envoyer par email",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "À la publication, envoie l’article à tous les abonnés via Resend.",
      },
    },
    {
      name: "emailStatus",
      type: "textarea",
      admin: { hidden: true },
    },
    {
      name: "emailSentAt",
      type: "date",
      admin: { hidden: true },
    },
  ],
};
