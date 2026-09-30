// BANC JETABLE (recette #16, impression empilée #28) : une pile de 2 plaques d'une cellule, la
// 1re à l'endroit, la 2e retournée, une couche d'air entre elles (ADR 0016), dans toutes les
// versions à tester : 4 types × 2 profils, et pour Normal hybride les oreilles et pions et deux
// marges empilables. Les fichiers sont ceux du site : baseplate 2 × 1 en mode cellules, découpée
// par un plateau de 50 × 50 mm en 2 pièces d'une cellule, puis `stackPlanOf` / `printStacks` /
// `printClips` / `serialize3mf` comme l'export « Empiler les pièces ». Seule entorse : la règle
// `stackRuleOf` n'est PAS appliquée (le site refuse Tray et CLICKbase), à la demande du
// mainteneur. Variante « autonome » : 2 exemplaires d'une baseplate 1 × 1 non découpée, par un
// plan de pile écrit à la main (le site n'empile pas une pièce unique). Lancer depuis la racine :
//   pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/stack-1x1
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
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
import { areaOutside, badEdges, checkMesh, readThreeMf, sectionArea } from "../../packages/geometry/test/support/measure";
import { DEFAULT_FILAMENT, massOf } from "../../apps/web/lib/mass";

const OUT = new URL("./", import.meta.url);
mkdirSync(new URL("files/", OUT), { recursive: true });
const fr = (value: number, digits = 2) => (Math.abs(value) < 5e-7 ? 0 : value).toFixed(digits).replace(".", ",");

const LAYER = DEFAULT_SETTINGS.layerHeight; // 0,2 mm, le réglage par défaut
const LINE = DEFAULT_SETTINGS.lineWidth;
/** 2 cellules côte à côte, sans marge : un plateau de 50 × 50 mm les coupe en 2 pièces d'une cellule. */
const PAIR: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 2, rows: 1 };
const PLATE_50: BuildPlate = { width: 50, depth: 50 };
/** La même avec 10,5 mm de marge de chaque côté (comme la pile de 3 de prototypes/stack) : pièces de 52,5 × 63 mm. */
const PAIR_MARGIN: Partial<BaseplateSettings> = { ...PAIR, marginWidth: 21, marginDepth: 21 };
const PLATE_70: BuildPlate = { width: 70, depth: 70 };
/** Une plaque d'une cellule, non découpée : fentes de bord sur ses 4 côtés, pas de numéro. */
const SINGLE: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 1, rows: 1 };

interface Case {
  file: string;
  priority: number;
  construction: string;
  settings: Partial<BaseplateSettings>;
  plate?: BuildPlate;
  anchors?: boolean;
  /** Pile de 2 exemplaires d'une baseplate non découpée (plan écrit à la main). */
  twin?: boolean;
  judge: string;
}

const TYPES = [
  { type: "normal", name: "Normal" },
  { type: "skeleton", name: "Skeleton" },
  { type: "tray", name: "Tray" },
  { type: "clickbase", name: "CLICKbase" },
] as const;
const PROFILES = [
  { profile: "hybrid", name: "hybride" },
  { profile: "flush", name: "ras" },
] as const;

const JUDGE: Record<string, string> = {
  normal: "Séparation à la main ou à la lame, sans casse ; face retournée (dessus des murets, pentes à 45° en surplomb) ; un bac standard dans la plaque retournée (jeu, bascule).",
  skeleton: "Aucune bande à juger (voir les constats) : seulement des fentes de clip plus courtes (4,0 mm) ; séparation.",
  tray: "HORS RÈGLE (refusé par le site) : fond retourné pontant toute la poche ; affaissement, puis assise d'un bac.",
  clickbase: "HORS RÈGLE (refusé par le site) : toiles et lamelles retournées ; la toile se soude-t-elle à la lamelle, les lamelles fléchissent-elles encore ?",
};

const CASES: Case[] = [
  ...TYPES.flatMap(({ type, name }) =>
    PROFILES.map(({ profile, name: profileName }): Case => ({
      file: `pile-1x1-${type}-${profileName}.3mf`,
      priority: { normal: 1, skeleton: 3, tray: 6, clickbase: 6 }[type] + (profile === "flush" && type === "normal" ? 1 : 0),
      construction: `${name} ${profileName}`,
      settings: { ...PAIR, baseplateType: type, pocketProfile: profile },
      plate: PLATE_50,
      judge: profile === "flush" && type === "normal" ? "Comme Normal hybride ; pas de 4,45 mm (hauteur 4,25 mm, pas un nombre entier de couches) : une seule couche vide, séparation." : JUDGE[type] as string,
    })),
  ),
  {
    file: "pile-1x1-normal-hybride-oreilles-pions.3mf",
    priority: 4,
    construction: "Normal hybride, oreilles et pions",
    settings: { ...PAIR },
    plate: PLATE_50,
    anchors: true,
    judge: "Oreilles (Ø 12 mm, une couche) : tiennent-elles les coins, se coupent-elles proprement ? Pions de 0,8 mm : tenue, séparation sans arracher de coin.",
  },
  {
    file: "pile-1x1-normal-hybride-marge-grille.3mf",
    priority: 5,
    construction: "Normal hybride, marge 10,5 mm en grille prolongée",
    settings: { ...PAIR_MARGIN, marginShape: "extended" },
    plate: PLATE_70,
    judge: "Murets prolongés et talons retournés : portés par ceux du dessous ? Séparation dans la marge.",
  },
  {
    file: "pile-1x1-normal-hybride-marge-cellules.3mf",
    priority: 5,
    construction: "Normal hybride, marge 10,5 mm en cellules tronquées",
    settings: { ...PAIR_MARGIN, marginShape: "cells" },
    plate: PLATE_70,
    judge: "Mur extérieur des cellules tronquées posé sur celui du dessous ; séparation dans la marge.",
  },
  {
    file: "pile-1x1-autonome-normal-hybride.3mf",
    priority: 2,
    construction: "Normal hybride, 2 plaques 1 × 1 autonomes (non découpées)",
    settings: { ...SINGLE },
    twin: true,
    judge: "Comme Normal hybride, avec des fentes de bord sur les 4 côtés et sans numéro gravé : ponts de fente au joint.",
  },
];

let wasm: ManifoldToplevel;
const solidOf = (mesh: TriangleMesh): Manifold => new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices }));

/** Les coquilles d'une pile (sans oreilles ni pions), une par pièce, dans l'ordre de la pile. */
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

const zRange = ({ positions }: TriangleMesh) => {
  let [min, max] = [Infinity, -Infinity];
  for (let v = 2; v < positions.length; v += 3) [min, max] = [Math.min(min, positions[v] as number), Math.max(max, positions[v] as number)];
  return [min, max] as const;
};

/** Le joint : dessous de la plaque du dessus (0,01 mm au-dessus), contact avec le dessus de celle du dessous (0,01 mm sous le joint), part non portée. */
async function joint(lower: TriangleMesh, upper: TriangleMesh) {
  const top = zRange(lower)[1];
  const bottom = zRange(upper)[0];
  const under = (await checkMesh(lower, [top - 0.01])).sections.get(top - 0.01) as [number, number][][];
  const over = (await checkMesh(upper, [bottom + 0.01])).sections.get(bottom + 0.01) as [number, number][][];
  const face = await sectionArea(over);
  const unheld = await areaOutside(over, under);
  return { gap: bottom - top, face, contact: face - unheld, unheld };
}

/**
 * Surplombs horizontaux de la plaque retournée : ses faces tournées vers le bas au-dessus de son
 * dessous (ponts, départs en l'air). Surface totale, et la plus grande pièce (côté court × long).
 */
function ceilingsOf(mesh: TriangleMesh): { area: number; span: number } {
  const solid = solidOf(mesh);
  const [bottom] = zRange(mesh);
  const { positions: p, indices } = mesh;
  const levels = new Set<number>();
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [3 * (indices[t] as number), 3 * (indices[t + 1] as number), 3 * (indices[t + 2] as number)];
    const [ux, uy, uz] = [(p[b] as number) - (p[a] as number), (p[b + 1] as number) - (p[a + 1] as number), (p[b + 2] as number) - (p[a + 2] as number)];
    const [vx, vy, vz] = [(p[c] as number) - (p[a] as number), (p[c + 1] as number) - (p[a + 1] as number), (p[c + 2] as number) - (p[a + 2] as number)];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const z = p[a + 2] as number;
    if (nz < -0.999 * Math.hypot(nx, ny, nz) && z > bottom + 0.01) levels.add(Math.round(z * 1000) / 1000);
  }
  let [area, span] = [0, 0];
  for (const z of levels) {
    const below = solid.slice(z - 0.005);
    const above = solid.slice(z + 0.005);
    const ceiling = above.subtract(below);
    area += ceiling.area();
    // Largeur du surplomb : le diamètre du plus grand disque qu'il contient (bissection sur un décalage vers l'intérieur).
    // Simplifiée d'abord : le décalage de Clipper perd des contours presque confondus (sommets en Float32).
    const clean = ceiling.simplify(1e-3);
    let [inside, outside] = [0, 30];
    for (let k = 0; k < 16; k++) {
      const r = (inside + outside) / 2;
      const shrunk = clean.offset(-r, "Round");
      if (shrunk.isEmpty()) outside = r;
      else inside = r;
      shrunk.delete();
    }
    span = Math.max(span, 2 * inside);
    for (const section of [below, above, ceiling, clean]) section.delete();
  }
  solid.delete();
  return { area, span };
}

it("piles de 2 plaques d'une cellule : fichiers relus et mesures", async () => {
  wasm = await loadManifold();
  const rows: string[] = [];
  const notes: string[] = [];
  for (const c of CASES) {
    const baseplate = await generateBaseplate(c.settings, "final", c.plate ? { buildPlate: c.plate } : {});
    const settings = { ...DEFAULT_SETTINGS, ...c.settings };
    const height = baseplate.stats.dimensions.height;
    const rule = stackRuleOf(settings, baseplate.layout);
    const plan: StackPlan = c.twin
      ? (() => {
          const { pitch } = stackPlanOf(baseplate.layout, height, LAYER);
          return { pitch, stacks: [[{ index: 0, number: 1, flip: "none", offset: [0, 0], z: 0 }, { index: 0, number: 1, flip: "x", offset: [0, 0], z: pitch }]] };
        })()
      : stackPlanOf(baseplate.layout, height, LAYER);
    expect(plan.stacks).toHaveLength(1);
    expect(plan.stacks[0]).toHaveLength(2);
    const stack = plan.stacks[0] as StackPlan["stacks"][number];
    const options = { layerHeight: LAYER, lineWidth: LINE, ears: !!c.anchors, pins: !!c.anchors };
    const stacks = await printStacks(baseplate, plan, options);
    const clips = printClips(baseplate, stacks.map(({ mesh }) => mesh));
    const objects = stacks.map(({ mesh, pieces }, k) => ({ mesh, name: `pile ${k + 1} : pièces ${pieces.join(", ")}` }));
    if (clips) objects.push({ mesh: clips, name: `clip × ${baseplate.stats.clips}` });
    const bytes = serialize3mf(objects, { name: c.file.replace(/\.3mf$/, ""), shareLink: `prototypes/stack-1x1/bench.test.ts : ${c.construction}` });
    writeFileSync(new URL(`files/${c.file}`, OUT), bytes);

    // Relecture : mêmes sommets (Z conservés), chaque objet NoError sans arête pincée, chaque coquille aussi.
    const content = readThreeMf(bytes);
    expect(content.objects).toHaveLength(objects.length);
    let drift = 0;
    for (const [k, { mesh }] of content.objects.entries()) {
      const original = (objects[k] as { mesh: TriangleMesh }).mesh;
      expect(mesh.positions.length).toBe(original.positions.length);
      for (let v = 0; v < mesh.positions.length; v++) drift = Math.max(drift, Math.abs((mesh.positions[v] as number) - (original.positions[v] as number)));
      expect((await checkMesh(mesh)).status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
    }
    expect(drift).toBeLessThan(1e-4);
    const read = (content.objects[0] as { mesh: TriangleMesh }).mesh;
    const [, stackTop] = zRange(read);

    // Joint et surplombs mesurés sur les coquilles relues ; avec oreilles et pions (une seule union), sur la pile sans elles.
    const bare = c.anchors ? (await printStacks(baseplate, plan, { ...options, ears: false, pins: false }))[0]?.mesh as TriangleMesh : read;
    const shells = shellsOf(bare, baseplate, stack);
    for (const shell of shells) {
      expect((await checkMesh(shell)).status).toBe("NoError");
      expect(badEdges(shell)).toBe(0);
    }
    const [lower, upper] = shells as [TriangleMesh, TriangleMesh];
    expect(zRange(lower)[0]).toBeCloseTo(0, 5);
    expect(zRange(upper)[0]).toBeCloseTo(plan.pitch, 4);
    const { gap, face, contact, unheld } = await joint(lower, upper);
    expect(gap).toBeCloseTo(LAYER, 4);
    const ceilings = ceilingsOf(upper);

    const pileVolume = (await checkMesh(read)).volume;
    const clipsVolume = clips ? (await checkMesh(clips)).volume : 0;
    const mass = massOf({ volume: pileVolume, clips: clipsVolume }, DEFAULT_FILAMENT);
    const verdict = rule.blockers.filter((b) => b !== "single-piece").length > 0 ? `refusée (${rule.blockers.join(", ")})` : c.twin ? "hors site (pièce unique)" : rule.warnings.length > 0 ? `avertie (${rule.warnings.join(", ")})` : "permise";
    const flips = stack.map(({ number, flip }) => `${number}${flip === "none" ? "" : flip === "x" ? "↕" : "↔"}`).join("-");
    const slots = baseplate.layout.clips;
    rows.push(
      `| ${c.priority} | \`files/${c.file}\` | ${c.construction} | ${verdict} | ${flips} | ${fr(height)} / ${fr(plan.pitch)} | ${fr(stackTop)} | ${fr(pileVolume / 1000, 2)} | ${baseplate.stats.clips} (${fr(clipsVolume, 1)} mm³) | ${fr(mass.total, 1)} | ${fr(face, 0)} | ${fr(contact, 0)} | ${fr(unheld, 1)} | ${ceilings.area > 0.01 ? `${fr(ceilings.area, 0)} mm², large de ${fr(ceilings.span, 1)} mm` : "aucun"} |`,
    );
    notes.push(
      `- \`${c.file}\` : ${content.objects.length} objet(s) relu(s) NoError, badEdges 0 (objets et coquilles), écart des sommets relus ${drift.toExponential(1)} mm, jeu ${fr(gap, 3)} mm ; ${baseplate.stats.magnets} aimants, fentes : ${slots?.placements.length ?? 0} de jonction, ${slots?.edges.length ?? 0} de bord. À juger : ${c.judge}`,
    );
  }
  writeFileSync(
    new URL("results.md", OUT),
    [
      "# Résultats du banc (généré par `bench.test.ts`)",
      "",
      `Qualité finale, couches de ${fr(LAYER)} mm, largeur de ligne ${fr(LINE)} mm, PLA ${fr(DEFAULT_FILAMENT.density)} g/cm³ (apps/web/lib/mass.ts).`,
      "",
      "| Priorité | Fichier | Construction | Règle du site | Pile | Hauteur plaque / pas (mm) | Hauteur de pile (mm) | Volume pile (cm³) | Clips à part | g PLA (pile + clips) | Dessous (mm²) | Contact (mm²) | Non porté (mm²) | Surplombs de la plaque retournée |",
      "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
      ...rows.sort((a, b) => Number(a.split("|")[1]) - Number(b.split("|")[1])),
      "",
      "Pile : numéros du bas vers le haut ; ↕ retournée autour de X (l'arrière vers l'avant), ↔ autour de Y (la gauche vers la droite). « Dessous » : section de la plaque du dessus 0,01 mm au-dessus du joint ; « Contact » : sa part au-dessus de la section de la plaque du dessous 0,01 mm sous le joint (`sectionArea`, `areaOutside`) ; « Non porté » : le reste (ponts). « Surplombs » : faces tournées vers le bas dans la plaque retournée, au-dessus de son dessous (surface totale ; largeur du plus large, diamètre du plus grand disque qu'il contient : la portée du pont ou du départ en l'air).",
      "",
      "## Contrôles et ce qu'il faut juger",
      "",
      ...notes,
      "",
    ].join("\n"),
  );
}, 300_000);

it("deux constats : le Skeleton d'une cellule n'a pas de muret entaillé ; retourner autour de Y ne laisserait rien en l'air", async () => {
  wasm = await loadManifold();
  const lines: string[] = ["## Constats mesurés", ""];
  // Sans fentes ni aimants, le Skeleton de la paire découpée pèse ce que pèse le Normal : aucune entaille.
  const volume = async (type: "normal" | "skeleton") =>
    (await generateBaseplate({ ...PAIR, baseplateType: type }, "final", { buildPlate: PLATE_50, clips: false, magnets: false })).stats.volume as number;
  const [normal, skeleton] = [await volume("normal"), await volume("skeleton")];
  lines.push(
    `- Skeleton, pièces d'une cellule : sans fentes ni aimants, ${fr(skeleton, 1)} mm³ contre ${fr(normal, 1)} mm³ en Normal (écart ${fr(skeleton - normal, 3)} mm³). Le tour du treillis n'est jamais entaillé, et le seul muret intérieur (la coupe) porte le numéro de la pièce, donc reste entier : une plaque Skeleton d'une cellule n'a aucune bande (vérifié aussi, à la main, avec 10,5 mm de marge en cellules tronquées : 7,99 contre 7,98 cm³ avec fentes, soit le seul écart des fentes plus courtes), ses seules différences sont des fentes de clip plus courtes (4,0 mm au lieu de 5). La bande retournée se juge sur \`prototypes/stack/files/pile-3-pieces-skeleton.3mf\`.`,
  );
  // La paire découpée, 2e plaque retournée autour de Y au lieu de X (plan écrit à la main).
  const baseplate = await generateBaseplate(PAIR, "final", { buildPlate: PLATE_50 });
  const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
  const measure = async (flip: "x" | "y") => {
    const stack = (plan.stacks[0] as StackPlan["stacks"][number]).map((piece, k) => (k === 0 ? piece : { ...piece, flip, offset: [flip === "x" ? -42 : 0, 0] as [number, number] }));
    const [printed] = await printStacks(baseplate, { ...plan, stacks: [stack] }, { layerHeight: LAYER, lineWidth: LINE, ears: false, pins: false });
    const [lower, upper] = shellsOf(printed?.mesh as TriangleMesh, baseplate, stack) as [TriangleMesh, TriangleMesh];
    return joint(lower, upper);
  };
  const [x, y] = [await measure("x"), await measure("y")];
  expect(x.gap).toBeCloseTo(LAYER, 4);
  expect(y.gap).toBeCloseTo(LAYER, 4);
  lines.push(
    `- Paire découpée, Normal hybride : le moteur retourne la 2e plaque autour de X (↕). Ses deux coins de coupe, carrés, tombent alors sur les coins arrondis (rayon 4 mm) du contour de la 1re : ${fr(x.unheld, 1)} mm² en l'air sur ${fr(x.face, 0)} mm² de dessous. Retournée autour de Y (↔), coins carrés sur coins carrés : ${fr(y.unheld, 1)} mm² en l'air, contact ${fr(y.contact, 0)} mm². \`stackPlanOf\` essaie X d'abord et ne regarde pas les coins arrondis : à trancher (ce banc ne modifie pas le moteur).`,
    "",
  );
  writeFileSync(new URL("results.md", OUT), `${readFileSync(new URL("results.md", OUT), "utf8")}\n${lines.join("\n")}`);
}, 120_000);
