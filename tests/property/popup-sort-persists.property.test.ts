/**
 * Property-based test: Popup sort change always persists.
 *
 * For any sort order value, when changeSortOrder is called on the Popup hook,
 * the adapter SHALL receive a SET_SORT_ORDER message with the chosen sort order.
 *
 * // Feature: stars-page-sorting, Property 4: Popup sort change always persists
 *
 * Validates: Requirements 1.3, 4.3
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, waitFor, act } from '@testing-library/react';

import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';
import { sortOrderArb } from '#test/helpers/event-generators';
import type { SortOrder, StarredEvent } from '#core/types';
import { useStarredEvents } from '#ui/popup/hooks/useStarredEvents';

describe('Property 4: Popup sort change always persists', () => {
  it('changeSortOrder sends SET_SORT_ORDER with the chosen sort order', async () => {
    await fc.assert(
      fc.asyncProperty(sortOrderArb, async (order: SortOrder) => {
        resetMocks();

        const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
        sendMessageMock.mockImplementation((message: { command: string }) => {
          if (message.command === 'GET_ALL_STARRED_EVENTS') {
            return Promise.resolve({ success: true, data: [] as StarredEvent[] });
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

        // Call changeSortOrder with the generated sort order
        act(() => {
          result.current.changeSortOrder(order);
        });

        // Verify SET_SORT_ORDER was sent with the correct sort order
        expect(sendMessageMock).toHaveBeenCalledWith({
          command: 'SET_SORT_ORDER',
          sortOrder: order,
        });

        unmount();
      }),
      { numRuns: 100 },
    );
  }, 30000);
});
