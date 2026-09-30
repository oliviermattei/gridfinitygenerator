// BANC JETABLE (#22) : clip en U inséré par-dessous dans le pied des murets, à cheval sur
// une coupe. Géométrie propre au banc (le moteur la reprend ensuite), mesurée sur les pièces
// du moteur (packages/geometry). Lancer depuis la racine du dépôt :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/clips
import { writeFileSync } from "node:fs";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, pieceMesh, printClips, printPieces, serialize3mf, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { insetAt, POCKET_PROFILES, type PocketProfile, type PocketProfileName } from "../../packages/geometry/src/pocket-profile";
import { roundDownToLayer, roundUpToLayer } from "../../packages/geometry/src/print";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
const lines: string[] = [];
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

// Enveloppe de départ (spec #20, ticket #22).
/** Demi-largeur de la fente de chaque côté de la coupe : 2,15 − 0,8 de peau. */
const HALF_WIDTH = 1.35;
/** Demi-dent : ce que chaque pièce garde contre la coupe, entre les jambes du clip. */
const TOOTH = 0.5;
/** Longueur de la fente le long de la coupe. */
const LENGTH = 5;
/** Hauteur du canal du pont, sous la dent, avant l'arrondi à la couche. */
const BRIDGE = 0.8;
/** Jeu en long (par bout) et en hauteur du clip. */
const GAP_ALONG = 0.25;
const GAP_UP = 0.2;
/** Chanfrein d'entrée en haut des jambes. */
const LEAD = 0.15;
/** Les 4 jeux en travers du kit, par face. */
const GAPS = [0.05, 0.1, 0.15, 0.2];
/** Positions des 4 fentes le long de la coupe, loin des numéros gravés au milieu (y de −1,5 à 1,5). */
const SLOTS_Y = [-13, -6, 6, 13];
const LAYER = 0.2;
const O = 1; // débord des outils

interface Levels {
  /** Haut du canal du pont (bas de la dent), sur la couche. */
  bridge: number;
  /** Haut de la fente : pied de la pente haute de la poche, arrondi à la couche inférieure. */
  top: number;
}

function levelsOf(profile: PocketProfile): Levels {
  const foot = profile.points[profile.points.length - 2] as readonly [number, number];
  return { bridge: roundUpToLayer(BRIDGE, LAYER), top: roundDownToLayer(foot[0], LAYER) };
}

/** Prisme d'un profil (u en travers de la coupe, v vers le haut) le long de Y, centré en y. */
function prismAlongY(wasm: ManifoldToplevel, profile: [number, number][], length: number, y: number): Manifold {
  const section: CrossSection = new wasm.CrossSection([profile]);
  // rotate([90, 0, 0]) : (u, v, w) → (u, −w, v) ; w de 0 à length devient y de −length à 0.
  return wasm.Manifold.extrude(section, length).rotate([90, 0, 0]).translate([0, y + length / 2, 0]);
}

/** La fente des deux côtés de la coupe x = 0 : un canal sous la dent, et une fente de jambe de chaque côté. */
function slotProfile({ bridge, top }: Levels): [number, number][] {
  const [w, t] = [HALF_WIDTH, TOOTH];
  return [
    [-w, -O],
    [w, -O],
    [w, top],
    [t, top],
    [t, bridge],
    [-t, bridge],
    [-t, top],
    [-w, top],
  ];
}

/** Profil du clip pour un jeu en travers `gap` : U à l'envers, pont en bas, jambes chanfreinées en haut. */
function clipProfile({ bridge, top }: Levels, gap: number): [number, number][] {
  const w = HALF_WIDTH - gap;
  const t = TOOTH + gap;
  const [b, h, k] = [bridge - GAP_UP, top - GAP_UP, LEAD];
  return [
    [-w, 0],
    [w, 0],
    [w, h - k],
    [w - k, h],
    [t + k, h],
    [t, h - k],
    [t, b],
    [-t, b],
    [-t, h - k],
    [-t - k, h],
    [-w + k, h],
    [-w, h - k],
  ];
}

function meshOf(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts, numProp } = solid.getMesh();
  expect(numProp).toBe(3);
  return { positions: vertProperties, indices: triVerts };
}

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

/** Intervalles de matière d'une section le long de la droite y = y0 (pair-impair sur les contours). */
function solidAlong(contours: [number, number][][], y0: number): [number, number][] {
  const xs: number[] = [];
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const [ax, ay] = contour[k] as [number, number];
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      if (ay <= y0 !== by <= y0) xs.push(ax + ((y0 - ay) * (bx - ax)) / (by - ay));
    }
  xs.sort((a, b) => a - b);
  const intervals: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) intervals.push([xs[k] as number, xs[k + 1] as number]);
  return intervals;
}

function area(contours: [number, number][][]): number {
  let sum = 0;
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const [ax, ay] = contour[k] as [number, number];
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      sum += ax * by - bx * ay;
    }
  return sum / 2;
}

const HEIGHTS: Record<PocketProfileName, number[]> = {
  // Hauteurs de référence du profil hybride (test/support/measure.ts), plus le haut de la fente.
  hybrid: [0.1, 0.7, 1.5, 2.7, 2.9, 3.5, 4.5],
  flush: [0.1, 0.5, 1.5, 2.3, 2.5, 3.5, 4.1],
};

const NAMES: Record<PocketProfileName, string> = { hybrid: "hybride", flush: "ras" };

it("kits de clips : fentes, peau restante, invisibilité, clips à 4 jeux", async () => {
  const wasm = await loadManifold();
  lines.push(
    "## Cotes",
    "",
    `Fente : ±${fr(HALF_WIDTH)} mm de part et d'autre de la coupe, ${fr(LENGTH, 1)} mm de long ; demi-dent de ${fr(TOOTH)} mm ; canal du pont sur ${fr(roundUpToLayer(BRIDGE, LAYER))} mm (couches de ${fr(LAYER, 1)}). Clip : jeu de ${fr(GAP_ALONG)} mm par bout en long, ${fr(GAP_UP, 1)} mm en hauteur, chanfrein d'entrée de ${fr(LEAD)} mm en haut des jambes.`,
    "",
  );
  const skins: string[] = [];
  const clipsTable: string[] = [];
  for (const name of ["hybrid", "flush"] as const) {
    const profile = POCKET_PROFILES[name];
    const levels = levelsOf(profile);
    // 2 × 1 cellules sur un plateau de 50 mm : deux pièces d'une cellule, coupe en x = 0,
    // numéros gravés au milieu de la coupe (y de −1,5 à 1,5), un de chaque côté.
    const kit = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 1, pocketProfile: name, clips: false }, "final", {
      buildPlate: { width: 50, depth: 50 },
    });
    expect(kit.stats.pieces).toBe(2);
    expect(kit.layout.split.columnCuts).toEqual([1]);
    const slots = wasm.Manifold.compose(SLOTS_Y.map((y) => prismAlongY(wasm, slotProfile(levels), LENGTH, y)));
    const pieces = kit.pieces.map((piece) => {
      const whole = solidOf(wasm, pieceMesh(kit, piece));
      return { whole, slotted: whole.subtract(slots), number: piece.number };
    });
    const slotVolume = pieces.reduce((sum, { whole, slotted }) => sum + whole.volume() - slotted.volume(), 0) / SLOTS_Y.length;
    // Exactement la fente : elle ne mord ni sur une poche, ni sur un numéro gravé.
    const { bridge, top } = levels;
    expect(slotVolume).toBeCloseTo(2 * (HALF_WIDTH * LENGTH * bridge + (HALF_WIDTH - TOOTH) * LENGTH * (top - bridge)), 3);

    // Peau côté poche, dans la pièce de gauche (x < 0), au droit d'une fente (y = 6).
    for (const z of HEIGHTS[name]) {
      const { whole, slotted } = pieces[0] as (typeof pieces)[number];
      const cut = slotted.slice(z);
      const plain = whole.slice(z);
      const along = solidAlong(cut.toPolygons() as [number, number][][], 6).filter(([, b]) => b > -5);
      const lost = area(plain.toPolygons() as [number, number][][]) - area(cut.toPolygons() as [number, number][][]);
      cut.delete();
      plain.delete();
      // La matière contre la poche, la plus à gauche des intervalles près de la coupe.
      const [pocketSide] = along;
      const wall = insetAt(profile, z);
      const skin = pocketSide ? Math.min(pocketSide[1], -HALF_WIDTH) - pocketSide[0] : 0;
      const slotHere = z < levels.top;
      if (slotHere) expect(skin).toBeGreaterThanOrEqual(0.8 - 1e-3);
      else expect(Math.abs(lost)).toBeLessThan(1e-6);
      skins.push(
        `| ${NAMES[name]} | ${fr(z)} | ${fr(wall)} | ${along.map(([a, b]) => `${fr(a)} → ${fr(b)}`).join(" ; ")} | ${slotHere ? `${fr(skin, 3)} mm` : "fente absente, section intacte"} | ${fr(Math.max(0, lost), 3)} mm² |`,
      );
    }

    // Coupe verticale au milieu d'une fente (y = 6), clip de jeu 0,1 en place : SVG pour le README.
    {
      const scale = 40;
      const [x0, x1, z1] = [-4, 4, profile.height];
      const toSvg = (contours: [number, number][][]) =>
        contours.filter((c) => c.length > 2).map((c) => `M${c.map(([u, v]) => `${((u - x0) * scale).toFixed(1)},${((z1 + 0.3 - v) * scale).toFixed(1)}`).join("L")}Z`).join("");
      const vertical = (solid: Manifold) => {
        // rotate([−90, 0, 0]) : (x, y, z) → (x, z, −y) ; la tranche à −y0 donne (x, z).
        const section = solid.rotate([-90, 0, 0]).slice(-6);
        return (section.toPolygons() as [number, number][][]).map((c) => c.filter(([u]) => u >= x0 - 1 && u <= x1 + 1));
      };
      const walls = pieces.map(({ slotted }) => toSvg(vertical(slotted))).join("");
      const clip = toSvg([clipProfile(levels, 0.1)]);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(x1 - x0) * scale} ${(z1 + 0.6) * scale}" font-family="sans-serif" font-size="11">`,
        `<rect width="100%" height="100%" fill="#fff"/>`,
        `<path d="${walls}" fill="#c9d3dc" stroke="#334" stroke-width="1" fill-rule="evenodd"/>`,
        `<path d="${clip}" fill="#e8743b" fill-opacity="0.85" stroke="#8a3a12" stroke-width="1"/>`,
        `<line x1="${-x0 * scale}" y1="0" x2="${-x0 * scale}" y2="${(z1 + 0.6) * scale}" stroke="#888" stroke-dasharray="4 3"/>`,
        `<line x1="0" y1="${(z1 + 0.3 - levels.top) * scale}" x2="${(x1 - x0) * scale}" y2="${(z1 + 0.3 - levels.top) * scale}" stroke="#2a7" stroke-dasharray="2 3"/>`,
        `<text x="4" y="${(z1 + 0.3 - levels.top) * scale - 4}" fill="#2a7">z ${fr(levels.top)}</text>`,
        `<text x="4" y="14" fill="#334">coupe verticale au milieu d'une fente, profil ${NAMES[name]} ; clip (jeu 0,10) en orange</text>`,
        `</svg>`,
      ].join("\n");
      writeFileSync(new URL(`files/coupe-fente-${NAMES[name]}.svg`, OUT), svg);
    }

    // Les clips du kit, un par jeu, couchés sur le côté (profil dans XY, longueur selon Z).
    const clips = GAPS.map((gap, k) => {
      const clip = wasm.Manifold.extrude(new wasm.CrossSection([clipProfile(levels, gap)]), LENGTH - 2 * GAP_ALONG).translate([
        60 + k * 5,
        -10,
        0,
      ]);
      return { gap, clip };
    });
    for (const { gap, clip } of clips) {
      const box = clip.boundingBox();
      const legs = HALF_WIDTH - TOOTH - 2 * gap;
      clipsTable.push(
        `| ${NAMES[name]} | ${fr(gap)} | ${fr(box.max[0] - box.min[0])} × ${fr(box.max[1] - box.min[1])} × ${fr(box.max[2] - box.min[2])} | ${fr(legs)} | ${fr(2 * (TOOTH + gap))} | ${fr(levels.bridge - GAP_UP)} | ${fr(clip.volume(), 1)} mm³ | ${fr(2 * gap)} mm |`,
      );
    }

    // Le kit en 3MF : les deux pièces fendues et les 4 clips, relus NoError.
    const objects = [
      ...pieces.map(({ slotted, number }) => ({ mesh: meshOf(slotted), name: `pièce ${number}` })),
      ...clips.map(({ gap, clip }) => ({ mesh: meshOf(clip), name: `clip jeu ${fr(gap)}` })),
    ];
    const file = `kit-clips-${NAMES[name]}.3mf`;
    const bytes = serialize3mf(objects, {
      name: file.replace(/\.3mf$/, ""),
      shareLink: `prototypes/clips/bench.test.ts : kit de clips, profil ${NAMES[name]}, jeux ${GAPS.map((g) => fr(g)).join(" / ")} mm`,
    });
    writeFileSync(new URL(`files/${file}`, OUT), bytes);
    const content = readThreeMf(bytes);
    const statuses = new Set<string>();
    for (const { mesh } of content.objects) statuses.add((await checkMesh(mesh)).status);
    expect([...statuses]).toEqual(["NoError"]);
    lines.push(
      `- \`files/${file}\` : ${content.objectNames.join(", ")} ; relus ${[...statuses].join(", ")}. Fente ${NAMES[name]} : canal jusqu'à ${fr(levels.bridge)} mm, jambes jusqu'à ${fr(levels.top)} mm ; ${fr(slotVolume)} mm³ retirés par clip (les deux pièces).`,
    );
    for (const { whole, slotted } of pieces) {
      whole.delete();
      slotted.delete();
    }
    for (const { clip } of clips) clip.delete();
    slots.delete();
  }
  lines.push(
    "",
    "## Peau restante côté poche (pièce de gauche, au droit d'une fente)",
    "",
    "Matière le long de la droite y = 6 mm (au milieu d'une fente), en x (la coupe en x = 0, la poche à gauche). Retrait de la poche : distance de la paroi au bord de la cellule.",
    "",
    "| Profil | z (mm) | Retrait de la poche (mm) | Matière en x (mm) | Peau côté poche | Section retirée |",
    "|---|---|---|---|---|---|",
    ...skins,
    "",
    "## Clips du kit",
    "",
    "Dimensions telles qu'imprimées, couché sur le côté : largeur en travers de la coupe × hauteur en service × longueur le long de la coupe.",
    "",
    "| Profil | Jeu par face (mm) | Encombrement (mm) | Jambe (mm) | Écart des jambes (mm) | Pont (mm) | Volume | Ouverture possible de la coupe |",
    "|---|---|---|---|---|---|---|---|",
    ...clipsTable,
    "",
  );
});

it("fichier du moteur : 2 × 2 cellules en 2 pièces, avec ses clips, tel que le site l'exporte", async () => {
  const settings = { sizeMode: "cells", columns: 2, rows: 2 } as const;
  const plate = { width: 90, depth: 50 };
  const cut = await generateBaseplate(settings, "final", { buildPlate: plate });
  const plain = await generateBaseplate({ ...settings, clips: false }, "final", { buildPlate: plate });
  expect(cut.stats.pieces).toBe(2);
  // Le moteur retire la même fente que le banc : 27,80 mm³ par clip en hybride à 0,2.
  const perClip = ((plain.stats.volume as number) - (cut.stats.volume as number)) / cut.stats.clips;
  expect(perClip).toBeCloseTo(27.8, 2);
  const pieces = printPieces(cut);
  const clips = printClips(cut, pieces) as TriangleMesh;
  const file = "coupe-2x2-en-2-pieces-avec-clips.3mf";
  const bytes = serialize3mf(
    [...pieces.map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` })), { mesh: clips, name: `clip × ${cut.stats.clips}` }],
    { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/clips/bench.test.ts : 2 × 2 cellules, plateau de ${plate.width} × ${plate.depth} mm` },
  );
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const { mesh } of content.objects) statuses.add((await checkMesh(mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  lines.push(
    "## Fichier du moteur",
    "",
    `- \`files/${file}\` : ${content.objectNames.join(", ")} ; relus ${[...statuses].join(", ")}. ${fr(perClip)} mm³ retirés par clip, comme le banc ; volume ${fr((cut.stats.volume as number) / 1000)} cm³ (${fr((plain.stats.volume as number) / 1000)} cm³ sans clips).`,
    "",
  );
  writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
});
