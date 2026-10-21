import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { THEMES, themesForTags } from "../lib/themes";

const DOCUMENT_LIMIT = 10_000;
const BATCH_MAX = 200;
const BATCH_BYTES = 2_000_000;
const DEAD_URL = /\/filters:no_upscale\(\)\/https?%3A/i;
const FLAGS = ["pinned", "sensitive", "carousel"] as const;

type BackupArticle = {
  id: string;
  slug: string;
  title: string | null;
  excerpt: string | null;
  content_html: string | null;
  published_at: string | null;
  created_at: string | null;
  modified_at: string | null;
  author: string | null;
  tags: unknown;
  editorial_flags: unknown;
  image_urls: unknown;
};

type SanityDocument = {
  _id: string;
  _type: string;
  [key: string]: unknown;
};

function asStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function imageSources(html: string) {
  const sources: string[] = [];
  const pattern = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(pattern)) {
    const src = match[1] || match[2] || match[3];
    if (src) sources.push(src);
  }
  return sources;
}

function displayedCover(urls: string[]) {
  for (const url of urls) {
    if (DEAD_URL.test(url)) continue;
    if (url) return url.replace(/\/\d{2,4}x\d{2,4}\/smart\//, "/");
  }
  return null;
}

function articleDocument(article: BackupArticle): SanityDocument {
  const tags = asStrings(article.tags);
  const rubriques = themesForTags(tags);
  const flags = asStrings(article.editorial_flags).filter((flag): flag is (typeof FLAGS)[number] =>
    FLAGS.includes(flag as (typeof FLAGS)[number]),
  );
  const imageUrls = asStrings(article.image_urls);
  const document: SanityDocument = {
    _id: `article-${article.id}`,
    _type: "article",
    title: article.title ?? "",
    slug: { _type: "slug", current: article.slug },
    legacyHtml: article.content_html ?? "",
    tags,
    flags,
    categories: rubriques.map((theme) => ({
      _key: theme.id,
      _type: "reference",
      _ref: `category-${theme.id}`,
    })),
    author: { _type: "reference", _ref: "author-rusty-james" },
  };
  if (article.excerpt) document.excerpt = article.excerpt;
  if (imageUrls[0]) document.coverUrl = imageUrls[0];
  if (imageUrls.length) document.imageUrls = imageUrls;
  if (article.published_at) document.publishedAt = article.published_at;
  if (article.created_at) document.createdOn = article.created_at;
  if (article.modified_at) document.modifiedOn = article.modified_at;
  return document;
}

function packBatches(documents: SanityDocument[]) {
  const batches: SanityDocument[][] = [];
  let current: SanityDocument[] = [];
  let bytes = 0;
  for (const document of documents) {
    const size = Buffer.byteLength(JSON.stringify(document));
    const full = current.length >= BATCH_MAX || bytes + size > BATCH_BYTES;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(document);
    bytes += size;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function latestBackup() {
  const root = path.join(process.cwd(), "backup");
  const entries = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const latest = entries.at(-1);
  if (!latest) throw new Error("Aucune sauvegarde dans /backup. Lance d'abord npm run backup.");
  return path.join(root, latest);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apply = process.argv.includes("--apply");
  if (dryRun === apply) {
    console.error("Choisis un seul mode : --dry-run ou --apply");
    process.exitCode = 1;
    return;
  }

  const backupDir = await latestBackup();
const articles = JSON.parse(await readFile(path.join(backupDir, "articles.json"), "utf8")) as BackupArticle[];
const authorName = articles.find((article) => article.author)?.author || "rusty james";
const author: SanityDocument = {
  _id: "author-rusty-james",
  _type: "author",
  name: authorName,
  slug: { _type: "slug", current: "rusty-james" },
};
const categories: SanityDocument[] = THEMES.map((theme) => ({
  _id: `category-${theme.id}`,
  _type: "category",
  name: theme.name,
  code: theme.code,
  description: theme.desc,
  slug: { _type: "slug", current: theme.id },
}));
const articleDocs = articles.map((article) => articleDocument(article));
const batches = [[author, ...categories], ...packBatches(articleDocs)];
const deadCovers = new Set<string>();
const deadInline = new Set<string>();
const invalidCoverUrls: string[] = [];
let coverFallsThrough = 0;
let withoutRubrique = 0;
let singleRubrique = 0;
let severalRubriques = 0;
const byCategory = new Map<string, number>();

for (const article of articles) {
  const urls = asStrings(article.image_urls);
  for (const url of urls) {
    if (DEAD_URL.test(url)) deadCovers.add(url);
  }
  if (urls[0] && !httpUrl(urls[0])) invalidCoverUrls.push(urls[0]);
  const shown = displayedCover(urls);
  const rawFirst = urls[0] ? urls[0].replace(/\/\d{2,4}x\d{2,4}\/smart\//, "/") : null;
  if (shown && rawFirst !== shown) coverFallsThrough += 1;
  for (const src of imageSources(article.content_html ?? "")) {
    if (DEAD_URL.test(src)) deadInline.add(src);
  }
  const rubriques = themesForTags(asStrings(article.tags));
  if (rubriques.length === 0) withoutRubrique += 1;
  else if (rubriques.length === 1) singleRubrique += 1;
  else severalRubriques += 1;
  for (const theme of rubriques) byCategory.set(theme.id, (byCategory.get(theme.id) ?? 0) + 1);
}

const counts = {
  author: 1,
  category: categories.length,
  article: articleDocs.length,
  imageAssets: 0,
};
const total = counts.author + counts.category + counts.article + counts.imageAssets;
const oversized = articleDocs
  .map((document) => ({ id: document._id, bytes: Buffer.byteLength(JSON.stringify(document)) }))
  .filter((item) => item.bytes > BATCH_BYTES)
  .sort((left, right) => right.bytes - left.bytes);

const lines = [
  "# Rapport de migration Sanity",
  "",
  dryRun ? "Mode : **dry-run**. Aucune écriture vers Sanity, aucune écriture vers Neon." : "Mode : application.",
  "",
  `Sauvegarde : \`${path.relative(process.cwd(), backupDir)}\``,
  "",
  "## Documents",
  "",
  "| Type | Nombre |",
  "| --- | ---: |",
  `| Auteur | ${counts.author} |`,
  `| Catégories | ${counts.category} |`,
  `| Articles | ${counts.article} |`,
  `| Images uploadées | ${counts.imageAssets} |`,
  `| **Total** | **${total}** |`,
  "",
  total < DOCUMENT_LIMIT
    ? `Le total reste sous la limite gratuite de ${DOCUMENT_LIMIT.toLocaleString("fr-FR")} documents (${(DOCUMENT_LIMIT - total).toLocaleString("fr-FR")} de marge).`
    : `Le total dépasse la limite gratuite de ${DOCUMENT_LIMIT.toLocaleString("fr-FR")} documents.`,
  "",
  "Les comptes Payload et l'abonné ne sont pas inclus.",
  "Les anciens articles n'ont pas de champ `body`. Leur HTML est copié tel quel dans `legacyHtml`.",
  "",
  "## Rubriques",
  "",
  "Le filtre du site retient un article dans chaque rubrique dont un mot-clé est présent, avec la même comparaison que `tags ?|`. Un article peut donc en avoir plusieurs. Le motif de couverture, lui, n'en choisit qu'une et n'est pas recopié ici.",
  "",
  `${withoutRubrique} articles sans rubrique, ${singleRubrique} avec une seule, ${severalRubriques} avec plusieurs.`,
  "",
  ...THEMES.map((theme) => `- ${theme.name} : ${byCategory.get(theme.id) ?? 0}`),
  "",
  "## Lots",
  "",
  `${batches.length} transactions. La première contient l'auteur et les 8 rubriques. Les suivantes regroupent les articles jusqu'à ${BATCH_MAX} documents, ou 2 Mo, selon la première limite atteinte.`,
  "Les articles au HTML long forment des lots plus petits, pour rester sous la taille acceptée par l'API.",
  oversized.length
    ? `${oversized.length} article${oversized.length > 1 ? "s dépassent" : " dépasse"} ${BATCH_BYTES.toLocaleString("fr-FR")} octets et ${oversized.length > 1 ? "seront" : "sera"} envoyé${oversized.length > 1 ? "s" : ""} seul${oversized.length > 1 ? "s" : ""}.`
    : "Aucun article ne dépasse la taille d'un lot.",
  "",
  "## Images",
  "",
  "Aucune image n'est uploadée. Les couvertures et les images du HTML gardent leur URL d'origine.",
  `${coverFallsThrough} article${coverFallsThrough > 1 ? "s ont" : " a"} une première URL de couverture inutilisable : le site continuera d'utiliser l'URL suivante grâce à \`imageUrls\`.`,
  invalidCoverUrls.length
    ? `${invalidCoverUrls.length} valeur${invalidCoverUrls.length > 1 ? "s" : ""} de \`coverUrl\` n'${invalidCoverUrls.length > 1 ? "sont" : "est"} pas une URL http(s).`
    : "Toutes les premières URLs de couverture présentes sont des URL http(s).",
  "",
  `URL mortes dans les couvertures : ${deadCovers.size}`,
  `URL mortes dans le HTML : ${deadInline.size}`,
  "",
  "Ces URL correspondent à `/filters:no_upscale()/`. Elles ne sont pas corrigées.",
  "",
  ...[...new Set([...deadCovers, ...deadInline])].sort().map((url) => `- ${url}`),
  "",
];

const reportPath = path.join(process.cwd(), "migration-report.md");
await writeFile(reportPath, lines.join("\n"));

console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "apply",
      backup: path.relative(process.cwd(), backupDir),
      counts,
      total,
      underLimit: total < DOCUMENT_LIMIT,
      batches: batches.map((batch) => batch.length),
      deadCovers: deadCovers.size,
      deadInline: deadInline.size,
      coverFallsThrough,
      invalidCoverUrls: invalidCoverUrls.length,
      report: "migration-report.md",
    },
    null,
    2,
  ),
);

  if (dryRun) return;

  const { writeClient } = await import("../sanity/lib/write-client");
  for (const [index, batch] of batches.entries()) {
    const transaction = writeClient.transaction();
    for (const document of batch) transaction.createOrReplace(document);
    await transaction.commit();
    console.log(`Lot ${index + 1}/${batches.length} écrit (${batch.length} documents).`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    const response = "response" in error ? error.response : undefined;
    if (response && typeof response === "object" && "body" in response) {
      console.error(JSON.stringify(response.body).slice(0, 2000));
    }
  } else {
    console.error("Migration impossible.");
  }
  process.exitCode = 1;
});
