/**
 * Unit test: Concurrent fetchEvents race condition.
 *
 * When multiple onStorageChanged events fire rapidly (e.g., after bulk unstar),
 * multiple fetchEvents calls run concurrently. If a slower response arrives
 * after a faster one, it can overwrite state with stale data, causing
 * already-removed events to reappear.
 *
 * The fix: fetchEvents should discard stale responses (use a generation counter
 * or similar mechanism to ensure only the latest fetch sets state).
 *
 * // Feature: unstar-revert-bug, Concurrent fetchEvents race
 *
 * Validates: Requirements 1.3, 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { StarredEvent, SortOrder } from '#core/types';
import { useStarredEvents } from '#ui/popup/hooks/useStarredEvents';

function makeEvent(id: string, title: string): StarredEvent {
  return {
    id,
    title,
    description: null,
    location: 'Visby',
    organiser: 'Test Org',
    topic: null,
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    sourceUrl: `https://example.com/${id}`,
    icsDataUri: null,
    starred: true,
    starredAt: '2026-06-01T10:00:00.000Z',
  };
}

describe('Concurrent fetchEvents race — stale responses overwrite newer state', () => {
  it('stale fetchEvents response does NOT overwrite newer state', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
    ];

    let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

    // Track fetch call order and simulate delayed responses
    let fetchCallCount = 0;
    const pendingResponses: Array<{
      resolve: (value: unknown) => void;
      data: StarredEvent[];
    }> = [];

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        fetchCallCount++;
        // Return a promise we control manually
        return new Promise((resolve) => {
          // Simulate different storage states at different times:
          // First call: all 3 events still in storage (stale)
          // Second call: only 2 events (event-1 removed)
          // Third call: only 1 event (event-1 and event-2 removed)
          let data: StarredEvent[];
          if (fetchCallCount === 1) {
            // Initial load — all events
            data = [...allEvents];
            resolve({ success: true, data });
          } else {
            // Subsequent fetches — we'll resolve manually to control order
            data = fetchCallCount === 2
              ? allEvents.slice(1) // event-1 removed
              : allEvents.slice(2); // event-1 and event-2 removed
            pendingResponses.push({ resolve, data });
          }
        });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
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

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events.length).toBe(3);

    // Unstar events 1 and 2
    act(() => {
      result.current.unstarEvent('event-1');
      result.current.unstarEvent('event-2');
    });

    expect(result.current.events.length).toBe(1); // Only event-3 visible

    // Confirm both (toasts expire)
    act(() => {
      result.current.confirmUnstar('event-1');
      result.current.confirmUnstar('event-2');
    });

    // Trigger two rapid storage changes (simulating background processing)
    act(() => {
      storageChangedCallback!({ starredEvents: { newValue: allEvents.slice(1) } });
      storageChangedCallback!({ starredEvents: { newValue: allEvents.slice(2) } });
    });

    // Now we have 2 pending fetchEvents calls
    // Resolve them in REVERSE order (stale response arrives last)
    expect(pendingResponses.length).toBe(2);

    // Resolve the SECOND (newer) fetch first — returns [event-3]
    await act(async () => {
      pendingResponses[1]!.resolve({ success: true, data: pendingResponses[1]!.data });
      await Promise.resolve();
    });

    // At this point, state should show only event-3
    expect(result.current.events.length).toBe(1);
    expect(result.current.events[0]!.id).toBe('event-3');

    // Now resolve the FIRST (stale) fetch — returns [event-2, event-3]
    await act(async () => {
      pendingResponses[0]!.resolve({ success: true, data: pendingResponses[0]!.data });
      await Promise.resolve();
    });

    // BUG: The stale response should NOT overwrite the newer state
    // event-2 should NOT reappear
    expect(
      result.current.events.find((e: StarredEvent) => e.id === 'event-2'),
      'Stale fetchEvents response should not bring back event-2',
    ).toBeUndefined();
    expect(result.current.events.length).toBe(1);

    unmount();
  });
});
