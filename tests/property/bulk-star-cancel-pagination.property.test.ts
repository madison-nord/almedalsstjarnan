/**
 * Property-based test for Bulk Star cancellation during pagination.
 *
 * Feature: bulk-star-filtered, Property 11: Cancellation during pagination preserves already-loaded events
 * Validates: Requirements 4.5
 *
 * For any cancellation triggered during the pagination phase, the coordinator SHALL
 * stop pagination after the current in-flight click resolves, then proceed to star
 * all events already loaded up to that point.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 11: Cancellation during pagination preserves already-loaded events

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 11: Cancellation during pagination preserves already-loaded events', () => {
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
   * Sets up the DOM with initial event cards and a load-more button.
   * The abort controller will be aborted after clicksBeforeCancel clicks complete.
   */
  function setupDomWithPagination(
    initialCount: number,
    cardsPerClick: number,
    totalClicksAvailable: number,
    clicksBeforeCancel: number,
    abortController: AbortController,
  ): HTMLElement {
    const container = document.createElement('ul');
    container.id = 'event-container';

    // Add initial event cards
    for (let i = 0; i < initialCount; i++) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'event-information';
      li.appendChild(info);
      container.appendChild(li);
    }

    document.body.appendChild(container);

    // Create load-more button with offsetParent mocked (jsdom returns null by default)
    const loadMoreButton = document.createElement('a');
    loadMoreButton.className = 'load-more-button';
    Object.defineProperty(loadMoreButton, 'offsetParent', {
      get: () => document.body,
      configurable: true,
    });
    document.body.appendChild(loadMoreButton);

    let clickCount = 0;

    // On each click, add more cards to the DOM
    loadMoreButton.addEventListener('click', () => {
      clickCount++;
      for (let i = 0; i < cardsPerClick; i++) {
        const li = document.createElement('li');
        const info = document.createElement('div');
        info.className = 'event-information';
        li.appendChild(info);
        container.appendChild(li);
      }

      // Trigger abort after the specified number of clicks
      if (clickCount >= clicksBeforeCancel) {
        abortController.abort();
      }

      // Remove button after all clicks are used
      if (clickCount >= totalClicksAvailable) {
        loadMoreButton.remove();
      }
    });

    return container;
  }

  it('proceeds to star events already loaded when cancelled during pagination', async () => {
    // **Validates: Requirements 4.5**
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(normalizedEventArb, { minLength: 50, maxLength: 50 }),
        async (
          initialEventCount: number,
          clicksBeforeCancel: number,
          eventPool: NormalizedEvent[],
        ) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          const cardsPerClick = 3;
          // Total clicks available before button disappears (more than clicksBeforeCancel)
          const totalClicksAvailable = clicksBeforeCancel + 5;

          const abortController = new AbortController();

          // Set up DOM — the abort will be triggered inside the click handler
          // after clicksBeforeCancel clicks complete
          setupDomWithPagination(
            initialEventCount,
            cardsPerClick,
            totalClicksAvailable,
            clicksBeforeCancel,
            abortController,
          );

          // Expected events: initial cards + cards added by clicksBeforeCancel clicks.
          // The abort fires on the Nth click (after cards are added to DOM),
          // so the coordinator detects abort on the next loop iteration and stops pagination.
          const expectedEventsLoaded = initialEventCount + (clicksBeforeCancel * cardsPerClick);

          // Prepare unique events from the pool
          const seen = new Set<string>();
          const events: NormalizedEvent[] = [];
          for (const event of eventPool) {
            if (events.length >= expectedEventsLoaded) break;
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            events.push(event);
          }
          // If not enough unique events, skip this iteration
          if (events.length < expectedEventsLoaded) return;

          // Mock normalizeEvent to return ok: true for all cards
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

          // Mock sendMessage:
          // - GET_STAR_STATE: returns { starred: false }
          // - STAR_EVENT: returns success
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_STAR_STATE') {
              return {
                success: true,
                data: { starred: false, storedFields: null } as GetStarStateData,
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              return { success: true, data: undefined } as MessageResponse<T>;
            }
            return { success: true, data: undefined } as MessageResponse<T>;
          });

          const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

          const resultPromise = executeBulkStar({
            adapter: mockBrowserApi,
            onProgress: () => {},
            signal: abortController.signal,
            locale: 'sv',
          });

          // Run all timers to let the coordinator complete pagination + starring
          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // Verify: the operation proceeded to star events loaded before/at cancellation
          expect(result.eventsNewlyStarred).toBeGreaterThan(0);

          // The events found should equal the events loaded up to cancellation point
          expect(result.eventsFound).toBe(expectedEventsLoaded);

          // All found events were unstarred and normalization succeeded,
          // so all should be newly starred
          expect(result.eventsNewlyStarred).toBe(expectedEventsLoaded);

          // Pagination did not continue beyond the cancellation point
          const maxEventsWithoutCancel = initialEventCount + (totalClicksAvailable * cardsPerClick);
          expect(result.eventsFound).toBeLessThan(maxEventsWithoutCancel);
        },
      ),
      { numRuns: 100 },
    );
  });
});
