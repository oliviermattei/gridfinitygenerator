// BANC JETABLE (#29) : marge minimale et grille prolongée. Pour chaque forme de marge, la marge
// réduite à ses appuis telle que le moteur la construit (variante A), et deux variantes d'appui
// construites par booléens sur son maillage (hauteur, largeur, talon, mur prolongé), à imprimer
// pour la recette (#16). Volumes, surplus sur la grille seule et contact avec les parois du
// tiroir mesurés sur les maillages ; chaque 3MF est relu et reconstruit avec manifold (NoError).
// Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/minimal-margin
import { mkdirSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import { generateBaseplate, serialize3mf, type Baseplate, type BaseplateSettings, type TriangleMesh } from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { badEdges, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

/**
 * Le banc : 3 × 2 cellules, 12 mm de marge sur les quatre côtés (150 × 108 mm), qualité finale,
 * sans découpe. Chaque côté a ses deux appuis, sur la première et la dernière ligne de la grille.
 */
const BENCH: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 24, marginDepth: 24 };
const [W, D] = [150, 108];
/** La grille : ±63 × ±42 mm ; le pied d'un muret, 5,70 mm ; le mur, 1,2 mm (3 lignes de 0,4). */
const [X0, Y0] = [-63, -42];
const FOOT = 5.7;
const WALL = 1.2;
const H = 4.6;

let wasm: ManifoldToplevel;
const solidOf = ({ positions, indices }: TriangleMesh): Manifold => new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
const meshOf = (solid: Manifold): TriangleMesh => {
  const { vertProperties, triVerts } = solid.getMesh();
  return { positions: vertProperties, indices: triVerts };
};
/** Une boîte [x0, x1] × [y0, y1] × [z0, z1]. */
const box = (x0: number, x1: number, y0: number, y1: number, z0 = -1, z1 = H + 1): Manifold =>
  wasm.Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
/** Le contour du banc (coins de 4 mm), en prisme : les ajouts ne débordent jamais du tiroir. */
const outline = (): Manifold => {
  const r = 4;
  const section = wasm.CrossSection.square([W - 2 * r, D - 2 * r], true).offset(r, "Round", 2, 128);
  return wasm.Manifold.extrude(section, H + 2).translate([0, 0, -1]);
};

/** Les boîtes des appuis de chaque côté, par ligne d'appui : `across(x)` à l'arrière et à l'avant, `along(y)` à gauche et à droite. */
function supports(across: (x: number, side: 1 | -1) => Manifold, along: (y: number, side: 1 | -1) => Manifold): Manifold {
  const parts: Manifold[] = [];
  for (const side of [1, -1] as const) {
    for (const x of [X0, -X0]) parts.push(across(x, side));
    for (const y of [Y0, -Y0]) parts.push(along(y, side));
  }
  return wasm.Manifold.union(parts);
}

/** Longueur du contour de la première couche posée contre les parois du tiroir (à 0,01 mm près), par côté. */
function contact(solid: Manifold): { x: number; y: number } {
  const section = solid.slice(0.1);
  let [x, y] = [0, 0];
  for (const polygon of section.toPolygons()) {
    polygon.forEach(([ax, ay], k) => {
      const [bx, by] = polygon[(k + 1) % polygon.length] as [number, number];
      const length = Math.hypot(bx - ax, by - ay);
      if (Math.abs(Math.abs(ax) - W / 2) < 0.01 && Math.abs(Math.abs(bx) - W / 2) < 0.01) x += length;
      if (Math.abs(Math.abs(ay) - D / 2) < 0.01 && Math.abs(Math.abs(by) - D / 2) < 0.01) y += length;
    });
  }
  section.delete();
  return { x, y };
}

interface Variant {
  file: string;
  name: string;
  /** Ce que la variante change à la marge du moteur. */
  change: string;
  settings: Partial<BaseplateSettings>;
  /** Le maillage du moteur modifié ; absent : tel quel. */
  edit?: (solid: Manifold) => Manifold;
}

const variants: Variant[] = [
  // Cadre : traverse pleine hauteur de 3 lignes et morceau de mur de 5,70 mm (moteur).
  { file: "banc-cadre-minimal-A-moteur", name: "Cadre minimal A", change: "moteur : traverse et mur pleine hauteur, 1,2 mm (3 lignes)", settings: { marginShape: "frame", minimalMargin: true } },
  {
    file: "banc-cadre-minimal-B-2mm",
    name: "Cadre minimal B",
    change: "appuis à 2,00 mm de haut, comme le cadre complet",
    settings: { marginShape: "frame", minimalMargin: true },
    edit: (solid) => solid.subtract(box(-W, W, -D, D, 2, H + 1).subtract(box(X0, -X0, Y0, -Y0))),
  },
  {
    file: "banc-cadre-minimal-C-5-lignes",
    name: "Cadre minimal C",
    change: "traverse et mur de 2,0 mm (5 lignes)",
    settings: { marginShape: "frame", minimalMargin: true },
    edit: (solid) =>
      solid.add(
        supports(
          (x, side) => {
            const inward = x < 0 ? 1 : -1;
            const [a, b] = inward > 0 ? [x, x + 2] : [x - 2, x];
            const [c, d] = side > 0 ? [-Y0, D / 2] : [-D / 2, Y0];
            const [f0, f1] = inward > 0 ? [x, x + FOOT] : [x - FOOT, x];
            const [w0, w1] = side > 0 ? [D / 2 - 2, D / 2] : [-D / 2, -D / 2 + 2];
            return box(a, b, c, d).add(box(f0, f1, w0, w1));
          },
          (y, side) => {
            const inward = y < 0 ? 1 : -1;
            const [a, b] = inward > 0 ? [y, y + 2] : [y - 2, y];
            const [c, d] = side > 0 ? [-X0, W / 2] : [-W / 2, X0];
            const [f0, f1] = inward > 0 ? [y, y + FOOT] : [y - FOOT, y];
            const [w0, w1] = side > 0 ? [W / 2 - 2, W / 2] : [-W / 2, -W / 2 + 2];
            return box(c, d, a, b).add(box(w0, w1, f0, f1));
          },
        ).intersect(outline()),
      ),
  },
  // Cellules : la première et la dernière cellule tronquée de chaque côté, fermées (moteur).
  { file: "banc-cellules-minimal-A-moteur", name: "Cellules minimales A", change: "moteur : première et dernière cellule tronquée, murets entiers, mur de 1,2 mm", settings: { marginShape: "cells", minimalMargin: true } },
  {
    file: "banc-cellules-minimal-B-2mm",
    name: "Cellules minimales B",
    change: "cellules d'appui à 2,00 mm de haut",
    settings: { marginShape: "cells", minimalMargin: true },
    edit: (solid) => solid.subtract(box(-W, W, -D, D, 2, H + 1).subtract(box(X0, -X0, Y0, -Y0))),
  },
  {
    file: "banc-cellules-minimal-C-mur-prolonge",
    name: "Cellules minimales C",
    change: "mur extérieur prolongé de 10 mm vers le milieu de chaque côté",
    settings: { marginShape: "cells", minimalMargin: true },
    edit: (solid) =>
      solid.add(
        supports(
          (x, side) => {
            // Au-delà de la cellule d'appui et de son muret : 42 + 2,85 mm depuis la ligne d'appui.
            const from = x < 0 ? x + 42 + FOOT / 2 : x - 42 - FOOT / 2;
            const [a, b] = x < 0 ? [from - 0.1, from + 10] : [from - 10, from + 0.1];
            return box(a, b, side > 0 ? D / 2 - WALL : -D / 2, side > 0 ? D / 2 : -D / 2 + WALL);
          },
          (y, side) => {
            const from = y < 0 ? y + 42 + FOOT / 2 : y - 42 - FOOT / 2;
            const [a, b] = y < 0 ? [from - 0.1, from + 10] : [from - 10, from + 0.1];
            return box(side > 0 ? W / 2 - WALL : -W / 2, side > 0 ? W / 2 : -W / 2 + WALL, a, b);
          },
        ).intersect(outline()),
      ),
  },
  // Grille prolongée : les murets de la première et de la dernière ligne, et leurs talons (moteur).
  { file: "banc-grille-minimale-A-moteur", name: "Grille minimale A", change: "moteur : murets d'appui entiers, talon de 1,2 mm", settings: { marginShape: "extended", minimalMargin: true } },
  {
    file: "banc-grille-minimale-B-talon-2-4",
    name: "Grille minimale B",
    change: "talon de 2,4 mm (6 lignes)",
    settings: { marginShape: "extended", minimalMargin: true },
    edit: (solid) =>
      solid.add(
        supports(
          (x, side) => box(x - FOOT / 2, x + FOOT / 2, side > 0 ? D / 2 - 2.4 : -D / 2, side > 0 ? D / 2 : -D / 2 + 2.4),
          (y, side) => box(side > 0 ? W / 2 - 2.4 : -W / 2, side > 0 ? W / 2 : -W / 2 + 2.4, y - FOOT / 2, y + FOOT / 2),
        ).intersect(outline()),
      ),
  },
  {
    file: "banc-grille-minimale-C-patin-10",
    name: "Grille minimale C",
    change: "talon élargi en patin de 10 mm le long du tiroir",
    settings: { marginShape: "extended", minimalMargin: true },
    edit: (solid) =>
      solid.add(
        supports(
          (x, side) => box(x - 5, x + 5, side > 0 ? D / 2 - WALL : -D / 2, side > 0 ? D / 2 : -D / 2 + WALL),
          (y, side) => box(side > 0 ? W / 2 - WALL : -W / 2, side > 0 ? W / 2 : -W / 2 + WALL, y - 5, y + 5),
        ).intersect(outline()),
      ),
  },
  // La grille prolongée complète, nouvelle forme, et les deux formes complètes pour comparer.
  { file: "banc-grille-prolongee", name: "Grille prolongée complète", change: "moteur : tous les murets prolongés, un talon au bout de chacun", settings: { marginShape: "extended" } },
  { file: "", name: "Cadre complet (référence)", change: "moteur, non exporté", settings: { marginShape: "frame" } },
  { file: "", name: "Cellules complètes (référence)", change: "moteur, non exporté", settings: { marginShape: "cells" } },
];

it("variantes d'appui par forme : volumes, surplus, contact et 3MF relus", { timeout: 300_000 }, async () => {
  wasm = await loadManifold();
  const bare: Baseplate = await generateBaseplate(BENCH, "final", { margin: false });
  const bareVolume = bare.stats.volume as number;
  lines.push(
    "## Banc de 3 × 2 cellules, 12 mm de marge tout autour (150 × 108 mm), qualité finale",
    "",
    `Grille seule (le même banc sans marge, \`margin: false\`) : ${fr(bareVolume, 0)} mm³. Surplus : volume du banc moins celui de sa grille seule. Contact : longueur du contour de la première couche posée contre les parois du tiroir, sur les côtés en X (gauche et droite, 2 × 108 mm au plus hors arrondis) et en Y (avant et arrière, 2 × 150 mm).`,
    "",
    "| Variante | Ce qui change | Volume (mm³) | Surplus (mm³) | Contact X / Y (mm) | Triangles | Fichier 3MF | Relu |",
    "|---|---|---|---|---|---|---|---|",
  );
  for (const variant of variants) {
    const baseplate = await generateBaseplate({ ...BENCH, ...variant.settings }, "final");
    const engine = solidOf(baseplate.mesh);
    const solid = variant.edit ? variant.edit(engine) : engine;
    expect(solid.status()).toBe("NoError");
    const mesh = meshOf(solid);
    expect(badEdges(mesh)).toBe(0);
    const volume = solid.volume();
    const { x, y } = contact(solid);
    let file = "non exporté";
    let reread = "—";
    if (variant.file) {
      const bytes = serialize3mf(mesh, { name: variant.file, shareLink: "https://gridfinitygenerator.example/fr/baseplate" });
      writeFileSync(new URL(`files/${variant.file}.3mf`, OUT), bytes);
      const back = solidOf(readThreeMf(bytes).mesh);
      expect(back.status()).toBe("NoError");
      expect(Math.abs(back.volume() - volume)).toBeLessThan(0.5);
      file = `\`${variant.file}.3mf\` (${Math.round(bytes.length / 1024)} Ko)`;
      reread = `${back.status()}, ${fr(back.volume(), 0)} mm³`;
    }
    lines.push(`| ${variant.name} | ${variant.change} | ${fr(volume, 0)} | ${fr(volume - bareVolume, 0)} | ${fr(x)} / ${fr(y)} | ${mesh.indices.length / 3} | ${file} | ${reread} |`);
    flush();
  }
  lines.push("");

  // Le tiroir par défaut, pour le compte rendu : 3 formes × 2 états, entier et découpé.
  lines.push(
    "## Tiroir par défaut (400 × 280 mm, 9 × 6 cellules, marges de 10,5 et 13,5 mm), qualité finale",
    "",
    "Surplus : volume de la baseplate moins celui de sa grille seule, mêmes réglages (aimants, découpe et clips compris).",
    "",
    "| Forme | Marge | Entière : volume (cm³) | Surplus (cm³) | Aimants | Découpée pour 256 mm : volume (cm³) | Surplus (cm³) | Aimants |",
    "|---|---|---|---|---|---|---|---|",
  );
  const plate = { width: 256, depth: 256 };
  const [whole, cut] = await Promise.all([generateBaseplate({}, "final", { margin: false }), generateBaseplate({}, "final", { margin: false, buildPlate: plate })]);
  lines.push(`| Grille seule | — | ${fr((whole.stats.volume as number) / 1000, 2)} | — | ${whole.stats.magnets} | ${fr((cut.stats.volume as number) / 1000, 2)} | — | ${cut.stats.magnets} |`);
  for (const marginShape of ["frame", "cells", "extended"] as const)
    for (const minimalMargin of [false, true]) {
      const [a, b] = await Promise.all([
        generateBaseplate({ marginShape, minimalMargin }, "final"),
        generateBaseplate({ marginShape, minimalMargin }, "final", { buildPlate: plate }),
      ]);
      const [va, vb] = [(a.stats.volume as number) / 1000, (b.stats.volume as number) / 1000];
      const name = { frame: "Cadre", cells: "Cellules", extended: "Grille prolongée" }[marginShape];
      lines.push(
        `| ${name} | ${minimalMargin ? "minimale" : "complète"} | ${fr(va, 2)} | + ${fr(va - (whole.stats.volume as number) / 1000, 2)} | ${a.stats.magnets} | ${fr(vb, 2)} | + ${fr(vb - (cut.stats.volume as number) / 1000, 2)} | ${b.stats.magnets} |`,
      );
      flush();
    }
  lines.push("");
  flush();
});
