// BANC JETABLE (#25) : type Tray, la grille sur un fond plein. Où poser le fond pour que le
// bac reste assis sur ses pentes ? Le banc construit ses propres variantes 2 × 2, y pose un
// pied de bac standard, mesure où il s'arrête et son jeu, puis vérifie que le moteur construit
// exactement la variante retenue. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/tray
import { mkdirSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, serialize3mf, type BaseplateSettings, type TriangleMesh } from "../../packages/geometry/src/index";
import { trayFloorOf, trayProfile } from "../../packages/geometry/src/baseplate-type";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { FLUSH_PROFILE, HYBRID_PROFILE, type PocketProfile } from "../../packages/geometry/src/pocket-profile";
import { loft, pocketTool, roundedRect, type GridFrame } from "../../packages/geometry/src/shapes";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
/** Réécrit results.md avec ce que les tests ont mesuré jusqu'ici. */
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",").replace(/^-(0,0+)$/, "$1");

const CELL = 42;
const QUARTER = 32; // segments par quart de cercle, comme la qualité finale du moteur
const LAYER = 0.2;
const FLOOR = trayFloorOf(LAYER); // 0,6 mm de fond, 0,2 mm de jeu
/** Deux volumes qui se touchent sans se chevaucher : sous ce seuil, le chevauchement est nul. */
const OVERLAP_MM3 = 1e-3;
/** Précision des bissections, en mm. */
const TOLERANCE_MM = 1e-4;

/**
 * Pied de bac Gridfinity standard (spec : 0,8 à 45°, 1,8 vertical, 2,15 à 45°, dessus 41,5 mm,
 * rayon 3,75 au dessus), puis le corps du bac, 41,5 mm, jusqu'à 3 mm au-dessus du pied.
 */
function footOf(wasm: ManifoldToplevel): Manifold {
  const layers: [number, number][] = [
    [0, 17.8],
    [0.8, 18.6],
    [2.6, 18.6],
    [4.75, 20.75],
    [7.75, 20.75],
  ];
  const { positions, indices } = loft(
    layers.map(([z, half]) => ({ z, points: roundedRect(2 * half, 2 * half, 3.75 - (20.75 - half), QUARTER) })),
  );
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

/**
 * Une baseplate 2 × 2 sans marge ni aimant, poches au profil donné ; `pocketFloor` ajoute un
 * fond plein dans la poche, de 0 à cette hauteur, sans relever la poche (Tray d'extrabold sans
 * son décalage de 1 mm).
 */
function benchOf(wasm: ManifoldToplevel, profile: PocketProfile, pocketFloor = 0): Manifold {
  const outline = new wasm.CrossSection([roundedRect(2 * CELL, 2 * CELL, 4, QUARTER)]);
  const frame = { cellSize: CELL, segmentsPerQuarter: QUARTER, profile } as GridFrame;
  const tool = pocketTool(wasm, (m) => m, frame, profile);
  const tools = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => tool.translate([(sx * CELL) / 2, (sy * CELL) / 2, 0])));
  const solid = wasm.Manifold.extrude(outline, profile.height).subtract(wasm.Manifold.compose(tools));
  return pocketFloor > 0 ? solid.add(wasm.Manifold.extrude(outline, pocketFloor)) : solid;
}

/** Plus petite valeur de [lo, hi] pour laquelle `free` est vrai (vrai au-dessus, faux en dessous). */
function bisect(lo: number, hi: number, free: (value: number) => boolean): number {
  expect(free(hi)).toBe(true);
  while (hi - lo > TOLERANCE_MM) {
    const mid = (lo + hi) / 2;
    if (free(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

interface Seat {
  /** Hauteur du dessous du pied quand il ne porte que sur les pentes (le fond ôté). */
  slopes: number;
  /** Dessus du fond : celui de la baseplate, ou le fond du tiroir (0) pour une baseplate ouverte. */
  floor: number;
  /** Hauteur où le pied s'arrête vraiment : sur les pentes ou sur le fond, le plus haut des deux. */
  seat: number;
  /** Jeu latéral à cette hauteur : de combien le bac glisse avant de toucher une paroi. */
  play: number;
}

/** Pose le pied au-dessus de la cellule (+X, +Y) et mesure où il s'arrête. */
function seatOf(wasm: ManifoldToplevel, bench: Manifold, floor: number): Seat {
  const foot = footOf(wasm);
  const overlap = (solid: Manifold, dx: number, z: number) =>
    foot.translate([CELL / 2 + dx, CELL / 2, z]).intersect(solid).volume();
  // Le fond ôté : ce qui reste au-dessus du dessus du fond.
  const above = bench.intersect(wasm.Manifold.cube([4 * CELL, 4 * CELL, 20], true).translate([0, 0, 10 + floor]));
  const slopes = bisect(-2, 3, (z) => overlap(above, 0, z) < OVERLAP_MM3);
  const seat = Math.max(slopes, floor);
  const play = bisect(0, 1, (dx) => overlap(bench, -dx, seat + TOLERANCE_MM) >= OVERLAP_MM3) - TOLERANCE_MM;
  return { slopes, floor, seat, play: Math.max(0, play) };
}

it("assise d'un bac standard selon la place du fond", async () => {
  const wasm = await loadManifold();
  const variants: [name: string, profile: PocketProfile, pocketFloor: number, floor: number][] = [
    ["Normal hybride (posée au fond du tiroir)", HYBRID_PROFILE, 0, 0],
    ["Normal ras (posée au fond du tiroir)", FLUSH_PROFILE, 0, 0],
    [`C : fond de ${fr(FLOOR.thickness)} dans la poche, poche non relevée`, HYBRID_PROFILE, FLOOR.thickness, FLOOR.thickness],
    [`A : poche relevée du fond (${fr(FLOOR.thickness)}), sans jeu`, trayProfile(HYBRID_PROFILE, { thickness: FLOOR.thickness, gap: 0 }), 0, FLOOR.thickness],
    [`**B : poche relevée du fond et d'un jeu de ${fr(FLOOR.gap)} (retenu)**`, trayProfile(HYBRID_PROFILE, FLOOR), 0, FLOOR.thickness],
    ["B au profil ras", trayProfile(FLUSH_PROFILE, FLOOR), 0, FLOOR.thickness],
  ];
  const rows: string[] = [];
  const seats = new Map<string, Seat>();
  for (const [name, profile, pocketFloor, floor] of variants) {
    const seat = seatOf(wasm, benchOf(wasm, profile, pocketFloor), floor);
    seats.set(name.slice(0, 12), seat);
    const gap = seat.slopes - seat.floor;
    const carried = Math.abs(gap) < 1e-3 ? "pentes **et** fond (hyperstatique)" : gap > 0 ? "pentes seules" : "fond seul";
    rows.push(
      `| ${name} | ${fr(profile.height)} | ${fr(seat.floor)} | ${fr(seat.slopes, 3)} | ${fr(seat.seat, 3)} | ${fr(Math.max(0, gap), 3)} | ${fr(seat.play, 3)} | ${carried} |`,
    );
  }
  // Le profil hybride pose le pied exactement au fond de la poche (ADR 0002) ; le ras le laisse
  // descendre 0,35 mm plus bas que ses pentes : il repose sur le tiroir, et glisse jusqu'à ce
  // que sa bande verticale touche la paroi verticale de la poche, 0,25 mm plus loin (le jeu du
  // standard), avant que les pentes, à 0,35 mm, ne se touchent.
  const [normal, flushNormal, inPocket, noGap, retained, retainedFlush] = [...seats.values()] as Seat[];
  expect(normal?.slopes).toBeCloseTo(0, 3);
  expect(normal?.play).toBeLessThan(0.01);
  expect(flushNormal?.slopes).toBeCloseTo(-0.35, 3);
  expect(flushNormal?.play).toBeCloseTo(0.25, 2);
  // Fond dans la poche : le bac pose sur le fond, 0,6 mm au-dessus de ses pentes, avec le jeu de 0,25 mm.
  expect(inPocket?.seat).toBeCloseTo(FLOOR.thickness, 3);
  expect(inPocket?.play).toBeCloseTo(0.25, 2);
  // Poche relevée sans jeu : pentes et fond à la fois, comme la Normal sur le tiroir.
  expect(noGap?.slopes).toBeCloseTo(FLOOR.thickness, 3);
  // Retenu : le bac assis sur ses pentes, sans jeu, une couche au-dessus du fond.
  expect(retained?.seat).toBeCloseTo(FLOOR.thickness + FLOOR.gap, 3);
  expect(retained?.play).toBeLessThan(0.01);
  // Au profil ras, le fond relève le bac de 0,2 mm : il y repose, avec 0,15 mm de jeu au lieu de 0,25.
  expect(retainedFlush?.play).toBeCloseTo(0.35 - FLOOR.gap, 2);
  lines.push(
    "## Assise d'un pied de bac standard (cellule de 42 mm, couches de 0,2 mm)",
    "",
    "Pied de la spec (0,8 / 1,8 / 2,15, dessus 41,5 mm, rayon 3,75), posé par bissection jusqu'au premier contact (chevauchement < 0,001 mm³). « Pentes seules » : hauteur où le pied touche les pentes, le fond ôté. « Jeu latéral » : glissement possible à la hauteur où il s'arrête.",
    "",
    "| Variante | Hauteur | Dessus du fond | Pied sur les pentes | Pied s'arrête à | Écart pied/fond | Jeu latéral | Porté par |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 60_000);

/** Volume en cm³, 2 décimales. */
const cm3 = (mm3: number) => fr(mm3 / 1000);

it("matière : Tray contre Normal, et le fond sous la marge", async () => {
  const wasm = await loadManifold();
  const cases: [string, Partial<BaseplateSettings>][] = [
    ["2 × 2 sans marge", { sizeMode: "cells", columns: 2, rows: 2 }],
    ["4 × 4 sans marge", { sizeMode: "cells", columns: 4, rows: 4 }],
    ["tiroir par défaut, cadre à traverses", {}],
    ["tiroir par défaut, cellules tronquées", { marginShape: "cells" }],
    ["tiroir par défaut, équerres", { marginShape: "brackets" }],
  ];
  const rows: string[] = [];
  for (const [name, settings] of cases) {
    const [normal, tray] = await Promise.all([
      generateBaseplate(settings, "final"),
      generateBaseplate({ ...settings, baseplateType: "tray" }, "final"),
    ]);
    const [v0, v1] = [normal.stats.volume as number, tray.stats.volume as number];
    // Le fond prolongé sous la marge d'un cadre ou d'équerres : sous leurs trous, de 0 à l'épaisseur du fond.
    let marginFloor = "—";
    if (settings.marginShape !== "cells" && tray.layout.margins.left + tray.layout.margins.right > 0) {
      const { positions, indices } = tray.mesh;
      const solid = new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
      const { width, depth } = tray.stats.dimensions;
      const slab = wasm.Manifold.extrude(new wasm.CrossSection([roundedRect(width, depth, 4, QUARTER)]), FLOOR.thickness);
      marginFloor = `+${cm3(solid.add(slab).volume() - solid.volume())}`;
    }
    rows.push(`| ${name} | ${cm3(v0)} | ${cm3(v1)} | +${cm3(v1 - v0)} | × ${fr(v1 / v0)} | ${marginFloor} | ${normal.stats.magnets} / ${tray.stats.magnets} |`);
    expect(tray.stats.magnets).toBe(normal.stats.magnets);
  }
  lines.push(
    "## Matière (moteur, qualité finale, réglages par défaut, aimants compris, sans découpe)",
    "",
    "| Cas | Normal (cm³) | Tray (cm³) | Écart | Rapport | Fond aussi sous la marge | Aimants N / T |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 120_000);

/** Écrit un 3MF, le relit, et vérifie chaque objet NoError ; renvoie la ligne du résultat. */
async function write3mf(file: string, mesh: TriangleMesh, note: string): Promise<string> {
  const bytes = serialize3mf([{ mesh, name: "baseplate" }], { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/tray/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const object of content.objects) statuses.add((await checkMesh(object.mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : relu ${[...statuses].join(", ")}. ${note}.`;
}

it("fichiers de la recette, et le moteur construit la variante retenue", async () => {
  const wasm = await loadManifold();
  const settings: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 2, rows: 2, baseplateType: "tray" };
  // Sans aimant, le moteur donne exactement la variante B du banc.
  const bare = await generateBaseplate(settings, "final", { magnets: false });
  const bench = benchOf(wasm, trayProfile(HYBRID_PROFILE, FLOOR));
  expect(bare.stats.volume as number).toBeCloseTo(bench.volume(), 2);
  const engine = await generateBaseplate(settings, "final");
  const files = [
    await write3mf(
      "banc-2x2-tray.3mf",
      engine.mesh,
      `Tray 2 × 2 du moteur (variante B) : ${fr(engine.stats.dimensions.height)} mm, fond ${fr(FLOOR.thickness)} mm, jeu ${fr(FLOOR.gap)} mm, ${engine.stats.magnets} aimant ; ${cm3(engine.stats.volume as number)} cm³ (${cm3(bench.volume())} sans aimant, comme le banc)`,
    ),
    await write3mf(
      "banc-2x2-tray-sans-jeu.3mf",
      (() => {
        const solid = benchOf(wasm, trayProfile(HYBRID_PROFILE, { thickness: FLOOR.thickness, gap: 0 }));
        const { vertProperties, triVerts } = solid.getMesh();
        return { positions: vertProperties, indices: triVerts };
      })(),
      `variante A, pour comparer : poche relevée du fond seul, le pied touche le fond ; ${fr(HYBRID_PROFILE.height + FLOOR.thickness)} mm, sans aimant`,
    ),
  ];
  lines.push("## Fichiers (relus, `NoError`)", "", ...files, "");
  flush();
}, 60_000);
