import type { CollectionConfig } from "payload";
import { postAccess } from "@/lib/roles";

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image", plural: "Images" },
  access: {
    create: postAccess,
    update: postAccess,
    delete: postAccess,
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    mimeTypes: ["image/*"],
    staticDir: "public/media",
  },
  fields: [
    {
      name: "alt",
      label: "Texte alternatif",
      type: "text",
    },
  ],
};
