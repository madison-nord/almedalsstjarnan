# Implementation Plan: Code Review Fixes

## Overview

Fix all 16 issues identified during code review. Each task follows TDD where behavioral changes are involved — write/update tests first, then implement. Tasks are ordered so that foundational changes (formatting, metadata) come first, then component changes, then final verification.

## Tasks

- [x] 1. Fix license and package metadata
  - [x] 1.1 Change `package.json` `"license"` from `"MIT"` to `"GPL-3.0-only"`
  - [x] 1.2 Change `package.json` `"author"` from `""` to `"Almedalsstjärnan Contributors"`
  - [x] 1.3 Update README.md last section from "MIT" to "GPL-3.0"
  - [x] 1.4 Verify `pnpm run typecheck` passes
- [x] 2. Fix star button dimensions and remove dead CSS
  - [x] 2.1 Write/update unit test asserting star button has 32×32px dimensions and SVG is 16×16px
  - [x] 2.2 Update `STAR_BUTTON_CSS` in `src/extension/star-button.ts`: `.star-btn` width/height to 32px, `.star-btn svg` width/height to 16px
  - [x] 2.3 Delete `src/extension/star-button.css`
  - [x] 2.4 Run tests to verify star-button tests pass and no broken imports
- [x] 3. Normalize code formatting
  - [x] 3.1 Run `pnpm run format` to normalize all files
  - [x] 3.2 Verify `pnpm run format:check` passes
  - [x] 3.3 Verify `pnpm run lint` still passes
- [x] 4. Thread locale prop to EventItem and EventRow
  - [x] 4.1 Write unit test for EventItem verifying formatEventDateTime receives the locale prop
  - [x] 4.2 Write unit test for EventRow verifying formatEventDateTime receives the locale prop
  - [x] 4.3 Add `locale` prop to EventItemProps and replace hardcoded 'sv'
  - [x] 4.4 Add `locale` prop to EventListProps and pass down to EventItem
  - [x] 4.5 Add `locale` prop to EventRowProps and replace hardcoded 'sv'
  - [x] 4.6 Remove `isConflicting` and `conflictTitles` from EventRowProps
  - [x] 4.7 Add `locale` prop to EventGridProps, pass to EventRow, remove conflict pass-through
  - [x] 4.8 Update popup App.tsx to pass `locale ?? 'sv'` to EventList
  - [x] 4.9 Update stars App.tsx to pass `locale ?? 'sv'` to EventGrid
  - [x] 4.10 Run typecheck and tests to verify
- [x] 5. Deduplicate conflict detection in hooks
  - [x] 5.1 Merge two useMemo blocks in popup useStarredEvents into one calling detectConflicts once
  - [x] 5.2 Merge two useMemo blocks in stars useStarredEvents into one calling detectConflicts once
  - [x] 5.3 Run tests to verify existing property and unit tests pass
- [x] 6. Add bulk unstar confirmation
  - [x] 6.1 Add `bulkUnstarConfirm` key to both locale files
  - [x] 6.2 Write unit test: selectedIds.size > 5 and confirm returns false → no events removed
  - [x] 6.3 Write unit test: selectedIds.size > 5 and confirm returns true → events removed
  - [x] 6.4 Write unit test: selectedIds.size <= 5 → no confirmation shown
  - [x] 6.5 Implement confirmation in stars useStarredEvents unstarSelected callback
  - [x] 6.6 Run tests to verify
- [x] 7. Extract shared useLocalizedAdapter hook
  - [x] 7.1 Create `src/ui/shared/hooks/useLocalizedAdapter.ts`
  - [x] 7.2 Write unit test for hook with locale set
  - [x] 7.3 Write unit test for hook with locale null
  - [x] 7.4 Refactor popup App.tsx to use shared hook
  - [x] 7.5 Refactor stars App.tsx to use shared hook
  - [x] 7.6 Run typecheck and tests to verify
- [x] 8. Fix i18n placeholder consistency
  - [x] 8.1 Update eventCountIndicator in both locale files to use $1/$2 syntax
  - [x] 8.2 Write unit test verifying EventList count renders correctly with substitution
  - [x] 8.3 Update EventList.tsx to use getLocalizedMessage with substitutions array
  - [x] 8.4 Run tests to verify
- [x] 9. Update steering file message commands
  - [x] 9.1 Update browser-extension-patterns.md to list all 11 MessageCommand types
- [x] 10. Remove stale .gitkeep files
  - [x] 10.1 Delete src/core/.gitkeep, src/extension/manifest/.gitkeep, tests/unit/core/.gitkeep, tests/unit/extension/.gitkeep, tests/helpers/.gitkeep, tests/e2e/.gitkeep, src/features/.gitkeep
- [x] 11. Handle empty features directory
  - [x] 11.1 Add src/features/README.md explaining reserved purpose
- [x] 12. Fix CI action versions
  - [x] 12.1 Change all @v6 refs in ci.yml to @v4
- [x] 13. Add CONTRIBUTING.md
  - [x] 13.1 Create CONTRIBUTING.md with prerequisites, setup, TDD workflow, tests, commit format, and coding conventions sections
- [x] 14. Final build integrity verification
  - [x] 14.1 Run pnpm run lint — zero errors
  - [x] 14.2 Run pnpm run typecheck — zero errors
  - [x] 14.3 Run pnpm vitest run — all tests pass
  - [x] 14.4 Run pnpm run build — success
  - [x] 14.5 Run pnpm run format:check — zero warnings

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2] },
    { "wave": 2, "tasks": [3] },
    { "wave": 3, "tasks": [4, 9, 10, 11, 12, 13] },
    { "wave": 4, "tasks": [5] },
    { "wave": 5, "tasks": [6] },
    { "wave": 6, "tasks": [7] },
    { "wave": 7, "tasks": [8] },
    { "wave": 8, "tasks": [14] }
  ]
}
```

## Notes

- Tasks 9–13 are independent of the code changes (tasks 4–8) and can be done in any order after formatting (task 3).
- Task 14 (final verification) depends on ALL prior tasks being complete.
- The TDD pattern applies to tasks 2, 4, 6, 7, and 8 where behavioral changes are made.
