/**
 * Property-based test for Bulk Star snapshot isolation.
 *
 * Feature: bulk-star-filtered, Property 5: Snapshot isolation — DOM mutations during starring do not affect the processed set
 * Validates: Requirements 5.1, 5.2, 5.4
 *
 * For any bulk operation that has collected a snapshot of K events after pagination,
 * if the DOM is mutated (cards added or removed) during the starring phase, the
 * coordinator SHALL continue processing exactly the K events from the original
 * snapshot without re-scanning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizedEvent, MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { normalizedEventArb } from '#test/helpers/event-generators';

// Feature: bulk-star-filtered, Property 5: Snapshot isolation — DOM mutations during starring do not affect the processed set

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 5: Snapshot isolation — DOM mutations during starring do not affect the processed set', () => {
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
   * Creates K Event_Card DOM elements (li with .event-information).
   */
  function setupDom(count: number): HTMLElement {
    const container = document.createElement('ul');
    container.id = 'event-container';
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'event-information';
      li.appendChild(info);
      container.appendChild(li);
    }
    document.body.appendChild(container);
    return container;
  }

  /**
   * Adds extra Event_Card elements to the DOM container mid-operation.
   */
  function addCardsToDom(container: HTMLElement, count: number): void {
    for (let i = 0; i < count; i++) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'event-information';
      li.appendChild(info);
      container.appendChild(li);
    }
  }

  /**
   * Removes Event_Card elements from the DOM container mid-operation.
   */
  function removeCardsFromDom(container: HTMLElement, count: number): void {
    const cards = container.querySelectorAll('li');
    const toRemove = Math.min(count, cards.length);
    for (let i = 0; i < toRemove; i++) {
      const card = cards[i];
      if (card) {
        card.remove();
      }
    }
  }

  it('processes exactly the original K events regardless of DOM mutations during starring', async () => {
    // **Validates: Requirements 5.1, 5.2, 5.4**
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.array(normalizedEventArb, { minLength: 20, maxLength: 20 }),
        async (
          initialCards: number,
          cardsToAdd: number,
          cardsToRemoveRaw: number,
          eventPool: NormalizedEvent[],
        ) => {
          // Clamp cardsToRemove to at most K/2
          const cardsToRemove = Math.min(cardsToRemoveRaw, Math.floor(initialCards / 2));

          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Set up DOM with K event cards
          const container = setupDom(initialCards);

          // Generate unique events for the initial K cards
          const seen = new Set<string>();
          const events: NormalizedEvent[] = [];
          for (const event of eventPool) {
            if (events.length >= initialCards) break;
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            events.push(event);
          }
          // If not enough unique events from pool, skip this iteration
          if (events.length < initialCards) return;

          const K = events.length;

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

          // Track how many STAR_EVENT messages were sent
          let starEventCount = 0;
          let domMutated = false;

          // Mock sendMessage:
          // - GET_STAR_STATE: returns { starred: false }
          // - STAR_EVENT: on first few calls, mutate the DOM, then return success
          const mockSendMessage = vi.mocked(mockBrowserApi.sendMessage);
          mockSendMessage.mockImplementation(async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
            if (message.command === 'GET_STAR_STATE') {
              return {
                success: true,
                data: { starred: false, storedFields: null } as GetStarStateData,
              } as MessageResponse<T>;
            }
            if (message.command === 'STAR_EVENT') {
              starEventCount++;
              // Mutate DOM on the first STAR_EVENT call (simulating DOM changes during starring)
              if (!domMutated) {
                domMutated = true;
                addCardsToDom(container, cardsToAdd);
                removeCardsFromDom(container, cardsToRemove);
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

          // Advance all timers to let the coordinator complete
          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // The total processed events should equal the original K
          // (all events pass normalization, none are already starred, so all get STAR_EVENT)
          const totalProcessed =
            result.eventsNewlyStarred + result.eventsAlreadyStarred + result.eventsFailed;

          expect(totalProcessed).toBe(K);

          // Also verify starEventCount matches K (all unstarred, all succeed)
          expect(starEventCount).toBe(K);

          // Confirm that DOM was actually mutated (the test is meaningful)
          if (cardsToAdd > 0 || cardsToRemove > 0) {
            expect(domMutated).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
