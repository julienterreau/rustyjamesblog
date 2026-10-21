import { sql } from "@payloadcms/db-postgres";
import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "payload"."enum_users_role" AS ENUM('admin', 'auteur');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    ALTER TABLE "payload"."users" ADD COLUMN IF NOT EXISTS "role" "payload"."enum_users_role" DEFAULT 'admin';
    UPDATE "payload"."users" SET "role" = 'admin' WHERE "role" IS NULL;
    ALTER TABLE "payload"."users" ALTER COLUMN "role" SET DEFAULT 'admin';
    ALTER TABLE "payload"."users" ALTER COLUMN "role" SET NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."users" DROP COLUMN IF EXISTS "role";
    DROP TYPE IF EXISTS "payload"."enum_users_role";
  `);
}
