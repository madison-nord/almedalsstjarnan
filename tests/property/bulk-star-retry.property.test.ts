/**
 * Property-based test for Bulk Star retry logic.
 *
 * Feature: bulk-star-filtered, Property 6: Retry logic — failed events get exactly one retry
 * Validates: Requirements 7.2
 *
 * For any event where the initial STAR_EVENT message returns `success: false` or throws,
 * the coordinator SHALL retry up to 2 times after delays. If all retries also fail, the event
 * SHALL be counted as failed and skipped.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 6: Retry logic — failed events get exactly one retry

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

type FailurePattern = 'succeed_first' | 'fail_then_succeed' | 'fail_both';

/**
 * Generator for failure patterns that ensures ≤50% 'fail_both' events
 * to avoid triggering the error threshold abort.
 */
const failurePatternArb: fc.Arbitrary<FailurePattern> = fc.constantFrom(
  'succeed_first' as const,
  'fail_then_succeed' as const,
  'fail_both' as const,
);

/**
 * Generates an array of events (3–15) with unique IDs, each assigned a failure pattern.
 * Ensures the running failure ratio never exceeds 50% at any point during sequential
 * processing to avoid the error threshold abort. This is achieved by ordering events
 * so that 'fail_both' events are interleaved with successful events.
 */
const eventWithPatternArb = fc
  .array(
    fc.record({
      event: normalizedEventArb,
      pattern: failurePatternArb,
    }),
    { minLength: 3, maxLength: 15 },
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
  .filter((items) => items.length >= 3)
  .map((items) => {
    // Separate into success and failure groups
    const successes = items.filter((i) => i.pattern !== 'fail_both');
    const failures = items.filter((i) => i.pattern === 'fail_both');

    // Limit fail_both so ratio never exceeds 50% at any point during processing.
    // With interleaving [S, F, S, F, ...], after each failure the ratio is
    // failures/(2*failures) = 0.5 which does NOT exceed the strict > 0.5 threshold.
    // But we need at least one extra success to be safe with the ordering.
    const maxFailBoth = Math.max(0, Math.floor((items.length - 1) / 2));
    const allowedFailures = failures.slice(0, maxFailBoth);
    const convertedToSuccess = failures.slice(maxFailBoth).map((item) => ({
      ...item,
      pattern: 'succeed_first' as const,
    }));

    const allSuccesses = [...successes, ...convertedToSuccess];

    // Interleave: place a success before each failure to ensure running ratio never exceeds 50%.
    // Pattern: [success, failure, success, failure, ...remaining successes]
    const result: typeof items = [];
    let si = 0;
    let fi = 0;
    while (fi < allowedFailures.length) {
      // Place at least one success before each failure
      if (si < allSuccesses.length) {
        result.push(allSuccesses[si]!);
        si++;
      }
      result.push(allowedFailures[fi]!);
      fi++;
    }
    // Add remaining successes
    while (si < allSuccesses.length) {
      result.push(allSuccesses[si]!);
      si++;
    }

    return result;
  })
  .filter((items) => items.length >= 3);

describe('Property 6: Retry logic — failed events get exactly one retry', () => {
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

  it('events get exactly the expected number of STAR_EVENT calls based on failure pattern', async () => {
    // **Validates: Requirements 7.2**
    await fc.assert(
      fc.asyncProperty(
        eventWithPatternArb,
        async (items) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Build pattern map keyed by event ID
          const patternMap = new Map<string, FailurePattern>();
          const events: NormalizedEvent[] = [];
          for (const item of items) {
            patternMap.set(item.event.id, item.pattern);
            events.push(item.event);
          }

          // Set up DOM with event cards
          setupDom(items.length);

          // Mock normalizeEvent to return generated events in order
          const { normalizeEvent } = await import('#core/event-normalizer') as EventNormalizerModule;
          const mockNormalize = vi.mocked(normalizeEvent);
          let callIndex = 0;
          mockNormalize.mockImplementation(() => {
            const event = events[callIndex];
            callIndex++;
            if (event) {
              return { ok: true, event } as const;
            }
            return { ok: false, reason: 'no more events' } as const;
          });

          // Track STAR_EVENT calls per event ID
          const starCallCounts = new Map<string, number>();

          // Mock sendMessage
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              // All events are unstarred so they all proceed to STAR_EVENT
              return {
                success: true,
                data: [],
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              const eventId = message.event.id;
              const count = (starCallCounts.get(eventId) ?? 0) + 1;
              starCallCounts.set(eventId, count);

              const pattern = patternMap.get(eventId);

              if (pattern === 'succeed_first') {
                // Always succeed on first call
                return { success: true, data: undefined } as MessageResponse<T>;
              }

              if (pattern === 'fail_then_succeed') {
                // Fail on first call, succeed on second (retry)
                if (count === 1) {
                  return { success: false, error: 'simulated failure' } as MessageResponse<T>;
                }
                return { success: true, data: undefined } as MessageResponse<T>;
              }

              if (pattern === 'fail_both') {
                // Fail on all calls (initial + all retries)
                return { success: false, error: 'simulated failure' } as MessageResponse<T>;
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
            signal: new AbortController().signal,
            locale: 'sv',
          });

          // Advance all timers to let the coordinator complete (including retry delays)
          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // Verify: events with 'succeed_first' get exactly 1 STAR_EVENT call
          for (const item of items) {
            const callCount = starCallCounts.get(item.event.id) ?? 0;

            if (item.pattern === 'succeed_first') {
              expect(callCount).toBe(1);
            }
          }

          // Verify: events with 'fail_then_succeed' get exactly 2 STAR_EVENT calls
          for (const item of items) {
            const callCount = starCallCounts.get(item.event.id) ?? 0;

            if (item.pattern === 'fail_then_succeed') {
              expect(callCount).toBe(2);
            }
          }

          // Verify: events with 'fail_both' get exactly MAX_RETRIES + 1 = 3 STAR_EVENT calls and count as failed
          for (const item of items) {
            const callCount = starCallCounts.get(item.event.id) ?? 0;

            if (item.pattern === 'fail_both') {
              expect(callCount).toBe(3);
            }
          }

          // Verify result counts
          const expectedSucceedFirst = items.filter((i) => i.pattern === 'succeed_first').length;
          const expectedFailThenSucceed = items.filter((i) => i.pattern === 'fail_then_succeed').length;
          const expectedFailBoth = items.filter((i) => i.pattern === 'fail_both').length;

          expect(result.eventsNewlyStarred).toBe(expectedSucceedFirst + expectedFailThenSucceed);
          expect(result.eventsFailed).toBe(expectedFailBoth);
        },
      ),
      { numRuns: 100 },
    );
  });
});
