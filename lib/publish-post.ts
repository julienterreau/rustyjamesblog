import { convertLexicalToHTML, defaultHTMLConverters } from "@payloadcms/richtext-lexical/html";
import type { CollectionAfterChangeHook } from "payload";
import type { SerializedEditorState } from "lexical";
import { Resend } from "resend";
import { pool } from "./db";

type MediaRef = { url?: string | null; filename?: string | null };

type PostDoc = {
  id: number | string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  content?: SerializedEditorState | null;
  author?: string | null;
  tags?: string | null;
  publishedAt?: string | null;
  image?: number | string | MediaRef | null;
  sendByEmail?: boolean | null;
  _status?: "draft" | "published" | null;
};

const SITE_PREFIX = "editos";

function publicPath(slug: string) {
  return `/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

async function refreshSite(path?: string) {
  try {
    const { revalidatePath, revalidateTag } = await import("next/cache");
    revalidateTag("articles", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/archives");
    if (path) revalidatePath(path);
  } catch {
    // The Payload CLI has no Next cache to refresh.
  }
}

export function siteSlug(slug: string) {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  return clean.startsWith(`${SITE_PREFIX}/`) ? clean : `${SITE_PREFIX}/${clean}`;
}

function tagList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function contentHtml(content: SerializedEditorState | null | undefined) {
  if (!content) return "";
  return convertLexicalToHTML({ data: content, converters: defaultHTMLConverters });
}

async function imageUrl(image: PostDoc["image"], req: Parameters<CollectionAfterChangeHook>[0]["req"]) {
  if (!image) return null;
  if (typeof image === "object") return image.url || (image.filename ? `/media/${image.filename}` : null);
  const media = await req.payload.findByID({
    collection: "media",
    id: image,
    depth: 0,
    overrideAccess: true,
    req,
  });
  if (media && typeof media === "object" && "url" in media && typeof media.url === "string") return media.url;
  if (media && typeof media === "object" && "filename" in media && typeof media.filename === "string") {
    return `/media/${media.filename}`;
  }
  return null;
}

async function ownedArticle(slug: string) {
  const existing = await pool.query<{ id: string; owned: boolean }>(
    `SELECT id::text AS id, (editorial_flags ? 'payload') AS owned
     FROM articles WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return existing.rows[0] ?? null;
}

async function upsertArticle(doc: PostDoc, req: Parameters<CollectionAfterChangeHook>[0]["req"]) {
  if (!doc.slug || !doc.title) return;
  const slug = siteSlug(doc.slug);
  const current = await ownedArticle(slug);
  if (current && !current.owned) {
    throw new Error("Ce slug est déjà utilisé par une archive. Choisissez-en un autre.");
  }

  const values = [
    slug,
    doc.title,
    doc.excerpt || null,
    contentHtml(doc.content),
    doc.publishedAt || new Date().toISOString(),
    doc.author || "Rusty James",
    JSON.stringify(tagList(doc.tags)),
    JSON.stringify([await imageUrl(doc.image, req)].filter(Boolean)),
  ];

  if (current) {
    await pool.query(
      `UPDATE articles
       SET title = $2, excerpt = $3, content_html = $4, published_at = $5,
           modified_at = now(), author = $6, tags = $7::jsonb, image_urls = $8::jsonb
       WHERE id = $1`,
      [current.id, ...values.slice(1)],
    );
    return;
  }

  await pool.query(
    `INSERT INTO articles (
       slug, title, excerpt, content_html, published_at, created_at, modified_at,
       author, categories, tags, editorial_flags, image_urls, comments
     ) VALUES (
       $1, $2, $3, $4, $5, now(), now(),
       $6, '[]'::jsonb, $7::jsonb, '["payload"]'::jsonb, $8::jsonb, '[]'::jsonb
     )`,
    values,
  );
}

export async function removePublishedPost(slug: string) {
  await pool.query(`DELETE FROM articles WHERE slug = $1 AND editorial_flags ? 'payload'`, [siteSlug(slug)]);
  await refreshSite();
}

async function sendArticle(doc: PostDoc, req: Parameters<CollectionAfterChangeHook>[0]["req"]) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return "Article publié. Ajoutez RESEND_API_KEY et RESEND_FROM dans .env pour envoyer l’email.";
  }
  if (!doc.slug || !doc.title) return "Article incomplet, email non envoyé.";

  const subscribers = await req.payload.find({
    collection: "subscribers",
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    req,
  });
  const emails = subscribers.docs
    .map((subscriber) => (subscriber && typeof subscriber === "object" && "email" in subscriber ? subscriber.email : null))
    .filter((email): email is string => typeof email === "string" && email.includes("@"));

  if (emails.length === 0) {
    return "Article publié. Aucun abonné pour le moment.";
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = `${siteUrl}${publicPath(siteSlug(doc.slug))}`;
  const html = `
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.excerpt ? `<p>${escapeHtml(doc.excerpt)}</p>` : ""}
    ${contentHtml(doc.content)}
    <p><a href="${url}">Lire sur Rusty James News</a></p>
  `;
  const resend = new Resend(apiKey);
  for (let index = 0; index < emails.length; index += 100) {
    const chunk = emails.slice(index, index + 100);
    const { error } = await resend.batch.send(
      chunk.map((to) => ({
        from,
        to,
        subject: doc.title || "Nouvel article",
        html,
      })),
    );
    if (error) return `Échec de l’envoi : ${error.message}`;
  }
  return `Envoyé à ${emails.length} abonné${emails.length > 1 ? "s" : ""}.`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const syncPublishedPost: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context.skipSync) return doc;
  const post = doc as PostDoc;
  const previous = previousDoc as PostDoc | undefined;
  if (!post.slug) return doc;

  if (previous?.slug && previous.slug !== post.slug) {
    await removePublishedPost(previous.slug);
  }

  if (post._status === "published") {
    await upsertArticle(post, req);
    await refreshSite(publicPath(siteSlug(post.slug)));

    if (post.sendByEmail) {
      const emailStatus = await sendArticle(post, req);
      await req.payload.update({
        collection: "posts",
        id: post.id,
        data: {
          sendByEmail: false,
          emailStatus,
          emailSentAt: emailStatus.startsWith("Envoyé") ? new Date().toISOString() : undefined,
        },
        context: { skipSync: true },
        draft: false,
        overrideAccess: true,
        req,
      });
    }
    return doc;
  }

  if (previous?._status === "published") {
    await removePublishedPost(post.slug);
  }
  return doc;
};
