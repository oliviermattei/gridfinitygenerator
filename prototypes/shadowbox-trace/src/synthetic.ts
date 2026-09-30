// PROTOTYPE JETABLE (#36) : photos de synthèse aux cotes connues, pour valider la chaîne sans
// pied à coulisse. Scène plane vue de dessus (table sombre, feuille A4 paysage, outils plats),
// photographiée par une caméra sténopé inclinée, puis floutée, bruitée et éclairée en dégradé.
// Pas de parallaxe (outils d'épaisseur nulle) : elle se mesure sur de vraies photos.
import { deflateSync } from "node:zlib";
import type { Cv, Point } from "./pipeline";

export interface Tool {
  name: string;
  /** Extérieur puis trous, dans le repère de l'outil, en mm. */
  rings: Point[][];
  /** Position dans le repère de la feuille (origine au coin haut gauche, y vers le bas) et rotation en degrés. */
  at: Point;
  rotate: number;
  color: [number, number, number];
}

const circle = (cx: number, cy: number, r: number, from = 0, to = 2 * Math.PI, n = 96): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const t = from + ((to - from) * i) / (from === 0 && to === 2 * Math.PI ? n : n - 1);
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as Point;
  });

/** Clé à œil : anneau de 30 mm (trou de 14) et manche de 130 × 16. */
export function wrench(): Point[][] {
  const a = Math.asin(8 / 15);
  return [[[15 * Math.cos(a), 8], [130, 8], [130, -8], [15 * Math.cos(a), -8], ...circle(0, 0, 15, -a, -2 * Math.PI + a)], circle(0, 0, 7)];
}
/** Tournevis : manche de 90 × 28, tige de 100 × 6. */
export const screwdriver = (): Point[][] => [[[0, -14], [90, -14], [90, -3], [190, -3], [190, 3], [90, 3], [90, 14], [0, 14]]];
export const block = (): Point[][] => [[[-30, -20], [30, -20], [30, 20], [-30, 20]]];
/** Clé Allen de 4 mm, 60 × 20. */
export const hexKey = (): Point[][] => [[[0, 0], [60, 0], [60, 4], [4, 4], [4, 20], [0, 20]]];

export function place(tool: Tool): Point[][] {
  const t = (tool.rotate * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  return tool.rings.map((ring) => ring.map(([x, y]) => [tool.at[0] + x * c - y * s, tool.at[1] + x * s + y * c] as Point));
}

export interface Scene {
  tools: Tool[];
  paper: [number, number, number];
  table: [number, number, number];
  /** Inclinaison de la caméra (autour de l'axe horizontal de l'image), en degrés. */
  tilt: number;
  /** Rotation de la caméra autour de son axe optique, en degrés. */
  roll: number;
  /** Distance de la caméra au centre de la feuille, en mm. */
  distance: number;
  blur: number;
  noise: number;
  /** Éclairage : facteur multiplicatif de `1 - gradient` (gauche) à 1 (droite). */
  gradient: number;
}

export const SHEET_LANDSCAPE = { width: 297, height: 210 };
const CANVAS = { width: 377, height: 290, origin: [40, 40] as Point }; // table autour de la feuille, en mm
const SCALE = 12; // px/mm du rendu de la scène avant la prise de vue
export const PHOTO = { width: 4032, height: 3024 };

/** Projette un point de la feuille (mm) dans la photo (px). */
export function camera(scene: Scene): (p: Point) => Point {
  const f = (0.8 * PHOTO.width * scene.distance) / SHEET_LANDSCAPE.width;
  const tilt = (scene.tilt * Math.PI) / 180;
  const roll = (scene.roll * Math.PI) / 180;
  return ([x, y]) => {
    // Repère centré sur la feuille ; la caméra tourne autour de l'axe x de la feuille.
    const X = x - SHEET_LANDSCAPE.width / 2;
    const Y = y - SHEET_LANDSCAPE.height / 2;
    const Yc = Y * Math.cos(tilt);
    const Zc = scene.distance + Y * Math.sin(tilt);
    const u = (f * X) / Zc;
    const v = (f * Yc) / Zc;
    const [c, s] = [Math.cos(roll), Math.sin(roll)];
    return [PHOTO.width / 2 + u * c - v * s, PHOTO.height / 2 + u * s + v * c];
  };
}

/** Rend la photo (RGBA) et renvoie aussi les coins vrais de la feuille dans la photo. */
export function photograph(cv: Cv, scene: Scene): { photo: Cv; corners: Point[] } {
  const canvas = new cv.Mat(CANVAS.height * SCALE, CANVAS.width * SCALE, cv.CV_8UC4, new cv.Scalar(...scene.table, 255));
  const px = ([x, y]: Point): Point => [(x + CANVAS.origin[0]) * SCALE, (y + CANVAS.origin[1]) * SCALE];
  const fill = (ring: Point[], color: [number, number, number]) => {
    const points = cv.matFromArray(ring.length, 1, cv.CV_32SC2, ring.flatMap((p) => px(p).map((v) => Math.round(v * 16))));
    const polygons = new cv.MatVector();
    polygons.push_back(points);
    cv.fillPoly(canvas, polygons, new cv.Scalar(...color, 255), cv.LINE_AA, 4); // coordonnées au 1/16 de pixel
    polygons.delete();
    points.delete();
  };
  const sheet: Point[] = [[0, 0], [SHEET_LANDSCAPE.width, 0], [SHEET_LANDSCAPE.width, SHEET_LANDSCAPE.height], [0, SHEET_LANDSCAPE.height]];
  fill(sheet, scene.paper);
  for (const tool of scene.tools) {
    const [outer, ...holes] = place(tool);
    fill(outer, tool.color);
    for (const hole of holes) fill(hole, scene.paper);
  }

  const project = camera(scene);
  const reference: Point[] = [[-CANVAS.origin[0], -CANVAS.origin[1]], [CANVAS.width - CANVAS.origin[0], -CANVAS.origin[1]], [CANVAS.width - CANVAS.origin[0], CANVAS.height - CANVAS.origin[1]], [-CANVAS.origin[0], CANVAS.height - CANVAS.origin[1]]];
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, reference.flatMap(px));
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, reference.flatMap(project));
  const transform = cv.getPerspectiveTransform(from, to);
  const photo = new cv.Mat();
  cv.warpPerspective(canvas, photo, transform, new cv.Size(PHOTO.width, PHOTO.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(...scene.table, 255));
  [canvas, from, to, transform].forEach((m) => m.delete());
  if (scene.blur > 0) cv.GaussianBlur(photo, photo, new cv.Size(0, 0), scene.blur);

  // Dégradé d'éclairage et bruit gaussien (générateur déterministe).
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
  const data: Uint8Array = photo.data;
  for (let y = 0; y < PHOTO.height; y++)
    for (let x = 0; x < PHOTO.width; x++) {
      const light = 1 - scene.gradient * (1 - x / PHOTO.width);
      const i = 4 * (y * PHOTO.width + x);
      const n = scene.noise * gauss();
      for (let k = 0; k < 3; k++) data[i + k] = Math.max(0, Math.min(255, data[i + k] * light + n));
    }
  return { photo, corners: sheet.map(project) };
}

/**
 * `fillPoly` remplit aussi les pixels que le bord touche : la forme rendue déborde d'une fraction
 * de pixel. Mesurée sur un grand rectangle tourné (aire rendue moins aire vraie, sur le périmètre),
 * en mm par côté à l'échelle du rendu ; le banc l'ajoute à la vérité pour ne compter que la chaîne.
 */
export function renderBias(cv: Cv): number {
  const canvas = new cv.Mat(1400, 1400, cv.CV_8U, new cv.Scalar(0));
  const t = (25 * Math.PI) / 180;
  const ring: Point[] = [[-40, -30], [40, -30], [40, 30], [-40, 30]].map(([x, y]) => [58 + x * Math.cos(t) - y * Math.sin(t), 58 + x * Math.sin(t) + y * Math.cos(t)]);
  const points = cv.matFromArray(4, 1, cv.CV_32SC2, ring.flatMap(([x, y]) => [Math.round(x * SCALE * 16), Math.round(y * SCALE * 16)]));
  const polygons = new cv.MatVector();
  polygons.push_back(points);
  cv.fillPoly(canvas, polygons, new cv.Scalar(255), cv.LINE_AA, 4);
  let covered = 0;
  for (const v of canvas.data as Uint8Array) covered += v / 255;
  [canvas, points, polygons].forEach((m) => m.delete());
  return (covered / SCALE ** 2 - 80 * 60) / 280;
}

/** PNG RGBA minimal, pour déposer une photo de synthèse et la recharger dans la page. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, "ascii");
    body.copy(out, 8);
    out.writeUInt32BE(crc(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((4 * width + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + 4 * width * y, 4 * width).copy(raw, (4 * width + 1) * y + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
