// BANC JETABLE (#21) : plan de découpe, numéros gravés et fichiers de recette, mesurés sur
// le moteur (packages/geometry). Lancer depuis la racine du dépôt :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/split
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  generateBaseplate,
  printPieces,
  serialize3mf,
  type BaseplateSettings,
  type BuildPlate,
} from "../../packages/geometry/src/index";
import { insetAt, POCKET_PROFILES } from "../../packages/geometry/src/pocket-profile";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
const lines: string[] = [];
const mm = (value: number) => value.toFixed(1).replace(".", ",");

const PLANS: [name: string, settings: Partial<BaseplateSettings>, plate: BuildPlate][] = [
  ["tiroir par défaut", {}, { width: 180, depth: 180 }],
  ["tiroir par défaut", {}, { width: 220, depth: 220 }],
  ["tiroir par défaut", {}, { width: 250, depth: 210 }],
  ["tiroir par défaut", {}, { width: 256, depth: 256 }],
  ["tiroir par défaut", {}, { width: 350, depth: 350 }],
  ["tiroir par défaut", {}, { width: 50, depth: 50 }],
  ["tiroir 1000 × 600", { drawerWidth: 1000, drawerDepth: 600 }, { width: 256, depth: 256 }],
  ["tiroir 60 × 1000 (1 × 23)", { drawerWidth: 60, drawerDepth: 1000 }, { width: 256, depth: 256 }],
  ["9 × 6 cellules + 41 mm de marge par côté", { sizeMode: "cells", columns: 9, rows: 6, marginWidth: 82, marginDepth: 82 }, { width: 256, depth: 256 }],
  ["2 × 1 cellules + 250 mm de marge par côté", { sizeMode: "cells", columns: 2, rows: 1, marginWidth: 500 }, { width: 256, depth: 256 }],
  ["20 × 20 cellules", { sizeMode: "cells", columns: 20, rows: 20 }, { width: 256, depth: 256 }],
  ["10 × 4 cellules", { sizeMode: "cells", columns: 10, rows: 4 }, { width: 200, depth: 300 }],
];

it("plan de découpe", async () => {
  lines.push("## Plans de découpe", "", "| Cas | Plateau | Pièces | Colonnes × rangées (cellules) | Tourné | Plus grande pièce (mm) | Pièces hors plateau |", "|---|---|---|---|---|---|---|");
  for (const [name, settings, plate] of PLANS) {
    const { layout } = await generateBaseplate(settings, "preview", { buildPlate: plate });
    const { split } = layout;
    const spans = (key: "columns" | "rows") =>
      [...new Map(split.pieces.map((piece) => [piece[key][0], piece[key][1] - piece[key][0]])).entries()].sort(([a], [b]) => a - b).map(([, n]) => n);
    const largest = split.pieces.reduce(
      (best, { footprint: [x0, y0, x1, y1] }) => ((x1 - x0) * (y1 - y0) > best[0] * best[1] ? [x1 - x0, y1 - y0] : best),
      [0, 0],
    );
    lines.push(
      `| ${name} | ${plate.width} × ${plate.depth} | ${split.pieces.length} | ${spans("columns").join(" + ")} × ${spans("rows").join(" + ")} | ${split.turned ? "oui" : "non"} | ${mm(largest[0] as number)} × ${mm(largest[1] as number)} | ${split.pieces.filter(({ fits }) => !fits).length} |`,
    );
  }
  lines.push("");
});

it("numéros gravés", async () => {
  lines.push("## Numéros gravés", "", "| Profil, couche | Profondeur | Demi-muret au fond de la gravure | Peau de chaque côté du chiffre (1,8 mm) | Matière retirée, tiroir par défaut en 4 pièces |", "|---|---|---|---|---|");
  for (const [profile, layerHeight] of [["hybrid", 0.2], ["flush", 0.2], ["hybrid", 0.28], ["flush", 0.28], ["flush", 0.12]] as const) {
    const settings = { pocketProfile: profile, layerHeight };
    const depth = Math.ceil(0.4 / layerHeight - 1e-9) * layerHeight;
    const halfMuret = insetAt(POCKET_PROFILES[profile], depth);
    const whole = await generateBaseplate(settings, "final");
    const cut = await generateBaseplate(settings, "final", { buildPlate: { width: 256, depth: 256 } });
    const engraved = (whole.stats.volume as number) - (cut.stats.volume as number);
    lines.push(
      `| ${profile === "hybrid" ? "hybride" : "ras"}, ${String(layerHeight).replace(".", ",")} | ${depth.toFixed(2).replace(".", ",")} mm | ${halfMuret.toFixed(2).replace(".", ",")} mm | ${((halfMuret - 1.8) / 2).toFixed(3).replace(".", ",")} mm | ${engraved.toFixed(2).replace(".", ",")} mm³ |`,
    );
  }
  lines.push("");
});

const COUPONS: [file: string, settings: Partial<BaseplateSettings>, plate: BuildPlate, why: string][] = [
  ["coupe-2x2-en-2-pieces.3mf", { sizeMode: "cells", columns: 2, rows: 2 }, { width: 90, depth: 50 }, "2 pièces de 2 × 1, sans marge"],
  ["coupe-2x2-marge-en-2-pieces.3mf", { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 21, marginDepth: 27 }, { width: 110, depth: 60 }, "2 pièces de 2 × 1 avec les marges du tiroir par défaut (10,5 et 13,5 mm)"],
];

it("fichiers de recette", async () => {
  lines.push("## Fichiers de recette", "", "| Fichier | Contenu | Objets | Volume total | Relu `NoError` |", "|---|---|---|---|---|");
  for (const [file, settings, plate, why] of COUPONS) {
    const baseplate = await generateBaseplate(settings, "final", { buildPlate: plate });
    expect(baseplate.stats.pieces).toBe(2);
    const name = file.replace(/\.3mf$/, "");
    const bytes = serialize3mf(
      printPieces(baseplate).map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` })),
      { name, shareLink: `prototypes/split/bench.test.ts : ${why}, plateau de ${plate.width} × ${plate.depth} mm` },
    );
    writeFileSync(new URL(`files/${file}`, OUT), bytes);
    const content = readThreeMf(bytes);
    let volume = 0;
    const statuses = new Set<string>();
    for (const { mesh } of content.objects) {
      const check = await checkMesh(mesh);
      statuses.add(check.status);
      volume += check.volume;
    }
    expect([...statuses]).toEqual(["NoError"]);
    expect(Math.abs(volume - (baseplate.stats.volume as number))).toBeLessThan(0.5);
    lines.push(`| \`${file}\` | ${why} | ${content.objectNames.join(", ")} | ${(volume / 1000).toFixed(2).replace(".", ",")} cm³ | ${[...statuses].join(", ")} |`);
  }
  lines.push("");
  writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
});
