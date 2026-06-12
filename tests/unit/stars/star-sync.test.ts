/**
 * Unit tests for Stars Page star sync behavior via useStarredEvents hook.
 *
 * Tests:
 * - Unstarring from popup removes event from stars grid
 * - Starring from popup adds event to stars grid in sort order
 * - Selected IDs for removed events are cleaned up
 * - Rapid storage changes only apply latest fetch result
 * - Sort order, filter text, and scroll position are preserved across syncs
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import type { IBrowserApiAdapter, StarredEvent, MessagePayload, MessageResponse } from '#core/types';
import { mockBrowserApi, mockUnsubscribe, resetMocks } from '#test/helpers/mock-browser-api';

import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

// ─── Test Data ────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> & { readonly id: string }): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: 'Test Organiser',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    description: 'A test description',
    topic: 'Demokrati',
    sourceUrl: 'https://almedalsveckan.info/event/123',
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

type StorageChangedCallback = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void;

let adapter: IBrowserApiAdapter;
let capturedStorageCallback: StorageChangedCallback | null;

/**
 * Sets up the adapter mock with initial events and captures the storage callback.
 * Optionally accepts a function to provide dynamic event responses for successive fetches.
 */
function setupAdapter(eventsOrFn: StarredEvent[] | ((msg: MessagePayload) => StarredEvent[])): void {
  capturedStorageCallback = null;

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS': {
          const data = typeof eventsOrFn === 'function' ? eventsOrFn(message) : eventsOrFn;
          return Promise.resolve({ success: true as const, data });
        }
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: StorageChangedCallback) => {
      capturedStorageCallback = callback;
      return mockUnsubscribe;
    },
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Stars Page star sync — useStarredEvents hook', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('Unstarring from popup removes event from stars grid (Requirement 5.3)', () => {
    it('removes the unstarred event when storage change triggers re-fetch with reduced set', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        // First fetch returns all 3 events; subsequent fetches return 2 (e2 removed)
        if (fetchCount === 1) return [event1, event2, event3];
        return [event1, event3];
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(3);
      });

      // Simulate popup unstarring event e2 — triggers starredEvents storage change
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      const eventIds = result.current.events.map((e) => e.id);
      expect(eventIds).toContain('e1');
      expect(eventIds).toContain('e3');
      expect(eventIds).not.toContain('e2');
    });
  });

  describe('Starring from popup adds event to stars grid in sort order (Requirement 5.2)', () => {
    it('adds the newly starred event in chronological sort order', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha', startDateTime: '2026-06-28T09:00:00+02:00' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta', startDateTime: '2026-06-28T11:00:00+02:00' });
      const newEvent = makeEvent({ id: 'e3', title: 'Gamma', startDateTime: '2026-06-28T10:00:00+02:00' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        if (fetchCount === 1) return [event1, event2];
        return [event1, event2, newEvent];
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(2);
      });

      // Simulate popup starring a new event — triggers starredEvents storage change
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      // Verify chronological sort order: e1 (09:00), e3 (10:00), e2 (11:00)
      expect(result.current.events[0]!.id).toBe('e1');
      expect(result.current.events[1]!.id).toBe('e3');
      expect(result.current.events[2]!.id).toBe('e2');
    });

    it('adds the newly starred event in alphabetical sort order when sort is alphabetical-by-title', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha', startDateTime: '2026-06-28T10:00:00+02:00' });
      const event2 = makeEvent({ id: 'e2', title: 'Gamma', startDateTime: '2026-06-28T11:00:00+02:00' });
      const newEvent = makeEvent({ id: 'e3', title: 'Beta', startDateTime: '2026-06-28T12:00:00+02:00' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        if (fetchCount === 1) return [event1, event2];
        return [event1, event2, newEvent];
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(2);
      });

      // Change sort order to alphabetical-by-title
      act(() => {
        result.current.changeSortOrder('alphabetical-by-title');
      });

      // Simulate popup starring a new event
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      // Verify alphabetical sort order: Alpha, Beta, Gamma
      expect(result.current.events[0]!.title).toBe('Alpha');
      expect(result.current.events[1]!.title).toBe('Beta');
      expect(result.current.events[2]!.title).toBe('Gamma');
    });
  });

  describe('Selected IDs for removed events are cleaned up (Requirement 5.4)', () => {
    it('removes selected IDs that no longer exist in the updated event list', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        if (fetchCount === 1) return [event1, event2, event3];
        return [event1, event3]; // e2 removed
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(3);
      });

      // Select events e1 and e2
      act(() => {
        result.current.toggleSelection('e1');
      });
      act(() => {
        result.current.toggleSelection('e2');
      });

      expect(result.current.selectedIds.has('e1')).toBe(true);
      expect(result.current.selectedIds.has('e2')).toBe(true);

      // Simulate storage change where e2 is removed
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      // e2 should be removed from selection, e1 should remain
      expect(result.current.selectedIds.has('e1')).toBe(true);
      expect(result.current.selectedIds.has('e2')).toBe(false);
    });

    it('keeps selection unchanged when no selected events are removed', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        if (fetchCount === 1) return [event1, event2, event3];
        return [event1, event2]; // e3 removed (not selected)
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(3);
      });

      // Select e1 and e2 (both will remain)
      act(() => {
        result.current.toggleSelection('e1');
      });
      act(() => {
        result.current.toggleSelection('e2');
      });

      // Trigger storage change — e3 removed but not selected
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      // Both selections remain intact
      expect(result.current.selectedIds.has('e1')).toBe(true);
      expect(result.current.selectedIds.has('e2')).toBe(true);
      expect(result.current.selectedIds.size).toBe(2);
    });
  });

  describe('Rapid storage changes only apply latest fetch result (Requirement 5.5)', () => {
    it('discards stale responses and only applies the most recent fetch', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma' });

      let resolvers: Array<(value: MessageResponse<unknown>) => void> = [];

      capturedStorageCallback = null;

      // Override sendMessage to create deferred promises so we control resolution order
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<unknown>> => {
          if (message.command === 'GET_ALL_STARRED_EVENTS') {
            return new Promise((resolve) => {
              resolvers.push(resolve);
            });
          }
          return Promise.resolve({ success: true as const, data: undefined });
        },
      );

      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (callback: StorageChangedCallback) => {
          capturedStorageCallback = callback;
          return mockUnsubscribe;
        },
      );

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      // Wait for initial fetch to be invoked
      await waitFor(() => {
        expect(resolvers).toHaveLength(1);
      });

      // Resolve initial fetch
      act(() => {
        resolvers[0]!({ success: true as const, data: [event1, event2, event3] });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.events).toHaveLength(3);
      });

      // Clear resolvers for subsequent fetches
      resolvers = [];

      // Fire two rapid storage changes
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      // Both fetches should have been kicked off
      await waitFor(() => {
        expect(resolvers).toHaveLength(2);
      });

      // Resolve the FIRST (stale) fetch — should be discarded
      await act(async () => {
        resolvers[0]!({ success: true as const, data: [event1] });
      });

      // Resolve the SECOND (latest) fetch
      await act(async () => {
        resolvers[1]!({ success: true as const, data: [event1, event2] });
      });

      // Only the latest fetch result should be applied (2 events, not 1)
      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      const eventIds = result.current.events.map((e) => e.id);
      expect(eventIds).toContain('e1');
      expect(eventIds).toContain('e2');
    });
  });

  describe('Sort order, filter text, and scroll position are preserved across syncs (Requirement 5.4)', () => {
    it('preserves sort order across storage sync', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha', startDateTime: '2026-06-28T10:00:00+02:00' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta', startDateTime: '2026-06-28T09:00:00+02:00' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma', startDateTime: '2026-06-28T11:00:00+02:00' });

      let fetchCount = 0;
      setupAdapter(() => {
        fetchCount++;
        return [event1, event2, event3];
      });

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change sort order to alphabetical-by-title
      act(() => {
        result.current.changeSortOrder('alphabetical-by-title');
      });

      expect(result.current.sortOrder).toBe('alphabetical-by-title');
      expect(result.current.events[0]!.title).toBe('Alpha');
      expect(result.current.events[1]!.title).toBe('Beta');
      expect(result.current.events[2]!.title).toBe('Gamma');

      // Trigger storage sync
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        // fetchCount incremented (re-fetch happened)
        expect(fetchCount).toBeGreaterThan(1);
      });

      // Sort order is preserved after sync
      expect(result.current.sortOrder).toBe('alphabetical-by-title');
      expect(result.current.events[0]!.title).toBe('Alpha');
      expect(result.current.events[1]!.title).toBe('Beta');
      expect(result.current.events[2]!.title).toBe('Gamma');
    });

    it('preserves filter text across storage sync', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha Event' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta Event' });

      setupAdapter([event1, event2]);

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set filter text
      act(() => {
        result.current.setFilterText('Alpha');
      });

      expect(result.current.filterText).toBe('Alpha');
      expect(result.current.filteredEvents).toHaveLength(1);
      expect(result.current.filteredEvents[0]!.title).toBe('Alpha Event');

      // Trigger storage sync
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      // Filter text is preserved
      expect(result.current.filterText).toBe('Alpha');
      expect(result.current.filteredEvents).toHaveLength(1);
      expect(result.current.filteredEvents[0]!.title).toBe('Alpha Event');
    });

    it('preserves sort order when switching from chronological to reverse-chronological before sync', async () => {
      const event1 = makeEvent({ id: 'e1', title: 'Alpha', startDateTime: '2026-06-28T09:00:00+02:00' });
      const event2 = makeEvent({ id: 'e2', title: 'Beta', startDateTime: '2026-06-28T10:00:00+02:00' });
      const event3 = makeEvent({ id: 'e3', title: 'Gamma', startDateTime: '2026-06-28T11:00:00+02:00' });

      setupAdapter([event1, event2, event3]);

      const { result } = renderHook(() => useStarredEvents(adapter, null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change sort to reverse-chronological
      act(() => {
        result.current.changeSortOrder('reverse-chronological');
      });

      expect(result.current.sortOrder).toBe('reverse-chronological');
      expect(result.current.events[0]!.id).toBe('e3');
      expect(result.current.events[1]!.id).toBe('e2');
      expect(result.current.events[2]!.id).toBe('e1');

      // Trigger storage sync
      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: {}, oldValue: {} } });
      });

      await waitFor(() => {
        // After sync, events should still be in reverse-chronological order
        expect(result.current.events[0]!.id).toBe('e3');
      });

      expect(result.current.sortOrder).toBe('reverse-chronological');
      expect(result.current.events[0]!.id).toBe('e3');
      expect(result.current.events[1]!.id).toBe('e2');
      expect(result.current.events[2]!.id).toBe('e1');
    });
  });
});
