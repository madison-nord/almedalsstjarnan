# Requirements Document

## Introduction

This spec addresses 16 issues identified during a comprehensive code review of the Almedalsstjärnan browser extension. The project is a public service open-source portfolio project that must look professional and build cleanly in CI. The LICENSE file is already GPLv3 — all metadata and references must be corrected to match.

## Glossary

- **GPLv3**: GNU General Public License version 3.
- **SPDX**: Software Package Data Exchange identifier for licenses.
- **a11y**: Accessibility (WCAG 2.1 AA compliance).
- **locale**: The active UI language, either `'sv'` (Swedish) or `'en'` (English).

## Requirements

### Requirement 1: License Consistency

**User Story:** As a contributor, I want the license metadata to be consistent across all project files, so that there is no legal ambiguity.

#### Acceptance Criteria

1. The `package.json` `license` field SHALL be `"GPL-3.0-only"`.
2. The README.md "License" section SHALL state "GPL-3.0" instead of "MIT".
3. The existing `LICENSE` file (GPLv3 full text) SHALL remain unchanged.

### Requirement 2: Star Button Accessibility Compliance

**User Story:** As a user with motor impairments, I want the star button to meet WCAG target size requirements, so that I can interact with it reliably.

#### Acceptance Criteria

1. The star button inline CSS in `star-button.ts` SHALL specify a 32×32px clickable area.
2. The star button SVG icon SHALL be 16×16px.
3. The unused `src/extension/star-button.css` file SHALL be deleted.

### Requirement 3: Package Metadata

**User Story:** As a visitor to the repository, I want to see who maintains the project, so that I know it is actively maintained.

#### Acceptance Criteria

1. The `package.json` `author` field SHALL contain `"Almedalsstjärnan Contributors"`.

### Requirement 4: Code Formatting Consistency

**User Story:** As a contributor, I want all files to follow the same formatting rules, so that PRs are not polluted by whitespace diffs.

#### Acceptance Criteria

1. All source files SHALL pass `pnpm run format:check` without warnings.
2. The `.prettierrc.json` `endOfLine` setting SHALL remain `"lf"`.

### Requirement 5: Locale-Aware Date Formatting

**User Story:** As a user who switched to English, I want date formatting to follow my chosen locale, so that UI is consistent.

#### Acceptance Criteria

1. The `EventItem` component SHALL use the active locale when calling `formatEventDateTime`.
2. The `EventRow` component SHALL use the active locale when calling `formatEventDateTime`.
3. The locale SHALL be passed as a prop from the parent App component.

### Requirement 6: Remove Unused Conflict Props from EventRow

**User Story:** As a developer, I want the EventRow interface to be minimal and accurate, so that unused props don't mislead contributors.

#### Acceptance Criteria

1. The `EventRow` component SHALL NOT accept `isConflicting` or `conflictTitles` props.
2. The `EventGrid` component SHALL NOT pass conflict props to `EventRow`.

### Requirement 7: Deduplicate Conflict Detection

**User Story:** As a developer, I want conflict detection to be computed efficiently, so that performance is optimal.

#### Acceptance Criteria

1. Each `useStarredEvents` hook SHALL call `detectConflicts` only once per events change.

### Requirement 8: Bulk Unstar Safety

**User Story:** As a user selecting many events for removal, I want a confirmation prompt, so that I don't accidentally lose saved events.

#### Acceptance Criteria

1. When removing more than 5 events via bulk unstar, a confirmation dialog SHALL appear.
2. IF the user cancels, THEN no events are removed.
3. IF the selection is 5 or fewer, THEN no confirmation is required.

### Requirement 9: Steering File Accuracy

**User Story:** As a developer reading project documentation, I want steering files to reflect the actual implementation, so that guidance is trustworthy.

#### Acceptance Criteria

1. The browser-extension-patterns steering file SHALL list all 11 MessageCommand types.

### Requirement 10: Shared Localized Adapter Hook

**User Story:** As a developer, I want the localized adapter logic to be DRY, so that changes only need to be made in one place.

#### Acceptance Criteria

1. A shared `useLocalizedAdapter` hook SHALL exist at `src/ui/shared/hooks/useLocalizedAdapter.ts`.
2. Both popup `App.tsx` and stars `App.tsx` SHALL use the shared hook.

### Requirement 11: Consistent i18n Placeholder Syntax

**User Story:** As a developer, I want a single consistent placeholder pattern, so that there is no ambiguity about how substitutions work.

#### Acceptance Criteria

1. The `eventCountIndicator` message SHALL use `$1`/`$2` placeholder syntax.
2. The `EventList` component SHALL use `getLocalizedMessage` with substitutions array.

### Requirement 12: Remove Stale .gitkeep Files

**User Story:** As a contributor, I want the repository to be clean of unnecessary placeholder files, so that the codebase looks professional.

#### Acceptance Criteria

1. All `.gitkeep` files in directories that contain other files SHALL be removed.

### Requirement 13: Features Directory Cleanup

**User Story:** As a new contributor, I want to understand what the features directory is for, so that I know where to add new functionality.

#### Acceptance Criteria

1. The `src/features/` directory SHALL contain a `README.md` explaining its purpose.
2. The `.gitkeep` file in `src/features/` SHALL be removed.

### Requirement 14: Correct CI Action Versions

**User Story:** As a maintainer, I want CI to use stable action versions, so that builds don't fail due to non-existent tags.

#### Acceptance Criteria

1. The CI workflow SHALL use `actions/checkout@v4`.
2. The CI workflow SHALL use `pnpm/action-setup@v4`.
3. The CI workflow SHALL use `actions/setup-node@v4`.
4. The CI workflow SHALL use `actions/upload-artifact@v4`.

### Requirement 15: CONTRIBUTING.md

**User Story:** As a potential contributor, I want a contributing guide, so that I know how to set up the project and submit changes.

#### Acceptance Criteria

1. A `CONTRIBUTING.md` file SHALL exist at the repository root.
2. It SHALL reference TDD workflow, commit format, coding conventions, and how to run tests.

### Requirement 16: Build Integrity

**User Story:** As a maintainer, I want all changes to pass CI checks, so that the main branch never has build errors.

#### Acceptance Criteria

1. `pnpm run lint` SHALL pass with zero errors after all changes.
2. `pnpm run typecheck` SHALL pass with zero errors after all changes.
3. `pnpm vitest run` SHALL pass all tests after all changes.
4. `pnpm run build` SHALL complete successfully after all changes.
