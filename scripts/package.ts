import { execSync } from 'node:child_process';
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
  execSync(
    `powershell Compress-Archive -Path "${DIST_PATH}\\*" -DestinationPath "${ZIP_PATH}" -Force`,
    { stdio: 'inherit' },
  );
} else {
  execSync(`cd "${DIST_PATH}" && zip -r "${ZIP_PATH}" .`, {
    stdio: 'inherit',
  });
}
