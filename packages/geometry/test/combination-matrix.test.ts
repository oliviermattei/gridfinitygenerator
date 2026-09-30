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
// here the types, the shapes of the margin, the cut with clips, the profiles and the screws
// are combined, in final quality, by the cell bricks and by booleans (ADR 0004). Every mesh
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
 * The matrix: every type × margin × cut, the profile and the screws varied so that every
 * pair of values of any two settings is met at least once (pairwise). 24 of the 96 cases.
 */
const MATRIX: Case[] = BASEPLATE_TYPES.flatMap((baseplateType, t) =>
  MARGIN_SHAPES.flatMap((marginShape, m) =>
    [false, true].map((cut, c) => {
      const pocketProfile = PROFILES[(t + m + c) % 2] as PocketProfileName;
      const screws = (t + c) % 2 === 1;
      return {
        name: `${baseplateType}, ${marginShape}, ${cut ? "cut on 256 with clips" : "whole"}, ${pocketProfile}${screws ? ", screws" : ""}`,
        settings: { ...DRAWER, baseplateType, marginShape, pocketProfile, screws },
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
];
const EDGE_CASES: Case[] = EDGES.flatMap(([name, extra], e) =>
  BASEPLATE_TYPES.map((baseplateType, t) => {
    const marginShape = MARGIN_SHAPES[(e + t) % MARGIN_SHAPES.length];
    const pocketProfile = PROFILES[(e + t) % 2] as PocketProfileName;
    return {
      name: `${name}: ${baseplateType}, ${marginShape}, ${pocketProfile}`,
      settings: { ...DRAWER, ...extra, baseplateType, marginShape, pocketProfile, screws: true },
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
  it("covers every pair of values of type, margin, cut, profile and screws", () => {
    const factors = MATRIX.map(({ settings: s, buildPlate }) => [s.baseplateType, s.marginShape, buildPlate ? "cut" : "whole", s.pocketProfile, String(s.screws)]);
    const values = [BASEPLATE_TYPES, MARGIN_SHAPES, ["whole", "cut"], PROFILES, ["false", "true"]] as const;
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
      expect(baseplate.stats.clips > 0).toBe(c.settings.baseplateType !== "skeleton");
    }
    if (c.settings.screws) expect(baseplate.stats.screws).toBeGreaterThan(0);
  });

  it.each(EDGE_CASES.map((c) => [c.name, c] as const))("%s: NoError, no pinched edge, same volume by bricks and booleans", async (_, c) => {
    const baseplate = await expectSoundAndSame(c);
    expect(baseplate.stats.pieces).toBeGreaterThan(1);
  });
});
