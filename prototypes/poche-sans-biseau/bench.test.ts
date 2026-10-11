// BANC JETABLE (2026-10-11) : la poche « sans biseau ». Le profil hybride (ADR 0002) a, sous sa
// partie verticale, une marche verticale de 0,35 mm et un petit 45° de 0,7 mm. La variante les
// supprime : paroi verticale au retrait 2,15 de z = 0 à 2,85, puis la même pente haute jusqu'au
// plat de 0,4 mm, 4,60 mm de haut. Le banc construit ses propres baseplates 1 × 1 (outil de
// poche du moteur, sans marge ni aimant), y pose un pied de bac standard par bissection, mesure
// matière et emprise, puis vérifie avec le moteur (le profil substitué le temps d'un appel, sans
// changer son code) que aimants, vis et fentes de clip tiennent toujours. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/poche-sans-biseau
import { mkdirSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  generateBaseplate,
  pieceMesh,
  serialize3mf,
  type Baseplate,
  type BaseplateSettings,
  type GenerateOptions,
  type TriangleMesh,
} from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { HYBRID_PROFILE, POCKET_PROFILES, insetAt, type PocketProfile } from "../../packages/geometry/src/pocket-profile";
import { screwHolesOf } from "../../packages/geometry/src/screws";
import { circle, loft, pocketTool, roundedRect, type GridFrame } from "../../packages/geometry/src/shapes";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
/** Réécrit results.md avec ce que les tests ont mesuré jusqu'ici. */
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 2) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits).replace(".", ",");

const CELL = 42;
const QUARTER = 32; // segments par quart de cercle, comme la qualité finale du moteur
const HOLE_SEGMENTS = 64; // segments d'un trou en qualité finale (ADR 0012)
/** Densité déclarée du PLA, g/cm³. */
const DENSITY = 1.24;
/** Deux volumes qui se touchent sans se chevaucher : sous ce seuil, le chevauchement est nul. */
const OVERLAP_MM3 = 1e-3;
/** Précision des bissections, en mm. */
const TOLERANCE_MM = 1e-4;
/** Descente du pied sous son assise pour voir quelles surfaces il touche. */
const PROBE_MM = 0.01;
/** Peau minimale d'une fente côté poche : deux lignes de 0,4 mm (ADR 0010). */
const SKIN_MM = 0.8;

/** La variante : paroi verticale au retrait 2,15 de z = 0 à 2,85, puis la pente haute jusqu'au plat de 0,4. */
const SANS_BISEAU: PocketProfile = {
  height: 4.6,
  topRadius: 4,
  points: [
    [0, 2.15],
    [2.85, 2.15],
    [4.6, 0.4],
  ],
};
const PROFILES: [name: string, profile: PocketProfile][] = [
  ["hybride", HYBRID_PROFILE],
  ["sans biseau", SANS_BISEAU],
];

/**
 * Le moteur avec le profil donné : `POCKET_PROFILES.hybrid` remplacé le temps de l'appel. Le
 * moteur lit ce registre à chaque génération (baseplate.ts), sans cache entre deux appels.
 */
async function withProfile<T>(profile: PocketProfile, run: () => Promise<T>): Promise<T> {
  const registry = POCKET_PROFILES as Record<string, PocketProfile>;
  const original = registry.hybrid as PocketProfile;
  registry.hybrid = profile;
  try {
    return await run();
  } finally {
    registry.hybrid = original;
  }
}
const engine = (profile: PocketProfile, settings: Partial<BaseplateSettings>, options: GenerateOptions = {}) =>
  withProfile(profile, () => generateBaseplate({ ...settings, pocketProfile: "hybrid" }, "final", options));

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}
function meshOf(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
}

/**
 * Pied de bac Gridfinity standard (spec : 0,8 à 45°, 1,8 vertical, 2,15 à 45°, dessus 41,5 mm,
 * rayon 3,75 au dessus), puis le corps du bac, 41,5 mm, jusqu'à 3 mm au-dessus du pied.
 */
const FOOT_LAYERS: [z: number, half: number][] = [
  [0, 17.8],
  [0.8, 18.6],
  [2.6, 18.6],
  [4.75, 20.75],
  [7.75, 20.75],
];
function footOf(wasm: ManifoldToplevel): Manifold {
  const { positions, indices } = loft(
    FOOT_LAYERS.map(([z, half]) => ({ z, points: roundedRect(2 * half, 2 * half, 3.75 - (20.75 - half), QUARTER) })),
  );
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

/** Une baseplate 1 × 1 centrée sur l'origine, sans marge ni aimant, rayon extérieur 4, poche au profil donné. */
function benchOf(wasm: ManifoldToplevel, profile: PocketProfile): Manifold {
  const outline = new wasm.CrossSection([roundedRect(CELL, CELL, 4, QUARTER)]);
  const frame = { cellSize: CELL, segmentsPerQuarter: QUARTER, profile } as GridFrame;
  return wasm.Manifold.extrude(outline, profile.height).subtract(pocketTool(wasm, (m) => m, frame, profile));
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

/** Nom d'un segment du profil : paroi verticale, pente basse ou pente haute (la dernière). */
function segmentsOf({ points }: PocketProfile): { name: string; z0: number; z1: number }[] {
  return points.slice(1).map(([z1, d1], k) => {
    const [z0, d0] = points[k] as readonly [number, number];
    const last = k === points.length - 2;
    const name = d0 === d1 ? `paroi verticale (z ${fr(z0)} à ${fr(z1)})` : last ? "pente haute" : "pente basse";
    return { name, z0, z1 };
  });
}

interface Seat {
  /** Hauteur du dessous du pied quand il ne porte que sur les parois de la poche (le tiroir ôté). */
  walls: number;
  /** Hauteur où le pied s'arrête : sur les parois ou sur le fond du tiroir (0), le plus haut des deux. */
  seat: number;
  /** Jeu latéral à cette hauteur : de combien le bac glisse avant de toucher une paroi. */
  play: number;
  /** Surfaces que le pied touche une fois assis. */
  touches: string[];
}

function seatOf(wasm: ManifoldToplevel, plate: Manifold, profile: PocketProfile): Seat {
  const foot = footOf(wasm);
  const overlap = (solid: Manifold, dx: number, z: number) => foot.translate([dx, 0, z]).intersect(solid).volume();
  // Rien sous z = 0 : le pied n'y est arrêté que par les parois de la poche.
  const walls = bisect(-2, 3, (z) => overlap(plate, 0, z) < OVERLAP_MM3);
  const seat = Math.max(walls, 0);
  const play = Math.max(0, bisect(0, 1, (dx) => overlap(plate, -dx, seat + TOLERANCE_MM) >= OVERLAP_MM3) - TOLERANCE_MM);
  // Le pied descendu de PROBE_MM sous son assise : ce qu'il entame, segment par segment du profil.
  // Chaque tranche est réduite de 2 × PROBE_MM à ses bouts : un pied qui entame une pente déborde
  // d'un coin de PROBE_MM de haut sur le segment voisin, sans le toucher.
  const touches = segmentsOf(profile)
    .filter(({ z0, z1 }) => {
      const [lo, hi] = [z0 + 2 * PROBE_MM, z1 - 2 * PROBE_MM];
      const slab = wasm.Manifold.cube([2 * CELL, 2 * CELL, hi - lo], true).translate([0, 0, (lo + hi) / 2]);
      return overlap(plate.intersect(slab), 0, seat - PROBE_MM) >= OVERLAP_MM3;
    })
    .map(({ name }) => name);
  if (seat < 1e-3) touches.push("fond du tiroir");
  return { walls, seat, play, touches };
}

/** Distance du point (x, y) au plus proche des côtés des contours. */
function nearest(contours: [number, number][][], x: number, y: number): number {
  let best = Infinity;
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const [ax, ay] = contour[k] as [number, number];
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      const [ux, uy] = [bx - ax, by - ay];
      const t = Math.max(0, Math.min(1, ((x - ax) * ux + (y - ay) * uy) / (ux * ux + uy * uy)));
      best = Math.min(best, Math.hypot(ax + t * ux - x, ay + t * uy - y));
    }
  return best;
}

/** Aire d'un polygone (formule du lacet). */
function polygonArea(points: [number, number][]): number {
  let sum = 0;
  for (let k = 0; k < points.length; k++) {
    const [ax, ay] = points[k] as [number, number];
    const [bx, by] = points[(k + 1) % points.length] as [number, number];
    sum += ax * by - bx * ay;
  }
  return Math.abs(sum) / 2;
}

const sectionOf = (solid: Manifold, z: number) => solid.slice(z).toPolygons() as [number, number][][];
const areaAt = (solid: Manifold, z: number) => solid.slice(z).area();

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

/** Centre de la boîte englobante d'un maillage, en x et y. */
function centreOf({ positions }: TriangleMesh): [number, number] {
  const [min, max] = [
    [Infinity, Infinity],
    [-Infinity, -Infinity],
  ];
  for (let i = 0; i < positions.length; i += 3)
    for (const axis of [0, 1]) {
      const value = positions[i + axis] as number;
      min[axis] = Math.min(min[axis] as number, value);
      max[axis] = Math.max(max[axis] as number, value);
    }
  return [((min[0] as number) + (max[0] as number)) / 2, ((min[1] as number) + (max[1] as number)) / 2];
}

it("assise d'un pied standard, matière et emprise, 1 × 1", async () => {
  const wasm = await loadManifold();
  const seatRows: string[] = [];
  const matterRows: string[] = [];
  const seats: Seat[] = [];
  for (const [name, profile] of PROFILES) {
    const plate = benchOf(wasm, profile);
    expect(plate.status()).toBe("NoError");
    const seat = seatOf(wasm, plate, profile);
    seats.push(seat);
    const volume = plate.volume();
    const footprint = areaAt(plate, 1e-3);
    const inset0 = insetAt(profile, 0);
    // Jeu entre le pied (demi-côté 17,8 à z = 0) et la paroi de la poche, au fond.
    const bottomClearance = CELL / 2 - inset0 - (FOOT_LAYERS[0] as [number, number])[1];
    const points = profile.points.map(([z, d]) => `[${fr(z)} ; ${fr(d)}]`).join(" ");
    seatRows.push(
      `| ${name} | ${points} | ${fr(profile.height)} | ${fr(seat.walls, 3)} | ${fr(seat.seat, 3)} | ${fr(seat.play, 3)} | ${seat.touches.join(", ")} |`,
    );
    matterRows.push(
      `| ${name} | ${fr(volume, 1)} | ${fr((volume / 1000) * DENSITY, 2)} | ${fr(footprint, 1)} | ${fr(2 * inset0)} | ${fr(inset0)} | ${fr(profile.topRadius - inset0)} | ${fr(bottomClearance)} |`,
    );
  }
  const [hybrid, variant] = seats as [Seat, Seat];
  // Le hybride : le pied touche ses deux pentes et le tiroir à la fois, sans jeu (ADR 0002, banc tray).
  expect(hybrid.walls).toBeCloseTo(0, 3);
  expect(hybrid.play).toBeLessThan(0.01);
  expect(hybrid.touches).toEqual(["pente basse", "pente haute", "fond du tiroir"]);
  // La variante : la même assise, la pente haute et le tiroir, sans jeu.
  expect(variant.walls).toBeCloseTo(0, 3);
  expect(variant.play).toBeLessThan(0.01);
  expect(variant.touches).toEqual(["pente haute", "fond du tiroir"]);
  lines.push(
    "## Assise d'un pied de bac standard (1 × 1, cellule de 42 mm)",
    "",
    "Pied de la spec (0,8 / 1,8 / 2,15, dessus 41,5 mm, rayon 3,75), posé par bissection jusqu'au premier contact (chevauchement < 0,001 mm³). « Parois seules » : hauteur où le pied touche la poche, le tiroir ôté. « Touche » : ce que le pied entame quand on le descend de 0,01 mm sous son assise, segment par segment du profil, plus le tiroir s'il s'arrête à z = 0.",
    "",
    "| Profil | Points [z ; retrait] | Hauteur | Pied sur les parois seules | Pied s'arrête à | Jeu latéral | Touche |",
    "|---|---|---|---|---|---|---|",
    ...seatRows,
    "",
    `## Matière et emprise (1 × 1, sans marge ni aimant, rayon extérieur 4, ${QUARTER} segments par quart)`,
    "",
    `Masse : volume mesuré × ${fr(DENSITY)} g/cm³ (PLA). Emprise : aire de la section à z = 0,001 mm, ce qui touche le plateau. Muret au pied : du profil (2 × retrait à z = 0 entre deux cellules, 1 × au bord sans marge).`,
    "",
    "| Profil | Volume (mm³) | Masse (g) | Emprise à z = 0 (mm²) | Muret au pied entre deux cellules (mm) | Muret au pied au bord (mm) | Rayon de la poche au fond (mm) | Jeu pied/paroi à z = 0 (mm) |",
    "|---|---|---|---|---|---|---|---|",
    ...matterRows,
    "",
  );
  flush();
}, 60_000);

it("aimants, vis et fentes de clip avec la variante (moteur)", async () => {
  const wasm = await loadManifold();
  const rows: string[] = [];
  for (const [name, profile] of PROFILES) {
    // --- Aimant (ADR 0012) : 2 × 2, un aimant sous le croisement central.
    const settings = { sizeMode: "cells", columns: 2, rows: 2 } as const;
    const [withMagnet, without] = await Promise.all([engine(profile, settings), engine(profile, settings, { magnets: false })]);
    expect(withMagnet.stats.magnets).toBe(1);
    const [m1, m0] = [solidOf(wasm, withMagnet.mesh), solidOf(wasm, without.mesh)];
    const [cx, cy] = centreOf(without.mesh);
    const radius = 3.25;
    const depth = 2.2;
    const holeArea = polygonArea(circle(radius, HOLE_SEGMENTS));
    // Le trou tout entier dans la matière : à chaque hauteur sous son plafond, la section perd exactement le disque.
    const magnetHeights = [0.05, 0.35, 0.7, 1.05, 1.5, 2.1];
    for (const z of magnetHeights) expect(areaAt(m0, z) - areaAt(m1, z)).toBeCloseTo(holeArea, 3);
    for (const z of [depth + 0.05, 3, 4.5]) expect(Math.abs(areaAt(m0, z) - areaAt(m1, z))).toBeLessThan(1e-4);
    const magnetNearest = magnetHeights.map((z) => nearest(sectionOf(m0, z), cx, cy));
    const magnetWall = Math.min(...magnetNearest) - radius;
    expect(magnetWall).toBeGreaterThan(0.5);
    const formula = 4 * Math.SQRT2 - (profile.topRadius - insetAt(profile, 0));

    // --- Vis (ADR 0006) : 3 × 3, une vis à chacun des 4 croisements intérieurs, sans aimant.
    const screwSettings = { sizeMode: "cells", columns: 3, rows: 3 } as const;
    const [s1b, s0b] = await Promise.all([
      engine(profile, { ...screwSettings, screws: true }, { magnets: false }),
      engine(profile, screwSettings, { magnets: false }),
    ]);
    expect(s1b.stats.screws).toBe(4);
    const [s1, s0] = [solidOf(wasm, s1b.mesh), solidOf(wasm, s0b.mesh)];
    const holes = screwHolesOf({ ...DEFAULT_SETTINGS, screws: true }, profile) as NonNullable<ReturnType<typeof screwHolesOf>>;
    const [shank, head] = [holes.shankDiameter / 2, holes.headDiameter / 2];
    const cone = holes.seat - (head - shank);
    const radiusAt = (z: number) => Math.min(head, Math.max(shank, shank + z - cone));
    const [sx, sy] = centreOf(s0b.mesh);
    const screwHeights = [0.05, 0.35, 0.7, 1.05, 1.5, 2, 2.5, holes.seat - 0.01];
    // Sous l'assise, chaque section perd exactement les 4 trous : rien n'entame une poche.
    for (const z of screwHeights) expect(areaAt(s0, z) - areaAt(s1, z)).toBeCloseTo(4 * polygonArea(circle(radiusAt(z), HOLE_SEGMENTS)), 3);
    const screwWalls = screwHeights.map((z) => nearest(sectionOf(s0, z), sx + CELL / 2, sy + CELL / 2) - radiusAt(z));
    const screwWall = Math.min(...screwWalls);
    const screwWallAt = screwHeights[screwWalls.indexOf(screwWall)] as number;
    expect(screwWall).toBeGreaterThan(0.5);

    // --- Fentes de clip (ADR 0010, 0018, 0022) : 2 × 2 coupé en 4 pièces d'une cellule, fentes sur les coupes et au bord.
    const cutSettings = { sizeMode: "cells", columns: 2, rows: 2 } as const;
    const plate = { buildPlate: { width: 50, depth: 50 }, magnets: false };
    const [c1b, c0b] = await Promise.all([engine(profile, cutSettings, plate), engine(profile, cutSettings, { ...plate, clips: false })]);
    expect(c1b.stats.pieces).toBe(4);
    const clips = c1b.layout.clips as NonNullable<Baseplate["layout"]["clips"]>;
    const { slot } = clips;
    const pieces = (b: Baseplate) => b.pieces.map((piece) => solidOf(wasm, pieceMesh(b, piece)));
    const [cut1, cut0] = [pieces(c1b), pieces(c0b)];
    const section = (solids: Manifold[], z: number) => solids.flatMap((solid) => sectionOf(solid, z));
    const area = (solids: Manifold[], z: number) => solids.reduce((sum, solid) => sum + areaAt(solid, z), 0);
    const clipHeights = [0.05, 0.5, 1.5, slot.top - 0.05];
    /** Peau la plus mince côté poche, en travers de la fente centrée en `centre`, aux hauteurs données. */
    const skinOf = (cut: "column" | "row", [x, y]: [number, number], z: number) => {
      const [axis, c, at] = cut === "column" ? ([0, x, y] as const) : ([1, y, x] as const);
      const touching = along(section(cut1, z), axis, at).filter(
        ([a, b]) => Math.abs(b - (c - slot.halfWidth)) < 1e-3 || Math.abs(a - (c + slot.halfWidth)) < 1e-3,
      );
      expect(touching.length).toBeGreaterThan(0);
      return Math.min(...touching.map(([a, b]) => b - a));
    };
    const cutSkins = clips.placements.flatMap((p) => clipHeights.map((z) => skinOf(p.cut, p.centre, z)));
    const edgeSkins = clips.edges.flatMap((p) => clipHeights.map((z) => skinOf(p.cut, p.centre, z)));
    expect(clips.placements.length).toBeGreaterThan(0);
    expect(clips.edges.length).toBeGreaterThan(0);
    const [cutSkin, edgeSkin] = [Math.min(...cutSkins), Math.min(...edgeSkins)];
    expect(cutSkin).toBeGreaterThanOrEqual(SKIN_MM - 1e-3);
    expect(edgeSkin).toBeGreaterThanOrEqual(SKIN_MM - 1e-3);
    // Peau au fond (z = 0,05), là où la variante a perdu de la matière.
    const bottomSkin = Math.min(...clips.placements.map((p) => skinOf(p.cut, p.centre, 0.05)), ...clips.edges.map((p) => skinOf(p.cut, p.centre, 0.05)));
    // Rien de retiré au-dessus du haut de la fente.
    for (const z of [slot.top + 0.05, 3.5, 4.5]) expect(Math.abs(area(cut0, z) - area(cut1, z))).toBeLessThan(1e-4);

    rows.push(
      `| ${name} | ${fr(magnetNearest[0] as number, 3)} (formule ${fr(formula, 3)}) / ${fr(Math.min(...magnetNearest), 3)} | ${fr(magnetWall, 3)} | ${fr(holes.seat)} | ${fr(screwWall, 3)} (z ${fr(screwWallAt)}) | ${fr(slot.top)} | ${fr(bottomSkin, 3)} | ${fr(cutSkin, 3)} | ${fr(edgeSkin, 3)} | ${clips.placements.length} + ${clips.edges.length} |`,
    );
    for (const solid of [m1, m0, s1, s0, ...cut1, ...cut0]) solid.delete();
  }
  lines.push(
    "## Contraintes du pied de muret (moteur, profil substitué, qualité finale, réglages par défaut)",
    "",
    "- **Aimant** (ADR 0012) : 2 × 2, trou Ø 6,5 × 2,20 sous le croisement central. Point de poche le plus proche de l'axe, mesuré sur les sections sans aimant, à z = 0,05 puis le minimum de z = 0,05 à 2,10 ; « formule » : 4·√2 − (4 − retrait à z = 0). Vérifié : à chaque hauteur sous le plafond, la section perd exactement le disque (le trou est tout entier dans la matière), et rien au-dessus.",
    "- **Vis** (ADR 0006) : 3 × 3, vis de 3 / 6 mm, jeu 0,5, aux 4 croisements intérieurs, sans aimant. Assise au plus haut nombre de couches sous le pied de la pente haute. Vérifié : de z = 0,05 à l'assise, chaque section perd exactement les 4 trous (fraisure comprise). Paroi : point de poche le plus proche moins le rayon du trou à cette hauteur, minimum sous l'assise.",
    "- **Fentes de clip** (ADR 0010, 0018, 0022) : 2 × 2 coupé en 4 pièces d'une cellule (plateau de 50 mm), fentes sur les coupes et fentes de bord. Peau côté poche mesurée en travers de chaque fente, à mi-longueur, à z = 0,05, 0,5, 1,5 et haut − 0,05. Vérifié : rien de retiré au-dessus du haut de la fente.",
    "",
    "| Profil | Aimant : poche la plus proche à z = 0,05 / minimum (mm) | Paroi de l'aimant (mm) | Assise de la vis (mm) | Paroi de la vis sous l'assise (mm) | Haut de la fente (mm) | Peau de fente au fond (mm) | Peau min, coupes (mm) | Peau min, bords (mm) | Fentes coupes + bords |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
}, 180_000);

/** Écrit un 3MF, le relit, et vérifie chaque objet NoError ; renvoie la ligne du résultat. */
async function write3mf(file: string, mesh: TriangleMesh, note: string): Promise<string> {
  const bytes = serialize3mf([{ mesh, name: "baseplate" }], { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/poche-sans-biseau/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const object of content.objects) statuses.add((await checkMesh(object.mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : relu ${[...statuses].join(", ")}. ${note}.`;
}

it("fichiers à imprimer, et le moteur construit les mêmes 1 × 1", async () => {
  const wasm = await loadManifold();
  const files: string[] = [];
  const outputs: [file: string, profile: PocketProfile, note: string][] = [
    ["banc-1x1-sans-biseau.3mf", SANS_BISEAU, "variante à imprimer : paroi verticale au retrait 2,15 de 0 à 2,85, pente haute jusqu'au plat de 0,4"],
    ["banc-1x1-hybride.3mf", HYBRID_PROFILE, "référence : profil hybride du moteur (ADR 0002)"],
  ];
  for (const [file, profile, note] of outputs) {
    const plate = benchOf(wasm, profile);
    // Le moteur, sans fentes de bord, construit la même pièce (même volume à 0,01 mm³) ; avec ses 4 fentes de bord, l'emprise baisse.
    const [bare, slotted] = await Promise.all([
      engine(profile, { sizeMode: "cells", columns: 1, rows: 1 }, { clips: false }),
      engine(profile, { sizeMode: "cells", columns: 1, rows: 1 }),
    ]);
    expect(bare.stats.volume as number).toBeCloseTo(plate.volume(), 2);
    const slottedSolid = solidOf(wasm, slotted.mesh);
    const slottedFootprint = areaAt(slottedSolid, 1e-3);
    files.push(
      await write3mf(
        file,
        meshOf(plate),
        `${note} ; 1 × 1, ${fr(profile.height)} mm, ${fr(plate.volume(), 1)} mm³, emprise ${fr(areaAt(plate, 1e-3), 1)} mm² (le moteur, même volume sans fentes ; avec ses ${slotted.layout.clips?.edges.length ?? 0} fentes de bord : ${fr(slotted.stats.volume as number, 1)} mm³, emprise ${fr(slottedFootprint, 1)} mm²)`,
      ),
    );
  }
  lines.push("## Fichiers (relus, `NoError`)", "", ...files, "");
  flush();
}, 60_000);
