import "server-only";
import { feature } from "topojson-client";
import type { GeoPermissibleObjects } from "d3-geo";
import atlas from "world-atlas/land-110m.json";
import { landOutline } from "@/lib/visits/projection";

let outline: string | null = null;

export function flatLandPath() {
  if (outline) return outline;
  const topology = atlas as unknown as { objects: { land: unknown } };
  const geometry = feature(topology as never, topology.objects.land as never);
  const path = landOutline(geometry as GeoPermissibleObjects);
  outline = path;
  return path;
}
