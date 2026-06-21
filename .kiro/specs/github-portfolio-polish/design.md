# Design Document

## Overview

This design covers the professional polish of the Almedalsstjärnan GitHub repository for portfolio presentation. The work is entirely documentation, configuration, and repository hygiene — no runtime code changes are involved.

The deliverables are:
1. Updated README.md with badges, screenshots section, feature list, and accurate architecture docs
2. Updated CONTRIBUTING.md with inline conventions and fast-check mention
3. New CHANGELOG.md following Keep a Changelog format
4. .gitignore updates and removal of tracked artifacts (playwright-report/, *.zip)
5. Version bump from 0.1.0 to 1.0.0 in package.json and manifest/base.json
6. New `docs/screenshots/` directory with a placeholder README
7. Completed specs archived to `.kiro/specs/_archive/`

## Architecture

No architectural changes are required. This feature modifies only repository-level documentation and configuration files. The extension's runtime architecture remains unchanged.

### File Change Map

```
Repository Root
├── README.md                          (major rewrite)
├── CONTRIBUTING.md                    (update)
├── CHANGELOG.md                       (new)
├── .gitignore                         (add playwright-report/)
├── package.json                       (version bump)
├── docs/
│   └── screenshots/
│       └── README.md                  (new — describes needed screenshots)
├── src/
│   ├── extension/manifest/base.json   (version bump)
│   └── features/README.md             (update)
└── .kiro/specs/
    ├── _archive/                      (new directory, receives completed specs)
    ├── github-portfolio-polish/       (stays active)
    └── chrome-store-publishing/       (stays active)
```

## Components and Interfaces

Since this is a documentation/configuration change, there are no software components or interfaces. The "components" are the files themselves:

### README.md Structure (Post-Update)

```markdown
# Almedalsstjärnan
[badges: license, node version]

[introduction paragraph — updated with all shipped features]

## Screenshots
[image references to docs/screenshots/ with alt text placeholders]

## Features
[bullet list of user-facing capabilities]

## Prerequisites
## Setup
## Available Scripts
## Development
## Architecture Overview
## Project Structure
## Contribution Guidelines
## License
```

### CHANGELOG.md Structure

```markdown
# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.0] - YYYY-MM-DD
### Added
- Star and unstar events on almedalsveckan.info
- Bulk star with progress indicator
- ICS calendar export
- Popup UI for quick starred events overview
- Stars page with search, sort, and grid view
- Help/onboarding modal
- Language toggle (Swedish and English)
- Undo support for unstar actions
- Shadow DOM content script isolation
- CI pipeline with lint, typecheck, unit, property, e2e tests
```

### docs/screenshots/README.md Structure

Documents which screenshots are needed:
- Star button on almedalsveckan.info (content script injection)
- Popup UI showing starred events
- Stars page with grid view, search, and sort

Expected dimensions guidance (e.g., retina-friendly widths).

### Spec Archiving Strategy

The following specs will be moved to `.kiro/specs/_archive/`:
- almedals-planner-extension (initial spec — shipped)
- bulk-star-filtered (shipped)
- code-review-fixes (shipped)
- content-scraping-and-sync (shipped)
- event-data-refresh (shipped)
- grid-and-ics-bugfixes (shipped)
- popup-ux-improvements (shipped)
- pre-commit-checks (shipped)
- production-readiness (shipped)
- stars-page-sorting (shipped)
- ui-display-bugs (shipped)
- ui-display-bugs-v2 (shipped)
- ui-polish-fixes (shipped)
- unstar-revert-bug (shipped)
- user-help-onboarding (shipped)
- ux-enhancements (shipped)

Remaining active:
- github-portfolio-polish (this spec)
- chrome-store-publishing (upcoming work)

### Git Artifact Removal

Two items currently tracked need removal from the git index:
1. `playwright-report/` — generated Playwright HTML report
2. `almedalsstjarnan.zip` — packaged extension artifact

Removal uses `git rm --cached` (keeps local files, removes from index). The .gitignore already has `*.zip` and needs `playwright-report/` added.

## Data Models

No data models are involved. All changes are to static files (Markdown, JSON, gitignore).

### Version Fields

| File | Field | Current | Target |
|------|-------|---------|--------|
| package.json | `version` | "0.1.0" | "1.0.0" |
| src/extension/manifest/base.json | `version` | "0.1.0" | "1.0.0" |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

PBT is **not applicable** to this feature. All changes are to static documentation files (Markdown, JSON, gitignore) and repository configuration. There are no pure functions, data transformations, parsing logic, or runtime code changes that would benefit from universal property verification.

### Property 1: No testable properties

This feature contains no runtime code changes. All deliverables are documentation, configuration, and repository hygiene tasks that are verified through build checks and manual inspection rather than property-based testing.

**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1**

## Error Handling

### Build Verification (Requirement 8.4)

After the version bump, `pnpm run build` must succeed. If it fails:
1. Inspect the build error output
2. Fix the issue (likely a manifest or config problem)
3. Re-run build to confirm

### Atomic Spec Archiving (Requirement 7.4)

The spec archiving uses `git mv` which is atomic per file. The approach:
1. Create `_archive/` directory
2. Move each spec directory with `git mv`
3. If any move fails, the already-moved specs remain valid (git mv is non-destructive)
4. Verify final state matches expectations

### Missing Screenshots (Requirement 3.5)

Screenshot image files won't exist initially. The README uses alt text that renders as placeholder text in Markdown viewers. The `docs/screenshots/README.md` documents what screenshots are needed for future capture.

## Testing Strategy

### PBT Assessment

Property-based testing is **NOT applicable** to this feature because:
- All changes are to static documentation files (Markdown, JSON)
- There are no pure functions with input/output behavior
- There is no transformation logic, parsing, or data processing
- The changes are configuration and content, not code

### Verification Approach

Since this is a documentation/configuration task, verification is done through:

1. **Build verification**: `pnpm run build` must pass after version bump (Requirement 8.4)
2. **Lint/typecheck verification**: `pnpm run lint` and `pnpm run typecheck` must pass (no code changes should break these, but confirms manifest validity)
3. **Git state verification**: After `git rm --cached`, verify files don't appear in `git status` tracked changes
4. **Manual inspection**: README structure, badge rendering, CHANGELOG format correctness
5. **Existing test suite**: `pnpm test` must continue to pass (no runtime code is modified)

### No New Tests Required

No new unit tests, property tests, or E2E tests are needed because:
- No runtime code is being added or modified
- The existing test suite validates that no regressions are introduced by the version bump or manifest change
- Documentation correctness is verified by human review and CI badge/build status
