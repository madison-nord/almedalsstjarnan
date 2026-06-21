# Implementation Plan: Chrome Store Publishing

## Overview

Prepare the Almedalsstjärnan Chrome extension for Chrome Web Store publication by creating required documentation artifacts (privacy policy, store listing, permission justifications), implementing a build output verification script with property-based testing, and updating the CI pipeline to enforce clean builds and zero high-severity vulnerabilities.

## Tasks

- [x] 1. Create privacy policy and store directory structure
  - [x] 1.1 Create `PRIVACY.md` at repository root
    - State data stored exclusively via chrome.storage.local on-device
    - State no user data collected, no external transmission, no analytics/tracking
    - Include last-updated date
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Create `store/README.md` with listing asset documentation
    - Document required screenshot dimensions (1280×800 or 640×400)
    - Document optional promotional tile (440×280)
    - Specify store category as "Productivity"
    - Document screenshot requirement (Extension in active use on almedalsveckan.info)
    - Document how to host Privacy_Policy at public URL via GitHub Pages or raw GitHub link
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 1.7_

  - [x] 1.3 Create `store/description-sv.md` and `store/description-en.md`
    - Write Swedish store description text
    - Write English store description text
    - _Requirements: 2.5, 2.6_

  - [x] 1.4 Create `store/permission-justifications.md`
    - Justify `storage`: "Stores the user's starred events and preferences locally on their device."
    - Justify `downloads`: "Enables downloading ICS calendar file exports to the user's device."
    - Justify `host_permissions` on almedalsveckan.info: "Content script injects star/bookmark buttons on the official Almedalsveckan programme page."
    - List every permission declared in the manifest with its justification
    - Include Single_Purpose_Description in dedicated section: "Star events on the Almedalsveckan programme website and export your personal schedule as an ICS calendar file."
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_

- [x] 2. Resolve dependency vulnerabilities
  - [x] 2.1 Run `pnpm audit --prod --audit-level=high` and fix any reported vulnerabilities
    - Prefer direct version updates of vulnerable packages
    - Use pnpm overrides only for transitive dependencies that cannot be updated directly
    - Verify `pnpm run build` completes without errors after updates
    - Verify `pnpm run test:unit` passes without regressions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Checkpoint - Ensure documentation and dependency fixes are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement verify-package script
  - [x] 4.1 Create `scripts/verify-package.ts` with pure verification logic
    - Implement `verifyEntries(entries: readonly string[]): VerifyResult` as a pure function
    - Define `DENY_PATTERNS` array: `.map$`, `^.kiro/`, `tests?/` directories, `^node_modules/`
    - Define `REQUIRED_CHECKS` array: `manifest.json`, `.js` files, `.html` files, `_locales/` directory, `icons/` directory
    - Implement `main()` entry point that reads zip file entries and calls `verifyEntries`
    - Print violations or success message, exit non-zero on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 4.2 Write property test: Deny-list completeness
    - **Property 1: Deny-list completeness**
    - Generate random file entry lists containing deny-pattern matches; assert all are reported in `disallowedFiles` and `valid` is `false`
    - File: `tests/property/verify-package.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.7**

  - [x] 4.3 Write property test: Require-list accuracy
    - **Property 2: Require-list accuracy**
    - Generate random file entry lists; assert `missingRequired` reports exactly those categories with no matching entry — no false positives, no false negatives
    - File: `tests/property/verify-package.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.5, 6.8**

  - [x] 4.4 Write property test: Clean build passes verification
    - **Property 3: Clean build passes verification**
    - Generate file entry lists with at least one entry per required category and zero deny-pattern matches; assert `valid` is `true` with empty violation arrays
    - File: `tests/property/verify-package.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 4.5 Write unit tests for verify-package
    - Test specific examples for each deny pattern (`.map`, `.kiro/`, `tests/`, `node_modules/`)
    - Test edge cases: empty entry list, similar-but-non-matching names (`mapping.js`, `test-utils.js` in non-test directory)
    - Test `main()` with mocked zip reader
    - File: `tests/unit/verify-package.test.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

- [x] 5. Update CI pipeline
  - [x] 5.1 Update `.github/workflows/ci.yml` with strict audit and verify steps
    - Change security audit step from `pnpm audit --prod --audit-level=high || true` to strict `pnpm audit --prod --audit-level=high` (remove `|| true`)
    - Add package + verify step after build: run `pnpm package` then `tsx scripts/verify-package.ts`
    - _Requirements: 5.1, 6.9_

- [ ] 6. Capture store screenshots
  - [ ] 6.1 Run `pnpm build` to produce dist/
  - [ ] 6.2 Run `pnpm tsx scripts/capture-store-screenshots.ts` to capture screenshots
    - Produces `store/screenshot-star-buttons.png` (programme page with star buttons)
    - Produces `store/screenshot-starred-events.png` (stars overview page)
    - Produces `store/screenshot-popup.png` (popup with starred events)
    - Review screenshots and confirm they meet Chrome Web Store dimensions (1280×800)
    - _Requirements: 2.3, 2.8_

- [ ] 7. Final checkpoint - Ensure all tests pass and CI is green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The verify script uses a pure core + thin I/O shell pattern for testability
- All code is TypeScript, consistent with the existing project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "2.1"] },
    { "id": 1, "tasks": ["4.1", "5.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2"] }
  ]
}
```
