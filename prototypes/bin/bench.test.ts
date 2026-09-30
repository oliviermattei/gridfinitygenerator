// BANC JETABLE (#34) : le bin avant son moteur. Trois questions : (1) le pied standard du bin
// s'assoit-il dans nos baseplates, de chaque type et des deux profils ? (2) socle plein ou
// creux : combien de matière et de temps au trancheur ? (3) quel rayon pour le congé ?
// Lancer depuis la racine (PrusaSlicer en ligne de commande pour la question 2, s'il est installé) :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/bin
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import {
  generateBaseplate,
  generateBin,
  generateTestKit,
  serialize3mf,
  serializeStl,
  type BaseplateSettings,
  type BinSettings,
  type GenerateBinOptions,
  type TriangleMesh,
} from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
const TMP = new URL("tmp/", OUT);
mkdirSync(new URL("files/", OUT), { recursive: true });
mkdirSync(TMP, { recursive: true });
const sections: string[][] = [[], [], [], []];
/** Réécrit results.md avec ce que les tests ont mesuré jusqu'ici. */
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...sections.flat()].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",").replace(/^-(0,0+)$/, "$1");

const CELL = 42;
/** Deux volumes qui se touchent sans se chevaucher : sous ce seuil, le chevauchement est nul. */
const OVERLAP_MM3 = 1e-3;
const TOLERANCE_MM = 1e-4;

function solidOf(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): Manifold {
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices }));
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

it("(1) assise du pied du bin dans chaque baseplate", async () => {
  const wasm = await loadManifold();
  // Le bin du moteur, 1 × 1 × 3 U, posé au-dessus de la cellule arrière droite d'une baseplate 2 × 2.
  const bin = solidOf(wasm, (await generateBin({ columns: 1, rows: 1, units: 3 }, "final")).mesh);
  const variants: [name: string, settings: Partial<BaseplateSettings>, floor: number][] = [
    ["Normal, profil hybride", { baseplateType: "normal", pocketProfile: "hybrid" }, 0],
    ["Normal, profil ras", { baseplateType: "normal", pocketProfile: "flush" }, 0],
    ["Tray, profil hybride", { baseplateType: "tray", pocketProfile: "hybrid" }, 0.6],
    ["Skeleton, profil hybride", { baseplateType: "skeleton", pocketProfile: "hybrid" }, 0],
    ["CLICKbase, profil hybride", { baseplateType: "clickbase", pocketProfile: "hybrid" }, 0],
  ];
  const rows: string[] = [];
  for (const [name, settings, floor] of variants) {
    const plate = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, ...settings }, "final", { magnets: false });
    const solid = solidOf(wasm, plate.mesh);
    const overlap = (dx: number, z: number) => {
      const moved = bin.translate([CELL / 2 + dx, CELL / 2, z]);
      const common = moved.intersect(solid);
      const volume = common.volume();
      moved.delete();
      common.delete();
      return volume;
    };
    // Le dessous du pied tient au mieux sur le fond du tiroir (z = 0) ou sur le fond du Tray.
    const slopes = bisect(-2, 4, (z) => overlap(0, z) < OVERLAP_MM3);
    const seat = Math.max(slopes, floor);
    const clamped = settings.baseplateType === "clickbase";
    // Un CLICKbase serre le pied : à la hauteur d'assise d'une Normal, le pied chevauche les ergots.
    const squeeze = clamped ? overlap(0, 0) : 0;
    const play = clamped ? 0 : Math.max(0, bisect(0, 1, (dx) => overlap(-dx, seat + TOLERANCE_MM) >= OVERLAP_MM3) - TOLERANCE_MM);
    const carried = clamped
      ? `ergots (chevauchement de ${fr(squeeze, 1)} mm³ à z = 0, libre à ${fr(slopes, 3)})`
      : slopes >= floor - TOLERANCE_MM && slopes > TOLERANCE_MM
        ? "pentes seules"
        : Math.abs(slopes - floor) < 0.001
          ? "pentes **et** fond (hyperstatique)"
          : "fond seul";
    rows.push(`| ${name} | ${fr(plate.stats.dimensions.height)} | ${fr(clamped ? 0 : seat, 3)} | ${fr(play, 3)} | ${carried} |`);
    solid.delete();
    if (clamped) expect(squeeze).toBeGreaterThan(1);
    else expect(play).toBeLessThan(0.3);
  }
  bin.delete();
  sections[0] = [
    "## (1) Assise du pied standard du bin (moteur, qualité finale)",
    "",
    "Bin 1 × 1 × 3 U du moteur, posé par bissection au-dessus d'une cellule d'une baseplate 2 × 2 du moteur, sans aimant, jusqu'au premier contact (chevauchement < 0,001 mm³). « Jeu latéral » : glissement possible à la hauteur où il s'arrête.",
    "",
    "| Baseplate | Hauteur | Dessous du pied à | Jeu latéral | Porté par |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ];
  flush();
}, 300_000);

/** Tranche un maillage avec PrusaSlicer ; null si PrusaSlicer n'est pas installé. */
function slice(name: string, mesh: TriangleMesh): { grams: number; time: string } | null {
  const stl = new URL(`${name}.stl`, TMP).pathname;
  const gcode = new URL(`${name}.gcode`, TMP).pathname;
  writeFileSync(stl, serializeStl(mesh));
  try {
    execFileSync(
      "prusa-slicer",
      [
        "--export-gcode",
        "--nozzle-diameter", "0.4",
        "--layer-height", "0.2",
        "--first-layer-height", "0.2",
        "--fill-density", "15%",
        "--perimeters", "2",
        "--filament-diameter", "1.75",
        "--filament-density", "1.24",
        "--center", "100,100",
        "--output", gcode,
        stl,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const text = readFileSync(gcode, "utf8");
  const grams = Number(/; (?:total )?filament used \[g\] = ([\d.]+)/.exec(text)?.[1]);
  const time = /; estimated printing time \(normal mode\) = (.+)/.exec(text)?.[1] ?? "?";
  return { grams, time };
}

it("(2) socle plein ou creux", async () => {
  const cases: [name: string, settings: Partial<BinSettings>][] = [
    ["1 × 1 × 3 U", { columns: 1, rows: 1, units: 3 }],
    ["2 × 2 × 3 U", { columns: 2, rows: 2, units: 3 }],
    ["2 × 1 × 6 U", { columns: 2, rows: 1, units: 6 }],
  ];
  const rows: string[] = [];
  for (const [name, settings] of cases) {
    const row = [name];
    const measured: number[] = [];
    for (const socle of ["solid", "hollow"] as const) {
      const bin = await generateBin(settings, "final", { socle });
      const check = await checkMesh(bin.mesh);
      expect(check.status).toBe("NoError");
      const sliced = slice(`${name.replace(/ /g, "")}-${socle}`, bin.mesh);
      measured.push(bin.stats.volume as number, sliced?.grams ?? Number.NaN);
      row.push(
        `${fr((bin.stats.volume as number) / 1000)} cm³, ${fr(bin.stats.compartment.height, 1)} mm utiles, ${sliced ? `${fr(sliced.grams, 1)} g, ${sliced.time}` : "trancheur absent"}`,
      );
    }
    const [vSolid, gSolid, vHollow, gHollow] = measured as [number, number, number, number];
    row.push(`${fr((100 * (vHollow - vSolid)) / vSolid, 0)} % de volume, ${Number.isNaN(gSolid) ? "—" : `${fr((100 * (gHollow - gSolid)) / gSolid, 0)} % de filament`}`);
    rows.push(`| ${row.join(" | ")} |`);
  }
  sections[1] = [
    "## (2) Socle plein (standard) ou creux",
    "",
    "Plein : pieds pleins, fond intérieur à 7 mm (gridfinity-rebuilt `BASE_HEIGHT`). Creux : chaque pied est une coque de 1,2 mm ouverte dessous, sous un fond de 1,2 mm arrondi à la couche (fond intérieur à 6,0 mm). Volume mesuré sur le maillage ; filament et temps donnés par PrusaSlicer 2.7 en ligne de commande (buse 0,4, couches de 0,2, 2 périmètres, remplissage 15 %, PLA 1,24 g/cm³, profil d'imprimante par défaut : le temps est celui du trancheur, pas une mesure).",
    "",
    "| Bin | Plein | Creux | Écart du creux |",
    "|---|---|---|---|",
    ...rows,
    "",
  ];
  flush();
}, 300_000);

it("(3) rayon du congé", async () => {
  const rows: string[] = [];
  const settings: Partial<BinSettings> = { columns: 1, rows: 1, units: 3 };
  const plain = await generateBin({ ...settings, fillet: false }, "final");
  const plainUseful = plain.stats.usefulVolume as number;
  for (const radius of [0, 2, 3, 5, 8]) {
    const options: GenerateBinOptions = { filletRadius: radius };
    const bin = radius === 0 ? plain : await generateBin({ ...settings, fillet: true }, "final", options);
    const useful = bin.stats.usefulVolume as number;
    // Dans un coin fond/paroi, un doigt de rayon 8 mm (la pulpe d'un index) laisse une bande morte
    // de section (1 − π/4)(8² − r²) le long de chaque paroi : ce que le congé rend atteignable.
    const dead = (1 - Math.PI / 4) * Math.max(0, 64 - radius * radius);
    rows.push(`| ${fr(radius, 0)} | ${fr(bin.layout.fillet, 1)} | ${fr(useful / 1000)} | ${fr((100 * (useful - plainUseful)) / plainUseful, 1)} % | ${fr(dead, 1)} |`);
  }
  sections[2] = [
    "## (3) Rayon du congé (bin 1 × 1 × 3 U, un compartiment)",
    "",
    "Volume utile calculé sur les solides (du fond intérieur au-dessous du rebord). « Coin mort » : section, dans le coin fond/paroi, qu'un doigt de rayon 8 mm n'atteint pas (calcul exact de géométrie plane, pas une mesure sur le maillage).",
    "",
    "| Rayon demandé (mm) | Rayon appliqué | Volume utile (cm³) | Écart | Coin mort (mm²) |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ];
  flush();
}, 300_000);

/** Écrit un 3MF, le relit, et vérifie chaque objet NoError ; renvoie la ligne du résultat. */
async function write3mf(file: string, objects: { mesh: TriangleMesh; name: string }[], note: string): Promise<string> {
  const bytes = serialize3mf(objects, { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/bin/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = new Set<string>();
  for (const object of content.objects) statuses.add((await checkMesh(object.mesh)).status);
  expect([...statuses]).toEqual(["NoError"]);
  return `- \`files/${file}\` : relu ${[...statuses].join(", ")}. ${note}.`;
}

it("fichiers de la recette", async () => {
  const kit = await generateTestKit({}, "final");
  const clickbase = await generateBaseplate({ sizeMode: "cells", columns: 1, rows: 1, baseplateType: "clickbase" }, "final");
  const standard = await generateBin({ columns: 1, rows: 1, units: 3 }, "final");
  const hollow = await generateBin({ columns: 1, rows: 1, units: 3 }, "final", { socle: "hollow" });
  const full = await generateBin({ columns: 2, rows: 1, units: 4, compartmentColumns: 2, scoop: true, labelTab: true }, "final");
  const files = [
    await write3mf("bin-1x1x3-plein.3mf", [{ mesh: standard.mesh, name: "bin 1x1x3 plein" }], "Bin standard 1 × 1 × 3 U, socle plein, congé ; à essayer dans le kit de test et le CLICKbase"),
    await write3mf("bin-1x1x3-creux.3mf", [{ mesh: hollow.mesh, name: "bin 1x1x3 creux" }], "Le même, socle creux : juger le pont du fond et la rigidité"),
    await write3mf("bin-2x1x4-pelle-onglet.3mf", [{ mesh: full.mesh, name: "bin 2x1x4" }], "Bin 2 × 1 × 4 U, 2 compartiments, congé, pelle et onglet d'étiquette : juger la pelle, l'onglet sans support, et l'empilage"),
    await write3mf("kit-de-test.3mf", [{ mesh: kit.mesh, name: "kit de test" }], "Kit de test 1 × 2 (hybride à l'avant, ras à l'arrière) du moteur"),
    await write3mf("clickbase-1x1.3mf", [{ mesh: clickbase.mesh, name: "CLICKbase 1x1" }], "CLICKbase 1 × 1 du moteur, en PETG"),
  ];
  sections[3] = ["## Fichiers (relus, `NoError`)", "", ...files, ""];
  flush();
}, 300_000);
