import { absoluteUrl } from "@/lib/site";
import { client } from "@/sanity/lib/client";
import { Resend } from "resend";

const SEGMENT_NAME = "Abonnés";

let segmentPromise: Promise<string> | null = null;

function resendClient() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY est absent.");
  return new Resend(key);
}

function alreadyThere(message: string) {
  return /already exists|already been added|duplicate/i.test(message);
}

async function resolveSegment(resend: Resend) {
  const configured = process.env.RESEND_SEGMENT_ID?.trim();
  if (configured) return configured;

  let after: string | undefined;
  for (;;) {
    const listed = await resend.segments.list(after ? { limit: 100, after } : { limit: 100 });
    if (listed.error) throw new Error(listed.error.message);
    const found = listed.data?.data.find((segment) => segment.name === SEGMENT_NAME);
    if (found) return found.id;
    const last = listed.data?.data.at(-1)?.id;
    if (!listed.data?.has_more || !last) break;
    after = last;
  }

  const created = await resend.segments.create({ name: SEGMENT_NAME });
  if (created.error || !created.data) throw new Error(created.error?.message || "Segment introuvable.");
  return created.data.id;
}

async function segmentId(resend: Resend) {
  if (process.env.RESEND_SEGMENT_ID?.trim()) return process.env.RESEND_SEGMENT_ID.trim();
  if (!segmentPromise) {
    segmentPromise = resolveSegment(resend).catch((error: unknown) => {
      segmentPromise = null;
      throw error;
    });
  }
  return segmentPromise;
}

export async function addNewsletterContact(email: string): Promise<"created" | "exists"> {
  const resend = resendClient();
  const segment = await segmentId(resend);
  const created = await resend.contacts.create({
    email,
    unsubscribed: false,
    segments: [{ id: segment }],
  });
  if (!created.error) return "created";
  if (!alreadyThere(created.error.message)) throw new Error(created.error.message);

  const added = await resend.contacts.segments.add({ email, segmentId: segment });
  if (added.error && !alreadyThere(added.error.message)) throw new Error(added.error.message);
  return "exists";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function titleFromSlug(slug: string) {
  const last = slug.split("/").pop() ?? slug;
  const words = last.replace(/\.html?$/i, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Article sans titre";
  return words.charAt(0).toLocaleUpperCase("fr-FR") + words.slice(1);
}

function articlePath(slug: string) {
  return `/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

export async function sendNewArticle(id: string) {
  const from = process.env.RESEND_FROM?.trim();
  if (!process.env.RESEND_API_KEY?.trim() || !from) return;
  if (id.startsWith("drafts.")) return;

  const article = await client.fetch<{ title?: string | null; slug?: string | null; excerpt?: string | null } | null>(
    `*[_id == $id && _type == "article"][0]{ title, "slug": slug.current, excerpt }`,
    { id },
  );
  if (!article?.slug) throw new Error("Article publié introuvable pour l'envoi.");

  const title = article.title?.trim() || titleFromSlug(article.slug);
  const excerpt = article.excerpt?.trim() || "";
  const url = absoluteUrl(articlePath(article.slug));
  const html = [
    `<p>Un nouvel article est en ligne sur Rusty James News.</p>`,
    `<h1>${escapeHtml(title)}</h1>`,
    excerpt ? `<p>${escapeHtml(excerpt)}</p>` : "",
    `<p><a href="${escapeHtml(url)}">Lire l'article</a></p>`,
    `<p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Se désinscrire</a></p>`,
  ].join("");

  const resend = resendClient();
  const sent = await resend.broadcasts.create(
    {
      name: title.slice(0, 120),
      segmentId: await segmentId(resend),
      from,
      subject: title,
      previewText: excerpt.slice(0, 140) || undefined,
      html,
      send: true,
    },
    { headers: { "Idempotency-Key": `article-${id}`.slice(0, 256) } },
  );
  if (sent.error) throw new Error(sent.error.message);
}
