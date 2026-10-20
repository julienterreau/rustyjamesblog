import { archivesHref, pageItems } from "@/lib/archive-links";
import Link from "next/link";

export function ArchivePager({
  page,
  totalPages,
  tag,
  date,
  month = null,
  year = null,
  from = null,
  to = null,
}: {
  page: number;
  totalPages: number;
  tag: string | null;
  date: string | null;
  month?: string | null;
  year?: number | null;
  from?: number | null;
  to?: number | null;
}) {
  const items = pageItems(page, totalPages);
  const href = (target: number) => archivesHref({ page: target, tag, date, month, year, from, to });

  return (
    <nav className="archive-pager" aria-label="Pagination des archives">
      <div className="archive-pager-row">
        {page > 1 ? (
          <Link href={href(page - 1)} className="edge">
            Précédent
          </Link>
        ) : (
          <span className="edge" aria-disabled="true">
            Précédent
          </span>
        )}
        <div className="archive-pages">
          {items.map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="gap">
                …
              </span>
            ) : (
              <Link key={item} href={href(item)} aria-current={item === page ? "page" : undefined}>
                {item}
              </Link>
            ),
          )}
        </div>
        {page < totalPages ? (
          <Link href={href(page + 1)} className="edge">
            Suivant
          </Link>
        ) : (
          <span className="edge" aria-disabled="true">
            Suivant
          </span>
        )}
      </div>
      <form action="/archives" method="get" className="archive-jump">
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {date ? <input type="hidden" name="date" value={date} /> : null}
        {month ? <input type="hidden" name="month" value={month} /> : null}
        {year ? <input type="hidden" name="year" value={year} /> : null}
        {from ? <input type="hidden" name="from" value={from} /> : null}
        {to ? <input type="hidden" name="to" value={to} /> : null}
        <label htmlFor="archive-page" className="font-bold">
          Page
        </label>
        <input
          key={page}
          id="archive-page"
          name="page"
          type="number"
          min={1}
          max={totalPages}
          defaultValue={page}
          required
        />
        <button type="submit">
          Go
        </button>
      </form>
    </nav>
  );
}
