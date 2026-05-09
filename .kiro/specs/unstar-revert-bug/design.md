# Unstar Revert Bug — Bugfix Design

## Overview

The deferred deletion pattern used for undo support in both `useStarredEvents` hooks (popup and stars page) only removes events from local React state without immediately removing them from `storage.local`. The `onStorageChanged` listener calls `fetchEvents()` which reloads ALL events from storage — including those pending deletion — causing them to reappear in the UI. The fix introduces a pending-deletion filter in `fetchEvents` so that storage refreshes exclude events awaiting confirmation, while preserving the undo flow and all non-unstar behaviors.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — an event is unstarred (pending deletion) and a storage change triggers `fetchEvents` before `confirmUnstar` removes it from storage
- **Property (P)**: The desired behavior — pending-deletion events remain hidden from the UI even when storage is re-fetched
- **Preservation**: Existing undo behavior, mouse-click starring, sort order changes, badge updates, and storage listener reactivity must remain unchanged
- **`fetchEvents`**: The async function in both `useStarredEvents` hooks that sends `GET_ALL_STARRED_EVENTS` to background and sets local state with the sorted result
- **`pendingDeletions`**: React state array holding `StarredEvent` objects that have been unstarred but not yet confirmed (awaiting undo timeout)
- **`confirmUnstar`**: Callback that sends `UNSTAR_EVENT` to background, actually removing the event from `storage.local`
- **`onStorageChanged`**: Adapter method wrapping `chrome.storage.onChanged`; triggers `fetchEvents` when `starredEvents` key changes

## Bug Details

### Bug Condition

The bug manifests when a user unstars an event and any storage change occurs before the undo toast expires. The `fetchEvents` function reloads all events from storage (where the pending-deletion event still exists) and overwrites local state, causing the hidden event to reappear.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { eventId: string, storageChangeOccurred: boolean, undoClicked: boolean }
  OUTPUT: boolean

  RETURN input.eventId IN pendingDeletionIds
         AND input.storageChangeOccurred = true
         AND input.undoClicked = false
END FUNCTION
```

### Examples

- User unstars event "Seminarium A" in popup → toast appears → sort order changes → `onStorageChanged` fires → `fetchEvents` reloads "Seminarium A" from storage → event reappears in popup list
- User unstars all 5 events on Stars Page → toasts appear → starring a new event from content script triggers storage change → all 5 events reappear on Stars Page
- User unstars event "Workshop B" → another tab stars a new event → storage change propagates → "Workshop B" reappears in popup
- User unstars event "Panel C" → no other storage change occurs → toast expires → `confirmUnstar` removes from storage → event stays gone (bug does NOT manifest without intermediate storage change)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Clicking the undo button before toast expiry restores the event to the starred list and persists it in storage
- Starring a new event from the content script displays it in both popup and Stars Page via the storage change listener
- Changing sort order re-sorts displayed events without affecting starred/unstarred state
- Remaining starred events continue to display correctly when one event is unstarred
- Badge count updates correctly when `confirmUnstar` sends `UNSTAR_EVENT` to background
- Export functionality continues to export only visible (non-pending) events

**Scope:**
All inputs that do NOT involve a storage refresh while events are pending deletion should be completely unaffected by this fix. This includes:
- Normal starring of events (content script → background → storage change → UI update)
- Sort order changes
- Language preference changes
- Onboarding state changes
- Direct undo actions (clicking undo button)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **`unstarEvent` only updates local state**: In both hooks, `unstarEvent` calls `setEvents(prev => prev.filter(...))` and adds to `pendingDeletions`, but never communicates with storage. The event remains in `storage.local`.

2. **`fetchEvents` has no awareness of pending deletions**: When `onStorageChanged` fires and triggers `fetchEvents`, the function fetches ALL events from storage via `GET_ALL_STARRED_EVENTS` and sets them directly into state — it does not filter out events that are in the `pendingDeletions` array.

3. **`onStorageChanged` fires on ANY storage key change**: The listener checks for `'starredEvents' in changes` but any write to `starredEvents` (including writes from other tabs or the sort order change triggering a re-read) causes a full reload.

4. **Race condition window**: The 5-second undo toast duration creates a window where any storage mutation will trigger the bug. The longer the window, the higher the probability of a conflicting storage change.

## Correctness Properties

Property 1: Bug Condition - Pending-deletion events stay hidden on storage refresh

_For any_ storage change that triggers `fetchEvents` while one or more events are in the `pendingDeletions` array, the resulting visible event list SHALL NOT contain any event whose ID is in the pending-deletion set.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-pending events and undo behavior unchanged

_For any_ input where no events are pending deletion, OR where the user clicks undo, the fixed hooks SHALL produce the same observable behavior as the original hooks — specifically, `fetchEvents` returns all stored events, and `undoUnstar` restores the event to both local state and storage.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/ui/popup/hooks/useStarredEvents.ts`

**Function**: `fetchEvents`

**Specific Changes**:
1. **Access `pendingDeletions` inside `fetchEvents`**: Use a ref (`pendingDeletionsRef`) to track current pending-deletion IDs so the memoized `fetchEvents` callback can read them without re-creating on every render.
2. **Filter storage results**: After fetching events from background, filter out any event whose ID is in the pending-deletions set before calling `setEvents`.

**File**: `src/ui/stars/hooks/useStarredEvents.ts`

**Function**: `fetchEvents`

**Specific Changes**:
1. **Same ref-based approach**: Add a `pendingDeletionsRef` that mirrors `pendingDeletions` state.
2. **Same filter logic**: Filter fetched events against pending-deletion IDs before setting state.

**Detailed implementation for both hooks**:

1. **Add a `pendingDeletionsRef`**:
   ```typescript
   const pendingDeletionsRef = useRef<Set<string>>(new Set());
   ```

2. **Keep the ref in sync with state** (in `unstarEvent` and `confirmUnstar`/`undoUnstar`):
   - In `unstarEvent`: add the eventId to `pendingDeletionsRef.current`
   - In `confirmUnstar`: remove the eventId from `pendingDeletionsRef.current`
   - In `undoUnstar`: remove the eventId from `pendingDeletionsRef.current`

3. **Filter in `fetchEvents`**:
   ```typescript
   const fetchEvents = useCallback(async (order: SortOrder): Promise<void> => {
     const response = await adapter.sendMessage<StarredEvent[]>({
       command: 'GET_ALL_STARRED_EVENTS',
     }) as GetAllStarredEventsResponse;

     if (response.success) {
       const pendingIds = pendingDeletionsRef.current;
       const filtered = pendingIds.size > 0
         ? response.data.filter((e) => !pendingIds.has(e.id))
         : response.data;
       const sorted = sortEvents(filtered, order);
       setEvents(sorted);
     }
   }, [adapter]);
   ```

4. **Update `unstarEvent`** to also add to the ref:
   ```typescript
   const unstarEvent = useCallback((eventId: string): void => {
     pendingDeletionsRef.current.add(eventId);
     setEvents((prev) => {
       const event = prev.find((e) => e.id === eventId);
       if (event) {
         setPendingDeletions((pd) => [...pd, event]);
       }
       return prev.filter((e) => e.id !== eventId);
     });
   }, []);
   ```

5. **Update `confirmUnstar`** to also remove from the ref:
   ```typescript
   const confirmUnstar = useCallback((eventId: string): void => {
     pendingDeletionsRef.current.delete(eventId);
     setPendingDeletions((prev) => prev.filter((e) => e.id !== eventId));
     void adapter.sendMessage({ command: 'UNSTAR_EVENT', eventId });
   }, [adapter]);
   ```

6. **Update `undoUnstar`** to also remove from the ref:
   ```typescript
   const undoUnstar = useCallback((eventId: string): void => {
     pendingDeletionsRef.current.delete(eventId);
     setPendingDeletions((prev) => {
       const event = prev.find((e) => e.id === eventId);
       if (event) {
         setEvents((currentEvents) =>
           sortEvents([...currentEvents, event], sortOrderRef.current),
         );
         void adapter.sendMessage({ command: 'STAR_EVENT', event });
       }
       return prev.filter((e) => e.id !== eventId);
     });
   }, [adapter]);
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that simulate the sequence: unstar an event → trigger a storage change → verify the event reappears in state. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Popup storage refresh after unstar**: Unstar event → simulate `onStorageChanged` → assert event reappears in `events` (will fail on unfixed code — event DOES reappear, confirming bug)
2. **Stars Page storage refresh after unstar**: Same sequence on Stars Page hook (will fail on unfixed code)
3. **Multiple pending deletions**: Unstar 3 events → trigger storage change → assert all 3 reappear (will fail on unfixed code)
4. **Storage change from unrelated key**: Change sort order → verify `starredEvents` change triggers reload (will fail on unfixed code if sort write triggers starredEvents listener)

**Expected Counterexamples**:
- After `onStorageChanged` fires, `fetchEvents` overwrites local state with full storage contents including pending-deletion events
- The `pendingDeletions` array is not consulted during `fetchEvents`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fetchEvents_fixed(sortOrder)
  visibleEvents := getEventsState()
  ASSERT input.eventId NOT IN visibleEvents.map(e => e.id)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT fetchEvents_original(input) = fetchEvents_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random event configurations and storage states
- It catches edge cases like empty pending-deletion sets, single-event lists, and concurrent operations
- It provides strong guarantees that non-pending events are never filtered out

**Test Plan**: Observe behavior on UNFIXED code first for non-pending-deletion scenarios (starring, sorting, undo), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Undo restores event**: Unstar event → call `undoUnstar` → verify event returns to list and is re-starred in storage
2. **Non-pending events unaffected**: With no pending deletions, `fetchEvents` returns all stored events unchanged
3. **Badge count preservation**: After `confirmUnstar`, badge count reflects correct total
4. **Sort order preservation**: Changing sort order re-sorts without dropping or duplicating events

### Unit Tests

- Test `fetchEvents` filters out pending-deletion event IDs after storage refresh
- Test `unstarEvent` adds to both `pendingDeletions` state and `pendingDeletionsRef`
- Test `confirmUnstar` removes from ref, removes from state, and sends `UNSTAR_EVENT`
- Test `undoUnstar` removes from ref, restores to events, and sends `STAR_EVENT`
- Test that with empty `pendingDeletionsRef`, `fetchEvents` returns all events (no filtering)
- Test multiple concurrent pending deletions are all filtered

### Property-Based Tests

- Generate random sets of starred events and random subsets as pending deletions; verify `fetchEvents` result never contains pending IDs
- Generate random event lists with no pending deletions; verify `fetchEvents` result equals full storage contents (preservation)
- Generate random sequences of unstar/undo/confirm actions; verify final state consistency

### Integration Tests

- Test full popup flow: star event → unstar → wait for storage change → verify hidden → toast expires → verify permanently removed
- Test full Stars Page flow: unstar multiple → trigger storage change → verify all remain hidden → toasts expire → verify permanent removal
- Test cross-view consistency: unstar in Stars Page → open popup → verify event not shown in popup
