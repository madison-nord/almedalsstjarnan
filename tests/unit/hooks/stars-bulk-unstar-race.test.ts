/**
 * Unit test: Bulk unstar race condition on Stars Page.
 *
 * Tests the scenario where all events are unstarred at once (via unstarSelected),
 * then all toasts expire simultaneously, triggering multiple confirmUnstar calls.
 * Each confirmUnstar sends UNSTAR_EVENT to background, which removes events from
 * storage one by one, each triggering onStorageChanged → fetchEvents.
 *
 * The bug: some events reappear because of timing issues in the cascade of
 * storage changes and fetchEvents calls.
 *
 * // Feature: unstar-revert-bug, Bulk unstar race condition
 *
 * Validates: Requirements 1.3, 2.3
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { StarredEvent, SortOrder } from '#core/types';
import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

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

describe('Bulk unstar on Stars Page — all events removed at once', () => {
  it('all events stay hidden when multiple toasts expire and trigger cascading storage changes', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
      makeEvent('event-4', 'Debatt D'),
      makeEvent('event-5', 'Föreläsning E'),
    ];

    // Simulate storage that removes events as UNSTAR_EVENT is processed
    let storageContents = [...allEvents];
    let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...storageContents] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      if (message.command === 'UNSTAR_EVENT') {
        // Background removes the event from storage
        storageContents = storageContents.filter((e) => e.id !== message.eventId);
        // Simulate the storage change notification (async, like real Chrome)
        Promise.resolve().then(() => {
          if (storageChangedCallback) {
            storageChangedCallback({ starredEvents: { newValue: storageContents } });
          }
        });
        return Promise.resolve({ success: true, data: undefined });
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

    // Verify all 5 events loaded
    expect(result.current.events.length).toBe(5);

    // Step 1: Unstar ALL events (simulates "Remove all" / unstarSelected)
    act(() => {
      for (const event of allEvents) {
        result.current.unstarEvent(event.id);
      }
    });

    // All events should be gone from visible list
    expect(result.current.events.length).toBe(0);
    expect(result.current.pendingDeletions.length).toBe(5);

    // Step 2: All toasts expire simultaneously → confirmUnstar for each
    act(() => {
      for (const event of allEvents) {
        result.current.confirmUnstar(event.id);
      }
    });

    // pendingDeletions should be cleared
    expect(result.current.pendingDeletions.length).toBe(0);

    // Step 3: Let all the async storage changes propagate
    // Each UNSTAR_EVENT triggers a storage change notification
    await act(async () => {
      // Allow microtasks to flush (storage change callbacks)
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Step 4: Assert NO events reappear
    expect(
      result.current.events.length,
      `Expected 0 events but got ${result.current.events.length}: ${result.current.events.map((e: StarredEvent) => e.title).join(', ')}`,
    ).toBe(0);

    unmount();
  });

  it('events stay hidden even when storage changes arrive out of order', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
    ];

    let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    // Simulate: GET_ALL_STARRED_EVENTS returns progressively fewer events
    // as background processes UNSTAR_EVENT calls
    let storageState = [...allEvents];

    sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...storageState] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      if (message.command === 'UNSTAR_EVENT') {
        storageState = storageState.filter((e) => e.id !== message.eventId);
        return Promise.resolve({ success: true, data: undefined });
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

    // Unstar all
    act(() => {
      for (const event of allEvents) {
        result.current.unstarEvent(event.id);
      }
    });

    expect(result.current.events.length).toBe(0);

    // Confirm all (toasts expire)
    act(() => {
      for (const event of allEvents) {
        result.current.confirmUnstar(event.id);
      }
    });

    // Simulate: background processes event-1 removal, storage change fires
    // But events 2 and 3 are still in storage at this point
    storageState = allEvents.filter((e) => e.id !== 'event-1');

    await act(async () => {
      storageChangedCallback!({ starredEvents: { newValue: storageState } });
    });

    // Events 2 and 3 should NOT reappear (still in pendingDeletionsRef)
    expect(result.current.events.length).toBe(0);

    // Now background processes event-2
    storageState = storageState.filter((e) => e.id !== 'event-2');

    await act(async () => {
      storageChangedCallback!({ starredEvents: { newValue: storageState } });
    });

    expect(result.current.events.length).toBe(0);

    // Finally background processes event-3
    storageState = storageState.filter((e) => e.id !== 'event-3');

    await act(async () => {
      storageChangedCallback!({ starredEvents: { newValue: storageState } });
    });

    // All gone
    expect(result.current.events.length).toBe(0);

    unmount();
  });
});
