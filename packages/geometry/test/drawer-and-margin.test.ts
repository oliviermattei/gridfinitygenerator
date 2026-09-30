import { describe, expect, it } from "vitest";
import {
  ALIGNMENTS,
  generateBaseplate,
  narrowMargin,
  type Alignment,
  type BaseplateSettings,
  type Quality,
} from "../src/index";
import { HYBRID_OPENINGS as POCKET_OPENINGS, checkMesh, holeReach, inSection, pocketOpening } from "./support/measure";

// Drawer mode, alignment (#10) and margin (#19), observed through the public interface only.
// Reference values: prototypes/margin-variants (README and results.json), whose variant 1,
// flush with the grid, is the margin: truncated cells, the grid carried on up to a 1.2 mm
// outer wall along the outline.

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

describe("margin: truncated cells, the grid carried on to the outline (#19)", () => {
  it("gives the volume of the prototype's truncated cells, flush with the grid, for the default drawer and the test bench", async () => {
    // results.json of prototypes/margin-variants, truncated cells ("cellules tronquées") at 4.60 mm, final quality.
    const drawer = await generateBaseplate({}, "final");
    expectWithin(drawer.stats.volume ?? Number.NaN, 101_533.007, 0.5);
    const bench = { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 25, marginDepth: 25, alignment: "bl" } as const;
    const { stats, layout } = await generateBaseplate(bench, "final");
    expectMargins(layout.margins, { left: 0, right: 25, back: 25, front: 0 });
    expectWithin(stats.volume ?? Number.NaN, 10_344.856, 0.5);
  });

  it("is as high as the grid: the murets go on into the margin up to the outline", async () => {
    const { mesh } = await generateBaseplate({}, "preview");
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
    const { mesh } = await generateBaseplate({}, "preview");
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
    const settings = { sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40 } as const;

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
    const settings = { sizeMode: "cells", columns: 3, rows: 3, marginWidth: 110, marginDepth: 110 } as const;
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
    const settings = { sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40, lineWidth } as const;
    const { mesh } = await generateBaseplate(settings, "preview");
    const { sections } = await checkMesh(mesh, [4.5]);
    // At 4.5 mm, the pocket wall is 0.5 mm off the line of the grid at x = −63.
    expectWithin(pocketOpening(sections.get(4.5) ?? [], [-73, 0])?.width, 20 - wall - 0.5);
  });
});

describe("margin: narrow truncated cells", () => {
  /** 3 × 2 cells with the same margin on every side: the grid spans ±63 × ±42 mm. */
  const around = (margin: number) =>
    ({ sizeMode: "cells", columns: 3, rows: 2, marginWidth: 2 * margin, marginDepth: 2 * margin }) as const;

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

describe("assembly strategies with a margin", () => {
  const VOLUME_TOLERANCE_MM3 = 0.1;

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
    ])("%s: same volume, bounds and genus as the boolean fallback, NoError", async (_, settings) => {
      await expectSameSolid(settings, quality);
    });

    // A drawer with rests of a few millimetres (floors, full truncated cells), and cells with a
    // margin of more than a cell on one axis, in each of the 9 alignments.
    it.each(ALIGNMENTS)("aligned %s, small and large rests of margin: same solid as the boolean fallback, NoError", async (alignment) => {
      await expectSameSolid({ drawerWidth: 262, drawerDepth: 175.5, alignment }, quality);
      await expectSameSolid({ sizeMode: "cells", columns: 3, rows: 2, marginWidth: 50, marginDepth: 5.5, alignment }, quality);
    });
  });

  /** The cell bricks and the boolean fallback build the same closed solid. */
  async function expectSameSolid(settings: Partial<BaseplateSettings>, quality: Quality) {
    const [fast, fallback] = await Promise.all([
      generateBaseplate(settings, quality),
      generateBaseplate(settings, quality, { strategy: "boolean" }),
    ]);
    const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
    expect(fastCheck.status).toBe("NoError");
    expect(fallbackCheck.status).toBe("NoError");
    expectWithin(fastCheck.volume, fallbackCheck.volume, VOLUME_TOLERANCE_MM3);
    expect(fastCheck.genus).toBe(fallbackCheck.genus);
    for (const axis of [0, 1, 2] as const) {
      expectWithin(fastCheck.bounds.min[axis], fallbackCheck.bounds.min[axis]);
      expectWithin(fastCheck.bounds.max[axis], fallbackCheck.bounds.max[axis]);
    }
    expect(fast.layout).toEqual(fallback.layout);
  }

  it.each<Partial<BaseplateSettings>>([
    { drawerWidth: 60, drawerDepth: 400 },
    { sizeMode: "cells", columns: 5, rows: 1, marginWidth: 7, marginDepth: 12, alignment: "br" },
    { sizeMode: "cells", columns: 1, rows: 1, marginWidth: 0.5, marginDepth: 50 },
  ])("builds single rows and columns with a margin, closed: %o", async (settings) => {
    const baseplate = await generateBaseplate(settings, "final");
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
