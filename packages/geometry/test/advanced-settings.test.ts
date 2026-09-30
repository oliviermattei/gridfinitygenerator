import { describe, expect, it } from "vitest";
import { generateBaseplate, generateTestKit, type BaseplateSettings, type Quality } from "../src/index";
import { HYBRID_OPENINGS as POCKET_OPENINGS, checkMesh, inSection, outerContour, pocketOpening } from "./support/measure";

// Advanced settings (#13): cell size, outer corner radius and bottom chamfer, observed
// through the public interface only.

const TOLERANCE_MM = 0.001;
const HEIGHT_MM = 4.6;

/** A 32-segment quarter circle of radius 10 mm falls short of the true arc by 0.13 mm². */
const FINAL_AREA_TOLERANCE_MM2 = 0.2;

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** Bounding box of a horizontal section of the mesh. */
function sectionBox(contours: [number, number][][]) {
  const xs = contours.flat().map(([x]) => x);
  const ys = contours.flat().map(([, y]) => y);
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys) };
}

/** A grid of cells without margin. */
function cells(columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> {
  return { sizeMode: "cells", columns, rows, ...settings };
}

describe("cell size", () => {
  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each([20, 30, 80])("sets the pitch of the grid in cells mode: 3 × 2 cells of %i mm", async (cellSize) => {
      const baseplate = await generateBaseplate(cells(3, 2, { cellSize }), quality);
      expect(baseplate.layout).toMatchObject({ columns: 3, rows: 2, cellSize });
      expectWithin(baseplate.stats.dimensions.width, 3 * cellSize);
      expectWithin(baseplate.stats.dimensions.depth, 2 * cellSize);
      // The vertical profile of the standard is kept: the baseplate stays 4.60 mm high.
      expectWithin(baseplate.stats.dimensions.height, HEIGHT_MM);

      const check = await checkMesh(baseplate.mesh, POCKET_OPENINGS.map(({ z }) => z));
      expect(check.status).toBe("NoError");
      expect(check.genus).toBe(6);
      // Each pocket keeps the insets of the profile from the edges of its own cell.
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) {
          const centre: [number, number] = [(i - 1) * cellSize, (j - 0.5) * cellSize];
          for (const { z, inset } of POCKET_OPENINGS) {
            const opening = pocketOpening(check.sections.get(z) ?? [], centre);
            expectWithin(opening?.width, cellSize - 2 * inset);
            expectWithin(opening?.depth, cellSize - 2 * inset);
          }
        }
    });
  });

  it.each([
    { cellSize: 50, columns: 7, rows: 5, x: 24.5, y: 14.5 },
    { cellSize: 20, columns: 19, rows: 13, x: 9.5, y: 9.5 },
    { cellSize: 80, columns: 4, rows: 3, x: 39.5, y: 19.5 },
  ])("sets the pitch in drawer mode: $columns × $rows cells of $cellSize mm in the default drawer", async ({ cellSize, columns, rows, x, y }) => {
    // 400 × 280 mm less the 1 mm gap: floor(399 / cs) × floor(279 / cs), the rest in the margins.
    const { layout, stats } = await generateBaseplate({ cellSize }, "preview");
    expect(layout).toMatchObject({ columns, rows, cellSize, margins: { left: x, right: x, back: y, front: y }, screws: [] });
    expectWithin(stats.dimensions.width, 399);
    expectWithin(stats.dimensions.depth, 279);
  });

  it("keeps at most 24 cells per axis in a drawer, the rest in the margin: 1000 × 1000 mm in cells of 20 mm", async () => {
    // 999 / 20 would be 49 cells: 24 of them (480 mm), and 519 mm of margin on each axis.
    const { layout, stats } = await generateBaseplate({ drawerWidth: 1000, drawerDepth: 1000, cellSize: 20 }, "preview");
    expect(layout).toMatchObject({ columns: 24, rows: 24, cellSize: 20, margins: { left: 259.5, right: 259.5, back: 259.5, front: 259.5 } });
    expectWithin(stats.dimensions.width, 999);
  });

  it("puts the screws on the inner intersections of its pitch", async () => {
    const baseplate = await generateBaseplate(cells(3, 3, { cellSize: 30, screws: true }), "final");
    const positions = baseplate.layout.screws.map(([x, y]) => [x, y]).sort(([ax, ay], [bx, by]) => (ax as number) - (bx as number) || (ay as number) - (by as number));
    expect(positions).toEqual([
      [-15, -15],
      [-15, 15],
      [15, -15],
      [15, 15],
    ]);
    expect((await checkMesh(baseplate.mesh)).status).toBe("NoError");
  });

  it("carries the grid on into a margin of truncated cells at its pitch", async () => {
    // 3 × 3 cells of 30 mm with 20 mm of margin all around: the grid spans ±45 mm, the outline
    // ±65 mm, the inside of its 1.2 mm outer wall ±63.8 mm.
    const settings = cells(3, 3, { cellSize: 30, marginWidth: 40, marginDepth: 40, marginShape: "cells" });
    const { mesh } = await generateBaseplate(settings, "preview");
    const { sections } = await checkMesh(mesh, POCKET_OPENINGS.map(({ z }) => z));
    for (const { z, inset } of POCKET_OPENINGS) {
      // Left margin, middle row: the cell from x = −75 to −45, cut by the outer wall.
      const hole = pocketOpening(sections.get(z) ?? [], [-55, 0]);
      expectWithin(hole?.width, 63.8 - 45 - inset);
      expectWithin(hole?.depth, 30 - 2 * inset);
    }
  });
});

describe("outer corner radius", () => {
  it.each([0, 4, 10])("rounds the outer corners with a radius of %i mm", async (outerRadius) => {
    // Without the edge slots of its sides without margin, which notch the outline (clips.test.ts).
    const { mesh } = await generateBaseplate(cells(2, 2, { outerRadius }), "final", { clips: false });
    // Near the bottom, where the corner pockets are narrowest: higher, a radius over about 5 mm
    // opens the corner pockets onto the outside (no margin), and the section merges them.
    const { sections, status } = await checkMesh(mesh, [0.05]);
    expect(status).toBe("NoError");
    const outline = outerContour(sections.get(0.05) ?? []);
    expectWithin(outline.width, 84);
    expectWithin(outline.area, 84 * 84 - (4 - Math.PI) * outerRadius * outerRadius, FINAL_AREA_TOLERANCE_MM2);
    // A sharp corner reaches the corner of the bounding box.
    expect(inSection(sections.get(0.05) ?? [], [41.9, 41.9])).toBe(outerRadius === 0);
  });

  it("is limited to half the smallest side: a column of 20 mm cells with a 10 mm radius has round ends", async () => {
    const { mesh, stats } = await generateBaseplate(cells(1, 3, { cellSize: 20, outerRadius: 10 }), "final");
    const { sections, status } = await checkMesh(mesh, [0.05]);
    expect(status).toBe("NoError");
    expectWithin(stats.dimensions.width, 20);
    expectWithin(stats.dimensions.depth, 60);
    const outline = outerContour(sections.get(0.05) ?? []);
    expectWithin(outline.area, 20 * 60 - (4 - Math.PI) * 100, FINAL_AREA_TOLERANCE_MM2);
  });
});

describe("bottom chamfer", () => {
  it("chamfers the bottom of the whole outline at 45°", async () => {
    const { mesh, stats } = await generateBaseplate(cells(3, 2, { bottomChamfer: 1.5 }), "final");
    const { sections, status } = await checkMesh(mesh, [0.01, 0.75, 1.6, 4.5]);
    expect(status).toBe("NoError");
    // At height z, the outline is set in by 1.5 − z mm on every side.
    for (const [z, inset] of [
      [0.01, 1.49],
      [0.75, 0.75],
      [1.6, 0],
      [4.5, 0],
    ] as const) {
      expectWithin(sectionBox(sections.get(z) ?? []).width, 126 - 2 * inset);
      expectWithin(sectionBox(sections.get(z) ?? []).depth, 84 - 2 * inset);
    }
    expectWithin(stats.dimensions.width, 126);
    expectWithin(stats.dimensions.height, HEIGHT_MM);
  });

  it("chamfers the margin too, and keeps the foot of its outer wall as wide as without chamfer", async () => {
    // The default drawer: 399 × 279 mm, a front margin of 13.5 mm (outline at y = −139.5).
    const { mesh } = await generateBaseplate({ bottomChamfer: 3 }, "preview");
    const { sections, status } = await checkMesh(mesh, [0.01, 1, 1.9]);
    expect(status).toBe("NoError");
    expectWithin(sectionBox(sections.get(0.01) ?? []).width, 399 - 2 * 2.99);
    expectWithin(sectionBox(sections.get(1) ?? []).depth, 279 - 2 * 2);
    expectWithin(sectionBox(sections.get(1.9) ?? []).width, 399 - 2 * 1.1);
    // x = 0 is in the middle of a hole of the front margin. At the foot, the chamfer takes the
    // first 2.99 mm; the outer wall, 1.2 mm wide, follows; then the hole.
    const foot = sections.get(0.01) ?? [];
    expect(inSection(foot, [0, -139.5 + 2.9])).toBe(false);
    expect(inSection(foot, [0, -139.5 + 3.1])).toBe(true);
    expect(inSection(foot, [0, -139.5 + 4.1])).toBe(true);
    expect(inSection(foot, [0, -139.5 + 4.3])).toBe(false);
  });

  it("has none by default", async () => {
    const { mesh } = await generateBaseplate(cells(2, 2), "preview");
    const { sections } = await checkMesh(mesh, [0.01]);
    expectWithin(sectionBox(sections.get(0.01) ?? []).width, 84);
  });
});

describe("advanced settings together", () => {
  const VOLUME_TOLERANCE_MM3 = 0.1;

  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each<[string, Partial<BaseplateSettings>]>([
      ["20 mm cells, sharp corners, largest chamfer, margin and screws", { drawerWidth: 250, drawerDepth: 190, cellSize: 20, outerRadius: 0, bottomChamfer: 3, screws: true }],
      ["80 mm cells, largest radius and chamfer, screws", cells(3, 2, { cellSize: 80, outerRadius: 10, bottomChamfer: 3, screws: true })],
      ["a radius under the chamfer, margins on two sides", cells(4, 3, { cellSize: 30, outerRadius: 1, bottomChamfer: 2.5, marginWidth: 15, marginDepth: 8, alignment: "tr" })],
      ["flush profile, sharp corners, largest chamfer", cells(2, 2, { pocketProfile: "flush", outerRadius: 0, bottomChamfer: 3 })],
      ["the default drawer with a small chamfer", { bottomChamfer: 0.4 }],
      ["20 mm cells with round corners and screws, no chamfer", cells(5, 4, { cellSize: 20, outerRadius: 10, screws: true })],
      ["thick lines and layers, 55 mm cells, chamfer", { drawerWidth: 300, drawerDepth: 200, cellSize: 55, bottomChamfer: 2, lineWidth: 1.2, layerHeight: 0.28, alignment: "bl" }],
      ["20 mm cells carried on by whole cells into wide margins, largest radius, chamfer and screws", cells(3, 2, { cellSize: 20, marginWidth: 90, marginDepth: 50, outerRadius: 10, bottomChamfer: 2, screws: true, alignment: "tl" })],
      ["narrow margins in the largest radius: truncated corner cells", cells(4, 3, { outerRadius: 10, marginWidth: 9, marginDepth: 7 })],
      ["flush profile, whole cells in the margin, screws", cells(2, 3, { pocketProfile: "flush", marginWidth: 100, marginDepth: 12, screws: true, alignment: "r" })],
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
      // Every vertex written to a file belongs to a triangle.
      for (const { mesh } of [fast, fallback]) {
        const used = new Set(mesh.indices);
        expect(used.size).toBe(mesh.positions.length / 3);
      }
    });
  });

  it.each<Partial<BaseplateSettings>>([
    cells(1, 4, { cellSize: 20, outerRadius: 10, bottomChamfer: 3 }),
    cells(3, 1, { cellSize: 80, outerRadius: 0, bottomChamfer: 3, marginWidth: 10, marginDepth: 30, alignment: "b" }),
  ])("builds single rows and columns with them through the boolean fallback: %o", async (settings) => {
    const baseplate = await generateBaseplate(settings, "final");
    const check = await checkMesh(baseplate.mesh);
    expect(check.status).toBe("NoError");
    expectWithin(baseplate.stats.volume ?? Number.NaN, check.volume, check.volume * 1e-6);
  });
});

describe("test kit with advanced settings", () => {
  it("follows the cell size, the outer corner radius and the bottom chamfer of the settings", async () => {
    const kit = await generateTestKit({ cellSize: 30, outerRadius: 0, bottomChamfer: 1 }, "final");
    expect(kit.layout).toMatchObject({ columns: 1, rows: 2, cellSize: 30 });
    expectWithin(kit.stats.dimensions.width, 30);
    expectWithin(kit.stats.dimensions.depth, 60);
    const { sections, status } = await checkMesh(kit.mesh, [0.01, 2]);
    expect(status).toBe("NoError");
    expectWithin(sectionBox(sections.get(0.01) ?? []).width, 30 - 2 * 0.99);
    expect(inSection(sections.get(2) ?? [], [14.9, 29.9])).toBe(true);
  });
});
