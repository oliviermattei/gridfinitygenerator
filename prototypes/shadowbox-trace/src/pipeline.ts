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
 * Coins de la feuille par sa clarté : plus grande zone claire (Otsu), quadrilatère de son enveloppe
 * convexe, puis chaque côté recalé par une droite ajustée sur les points du contour (sous-pixel, et
 * insensible à un objet qui mord sur un coin). Juste sur une table sombre ; faux dès qu'un reflet
 * de la table touche la feuille (la zone claire les englobe tous deux). Renvoie null sans quadrilatère.
 */
function detectSheetByBrightness(cv: Cv, rgba: Cv): Point[] | null {
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

/** Image de travail de la recherche de feuille : gris réduit et lissé, et son gradient (Sobel). */
interface Edges {
  width: number;
  height: number;
  /** Réduction par rapport à la photo. */
  scale: number;
  gray: Uint8Array;
  gx: Float32Array;
  gy: Float32Array;
}

/** Une droite de l'image de travail (un point, une direction unitaire) et ce qu'on voit le long d'elle. */
interface Line {
  at: Point;
  dir: Point;
  /** Abscisse (px le long de `dir`, depuis `at`) du premier échantillon ; un échantillon tous les `STEP` px. */
  from: number;
  /** Cumuls par échantillon : bords nets en travers, et parmi eux ceux dont le côté clair est à gauche de `dir`, ou à droite. */
  hits: Uint16Array;
  left: Uint16Array;
  right: Uint16Array;
}
const STEP = 2;

/** Abscisses (le long de `dir`, depuis `at`) où une droite entre dans l'image et en sort ; début après fin si elle la manque. */
function clip(at: Point, dir: Point, width: number, height: number): [number, number] {
  let [t0, t1] = [-Infinity, Infinity];
  for (const [p, u, max] of [[at[0], dir[0], width - 1], [at[1], dir[1], height - 1]]) {
    if (Math.abs(u) < 1e-9) {
      if (p < 0 || p > max) return [0, -1];
      continue;
    }
    const [a, b] = [-p / u, (max - p) / u];
    [t0, t1] = [Math.max(t0, Math.min(a, b)), Math.min(t1, Math.max(a, b))];
  }
  return [t0, t1];
}

/**
 * Ce qu'on voit le long d'une droite, d'un bord de l'image à l'autre : à chaque échantillon, y a-t-il
 * à 3 px près un bord net et perpendiculaire à la droite, et de quel côté est-il le plus clair
 * (6 px de part et d'autre). En cumuls, pour interroger n'importe quel tronçon en temps constant.
 */
function lineProfile({ width, height, gray, gx, gy }: Edges, at: Point, dir: Point): Line {
  const [ux, uy] = dir;
  const [nx, ny] = [-uy, ux];
  const [t0, t1] = clip(at, dir, width, height);
  const count = Math.max(0, Math.floor((t1 - t0) / STEP) + 1);
  const line: Line = { at, dir, from: t0, hits: new Uint16Array(count + 1), left: new Uint16Array(count + 1), right: new Uint16Array(count + 1) };
  const level = (x: number, y: number) => gray[Math.min(height - 1, Math.max(0, Math.round(y))) * width + Math.min(width - 1, Math.max(0, Math.round(x)))];
  for (let k = 0; k < count; k++) {
    const [px, py] = [at[0] + (t0 + k * STEP) * ux, at[1] + (t0 + k * STEP) * uy];
    let side = 0;
    for (let d = -3; d <= 3 && !side; d++) {
      const [x, y] = [Math.round(px + d * nx), Math.round(py + d * ny)];
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const [g0, g1] = [gx[y * width + x], gy[y * width + x]];
      const across = Math.abs(g0 * nx + g1 * ny);
      if (across < 20 || across < 0.7 * Math.hypot(g0, g1)) continue;
      const jump = level(px + (d + 6) * nx, py + (d + 6) * ny) - level(px + (d - 6) * nx, py + (d - 6) * ny);
      side = jump > 5 ? 1 : jump < -5 ? 2 : 3;
    }
    line.hits[k + 1] = line.hits[k] + (side ? 1 : 0);
    line.left[k + 1] = line.left[k] + (side === 1 ? 1 : 0);
    line.right[k + 1] = line.right[k] + (side === 2 ? 1 : 0);
  }
  return line;
}

/**
 * Qualité d'un côté de feuille, de 0 à 1 : le tronçon de droite entre les abscisses `s` et `e`, dont
 * l'intérieur de la feuille est à gauche (`inner` = 1) ou à droite (2) de la droite.
 * - `support` : part du tronçon posée sur un bord net (les 8 % de chaque bout ignorés : coins cornés) ;
 * - le papier est le côté clair : un bord dont le côté clair est dehors (bord d'ombre, d'objet) pèse moins ;
 * - un bord de feuille s'arrête aux coins : une droite qui se prolonge en bord net au-delà (bord de
 *   table, limite d'une ombre) pèse moins.
 */
function sideQuality(line: Line, s: number, e: number, inner: 1 | 2): { quality: number; support: number } {
  const [lo, hi] = [Math.min(s, e), Math.max(s, e)];
  const last = line.hits.length - 1;
  const index = (t: number) => Math.min(last, Math.max(0, Math.round((t - line.from) / STEP)));
  const sum = (cumul: Uint16Array, a: number, b: number) => cumul[index(b)] - cumul[index(a)];
  const length = hi - lo;
  const [a, b] = [lo + 0.08 * length, hi - 0.08 * length];
  const samples = Math.max(1, (b - a) / STEP);
  const hits = sum(line.hits, a, b);
  const support = Math.min(1, hits / samples);
  const paper = hits ? sum(inner === 1 ? line.left : line.right, a, b) / hits : 0;
  const beyond = [[lo - 0.16 * length, lo - 0.04 * length], [hi + 0.04 * length, hi + 0.16 * length]];
  const seen = beyond.reduce((n, [p, q]) => n + (index(q) - index(p)), 0);
  const carriesOn = seen ? beyond.reduce((n, [p, q]) => n + sum(line.hits, p, q), 0) / seen : 0;
  return { quality: support * (0.6 + 0.4 * paper) * (1 - 0.6 * carriesOn), support };
}

/** Aire d'un quadrilatère (shoelace, valeur absolue). */
const quadArea = (q: Point[]) => Math.abs(q.reduce((s, [x, y], i) => s + x * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * y, 0)) / 2;

/**
 * Vraisemblance que le quadrilatère formé par quatre droites (dans l'ordre du tour) soit la feuille,
 * de 0 à 1 environ : ses quatre côtés sont de bons côtés de feuille (moyenne géométrique : un seul
 * mauvais côté l'annule presque), son intérieur est clair et d'un seul ton (du papier, pas de la table
 * et du papier), son rapport de côtés est proche de A4 ou de Letter, et à qualité égale le plus grand gagne.
 */
function sheetScore(edges: Edges, lines: Line[]): { quad: Point[]; score: number; weakest: number } {
  const quad = lines.map((line, i) => intersect(lines[(i + 3) % 4], line));
  const centre: Point = [(quad[0][0] + quad[2][0]) / 2, (quad[0][1] + quad[2][1]) / 2];
  const sides = quad.map((a, i) => Math.hypot(quad[(i + 1) % 4][0] - a[0], quad[(i + 1) % 4][1] - a[1]));
  const shortest = Math.min(...sides);
  const level = (x: number, y: number) => edges.gray[Math.min(edges.height - 1, Math.max(0, Math.round(y))) * edges.width + Math.min(edges.width - 1, Math.max(0, Math.round(x)))];
  let [borders, weakest] = [1, 1];
  for (const [i, line] of lines.entries()) {
    const along = ([x, y]: Point) => (x - line.at[0]) * line.dir[0] + (y - line.at[1]) * line.dir[1];
    const inner = (centre[0] - line.at[0]) * -line.dir[1] + (centre[1] - line.at[1]) * line.dir[0] > 0 ? 1 : 2;
    const { quality, support } = sideQuality(line, along(quad[i]), along(quad[(i + 1) % 4]), inner);
    // Juste derrière un bord de feuille, c'est déjà du papier : même ton à 1,5 % qu'à 10 % de profondeur.
    // Sinon le côté est un bord d'autre chose (table, reflet), et la feuille commence plus loin.
    const [nx, ny] = inner === 1 ? [-line.dir[1], line.dir[0]] : [line.dir[1], -line.dir[0]];
    let paper = 0;
    for (let k = 0; k < 24; k++) {
      const t = 0.1 + (0.8 * k) / 23;
      const [x, y] = [quad[i][0] + t * (quad[(i + 1) % 4][0] - quad[i][0]), quad[i][1] + t * (quad[(i + 1) % 4][1] - quad[i][1])];
      const [rim, deep] = [0.015, 0.1].map((depth) => level(x + depth * shortest * nx, y + depth * shortest * ny));
      if (Math.abs(rim - deep) <= 25) paper++;
    }
    borders *= Math.max(quality * (0.25 + (0.75 * paper) / 24), 0.02);
    weakest = Math.min(weakest, support);
  }
  const levels: number[] = [];
  for (let i = 1; i < 8; i++)
    for (let j = 1; j < 8; j++) {
      const [u, v] = [i / 8, j / 8];
      const x = Math.round((1 - v) * ((1 - u) * quad[0][0] + u * quad[1][0]) + v * ((1 - u) * quad[3][0] + u * quad[2][0]));
      const y = Math.round((1 - v) * ((1 - u) * quad[0][1] + u * quad[1][1]) + v * ((1 - u) * quad[3][1] + u * quad[2][1]));
      if (x >= 0 && y >= 0 && x < edges.width && y < edges.height) levels.push(edges.gray[y * edges.width + x]);
    }
  levels.sort((a, b) => a - b);
  const median = levels[Math.floor(levels.length / 2)] ?? 0;
  const bright = 0.4 + 0.6 * (median / 255);
  const uniform = 0.4 + 0.6 * (levels.filter((level) => Math.abs(level - median) <= 35).length / Math.max(1, levels.length));
  const [p, q] = [(sides[0] + sides[2]) / 2, (sides[1] + sides[3]) / 2];
  const ratio = Math.max(p, q) / Math.min(p, q);
  const format = Math.exp(-((Math.min(...Object.values(SHEETS).map((s) => Math.abs(ratio - s.height / s.width))) / 0.25) ** 2));
  const size = (quadArea(quad) / (edges.width * edges.height)) ** 0.25;
  return { quad, score: borders ** 0.25 * bright * uniform * format * size, weakest };
}

/**
 * Les droites les plus marquées de l'image (Canny, puis transformée de Hough classique : chaque
 * droite est notée par le nombre de points de bord qu'elle porte, sans tirage au hasard), les
 * droites voisines étant réunies sous la mieux notée.
 */
function longLines(cv: Cv, edges: Edges, keep = 40): Line[] {
  const { width, height, gray } = edges;
  const src = cv.matFromArray(height, width, cv.CV_8U, gray);
  const canny = new cv.Mat();
  const found = new cv.Mat();
  const side = Math.max(width, height);
  cv.Canny(src, canny, 20, 60);
  cv.HoughLines(canny, found, 1, Math.PI / 180, Math.round(0.1 * side));
  const lines: Line[] = [];
  const near = 0.012 * side;
  for (let i = 0; i < found.rows && lines.length < keep; i++) {
    const [rho, theta] = [found.data32F[2 * i], found.data32F[2 * i + 1]];
    const at: Point = [rho * Math.cos(theta), rho * Math.sin(theta)];
    const dir: Point = [-Math.sin(theta), Math.cos(theta)];
    // Voisine d'une droite déjà gardée : presque parallèle, et à moins de `near` d'elle sur toute l'image.
    const off = (line: Line, [x, y]: Point) => (x - line.at[0]) * line.dir[1] - (y - line.at[1]) * line.dir[0];
    const [t0, t1] = clip(at, dir, width, height);
    const twin = lines.some((line) => Math.abs(line.dir[0] * dir[1] - line.dir[1] * dir[0]) < Math.sin((4 * Math.PI) / 180) && [t0, t1].every((t) => Math.abs(off(line, [at[0] + t * dir[0], at[1] + t * dir[1]])) < near));
    if (!twin) lines.push(lineProfile(edges, at, dir));
  }
  [src, canny, found].forEach((m) => m.delete());
  return lines;
}

/**
 * Le quadrilatère de droites marquées qui ressemble le plus à la feuille : deux droites à peu près
 * parallèles, deux autres à peu près perpendiculaires, coins dans l'image, au moins 8 % de sa surface.
 */
function bestQuad(edges: Edges, lines: Line[]): { quad: Point[]; score: number } | null {
  const sine = (a: Line, b: Line) => Math.abs(a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0]);
  const parallel: [Line, Line][] = [];
  for (const [i, a] of lines.entries()) for (const b of lines.slice(i + 1)) if (sine(a, b) < Math.sin((25 * Math.PI) / 180)) parallel.push([a, b]);
  const inside = ([x, y]: Point) => x > -0.1 * edges.width && y > -0.1 * edges.height && x < 1.1 * edges.width && y < 1.1 * edges.height;
  const twins = new Map(lines.map((line) => [line, lines.filter((other) => other !== line && sine(line, other) < Math.sin((6 * Math.PI) / 180))]));
  const off = (line: Line, [x, y]: Point) => Math.abs((x - line.at[0]) * line.dir[1] - (y - line.at[1]) * line.dir[0]);
  let best: { quad: Point[]; score: number } | null = null;
  for (const [i, [a, b]] of parallel.entries())
    for (const [c, d] of parallel.slice(i + 1)) {
      if (sine(a, c) < Math.sin((55 * Math.PI) / 180)) continue;
      const corners = [intersect(a, c), intersect(a, d), intersect(b, d), intersect(b, c)];
      if (!corners.every(inside) || quadArea(corners) < 0.08 * edges.width * edges.height) continue;
      const tour = [c, a, d, b];
      let { quad, score } = sheetScore(edges, tour);
      if (best && score <= best.score) continue;
      // Un autre bord net, parallèle à un côté et juste derrière lui sur toute sa longueur : ce côté est
      // le bord d'autre chose (la table), et la feuille commence à ce bord-là.
      for (const [k, side] of tour.entries()) {
        const [before, after, opposite] = [tour[(k + 3) % 4], tour[(k + 1) % 4], tour[(k + 2) % 4]];
        const behind = (twins.get(side) ?? []).some((twin) => {
          const [s, e] = [intersect(before, twin), intersect(twin, after)];
          const middle: Point = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
          const [depth, across] = [off(side, middle), off(side, middle) + off(opposite, middle)];
          const width = off(opposite, [(quad[k][0] + quad[(k + 1) % 4][0]) / 2, (quad[k][1] + quad[(k + 1) % 4][1]) / 2]);
          if (depth < 0.02 * width || depth > 0.2 * width || across > 1.02 * width) return false;
          const along = ([x, y]: Point) => (x - twin.at[0]) * twin.dir[0] + (y - twin.at[1]) * twin.dir[1];
          return sideQuality(twin, along(s), along(e), 1).support >= 0.4;
        });
        if (behind) score *= 0.6;
      }
      if (!best || score > best.score) best = { quad, score };
    }
  return best;
}

/**
 * Recale chaque côté d'un quadrilatère (px de la photo) sur le bord le plus net à `reach` px près,
 * à pleine résolution : le long du côté, position du plus fort saut de gris en travers, puis droite
 * ajustée sur ces positions en écartant celles qui s'en éloignent (objet, ombre, coin corné).
 */
function snapToEdges(gray: Cv, quad: Point[], reach: number): Point[] {
  const { cols, rows } = gray;
  const data: Uint8Array = gray.data;
  const lines = quad.map((a, i) => {
    const b = quad[(i + 1) % 4];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [ux, uy] = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    const [nx, ny] = [-uy, ux];
    // Gris moyenné sur 5 px le long du côté, à `d` px en travers ; NaN hors de la photo.
    const level = (px: number, py: number, d: number) => {
      let sum = 0;
      for (let k = -2; k <= 2; k++) {
        const [x, y] = [Math.round(px + d * nx + k * ux), Math.round(py + d * ny + k * uy)];
        if (x < 0 || y < 0 || x >= cols || y >= rows) return NaN;
        sum += data[y * cols + x];
      }
      return sum / 5;
    };
    const points: Point[] = [];
    for (let s = 0; s <= 80; s++) {
      const t = (0.1 + (0.8 * s) / 80) * length;
      const [px, py] = [a[0] + t * ux, a[1] + t * uy];
      let [bestD, bestJump] = [0, 0];
      for (let d = -reach; d <= reach; d++) {
        const jump = Math.abs(level(px, py, d + 1.5) - level(px, py, d - 1.5));
        if (jump > bestJump) [bestD, bestJump] = [d, jump];
      }
      if (bestJump >= 6) points.push([px + bestD * nx, py + bestD * ny]);
    }
    let kept = points;
    for (let pass = 0; pass < 3 && kept.length >= 12; pass++) {
      const line = fitLine(kept);
      const away = kept.map(([x, y]) => Math.abs((x - line.at[0]) * line.dir[1] - (y - line.at[1]) * line.dir[0]));
      const limit = Math.max(1.5, 2.5 * [...away].sort((p, q) => p - q)[Math.floor(away.length / 2)]);
      kept = kept.filter((_, k) => away[k] <= limit);
    }
    return kept.length >= 12 ? fitLine(kept) : { at: a, dir: [ux, uy] as Point };
  });
  return lines.map((line, i) => intersect(lines[(i + 3) % 4], line));
}

/**
 * Coins de la feuille. D'abord par sa clarté ; si ce quadrilatère n'a pas ses quatre côtés sur des
 * bords nets de la photo (reflet de la table collé à la feuille, table claire), on cherche la feuille
 * par ses bords : parmi les quadrilatères de droites longues, celui qui lui ressemble le plus, recalé
 * à pleine résolution. Renvoie null si rien ne ressemble à une feuille.
 */
export function detectSheet(cv: Cv, rgba: Cv): Point[] | null {
  const byBrightness = detectSheetByBrightness(cv, rgba);
  const full = new cv.Mat();
  const small = new cv.Mat();
  const [dx, dy] = [new cv.Mat(), new cv.Mat()];
  try {
    cv.cvtColor(rgba, full, cv.COLOR_RGBA2GRAY);
    const scale = Math.min(1, 1000 / Math.max(rgba.cols, rgba.rows));
    cv.resize(full, small, new cv.Size(Math.round(rgba.cols * scale), Math.round(rgba.rows * scale)), 0, 0, cv.INTER_AREA);
    cv.GaussianBlur(small, small, new cv.Size(5, 5), 0);
    cv.Sobel(small, dx, cv.CV_32F, 1, 0, 3);
    cv.Sobel(small, dy, cv.CV_32F, 0, 1, 3);
    const edges: Edges = { width: small.cols, height: small.rows, scale, gray: small.data, gx: dx.data32F, gy: dy.data32F };
    if (byBrightness) {
      const sides = byBrightness.map(([x, y], i) => {
        const [nx, ny] = byBrightness[(i + 1) % 4];
        const length = Math.hypot(nx - x, ny - y);
        return lineProfile(edges, [x * scale, y * scale], [(nx - x) / length, (ny - y) / length]);
      });
      if (sheetScore(edges, sides).weakest >= 0.5) return byBrightness;
    }
    const best = bestQuad(edges, longLines(cv, edges));
    if (!best || best.score < 0.2) return null;
    const reach = Math.round(0.006 * Math.max(rgba.cols, rgba.rows));
    const quad = best.quad.map(([x, y]) => [x / scale, y / scale] as Point);
    return orderCorners(snapToEdges(full, snapToEdges(full, quad, reach), Math.ceil(reach / 4)));
  } finally {
    [full, small, dx, dy].forEach((m) => m.delete());
  }
}

/**
 * Rapport grand côté / petit côté de la feuille. Quand ses deux paires de côtés fuient nettement
 * (photo penchée dans les deux sens), le vrai rapport se calcule malgré la perspective (Zhang et He,
 * « Whiteboard scanning and image enhancement », 2003 : pixels carrés, axe optique au centre de la
 * photo, d'où la focale puis le rapport). Sinon la focale n'est pas mesurable et on rend le rapport
 * des côtés du quadrilatère : juste de face, faussé de 1/cos de l'inclinaison si la photo penche
 * autour d'un seul axe de la feuille (4 % à 16°, assez pour confondre A4 et Letter au-delà de 20°).
 * `trusted` est faux dans ce dernier cas, quand la fuite de l'autre paire dépasse 10 %.
 */
export function sheetRatio(corners: Point[], width: number, height: number): { ratio: number; trusted: boolean } {
  const sides = corners.map((a, i) => Math.hypot(corners[(i + 1) % 4][0] - a[0], corners[(i + 1) % 4][1] - a[1]));
  const flatRatio = (sides[0] + sides[2]) / (sides[1] + sides[3]);
  const fold = (ratio: number) => Math.max(ratio, 1 / ratio);
  // Fuite d'une paire de côtés : écart relatif de leurs longueurs.
  const taper = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b);
  const tapers = [taper(sides[0], sides[2]), taper(sides[1], sides[3])];
  const flat = { ratio: fold(flatRatio), trusted: Math.max(...tapers) < 0.1 };
  if (Math.min(...tapers) < 0.03) return flat;
  const [m1, m2, m4, m3] = corners.map(([x, y]) => [x - width / 2, y - height / 2, 1]);
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
  const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]);
  const n3 = m3.map((v, i) => k3 * v - m1[i]);
  const focal2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]);
  // Focale hors de ce qu'un appareil photo peut avoir (0,4 à 5 fois le grand côté) : calcul instable.
  const focal = Math.sqrt(focal2) / Math.max(width, height);
  if (!(focal > 0.4 && focal < 5)) return flat;
  const size2 = (n: number[]) => (n[0] ** 2 + n[1] ** 2) / focal2 + n[2] ** 2;
  return { ratio: fold(Math.sqrt(size2(n2) / size2(n3))), trusted: true };
}

/** Le format de feuille dont le rapport de côtés est le plus proche, et l'écart relatif à ce rapport. */
export function guessSheet(ratio: number): { name: string; sheet: SheetSize; error: number } {
  const [name, sheet] = Object.entries(SHEETS).sort(([, a], [, b]) => Math.abs(ratio - a.height / a.width) - Math.abs(ratio - b.height / b.width))[0];
  return { name, sheet, error: ratio / (sheet.height / sheet.width) - 1 };
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

/** Oublie ce qui a été calculé pour cette image redressée (modèle du papier, seuil grossier) et en rend la mémoire. */
export function forget(r: Rectified) {
  cache.delete(r);
  for (const { labels, stats } of coarseCache.get(r)?.values() ?? []) [labels, stats].forEach((m) => m.delete());
  coarseCache.delete(r);
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
  openMm = 0.3,
  closeMm = 0.5,
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
  morphology(cv, binary, r.pxPerMm, openMm, closeMm);
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

/** Point le plus à l'intérieur d'un masque (maximum de la transformée de distance), en px du masque. */
export function interiorPoint(cv: Cv, mask: Cv): Point {
  const distance = new cv.Mat();
  cv.distanceTransform(mask, distance, cv.DIST_L2, 3);
  const { maxLoc } = cv.minMaxLoc(distance);
  distance.delete();
  return [maxLoc.x, maxLoc.y];
}

/**
 * Amorces de SAM : `count` points dans l'objet, en mm. Le premier est le plus intérieur ; les
 * suivants sont les plus éloignés des précédents, à 1 mm du bord au moins (ou à mi-épaisseur d'un
 * objet plus fin). Un seul point au cœur d'un manche ne dit pas à SAM que la tige en fait partie.
 */
export function seedsOf(cv: Cv, r: Rectified, { mask, offset }: Segmentation, count = 1): Point[] {
  const distance = new cv.Mat();
  cv.distanceTransform(mask, distance, cv.DIST_L2, 3);
  const { maxVal, maxLoc } = cv.minMaxLoc(distance);
  const depth: Float32Array = distance.data32F;
  const floor = Math.min(maxVal / 2, r.pxPerMm);
  const candidates: Point[] = [];
  for (let y = 0; y < mask.rows; y += 4) for (let x = 0; x < mask.cols; x += 4) if (depth[y * mask.cols + x] >= floor) candidates.push([x, y]);
  distance.delete();
  const picked: Point[] = [[maxLoc.x, maxLoc.y]];
  const nearest = candidates.map(() => Infinity);
  while (picked.length < count && candidates.length) {
    const [lx, ly] = picked[picked.length - 1];
    let far = 0;
    candidates.forEach(([x, y], k) => {
      nearest[k] = Math.min(nearest[k], Math.hypot(x - lx, y - ly));
      if (nearest[k] > nearest[far]) far = k;
    });
    if (nearest[far] < r.pxPerMm) break;
    picked.push(candidates[far]);
  }
  return picked.map(([x, y]) => toMm(r, [offset[0] + x, offset[1] + y]));
}

/** Composante `found` du seuil grossier, bord replacé à mi-hauteur ; `at` (px) = clic, sinon son point le plus intérieur. */
function segmentComponent(cv: Cv, r: Rectified, { labels, stats, otsu }: Coarse, found: number, options: ClassicalOptions, at: Point | null): Segmentation | null {
  const { openMm = 0.3, closeMm = 0.5 } = options;
  const manual = options.threshold ?? null;
  const box = [0, 1, 2, 3].map((k) => stats.data32S[found * stats.cols + k]);
  const win = windowAround(r, box, 3);
  const [x0, y0, w, h] = win;
  const mask = new cv.Mat(h, w, cv.CV_8U);
  const out: Uint8Array = mask.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = labels.data32S[(y0 + y) * labels.cols + x0 + x] === found ? 255 : 0;
  if (manual !== null) return { mask, offset: [x0, y0], threshold: manual, paper: paperDistance(r).paper };
  const inside = at ?? (([x, y]) => [x0 + x, y0 + y] as Point)(interiorPoint(cv, mask));
  const { inner, around } = innerAndAround(cv, mask, r.pxPerMm);
  mask.delete();
  return halfAmplitude(cv, r, win, inner, around, inside, otsu, openMm, closeMm);
}

/** Chaîne classique : distance au papier, seuil d'Otsu, morphologie, composante sous le clic, bord à mi-hauteur. */
export function segmentClassical(cv: Cv, r: Rectified, clickMm: Point, options: ClassicalOptions = {}): Segmentation | null {
  const found = coarse(cv, r, options.threshold ?? null, options.openMm ?? 0.3, options.closeMm ?? 0.5);
  const clickPx = toPx(r, clickMm);
  const label = labelAt(found.labels, clickPx, r.pxPerMm);
  return label ? segmentComponent(cv, r, found, label, options, clickPx) : null;
}

/** Chaîne classique sans clic : tous les objets de la feuille d'au moins `minAreaMm2`, de haut en bas. */
export function detectClassical(cv: Cv, r: Rectified, options: ClassicalOptions & { minAreaMm2?: number } = {}): Segmentation[] {
  const found = coarse(cv, r, options.threshold ?? null, options.openMm ?? 0.3, options.closeMm ?? 0.5);
  const minArea = (options.minAreaMm2 ?? 20) * r.pxPerMm ** 2;
  const objects: Segmentation[] = [];
  // Feuille vide : Otsu coupe quand même en deux, dans le bruit du papier (seuil de 1 ou 2 sur une
  // vraie photo, des dizaines de faux objets). Sous 8, il n'y a rien sur la feuille.
  if ((options.threshold ?? null) === null && found.otsu < 8) return objects;
  for (let label = 1; label < found.stats.rows; label++) {
    if (found.stats.data32S[label * found.stats.cols + cv.CC_STAT_AREA] < minArea) continue;
    const segmentation = segmentComponent(cv, r, found, label, options, null);
    if (segmentation) objects.push(segmentation);
  }
  return objects;
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
export function minAreaRect(points: Point[]): { length: number; width: number; angle: number; corners: Point[] } {
  const hull = convexHull(points);
  let best = { length: 0, width: 0, angle: 0, area: Infinity, corners: [] as Point[] };
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
    if (du * dv < best.area) {
      const corners = [[minU, minV], [maxU, minV], [maxU, maxV], [minU, maxV]].map(([u, v]) => [u * c - v * s, u * s + v * c] as Point);
      best = { length: Math.max(du, dv), width: Math.min(du, dv), angle, area: du * dv, corners };
    }
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
