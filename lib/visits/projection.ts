import { geoPath, geoProjection, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { MAP_CENTER, MAP_CLIP, MAP_RADIUS } from "@/lib/visits/map-metrics";

function raw(lambda: number, phi: number): [number, number] {
  const rho = Math.PI / 2 - phi;
  return [rho * Math.sin(lambda), -rho * Math.cos(lambda)];
}

raw.invert = (x: number, y: number): [number, number] => {
  const rho = Math.hypot(x, y);
  return [Math.atan2(x, -y), Math.PI / 2 - rho];
};

let projection: GeoProjection | null = null;

/** Azimutale équidistante, pôle Nord au centre. 0° en bas, est à droite. */
export function flatProjection() {
  if (!projection) {
    projection = geoProjection(raw)
      .scale(MAP_RADIUS / Math.PI)
      .center([0, 90])
      .translate([MAP_CENTER, MAP_CENTER])
      .precision(0.3);
  }
  return projection;
}

export function projectCity(longitude: number, latitude: number): [number, number] | null {
  const point = flatProjection()([longitude, latitude]);
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  const dx = point[0] - MAP_CENTER;
  const dy = point[1] - MAP_CENTER;
  if (dx * dx + dy * dy > MAP_CLIP * MAP_CLIP) return null;
  return [point[0], point[1]];
}

export function landOutline(land: GeoPermissibleObjects) {
  return geoPath(flatProjection())(land) ?? "";
}
