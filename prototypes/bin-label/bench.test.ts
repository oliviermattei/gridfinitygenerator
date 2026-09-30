// BANC JETABLE : onglet d'étiquette, pelle qui englobe les coins, rebord normal ou réduit.
// (1) Quatre formes d'onglet dans un même bin 4 × 1 × 4 U, un compartiment par forme, pour un
//     essai de charge imprimé (Q8 bis du grilling du 2026-09-30) : A coin plein (moteur actuel),
//     B triangle creux (façon Chappel), C tablette nervurée (tablette, liseré, console au milieu de
//     la cellule, congé à la racine), D tablette sans console. Matière mesurée sur les maillages.
// (2) La pelle actuelle contre une pelle qui tourne dans ses deux coins (Q10).
// (3) Des bins 1 × 1 × 3 U à rebord normal et à rebord réduit, pour l'essai d'empilage (Q1).
// Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/bin-label
import { mkdirSync, writeFileSync } from "node:fs";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { binLayoutOf, clampBinSettings, generateBin, serialize3mf, serializeStl, type BinSettings, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { loft } from "../../packages/geometry/src/shapes";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
mkdirSync(new URL("tmp/", OUT), { recursive: true });
/** Un STL de travail, pour les rendus (tmp/, ignoré). */
const stl = (name: string, mesh: TriangleMesh) => writeFileSync(new URL(`tmp/${name}.stl`, OUT), serializeStl(mesh));
const sections: string[][] = [[], [], [], []];
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...sections.flat()].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");
const cm3 = (mm3: number) => fr(mm3 / 1000);

const QUARTER = 32;
/** Onglet : profondeur (hauteur de l'étiquette), épaisseurs, liseré, console, congé de racine. */
const TAB = { depth: 12, wedgeEdge: 1.2, shell: 1.2, shelf: 1.6, rim: { width: 0.8, height: 1.0 }, console: 1.2, root: 2 };

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

function meshOfSolid(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts, numProp } = solid.getMesh();
  expect(numProp).toBe(3);
  return { positions: vertProperties, indices: triVerts };
}

/** Un profil tracé dans le plan (y, z), extrudé le long de X de x0 à x1. */
function alongX(wasm: ManifoldToplevel, section: CrossSection, x0: number, x1: number): Manifold {
  return wasm.Manifold.extrude(section, x1 - x0).warp((v) => {
    const [y, z, x] = [v[0], v[1], v[2]];
    v[0] = x + x0;
    v[1] = y;
    v[2] = z;
  });
}

const polygon = (wasm: ManifoldToplevel, points: [number, number][]) => new wasm.CrossSection([points]);

/** Les compartiments d'un bin, [x0, x1, y0, y1] à l'intérieur, comme le moteur les pose. */
function compartmentsOf(settings: BinSettings) {
  const layout = binLayoutOf(settings);
  const x0 = -layout.width / 2 + layout.wall;
  const y0 = -layout.depth / 2 + layout.wall;
  const boxes: [number, number, number, number][] = [];
  for (let i = 0; i < settings.compartmentColumns; i++)
    for (let j = 0; j < settings.compartmentRows; j++) {
      const cx0 = x0 + i * (layout.compartment.width + layout.divider);
      const cy0 = y0 + j * (layout.compartment.depth + layout.divider);
      boxes.push([cx0, cx0 + layout.compartment.width, cy0, cy0 + layout.compartment.depth]);
    }
  return { layout, boxes };
}

type TabShape = "A" | "B" | "C" | "D";

/**
 * L'onglet d'une forme contre la paroi arrière (y1) d'un compartiment [x0, x1], son dessus à `top`.
 * Les consoles (C) vont au milieu de chaque cellule que le compartiment couvre, à plus de 5 mm
 * d'une paroi ou d'un séparateur.
 */
function tabOf(wasm: ManifoldToplevel, shape: TabShape, x0: number, x1: number, y1: number, top: number, cellCentres: number[]): Manifold {
  const d = TAB.depth;
  const wall = y1 + 1; // un peu dans la paroi, pour souder
  if (shape === "A") {
    const e = TAB.wedgeEdge;
    return alongX(wasm, polygon(wasm, [[wall, top - e - d], [wall, top], [y1 - d, top], [y1 - d, top - e], [y1, top - e - d]]), x0, x1);
  }
  if (shape === "B") {
    const e = TAB.wedgeEdge;
    const t = TAB.shell;
    const outer = polygon(wasm, [[wall, top - e - d], [wall, top], [y1 - d, top], [y1 - d, top - e], [y1, top - e - d]]);
    // Le vide fermé : le triangle sous la tablette, réduit de l'épaisseur de la coque (t sur la pente).
    const s = t * Math.SQRT2;
    const hollow = polygon(wasm, [[y1, top - t], [y1 - d + s, top - t], [y1, top - t - (d - s)]]);
    // Fermé aux deux bouts par une joue de t.
    const shell = alongX(wasm, outer, x0, x1);
    const cavity = alongX(wasm, hollow, x0 + t, x1 - t);
    return shell.subtract(cavity);
  }
  const s = TAB.shelf;
  const parts: Manifold[] = [];
  // La tablette, son liseré, et le congé de sa racine (45°).
  parts.push(alongX(wasm, polygon(wasm, [[wall, top - s], [wall, top], [y1 - d, top], [y1 - d, top - s]]), x0, x1));
  parts.push(alongX(wasm, polygon(wasm, [[y1 - d + TAB.rim.width, top], [y1 - d + TAB.rim.width, top + TAB.rim.height], [y1 - d, top + TAB.rim.height], [y1 - d, top]]), x0, x1));
  parts.push(alongX(wasm, polygon(wasm, [[wall, top - s - TAB.root], [wall, top - s + 0.01], [y1 - TAB.root, top - s + 0.01], [y1, top - s - TAB.root]]), x0, x1));
  if (shape === "C") {
    const depth = d - 1; // la console s'arrête 1 mm avant le bord de la tablette
    for (const cx of cellCentres) {
      if (cx - TAB.console / 2 < x0 + 5 || cx + TAB.console / 2 > x1 - 5) continue;
      parts.push(
        alongX(wasm, polygon(wasm, [[wall, top - s - depth], [wall, top - s + 0.01], [y1 - depth, top - s + 0.01], [y1, top - s - depth]]), cx - TAB.console / 2, cx + TAB.console / 2),
      );
    }
  }
  return wasm.Manifold.union(parts);
}

it("(1) quatre formes d'onglet, pour l'essai de charge", async () => {
  const wasm = await loadManifold();
  const shapes: TabShape[] = ["A", "B", "C", "D"];
  const settings = clampBinSettings({ columns: 4, rows: 1, units: 4, compartmentColumns: 4, fillet: true });
  const bare = await generateBin(settings, "final");
  const { layout, boxes } = compartmentsOf(settings);
  const cellCentres = [0, 1, 2, 3].map((i) => (i + 0.5) * settings.cellSize - (4 * settings.cellSize) / 2);
  // Le liseré ne dépasse pas le haut de l'espace utile (le pied d'un bin empilé passe au-dessus).
  const top = layout.usefulTop - TAB.rim.height;
  let solid = solidOf(wasm, bare.mesh);
  const rows: string[] = [];
  for (const [k, shape] of shapes.entries()) {
    const [x0, x1, , y1] = boxes[k] as [number, number, number, number];
    const room = wasm.Manifold.cube([x1 - x0, 2 * TAB.depth + 4, layout.usefulTop + 2]).translate([x0, y1 - 2 * TAB.depth - 2, 0]);
    const tab = tabOf(wasm, shape, x0, x1, y1, top, cellCentres).intersect(room);
    // Ce que l'onglet ajoute au bin, et la place qu'il prend au compartiment (volume sous et dans l'onglet).
    const added = solid.add(tab).volume() - solid.volume();
    const under = wasm.Manifold.cube([x1 - x0, TAB.depth, TAB.depth + 3]).translate([x0, y1 - TAB.depth, top - TAB.depth - 3]);
    const blocked = shape === "A" || shape === "B" ? tab.intersect(under).volume() + (shape === "B" ? (x1 - x0 - 2 * TAB.shell) * ((TAB.depth - TAB.shell * Math.SQRT2) ** 2 / 2) : 0) : tab.intersect(under).volume();
    solid = solid.add(tab);
    rows.push(`| ${shape} | ${fr(x1 - x0, 1)} | ${cm3(added)} | ${cm3(blocked)} |`);
  }
  const mesh = meshOfSolid(solid);
  sections[0] = [
    "## (1) Onglets d'étiquette : matière et place prise",
    "",
    `Bin 4 × 1 × 4 U du moteur, 4 compartiments, congé ; un onglet par compartiment contre la paroi arrière, profondeur ${fr(TAB.depth, 0)} mm, dessus à ${fr(top, 2)} mm (sous le liseré, le haut de l'espace utile). « Matière » : ce que l'onglet ajoute au maillage. « Place prise » : le volume, sous la tablette, où le contenu ne passe plus (matière, ou vide fermé pour B).`,
    "",
    "- **A** coin plein (le moteur aujourd'hui) : tablette, dessous plein à 45°.",
    `- **B** triangle creux (façon Chappel) : coque de ${fr(TAB.shell, 1)} mm, pente à 45°, fermée aux deux bouts.`,
    `- **C** tablette nervurée : tablette de ${fr(TAB.shelf, 1)} mm, liseré de ${fr(TAB.rim.width, 1)} × ${fr(TAB.rim.height, 1)} mm, congé de racine de ${fr(TAB.root, 0)} mm, une console de ${fr(TAB.console, 1)} mm à 45° au milieu de la cellule.`,
    "- **D** la même tablette, sans console : pour savoir si la console sert.",
    "",
    "| Forme | Largeur (mm) | Matière (cm³) | Place prise (cm³) |",
    "|---|---|---|---|",
    ...rows,
    "",
  ];
  const bytes = serialize3mf([{ mesh, name: "bin onglets A B C D" }], { name: "bin-onglets-ABCD", shareLink: "prototypes/bin-label/bench.test.ts : onglets A, B, C, D de gauche à droite" });
  writeFileSync(new URL("files/bin-onglets-ABCD.3mf", OUT), bytes);
  stl("onglets", mesh);
  for (const object of readThreeMf(bytes).objects) expect((await checkMesh(object.mesh)).status).toBe("NoError");
  flush();
}, 300_000);

/**
 * Rectangle arrondi, ses quatre côtés à part [xg, xd, ya, yr] et un rayon par coin (avant gauche,
 * avant droit, arrière droit, arrière gauche), toujours le même nombre de points : pour un loft.
 */
function rect4(xg: number, xd: number, ya: number, yr: number, radii: [number, number, number, number]): [number, number][] {
  const r = radii.map((value) => Math.max(0.01, value));
  const corners: [number, number, number][] = [
    [xd - (r[1] as number), ya + (r[1] as number), -Math.PI / 2],
    [xd - (r[2] as number), yr - (r[2] as number), 0],
    [xg + (r[3] as number), yr - (r[3] as number), Math.PI / 2],
    [xg + (r[0] as number), ya + (r[0] as number), Math.PI],
  ];
  const radiusOf = [r[1], r[2], r[3], r[0]] as number[];
  const points: [number, number][] = [];
  corners.forEach(([cx, cy, start], k) => {
    for (let s = 0; s <= QUARTER; s++) {
      const a = start + (s / QUARTER) * (Math.PI / 2);
      points.push([cx + (radiusOf[k] as number) * Math.cos(a), cy + (radiusOf[k] as number) * Math.sin(a)]);
    }
  });
  return points;
}

/** Retrait d'une paroi à la hauteur h au-dessus du fond, pour un arrondi de rayon r. */
const inset = (r: number, h: number) => (h >= r ? 0 : r - Math.sqrt(r * r - (r - h) * (r - h)));

it("(2) la pelle qui tourne dans ses coins", async () => {
  const wasm = await loadManifold();
  const base: Partial<BinSettings> = { columns: 2, rows: 1, units: 3, compartmentColumns: 2 };
  const current = await generateBin({ ...base, fillet: true, scoop: true }, "final");
  // Le bin sans congé ni pelle, dont on comble chaque compartiment jusqu'au nouveau fond.
  const settings = clampBinSettings({ ...base, fillet: false });
  const plain = solidOf(wasm, (await generateBin(settings, "final")).mesh);
  const { layout, boxes } = compartmentsOf(settings);
  const [fillet, scoop] = [5, Math.min(12, layout.usefulTop - layout.floor - 1)];
  const heights = [...new Set([...Array.from({ length: 17 }, (_, k) => (scoop * k) / 16), ...Array.from({ length: 9 }, (_, k) => (fillet * k) / 8)])].sort((a, b) => a - b);
  let solid = plain;
  for (const [x0, x1, y0, y1] of boxes) {
    const layers = heights.map((h) => {
      const front = inset(scoop, h);
      const other = inset(fillet, h);
      // Coins avant : le rayon vertical du congé, élargi de l'avance de la pelle sur les côtés.
      const frontCorner = fillet + Math.max(0, front - other);
      return { z: layout.floor + h, points: rect4(x0 + other, x1 - other, y0 + front, y1 - other, [frontCorner, frontCorner, fillet - other, fillet - other]) };
    });
    layers.push({ z: layout.usefulTop + 1, points: rect4(x0, x1, y0, y1, [fillet, fillet, fillet, fillet]) });
    const { positions, indices } = loft(layers);
    const cavity = new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
    const block = wasm.Manifold.cube([x1 - x0, y1 - y0, layout.usefulTop - layout.floor]).translate([x0, y0, layout.floor]);
    solid = solid.add(block.subtract(cavity));
  }
  const wrapped = meshOfSolid(solid);
  const volume = (mesh: TriangleMesh) => solidOf(wasm, mesh).volume();
  sections[1] = [
    "## (2) Pelle actuelle ou pelle qui tourne dans ses coins",
    "",
    `Bin 2 × 1 × 3 U, 2 compartiments. Pelle de ${fr(scoop, 1)} mm sur le côté avant ; congé de ${fr(fillet, 0)} mm ailleurs. La pelle qui tourne dans ses coins : à chaque hauteur, le fond recule de l'arrondi de la pelle à l'avant, de celui du congé ailleurs, et les deux coins avant s'élargissent de l'écart, jusqu'à retrouver le coin du congé en haut de la pelle.`,
    "",
    "| Pelle | Matière (cm³) |",
    "|---|---|",
    `| actuelle (rampe, coins au congé) | ${cm3(volume(current.mesh))} |`,
    `| qui tourne dans ses coins | ${cm3(volume(wrapped))} |`,
    "",
  ];
  for (const [file, mesh, name] of [
    ["pelle-actuelle.3mf", current.mesh, "pelle actuelle"],
    ["pelle-dans-les-coins.3mf", wrapped, "pelle dans les coins"],
  ] as const) {
    const bytes = serialize3mf([{ mesh, name }], { name, shareLink: `prototypes/bin-label/bench.test.ts : ${name}` });
    writeFileSync(new URL(`files/${file}`, OUT), bytes);
    stl(file.replace(".3mf", ""), mesh);
    for (const object of readThreeMf(bytes).objects) expect((await checkMesh(object.mesh)).status).toBe("NoError");
  }
  flush();
}, 300_000);

it("(3) rebord normal et réduit, pour l'essai d'empilage", async () => {
  const rows: string[] = [];
  for (const lip of ["normal", "reduced"] as const) {
    const bin = await generateBin({ columns: 1, rows: 1, units: 3, lip }, "final");
    // Trois bins côte à côte dans le même fichier : on les empile après impression.
    const objects = [-50, 0, 50].map((dx, k) => {
      const positions = new Float32Array(bin.mesh.positions);
      for (let v = 0; v < positions.length; v += 3) positions[v] = (positions[v] as number) + dx;
      return { mesh: { positions, indices: bin.mesh.indices }, name: `bin 1x1x3 ${lip} ${k + 1}` };
    });
    const bytes = serialize3mf(objects, { name: `empilage-${lip}`, shareLink: `prototypes/bin-label/bench.test.ts : 3 bins, rebord ${lip}` });
    writeFileSync(new URL(`files/empilage-${lip === "normal" ? "normal" : "reduit"}.3mf`, OUT), bytes);
    for (const object of readThreeMf(bytes).objects) expect((await checkMesh(object.mesh)).status).toBe("NoError");
    rows.push(`| ${lip === "normal" ? "normal" : "réduit"} | ${cm3(bin.stats.volume as number)} | ${cm3(bin.stats.usefulVolume as number)} | ${fr(bin.stats.compartment.height, 1)} |`);
  }
  sections[2] = [
    "## (3) Rebord normal ou réduit (bins 1 × 1 × 3 U)",
    "",
    "| Rebord | Matière (cm³) | Volume utile (cm³) | Hauteur utile (mm) |",
    "|---|---|---|---|",
    ...rows,
    "",
  ];
  flush();
}, 300_000);
