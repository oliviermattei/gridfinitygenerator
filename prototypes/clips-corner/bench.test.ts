// BANC JETABLE (#30) : les fentes des clips déplacées du milieu des bords de cellule vers les
// coins, le long des jonctions, pour les 4 types et les 2 profils. Le banc taille ses propres
// fentes (la même section que celle de l'ADR 0010) dans les pièces du moteur générées sans
// clips, et mesure ce qui reste autour. Lancer depuis la racine du dépôt :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/clips-corner
import { writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, pieceMesh, printClips, printPieces, serialize3mf, type BaseplateType, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { POCKET_PROFILES, insetAt, type PocketProfileName } from "../../packages/geometry/src/pocket-profile";
import { roundDownToLayer, roundUpToLayer } from "../../packages/geometry/src/print";
import { trayFloorOf, trayProfile } from "../../packages/geometry/src/baseplate-type";
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

// Proposition du banc.
/**
 * Départ d'une fente depuis l'axe d'un croisement de deux coupes : les deux fentes d'un même
 * quart de croisement (une le long de chaque coupe) se touchent en diagonale si elles partent
 * à moins de HALF_WIDTH ; au-delà, il reste √2·(d − HALF_WIDTH) de matière entre leurs coins.
 * Deux lignes de 0,4 mm en diagonale : d = HALF_WIDTH + SKIN / √2.
 */
const CROSSING_START = Math.ceil((HALF_WIDTH + SKIN / Math.SQRT2) * 100) / 100;
/** Départ d'une fente depuis le bord du treillis : une peau de deux lignes contre la marge (un trou du cadre au-dessus de 2 mm). */
const EDGE_START = SKIN;

const TYPES: BaseplateType[] = ["normal", "tray", "skeleton", "clickbase"];
const PROFILES: PocketProfileName[] = ["hybrid", "flush"];
const NAMES: Record<PocketProfileName, string> = { hybrid: "hybride", flush: "ras" };

function meshOf(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
}

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

/** Haut de la fente : pied de la pente haute du profil (relevé en Tray), arrondi à la couche inférieure. */
function topOf(type: BaseplateType, name: PocketProfileName): number {
  const profile = type === "tray" ? trayProfile(POCKET_PROFILES[name], trayFloorOf(LAYER)) : POCKET_PROFILES[name];
  const foot = profile.points[profile.points.length - 2] as readonly [number, number];
  return roundDownToLayer(foot[0], LAYER);
}

/**
 * Une fente à cheval sur une coupe : `cut` "column" (plan x = c) ou "row" (y = c), de `from` à
 * `to` le long de la coupe. Canal du pont sous la dent, fente de jambe de chaque côté.
 */
function slot(wasm: ManifoldToplevel, cut: "column" | "row", c: number, from: number, to: number, top: number): Manifold {
  const bridge = roundUpToLayer(BRIDGE, LAYER);
  const box = (a0: number, a1: number, z1: number) => {
    const [x0, x1, y0, y1] = cut === "column" ? [c + a0, c + a1, from, to] : [from, to, c + a0, c + a1];
    return wasm.Manifold.cube([x1 - x0, y1 - y0, z1 + O]).translate([x0, y0, -O]);
  };
  return wasm.Manifold.union([box(-HALF_WIDTH, HALF_WIDTH, bridge), box(-HALF_WIDTH, -TOOTH, top), box(TOOTH, HALF_WIDTH, top)]);
}

/** Volume nominal d'une fente de `length` (les deux pièces). */
function slotVolume(top: number, length: number): number {
  const bridge = roundUpToLayer(BRIDGE, LAYER);
  return 2 * (HALF_WIDTH * length * bridge + (HALF_WIDTH - TOOTH) * length * (top - bridge));
}

/** Intervalles de matière d'une section le long d'une droite (pair-impair sur les contours) : `axis` 0 le long de x à y = at, 1 le long de y à x = at. */
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

function sectionOf(solids: readonly Manifold[], z: number): [number, number][][] {
  return solids.flatMap((solid) => {
    const section = solid.slice(z);
    const polygons = section.toPolygons() as [number, number][][];
    section.delete();
    return polygons;
  });
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

/** Bout du poteau d'un Skeleton depuis l'axe du croisement, à la hauteur z (ADR 0014) : 5 mm en haut, 45° plus loin par mm vers le bas. */
function postReach(name: PocketProfileName, z: number): number {
  return 5 + (POCKET_PROFILES[name].height - z);
}

/** Début des lamelles d'un CLICKbase depuis l'axe du croisement, cellule de 42 mm, et leur jeu (ADR 0015). */
const LAMELLA_FROM_CROSSING = 4 + 0.5;
const LAMELLA_CLEARANCE = 0.5;

const X_CROSSING: string[] = [];
const EDGE: string[] = [];
const LENGTHS: string[] = [];

it("croisement de deux coupes : 4 fentes collées au coin, 4 types × 2 profils", async () => {
  const wasm = await loadManifold();
  for (const type of TYPES)
    for (const name of PROFILES) {
      // 2 × 2 cellules sur un plateau de 50 mm : 4 pièces d'une cellule, croisement des coupes en (0, 0).
      const settings = { sizeMode: "cells", columns: 2, rows: 2, baseplateType: type, pocketProfile: name, clips: false } as const;
      const kit = await generateBaseplate(settings, "final", { buildPlate: { width: 50, depth: 50 } });
      expect(kit.stats.pieces).toBe(4);
      expect(kit.layout.split.columnCuts).toEqual([1]);
      expect(kit.layout.split.rowCuts).toEqual([1]);
      const top = topOf(type, name);
      const [d, L] = [CROSSING_START, LENGTH];
      // Chaque jonction fait une cellule : un clip, au bout sur le croisement.
      const tools = wasm.Manifold.compose([
        slot(wasm, "column", 0, -d - L, -d, top),
        slot(wasm, "column", 0, d, d + L, top),
        slot(wasm, "row", 0, -d - L, -d, top),
        slot(wasm, "row", 0, d, d + L, top),
      ]);
      const plain = kit.pieces.map((piece) => solidOf(wasm, pieceMesh(kit, piece)));
      const slotted = plain.map((solid) => solid.subtract(tools));
      for (const solid of slotted) meshOf(solid);
      const removed = plain.reduce((sum, solid, k) => sum + solid.volume() - (slotted[k] as Manifold).volume(), 0);
      const nominal = 4 * slotVolume(top, L);

      // Peau côté poche, pièce avant gauche (x < 0, y < 0), en travers de la fente de la coupe x = 0, à mi-longueur.
      const y = -d - L / 2;
      const heights = [0.1, 0.5, 1.5, top - 0.1];
      const skins = heights.map((z) => {
        const intervals = along(sectionOf(slotted, z), 0, y).filter(([a, b]) => b > -6 && a < 0);
        const pocketSide = intervals[0] as [number, number];
        return Math.min(pocketSide[1], -HALF_WIDTH) - pocketSide[0];
      });
      for (const skin of skins) expect(skin).toBeGreaterThanOrEqual(SKIN - 1e-3);
      // Entre les coins des deux fentes d'un même quart : matière au point diagonal, à mi-hauteur.
      const neck = Math.SQRT2 * (d - HALF_WIDTH);
      const middle = -(HALF_WIDTH + d) / 2;
      const inNeck = along(sectionOf(slotted, 1.5), 0, middle).some(([a, b]) => a < middle && middle < b);
      expect(inNeck).toBe(true);
      // Rien de retiré au-dessus du haut de la fente.
      const above = [top + 0.05, top + 0.7, POCKET_PROFILES[name].height - 0.1].map(
        (z) => areaOf(sectionOf(plain, z)) - areaOf(sectionOf(slotted, z)),
      );
      for (const lost of above) expect(Math.abs(lost)).toBeLessThan(1e-4);

      // Skeleton : matière entre le bout de la fente et l'entaille, le long de la jambe, en haut de la fente.
      // Les murets de la coupe x = 0 portent les numéros des pièces d'une cellule (entiers) :
      // on mesure le long de la coupe y = 0, dont les murets sont entaillés, à y = −0,9 (jambe).
      let postWall = "—";
      if (type === "skeleton") {
        const z = top - 0.05;
        const leg = along(sectionOf(slotted, z), 0, -0.9);
        const wall = leg.find(([, b]) => Math.abs(b - (-d - L)) < 1e-4);
        postWall = wall ? `${fr(wall[1] - wall[0])} mm (poteau jusqu'à ${fr(postReach(name, z))} mm)` : `fente ouverte sur l'entaille (poteau jusqu'à ${fr(postReach(name, z))} mm)`;
      }
      // CLICKbase : ce que la fente prendrait déjà vide (les saignées des lamelles).
      const conflict = nominal - removed;
      X_CROSSING.push(
        `| ${type} | ${NAMES[name]} | ${fr(top)} | ${skins.map((s) => fr(s)).join(" / ")} | ${fr(neck)} | ${fr(Math.max(...above.map(Math.abs)), 6)} | ${postWall} | ${fr(removed / 4)} mm³ | ${fr(conflict, 3)} mm³ |`,
      );
      for (const solid of [...plain, ...slotted]) solid.delete();
      tools.delete();
    }
});

it("bout d'une jonction au bord du treillis, contre un cadre de 2 mm", async () => {
  const wasm = await loadManifold();
  for (const name of PROFILES) {
    // 2 × 3 cellules, marge de 10 mm en cadre, coupées en 2 pièces d'une colonne : une jonction de 3 cellules, deux bouts au bord.
    const settings = { sizeMode: "cells", columns: 2, rows: 3, marginWidth: 20, marginDepth: 20, pocketProfile: name, clips: false } as const;
    const cut = await generateBaseplate(settings, "final", { buildPlate: { width: 60, depth: 200 } });
    expect(cut.stats.pieces).toBe(2);
    const top = topOf("normal", name);
    const edge = -63; // bord avant du treillis
    const tool = slot(wasm, "column", 0, edge + EDGE_START, edge + EDGE_START + LENGTH, top);
    const plain = cut.pieces.map((piece) => solidOf(wasm, pieceMesh(cut, piece)));
    const slotted = plain.map((solid) => solid.subtract(tool));
    for (const solid of slotted) meshOf(solid);
    // Le long de la jambe (x = −0,9), au-dessus de la traverse (2 mm) : la peau entre la fente et le trou du cadre.
    for (const z of [0.5, top - 0.1]) {
      const leg = along(sectionOf(slotted, z), 1, -0.9).filter(([a, b]) => a < edge + EDGE_START + 1e-6 && b > edge - 12);
      EDGE.push(`| ${NAMES[name]} | ${fr(z)} | ${leg.map(([a, b]) => `${fr(a)} → ${fr(b)}`).join(" ; ")} |`);
      const wall = leg.find(([, b]) => Math.abs(b - (edge + EDGE_START)) < 1e-4);
      expect(wall).toBeDefined();
      expect((wall as [number, number])[1] - (wall as [number, number])[0]).toBeGreaterThanOrEqual(SKIN - 1e-4);
    }
    for (const solid of [...plain, ...slotted]) solid.delete();
    tool.delete();
  }
});

it("longueur de fente que chaque type permet au croisement de deux coupes", () => {
  for (const name of PROFILES) {
    const top = topOf("normal", name);
    const skeleton = postReach(name, top) - SKIN - CROSSING_START;
    const clickbase = LAMELLA_FROM_CROSSING - LAMELLA_CLEARANCE - CROSSING_START;
    LENGTHS.push(
      `| ${NAMES[name]} | ${fr(LENGTH)} | ${fr(LENGTH)} | ${fr(skeleton)} (poteau ${fr(postReach(name, top))} − peau ${fr(SKIN)} − départ ${fr(CROSSING_START)}) | ${fr(clickbase)} (lamelle à ${fr(LAMELLA_FROM_CROSSING)} − jeu ${fr(LAMELLA_CLEARANCE)} − départ ${fr(CROSSING_START)}) |`,
    );
  }
  lines.push(
    "# Résultats du banc (généré par `bench.test.ts`)",
    "",
    "## Cotes proposées",
    "",
    `Fente de l'ADR 0010 inchangée : ±${fr(HALF_WIDTH)} mm autour de la coupe, dent de ${fr(TOOTH)} mm, ${fr(LENGTH, 1)} mm de long, canal du pont jusqu'à ${fr(roundUpToLayer(BRIDGE, LAYER))} mm (couches de ${fr(LAYER, 1)}). Départ depuis l'axe d'un croisement de deux coupes : ${fr(CROSSING_START)} mm (${fr(HALF_WIDTH)} + ${fr(SKIN)}/√2) ; depuis le bord du treillis : ${fr(EDGE_START)} mm.`,
    "",
    "## Croisement de deux coupes (2 × 2 cellules en 4 pièces, 4 fentes collées au coin)",
    "",
    "Peau côté poche mesurée en travers d'une fente à mi-longueur, à z = 0,10 / 0,50 / 1,50 / haut − 0,10. Col : matière en diagonale entre les coins des deux fentes d'un même quart. Section perdue au-dessus du haut de la fente (3 hauteurs, maximum). Conflit : volume nominal des fentes moins le volume réellement retiré, c'est-à-dire ce qu'elles prendraient déjà vide.",
    "",
    "| Type | Profil | Haut de fente (mm) | Peau côté poche (mm) | Col (mm) | Section perdue au-dessus (mm²) | Mur contre l'entaille (Skeleton) | Retiré par clip | Conflit |",
    "|---|---|---|---|---|---|---|---|---|",
    ...X_CROSSING,
    "",
    "## Bout au bord du treillis (cadre de 10 mm, 2 mm de haut)",
    "",
    `Matière le long de la jambe (x = −0,90), en y, du trou du cadre à la fente (bord du treillis en y = −63, fente à partir de ${fr(-63 + EDGE_START)}).`,
    "",
    "| Profil | z (mm) | Matière en y (mm) |",
    "|---|---|---|",
    ...EDGE,
    "",
    "## Longueur de fente possible au croisement de deux coupes (cellule de 42 mm)",
    "",
    "| Profil | Normal | Tray | Skeleton | CLICKbase |",
    "|---|---|---|---|---|",
    ...LENGTHS,
    "",
  );
});

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

it("moteur (ADR 0018) : fentes aux coins pour les 4 types, lamelles raccourcies, fichiers de recette", async () => {
  const engine: string[] = [];
  const files: string[] = [];
  const plate = { width: 50, depth: 50 };
  for (const type of TYPES)
    for (const name of PROFILES) {
      const settings = { sizeMode: "cells", columns: 2, rows: 2, baseplateType: type, pocketProfile: name } as const;
      const [clipped, bare] = await Promise.all([
        generateBaseplate(settings, "final", { buildPlate: plate }),
        generateBaseplate({ ...settings, clips: false }, "final", { buildPlate: plate }),
      ]);
      const slot = clipped.layout.clips?.slot;
      expect(slot).toBeDefined();
      const { length, top } = slot as NonNullable<typeof slot>;
      const starts = [...new Set(clipped.layout.clips?.placements.map(({ start }) => start))];
      expect(starts).toEqual([CROSSING_START]);
      for (const piece of clipped.pieces) expect(badEdges(pieceMesh(clipped, piece))).toBe(0);
      // Hors CLICKbase, la matière perdue est exactement celle des fentes : rien sur une poche, un numéro, une entaille.
      const lost = (bare.stats.volume as number) - (clipped.stats.volume as number);
      const nominal = clipped.stats.clips * slotVolume(top, length);
      if (type !== "clickbase") expect(lost).toBeCloseTo(nominal, 2);
      // Skeleton : la matière entre le bout de la fente et l'entaille, le long de la jambe (coupe y = 0, jambe à y = −0,9), en haut de la fente.
      let wall = "—";
      if (type === "skeleton") {
        const z = top - 0.05;
        const wasm = await loadManifold();
        const solids = clipped.pieces.map((piece) => solidOf(wasm, pieceMesh(clipped, piece)));
        const leg = along(sectionOf(solids, z), 0, -0.9);
        const found = leg.find(([, b]) => Math.abs(b - (-CROSSING_START - length)) < 1e-4);
        expect(found).toBeDefined();
        const [a, b] = found as [number, number];
        expect(b - a).toBeGreaterThanOrEqual(SKIN - 1e-4);
        wall = `${fr(b - a)} mm`;
        for (const solid of solids) solid.delete();
      }
      engine.push(
        `| ${type} | ${NAMES[name]} | ${fr(length, 1)} | ${fr(top)} | ${clipped.stats.clips} | ${wall} | ${fr(lost)} mm³ | ${fr(nominal)} mm³ | ${fr((clipped.stats.volume as number) / 1000, 3)} cm³ |`,
      );
    }

  // Fichiers de recette (#16) : les kits de coupe tels que le site les exporte, en Skeleton et en CLICKbase (et en Normal pour comparer).
  const kits: [file: string, settings: Record<string, unknown>, plate: { width: number; depth: number }, what: string][] = [
    ["kit-coin-croisement-skeleton.3mf", { sizeMode: "cells", columns: 2, rows: 2, baseplateType: "skeleton" }, { width: 50, depth: 50 }, "2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes"],
    ["kit-coin-croisement-clickbase.3mf", { sizeMode: "cells", columns: 2, rows: 2, baseplateType: "clickbase" }, { width: 50, depth: 50 }, "2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes"],
    ["kit-coin-croisement-normal.3mf", { sizeMode: "cells", columns: 2, rows: 2 }, { width: 50, depth: 50 }, "2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes"],
    ["kit-coin-bord-skeleton.3mf", { sizeMode: "cells", columns: 2, rows: 3, marginWidth: 20, marginDepth: 20, baseplateType: "skeleton" }, { width: 60, depth: 200 }, "2 × 3 cellules et un cadre de 10 mm, en 2 pièces : une jonction de 3 cellules, un clip à chaque bout, au bord de la grille"],
    ["kit-coin-bord-clickbase.3mf", { sizeMode: "cells", columns: 2, rows: 3, marginWidth: 20, marginDepth: 20, baseplateType: "clickbase" }, { width: 60, depth: 200 }, "2 × 3 cellules et un cadre de 10 mm, en 2 pièces : une jonction de 3 cellules, un clip à chaque bout, au bord de la grille"],
  ];
  for (const [file, settings, kitPlate, what] of kits) {
    const kit = await generateBaseplate(settings, "final", { buildPlate: kitPlate });
    const pieces = printPieces(kit);
    const clips = printClips(kit, pieces) as TriangleMesh;
    const bytes = serialize3mf(
      [...pieces.map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` })), { mesh: clips, name: `clip × ${kit.stats.clips}` }],
      { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/clips-corner/bench.test.ts : ${what}, plateau de ${kitPlate.width} × ${kitPlate.depth} mm` },
    );
    writeFileSync(new URL(`files/${file}`, OUT), bytes);
    const { names, statuses, bad } = await reread(bytes);
    expect(statuses).toEqual(["NoError"]);
    expect(bad).toBe(0);
    files.push(`- \`files/${file}\` : ${what} ; ${names.join(", ")} ; relus ${statuses.join(", ")}, ${bad} arête pincée ; ${fr((kit.stats.volume as number) / 1000, 2)} cm³, fente de ${fr(kit.layout.clips?.slot.length ?? 0, 1)} mm.`);
  }

  // Tiroir par défaut sur un plateau de 256 mm, 4 types.
  const drawer: string[] = [];
  for (const type of TYPES) {
    const cut = await generateBaseplate({ baseplateType: type }, "final", { buildPlate: { width: 256, depth: 256 } });
    const starts = cut.layout.clips?.placements.map(({ start }) => fr(start)).join(" / ");
    drawer.push(`| ${type} | ${cut.stats.pieces} | ${cut.stats.clips} | ${starts} | ${fr((cut.stats.volume as number) / 1000, 2)} cm³ |`);
  }

  lines.push(
    "## Moteur (ADR 0018)",
    "",
    "2 × 2 cellules en 4 pièces, qualité finale : les fentes du moteur, sa longueur de fente par type, et la matière qu'elles retirent (sans clips moins avec clips ; en CLICKbase, les lamelles raccourcies en rendent une partie). Toutes les pièces sont sans arête pincée.",
    "",
    "| Type | Profil | Longueur de fente (mm) | Haut (mm) | Clips | Mur contre l'entaille | Matière retirée | Fentes nominales | Volume |",
    "|---|---|---|---|---|---|---|---|---|",
    ...engine,
    "",
    "Tiroir par défaut (400 × 280) découpé pour un plateau de 256 mm : départ de chaque fente depuis son croisement (colonne puis ligne).",
    "",
    "| Type | Pièces | Clips | Départs (mm) | Volume |",
    "|---|---|---|---|---|",
    ...drawer,
    "",
    "## Fichiers",
    "",
    ...files,
    "",
  );
  writeFileSync(new URL("results.md", OUT), lines.join("\n"));
});

// Profondeur de poche à la hauteur d'une fente, pour mémoire : la peau ne dépend que du retrait de la poche.
void insetAt;
