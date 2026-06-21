/**
 * Property-based test for Bulk Star abort threshold logic.
 *
 * Feature: bulk-star-filtered, Property 7: Abort threshold — operation aborts when failure rate exceeds 50%
 * Validates: Requirements 7.3
 *
 * For any bulk operation where the ratio of failed events (after retry) to total events attempted
 * exceeds 0.5, the coordinator SHALL abort the operation and report an error state. When the
 * ratio is ≤ 0.5, the operation SHALL continue to completion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 7: Abort threshold — operation aborts when failure rate exceeds 50%

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 7: Abort threshold — operation aborts when failure rate exceeds 50%', () => {
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

  it('aborts when failures/attempts > 0.5, completes when ≤ 0.5', async () => {
    // **Validates: Requirements 7.3**
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 4, max: 20 })
          .chain((numEvents) =>
            fc
              .array(fc.boolean(), { minLength: numEvents, maxLength: numEvents })
              .map((failurePattern) => ({ numEvents, failurePattern })),
          ),
        async ({ numEvents, failurePattern }) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Generate unique events
          const events = await fc.sample(
            normalizedEventArb.map((e) => ({
              ...e,
              id: `event-${Math.random().toString(36).slice(2)}`,
            })),
            numEvents,
          );

          // Ensure unique IDs
          const usedIds = new Set<string>();
          const uniqueEvents = events.filter((e: { readonly id: string }) => {
            if (usedIds.has(e.id)) return false;
            usedIds.add(e.id);
            return true;
          });

          const actualCount = uniqueEvents.length;
          if (actualCount < 4) return; // Skip if too few unique events

          // failurePattern[i] = true means this event will always fail (both initial + retry)
          const pattern = failurePattern.slice(0, actualCount);

          // Set up DOM with event cards
          setupDom(actualCount);

          // Mock normalizeEvent
          const { normalizeEvent } = (await import(
            '#core/event-normalizer'
          )) as EventNormalizerModule;
          const mockNormalize = vi.mocked(normalizeEvent);
          let callIndex = 0;
          mockNormalize.mockImplementation((): ReturnType<typeof normalizeEvent> => {
            const event = uniqueEvents[callIndex];
            callIndex++;
            if (event) {
              return { ok: true, event } as const;
            }
            return { ok: false, reason: 'no more events' } as const;
          });

          // Mock sendMessage
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(
            async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
              if (message.command === 'GET_STAR_STATE') {
                // All events are unstarred so they all go through STAR_EVENT
                return {
                  success: true,
                  data: { starred: false, storedFields: null } as GetStarStateData,
                } as MessageResponse<T>;
              }
              if (message.command === 'STAR_EVENT') {
                // Find which event this is
                const eventId = message.event.id;
                const eventIndex = uniqueEvents.findIndex((e: { readonly id: string }) => e.id === eventId);
                const shouldFail = eventIndex >= 0 && pattern[eventIndex] === true;

                if (shouldFail) {
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

          // Simulate the coordinator logic to predict when abort triggers.
          // The coordinator processes events sequentially. For each unstarred event:
          // - It attempts STAR_EVENT. If it fails, it retries once.
          // - If both fail, eventsFailed increments.
          // - After each event, it checks: eventsFailed / eventsAttempted > 0.5
          // - If threshold exceeded, it aborts immediately.
          let expectedAttempted = 0;
          let expectedFailed = 0;
          let shouldAbort = false;
          let abortPoint = -1;

          for (let i = 0; i < actualCount; i++) {
            expectedAttempted++;
            if (pattern[i] === true) {
              expectedFailed++;
            }

            // Check threshold after processing this event
            if (
              expectedAttempted > 0 &&
              expectedFailed / expectedAttempted > 0.5
            ) {
              shouldAbort = true;
              abortPoint = i;
              break;
            }
          }

          if (shouldAbort) {
            expect(result.aborted).toBe(true);
            expect(result.abortReason).toBe('error-threshold');
            // Not all events should have been processed
            const eventsProcessed =
              result.eventsNewlyStarred + result.eventsFailed;
            expect(eventsProcessed).toBeLessThanOrEqual(actualCount);
            expect(eventsProcessed).toBe(abortPoint + 1);
          } else {
            expect(result.aborted).toBe(false);
            expect(result.abortReason).toBe(null);
            // All events should have been processed
            const totalProcessed =
              result.eventsNewlyStarred +
              result.eventsAlreadyStarred +
              result.eventsFailed;
            expect(totalProcessed).toBe(actualCount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
