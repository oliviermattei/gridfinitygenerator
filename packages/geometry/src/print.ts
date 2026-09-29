import type { Margins } from "./layout";

/**
 * Rules of the print: layers, lines and build plate. Exact computations on the settings and on
 * dimensions measured on the mesh, never estimates.
 */

/** Slack for the floating-point error of a division by a layer height (0.4 / 0.2 = 2.0000000000000004). */
const EPSILON = 1e-9;

/**
 * Rounds a thickness chosen by the generator (screw pads, margin parts) up to a multiple of
 * the layer height, so that it prints as a whole number of layers. The pocket profile
 * follows the Gridfinity standard and is never rounded.
 */
export function roundUpToLayer(thickness: number, layerHeight: number): number {
  const rounded = layerCount(thickness, layerHeight) * layerHeight;
  return Math.round(rounded * 1e6) / 1e6; // 3 × 0.2 is 0.6000000000000001 in floating point
}

/**
 * Rounds a width chosen by the generator (margin walls and crossbars) up to a whole number of
 * lines, and to `minLines` at least, so that the slicer fills it with whole extrusions.
 */
export function roundUpToLine(width: number, lineWidth: number, minLines = 1): number {
  const lines = Math.max(minLines, Math.ceil(width / lineWidth - EPSILON));
  return Math.round(lines * lineWidth * 1e6) / 1e6;
}

/** Number of layers needed to print a height; the last one is partial when it does not divide. */
export function layerCount(height: number, layerHeight: number): number {
  return Math.ceil(height / layerHeight - EPSILON);
}

/**
 * The narrowest margin of the baseplate that is not zero but narrower than two line widths,
 * null when there is none: a strip that thin prints badly (spec v1, non-blocking warning).
 */
export function narrowMargin(margins: Margins, lineWidth: number): number | null {
  const narrow = Object.values(margins).filter((margin) => margin > 0 && margin < 2 * lineWidth - EPSILON);
  return narrow.length === 0 ? null : Math.min(...narrow);
}

/** Usable area of a build plate, in millimetres (a local preference, not a baseplate setting). */
export interface BuildPlate {
  width: number;
  depth: number;
}

/** Slack for the float32 coordinates of a mesh measured against a build plate. */
const FIT_EPSILON_MM = 1e-3;

/**
 * Whether a piece of these dimensions (measured on its mesh) fits on the build plate, as it
 * is or turned a quarter. Its height, a few millimetres, never limits it.
 */
export function fitsOnBuildPlate(dimensions: { width: number; depth: number }, plate: BuildPlate): boolean {
  const fits = (width: number, depth: number) =>
    width <= plate.width + FIT_EPSILON_MM && depth <= plate.depth + FIT_EPSILON_MM;
  return fits(dimensions.width, dimensions.depth) || fits(dimensions.depth, dimensions.width);
}
