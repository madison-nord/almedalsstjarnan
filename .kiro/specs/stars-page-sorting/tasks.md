# Implementation Plan: Stars Page Sorting

## Overview

Decouple the Stars Page sort state from the shared persisted storage key and add conditional day-grouping. The implementation proceeds in three phases: (1) add the `isTimeBasedSort` utility, (2) refactor the Stars Page hook to use local-only state, (3) update EventGrid for conditional grouping.

## Tasks

- [ ] 1. Add `isTimeBasedSort` utility to sorter module
  - [x] 1.1 Add `isTimeBasedSort(order: SortOrder): boolean` function to `src/core/sorter.ts`
    - Returns `true` for `'chronological'` and `'reverse-chronological'`
    - Returns `false` for `'alphabetical-by-title'` and `'starred-desc'`
    - Export from `src/core/index.ts`
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Write property test for `isTimeBasedSort`
    - **Property 6: Non-time-based sort produces flat output**
    - **Validates: Requirements 2.2**
    - File: `tests/property/is-time-based-sort.property.test.ts`
    - For any sort order, verify `isTimeBasedSort` returns true only for chronological and reverse-chronological

- [ ] 2. Refactor Stars Page `useStarredEvents` hook to use local-only sort state
  - [x] 2.1 Remove `GET_SORT_ORDER` fetch from `init()` in `src/ui/stars/hooks/useStarredEvents.ts`
    - Remove the `GET_SORT_ORDER` message send from the `Promise.all` in `init()`
    - Initialize `sortOrder` state directly to `DEFAULT_SORT_ORDER` (already the default, just remove the async override)
    - Remove `GetSortOrderResponse` import if unused
    - _Requirements: 1.1, 1.5_
  - [x] 2.2 Remove `SET_SORT_ORDER` persistence from `changeSortOrder`
    - Remove `void adapter.sendMessage({ command: 'SET_SORT_ORDER', sortOrder: order })` from `changeSortOrder`
    - Keep the `setSortOrder(order)` and `setEvents` re-sort logic
    - _Requirements: 1.2_
  - [x] 2.3 Remove `sortOrder` handling from `onStorageChanged` listener
    - The listener currently only reacts to `'starredEvents'` changes, so verify no `sortOrder` handling exists
    - If the listener reacts to `sortOrder` changes, remove that branch
    - _Requirements: 1.4_
  - [x] 2.4 Write property test: Stars Page initializes to chronological
    - **Property 1: Stars Page initializes to chronological**
    - **Validates: Requirements 1.1, 1.5**
    - File: `tests/property/stars-sort-init.property.test.ts`
    - For any stored sort order, verify the hook initializes to 'chronological'
  - [x] 2.5 Write property test: Stars Page sort change never persists
    - **Property 2: Stars Page sort change never persists**
    - **Validates: Requirements 1.2**
    - File: `tests/property/stars-sort-no-persist.property.test.ts`
    - For any sort order, verify changeSortOrder does not send SET_SORT_ORDER
  - [x] 2.6 Write property test: Stars Page ignores external sort order changes
    - **Property 3: Stars Page ignores external sort order changes**
    - **Validates: Requirements 1.4**
    - File: `tests/property/stars-sort-ignore-storage.property.test.ts`
    - For any storage change to sortOrder key, verify hook sort state is unchanged
  - [x] 2.7 Write property test: Popup sort change always persists
    - **Property 4: Popup sort change always persists**
    - **Validates: Requirements 1.3, 4.3**
    - File: `tests/property/popup-sort-persists.property.test.ts`
    - For any sort order, verify popup changeSortOrder sends SET_SORT_ORDER

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update EventGrid for conditional day-grouping
  - [x] 4.1 Add `sortOrder` prop to `EventGridProps` in `src/ui/stars/components/EventGrid.tsx`
    - Add `readonly sortOrder: SortOrder` to the interface
    - Import `SortOrder` and `isTimeBasedSort` from `#core/sorter`
    - _Requirements: 2.1, 2.2_
  - [x] 4.2 Implement conditional rendering logic in EventGrid
    - When `isTimeBasedSort(sortOrder)` is true: use existing grouped rendering with `groupEventsByDate`
    - When false: render events directly as `EventRow` elements without `SectionHeader` wrappers
    - Always render `<thead>` with column headers regardless of sort order
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 4.3 Pass `sortOrder` prop from `App.tsx` to `EventGrid`
    - Update the `<EventGrid>` usage in `src/ui/stars/App.tsx` to include `sortOrder={sortOrder}`
    - _Requirements: 2.1, 2.2_
  - [x] 4.4 Write property test: Time-based sort produces correctly ordered day-groups
    - **Property 5: Time-based sort produces correctly ordered day-groups**
    - **Validates: Requirements 2.1, 3.1, 3.2**
    - File: `tests/property/day-group-ordering.property.test.ts`
    - For any event array and time-based sort, verify groups are in correct date order
  - [x] 4.5 Write property test: Within-group events ordered by start time ascending
    - **Property 7: Within-group events ordered by start time ascending with id tiebreaker**
    - **Validates: Requirements 3.3, 3.4**
    - File: `tests/property/within-group-ordering.property.test.ts`
    - For any event array and time-based sort, verify within-group ordering
  - [x] 4.6 Write unit tests for EventGrid conditional rendering
    - File: `tests/unit/stars-event-grid.test.tsx`
    - Test: chronological sort renders SectionHeader elements
    - Test: alphabetical sort renders no SectionHeader elements
    - Test: column headers always rendered for all sort orders
    - Test: switching sort order dynamically updates rendering
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "tasks": [1, 2], "description": "Add isTimeBasedSort utility and refactor Stars Page hook (independent, can be parallel)" },
    { "tasks": [3], "description": "Checkpoint - verify tests pass" },
    { "tasks": [4], "description": "Update EventGrid for conditional day-grouping" },
    { "tasks": [5], "description": "Final checkpoint - verify all tests pass" }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The popup hook (`src/ui/popup/hooks/useStarredEvents.ts`) requires NO code changes — Requirement 4 is satisfied by not touching it
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and rendering behavior
- Each task references specific requirements for traceability
- Existing property tests (`sorter-ordering`, `date-grouping`) already cover some related behavior and remain valid
