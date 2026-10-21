import type { CollectionConfig } from "payload";
import { adminAccess, canCreateUser, canPost, isAdmin } from "@/lib/roles";

export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Utilisateur", plural: "Utilisateurs" },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "role"],
  },
  auth: true,
  access: {
    admin: ({ req }) => canPost(req.user),
    create: canCreateUser,
    read: ({ req }) => {
      if (isAdmin(req.user)) return true;
      if (!req.user) return false;
      return { id: { equals: req.user.id } };
    },
    update: ({ req }) => {
      if (isAdmin(req.user)) return true;
      if (!req.user) return false;
      return { id: { equals: req.user.id } };
    },
    delete: adminAccess,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const next = data ?? {};
        if (!req.user) {
          next.role = "admin";
          return next;
        }
        if (!isAdmin(req.user)) {
          const current = originalDoc && typeof originalDoc === "object" && "role" in originalDoc ? originalDoc.role : undefined;
          next.role = current === "admin" || current === "auteur" ? current : "auteur";
        }
        return next;
      },
    ],
  },
  fields: [
    {
      name: "role",
      label: "Rôle",
      type: "select",
      required: true,
      defaultValue: "auteur",
      saveToJWT: true,
      options: [
        { label: "Administrateur", value: "admin" },
        { label: "Auteur", value: "auteur" },
      ],
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        description: "L’auteur crée et publie des articles. L’administrateur gère aussi les comptes.",
      },
    },
  ],
};
