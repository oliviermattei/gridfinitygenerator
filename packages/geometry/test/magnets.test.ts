import { describe, expect, it } from "vitest";
import { MARGIN_SHAPES, generateBaseplate, pieceMesh, type BaseplateSettings, type BuildPlate, type Quality } from "../src/index";
import { HYBRID_OPENINGS, areaOutside, checkMesh, pocketOpening, type Disc } from "./support/measure";

// Magnet holes (#24, ADR 0012), observed through the public interface only: a hole of the
// magnet (6 × 2 mm) plus the hole gap, open underneath, under each crossing of the murets the
// material holds; the bench and its measures are in prototypes/magnets.

const TOLERANCE_MM = 0.001;
/** A 6 mm magnet plus the default hole gap (0.5 mm). */
const HOLE_MM = 6.5;
/** 2 mm of magnet plus 0.2 mm, at the default 0.2 mm layer: 11 layers. */
const DEPTH_MM = 2.2;
const BARE = { magnets: false };
const PLATE_256: BuildPlate = { width: 256, depth: 256 };

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

const cells = (columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> => ({
  sizeMode: "cells",
  columns,
  rows,
  ...settings,
});

/** Positions sorted along X then Y, to compare them regardless of order. */
function sorted(positions: readonly (readonly [number, number])[]): [number, number][] {
  return positions.map(([x, y]) => [x, y] as [number, number]).sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
}

function expectPositions(actual: readonly (readonly [number, number])[], expected: [number, number][]) {
  const [a, b] = [sorted(actual), sorted(expected)];
  expect(a.length).toBe(b.length);
  a.forEach(([x, y], i) => {
    expectWithin(x, (b[i] as [number, number])[0]);
    expectWithin(y, (b[i] as [number, number])[1]);
  });
}

const grid = (xs: number[], ys: number[]) => xs.flatMap((x) => ys.map((y) => [x, y] as [number, number]));
const steps = (first: number, count: number, step = 42) => Array.from({ length: count }, (_, k) => first + k * step);

/** Area of the polygon of a hole of `segments` sides, the one the engine removes. */
const holeArea = (diameter: number, segments: number) => (segments / 2) * (diameter / 2) ** 2 * Math.sin((2 * Math.PI) / segments);

/** Contour of a disc, to measure what of it lies outside a section. */
const discContour = (x: number, y: number, radius: number): [number, number][][] => [
  Array.from({ length: 256 }, (_, k) => [x + radius * Math.cos((2 * Math.PI * k) / 256), y + radius * Math.sin((2 * Math.PI * k) / 256)] as [number, number]),
];

describe("layout of the magnets: under the crossings of the murets the material holds", () => {
  it("puts a magnet under each inner crossing of the grid, none on its edge without a margin", async () => {
    const { layout, stats } = await generateBaseplate(cells(4, 3), "preview");
    // 168 × 126 mm centred on the origin: inner grid lines at x = −42, 0, 42 and y = −21, 21.
    expectPositions(layout.magnets, grid([-42, 0, 42], [-21, 21]));
    expect(stats.magnets).toBe(6);
    expectPositions((await generateBaseplate(cells(2, 2), "preview")).layout.magnets, [[0, 0]]);
    for (const [columns, rows] of [
      [1, 5],
      [5, 1],
      [1, 1],
    ] as const) {
      const { layout: single, stats: counted } = await generateBaseplate(cells(columns, rows), "preview");
      expect(single.magnets).toEqual([]);
      expect(counted.magnets).toBe(0);
    }
  });

  it.each([
    ["frame", false],
    ["frame", true],
    ["cells", true],
    ["extended", true],
  ] as const)(
    "gives the default drawer 40 magnets with the %s margin (minimal: %s): none on the edge of the grid, the margin is lower than the hole or leaves it half empty",
    async (marginShape, minimalMargin) => {
      // 9 × 6 cells centred in 10.5 and 13.5 mm margins: (9 − 1) × (6 − 1) inner crossings.
      const { layout, stats } = await generateBaseplate({ marginShape, minimalMargin }, "preview");
      expect(stats.magnets).toBe(40);
      expectPositions(layout.magnets, grid(steps(-147, 8), steps(-84, 5)));
    },
  );

  it("carries the magnets on to the edge of the grid with the truncated cells, which carry the murets on", async () => {
    // Every crossing of the 9 × 6 grid, its edges included: 10 × 7.
    const { layout, stats } = await generateBaseplate({ marginShape: "cells" }, "preview");
    expect(stats.magnets).toBe(70);
    expectPositions(layout.magnets, grid(steps(-189, 10), steps(-126, 7)));
  });

  it.each<[string, Partial<BaseplateSettings>, number]>([
    // The hole (3.25 mm) and a wall (1.2 mm) take 4.45 mm from the crossing to the outline.
    ["8 mm margins: the 8 crossings of the edge", { marginWidth: 16, marginDepth: 16 }, 9],
    ["4 mm margins: too narrow for the hole and its wall", { marginWidth: 8, marginDepth: 8 }, 1],
    ["8 mm margins and a 3 mm bottom chamfer: 7.45 mm fit", { marginWidth: 16, marginDepth: 16, bottomChamfer: 3 }, 9],
    ["7 mm margins and a 3 mm bottom chamfer: 7.45 mm do not", { marginWidth: 14, marginDepth: 14, bottomChamfer: 3 }, 1],
    // The corner of the grid is 10 − √2 × 4 = 4.34 mm inside an outer corner of 10 mm radius.
    ["6 mm margins and outer corners of 10 mm: not in the corners", { marginWidth: 12, marginDepth: 12, outerRadius: 10 }, 5],
    ["a margin on the left only", { marginWidth: 16, alignment: "r" }, 2],
  ])("keeps a wall between each hole of the edge and the outline, truncated cells around 2 × 2 cells, %s", async (_, settings, count) => {
    const { stats } = await generateBaseplate(cells(2, 2, { marginShape: "cells", ...settings }), "preview");
    expect(stats.magnets).toBe(count);
  });

  it("puts magnets under the whole cells of the margin, and on the edge of the lattice beyond them", async () => {
    // 2 × 2 cells and 50 mm on each side along X: one whole cell of the margin on each side,
    // then 8 mm of truncated cells. No margin along Y: the front and back rows are on the outline.
    const { layout } = await generateBaseplate(cells(2, 2, { marginShape: "cells", marginWidth: 100 }), "preview");
    expectPositions(layout.magnets, grid([-84, -42, 0, 42, 84], [0]));
  });

  it("puts no magnet where a screw sits", async () => {
    const screwed = await generateBaseplate(cells(4, 3, { screws: true }), "preview");
    expect(screwed.stats.screws).toBe(6);
    expect(screwed.layout.magnets).toEqual([]);
    // Truncated cells: the screws on the 40 inner crossings, the magnets on the 30 of the edge.
    const edge = await generateBaseplate({ marginShape: "cells", screws: true }, "preview");
    expect(edge.stats.screws).toBe(40);
    expect(edge.stats.magnets).toBe(30);
    const inner = (x: number, y: number) => Math.abs(x) < 189 - 1 && Math.abs(y) < 126 - 1;
    expect(edge.layout.magnets.filter(([x, y]) => inner(x, y))).toEqual([]);
  });

  it.each(MARGIN_SHAPES)("puts no magnet on a crossing of murets that a cut goes through (%s margin)", async (marginShape) => {
    const whole = await generateBaseplate({ marginShape }, "preview");
    const cut = await generateBaseplate({ marginShape }, "preview", { buildPlate: PLATE_256 });
    const { columnCuts, rowCuts } = cut.layout.split;
    expect(cut.stats.pieces).toBe(4);
    const [x0, y0] = [-189, -126];
    const onCut = ([x, y]: [number, number]) =>
      columnCuts.some((a) => Math.abs(x - (x0 + 42 * a)) < TOLERANCE_MM) || rowCuts.some((b) => Math.abs(y - (y0 + 42 * b)) < TOLERANCE_MM);
    expect(cut.layout.magnets.filter(onCut)).toEqual([]);
    expectPositions(cut.layout.magnets, whole.layout.magnets.filter((position) => !onCut(position)));
    expect(cut.stats.magnets).toBe(marginShape === "frame" ? 40 - 5 - 8 + 1 : 70 - 7 - 10 + 1);
  });
});

describe.each<Quality>(["preview", "final"])("magnet holes, %s quality", (quality) => {
  it("drills a hole of the magnet plus the hole gap, from underneath up to 2.20 mm, at each magnet and nowhere else", async () => {
    const { layout, mesh } = await generateBaseplate(cells(4, 3), quality);
    const { sections } = await checkMesh(mesh, [0.1, 1.5, DEPTH_MM - 0.01, DEPTH_MM + 0.01]);
    for (const z of [0.1, 1.5, DEPTH_MM - 0.01]) {
      // The outline, one pocket per cell and one hole per magnet.
      expect(sections.get(z)).toHaveLength(1 + 12 + 6);
      for (const position of layout.magnets) {
        const hole = pocketOpening(sections.get(z) ?? [], [...position]);
        expectWithin(hole?.width, HOLE_MM);
        expectWithin(hole?.depth, HOLE_MM);
      }
    }
    expect(sections.get(DEPTH_MM + 0.01)).toHaveLength(1 + 12);
  });

  it.each([0, 0.3, 1])("follows the hole gap of %s mm, like the screws", async (holeGap) => {
    const { layout, mesh } = await generateBaseplate(cells(3, 3, { holeGap }), quality);
    const { sections } = await checkMesh(mesh, [1]);
    for (const position of layout.magnets) expectWithin(pocketOpening(sections.get(1) ?? [], [...position])?.width, 6 + holeGap);
  });

  it.each<[layerHeight: number, depth: number]>([
    [0.2, 2.2],
    [0.28, 2.24],
    [0.12, 2.28],
  ])("is 2.2 mm deep rounded up to the %s mm layer: %s mm", async (layerHeight, depth) => {
    const { layout, mesh } = await generateBaseplate(cells(2, 2, { layerHeight }), quality);
    const { sections } = await checkMesh(mesh, [depth - 0.01, depth + 0.01]);
    const centre = [...(layout.magnets[0] as [number, number])] as [number, number];
    expectWithin(pocketOpening(sections.get(depth - 0.01) ?? [], centre)?.width, HOLE_MM);
    expect(sections.get(depth + 0.01)).toHaveLength(1 + 4);
  });
});

describe("the bins stay seated: the holes take nothing from the pockets", () => {
  const PROFILES = {
    hybrid: [...HYBRID_OPENINGS.map(({ z }) => z), 2.1, 2.3, 2.9],
    flush: [0.1, 0.5, 1.5, 2.1, 2.3, 2.6, 3.5, 4.1],
  } as const;

  it.each<[string, Partial<BaseplateSettings>]>([
    ["4 × 3 cells, hybrid", cells(4, 3)],
    ["4 × 3 cells of 20 mm, flush", cells(4, 3, { cellSize: 20, pocketProfile: "flush" })],
    ["truncated cells around 2 × 2 cells, 8 mm margins, hole gap of 1 mm", cells(2, 2, { marginShape: "cells", marginWidth: 16, marginDepth: 16, holeGap: 1 })],
  ])("%s: at every height of reference, only the holes are taken away, and above them nothing", async (_, settings) => {
    const [bare, drilled] = await Promise.all([generateBaseplate(settings, "final", BARE), generateBaseplate(settings, "final")]);
    expect(drilled.stats.magnets).toBeGreaterThan(0);
    const heights = PROFILES[settings.pocketProfile ?? "hybrid"];
    const [before, after] = await Promise.all([checkMesh(bare.mesh, heights), checkMesh(drilled.mesh, heights)]);
    const radius = (6 + (settings.holeGap ?? 0.5)) / 2;
    const discs: Disc[] = drilled.layout.magnets.map(([x, y]) => ({ x, y, radius: radius + 0.01 }));
    for (const z of heights) {
      const [a, b] = [before.sections.get(z) ?? [], after.sections.get(z) ?? []];
      // Below the ceiling of the holes, nothing but the holes; above it, the section is intact:
      // the upper slope of the pockets, where the bins are seated, above all.
      expect(await areaOutside(a, b, z < DEPTH_MM ? discs : []), `material lost outside the holes at z = ${z}`).toBeLessThan(1e-3);
      expect(await areaOutside(b, a), `material added at z = ${z}`).toBeLessThan(1e-3);
      if (z > DEPTH_MM) continue;
      // Each hole lies whole in the material of the crossing: it cuts into no pocket.
      for (const { x, y } of discs) expect(await areaOutside(discContour(x, y, radius), a), `hole cutting a pocket at z = ${z}`).toBeLessThan(1e-3);
    }
    // Each hole takes its whole volume, the polygon of 64 sides of the final mesh over 2.20 mm.
    const perHole = holeArea(2 * radius, 64) * DEPTH_MM;
    expectWithin((bare.stats.volume as number) - (drilled.stats.volume as number), drilled.stats.magnets * perHole, 0.01);
  });

  it("keeps every pocket of 4 × 3 cells intact at every height of reference", async () => {
    const { mesh } = await generateBaseplate(cells(4, 3), "final");
    const { sections } = await checkMesh(
      mesh,
      HYBRID_OPENINGS.map(({ z }) => z),
    );
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const centre: [number, number] = [(i - 1.5) * 42, (j - 1) * 42];
        for (const { z, inset } of HYBRID_OPENINGS) {
          const opening = pocketOpening(sections.get(z) ?? [], centre);
          expectWithin(opening?.width, 42 - 2 * inset);
          expectWithin(opening?.depth, 42 - 2 * inset);
          expectWithin(opening?.area, (42 - 2 * inset) ** 2 - (4 - Math.PI) * (4 - inset) ** 2, 0.02);
        }
      }
  });

  it("keeps the height of the baseplate and its genus: the holes are blind", async () => {
    const [bare, drilled] = await Promise.all([generateBaseplate(cells(4, 3), "preview", BARE), generateBaseplate(cells(4, 3), "preview")]);
    const [a, b] = await Promise.all([checkMesh(bare.mesh), checkMesh(drilled.mesh)]);
    expect(b.genus).toBe(a.genus);
    expect(drilled.stats.dimensions).toEqual(bare.stats.dimensions);
    expect(drilled.stats.layers).toBe(bare.stats.layers);
  });
});

describe("with magnets, the mesh", () => {
  const VOLUME_TOLERANCE_MM3 = 0.1;
  const CASES: [string, Partial<BaseplateSettings>][] = [
    ["2 × 2", cells(2, 2)],
    ["3 × 2", cells(3, 2)],
    ["7 × 4", cells(7, 4)],
    ["the default drawer (frame of crossbars)", {}],
    ["the default drawer, frame reduced to its supports", { minimalMargin: true }],
    ["the default drawer in extended grid, magnets on the edge", { marginShape: "extended" }],
    ["the default drawer in minimal truncated cells", { marginShape: "cells", minimalMargin: true }],
    ["the default drawer in truncated cells, magnets on the edge", { marginShape: "cells" }],
    ["truncated cells with whole cells of margin", cells(2, 2, { marginShape: "cells", marginWidth: 100, marginDepth: 60 })],
    ["truncated cells, chamfered, rounded 10 mm", cells(3, 2, { marginShape: "cells", marginWidth: 16, marginDepth: 20, bottomChamfer: 3, outerRadius: 10 })],
    ["flush, 0.28 mm layers, hole gap of 1 mm", cells(3, 3, { pocketProfile: "flush", layerHeight: 0.28, holeGap: 1 })],
    ["screws and magnets, truncated cells", { marginShape: "cells", screws: true, alignment: "br", drawerWidth: 300, drawerDepth: 200 }],
  ];

  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each(CASES)("is valid and the same by cell bricks and by booleans: %s", async (_, settings) => {
      const [fast, fallback] = await Promise.all([
        generateBaseplate(settings, quality),
        generateBaseplate(settings, quality, { strategy: "boolean" }),
      ]);
      expect(fast.stats.magnets).toBeGreaterThan(0);
      const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
      expect(fastCheck.status).toBe("NoError");
      expect(fallbackCheck.status).toBe("NoError");
      expectWithin(fastCheck.volume, fallbackCheck.volume, VOLUME_TOLERANCE_MM3);
      expect(fastCheck.genus).toBe(fallbackCheck.genus);
      expect(fast.layout).toEqual(fallback.layout);
    });
  });

  it.each<[string, Partial<BaseplateSettings>, BuildPlate]>([
    ["the default drawer", {}, PLATE_256],
    ["the default drawer in truncated cells", { marginShape: "cells" }, PLATE_256],
    ["20 mm cells, flush, chamfered, screws", { drawerWidth: 160, drawerDepth: 120, cellSize: 20, pocketProfile: "flush", bottomChamfer: 1, screws: true, marginShape: "cells" }, { width: 70, depth: 70 }],
  ])("cut for the build plate, %s: each piece is closed (NoError), the same by the cell bricks and by booleans", async (_, settings, plate) => {
    const bricks = await generateBaseplate(settings, "final", { strategy: "bricks", buildPlate: plate });
    const booleans = await generateBaseplate(settings, "final", { strategy: "boolean", buildPlate: plate });
    expect(bricks.stats.pieces).toBeGreaterThan(1);
    expect(bricks.stats.magnets).toBeGreaterThan(0);
    expect(booleans.layout.magnets).toEqual(bricks.layout.magnets);
    for (const [index, piece] of bricks.pieces.entries()) {
      expect((await checkMesh(pieceMesh(bricks, piece))).status).toBe("NoError");
      expect(Math.abs((booleans.pieces[index]?.volume as number) - (piece.volume as number))).toBeLessThan(VOLUME_TOLERANCE_MM3);
    }
  });

  it("gives the default drawer its volume: the frame of crossbars less its 40 magnet holes", async () => {
    const [bare, drilled] = await Promise.all([generateBaseplate({}, "final", BARE), generateBaseplate({}, "final")]);
    expectWithin(bare.stats.volume as number, 81_340.055, 0.5);
    expectWithin((bare.stats.volume as number) - (drilled.stats.volume as number), 40 * holeArea(HOLE_MM, 64) * DEPTH_MM, 0.01);
  });
});
