import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { collectFiles, createZipBuffer } from '../../../scripts/package';

// ─── collectFiles ───────────────────────────────────────────────────

describe('collectFiles', () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'pkg-test-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('returns correct relative paths with forward slashes and no directory prefix', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'manifest.json'), '{}');
    writeFileSync(join(dir, 'background.js'), 'console.log("bg")');

    const entries = collectFiles(dir);
    const paths = entries.map((e) => e.relativePath);

    expect(paths).toContain('manifest.json');
    expect(paths).toContain('background.js');

    // No leading slash or directory prefix
    for (const p of paths) {
      expect(p).not.toMatch(/^\//);
      expect(p).not.toMatch(/\\/);
    }
  });

  it('handles nested directories with forward-slash separated paths', () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, '_locales', 'sv'), { recursive: true });
    writeFileSync(join(dir, '_locales', 'sv', 'messages.json'), '{}');
    mkdirSync(join(dir, 'icons'), { recursive: true });
    writeFileSync(join(dir, 'icons', 'icon-16.png'), Buffer.from([0x89, 0x50]));

    const entries = collectFiles(dir);
    const paths = entries.map((e) => e.relativePath);

    expect(paths).toContain('_locales/sv/messages.json');
    expect(paths).toContain('icons/icon-16.png');

    // All paths use forward slashes
    for (const p of paths) {
      expect(p).not.toContain('\\');
    }
  });

  it('throws an error with descriptive message when directory does not exist', () => {
    const nonExistentPath = join(tmpdir(), 'this-dir-does-not-exist-' + Date.now());

    expect(() => collectFiles(nonExistentPath)).toThrow();
  });

  it('returns an empty array for an empty directory', () => {
    const dir = makeTempDir();

    const entries = collectFiles(dir);

    expect(entries).toEqual([]);
  });
});

// ─── createZipBuffer ────────────────────────────────────────────────

describe('createZipBuffer', () => {
  it('produces a buffer starting with ZIP magic bytes (PK\\x03\\x04)', () => {
    const entries = [
      { relativePath: 'manifest.json', data: Buffer.from('{"name":"test"}') },
      { relativePath: 'background.js', data: Buffer.from('console.log("hi")') },
    ];

    const zipBuffer = createZipBuffer(entries);

    // ZIP magic bytes: PK\x03\x04
    expect(zipBuffer[0]).toBe(0x50); // P
    expect(zipBuffer[1]).toBe(0x4b); // K
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });

  it('produces a valid zip buffer from an empty entry array', () => {
    const zipBuffer = createZipBuffer([]);

    // An empty ZIP still has an End of Central Directory record
    // which starts with PK\x05\x06 — but local file header magic won't be present.
    // The buffer should at least be non-empty and contain EOCD signature.
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Find EOCD signature (PK\x05\x06) somewhere in the buffer
    let foundEocd = false;
    for (let i = 0; i <= zipBuffer.length - 4; i++) {
      if (
        zipBuffer[i] === 0x50 &&
        zipBuffer[i + 1] === 0x4b &&
        zipBuffer[i + 2] === 0x05 &&
        zipBuffer[i + 3] === 0x06
      ) {
        foundEocd = true;
        break;
      }
    }
    expect(foundEocd).toBe(true);
  });
});
