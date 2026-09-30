// BANC JETABLE (#37) : des fentes de bord, sur le contour d'une baseplate sans marge, pour la
// clipser plus tard à une autre générée à part. Chaque plaque porte sa moitié de fente (sa dent
// et son canal), comme une pièce découpée. Le banc taille ses propres demi-fentes (la section
// de l'ADR 0010) dans des plaques du moteur générées sans fentes, et mesure ce que le chanfrein
// du dessous et le coin arrondi leur laissent. Lancer depuis la racine du dépôt :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/edge-slots
import { writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, pieceMesh, printPieces, serialize3mf, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { POCKET_PROFILES, type PocketProfileName } from "../../packages/geometry/src/pocket-profile";
import { roundDownToLayer, roundUpToLayer } from "../../packages/geometry/src/print";
import { badEdges, checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
const lines: string[] = [];
const fr = (value: number, digits = 2) => (Math.abs(value) < 5e-7 ? 0 : value).toFixed(digits).replace(".", ",");

// La fente de l'ADR 0010, inchangée.
const HALF_WIDTH = 1.35;
const TOOTH = 0.5;
const LENGTH = 5;
const BRIDGE = 0.8;
const LAYER = 0.2;
/** Peau minimale : deux lignes de 0,4 mm (spec v1.1). */
const SKIN = 0.8;
const O = 1; // débord des outils
const CROSSING_START = Math.ceil((HALF_WIDTH + SKIN / Math.SQRT2) * 100) / 100;

const PROFILES: PocketProfileName[] = ["hybrid", "flush"];
const NAMES: Record<PocketProfileName, string> = { hybrid: "hybride", flush: "ras" };
const CHAMFERS = [0, 0.5, 0.8, 1, 1.3, 1.5, 2, 3];

function meshOf(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
}

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

function topOf(name: PocketProfileName): number {
  const profile = POCKET_PROFILES[name];
  const foot = profile.points[profile.points.length - 2] as readonly [number, number];
  return roundDownToLayer(foot[0], LAYER);
}

/** Une fente à cheval sur la ligne `c` ("column" : x = c, "row" : y = c), de `from` à `to` le long d'elle ; hors de la plaque, elle ne retire rien. */
function slot(wasm: ManifoldToplevel, cut: "column" | "row", c: number, from: number, to: number, top: number): Manifold {
  const bridge = roundUpToLayer(BRIDGE, LAYER);
  const box = (a0: number, a1: number, z1: number) => {
    const [x0, x1, y0, y1] = cut === "column" ? [c + a0, c + a1, from, to] : [from, to, c + a0, c + a1];
    return wasm.Manifold.cube([x1 - x0, y1 - y0, z1 + O]).translate([x0, y0, -O]);
  };
  return wasm.Manifold.union([box(-HALF_WIDTH, HALF_WIDTH, bridge), box(-HALF_WIDTH, -TOOTH, top), box(TOOTH, HALF_WIDTH, top)]);
}

/** Volume nominal d'une demi-fente de `length` (une plaque) : son canal et sa fente de jambe. */
function halfSlotVolume(top: number, length = LENGTH): number {
  const bridge = roundUpToLayer(BRIDGE, LAYER);
  return HALF_WIDTH * length * bridge + (HALF_WIDTH - TOOTH) * length * (top - bridge);
}

/** Intervalles de matière d'une section le long d'une droite : `axis` 0 le long de x à y = at, 1 le long de y à x = at. */
function along(contours: [number, number][][], axis: 0 | 1, at: number): [number, number][] {
  const cuts: number[] = [];
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const a = contour[k] as [number, number];
      const b = contour[(k + 1) % contour.length] as [number, number];
      const [au, av, bu, bv] = axis === 0 ? [a[0], a[1], b[0], b[1]] : [a[1], a[0], b[1], b[0]];
      if (av <= at !== bv <= at) cuts.push(au + ((at - av) * (bu - au)) / (bv - av));
    }
  cuts.sort((p, q) => p - q);
  const intervals: [number, number][] = [];
  for (let k = 0; k + 1 < cuts.length; k += 2) intervals.push([cuts[k] as number, cuts[k + 1] as number]);
  return intervals;
}

function sectionOf(solid: Manifold, z: number): [number, number][][] {
  const section = solid.slice(z);
  const polygons = section.toPolygons() as [number, number][][];
  section.delete();
  return polygons;
}

function areaOf(contours: [number, number][][]): number {
  let sum = 0;
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const [ax, ay] = contour[k] as [number, number];
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      sum += ax * by - bx * ay;
    }
  return sum / 2;
}

const has = (intervals: [number, number][], u: number) => intervals.some(([a, b]) => a < u && u < b);

/** 2 × 2 cellules sans marge, d'une pièce, sans fentes : x et y de −42 à 42. */
async function plainPlate(settings: Record<string, unknown>) {
  return generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, ...settings }, "final", { clips: false } as never);
}

const CHAMFER: string[] = [];

it("chanfrein du dessous : ce qu'il laisse de la dent, du canal et de la peau d'une fente de bord", async () => {
  const wasm = await loadManifold();
  for (const name of PROFILES)
    for (const chamfer of CHAMFERS) {
      const plate = await plainPlate({ pocketProfile: name, bottomChamfer: chamfer });
      const plain = solidOf(wasm, plate.mesh);
      const top = topOf(name);
      // Côté droit (x = 42), au bout avant : départ au-delà du coin arrondi de 4 mm.
      const start = Math.max(4, SKIN + chamfer);
      const [from, to] = [-42 + start, -42 + start + LENGTH];
      const tool = slot(wasm, "column", 42, from, to, top);
      const slotted = plain.subtract(tool);
      meshOf(slotted);
      const removed = plain.volume() - slotted.volume();
      const nominal = halfSlotVolume(top);
      const y = (from + to) / 2;
      // Plus basse hauteur où la dent garde sa face contre la jambe (x = 42 − 0,5), et où la
      // peau côté poche garde sa face contre la jambe (x = 42 − 1,35), au pas de 0,01 mm.
      const lowest = (x: number, z0: number) => {
        for (let z = z0; z < top; z += 0.01) if (has(along(sectionOf(slotted, z + 1e-4), 0, y), x)) return z;
        return top;
      };
      const tooth = lowest(42 - TOOTH + 0.01, roundUpToLayer(BRIDGE, LAYER));
      const wall = lowest(42 - HALF_WIDTH - 0.01, 0);
      // La face de la dent contre l'autre plaque (x = 42).
      const joint = lowest(42 - 0.01, roundUpToLayer(BRIDGE, LAYER));
      // Peau côté poche à z = 0,1 et en haut de la fente.
      const skins = [0.1, top - 0.1].map((z) => {
        const intervals = along(sectionOf(slotted, z), 0, y).filter(([a, b]) => b > 42 - 6 && a < 42 - HALF_WIDTH + 1e-6);
        const last = intervals[intervals.length - 1];
        return last ? Math.min(last[1], 42 - HALF_WIDTH) - last[0] : 0;
      });
      // Rien de retiré au-dessus du haut de la fente.
      const above = Math.max(...[top + 0.05, top + 0.7].map((z) => Math.abs(areaOf(sectionOf(plain, z)) - areaOf(sectionOf(slotted, z)))));
      expect(above).toBeLessThan(1e-4);
      const contact = top - tooth;
      CHAMFER.push(
        `| ${NAMES[name]} | ${fr(chamfer)} | ${fr(removed)} / ${fr(nominal)} mm³ | ${fr(nominal - removed, 3)} mm³ | ${fr(tooth)} → ${fr(top)} (${fr(contact)} mm) | ${fr(joint)} | ${fr(wall)} | ${skins.map((s) => fr(s)).join(" / ")} |`,
      );
      for (const solid of [plain, slotted, tool]) solid.delete();
    }
  lines.push(
    "# Résultats du banc (généré par `bench.test.ts`)",
    "",
    "## Chanfrein du dessous",
    "",
    "Plaque de 2 × 2 cellules sans marge, une demi-fente de bord de 5 mm sur le côté droit (x = 42), au bout avant, partie à 4 mm du coin (le rayon du coin). Retiré : volume réellement retiré, sur le nominal de la demi-fente ; déjà vide : ce que le chanfrein avait déjà ôté de la fente. Dent : de quelle hauteur à quelle hauteur la dent garde sa face contre la jambe du clip (x = 42 − 0,5), et sa hauteur. Joint : bas de la face de la dent contre l'autre plaque. Mur : bas de la face de la peau contre la jambe (x = 42 − 1,35). Peau côté poche à z = 0,1 et en haut de la fente − 0,1.",
    "",
    "| Profil | Chanfrein (mm) | Retiré | Déjà vide | Dent tenue par la jambe (mm) | Joint (mm) | Mur (mm) | Peau côté poche (mm) |",
    "|---|---|---|---|---|---|---|---|",
    ...CHAMFER,
    "",
  );
}, 120_000);

const CORNER: string[] = [];

it("coin de la plaque : deux fentes de bord perpendiculaires, et le coin arrondi", async () => {
  const wasm = await loadManifold();
  for (const [radius, chamfer] of [
    [0, 0],
    [0, 1],
    [4, 0],
    [10, 0],
  ] as const) {
    const plate = await plainPlate({ outerRadius: radius, bottomChamfer: chamfer });
    const plain = solidOf(wasm, plate.mesh);
    const top = topOf("hybrid");
    const start = Math.max(CROSSING_START, radius, SKIN + chamfer);
    // Côté droit au bout avant, et côté avant au bout droit : le même coin (42, −42).
    const tools = wasm.Manifold.compose([
      slot(wasm, "column", 42, -42 + start, -42 + start + LENGTH, top),
      slot(wasm, "row", -42, 42 - start - LENGTH, 42 - start, top),
    ]);
    const slotted = plain.subtract(tools);
    meshOf(slotted);
    const removed = plain.volume() - slotted.volume();
    // Col : la matière en diagonale entre les coins intérieurs des deux fentes, à mi-hauteur.
    const corner: [number, number] = [42 - HALF_WIDTH, -42 + start];
    const other: [number, number] = [42 - start, -42 + HALF_WIDTH];
    const neck = Math.hypot(corner[0] - other[0], corner[1] - other[1]);
    const middle = [(corner[0] + other[0]) / 2, (corner[1] + other[1]) / 2] as const;
    // (Au-delà de 2,15 mm de départ, le milieu tombe dans la poche du coin : rien à vérifier.)
    if (start < 2.15) expect(has(along(sectionOf(slotted, 1.5), 0, middle[1]), middle[0])).toBe(true);
    // Matière entre le bout de la fente et le contour, le long de la jambe (x = 42 − 0,9), à z = 1,5.
    const face = along(sectionOf(slotted, 1.5), 1, 42 - 0.9).find(([, b]) => Math.abs(b - (-42 + start)) < 1e-3);
    CORNER.push(
      `| ${fr(radius)} | ${fr(chamfer)} | ${fr(start)} | ${fr(neck)} | ${face ? fr(face[1] - face[0]) : "—"} | ${fr(removed / 2)} / ${fr(halfSlotVolume(top))} mm³ |`,
    );
    for (const solid of [plain, slotted, tools]) solid.delete();
  }
  lines.push(
    "## Coin de la plaque",
    "",
    "Deux demi-fentes de bord dans le même coin (côté droit au bout avant, côté avant au bout droit), hybride. Départ proposé : max(1,92 ; rayon du coin ; 0,8 + chanfrein) depuis le coin du treillis. Col : distance entre les coins intérieurs des deux fentes (matière vérifiée au milieu). Coin : matière entre le bout de la fente et le contour (coin arrondi, ou fente de l'autre côté), le long de la jambe (0,9 mm de la face), à z = 1,5.",
    "",
    "| Rayon (mm) | Chanfrein (mm) | Départ (mm) | Col (mm) | Coin (mm) | Retiré par fente |",
    "|---|---|---|---|---|---|",
    ...CORNER,
    "",
  );
  writeFileSync(new URL("results.md", OUT), lines.join("\n"));
}, 120_000);

/** Relit un 3MF, reconstruit chaque objet avec manifold : les statuts, et les arêtes qui ne bordent pas exactement deux faces. */
async function reread(bytes: Uint8Array): Promise<{ names: string[]; statuses: string[]; bad: number }> {
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  let bad = 0;
  for (const { mesh } of content.objects) {
    statuses.add((await checkMesh(mesh)).status);
    bad += badEdges(mesh);
  }
  return { names: content.objectNames, statuses: [...statuses], bad };
}

/** Un maillage décalé dans le plan. */
function moved({ positions, indices }: TriangleMesh, dx: number, dy: number): TriangleMesh {
  return { positions: positions.map((value, k) => (k % 3 === 0 ? value + dx : k % 3 === 1 ? value + dy : value)), indices };
}

/** Plusieurs maillages en un seul (des coquilles séparées). */
function joined(meshes: readonly TriangleMesh[]): TriangleMesh {
  const positions = new Float32Array(meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0));
  const indices = new Uint32Array(meshes.reduce((sum, mesh) => sum + mesh.indices.length, 0));
  let [p, i] = [0, 0];
  for (const mesh of meshes) {
    positions.set(mesh.positions, p);
    indices.set(mesh.indices.map((index) => index + p / 3), i);
    p += mesh.positions.length;
    i += mesh.indices.length;
  }
  return { positions, indices };
}

it("moteur (ADR 0022) : les fentes de bord du moteur, en vis-à-vis, et le fichier de recette", async () => {
  const wasm = await loadManifold();
  const engine: string[] = [];
  for (const name of PROFILES)
    for (const chamfer of [0, 1, 1.3, 1.5]) {
      const settings = { pocketProfile: name, bottomChamfer: chamfer };
      const [slotted, plain] = await Promise.all([
        generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, ...settings }, "final"),
        plainPlate(settings),
      ]);
      const edges = slotted.layout.clips?.edges ?? [];
      const top = topOf(name);
      // Les mêmes demi-fentes taillées par le banc, aux places que donne le moteur.
      const tools = edges.map(({ cut, centre: [x, y] }) =>
        cut === "column" ? slot(wasm, "column", x, y - LENGTH / 2, y + LENGTH / 2, top) : slot(wasm, "row", y, x - LENGTH / 2, x + LENGTH / 2, top),
      );
      const solid = solidOf(wasm, plain.mesh);
      const bench = tools.length > 0 ? solid.subtract(wasm.Manifold.compose(tools)) : solid;
      const difference = bench.volume() - (slotted.stats.volume as number);
      expect(Math.abs(difference)).toBeLessThan(0.01);
      expect(badEdges(slotted.mesh)).toBe(0);
      engine.push(
        `| ${NAMES[name]} | ${fr(chamfer)} | ${edges.length} | ${[...new Set(edges.map(({ start }) => fr(start)))].join(" / ") || "—"} | ${fr(((plain.stats.volume as number) - (slotted.stats.volume as number)) / Math.max(1, edges.length))} mm³ | ${fr(difference, 4)} mm³ |`,
      );
      for (const tool of tools) tool.delete();
      if (bench !== solid) bench.delete();
      solid.delete();
    }

  // Deux plaques identiques côte à côte : les fentes de leurs côtés en vis-à-vis.
  const plate = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "final");
  const edges = plate.layout.clips?.edges ?? [];
  const facing = ([a, b, axis]: readonly [number, number, 0 | 1]) =>
    edges.filter(({ side }) => side === a).map(({ centre }) => fr(centre[axis])).join(" / ") === edges.filter(({ side }) => side === b).map(({ centre }) => fr(centre[axis])).join(" / ");
  expect(facing([0, 2, 1])).toBe(true);
  expect(facing([1, 3, 0])).toBe(true);

  // Fichier de recette (#16) : deux plaques 2 × 2 sans marge, 10 mm l'une de l'autre, et 2 clips.
  const file = "deux-plaques-2x2-sans-marge.3mf";
  const gap = 10;
  const clip = plate.clip;
  const clips = joined([moved(clip, 84 / 2 + gap + 84 + gap + 2, -84 / 2), moved(clip, 84 / 2 + gap + 84 + gap + 2 + 2.5 + 3, -84 / 2)]);
  const bytes = serialize3mf(
    [
      { mesh: plate.mesh, name: "plaque 1" },
      { mesh: moved(plate.mesh, 84 + gap, 0), name: "plaque 2" },
      { mesh: clips, name: "clip × 2" },
    ],
    { name: "deux-plaques-2x2-sans-marge", shareLink: "prototypes/edge-slots/bench.test.ts : deux plaques de 2 × 2 cellules sans marge (mode Nombre de cellules, 2 × 2), et 2 clips" },
  );
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const { names, statuses, bad } = await reread(bytes);
  expect(statuses).toEqual(["NoError"]);
  expect(bad).toBe(0);

  lines.push(
    "## Moteur (ADR 0022)",
    "",
    "Plaque de 2 × 2 cellules sans marge, qualité finale : nombre de fentes de bord (une par côté de 2 cellules), départ depuis le coin, matière retirée par fente (plaque sans fentes moins plaque avec), et écart avec les mêmes demi-fentes taillées par le banc. Au-delà de 1,30 mm de chanfrein (canal + dent), pas de fente de bord.",
    "",
    "| Profil | Chanfrein (mm) | Fentes de bord | Départ (mm) | Retiré par fente | Écart moteur − banc |",
    "|---|---|---|---|---|---|",
    ...engine,
    "",
    `Deux plaques identiques côte à côte : fentes du côté droit de l'une et du côté gauche de l'autre en ${edges.filter(({ side }) => side === 0).map(({ centre }) => `y = ${fr(centre[1])}`).join(", ")} ; du fond et de l'avant en ${edges.filter(({ side }) => side === 1).map(({ centre }) => `x = ${fr(centre[0])}`).join(", ")} : en vis-à-vis.`,
    "",
    "## Fichiers",
    "",
    `- \`files/${file}\` : ${names.join(", ")} ; relus ${statuses.join(", ")}, ${bad} arête pincée ; ${fr((plate.stats.volume as number) / 1000, 2)} cm³ par plaque.`,
    "",
  );
  writeFileSync(new URL("results.md", OUT), lines.join("\n"));
}, 120_000);

void printPieces;
void pieceMesh;
