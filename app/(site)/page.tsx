import { ArticleCover } from "@/components/article-cover";
import { articlePath, getGazette, type ArticleSummary } from "@/lib/articles";
import { archivesHref } from "@/lib/archive-links";
import { THEMES, themeById } from "@/lib/themes";
import { GazetteSubscribe } from "@/components/gazette-subscribe";
import { optimizedImageUrl } from "@/lib/seo";
import Link from "next/link";
import { preload } from "react-dom";
import { Suspense } from "react";

type HomeParams = { q?: string; rubrique?: string; annee?: string; suite?: string };

const FILTERS = [
  { label: "Toutes", id: "" },
  { label: "Occultisme", id: "esoterisme" },
  { label: "Géopolitique", id: "geopolitique" },
  { label: "Sciences", id: "sciences" },
  { label: "Santé", id: "sante" },
];

const ERAS = [
  { from: 2026, to: 2024, t: "2026 – 2024", d: "Cycle Cyber-Occulte", s: "Bio-informatique, intelligence artificielle mimétique, déclassification des projets psychotroniques et résistance vaccinale." },
  { from: 2021, to: 2019, t: "2021 – 2019", d: "L’Ère des Fractures", s: "Chroniques de la crise sanitaire globale, technologies ARNm naissantes et mutations des libertés publiques." },
  { from: 2014, to: 2013, t: "2014 – 2013", d: "L’Âge d’Or des Révélations", s: "Sommet historique du blog : fuites NSA/Snowden, manipulation des marchés Forex et découvertes mégalithiques." },
];

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const QUOTE = "« Chaque organe correspond à un idéal spirituel, une constellation étoilée ou un élément alchimique. Par cette connexion, les anciens philosophes pouvaient influencer le cours du monde. »";

export default function Home({ searchParams }: { searchParams: Promise<HomeParams> }) {
  return (
    <Suspense fallback={<p className="wrap fil-wrap">Chargement des archives…</p>}>
      <GazetteHome searchParams={searchParams} />
    </Suspense>
  );
}

function pageHref(next: { rubrique?: string; q?: string; annee?: string; suite?: number }, hash = "") {
  const params = new URLSearchParams();
  if (next.rubrique) params.set("rubrique", next.rubrique);
  if (next.q) params.set("q", next.q);
  if (next.annee) params.set("annee", next.annee);
  if (next.suite && next.suite > 17) params.set("suite", String(next.suite));
  const query = params.toString();
  return `/${query ? `?${query}` : ""}${hash}`;
}

function parisDate(iso: string | null) {
  if (!iso) return { key: "nodate", label: "Sans date", heading: "Sans date" };
  const numeric = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const [year, month, day] = numeric.split("-");
  const name = MONTHS[Number(month) - 1] ?? month;
  return {
    key: `${year}-${month}`,
    label: `${Number(day)} ${name} ${year}`,
    heading: `${name} ${year}`,
  };
}

function plain(value: string | null) {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function picture(article: ArticleSummary) {
  return optimizedImageUrl(article.image) || article.image;
}

async function GazetteHome({ searchParams }: { searchParams: Promise<HomeParams> }) {
  const params = await searchParams;
  const theme = themeById(params.rubrique);
  const rubrique = theme?.id ?? "";
  const q = params.q?.trim().slice(0, 80) || "";
  const annee = /^\d{4}$/.test(params.annee ?? "") ? params.annee : "";
  const suite = Math.min(80, Math.max(17, Number(params.suite) || 17));
  const data = await getGazette({
    tags: theme ? [...theme.tags] : null,
    q: q || null,
    year: annee ? Number(annee) : null,
    limit: suite,
  });

  preload("/gazette/hero-banner.jpg", { as: "image", fetchPriority: "high" });

  const lead = data.articles[0] ?? null;
  const rows = data.articles.slice(1);
  const groups: { key: string; heading: string; items: ArticleSummary[] }[] = [];
  for (const article of rows) {
    const date = parisDate(article.published_at);
    const last = groups.at(-1);
    if (!last || last.key !== date.key) groups.push({ key: date.key, heading: date.heading, items: [article] });
    else last.items.push(article);
  }

  const years = [...new Set(data.months.map((month) => month.key.slice(0, 4)))];
  const libraryYear = annee || years[0] || "2026";
  const libraryMonths = data.months.filter((month) => month.key.startsWith(libraryYear));
  const peak = data.months.reduce((best, month) => (month.count > best.count ? month : best), data.months[0]);
  const peakLabel = peak ? `${MONTHS[Number(peak.key.slice(5, 7)) - 1]?.toLocaleLowerCase("fr-FR")} ${peak.key.slice(0, 4)} (${peak.count} art./mois)` : "mars 2014 (110 art./mois)";
  const base = { rubrique, q, annee };
  const count = new Intl.NumberFormat("fr-FR");

  return (
    <main>
      <section className="hero" aria-label="Rusty James News, le Capitole sous l'orage">
        <img
          src="/gazette/hero-banner.jpg"
          sizes="100vw"
          alt="Le Capitole de Washington sous un ciel d'orage violet, avec la colombe et la devise de Rusty James News"
          fetchPriority="high"
        />
      </section>

      <section className="featured" aria-label="Dossier spécial">
        <div className="wrap">
          <div className="feat-stamps">
            <span className="stamp">Dossier Spécial // Déclassification</span>
            <span className="live-dot-wrap">
              <span className="live-dot" aria-hidden="true" />
              Archives Centrales Non Censurées
            </span>
          </div>
          <h1 className="feat-title">
            <Link href={data.featured ? articlePath(data.featured.slug) : lead ? articlePath(lead.slug) : "/#une"}>
              {data.featured?.title ?? lead?.title ?? "Rusty James News — Sciences, politique et ésotérisme"}
            </Link>
          </h1>
          <p className="feat-quote">{QUOTE}</p>
          <div className="feat-meta">
            <span className="meta-chip">
              <span className="ms" aria-hidden="true">verified_user</span>
              Indexation intégrale 2009–2026
            </span>
            <span className="meta-chip">
              <span className="ms" aria-hidden="true">token</span>
              {count.format(data.total)} publications recensées · {count.format(data.total)} réimportées
            </span>
          </div>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-in">
          <div className="ticker-left">
            <span className="ticker-label">
              <span className="ms" aria-hidden="true">emergency</span>
              Flash Découverte :
            </span>
            <Link className="ticker-text" href={lead ? articlePath(lead.slug) : "/#une"}>
              {lead ? `${parisDate(lead.published_at).label} — ${lead.title}` : "Chargement des dernières dépêches…"}
            </Link>
          </div>
          <Link className="ticker-more" href="/archives">
            Accéder aux registres chronologiques →
          </Link>
        </div>
      </div>

      <div className="wrap fil-wrap" id="une">
        <div className="fil-head">
          <div>
            <div className="rubric-row">
              <span className="sq" aria-hidden="true" />
              <span className="rubric">Registre d&apos;actualité &amp; Investigation</span>
            </div>
            <h2 className="h-lg">LE FIL DES ARCHIVES &amp; INVESTIGATIONS RÉCENTES</h2>
            <span className="fil-count">
              {count.format(data.filtered)} articles sur {count.format(data.total)} importés
            </span>
          </div>
          <div className="fil-filters" role="group" aria-label="Filtrer le fil par rubrique">
            {FILTERS.map((filter) => (
              <Link
                key={filter.label}
                href={pageHref({ ...base, rubrique: filter.id, suite: 17 }, "#une")}
                className={`fil-btn${filter.id === rubrique ? " is-active" : ""}`}
                scroll={false}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="broadsheet">
          <div className="col-main">
            {lead ? <Lead article={lead} /> : null}
            {rubrique || q || annee ? (
              <div className="chips">
                {rubrique ? (
                  <span className="chip">
                    {theme?.name ?? rubrique}
                    <Link href={pageHref({ ...base, rubrique: "" }, "#une")} aria-label="Retirer">
                      ×
                    </Link>
                  </span>
                ) : null}
                {annee ? (
                  <span className="chip">
                    {annee}
                    <Link href={pageHref({ ...base, annee: "" }, "#une")} aria-label="Retirer">
                      ×
                    </Link>
                  </span>
                ) : null}
                {q ? (
                  <span className="chip">
                    « {q} »
                    <Link href={pageHref({ ...base, q: "" }, "#une")} aria-label="Retirer">
                      ×
                    </Link>
                  </span>
                ) : null}
                <Link className="reset" href="/#une">
                  Réinitialiser
                </Link>
              </div>
            ) : null}
            {groups.map((group) => (
              <section key={group.key}>
                <div className="wire-month">{group.heading}</div>
                {group.items.map((article) => (
                  <Row key={article.slug} article={article} />
                ))}
              </section>
            ))}
            {data.articles.length === 0 ? (
              <div className="empty">
                Aucun article ne correspond à ces critères.
              </div>
            ) : null}
            {data.filtered > data.articles.length ? (
              <div className="loadmore-wrap">
                <Link className="btn-ghost" href={pageHref({ ...base, suite: suite + 16 })} scroll={false}>
                  Afficher plus d&apos;articles
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="col-side" aria-label="Dossiers et dépêches latérales">
            <div className="side-box">
              <div className="side-box-h">
                <span className="rubric-with-ico">
                  <span className="ms" aria-hidden="true">history_edu</span>
                  Dossiers à lire
                </span>
                <span className="side-note-r">Textes intégraux</span>
              </div>
              <ol className="ds-list">
                {data.dossiers.map((article) => (
                  <li key={article.slug}>
                    <span className="ds-date">{parisDate(article.published_at).label}</span>
                    <h4 className="ds-title">
                      <Link href={articlePath(article.slug)}>{article.title}</Link>
                    </h4>
                    {plain(article.excerpt) ? <p className="ds-ex">{plain(article.excerpt)}</p> : null}
                  </li>
                ))}
              </ol>
            </div>

            <form className="side-search" action="/#une" method="get">
              {rubrique ? <input type="hidden" name="rubrique" value={rubrique} /> : null}
              {annee ? <input type="hidden" name="annee" value={annee} /> : null}
              <label className="sr-only" htmlFor="q-side">
                Terminal de recherche
              </label>
              <input id="q-side" type="search" name="q" defaultValue={q} placeholder="Terminal de recherche…" aria-label="Rechercher dans les archives" autoComplete="off" />
            </form>

            <div className="news-box">
              <div className="news-h">
                <span className="ms" aria-hidden="true">mark_email_unread</span>
                <span className="rubric">Dépêche Directe</span>
              </div>
              <h3 className="news-title">Abonnez-vous à la Lettre Confidentielle de Rusty James</h3>
              <p className="news-desc">
                Recevez les alertes de déclassification et les synthèses d&apos;investigation.
              </p>
              <GazetteSubscribe />
            </div>

            {data.callout ? (
              <div className="callout">
                <span className="callout-rubric">Enquête exclusive</span>
                <h3 className="callout-title">
                  <Link href={articlePath(data.callout.slug)}>{data.callout.title}</Link>
                </h3>
                <p className="callout-desc">
                  {plain(data.callout.excerpt).slice(0, 180) ||
                    "Étude documentée sur le donneur d’électrons mitochondrial et son rôle dans la réversion des états d’hypoxie tissulaire."}
                </p>
                <Link className="callout-more" href={articlePath(data.callout.slug)}>
                  Consulter le dossier complet →
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      <section className="biblio" id="grande-bibliotheque">
        <div className="wrap">
          <div className="biblio-head">
            <div>
              <span className="rubric">Fonds Documentaire Historique (2009 — 2026)</span>
              <h2 className="h-lg">GRANDE BIBLIOTHÈQUE DES ARCHIVES CHRONOLOGIQUES</h2>
              <p className="biblio-desc">
                Inventaire mensuel des publications, préservées année par année. Sélectionnez une année pour explorer les registres.
              </p>
            </div>
            <div className="biblio-badge">
              <span className="ms" aria-hidden="true">storage</span>
              Pic d&apos;activité : {peakLabel}
            </div>
          </div>
          <ul className="year-tabs">
            {years.map((year) => (
              <li key={year}>
                <Link href={archivesHref({ year })} className={`year-tab${year === libraryYear ? " is-active" : ""}`}>
                  {year}
                  <span className="n">{count.format(data.months.filter((month) => month.key.startsWith(year)).reduce((sum, month) => sum + month.count, 0))}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="month-grid">
            {libraryMonths.map((month) => (
              <Link key={month.key} className="month-card" href={archivesHref({ month: month.key })}>
                <div className="mc-top">
                  <span className="mc-month">{MONTHS[Number(month.key.slice(5, 7)) - 1]}</span>
                  <span className="mc-count">{month.count} art.</span>
                </div>
                <p className="mc-sample">{month.title || "Registre du mois."}</p>
                <span className="mc-link">Lire l’archive →</span>
              </Link>
            ))}
          </div>
          <div className="panorama">
            <h3 className="pano-title">Aperçu de la cartographie documentaire pluriannuelle</h3>
            <div className="pano-grid">
              {ERAS.map((era) => {
                const total = data.months
                  .filter((month) => {
                    const year = Number(month.key.slice(0, 4));
                    return year <= era.from && year >= era.to;
                  })
                  .reduce((sum, month) => sum + month.count, 0);
                return (
                  <div key={era.t} className="pano-card">
                    <div className="pano-top">
                      <span className="pano-era">{era.t}</span>
                      <span className="pano-name">{era.d}</span>
                    </div>
                    <p className="pano-desc">{era.s}</p>
                    <div className="pano-foot">
                      <span>Articles indexés : {count.format(total)}</span>
                      <Link href={archivesHref({ from: era.to, to: era.from })}>Explorer le cycle →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="hubs-sec" id="categories">
        <div className="hubs-head">
          <div className="rubric-row">
            <span className="sq" aria-hidden="true" />
            <span className="rubric">Classification Thématique</span>
          </div>
          <h2 className="h-lg">EXPLORATION PAR RUBRIQUES &amp; THÉMATIQUES</h2>
          <p className="hubs-desc">Filtrez l&apos;ensemble des dépêches et des dossiers par pôles de recherche interdisciplinaires.</p>
        </div>
        <div className="hubs-grid">
          {THEMES.map((themeItem) => {
            const total = data.themes.find((item) => item.id === themeItem.id)?.count ?? 0;
            return (
              <Link key={themeItem.id} className="hub" href={`/?rubrique=${themeItem.id}#une`}>
                <span className="hub-top">
                  <span className="ms hub-ico" aria-hidden="true">{themeItem.ico}</span>
                  <span className="hub-code">CODE: {themeItem.code}</span>
                </span>
                <h3 className="hub-title">{themeItem.name}</h3>
                <p className="hub-desc">{themeItem.desc}</p>
                <span className="hub-foot">
                  <span>{count.format(total)} articles</span>
                  <span className="hub-arrow" aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="letter" aria-labelledby="letter-title">
        <p className="letter-kicker">La lettre du jeudi</p>
        <h2 className="letter-title" id="letter-title">
          Une lecture pour voir
          <em>au-delà du visible.</em>
        </h2>
        <p className="letter-desc">
          Chaque semaine, une sélection exigeante et un texte inédit. Aucun bruit.
          Seulement ce qui mérite votre attention.
        </p>
        <GazetteSubscribe letter />
      </section>
    </main>
  );
}

function Foot({ article }: { article: ArticleSummary }) {
  return (
    <div className="rc-foot">
      <span className="rc-author">
        <span className="ini" aria-hidden="true">RJ</span>
        rusty james
      </span>
      <Link className="rc-more" href={articlePath(article.slug)}>
        Consulter l’archive →
      </Link>
    </div>
  );
}

function Lead({ article }: { article: ArticleSummary }) {
  const src = picture(article);
  const date = parisDate(article.published_at);
  return (
    <article className="lead-card">
      <div className="lc-media">
        {src ? (
          <img src={src} alt="" fetchPriority="high" />
        ) : (
          <ArticleCover title={article.title} tags={article.tags} slug={article.slug} />
        )}
      </div>
      <div className="lc-body">
        <div className="rc-meta">
          <span>{date.label}</span>
          <span className="rc-cat">{article.tags[0] ?? "Actualités"}</span>
        </div>
        <h3 className="rc-title">
          <Link href={articlePath(article.slug)}>{article.title}</Link>
        </h3>
        {plain(article.excerpt) ? <p className="rc-ex">{plain(article.excerpt)}</p> : null}
        <Foot article={article} />
      </div>
    </article>
  );
}

function Row({ article }: { article: ArticleSummary }) {
  const src = picture(article);
  const date = parisDate(article.published_at);
  return (
    <article className="row-card has-media">
      <div className="rc-media">
        {src ? (
          <img src={src} alt="" loading="lazy" />
        ) : (
          <ArticleCover title={article.title} tags={article.tags} slug={article.slug} />
        )}
      </div>
      <div className="rc-body">
        <div className="rc-meta">
          <span>{date.label}</span>
          <span className="rc-cat">{article.tags[0] ?? "Actualités"}</span>
        </div>
        <h3 className="rc-title">
          <Link href={articlePath(article.slug)}>{article.title}</Link>
        </h3>
        {plain(article.excerpt) ? <p className="rc-ex">{plain(article.excerpt)}</p> : null}
        <Foot article={article} />
      </div>
    </article>
  );
}
