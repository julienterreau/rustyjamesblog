import { GazetteSubscribe } from "@/components/gazette-subscribe";
import { archivesHref } from "@/lib/archive-links";
import { getGazette } from "@/lib/articles";
import Link from "next/link";

const POLES = ["Géopolitique & Société", "Sciences & Technologies", "Ésotérisme & Occulte"];

export async function GazetteFooter() {
  const data = await getGazette({ tags: null, q: null, year: null, limit: 1 });
  const years = [...new Set(data.months.map((month) => Number(month.key.slice(0, 4))))];
  return (
    <footer className="site-foot" id="contact">
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <span className="foot-logo">RUSTY JAMES NEWS</span>
          <span className="foot-sub">Presse d&apos;investigation non alignée</span>
          <p className="foot-desc">
            Recherche indépendante sur les coulisses de la géopolitique, les révolutions scientifiques occultées,
            l&apos;histoire interdite et les révélations déclassifiées. Magazine né en 2009, fidèle au texte
            d&apos;origine.
          </p>
          <div className="foot-devise">
            <span className="devise-l">Devise</span>
            <span className="devise-v">« Explorer. Questionner. Comprendre. »</span>
          </div>
        </div>
        <div className="foot-col">
          <span className="foot-h">Archives Chronologiques</span>
          <ul className="foot-years">
            {years.map((year) => {
              const total = data.months
                .filter((month) => month.key.startsWith(String(year)))
                .reduce((sum, month) => sum + month.count, 0);
              return (
                <li key={year}>
                  <Link href={archivesHref({ year })}>
                    {year} <span className="n">{total}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="foot-poles">
            <span className="foot-h muted">Pôles Thématiques</span>
            <div className="foot-tags">
              {POLES.map((pole) => (
                <span key={pole}>{pole}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="foot-col">
          <span className="foot-h">Dépêches Confidentielles</span>
          <p className="foot-desc">
            Recevez directement les rapports de déclassification, les enquêtes censurées et les synthèses stratégiques
            du blog.
          </p>
          <GazetteSubscribe footer />
        </div>
      </div>
      <div className="foot-bottom">
        <div className="wrap foot-bottom-in">
          <span>© 2009–2026 Rusty James News. Journalisme d&apos;investigation citoyen.</span>
          <span className="foot-links">
            <a href="#top">Haut de page</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
