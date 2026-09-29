import { DeflateEncoder } from "./deflate";

/**
 * Minimal zip writer for the 3MF package: deflated entries, no zip64 (parts stay far
 * below 4 GB). Each part writes its content into its own deflate encoder.
 */

/** Writes the content of a part into its encoder. */
export type PartWriter = (encoder: DeflateEncoder) => void;

/** Fixed timestamp (2026-01-01 00:00, MS-DOS format): the same content always gives the same bytes. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const DEFLATE = 8;
/** Zip format version needed to extract: 2.0, for deflate. */
const VERSION = 20;

/** A zip archive of the parts, in order, each one deflated. */
export function zipParts(parts: readonly [path: string, write: PartWriter][]): Uint8Array {
  const encoder = new TextEncoder();
  const entries = parts.map(([path, write]) => {
    const deflate = new DeflateEncoder();
    write(deflate);
    return { path: encoder.encode(path), ...deflate.finish() };
  });

  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.path.length + entry.data.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.path.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(bytes.buffer);
  let at = 0;
  const u16 = (value: number) => {
    view.setUint16(at, value, true);
    at += 2;
  };
  const u32 = (value: number) => {
    view.setUint32(at, value, true);
    at += 4;
  };
  const put = (data: Uint8Array) => {
    bytes.set(data, at);
    at += data.length;
  };

  const offsets: number[] = [];
  for (const entry of entries) {
    offsets.push(at);
    u32(0x04034b50); // local file header
    u16(VERSION);
    u16(0); // flags
    u16(DEFLATE);
    u16(DOS_TIME);
    u16(DOS_DATE);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.size);
    u16(entry.path.length);
    u16(0); // extra field length
    put(entry.path);
    put(entry.data);
  }
  const centralOffset = at;
  entries.forEach((entry, index) => {
    u32(0x02014b50); // central directory header
    u16(VERSION); // version made by
    u16(VERSION);
    u16(0); // flags
    u16(DEFLATE);
    u16(DOS_TIME);
    u16(DOS_DATE);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.size);
    u16(entry.path.length);
    u16(0); // extra field length
    u16(0); // comment length
    u16(0); // disk number
    u16(0); // internal attributes
    u32(0); // external attributes
    u32(offsets[index] as number);
    put(entry.path);
  });
  u32(0x06054b50); // end of central directory
  u16(0); // this disk
  u16(0); // disk of the central directory
  u16(entries.length);
  u16(entries.length);
  u32(centralSize);
  u32(centralOffset);
  u16(0); // comment length
  return bytes;
}
