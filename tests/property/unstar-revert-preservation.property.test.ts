/**
 * Preservation Property Tests: Non-pending events and undo behavior unchanged.
 *
 * These tests capture baseline behavior on UNFIXED code that must remain unchanged
 * after the bug fix is applied. They verify:
 * 1. With no pending deletions, fetchEvents returns all stored events sorted correctly
 * 2. undoUnstar restores the event to the events list and sends STAR_EVENT to storage
 * 3. Remaining starred events display correctly when one event is unstarred
 *
 * // Feature: unstar-revert-bug, Property 2: Preservation
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';

import { starredEventArrayArb, sortOrderArb } from '#test/helpers/event-generators';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { StarredEvent, SortOrder } from '#core/types';
import { sortEvents } from '#core/sorter';
import { useStarredEvents } from '#ui/popup/hooks/useStarredEvents';

describe('Property 2: Preservation — Non-pending events and undo behavior unchanged', () => {
  // Feature: unstar-revert-bug, Property 2: Preservation
  it('with no pending deletions, onStorageChanged results in events state containing exactly the storage contents (sorted)', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        starredEventArrayArb,
        sortOrderArb,
        async (allEvents, sortOrder) => {
          // Track the onStorageChanged callback so we can trigger it manually
          let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

          // Setup mock: fetch returns all events, sort order returns the generated one
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

          // With NO pending deletions, trigger onStorageChanged
          expect(storageChangedCallback).not.toBeNull();

          await act(async () => {
            storageChangedCallback!({ starredEvents: { newValue: allEvents } });
          });

          // The resulting events should be exactly the storage contents, sorted
          const expected = sortEvents([...allEvents], sortOrder);
          const actual = result.current.events;

          // Same length — no events dropped or added
          expect(actual.length).toBe(expected.length);

          // Same IDs in same order
          const actualIds = actual.map((e: StarredEvent) => e.id);
          const expectedIds = expected.map((e) => e.id);
          expect(actualIds).toEqual(expectedIds);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: unstar-revert-bug, Property 2: Preservation
  it('undoUnstar restores the event to the visible events list and sends STAR_EVENT message', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        starredEventArrayArb.filter((events) => events.length >= 1),
        sortOrderArb,
        async (allEvents, sortOrder) => {
          // Pick a random event to unstar then undo
          const targetIndex = Math.floor(Math.random() * allEvents.length);
          const targetEvent = allEvents[targetIndex]!;

          // Setup mock
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
          onStorageChangedMock.mockImplementation(() => () => {});

          // Render the hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

          // Wait for initial load
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Unstar the target event (adds to pendingDeletions)
          act(() => {
            result.current.unstarEvent(targetEvent.id);
          });

          // Verify event is removed from visible list
          expect(
            result.current.events.find((e: StarredEvent) => e.id === targetEvent.id),
          ).toBeUndefined();

          // Verify event is in pendingDeletions
          expect(
            result.current.pendingDeletions.find((e: StarredEvent) => e.id === targetEvent.id),
          ).toBeDefined();

          // Clear sendMessage mock call history to track the undo call
          sendMessageMock.mockClear();

          // Call undoUnstar
          act(() => {
            result.current.undoUnstar(targetEvent.id);
          });

          // Verify event is restored to visible events list
          expect(
            result.current.events.find((e: StarredEvent) => e.id === targetEvent.id),
          ).toBeDefined();

          // Verify event is removed from pendingDeletions
          expect(
            result.current.pendingDeletions.find((e: StarredEvent) => e.id === targetEvent.id),
          ).toBeUndefined();

          // Verify STAR_EVENT message was sent
          expect(sendMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
              command: 'STAR_EVENT',
              event: expect.objectContaining({ id: targetEvent.id }),
            }),
          );

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: unstar-revert-bug, Property 2: Preservation
  it('remaining events after unstarring one event equal the original list minus the unstarred event', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        starredEventArrayArb.filter((events) => events.length >= 2),
        sortOrderArb,
        async (allEvents, sortOrder) => {
          // Pick a random event to unstar
          const targetIndex = Math.floor(Math.random() * allEvents.length);
          const targetEvent = allEvents[targetIndex]!;

          // Setup mock
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
          onStorageChangedMock.mockImplementation(() => () => {});

          // Render the hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

          // Wait for initial load
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Record events before unstarring (sorted)
          const eventsBefore = [...result.current.events];

          // Unstar the target event
          act(() => {
            result.current.unstarEvent(targetEvent.id);
          });

          // The remaining events (before any storage change) should equal
          // the original list minus the unstarred event
          const eventsAfter = result.current.events;
          const expectedRemaining = eventsBefore.filter((e) => e.id !== targetEvent.id);

          // Same length
          expect(eventsAfter.length).toBe(expectedRemaining.length);

          // Same IDs in same order (unstarring only removes, doesn't re-sort)
          const afterIds = eventsAfter.map((e: StarredEvent) => e.id);
          const expectedIds = expectedRemaining.map((e) => e.id);
          expect(afterIds).toEqual(expectedIds);

          // The unstarred event should not be in the remaining list
          expect(
            eventsAfter.find((e: StarredEvent) => e.id === targetEvent.id),
          ).toBeUndefined();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
