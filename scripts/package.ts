import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Types ---

export interface ZipEntry {
  readonly relativePath: string;
  readonly data: Buffer;
}

// --- Exported functions (stubs — implementation in Task 1.3) ---

export function collectFiles(_dirPath: string): ZipEntry[] {
  throw new Error('collectFiles is not yet implemented');
}

export function createZipBuffer(_entries: readonly ZipEntry[]): Buffer {
  throw new Error('createZipBuffer is not yet implemented');
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

  // 2. Create zip from dist/
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Compress-Archive -Path $args[0] -DestinationPath $args[1] -Force',
        `${DIST_PATH}\\*`,
        ZIP_PATH,
      ],
      { stdio: 'inherit' },
    );
  } else {
    execFileSync('zip', ['-r', ZIP_PATH, '.'], {
      cwd: DIST_PATH,
      stdio: 'inherit',
    });
  }
}
