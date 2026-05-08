/**
 * Unit test: unstarSelected followed by all toasts expiring.
 *
 * Tests that when bulk unstar is used and all toasts expire,
 * ALL events are actually removed from storage (UNSTAR_EVENT sent for each).
 *
 * // Feature: unstar-revert-bug, Bulk unstar confirm
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

describe('Stars Page: unstarSelected → confirmUnstar for all', () => {
  it('sends UNSTAR_EVENT for every event when all toasts expire', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
      makeEvent('event-4', 'Debatt D'),
      makeEvent('event-5', 'Föreläsning E'),
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

    expect(result.current.selectedIds.size).toBe(5);

    // Bulk unstar
    act(() => {
      result.current.unstarSelected();
    });

    // Events should be gone from visible list
    expect(result.current.events.length).toBe(0);
    // All should be in pendingDeletions
    expect(result.current.pendingDeletions.length).toBe(5);

    // Simulate all toasts expiring — confirmUnstar for each
    act(() => {
      // Get the pending deletion IDs before confirming
      const pendingIds = result.current.pendingDeletions.map((e: StarredEvent) => e.id);
      for (const id of pendingIds) {
        result.current.confirmUnstar(id);
      }
    });

    // All pendingDeletions should be cleared
    expect(result.current.pendingDeletions.length).toBe(0);

    // CRITICAL: UNSTAR_EVENT should have been sent for ALL 5 events
    expect(unstarredIds.length).toBe(5);
    expect(unstarredIds.sort()).toEqual(['event-1', 'event-2', 'event-3', 'event-4', 'event-5']);

    unmount();
  });

  it('all events end up in pendingDeletions when unstarSelected is called', async () => {
    const allEvents: StarredEvent[] = [
      makeEvent('event-1', 'Seminarium A'),
      makeEvent('event-2', 'Workshop B'),
      makeEvent('event-3', 'Panel C'),
    ];

    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    sendMessageMock.mockImplementation((message: { command: string }) => {
      if (message.command === 'GET_ALL_STARRED_EVENTS') {
        return Promise.resolve({ success: true, data: [...allEvents] });
      }
      if (message.command === 'GET_SORT_ORDER') {
        return Promise.resolve({ success: true, data: 'chronological' as SortOrder });
      }
      return Promise.resolve({ success: true, data: undefined });
    });

    const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
    onStorageChangedMock.mockImplementation(() => () => {});

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all
    act(() => {
      result.current.selectAll();
    });

    // Bulk unstar
    act(() => {
      result.current.unstarSelected();
    });

    // ALL events should be in pendingDeletions
    const pendingIds = result.current.pendingDeletions.map((e: StarredEvent) => e.id).sort();
    expect(pendingIds).toEqual(['event-1', 'event-2', 'event-3']);

    unmount();
  });
});
