import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

// --- Types ---

export interface ZipEntry {
  readonly relativePath: string;
  readonly data: Buffer;
}

// --- Exported functions ---

/**
 * Recursively collects all files under `dirPath` and returns
 * them as ZipEntry objects with paths relative to `dirPath`.
 * Paths always use forward slashes.
 */
export function collectFiles(dirPath: string): ZipEntry[] {
  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    throw new Error(
      `Directory does not exist: ${dirPath}. Run \`pnpm build\` first.`,
    );
  }

  const entries: ZipEntry[] = [];
  collectRecursive(dirPath, dirPath, entries);
  return entries;
}

function collectRecursive(basePath: string, currentPath: string, entries: ZipEntry[]): void {
  const items = readdirSync(currentPath);

  for (const item of items) {
    const fullPath = join(currentPath, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectRecursive(basePath, fullPath, entries);
    } else if (stat.isFile()) {
      const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
      entries.push({ relativePath, data: readFileSync(fullPath) });
    }
  }
}

/**
 * Creates a valid ZIP archive buffer from the given entries.
 * Uses DEFLATE compression (method 8) via Node.js zlib.
 * Constructs the ZIP binary format manually:
 *   local file headers → compressed data → central directory → EOCD record.
 */
export function createZipBuffer(entries: readonly ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.relativePath, 'utf8');
    const uncompressedData = entry.data;
    const compressedData = deflateRawSync(uncompressedData);
    const fileCrc = crc32(uncompressedData);

    // --- Local file header ---
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);       // Local file header signature
    localHeader.writeUInt16LE(20, 4);                // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6);                 // General purpose bit flag
    localHeader.writeUInt16LE(8, 8);                 // Compression method: DEFLATE
    localHeader.writeUInt16LE(0, 10);                // Last mod file time
    localHeader.writeUInt16LE(0, 12);                // Last mod file date
    localHeader.writeUInt32LE(fileCrc, 14);          // CRC-32
    localHeader.writeUInt32LE(compressedData.length, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedData.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(fileNameBuf.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28);                // Extra field length

    localParts.push(localHeader, fileNameBuf, compressedData);

    // --- Central directory header ---
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);      // Central directory file header signature
    centralHeader.writeUInt16LE(20, 4);              // Version made by (2.0)
    centralHeader.writeUInt16LE(20, 6);              // Version needed to extract (2.0)
    centralHeader.writeUInt16LE(0, 8);               // General purpose bit flag
    centralHeader.writeUInt16LE(8, 10);              // Compression method: DEFLATE
    centralHeader.writeUInt16LE(0, 12);              // Last mod file time
    centralHeader.writeUInt16LE(0, 14);              // Last mod file date
    centralHeader.writeUInt32LE(fileCrc, 16);        // CRC-32
    centralHeader.writeUInt32LE(compressedData.length, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedData.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(fileNameBuf.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30);              // Extra field length
    centralHeader.writeUInt16LE(0, 32);              // File comment length
    centralHeader.writeUInt16LE(0, 34);              // Disk number start
    centralHeader.writeUInt16LE(0, 36);              // Internal file attributes
    centralHeader.writeUInt32LE(0, 38);              // External file attributes
    centralHeader.writeUInt32LE(localOffset, 42);    // Relative offset of local header

    centralParts.push(centralHeader, fileNameBuf);

    // Advance local offset
    localOffset += 30 + fileNameBuf.length + compressedData.length;
  }

  // --- End of Central Directory Record (EOCD) ---
  const centralDirBuffer = Buffer.concat(centralParts);
  const centralDirOffset = localOffset;
  const centralDirSize = centralDirBuffer.length;
  const entryCount = entries.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);                 // EOCD signature
  eocd.writeUInt16LE(0, 4);                          // Number of this disk
  eocd.writeUInt16LE(0, 6);                          // Disk where central directory starts
  eocd.writeUInt16LE(entryCount, 8);                 // Number of central directory records on this disk
  eocd.writeUInt16LE(entryCount, 10);                // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12);            // Size of central directory (bytes)
  eocd.writeUInt32LE(centralDirOffset, 16);          // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                         // Comment length

  return Buffer.concat([...localParts, centralDirBuffer, eocd]);
}

// --- Script entry point ---

const isDirectExecution =
  process.argv[1] && resolve(process.argv[1]).replace(/\\/g, '/').includes('package');

if (isDirectExecution) {
  const ROOT = resolve(import.meta.dirname, '..');
  const ZIP_PATH = resolve(ROOT, 'almedalsstjarnan.zip');
  const DIST_PATH = resolve(ROOT, 'dist');

  // 1. Remove existing zip
  if (existsSync(ZIP_PATH)) {
    unlinkSync(ZIP_PATH);
  }

  // 2. Verify dist/ exists
  if (!existsSync(DIST_PATH)) {
    console.error('Error: dist/ directory does not exist. Run `pnpm build` first.');
    process.exit(1);
  }

  // 3. Create zip from dist/
  const entries = collectFiles(DIST_PATH);
  const zipBuffer = createZipBuffer(entries);
  writeFileSync(ZIP_PATH, zipBuffer);

  console.log(`✓ Created ${ZIP_PATH} (${entries.length} files, ${zipBuffer.length} bytes)`);
}
