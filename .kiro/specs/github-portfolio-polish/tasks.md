# Implementation Plan: GitHub Portfolio Polish

## Overview

This plan covers the professional polish of the Almedalsstjärnan GitHub repository for portfolio presentation. All tasks involve documentation, configuration, and repository hygiene — no runtime code changes. The existing test suite must continue to pass, and a build verification is required after the version bump.

## Tasks

- [x] 1. Update .gitignore and remove tracked artifacts
  - [x] 1.1 Add `playwright-report/` to .gitignore and remove from git index
    - Add `playwright-report/` entry to `.gitignore`
    - Run `git rm --cached -r playwright-report/` to untrack the directory
    - Verify `playwright-report/` no longer appears in `git status` as tracked
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 1.2 Remove almedalsstjarnan.zip from git index
    - Confirm `*.zip` pattern already exists in `.gitignore`
    - Run `git rm --cached almedalsstjarnan.zip` to untrack the file
    - Verify `almedalsstjarnan.zip` no longer appears in `git status` as tracked
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Create docs/screenshots directory with README guide
  - [x] 2.1 Create `docs/screenshots/` directory and README.md
    - Create the directory at `docs/screenshots/`
    - Write a README.md describing the needed screenshots: star button on almedalsveckan.info, popup UI, and stars page
    - Include expected dimensions guidance (retina-friendly widths, e.g., 1280px wide for full-page, 400px for popup)
    - _Requirements: 3.3, 3.4_

- [x] 3. Create CHANGELOG.md
  - [x] 3.1 Create CHANGELOG.md at repository root
    - Create `CHANGELOG.md` following Keep a Changelog format
    - Include an `[Unreleased]` section at the top
    - Add a `[1.0.0]` release entry dated 2026-06-21
    - Document under "Added": star and unstar events, bulk star with progress indicator, ICS calendar export, popup UI, stars page with search/sort/grid view, help/onboarding modal, language toggle (Swedish and English), undo support, Shadow DOM content script isolation, CI pipeline with lint/typecheck/unit/property/e2e tests
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Version bump to 1.0.0 and build verification
  - [x] 4.1 Bump version in package.json and manifest base.json
    - Update `version` field in `package.json` from "0.1.0" to "1.0.0"
    - Update `version` field in `src/extension/manifest/base.json` from "0.1.0" to "1.0.0"
    - _Requirements: 8.1, 8.2_
  - [x] 4.2 Verify build succeeds after version bump
    - Run `pnpm run build` and confirm it completes without errors
    - Run `pnpm run lint` and confirm no lint errors
    - Run `pnpm run typecheck` and confirm no type errors
    - Run `pnpm test` and confirm all existing tests pass
    - Any failure is a blocker — resolve before proceeding
    - _Requirements: 8.4_

- [x] 5. Checkpoint - Build verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Rewrite README.md
  - [x] 6.1 Add badges to top of README
    - Add GPL-3.0 license badge linked to the LICENSE file
    - Add Node.js version badge showing ">=20"
    - Position badges after the title, before any other content
    - _Requirements: 2.1, 2.2_
  - [x] 6.2 Update introduction paragraph with all shipped features
    - Rewrite the intro to mention: star/unstar events, bulk star, ICS calendar export, popup UI, full-page stars view with search and sorting, help/onboarding modal, language toggle (Swedish/English), and undo support
    - _Requirements: 9.1_
  - [x] 6.3 Add Screenshots section
    - Add "Screenshots" section positioned after the introduction and before "Prerequisites"
    - Include image references pointing to `docs/screenshots/` for: star button, popup UI, and stars page
    - Use descriptive alt text for accessibility (images will be captured separately via the chrome-store-publishing spec)
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 6.4 Add Features section
    - Add "Features" section after Screenshots, before Prerequisites
    - List user-facing capabilities as bullet points
    - _Requirements: 9.4_
  - [x] 6.5 Update architecture modules table
    - Add Bulk Star entry (bulk-star-button.ts, bulk-star-coordinator.ts, progress-indicator.ts)
    - Add Shared UI entry (HelpModal, LanguageToggle, SortSelector, UndoToast, SearchFilter)
    - _Requirements: 9.2_
  - [x] 6.6 Update Key Design Decisions section
    - Add mention of i18n runtime language switching approach
    - Add mention of bulk star rate-limiting/pagination strategy
    - _Requirements: 9.3_

- [x] 7. Update src/features/README.md
  - [x] 7.1 Rewrite src/features/README.md
    - Remove the "No feature modules have been implemented yet" text
    - Replace with a description of the project's feature architecture
    - _Requirements: 9.5_

- [x] 8. Update CONTRIBUTING.md
  - [x] 8.1 Update CONTRIBUTING.md with inline conventions and testing info
    - Replace the reference to `.kiro/steering/git-workflow.md` with inline commit format conventions
    - Add mention that the project uses property-based testing with fast-check for core logic invariants
    - Add Chrome Web Store listing section with the published URL (coordinate with chrome-store-publishing spec task 6/7 for the final URL)
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 9. Archive completed specs
  - [-] 9.1 Create _archive directory and move completed specs
    - Create `.kiro/specs/_archive/` directory
    - Move all completed spec directories to `_archive/` using `git mv`: almedals-planner-extension, bulk-star-filtered, code-review-fixes, content-scraping-and-sync, event-data-refresh, grid-and-ics-bugfixes, popup-ux-improvements, pre-commit-checks, production-readiness, stars-page-sorting, ui-display-bugs, ui-display-bugs-v2, ui-polish-fixes, unstar-revert-bug, user-help-onboarding, ux-enhancements
    - Preserve all directory structure and file contents unchanged
    - Verify only `github-portfolio-polish/`, `chrome-store-publishing/`, and `_archive/` remain in active `.kiro/specs/`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [~] 10. Final checkpoint - Verify all changes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No property-based tests or new unit tests are needed — all changes are documentation/configuration
- Build verification (task 4.2) ensures the version bump doesn't break anything
- The existing test suite validates no regressions from manifest changes
- Repository metadata (Requirement 1) and Chrome Web Store URL references depend on the `chrome-store-publishing` spec completing first — coordinate with that spec for the final published URL
- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan since all tasks are essential)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1"] },
    { "id": 1, "tasks": ["4.1"] },
    { "id": 2, "tasks": ["4.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "7.1", "8.1"] },
    { "id": 4, "tasks": ["9.1"] }
  ]
}
```
