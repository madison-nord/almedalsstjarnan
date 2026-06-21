/**
 * Property-based test for Bulk Star skip-starred logic.
 *
 * Feature: bulk-star-filtered, Property 3: Only unstarred events receive STAR_EVENT messages
 * Validates: Requirements 3.3, 3.4
 *
 * For any set of normalized events where each has a known starred state (starred or unstarred),
 * the coordinator SHALL send STAR_EVENT messages only for events whose GET_STAR_STATE response
 * indicates `starred: false`. Events already starred SHALL be counted as `alreadyStarred` and
 * not sent to storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 3: Only unstarred events receive STAR_EVENT messages

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 3: Only unstarred events receive STAR_EVENT messages', () => {
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

  it('STAR_EVENT is only sent for events where starred === false, and counts are accurate', async () => {
    // **Validates: Requirements 3.3, 3.4**
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(
            fc.record({
              event: normalizedEventArb,
              alreadyStarred: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 },
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
          .filter((items) => items.length > 0),
        async (items) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Build the starred state map
          const starredMap = new Map<string, boolean>();
          const events: NormalizedEvent[] = [];
          for (const item of items) {
            starredMap.set(item.event.id, item.alreadyStarred);
            events.push(item.event);
          }

          // Set up DOM with event cards
          setupDom(items.length);

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

          // Track STAR_EVENT calls
          const starEventCalls: NormalizedEvent[] = [];

          // Mock sendMessage for GET_ALL_STARRED_EVENTS and STAR_EVENT
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_ALL_STARRED_EVENTS') {
              // Return all events that are already starred
              const starredEvents = items
                .filter((i) => i.alreadyStarred)
                .map((i) => ({ id: i.event.id }));
              return {
                success: true,
                data: starredEvents,
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              starEventCalls.push(message.event);
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
          const result = await resultPromise;

          // Calculate expected counts
          const expectedUnstarred = items.filter((i) => !i.alreadyStarred);
          const expectedAlreadyStarred = items.filter((i) => i.alreadyStarred);

          // Verify: STAR_EVENT was only called for unstarred events
          expect(starEventCalls.length).toBe(expectedUnstarred.length);

          // Verify: each STAR_EVENT call was for an unstarred event
          for (const calledEvent of starEventCalls) {
            const isStarred = starredMap.get(calledEvent.id);
            expect(isStarred).toBe(false);
          }

          // Verify: no starred events received STAR_EVENT
          const starredEventIds = new Set(
            items.filter((i) => i.alreadyStarred).map((i) => i.event.id),
          );
          for (const calledEvent of starEventCalls) {
            expect(starredEventIds.has(calledEvent.id)).toBe(false);
          }

          // Verify: result counts are accurate
          expect(result.eventsAlreadyStarred).toBe(expectedAlreadyStarred.length);
          expect(result.eventsNewlyStarred).toBe(expectedUnstarred.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
