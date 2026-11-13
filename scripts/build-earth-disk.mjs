/**
 * Projette la Blue Marble (équirectangulaire) en disque azimutal,
 * pôle Nord au centre, et écrit public/earth-disk.webp.
 * Source : https://unpkg.com/three-globe@2.45.0/example/img/earth-blue-marble.jpg
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "https://unpkg.com/three-globe@2.45.0/example/img/earth-blue-marble.jpg";
const SIZE = 1520;
const CENTER = SIZE / 2;
const RADIUS = SIZE * (300 / 760);
const CLIP = RADIUS * 0.86;
const OUT = path.join(process.cwd(), "public", "earth-disk.webp");

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Téléchargement refusé (${response.status}).`);
const jpg = Buffer.from(await response.arrayBuffer());
const { data, info } = await sharp(jpg).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.alloc(SIZE * SIZE * 4);

function channel(x, y, offset) {
  const wrapped = ((x % width) + width) % width;
  const row = Math.max(0, Math.min(height - 1, y));
  return data[(row * width + wrapped) * channels + offset];
}

function sample(u, v) {
  const x = ((u % width) + width) % width;
  const y = Math.max(0, Math.min(height - 1.0001, v));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const pixel = [0, 0, 0];
  for (let offset = 0; offset < 3; offset += 1) {
    const a = channel(x0, y0, offset);
    const b = channel(x0 + 1, y0, offset);
    const c = channel(x0, y0 + 1, offset);
    const d = channel(x0 + 1, y0 + 1, offset);
    pixel[offset] = Math.round(a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty);
  }
  return pixel;
}

for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const dx = x + 0.5 - CENTER;
    const dy = y + 0.5 - CENTER;
    const rho = Math.hypot(dx, dy);
    if (rho > CLIP) continue;
    const latitude = 90 - (rho / RADIUS) * 180;
    const longitude = Math.atan2(dx, dy) * (180 / Math.PI);
    const u = ((longitude + 180) / 360) * width;
    const v = ((90 - latitude) / 180) * (height - 1);
    const [red, green, blue] = sample(u, v);
    const index = (y * SIZE + x) * 4;
    const edge = Math.min(1, (CLIP - rho) / 1.4);
    out[index] = red;
    out[index + 1] = green;
    out[index + 2] = blue;
    out[index + 3] = Math.round(255 * edge);
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(OUT);
console.log(`Disque écrit : ${OUT} (${width}×${height} source).`);
