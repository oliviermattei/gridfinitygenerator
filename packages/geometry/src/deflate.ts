/**
 * Deflate encoder (RFC 1951) driven by its caller: the caller says which bytes are
 * literals and which repeat earlier bytes (a copy at a known distance), so no time goes
 * into searching for matches. The 3MF model writer knows where its XML repeats itself
 * (the constant parts of each element, a vertex index written shortly before), which
 * makes this several times faster than a general-purpose deflate on tens of megabytes.
 * Blocks use dynamic Huffman codes. The CRC-32 and size of the uncompressed data, which
 * a zip entry needs, are computed on the way.
 */

/** Longest distance a copy may reach back, in bytes (the deflate window). */
export const WINDOW_BYTES = 32_768;
/** Shortest and longest copies deflate can encode. */
export const MIN_COPY = 3;
export const MAX_COPY = 258;

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
/** Order in which the code lengths of the code-length alphabet are sent. */
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

const END_OF_BLOCK = 256;
const LITERAL_LENGTH_SYMBOLS = 286;
const DISTANCE_SYMBOLS = 30;
/** Items (literals or copies) per block: large enough for small headers, small enough to adapt. */
const BLOCK_ITEMS = 1 << 17;

/** Length code index (0..28) of each copy length. */
const LENGTH_CODE = new Uint8Array(MAX_COPY + 1);
for (let code = 0; code < LENGTH_BASE.length; code++) {
  const base = LENGTH_BASE[code] as number;
  for (let length = base; length < base + (1 << (LENGTH_EXTRA[code] as number)) && length <= MAX_COPY; length++) {
    LENGTH_CODE[length] = code;
  }
}
LENGTH_CODE[MAX_COPY] = 28;
/** Distance code (0..29) of each distance. */
const DISTANCE_CODE = new Uint8Array(WINDOW_BYTES + 1);
for (let code = 0; code < DISTANCE_BASE.length; code++) {
  const base = DISTANCE_BASE[code] as number;
  for (let distance = base; distance < base + (1 << (DISTANCE_EXTRA[code] as number)); distance++) {
    DISTANCE_CODE[distance] = code;
  }
}

/** Adds `delta` to an entry of a table of counts. */
function add(counts: number[] | Uint16Array | Uint32Array, index: number, delta: number) {
  counts[index] = (counts[index] as number) + delta;
}

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

/**
 * Code lengths of a length-limited Huffman code for these frequencies (0 for an unused
 * symbol). At least two symbols get a code, so that every code is complete.
 */
function huffmanLengths(frequencies: Uint32Array, limit: number): Uint8Array {
  const lengths = new Uint8Array(frequencies.length);
  const used: number[] = [];
  for (let symbol = 0; symbol < frequencies.length; symbol++) if (frequencies[symbol]) used.push(symbol);
  for (let symbol = 0; used.length < 2; symbol++) if (!frequencies[symbol]) used.push(symbol);
  used.sort((a, b) => (frequencies[a] as number) - (frequencies[b] as number) || a - b);

  // Huffman tree by the two-queue method over the sorted leaves: nodes 0..n-1 are the
  // leaves, n.. the internal nodes, created in order of increasing weight.
  const n = used.length;
  const weight: number[] = used.map((symbol) => Math.max(1, frequencies[symbol] as number));
  const parent = new Int32Array(2 * n - 1);
  let leaf = 0;
  let internal = n;
  const lightest = () => (leaf < n && (internal >= weight.length || (weight[leaf] as number) <= (weight[internal] as number)) ? leaf++ : internal++);
  while (weight.length < 2 * n - 1) {
    const a = lightest();
    const b = lightest();
    parent[a] = parent[b] = weight.length;
    weight.push((weight[a] as number) + (weight[b] as number));
  }
  const depth = new Int32Array(2 * n - 1);
  for (let node = 2 * n - 3; node >= 0; node--) depth[node] = (depth[parent[node] as number] as number) + 1;

  // Count codes per length, fold the ones longer than the limit into it, then lengthen
  // shorter codes until the lengths satisfy Kraft's equality again (as miniz does).
  const count = new Array<number>(Math.max(limit, 2 * n) + 1).fill(0);
  for (let node = 0; node < n; node++) add(count, Math.min(depth[node] as number, limit), 1);
  let kraft = 0;
  for (let length = 1; length <= limit; length++) kraft += (count[length] as number) << (limit - length);
  while (kraft > 1 << limit) {
    add(count, limit, -1);
    for (let length = limit - 1; length > 0; length--) {
      if (count[length]) {
        add(count, length, -1);
        add(count, length + 1, 2);
        break;
      }
    }
    kraft--;
  }
  // The rarest symbols take the longest codes.
  let symbolAt = 0;
  for (let length = limit; length > 0; length--) {
    for (let k = 0; k < (count[length] as number); k++) lengths[used[symbolAt++] as number] = length;
  }
  return lengths;
}

/** Canonical codes of these lengths, bit-reversed as deflate sends them (LSB first). */
function canonicalCodes(lengths: Uint8Array): Uint16Array {
  const lengthCount = new Uint16Array(16);
  for (const length of lengths) add(lengthCount, length, 1);
  lengthCount[0] = 0;
  const next = new Uint16Array(16);
  for (let length = 1, code = 0; length < 16; length++) {
    code = (code + (lengthCount[length - 1] as number)) << 1;
    next[length] = code;
  }
  const codes = new Uint16Array(lengths.length);
  lengths.forEach((length, symbol) => {
    if (!length) return;
    let code = next[length] as number;
    next[length] = code + 1;
    let reversed = 0;
    for (let bit = 0; bit < length; bit++) {
      reversed = (reversed << 1) | (code & 1);
      code >>= 1;
    }
    codes[symbol] = reversed;
  });
  return codes;
}

/**
 * Most bytes one item can take once encoded: a 15-bit length code with 5 extra bits and a
 * 15-bit distance code with 13 extra bits.
 */
const MAX_ITEM_BYTES = 7;
/** Most bytes a block header and its end code can take (316 code lengths, 7 bits each at most). */
const MAX_HEADER_BYTES = 512;

/**
 * The encoder. Its hot state (CRC, pending bits) lives in typed arrays and in local
 * variables rather than in number fields, whose representation V8 may change, and then
 * deoptimise, midway through tens of millions of bytes.
 */
export class DeflateEncoder {
  /** Uncompressed bytes so far: the position of the next byte. */
  position = 0;

  /** CRC-32 of the uncompressed bytes so far, before its final inversion. */
  private readonly crc = new Int32Array([-1]);
  private out = new Uint8Array(1 << 12);
  private outAt = 0;
  /** Bits not written yet (fewer than 8), and their count. */
  private readonly pending = new Int32Array(2);
  /** Pending items: a literal byte (distance 0), or a copy length (distance > 0). */
  private readonly values = new Uint16Array(BLOCK_ITEMS);
  private readonly distances = new Uint16Array(BLOCK_ITEMS);
  private items = 0;

  /** One literal byte. */
  literal(byte: number) {
    const crc = this.crc[0] as number;
    this.crc[0] = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
    const item = this.items;
    this.values[item] = byte;
    this.distances[item] = 0;
    this.position++;
    this.items = item + 1;
    if (item + 1 === BLOCK_ITEMS) this.writeBlock(false);
  }

  /** ASCII text as literals. */
  text(text: string) {
    for (let i = 0; i < text.length; i++) this.literal(text.charCodeAt(i));
  }

  /** Bytes as literals, from `start` to `end` (the whole array by default). */
  bytes(bytes: Uint8Array, start = 0, end = bytes.length) {
    const { values, distances } = this;
    let crc = this.crc[0] as number;
    let item = this.items;
    for (let i = start; i < end; i++) {
      const byte = bytes[i] as number;
      crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
      values[item] = byte;
      distances[item] = 0;
      if (++item === BLOCK_ITEMS) {
        this.crc[0] = crc;
        this.items = item;
        this.position += i + 1 - start;
        start = i + 1;
        this.writeBlock(false);
        item = 0;
      }
    }
    this.crc[0] = crc;
    this.items = item;
    this.position += end - start;
  }

  /**
   * ASCII text that repeats the bytes `distance` back: the caller guarantees they are the
   * same, `MIN_COPY` ≤ length ≤ `MAX_COPY` and distance ≤ `WINDOW_BYTES`.
   */
  copyText(text: string, distance: number) {
    let crc = this.crc[0] as number;
    for (let i = 0; i < text.length; i++) crc = (CRC_TABLE[(crc ^ text.charCodeAt(i)) & 0xff] as number) ^ (crc >>> 8);
    this.crc[0] = crc;
    this.pushCopy(text.length, distance);
  }

  /** Same as `copyText`, for `length` bytes of `bytes` from `start`. */
  copyBytes(bytes: Uint8Array, start: number, length: number, distance: number) {
    let crc = this.crc[0] as number;
    for (let i = start; i < start + length; i++) crc = (CRC_TABLE[(crc ^ (bytes[i] as number)) & 0xff] as number) ^ (crc >>> 8);
    this.crc[0] = crc;
    this.pushCopy(length, distance);
  }

  /** Ends the stream: the deflated data, and the CRC-32 and size of the uncompressed data. */
  finish(): { data: Uint8Array; crc: number; size: number } {
    this.writeBlock(true);
    if ((this.pending[1] as number) > 0) this.out[this.outAt++] = this.pending[0] as number;
    return { data: this.out.subarray(0, this.outAt), crc: ~(this.crc[0] as number) >>> 0, size: this.position };
  }

  private pushCopy(length: number, distance: number) {
    const item = this.items;
    this.values[item] = length;
    this.distances[item] = distance;
    this.position += length;
    this.items = item + 1;
    if (item + 1 === BLOCK_ITEMS) this.writeBlock(false);
  }

  /** Sends `length` bits of `code`, least significant first (block headers). */
  private send(code: number, length: number) {
    let bits = (this.pending[0] as number) | (code << (this.pending[1] as number));
    let count = (this.pending[1] as number) + length;
    while (count >= 8) {
      this.out[this.outAt++] = bits;
      bits >>>= 8;
      count -= 8;
    }
    this.pending[0] = bits;
    this.pending[1] = count;
  }

  /** Writes the pending items as one block with its own dynamic Huffman codes. */
  private writeBlock(final: boolean) {
    const { values, distances, items } = this;
    const literalFrequencies = new Uint32Array(LITERAL_LENGTH_SYMBOLS);
    const distanceFrequencies = new Uint32Array(DISTANCE_SYMBOLS);
    for (let i = 0; i < items; i++) {
      const distance = distances[i] as number;
      if (distance === 0) {
        const symbol = values[i] as number;
        literalFrequencies[symbol] = (literalFrequencies[symbol] as number) + 1;
      } else {
        const symbol = 257 + (LENGTH_CODE[values[i] as number] as number);
        literalFrequencies[symbol] = (literalFrequencies[symbol] as number) + 1;
        const code = DISTANCE_CODE[distance] as number;
        distanceFrequencies[code] = (distanceFrequencies[code] as number) + 1;
      }
    }
    literalFrequencies[END_OF_BLOCK] = 1;
    const literalLengths = huffmanLengths(literalFrequencies, 15);
    const distanceLengths = huffmanLengths(distanceFrequencies, 15);
    const literalCodes = canonicalCodes(literalLengths);
    const distanceCodes = canonicalCodes(distanceLengths);

    // Code lengths of both alphabets, run-length encoded with symbols 16, 17 and 18.
    let literalCount = LITERAL_LENGTH_SYMBOLS;
    while (literalCount > 257 && !literalLengths[literalCount - 1]) literalCount--;
    let distanceCount = DISTANCE_SYMBOLS;
    while (distanceCount > 1 && !distanceLengths[distanceCount - 1]) distanceCount--;
    const all = [...literalLengths.subarray(0, literalCount), ...distanceLengths.subarray(0, distanceCount)];
    const runs: [symbol: number, extra: number][] = [];
    for (let i = 0; i < all.length; ) {
      const length = all[i] as number;
      let run = 1;
      while (i + run < all.length && all[i + run] === length) run++;
      i += run;
      if (length === 0) {
        while (run >= 11) {
          const take = Math.min(run, 138);
          runs.push([18, take - 11]);
          run -= take;
        }
        if (run >= 3) {
          runs.push([17, run - 3]);
          run = 0;
        }
      } else {
        runs.push([length, 0]);
        run--;
        while (run >= 3) {
          const take = Math.min(run, 6);
          runs.push([16, take - 3]);
          run -= take;
        }
      }
      for (; run > 0; run--) runs.push([length, 0]);
    }
    const codeLengthFrequencies = new Uint32Array(19);
    for (const [symbol] of runs) add(codeLengthFrequencies, symbol, 1);
    const codeLengthLengths = huffmanLengths(codeLengthFrequencies, 7);
    const codeLengthCodes = canonicalCodes(codeLengthLengths);
    let codeLengthCount = 19;
    while (codeLengthCount > 4 && !codeLengthLengths[CODE_LENGTH_ORDER[codeLengthCount - 1] as number]) codeLengthCount--;

    // Room for the whole block, so that its bytes are written without bound checks.
    const needed = this.outAt + MAX_HEADER_BYTES + items * MAX_ITEM_BYTES;
    if (needed > this.out.length) {
      const grown = new Uint8Array(Math.max(needed, this.out.length * 2));
      grown.set(this.out.subarray(0, this.outAt));
      this.out = grown;
    }

    this.send(final ? 1 : 0, 1);
    this.send(2, 2); // dynamic Huffman codes
    this.send(literalCount - 257, 5);
    this.send(distanceCount - 1, 5);
    this.send(codeLengthCount - 4, 4);
    for (let i = 0; i < codeLengthCount; i++) this.send(codeLengthLengths[CODE_LENGTH_ORDER[i] as number] as number, 3);
    for (const [symbol, extra] of runs) {
      this.send(codeLengthCodes[symbol] as number, codeLengthLengths[symbol] as number);
      if (symbol === 16) this.send(extra, 2);
      else if (symbol === 17) this.send(extra, 3);
      else if (symbol === 18) this.send(extra, 7);
    }

    // The items, with the bit buffer in local variables: this loop runs once per item of
    // the model, tens of millions of times. A code (≤ 15 bits) and its extra bits (≤ 13)
    // are appended to fewer than 8 pending bits, so the buffer never exceeds 31 bits.
    // Per-block tables: each literal's code and length in one number, and each copy
    // length's code followed by its extra bits (at most 15 + 5 bits).
    const literalTable = new Int32Array(256);
    for (let symbol = 0; symbol < 256; symbol++) {
      literalTable[symbol] = (literalCodes[symbol] as number) | ((literalLengths[symbol] as number) << 16);
    }
    const copyCodes = new Int32Array(MAX_COPY + 1);
    const copyBits = new Uint8Array(MAX_COPY + 1);
    for (let length = MIN_COPY; length <= MAX_COPY; length++) {
      const lengthCode = LENGTH_CODE[length] as number;
      const codeLength = literalLengths[257 + lengthCode] as number;
      copyCodes[length] = (literalCodes[257 + lengthCode] as number) | ((length - (LENGTH_BASE[lengthCode] as number)) << codeLength);
      copyBits[length] = codeLength + (LENGTH_EXTRA[lengthCode] as number);
    }

    const out = this.out;
    let at = this.outAt;
    let bits = this.pending[0] as number;
    let count = this.pending[1] as number;
    for (let i = 0; i < items; i++) {
      const value = values[i] as number;
      const distance = distances[i] as number;
      if (distance === 0) {
        const entry = literalTable[value] as number;
        bits |= (entry & 0xffff) << count;
        count += entry >>> 16;
      } else {
        bits |= (copyCodes[value] as number) << count;
        count += copyBits[value] as number;
        while (count >= 8) {
          out[at++] = bits;
          bits >>>= 8;
          count -= 8;
        }
        const distanceCode = DISTANCE_CODE[distance] as number;
        bits |= (distanceCodes[distanceCode] as number) << count;
        count += distanceLengths[distanceCode] as number;
        while (count >= 8) {
          out[at++] = bits;
          bits >>>= 8;
          count -= 8;
        }
        bits |= (distance - (DISTANCE_BASE[distanceCode] as number)) << count;
        count += DISTANCE_EXTRA[distanceCode] as number;
      }
      while (count >= 8) {
        out[at++] = bits;
        bits >>>= 8;
        count -= 8;
      }
    }
    this.outAt = at;
    this.pending[0] = bits;
    this.pending[1] = count;

    this.send(literalCodes[END_OF_BLOCK] as number, literalLengths[END_OF_BLOCK] as number);
    this.items = 0;
  }
}
