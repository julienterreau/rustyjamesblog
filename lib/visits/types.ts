export const PERIODS = ["24h", "7j", "30j", "tout"] as const;

export type Period = (typeof PERIODS)[number];

export type SourceName =
  | "Facebook"
  | "Google"
  | "Telegram"
  | "X"
  | "Accès direct"
  | "Autres sites";

export type VisitRow = {
  occurredAt: string;
  path: string;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
  client: string | null;
  source: string | null;
  visitorId: string;
  durationSec: number | null;
  articleTitle: string | null;
  articleCategory: string | null;
  articleSlug: string | null;
};

export type Kpi = {
  label: string;
  value: string;
  delta: string | null;
  negative: boolean;
  hint: string;
};

export type MapPoint = {
  city: string;
  country: string;
  code: string;
  count: number;
  x: number;
  y: number;
  /** Pays connu, ville absente : le point est le centre du pays. */
  approximate?: boolean;
};

export type CountryRank = {
  code: string;
  name: string;
  flag: string;
  count: number;
  share: string;
  cities: string;
};

export type Bar = {
  label: string;
  hint: string;
  count: number;
  share: string;
  width: number;
};

export type DeviceSlice = {
  label: string;
  count: number;
  share: number;
};

export type ChartBar = {
  label: string;
  title: string;
  value: number;
};

export type ArticleRank = {
  title: string;
  href: string | null;
  meta: string;
  count: number;
};

export type LiveVisit = {
  id: string;
  at: string;
  place: string;
  device: string;
  source: string;
  page: string;
};

export type LiveSnapshot = {
  online: number;
  visits: LiveVisit[];
};

export type VisitorStats = {
  period: Period;
  generatedAt: string;
  partial: boolean;
  visits: number;
  kpis: Kpi[];
  points: MapPoint[];
  countries: CountryRank[];
  unknown: number;
  unknownShare: string;
  sources: Bar[];
  devices: DeviceSlice[];
  browsers: Bar[];
  chart: ChartBar[];
  chartTitle: string;
  chartHint: string;
  articles: ArticleRank[];
  live: LiveSnapshot;
};
