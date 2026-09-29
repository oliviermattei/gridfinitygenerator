import { describe, expect, it } from "vitest";
import {
  ALIGNMENTS,
  generateBaseplate,
  narrowMargin,
  type Alignment,
  type BaseplateSettings,
  type Quality,
} from "../src/index";
import { checkMesh, pocketOpening } from "./support/measure";

// Drawer mode, alignment and margin (#10), observed through the public interface only.
// Reference values: prototypes/margin-variants (README and results.json), whose provisional
// margin is a frame, 2.00 mm high: a 1.2 mm outer wall and a crossbar (traverse) on every
// grid line.

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
    expect(layout).toEqual({
      columns: 9,
      rows: 6,
      cellSize: 42,
      margins: { left: 10.5, right: 10.5, back: 13.5, front: 13.5 },
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

describe("margin: frame of crossbars (provisional variant of #3)", () => {
  it("is 2.00 mm high, 10 layers of 0.2 mm, under the 4.60 mm grid", async () => {
    const { mesh } = await generateBaseplate({}, "preview");
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
    const { mesh } = await generateBaseplate({ layerHeight }, "preview");
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
    const settings = { sizeMode: "cells", columns: 3, rows: 3, marginWidth: 40, marginDepth: 40, lineWidth } as const;
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
    const { mesh } = await generateBaseplate({}, "preview");
    const check = await checkMesh(mesh);
    expect(check.status).toBe("NoError");
    // 54 pockets; 6 spans on the left and on the right, 9 at the back and at the front, 4 corners.
    expect(check.genus).toBe(54 + 6 + 6 + 9 + 9 + 4);
  });

  it("gives the volume of the prototype for the default drawer and for the test bench", async () => {
    // results.json of prototypes/margin-variants, ribbed frame ("cadre à nervures") at 2.00 mm, final quality.
    const drawer = await generateBaseplate({}, "final");
    expectWithin(drawer.stats.volume ?? Number.NaN, 81_340.055, 0.5);
    const bench = { sizeMode: "cells", columns: 2, rows: 2, marginWidth: 25, marginDepth: 25, alignment: "bl" } as const;
    const { stats, layout } = await generateBaseplate(bench, "final");
    expectMargins(layout.margins, { left: 0, right: 25, back: 25, front: 0 });
    expectWithin(stats.volume ?? Number.NaN, 6_555.835, 0.5);
  });

  it.each([
    { margin: 1, width: 128 }, // narrower than the outer wall
    { margin: 1.5, width: 129 }, // a hole would be 0.3 mm wide
    { margin: 2.39, width: 130.78 }, // a hole would be just under one wall wide
  ])("fills a margin of $margin mm, narrower than two walls: no hole", async ({ margin, width }) => {
    const settings = { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 2 * margin, marginDepth: 2 * margin } as const;
    const { mesh } = await generateBaseplate(settings, "final");
    const check = await checkMesh(mesh, [1]);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(6);
    expectWithin(sectionBox(check.sections.get(1) ?? []).width, width);
  });

  it("keeps the holes at least one wall wide", async () => {
    // 2.5 mm: holes of 1.3 mm between the outer wall and the grid, one per span of the 4
    // sides; the corners, rounded by the inside of the outer wall, are too tight and full.
    const settings = { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 5, marginDepth: 5 } as const;
    const check = await checkMesh((await generateBaseplate(settings, "final")).mesh);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(6 + 2 + 2 + 3 + 3);
    // 4 mm: the corners have their hole too.
    const wide = { ...settings, marginWidth: 8, marginDepth: 8 };
    expect((await checkMesh((await generateBaseplate(wide, "final")).mesh)).genus).toBe(6 + 2 + 2 + 3 + 3 + 4);
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
    ])("%s: same volume, bounds and genus as the boolean fallback, NoError", async (_, settings) => {
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
    });
  });

  it.each<Partial<BaseplateSettings>>([
    { drawerWidth: 60, drawerDepth: 400 },
    { sizeMode: "cells", columns: 5, rows: 1, marginWidth: 7, marginDepth: 12, alignment: "br" },
    { sizeMode: "cells", columns: 1, rows: 1, marginWidth: 0.5, marginDepth: 50 },
  ])("builds single rows and columns with a margin through the boolean fallback: %o", async (settings) => {
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
