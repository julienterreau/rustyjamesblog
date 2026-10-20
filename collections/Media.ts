import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image", plural: "Images" },
  access: {
    read: () => true,
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
