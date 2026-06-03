import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

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
