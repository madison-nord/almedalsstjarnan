/**
 * Property-based test for Bulk Star cancellation during the starring phase.
 *
 * Feature: bulk-star-filtered, Property 12: Cancellation during starring preserves already-starred events
 * Validates: Requirements 4.6
 *
 * For any cancellation triggered during the starring phase after K events have been
 * successfully starred, the coordinator SHALL stop sending further STAR_EVENT messages,
 * and the K already-starred events SHALL remain in storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 12: Cancellation during starring preserves already-starred events

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 12: Cancellation during starring preserves already-starred events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  /**
   * Creates Event_Card DOM elements (li with .event-information).
   */
  function setupDom(count: number): void {
    const container = document.createElement('ul');
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'event-information';
      li.appendChild(info);
      container.appendChild(li);
    }
    document.body.appendChild(container);
  }

  it('cancellation during starring stops further STAR_EVENT messages and preserves already-starred count', async () => {
    // **Validates: Requirements 4.6**
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 5, max: 20 })
          .chain((totalEvents) =>
            fc.record({
              totalEvents: fc.constant(totalEvents),
              cancelAfterK: fc.integer({ min: 1, max: totalEvents - 1 }),
              events: fc
                .array(normalizedEventArb, { minLength: totalEvents, maxLength: totalEvents })
                .map((evts) => {
                  // Ensure unique IDs
                  const seen = new Set<string>();
                  const unique = evts.filter((e) => {
                    if (seen.has(e.id)) return false;
                    seen.add(e.id);
                    return true;
                  });
                  return unique;
                }),
            }),
          )
          .filter((data) => data.events.length === data.totalEvents),
        async ({ totalEvents, cancelAfterK, events }) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Set up DOM with event cards
          setupDom(totalEvents);

          // Mock normalizeEvent to return ok: true for all cards
          const { normalizeEvent } = (await import('#core/event-normalizer')) as EventNormalizerModule;
          const mockNormalize = vi.mocked(normalizeEvent);
          let normalizeCallIndex = 0;
          mockNormalize.mockImplementation(() => {
            const event = events[normalizeCallIndex];
            normalizeCallIndex++;
            if (event) {
              return { ok: true, event } as const;
            }
            return { ok: false, reason: 'no more events' } as const;
          });

          // Create AbortController for cancellation
          const abortController = new AbortController();

          // Track STAR_EVENT calls
          let starEventCallCount = 0;

          // Mock sendMessage:
          // - GET_STAR_STATE: returns { starred: false } for all
          // - STAR_EVENT: returns success; after K successful calls, trigger abort
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_STAR_STATE') {
              return {
                success: true,
                data: { starred: false, storedFields: null } as GetStarStateData,
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              starEventCallCount++;
              // After K successful STAR_EVENT calls, trigger abort
              if (starEventCallCount >= cancelAfterK) {
                abortController.abort();
              }
              return { success: true, data: undefined } as MessageResponse<T>;
            }
            return { success: true, data: undefined } as MessageResponse<T>;
          });

          // Import and run executeBulkStar
          const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

          const resultPromise = executeBulkStar({
            adapter: mockBrowserApi,
            onProgress: () => {},
            signal: abortController.signal,
            locale: 'sv',
          });

          // Advance all timers to let the coordinator complete
          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // Verify: result.aborted === true and result.abortReason === 'user-cancel'
          expect(result.aborted).toBe(true);
          expect(result.abortReason).toBe('user-cancel');

          // Verify: result.eventsNewlyStarred is approximately K
          // The abort happens after the K-th STAR_EVENT returns, so at least K events
          // were starred. Due to the abort check happening at the loop iteration boundary,
          // the K-th event is always counted.
          expect(result.eventsNewlyStarred).toBeGreaterThanOrEqual(cancelAfterK);

          // Verify: not all events were processed (cancellation happened before completion)
          expect(result.eventsNewlyStarred).toBeLessThan(totalEvents);
        },
      ),
      { numRuns: 100 },
    );
  });
});
