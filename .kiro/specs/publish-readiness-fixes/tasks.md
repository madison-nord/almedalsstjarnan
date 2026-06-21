# Implementation Plan: Publish Readiness Fixes

## Overview

This plan addresses five independent technical gaps blocking Chrome Web Store publication. The implementation follows TDD workflow: write failing tests first, then implement the minimal code to pass. Each requirement is self-contained with minimal cross-dependency.

## Tasks

- [x] 1. Implement cross-platform zip writer
  - [x] 1.1 Write unit tests for `collectFiles` and `createZipBuffer` in `tests/unit/scripts/package.test.ts`
    - Test `collectFiles` returns correct relative paths (forward slashes, no `dist/` prefix)
    - Test `collectFiles` handles nested directories
    - Test `createZipBuffer` produces a buffer starting with ZIP magic bytes (`PK\x03\x04`)
    - Test that missing `dist/` directory throws an error with descriptive message
    - Test empty directory produces valid (empty) zip
    - _Requirements: 1.4, 1.6, 1.7_

  - [x] 1.2 Write property test for zip round-trip in `tests/property/zip-roundtrip.property.test.ts`
    - **Property 1: Zip round-trip preserves file paths**
    - Generate random file trees (depth 0–3, safe filenames, random buffer content)
    - Write to temp dir, call `collectFiles()` + `createZipBuffer()`
    - Parse resulting zip with `readZipEntries` logic from `verify-package.ts`
    - Assert entry set matches generated file set exactly
    - **Validates: Requirements 1.4**

  - [x] 1.3 Implement `collectFiles()` and `createZipBuffer()` in `scripts/package.ts`
    - Replace platform-dependent `execFileSync` branches with pure Node.js implementation
    - Use `node:fs` for recursive file collection, `node:path` for path manipulation
    - Use `node:zlib` `deflateRawSync` for DEFLATE compression
    - Construct ZIP binary format manually (local file headers, central directory, EOCD)
    - Export `ZipEntry` interface, `collectFiles()`, and `createZipBuffer()` for testability
    - Exit with code 1 and descriptive message if `dist/` does not exist
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.4 Wire `scripts/package.ts` main script to use new functions and verify with `verify-package.ts`
    - Update the script entry point to call `createZipBuffer(collectFiles(distPath))`
    - Write the buffer to `almedalsstjarnan.zip`
    - Ensure `pnpm package` + `tsx scripts/verify-package.ts` passes
    - _Requirements: 1.1, 1.2, 1.5_

- [~] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add GitHub Pages workflow for privacy policy
  - [x] 3.1 Create `.github/workflows/pages.yml` workflow file
    - Trigger on pushes to `main` that modify `PRIVACY.md` or the workflow file
    - Use `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages`
    - Deploy only the privacy policy content (not entire repo)
    - Serve at `https://madison-nord.github.io/almedalsstjarnan/PRIVACY`
    - Use Jekyll with a permalink config so the URL has no `.html` extension
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Create the pages source structure for privacy policy deployment
    - Create directory structure for Jekyll deployment (e.g., `PRIVACY/index.md` or equivalent)
    - Add `_config.yml` for Jekyll baseurl and permalink settings
    - Ensure rendered output is formatted HTML (not raw Markdown)
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 3.3 Update `store/README.md` with the privacy policy URL
    - Add `https://madison-nord.github.io/almedalsstjarnan/PRIVACY` to the hosting documentation section
    - _Requirements: 2.6_

- [x] 4. Bundle analysis and optimization
  - [x] 4.1 Add `manualChunks` configuration to `vite.config.ts`
    - Add `build.rollupOptions.output.manualChunks` to separate React/ReactDOM into `vendor-react` chunk
    - This removes React from the shared chunk, reducing it significantly
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 4.2 Create `BUNDLE-ANALYSIS.md` documenting the shared chunk composition
    - List each module contributing to the shared chunk with approximate KB size
    - Include justification if chunk remains above 150 KB after optimization
    - Document the manualChunks optimization applied
    - _Requirements: 3.1, 3.3_

  - [x] 4.3 Verify total `dist/` size remains below 500 KB
    - Run build and check total uncompressed dist size
    - Ensure CI bundle size check still passes
    - _Requirements: 3.6_

- [~] 5. Checkpoint - Ensure build and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix stars page CSS bundling
  - [x] 6.1 Write E2E test for stars CSS in `tests/e2e/stars-css.e2e.test.ts`
    - Assert the stars page root container has computed `display: flex`
    - Assert the stars page root container has computed `min-height: 100vh`
    - Confirms CSS is loaded and applied correctly
    - _Requirements: 4.4, 4.5_

  - [x] 6.2 Fix Vite/PostCSS configuration so stars.html references correct CSS
    - Investigate the built `dist/src/ui/stars/stars.html` `<link>` element
    - Ensure it references a CSS file containing Tailwind utilities for the stars page
    - Fix via plugin configuration, post-build script, or separate CSS entry as needed
    - Verify `dist/stars.css` contains at least 1 KB of Tailwind utility classes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Resolve Dependabot security alerts
  - [x] 7.1 Update vulnerable devDependencies and add pnpm.overrides
    - Run `pnpm audit` to identify critical/high vulnerabilities
    - Bump direct devDependencies to patched versions where available
    - Add `pnpm.overrides` entries for transitive dependency vulnerabilities
    - Document any unresolvable moderate/low alerts in `SECURITY.md` if needed
    - _Requirements: 5.1, 5.2, 5.3, 5.8_

  - [x] 7.2 Verify full CI suite passes after dependency updates
    - Run `pnpm run build`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
    - Confirm same number of passing tests as before
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [~] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the zip round-trip correctness property from the design
- Unit tests validate specific examples and edge cases
- TDD workflow: tests are written before implementation (tasks 1.1/1.2 before 1.3, task 6.1 before 6.2)
- The project uses TypeScript with Vitest for unit/property tests and Playwright for E2E
- `fast-check` is already in devDependencies for property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["1.4", "3.1", "3.2", "4.1"] },
    { "id": 3, "tasks": ["3.3", "4.2", "4.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
