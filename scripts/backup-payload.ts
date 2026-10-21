import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const expected = {
  articles: 4397,
  posts: 0,
  media: 0,
  users: 2,
  subscribers: 1,
} as const;

function selectOnly(sql: string) {
  const statement = sql.trim();
  if (!/^select\b/i.test(statement) || /\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(statement)) {
    throw new Error("La sauvegarde ne peut exécuter que des lectures.");
  }
  return statement;
}

async function readAll(pool: Pool, sql: string) {
  const result = await pool.query(selectOnly(sql));
  return result.rows;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est absent. Lance le script avec tsx --env-file=.env");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.join(process.cwd(), "backup", stamp);

  try {
  const [articles, posts, media, users, subscribers] = await Promise.all([
    readAll(
      pool,
      `SELECT id::text AS id, slug, title, excerpt, content_html, published_at, created_at, modified_at,
              author, categories, tags, editorial_flags, image_urls, comments
       FROM public.articles
       ORDER BY id`,
    ),
    readAll(pool, `SELECT * FROM payload.posts ORDER BY id`),
    readAll(pool, `SELECT * FROM payload.media ORDER BY id`),
    readAll(
      pool,
      `SELECT id, email, role, created_at, updated_at
       FROM payload.users
       ORDER BY id`,
    ),
    readAll(pool, `SELECT id, email, created_at, updated_at FROM payload.subscribers ORDER BY id`),
  ]);

  const counts = {
    articles: articles.length,
    posts: posts.length,
    media: media.length,
    users: users.length,
    subscribers: subscribers.length,
  };
  const mismatches = (Object.keys(expected) as Array<keyof typeof expected>).filter((key) => counts[key] !== expected[key]);

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "articles.json"), JSON.stringify(articles));
  await writeFile(path.join(directory, "payload-posts.json"), JSON.stringify(posts));
  await writeFile(path.join(directory, "payload-media.json"), JSON.stringify(media));
  await writeFile(path.join(directory, "payload-users.json"), JSON.stringify(users));
  await writeFile(path.join(directory, "payload-subscribers.json"), JSON.stringify(subscribers));
  await writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        source: "lecture seule de Neon",
        counts,
        expected,
        mismatches,
        notes: [
          "Les mots de passe, jetons et sessions Payload ne sont pas exportés.",
          "Les comptes et l'abonné sont sauvegardés mais ne seront pas migrés vers Sanity.",
          "Les images restent des URL dans articles.json.",
        ],
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        directory: path.relative(process.cwd(), directory),
        counts,
        expected,
        ok: mismatches.length === 0,
        mismatches,
      },
      null,
      2,
    ),
  );
    if (mismatches.length > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Sauvegarde impossible.";
  console.error(message);
  process.exitCode = 1;
});
