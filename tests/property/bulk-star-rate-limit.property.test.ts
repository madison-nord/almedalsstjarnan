/**
 * Property-based test for Bulk Star rate limiting.
 *
 * Feature: bulk-star-filtered, Property 9: Sequential rate limiting — minimum 50ms between STAR_EVENT messages
 * Validates: Requirements 8.1
 *
 * For any batch of events being starred, the time between consecutive STAR_EVENT message sends
 * SHALL be ≥ 50ms. No two messages SHALL be in-flight simultaneously.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 9: Sequential rate limiting — minimum 50ms between STAR_EVENT messages

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 9: Sequential rate limiting — minimum 50ms between STAR_EVENT messages', () => {
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

  it('STAR_EVENT messages are sent sequentially with ≥50ms gaps between them', async () => {
    // **Validates: Requirements 8.1**
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(normalizedEventArb, { minLength: 3, maxLength: 15 })
          .map((events) => {
            // Ensure unique IDs
            const seen = new Set<string>();
            return events.filter((e) => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
          })
          .filter((events) => events.length >= 3),
        async (events) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Set up DOM with event cards
          setupDom(events.length);

          // Mock normalizeEvent to return our generated events in order
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

          // Track timestamps when STAR_EVENT messages are sent
          const starEventTimestamps: number[] = [];
          let inFlight = false;
          let concurrencyViolation = false;

          // Mock sendMessage for GET_STAR_STATE and STAR_EVENT
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_STAR_STATE') {
              // All events are unstarred so they all get STAR_EVENT
              return {
                success: true,
                data: { starred: false, storedFields: null } as GetStarStateData,
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              // Check for concurrent in-flight messages
              if (inFlight) {
                concurrencyViolation = true;
              }
              inFlight = true;
              starEventTimestamps.push(Date.now());
              // Simulate async completion
              inFlight = false;
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

          // Advance all timers to let the coordinator complete
          await vi.runAllTimersAsync();
          await resultPromise;

          // Verify: no concurrent in-flight STAR_EVENT messages
          expect(concurrencyViolation).toBe(false);

          // Verify: all events generated STAR_EVENT calls
          expect(starEventTimestamps.length).toBe(events.length);

          // Verify: consecutive STAR_EVENT timestamps have ≥50ms gaps
          for (let i = 1; i < starEventTimestamps.length; i++) {
            const gap = starEventTimestamps[i]! - starEventTimestamps[i - 1]!;
            expect(gap).toBeGreaterThanOrEqual(50);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
