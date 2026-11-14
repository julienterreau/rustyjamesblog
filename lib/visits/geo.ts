import "server-only";
import { clientIp, cloudflareCountry } from "@/lib/visits/classify";

export type Place = {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Diagnostic de la requête. L'adresse n'est pas enregistrée. */
export function logVisitDiagnostics(headers: Headers) {
  console.info(
    [
      "Visite diagnostic",
      `ip=${clientIp(headers) || "absente"}`,
      `cf-connecting-ip=${headers.has("cf-connecting-ip")}`,
      `x-forwarded-for=${headers.has("x-forwarded-for")}`,
      `x-real-ip=${headers.has("x-real-ip")}`,
      `cf-ipcity=${headers.has("cf-ipcity")}`,
      `cf-iplatitude=${headers.has("cf-iplatitude")}`,
      `cf-iplongitude=${headers.has("cf-iplongitude")}`,
      `cf-region=${headers.has("cf-region")}`,
    ].join(" "),
  );
}

export async function locate(headers: Headers): Promise<Place> {
  return cloudflarePlace(headers);
}

function cloudflarePlace(headers: Headers): Place {
  const latitude = readCoordinate(headers.get("cf-iplatitude"));
  const longitude = readCoordinate(headers.get("cf-iplongitude"));
  return {
    country: cloudflareCountry(headers),
    city: decodeHeader(headers.get("cf-ipcity")),
    latitude,
    longitude,
  };
}

function decodeHeader(value: string | null) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  try {
    const decoded = decodeURIComponent(text.replace(/\+/g, " ")).trim();
    return decoded || null;
  } catch {
    return text;
  }
}

function readCoordinate(value: string | null) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}
