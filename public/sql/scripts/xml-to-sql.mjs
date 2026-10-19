#!/usr/bin/env node
/**
 * Convertit un export XML Overblog (articles.xml) en JSON et en INSERT SQL.
 *
 * Champs source d'un <post> : title, slug, tags, status, origin, created_at,
 * published_at, modified_at, author, content (CDATA HTML), comments.
 * Il n'y a pas d'extrait, de catégories, ni de liste d'images : l'extrait et
 * les URLs d'images sont dérivés du HTML. Les jetons `id::nom` (pinned,
 * carousel, sensitive) sont des drapeaux éditoriaux, pas des catégories.
 *
 * Statuts Overblog observés : 1 brouillon, 2 publié, 6 hors ligne.
 * Seuls les <post> au statut 2 sont exportés. Les <page> sont ignorées.
 *
 * Usage :
 *   node scripts/xml-to-sql.mjs [--input articles.xml] [--dialect postgres|mysql] [--out output]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import he from "he";
import { parse as parseHtml } from "node-html-parser";
import pgFormat from "pg-format";
import sqlstring from "sqlstring";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH_SIZE = 500;
const EXCERPT_LENGTH = 320;

const PUBLISHED_STATUS = "2";
const STATUS_LABELS = {
  1: "brouillon",
  2: "publié",
  6: "hors ligne",
};

const COLUMNS = [
  "slug",
  "title",
  "excerpt",
  "content_html",
  "published_at",
  "created_at",
  "modified_at",
  "author",
  "categories",
  "tags",
  "editorial_flags",
  "image_urls",
  "comments",
];

const JSON_COLUMNS = new Set([
  "categories",
  "tags",
  "editorial_flags",
  "image_urls",
  "comments",
]);

const DATE_COLUMNS = new Set(["published_at", "created_at", "modified_at"]);

const ILLEGAL_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function parseArgs(argv) {
  const args = {
    dialect: "postgres",
    input: path.join(ROOT, "articles.xml"),
    out: path.join(ROOT, "output"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dialect") {
      args.dialect = argv[++i];
    } else if (token === "--input") {
      args.input = path.resolve(argv[++i]);
    } else if (token === "--out") {
      args.out = path.resolve(argv[++i]);
    } else if (!token.startsWith("--") && args.input === path.join(ROOT, "articles.xml")) {
      args.input = path.resolve(token);
    } else {
      throw new Error(`Argument inconnu : ${token}`);
    }
  }

  if (args.dialect !== "postgres" && args.dialect !== "mysql") {
    throw new Error("Le dialecte doit être postgres ou mysql.");
  }
  if (!args.input || !args.out) {
    throw new Error("Les options --input et --out exigent une valeur.");
  }
  return args;
}

function decode(value) {
  if (value == null) return "";
  const text = String(value);
  if (!text.includes("&")) return text;
  return he.decode(text);
}

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "__cdata")) return asText(value.__cdata);
    if (Object.prototype.hasOwnProperty.call(value, "#text")) return asText(value["#text"]);
  }
  return "";
}

function cleanMeta(value) {
  return decode(asText(value)).replace(/\s+/g, " ").trim();
}

function splitTaxonomy(raw) {
  const tags = [];
  const flags = [];
  const seenTags = new Set();
  const seenFlags = new Set();

  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const marker = token.indexOf("::");
    const left = marker === -1 ? "" : token.slice(0, marker);
    const right = marker === -1 ? "" : token.slice(marker + 2).trim();
    const isFlag = marker > 0 && [...left].every((char) => char >= "0" && char <= "9") && right;
    if (isFlag) {
      if (!seenFlags.has(right)) {
        seenFlags.add(right);
        flags.push(right);
      }
      continue;
    }
    if (!seenTags.has(token)) {
      seenTags.add(token);
      tags.push(token);
    }
  }

  return { tags, flags };
}

function addUrl(urls, seen, raw) {
  if (!raw) return;
  for (const candidate of raw.split(",")) {
    const url = candidate.trim().split(/\s+/)[0];
    if (!url || url.startsWith("data:")) continue;
    let normalized = url;
    if (normalized.startsWith("//")) normalized = `https:${normalized}`;
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
}

function readContent(html) {
  if (!html.trim()) return { excerpt: "", image_urls: [] };
  const root = parseHtml(html);
  const text = root.text.replace(/\s+/g, " ").trim();
  let excerpt = text;
  if (text.length > EXCERPT_LENGTH) {
    const cut = text.slice(0, EXCERPT_LENGTH);
    const space = cut.lastIndexOf(" ");
    excerpt = `${(space > 80 ? cut.slice(0, space) : cut).trimEnd()}…`;
  }

  const image_urls = [];
  const seen = new Set();
  for (const element of root.querySelectorAll("img, source, image")) {
    addUrl(image_urls, seen, element.getAttribute("src"));
    addUrl(image_urls, seen, element.getAttribute("data-src"));
    addUrl(image_urls, seen, element.getAttribute("data-original"));
    addUrl(image_urls, seen, element.getAttribute("data-lazy-src"));
    addUrl(image_urls, seen, element.getAttribute("srcset"));
    addUrl(image_urls, seen, element.getAttribute("href"));
  }
  return { excerpt, image_urls };
}

function normalizeComments(comments) {
  if (comments == null || comments === "") return [];
  let items = [];
  if (Array.isArray(comments)) items = comments;
  else if (typeof comments === "object" && comments.comment != null) {
    items = Array.isArray(comments.comment) ? comments.comment : [comments.comment];
  } else if (typeof comments === "object") items = [comments];
  else items = [comments];

  return items.filter((item) => item != null && item !== "").map((item) => {
    if (typeof item !== "object") return { content_html: decode(asText(item)) };
    const comment = {};
    for (const [key, value] of Object.entries(item)) {
      comment[key] = typeof value === "string" || typeof value === "number"
        ? decode(asText(value))
        : value;
    }
    return comment;
  });
}

function nullableDate(value, id, field, errors) {
  const text = cleanMeta(value);
  if (!text) return null;
  if (Number.isNaN(Date.parse(text))) {
    errors.push({ id, message: `${field} invalide : ${text}` });
    return null;
  }
  return text;
}

function toMysqlDateTime(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
  ].join(" ");
}

function normalizePost(post, index, errors) {
  const slug = cleanMeta(post.slug);
  const title = cleanMeta(post.title);
  const id = slug || (title ? `titre:${title.slice(0, 80)}` : `post#${index + 1}`);

  let contentHtml = "";
  let excerpt = "";
  let imageUrls = [];
  try {
    contentHtml = decode(asText(post.content)).trim();
    ({ excerpt, image_urls: imageUrls } = readContent(contentHtml));
  } catch (error) {
    errors.push({ id, message: `contenu illisible : ${error.message}` });
  }

  const taxonomy = splitTaxonomy(cleanMeta(post.tags));

  return {
    slug,
    title,
    excerpt,
    content_html: contentHtml,
    published_at: nullableDate(post.published_at, id, "published_at", errors),
    created_at: nullableDate(post.created_at, id, "created_at", errors),
    modified_at: nullableDate(post.modified_at, id, "modified_at", errors),
    author: cleanMeta(post.author),
    categories: [],
    tags: taxonomy.tags,
    editorial_flags: taxonomy.flags,
    image_urls: imageUrls,
    comments: normalizeComments(post.comments),
    status: PUBLISHED_STATUS,
    origin: cleanMeta(post.origin),
  };
}

function postgresSchema() {
  return `-- Export Overblog. Encodage UTF-8. Les dates conservent leur fuseau d'origine.
SET client_encoding = 'UTF8';

BEGIN;

CREATE TABLE IF NOT EXISTS articles (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content_html text,
  published_at timestamptz,
  created_at timestamptz,
  modified_at timestamptz,
  author text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  editorial_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments jsonb NOT NULL DEFAULT '[]'::jsonb
);

`;
}

function mysqlSchema() {
  return `-- Export Overblog. Encodage UTF-8.
-- Les dates sont converties en UTC (DATETIME, sans fuseau).
SET NAMES utf8mb4;

START TRANSACTION;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_html LONGTEXT,
  published_at DATETIME NULL,
  created_at DATETIME NULL,
  modified_at DATETIME NULL,
  author TEXT,
  categories JSON NOT NULL,
  tags JSON NOT NULL,
  editorial_flags JSON NOT NULL,
  image_urls JSON NOT NULL,
  comments JSON NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
}

function rowValues(article, dialect) {
  return COLUMNS.map((column) => {
    const value = article[column];
    if (JSON_COLUMNS.has(column)) return JSON.stringify(value ?? []);
    if (dialect === "mysql" && DATE_COLUMNS.has(column)) return toMysqlDateTime(value);
    if (value == null || value === "") {
      return DATE_COLUMNS.has(column) ? null : "";
    }
    return value;
  });
}

function postgresInsert(rows) {
  const tuples = pgFormat("%L", rows.map((article) => rowValues(article, "postgres")));
  const columns = COLUMNS.map((column) => pgFormat("%I", column)).join(", ");
  const projected = COLUMNS.map((column) => {
    const ident = pgFormat("%I", column);
    if (JSON_COLUMNS.has(column)) return `${ident}::jsonb`;
    if (DATE_COLUMNS.has(column)) return `${ident}::timestamptz`;
    return ident;
  }).join(", ");
  return `INSERT INTO articles (${columns})\nSELECT ${projected}\nFROM (VALUES ${tuples}) AS v(${columns});\n`;
}

function mysqlInsert(rows) {
  const values = rows.map((article) => rowValues(article, "mysql"));
  return `${sqlstring.format("INSERT INTO ?? (??) VALUES ?", ["articles", COLUMNS, values])};\n`;
}

function writeSql(filePath, articles, dialect) {
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });
  stream.write(dialect === "postgres" ? postgresSchema() : mysqlSchema());
  const insert = dialect === "postgres" ? postgresInsert : mysqlInsert;
  for (let offset = 0; offset < articles.length; offset += BATCH_SIZE) {
    stream.write(insert(articles.slice(offset, offset + BATCH_SIZE)));
    stream.write("\n");
  }
  stream.write(dialect === "postgres" ? "COMMIT;\n" : "COMMIT;\n");
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });
}

function writeJson(filePath, articles) {
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });
  stream.write("[\n");
  articles.forEach((article, index) => {
    stream.write(JSON.stringify(article));
    stream.write(index === articles.length - 1 ? "\n" : ",\n");
  });
  stream.write("]\n");
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });
}

function loadXml(filePath) {
  const raw = fs.readFileSync(filePath);
  const xml = raw.toString("utf8").replace(/^\uFEFF/, "");
  let stripped = 0;
  const cleaned = xml.replace(ILLEGAL_XML, () => {
    stripped += 1;
    return "";
  });

  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    processEntities: {
      enabled: true,
      maxEntitySize: 100000,
      maxExpansionDepth: 20,
      maxTotalExpansions: Number.POSITIVE_INFINITY,
      maxExpandedLength: 500000000,
      maxEntityCount: 5000000,
    },
    htmlEntities: true,
    trimValues: false,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (tagName) =>
      tagName === "post" || tagName === "page" || tagName === "comment" || tagName === "tag",
  });

  return { parsed: parser.parse(cleaned), stripped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.input)) {
    throw new Error(`Fichier introuvable : ${args.input}`);
  }

  console.log(`Lecture de ${args.input}`);
  const { parsed, stripped } = loadXml(args.input);
  const posts = parsed?.root?.posts?.post ?? [];
  const pages = parsed?.root?.pages?.page ?? [];
  if (!Array.isArray(posts)) {
    throw new Error("La balise posts/post est absente ou illisible.");
  }

  const ignored = { pages: pages.length };
  const errors = [];
  const articles = [];

  posts.forEach((post, index) => {
    const status = cleanMeta(post?.status);
    if (status !== PUBLISHED_STATUS) {
      const label = STATUS_LABELS[status] ?? `statut ${status || "absent"}`;
      ignored[label] = (ignored[label] ?? 0) + 1;
      return;
    }
    try {
      articles.push(normalizePost(post, index, errors));
    } catch (error) {
      const id = cleanMeta(post?.slug) || `post#${index + 1}`;
      errors.push({ id, message: error.message });
    }
  });

  fs.mkdirSync(args.out, { recursive: true });
  const jsonPath = path.join(args.out, "articles.json");
  const sqlPath = path.join(args.out, "articles.sql");
  await Promise.all([
    writeJson(jsonPath, articles),
    writeSql(sqlPath, articles, args.dialect),
  ]);

  const ignoredTotal = Object.values(ignored).reduce((sum, count) => sum + count, 0);
  console.log(`Articles exportés : ${articles.length}`);
  console.log(`Éléments ignorés : ${ignoredTotal}`);
  for (const [label, count] of Object.entries(ignored)) {
    console.log(`  - ${label} : ${count}`);
  }
  if (stripped > 0) {
    console.log(`Caractères de contrôle illégaux retirés avant analyse : ${stripped}`);
  }
  console.log(`Erreurs : ${errors.length}`);
  for (const error of errors.slice(0, 30)) {
    console.log(`  - [${error.id}] ${error.message}`);
  }
  if (errors.length > 30) {
    console.log(`  - … et ${errors.length - 30} autres`);
  }
  console.log(`JSON : ${jsonPath}`);
  console.log(`SQL (${args.dialect}) : ${sqlPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
