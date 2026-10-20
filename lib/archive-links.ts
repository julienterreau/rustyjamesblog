export type ArchiveQuery = {
  page?: number;
  tag?: string | null;
  date?: string | null;
  month?: string | null;
  year?: number | string | null;
  from?: number | string | null;
  to?: number | string | null;
};

export function archivesHref({ page, tag, date, month, year, from, to }: ArchiveQuery) {
  const query = new URLSearchParams();
  if (tag) query.set("tag", tag);
  if (date) query.set("date", date);
  if (month) query.set("month", month);
  if (year) query.set("year", String(year));
  if (from) query.set("from", String(from));
  if (to) query.set("to", String(to));
  if (page && page > 1) query.set("page", String(page));
  const value = query.toString();
  return value ? `/archives?${value}` : "/archives";
}

export function parseArchiveDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

export function parseArchiveMonth(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12 || year < 1990 || year > 2100) return null;
  return { year, month, value };
}

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatArchiveMonth(value: string) {
  const parsed = parseArchiveMonth(value);
  if (!parsed) return value;
  const name = MONTH_NAMES[parsed.month - 1];
  return `${name.charAt(0).toLocaleUpperCase("fr-FR")}${name.slice(1)} ${parsed.year}`;
}

export function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function currentMonthParis() {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [year, month] = value.split("-").map(Number);
  return { year, month, value: monthValue(year, month) };
}

export function todayParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function formatCivilDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function pageItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 5));
  const end = Math.min(total, start + 5);
  const items: Array<number | "gap"> = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) items.push("gap");
  }
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total) {
    if (end < total - 1) items.push("gap");
    items.push(total);
  }
  return items;
}
