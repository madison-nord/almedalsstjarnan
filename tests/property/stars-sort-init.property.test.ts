// Feature: stars-page-sorting, Property 1: Stars Page initializes to chronological

/**
 * Property-based test: Stars Page initializes to chronological.
 *
 * For any stored sort order value in the sortOrder storage key (including
 * absent/invalid values), the Stars Page useStarredEvents hook SHALL initialize
 * its sort order state to 'chronological' without reading the stored value.
 *
 * Validates: Requirements 1.1, 1.5
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';

import { sortOrderArb } from '#test/helpers/event-generators';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

describe('Property 1: Stars Page initializes to chronological', () => {
  /**
   * Validates: Requirements 1.1, 1.5
   *
   * For any stored sort order, the hook initializes to 'chronological'
   * and never sends GET_SORT_ORDER.
   */
  it(
    'hook initializes sortOrder to chronological regardless of stored value',
    { timeout: 60_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(sortOrderArb, async (storedSortOrder) => {
          // Setup mock: even if GET_SORT_ORDER were called, it would return the stored value
          const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
          sendMessageMock.mockImplementation((message: { command: string }) => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              return Promise.resolve({ success: true, data: [] });
            }
            if (message.command === 'GET_SORT_ORDER') {
              return Promise.resolve({ success: true, data: storedSortOrder });
            }
            return Promise.resolve({ success: true, data: undefined });
          });

          const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>;
          onStorageChangedMock.mockImplementation(() => () => {});

          // Render the hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

          // Wait for initial load to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // The sort order must always be 'chronological' regardless of stored value
          expect(result.current.sortOrder).toBe('chronological');

          // GET_SORT_ORDER should never have been called
          const sendMessageCalls = sendMessageMock.mock.calls as Array<[{ command: string }]>;
          const getSortOrderCalls = sendMessageCalls.filter(
            ([msg]) => msg.command === 'GET_SORT_ORDER',
          );
          expect(getSortOrderCalls).toHaveLength(0);

          unmount();
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Validates: Requirements 1.1, 1.5
   *
   * Even with invalid/absent stored values, the hook initializes to 'chronological'.
   */
  it(
    'hook initializes to chronological even with invalid stored sort order values',
    { timeout: 60_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('invalid-sort'),
            fc.string(),
            fc.integer(),
          ),
          async (invalidStoredValue) => {
            // Setup mock: GET_SORT_ORDER returns an invalid value
            const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
            sendMessageMock.mockImplementation((message: { command: string }) => {
              if (message.command === 'GET_ALL_STARRED_EVENTS') {
                return Promise.resolve({ success: true, data: [] });
              }
              if (message.command === 'GET_SORT_ORDER') {
                return Promise.resolve({ success: true, data: invalidStoredValue });
              }
              return Promise.resolve({ success: true, data: undefined });
            });

            const onStorageChangedMock = mockBrowserApi.onStorageChanged as ReturnType<
              typeof vi.fn
            >;
            onStorageChangedMock.mockImplementation(() => () => {});

            // Render the hook
            const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi, null));

            // Wait for initial load to complete
            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // The sort order must always be 'chronological'
            expect(result.current.sortOrder).toBe('chronological');

            // GET_SORT_ORDER should never have been called
            const sendMessageCalls = sendMessageMock.mock.calls as Array<[{ command: string }]>;
            const getSortOrderCalls = sendMessageCalls.filter(
              ([msg]) => msg.command === 'GET_SORT_ORDER',
            );
            expect(getSortOrderCalls).toHaveLength(0);

            unmount();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
