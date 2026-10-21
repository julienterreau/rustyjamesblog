import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenu")
    .items([
      S.documentTypeListItem("article").title("Articles"),
      S.documentTypeListItem("category").title("Catégories"),
      S.documentTypeListItem("author").title("Auteurs"),
    ]);
