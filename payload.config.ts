import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { fr } from "@payloadcms/translations/languages/fr";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";
import { Subscribers } from "./collections/Subscribers";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const serverURL = process.env.NODE_ENV === "production" ? siteUrl : "http://localhost:3000";

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: "· Rusty James",
    },
  },
  collections: [Users, Media, Posts, Subscribers],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL,
  cors: [serverURL, siteUrl],
  csrf: [serverURL, siteUrl],
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: "fr",
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
    push: false,
    schemaName: "payload",
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
});
