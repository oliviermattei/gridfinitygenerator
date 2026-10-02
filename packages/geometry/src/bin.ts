import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Quality } from "./baseplate";
import { clampBinSettings, labelSideOf, type BinSettings, type BinSide, type StackingLip } from "./bin-settings";
import { loadManifold, withArena, type Own } from "./manifold";
import type { TriangleMesh } from "./mesh";
import { fitsOnBuildPlate, layerCount, roundUpToLayer, type BuildPlate } from "./print";
import { loft, meshOf, roundedRect } from "./shapes";

/**
 * A Gridfinity bin (spec v2, #32): a socle of one standard foot per cell, walls, a stacking
 * lip, and a regular grid of compartments with an optional fillet (congé), scoop (pelle)
 * and label tab (onglet d'étiquette). Axes as the baseplate: +X right, +Y back, +Z up; the bin
 * is centred on the origin in XY and stands on z = 0, the bottom of its feet.
 */

/** Height of a U, in millimetres: a bin of n U is 7n mm high without its stacking lip. */
export const UNIT_HEIGHT_MM = 7;

/**
 * The foot (ADR 0021): the exact standard foot, as [z, inset] from the bottom up, the inset
 * measured from the top outline of the foot, the cell less the 0.5 mm gap between feet. Its
 * corners are concentric with the 3.75 mm radius of that outline.
 */
export const FOOT = {
  /** Gap between the feet of two neighbouring cells, and between a bin and its cell. */
  gap: 0.5,
  topRadius: 3.75,
  levels: [
    [0, 2.95],
    [0.8, 2.15],
    [2.6, 2.15],
    [4.75, 0],
  ] as const,
  height: 4.75,
} as const;

/** Top of the socle, the inner floor of a standard bin: the first U (gridfinity-rebuilt `BASE_HEIGHT`). */
export const SOLID_FLOOR_MM = 7;

/** Floor of a hollow socle (bench #34): a slab this thick just above the slopes of the feet. */
const HOLLOW_FLOOR_MM = 1.2;
/** Horizontal wall of a hollow foot, all around its cavity. */
const HOLLOW_FOOT_WALL_MM = 1.2;

/**
 * Stacking lip, as the inner face of the wall around its top: [z above the top of the walls
 * (7 mm per U), inset from the outer face], bottom up. The normal lip is the standard one
 * (gridfinity-rebuilt `STACKING_LIP_LINE`, 45°, 1.8 mm vertical, 45°), its sharp top planed
 * down to a flat of 0.4 mm like the top of the murets of a baseplate (ADR 0002): 4.0 mm
 * above the walls instead of 4.4. The foot of a bin stacked on it sits on both of its
 * slopes, 0.35 mm under the top of the walls (STACKED_FOOT_DEPTH_MM). The reduced lip keeps the upper slope only, the
 * seat of the bin above, and a wider opening. Below its first point, a 45° support joins the
 * wall, so that the lip never overhangs more than 45°.
 */
const LIPS: Record<Exclude<StackingLip, "none">, readonly (readonly [z: number, inset: number])[]> = {
  normal: [
    [-1.2, 2.6],
    [0, 2.6],
    [0.7, 1.9],
    [2.5, 1.9],
    [4.0, 0.4],
  ],
  reduced: [
    [0.7, 1.9],
    [2.5, 1.9],
    [4.0, 0.4],
  ],
};

/** How far the foot of a bin stacked on a lip goes down under the top of the walls. */
export const STACKED_FOOT_DEPTH_MM = 0.35;
/** Room left between the foot of a stacked bin and what stands inside the bin under it (dividers, label tabs). */
const STACK_CLEARANCE_MM = 0.25;

/** Height of a stacking lip above the top of the walls, 0 without one. */
export function lipHeight(lip: StackingLip): number {
  return lip === "none" ? 0 : 4.0;
}

/** Radius of the fillet between the inner floor and the walls (congé), when it fits. */
export const FILLET_RADIUS_MM = 5;
/** Radius of the scoop (pelle), when it fits. */
export const SCOOP_RADIUS_MM = 12;
/**
 * The label tab (onglet d'étiquette), a ribbed shelf: its thickness; the rim (liseré) along its
 * front edge, whose top is the top of the useful space; the 45° fillet under its root; and the
 * consoles at 45° under it, one in the middle of each cell along its wall, none closer than
 * `consoleClearance` to the end of the compartment, where a wall or a divider already holds it.
 */
export const LABEL_TAB = {
  shelf: 1.6,
  rim: { width: 0.8, height: 1 },
  root: 2,
  console: 1.2,
  consoleClearance: 5,
} as const;

/** Segments per quarter circle (the baseplate's: 8 in preview, 32 in final). */
const SEGMENTS_PER_QUARTER: Record<Quality, number> = { preview: 8, final: 32 };
/** Layers of the loft of the fillet between the floor and the walls. */
const FILLET_STEPS: Record<Quality, number> = { preview: 3, final: 8 };
/** Smallest corner radius of a loft layer: every layer keeps as many points as the others. */
const MIN_RADIUS_MM = 0.01;

/** Where a bin's space and walls lie, in millimetres, computed from its settings. */
export interface BinLayout {
  /** Outline of the bin: the cells less the gap. */
  width: number;
  depth: number;
  /** Height of the top of the walls (7 mm per U), and of the whole bin with its lip. */
  wallTop: number;
  height: number;
  /** Thickness of the outer walls and of the dividers, whole lines of the line width. */
  wall: number;
  divider: number;
  /** Height of the inner floor, and of the top of the useful space (under the lip, or the top of the walls). */
  floor: number;
  usefulTop: number;
  /** Size of each compartment, inside. */
  compartment: { width: number; depth: number };
  /** Radii actually used (0 when off or when there is no room). */
  fillet: number;
  scoop: number;
  scoopSide: BinSide;
  /** Depth of the label tab actually used (0 when off or when there is no room), and its side. */
  labelTab: number;
  labelSide: BinSide;
  /** How far the consoles of the label tab reach under it, from its wall (at 45°, as deep as high). */
  consoleReach: number;
}

export interface BinStats {
  /** Bounding box of the mesh, in millimetres. */
  dimensions: { width: number; depth: number; height: number };
  /** Height without the stacking lip: the top of the walls. */
  heightWithoutLip: number;
  /** Inside of one compartment: width, depth and useful height, from the floor to under the lip. */
  compartment: { width: number; depth: number; height: number };
  compartments: number;
  /** Volume of material in mm³, measured on the final mesh; null for the preview. */
  volume: number | null;
  /**
   * Useful volume in mm³: the empty space of the compartments from the floor to the top of the
   * useful space, scoop and label tab taken away, computed on the solids; null for the preview.
   */
  usefulVolume: number | null;
  layers: number;
}

export interface Bin {
  mesh: TriangleMesh;
  layout: BinLayout;
  stats: BinStats;
}

/** What the benches may change beyond the settings (#34); the generator never does. */
export interface GenerateBinOptions {
  /** The socle: solid feet under a floor at 7 mm (standard, default), or hollow feet under a thin floor. */
  socle?: "solid" | "hollow";
  /** Radius of the fillet when it is on, instead of FILLET_RADIUS_MM. */
  filletRadius?: number;
}

/**
 * Generates a bin from its settings, brought into their ranges first (`clampBinSettings`).
 * The final mesh, the one exported, is checked by manifold (`NoError`).
 */
export async function generateBin(input: Partial<BinSettings>, quality: Quality, options: GenerateBinOptions = {}): Promise<Bin> {
  const settings = clampBinSettings(input);
  const wasm = await loadManifold();
  const layout = binLayoutOf(settings, options);
  return withArena((own) => {
    const built = buildBin(wasm, own, settings, layout, quality, options);
    const mesh = meshOf(built.solid);
    return {
      mesh,
      layout,
      stats: {
        dimensions: dimensionsOf(mesh),
        heightWithoutLip: layout.wallTop,
        compartment: { ...layout.compartment, height: layout.usefulTop - layout.floor },
        compartments: settings.compartmentColumns * settings.compartmentRows,
        volume: quality === "final" ? built.solid.volume() : null,
        usefulVolume: quality === "final" ? built.usefulVolume : null,
        layers: layerCount(layout.height, settings.layerHeight),
      },
    };
  });
}

/** Whether a bin of these settings fits on the build plate, as it is or turned a quarter. */
export function binFitsOn(input: Partial<BinSettings>, plate: BuildPlate): boolean {
  const { width, depth } = binLayoutOf(clampBinSettings(input));
  return fitsOnBuildPlate({ width, depth }, plate);
}

/**
 * The most cells a bin can have along the short and the long side of the build plate (at
 * least 1): a bin fits when its short side takes at most `short` cells and its long side
 * at most `long`, turned as needed.
 */
export function maxBinCells(cellSize: number, plate: BuildPlate): { short: number; long: number } {
  const cells = (length: number) => Math.max(1, Math.floor((length + FOOT.gap) / cellSize + 1e-9));
  return { short: cells(Math.min(plate.width, plate.depth)), long: cells(Math.max(plate.width, plate.depth)) };
}

/** Whole lines of the line width closest to `target`, between `min` lines and `max` millimetres. */
function linesOf(target: number, lineWidth: number, minLines: number, max: number): number {
  const lines = Math.max(1, Math.min(Math.max(minLines, Math.round(target / lineWidth)), Math.floor(max / lineWidth + 1e-9)));
  return Math.round(lines * lineWidth * 1e6) / 1e6;
}

/** The layout of a bin of settings in their ranges. */
export function binLayoutOf(settings: BinSettings, options: GenerateBinOptions = {}): BinLayout {
  const { cellSize, columns, rows, units, lip, lineWidth, layerHeight } = settings;
  const width = columns * cellSize - FOOT.gap;
  const depth = rows * cellSize - FOOT.gap;
  const wallTop = units * UNIT_HEIGHT_MM;
  // 1.2 mm walls (3 lines of 0.4), thin enough for the support of the reduced lip (under 1.9 mm).
  const wall = linesOf(1.2, lineWidth, 2, 1.6);
  // 0.8 mm dividers (2 lines of 0.4).
  const divider = linesOf(0.8, lineWidth, 2, 1.6);
  const floor = options.socle === "hollow" ? roundUpToLayer(FOOT.height + HOLLOW_FLOOR_MM, layerHeight) : SOLID_FLOOR_MM;
  const lipLevels = lip === "none" ? null : LIPS[lip];
  // The useful space stops where the support of the lip leaves the wall, and under the foot of a stacked bin.
  const [firstZ, firstInset] = lipLevels ? (lipLevels[0] as readonly [number, number]) : [0, 0];
  const usefulTop = lipLevels ? Math.min(wallTop + firstZ - (firstInset - wall), wallTop - STACKED_FOOT_DEPTH_MM - STACK_CLEARANCE_MM) : wallTop;
  const innerWidth = width - 2 * wall;
  const innerDepth = depth - 2 * wall;
  const compartment = {
    width: (innerWidth - (settings.compartmentColumns - 1) * divider) / settings.compartmentColumns,
    depth: (innerDepth - (settings.compartmentRows - 1) * divider) / settings.compartmentRows,
  };
  const room = usefulTop - floor;
  const half = Math.min(compartment.width, compartment.depth) / 2;
  const fillet = settings.fillet ? Math.max(0, Math.min(options.filletRadius ?? FILLET_RADIUS_MM, half - 0.5, room / 2)) : 0;
  // Across the compartment from its side: the depth for the front and the back, the width for the sides.
  const across = (side: BinSide) => (side === "front" || side === "back" ? compartment.depth : compartment.width);
  const scoop = settings.scoop ? Math.max(0, Math.min(SCOOP_RADIUS_MM, across(settings.scoopSide) / 2, room - 1)) : 0;
  // The label tab, under half the compartment across; its consoles, at 45°, reach as far as
  // the height under the shelf allows, 1 mm above the floor.
  const labelSide = labelSideOf(settings);
  const tab = settings.labelTab ? Math.min(settings.labelDepth, across(labelSide) * 0.45) : 0;
  const consoleReach = Math.max(0, Math.min(tab - 1, room - LABEL_TAB.rim.height - LABEL_TAB.shelf - 1));
  return {
    width,
    depth,
    wallTop,
    height: wallTop + lipHeight(lip),
    wall,
    divider,
    floor,
    usefulTop,
    compartment,
    fillet,
    scoop: scoop >= 2 ? scoop : 0,
    scoopSide: settings.scoopSide,
    labelTab: tab >= 3 ? tab : 0,
    labelSide,
    consoleReach,
  };
}

/** Counter-clockwise rounded rectangle, centred on (cx, cy). */
function roundedRectAt(cx: number, cy: number, width: number, depth: number, radius: number, segments: number): [number, number][] {
  return roundedRect(width, depth, radius, segments).map(([x, y]) => [x + cx, y + cy] as [number, number]);
}

function solidOfMesh(wasm: ManifoldToplevel, own: Own, mesh: TriangleMesh): Manifold {
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices })));
}

/** A loft through rounded rectangles centred on (cx, cy), each [z, inset] from an outline of width × depth and corner `radius`. */
function roundedLoft(
  wasm: ManifoldToplevel,
  own: Own,
  [cx, cy]: readonly [number, number],
  width: number,
  depth: number,
  radius: number,
  levels: readonly (readonly [z: number, inset: number])[],
  segments: number,
  cornerRadius: (inset: number) => number = (inset) => radius - inset,
): Manifold {
  const layers = levels.map(([z, inset]) => ({
    z,
    points: roundedRectAt(cx, cy, width - 2 * inset, depth - 2 * inset, Math.max(cornerRadius(inset), MIN_RADIUS_MM), segments),
  }));
  return solidOfMesh(wasm, own, loft(layers));
}

/**
 * A solid extruded along X from `x0` to `x1`, of a cross-section drawn in the (y, z) plane:
 * extruded along Z, then its axes turned round (x, y, z) → (z, x, y), which keeps it inside out.
 */
function alongX(wasm: ManifoldToplevel, own: Own, section: CrossSection, x0: number, x1: number): Manifold {
  const prism = own(wasm.Manifold.extrude(section, x1 - x0));
  return own(
    prism.warp((vertex) => {
      const [y, z, x] = [vertex[0], vertex[1], vertex[2]];
      vertex[0] = x + x0;
      vertex[1] = y;
      vertex[2] = z;
    }),
  );
}

function buildBin(
  wasm: ManifoldToplevel,
  own: Own,
  settings: BinSettings,
  layout: BinLayout,
  quality: Quality,
  options: GenerateBinOptions,
): { solid: Manifold; usefulVolume: number } {
  const segments = SEGMENTS_PER_QUARTER[quality];
  const { cellSize, columns, rows, lip } = settings;
  const { width, depth, wallTop, height, wall, divider, usefulTop, compartment } = layout;
  const footSize = cellSize - FOOT.gap;

  // The feet, one per cell, under a body with the outline of the bin.
  const cellCentre = (i: number, j: number): [number, number] => [(i + 0.5) * cellSize - (columns * cellSize) / 2, (j + 0.5) * cellSize - (rows * cellSize) / 2];
  const feet: Manifold[] = [];
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      feet.push(roundedLoft(wasm, own, cellCentre(i, j), footSize, footSize, FOOT.topRadius, FOOT.levels, segments));
    }
  }
  const outline = own(wasm.CrossSection.ofPolygons([roundedRect(width, depth, FOOT.topRadius, segments)]));
  const body = own(own(wasm.Manifold.extrude(outline, height - FOOT.height)).translate([0, 0, FOOT.height]));
  let solid = own(wasm.Manifold.union([body, ...feet]));

  if (options.socle === "hollow") {
    // The cavity of each foot, a wall's width inside it, from under the bin up to the top of the foot.
    const [first] = FOOT.levels;
    const cavityLevels: [number, number][] = [
      [-1, first[1] + 1 + HOLLOW_FOOT_WALL_MM],
      ...FOOT.levels.map(([z, inset]) => [z, inset + HOLLOW_FOOT_WALL_MM] as [number, number]),
    ];
    const cavities: Manifold[] = [];
    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        cavities.push(roundedLoft(wasm, own, cellCentre(i, j), footSize, footSize, FOOT.topRadius, cavityLevels, segments));
      }
    }
    solid = own(solid.subtract(own(wasm.Manifold.compose(cavities))));
  }

  // The compartments, each a box rounded at its floor (the fillet), its scoop side rounded
  // wider (the scoop, which turns into its two corners), and rounded in its vertical corners.
  // Without a lip they go through the top; under a lip they stop where its support starts.
  const through = lip === "none" ? 1 : 0;
  const boxTop = usefulTop + through;
  const verticalRadius = Math.min(Math.max(layout.fillet, FOOT.topRadius - wall), Math.min(compartment.width, compartment.depth) / 2 - 0.25);
  const boxLevels = compartmentLevels(layout, verticalRadius, boxTop, FILLET_STEPS[quality]);
  const cellsAlong = (side: BinSide) =>
    side === "front" || side === "back"
      ? Array.from({ length: columns }, (_, i) => (i + 0.5) * cellSize - (columns * cellSize) / 2)
      : Array.from({ length: rows }, (_, j) => (j + 0.5) * cellSize - (rows * cellSize) / 2);
  const x0 = -width / 2 + wall;
  const y0 = -depth / 2 + wall;
  const boxes: Manifold[] = [];
  const extras: Manifold[] = [];
  let usefulVolume = 0;
  for (let i = 0; i < settings.compartmentColumns; i++) {
    for (let j = 0; j < settings.compartmentRows; j++) {
      const cx0 = x0 + i * (compartment.width + divider);
      const cy0 = y0 + j * (compartment.depth + divider);
      const bounds: Bounds = [cx0, cx0 + compartment.width, cy0, cy0 + compartment.depth];
      const box = compartmentBox(wasm, own, bounds, boxLevels, layout.scoop > 0 ? layout.scoopSide : null, segments);
      boxes.push(box);
      usefulVolume += box.volume();
      if (through > 0) usefulVolume -= through * roundedRectArea(compartment.width, compartment.depth, verticalRadius);
      if (layout.labelTab > 0) {
        const tab = own(labelTabOf(wasm, own, bounds, layout.labelSide, layout.labelTab, layout.consoleReach, usefulTop - LABEL_TAB.rim.height, cellsAlong(layout.labelSide)).intersect(box));
        extras.push(tab);
        usefulVolume -= tab.volume();
      }
    }
  }
  const tools: Manifold[] = [own(wasm.Manifold.compose(boxes))];
  if (lip !== "none") {
    // The opening through the lip, from the top of the useful space up through the top.
    const levels: [number, number][] = [[usefulTop, wall], ...LIPS[lip].map(([z, inset]) => [wallTop + z, inset] as [number, number]), [height + 1, 0.4]];
    tools.push(roundedLoft(wasm, own, [0, 0], width, depth, FOOT.topRadius, levels, segments));
  }
  solid = own(solid.subtract(own(wasm.Manifold.union(tools))));
  if (extras.length > 0) solid = own(wasm.Manifold.union([solid, ...extras]));
  return { solid, usefulVolume };
}

/** A compartment inside, seen from above: [x0, x1, y0, y1]. */
type Bounds = [x0: number, x1: number, y0: number, y1: number];

/** A level of a compartment box: its height, the set-in of its scoop side and of its other sides, and its corner radii. */
interface CompartmentLevel {
  z: number;
  scoopInset: number;
  inset: number;
  /** Radius of the two corners on the scoop side, and of the two others. */
  scoopCorner: number;
  corner: number;
}

/** Set-in of a wall `h` above the floor, in an arc of radius `r` from the floor to the wall. */
function arcInset(r: number, h: number): number {
  return h >= r ? 0 : r - Math.sqrt(r * r - (r - h) * (r - h));
}

/**
 * The levels of a compartment box, from its floor to `top`. Each side sets in by the arc of
 * the fillet, the scoop side by the wider arc of the scoop; the two corners of the scoop side
 * widen by the difference, so that the scoop turns into them and meets the vertical corners
 * of the fillet at its top.
 */
function compartmentLevels(layout: BinLayout, verticalRadius: number, top: number, steps: number): CompartmentLevel[] {
  const { floor, fillet, scoop } = layout;
  const heights = new Set<number>([0]);
  for (const r of [fillet, scoop]) for (let k = 1; r > 0 && k <= steps * (r === scoop ? 2 : 1); k++) heights.add((r * k) / (steps * (r === scoop ? 2 : 1)));
  const levels = [...heights].sort((a, b) => a - b).map((h) => {
    const inset = arcInset(fillet, h);
    const scoopInset = scoop > 0 ? arcInset(scoop, h) : inset;
    return { z: floor + h, inset, scoopInset, corner: verticalRadius - inset, scoopCorner: verticalRadius - inset + Math.max(0, scoopInset - inset) };
  });
  levels.push({ z: top, inset: 0, scoopInset: 0, corner: verticalRadius, scoopCorner: verticalRadius });
  return levels;
}

/**
 * Counter-clockwise rectangle with its own radius at each corner, always the same number of
 * points (for a loft): corners front left, front right, back right, back left.
 */
function cornerRect([x0, x1, y0, y1]: Bounds, radii: readonly [number, number, number, number], segments: number): [number, number][] {
  // Never more than half the shorter side: a narrow compartment gets round ends.
  const most = Math.min(x1 - x0, y1 - y0) / 2 - 1e-3;
  const r = radii.map((radius) => Math.min(Math.max(radius, MIN_RADIUS_MM), most)) as [number, number, number, number];
  const arcs: [cx: number, cy: number, radius: number, start: number][] = [
    [x1 - r[1], y0 + r[1], r[1], -Math.PI / 2],
    [x1 - r[2], y1 - r[2], r[2], 0],
    [x0 + r[3], y1 - r[3], r[3], Math.PI / 2],
    [x0 + r[0], y0 + r[0], r[0], Math.PI],
  ];
  const points: [number, number][] = [];
  for (const [cx, cy, radius, start] of arcs) {
    for (let k = 0; k <= segments; k++) {
      const angle = start + (k / segments) * (Math.PI / 2);
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return points;
}

/** The box of a compartment through its levels, its scoop on `scoopSide` (null without one). */
function compartmentBox(wasm: ManifoldToplevel, own: Own, [x0, x1, y0, y1]: Bounds, levels: readonly CompartmentLevel[], scoopSide: BinSide | null, segments: number): Manifold {
  const layers = levels.map(({ z, inset, scoopInset, corner, scoopCorner }) => {
    const set = (side: BinSide) => (side === scoopSide ? scoopInset : inset);
    const bounds: Bounds = [x0 + set("left"), x1 - set("right"), y0 + set("front"), y1 - set("back")];
    const near = (a: BinSide, b: BinSide) => (scoopSide === a || scoopSide === b ? scoopCorner : corner);
    const radii = [near("front", "left"), near("front", "right"), near("back", "right"), near("back", "left")] as const;
    return { z, points: cornerRect(bounds, radii, segments) };
  });
  return solidOfMesh(wasm, own, loft(layers));
}

/**
 * The label tab of a compartment against `side`: a shelf of `depth`, its top at `top`, a rim
 * on its front edge, a 45° fillet under its root, and a console at 45° reaching `reach` under
 * it in the middle of each cell along its wall (`cells`, positions along that wall). Drawn for the back wall, then turned
 * to its side; a millimetre goes into the wall, for the shelf to weld to it.
 */
function labelTabOf(wasm: ManifoldToplevel, own: Own, [x0, x1, y0, y1]: Bounds, side: BinSide, depth: number, reach: number, top: number, cells: number[]): Manifold {
  const { shelf, rim, root, console: thickness, consoleClearance } = LABEL_TAB;
  // Along the wall: from `a` to `b`; the wall at v = 0, the compartment towards v < 0.
  const [a, b] = side === "front" || side === "back" ? [x0, x1] : [y0, y1];
  const section = (points: [number, number][]) => own(wasm.CrossSection.ofPolygons([points]));
  const parts: Manifold[] = [
    alongX(wasm, own, section([[1, top - shelf], [1, top], [-depth, top], [-depth, top - shelf]]), a, b),
    alongX(wasm, own, section([[-depth + rim.width, top], [-depth + rim.width, top + rim.height], [-depth, top + rim.height], [-depth, top]]), a, b),
    alongX(wasm, own, section([[1, top - shelf - root], [1, top - shelf + 0.01], [-root, top - shelf + 0.01], [0, top - shelf - root]]), a, b),
  ];
  for (const centre of reach >= 2 ? cells : []) {
    if (centre - thickness / 2 < a + consoleClearance || centre + thickness / 2 > b - consoleClearance) continue;
    parts.push(alongX(wasm, own, section([[1, top - shelf - reach], [1, top - shelf + 0.01], [-reach, top - shelf + 0.01], [0, top - shelf - reach]]), centre - thickness / 2, centre + thickness / 2));
  }
  const tab = own(wasm.Manifold.union(parts));
  // Turned to its side: x along the wall stays x for the back, mirrored for the front; for the
  // sides, the wall runs along y.
  switch (side) {
    case "back":
      return own(tab.translate([0, y1, 0]));
    case "front":
      return own(own(tab.mirror([0, 1, 0])).translate([0, y0, 0]));
    case "left":
      // (x, y) → (−y, x): along the wall to +y, the compartment towards +x.
      return own(own(tab.rotate([0, 0, 90])).translate([x0, 0, 0]));
    case "right":
      // (x, y) → (y, x) mirrored: along the wall to +y, the compartment towards −x.
      return own(own(own(tab.rotate([0, 0, 90])).mirror([1, 0, 0])).translate([x1, 0, 0]));
  }
}

/** Area of a rounded rectangle. */
function roundedRectArea(width: number, depth: number, radius: number): number {
  return width * depth - (4 - Math.PI) * radius * radius;
}

function dimensionsOf({ positions }: TriangleMesh): BinStats["dimensions"] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis] as number;
      if (value < (min[axis] as number)) min[axis] = value;
      if (value > (max[axis] as number)) max[axis] = value;
    }
  }
  const extent = (axis: number) => (max[axis] as number) - (min[axis] as number);
  return { width: extent(0), depth: extent(1), height: extent(2) };
}
