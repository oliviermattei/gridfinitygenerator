import { describe, expect, it } from "vitest";
import {
  PRINT_GAP_MM,
  fitsOnBuildPlate,
  generateBaseplate,
  pieceMesh,
  printPieces,
  serialize3mf,
  serializeStl,
  spreadPieces,
  zipFiles,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
} from "../src/index";
import { checkMesh, inSection, readBinaryStl, readThreeMf, readZip } from "./support/measure";

// Split of a baseplate for the build plate (#21, ADR 0009), observed through the public
// interface: the plan, the pieces, their numbers and their export.

const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** Without the magnet holes, which the crossings on a cut lose. */
const BARE = { magnets: false };
/** A piece's number takes about 1.1 mm³ per digit (0.4 mm deep): well under this. */
const LABEL_VOLUME_MAX_MM3 = 5;

const plan = async (settings: Partial<BaseplateSettings>, buildPlate: BuildPlate | null) =>
  (await generateBaseplate(settings, "preview", { buildPlate })).layout.split;

/** Spans of the pieces along each axis, from their cells: columns of the first row, rows of the first column. */
function spans(split: Awaited<ReturnType<typeof plan>>) {
  const columns = new Map(split.pieces.map(({ columns: [a, b] }) => [a, b - a]));
  const rows = new Map(split.pieces.map(({ rows: [a, b] }) => [a, b - a]));
  return { columns: [...columns.entries()].sort(([a], [b]) => a - b).map(([, n]) => n), rows: [...rows.entries()].sort(([a], [b]) => a - b).map(([, n]) => n) };
}

describe("split plan", () => {
  it("cuts the default drawer into 4 pieces for a build plate of 256 mm", async () => {
    const split = await plan({}, PLATE_256);
    // 9 × 6 cells, margins of 10.5 and 13.5 mm: 4 + 5 columns (178.5 and 220.5 mm), 3 + 3 rows (139.5 mm).
    expect(split.columnCuts).toEqual([4]);
    expect(split.rowCuts).toEqual([3]);
    expect(split.turned).toBe(false);
    expect(split.pieces.map(({ number }) => number)).toEqual([1, 2, 3, 4]);
    // Numbered row by row from the back left: the back row first (rows 3 to 6).
    expect(split.pieces.map(({ columns, rows }) => [columns, rows])).toEqual([
      [[0, 4], [3, 6]],
      [[4, 9], [3, 6]],
      [[0, 4], [0, 3]],
      [[4, 9], [0, 3]],
    ]);
    // The margins go with the pieces on the outline.
    expect(split.pieces[0]?.footprint).toEqual([-199.5, 0, -21, 139.5]);
    expect(split.pieces[3]?.footprint).toEqual([-21, -139.5, 199.5, 0]);
    expect(split.pieces.every(({ fits }) => fits)).toBe(true);
  });

  it("keeps a single piece without a build plate, or when the baseplate fits on it, even turned", async () => {
    for (const split of [await plan({}, null), await plan({}, { width: 400, depth: 280 }), await plan({}, { width: 280, depth: 400 })]) {
      expect(split.columnCuts).toEqual([]);
      expect(split.rowCuts).toEqual([]);
      expect(split.pieces).toHaveLength(1);
      expect(split.pieces[0]?.footprint).toEqual([-199.5, -139.5, 199.5, 139.5]);
    }
  });

  it("does not cut a grid that fits exactly, and cuts one cell too many into two nearly equal pieces", async () => {
    const exact = await plan({ sizeMode: "cells", columns: 6, rows: 6 }, { width: 252, depth: 252 });
    expect(exact.pieces).toHaveLength(1);
    const over = await plan({ sizeMode: "cells", columns: 7, rows: 6 }, { width: 252, depth: 252 });
    expect(spans(over)).toEqual({ columns: [3, 4], rows: [6] });
  });

  it("takes the fewest pieces, then no piece of a single cell, then the most equal pieces", async () => {
    // 13 columns of 42 mm on 252 mm: 3 pieces at least; 6 + 6 + 1 would leave a single cell.
    const split = await plan({ sizeMode: "cells", columns: 13, rows: 1 }, { width: 252, depth: 252 });
    expect(spans(split).columns).toHaveLength(3);
    expect(Math.min(...spans(split).columns)).toBeGreaterThanOrEqual(4);
    // Two cells on a plate of one: a single cell each, the only way.
    expect(spans(await plan({ sizeMode: "cells", columns: 2, rows: 1 }, { width: 50, depth: 50 })).columns).toEqual([1, 1]);
  });

  it("tries both orientations of the build plate and keeps the one with fewer pieces", async () => {
    // 10 × 4 cells, 420 × 168 mm, on 200 × 300 mm: 3 pieces as it is, 2 turned a quarter.
    const split = await plan({ sizeMode: "cells", columns: 10, rows: 4 }, { width: 200, depth: 300 });
    expect(split.turned).toBe(true);
    expect(spans(split)).toEqual({ columns: [5, 5], rows: [4] });
  });

  it("cuts in a margin of truncated cells when it carries whole cells, the margin with the pieces on the outline", async () => {
    // 2 × 1 cells and 500 mm of margin in width: 250 mm on each side, 5 whole cells of it.
    const split = await plan({ sizeMode: "cells", columns: 2, rows: 1, marginWidth: 500, marginShape: "cells" }, PLATE_256);
    expect(split.pieces).toHaveLength(3);
    expect(split.pieces.every(({ fits }) => fits)).toBe(true);
    expect(split.columnCuts.some((line) => line < 0)).toBe(true);
    const widths = split.pieces.map(({ footprint: [x0, , x1] }) => x1 - x0);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(584, 6);
  });

  it("does its best with a build plate smaller than a cell and its margin, and says which pieces do not fit", async () => {
    // 50 mm: a cell (42 mm) fits, not with its margin (52.5 or 55.5 mm).
    const split = await plan({}, { width: 50, depth: 50 });
    expect(spans(split)).toEqual({ columns: [1, 1, 1, 1, 1, 1, 1, 1, 1], rows: [1, 1, 1, 1, 1, 1] });
    const misfits = split.pieces.filter(({ fits }) => !fits);
    // The 26 pieces on the outline do not fit; the 28 inside do.
    expect(misfits).toHaveLength(26);
    // A cell larger than the build plate: cutting would not help, so it is not cut.
    const tiny = await plan({}, { width: 40, depth: 40 });
    expect(tiny.pieces).toHaveLength(1);
    expect(tiny.pieces[0]?.fits).toBe(false);
  });
});

describe("pieces of a cut baseplate", () => {
  const CASES: [name: string, settings: Partial<BaseplateSettings>][] = [
    ["default drawer", {}],
    ["default drawer, flush profile, 0.28 mm layers", { pocketProfile: "flush", layerHeight: 0.28 }],
    ["default drawer, chamfered, sharp corners, screws", { bottomChamfer: 1, outerRadius: 0, screws: true }],
    ["5 × 5 cells in 20 mm cells, back left, wide margins", { sizeMode: "cells", columns: 5, rows: 5, cellSize: 20, marginWidth: 90, marginDepth: 30, alignment: "tl" }],
  ];

  it.each(CASES)("%s: each piece is closed (NoError), the same by the cell bricks and by booleans", async (_, settings) => {
    const bricks = await generateBaseplate(settings, "final", { strategy: "bricks", buildPlate: { width: 180, depth: 180 } });
    const booleans = await generateBaseplate(settings, "final", { strategy: "boolean", buildPlate: { width: 180, depth: 180 } });
    expect(bricks.stats.pieces).toBeGreaterThan(1);
    expect(booleans.stats.pieces).toBe(bricks.stats.pieces);
    for (const [index, piece] of bricks.pieces.entries()) {
      const check = await checkMesh(pieceMesh(bricks, piece));
      expect(check.status).toBe("NoError");
      expect(check.volume).toBeCloseTo(piece.volume as number, 1);
      const other = booleans.pieces[index];
      expect(Math.abs((other?.volume as number) - (piece.volume as number))).toBeLessThan(0.1);
      // Each piece fits within its footprint.
      const [x0, y0, x1, y1] = bricks.layout.split.pieces[index]?.footprint as number[] as [number, number, number, number];
      expect(check.bounds.min[0]).toBeGreaterThanOrEqual(x0 - 1e-3);
      expect(check.bounds.max[0]).toBeLessThanOrEqual(x1 + 1e-3);
      expect(check.bounds.min[1]).toBeGreaterThanOrEqual(y0 - 1e-3);
      expect(check.bounds.max[1]).toBeLessThanOrEqual(y1 + 1e-3);
    }
    expect(bricks.stats.volume).toBeCloseTo(bricks.pieces.reduce((sum, piece) => sum + (piece.volume as number), 0), 6);
  });

  it("adds up to the whole baseplate, less the numbers engraved under the pieces", async () => {
    // Truncated cells: the cuts go between bricks, through the murets of the margin.
    const whole = await generateBaseplate({ marginShape: "cells" }, "final", BARE);
    // Without the slots of the clips (clips.test.ts), which take their own material, nor the
    // magnet holes, which the crossings on a cut lose (magnets.test.ts).
    const cut = await generateBaseplate({ marginShape: "cells" }, "final", { ...BARE, buildPlate: PLATE_256, clips: false });
    const engraved = (whole.stats.volume as number) - (cut.stats.volume as number);
    expect(engraved).toBeGreaterThan(0);
    expect(engraved).toBeLessThan(cut.stats.pieces * LABEL_VOLUME_MAX_MM3);
    // The same bounding box: the pieces in their places make the baseplate.
    expect(cut.stats.dimensions).toEqual(whole.stats.dimensions);
    // Uncut, nothing is engraved: the same baseplate as without a build plate.
    const fits = await generateBaseplate({ marginShape: "cells" }, "final", { ...BARE, buildPlate: { width: 400, depth: 400 } });
    expect(fits.stats.volume).toBe(whole.stats.volume);
    expect(fits.stats.pieces).toBe(1);
    // The frame of crossbars doubles its crossbars on the cuts: on column line 4, across the
    // front and back margins (13.5 mm less the 1.2 mm outer wall), on row line 3 across the
    // left and right ones (10.5 mm less the wall): 1.2 mm more of crossbar, 2 mm high.
    const frame = await generateBaseplate({}, "final", BARE);
    const frameCut = await generateBaseplate({}, "final", { ...BARE, buildPlate: PLATE_256, clips: false });
    const doubled = 1.2 * 2 * (2 * (13.5 - 1.2) + 2 * (10.5 - 1.2));
    expect((frameCut.stats.volume as number) - ((frame.stats.volume as number) - engraved)).toBeCloseTo(doubled, 2);
  });

  it("puts no screw on a crossing of murets that a cut goes through", async () => {
    const whole = await generateBaseplate({ screws: true }, "preview");
    const cut = await generateBaseplate({ screws: true }, "preview", { buildPlate: PLATE_256 });
    // 8 × 5 inner crossings, less those on column line 4 (5) and row line 3 (8), one shared.
    expect(whole.stats.screws).toBe(40);
    expect(cut.stats.screws).toBe(28);
    const [x0, y0] = [-199.5 + 10.5, -139.5 + 13.5];
    const [cutX, cutY] = [x0 + 4 * 42, y0 + 3 * 42];
    expect(cut.layout.screws.every(([x, y]) => Math.abs(x - cutX) > 1 && Math.abs(y - cutY) > 1)).toBe(true);
  });

  it("engraves the number under the piece, 0.4 mm deep, mirrored so that it reads once turned over", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const first = cut.pieces[0] as Baseplate["pieces"][number];
    const check = await checkMesh(pieceMesh(cut, first), [0.2, 0.6]);
    const [under, over] = [check.sections.get(0.2) ?? [], check.sections.get(0.6) ?? []];
    // Piece 1 (columns 0 to 4, rows 3 to 6): on the muret of grid line 2, x = −105, in the
    // middle of row 4 (y = 63), in the half muret of column 1. The « 1 » is a bar on the
    // right as read, so on the left seen from above: x from −107.3 to −106.8.
    expect(inSection(under, [-107.05, 63])).toBe(false);
    expect(inSection(under, [-105.75, 63])).toBe(true);
    expect(inSection(under, [-104, 63])).toBe(true);
    expect(inSection(over, [-107.05, 63])).toBe(true);
    // No number on an uncut baseplate.
    const whole = await generateBaseplate({}, "final");
    const section = (await checkMesh(whole.mesh, [0.2])).sections.get(0.2) ?? [];
    expect(inSection(section, [-107.05, 63])).toBe(true);
  });

  it("sets the pieces apart for the preview, and lays them out for the print without overlap", async () => {
    const cut = await generateBaseplate({}, "preview", { buildPlate: PLATE_256 });
    const spread = spreadPieces(cut, 4);
    const whole = await checkMesh(spread);
    expect(whole.bounds.max[0] - whole.bounds.min[0]).toBeCloseTo(399 + 4, 3);
    expect(whole.bounds.max[1] - whole.bounds.min[1]).toBeCloseTo(279 + 4, 3);
    const laid = printPieces(cut);
    expect(laid).toHaveLength(4);
    const boxes = await Promise.all(laid.map(async (mesh) => (await checkMesh(mesh)).bounds));
    for (const [a, box] of boxes.entries())
      for (const other of boxes.slice(a + 1)) {
        const apartX = box.max[0] + PRINT_GAP_MM - 1e-3 <= other.min[0] || other.max[0] + PRINT_GAP_MM - 1e-3 <= box.min[0];
        const apartY = box.max[1] + PRINT_GAP_MM - 1e-3 <= other.min[1] || other.max[1] + PRINT_GAP_MM - 1e-3 <= box.min[1];
        expect(apartX || apartY).toBe(true);
      }
    // Each piece fits on the build plate as it is laid out.
    for (const { min, max } of boxes) expect(max[0] - min[0] <= 256 && max[1] - min[1] <= 256).toBe(true);
  });

  it("lays the pieces turned a quarter when the plan turns them, so that each lies on the plate as it fits", async () => {
    const settings = { sizeMode: "cells", columns: 10, rows: 4 } as const;
    const plate = { width: 200, depth: 300 };
    const cut = await generateBaseplate(settings, "preview", { buildPlate: plate });
    expect(cut.layout.split.turned).toBe(true);
    for (const mesh of printPieces(cut)) {
      const { status, bounds } = await checkMesh(mesh);
      expect(status).toBe("NoError");
      // 210 × 168 mm pieces, turned: 168 along X, 210 along Y.
      expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(168, 3);
      expect(bounds.max[1] - bounds.min[1]).toBeCloseTo(210, 3);
      expect(fitsOnBuildPlate({ width: 168, depth: 210 }, plate)).toBe(true);
    }
  });
});

describe("export of a cut baseplate", () => {
  it("writes a single 3MF with a named object per piece, in the positive octant, each closed", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const objects = printPieces(cut).map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` }));
    const content = readThreeMf(serialize3mf(objects, { name: "baseplate-9x6-399x279mm", shareLink: "https://example.org/fr/baseplate?v=1" }));
    expect(content.objectNames).toEqual(["pièce 1", "pièce 2", "pièce 3", "pièce 4"]);
    expect(content.buildItems).toEqual(["1", "2", "3", "4"]);
    expect(content.metadata.get("Title")).toBe("baseplate-9x6-399x279mm");
    // One placement for all: the pieces keep where they lie from each other.
    expect(new Set(content.placements.map((placement) => placement.join(" "))).size).toBe(1);
    const [dx, dy, dz] = content.placement;
    let volume = 0;
    for (const { mesh } of content.objects) {
      const check = await checkMesh(mesh);
      expect(check.status).toBe("NoError");
      expect(check.bounds.min[0] + dx).toBeGreaterThanOrEqual(-1e-4);
      expect(check.bounds.min[1] + dy).toBeGreaterThanOrEqual(-1e-4);
      expect(check.bounds.min[2] + dz).toBeGreaterThanOrEqual(-1e-4);
      volume += check.volume;
    }
    expect(Math.abs(volume - (cut.stats.volume as number))).toBeLessThan(0.5);
  });

  it("writes a zip of one STL per piece", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const files = readZip(zipFiles(printPieces(cut).map((mesh, index) => [`piece-${index + 1}.stl`, serializeStl(mesh)])));
    expect(Object.keys(files)).toEqual(["piece-1.stl", "piece-2.stl", "piece-3.stl", "piece-4.stl"]);
    for (const bytes of Object.values(files)) expect((await checkMesh(readBinaryStl(bytes))).status).toBe("NoError");
  });
});
