import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { Reader, type ReaderModel } from "@maxmind/geoip2-node";

export type Place = {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

let readerPromise: Promise<ReaderModel | null> | null = null;
let warned = false;

function databasePath() {
  const candidates = [
    process.env.GEOIP_DB_PATH,
    path.join(process.cwd(), "data", "GeoLite2-City.mmdb"),
    path.join(process.cwd(), "..", "data", "GeoLite2-City.mmdb"),
    path.join(process.cwd(), "..", "..", "data", "GeoLite2-City.mmdb"),
  ].filter((item): item is string => Boolean(item));
  return candidates.find((item) => existsSync(item)) ?? null;
}

function reader() {
  if (!readerPromise) {
    const file = databasePath();
    readerPromise = file
      ? Reader.open(file).catch(() => null)
      : Promise.resolve(null);
  }
  return readerPromise;
}

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn("GeoLite2 introuvable : les villes resteront vides tant que GEOIP_DB_PATH n'est pas servi. Lance node scripts/update-geolite.mjs.");
}

export async function locate(ip: string, cloudflareCountry: string | null): Promise<Place> {
  const place: Place = { country: cloudflareCountry, city: null, latitude: null, longitude: null };
  if (!ip || isLocal(ip)) {
    if (!databasePath()) warnOnce();
    return place;
  }

  const db = await reader();
  if (!db) {
    warnOnce();
    return place;
  }

  try {
    const hit = db.city(ip);
    const iso = hit.country?.isoCode?.toUpperCase() ?? null;
    if (!place.country && iso && /^[A-Z]{2}$/.test(iso)) place.country = iso;
    const city = hit.city?.names?.fr || hit.city?.names?.en || null;
    const latitude = hit.location?.latitude;
    const longitude = hit.location?.longitude;
    if (city) place.city = city;
    if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      place.latitude = latitude;
      place.longitude = longitude;
    }
  } catch {
    return place;
  }
  return place;
}

function isLocal(ip: string) {
  return ip === "::1" || ip === "0.0.0.0" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}
