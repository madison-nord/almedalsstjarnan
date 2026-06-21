# Implementation Plan: Content Scraping and Sync

## Overview

This plan implements five related improvements to the Almedalsstjärnan Chrome extension: star button animation stability, comprehensive content scraping from Event_Card sections, ICS export with full content, stars page language sync, and stars page star sync enhancement. All changes use TypeScript strict mode within the existing Manifest V3, React, Tailwind, and Shadow DOM architecture.

## Tasks

- [x] 1. Star button animation stability
  - [x] 1.1 Add update guard to `createStarButton` in `src/extension/star-button.ts`
    - Add early return in `update(newStarred)` when `newStarred === starred` to skip redundant re-renders
    - Ensure `render()` is only called when state actually changes
    - Verify animation only triggers on `false → true` transitions (CSS handles this via `aria-pressed="true"` selector)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Write property tests for star button update idempotence and isolation
    - **Property 1: Star Button Update Idempotence** — calling `update(S)` on a button already in state S produces no DOM changes
    - **Property 2: Star Button Animation Direction** — `star-pop` animation triggers if and only if transitioning to `true`
    - **Property 3: Star Button Isolation** — `updateAllButtonsForEvent(targetId, state)` leaves non-target buttons unchanged
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    - Test file: `tests/property/star-button-update-guard.property.test.ts`

  - [x] 1.3 Write unit tests for star button update guard
    - Test: calling `update(true)` on an already-starred button does not re-assign innerHTML
    - Test: calling `update(false)` on an unstarred button does not re-assign innerHTML
    - Test: calling `update(true)` on an unstarred button renders filled SVG with `aria-pressed="true"`
    - Test: calling `update(false)` on a starred button renders outlined SVG with `aria-pressed="false"`
    - Test file: `tests/unit/content/star-button-guard.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Comprehensive content scraping
  - [x] 2.1 Implement `extractContentSections` in `src/core/event-normalizer.ts`
    - Add `CONTENT_SECTION_HEADINGS` constant array with the 5 known heading strings
    - Add `MAX_DESCRIPTION_LENGTH` constant (10000)
    - Add `ContentSection` interface with `heading` and `paragraphs` fields
    - Implement `extractContentSections(element: Element): string | null` that walks h3 headings in the collapse div, collects sibling paragraphs, trims, filters empty, assembles with `\n\n` between sections
    - Truncate final output to `MAX_DESCRIPTION_LENGTH`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [x] 2.2 Integrate `extractContentSections` into `normalizeEvent`
    - Replace `extractDomDescription(element)` call with `extractContentSections(element)`
    - Change description priority to prefer DOM content over ICS short summary: `trimOrNull(domDescription ?? icsFields?.description)`
    - _Requirements: 2.1, 2.8_

  - [x] 2.3 Write property tests for content section extraction
    - **Property 4: Content Section Extraction Completeness** — for any Event_Card DOM with a non-empty subset of 5 headings, output contains each heading label followed by colon and paragraph text in DOM order
    - **Property 5: Content Description Length Invariant** — output never exceeds 10000 characters
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9, 2.10, 2.11**
    - Test file: `tests/property/content-section-extraction.property.test.ts`

  - [x] 2.4 Write unit tests for content scraper
    - Test: Event_Card with all 5 sections produces correct formatted output
    - Test: Event_Card with subset of sections produces only those sections
    - Test: Event_Card with no known sections returns null
    - Test: Whitespace-only paragraphs are excluded
    - Test: Output is trimmed of leading/trailing whitespace
    - Test: Output longer than 10000 chars is truncated
    - Test: Paragraphs within a section are joined with `\n`
    - Test file: `tests/unit/core/content-scraper.test.ts`
    - _Requirements: 2.1, 2.6, 2.7, 2.9, 2.10, 2.11_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. ICS export with full content verification
  - [x] 4.1 Verify ICS generator handles long descriptions correctly
    - Confirm `foldLine` correctly handles multi-section descriptions up to 10000 chars
    - Confirm `escapeICSText` escapes `\`, `,`, `;`, and `\n` in multi-section content
    - Confirm `buildDescription` appends source URL with locale label after full content
    - Add any edge-case handling if needed for very large inputs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Write property tests for ICS text handling with full content
    - **Property 6: ICS Text Escape Round-Trip** — `escapeICSText` followed by unescape produces original string
    - **Property 7: ICS Line Folding Octet Limit** — every folded line is ≤75 octets UTF-8
    - **Property 8: ICS Description Assembly With Source URL** — output ends with locale-appropriate label + URL when sourceUrl is non-null
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - Test file: `tests/property/ics-full-content.property.test.ts`

  - [x] 4.3 Write unit tests for ICS export with multi-section descriptions
    - Test: Full multi-section description appears in VEVENT DESCRIPTION property
    - Test: Newlines in description are escaped as `\n`
    - Test: Long description is properly folded at 75-octet boundaries
    - Test: Source URL appended with "Källa:" for sv locale
    - Test: Source URL appended with "Source:" for en locale
    - Test: Null description + null sourceUrl omits DESCRIPTION property
    - Test file: `tests/unit/core/ics-full-content.test.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Stars page language sync
  - [x] 5.1 Extend `useStarredEvents` hook to accept `onLanguageChange` callback
    - Add optional `onLanguageChange` parameter to hook signature (via options object or direct param)
    - In the existing `adapter.onStorageChanged` listener, add detection for `'languagePreference'` key changes
    - Call `onLanguageChange(newValue)` when language preference changes in storage
    - Maintain single listener that handles both `starredEvents` and `languagePreference`
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 5.2 Update Stars page `App.tsx` to pass language change handler
    - Pass `setLocale` as the `onLanguageChange` callback to `useStarredEvents`
    - Remove or keep the initial `GET_LANGUAGE_PREFERENCE` fetch (still needed for mount)
    - Verify re-render propagates new locale to all child components including `ExportButton`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.3 Write unit tests for language sync
    - Test: Storage change with `languagePreference` key triggers `onLanguageChange` callback
    - Test: Storage change without `languagePreference` key does not trigger callback
    - Test: New locale value propagates to ICS export (correct label used)
    - Test: Listener is cleaned up on unmount
    - Test file: `tests/unit/stars/language-sync.test.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Stars page star sync enhancement
  - [x] 6.1 Add selection state cleanup to `useStarredEvents` in `src/ui/stars/hooks/useStarredEvents.ts`
    - After setting events from `fetchEvents`, compute new event ID set
    - Filter `selectedIds` to only include IDs still present in the updated event list
    - Use referential equality check to avoid unnecessary re-renders when nothing changed
    - _Requirements: 5.4_

  - [x] 6.2 Write property tests for selection cleanup and fetch generation
    - **Property 9: Selection State Cleanup on Event List Change** — resulting selection equals intersection of selected IDs and current event IDs
    - **Property 10: Fetch Generation Staleness** — only the latest fetch response is applied to state
    - **Validates: Requirements 5.4, 5.5**
    - Test file: `tests/property/stars-sync-selection.property.test.ts`

  - [x] 6.3 Write unit tests for star sync behavior
    - Test: Unstarring from popup removes event from stars grid
    - Test: Starring from popup adds event to stars grid in sort order
    - Test: Selected IDs for removed events are cleaned up
    - Test: Rapid storage changes only apply latest fetch result
    - Test: Sort order, filter text, and scroll position are preserved across syncs
    - Test file: `tests/unit/stars/star-sync.test.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design confirms no changes needed to `escapeICSText`, `foldLine`, or `buildDescription` — task 4.1 is a verification pass that may result in no code changes
- All tests use Vitest + fast-check per project conventions, with mocks via `tests/helpers/mock-browser-api.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] }
  ]
}
```
