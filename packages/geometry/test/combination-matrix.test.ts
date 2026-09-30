import { describe, expect, it } from "vitest";
import {
  BASEPLATE_TYPES,
  MARGIN_SHAPES,
  generateBaseplate,
  type BaseplateSettings,
  type BuildPlate,
  type PocketProfileName,
} from "../src/index";
import { badEdges, checkMesh } from "./support/measure";

// Quality check across the settings of spec v1.1 (#20): each ticket checked its own cases;
// here the types, the shapes of the margin, whole or minimal (#29), the cut with clips, the
// profiles and the screws are combined, in final quality, by the cell bricks and by booleans (ADR 0004). Every mesh
// must be NoError AND have each edge on exactly two faces (NoError does not see an edge
// pinched between four faces, ADR 0014), and both ways must give the same volume.

const VOLUME_TOLERANCE_MM3 = 0.1;
const PLATE_256: BuildPlate = { width: 256, depth: 256 };
const PROFILES: readonly PocketProfileName[] = ["hybrid", "flush"];

/**
 * A small drawer with a margin on the 4 sides, cut in 2 pieces for a plate of 256 mm: 6 × 2
 * cells, margins of 8.5 mm left and right and 17.5 mm front and back.
 */
const DRAWER: Partial<BaseplateSettings> = { drawerWidth: 270, drawerDepth: 120 };

interface Case {
  name: string;
  settings: Partial<BaseplateSettings>;
  buildPlate: BuildPlate | null;
}

/**
 * The matrix: every type × margin × cut, the profile, the screws and the minimal margin varied
 * so that every pair of values of any two settings is met at least once (pairwise). 24 of the
 * 192 cases.
 */
const MATRIX: Case[] = BASEPLATE_TYPES.flatMap((baseplateType, t) =>
  MARGIN_SHAPES.flatMap((marginShape, m) =>
    [false, true].map((cut, c) => {
      const pocketProfile = PROFILES[(t + m + c) % 2] as PocketProfileName;
      const screws = (t + c) % 2 === 1;
      const minimalMargin = (m + c) % 2 === 1;
      return {
        name: `${baseplateType}, ${marginShape}${minimalMargin ? " minimal" : ""}, ${cut ? "cut on 256 with clips" : "whole"}, ${pocketProfile}${screws ? ", screws" : ""}`,
        settings: { ...DRAWER, baseplateType, marginShape, minimalMargin, pocketProfile, screws },
        buildPlate: cut ? PLATE_256 : null,
      };
    }),
  ),
);

/** Edge cases, cut with clips and screwed, on each type; the margin and the profile rotate. */
const EDGES: [name: string, settings: Partial<BaseplateSettings>][] = [
  ["bottom chamfer of 1 mm", { bottomChamfer: 1 }],
  ["outer radius of 10 mm", { outerRadius: 10 }],
  ["cells of 30 mm", { cellSize: 30 }],
  ["grid in the back left corner", { alignment: "tl" }],
  // A margin wider than a cell (#29): whole cells, and a muret along the band not built.
  ["margins of 50 mm, a 2 mm chamfer and a radius of 8 mm", { drawerWidth: 350, drawerDepth: 240, bottomChamfer: 2, outerRadius: 8, alignment: "br" }],
];
/** A crossing of two cuts (#30): 4 clips at the most crowded corner, on each type. */
const CROSSED: Case[] = BASEPLATE_TYPES.map((baseplateType, t) => ({
  name: `cut in 4 around a crossing of the cuts: ${baseplateType}, ${MARGIN_SHAPES[t % MARGIN_SHAPES.length]}, ${PROFILES[t % 2]}`,
  settings: { drawerWidth: 150, drawerDepth: 150, baseplateType, marginShape: MARGIN_SHAPES[t % MARGIN_SHAPES.length], pocketProfile: PROFILES[t % 2], screws: true },
  buildPlate: { width: 100, depth: 100 },
}));
const EDGE_CASES: Case[] = EDGES.flatMap(([name, extra], e) =>
  BASEPLATE_TYPES.map((baseplateType, t) => {
    const marginShape = MARGIN_SHAPES[(e + t) % MARGIN_SHAPES.length];
    const pocketProfile = PROFILES[(e + t) % 2] as PocketProfileName;
    const minimalMargin = Math.floor((e + t) / MARGIN_SHAPES.length) % 2 === 1;
    return {
      name: `${name}: ${baseplateType}, ${marginShape}${minimalMargin ? " minimal" : ""}, ${pocketProfile}`,
      settings: { ...DRAWER, ...extra, baseplateType, marginShape, minimalMargin, pocketProfile, screws: true },
      buildPlate: PLATE_256,
    };
  }),
);

async function expectSoundAndSame({ settings, buildPlate }: Case) {
  const [bricks, booleans] = await Promise.all([
    generateBaseplate(settings, "final", { strategy: "bricks", buildPlate }),
    generateBaseplate(settings, "final", { strategy: "boolean", buildPlate }),
  ]);
  for (const [way, { mesh }] of [
    ["bricks", bricks],
    ["booleans", booleans],
  ] as const) {
    expect((await checkMesh(mesh)).status, way).toBe("NoError");
    expect(badEdges(mesh), way).toBe(0);
  }
  const [a, b] = [bricks.stats.volume as number, booleans.stats.volume as number];
  expect(Math.abs(a - b), `${a} vs ${b} mm³`).toBeLessThanOrEqual(VOLUME_TOLERANCE_MM3);
  expect(bricks.layout).toEqual(booleans.layout);
  return bricks;
}

describe("combinations of the settings of v1.1, in final quality", () => {
  it("covers every pair of values of type, margin, cut, profile, screws and minimal margin", () => {
    const factors = MATRIX.map(({ settings: s, buildPlate }) => [s.baseplateType, s.marginShape, buildPlate ? "cut" : "whole", s.pocketProfile, String(s.screws), String(s.minimalMargin)]);
    const values = [BASEPLATE_TYPES, MARGIN_SHAPES, ["whole", "cut"], PROFILES, ["false", "true"], ["false", "true"]] as const;
    for (let f = 0; f < values.length; f++)
      for (let g = f + 1; g < values.length; g++)
        for (const x of values[f] as readonly string[])
          for (const y of values[g] as readonly string[]) {
            expect(
              factors.some((row) => row[f] === x && row[g] === y),
              `${x} with ${y}`,
            ).toBe(true);
          }
  });

  it.each(MATRIX.map((c) => [c.name, c] as const))("%s: NoError, no pinched edge, same volume by bricks and booleans", async (_, c) => {
    const baseplate = await expectSoundAndSame(c);
    const { margins } = baseplate.layout;
    expect(Math.min(margins.left, margins.right, margins.back, margins.front)).toBeGreaterThan(0);
    if (c.buildPlate) {
      expect(baseplate.stats.pieces).toBe(2);
      // Every type takes its clips (ADR 0018): a junction of 2 cells, a single clip.
      expect(baseplate.stats.clips).toBe(1);
    }
    if (c.settings.screws) expect(baseplate.stats.screws).toBeGreaterThan(0);
  });

  it.each(EDGE_CASES.map((c) => [c.name, c] as const))("%s: NoError, no pinched edge, same volume by bricks and booleans", async (_, c) => {
    const baseplate = await expectSoundAndSame(c);
    expect(baseplate.stats.pieces).toBeGreaterThan(1);
  });

  it.each(CROSSED.map((c) => [c.name, c] as const))("%s: NoError, no pinched edge, same volume by bricks and booleans", async (_, c) => {
    const baseplate = await expectSoundAndSame(c);
    expect(baseplate.stats.pieces).toBe(4);
    expect(baseplate.layout.split.columnCuts).toHaveLength(1);
    expect(baseplate.layout.split.rowCuts).toHaveLength(1);
    expect(baseplate.stats.clips).toBe(4);
  });
});
