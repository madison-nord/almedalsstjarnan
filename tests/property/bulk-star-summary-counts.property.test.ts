/**
 * Property-based test for Bulk Star summary count accuracy.
 *
 * Feature: bulk-star-filtered, Property 13: Progress summary counts are accurate
 * Validates: Requirements 3.7, 4.7, 4.8
 *
 * For any completed bulk operation (successful, cancelled, or aborted), the final progress
 * state SHALL satisfy: `eventsNewlyStarred + eventsAlreadyStarred + eventsFailed + eventsSkipped = eventsTotal`
 * for completed operations, and `eventsProcessed ≤ eventsTotal` for cancelled operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 13: Progress summary counts are accurate

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

/**
 * Describes the outcome pattern for each event card in the test.
 * - 'normalizes_ok_unstarred': normalizes successfully, not already starred, STAR_EVENT succeeds
 * - 'normalizes_ok_starred': normalizes successfully, already starred
 * - 'normalizes_ok_fails_star': normalizes successfully, not already starred, STAR_EVENT fails (both attempts)
 * - 'normalizes_fail': normalization fails (event is skipped)
 */
type EventPattern =
  | 'normalizes_ok_unstarred'
  | 'normalizes_ok_starred'
  | 'normalizes_ok_fails_star'
  | 'normalizes_fail';

describe('Property 13: Progress summary counts are accurate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

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

  it('eventsNewlyStarred + eventsAlreadyStarred + eventsFailed + eventsSkipped = eventsFound for non-aborted operations', async () => {
    // **Validates: Requirements 3.7, 4.7, 4.8**
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(
            fc.record({
              event: normalizedEventArb,
              pattern: fc.constantFrom<EventPattern>(
                'normalizes_ok_unstarred',
                'normalizes_ok_starred',
                'normalizes_ok_fails_star',
                'normalizes_fail',
              ),
            }),
            { minLength: 5, maxLength: 20 },
          )
          .map((items) => {
            // Ensure unique IDs
            const seen = new Set<string>();
            return items.filter((item) => {
              if (seen.has(item.event.id)) return false;
              seen.add(item.event.id);
              return true;
            });
          })
          .filter((items) => items.length >= 5)
          .map((items) => {
            // Ensure ≤50% fail rate among unstarred events to avoid abort interference.
            // Count the events that will be attempted (unstarred, both success and fail).
            const attempted = items.filter(
              (i) => i.pattern === 'normalizes_ok_unstarred' || i.pattern === 'normalizes_ok_fails_star',
            );
            const failed = items.filter((i) => i.pattern === 'normalizes_ok_fails_star');

            // If failure rate would exceed 50%, convert some failures to successes
            if (attempted.length > 0 && failed.length / attempted.length > 0.5) {
              const maxFailures = Math.floor(attempted.length * 0.5);
              let failCount = 0;
              return items.map((item) => {
                if (item.pattern === 'normalizes_ok_fails_star') {
                  failCount++;
                  if (failCount > maxFailures) {
                    return { ...item, pattern: 'normalizes_ok_unstarred' as EventPattern };
                  }
                }
                return item;
              });
            }
            return items;
          }),
        async (items) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          const totalCards = items.length;

          // Set up DOM with event cards
          setupDom(totalCards);

          // Mock normalizeEvent based on the pattern
          const { normalizeEvent } = (await import('#core/event-normalizer')) as EventNormalizerModule;
          const mockNormalize = vi.mocked(normalizeEvent);
          let callIndex = 0;
          mockNormalize.mockImplementation(() => {
            const item = items[callIndex];
            callIndex++;
            if (!item) {
              return { ok: false, reason: 'no more events' } as const;
            }
            if (item.pattern === 'normalizes_fail') {
              return { ok: false, reason: 'test normalization failure' } as const;
            }
            return { ok: true, event: item.event } as const;
          });

          // Mock sendMessage based on the pattern
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(
            async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
              if (message.command === 'GET_STAR_STATE') {
                const eventId = message.eventId;
                const item = items.find(
                  (i) => i.event.id === eventId,
                );
                const starred = item?.pattern === 'normalizes_ok_starred';
                return {
                  success: true,
                  data: { starred, storedFields: null } as GetStarStateData,
                } as MessageResponse<T>;
              }
              if (message.command === 'STAR_EVENT') {
                const eventId = message.event.id;
                const item = items.find((i) => i.event.id === eventId);
                if (item?.pattern === 'normalizes_ok_fails_star') {
                  return { success: false, error: 'test failure' } as MessageResponse<T>;
                }
                return { success: true, data: undefined } as MessageResponse<T>;
              }
              return { success: true, data: undefined } as MessageResponse<T>;
            },
          );

          // Import and run executeBulkStar
          const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

          const resultPromise = executeBulkStar({
            adapter: mockBrowserApi,
            onProgress: () => {},
            signal: new AbortController().signal,
            locale: 'sv',
          });

          // Advance all timers to let the coordinator complete
          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // For non-aborted operations, verify the sum identity:
          // eventsNewlyStarred + eventsAlreadyStarred + eventsFailed + eventsSkipped = eventsFound
          if (!result.aborted) {
            const sum =
              result.eventsNewlyStarred +
              result.eventsAlreadyStarred +
              result.eventsFailed +
              result.eventsSkipped;

            expect(sum).toBe(result.eventsFound);
          }

          // All counts are non-negative
          expect(result.eventsNewlyStarred).toBeGreaterThanOrEqual(0);
          expect(result.eventsAlreadyStarred).toBeGreaterThanOrEqual(0);
          expect(result.eventsFailed).toBeGreaterThanOrEqual(0);
          expect(result.eventsSkipped).toBeGreaterThanOrEqual(0);
          expect(result.eventsFound).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
