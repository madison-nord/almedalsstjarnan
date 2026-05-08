/**
 * Unit test: confirmUnstar race condition.
 *
 * Tests the scenario where confirmUnstar is called (toast expires),
 * but before the background processes UNSTAR_EVENT and removes the event
 * from storage, another storage change fires. This triggers fetchEvents
 * which reloads from storage — if the event ID was already removed from
 * pendingDeletionsRef, the event reappears.
 *
 * The fix: pendingDeletionsRef should NOT remove the ID until AFTER
 * the storage write is confirmed (i.e., the resulting onStorageChanged
 * no longer contains the event).
 *
 * // Feature: unstar-revert-bug, Race Condition in confirmUnstar
 *
 * Validates: Requirements 2.1, 2.4
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { StarredEvent, SortOrder } from '#core/types';
import { useStarredEvents } from '#ui/popup/hooks/useStarredEvents';

describe('confirmUnstar race condition — event reappears after toast expires', () => {
  it('event does NOT reappear when storage change fires between confirmUnstar and background processing', async () => {
    const testEvent: StarredEvent = {
      id: 'event-1',
      title: 'Seminarium A',
      description: 'A test event',
      location: 'Visby',
      organiser: 'Test Org',
      topic: 'Politik',
      startDateTime: '2026-06-28T10:00:00+02:00',
      endDateTime: '2026-06-28T11:00:00+02:00',
      sourceUrl: 'https://example.com/event-1',
      icsDataUri: null,
      starred: true,
      starredAt: '2026-06-01T10:00:00.000Z',
    };

    const allEvents: StarredEvent[] = [testEvent];

    let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        // Always returns the event from storage (simulating background hasn't processed UNSTAR_EVENT yet)
        return Promise.resolve({ success: true, data: [...allEvents] });
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

    // Verify initial state
    expect(result.current.events.length).toBe(1);
    expect(result.current.events[0]!.id).toBe('event-1');

    // Step 1: Unstar the event (simulates user clicking unstar)
    act(() => {
      result.current.unstarEvent('event-1');
    });

    // Event should be gone from visible list, in pendingDeletions
    expect(result.current.events.length).toBe(0);
    expect(result.current.pendingDeletions.length).toBe(1);

    // Step 2: Toast expires → confirmUnstar is called
    act(() => {
      result.current.confirmUnstar('event-1');
    });

    // pendingDeletions should be cleared
    expect(result.current.pendingDeletions.length).toBe(0);

    // Step 3: BEFORE background processes UNSTAR_EVENT, another storage change fires
    // (e.g., another tab starred a new event, or sort order changed)
    // The event is STILL in storage because background hasn't removed it yet
    expect(storageChangedCallback).not.toBeNull();

    await act(async () => {
      storageChangedCallback!({ starredEvents: { newValue: allEvents } });
    });

    // Step 4: Assert the event does NOT reappear
    // BUG: With current code, confirmUnstar removes from pendingDeletionsRef,
    // so fetchEvents no longer filters it, and the event reappears
    expect(
      result.current.events.find((e: StarredEvent) => e.id === 'event-1'),
      'Event should NOT reappear after confirmUnstar + storage change race',
    ).toBeUndefined();

    unmount();
  });

  it('event is properly removed once background confirms the storage write', async () => {
    const testEvent: StarredEvent = {
      id: 'event-1',
      title: 'Seminarium A',
      description: 'A test event',
      location: 'Visby',
      organiser: 'Test Org',
      topic: 'Politik',
      startDateTime: '2026-06-28T10:00:00+02:00',
      endDateTime: '2026-06-28T11:00:00+02:00',
      sourceUrl: 'https://example.com/event-1',
      icsDataUri: null,
      starred: true,
      starredAt: '2026-06-01T10:00:00.000Z',
    };

    let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;
    let storageContents: StarredEvent[] = [testEvent];

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...storageContents] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      if (message.command === 'UNSTAR_EVENT') {
        // Simulate background removing the event from storage
        storageContents = storageContents.filter((e) => e.id !== message.eventId);
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

    // Unstar and confirm
    act(() => {
      result.current.unstarEvent('event-1');
    });
    act(() => {
      result.current.confirmUnstar('event-1');
    });

    // Now simulate the storage change AFTER background has processed it
    // (event is no longer in storage)
    expect(storageChangedCallback).not.toBeNull();

    await act(async () => {
      storageChangedCallback!({ starredEvents: { newValue: storageContents } });
    });

    // Event should not be in the list (it's gone from storage)
    expect(result.current.events.length).toBe(0);

    unmount();
  });
});
