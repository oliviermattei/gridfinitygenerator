import { describe, expect, it } from "vitest";
import {
  ALIGNMENTS,
  MARGIN_SHAPES,
  generateBaseplate,
  narrowMargin,
  type Alignment,
  type BaseplateSettings,
  type Quality,
} from "../src/index";
import { HYBRID_OPENINGS as POCKET_OPENINGS, badEdges, checkMesh, holeReach, inSection, pocketOpening } from "./support/measure";

const FRAME = { marginShape: "frame" } as const;
const CELLS = { marginShape: "cells" } as const;
const EXTENDED = { marginShape: "extended" } as const;
const PLATE_256 = { buildPlate: { width: 256, depth: 256 } };
/** The prototype of the margins drilled no magnet holes (#24) nor edge slots (#37): its volumes are without them. */
const BARE = { magnets: false, clips: false };

// Drawer mode, alignment (#10), the three shapes of the margin (#23, #29) and the minimal
// margin (#29), observed through the public interface only. Reference values:
// prototypes/margin-variants (README and results.json): the frame of crossbars at 2.00 mm
// (variant 3, the default) and the truncated cells flush with the grid (variant 1, #19);
// prototypes/minimal-margin for the extended grid and the minimal margins.

const TOLERANCE_MM = 0.001;
const HEIGHT_MM = 4.6;

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/**
 * Share of the rest that goes to the left and to the back for each alignment: the grid
 * pushed to the left leaves the whole rest on the right, and so on. The back is the far end
 * of the drawer.
 */
const SHARES: Record<Alignment, { left: number; back: number }> = {
  tl: { left: 0, back: 0 },
  t: { left: 0.5, back: 0 },
  tr: { left: 1, back: 0 },
  l: { left: 0, back: 0.5 },
  c: { left: 0.5, back: 0.5 },
  r: { left: 1, back: 0.5 },
  bl: { left: 0, back: 1 },
  b: { left: 0.5, back: 1 },
  br: { left: 1, back: 1 },
};

function expectedMargins(alignment: Alignment, restX: number, restY: number) {
  const { left, back } = SHARES[alignment];
  return { left: restX * left, right: restX * (1 - left), back: restY * back, front: restY * (1 - back) };
}

function expectMargins(actual: { left: number; right: number; back: number; front: number }, expected: typeof actual) {
  for (const side of ["left", "right", "back", "front"] as const) expectWithin(actual[side], expected[side]);
}

/** Bounding box of a horizontal section of the mesh. */
function sectionBox(contours: [number, number][][]) {
  const xs = contours.flat().map(([x]) => x);
  const ys = contours.flat().map(([, y]) => y);
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys) };
}

describe("drawer mode", () => {
  it("fills the default 400 × 280 mm drawer, less its 1 mm gap, with 9 × 6 cells and the rest in the margins", async () => {
    const { layout, stats } = await generateBaseplate({}, "preview");
    expect(layout).toMatchObject({
      columns: 9,
      rows: 6,
      cellSize: 42,
      margins: { left: 10.5, right: 10.5, back: 13.5, front: 13.5 },
      screws: [],
    });
    expectWithin(stats.dimensions.width, 399);
    expectWithin(stats.dimensions.depth, 279);
    expectWithin(stats.dimensions.height, HEIGHT_MM);
  });

  it("takes the gap off the drawer before counting the cells", async () => {
    const exact = await generateBaseplate({ drawerWidth: 420, drawerDepth: 168, drawerGap: 0 }, "preview");
    expect([exact.layout.columns, exact.layout.rows]).toEqual([10, 4]);
    expectMargins(exact.layout.margins, { left: 0, right: 0, back: 0, front: 0 });
    expectWithin(exact.stats.dimensions.width, 420);

    const tight = await generateBaseplate({ drawerWidth: 420, drawerDepth: 168, drawerGap: 1 }, "preview");
    expect([tight.layout.columns, tight.layout.rows]).toEqual([9, 3]);
    expectMargins(tight.layout.margins, { left: 20.5, right: 20.5, back: 20.5, front: 20.5 });
    expectWithin(tight.stats.dimensions.width, 419);
    expectWithin(tight.stats.dimensions.depth, 167);
  });

  it("keeps one cell in a drawer narrower than a cell once the gap is taken off", async () => {
    const { layout, stats } = await generateBaseplate({ drawerWidth: 42, drawerDepth: 42, drawerGap: 1 }, "preview");
    expect([layout.columns, layout.rows]).toEqual([1, 1]);
    expectMargins(layout.margins, { left: 0, right: 0, back: 0, front: 0 });
    expectWithin(stats.dimensions.width, 42);
  });

  describe.each([
    { gap: 1, width: 399, depth: 279, restX: 21, restY: 27 },
    { gap: 0, width: 400, depth: 280, restX: 22, restY: 28 },
  ])("with a gap of $gap mm", ({ gap, width, depth, restX, restY }) => {
    it.each(ALIGNMENTS)("aligned %s, spreads the rest of 400 × 280 mm around 9 × 6 cells", async (alignment) => {
      const { layout, stats } = await generateBaseplate({ drawerGap: gap, alignment }, "preview");
      expect([layout.columns, layout.rows]).toEqual([9, 6]);
      expectMargins(layout.margins, expectedMargins(alignment, restX, restY));
      expectWithin(stats.dimensions.width, width);
      expectWithin(stats.dimensions.depth, depth);
    });
  });
});

describe("cells mode", () => {
  it("has no margin by default: nx·42 × ny·42 mm", async () => {
    const { layout, stats } = await generateBaseplate({ sizeMode: "cells", columns: 4, rows: 3 }, "preview");
    expectMargins(layout.margins, { left: 0, right: 0, back: 0, front: 0 });
    expectWithin(stats.dimensions.width, 168);
    expectWithin(stats.dimensions.depth, 126);
  });

  it("ignores the drawer gap", async () => {
    const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 4, rows: 3, drawerGap: 5 }, "preview");
    expectWithin(stats.dimensions.width, 168);
  });

  it.each(ALIGNMENTS)("aligned %s, adds the margins in width and depth around the grid", async (alignment) => {
    const settings: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 4, rows: 3, marginWidth: 20, marginDepth: 9, alignment };
    const { layout, stats } = await generateBaseplate(settings, "preview");
    expect([layout.columns, layout.rows]).toEqual([4, 3]);
    expectMargins(layout.margins, expectedMargins(alignment, 20, 9));
    expectWithin(stats.dimensions.width, 188);
    expectWithin(stats.dimensions.depth, 135);
  });
});

describe("margin: frame of crossbars, the default (#10, #23)", () => {
  it("is the default margin: the volume of the prototype for the default drawer and for the test bench", async () => {
    // results.json of prototypes/margin-variants, ribbed frame ("cadre à nervures") at 2.00 mm, final quality.
    const drawer = await generateBaseplate({}, "final", BARE);
    expectWithin(drawer.stats.volume ?? Number.NaN, 81_340.055, 0.5);
    const bench = { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 25, marginDepth: 25, alignment: "bl" } as const;
    const { stats, layout } = await generateBaseplate(bench, "final", BARE);
    expectMargins(layout.margins, { left: 0, right: 25, back: 25, front: 0 });
    expectWithin(stats.volume ?? Number.NaN, 6_555.835, 0.5);
  });

  it("is 2.00 mm high, 10 layers of 0.2 mm, under the 4.60 mm grid", async () => {
    const { mesh } = await generateBaseplate(FRAME, "preview");
    const { sections, status } = await checkMesh(mesh, [0.1, 1.9, 2.1, 4.5]);
    expect(status).toBe("NoError");
    for (const z of [0.1, 1.9]) {
      expectWithin(sectionBox(sections.get(z) ?? []).width, 399);
      expectWithin(sectionBox(sections.get(z) ?? []).depth, 279);
    }
    // Above the margin, only the grid is left: 9 × 42 by 6 × 42 mm.
    for (const z of [2.1, 4.5]) {
      expectWithin(sectionBox(sections.get(z) ?? []).width, 378);
      expectWithin(sectionBox(sections.get(z) ?? []).depth, 252);
    }
  });

  it.each([
    { layerHeight: 0.28, height: 2.24 }, // 8 layers
    { layerHeight: 0.12, height: 2.04 }, // 17 layers
    { layerHeight: 0.25, height: 2.0 }, // 8 layers
  ])("rounds its height up to the layer: $height mm at $layerHeight mm", async ({ layerHeight, height }) => {
    const { mesh } = await generateBaseplate({ ...FRAME, layerHeight }, "preview");
    const { sections } = await checkMesh(mesh, [height - 0.01, height + 0.01]);
    expectWithin(sectionBox(sections.get(height - 0.01) ?? []).width, 399);
    expectWithin(sectionBox(sections.get(height + 0.01) ?? []).width, 378);
  });

  it.each([
    { lineWidth: 0.4, wall: 1.2 }, // 3 lines
    { lineWidth: 0.6, wall: 1.2 }, // 2 lines
    { lineWidth: 0.5, wall: 1.5 }, // 3 lines: the smallest whole number of lines reaching 1.2 mm
    { lineWidth: 1.2, wall: 2.4 }, // never fewer than 2 lines
  ])("has an outer wall and crossbars $wall mm wide with lines of $lineWidth mm", async ({ lineWidth, wall }) => {
    // 3 × 3 cells with 20 mm of margin all around: every span of the frame is a hole.
    const settings = { ...FRAME, sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40, lineWidth } as const;
    const { mesh } = await generateBaseplate(settings, "preview");
    const { sections } = await checkMesh(mesh, [1]);
    const section = sections.get(1) ?? [];
    // The grid spans ±63 mm, the outline ±83 mm.
    // Left margin, middle row: between the outer wall and the grid, between two crossbars on grid lines.
    const side = pocketOpening(section, [-73, 0]);
    expectWithin(side?.width, 20 - wall);
    expectWithin(side?.depth, 42 - wall);
    // Back margin, first column: its crossbar on the first grid line lies inside the grid's width.
    const edge = pocketOpening(section, [-42, 73]);
    expectWithin(edge?.width, 42 - wall - wall / 2);
    expectWithin(edge?.depth, 20 - wall);
    // Corner: only the outer wall.
    const corner = pocketOpening(section, [73, 73]);
    expectWithin(corner?.width, 20 - wall);
    expectWithin(corner?.depth, 20 - wall);
  });

  it("leaves one hole per cell, per span of margin between two grid lines and per corner", async () => {
    const { mesh } = await generateBaseplate(FRAME, "preview");
    const check = await checkMesh(mesh);
    expect(check.status).toBe("NoError");
    // 54 pockets; 6 spans on the left and on the right, 9 at the back and at the front, 4 corners.
    expect(check.genus).toBe(54 + 6 + 6 + 9 + 9 + 4);
  });

  it.each([
    { margin: 1, width: 128 }, // narrower than the outer wall
    { margin: 1.5, width: 129 }, // a hole would be 0.3 mm wide
    { margin: 2.39, width: 130.78 }, // a hole would be just under one wall wide
  ])("fills a margin of $margin mm, narrower than two walls: no hole", async ({ margin, width }) => {
    const settings = { ...FRAME, sizeMode: "cells", columns: 3, rows: 2, marginWidth: 2 * margin, marginDepth: 2 * margin } as const;
    const { mesh } = await generateBaseplate(settings, "final");
    const check = await checkMesh(mesh, [1]);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(6);
    expectWithin(sectionBox(check.sections.get(1) ?? []).width, width);
  });

  it("keeps the holes at least one wall wide", async () => {
    // 2.5 mm: holes of 1.3 mm between the outer wall and the grid, one per span of the 4
    // sides; the corners, rounded by the inside of the outer wall, are too tight and full.
    const settings = { ...FRAME, sizeMode: "cells", columns: 3, rows: 2, marginWidth: 5, marginDepth: 5 } as const;
    const check = await checkMesh((await generateBaseplate(settings, "final")).mesh);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(6 + 2 + 2 + 3 + 3);
    // 4 mm: the corners have their hole too.
    const wide = { ...settings, marginWidth: 8, marginDepth: 8 };
    expect((await checkMesh((await generateBaseplate(wide, "final")).mesh)).genus).toBe(6 + 2 + 2 + 3 + 3 + 4);
  });
});

describe("margin: extended grid, open onto the drawer (#29)", () => {
  // The default drawer: the grid spans ±189 × ±126 mm, the outline ±199.5 × ±139.5 mm. The
  // band of the outer wall, 1.2 mm deep, is empty but for a heel at the end of each muret.
  const BACK_BAND = 139.5 - 0.6;

  it("carries the murets on to the outline, full height, and has no outer wall between their heels", async () => {
    const { mesh } = await generateBaseplate(EXTENDED, "preview");
    const check = await checkMesh(mesh, [0.1, 2.1, 4.5]);
    expect(check.status).toBe("NoError");
    expect(badEdges(mesh)).toBe(0);
    // No hole but the 54 pockets: every cell of the margin opens onto the drawer.
    expect(check.genus).toBe(54);
    for (const z of [0.1, 2.1, 4.5]) {
      const solid = (point: [number, number]) => inSection(check.sections.get(z) ?? [], point);
      // Between two heels, nothing along the outline, at any height: no outer wall.
      expect(solid([-168, BACK_BAND]), `${z} mm`).toBe(false);
      expect(solid([-199, -21]), `${z} mm`).toBe(false);
      // A heel at the end of the muret of the grid line x = −147, full height.
      expect(solid([-147, BACK_BAND]), `${z} mm`).toBe(true);
      expect(solid([-199, 84]), `${z} mm`).toBe(true);
    }
  });

  it("ends each muret on a heel as wide as its foot and one wall deep", async () => {
    const { mesh } = await generateBaseplate(EXTENDED, "final");
    const check = await checkMesh(mesh, [0.1, 4.5]);
    const top = (point: [number, number]) => inSection(check.sections.get(4.5) ?? [], point);
    const bottom = (point: [number, number]) => inSection(check.sections.get(0.1) ?? [], point);
    // At the bottom, the heel is the foot of the muret: 2.85 mm on each side of its line.
    expect([bottom([-147 - 2.8, BACK_BAND]), bottom([-147 + 2.8, BACK_BAND])]).toEqual([true, true]);
    expect([bottom([-147 - 2.9, BACK_BAND]), bottom([-147 + 2.9, BACK_BAND])]).toEqual([false, false]);
    // At the top, the muret carried on is its 0.8 mm flat, and the heel keeps the whole foot in the band.
    expect([top([-147 + 0.3, 133]), top([-147 + 0.5, 133])]).toEqual([true, false]);
    expect([top([-147 + 2.8, 138.4]), top([-147 + 2.8, 138.2])]).toEqual([true, false]);
  });

  it("opens the last cell of a margin wider than a cell onto the drawer: no sliver of a muret along the outline", async () => {
    // 3 × 3 cells in 45 mm of margin all around: the muret 42 mm off the grid would stand
    // across the band (43.8 mm): it is not built, and the cell before it opens to the heels.
    const settings = { ...EXTENDED, sizeMode: "cells", columns: 3, rows: 3, marginWidth: 90, marginDepth: 90 } as const;
    const { mesh } = await generateBaseplate(settings, "final");
    const check = await checkMesh(mesh, [0.1, 4.5]);
    expect(check.status).toBe("NoError");
    expect(badEdges(mesh)).toBe(0);
    for (const z of [0.1, 4.5]) {
      // The grid spans ±63 mm, the outline ±108 mm: nothing at 105 mm, 42 mm off the grid, between the heels.
      expect(inSection(check.sections.get(z) ?? [], [-84, 105]), `${z} mm`).toBe(false);
      // Nor on the line 42 mm off the grid on the left, in the middle row.
      expect(inSection(check.sections.get(z) ?? [], [-105, 0]), `${z} mm`).toBe(false);
    }
  });
});

describe("minimal margin: two supports on each side, corners empty (#29)", () => {
  // The default drawer: supports on the grid lines x = ±189 in the back and front margins, and
  // y = ±126 in the left and right ones.
  const around = (shape: "frame" | "cells" | "extended") => ({ marginShape: shape, minimalMargin: true }) as const;

  it.each([
    // The truncated cells keep the murets of the first and last cells: the second and last but one lines too.
    ["frame", [true, false, false, false, false, false, true]],
    ["cells", [true, false, true, false, true, false, true]],
    ["extended", [true, false, false, false, false, false, true]],
  ] as const)("%s: keeps the first and last grid lines of each side, full height, and nothing else", async (shape, expected) => {
    const { mesh } = await generateBaseplate(around(shape), "final");
    const check = await checkMesh(mesh, [0.1, 1.9, 2.1, 4.5]);
    expect(check.status).toBe("NoError");
    expect(badEdges(mesh)).toBe(0);
    for (const z of [0.1, 1.9, 2.1, 4.5]) {
      const solid = (point: [number, number]) => inSection(check.sections.get(z) ?? [], point);
      // Across the middle of the margin, on the lines (0.3 mm inside the first and last ones) and between them.
      const backSolid = [-189 + 0.3, -168, -147, 0, 147, 168, 189 - 0.3].map((x) => solid([x, 133]));
      expect(backSolid, `back at ${z} mm`).toEqual(expected);
      const leftSolid = [-126 + 0.3, -105, -84, 0, 84, 105, 126 - 0.3].map((y) => solid([-194, y]));
      expect(leftSolid, `left at ${z} mm`).toEqual(expected);
      // The corners of the margin are empty.
      for (const corner of [[-196, 134], [196, 134], [-196, -134], [196, -134]] as [number, number][]) expect(solid(corner), `${corner} at ${z} mm`).toBe(false);
    }
  });

  it("frame: its supports are a crossbar of 3 lines at least and a piece of outer wall as long as the foot of a muret, inside the grid's extent", async () => {
    const { mesh } = await generateBaseplate(around("frame"), "final");
    const section = (await checkMesh(mesh, [4.5])).sections.get(4.5) ?? [];
    const solid = (point: [number, number]) => inSection(section, point);
    // The crossbar of line x = −189, 1.2 mm wide inside the grid's extent.
    expect([solid([-189 + 1.1, 133]), solid([-189 + 1.3, 133]), solid([-189 - 0.1, 133])]).toEqual([true, false, false]);
    // Its piece of outer wall, 5.70 mm from the line inward, 1.2 mm deep.
    expect([solid([-189 + 5.6, 139]), solid([-189 + 5.8, 139]), solid([-189 + 5.6, 138.2])]).toEqual([true, false, false]);
  });

  it("truncated cells: keeps the first and last cells of each side, closed by their murets and their piece of outer wall", async () => {
    const { mesh } = await generateBaseplate(around("cells"), "preview");
    const check = await checkMesh(mesh, [0.1, 4.5]);
    expect(check.status).toBe("NoError");
    // 54 pockets and the 2 closed cells of each side.
    expect(check.genus).toBe(54 + 8);
    // The first cell of the back margin, x from −189 to −147, cut by the outer wall at y = 138.3.
    const cell = pocketOpening(check.sections.get(4.5) ?? [], [-168, 133]);
    expectWithin(cell?.width, 42 - 1);
    expectWithin(cell?.depth, 138.3 - 126 - 0.5);
    // Its murets are whole: the muret of line x = −147 has its slope on the side of the empty margin too.
    expect([inSection(check.sections.get(0.1) ?? [], [-147 + 2.8, 133]), inSection(check.sections.get(0.1) ?? [], [-147 + 2.9, 133])]).toEqual([true, false]);
  });

  it("extended grid: keeps the murets of the first and last lines of each side, with their heels", async () => {
    const { mesh } = await generateBaseplate(around("extended"), "final");
    const check = await checkMesh(mesh, [0.1, 4.5]);
    expect(check.genus).toBe(54);
    const [top, bottom] = [check.sections.get(4.5) ?? [], check.sections.get(0.1) ?? []];
    // The muret of line x = −189 carried on: its flat on top, its foot below, its heel in the band.
    expect([inSection(top, [-189, 133]), inSection(top, [-189 + 0.5, 133]), inSection(top, [-189 + 2.8, 139])]).toEqual([true, false, true]);
    expect([inSection(bottom, [-189 - 2.8, 133]), inSection(bottom, [-189 + 2.8, 133]), inSection(bottom, [-189 + 2.9, 133])]).toEqual([true, true, false]);
  });

  it.each([4, 5, 9])("keeps two supports along a side of %s cells, whatever its length", async (columns) => {
    for (const shape of ["frame", "cells", "extended"] as const) {
      const settings = { ...around(shape), sizeMode: "cells", columns, rows: 1, marginDepth: 30 } as const;
      const { mesh } = await generateBaseplate(settings, "preview");
      const section = (await checkMesh(mesh, [1])).sections.get(1) ?? [];
      // Along the front outline at y = −(21 + 15), on each grid line (2 mm inside the first and
      // last ones, off the rounded corners): the truncated cells keep the first and last cells.
      const x0 = (-columns * 42) / 2;
      const kept = shape === "cells" ? [0, 1, columns - 1, columns] : [0, columns];
      for (let line = 0; line <= columns; line++) {
        const x = x0 + line * 42 + (line === 0 ? 2 : line === columns ? -2 : 0);
        expect(inSection(section, [x, -36 + 1]), `${shape}, line ${line}`).toBe(kept.includes(line));
      }
    }
  });

  it.each([2.5, 3, 4])("leaves a margin of %s mm full under a chamfer of 3 mm: no hole reaches the foot of the chamfer", async (margin) => {
    // The chamfer sets the foot of the outline 3 mm in; a hole between the supports opens onto
    // the outline, so its bottom would end on or past the foot (a pinched or folded mesh, #20).
    // A hole is kept when it is at least one wall wide at the foot of the chamfer (4.2 mm).
    for (const shape of ["frame", "cells", "extended"] as const) {
      const settings = { ...around(shape), sizeMode: "cells", columns: 4, rows: 2, marginWidth: 2 * margin, marginDepth: 2 * margin, bottomChamfer: 3 } as const;
      const [bricks, booleans] = await Promise.all([
        generateBaseplate(settings, "final", { strategy: "bricks" }),
        generateBaseplate(settings, "final", { strategy: "boolean" }),
      ]);
      for (const { mesh } of [bricks, booleans]) {
        expect((await checkMesh(mesh)).status).toBe("NoError");
        expect(badEdges(mesh)).toBe(0);
      }
      expectWithin(bricks.stats.volume ?? Number.NaN, booleans.stats.volume ?? Number.NaN, 0.1);
      const section = (await checkMesh(bricks.mesh, [1.9])).sections.get(1.9) ?? [];
      // Between the supports of the front, in the middle of the margin.
      expect(inSection(section, [0, -42 - margin / 2]), shape).toBe(true);
    }
  });

  it("empties a margin one wall wider than the chamfer", async () => {
    for (const shape of ["frame", "cells", "extended"] as const) {
      const settings = { ...around(shape), sizeMode: "cells", columns: 4, rows: 2, marginWidth: 9, marginDepth: 9, bottomChamfer: 3 } as const;
      const { mesh } = await generateBaseplate(settings, "final");
      const check = await checkMesh(mesh, [1.9]);
      expect(check.status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
      expect(inSection(check.sections.get(1.9) ?? [], [0, -42 - 4.5 / 2]), shape).toBe(false);
    }
  });
});

describe("the grid alone, which the surplus of a margin is measured from (#29)", () => {
  it("is the same baseplate without its margin: the grid, its layout, cut and clips unchanged", async () => {
    const [whole, bare] = await Promise.all([generateBaseplate({}, "final", PLATE_256), generateBaseplate({}, "final", { ...PLATE_256, margin: false })]);
    expect(bare.layout.split).toEqual(whole.layout.split);
    expect(bare.layout.clips).toEqual(whole.layout.clips);
    expect(bare.stats.clips).toBe(whole.stats.clips);
    const check = await checkMesh(bare.mesh, [0.1, 1.9]);
    expect(check.status).toBe("NoError");
    expect(badEdges(bare.mesh)).toBe(0);
    for (const z of [0.1, 1.9]) {
      expectWithin(sectionBox(check.sections.get(z) ?? []).width, 378);
      expectWithin(sectionBox(check.sections.get(z) ?? []).depth, 252);
    }
    // The same by the cell bricks and by booleans.
    const fallback = await generateBaseplate({}, "final", { ...PLATE_256, margin: false, strategy: "boolean" });
    expectWithin(bare.stats.volume ?? Number.NaN, fallback.stats.volume ?? Number.NaN, 0.1);
    expect(bare.stats.volume).toBeLessThan(whole.stats.volume ?? 0);
  });
});

describe("margin on a cut (#21, #23)", () => {
  // The default drawer on a build plate of 256 mm: cut on column line 4 (x = −21) and row line 3 (y = 0).
  it("frame: a crossbar on a cut is doubled, a whole one on each side", async () => {
    const baseplate = await generateBaseplate({ marginShape: "frame" }, "final", PLATE_256);
    expect(baseplate.layout.split.columnCuts).toEqual([4]);
    expect(baseplate.layout.split.rowCuts).toEqual([3]);
    const check = await checkMesh(baseplate.mesh, [1]);
    expect(check.status).toBe("NoError");
    const solid = (point: [number, number]) => inSection(check.sections.get(1) ?? [], point);
    // Row line 3 carries a doubled crossbar in the left and right margins.
    for (const x of [-194, 194]) expect([solid([x, -1.1]), solid([x, 1.1]), solid([x, -1.3]), solid([x, 1.3])]).toEqual([true, true, false, false]);
    // Column line 4 likewise, in the front and back margins.
    for (const y of [-133, 133]) {
      expect([solid([-21 - 1.1, y]), solid([-21 + 1.1, y])]).toEqual([true, true]);
      expect([solid([-21 - 1.3, y]), solid([-21 + 1.3, y])]).toEqual([false, false]);
    }
  });

  it.each(["frame", "cells", "extended"] as const)("%s, minimal: keeps a piece along the outline without support closed, its margin empty", async (marginShape) => {
    // 15 × 2 cells, 10 mm of margin in front and behind, pieces of 2 cells: only the pieces at
    // the ends of the rows hold the supports of the front and back sides.
    const settings = { marginShape, minimalMargin: true, sizeMode: "cells", columns: 15, rows: 2, marginDepth: 20 } as const;
    const baseplate = await generateBaseplate(settings, "final", { buildPlate: { width: 90, depth: 200 } });
    expect(baseplate.pieces.length).toBeGreaterThan(2);
    for (const piece of baseplate.pieces) expect(piece.volume).toBeGreaterThan(0);
    expect((await checkMesh(baseplate.mesh)).status).toBe("NoError");
    expect(badEdges(baseplate.mesh)).toBe(0);
    // The pieces away from the ends of the rows (cells 2 to 12) are only their cells: 84 mm deep.
    const middle = baseplate.layout.split.pieces.flatMap(({ columns: [first, end] }, index) => (first >= 2 && end <= 13 ? [baseplate.pieces[index]] : []));
    expect(middle.length).toBeGreaterThan(0);
    for (const piece of middle) expectWithin(piece?.dimensions.depth, 84);
  });
});

describe("margin: truncated cells, the grid carried on to the outline (#19, a choice since #23)", () => {
  it("gives the volume of the prototype's truncated cells, flush with the grid, for the default drawer and the test bench", async () => {
    // results.json of prototypes/margin-variants, truncated cells ("cellules tronquées") at 4.60 mm, final quality.
    const drawer = await generateBaseplate(CELLS, "final", BARE);
    expectWithin(drawer.stats.volume ?? Number.NaN, 101_533.007, 0.5);
    const bench = { ...CELLS, sizeMode: "cells", columns: 2, rows: 2, marginWidth: 25, marginDepth: 25, alignment: "bl" } as const;
    const { stats, layout } = await generateBaseplate(bench, "final", BARE);
    expectMargins(layout.margins, { left: 0, right: 25, back: 25, front: 0 });
    expectWithin(stats.volume ?? Number.NaN, 10_344.856, 0.5);
  });

  it("is as high as the grid: the murets go on into the margin up to the outline", async () => {
    const { mesh } = await generateBaseplate(CELLS, "preview");
    const { sections, status, bounds } = await checkMesh(mesh, [0.1, 2.1, 4.5]);
    expect(status).toBe("NoError");
    expectWithin(bounds.max[2], HEIGHT_MM);
    // The default drawer less its gap, 399 × 279 mm, at every height: no step down to the margin.
    for (const z of [0.1, 2.1, 4.5]) {
      expectWithin(sectionBox(sections.get(z) ?? []).width, 399);
      expectWithin(sectionBox(sections.get(z) ?? []).depth, 279);
    }
  });

  it("leaves one empty pocket per truncated cell, open at the bottom", async () => {
    const { mesh } = await generateBaseplate(CELLS, "preview");
    const check = await checkMesh(mesh, [0.01]);
    expect(check.status).toBe("NoError");
    // 54 pockets, and the grid carried on by one cell all around: 11 × 8 − 9 × 6 truncated cells.
    expect(check.genus).toBe(54 + 34);
    // At the bottom, the truncated cell in the front-left corner opens between the outer wall
    // (1.2 mm, outline at x = −199.5, y = −139.5) and the pocket profile (2.85 mm from the
    // lines of the grid, at x = −189 and y = −126).
    const corner = pocketOpening(check.sections.get(0.01) ?? [], [-195, -133]);
    expectWithin(corner?.width, 199.5 - 1.2 - 189 - 2.85, 0.01);
    expectWithin(corner?.depth, 139.5 - 1.2 - 126 - 2.85, 0.01);
  });

  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    // 3 × 3 cells with 20 mm of margin all around: the grid spans ±63 mm, the outline ±83 mm.
    const settings = { ...CELLS, sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40 } as const;

    it("cuts a truncated cell to the pocket profile, at the heights of reference, up to the outer wall", async () => {
      const { mesh } = await generateBaseplate(settings, quality);
      const { sections } = await checkMesh(mesh, POCKET_OPENINGS.map(({ z }) => z));
      for (const { z, inset } of POCKET_OPENINGS) {
        // Left margin, middle row: the cell from x = −105 to −63, cut by the outer wall at x = −81.8.
        const side = pocketOpening(sections.get(z) ?? [], [-73, 0]);
        expectWithin(side?.width, 81.8 - 63 - inset);
        expectWithin(side?.depth, 42 - 2 * inset);
        // Back margin, first column: the cell from y = 63 to 105, cut at y = 81.8.
        const back = pocketOpening(sections.get(z) ?? [], [-42, 73]);
        expectWithin(back?.width, 42 - 2 * inset);
        expectWithin(back?.depth, 81.8 - 63 - inset);
      }
    });
  });

  it("carries the grid on by whole cells into a margin wider than a cell", async () => {
    // 3 × 3 cells with 55 mm of margin all around: the outline at ±118 mm, the outer wall inside at ±116.8.
    const settings = { ...CELLS, sizeMode: "cells", columns: 3, rows: 3, marginWidth: 110, marginDepth: 110 } as const;
    const { mesh } = await generateBaseplate(settings, "preview");
    const check = await checkMesh(mesh, POCKET_OPENINGS.map(({ z }) => z));
    expect(check.status).toBe("NoError");
    // 9 pockets, and the grid carried on by two cells all around: 7 × 7 − 3 × 3.
    expect(check.genus).toBe(9 + 40);
    for (const { z, inset } of POCKET_OPENINGS) {
      // The first cell of the left margin, x from −105 to −63, is whole: the same pocket as the grid's.
      const whole = pocketOpening(check.sections.get(z) ?? [], [-84, 0]);
      expectWithin(whole?.width, 42 - 2 * inset);
      expectWithin(whole?.depth, 42 - 2 * inset);
      // The second one, x from −147 to −105, is cut by the outer wall.
      const cut = pocketOpening(check.sections.get(z) ?? [], [-110, 0]);
      expectWithin(cut?.width, 116.8 - 105 - inset);
    }
  });

  it.each([
    { lineWidth: 0.4, wall: 1.2 }, // 3 lines
    { lineWidth: 0.6, wall: 1.2 }, // 2 lines
    { lineWidth: 0.5, wall: 1.5 }, // 3 lines: the smallest whole number of lines reaching 1.2 mm
    { lineWidth: 1.2, wall: 2.4 }, // never fewer than 2 lines
  ])("has an outer wall $wall mm wide with lines of $lineWidth mm", async ({ lineWidth, wall }) => {
    const settings = { ...CELLS, sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40, lineWidth } as const;
    const { mesh } = await generateBaseplate(settings, "preview");
    const { sections } = await checkMesh(mesh, [4.5]);
    // At 4.5 mm, the pocket wall is 0.5 mm off the line of the grid at x = −63.
    expectWithin(pocketOpening(sections.get(4.5) ?? [], [-73, 0])?.width, 20 - wall - 0.5);
  });
});

describe("margin: narrow truncated cells", () => {
  /** 3 × 2 cells with the same margin on every side: the grid spans ±63 × ±42 mm. */
  const around = (margin: number) =>
    ({ ...CELLS, sizeMode: "cells", columns: 3, rows: 2, marginWidth: 2 * margin, marginDepth: 2 * margin }) as const;

  it.each([
    { margin: 1, width: 128 }, // narrower than the outer wall
    { margin: 2.7, width: 131.4 }, // a hole 1.1 mm wide at the top, 0.4 mm off the grid and 1.2 mm off the outline
  ])("fills a margin of $margin mm, whose truncated cells would be narrower than a wall: no hole", async ({ margin, width }) => {
    const { mesh } = await generateBaseplate(around(margin), "final");
    const check = await checkMesh(mesh, [4.5]);
    expect(check.status).toBe("NoError");
    // At the top, the outline and the 6 pockets of the grid: nothing in the margin.
    expect(check.sections.get(4.5)).toHaveLength(1 + 6);
    expectWithin(sectionBox(check.sections.get(4.5) ?? []).width, width);
  });

  it("gives a truncated cell narrower than a wall at its bottom a floor, on a whole number of layers", async () => {
    // 3.2 mm: 2 mm between the line of the grid and the outer wall. The upper slope of the
    // pocket is 0.8 mm off that line at 4.2 mm: the hole is 1.2 mm wide there, a wall.
    const { mesh } = await generateBaseplate(around(3.2), "final");
    const check = await checkMesh(mesh, [4.1, 4.3]);
    expect(check.status).toBe("NoError");
    // Left margin, first row: from the line of the grid at x = −63 to the outer wall at x = −65.
    expect(inSection(check.sections.get(4.1) ?? [], [-64.5, -21])).toBe(true);
    const hole = pocketOpening(check.sections.get(4.3) ?? [], [-64.5, -21]);
    expectWithin(hole?.width, 65 - 63 - 0.7);
    // One such groove per truncated cell along the sides; the corners, rounded by the inside
    // of the outer wall, hold no hole one wall wide and are full. Under the floor, nothing.
    expect(check.sections.get(4.3)).toHaveLength(1 + 6 + 2 + 2 + 3 + 3);
    expect(check.sections.get(4.1)).toHaveLength(1 + 6);
    expect(check.genus).toBe(6);
  });

  it("puts the floor where the lower slope of the pocket leaves a wall of hole, in whole layers", async () => {
    // 5 mm: 3.8 mm between the line of the grid and the outer wall. The lower slope is 2.6 mm
    // off the line at 0.6 mm, 3 layers of 0.2 mm; below, the hole would be narrower than a wall.
    const { mesh } = await generateBaseplate(around(5), "final");
    const check = await checkMesh(mesh, [0.5, 0.7]);
    expect(check.status).toBe("NoError");
    expect(inSection(check.sections.get(0.5) ?? [], [-66.2, -21])).toBe(true);
    expectWithin(pocketOpening(check.sections.get(0.7) ?? [], [-66.2, -21])?.width, 3.8 - 2.5);
  });

  it.each([
    { outline: "sharp corners", settings: { ...around(3.6), outerRadius: 0 } },
    { outline: "a chamfer wider than the corner radius", settings: { ...around(6.6), bottomChamfer: 3 } },
  ])("keeps the holes of truncated corner cells one wall wide, with $outline", async ({ settings }) => {
    // The inside of the outer wall has a sharp corner there; the pocket of the corner cell
    // rounds its own corner, which narrows what is left of it.
    const heights = [0.5, 1.5, 2.5, 3.5, 3.9, 4.1, 4.3, 4.5];
    const { mesh } = await generateBaseplate(settings, "final");
    const check = await checkMesh(mesh, heights);
    expect(check.status).toBe("NoError");
    const margin = settings.marginWidth / 2;
    const [x, y] = [-63 - margin / 2, -42 - margin / 2];
    for (const z of heights) {
      const reach = await holeReach(check.sections.get(z) ?? [], [x, y]);
      expect(reach === 0 || reach >= 0.6 - 0.01, `a hole of ${2 * reach} mm at ${z} mm`).toBe(true);
    }
  });

  it("follows the layer height: the floor of the same cell is at 0.72 mm in layers of 0.24 mm", async () => {
    const { mesh } = await generateBaseplate({ ...around(5), layerHeight: 0.24 }, "final");
    const check = await checkMesh(mesh, [0.7, 0.74]);
    expect(check.status).toBe("NoError");
    expect(inSection(check.sections.get(0.7) ?? [], [-66.2, -21])).toBe(true);
    expect(inSection(check.sections.get(0.74) ?? [], [-66.2, -21])).toBe(false);
  });
});

const VOLUME_TOLERANCE_MM3 = 0.1;

/** The cell bricks and the boolean fallback build the same closed solid. */
async function expectSameSolid(settings: Partial<BaseplateSettings>, quality: Quality) {
  const [fast, fallback] = await Promise.all([
    generateBaseplate(settings, quality),
    generateBaseplate(settings, quality, { strategy: "boolean" }),
  ]);
  const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
  expect(fastCheck.status).toBe("NoError");
  expect(fallbackCheck.status).toBe("NoError");
  // NoError does not see an edge pinched between four faces (ADR 0014).
  expect(badEdges(fast.mesh)).toBe(0);
  expect(badEdges(fallback.mesh)).toBe(0);
  expectWithin(fastCheck.volume, fallbackCheck.volume, VOLUME_TOLERANCE_MM3);
  expect(fastCheck.genus).toBe(fallbackCheck.genus);
  for (const axis of [0, 1, 2] as const) {
    expectWithin(fastCheck.bounds.min[axis], fallbackCheck.bounds.min[axis]);
    expectWithin(fastCheck.bounds.max[axis], fallbackCheck.bounds.max[axis]);
  }
  expect(fast.layout).toEqual(fallback.layout);
}

describe.each(MARGIN_SHAPES.flatMap((marginShape) => [false, true].map((minimalMargin) => ({ marginShape, minimalMargin }))))(
  "assembly strategies with a margin of shape $marginShape, minimal: $minimalMargin",
  (margin) => {
  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each<[string, Partial<BaseplateSettings>]>([
      ["the default drawer", {}],
      ["a drawer aligned back right", { drawerWidth: 333.3, drawerDepth: 190, alignment: "tr" }],
      ["2 × 2 cells, margins on two sides", { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 25, marginDepth: 25, alignment: "bl" }],
      ["3 × 4 cells, margins narrower than the corner radius", { sizeMode: "cells", columns: 3, rows: 4, marginWidth: 3, marginDepth: 0.6 }],
      ["4 × 2 cells, a margin in width only", { sizeMode: "cells", columns: 4, rows: 2, marginWidth: 30, alignment: "l" }],
      ["thick lines and layers", { drawerWidth: 250, drawerDepth: 200, lineWidth: 1.2, layerHeight: 0.28, alignment: "b" }],
      ["3 × 3 cells, a margin two cells wide", { sizeMode: "cells", columns: 3, rows: 3, marginWidth: 110, marginDepth: 110 }],
      ["narrow margins, whose truncated cells have a floor or are full", { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 6.4, marginDepth: 10 }],
      ["narrow margins in thick layers", { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 8, marginDepth: 5.4, layerHeight: 0.28 }],
      ["a single column carried on by whole cells into a wide margin", { sizeMode: "cells", columns: 1, rows: 3, marginWidth: 100, alignment: "l" }],
      ["a single cell in wide margins all around", { sizeMode: "cells", columns: 1, rows: 1, marginWidth: 120, marginDepth: 90 }],
      ["80 mm cells, a 3 mm chamfer, a radius of 10 mm and screws", { drawerWidth: 500, drawerDepth: 300, cellSize: 80, bottomChamfer: 3, outerRadius: 10, screws: true, alignment: "br" }],
      ["the flush profile, sharp corners and a chamfer", { drawerWidth: 333, drawerDepth: 222, pocketProfile: "flush", outerRadius: 0, bottomChamfer: 0.8 }],
      // The margin's cut above a margin of 0.5 mm lies on the edge of the cell, where the 3 mm
      // chamfer of the rounded corner leaves vertices closer than the weld of the seams (#20).
      ["a margin of 0.5 mm by a rounded corner, under a chamfer of 3 mm", { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 16, marginDepth: 0.5, alignment: "tr", outerRadius: 2.3, bottomChamfer: 3 }],
    ])("%s: same volume, bounds and genus as the boolean fallback, NoError", async (_, settings) => {
      await expectSameSolid({ ...settings, ...margin }, quality);
    });

    // A drawer with rests of a few millimetres (floors, full truncated cells), and cells with a
    // margin of more than a cell on one axis, in each of the 9 alignments.
    it.each(ALIGNMENTS)("aligned %s, small and large rests of margin: same solid as the boolean fallback, NoError", async (alignment) => {
      await expectSameSolid({ drawerWidth: 262, drawerDepth: 175.5, alignment, ...margin }, quality);
      await expectSameSolid({ sizeMode: "cells", columns: 3, rows: 2, marginWidth: 50, marginDepth: 5.5, alignment, ...margin }, quality);
    });

    // Cut for the build plate, with clips: the margin goes with the pieces on the outline, and
    // a cut goes through it (a doubled crossbar, a T split into two Ls, truncated cells).
    it.each<[string, Partial<BaseplateSettings>, number]>([
      ["the default drawer", {}, 256],
      ["sharp corners, a chamfer, screws and the flush profile", { outerRadius: 0, bottomChamfer: 1.2, screws: true, pocketProfile: "flush" }, 256],
      ["20 mm cells, back left, wide margins", { sizeMode: "cells", columns: 5, rows: 5, cellSize: 20, marginWidth: 90, marginDepth: 30, alignment: "tl" }, 100],
      ["15 × 2 cells in pieces of 2 cells", { sizeMode: "cells", columns: 15, rows: 2, marginDepth: 20, outerRadius: 10 }, 90],
    ])("cut, %s: each piece the same by the cell bricks and by booleans, NoError", async (_, settings, plate) => {
      const options = { buildPlate: { width: plate, depth: 256 } };
      const [bricks, booleans] = await Promise.all([
        generateBaseplate({ ...settings, ...margin }, quality, options),
        generateBaseplate({ ...settings, ...margin }, quality, { ...options, strategy: "boolean" }),
      ]);
      expect(bricks.pieces.length).toBeGreaterThan(1);
      expect(bricks.layout).toEqual(booleans.layout);
      const [a, b] = await Promise.all([checkMesh(bricks.mesh), checkMesh(booleans.mesh)]);
      expect([a.status, b.status]).toEqual(["NoError", "NoError"]);
      expectWithin(a.volume, b.volume, VOLUME_TOLERANCE_MM3);
    });
  });

  it.each<Partial<BaseplateSettings>>([
    { drawerWidth: 60, drawerDepth: 400 },
    { sizeMode: "cells", columns: 5, rows: 1, marginWidth: 7, marginDepth: 12, alignment: "br" },
    { sizeMode: "cells", columns: 1, rows: 1, marginWidth: 0.5, marginDepth: 50 },
  ])("builds single rows and columns with a margin, closed: %o", async (settings) => {
    const baseplate = await generateBaseplate({ ...settings, ...margin }, "final");
    const check = await checkMesh(baseplate.mesh);
    expect(check.status).toBe("NoError");
    expectWithin(baseplate.stats.volume ?? Number.NaN, check.volume, check.volume * 1e-6);
  });
});

describe("narrow margin warning", () => {
  const none = { left: 0, right: 0, back: 0, front: 0 };

  it("gives the narrowest margin that is not zero but narrower than two line widths", () => {
    expect(narrowMargin(none, 0.4)).toBeNull();
    expect(narrowMargin({ ...none, left: 0.7 }, 0.4)).toBe(0.7);
    expect(narrowMargin({ ...none, front: 0.79 }, 0.4)).toBe(0.79);
    expect(narrowMargin({ ...none, back: 0.8 }, 0.4)).toBeNull();
    expect(narrowMargin({ left: 10.5, right: 10.5, back: 13.5, front: 13.5 }, 0.4)).toBeNull();
    expect(narrowMargin({ ...none, right: 1 }, 0.6)).toBe(1);
    expect(narrowMargin({ left: 0.5, right: 0.3, back: 0, front: 20 }, 0.4)).toBe(0.3);
  });

  it("applies to the margins the engine lays out", async () => {
    const { layout } = await generateBaseplate({ drawerWidth: 43, drawerDepth: 85, drawerGap: 0.5 }, "preview");
    expectMargins(layout.margins, { left: 0.25, right: 0.25, back: 0.25, front: 0.25 });
    expect(narrowMargin(layout.margins, 0.4)).toBe(0.25);
  });
});
