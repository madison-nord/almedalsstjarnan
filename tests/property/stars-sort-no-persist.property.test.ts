/**
 * Property-based test: Stars Page sort change never persists.
 *
 * For any sort order value, when changeSortOrder is called on the Stars Page hook,
 * the adapter SHALL NOT receive a SET_SORT_ORDER message and the sortOrder storage
 * key SHALL remain unchanged.
 *
 * // Feature: stars-page-sorting, Property 2: Stars Page sort change never persists
 *
 * Validates: Requirements 1.2
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';

import { sortOrderArb, starredEventArrayArb } from '#test/helpers/event-generators';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

describe('Property 2: Stars Page sort change never persists', () => {
  // Feature: stars-page-sorting, Property 2: Stars Page sort change never persists
  it(
    'changeSortOrder does not send SET_SORT_ORDER message for any sort order',
    { timeout: 60_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(starredEventArrayArb, sortOrderArb, async (events, newSortOrder) => {
          // Setup mock: return events for GET_ALL_STARRED_EVENTS
          const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
          sendMessageMock.mockImplementation((message: { command: string }) => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              return Promise.resolve({ success: true, data: [...events] });
            }
            return Promise.resolve({ success: true, data: undefined });
          });

          const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
          onStorageChangedMock.mockImplementation(() => () => {});

          // Render the Stars Page hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

          // Wait for initial load to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Clear mock call history after initialization
          sendMessageMock.mockClear();

          // Call changeSortOrder with the generated sort order
          act(() => {
            result.current.changeSortOrder(newSortOrder);
          });

          // Verify SET_SORT_ORDER was NOT sent
          const allCalls = sendMessageMock.mock.calls as Array<[{ command: string }]>;
          const setSortOrderCalls = allCalls.filter(([msg]) => msg.command === 'SET_SORT_ORDER');
          expect(setSortOrderCalls).toHaveLength(0);

          unmount();
        }),
        { numRuns: 100 },
      );
    },
  );
});
