// BANC JETABLE (#36) : la chaîne classique sur des photos de synthèse aux cotes connues.
// Répond à : le calcul (coins, redressement, seuil, contour, demi-pixel, poche) tient-il ±0,5 mm
// quand la photo est bonne, et où casse-t-il (inclinaison, contraste, éclairage) ?
// Pas de parallaxe ici (outils plats) : elle se mesure sur de vraies photos avec la page.
// Lancer depuis ce dossier, après `pnpm assets` : pnpm bench
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import Module from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import { beforeAll, expect, it } from "vitest";
import { detectSheet, maskToPolygons, minAreaRect, rectify, segmentClassical, type Cv, type Point } from "./src/pipeline";
import { measure, outlineOf, pocketBlock } from "./src/pocket";
import { block, encodePng, hexKey, photograph, place, renderBias, screwdriver, SHEET_LANDSCAPE, wrench, type Scene, type Tool } from "./src/synthetic";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines, ""].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",").replace(/^-(0,0+)$/, "$1");

let cv: Cv;
let wasm: ManifoldToplevel;
beforeAll(async () => {
  cv = createRequire(import.meta.url)("./public/vendor/opencv.js");
  if (cv instanceof Promise) cv = await cv;
  if (!cv.Mat) await new Promise((resolve) => (cv.onRuntimeInitialized = resolve));
  wasm = await Module();
  wasm.setup();
});

type Grabbed = Tool & { grab: Point };
const DARK: [number, number, number] = [55, 57, 62];
const tools = (color?: [number, number, number]): Grabbed[] => [
  { name: "clé à œil", rings: wrench(), at: [60, 60], rotate: 10, color: color ?? DARK, grab: [70, 0] },
  { name: "tournevis", rings: screwdriver(), at: [45, 150], rotate: -5, color: color ?? [170, 40, 35], grab: [40, 0] },
  { name: "bloc 60 × 40", rings: block(), at: [235, 60], rotate: 25, color: color ?? [45, 80, 170], grab: [0, 0] },
  { name: "clé Allen 4 mm", rings: hexKey(), at: [225, 150], rotate: 0, color: color ?? [30, 30, 32], grab: [30, 2] },
];
const base = { paper: [236, 234, 228], table: [48, 42, 38], distance: 500, blur: 1.2, noise: 3, gradient: 0.1, tilt: 0, roll: 0 } as const;
const CASES: { name: string; scene: Omit<Scene, "tools">; tools: Grabbed[] }[] = [
  { name: "De face, couleurs franches", scene: { ...base, paper: [...base.paper], table: [...base.table] }, tools: tools() },
  { name: "Inclinée de 20°", scene: { ...base, paper: [...base.paper], table: [...base.table], tilt: 20 }, tools: tools() },
  { name: "Inclinée de 30°, tournée de 10°, flou 2 px", scene: { ...base, paper: [...base.paper], table: [...base.table], tilt: 30, roll: 10, blur: 2 }, tools: tools() },
  { name: "Acier sur papier blanc, éclairage en dégradé de 30 %", scene: { ...base, paper: [...base.paper], table: [...base.table], tilt: 15, gradient: 0.3 }, tools: tools([165, 168, 172]) },
  { name: "Très faible contraste (gris 200 sur 236)", scene: { ...base, paper: [...base.paper], table: [...base.table], tilt: 10 }, tools: tools([200, 200, 200]) },
];

/** Points tous les `stepMm` le long des anneaux. */
function densify(rings: Point[][], stepMm = 0.2): Point[] {
  return rings.flatMap((ring) =>
    ring.flatMap((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / stepMm));
      return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as Point);
    }),
  );
}
function distanceToRings([x, y]: Point, rings: Point[][]): number {
  let best = Infinity;
  for (const ring of rings)
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[(i + 1) % ring.length];
      const [dx, dy] = [bx - ax, by - ay];
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  return best;
}
/** Écart entre deux bords : max et moyenne des distances dans les deux sens (Hausdorff). */
function edgeError(found: Point[][], truth: Point[][]): { max: number; mean: number } {
  const distances = [...densify(found).map((p) => distanceToRings(p, truth)), ...densify(truth).map((p) => distanceToRings(p, found))];
  return { max: Math.max(...distances), mean: distances.reduce((s, d) => s + d, 0) / distances.length };
}

it("trace les outils des photos de synthèse", () => {
  const bias = renderBias(cv);
  lines.push(
    "Photo de 4032 × 3024 px (12 MP), feuille A4 à 80 % de la largeur de face (≈ 10,9 px/mm), caméra à 50 cm, bruit σ = 3, redressement à 10 px/mm, seuil d'Otsu, Douglas-Peucker à 0,1 mm.",
    "",
    `Le rendu de synthèse (\`fillPoly\`) fait déborder chaque bord de ${fr(bias, 3)} mm : la vérité en tient compte, les écarts ne sont que ceux de la chaîne.`,
    "",
    "Écart du bord : distance entre le contour trouvé et le vrai, dans les deux sens (max / moyenne). Cotes : rectangle d'aire minimale, comme un pied à coulisse.",
    "",
  );
  const summary: string[] = [];
  for (const { name, scene, tools: list } of CASES) {
    const started = performance.now();
    const { photo, corners: truthCorners } = photograph(cv, { ...scene, tools: list });
    const rendered = performance.now();
    if (name.startsWith("Inclinée de 30°")) writeFileSync(new URL("files/synthetique-inclinee-30.png", OUT), encodePng(photo.cols, photo.rows, photo.data));
    const corners = detectSheet(cv, photo);
    expect(corners, name).not.toBeNull();
    const cornerError = Math.max(...corners!.map((c, i) => Math.hypot(c[0] - truthCorners[i][0], c[1] - truthCorners[i][1])));
    const detected = performance.now();
    const rectified = rectify(cv, photo, corners!, { width: SHEET_LANDSCAPE.height, height: SHEET_LANDSCAPE.width });
    const warped = performance.now();
    lines.push(`## ${name}`, "", `Coins de la feuille : écart max ${fr(cornerError)} px. Temps : rendu ${fr(rendered - started, 0)} ms, coins ${fr(detected - rendered, 0)} ms, redressement ${fr(warped - detected, 0)} ms.`, "");
    lines.push("| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const tool of list) {
      // Vérité telle que rendue : extérieur et trous débordent tous deux de `bias`.
      const [outer, ...holes] = place(tool).map((ring) => ring.map(([x, y]) => [x, -y] as Point));
      const grow = (ring: Point[]) => new wasm.CrossSection([ring], "EvenOdd").offset(bias, "Miter", 2);
      const truthSection = holes.reduce((section, hole) => section.subtract(grow(hole)), grow(outer));
      const truth = truthSection.toPolygons() as Point[][];
      const truthRect = minAreaRect(truth.flat());
      const truthArea = truthSection.area();
      const t0 = performance.now();
      const [gx, gy] = place({ ...tool, rings: [[tool.grab]] })[0][0];
      const segmentation = segmentClassical(cv, rectified, [gx, gy]);
      if (!segmentation) {
        lines.push(`| ${tool.name} | ${fr(truthRect.length)} | — | — | ${fr(truthRect.width)} | — | — | — | — | — | — | aucun objet sous le clic |`);
        summary.push(`${name} / ${tool.name} : rien`);
        continue;
      }
      const polygons = maskToPolygons(cv, rectified, segmentation);
      segmentation.mask.delete();
      const outline = outlineOf(wasm, polygons, 0.5 / rectified.pxPerMm);
      const found = measure(outline);
      const edge = edgeError(outline.toPolygons() as Point[][], truth);
      const elapsed = performance.now() - t0;
      const dl = found.length - truthRect.length;
      const dw = found.width - truthRect.width;
      lines.push(
        `| ${tool.name} | ${fr(truthRect.length)} | ${fr(found.length)} | ${fr(dl)} | ${fr(truthRect.width)} | ${fr(found.width)} | ${fr(dw)} | ${fr((100 * (found.area - truthArea)) / truthArea, 1)} % | ${fr(edge.max)} | ${fr(edge.mean, 3)} | ${segmentation.threshold} | ${fr(elapsed, 0)} ms |`,
      );
      summary.push(`${name} / ${tool.name} : L ${fr(dl)}, l ${fr(dw)}, bord max ${fr(edge.max)}`);
      outline.delete();
    }
    lines.push("");
    photo.delete();
    rectified.mat.delete();
    flush();
  }
  console.log(summary.join("\n"));
}, 600_000);

it("creuse la poche d'un contour avec manifold (volume exact)", () => {
  const outline = outlineOf(wasm, place({ name: "clé", rings: wrench(), at: [0, 0], rotate: 0, color: DARK }), 0);
  const options = { clearance: 0.5, wall: 3, depth: 2, floor: 0 };
  const plate = pocketBlock(wasm, outline, options);
  const pocket = outline.offset(options.clearance, "Round").simplify(1e-3);
  const { min, max } = pocket.bounds();
  const expected = ((max[0] - min[0] + 6) * (max[1] - min[1] + 6) - pocket.area()) * options.depth;
  expect(plate.status()).toBe("NoError");
  expect(plate.volume()).toBeCloseTo(expected, 3);
  lines.push(
    "## Poche (manifold-3d 3.5.4)",
    "",
    `Gabarit ajouré de la clé à œil (jeu 0,5 mm, paroi 3 mm, 2 mm d'épaisseur) : ${plate.status()}, ${fr(plate.volume() / 1000, 3)} cm³ pour ${fr(expected / 1000, 3)} cm³ attendus (aire du rectangle moins aire de la poche décalée, fois l'épaisseur). \`CrossSection\` + \`offset\` + \`extrude\` + \`subtract\` suffisent.`,
    "",
  );
  flush();
});
