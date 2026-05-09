# Bugfix Requirements Document

## Introduction

When a user unstars an event, the removal does not persist. The event reappears in the popup after the undo toast expires, and unstarring all events on the Stars Page causes them to reappear in both the popup and the Stars Page itself. The root cause is that the deferred deletion pattern (used for undo support) only removes the event from local React state while leaving it in `storage.local`. The `onStorageChanged` listener then re-fetches from storage and restores the locally-hidden event before `confirmUnstar` has a chance to actually remove it from storage.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user unstars an event in the popup and waits for the undo toast to expire THEN the system re-displays the unstarred event in the popup because the `onStorageChanged` listener re-fetches from storage where the event still exists

1.2 WHEN a user unstars all events on the Stars Page and then opens the popup THEN the system shows the unstarred events in the popup because they were never removed from storage during the pending-deletion window

1.3 WHEN a user unstars all events on the Stars Page and the undo toast expires THEN the system repopulates the Stars Page with the unstarred events because any storage change triggers `fetchEvents` which reloads events that are still in storage

1.4 WHEN a user unstars an event and any other storage change occurs before the undo toast expires THEN the system re-displays the unstarred event because `fetchEvents` does not exclude pending-deletion events from its results

### Expected Behavior (Correct)

2.1 WHEN a user unstars an event in the popup and waits for the undo toast to expire THEN the system SHALL permanently remove the event from both local state and storage, and the event SHALL NOT reappear

2.2 WHEN a user unstars all events on the Stars Page and then opens the popup THEN the system SHALL NOT show the unstarred events in the popup

2.3 WHEN a user unstars all events on the Stars Page and the undo toast expires THEN the system SHALL permanently remove the events and the Stars Page SHALL remain empty

2.4 WHEN a user unstars an event and any other storage change occurs before the undo toast expires THEN the system SHALL keep the unstarred event hidden from the UI while it is pending deletion

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user unstars an event and clicks the undo button before the toast expires THEN the system SHALL CONTINUE TO restore the event to the starred list and persist it in storage

3.2 WHEN a user stars a new event from the content script THEN the system SHALL CONTINUE TO display the event in both the popup and Stars Page via the storage change listener

3.3 WHEN a user changes the sort order THEN the system SHALL CONTINUE TO re-sort the displayed events without affecting starred/unstarred state

3.4 WHEN a user has multiple events starred and unstars one THEN the system SHALL CONTINUE TO display the remaining starred events correctly

3.5 WHEN the undo toast expires and `confirmUnstar` sends `UNSTAR_EVENT` to the background THEN the system SHALL CONTINUE TO update the badge count to reflect the new total

---

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UnstarAction { eventId: string, undoClicked: boolean }
  OUTPUT: boolean
  
  // The bug triggers when an event is unstarred and the user does NOT click undo.
  // During the pending-deletion window, any storage re-fetch restores the event.
  RETURN X.undoClicked = false
END FUNCTION
```

## Property Specification

```pascal
// Property: Fix Checking — Unstarred events stay hidden during pending deletion
FOR ALL X WHERE isBugCondition(X) DO
  result ← fetchEvents'(storageState)
  pendingIds ← getPendingDeletionIds()
  ASSERT X.eventId NOT IN visibleEvents(result, pendingIds)
END FOR

// Property: Fix Checking — Unstarred events are removed from storage after toast expires
FOR ALL X WHERE isBugCondition(X) DO
  confirmUnstar'(X.eventId)
  storageAfter ← getStorage()
  ASSERT X.eventId NOT IN storageAfter.starredEvents
END FOR
```

## Preservation Goal

```pascal
// Property: Preservation Checking — Undo restores event correctly
FOR ALL X WHERE NOT isBugCondition(X) DO
  // When user clicks undo, behavior is unchanged
  ASSERT F(X) = F'(X)
END FOR

// Property: Preservation Checking — Non-pending events unaffected by storage refresh
FOR ALL X WHERE NOT isPendingDeletion(X.eventId) DO
  resultBefore ← fetchEvents(storage)
  resultAfter ← fetchEvents'(storage)
  ASSERT resultBefore = resultAfter
END FOR
```
