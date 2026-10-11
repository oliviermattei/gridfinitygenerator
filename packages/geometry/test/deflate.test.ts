import { deflateRawSync, inflateRawSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { deflate, inflate } from "../src";

// Deflate with its own search for repeats, and its inverse (#44, the basket link): both
// checked against zlib, the reference implementation.

const text = (value: string) => new TextEncoder().encode(value);

/** Text that repeats itself, like the links of a basket. */
const LINKS = Array.from({ length: 20 }, (_, i) => `bin ${1 + (i % 3)} v=1&x=${2 + (i % 4)}&y=${1 + (i % 2)}&h=6&lip=reduced`).join("\n");

/** Bytes nothing repeats in (a fixed pseudo-random sequence). */
function noise(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let seed = 12_345;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1_103_515_245 + 12_345) >>> 0;
    bytes[i] = seed >>> 24;
  }
  return bytes;
}

describe("deflate", () => {
  test.each([
    ["empty", new Uint8Array()],
    ["one byte", text("a")],
    ["repeating links", text(LINKS)],
    ["a long run", text("a".repeat(5_000))],
    ["noise", noise(70_000)],
  ])("zlib inflates %s back to the same bytes", (_, bytes) => {
    expect(new Uint8Array(inflateRawSync(deflate(bytes)))).toEqual(bytes);
  });

  test("finds the repeats: repeating text shrinks to a fraction of its size", () => {
    const bytes = text(LINKS);
    // Literals alone (Huffman codes, no repeats) only save about a third.
    expect(deflate(bytes).length).toBeLessThan(bytes.length / 4);
  });
});

describe("inflate", () => {
  test.each([
    ["empty", new Uint8Array()],
    ["repeating links", text(LINKS)],
    ["a long run", text("a".repeat(5_000))],
    ["noise", noise(70_000)],
  ])("reads %s as zlib deflates it, in every block kind", (_, bytes) => {
    for (const options of [{}, { level: 0 }, { strategy: 4 /* Z_FIXED */ }]) {
      expect(inflate(deflateRawSync(bytes, options), 1 << 20)).toEqual(bytes);
    }
  });

  test("reads back what deflate writes", () => {
    const bytes = text(LINKS);
    expect(inflate(deflate(bytes), 1 << 20)).toEqual(bytes);
  });

  test("refuses truncated data", () => {
    const data = deflateRawSync(text(LINKS));
    expect(() => inflate(data.subarray(0, data.length - 3), 1 << 20)).toThrow();
    expect(() => inflate(new Uint8Array(), 1 << 20)).toThrow();
  });

  test("refuses corrupted data", () => {
    // Block type 3 does not exist.
    expect(() => inflate(Uint8Array.of(0b111), 1 << 20)).toThrow();
    // Every byte of real data flipped.
    const data = deflateRawSync(text(LINKS));
    const corrupted = Uint8Array.from(data);
    for (let i = 0; i < corrupted.length; i++) corrupted[i] = (corrupted[i] as number) ^ 0x5a;
    expect(() => inflate(corrupted, 1 << 20)).toThrow();
  });

  test("refuses data that would inflate past its bound", () => {
    const bomb = deflateRawSync(new Uint8Array(1 << 20));
    expect(bomb.length).toBeLessThan(2_000);
    expect(() => inflate(bomb, 10_000)).toThrow();
  });
});
