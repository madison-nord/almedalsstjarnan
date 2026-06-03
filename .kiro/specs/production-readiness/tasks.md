# Implementation Plan: Production Readiness

## Overview

Harden the Almedalsstjärnan extension for public release through code correctness fixes, security improvements, quality enforcement, localization threading, and developer experience enhancements. Tasks are grouped logically: quick wins first (rename, pin, README, manifest), then TDD-driven changes (storage validator, year-awareness, ICS locale), then CI/config/scripting changes.

## Tasks

- [x] 1. Quick wins: rename, pin dependency, remove tabs permission
  - [x] 1.1 Rename `sha256Hex` to `fnv1aHex` in `src/core/event-normalizer.ts`
    - Rename the private function `sha256Hex` to `fnv1aHex`
    - Add a JSDoc comment on `fnv1aHex` stating it implements FNV-1a with multi-round expansion and is not cryptographically secure
    - Update `deriveEventId` JSDoc to reference "FNV-1a hash fallback" instead of "SHA-256 hash fallback"
    - Update the internal call site from `sha256Hex(...)` to `fnv1aHex(...)`
    - Verify existing tests still pass (no behavioural change)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Pin `sharp` to exact version in `package.json`
    - Change `"sharp": "^0.34.5"` to `"sharp": "0.34.5"` (remove caret)
    - _Requirements: 10.1, 10.2_

  - [x] 1.3 Remove `tabs` permission from `src/extension/manifest/base.json`
    - Remove `"tabs"` from the `permissions` array, leaving `["storage", "downloads"]`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.4 Add developer loading instructions to `README.md`
    - Add a "Development" or "Getting Started" section with step-by-step instructions
    - Include prerequisite commands: `pnpm install` and `pnpm run build`
    - Describe navigating to `chrome://extensions`, enabling Developer mode, clicking "Load unpacked", selecting `dist/`
    - Mention that `pnpm run dev` starts a development build with hot reload
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Storage validator module (TDD)
  - [x] 3.1 Create `src/core/storage-validator.ts` with `validateStarredEvents` and `isValidStarredEntry`
    - Implement `isValidStarredEntry(key, entry)` — checks non-null object, id matches key, non-empty title, non-empty startDateTime, starred === true, non-empty starredAt
    - Implement `validateStarredEvents(raw)` — checks top-level is non-null non-array object, iterates entries, returns `StorageValidationResult` with valid entries and invalidKeys
    - Export the `StorageValidationResult` interface
    - Pure function, no side effects (logging is caller's responsibility)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Write unit tests for storage validator in `tests/unit/core/storage-validator.test.ts`
    - Test: non-object values (null, array, string, number, boolean) return empty valid record
    - Test: valid entries are preserved unchanged
    - Test: entries with missing/wrong fields are excluded
    - Test: id/key mismatch is excluded
    - Test: invalidKeys lists rejected keys
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.3 Write property test: invalid top-level rejection in `tests/property/storage-validator-toplevel.property.test.ts`
    - **Property 2: Storage validator rejects invalid top-level values**
    - Generate arbitrary non-object values (null, arrays, strings, numbers, booleans)
    - Assert `validateStarredEvents` returns `{ valid: {}, invalidKeys: [] }`
    - **Validates: Requirements 3.1, 3.2**

  - [x] 3.4 Write property test: entry filtering + round-trip in `tests/property/storage-validator-entries.property.test.ts`
    - **Property 3: Storage validator filters malformed entries and preserves valid entries unchanged**
    - Add `malformedEntryArb`, `mixedStorageRecordArb`, `invalidTopLevelArb` generators to `tests/helpers/event-generators.ts`
    - Assert: valid subset returned equals expected valid entries (round-trip preservation)
    - Assert: malformed entries are excluded
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

  - [x] 3.5 Integrate storage validator into `src/extension/background.ts`
    - Import `validateStarredEvents` from `#core/storage-validator`
    - After reading `starredEvents` from storage, call `validateStarredEvents(raw)`
    - Log `console.warn` for top-level corruption and for each invalid key
    - Use only valid entries for all downstream logic
    - _Requirements: 3.2, 3.4_

- [x] 4. Year-awareness in date configuration (TDD)
  - [x] 4.1 Add `YEAR` constant and `checkYearMismatch` to `src/core/date-config.ts`
    - Export `YEAR = 2026 as const`
    - Export `YearMismatchResult` interface with `mismatch`, `expected`, `actual` fields
    - Implement `checkYearMismatch()` using `new Date().getFullYear()`
    - Add JSDoc preceding `DAY_TO_DATE` stating the year and instructing developers to update annually
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

  - [x] 4.2 Write unit tests for `checkYearMismatch` in `tests/unit/core/date-config.test.ts`
    - Test match scenario (mock Date to 2026): returns `{ mismatch: false, expected: 2026, actual: 2026 }`
    - Test mismatch scenario (mock Date to 2025): returns `{ mismatch: true, expected: 2026, actual: 2025 }`
    - _Requirements: 6.3, 6.4_

  - [x] 4.3 Integrate `checkYearMismatch` into `src/extension/background.ts`
    - Import `checkYearMismatch` from `#core/date-config`
    - Call `checkYearMismatch()` once at top-level module evaluation
    - If `mismatch` is true, log `console.warn` with expected and actual year
    - _Requirements: 6.5, 6.6_

- [x] 5. ICS export locale threading (TDD)
  - [x] 5.1 Update `buildDescription` in `src/core/ics-generator.ts` to accept and use locale
    - Change `buildDescription` signature to `(description: string | null, sourceUrl: string | null, locale: 'sv' | 'en')`
    - If `sourceUrl` is non-null, append `"\n{label} {sourceUrl}"` where label is `"Källa:"` for `'sv'` or `"Source:"` for `'en'`
    - Update `generateICS` to pass `sourceUrl` and the `locale` parameter (rename `_locale` to `locale`) to `buildDescription`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 5.2 Write unit tests for ICS locale threading in `tests/unit/core/ics-generator.test.ts`
    - Test: locale `'sv'` with sourceUrl produces DESCRIPTION containing `"Källa:"` followed by URL
    - Test: locale `'en'` with sourceUrl produces DESCRIPTION containing `"Source:"` followed by URL
    - Test: null sourceUrl produces no source label in DESCRIPTION
    - Test: null description with sourceUrl still produces DESCRIPTION with source label
    - _Requirements: 7.1, 7.2_

  - [x] 5.3 Write property test: ICS locale-aware source label in `tests/property/ics-locale-label.property.test.ts`
    - **Property 4: ICS locale-aware source label**
    - Generate arbitrary starred events with non-null sourceUrl and arbitrary locale
    - Assert DESCRIPTION contains locale-appropriate label followed by sourceUrl
    - **Validates: Requirements 7.1, 7.2**

  - [x] 5.4 Thread locale through UI export buttons
    - Update `src/ui/popup/components/ExportButton.tsx` (or relevant hook) to resolve effective locale from `languagePreference` in storage and pass to `generateICS`
    - Update `src/ui/stars/components/ExportButton.tsx` (or relevant hook) to do the same
    - Fallback: if `languagePreference` is null, use browser default language (fall back to `'sv'` if neither `'sv'` nor `'en'`)
    - _Requirements: 7.3, 7.4_

  - [x] 5.5 Write property test for fnv1aHex deterministic consistency in `tests/property/fnv1a-consistency.property.test.ts`
    - **Property 1: fnv1aHex deterministic consistency**
    - Generate arbitrary input strings
    - Assert `fnv1aHex(input)` produces same result on repeated calls
    - Assert output is a deterministic hex string
    - **Validates: Requirements 1.3**

- [~] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Coverage thresholds and script cleanup
  - [x] 7.1 Add coverage thresholds to `vitest.config.ts`
    - Add `thresholds: { statements: 80, branches: 75 }` inside `coverage` config
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Remove `--passWithNoTests` from package.json scripts
    - Remove `--passWithNoTests` from `test:unit`, `test:property`, and `test` scripts
    - _Requirements: 4.4, 4.5, 4.6_

- [ ] 8. Dedicated package script
  - [~] 8.1 Create `scripts/package.ts`
    - Implement cross-platform packaging: remove existing zip, create zip from `dist/`
    - Use `node:child_process` execSync with platform detection (PowerShell on Windows, zip on Unix)
    - Use `node:fs` for existsSync/unlinkSync
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [~] 8.2 Update `package` script in `package.json` to invoke `scripts/package.ts`
    - Change to `"package": "pnpm run build && tsx scripts/package.ts"`
    - Ensure `tsx` is available (add as devDependency if needed)
    - _Requirements: 8.2_

- [ ] 9. CI pipeline enhancements
  - [~] 9.1 Add security audit step to `.github/workflows/ci.yml`
    - Add `pnpm audit --prod --audit-level=high` step after install, before lint
    - _Requirements: 9.1, 9.2, 9.3_

  - [~] 9.2 Add E2E test steps to `.github/workflows/ci.yml`
    - Add `npx playwright install chromium` step after build
    - Add `pnpm run test:e2e` step after Playwright install
    - Add artifact upload step using `actions/upload-artifact@v4` with `if: failure()`, path `test-results/`, retention 7 days
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [~] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are mandatory
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The storage validator is a pure function — no chrome.* API calls inside it (per browser-extension-patterns steering)
- The `fnv1aHex` rename is internal (private function) so no export changes are needed beyond updating JSDoc

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "5.1"] },
    { "id": 3, "tasks": ["3.4", "3.5", "4.3", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5", "7.1", "7.2"] },
    { "id": 5, "tasks": ["8.1", "9.1", "9.2"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
