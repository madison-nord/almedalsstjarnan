// Feature: stars-page-sorting, Property 3: Stars Page ignores external sort order changes

/**
 * Property 3: Stars Page ignores external sort order changes
 *
 * For any current Stars Page sort order and any external storage change to the
 * `sortOrder` key, the Stars Page hook's sort order state SHALL remain equal to
 * its value before the storage change.
 *
 * Validates: Requirements 1.4
 */

import { describe, it, expect } from 'vitest';
import type { vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';

import { sortOrderArb, starredEventArrayArb } from '#test/helpers/event-generators';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import type { SortOrder } from '#core/types';
import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

describe('Property 3: Stars Page ignores external sort order changes', () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any initial sort order set locally and any external storage change
   * containing a different sortOrder value, the hook's sortOrder state remains
   * unchanged.
   */
  it('hook sort order is unchanged after external storage change to sortOrder key', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        starredEventArrayArb,
        sortOrderArb,
        sortOrderArb,
        async (events, localSortOrder, externalSortOrder) => {
          // Track the onStorageChanged callback so we can trigger it manually
          let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null = null;

          // Setup mock: fetch returns events
          const sendMessageMock = mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>;
          sendMessageMock.mockImplementation((message: { command: string }) => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              return Promise.resolve({ success: true, data: [...events] });
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

          // Render the hook
          const { result, unmount } = renderHook(() => useStarredEvents(mockBrowserApi));

          // Wait for initial load to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Optionally change the local sort order
          act(() => {
            result.current.changeSortOrder(localSortOrder);
          });

          // Record the sort order before external change
          const sortOrderBefore: SortOrder = result.current.sortOrder;
          expect(sortOrderBefore).toBe(localSortOrder);

          // Simulate an external storage change that includes sortOrder key
          expect(storageChangedCallback).not.toBeNull();
          await act(async () => {
            storageChangedCallback!({
              sortOrder: {
                oldValue: localSortOrder,
                newValue: externalSortOrder,
              },
            });
          });

          // The hook's sort order should remain unchanged
          expect(result.current.sortOrder).toBe(sortOrderBefore);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
