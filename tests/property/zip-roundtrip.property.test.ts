// Feature: publish-readiness-fixes, Property 1: Zip round-trip preserves file paths

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { collectFiles, createZipBuffer } from '../../scripts/package';

// --- Zip entry reader (reused from verify-package.ts, which doesn't export it) ---

function readZipEntries(buffer: Buffer): readonly string[] {
  const entries: string[] = [];

  // Find End of Central Directory record (EOCD)
  // EOCD signature: 0x06054b50
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid zip file: End of Central Directory record not found');
  }

  // Read central directory offset and entry count from EOCD
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdEntryCount = buffer.readUInt16LE(eocdOffset + 8);

  // Parse central directory entries
  // Central directory file header signature: 0x02014b50
  let offset = cdOffset;
  for (let i = 0; i < cdEntryCount; i++) {
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4b ||
      buffer[offset + 2] !== 0x01 ||
      buffer[offset + 3] !== 0x02
    ) {
      throw new Error(`Invalid central directory entry at offset ${offset}`);
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    // Skip directory entries (trailing slash)
    if (!fileName.endsWith('/')) {
      entries.push(fileName);
    }

    offset += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
}

// --- Custom Arbitraries ---

/** Safe filename segment: alphanumeric characters only, 1-8 chars. */
const safeSegmentArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 8,
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
});

/** File extension from a safe set. */
const safeExtensionArb: fc.Arbitrary<string> = fc.constantFrom(
  '.js',
  '.ts',
  '.html',
  '.css',
  '.json',
  '.txt',
);

/**
 * Generates a file tree entry: a relative path (depth 0–3) with random buffer content.
 * Paths use forward slashes and have safe filenames.
 */
const fileEntryArb: fc.Arbitrary<{ readonly path: string; readonly content: Buffer }> = fc
  .tuple(
    fc.array(safeSegmentArb, { minLength: 0, maxLength: 3 }),
    safeSegmentArb,
    safeExtensionArb,
    fc.uint8Array({ minLength: 0, maxLength: 128 }),
  )
  .map(([dirs, name, ext, contentArr]) => {
    const relativePath =
      dirs.length > 0 ? `${dirs.join('/')}/${name}${ext}` : `${name}${ext}`;
    return { path: relativePath, content: Buffer.from(contentArr) };
  });

/**
 * Generates a file tree: 1–10 files with unique paths.
 * Deduplicates by path to avoid filesystem collisions.
 */
const fileTreeArb: fc.Arbitrary<readonly { readonly path: string; readonly content: Buffer }[]> =
  fc
    .array(fileEntryArb, { minLength: 1, maxLength: 10 })
    .map((entries) => {
      const seen = new Set<string>();
      const unique: { readonly path: string; readonly content: Buffer }[] = [];
      for (const entry of entries) {
        if (!seen.has(entry.path)) {
          seen.add(entry.path);
          unique.push(entry);
        }
      }
      return unique;
    })
    .filter((entries) => entries.length > 0);

// --- Temp dir management ---

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  tempDirs.length = 0;
});

/**
 * Writes a file tree to a temporary directory and returns the temp dir path.
 */
function writeFileTree(
  files: readonly { readonly path: string; readonly content: Buffer }[],
): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'zip-roundtrip-'));
  tempDirs.push(tempDir);

  for (const file of files) {
    const fullPath = join(tempDir, ...file.path.split('/'));
    const dir = join(fullPath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, file.content);
  }

  return tempDir;
}

// --- Property Tests ---

describe('Property 1: Zip round-trip preserves file paths', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * For any set of files placed in a directory tree, creating a zip archive
   * using createZipBuffer(collectFiles(dir)) and then reading the zip entries
   * back yields exactly the same set of relative file paths — with no wrapper
   * directories prepended, no files omitted, and no extra entries added.
   */
  it('zip round-trip preserves the exact set of relative file paths', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fileTreeArb, (fileTree) => {
        // Write generated files to a temp directory
        const tempDir = writeFileTree(fileTree);

        // Collect files and create zip
        const entries = collectFiles(tempDir);
        const zipBuffer = createZipBuffer(entries);

        // Parse zip entries back
        const zipPaths = readZipEntries(zipBuffer);

        // Expected paths: the generated file paths (forward-slash separated)
        const expectedPaths = fileTree.map((f) => f.path).sort();
        const actualPaths = [...zipPaths].sort();

        // Assert exact match: no extra, no missing, no wrapper dirs
        expect(actualPaths).toEqual(expectedPaths);
      }),
      { numRuns: 100 },
    );
  });
});
