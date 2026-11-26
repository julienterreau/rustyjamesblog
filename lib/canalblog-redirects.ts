/**
 * Anciennes URLs Canalblog dont le slug a changé sur rustyjamesblog.link.
 * Les chemins `archives/YYYY/MM/DD/id.html` inchangés ne vont pas ici :
 * ils sont déjà servis par `[...slug]`.
 *
 * Exemple :
 * "/archives/2015/01/06/31264439.html": "/nouveau-slug-de-l-article",
 */
export const CANALBLOG_REDIRECTS: Record<string, string> = {};
