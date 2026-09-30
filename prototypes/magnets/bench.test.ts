// BANC JETABLE (#24) : logements d'aimants 6 × 2 mm sous les croisements des murets.
// Le banc perce ses propres trous dans les baseplates du moteur (packages/geometry), les
// mesure, puis vérifie que le moteur perce exactement les mêmes. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/magnets
import { mkdirSync, writeFileSync } from "node:fs";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import {
  generateBaseplate,
  pieceMesh,
  serialize3mf,
  type Baseplate,
  type BaseplateSettings,
  type GenerateOptions,
  type TriangleMesh,
} from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { insetAt, POCKET_PROFILES, type PocketProfileName } from "../../packages/geometry/src/pocket-profile";
import { roundUpToLayer } from "../../packages/geometry/src/print";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
/** Réécrit results.md avec ce que les tests ont mesuré jusqu'ici. */
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

// Cotes de départ (spec #20, ticket #24) : aimant 6 × 2 mm, Ø + jeu des trous (0,5 par
// défaut), profondeur 2 + 0,2 arrondie à la couche supérieure.
const MAGNET = 6;
const THICKNESS = 2;
const HOLE_GAP = 0.5;
const DEPTH_GAP = 0.2;
const LAYER = 0.2;
const DIAMETER = MAGNET + HOLE_GAP;
const DEPTH = roundUpToLayer(THICKNESS + DEPTH_GAP, LAYER);
const SEGMENTS = 64;
const O = 1; // débord des outils
/** Le moteur sans ses propres aimants (une fois qu'il les perce) : le banc perce les siens. */
const BARE: GenerateOptions = { magnets: false };

type Contours = [number, number][][];

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
}

function meshOf(solid: Manifold): TriangleMesh {
  expect(solid.status()).toBe("NoError");
  const { vertProperties, triVerts, numProp } = solid.getMesh();
  expect(numProp).toBe(3);
  return { positions: vertProperties, indices: triVerts };
}

/** Le trou d'un aimant sous le croisement (x, y) : un cylindre du dessous jusqu'à la profondeur. */
function holeTool(wasm: ManifoldToplevel, [x, y]: [number, number], diameter = DIAMETER, depth = DEPTH): Manifold {
  return wasm.Manifold.extrude(wasm.CrossSection.circle(diameter / 2, SEGMENTS), depth + O)
    .translate([x, y, -O]);
}

/** Aire du polygone du trou (celle que le banc et le moteur retirent vraiment). */
const holeArea = (diameter = DIAMETER) => (SEGMENTS / 2) * (diameter / 2) ** 2 * Math.sin((2 * Math.PI) / SEGMENTS);

/** Le solide entier d'une baseplate du moteur, pièces comprises. */
function wholeOf(wasm: ManifoldToplevel, baseplate: Baseplate): Manifold[] {
  return baseplate.pieces.map((piece) => solidOf(wasm, pieceMesh(baseplate, piece)));
}

/** Intervalles de matière (en t) le long de la demi-droite origin + t·dir, pair-impair sur les contours. */
function alongRay(contours: Contours, [ox, oy]: [number, number], [dx, dy]: [number, number]): [number, number][] {
  const ts: number[] = [];
  for (const contour of contours)
    for (let k = 0; k < contour.length; k++) {
      const [ax, ay] = contour[k] as [number, number];
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      const [ex, ey] = [bx - ax, by - ay];
      const det = dx * -ey - dy * -ex;
      if (Math.abs(det) < 1e-12) continue;
      const [rx, ry] = [ax - ox, ay - oy];
      const t = (rx * -ey - ry * -ex) / det;
      const s = (dx * ry - dy * rx) / det;
      if (s >= 0 && s < 1) ts.push(t);
    }
  ts.sort((a, b) => a - b);
  const intervals: [number, number][] = [];
  for (let k = 0; k + 1 < ts.length; k += 2) intervals.push([ts[k] as number, ts[k + 1] as number]);
  return intervals;
}

/** Distance du centre au premier vide le long d'une demi-droite, en partant de la matière à `from`. */
function reach(contours: Contours, centre: [number, number], dir: [number, number], from: number): number {
  const hit = alongRay(contours, centre, dir).find(([a, b]) => a <= from && from <= b);
  return hit ? hit[1] : 0;
}

/** Part du disque du trou couverte de matière dans une section : 1 quand il est entouré de matière. */
function share(wasm: ManifoldToplevel, section: CrossSection, [x, y]: [number, number], diameter = DIAMETER): number {
  const disc = wasm.CrossSection.circle(diameter / 2, 256).translate([x, y]);
  return disc.intersect(section).area() / disc.area();
}

const SQRT_HALF = Math.SQRT1_2;
/**
 * Les quatre diagonales, décalées de 0,01° : une demi-droite exactement à 45° passe par un
 * sommet du coin de poche, que l'arrondi peut compter deux fois ou pas du tout (l'écart sur
 * la paroi mesurée est de l'ordre de 10⁻⁸ mm).
 */
const DIAGONALS: [number, number][] = [45, 135, 225, 315].map((degrees) => {
  const angle = ((degrees + 0.01) * Math.PI) / 180;
  return [Math.cos(angle), Math.sin(angle)];
});

const NAMES: Record<PocketProfileName, string> = { hybrid: "hybride", flush: "ras" };
/** Hauteurs de référence du profil, plus le haut du trou et juste au-dessus. */
const HEIGHTS: Record<PocketProfileName, number[]> = {
  hybrid: [0.1, 0.7, 1.5, 2.1, 2.3, 2.9, 3.5, 4.5],
  flush: [0.1, 0.5, 1.5, 2.1, 2.3, 2.6, 3.5, 4.1],
};

it("croisement intérieur : le trou dans la matière, les poches et la pente haute intactes", async () => {
  const wasm = await loadManifold();
  const rows: string[] = [];
  for (const name of ["hybrid", "flush"] as const)
    for (const cellSize of [42, 20]) {
      const profile = POCKET_PROFILES[name];
      // 2 × 2 cellules sans marge : un seul croisement intérieur, en (0, 0).
      const plain = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, cellSize, pocketProfile: name }, "final", BARE);
      const [whole] = wholeOf(wasm, plain) as [Manifold];
      const holed = whole.subtract(holeTool(wasm, [0, 0]));
      // Retiré : exactement le trou, donc rien pris sur une poche.
      const removed = whole.volume() - holed.volume();
      expect(removed).toBeCloseTo(holeArea() * DEPTH, 3);
      for (const z of HEIGHTS[name]) {
        const [before, after] = [whole.slice(z), holed.slice(z)];
        const inHole = z < DEPTH;
        const lost = before.area() - after.area();
        // Hors du disque du trou, la section est intacte : les poches et la pente haute aussi.
        const disc = wasm.CrossSection.circle(DIAMETER / 2 + 1e-3, 256);
        const outside = before.subtract(after).subtract(disc).area();
        expect(outside).toBeLessThan(1e-6);
        // Le disque du trou est tout entier dans la matière : aucune entaille dans une poche.
        const breach = 1 - share(wasm, before, [0, 0]);
        if (inHole) expect(breach).toBeLessThan(1e-6);
        const contours = before.toPolygons() as Contours;
        const walls = DIAGONALS.map((dir) => reach(contours, [0, 0], dir, DIAMETER / 2) - DIAMETER / 2);
        const wall = Math.min(...walls);
        const arm = reach(contours, [0, 0], [1, 0], DIAMETER / 2);
        if (inHole) expect(lost).toBeCloseTo(holeArea(), 3);
        else expect(Math.abs(lost)).toBeLessThan(1e-6);
        const inset = insetAt(profile, z);
        rows.push(
          `| ${NAMES[name]} | ${cellSize} | ${fr(z)} | ${fr(inset)} | ${fr(4 * Math.SQRT2 - (profile.topRadius - inset), 3)} | ${inHole ? `${fr(wall, 3)} mm` : "au-dessus du trou"} | ${fr(arm, 1)} | ${inHole ? `${fr(breach * 100, 4)} %` : "—"} | ${fr(Math.max(0, lost), 3)} mm² | ${fr(outside, 6)} mm² |`,
        );
      }
      rows.push(`| | | | | | | | | retiré : ${fr(removed, 3)} mm³ | |`);
      if (name === "hybrid" && cellSize === 42) crossingSvg(wasm, holed, profile.height);
    }
  lines.push(
    "## Cotes",
    "",
    `Trou : Ø ${fr(DIAMETER)} mm (aimant de ${MAGNET} mm + jeu des trous de ${fr(HOLE_GAP, 1)} mm), profondeur ${fr(DEPTH)} mm (${THICKNESS} mm + ${fr(DEPTH_GAP, 1)} mm, arrondi à la couche de ${fr(LAYER, 1)}), ouvert en dessous, sous le croisement des murets. Polygone de ${SEGMENTS} côtés : ${fr(holeArea(), 3)} mm², soit ${fr(holeArea() * DEPTH, 3)} mm³ par trou.`,
    "",
    "## Croisement intérieur (2 × 2 cellules, trou en (0, 0))",
    "",
    "Retrait : distance de la paroi de la poche au bord de la cellule. Coin de poche : distance du centre du croisement au plus proche point de poche, 4·√2 − (4 − retrait). Paroi en diagonale : matière entre le trou et le coin de poche, sur les quatre diagonales (la plus mince). Muret plein : matière continue le long du muret, depuis le centre du croisement. Entaille : part du disque du trou qui tombe hors de la matière (dans une poche). Perdu hors du disque : matière retirée ailleurs que dans le trou.",
    "",
    "| Profil | Cellule (mm) | z (mm) | Retrait (mm) | Coin de poche (mm) | Paroi en diagonale | Muret plein sur (mm) | Entaille | Section retirée | Perdu hors du disque |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
});

/** Coupe horizontale au milieu du trou, autour du croisement : SVG pour le README. */
function crossingSvg(wasm: ManifoldToplevel, holed: Manifold, height: number) {
  const scale = 40;
  const half = 8;
  const z = 1.5;
  const section = holed.slice(z);
  const window = section.intersect(wasm.CrossSection.square([2 * half, 2 * half], true));
  const path = (window.toPolygons() as Contours)
    .map((c) => `M${c.map(([x, y]) => `${((x + half) * scale).toFixed(1)},${((half - y) * scale).toFixed(1)}`).join("L")}Z`)
    .join("");
  const size = 2 * half * scale;
  const c = half * scale;
  const d = (DIAMETER / 2) * SQRT_HALF * scale;
  const pocket = (4 * Math.SQRT2 - (4 - 2.15)) * SQRT_HALF * scale;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 24}" font-family="sans-serif" font-size="11">`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
    `<path d="${path}" fill="#c9d3dc" stroke="#334" stroke-width="1" fill-rule="evenodd"/>`,
    `<line x1="${c + d}" y1="${c - d}" x2="${c + pocket}" y2="${c - pocket}" stroke="#e8743b" stroke-width="3"/>`,
    `<text x="${c + pocket + 4}" y="${c - pocket - 4}" fill="#8a3a12">paroi ${fr(4 * Math.SQRT2 - (4 - 2.15) - DIAMETER / 2, 2)} mm</text>`,
    `<text x="4" y="${size + 16}" fill="#334">coupe à z = ${fr(z)} (hauteur ${fr(height)}), 16 × 16 mm autour du croisement, trou Ø ${fr(DIAMETER)}</text>`,
    `</svg>`,
  ].join("\n");
  writeFileSync(new URL("files/coupe-croisement-hybride.svg", OUT), svg);
}

it("croisements du bord : la marge porte-t-elle le trou ?", async () => {
  const wasm = await loadManifold();
  const rows: string[] = [];
  const cases: [string, Partial<BaseplateSettings>][] = [
    ["cadre à traverses, marge 15", { marginShape: "frame", marginWidth: 30, marginDepth: 30 }],
    ["équerres, marge 15", { marginShape: "brackets", marginWidth: 30, marginDepth: 30 }],
    ["cellules tronquées, marge 15", { marginShape: "cells", marginWidth: 30, marginDepth: 30 }],
    ["cellules tronquées, marge 8", { marginShape: "cells", marginWidth: 16, marginDepth: 16 }],
    ["cellules tronquées, marge 4", { marginShape: "cells", marginWidth: 8, marginDepth: 8 }],
    ["sans marge", { marginWidth: 0, marginDepth: 0 }],
  ];
  for (const [label, margin] of cases) {
    // 3 × 2 cellules centrées : bord avant de la grille en y = −42, croisement du milieu du
    // bord en (−21, −42), coin de la grille en (−63, −42).
    const plain = await generateBaseplate({ sizeMode: "cells", columns: 3, rows: 2, ...margin }, "final", BARE);
    const [whole] = wholeOf(wasm, plain) as [Manifold];
    const at = (z: number, point: [number, number]) => share(wasm, whole.slice(z), point);
    for (const [where, point] of [
      ["milieu du bord", [-21, -42]],
      ["coin de la grille", [-63, -42]],
    ] as const) {
      const [low, high, roof] = [at(1.5, point), at(DEPTH - 0.1, point), at(DEPTH + 0.1, point)];
      // Distance du croisement au contour, du côté de la marge avant (le plus proche ici).
      const edge = point[1] + plain.stats.dimensions.depth / 2;
      const held = low > 1 - 1e-6 && high > 1 - 1e-6 && roof > 1 - 1e-6;
      rows.push(
        `| ${label} | ${where} | ${fr(edge)} | ${fr(edge - DIAMETER / 2)} | ${fr(low * 100, 1)} % | ${fr(high * 100, 1)} % | ${fr(roof * 100, 1)} % | ${held ? "oui" : "non"} |`,
      );
    }
  }
  lines.push(
    "## Croisements du bord de la grille (3 × 2 cellules, hybride)",
    "",
    `Part du disque du trou (Ø ${fr(DIAMETER)}) couverte de matière, sur la baseplate sans trou : à mi-hauteur du trou (z = 1,50), en haut du trou (z = ${fr(DEPTH - 0.1)}) et juste au-dessus (z = ${fr(DEPTH + 0.1)}, le plafond du trou). Tenu : 100 % aux trois hauteurs.`,
    "",
    "| Marge (mm par côté) | Croisement | Au contour (mm) | Paroi côté contour (mm) | z = 1,50 | haut du trou | plafond | Tenu |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
});

it("cohabitation avec les coupes, les fentes de clip et les numéros gravés", async () => {
  const wasm = await loadManifold();
  const rows: string[] = [];
  const cases: [string, Partial<BaseplateSettings>, { width: number; depth: number }][] = [
    ["tiroir par défaut, plateau 256", {}, { width: 256, depth: 256 }],
    ["tiroir 150 × 110, cellules de 20, plateau 70", { drawerWidth: 150, drawerDepth: 110, cellSize: 20 }, { width: 70, depth: 70 }],
  ];
  for (const [label, settings, plate] of cases) {
    const cut = await generateBaseplate(settings, "final", { ...BARE, buildPlate: plate });
    const { columns, rows: gridRows, cellSize, split } = cut.layout;
    const x0 = -cut.stats.dimensions.width / 2 + cut.layout.margins.left;
    const y0 = -cut.stats.dimensions.depth / 2 + cut.layout.margins.front;
    const crossings: [number, number][] = [];
    for (let a = 1; a < columns; a++)
      for (let b = 1; b < gridRows; b++)
        if (!split.columnCuts.includes(a) && !split.rowCuts.includes(b)) crossings.push([x0 + a * cellSize, y0 + b * cellSize]);
    const holes = wasm.Manifold.compose(crossings.map((point) => holeTool(wasm, point)));
    const pieces = wholeOf(wasm, cut);
    const removed = pieces.reduce((sum, piece) => sum + piece.volume() - piece.subtract(holes).volume(), 0);
    // Chaque trou retire tout son volume : il ne croise ni une fente, ni un numéro, ni une poche.
    expect(removed).toBeCloseTo(crossings.length * holeArea() * DEPTH, 2);
    rows.push(
      `| ${label} | ${cut.stats.pieces} | ${cut.stats.clips} | ${columns - 1} × ${gridRows - 1} = ${(columns - 1) * (gridRows - 1)} | ${crossings.length} | ${fr(removed, 2)} mm³ | ${fr(crossings.length * holeArea() * DEPTH, 2)} mm³ |`,
    );
  }
  lines.push(
    "## Cohabitation (hybride, découpe pour le plateau)",
    "",
    "Trous sur les croisements intérieurs, sauf ceux d'une ligne coupée. Le volume retiré est exactement celui des trous : aucun ne mord sur une fente de clip, un numéro gravé ou une poche.",
    "",
    "| Cas | Pièces | Clips | Croisements intérieurs | Aimants | Retiré | Trous × volume |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
  );
  flush();
});

/** Écrit un 3MF, le relit, et vérifie chaque objet NoError ; renvoie la ligne du résultat. */
async function write3mf(file: string, objects: { mesh: TriangleMesh; name: string }[], note: string): Promise<string> {
  const bytes = serialize3mf(objects, { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/magnets/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const { mesh } of content.objects) statuses.add((await checkMesh(mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : ${content.objectNames.join(", ")} ; relus ${[...statuses].join(", ")}. ${note}.`;
}

it("fichiers de la recette : kit de jeux, bancs 2 × 2, et le moteur perce les mêmes trous", async () => {
  const wasm = await loadManifold();
  const files: string[] = [];
  // Kit de jeux : 4 croisements réels de 14 × 14 mm, découpés dans une 2 × 2 hybride, percés
  // de Ø 6,1 / 6,2 / 6,3 / 6,5 : on y essaie l'aimant, serré ou collé.
  const gaps = [0.1, 0.2, 0.3, 0.5];
  const plain = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "final", BARE);
  const [whole] = wholeOf(wasm, plain) as [Manifold];
  const chunk = whole.intersect(wasm.Manifold.cube([14, 14, 10], true));
  const kit = gaps.map((gap, k) => ({
    mesh: meshOf(chunk.subtract(holeTool(wasm, [0, 0], MAGNET + gap)).translate([k * 20, 0, 0])),
    name: `jeu ${fr(gap)} (Ø ${fr(MAGNET + gap)})`,
  }));
  files.push(await write3mf("kit-jeux-aimants.3mf", kit, `4 croisements de 14 × 14 mm, trous de ${fr(DEPTH)} mm, jeux ${gaps.map((g) => fr(g)).join(" / ")} de gauche à droite`));

  // Bancs 2 × 2 percés par le moteur : hybride et ras (1 aimant au centre), et hybride avec une
  // marge de cellules tronquées de 8 mm, qui porte les 8 croisements du bord.
  const benches: [string, Partial<BaseplateSettings>, number][] = [
    ["banc-2x2-hybride.3mf", { sizeMode: "cells", columns: 2, rows: 2 }, 1],
    ["banc-2x2-ras.3mf", { sizeMode: "cells", columns: 2, rows: 2, pocketProfile: "flush" }, 1],
    ["banc-2x2-marge-cellules.3mf", { sizeMode: "cells", columns: 2, rows: 2, marginShape: "cells", marginWidth: 16, marginDepth: 16 }, 9],
  ];
  for (const [file, settings, count] of benches) {
    const [engine, bare] = await Promise.all([generateBaseplate(settings, "final"), generateBaseplate(settings, "final", BARE)]);
    expect(engine.stats.magnets).toBe(count);
    // Le moteur retire le même trou que le banc, à chaque aimant.
    const [bareSolid] = wholeOf(wasm, bare) as [Manifold];
    const bench = bareSolid.subtract(wasm.Manifold.compose(engine.layout.magnets.map((point) => holeTool(wasm, point))));
    const perMagnet = ((bare.stats.volume as number) - (engine.stats.volume as number)) / count;
    expect(perMagnet).toBeCloseTo(holeArea() * DEPTH, 2);
    expect(engine.stats.volume as number).toBeCloseTo(bench.volume(), 2);
    files.push(
      await write3mf(
        file,
        [{ mesh: engine.mesh, name: "baseplate" }],
        `${count} aimant${count > 1 ? "s" : ""}, ${fr(perMagnet, 3)} mm³ retirés par aimant, comme le banc ; volume ${fr((engine.stats.volume as number) / 1000)} cm³ (${fr((bare.stats.volume as number) / 1000)} cm³ sans trous)`,
      ),
    );
  }
  lines.push("## Fichiers", "", ...files, "");
  flush();
});
