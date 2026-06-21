# Requirements Document

## Introduction

The Almedalsstjärnan Chrome extension requires several hardening changes before public release. This spec covers code correctness issues (misleading function names, hardcoded dates), security concerns (overly broad permissions, no storage validation), quality enforcement (test coverage thresholds, E2E in CI, dependency auditing), localization gaps (ICS export ignoring language preference), and developer experience improvements (dedicated packaging script, pinned dependencies, dev instructions). These changes collectively bring the extension to a production-ready state.

## Glossary

- **Event_Normalizer**: The module at `src/core/event-normalizer.ts` responsible for extracting and normalizing event data from DOM elements.
- **Background_Worker**: The Manifest V3 service worker at `src/extension/background.ts` that handles all storage read/write operations.
- **Storage_Validator**: A new lightweight validation layer that verifies the structural integrity of data read from `chrome.storage.local`.
- **ICS_Generator**: The module at `src/core/ics-generator.ts` that produces RFC 5545-compliant ICS calendar files from starred events.
- **Date_Config**: The module at `src/core/date-config.ts` containing year-specific Almedalsveckan date mappings.
- **CI_Pipeline**: The GitHub Actions workflow at `.github/workflows/ci.yml` that runs automated checks on push and pull requests.
- **Package_Script**: The build-and-zip script that produces the extension distribution archive.
- **Manifest**: The extension manifest at `src/extension/manifest/base.json` declaring permissions and configuration.

## Requirements

### Requirement 1: Rename Misleading Hash Function

**User Story:** As a developer, I want the hash function in Event_Normalizer to have a name that accurately reflects its algorithm, so that I do not mistake it for a cryptographic hash.

#### Acceptance Criteria

1. THE Event_Normalizer SHALL expose the fallback hash function under the name `fnv1aHex` instead of `sha256Hex`.
2. THE Event_Normalizer SHALL include a JSDoc comment on `fnv1aHex` stating that the function implements the FNV-1a algorithm with multi-round expansion and is not cryptographically secure.
3. WHEN the `fnv1aHex` function is called, THE Event_Normalizer SHALL produce output identical to the previous `sha256Hex` function for the same input (no behavioural change).
4. THE Event_Normalizer SHALL update the `deriveEventId` JSDoc to reference "FNV-1a hash fallback" instead of "SHA-256 hash fallback".

### Requirement 2: Remove Overly Broad Tabs Permission

**User Story:** As a user, I want the extension to request only the minimum permissions necessary, so that my browsing data is not exposed unnecessarily.

#### Acceptance Criteria

1. THE Manifest SHALL not include the `tabs` permission in the `permissions` array.
2. WHEN the extension opens an extension-internal page (stars page), THE Background_Worker SHALL use `chrome.tabs.create` without relying on the `tabs` permission, since creating tabs to extension URLs does not require it.
3. AFTER the `tabs` permission is removed, THE extension SHALL continue to open the stars page successfully when triggered by the user.

### Requirement 3: Storage Schema Validation

**User Story:** As a user, I want the extension to handle corrupted storage gracefully, so that a single malformed entry does not break the entire extension.

#### Acceptance Criteria

1. WHEN the Background_Worker reads `starredEvents` from `chrome.storage.local`, THE Storage_Validator SHALL verify that the value is a non-null object (not an array, string, number, or boolean).
2. IF the `starredEvents` value is not a valid object, THEN THE Storage_Validator SHALL discard the entire value, log a warning to the console indicating storage corruption was detected, and return an empty object.
3. WHEN the Storage_Validator iterates over entries in the `starredEvents` object, THE Storage_Validator SHALL verify that each entry contains a non-empty string `id` that matches its object key, a non-empty string `title`, a non-empty string `startDateTime`, a boolean `starred` field set to true, and a non-empty string `starredAt`.
4. IF an individual entry fails validation, THEN THE Storage_Validator SHALL exclude that entry from the returned result, log a warning to the console identifying the malformed entry key, and leave the persisted storage unchanged (in-memory filtering only, no write-back).
5. THE Storage_Validator SHALL return only entries that pass validation, preserving all valid entries unchanged.
6. THE Storage_Validator SHALL guarantee that for any valid StarredEvent object, the output is identical to the input (round-trip preservation for valid data).

### Requirement 4: Test Coverage Thresholds

**User Story:** As a developer, I want enforced test coverage thresholds, so that regressions in coverage are caught automatically before merge.

#### Acceptance Criteria

1. THE vitest configuration SHALL specify a coverage threshold of 80% for statements.
2. THE vitest configuration SHALL specify a coverage threshold of 75% for branches.
3. WHEN coverage falls below the configured thresholds, THE test runner SHALL fail the test run with a non-zero exit code.
4. THE `test:unit` script in `package.json` SHALL not include the `--passWithNoTests` flag.
5. THE `test:property` script in `package.json` SHALL not include the `--passWithNoTests` flag.
6. THE `test` script in `package.json` SHALL not include the `--passWithNoTests` flag.

### Requirement 5: E2E Tests in CI Pipeline

**User Story:** As a developer, I want E2E tests to run in the CI pipeline, so that critical user flows are verified on every push and pull request.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL include a step that runs `npx playwright install chromium` to install the Chromium browser before executing E2E tests.
2. THE CI_Pipeline SHALL execute `pnpm run test:e2e` after the build step completes successfully.
3. WHEN an E2E test fails, THE CI_Pipeline SHALL fail the workflow run with a non-zero exit code.
4. THE E2E tests SHALL cover the star/unstar flow and the ICS export flow, with at least one test file per flow in `tests/e2e/`.
5. THE CI_Pipeline SHALL trigger E2E tests on pushes to the main branch and on pull requests targeting the main branch.
6. WHEN E2E tests fail in CI, THE CI_Pipeline SHALL upload Playwright test results (traces and screenshots) as workflow artifacts retained for 7 days.

### Requirement 6: Year-Awareness for Date Configuration

**User Story:** As a developer, I want the date configuration to be clearly tied to a specific year with a runtime warning, so that the extension does not silently produce wrong dates if run in a different year.

#### Acceptance Criteria

1. THE Date_Config module SHALL export a `YEAR` constant with the value `2026`.
2. THE Date_Config module SHALL export a `checkYearMismatch` function that accepts no arguments and compares the current system year (from the system clock) against the `YEAR` constant, returning a discriminated-union object with a boolean `mismatch` field, a numeric `expected` field set to the `YEAR` value, and a numeric `actual` field set to the system year.
3. WHEN the system year does not match the `YEAR` constant, THE `checkYearMismatch` function SHALL return an object with `mismatch` set to `true`, `expected` set to the `YEAR` value, and `actual` set to the current system year.
4. WHEN the system year matches the `YEAR` constant, THE `checkYearMismatch` function SHALL return an object with `mismatch` set to `false`, `expected` set to the `YEAR` value, and `actual` set to the current system year.
5. WHEN the service worker module is first evaluated, THE Background_Worker SHALL call `checkYearMismatch` exactly once.
6. IF `checkYearMismatch` returns an object with `mismatch` set to `true`, THEN THE Background_Worker SHALL log a `console.warn` message that contains both the expected year and the actual year values.
7. THE Date_Config module SHALL include a JSDoc comment immediately preceding the `DAY_TO_DATE` declaration stating the year it applies to and instructing developers to update the mapping annually.

### Requirement 7: ICS Export Respects Language Preference

**User Story:** As a user, I want the ICS export to use my chosen language for labels, so that the exported calendar entries are readable in my preferred locale.

#### Acceptance Criteria

1. WHEN the ICS_Generator receives a locale parameter of `'en'`, THE ICS_Generator SHALL use the English-language `icsSourceLabel` value ("Source:") as the source prefix in the DESCRIPTION field of the generated ICS content.
2. WHEN the ICS_Generator receives a locale parameter of `'sv'`, THE ICS_Generator SHALL use the Swedish-language `icsSourceLabel` value ("Källa:") as the source prefix in the DESCRIPTION field of the generated ICS content.
3. WHEN the user triggers an ICS export from a UI export button (popup or stars page), THE UI SHALL pass the user's active locale preference (resolved from `languagePreference` in storage) to the ICS_Generator.
4. IF the stored `languagePreference` is `null`, THEN THE UI SHALL resolve the effective locale to the browser's default language (falling back to `'sv'` when the browser language is neither `'sv'` nor `'en'`) and pass that resolved locale to the ICS_Generator.
5. THE ICS_Generator SHALL produce output that is RFC 5545 compliant regardless of which supported locale (`'sv'` or `'en'`) is active.

### Requirement 8: Dedicated Package Script File

**User Story:** As a developer, I want the packaging logic in a dedicated script file, so that the build process is readable, maintainable, and debuggable across platforms.

#### Acceptance Criteria

1. THE project SHALL include a dedicated script file at `scripts/package.ts` (or `scripts/package.mjs`) containing the packaging logic.
2. THE `package` script in `package.json` SHALL invoke the dedicated script file instead of an inline `node -e` one-liner.
3. THE dedicated package script SHALL remove any existing `almedalsstjarnan.zip` file before creating a new one.
4. THE dedicated package script SHALL create a zip archive containing all files from the `dist/` directory.
5. THE dedicated package script SHALL function correctly on both Windows and Unix-based platforms.

### Requirement 9: Security Audit in CI

**User Story:** As a developer, I want dependency vulnerabilities flagged automatically in CI, so that known security issues are caught before release.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL include a step that runs `pnpm audit --prod` to check production dependencies for known vulnerabilities.
2. WHEN `pnpm audit` reports vulnerabilities at severity level high or critical, THE CI_Pipeline SHALL fail the workflow run with a non-zero exit code.
3. THE audit step SHALL run before the build step so that vulnerable dependencies are flagged early.

### Requirement 10: Pin Sharp Dependency

**User Story:** As a developer, I want all dependencies pinned to exact versions, so that builds are reproducible and unexpected breaking changes from patch updates are avoided.

#### Acceptance Criteria

1. THE `package.json` SHALL specify the `sharp` dependency with an exact version (no caret or tilde range prefix).
2. WHEN the version is pinned, THE specified version SHALL be `0.34.5` (the current resolved version).

### Requirement 11: Developer Loading Instructions in README

**User Story:** As a new contributor, I want clear instructions for loading the extension in development mode, so that I can start contributing without guesswork.

#### Acceptance Criteria

1. THE README SHALL include a "Development" or "Getting Started" section with step-by-step instructions for loading the extension as an unpacked extension in Chrome.
2. THE development instructions SHALL include the prerequisite commands: `pnpm install` and `pnpm run build`.
3. THE development instructions SHALL describe navigating to `chrome://extensions`, enabling Developer mode, clicking "Load unpacked", and selecting the `dist/` directory.
4. THE development instructions SHALL mention that `pnpm run dev` starts a development build with hot reload.
