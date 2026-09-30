import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILAMENT,
  FILAMENTS,
  FILAMENT_DENSITIES,
  densityOf,
  gramsOf,
  gramsText,
  massOf,
  materialLess,
  parseFilament,
  roundGrams,
  type FilamentPreference,
} from "../lib/mass";

const PLA: FilamentPreference = DEFAULT_FILAMENT;

describe("mass of the filament (#31)", () => {
  it("takes the manufacturers' densities, PLA by default, without a price", () => {
    expect(FILAMENTS).toEqual(["pla", "petg", "abs", "asa", "tpu", "other"]);
    expect(FILAMENT_DENSITIES).toEqual({ pla: 1.24, petg: 1.27, abs: 1.04, asa: 1.07, tpu: 1.21 });
    expect(DEFAULT_FILAMENT).toEqual({ filament: "pla", density: 1.24, price: null });
  });

  it("converts a volume in mm³ into grams: cm³ times g/cm³", () => {
    expect(gramsOf(79_200, 1.24)).toBeCloseTo(98.208, 9);
    expect(gramsOf(1000, 1.27)).toBeCloseTo(1.27, 12);
    expect(gramsOf(0, 1.24)).toBe(0);
  });

  it("counts the clips in the total, and apart", () => {
    const mass = massOf({ volume: 79_200, clips: 146 }, PLA);
    expect(mass.total).toBeCloseTo((79.2 + 0.146) * 1.24, 9);
    expect(mass.clips).toBeCloseTo(0.146 * 1.24, 9);
  });

  it("follows the filament, and the density typed for another", () => {
    const material = { volume: 100_000, clips: 0 };
    expect(massOf(material, { ...PLA, filament: "petg" }).total).toBeCloseTo(127, 9);
    expect(massOf(material, { ...PLA, filament: "abs" }).total).toBeCloseTo(104, 9);
    // The typed density only counts for "other".
    expect(densityOf({ filament: "tpu", density: 2, price: null })).toBe(1.21);
    expect(densityOf({ filament: "other", density: 2, price: null })).toBe(2);
    expect(massOf(material, { filament: "other", density: 1.5, price: null }).total).toBeCloseTo(150, 9);
  });

  it("gives no cost without a price, and the cost of the total with one, in € per kg", () => {
    expect(massOf({ volume: 79_200, clips: 146 }, PLA).cost).toBeNull();
    const cost = massOf({ volume: 79_200, clips: 146 }, { ...PLA, price: 20 }).cost;
    expect(cost).toBeCloseTo(((79.346 * 1.24) / 1000) * 20, 9); // 1,97 €
    expect(massOf({ volume: 1000, clips: 0 }, { ...PLA, price: 0 }).cost).toBe(0);
  });

  it("rounds to the gram, a mass that rounds to nothing being below a gram", () => {
    expect(roundGrams(98.208)).toBe(98);
    expect(roundGrams(98.5)).toBe(99);
    expect(roundGrams(0.18)).toBe("<1");
    expect(roundGrams(0)).toBe(0);
    // Without its sign: a saving is written by the caller.
    expect(roundGrams(-5.2)).toBe(5);
    expect(roundGrams(-0.2)).toBe("<1");
    const grams = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
    expect(gramsText(1204.4, grams, "< 1")).toBe("1\u202f204");
    expect(gramsText(0.18, grams, "< 1")).toBe("< 1");
  });

  it("measures the surplus of a margin as the difference of two materials", () => {
    expect(materialLess({ volume: 79_200, clips: 146 }, { volume: 74_900, clips: 146 })).toEqual({ volume: 4300, clips: 0 });
  });
});

describe("filament preference stored", () => {
  it("keeps what is valid, brings numbers into their ranges, and takes the defaults for the rest", () => {
    expect(parseFilament(undefined)).toEqual(DEFAULT_FILAMENT);
    expect(parseFilament("pla")).toEqual(DEFAULT_FILAMENT);
    expect(parseFilament({ filament: "petg", density: 1.3, price: 24.5 })).toEqual({ filament: "petg", density: 1.3, price: 24.5 });
    expect(parseFilament({ filament: "nylon", density: "1.1", price: "20" })).toEqual(DEFAULT_FILAMENT);
    expect(parseFilament({ filament: "other", density: 99, price: -3 })).toEqual({ filament: "other", density: 5, price: 0 });
    expect(parseFilament({ filament: "other", density: 0.1, price: null })).toEqual({ filament: "other", density: 0.5, price: null });
    expect(parseFilament({ density: Number.NaN, price: Number.POSITIVE_INFINITY })).toEqual(DEFAULT_FILAMENT);
  });
});
