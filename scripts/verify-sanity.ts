import { createHash } from "node:crypto";
import { readdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { themesForTags } from "../lib/themes";
import { writeClient } from "../sanity/lib/write-client";

const DEAD_URL = /\/filters:no_upscale\(\)\/https?%3A/i;

type BackupArticle = {
  id: string;
  slug: string;
  title: string | null;
  content_html: string | null;
  published_at: string | null;
  created_at: string | null;
  modified_at: string | null;
  tags: unknown;
  image_urls: unknown;
};

type RemoteArticle = {
  _id: string;
  _type: string;
  title: string | null;
  slug: string | null;
  publishedAt: string | null;
  createdOn: string | null;
  modifiedOn: string | null;
  tags: string[] | null;
  categories: string[] | null;
  htmlLength: number | null;
  legacyHtml: string | null;
  coverUrl: string | null;
  imageUrls: string[] | null;
};

function asStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sameTime(left: string | null | undefined, right: string | null | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return new Date(left).getTime() === new Date(right).getTime();
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function pickIndexes(total: number, count: number) {
  const chosen: number[] = [];
  let state = 20261021;
  while (chosen.length < count) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const index = state % total;
    if (!chosen.includes(index)) chosen.push(index);
  }
  return chosen;
}

async function latestBackup() {
  const root = path.join(process.cwd(), "backup");
  const latest = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .at(-1);
  if (!latest) throw new Error("Aucune sauvegarde.");
  return path.join(root, latest);
}

async function main() {
  const backupDir = await latestBackup();
const articles = JSON.parse(await readFile(path.join(backupDir, "articles.json"), "utf8")) as BackupArticle[];
const counts = await writeClient.fetch<{
  all: number;
  articles: number;
  categories: number;
  authors: number;
  drafts: number;
  types: string[];
}>(`{
  "all": count(*),
  "articles": count(*[_type == "article"]),
  "categories": count(*[_type == "category"]),
  "authors": count(*[_type == "author"]),
  "drafts": count(*[_id in path("drafts.**")]),
  "types": array::unique(*[]._type)
}`);

const sample = pickIndexes(articles.length, 10).map((index) => articles[index]);
const truncated = articles.filter((article) => !/\.html?$/i.test(article.slug));
const withTable = articles.find((article) => (article.content_html ?? "").toLowerCase().includes("<table"));
const withFrame = articles.find((article) => (article.content_html ?? "").toLowerCase().includes("<iframe"));
const emptyTitle = articles.find((article) => !article.title?.trim());
const deadCover = articles.find((article) => {
  const urls = asStrings(article.image_urls);
  return Boolean(urls[0] && DEAD_URL.test(urls[0]) && urls.slice(1).some((url) => url && !DEAD_URL.test(url)));
});
const selected = [...sample];
for (const article of [...truncated, withTable, withFrame, emptyTitle, deadCover]) {
  if (article && !selected.some((item) => item.id === article.id)) selected.push(article);
}

const remote = await writeClient.fetch<RemoteArticle[]>(
  `*[_id in $ids]{
    _id, _type, title, "slug": slug.current, publishedAt, createdOn, modifiedOn, tags,
    "categories": categories[]._ref, "htmlLength": length(legacyHtml), legacyHtml, coverUrl, imageUrls
  }`,
  { ids: selected.map((article) => `article-${article.id}`) },
);
const byId = new Map(remote.map((article) => [article._id, article]));

function compare(article: BackupArticle) {
  const found = byId.get(`article-${article.id}`);
  const expectedCategories = themesForTags(asStrings(article.tags)).map((theme) => `category-${theme.id}`);
  const html = article.content_html ?? "";
  if (!found) return { id: article.id, slug: article.slug, ok: false, missing: true };
  const fields = {
    type: found._type === "article",
    slug: found.slug === article.slug,
    title: (found.title ?? "") === (article.title ?? ""),
    publishedAt: sameTime(found.publishedAt, article.published_at),
    createdOn: sameTime(found.createdOn, article.created_at),
    modifiedOn: sameTime(found.modifiedOn, article.modified_at),
    tags: JSON.stringify(found.tags ?? []) === JSON.stringify(asStrings(article.tags)),
    categories: JSON.stringify([...(found.categories ?? [])].sort()) === JSON.stringify([...expectedCategories].sort()),
    htmlLength: found.htmlLength === html.length,
    html: hash(found.legacyHtml ?? "") === hash(html),
  };
  return { id: article.id, slug: article.slug, ok: Object.values(fields).every(Boolean), fields };
}

const sampleResults = sample.map(compare);
const specials = [
  ["slugs tronqués", truncated],
  ["tableau", withTable ? [withTable] : []],
  ["iframe", withFrame ? [withFrame] : []],
  ["titre vide", emptyTitle ? [emptyTitle] : []],
  ["couverture inutilisable", deadCover ? [deadCover] : []],
] as const;
const specialResults = specials.map(([label, group]) => ({ label, results: group.map(compare) }));

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "";
const lines = [
  "",
  "## Vérification après envoi",
  "",
  `Projet et dataset lus par le script : identiques à \`sanity.config.ts\` (les deux utilisent \`NEXT_PUBLIC_SANITY_PROJECT_ID\` et \`NEXT_PUBLIC_SANITY_DATASET\`). Dataset : \`${dataset}\`. Projet se terminant par \`${projectId.slice(-4)}\`.`,
  "",
  "| Requête | Résultat | Attendu |",
  "| --- | ---: | ---: |",
  `| count(*) | ${counts.all} | 4406 |`,
  `| articles | ${counts.articles} | 4397 |`,
  `| catégories | ${counts.categories} | 8 |`,
  `| auteurs | ${counts.authors} | 1 |`,
  `| brouillons | ${counts.drafts} | 0 |`,
  "",
  `Types présents : ${counts.types.sort().join(", ") || "aucun"}.`,
  "",
  "### Échantillon",
  "",
  ...sampleResults.map((result) => `- ${result.slug} : ${result.ok ? "identique" : `écart ${JSON.stringify(result.fields ?? { missing: true })}`}`),
  "",
  "### Cas particuliers",
  "",
  ...specialResults.flatMap((group) =>
    group.results.length
      ? group.results.map((result) => `- ${group.label} \`${result.slug}\` : ${result.ok ? "identique" : `écart ${JSON.stringify(result.fields ?? { missing: true })}`}`)
      : [`- ${group.label} : introuvable dans la sauvegarde`],
  ),
  "",
];

await appendFile(path.join(process.cwd(), "migration-report.md"), lines.join("\n"));
  console.log(
    JSON.stringify(
      {
        dataset,
        projectSuffix: projectId.slice(-4),
        counts,
        sampleOk: sampleResults.filter((result) => result.ok).length,
        sample: sampleResults.length,
        specials: specialResults.map((group) => ({
          label: group.label,
          ok: group.results.every((result) => result.ok),
          slugs: group.results.map((result) => result.slug),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Vérification impossible.");
  process.exitCode = 1;
});
