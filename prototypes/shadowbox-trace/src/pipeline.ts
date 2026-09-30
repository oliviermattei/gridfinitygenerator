// PROTOTYPE JETABLE (#36) : chaîne classique photo -> contour en mm, partagée par la page et le banc.
// Feuille détectée, perspective redressée à PX_PER_MM, objet séparé du papier par sa distance de
// couleur, composante sous le clic, contour simplifié en mm. Rien ne quitte le navigateur.

// OpenCV.js n'a pas de types : on le manipule en `any`, c'est du code jetable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cv = any;
export type Point = [number, number];
/** Portrait : width <= height, en mm. */
export interface SheetSize {
  width: number;
  height: number;
}

export const SHEETS: Record<string, SheetSize> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};
/** 0,1 mm par pixel redressé, comme Tracefinity : bien sous la tolérance de ±0,5 mm. */
export const PX_PER_MM = 10;

/** Haut gauche, haut droit, bas droit, bas gauche. */
export function orderCorners(points: Point[]): Point[] {
  const bySum = [...points].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  const byDiff = [...points].sort((a, b) => a[0] - a[1] - (b[0] - b[1]));
  return [bySum[0], byDiff[3], bySum[3], byDiff[0]];
}

/** Droite des moindres carrés orthogonaux : un point et une direction unitaire. */
function fitLine(points: Point[]): { at: Point; dir: Point } {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
    syy += (y - my) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { at: [mx, my], dir: [Math.cos(angle), Math.sin(angle)] };
}

function intersect(a: { at: Point; dir: Point }, b: { at: Point; dir: Point }): Point {
  const det = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0];
  const t = ((b.at[0] - a.at[0]) * b.dir[1] - (b.at[1] - a.at[1]) * b.dir[0]) / det;
  return [a.at[0] + t * a.dir[0], a.at[1] + t * a.dir[1]];
}

/**
 * Coins de la feuille : plus grande zone claire (Otsu), quadrilatère de son enveloppe convexe,
 * puis chaque côté recalé par une droite ajustée sur les points du contour (sous-pixel, et
 * insensible à un objet qui mord sur un coin). Renvoie null si aucun quadrilatère n'est trouvé.
 */
export function detectSheet(cv: Cv, rgba: Cv): Point[] | null {
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    let best = -1;
    let bestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      if (area > bestArea) [best, bestArea] = [i, area];
    }
    if (best < 0 || bestArea < 0.05 * rgba.rows * rgba.cols) return null;
    const contour = contours.get(best);
    const hull = new cv.Mat();
    const quad = new cv.Mat();
    cv.convexHull(contour, hull, false, true);
    const perimeter = cv.arcLength(hull, true);
    let corners: Point[] | null = null;
    for (let k = 0.01; k <= 0.1 && !corners; k += 0.005) {
      cv.approxPolyDP(hull, quad, k * perimeter, true);
      if (quad.rows === 4) corners = [0, 1, 2, 3].map((i) => [quad.data32S[2 * i], quad.data32S[2 * i + 1]] as Point);
    }
    hull.delete();
    quad.delete();
    if (!corners) return null;
    corners = orderCorners(corners);

    // Recalage : points du contour proches de chaque côté, loin des coins.
    const points: Point[] = [];
    for (let i = 0; i < contour.rows; i++) points.push([contour.data32S[2 * i], contour.data32S[2 * i + 1]]);
    const tolerance = Math.max(3, 0.004 * perimeter);
    const lines = corners.map((a, i) => {
      const b = corners![(i + 1) % 4];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / length;
      const uy = (b[1] - a[1]) / length;
      const near = points.filter(([x, y]) => {
        const t = ((x - a[0]) * ux + (y - a[1]) * uy) / length;
        const d = Math.abs((x - a[0]) * uy - (y - a[1]) * ux);
        return t > 0.1 && t < 0.9 && d < tolerance;
      });
      return near.length > 20 ? fitLine(near) : { at: a, dir: [ux, uy] as Point };
    });
    return lines.map((line, i) => intersect(lines[(i + 3) % 4], line));
  } finally {
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  }
}

export interface Rectified {
  /** RGBA, la feuille à PX_PER_MM, bordée de `marginMm` de chaque côté. */
  mat: Cv;
  pxPerMm: number;
  marginMm: number;
  /** Côtés de la feuille dans l'image redressée, en mm (paysage si la photo l'est). */
  widthMm: number;
  heightMm: number;
  /** Centre de la photo ramené sur la feuille, en mm : là où la parallaxe est nulle. */
  opticalCenterMm: Point;
}

/** Redresse la photo : les coins de la feuille vont à ses cotes exactes, à `pxPerMm`. */
export function rectify(cv: Cv, rgba: Cv, corners: Point[], sheet: SheetSize, pxPerMm = PX_PER_MM, marginMm = 15): Rectified {
  const [tl, tr, , bl] = corners;
  const landscape = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) > Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  const widthMm = landscape ? sheet.height : sheet.width;
  const heightMm = landscape ? sheet.width : sheet.height;
  const m = marginMm * pxPerMm;
  const w = widthMm * pxPerMm;
  const h = heightMm * pxPerMm;
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flat());
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [m, m, m + w, m, m + w, m + h, m, m + h]);
  const transform = cv.getPerspectiveTransform(from, to);
  const mat = new cv.Mat();
  const size = new cv.Size(Math.round(w + 2 * m), Math.round(h + 2 * m));
  cv.warpPerspective(rgba, mat, transform, size, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 255));
  const t: Float64Array = transform.data64F;
  const [px, py] = [rgba.cols / 2, rgba.rows / 2];
  const wz = t[6] * px + t[7] * py + t[8];
  const center: Point = [(t[0] * px + t[1] * py + t[2]) / wz / pxPerMm - marginMm, (t[3] * px + t[4] * py + t[5]) / wz / pxPerMm - marginMm];
  from.delete();
  to.delete();
  transform.delete();
  return { mat, pxPerMm, marginMm, widthMm, heightMm, opticalCenterMm: center };
}

export const toPx = (r: Rectified, [x, y]: Point): Point => [(x + r.marginMm) * r.pxPerMm, (y + r.marginMm) * r.pxPerMm];
export const toMm = (r: Rectified, [u, v]: Point): Point => [u / r.pxPerMm - r.marginMm, v / r.pxPerMm - r.marginMm];

export interface ClassicalOptions {
  /** Seuil de distance au papier (0 à 255) ; null = Otsu puis bord à mi-hauteur. */
  threshold?: number | null;
  /** Ouverture morphologique (bruit), en mm. */
  openMm?: number;
  /** Fermeture morphologique (petits trous du bord), en mm. */
  closeMm?: number;
}

/** Un masque dans une fenêtre de l'image redressée. */
export interface Segmentation {
  /** CV_8U, 255 sur l'objet. */
  mask: Cv;
  /** Coin haut gauche de la fenêtre dans l'image redressée, en px. */
  offset: Point;
  threshold: number;
  paper: [number, number, number];
}

/** Résout A x = b (Gauss avec pivot partiel), A carrée n × n. */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

const cache = new WeakMap<Rectified, { distance: Uint8Array; paper: [number, number, number] }>();

/**
 * Image 8 bits de la distance de couleur au papier, nulle hors de la feuille. Le papier n'a pas
 * une couleur unique (dégradé d'éclairage, vignetage) : chaque canal est une surface quadratique
 * ajustée sur des points de la feuille tous les 3 mm, en écartant peu à peu ceux qui sont loin du
 * modèle (les objets). Calculée une fois par image redressée.
 */
export function paperDistance(r: Rectified, insetMm = 1.5): { distance: Uint8Array; paper: [number, number, number] } {
  const cached = cache.get(r);
  if (cached) return cached;
  const { mat, pxPerMm } = r;
  const [x0, y0] = toPx(r, [insetMm, insetMm]).map(Math.round);
  const [x1, y1] = toPx(r, [r.widthMm - insetMm, r.heightMm - insetMm]).map(Math.round);
  const data: Uint8Array = mat.data;
  const cols = mat.cols;
  const [cx, cy, sx, sy] = [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2];
  const basis = (x: number, y: number) => {
    const [u, v] = [(x - cx) / sx, (y - cy) / sy];
    return [1, u, v, u * u, u * v, v * v];
  };
  const samples: { f: number[]; c: number[] }[] = [];
  const step = Math.round(3 * pxPerMm);
  for (let y = y0; y < y1; y += step)
    for (let x = x0; x < x1; x += step) {
      const i = 4 * (y * cols + x);
      samples.push({ f: basis(x, y), c: [data[i], data[i + 1], data[i + 2]] });
    }
  let kept = samples;
  let coefficients: number[][] = [];
  for (let pass = 0; pass < 5; pass++) {
    coefficients = [0, 1, 2].map((k) => {
      const a = Array.from({ length: 6 }, () => new Array(6).fill(0));
      const b = new Array(6).fill(0);
      for (const { f, c } of kept)
        for (let i = 0; i < 6; i++) {
          b[i] += f[i] * c[k];
          for (let j = 0; j < 6; j++) a[i][j] += f[i] * f[j];
        }
      return solve(a, b);
    });
    const errors = samples.map(({ f, c }) => Math.hypot(...[0, 1, 2].map((k) => c[k] - coefficients[k].reduce((s, w, i) => s + w * f[i], 0))) / Math.sqrt(3));
    const sorted = [...errors].sort((a, b) => a - b);
    const limit = 3 * sorted[Math.floor(sorted.length / 2)] + 4;
    kept = samples.filter((_, i) => errors[i] < limit);
  }
  const distance = new Uint8Array(mat.rows * cols);
  for (let y = y0; y < y1; y++) {
    // Surface quadratique en u à v fixé : trois coefficients par canal pour la ligne.
    const v = (y - cy) / sy;
    const line = coefficients.map((w) => [w[0] + w[2] * v + w[5] * v * v, w[1] + w[4] * v, w[3]]);
    for (let x = x0; x < x1; x++) {
      const u = (x - cx) / sx;
      const i = y * cols + x;
      const dr = data[4 * i] - (line[0][0] + line[0][1] * u + line[0][2] * u * u);
      const dg = data[4 * i + 1] - (line[1][0] + line[1][1] * u + line[1][2] * u * u);
      const db = data[4 * i + 2] - (line[2][0] + line[2][1] * u + line[2][2] * u * u);
      distance[i] = Math.min(255, Math.sqrt((dr * dr + dg * dg + db * db) / 3));
    }
  }
  const paper = coefficients.map((w) => Math.round(w[0])) as [number, number, number];
  const result = { distance, paper };
  cache.set(r, result);
  return result;
}

function ellipse(cv: Cv, diameterPx: number): Cv {
  const size = Math.max(1, Math.round(diameterPx) | 1);
  return cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(size, size));
}

function morphology(cv: Cv, binary: Cv, pxPerMm: number, openMm: number, closeMm: number) {
  const open = ellipse(cv, openMm * pxPerMm);
  const close = ellipse(cv, closeMm * pxPerMm);
  cv.morphologyEx(binary, binary, cv.MORPH_OPEN, open);
  cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, close);
  open.delete();
  close.delete();
}

/** Étiquette de la composante sous `at` (px), ou de la plus proche à 5 mm ; 0 si aucune. */
function labelAt(labels: Cv, at: Point, pxPerMm: number): number {
  const { cols, rows } = labels;
  const label = (x: number, y: number) => (x >= 0 && y >= 0 && x < cols && y < rows ? labels.data32S[y * cols + x] : 0);
  const [cx, cy] = at.map(Math.round);
  let found = label(cx, cy);
  const radius = Math.round(5 * pxPerMm);
  for (let r = 1; !found && r <= radius; r++)
    for (let d = -r; d <= r && !found; d++)
      found = label(cx + d, cy - r) || label(cx + d, cy + r) || label(cx - r, cy + d) || label(cx + r, cy + d);
  return found;
}

/** Masque (même taille que `binary`) de la composante sous `at`, ou null. */
export function componentAt(cv: Cv, binary: Cv, at: Point, pxPerMm: number): Cv | null {
  const labels = new cv.Mat();
  cv.connectedComponents(binary, labels, 8, cv.CV_32S);
  const found = labelAt(labels, at, pxPerMm);
  let mask = null;
  if (found) {
    mask = new cv.Mat(labels.rows, labels.cols, cv.CV_8U);
    const out: Uint8Array = mask.data;
    for (let i = 0; i < out.length; i++) out[i] = labels.data32S[i] === found ? 255 : 0;
  }
  labels.delete();
  return mask;
}

interface Coarse {
  labels: Cv;
  stats: Cv;
  otsu: number;
}
const coarseCache = new WeakMap<Rectified, Map<string, Coarse>>();

/** Seuil sur toute la feuille et composantes : ne dépend pas du clic, calculé une fois par image et réglage. */
function coarse(cv: Cv, r: Rectified, threshold: number | null, openMm: number, closeMm: number): Coarse {
  const key = `${threshold}/${openMm}/${closeMm}`;
  const byKey = coarseCache.get(r) ?? new Map<string, Coarse>();
  coarseCache.set(r, byKey);
  const hit = byKey.get(key);
  if (hit) return hit;
  const { distance } = paperDistance(r);
  const src = cv.matFromArray(r.mat.rows, r.mat.cols, cv.CV_8U, distance);
  const binary = new cv.Mat();
  const otsu: number = cv.threshold(src, binary, threshold ?? 0, 255, threshold === null ? cv.THRESH_BINARY + cv.THRESH_OTSU : cv.THRESH_BINARY);
  morphology(cv, binary, r.pxPerMm, openMm, closeMm);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  cv.connectedComponentsWithStats(binary, labels, stats, centroids, 8, cv.CV_32S);
  [src, binary, centroids].forEach((m) => m.delete());
  const result = { labels, stats, otsu };
  byKey.set(key, result);
  return result;
}

/** Fenêtre [x, y, largeur, hauteur] autour d'une boîte, élargie de `padMm` et bornée à l'image. */
function windowAround(r: Rectified, [x, y, w, h]: number[], padMm: number): [number, number, number, number] {
  const pad = Math.round(padMm * r.pxPerMm);
  const x0 = Math.max(0, x - pad);
  const y0 = Math.max(0, y - pad);
  return [x0, y0, Math.min(r.mat.cols, x + w + pad) - x0, Math.min(r.mat.rows, y + h + pad) - y0];
}

/**
 * Masque final dans une fenêtre : les pixels de `around` dont la distance au papier dépasse la
 * mi-hauteur entre le papier (0) et le niveau de l'objet (médiane de `inner`), nettoyés, composante
 * sous le clic. Le seuil d'Otsu tombe sous la mi-hauteur et ferait gonfler l'objet.
 */
function halfAmplitude(
  cv: Cv,
  r: Rectified,
  [x0, y0, w, h]: number[],
  inner: Uint8Array,
  around: Uint8Array,
  clickPx: Point,
  floor: number,
): Segmentation | null {
  const { distance, paper } = paperDistance(r);
  const local = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) local.set(distance.subarray((y0 + y) * r.mat.cols + x0, (y0 + y) * r.mat.cols + x0 + w), y * w);
  const histogram = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < local.length; i++)
    if (inner[i]) {
      histogram[local[i]]++;
      count++;
    }
  let [seen, level] = [0, 255];
  for (let i = 0; i < 256; i++)
    if ((seen += histogram[i]) >= count / 2) {
      level = i;
      break;
    }
  const threshold = Math.max(floor, level / 2);
  const binary = new cv.Mat(h, w, cv.CV_8U);
  const out: Uint8Array = binary.data;
  for (let i = 0; i < out.length; i++) out[i] = around[i] && local[i] > threshold ? 255 : 0;
  morphology(cv, binary, r.pxPerMm, 0.3, 0.5);
  const mask = componentAt(cv, binary, [clickPx[0] - x0, clickPx[1] - y0], r.pxPerMm);
  binary.delete();
  return mask ? { mask, offset: [x0, y0], threshold: Math.round(threshold), paper } : null;
}

/** Intérieur (érodé) et zone élargie (dilatée) d'un masque, de `radiusPx`. */
function innerAndAround(cv: Cv, mask: Cv, radiusPx: number): { inner: Uint8Array; around: Uint8Array } {
  const kernel = ellipse(cv, 2 * radiusPx);
  const inner = new cv.Mat();
  const around = new cv.Mat();
  cv.erode(mask, inner, kernel);
  cv.dilate(mask, around, kernel);
  const eroded: Uint8Array = inner.data;
  const result = { inner: (eroded.some((v) => v) ? eroded : (mask.data as Uint8Array)).slice(), around: (around.data as Uint8Array).slice() };
  [kernel, inner, around].forEach((m) => m.delete());
  return result;
}

/** Chaîne classique : distance au papier, seuil d'Otsu, morphologie, composante sous le clic, bord à mi-hauteur. */
export function segmentClassical(cv: Cv, r: Rectified, clickMm: Point, options: ClassicalOptions = {}): Segmentation | null {
  const { openMm = 0.3, closeMm = 0.5 } = options;
  const manual = options.threshold ?? null;
  const { labels, stats, otsu } = coarse(cv, r, manual, openMm, closeMm);
  const clickPx = toPx(r, clickMm);
  const found = labelAt(labels, clickPx, r.pxPerMm);
  if (!found) return null;
  const box = [0, 1, 2, 3].map((k) => stats.data32S[found * stats.cols + k]);
  const win = windowAround(r, box, 3);
  const [x0, y0, w, h] = win;
  const mask = new cv.Mat(h, w, cv.CV_8U);
  const out: Uint8Array = mask.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = labels.data32S[(y0 + y) * labels.cols + x0 + x] === found ? 255 : 0;
  if (manual !== null) return { mask, offset: [x0, y0], threshold: manual, paper: paperDistance(r).paper };
  const { inner, around } = innerAndAround(cv, mask, r.pxPerMm);
  mask.delete();
  return halfAmplitude(cv, r, win, inner, around, clickPx, otsu);
}

/**
 * Recale à pleine résolution le bord d'un masque grossier (SAM) : dans une bande de `bandMm` autour
 * de son bord, bord à mi-hauteur comme la chaîne classique ; l'intérieur de la bande reste l'objet.
 */
export function refineEdge(cv: Cv, r: Rectified, rough: Segmentation, clickMm: Point, bandMm = 1.5): Segmentation | null {
  const { cols, rows } = rough.mask;
  const win = windowAround(r, [...rough.offset, cols, rows], bandMm + 1);
  const [x0, y0, w, h] = win;
  const mask = new cv.Mat(h, w, cv.CV_8U, new cv.Scalar(0));
  const out: Uint8Array = mask.data;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const [gx, gy] = [rough.offset[0] + x - x0, rough.offset[1] + y - y0];
      if (gx >= 0 && gy >= 0 && gx < w && gy < h) out[gy * w + gx] = rough.mask.data[y * cols + x];
    }
  const { inner, around } = innerAndAround(cv, mask, bandMm * r.pxPerMm);
  mask.delete();
  const result = halfAmplitude(cv, r, win, inner, around, toPx(r, clickMm), 4);
  if (result) {
    // L'intérieur de la bande reste l'objet, même s'il a des zones proches du papier (reflets).
    const { mask: refined, offset } = result;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (inner[y * w + x]) refined.data[(y + y0 - offset[1]) * refined.cols + x + x0 - offset[0]] = 255;
  }
  return result;
}

/**
 * Contours du masque en mm (extérieur et trous, repère de l'image : y vers le bas), simplifiés par
 * Douglas-Peucker à `toleranceMm`. Les trous de moins de `minHoleMm2` sont bouchés (reflets).
 */
export function maskToPolygons(cv: Cv, r: Rectified, segmentation: Segmentation, toleranceMm = 0.1, minHoleMm2 = 20): Point[][] {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(segmentation.mask, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
  const polygons: Point[][] = [];
  const approx = new cv.Mat();
  const [ox, oy] = segmentation.offset;
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const isHole = hierarchy.data32S[4 * i + 3] >= 0;
    const areaMm2 = cv.contourArea(contour) / r.pxPerMm ** 2;
    if (isHole ? areaMm2 < minHoleMm2 : areaMm2 < 1) continue;
    cv.approxPolyDP(contour, approx, toleranceMm * r.pxPerMm, true);
    const polygon: Point[] = [];
    for (let k = 0; k < approx.rows; k++) polygon.push(toMm(r, [approx.data32S[2 * k] + ox, approx.data32S[2 * k + 1] + oy]));
    if (polygon.length >= 3) polygons.push(polygon);
  }
  approx.delete();
  contours.delete();
  hierarchy.delete();
  return polygons;
}

/** Enveloppe convexe (chaîne monotone). */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Rectangle d'aire minimale (pieds à coulisse) : longueur >= largeur, en mm. */
export function minAreaRect(points: Point[]): { length: number; width: number; angle: number } {
  const hull = convexHull(points);
  let best = { length: 0, width: 0, angle: 0, area: Infinity };
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    let [minU, maxU, minV, maxV] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const [x, y] of hull) {
      const u = x * c + y * s;
      const v = -x * s + y * c;
      [minU, maxU, minV, maxV] = [Math.min(minU, u), Math.max(maxU, u), Math.min(minV, v), Math.max(maxV, v)];
    }
    const [du, dv] = [maxU - minU, maxV - minV];
    if (du * dv < best.area) best = { length: Math.max(du, dv), width: Math.min(du, dv), angle, area: du * dv };
  }
  return best;
}

/** Aire signée (shoelace), en mm². */
export function signedArea(polygon: Point[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}
