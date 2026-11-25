/** Transforme une adresse YouTube ou un code iframe en URL d'intégration. */
export function mediaEmbedSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromIframe = trimmed.match(/<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const candidate = (fromIframe?.[1] || fromIframe?.[2] || fromIframe?.[3] || trimmed).trim();

  const youtube = youtubeEmbedSrc(candidate);
  if (youtube) return youtube;

  if (/^https?:\/\//i.test(candidate) && !/<[^>]+>/.test(candidate)) return candidate;
  return null;
}

/** Vrai si le texte n'est qu'une adresse / un iframe YouTube (ou média) à intégrer. */
export function isLoneMediaPaste(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^<iframe\b/i.test(trimmed) && /<\/iframe>\s*$/i.test(trimmed)) return Boolean(mediaEmbedSrc(trimmed));
  if (/\s/.test(trimmed)) return false;
  return Boolean(mediaEmbedSrc(trimmed));
}

function youtubeEmbedSrc(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const youtubeHost =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com";

  if (!youtubeHost) return null;

  let id: string | null = null;
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    id = parts[0] ?? null;
  } else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
    id = parts[1] ?? null;
  } else {
    id = url.searchParams.get("v");
  }

  if (!id) return null;
  id = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (id.length < 6) return null;

  const start = parseYouTubeStart(url.searchParams.get("start") || url.searchParams.get("t"));
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  return start ? `${base}?start=${start}` : base;
}

function parseYouTubeStart(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}
