# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Pending-deletion events reappear on storage refresh
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — unstar an event (adding to pendingDeletions), then trigger `onStorageChanged` which calls `fetchEvents`, and assert the pending-deletion event does NOT reappear in the visible events list
  - File: `tests/property/unstar-revert-bug-condition.property.test.ts`
  - Use `starredEventArrayArb` from `tests/helpers/event-generators.ts` to generate random event lists
  - Generate a random subset of event IDs as "pending deletions"
  - Simulate the sequence: call `unstarEvent(id)` for each pending ID → trigger `onStorageChanged` (which calls `fetchEvents` with full storage contents) → assert none of the pending IDs appear in the resulting `events` state
  - The test assertions should match the Expected Behavior Properties from design: `input.eventId NOT IN visibleEvents(result, pendingIds)`
  - Use `mockBrowserApi` from `tests/helpers/mock-browser-api.ts` and `renderHook` from `@testing-library/react-hooks`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists because `fetchEvents` does not filter pending-deletion IDs)
  - Document counterexamples found: after `onStorageChanged` fires, `fetchEvents` overwrites local state with full storage contents including pending-deletion events
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-pending events and undo behavior unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - File: `tests/property/unstar-revert-preservation.property.test.ts`
  - Observe on UNFIXED code: with no pending deletions, `fetchEvents` returns all stored events sorted correctly
  - Observe on UNFIXED code: `undoUnstar` restores the event to the events list and sends `STAR_EVENT` to storage
  - Observe on UNFIXED code: remaining starred events display correctly when one event is unstarred (before any storage change)
  - Write property-based test 1: for all event arrays with NO pending deletions, triggering `onStorageChanged` results in events state containing exactly the storage contents (sorted) — no events are dropped or added
  - Write property-based test 2: for all event arrays, calling `undoUnstar` on a pending-deletion event restores it to the visible events list and sends `STAR_EVENT` message
  - Write property-based test 3: for all event arrays and any single unstarred event, the remaining events (before storage change) equal the original list minus the unstarred event
  - Use `starredEventArrayArb` and `sortOrderArb` from `tests/helpers/event-generators.ts`
  - Use `mockBrowserApi` from `tests/helpers/mock-browser-api.ts`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for unstar revert bug — pending-deletion events reappear on storage refresh

  - [x] 3.1 Implement the fix in `src/ui/popup/hooks/useStarredEvents.ts`
    - Add `pendingDeletionsRef = useRef<Set<string>>(new Set())` to track pending-deletion IDs
    - Update `unstarEvent`: add `eventId` to `pendingDeletionsRef.current` before filtering state
    - Update `confirmUnstar`: remove `eventId` from `pendingDeletionsRef.current` before clearing state and sending message
    - Update `undoUnstar`: remove `eventId` from `pendingDeletionsRef.current` before restoring event
    - Update `fetchEvents`: after fetching from storage, filter out events whose IDs are in `pendingDeletionsRef.current` before sorting and setting state
    - _Bug_Condition: isBugCondition(input) where input.eventId IN pendingDeletionIds AND storageChangeOccurred AND NOT undoClicked_
    - _Expected_Behavior: pending-deletion events NOT IN visibleEvents after fetchEvents_
    - _Preservation: non-pending events unaffected; undo restores event; sort order preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Implement the fix in `src/ui/stars/hooks/useStarredEvents.ts`
    - Same changes as 3.1: add `pendingDeletionsRef`, update `unstarEvent`, `confirmUnstar`, `undoUnstar`, and `fetchEvents`
    - Ensure the Stars Page hook also filters pending-deletion IDs from storage refresh results
    - _Bug_Condition: isBugCondition(input) where input.eventId IN pendingDeletionIds AND storageChangeOccurred AND NOT undoClicked_
    - _Expected_Behavior: pending-deletion events NOT IN visibleEvents after fetchEvents_
    - _Preservation: non-pending events unaffected; undo restores event; sort/filter/selection preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Pending-deletion events stay hidden on storage refresh
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `vitest --run tests/property/unstar-revert-bug-condition.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `fetchEvents` now filters pending-deletion IDs)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-pending events and undo behavior unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `vitest --run tests/property/unstar-revert-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — non-pending events still display correctly, undo still works)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `vitest --run` to execute the full test suite
  - Verify all existing property tests in `tests/property/` still pass
  - Verify all unit tests in `tests/unit/` still pass
  - Ensure no regressions in unrelated functionality
  - Ask the user if questions arise
