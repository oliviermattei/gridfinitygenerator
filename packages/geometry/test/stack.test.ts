import { describe, expect, it } from "vitest";
import {
  EAR_RADIUS_MM,
  PIN_DIAMETER_MM,
  generateBaseplate,
  orientStacks,
  printClips,
  printStacks,
  serialize3mf,
  stackPitch,
  stackPlanOf,
  stackRuleOf,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
  type StackPlan,
  type TriangleMesh,
} from "../src/index";
import { areaOutside, badEdges, checkMesh, readThreeMf, sectionArea } from "./support/measure";

// Stacked print of the pieces of a cut baseplate (#28, ADR 0016), observed through the
// public interface: the plan, the stacked meshes, what holds each piece, and the 3MF.

const LAYER = 0.2;
const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/**
 * The pile of the acceptance (#16): 3 × 2 cells, a margin of 10.5 mm on the left and on the
 * right in truncated cells, cut on a build plate 60 mm wide into 3 pieces of one column.
 */
const PILE_OF_3: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 3, rows: 2, marginWidth: 21, marginDepth: 0, marginShape: "cells" };
const PLATE_60: BuildPlate = { width: 60, depth: 100 };
/** Without the holes the piece above bridges (magnets, clip slots): what rests on nothing else. */
const BARE = { magnets: false, clips: false };
const OPTIONS = { layerHeight: LAYER, lineWidth: 0.4, ears: false, pins: false };

/** The closed shells of a stack, one per piece, from the vertex and triangle counts of the pieces. */
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

/** What rests on what at a joint: the section of the upper piece just above its bottom, and how much of it the lower piece holds. */
async function joint(lower: TriangleMesh, upper: TriangleMesh) {
  const [below, above] = [await checkMesh(lower), await checkMesh(upper)];
  const top = below.bounds.max[2];
  const bottom = above.bounds.min[2];
  const lowerTop = (await checkMesh(lower, [top - 0.01])).sections.get(top - 0.01) ?? [];
  const upperBottom = (await checkMesh(upper, [bottom + 0.01])).sections.get(bottom + 0.01) ?? [];
  const face = await sectionArea(upperBottom);
  const unheld = await areaOutside(upperBottom, lowerTop);
  return { gap: bottom - top, face, contact: face - unheld, unheld };
}

describe("rule", () => {
  const layout = async (settings: Partial<BaseplateSettings>, plate: BuildPlate | null = PLATE_256) => (await generateBaseplate(settings, "preview", { buildPlate: plate })).layout;

  it("stacks the pieces of a margin of truncated cells, or of a baseplate without margin, in Normal", async () => {
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "normal", layerHeight: 0.2 }, await layout({ marginShape: "cells" }))).toEqual({ blockers: [], warnings: [] });
    const bare = { sizeMode: "cells", columns: 8, rows: 2 } as const;
    expect(stackRuleOf({ marginShape: "frame", baseplateType: "normal", layerHeight: 0.2 }, await layout(bare))).toEqual({ blockers: [], warnings: [] });
  });

  it("blocks a single piece, a frame (low, or reduced to single crossbars), a tray and a CLICKbase", async () => {
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "normal", layerHeight: 0.2 }, await layout({}, null)).blockers).toEqual(["single-piece"]);
    for (const minimalMargin of [false, true]) {
      const settings = { marginShape: "frame", minimalMargin } as const;
      expect(stackRuleOf({ ...settings, baseplateType: "normal", layerHeight: 0.2 }, await layout(settings)).blockers).toEqual(["low-margin"]);
    }
    const cut = await layout({ marginShape: "cells" });
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "tray", layerHeight: 0.2 }, cut).blockers).toEqual(["tray"]);
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "clickbase", layerHeight: 0.2 }, cut).blockers).toEqual(["clickbase"]);
  });

  it("warns of layers thicker than 0.2 mm and of the bridged bands of a skeleton", async () => {
    const cut = await layout({ marginShape: "cells" });
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "normal", layerHeight: 0.2 }, cut).warnings).toEqual([]);
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "normal", layerHeight: 0.24 }, cut).warnings).toEqual(["layer-height"]);
    expect(stackRuleOf({ marginShape: "cells", baseplateType: "skeleton", layerHeight: 0.28 }, cut)).toEqual({ blockers: [], warnings: ["layer-height", "skeleton"] });
  });
});

describe("pitch", () => {
  it("is the height of a piece and exactly one layer", () => {
    expect(stackPitch(4.6, 0.2)).toBe(4.8); // hybrid: 23 + 1 layers
    expect(stackPitch(5.4, 0.2)).toBe(5.6); // tray: 27 + 1 layers
    expect(stackPitch(4.25, 0.2)).toBe(4.45); // flush: not a whole number of layers, still one layer of air
    expect(stackPitch(4.6, 0.12)).toBe(4.72);
  });
});

describe("plan", () => {
  it("stacks the 3 pieces of the pile of the acceptance: the first upright, the others upside down, on one layer of air", async () => {
    const baseplate = await generateBaseplate(PILE_OF_3, "preview", { buildPlate: PLATE_60 });
    expect(baseplate.stats.pieces).toBe(3);
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    expect(plan.pitch).toBe(4.8);
    // The pieces with a margin first (the larger), the right one turned about Y so that its
    // margin lies on the left one's; the middle one, without margin, on top.
    expect(plan.stacks.map((stack) => stack.map(({ number, flip, z }) => [number, flip, z]))).toEqual([
      [
        [1, "none", 0],
        [3, "y", 4.8],
        [2, "x", 9.6],
      ],
    ]);
  });

  it("stacks the default drawer with truncated cells in 2 stacks: the fourth piece would need both mirrors", async () => {
    const baseplate = await generateBaseplate({ marginShape: "cells" }, "preview", { buildPlate: PLATE_256 });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    // The 5-column pieces (2 back right, 4 front right) first, then the 4-column back left one
    // turned about Y; the front left one would have to be mirrored both ways.
    expect(plan.stacks.map((stack) => stack.map(({ number, flip }) => `${number}${flip}`))).toEqual([["2none", "4x", "1y"], ["3none"]]);
  });

  it("keeps apart the pieces whose margins lie on sides that no flip brings together", async () => {
    // Grid at the back left: margins on the right and at the front only.
    const baseplate = await generateBaseplate({ marginShape: "cells", alignment: "tl" }, "preview", { buildPlate: PLATE_256 });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    expect(plan.stacks.map((stack) => stack.map(({ number, flip }) => `${number}${flip}`))).toEqual([["3none", "1x"], ["4none", "2x"]]);
  });
});

describe("printed stacks", () => {
  it("lays each piece of the pile one layer above the one beneath, every shell closed, and each held by the one beneath", async () => {
    const baseplate = await generateBaseplate(PILE_OF_3, "final", { buildPlate: PLATE_60, ...BARE });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const [stack] = await printStacks(baseplate, plan, OPTIONS);
    const shells = shellsOf((stack as { mesh: TriangleMesh }).mesh, baseplate, plan.stacks[0] ?? []);
    expect(shells).toHaveLength(3);
    for (const shell of shells) {
      const check = await checkMesh(shell);
      expect(check.status).toBe("NoError");
      expect(badEdges(shell)).toBe(0);
      expect(check.bounds.max[2] - check.bounds.min[2]).toBeCloseTo(4.6, 4);
    }
    // The same volume as the pieces: turned, not altered.
    const volumes = await Promise.all(shells.map(async (shell) => (await checkMesh(shell)).volume));
    expect(volumes.reduce((sum, volume) => sum + volume, 0)).toBeCloseTo(baseplate.stats.volume as number, 0);

    const [first, second] = [await joint(shells[0] as TriangleMesh, shells[1] as TriangleMesh), await joint(shells[1] as TriangleMesh, shells[2] as TriangleMesh)];
    for (const { gap } of [first, second]) expect(gap).toBeCloseTo(LAYER, 4); // no shell touches another
    // Flats on flats, then flats on the feet of the murets: all held, nothing in the air.
    expect(first.unheld).toBeLessThan(0.5);
    expect(second.unheld).toBeLessThan(0.5);
    expect(first.contact).toBeGreaterThan(300);
    expect(second.contact).toBeGreaterThan(150);
  });

  it("holds each piece of the default drawer in truncated cells but over the holes of the piece beneath, which it bridges", async () => {
    const baseplate = await generateBaseplate({ marginShape: "cells" }, "final", { buildPlate: PLATE_256 });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const stacks = await printStacks(baseplate, plan, OPTIONS);
    const shells = shellsOf((stacks[0] as { mesh: TriangleMesh }).mesh, baseplate, plan.stacks[0] ?? []);
    const second = await joint(shells[1] as TriangleMesh, shells[2] as TriangleMesh);
    // Upside down, the piece beneath shows its magnet holes (Ø 6.5) and clip slots: the flats
    // above cross them. The same joint without them is fully held.
    expect(second.unheld).toBeGreaterThan(10);
    const bare = await generateBaseplate({ marginShape: "cells" }, "final", { buildPlate: PLATE_256, ...BARE });
    const bareShells = shellsOf((await printStacks(bare, plan, OPTIONS))[0]?.mesh as TriangleMesh, bare, plan.stacks[0] ?? []);
    expect((await joint(bareShells[1] as TriangleMesh, bareShells[2] as TriangleMesh)).unheld).toBeLessThan(0.5);
    for (const { mesh } of stacks) expect((await checkMesh(mesh)).status).toBe("NoError");
  });

  it("lays the stacks side by side and the clips beside them, and a 3MF read back keeps every height", async () => {
    const baseplate = await generateBaseplate({ marginShape: "cells" }, "final", { buildPlate: PLATE_256 });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const stacks = await printStacks(baseplate, plan, OPTIONS);
    const clips = printClips(baseplate, stacks.map(({ mesh }) => mesh));
    expect(clips).not.toBeNull();
    const objects = [...stacks.map(({ mesh, pieces }, k) => ({ mesh, name: `pile ${k + 1} (${pieces.join(", ")})` })), { mesh: clips as TriangleMesh, name: "clip × 8" }];
    const boxes = await Promise.all(objects.map(async ({ mesh }) => (await checkMesh(mesh)).bounds));
    // None overlaps another.
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const [p, q] = [boxes[a], boxes[b]] as [(typeof boxes)[number], (typeof boxes)[number]];
        expect(p.max[0] < q.min[0] || q.max[0] < p.min[0] || p.max[1] < q.min[1] || q.max[1] < p.min[1]).toBe(true);
      }

    const content = readThreeMf(serialize3mf(objects, { name: "baseplate-9x6-399x279mm-stack", shareLink: "https://example.org/fr/baseplate?v=1&mg=cells" }));
    expect(content.objectNames).toEqual(["pile 1 (2, 4, 1)", "pile 2 (3)", "clip × 8"]);
    // Every object lies on the build plate, and the stack keeps its heights: its pieces
    // start at 0, 4.8 and 9.6 mm, and end one layer below the next.
    for (const placement of content.placements) expect(placement[2]).toBeCloseTo(0, 5);
    const heights = new Set([...(content.objects[0]?.mesh.positions ?? [])].filter((_, k) => k % 3 === 2).map((z) => Math.round(z * 1000) / 1000));
    for (const z of [0, 4.6, 4.8, 9.4, 9.6, 14.2]) expect(heights.has(z)).toBe(true);
    expect(Math.max(...heights)).toBe(14.2);
    const [read] = content.objects;
    expect((await checkMesh(read?.mesh as TriangleMesh)).volume).toBeCloseTo((await checkMesh(stacks[0]?.mesh as TriangleMesh)).volume, 1);
  });

  it("turns the stacks a quarter with the pieces when the split plan lays them turned", async () => {
    // 5 × 1 cells on a plate 100 wide and 300 deep: the plan turns the pieces.
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 5, rows: 1, marginWidth: 0, marginDepth: 0 }, "preview", { buildPlate: { width: 100, depth: 150 } });
    expect(baseplate.layout.split.turned).toBe(true);
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const [stack] = await printStacks(baseplate, plan, OPTIONS);
    const { min, max } = (await checkMesh(stack?.mesh as TriangleMesh)).bounds;
    // Its bottom piece lies along Y, as it fits on the plate.
    expect(max[1] - min[1]).toBeGreaterThan(max[0] - min[0]);
  });
});

describe("orientation", () => {
  /** The unheld area of each joint of each stack, measured on the printed shells, and the checks of the shells. */
  async function joints(baseplate: Baseplate, plan: StackPlan) {
    const printed = await printStacks(baseplate, plan, OPTIONS);
    const result: { unheld: number; face: number }[][] = [];
    for (const [s, stack] of plan.stacks.entries()) {
      const shells = shellsOf((printed[s] as { mesh: TriangleMesh }).mesh, baseplate, stack);
      for (const [k, shell] of shells.entries()) {
        const check = await checkMesh(shell);
        expect(check.status).toBe("NoError");
        expect(badEdges(shell)).toBe(0);
        // Its height in the stack is kept: its rank times the pitch, one piece high.
        expect(check.bounds.min[2]).toBeCloseTo(k * plan.pitch, 4);
        expect(check.bounds.max[2]).toBeCloseTo(k * plan.pitch + baseplate.stats.dimensions.height, 4);
      }
      const measured: { unheld: number; face: number }[] = [];
      for (let k = 1; k < shells.length; k++) {
        const { gap, unheld, face } = await joint(shells[k - 1] as TriangleMesh, shells[k] as TriangleMesh);
        expect(gap).toBeCloseTo(LAYER, 4);
        measured.push({ unheld, face });
      }
      result.push(measured);
    }
    return result;
  }
  const total = (measured: { unheld: number }[][]) => measured.flat().reduce((sum, { unheld }) => sum + unheld, 0);

  it("turns the second of two pieces of one cell about Y: its square corners on the square ones, held all over", async () => {
    // The pile of prototypes/stack-1x1: 2 × 1 cells without margin, cut in two by a plate of 50 mm.
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 1 }, "final", { buildPlate: { width: 50, depth: 50 } });
    const planned = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const plan = await orientStacks(baseplate, planned);
    expect(plan.stacks.map((stack) => stack.map(({ number, flip }) => `${number}${flip}`))).toEqual([["1none", "2y"]]);
    const [before] = (await joints(baseplate, planned)).flat() as [{ unheld: number; face: number }];
    const [after] = (await joints(baseplate, plan)).flat() as [{ unheld: number; face: number }];
    // About X, its square corners of the cut over the rounded corners of the outline.
    expect(before.unheld).toBeGreaterThan(5);
    expect(after.unheld).toBeLessThan(0.05);
    expect(after.face).toBeGreaterThan(60);
  });

  it("holds the default drawer at least as well as the first flips, in the same stacks", async () => {
    const baseplate = await generateBaseplate({ marginShape: "cells" }, "final", { buildPlate: PLATE_256 });
    const planned = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const plan = await orientStacks(baseplate, planned);
    expect(plan.stacks.map((stack) => stack.map(({ number }) => number))).toEqual(planned.stacks.map((stack) => stack.map(({ number }) => number)));
    expect(plan.stacks.map((stack) => stack.map(({ z }) => z))).toEqual(planned.stacks.map((stack) => stack.map(({ z }) => z)));
    const [before, after] = [total(await joints(baseplate, planned)), total(await joints(baseplate, plan))];
    expect(after).toBeLessThanOrEqual(before + 1e-3);
  });

  it("holds the pile of the acceptance at least as well as the first flips", async () => {
    const baseplate = await generateBaseplate(PILE_OF_3, "final", { buildPlate: PLATE_60 });
    const planned = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const plan = await orientStacks(baseplate, planned);
    const [before, after] = [total(await joints(baseplate, planned)), total(await joints(baseplate, plan))];
    expect(after).toBeLessThanOrEqual(before + 1e-3);
  });
});

describe("ears and pins", () => {
  it("add a one-layer ear on each corner of the bottom piece", async () => {
    const baseplate = await generateBaseplate(PILE_OF_3, "final", { buildPlate: PLATE_60, ...BARE });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const [plain] = await printStacks(baseplate, plan, OPTIONS);
    const [eared] = await printStacks(baseplate, plan, { ...OPTIONS, ears: true });
    const [a, b] = [await checkMesh(plain?.mesh as TriangleMesh, [LAYER / 2, LAYER * 1.5]), await checkMesh(eared?.mesh as TriangleMesh, [LAYER / 2, LAYER * 1.5])];
    expect(b.status).toBe("NoError");
    // Four ears, one layer thick, each a disc a little less than its quarter over the piece.
    const added = (await areaOutside(b.sections.get(LAYER / 2) ?? [], a.sections.get(LAYER / 2) ?? [])) * LAYER;
    expect(b.volume - a.volume).toBeCloseTo(added, 0);
    expect(added / LAYER).toBeGreaterThan(4 * 0.7 * Math.PI * EAR_RADIUS_MM ** 2);
    expect(added / LAYER).toBeLessThan(4 * Math.PI * EAR_RADIUS_MM ** 2);
    // No ear on the pieces above without the pins: it would hang in the air.
    expect(await areaOutside(b.sections.get(LAYER * 1.5) ?? [], a.sections.get(LAYER * 1.5) ?? [])).toBeLessThan(1e-3);
  });

  it("tie with a pin of 0.8 mm the ears of the corners the pieces above share", async () => {
    const baseplate = await generateBaseplate(PILE_OF_3, "final", { buildPlate: PLATE_60, ...BARE });
    const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, LAYER);
    const [pinned] = await printStacks(baseplate, plan, { ...OPTIONS, ears: true, pins: true });
    const check = await checkMesh(pinned?.mesh as TriangleMesh, [2, 7, 12]);
    expect(check.status).toBe("NoError");
    expect(badEdges(pinned?.mesh as TriangleMesh)).toBe(0);
    // Pieces 1 and 3 share the 4 corners (same footprint, 3 turned about Y); piece 2, a column
    // without margin on top, shares their 2 corners on the cut: 2 pins up to the ear of piece
    // 3 (4.8 + 0.2 mm), 2 up to the ear of piece 2 (9.6 + 0.2 mm).
    // A pin: a contour of its diameter.
    const extent = (contour: [number, number][], axis: 0 | 1) => Math.max(...contour.map((p) => p[axis])) - Math.min(...contour.map((p) => p[axis]));
    const pins = (contours: [number, number][][]) =>
      contours.filter((contour) => extent(contour, 0) <= PIN_DIAMETER_MM + 1e-3 && extent(contour, 1) <= PIN_DIAMETER_MM + 1e-3).length;
    expect(pins(check.sections.get(2) ?? [])).toBe(4);
    expect(pins(check.sections.get(7) ?? [])).toBe(2);
    expect(pins(check.sections.get(12) ?? [])).toBe(0);
  });
});
