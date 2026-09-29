import { strings as t } from "./strings";

/** Lengths in millimetres, to the tenth ("168", "40,5"). */
export const lengths = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 });
/** Small values in millimetres, to the hundredth ("4,6", "0,28"). */
export const fine = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2 });

/** "168 × 126 mm". */
export function footprint({ width, depth }: { width: number; depth: number }): string {
  return `${lengths.format(width)} × ${lengths.format(depth)} mm`;
}
