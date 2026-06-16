/**
 * Property-based test for Bulk Star 2000-event cap.
 *
 * Feature: bulk-star-filtered, Property 4: Maximum 2000 events processed per batch
 * Validates: Requirements 3.8
 *
 * For any DOM containing N Event_Cards (where N may exceed 2000), the coordinator
 * SHALL process at most `min(N, 2000)` events, taking the first 2000 in DOM order.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';

// Feature: bulk-star-filtered, Property 4: Maximum 2000 events processed per batch

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 4: Maximum 2000 events processed per batch', () => {
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
   * Creates N Event_Card DOM elements (li with .event-information).
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

  /**
   * Sets up mocks for normalizeEvent and sendMessage.
   * Returns a counter tracking STAR_EVENT calls.
   */
  async function setupMocks(): Promise<{ getStarEventCount: () => number }> {
    const { normalizeEvent } = await import('#core/event-normalizer') as EventNormalizerModule;
    const mockNormalize = vi.mocked(normalizeEvent);
    let callIndex = 0;
    mockNormalize.mockImplementation(() => {
      const idx = callIndex++;
      return {
        ok: true,
        event: {
          id: `event-${idx}`,
          title: `Event ${idx}`,
          organiser: null,
          startDateTime: '2026-06-22T07:30:00+02:00',
          endDateTime: null,
          location: null,
          description: null,
          topic: null,
          sourceUrl: null,
          icsDataUri: null,
        },
      } as const;
    });

    let starEventCount = 0;
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
        return { success: true, data: undefined } as MessageResponse<T>;
      }
      return { success: true, data: undefined } as MessageResponse<T>;
    });

    return { getStarEventCount: () => starEventCount };
  }

  it('processes exactly min(N, cap) events for varying DOM sizes', async () => {
    // **Validates: Requirements 3.8**
    //
    // Strategy: Use a manageable event count range (50–100) to verify
    // the min(N, cap) formula holds. The cap is 2000 so all events in this
    // range are below the cap, confirming all events are processed when N < 2000.
    // A separate focused test below verifies the cap enforcement at 2000+.
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 100 }),
        async (numCards: number) => {
          // Reset state
          document.body.innerHTML = '';
          vi.clearAllMocks();

          // Set up DOM with N event cards (all below cap)
          setupDom(numCards);
          const { getStarEventCount } = await setupMocks();

          const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

          const resultPromise = executeBulkStar({
            adapter: mockBrowserApi,
            onProgress: () => {},
            signal: new AbortController().signal,
            locale: 'sv',
          });

          await vi.runAllTimersAsync();
          const result = await resultPromise;

          // When N < 2000: eventsFound should equal N (all processed)
          expect(result.eventsFound).toBe(numCards);
          expect(getStarEventCount()).toBe(numCards);
          // Verify the min(N, 2000) formula
          expect(result.eventsFound).toBe(Math.min(numCards, 2000));
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);

  it('caps at exactly 2000 events when DOM contains more than 2000 Event_Cards', async () => {
    // **Validates: Requirements 3.8**
    //
    // Focused boundary test: create 2010 Event_Cards and verify that only
    // 2000 are collected and processed by the coordinator.
    document.body.innerHTML = '';
    vi.clearAllMocks();

    const numCards = 2010;
    setupDom(numCards);
    const { getStarEventCount } = await setupMocks();

    const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

    const resultPromise = executeBulkStar({
      adapter: mockBrowserApi,
      onProgress: () => {},
      signal: new AbortController().signal,
      locale: 'sv',
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // eventsFound must be exactly 2000 (capped)
    expect(result.eventsFound).toBe(2000);
    // STAR_EVENT calls must not exceed the cap
    expect(getStarEventCount()).toBeLessThanOrEqual(2000);
    expect(getStarEventCount()).toBe(2000);
  }, 300_000);

  it('processes all events when DOM contains fewer than 2000 Event_Cards', async () => {
    // **Validates: Requirements 3.8**
    //
    // Focused boundary test: create 1999 Event_Cards and verify all are processed.
    document.body.innerHTML = '';
    vi.clearAllMocks();

    const numCards = 1999;
    setupDom(numCards);
    const { getStarEventCount } = await setupMocks();

    const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

    const resultPromise = executeBulkStar({
      adapter: mockBrowserApi,
      onProgress: () => {},
      signal: new AbortController().signal,
      locale: 'sv',
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // eventsFound must equal 1999 (no cap applied)
    expect(result.eventsFound).toBe(1999);
    expect(getStarEventCount()).toBe(1999);
  }, 300_000);
});
