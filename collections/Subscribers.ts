import type { CollectionConfig } from "payload";

export const Subscribers: CollectionConfig = {
  slug: "subscribers",
  labels: { singular: "Abonné", plural: "Abonnés" },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "createdAt"],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      unique: true,
    },
  ],
};
