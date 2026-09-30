// BANC JETABLE (#28) : impression empilée. Ce que chaque pièce retournée pose sur celle du
// dessous (contact, ce qui n'est pas porté), ce qu'elle imprime en pont (plafonds), par type
// et par marge, et les fichiers de la recette. Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/stack
import { mkdirSync, writeFileSync } from "node:fs";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import {
  generateBaseplate,
  printClips,
  printStacks,
  serialize3mf,
  stackPlanOf,
  stackRuleOf,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
  type StackPlan,
  type TriangleMesh,
} from "../../packages/geometry/src/index";
import { loadManifold } from "../../packages/geometry/src/manifold";
import { checkMesh, readThreeMf } from "../../packages/geometry/test/support/measure";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const lines: string[] = [];
const flush = () => writeFileSync(new URL("results.md", OUT), ["# Résultats du banc (généré par `bench.test.ts`)", "", ...lines].join("\n"));
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

const LAYER = 0.2;
const OPTIONS = { layerHeight: LAYER, lineWidth: 0.4, ears: false, pins: false };
/** La pile de la recette : 3 × 2 cellules, 10,5 mm de marge en cellules tronquées à gauche et à droite, 3 pièces d'une colonne. */
const PILE: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 21, marginDepth: 0, marginShape: "cells" };
const PLATE_60: BuildPlate = { width: 60, depth: 100 };
const PLATE_256: BuildPlate = { width: 256, depth: 256 };

let wasm: ManifoldToplevel;
const solidOf = (mesh: TriangleMesh): Manifold => new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices }));

/** Les coquilles d'une pile, une par pièce, dans l'ordre de la pile. */
function shellsOf(mesh: TriangleMesh, baseplate: Baseplate, stack: StackPlan["stacks"][number]): TriangleMesh[] {
  let [vertex, triangle] = [0, 0];
  return stack.map(({ index }) => {
    const piece = baseplate.pieces[index] as Baseplate["pieces"][number];
    const [vertices, triangles] = [piece.vertices[1] - piece.vertices[0], piece.triangles[1] - piece.triangles[0]];
    const positions = mesh.positions.slice(3 * vertex, 3 * (vertex + vertices));
    const indices = mesh.indices.slice(3 * triangle, 3 * (triangle + triangles)).map((index) => index - vertex);
    [vertex, triangle] = [vertex + vertices, triangle + triangles];
    return { positions, indices };
  });
}

/** Le joint entre deux pièces : jeu, dessous de la pièce du dessus, contact et part non portée (mm²). */
function joint(lower: Manifold, upper: Manifold) {
  const top = lower.boundingBox().max[2];
  const bottom = upper.boundingBox().min[2];
  const under = lower.slice(top - 0.01);
  const over = upper.slice(bottom + 0.01);
  const unheld = over.subtract(under);
  const result = { gap: bottom - top, face: over.area(), contact: over.area() - unheld.area(), unheld: unheld.area(), widestUnheld: widest(unheld) };
  for (const section of [under, over, unheld]) section.delete();
  return result;
}

/** Côté le plus court de la plus grande pièce d'une section (le pont le plus large qu'elle demande), 0 sans pièce. */
function widest(section: CrossSection): number {
  let best = 0;
  let bestArea = 0;
  for (const part of section.decompose()) {
    const { min, max } = part.bounds();
    if (part.area() > bestArea) {
      bestArea = part.area();
      best = Math.min(max[0] - min[0], max[1] - min[1]);
    }
    part.delete();
  }
  return best;
}

/**
 * Plafonds d'une pièce retournée : les faces horizontales tournées vers le haut dans la pièce à
 * l'endroit, sous son dessus, qui deviennent, retournées, des faces tournées vers le bas au-dessus
 * du joint (des ponts, ou des départs en l'air). Par hauteur (à l'endroit) : surface, et la plus
 * grande pièce (côtés court et long de sa boîte).
 */
function ceilingsOf(piece: Manifold, height: number): { z: number; area: number; short: number; long: number }[] {
  const { vertProperties: positions, triVerts: indices } = piece.getMesh();
  const levels = new Set<number>();
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [3 * (indices[t] as number), 3 * (indices[t + 1] as number), 3 * (indices[t + 2] as number)];
    const p = positions as Float32Array;
    const [ux, uy, uz] = [(p[b] as number) - (p[a] as number), (p[b + 1] as number) - (p[a + 1] as number), (p[b + 2] as number) - (p[a + 2] as number)];
    const [vx, vy, vz] = [(p[c] as number) - (p[a] as number), (p[c + 1] as number) - (p[a + 1] as number), (p[c + 2] as number) - (p[a + 2] as number)];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const z = p[a + 2] as number;
    if (nz > 0.999 * Math.hypot(nx, ny, nz) && z < height - 0.01 && z > 0.01) levels.add(Math.round(z * 1000) / 1000);
  }
  return [...levels].sort((a, b) => a - b).map((z) => {
    const below = piece.slice(z - 0.005);
    const above = piece.slice(z + 0.005);
    const ceiling = below.subtract(above);
    let [short, long, largest] = [0, 0, 0];
    for (const part of ceiling.decompose()) {
      const { min, max } = part.bounds();
      if (part.area() > largest) {
        largest = part.area();
        [short, long] = [Math.min(max[0] - min[0], max[1] - min[1]), Math.max(max[0] - min[0], max[1] - min[1])];
      }
      part.delete();
    }
    const result = { z, area: ceiling.area(), short, long };
    for (const section of [below, above, ceiling]) section.delete();
    return result;
  });
}

it("contact, part non portée et plafonds, par type et par marge", async () => {
  wasm = await loadManifold();
  const cases: { name: string; settings: Partial<BaseplateSettings>; plate: BuildPlate }[] = [
    { name: "pile de 3, Normal", settings: PILE, plate: PLATE_60 },
    { name: "pile de 3, Normal ras", settings: { ...PILE, pocketProfile: "flush" }, plate: PLATE_60 },
    { name: "pile de 3, Tray", settings: { ...PILE, baseplateType: "tray" }, plate: PLATE_60 },
    { name: "pile de 3, Skeleton", settings: { ...PILE, baseplateType: "skeleton" }, plate: PLATE_60 },
    { name: "pile de 3, CLICKbase", settings: { ...PILE, baseplateType: "clickbase" }, plate: PLATE_60 },
    { name: "tiroir par défaut, cellules tronquées", settings: { marginShape: "cells" }, plate: PLATE_256 },
    { name: "tiroir par défaut, cellules tronquées, vis", settings: { marginShape: "cells", screws: true }, plate: PLATE_256 },
    { name: "tiroir par défaut, cadre (refusé)", settings: { marginShape: "frame" }, plate: PLATE_256 },
    { name: "tiroir par défaut, équerres (refusé)", settings: { marginShape: "brackets" }, plate: PLATE_256 },
  ];
  lines.push(
    "## Joints et plafonds (qualité finale, couches de 0,2 mm)",
    "",
    "Joint k : la pièce k + 1 de la pile posée sur la pièce k. « Dessous » : section de la pièce du dessus 0,01 mm au-dessus du joint. « Non porté » : la part de ce dessous hors de la section de la pièce du dessous 0,01 mm sous le joint (le pont le plus large : côté court de sa plus grande pièce). « Plafonds » : faces horizontales tournées vers le bas au-dessus du joint dans une pièce retournée (hauteur à l'endroit, surface, plus grande pièce : côté court × côté long).",
    "",
    "| Cas | Règle | Piles | Joint | Jeu | Dessous (mm²) | Contact (mm²) | Non porté (mm²) | Pont le plus large | Plafonds d'une pièce retournée |",
    "|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const { name, settings, plate } of cases) {
    const baseplate = await generateBaseplate(settings, "final", { buildPlate: plate });
    const full = { marginShape: "frame", baseplateType: "normal", layerHeight: LAYER, ...settings } as const;
    const rule = stackRuleOf(full, baseplate.layout);
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const [printed] = await printStacks(baseplate, { ...plan, stacks: plan.stacks.slice(0, 1) }, OPTIONS);
    const stack = plan.stacks[0] ?? [];
    const shells = shellsOf(printed?.mesh as TriangleMesh, baseplate, stack).map(solidOf);
    for (const shell of shells) expect(shell.status()).toBe("NoError");
    // Plafonds d'une pièce à l'endroit : ceux qu'elle aurait retournée.
    const piece = solidOf(shellsOf(printed?.mesh as TriangleMesh, baseplate, stack.slice(0, 1))[0] as TriangleMesh);
    const ceilings = ceilingsOf(piece, baseplate.stats.dimensions.height)
      .map(({ z, area, short, long }) => `${fr(z)} mm : ${fr(area, 0)} mm², ${fr(short, 1)} × ${fr(long, 1)}`)
      .join(" ; ");
    const verdict = rule.blockers.length > 0 ? `refusée (${rule.blockers.join(", ")})` : rule.warnings.length > 0 ? `avertie (${rule.warnings.join(", ")})` : "permise";
    const piles = plan.stacks.map((s) => s.map(({ number, flip }) => `${number}${flip === "none" ? "" : flip === "x" ? "↕" : "↔"}`).join("-")).join(" / ");
    for (let k = 1; k < shells.length; k++) {
      const { gap, face, contact, unheld, widestUnheld } = joint(shells[k - 1] as Manifold, shells[k] as Manifold);
      expect(gap).toBeCloseTo(LAYER, 4);
      lines.push(`| ${k === 1 ? name : ""} | ${k === 1 ? verdict : ""} | ${k === 1 ? piles : ""} | ${k} | ${fr(gap, 3)} | ${fr(face, 0)} | ${fr(contact, 0)} | ${fr(unheld, 1)} | ${fr(widestUnheld, 1)} | ${k === 1 ? ceilings || "aucun" : ""} |`);
    }
    for (const shell of [...shells, piece]) shell.delete();
  }
  lines.push("", "Piles : numéros des pièces du bas vers le haut ; ↕ retournée autour de X (l'arrière vers l'avant), ↔ autour de Y (la gauche vers la droite).", "");
  flush();
});

it("en alternance : les joints dessous contre dessous", async () => {
  wasm = await loadManifold();
  const baseplate = await generateBaseplate(PILE, "final", { buildPlate: PLATE_60 });
  const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
  const [printed] = await printStacks(baseplate, plan, OPTIONS);
  const [first, second] = shellsOf(printed?.mesh as TriangleMesh, baseplate, plan.stacks[0] ?? []).map(solidOf) as [Manifold, Manifold];
  // Méthode retenue, joint 2 : les plats de la pièce 2 sur le dessous de la pièce 3 retournée.
  const stu142 = joint(first, second);
  // En alternance, le joint 2 poserait le dessous d'une pièce à l'endroit sur le dessous d'une retournée : même contour ici (pièces 1 et 3).
  const bottom = first.slice(0.01);
  const alternate = bottom.area();
  lines.push(
    "## Méthode Stu142 contre alternance (pile de 3, pièces 1 et 3 de même contour)",
    "",
    `- Plats contre plats (joint 1, les deux méthodes) : ${fr(stu142.contact, 0)} mm².`,
    `- Dessous contre dessous (joint 2 en alternance) : ${fr(alternate, 0)} mm², soit × ${fr(alternate / stu142.contact, 1)}.`,
    "",
  );
  bottom.delete();
  first.delete();
  second.delete();
  flush();
});

/** Écrit un 3MF comme l'export du générateur (une pile par objet, les clips à part), le relit et vérifie chaque objet. */
async function writeFile(file: string, settings: Partial<BaseplateSettings>, plate: BuildPlate, anchors: { ears: boolean; pins: boolean }, note: string) {
  const baseplate = await generateBaseplate(settings, "final", { buildPlate: plate });
  const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
  const stacks = await printStacks(baseplate, plan, { ...OPTIONS, ...anchors });
  const clips = printClips(baseplate, stacks.map(({ mesh }) => mesh));
  const objects = stacks.map(({ mesh, pieces }, k) => ({ mesh, name: `pile ${k + 1} : pièces ${pieces.join(", ")}` }));
  if (clips) objects.push({ mesh: clips, name: `clip × ${baseplate.stats.clips}` });
  const bytes = serialize3mf(objects, { name: file.replace(/\.3mf$/, ""), shareLink: `prototypes/stack/bench.test.ts : ${note}` });
  writeFileSync(new URL(`files/${file}`, OUT), bytes);
  const content = readThreeMf(bytes);
  const statuses = await Promise.all(content.objects.map(async ({ mesh }) => (await checkMesh(mesh)).status));
  for (const status of statuses) expect(status).toBe("NoError");
  const heights = content.objects.map(({ mesh }) => Math.max(...[...mesh.positions].filter((_, k) => k % 3 === 2)));
  lines.push(`- \`files/${file}\` : relu, ${statuses.length} objets NoError (${content.objectNames.join(" ; ")}), hauteur ${fr(heights[0] as number)} mm, pas ${fr(plan.pitch)} mm. ${note}`);
}

it("fichiers de la recette", async () => {
  lines.push("## Fichiers (relus, `NoError`)", "");
  await writeFile("pile-3-pieces.3mf", PILE, PLATE_60, { ears: false, pins: false }, "Pile de 3 pièces d'une colonne, 3 × 2 cellules, marge de 10,5 mm en cellules tronquées, les 4 clips à part.");
  await writeFile("pile-3-pieces-oreilles-pions.3mf", PILE, PLATE_60, { ears: true, pins: true }, "La même, avec oreilles et pions.");
  await writeFile("pile-3-pieces-skeleton.3mf", { ...PILE, baseplateType: "skeleton" }, PLATE_60, { ears: false, pins: false }, "La même en Skeleton (bandes pontées entre les poteaux).");
  lines.push("");
  flush();
}, 60_000);

it("Skeleton : longueur du pont d'une bande retournée", async () => {
  wasm = await loadManifold();
  // 2 × 2 cellules d'un seul tenant, sans aimant (sans numéro de pièce, qui garde son muret entier) : le muret
  // entre les colonnes, sur x = 0, est entaillé de chaque côté du croisement central.
  const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, baseplateType: "skeleton" }, "final", { magnets: false });
  const piece = solidOf(baseplate.mesh);
  const band = 0.4;
  const above = piece.slice(band + 0.01);
  const axis = wasm.CrossSection.square([0.1, 84]).translate([-0.05, -42]);
  const posts = above.intersect(axis);
  const spans = posts
    .decompose()
    .map((part) => {
      const { min, max } = part.bounds();
      part.delete();
      return [min[1], max[1]] as [number, number];
    })
    .sort(([a], [b]) => a - b);
  const gaps = spans.slice(1).map(([start], k) => start - (spans[k] as [number, number])[1]);
  expect(gaps).toHaveLength(2);
  lines.push(
    "## Skeleton : la bande retournée",
    "",
    `Retournée, la bande de ${fr(band)} mm (2 couches) d'un muret entaillé est un pont entre les flancs de deux poteaux : ${gaps.map((gap) => fr(gap)).join(" et ")} mm, mesurés juste au-dessus de la bande le long de l'axe du muret (2 × 2 cellules de 42 mm).`,
    "",
  );
  for (const object of [piece, above, axis, posts]) object.delete();
  flush();
});
