import zlib from "node:zlib";

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Fallback CRC32 calculation table if zlib.crc32 is not available
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCrc(buf: Buffer): number {
  const zlibWithCrc = zlib as unknown as { crc32?: (b: Buffer) => number };
  if (typeof zlibWithCrc.crc32 === "function") {
    return zlibWithCrc.crc32(buf);
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Inverts the RGB colors of a PNG buffer while preserving alpha.
 */
export function invertPngColors(pngBuffer: Buffer): Buffer {
  // Check PNG signature
  if (
    pngBuffer[0] !== 0x89 ||
    pngBuffer[1] !== 0x50 ||
    pngBuffer[2] !== 0x4e ||
    pngBuffer[3] !== 0x47
  ) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6; // 2 = RGB, 6 = RGBA, 0 = Grayscale, 4 = Grayscale+A
  const idatParts: Buffer[] = [];
  const otherChunksBeforeIdat: { type: string; data: Buffer }[] = [];
  const otherChunksAfterIdat: { type: string; data: Buffer }[] = [];
  let pastIdat = false;

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString("ascii", offset + 4, offset + 8);
    const data = pngBuffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatParts.push(data);
      pastIdat = true;
    } else if (type === "IEND") {
      break;
    } else {
      if (!pastIdat) {
        otherChunksBeforeIdat.push({ type, data });
      } else {
        otherChunksAfterIdat.push({ type, data });
      }
    }
  }

  if (bitDepth !== 8) {
    // If not standard 8-bit depth, return original
    return pngBuffer;
  }

  let bpp = 4;
  if (colorType === 2) bpp = 3; // RGB
  else if (colorType === 6) bpp = 4; // RGBA
  else if (colorType === 0) bpp = 1; // Grayscale
  else if (colorType === 4) bpp = 2; // Grayscale + Alpha
  else {
    return pngBuffer; // Palette not supported directly
  }

  const compressedData = Buffer.concat(idatParts);
  const decompressed = zlib.inflateSync(compressedData);

  const stride = width * bpp;
  const uncompressedRowBytes = 1 + stride;
  const newDecompressed = Buffer.alloc(height * uncompressedRowBytes);

  let prevReconRow = Buffer.alloc(stride);
  let srcOffset = 0;
  let dstOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcOffset++];
    const currentReconRow = Buffer.alloc(stride);

    for (let x = 0; x < stride; x++) {
      const rawVal = decompressed[srcOffset++];
      const a = x >= bpp ? currentReconRow[x - bpp] : 0;
      const b = prevReconRow[x];
      const c = x >= bpp ? prevReconRow[x - bpp] : 0;

      let val = 0;
      if (filterType === 0) {
        val = rawVal;
      } else if (filterType === 1) {
        val = (rawVal + a) & 0xff;
      } else if (filterType === 2) {
        val = (rawVal + b) & 0xff;
      } else if (filterType === 3) {
        val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) {
        val = (rawVal + paethPredictor(a, b, c)) & 0xff;
      } else {
        val = rawVal;
      }
      currentReconRow[x] = val;
    }

    // Now invert colors on currentReconRow
    if (colorType === 6) {
      // RGBA: invert R, G, B, keep A
      for (let p = 0; p < stride; p += 4) {
        currentReconRow[p] = 255 - currentReconRow[p];
        currentReconRow[p + 1] = 255 - currentReconRow[p + 1];
        currentReconRow[p + 2] = 255 - currentReconRow[p + 2];
        // p + 3 is alpha, preserve it
      }
    } else if (colorType === 2) {
      // RGB
      for (let p = 0; p < stride; p += 3) {
        currentReconRow[p] = 255 - currentReconRow[p];
        currentReconRow[p + 1] = 255 - currentReconRow[p + 1];
        currentReconRow[p + 2] = 255 - currentReconRow[p + 2];
      }
    } else if (colorType === 0) {
      // Grayscale
      for (let p = 0; p < stride; p++) {
        currentReconRow[p] = 255 - currentReconRow[p];
      }
    } else if (colorType === 4) {
      // Grayscale + Alpha
      for (let p = 0; p < stride; p += 2) {
        currentReconRow[p] = 255 - currentReconRow[p];
      }
    }

    // Write back with filterType 0 (None) for simplicity and speed
    newDecompressed[dstOffset++] = 0;
    currentReconRow.copy(newDecompressed, dstOffset);
    dstOffset += stride;

    prevReconRow = currentReconRow;
  }

  // Compress newly inverted data
  const newIdatData = zlib.deflateSync(newDecompressed, { level: 9 });

  // Rebuild PNG
  const chunks: Buffer[] = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];

  // Helper to construct a chunk
  function makeChunk(type: string, data: Buffer): Buffer {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, "ascii");
    data.copy(chunk, 8);
    const crc = calculateCrc(chunk.subarray(4, 8 + data.length));
    chunk.writeUInt32BE(crc, 8 + data.length);
    return chunk;
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = bitDepth;
  ihdrData[9] = colorType;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  chunks.push(makeChunk("IHDR", ihdrData));

  // Other chunks before IDAT
  for (const c of otherChunksBeforeIdat) {
    chunks.push(makeChunk(c.type, c.data));
  }

  // IDAT
  chunks.push(makeChunk("IDAT", newIdatData));

  // Other chunks after IDAT
  for (const c of otherChunksAfterIdat) {
    chunks.push(makeChunk(c.type, c.data));
  }

  // IEND
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

