/**
 * Bug Condition Exploration Property Test: Pending-deletion events reappear on storage refresh.
 *
 * This test encodes the EXPECTED (correct) behavior: after unstarring events and triggering
 * a storage change (which calls fetchEvents), the pending-deletion events should NOT reappear
 * in the visible events list.
 *
 * On UNFIXED code, this test is EXPECTED TO FAIL — failure confirms the bug exists because
 * `fetchEvents` does not filter pending-deletion IDs from the storage results.
 *
 * // Feature: unstar-revert-bug, Property 1: Bug Condition
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';

import { starredEventArrayArb } from '#test/helpers/event-generators';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { StarredEvent, SortOrder } from '#core/types';
import { useStarredEvents } from '#ui/popup/hooks/useStarredEvents';

describe('Property 1: Bug Condition — Pending-deletion events reappear on storage refresh', () => {
  it('unstarred events do NOT reappear in visible events after onStorageChanged triggers fetchEvents', async () => {
    await fc.assert(
      fc.asyncProperty(
        starredEventArrayArb.filter((events) => events.length >= 1),
        fc.constantFrom<SortOrder>('chronological', 'reverse-chronological', 'alphabetical-by-title', 'starred-desc'),
        async (allEvents, sortOrder) => {
          // Generate a random non-empty subset of event IDs as "pending deletions"
          const pendingCount = Math.max(1, Math.floor(Math.random() * allEvents.length));
          const pendingIds = allEvents.slice(0, pendingCount).map((e) => e.id);

          // Track the onStorageChanged callback so we can trigger it manually
          let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

          // Setup mock: initial fetch returns all events, sort order returns the generated one
          const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
          sendMessageMock.mockImplementation((message: { command: string }) => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              return Promise.resolve({ success: true, data: [...allEvents] });
            }
            if (message.command === 'GET_SORT_ORDER') {
              return Promise.resolve({ success: true, data: sortOrder });
            }
            return Promise.resolve({ success: true, data: undefined });
          });

          const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
          onStorageChangedMock.mockImplementation(
            (cb: (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) => {
              storageChangedCallback = cb;
              return () => { storageChangedCallback = null; };
            },
          );

          // Render the hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

          // Wait for initial load to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify initial state has all events loaded
          expect(result.current.events.length).toBe(allEvents.length);

          // Step 1: Unstar each pending event (adds to pendingDeletions, removes from events)
          act(() => {
            for (const eventId of pendingIds) {
              result.current.unstarEvent(eventId);
            }
          });

          // Verify events are removed from visible list after unstarring
          for (const pendingId of pendingIds) {
            expect(
              result.current.events.find((e: StarredEvent) => e.id === pendingId),
            ).toBeUndefined();
          }

          // Step 2: Trigger onStorageChanged which calls fetchEvents
          // fetchEvents will re-fetch ALL events from storage (including pending-deletion ones)
          expect(storageChangedCallback).not.toBeNull();

          await act(async () => {
            storageChangedCallback!({ starredEvents: { newValue: allEvents } });
          });

          // Step 3: Assert that NONE of the pending-deletion IDs appear in the resulting events
          // This is the EXPECTED BEHAVIOR: input.eventId NOT IN visibleEvents(result, pendingIds)
          const visibleEvents = result.current.events;
          for (const pendingId of pendingIds) {
            expect(
              visibleEvents.find((e: StarredEvent) => e.id === pendingId),
              `Pending-deletion event ${pendingId} should NOT reappear after storage refresh`,
            ).toBeUndefined();
          }

          // Cleanup
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
