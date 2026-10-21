export const THEMES = [
  {
    id: "actualites",
    name: "Actualités & Divers",
    code: "ACT-00",
    ico: "newspaper",
    desc: "Dépêches brutes, chroniques quotidiennes et documents d’actualité classés sans filtre.",
    tags: ["actualité", "infos"],
  },
  {
    id: "geopolitique",
    name: "Géopolitique & Société",
    code: "GEO-03",
    ico: "public",
    desc: "Ordre multipolaire, guerres hybrides, surveillance de masse et coulisses diplomatiques.",
    tags: ["guerre", "usa", "crise", "nwo"],
  },
  {
    id: "sante",
    name: "Santé & Vivre autrement",
    code: "MED-01",
    ico: "healing",
    desc: "Bleu de méthylène, chélation EDTA, protocoles non homologués et médecine hors mandat.",
    tags: ["vaccination", "eugenisme"],
  },
  {
    id: "mysteres",
    name: "Mystères & Archéologie",
    code: "ARC-02",
    ico: "account_balance",
    desc: "Göbekli Tepe, mégalithes de Stonehenge, architectures cyclopéennes et civilisations antédiluviennes.",
    tags: ["histoire"],
  },
  {
    id: "sciences",
    name: "Sciences & Technologies",
    code: "SCI-04",
    ico: "memory",
    desc: "Armes à ondes électromagnétiques, cybernétique EEG, IA prédictive et physique marginalisée.",
    tags: ["sciences"],
  },
  {
    id: "spiritualite",
    name: "Spiritualité & Éveil",
    code: "SPI-05",
    ico: "self_improvement",
    desc: "Traditions initiatiques, kundalini, chakras et chemins contemporains de l’éveil.",
    tags: ["religions"],
  },
  {
    id: "esoterisme",
    name: "Ésotérisme & Occulte",
    code: "ESO-06",
    ico: "auto_fix_high",
    desc: "Grimoires anciens, symbolisme royal, sigils voilés et entités archétypales.",
    tags: ["esoterisme", "satanisme", "666"],
  },
  {
    id: "medias",
    name: "Médias & Culture",
    code: "CUL-07",
    ico: "movie",
    desc: "Films, documentaires et productions culturelles décryptés comme vecteurs de récits.",
    tags: ["insolite"],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function themeById(id: string | null | undefined) {
  return THEMES.find((theme) => theme.id === id) ?? null;
}

export function themesForTags(tags: string[]) {
  return THEMES.filter((theme) => theme.tags.some((tag) => tags.includes(tag)));
}

export function themeForArticle(tags: string[], title = "") {
  const names = new Set(tags.map((tag) => tag.toLocaleLowerCase("fr-FR")));
  const fromTags = THEMES.find((theme) => theme.tags.some((tag) => names.has(tag)));
  if (fromTags) return fromTags;
  const text = title.toLocaleLowerCase("fr-FR");
  const rules: Array<[RegExp, (typeof THEMES)[number]["id"]]> = [
    [/vaccin|covid|santé|eugén|méthylène|edta|médec/, "sante"],
    [/guerre|otan|ukraine|géopolit|nwo|illuminat|cia\b/, "geopolitique"],
    [/égypt|archéolog|mégalith|histoire|gobekli|stonehenge/, "mysteres"],
    [/science|technolog|quantique|onde|cybern|robot/, "sciences"],
    [/éveil|religion|âme|chakra|spiritu/, "spiritualite"],
    [/ésotér|occult|satan|grimoire|alchim/, "esoterisme"],
    [/film|média|cinéma|culture|série/, "medias"],
  ];
  const hit = rules.find(([pattern]) => pattern.test(text));
  return THEMES.find((theme) => theme.id === hit?.[1]) ?? THEMES[0];
}
