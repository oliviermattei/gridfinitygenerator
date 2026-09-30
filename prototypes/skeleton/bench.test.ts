// BANC JETABLE (#26) : type Skeleton, les murets entaillés entre les croisements. Quelle forme
// d'entaille, combien de matière, et que deviennent l'assise, les aimants, les vis et le numéro
// de pièce ? Le banc construit ses propres Skeleton en retirant des entailles à la Normal du
// moteur (voie booléenne), mesure, puis vérifie que le moteur construit exactement la variante
// retenue. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/skeleton
import { mkdirSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, serialize3mf, type Baseplate, type BaseplateSettings, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { labelDepth } from "../../packages/geometry/src/label";
import { roundUpToLayer } from "../../packages/geometry/src/print";
import { loft, roundedRect } from "../../packages/geometry/src/shapes";
import { checkMesh, inSection, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
/** Réécrit results.md avec ce que les tests ont mesuré jusqu'ici. */
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",").replace(/^-(0,0+)$/, "$1");
const cm3 = (mm3: number) => fr(mm3 / 1000);

const CELL = 42;
const LAYER = 0.2;
/** Bande basse : 0,35 mm (extrabold) arrondis à la couche supérieure, soit 2 couches à 0,2. */
const BAND = roundUpToLayer(0.35, LAYER);
/** Au-delà du plat du muret, l'entaille dépasse d'autant de chaque côté (dans les poches). */
const ACROSS = 2.85 + 1;
const OVERSHOOT = 1;

/**
 * Une forme d'entaille : la demi-longueur du poteau (son « bras », depuis l'axe du croisement,
 * le long du muret) en fonction de la hauteur, entre la bande et le haut de la baseplate.
 */
interface Notch {
  name: string;
  /** Bras du poteau à la hauteur z (z entre la bande et le haut). */
  arm(z: number, height: number): number;
}

/**
 * E : l'entaille d'extrabold telle quelle (types-de-baseplate.md) : prisme trapézoïdal de 19 mm
 * de base à z = 0,35 et 38 mm à z = 5 (cellule de 42) ; flancs à 26° de l'horizontale.
 */
const EXTRABOLD: Notch = {
  name: "E : extrabold (19 → 38 mm, flancs à 26°)",
  arm: (z) => CELL / 2 - (19 + ((38 - 19) * (z - 0.35)) / 4.65) / 2,
};
/**
 * P : le poteau garde en haut tout l'arc de coin de la poche (4 mm = rayon du haut de poche) et
 * 0,5 mm de côté droit, et s'élargit à 45° vers le bas, jusqu'à la bande. Avec un bras d'exactement
 * 4 mm, le flanc de l'entaille tournerait à la verticale pile sur le dessus de la baseplate, au
 * bout de l'arc : les briques du moteur y laissaient une arête pincée (4 faces sur une arête).
 */
const POST_45: Notch = { name: "P : bras de 5 mm en haut, flancs à 45°", arm: (z, height) => 5 + (height - z) };
/** V : un poteau droit, bras de 4 mm sur toute la hauteur (flancs verticaux). */
const POST_STRAIGHT: Notch = { name: "V : bras de 4 mm, flancs verticaux", arm: () => 4 };
const NOTCHES = [EXTRABOLD, POST_45, POST_STRAIGHT];

/**
 * L'entaille d'un muret vertical (le long de Y) centré en x = 0, au milieu d'un bord de cellule
 * en y = 0 : de la bande au-dessus de la baseplate, sur toute la largeur du muret et au-delà.
 * Au-dessus du haut, elle monte droite (les entailles voisines ne se touchent jamais).
 */
function notchTool(wasm: ManifoldToplevel, notch: Notch, height: number, cell = CELL): Manifold {
  const levels = [BAND, ...Array.from({ length: 8 }, (_, k) => BAND + ((height - BAND) * (k + 1)) / 8), height + OVERSHOOT];
  const half = (z: number) => cell / 2 - notch.arm(Math.min(z, height), height);
  const layers = levels.map((z) => ({ z, points: rectPoints(ACROSS, half(z)) }));
  const { positions, indices } = loft(layers);
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

function rectPoints(hx: number, hy: number): [number, number][] {
  return [
    [-hx, -hy],
    [hx, -hy],
    [hx, hy],
    [-hx, hy],
  ];
}

const solidOf = (wasm: ManifoldToplevel, { positions, indices }: TriangleMesh) =>
  new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));

/**
 * Le Skeleton du banc : la Normal du moteur, moins une entaille au milieu de chaque bord de
 * cellule entre deux cellules de la grille (`edges` : aussi sur le contour de la grille).
 */
function skeletonOf(wasm: ManifoldToplevel, normal: Baseplate, notch: Notch, edges = false): Manifold {
  const { columns, rows, cellSize, margins } = normal.layout;
  const { width, depth, height } = normal.stats.dimensions;
  const [x0, y0] = [-width / 2 + margins.left, -depth / 2 + margins.front];
  const tool = notchTool(wasm, notch, height, cellSize);
  const turned = tool.warp((v) => {
    // Muret le long de X : (x, y, z) ← (−y, x, z), un quart de tour exact.
    const [x, y] = [v[0], v[1]];
    v[0] = -y;
    v[1] = x;
  });
  const tools: Manifold[] = [];
  for (let a = edges ? 0 : 1; a <= (edges ? columns : columns - 1); a++)
    for (let j = 0; j < rows; j++) tools.push(tool.translate([x0 + a * cellSize, y0 + (j + 0.5) * cellSize, 0]));
  for (let b = edges ? 0 : 1; b <= (edges ? rows : rows - 1); b++)
    for (let i = 0; i < columns; i++) tools.push(turned.translate([x0 + (i + 0.5) * cellSize, y0 + b * cellSize, 0]));
  return solidOf(wasm, normal.mesh).subtract(wasm.Manifold.compose(tools));
}

const cells = (columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> => ({
  sizeMode: "cells",
  columns,
  rows,
  ...settings,
});

it("matière : les trois formes d'entaille contre la Normal", async () => {
  const wasm = await loadManifold();
  const cases: [string, Partial<BaseplateSettings>, boolean][] = [
    ["2 × 2 sans marge, sans aimant", cells(2, 2), false],
    ["4 × 4 sans marge, sans aimant", cells(4, 4), false],
    ["tiroir par défaut (cadre), aimants", {}, true],
  ];
  const rows: string[] = [];
  for (const [name, settings, magnets] of cases) {
    const normal = await generateBaseplate(settings, "final", { magnets, strategy: "boolean" });
    const v0 = normal.stats.volume as number;
    const cellsOf = NOTCHES.map((notch) => {
      const inner = skeletonOf(wasm, normal, notch).volume();
      const all = skeletonOf(wasm, normal, notch, true).volume();
      return `${cm3(inner)} (× ${fr(inner / v0)}) ; contour aussi : ${cm3(all)} (× ${fr(all / v0)})`;
    });
    rows.push(`| ${name} | ${cm3(v0)} | ${cellsOf.join(" | ")} |`);
  }
  lines.push(
    `## Matière (moteur en qualité finale, bande de ${fr(BAND)} mm)`,
    "",
    "Chaque case : murets intérieurs entaillés, contour de la grille entier (règle retenue) ; puis le contour aussi entaillé (comme extrabold). Extrabold mesure × 0,44 sur la 2 × 2 et la 4 × 4, marge comprise.",
    "",
    `| Cas | Normal (cm³) | ${NOTCHES.map((n) => n.name).join(" | ")} |`,
    "|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 180_000);

/** Pied de bac Gridfinity standard (spec : 0,8 à 45°, 1,8 vertical, 2,15 à 45°), puis le corps. */
function footOf(wasm: ManifoldToplevel): Manifold {
  const layers: [number, number][] = [
    [0, 17.8],
    [0.8, 18.6],
    [2.6, 18.6],
    [4.75, 20.75],
    [7.75, 20.75],
  ];
  const { positions, indices } = loft(layers.map(([z, half]) => ({ z, points: roundedRect(2 * half, 2 * half, 3.75 - (20.75 - half), 32) })));
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

const OVERLAP_MM3 = 1e-3;
const TOLERANCE_MM = 1e-4;
function bisect(lo: number, hi: number, free: (value: number) => boolean): number {
  expect(free(hi)).toBe(true);
  while (hi - lo > TOLERANCE_MM) {
    const mid = (lo + hi) / 2;
    if (free(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Où s'arrête un pied posé sur la cellule (+X, +Y) d'une 2 × 2, et son jeu en X et en diagonale. */
function seatOf(wasm: ManifoldToplevel, bench: Manifold) {
  const foot = footOf(wasm);
  const overlap = (dx: number, dy: number, z: number) => foot.translate([CELL / 2 + dx, CELL / 2 + dy, z]).intersect(bench).volume();
  const seat = bisect(-2, 3, (z) => overlap(0, 0, z) < OVERLAP_MM3);
  const play = (ux: number, uy: number) => Math.max(0, bisect(0, 2, (d) => overlap(-d * ux, -d * uy, seat + TOLERANCE_MM) >= OVERLAP_MM3) - TOLERANCE_MM);
  return { seat, playX: play(1, 0), playDiagonal: play(Math.SQRT1_2, Math.SQRT1_2) };
}

it("assise et guidage d'un bac standard", async () => {
  const wasm = await loadManifold();
  const normal = await generateBaseplate(cells(2, 2), "final", { magnets: false, strategy: "boolean" });
  const rows: string[] = [];
  const benches: [string, Manifold][] = [
    ["Normal", solidOf(wasm, normal.mesh)],
    ...NOTCHES.map((notch): [string, Manifold] => [notch.name, skeletonOf(wasm, normal, notch, true)]),
  ];
  for (const [name, bench] of benches) {
    const { seat, playX, playDiagonal } = seatOf(wasm, bench);
    rows.push(`| ${name} | ${fr(seat, 3)} | ${fr(playX, 3)} | ${fr(playDiagonal, 3)} |`);
    // Le Skeleton est un sous-ensemble de la Normal qui garde les coins : même assise, sans jeu.
    expect(seat).toBeCloseTo(0, 3);
    expect(playX).toBeLessThan(0.01);
  }
  lines.push(
    "## Assise d'un pied standard dans la cellule d'une 2 × 2 (tout entaillé, contour compris)",
    "",
    "| Variante | Dessous du pied (mm) | Jeu en X (mm) | Jeu en diagonale (mm) |",
    "|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 180_000);

/**
 * Bras du poteau mesuré sur une coupe : depuis le croisement (cx, cy), le long de +Y (muret
 * vertical), la matière s'arrête là où commence l'entaille ; `from` saute un trou au centre.
 */
function armAt(contours: [number, number][][], [cx, cy]: [number, number], from = 0): number {
  let y = from;
  while (y < CELL / 2 && !inSection(contours, [cx, cy + y])) y += 0.005;
  const start = y;
  while (y < CELL / 2 && inSection(contours, [cx, cy + y])) y += 0.005;
  return y - start > 0 ? y : 0;
}

it("poteaux, aimants, vis : coupes du banc", async () => {
  const wasm = await loadManifold();
  const heights = [0.2, BAND + 0.01, 1, 2.1, 2.9, 4.1, 4.55];
  const rows: string[] = [];
  const magnetsNormal = await generateBaseplate(cells(2, 2), "final", { strategy: "boolean" });
  const screwed = (head: number, gap: number) => generateBaseplate(cells(2, 2, { screws: true, screwHead: head, holeGap: gap }), "final", { strategy: "boolean" });
  const [screws6, screws8] = await Promise.all([screwed(6, 0.5), screwed(8, 1)]);
  // 2 × 2 : un seul croisement intérieur, au centre ; aimant sans vis, vis sinon.
  expect(magnetsNormal.stats.magnets).toBe(1);
  expect(screws6.stats.screws).toBe(1);
  for (const notch of NOTCHES) {
    const cut = async (normal: Baseplate) => {
      const solid = skeletonOf(wasm, normal, notch);
      const { vertProperties, triVerts } = solid.getMesh();
      return checkMesh({ positions: vertProperties, indices: triVerts }, heights);
    };
    const [magnet, screw6, screw8] = await Promise.all([cut(magnetsNormal), cut(screws6), cut(screws8)]);
    expect(magnet.status).toBe("NoError");
    // Sous le plafond du logement (2,20 mm), le bras commence au bord du trou.
    const arms = heights.map((z) => armAt(magnet.sections.get(z) ?? [], [0, 0], z < 2.2 ? 3.3 : 0));
    const screwArms = (check: typeof screw6) => [2.9, 4.1, 4.55].map((z) => fr(armAt(check.sections.get(z) ?? [], [0, 0], 0.01)));
    rows.push(`| ${notch.name} | ${arms.map((arm) => fr(arm)).join(" | ")} | ${screwArms(screw6).join(" / ")} | ${screwArms(screw8).join(" / ")} |`);
  }
  lines.push(
    "## Poteau du croisement central d'une 2 × 2 (bras mesuré le long du muret, depuis l'axe)",
    "",
    "Avec l'aimant (Ø 6,5, 2,20 de profondeur) : bout du bras à chaque hauteur ; la paroi le long du muret est le bras moins 3,25. Avec une vis (tête + jeu) : bout du bras au-dessus de l'assise (2,80), à z = 2,9 / 4,1 / 4,55 ; 0 quand l'alésage a tout mangé.",
    "",
    `| Variante | ${heights.map((z) => `z = ${fr(z)}`).join(" | ")} | vis 6 + 0,5 | vis 8 + 1 |`,
    `|---|${heights.map(() => "---").join("|")}|---|---|`,
    ...rows,
    "",
  );
  flush();
}, 240_000);

it("numéro de pièce : la gravure traverserait la bande", () => {
  const depth = labelDepth({ layerHeight: LAYER });
  expect(depth).toBeGreaterThanOrEqual(BAND);
  lines.push(
    "## Numéro de pièce",
    "",
    `- Gravure de ${fr(depth)} mm dans une bande de ${fr(BAND)} mm : elle la traverserait. Le bord de cellule qui porte le numéro garde son muret entier (ses deux moitiés).`,
    "",
  );
  flush();
});

async function write3mf(file: string, mesh: TriangleMesh, note: string): Promise<string> {
  const bytes = serialize3mf([{ mesh, name: "baseplate" }], { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/skeleton/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const object of content.objects) statuses.add((await checkMesh(object.mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : relu ${[...statuses].join(", ")}. ${note}.`;
}

const meshOfSolid = (solid: Manifold): TriangleMesh => {
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
};

it("fichiers de la recette, et le moteur construit la variante retenue", async () => {
  const wasm = await loadManifold();
  const settings = cells(2, 2);
  const normal = await generateBaseplate(settings, "final", { strategy: "boolean" });
  const bench = skeletonOf(wasm, normal, POST_45);
  const files: string[] = [];
  const skeleton = await generateBaseplate({ ...settings, baseplateType: "skeleton" as never }, "final");
  if (skeleton.stats.volume !== normal.stats.volume) {
    // Le moteur construit la variante P, contour de la grille entier, par les briques.
    expect(skeleton.stats.volume as number).toBeCloseTo(bench.volume(), 1);
    files.push(
      await write3mf(
        "banc-2x2-skeleton.3mf",
        skeleton.mesh,
        `Skeleton 2 × 2 du moteur (variante P, contour entier) : ${fr(skeleton.stats.dimensions.height)} mm, bande ${fr(BAND)} mm, ${skeleton.stats.magnets} aimant ; ${cm3(skeleton.stats.volume as number)} cm³ contre ${cm3(normal.stats.volume as number)} en Normal (× ${fr((skeleton.stats.volume as number) / (normal.stats.volume as number))})`,
      ),
    );
  }
  files.push(
    await write3mf(
      "banc-2x2-skeleton-tout-entaille.3mf",
      meshOfSolid(skeletonOf(wasm, normal, POST_45, true)),
      "variante P, contour de la grille entaillé aussi, pour comparer la tenue des bords et le guidage",
    ),
    await write3mf(
      "banc-2x2-skeleton-extrabold.3mf",
      meshOfSolid(skeletonOf(wasm, normal, EXTRABOLD, true)),
      "variante E (entaille d'extrabold, tout entaillé), pour comparer le guidage par les coins en haut",
    ),
  );
  lines.push("## Fichiers (relus, `NoError`)", "", ...files, "");
  // Le tiroir par défaut, par le moteur : même volume que le banc (variante P, contour entier).
  const drawer = await generateBaseplate({}, "final", { strategy: "boolean" });
  const engine = await generateBaseplate({ baseplateType: "skeleton" as never }, "final");
  const benchDrawer = skeletonOf(wasm, drawer, POST_45).volume();
  expect(engine.stats.volume as number).toBeCloseTo(benchDrawer, 0);
  const cut = await generateBaseplate({ baseplateType: "skeleton" as never }, "final", { buildPlate: { width: 256, depth: 256 } });
  const normalCut = await generateBaseplate({}, "final", { buildPlate: { width: 256, depth: 256 } });
  lines.push(
    "## Le moteur (qualité finale, aimants compris)",
    "",
    `- Tiroir par défaut : Normal ${cm3(drawer.stats.volume as number)} cm³, Skeleton ${cm3(engine.stats.volume as number)} cm³ (× ${fr((engine.stats.volume as number) / (drawer.stats.volume as number))}), le banc ${cm3(benchDrawer)} cm³.`,
    `- Coupé pour un plateau de 256 mm (${cut.stats.pieces} pièces, ${cut.stats.clips} clip) : Normal ${cm3(normalCut.stats.volume as number)} cm³, Skeleton ${cm3(cut.stats.volume as number)} cm³ (× ${fr((cut.stats.volume as number) / (normalCut.stats.volume as number))}) : chaque pièce garde entier le bord de cellule de son numéro, et les croisements coupés n'ont pas d'aimant.`,
    "",
  );
  flush();
}, 180_000);
