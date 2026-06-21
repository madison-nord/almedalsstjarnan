import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Types ---

interface VerifyResult {
  readonly valid: boolean;
  readonly disallowedFiles: readonly string[];
  readonly missingRequired: readonly string[];
}

// --- Constants ---

export const DENY_PATTERNS = [
  /\.map$/, // Source maps
  /^\.kiro\//, // Kiro spec directory
  /(?:^|\/)tests?\//, // Test directories
  /^node_modules\//, // Node modules
] as const;

export const REQUIRED_CHECKS = [
  { pattern: /manifest\.json$/, label: 'manifest.json' },
  { pattern: /\.js$/, label: 'compiled JavaScript files' },
  { pattern: /\.html$/, label: 'HTML files' },
  { pattern: /^_locales\//, label: '_locales/ directory' },
  { pattern: /^icons\//, label: 'icons/ directory' },
] as const;

// --- Pure verification logic ---

export function verifyEntries(entries: readonly string[]): VerifyResult {
  const disallowedFiles: string[] = [];

  for (const entry of entries) {
    for (const pattern of DENY_PATTERNS) {
      if (pattern.test(entry)) {
        disallowedFiles.push(entry);
        break;
      }
    }
  }

  const missingRequired: string[] = [];

  for (const check of REQUIRED_CHECKS) {
    const found = entries.some((entry) => check.pattern.test(entry));
    if (!found) {
      missingRequired.push(check.label);
    }
  }

  const valid = disallowedFiles.length === 0 && missingRequired.length === 0;

  return { valid, disallowedFiles, missingRequired };
}

// --- Zip entry reading (minimal central directory parser) ---

function readZipEntries(zipPath: string): readonly string[] {
  const buffer = readFileSync(zipPath);
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

  // Read central directory offset and size from EOCD
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

// --- Script entry point ---

export function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const zipPath = resolve(root, 'almedalsstjarnan.zip');

  let entries: readonly string[];
  try {
    entries = readZipEntries(zipPath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error reading zip file: ${message}`);
    process.exit(1);
  }

  const result = verifyEntries(entries);

  if (result.valid) {
    console.log(`✓ Package verification passed (${entries.length} files checked)`);
    return;
  }

  if (result.disallowedFiles.length > 0) {
    console.error('✗ Disallowed files found in package:');
    for (const file of result.disallowedFiles) {
      console.error(`  - ${file}`);
    }
  }

  if (result.missingRequired.length > 0) {
    console.error('✗ Required files missing from package:');
    for (const label of result.missingRequired) {
      console.error(`  - ${label}`);
    }
  }

  process.exit(1);
}

// Only run main() when executed as a script (not when imported)
const isDirectExecution =
  process.argv[1] && resolve(process.argv[1]).replace(/\\/g, '/').includes('verify-package');

if (isDirectExecution) {
  main();
}
