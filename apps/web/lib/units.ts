/**
 * Units of the lengths typed and read in the interface (a local preference, ADR 0007). Only
 * the drawer and the margins follow it; every other length stays in millimetres, and so do
 * the settings, the share link and the engine.
 *
 * Inches are shown to the hundredth (0.01 in = 0.254 mm). A length typed in inches is
 * stored in millimetres to the tenth, ties to even: 15.75 in = 400.05 mm gives 400 mm. The
 * tenth of a millimetre is finer than the hundredth of an inch, so any length typed to the
 * hundredth of an inch reads back unchanged.
 */
export const UNITS = ["mm", "in"] as const;

export type Unit = (typeof UNITS)[number];

export function isUnit(value: unknown): value is Unit {
  return UNITS.includes(value as Unit);
}

/** Hundredths of a millimetre in an inch, exactly (25.4 mm). */
const HUNDREDTHS_OF_MM_PER_INCH = 2540;

/** Decimals shown for a length in each unit. */
export const LENGTH_DECIMALS: Record<Unit, number> = { mm: 2, in: 2 };

/** Step of the −/+ buttons and the arrow keys for a length (drawer, margins). */
export const LENGTH_STEP: Record<Unit, number> = { mm: 1, in: 0.1 };

/** A length in millimetres, in the unit: to the hundredth of an inch. */
export function fromMillimetres(mm: number, unit: Unit): number {
  if (unit === "mm") return mm;
  return Math.round((mm * 10_000) / HUNDREDTHS_OF_MM_PER_INCH) / 100;
}

/** Integer division rounded to the nearest, ties to even. */
function divideToEven(dividend: number, divisor: number): number {
  const quotient = Math.floor(dividend / divisor);
  const rest = dividend - quotient * divisor;
  if (2 * rest > divisor || (2 * rest === divisor && quotient % 2 !== 0)) return quotient + 1;
  return quotient;
}

/**
 * A length typed in the unit, in millimetres: to the hundredth in millimetres, to the tenth
 * (ties to even) from inches.
 */
export function toMillimetres(value: number, unit: Unit): number {
  if (unit === "mm") return Math.round(value * 100) / 100;
  // In whole hundredths of an inch, then whole tenths of a millimetre, without float noise.
  const hundredthsOfInch = Math.round(value * 100);
  return divideToEven(hundredthsOfInch * HUNDREDTHS_OF_MM_PER_INCH, 1000) / 10;
}
