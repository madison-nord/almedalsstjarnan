# Implementation Plan

## Overview

Fix four UI display bugs using the bug condition methodology: write exploration tests to confirm bugs, write preservation tests to capture existing behavior, implement fixes, and verify all tests pass.

## Tasks

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - UI Display Bugs (Duplicate DateTime, Star Propagation, Missing Expansion, Inconsistent Translations)
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the four bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each bug
  - Test 1a: Render `EventItem` with `expanded=true` and valid `startDateTime`/`endDateTime` → assert `formatEventDateTime` output appears exactly once in rendered output (currently appears twice — will FAIL)
  - Test 1b: Create star button with `createStarButton` inside a host element nested in a parent with a click listener → click the star button → assert parent click listener was NOT triggered (currently propagates — will FAIL)
  - Test 1c: Render `EventRow` with an event that has description/topic → query for an expand/collapse toggle button with `aria-expanded` → assert it exists (currently missing — will FAIL)
  - Test 1d: Load Swedish messages → assert `helpModalTitle` matches question framing "Vad kan Almedalsstjärnan göra?" and `helpGroupStarsPageDesc` contains "'Öppna hela listan'" (currently mismatches — will FAIL)
  - Place test file at `tests/property/ui-display-bugs.property.test.ts`
  - Use fast-check for property-based generation of StarredEvent objects with varying null/non-null fields
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Existing Popup, Star Button, Stars Page, and Help Modal Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Collapsed `EventItem` renders date/time, organiser, and location in summary area on unfixed code
  - Observe: Expanded `EventItem` renders topic and description in detail section on unfixed code
  - Observe: Star button toggles `aria-pressed` and calls `onStar`/`onUnstar` callbacks on unfixed code
  - Observe: `EventRow` renders all 6 data columns (title, organiser, date/time, location, topic, actions) on unfixed code
  - Observe: `EventGrid` renders correct number of rows matching event count on unfixed code
  - Observe: All Swedish message keys OTHER than `helpModalTitle` and `helpGroupStarsPageDesc` remain unchanged
  - Write property-based tests using fast-check with `starredEventArbitrary` generating random StarredEvent objects:
    - Property: For all StarredEvent with collapsed state, rendered EventItem contains exactly one `formatEventDateTime` call, organiser (if non-null), and location (if non-null)
    - Property: For all StarredEvent with expanded state, rendered EventItem contains topic (if non-null) and description (if non-null)
    - Property: For all star button interactions, `aria-pressed` reflects the starred state and callbacks are invoked
    - Property: For all StarredEvent arrays, EventGrid row count equals event count
    - Property: For all Swedish message keys not in `{helpModalTitle, helpGroupStarsPageDesc}`, values are unchanged
  - Place test file at `tests/property/ui-display-preservation.property.test.ts`
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix Bug 1 — Remove duplicate date/time from expanded popup

  - [x] 3.1 Remove duplicate `formatEventDateTime` block from expanded section in `EventItem.tsx`
    - Remove the `{event.startDateTime && event.endDateTime && (<p><span className="font-medium text-gray-700">{formatEventDateTime(...)}</span></p>)}` block inside the `{expanded && ...}` section
    - The date/time is already rendered in the always-visible summary area above
    - _Bug_Condition: isBugCondition_DuplicateDateTime(input) where input.expanded = true AND input.startDateTime IS NOT NULL AND input.endDateTime IS NOT NULL_
    - _Expected_Behavior: occurrences(renderedOutput, formatEventDateTime(...)) = 1_
    - _Preservation: Collapsed summary area, topic, and description rendering unchanged_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 3.2 Verify bug condition exploration test for Bug 1 now passes
    - **Property 1: Expected Behavior** - No Duplicate Date/Time
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1a) - do NOT write a new test
    - Run bug condition exploration test for duplicate date/time
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

- [x] 4. Fix Bug 2 — Stop click propagation on star button

  - [x] 4.1 Add `event.stopPropagation()` and `event.preventDefault()` to `handleClick` in `star-button.ts`
    - Update `handleClick` function signature to accept `MouseEvent` parameter: `function handleClick(event: MouseEvent): void`
    - Add `event.stopPropagation();` as the first line of the function body
    - Add `event.preventDefault();` as the second line of the function body
    - This prevents the composed click event from propagating through the Shadow DOM boundary to the host page's card expand/collapse mechanism
    - _Bug_Condition: isBugCondition_AutoUnfold(input) where input.clickTarget = "star-button" AND input.context = "programme-page"_
    - _Expected_Behavior: cardState.expanded = cardState.previousExpanded (no change on star click)_
    - _Preservation: Star toggle, STAR_EVENT/UNSTAR_EVENT messages, cross-page consistency, error flash all unchanged_
    - _Requirements: 2.2, 3.3, 3.7_

  - [x] 4.2 Verify bug condition exploration test for Bug 2 now passes
    - **Property 1: Expected Behavior** - Star Click Does Not Propagate
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1b) - do NOT write a new test
    - Run bug condition exploration test for star click propagation
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2_

- [x] 5. Fix Bug 3 — Add expand/collapse to EventRow on stars page

  - [x] 5.1 Add expand/collapse state and toggle to `EventRow.tsx`
    - Add `useState<boolean>(false)` for `expanded` state
    - Add an expand/collapse toggle button (chevron SVG icon) in the actions column alongside the unstar button
    - Set `aria-expanded={expanded}` on the toggle button
    - Set `aria-label` to `adapter.getMessage('collapseEvent')` when expanded, `adapter.getMessage('expandEvent')` when collapsed
    - Set `title` to `adapter.getMessage('showLess')` when expanded, `adapter.getMessage('showMore')` when collapsed
    - Use the same chevron SVG pattern as `EventItem.tsx` (path `M18 15l-6-6-6 6` / `M6 9l6 6 6-6`)
    - When expanded, render a detail `<tr>` below the main row with `<td colSpan={7}>` containing:
      - Full time range via `formatEventDateTime(event.startDateTime, event.endDateTime, locale)`
      - Topic (if non-null)
      - Description (if non-null, with `stripSourceUrl(event.description, event.sourceUrl)` applied)
    - Import `stripSourceUrl` from `#ui/popup/components/EventItem` (or extract to shared utility)
    - Use existing i18n keys: `expandEvent`, `collapseEvent`, `showMore`, `showLess`
    - Style detail row with `text-xs text-gray-600` consistent with popup's expanded section
    - _Bug_Condition: isBugCondition_NoExpansion(input) where input.page = "stars" AND input.wantsDetails = true_
    - _Expected_Behavior: expandToggle IS NOT NULL AND clicking reveals description, topic, full time range_
    - _Preservation: Existing 6-column row layout, unstar button, checkbox selection, sorting, filtering unchanged_
    - _Requirements: 2.3, 3.4_

  - [x] 5.2 Verify bug condition exploration test for Bug 3 now passes
    - **Property 1: Expected Behavior** - Stars Page Rows Are Expandable
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1c) - do NOT write a new test
    - Run bug condition exploration test for missing expansion
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3_

- [x] 6. Fix Bug 4 — Update Swedish help translations

  - [x] 6.1 Update `_locales/sv/messages.json` with corrected translations
    - Change `helpModalTitle.message` from `"Snabbguide"` to `"Vad kan Almedalsstjärnan göra?"`
    - Change `helpGroupStarsPageDesc.message` from `"En helsidesvy med alla dina stjärnmärkta evenemang i ett överskådligt rutnät. Öppna via länken i popupen."` to `"Klicka på 'Öppna hela listan' i popupen för en helsida med alla dina stjärnmärkta evenemang i ett sökbart, sorterbart rutnät."`
    - _Bug_Condition: isBugCondition_InconsistentTranslation(input) where input.locale = "sv" AND input.key IN {helpModalTitle, helpGroupStarsPageDesc}_
    - _Expected_Behavior: semanticEquivalent(svMessage, enMessage) AND NOT contains(svMessage, vague "länken")_
    - _Preservation: All other Swedish message keys unchanged, help modal structure and 9 feature groups intact_
    - _Requirements: 2.4, 3.5, 3.6_

  - [x] 6.2 Verify bug condition exploration test for Bug 4 now passes
    - **Property 1: Expected Behavior** - Swedish Translations Are Semantically Equivalent
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1d) - do NOT write a new test
    - Run bug condition exploration test for inconsistent translations
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.4_

- [x] 7. Verify all preservation tests still pass
  - **Property 2: Preservation** - All Existing Behavior Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - Run all preservation property tests from step 2
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Confirm collapsed EventItem summary content preserved
  - Confirm expanded EventItem topic/description preserved
  - Confirm star button toggle and callbacks preserved
  - Confirm EventGrid row count and structure preserved
  - Confirm all unchanged Swedish message keys preserved

- [x] 8. Checkpoint - Ensure all tests pass
  - Run `pnpm vitest run` to verify all unit and property tests pass
  - Run `pnpm run lint` to verify no linting errors
  - Run `pnpm run typecheck` to verify no TypeScript errors
  - Ensure all four bug condition tests pass (confirming fixes work)
  - Ensure all preservation tests pass (confirming no regressions)
  - Ask the user if questions arise


## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2] },
    { "wave": 2, "tasks": [3, 4, 5, 6] },
    { "wave": 3, "tasks": [7] },
    { "wave": 4, "tasks": [8] }
  ]
}
```

## Notes

- Exploration tests (task 1) are expected to FAIL on unfixed code — this confirms bugs exist
- Preservation tests (task 2) are expected to PASS on unfixed code — this captures baseline behavior
- After fixes (tasks 3-6), exploration tests should PASS and preservation tests should still PASS
- Use `pnpm vitest run` for single-execution test runs (not watch mode)
- The `stripSourceUrl` utility may need to be extracted to a shared location for use in both `EventItem.tsx` and `EventRow.tsx`
