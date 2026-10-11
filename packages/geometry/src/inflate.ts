/**
 * Inflate (RFC 1951): the inverse of `deflate`, for raw deflate data (no zlib or gzip
 * header), in all three block kinds. It reads data that may come from anywhere (a link),
 * so it throws on anything malformed and stops at a bound on the inflated size, which a
 * few bytes of deflate can otherwise multiply a thousandfold.
 */

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** A canonical Huffman code, for decoding: how many codes of each length, and the symbols by code. */
interface Code {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function codeOf(lengths: ArrayLike<number>): Code {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) counts[lengths[i] as number] = (counts[lengths[i] as number] as number) + 1;
  counts[0] = 0;
  // An over-subscribed code is malformed (an incomplete one is allowed, as zlib does).
  let left = 1;
  for (let length = 1; length < 16; length++) {
    left = left * 2 - (counts[length] as number);
    if (left < 0) throw new Error("Invalid deflate data: over-subscribed code");
  }
  const offsets = new Uint16Array(16);
  for (let length = 1; length < 15; length++) offsets[length + 1] = (offsets[length] as number) + (counts[length] as number);
  const symbols = new Uint16Array(lengths.length);
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const length = lengths[symbol] as number;
    if (length === 0) continue;
    const offset = offsets[length] as number;
    symbols[offset] = symbol;
    offsets[length] = offset + 1;
  }
  return { counts, symbols };
}

const FIXED_LITERALS = codeOf([...Array<number>(144).fill(8), ...Array<number>(112).fill(9), ...Array<number>(24).fill(7), ...Array<number>(8).fill(8)]);
const FIXED_DISTANCES = codeOf(Array<number>(30).fill(5));

/** Inflates raw deflate `data`; throws when it is malformed, truncated, or inflates past `maxBytes`. */
export function inflate(data: Uint8Array, maxBytes: number): Uint8Array {
  let out = new Uint8Array(Math.min(maxBytes, Math.max(1024, data.length * 4)));
  let size = 0;
  let at = 0; // next byte of data
  let bits = 0;
  let count = 0;

  const need = (n: number) => {
    while (count < n) {
      if (at >= data.length) throw new Error("Invalid deflate data: truncated");
      bits |= (data[at++] as number) << count;
      count += 8;
    }
  };
  const read = (n: number): number => {
    if (n === 0) return 0;
    need(n);
    const value = bits & ((1 << n) - 1);
    bits >>>= n;
    count -= n;
    return value;
  };
  const decode = ({ counts, symbols }: Code): number => {
    // Bit by bit, comparing with the first code of each length (puff.c's method).
    let code = 0;
    let first = 0;
    let index = 0;
    for (let length = 1; length < 16; length++) {
      code |= read(1);
      const n = counts[length] as number;
      if (code - first < n) return symbols[index + code - first] as number;
      index += n;
      first = (first + n) << 1;
      code <<= 1;
    }
    throw new Error("Invalid deflate data: no such code");
  };
  const room = (n: number) => {
    if (size + n > maxBytes) throw new Error("Invalid deflate data: inflates past its bound");
    if (size + n > out.length) {
      const grown = new Uint8Array(Math.min(maxBytes, Math.max(size + n, out.length * 2)));
      grown.set(out.subarray(0, size));
      out = grown;
    }
  };

  let final = 0;
  while (!final) {
    final = read(1);
    const kind = read(2);
    if (kind === 0) {
      // Stored: byte-aligned length, its one's complement, then the bytes.
      bits = 0;
      count = 0;
      if (at + 4 > data.length) throw new Error("Invalid deflate data: truncated");
      const length = (data[at] as number) | ((data[at + 1] as number) << 8);
      const complement = (data[at + 2] as number) | ((data[at + 3] as number) << 8);
      if ((length ^ 0xffff) !== complement) throw new Error("Invalid deflate data: stored length");
      at += 4;
      if (at + length > data.length) throw new Error("Invalid deflate data: truncated");
      room(length);
      out.set(data.subarray(at, at + length), size);
      size += length;
      at += length;
      continue;
    }
    let literals: Code;
    let distances: Code;
    if (kind === 1) {
      literals = FIXED_LITERALS;
      distances = FIXED_DISTANCES;
    } else if (kind === 2) {
      const literalCount = read(5) + 257;
      const distanceCount = read(5) + 1;
      const codeLengthCount = read(4) + 4;
      if (literalCount > 286 || distanceCount > 30) throw new Error("Invalid deflate data: too many codes");
      const codeLengthLengths = new Uint8Array(19);
      for (let i = 0; i < codeLengthCount; i++) codeLengthLengths[CODE_LENGTH_ORDER[i] as number] = read(3);
      const codeLengths = codeOf(codeLengthLengths);
      const lengths = new Uint8Array(literalCount + distanceCount);
      for (let i = 0; i < lengths.length; ) {
        const symbol = decode(codeLengths);
        if (symbol < 16) {
          lengths[i++] = symbol;
          continue;
        }
        let repeat: number;
        let value = 0;
        if (symbol === 16) {
          if (i === 0) throw new Error("Invalid deflate data: repeat with no length");
          value = lengths[i - 1] as number;
          repeat = 3 + read(2);
        } else if (symbol === 17) repeat = 3 + read(3);
        else repeat = 11 + read(7);
        if (i + repeat > lengths.length) throw new Error("Invalid deflate data: too many lengths");
        lengths.fill(value, i, i + repeat);
        i += repeat;
      }
      if (lengths[256] === 0) throw new Error("Invalid deflate data: no end of block");
      literals = codeOf(lengths.subarray(0, literalCount));
      distances = codeOf(lengths.subarray(literalCount));
    } else {
      throw new Error("Invalid deflate data: block kind 3");
    }

    for (;;) {
      const symbol = decode(literals);
      if (symbol < 256) {
        room(1);
        out[size++] = symbol;
        continue;
      }
      if (symbol === 256) break;
      const lengthCode = symbol - 257;
      if (lengthCode >= 29) throw new Error("Invalid deflate data: length code");
      const length = (LENGTH_BASE[lengthCode] as number) + read(LENGTH_EXTRA[lengthCode] as number);
      const distanceCode = decode(distances);
      if (distanceCode >= 30) throw new Error("Invalid deflate data: distance code");
      const distance = (DISTANCE_BASE[distanceCode] as number) + read(DISTANCE_EXTRA[distanceCode] as number);
      if (distance > size) throw new Error("Invalid deflate data: copy before the start");
      room(length);
      for (let i = 0; i < length; i++, size++) out[size] = out[size - distance] as number;
    }
  }
  return out.slice(0, size);
}
