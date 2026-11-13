/**
 * Met à jour la base GeoLite2 City (MaxMind).
 *
 * Prérequis : un compte MaxMind gratuit, la licence GeoLite2 acceptée,
 * et MAXMIND_LICENSE_KEY dans l'environnement.
 *
 *   node scripts/update-geolite.mjs
 *
 * Le fichier est écrit dans data/GeoLite2-City.mmdb (ou GEOIP_DB_PATH).
 * MaxMind demande de le renouveler au moins une fois par mois.
 *
 * Sur Coolify : lance cette commande dans le conteneur (ou au déploiement),
 * avec un volume persistant sur le dossier data/, puis
 * GEOIP_DB_PATH=/chemin/absolu/GeoLite2-City.mmdb.
 * Le serveur standalone ne voit pas un chemin relatif au dépôt.
 */
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const key = process.env.MAXMIND_LICENSE_KEY?.trim();

if (!key) {
  console.error("MAXMIND_LICENSE_KEY est absent. Crée une clé sur maxmind.com (GeoLite2).");
  process.exit(1);
}

const destination = process.env.GEOIP_DB_PATH
  ? path.resolve(process.env.GEOIP_DB_PATH)
  : path.join(process.cwd(), "data", "GeoLite2-City.mmdb");
const work = path.join(path.dirname(destination), ".geolite-tmp");
const archive = path.join(work, "GeoLite2-City.tar.gz");

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });

const url = new URL("https://download.maxmind.com/app/geoip_download");
url.searchParams.set("edition_id", "GeoLite2-City");
url.searchParams.set("license_key", key);
url.searchParams.set("suffix", "tar.gz");

console.log("Téléchargement de GeoLite2-City…");
const response = await fetch(url);
if (!response.ok || !response.body) {
  console.error(`Téléchargement refusé (${response.status}). Vérifie la clé et l'acceptation de la licence GeoLite2.`);
  process.exit(1);
}

await pipeline(response.body, createWriteStream(archive));
await exec("tar", ["-xzf", archive, "-C", work]);

const file = await findMmdb(work);
if (!file) {
  console.error("Aucune base .mmdb dans l'archive.");
  process.exit(1);
}

await mkdir(path.dirname(destination), { recursive: true });
await rename(file, destination);
await rm(work, { recursive: true, force: true });
console.log(`Base écrite : ${destination}`);

async function findMmdb(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findMmdb(full);
      if (nested) return nested;
    } else if (entry.name.endsWith(".mmdb")) {
      return full;
    }
  }
  return null;
}
