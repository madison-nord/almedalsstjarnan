/**
 * Unit tests: bulk unstar confirmation dialog behavior.
 *
 * Tests the confirmation threshold (>5 selected events triggers window.confirm)
 * and that cancellation prevents removal.
 *
 * // Feature: code-review-fixes, Bulk unstar confirm
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { describe, it, expect, vi } from 'vitest';
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

function setupSendMessage(allEvents: StarredEvent[]): void {
  const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
  sendMessageMock.mockImplementation((message: { command: string; eventId?: string }) => {
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
}

describe('Stars Page: bulk unstar confirmation dialog', () => {
  it('shows confirmation when selectedIds.size > 5 and does NOT remove events if user cancels', async () => {
    const allEvents: StarredEvent[] = Array.from({ length: 6 }, (_, i) =>
      makeEvent(`event-${i + 1}`, `Event ${i + 1}`),
    );

    setupSendMessage(allEvents);

    const getMessageMock = mockBrowserApi.getMessage as ReturnType<typeof vi.fn>;
    getMessageMock.mockImplementation((key: string) => {
      if (key === 'bulkUnstarConfirm') return 'Do you want to remove these starred events?';
      return '';
    });

    // Mock window.confirm to return false (user cancels)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all 6 events
    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedIds.size).toBe(6);

    // Attempt bulk unstar — confirm returns false
    act(() => {
      result.current.unstarSelected();
    });

    // Confirmation should have been shown
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(confirmSpy).toHaveBeenCalledWith('Do you want to remove these starred events?');

    // Events should NOT be removed
    expect(result.current.events.length).toBe(6);

    // No UNSTAR_EVENT messages sent
    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    const unstarCalls = sendMessageMock.mock.calls.filter(
      (call) => (call[0] as { command: string }).command === 'UNSTAR_EVENT',
    );
    expect(unstarCalls.length).toBe(0);

    confirmSpy.mockRestore();
    unmount();
  });

  it('shows confirmation when selectedIds.size > 5 and removes events if user confirms', async () => {
    const allEvents: StarredEvent[] = Array.from({ length: 6 }, (_, i) =>
      makeEvent(`event-${i + 1}`, `Event ${i + 1}`),
    );

    setupSendMessage(allEvents);

    const getMessageMock = mockBrowserApi.getMessage as ReturnType<typeof vi.fn>;
    getMessageMock.mockImplementation((key: string) => {
      if (key === 'bulkUnstarConfirm') return 'Do you want to remove these starred events?';
      return '';
    });

    // Mock window.confirm to return true (user confirms)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all 6 events
    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedIds.size).toBe(6);

    // Bulk unstar — confirm returns true
    act(() => {
      result.current.unstarSelected();
    });

    // Confirmation should have been shown
    expect(confirmSpy).toHaveBeenCalledOnce();

    // Events should be removed
    expect(result.current.events.length).toBe(0);

    // UNSTAR_EVENT sent for all 6 events
    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    const unstarCalls = sendMessageMock.mock.calls.filter(
      (call) => (call[0] as { command: string }).command === 'UNSTAR_EVENT',
    );
    expect(unstarCalls.length).toBe(6);

    confirmSpy.mockRestore();
    unmount();
  });

  it('does NOT show confirmation when selectedIds.size <= 5', async () => {
    const allEvents: StarredEvent[] = Array.from({ length: 5 }, (_, i) =>
      makeEvent(`event-${i + 1}`, `Event ${i + 1}`),
    );

    setupSendMessage(allEvents);

    // Mock window.confirm — should NOT be called
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all 5 events
    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedIds.size).toBe(5);

    // Bulk unstar
    act(() => {
      result.current.unstarSelected();
    });

    // No confirmation shown
    expect(confirmSpy).not.toHaveBeenCalled();

    // Events should be removed (no confirmation needed)
    expect(result.current.events.length).toBe(0);

    // UNSTAR_EVENT sent for all 5 events
    const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
    const unstarCalls = sendMessageMock.mock.calls.filter(
      (call) => (call[0] as { command: string }).command === 'UNSTAR_EVENT',
    );
    expect(unstarCalls.length).toBe(5);

    confirmSpy.mockRestore();
    unmount();
  });

  it('does not remove events if window.confirm throws', async () => {
    const allEvents: StarredEvent[] = Array.from({ length: 6 }, (_, i) =>
      makeEvent(`event-${i + 1}`, `Event ${i + 1}`),
    );

    setupSendMessage(allEvents);

    const getMessageMock = mockBrowserApi.getMessage as ReturnType<typeof vi.fn>;
    getMessageMock.mockImplementation((key: string) => {
      if (key === 'bulkUnstarConfirm') return 'Do you want to remove these starred events?';
      return '';
    });

    // Mock window.confirm to throw
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => {
      throw new Error('confirm blocked');
    });

    const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select all 6 events
    act(() => {
      result.current.selectAll();
    });

    // Bulk unstar — confirm throws
    act(() => {
      result.current.unstarSelected();
    });

    // Events should NOT be removed (safe default)
    expect(result.current.events.length).toBe(6);

    confirmSpy.mockRestore();
    unmount();
  });
});
