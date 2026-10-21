import type { Access, PayloadRequest } from "payload";

export const ROLES = ["admin", "auteur"] as const;

type Role = (typeof ROLES)[number];

function userRole(user: unknown): Role | null {
  if (!user || typeof user !== "object") return null;
  const role = "role" in user ? user.role : undefined;
  if (role === "admin" || role === "auteur") return role;
  if ("id" in user && user.id != null) return "admin";
  return null;
}

export function isAdmin(user: unknown) {
  return userRole(user) === "admin";
}

export function canPost(user: unknown) {
  const role = userRole(user);
  return role === "admin" || role === "auteur";
}

export const postAccess: Access = ({ req }) => canPost(req.user);

export const adminAccess: Access = ({ req }) => isAdmin(req.user);

export async function canCreateUser({ req }: { req: PayloadRequest }) {
  if (isAdmin(req.user)) return true;
  const existing = await req.payload.count({ collection: "users", overrideAccess: true, req });
  return existing.totalDocs === 0;
}
