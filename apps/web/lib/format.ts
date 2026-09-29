import { LENGTH_DECIMALS, fromMillimetres, type Unit } from "./units";

/** Number formats of one language: decimal comma in French, point in English. */
export interface Formats {
  /** Lengths in millimetres, to the tenth ("168", "40,5"). */
  lengths: Intl.NumberFormat;
  /** Small values in millimetres, to the hundredth ("4,6", "0,28"). */
  fine: Intl.NumberFormat;
  /** Volumes in cm³, always to the tenth ("81,3"). */
  volumes: Intl.NumberFormat;
  /** Nozzle diameters, with at least one decimal ("0,4"). */
  nozzles: Intl.NumberFormat;
  /** "168 × 126 mm". */
  footprint: (size: { width: number; depth: number }) => string;
  /** A length of the drawer or the margins, in millimetres, in the unit chosen ("10,5", "0,41"). */
  length: (mm: number, unit: Unit) => string;
}

const cache = new Map<string, Formats>();

/** The number formats of an Intl locale ("fr-FR", "en-US"), made once. */
export function formatsFor(locale: string): Formats {
  let formats = cache.get(locale);
  if (formats) return formats;
  const lengths = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const fine = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const inUnit = {
    mm: new Intl.NumberFormat(locale, { maximumFractionDigits: LENGTH_DECIMALS.mm }),
    in: new Intl.NumberFormat(locale, { maximumFractionDigits: LENGTH_DECIMALS.in }),
  };
  formats = {
    lengths,
    fine,
    volumes: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    nozzles: new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }),
    footprint: ({ width, depth }) => `${lengths.format(width)} × ${lengths.format(depth)} mm`,
    length: (mm, unit) => inUnit[unit].format(fromMillimetres(mm, unit)),
  };
  cache.set(locale, formats);
  return formats;
}
