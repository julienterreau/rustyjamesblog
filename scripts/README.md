# Scripts

La migration vers Sanity a été appliquée. Le site ne lit plus Neon.

```bash
npm run migrate:dry
```

`npm run migrate:dry` relit la dernière sauvegarde locale et réécrit `migration-report.md`. Il ne parle pas à Sanity.

`npm run migrate -- --apply` renvoie les documents déjà migrés avec `createOrReplace`. Il n'uploade pas les images.
