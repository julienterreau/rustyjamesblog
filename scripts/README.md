# Scripts de migration

Les scripts lisent `.env` eux-mêmes. Ils ne modifient pas Neon.

```bash
npm run backup
npm run migrate:dry
```

`npm run backup` écrit un dossier horodaté dans `/backup` (ignoré par Git) : articles, images Payload, articles Payload, comptes sans mot de passe, abonné.

`npm run migrate:dry` lit la dernière sauvegarde et écrit `migration-report.md`. Il ne parle pas à Sanity.

La migration réelle (`npm run migrate -- --apply`) n'est pas lancée tant qu'elle n'a pas été validée. Elle envoie les documents par lots, avec `createOrReplace`, sans uploader d'images.
