/**
 * Property-based test for Bulk Star no-throw guarantee.
 *
 * Feature: bulk-star-filtered, Property 8: No unhandled exceptions propagate from coordinator
 * Validates: Requirements 7.5
 *
 * For any combination of errors during a bulk operation (adapter.sendMessage throws,
 * DOM queries return unexpected results, normalization throws), the coordinator SHALL
 * catch all exceptions internally and never propagate an unhandled rejection or throw.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 8: No unhandled exceptions propagate from coordinator

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

/**
 * Arbitrary for error scenario types that exercise different failure modes.
 */
const errorScenarioArb = fc.constantFrom(
  'sendMessage_throws' as const,
  'sendMessage_rejects' as const,
  'normalizeEvent_throws' as const,
  'mixed' as const,
);

type ErrorScenario = 'sendMessage_throws' | 'sendMessage_rejects' | 'normalizeEvent_throws' | 'mixed';

describe('Property 8: No unhandled exceptions propagate from coordinator', () => {
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

  it('executeBulkStar never throws or rejects regardless of error scenario', async () => {
    // **Validates: Requirements 7.5**
    await fc.assert(
      fc.asyncProperty(
        errorScenarioArb,
        fc.integer({ min: 3, max: 10 }),
        fc.array(normalizedEventArb, { minLength: 10, maxLength: 10 }),
        async (
          scenario: ErrorScenario,
          cardCount: number,
          eventPool: NormalizedEvent[],
        ) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Set up DOM with event cards
          setupDom(cardCount);

          // Generate unique events for the cards
          const seen = new Set<string>();
          const events: NormalizedEvent[] = [];
          for (const event of eventPool) {
            if (events.length >= cardCount) break;
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            events.push(event);
          }
          // If not enough unique events, skip iteration
          if (events.length < cardCount) return;

          // Mock normalizeEvent based on scenario
          const { normalizeEvent } = await import('#core/event-normalizer') as EventNormalizerModule;
          const mockNormalize = vi.mocked(normalizeEvent);

          if (scenario === 'normalizeEvent_throws' || scenario === 'mixed') {
            let normCallIndex = 0;
            mockNormalize.mockImplementation(() => {
              normCallIndex++;
              // In 'normalizeEvent_throws' scenario, throw on every call
              // In 'mixed' scenario, throw on odd calls, succeed on even calls
              if (scenario === 'normalizeEvent_throws') {
                throw new Error(`Normalization error at index ${normCallIndex}`);
              }
              // mixed: alternate between success and throw
              if (normCallIndex % 2 === 0) {
                const event = events[normCallIndex - 1];
                if (event) {
                  return { ok: true, event } as const;
                }
                return { ok: false, reason: 'no event' } as const;
              }
              throw new Error(`Mixed normalization error at index ${normCallIndex}`);
            });
          } else {
            // For sendMessage scenarios, normalizeEvent succeeds normally
            let normCallIndex = 0;
            mockNormalize.mockImplementation(() => {
              const event = events[normCallIndex];
              normCallIndex++;
              if (event) {
                return { ok: true, event } as const;
              }
              return { ok: false, reason: 'no more events' } as const;
            });
          }

          // Mock sendMessage based on scenario
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);

          if (scenario === 'sendMessage_throws') {
            // Synchronously throw on STAR_EVENT
            mockSendMessage.mockImplementation(<T>(message: MessagePayload): Promise<MessageResponse<T>> => {
              if (message.command === 'STAR_EVENT') {
                throw new Error('sendMessage sync throw for STAR_EVENT');
              }
              // GET_STAR_STATE succeeds normally
              return Promise.resolve({
                success: true,
                data: { starred: false, storedFields: null },
              } as MessageResponse<T>);
            });
          } else if (scenario === 'sendMessage_rejects') {
            // Reject with an error for STAR_EVENT
            mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
              if (message.command === 'STAR_EVENT') {
                return Promise.reject(new Error('sendMessage rejection for STAR_EVENT'));
              }
              // GET_STAR_STATE succeeds normally
              return {
                success: true,
                data: { starred: false, storedFields: null },
              } as MessageResponse<T>;
            });
          } else if (scenario === 'mixed') {
            // Mix of throws, rejections, and successes
            let callCount = 0;
            mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
              callCount++;
              if (message.command === 'STAR_EVENT') {
                // Alternate between throw, reject, and success
                const mode = callCount % 3;
                if (mode === 0) {
                  throw new Error('mixed sync throw');
                } else if (mode === 1) {
                  return Promise.reject(new Error('mixed rejection'));
                }
                return { success: true, data: undefined } as MessageResponse<T>;
              }
              // GET_STAR_STATE: occasionally throw too
              if (message.command === 'GET_STAR_STATE' && callCount % 5 === 0) {
                throw new Error('GET_STAR_STATE failure');
              }
              return {
                success: true,
                data: { starred: false, storedFields: null },
              } as MessageResponse<T>;
            });
          } else {
            // Default: all succeeds (shouldn't reach here, but safe fallback)
            mockSendMessage.mockResolvedValue({ success: true, data: undefined } as MessageResponse<unknown>);
          }

          // Import and run executeBulkStar
          const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

          // Key verification: the call NEVER throws or rejects
          let result: Awaited<ReturnType<typeof executeBulkStar>> | undefined;
          let didThrow = false;

          try {
            const resultPromise = executeBulkStar({
              adapter: mockBrowserApi,
              onProgress: () => {},
              signal: new AbortController().signal,
              locale: 'sv',
            });

            // Advance all timers to let the coordinator complete
            await vi.runAllTimersAsync();
            result = await resultPromise;
          } catch {
            didThrow = true;
          }

          // The coordinator must NEVER throw
          expect(didThrow).toBe(false);

          // Result must be defined and be a valid BulkStarResult
          expect(result).toBeDefined();
          expect(result).toHaveProperty('eventsFound');
          expect(result).toHaveProperty('eventsNewlyStarred');
          expect(result).toHaveProperty('eventsAlreadyStarred');
          expect(result).toHaveProperty('eventsFailed');
          expect(result).toHaveProperty('eventsSkipped');
          expect(result).toHaveProperty('aborted');
          expect(result).toHaveProperty('abortReason');

          // All numeric fields should be non-negative numbers
          expect(result!.eventsFound).toBeGreaterThanOrEqual(0);
          expect(result!.eventsNewlyStarred).toBeGreaterThanOrEqual(0);
          expect(result!.eventsAlreadyStarred).toBeGreaterThanOrEqual(0);
          expect(result!.eventsFailed).toBeGreaterThanOrEqual(0);
          expect(result!.eventsSkipped).toBeGreaterThanOrEqual(0);

          // aborted should be a boolean
          expect(typeof result!.aborted).toBe('boolean');

          // abortReason should be null or one of the valid values
          expect(
            result!.abortReason === null ||
            result!.abortReason === 'user-cancel' ||
            result!.abortReason === 'error-threshold',
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
