// BANC JETABLE (#27) : type CLICKbase, d'après CLICKbase Refined (Printables 1487592). Des
// lamelles dans la paroi des poches serrent le pied des bacs. Le banc taille ses propres lamelles
// dans la Normal du moteur (voie booléenne, enveloppes convexes), avec trois serrages, mesure les
// coupes, dessine la coupe au milieu d'un ergot, écrit les 3MF de la recette, puis vérifie que le
// moteur construit exactement la variante retenue. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/clickbase
import { mkdirSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, serialize3mf, type Baseplate, type BaseplateSettings, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
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
const HEIGHT = 4.6;
/** Paroi verticale de la poche hybride : 2,15 mm du bord de cellule, de z = 1,05 à 2,85. */
const WALL = CELL / 2 - 2.15;
/** Lamelle de 0,8 mm (2 lignes), fente de 0,5 mm derrière : cotes de CLICKbase Refined. */
const LAMELLA = 0.8;
const SLIT = 0.5;
/** Deux lamelles de 12 mm par côté, centrées à ±10,5 mm du milieu du côté. */
const LENGTH = 12;
const CENTRES = [-CELL / 4, CELL / 4];
/** Ergot : plat de 3 mm, rampes de 1,4 mm le long du côté ; plat jusqu'à z = 2,0, puis 45°. */
const ERGOT_HALF = 1.5;
const ERGOT_RAMP = 1.4;
const ERGOT_TOP = 2;
/** Base pleine sous la lamelle (1 couche), bas de la lamelle (pied de la paroi verticale, 1,05, arrondi à la couche). */
const BASE = roundUpToLayer(0.2, LAYER);
const BOTTOM = roundUpToLayer(1.05, LAYER);
/** Toile sous la lamelle : évidement de 0,4 mm côté poche, arête de 0,1 mm sous la lamelle. */
const RECESS = 0.4;
const WEB_TOP = 0.1;
const TOP = HEIGHT + 1;
/** Pied d'un bac standard : bande verticale à 18,6 mm du centre, de z = 0,8 à 2,6. */
const FOOT_BAND = 18.6;

/** Un serrage : la saillie de l'ergot dans la poche ; le serrage sur le pied est la saillie moins 0,25 mm. */
interface Variant {
  name: string;
  protrusion: number;
}
const VARIANTS: Variant[] = [
  { name: "serrage 0,15", protrusion: 0.4 },
  { name: "serrage 0,25 (Refined, retenu)", protrusion: 0.5 },
  { name: "serrage 0,35", protrusion: 0.6 },
];

const solidOf = (wasm: ManifoldToplevel, { positions, indices }: TriangleMesh) =>
  new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
const meshOfSolid = (solid: Manifold): TriangleMesh => {
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
};
const box = (wasm: ManifoldToplevel, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  wasm.Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);

/**
 * Les lamelles d'un côté +X d'une cellule centrée en 0 (x en travers du muret, y le long), par
 * des enveloppes convexes, indépendamment du moteur : ce qu'elles retirent (`cut`) et ce que
 * l'ergot ajoute dans la poche (`keep`). Le décalage de l'ergot est le plus petit de ses rampes :
 * d · min(le long, en hauteur), une pyramide tronquée.
 */
function lamellaSide(wasm: ManifoldToplevel, d: number): { cut: Manifold; keep: Manifold } {
  const cuts: Manifold[] = [];
  const keeps: Manifold[] = [];
  for (const c of CENTRES) {
    const [y0, y1] = [c - LENGTH / 2, c + LENGTH / 2];
    // La bosse de l'ergot sur le plan x = a, de z0 au haut de sa rampe : {a − d·min(...) ≤ x ≤ a},
    // prolongée de 0,2 mm derrière le plan, pour ne jamais s'y joindre par une face.
    const bump = (a: number, z0: number) =>
      wasm.Manifold.hull([
        ...[-1, 1].flatMap((s) => [
          [a + 0.2, c + s * (ERGOT_HALF + ERGOT_RAMP), z0],
          [a + 0.2, c + s * (ERGOT_HALF + ERGOT_RAMP), ERGOT_TOP + d],
          [a, c + s * (ERGOT_HALF + ERGOT_RAMP), z0],
          [a, c + s * (ERGOT_HALF + ERGOT_RAMP), ERGOT_TOP + d],
          [a - d, c + s * ERGOT_HALF, z0],
          [a - d, c + s * ERGOT_HALF, ERGOT_TOP],
        ]),
      ] as [number, number, number][]);
    // Au-delà du plan a déformé par l'ergot, entre z0 et z1, sur la longueur de la lamelle.
    const beyond = (a: number, z0: number, z1: number) =>
      wasm.Manifold.union([box(wasm, a, a + 3, y0, y1, z0, z1), bump(a, z0).intersect(box(wasm, a - 2, a + 3, y0, y1, z0, z1))]);
    // Fente derrière la lamelle, du bas de la lamelle au-dessus de la baseplate.
    cuts.push(beyond(WALL + LAMELLA, BOTTOM, TOP).subtract(beyond(WALL + LAMELLA + SLIT, BOTTOM, TOP)));
    // Sous la lamelle (z ≤ BOTTOM, ergot à plat en hauteur) : décalage d · (rampe le long) seul,
    // affine par tronçon : une enveloppe par tronçon, de la base au bas de la lamelle.
    const stations = [y0, c - ERGOT_HALF - ERGOT_RAMP, c - ERGOT_HALF, c + ERGOT_HALF, c + ERGOT_HALF + ERGOT_RAMP, y1];
    const shift = (y: number) => d * Math.min(1, Math.max(0, (ERGOT_HALF + ERGOT_RAMP - Math.abs(y - c)) / ERGOT_RAMP));
    for (let k = 0; k < stations.length - 1; k++) {
      const ends = [stations[k] as number, stations[k + 1] as number];
      // Évidement côté poche, jusqu'à la toile ; la fente de l'autre côté, qui amincit la toile.
      const recess = ends.flatMap((y) => [[WALL - 1.5, y, BASE], [WALL - 1.5, y, BOTTOM], [WALL + RECESS - shift(y), y, BASE], [WALL + RECESS - shift(y), y, BOTTOM]]);
      const slit = ends.flatMap((y) => [
        [WALL + LAMELLA - shift(y), y, BASE],
        [WALL + LAMELLA + SLIT - shift(y), y, BASE],
        [WALL + LAMELLA + SLIT - shift(y), y, BOTTOM],
        [WALL + RECESS + WEB_TOP - shift(y), y, BOTTOM],
      ]);
      cuts.push(wasm.Manifold.hull(recess as [number, number, number][]), wasm.Manifold.hull(slit as [number, number, number][]));
    }
    // Ce que l'ergot avance dans la poche, depuis la base (l'évidement en reprend le pied).
    keeps.push(bump(WALL, BASE));
  }
  return { cut: wasm.Manifold.union(cuts), keep: wasm.Manifold.union(keeps) };
}

/** Un quart de tour exact autour de z : (x, y) ← (−y, x). */
const quarter = (solid: Manifold) =>
  solid.warp((v) => {
    const [x, y] = [v[0], v[1]];
    v[0] = -y;
    v[1] = x;
  });

/** Le CLICKbase du banc : la Normal du moteur, plus les ergots, moins les fentes, sur les 4 côtés de chaque cellule. */
function clickbaseOf(wasm: ManifoldToplevel, normal: Baseplate, d: number): Manifold {
  const { columns, rows, cellSize, margins } = normal.layout;
  const { width, depth } = normal.stats.dimensions;
  const [x0, y0] = [-width / 2 + margins.left, -depth / 2 + margins.front];
  const side = lamellaSide(wasm, d);
  const turned = (solid: Manifold) => [solid, quarter(solid), quarter(quarter(solid)), quarter(quarter(quarter(solid)))];
  const [cuts, keeps] = [turned(side.cut), turned(side.keep)];
  const place = (solids: Manifold[]) => {
    const placed: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++) for (const solid of solids) placed.push(solid.translate([x0 + (i + 0.5) * cellSize, y0 + (j + 0.5) * cellSize, 0]));
    return wasm.Manifold.union(placed);
  };
  return solidOf(wasm, normal.mesh).add(place(keeps)).subtract(place(cuts));
}

const cells = (columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> => ({
  sizeMode: "cells",
  columns,
  rows,
  ...settings,
});

/** Tranches de matière le long de la droite x = c d'une coupe horizontale : [y0, y1]. */
function along(contours: [number, number][][], c: number): [number, number][] {
  const ys: number[] = [];
  for (const contour of contours)
    contour.forEach(([x0, y0], k) => {
      const [x1, y1] = contour[(k + 1) % contour.length] as [number, number];
      if ((x0 - c) * (x1 - c) < 0) ys.push(y0 + ((c - x0) * (y1 - y0)) / (x1 - x0));
    });
  ys.sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < ys.length; k += 2) out.push([ys[k] as number, ys[k + 1] as number]);
  return out;
}

/** Pied de bac Gridfinity standard (0,8 à 45°, 1,8 vertical, 2,15 à 45°), puis le corps. */
function footOf(wasm: ManifoldToplevel): Manifold {
  const layers: [number, number][] = [
    [0, 17.8],
    [0.8, FOOT_BAND],
    [2.6, FOOT_BAND],
    [4.75, 20.75],
    [7.75, 20.75],
  ];
  const { positions, indices } = loft(layers.map(([z, half]) => ({ z, points: roundedRect(2 * half, 2 * half, 3.75 - (20.75 - half), 32) })));
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

it("coupes : lamelle, fente, toile et ergot, contre CLICKbase Refined", async () => {
  const wasm = await loadManifold();
  const normal = await generateBaseplate(cells(2, 2), "final", { magnets: false, strategy: "boolean" });
  const bench = clickbaseOf(wasm, normal, 0.5);
  const heights = [0.1, 0.3, 0.7, 1.1, 1.5, 2.0, 2.2, 2.4, 3.0, 3.5, 4.0];
  const check = await checkMesh(meshOfSolid(bench), heights);
  expect(check.status).toBe("NoError");
  // Le côté +Y de la cellule (0, 0), centrée en (−21, −21) : distances depuis son centre.
  const row = (u: number) =>
    heights.map((z) => {
      const spans = along(check.sections.get(z) ?? [], -CELL / 2 + u + 1e-4)
        .map(([a, b]) => [a + CELL / 2, b + CELL / 2] as const)
        .filter(([a, b]) => b > 17 && a < CELL / 2 - 1e-6)
        .map(([a, b]) => `${fr(a)} → ${fr(Math.min(b, CELL / 2))}`);
      return `| ${fr(z)} | ${spans.join(" ; ")} |`;
    });
  lines.push(
    "## Coupes horizontales du banc (serrage 0,25, profil hybride)",
    "",
    "Matière le long d'une droite perpendiculaire au côté +Y d'une cellule, en mm depuis le centre de la cellule, jusqu'au milieu du muret (21,00). La paroi verticale de la poche est à 18,85 ; le pied d'un bac standard, à 18,60.",
    "",
    "### Hors de l'ergot (6 mm du milieu du côté)",
    "",
    "| z | Matière |",
    "|---|---|",
    ...row(6),
    "",
    "### Au milieu de l'ergot (10,5 mm du milieu du côté)",
    "",
    "| z | Matière |",
    "|---|---|",
    ...row(10.5),
    "",
    "### Au milieu du côté (0 mm) : rien n'est retiré, place pour un clip ou un numéro",
    "",
    "| z | Matière |",
    "|---|---|",
    ...row(0),
    "",
  );
  // Au milieu de l'ergot, la poche se resserre de la saillie : le pied du bac y entre en force.
  const ergotFace = along(check.sections.get(1.5) ?? [], -CELL / 2 + 10.5).find(([, b]) => b + CELL / 2 > 17);
  expect((ergotFace?.[0] ?? 0) + CELL / 2).toBeCloseTo(WALL - 0.5, 3);
  flush();
}, 120_000);

it("serrages : matière, et le pied d'un bac standard dans la poche", async () => {
  const wasm = await loadManifold();
  const normal = await generateBaseplate(cells(2, 2), "final", { magnets: false, strategy: "boolean" });
  const foot = footOf(wasm);
  const seated = foot.translate([CELL / 2, CELL / 2, 0]);
  const rows: string[] = [];
  const v0 = normal.stats.volume as number;
  const openOverlap = seated.intersect(solidOf(wasm, normal.mesh)).volume();
  for (const { name, protrusion } of VARIANTS) {
    const bench = clickbaseOf(wasm, normal, protrusion);
    expect(bench.status()).toBe("NoError");
    const section = (await checkMesh(meshOfSolid(bench), [1.5])).sections.get(1.5) ?? [];
    const face = (along(section, CELL / 2 + 10.5).find(([, b]) => b > CELL / 2 + 17 && b < CELL) ?? [0])[0] - CELL / 2;
    // Pied assis à z = 0 (comme dans la Normal) : ce que les ergots lui prennent.
    const overlap = seated.intersect(bench).volume() - openOverlap;
    rows.push(`| ${name} | ${fr(protrusion)} | ${fr(FOOT_BAND - face, 3)} | ${cm3(bench.volume())} (× ${fr(bench.volume() / v0)}) | ${fr(overlap, 1)} |`);
    expect(FOOT_BAND - face).toBeCloseTo(protrusion - 0.25, 3);
  }
  lines.push(
    "## Serrages (2 × 2 hybride sans aimant, 8 lamelles par cellule)",
    "",
    `Normal : ${cm3(v0)} cm³. Serrage mesuré = pied du bac (18,60) moins la face de l'ergot, sur la coupe à z = 1,5. Interférence = volume du pied assis à z = 0 qui entre dans les ergots d'une cellule (8 ergots).`,
    "",
    "| Variante | Saillie de l'ergot (mm) | Serrage mesuré (mm) | Matière | Interférence (mm³) |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 180_000);

/**
 * Coupe verticale du banc dans le plan y = c (au milieu des ergots des côtés ±X), autour du muret
 * entre deux cellules, en SVG : la baseplate, et le pied d'un bac standard assis, en pointillés.
 */
it("coupe au milieu d'un ergot (SVG)", async () => {
  const wasm = await loadManifold();
  const normal = await generateBaseplate(cells(2, 2), "final", { magnets: false, strategy: "boolean" });
  const bench = clickbaseOf(wasm, normal, 0.5);
  const scale = 40;
  const [x0, x1] = [-4.4, 4.4];
  const draw = (y: number, name: string, note: string) => {
    // (x, y, z) → (x, z, −y) : le plan y = constante devient horizontal.
    const turned = bench.warp((v) => {
      const [y0, z0] = [v[1], v[2]];
      v[1] = z0;
      v[2] = -y0;
    });
    const contours = turned.slice(-y).toPolygons() as [number, number][][];
    const px = (x: number) => ((x - x0) * scale).toFixed(1);
    const pz = (z: number) => ((HEIGHT + 0.3 - z) * scale).toFixed(1);
    const path = contours
      .map((contour) => `M${contour.map(([x, z]) => `${px(Math.max(x0, Math.min(x1, x)))},${pz(z)}`).join("L")}Z`)
      .join("");
    // Pied assis dans la cellule de gauche (centre en x = −21) et dans celle de droite.
    const footProfile = [
      [17.8, 0],
      [FOOT_BAND, 0.8],
      [FOOT_BAND, 2.6],
      [20.75, 4.75],
    ];
    const feet = [-1, 1]
      .map((s) => `M${footProfile.map(([r, z]) => `${px(s * (CELL / 2 - (r as number)))},${pz(z as number)}`).join("L")}`)
      .join("");
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(x1 - x0) * scale} ${(HEIGHT + 0.9) * scale}" font-family="sans-serif" font-size="10">`,
      `<rect width="100%" height="100%" fill="#fff"/>`,
      `<path d="${path}" fill="#c9d3dc" stroke="#334" stroke-width="1" fill-rule="evenodd"/>`,
      `<path d="${feet}" fill="none" stroke="#e8743b" stroke-width="1.5" stroke-dasharray="4 3"/>`,
      `<line x1="${px(0)}" y1="0" x2="${px(0)}" y2="${(HEIGHT + 0.9) * scale}" stroke="#888" stroke-dasharray="4 3"/>`,
      `<text x="4" y="14" fill="#334">${note}</text>`,
      `</svg>`,
    ].join("\n");
    writeFileSync(new URL(`files/${name}`, OUT), svg);
    return contours.length;
  };
  // Le muret entre les cellules (0, 0) et (1, 0) est en x = 0 ; leurs ergots des côtés ±X sont en y = −21 ± 10,5.
  expect(draw(-CELL / 2 + CELL / 4, "coupe-ergot-hybride.svg", "coupe verticale au milieu d'un ergot, profil hybride ; pied de bac standard en orange")).toBeGreaterThan(0);
  expect(draw(-CELL / 2 + 6, "coupe-lamelle-hybride.svg", "coupe verticale hors de l'ergot, profil hybride ; pied de bac standard en orange")).toBeGreaterThan(0);
  lines.push("## Coupes verticales", "", "- `files/coupe-ergot-hybride.svg` : au milieu d'un ergot, le muret entre deux cellules, et le pied d'un bac assis.", "- `files/coupe-lamelle-hybride.svg` : hors de l'ergot.", "");
  flush();
}, 120_000);

async function write3mf(file: string, mesh: TriangleMesh, note: string): Promise<string> {
  const bytes = serialize3mf([{ mesh, name: "baseplate" }], { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/clickbase/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const object of content.objects) statuses.add((await checkMesh(object.mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : relu ${[...statuses].join(", ")}. ${note}.`;
}

it("fichiers de la recette, et le moteur construit la variante retenue", async () => {
  const wasm = await loadManifold();
  const settings = cells(2, 2);
  const normal = await generateBaseplate(settings, "final", { strategy: "boolean" });
  const engine = await generateBaseplate({ ...settings, baseplateType: "clickbase" as never }, "final");
  const files: string[] = [];
  const bench = clickbaseOf(wasm, normal, 0.5);
  if (engine.stats.volume !== normal.stats.volume) {
    // Le moteur construit la variante retenue (serrage 0,25), par les briques : même solide.
    expect(engine.stats.volume as number).toBeCloseTo(bench.volume(), 1);
    files.push(
      await write3mf(
        "banc-2x2-clickbase.3mf",
        engine.mesh,
        `CLICKbase 2 × 2 du moteur (serrage 0,25, profil hybride) : ${fr(engine.stats.dimensions.height)} mm, ${engine.stats.magnets} aimant ; ${cm3(engine.stats.volume as number)} cm³ contre ${cm3(normal.stats.volume as number)} en Normal`,
      ),
    );
    const flushEngine = await generateBaseplate({ ...settings, pocketProfile: "flush", baseplateType: "clickbase" as never }, "final");
    files.push(
      await write3mf(
        "banc-2x2-clickbase-ras.3mf",
        flushEngine.mesh,
        `CLICKbase 2 × 2 du moteur en profil ras (4,25 mm, celui de Refined) : ${cm3(flushEngine.stats.volume as number)} cm³`,
      ),
    );
  }
  for (const { name, protrusion } of [VARIANTS[0], VARIANTS[2]] as Variant[]) {
    const file = `banc-2x2-clickbase-${name.replace(" ", "-").replace(",", "")}.3mf`;
    files.push(await write3mf(file, meshOfSolid(clickbaseOf(wasm, normal, protrusion)), `banc, ${name} (saillie de l'ergot ${fr(protrusion)} mm), 1 aimant`));
  }
  lines.push("## Fichiers (relus, `NoError`)", "", ...files, "");
  // Le tiroir par défaut, par le moteur : même volume que le banc.
  const drawer = await generateBaseplate({}, "final", { strategy: "boolean" });
  const drawerEngine = await generateBaseplate({ baseplateType: "clickbase" as never }, "final");
  const benchDrawer = clickbaseOf(wasm, drawer, 0.5).volume();
  expect(drawerEngine.stats.volume as number).toBeCloseTo(benchDrawer, 0);
  const plate = { buildPlate: { width: 256, depth: 256 } };
  const [cut, normalCut] = await Promise.all([generateBaseplate({ baseplateType: "clickbase" as never }, "final", plate), generateBaseplate({}, "final", plate)]);
  // Contre CLICKbase Refined, en profil ras comme lui, sans aimant (ses STL n'en ont pas) : 2 × 2 de
  // 84 × 84 × 4,25 mm, 4,268 cm³, relevé par refined.mjs.
  const flushBare = await generateBaseplate({ ...settings, pocketProfile: "flush", baseplateType: "clickbase" as never }, "final", { magnets: false });
  lines.push(
    "## Contre CLICKbase Refined",
    "",
    `- 2 × 2 en profil ras, sans aimant : moteur ${fr((flushBare.stats.volume as number) / 1000, 3)} cm³, ${fr(flushBare.stats.dimensions.width)} × ${fr(flushBare.stats.dimensions.depth)} × ${fr(flushBare.stats.dimensions.height)} mm ; Refined 4,268 cm³, 84,00 × 84,00 × 4,25 mm (\`refined.mjs\`).`,
    "",
  );
  lines.push(
    "## Le moteur (qualité finale, aimants compris)",
    "",
    `- 2 × 2 : Normal ${cm3(normal.stats.volume as number)} cm³, CLICKbase ${cm3(engine.stats.volume as number)} cm³, le banc ${cm3(bench.volume())} cm³.`,
    `- Tiroir par défaut : Normal ${cm3(drawer.stats.volume as number)} cm³, CLICKbase ${cm3(drawerEngine.stats.volume as number)} cm³ (× ${fr((drawerEngine.stats.volume as number) / (drawer.stats.volume as number))}), le banc ${cm3(benchDrawer)} cm³.`,
    `- Coupé pour un plateau de 256 mm (${cut.stats.pieces} pièces) : Normal ${cm3(normalCut.stats.volume as number)} cm³ et ${normalCut.stats.clips} clips, CLICKbase ${cm3(cut.stats.volume as number)} cm³ et ${cut.stats.clips} clips : les clips restent au milieu des côtés, entre les lamelles.`,
    "",
  );
  flush();
}, 240_000);

it("le milieu d'un côté reste plein pour un clip de 8 mm", async () => {
  const normal = await generateBaseplate(cells(2, 2), "final", { magnets: false, strategy: "boolean" });
  const wasm = await loadManifold();
  const check = await checkMesh(meshOfSolid(clickbaseOf(wasm, normal, 0.5)), [1.5]);
  const section = check.sections.get(1.5) ?? [];
  // Au milieu du côté +Y de la cellule (0, 0), la fente d'un clip (±1,35 autour de la coupe) ne rencontre aucune fente de lamelle sur ±4 mm.
  for (let u = -4; u <= 4; u += 0.25) expect(inSection(section, [-CELL / 2 + u, -1.2])).toBe(true);
  lines.push("## Clips", "", "- Au milieu de chaque côté, 9 mm restent pleins entre les deux lamelles (de −4,5 à +4,5 mm) : un clip de 8 mm au plus y tient, centré.", "");
  flush();
}, 60_000);
