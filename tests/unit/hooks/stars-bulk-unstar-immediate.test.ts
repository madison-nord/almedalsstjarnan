/**
 * Unit test: Bulk unstar should immediately remove from storage.
 *
 * When the user uses the bulk "unstar selected" action on the Stars Page,
 * events should be removed from storage immediately (no 5-second undo delay).
 * The undo toast pattern is for single-event accidental click protection,
 * not for explicit bulk actions.
 *
 * // Feature: unstar-revert-bug, Immediate bulk unstar
 *
 * Validates: Requirements 2.3
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

describe('Stars Page: unstarSelected sends UNSTAR_EVENT immediately', () => {
  it('sends UNSTAR_EVENT for all selected events immediately without waiting for toast', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
    ];

    const unstarredIds: string[] = [];

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...allEvents] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      if (message.command === 'UNSTAR_EVENT') {
        unstarredIds.push(message.eventId!);
        return Promise.resolve({ success: true, data: undefined });
      }
      return Promise.resolve({ success: true, data: undefined });
    });

    const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
    onStorageChangedMock.mockImplementation(() => () => {});

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all events
    act(() => {
      result.current.selectAll();
    });

    // Bulk unstar
    act(() => {
      result.current.unstarSelected();
    });

    // CRITICAL: UNSTAR_EVENT should be sent IMMEDIATELY for all events
    // (no waiting for 5-second toast timer)
    expect(unstarredIds.sort()).toEqual(['event-1', 'event-2', 'event-3']);

    // Events should be gone from visible list
    expect(result.current.events.length).toBe(0);

    // No pending deletions (bulk action skips undo toast)
    expect(result.current.pendingDeletions.length).toBe(0);

    unmount();
  });

  it('single unstar still uses deferred deletion with undo toast', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
    ];

    const unstarredIds: string[] = [];

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...allEvents] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      if (message.command === 'UNSTAR_EVENT') {
        unstarredIds.push(message.eventId!);
        return Promise.resolve({ success: true, data: undefined });
      }
      return Promise.resolve({ success: true, data: undefined });
    });

    const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
    onStorageChangedMock.mockImplementation(() => () => {});

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Single unstar (NOT bulk)
    act(() => {
      result.current.unstarEvent('event-1');
    });

    // Should NOT send UNSTAR_EVENT immediately (deferred for undo)
    expect(unstarredIds.length).toBe(0);

    // Should be in pendingDeletions (undo toast shown)
    expect(result.current.pendingDeletions.length).toBe(1);

    unmount();
  });
});
