/**
 * Property-based test for Bulk Star batching with main-thread yields.
 *
 * Feature: bulk-star-filtered, Property 10: Batching with main-thread yields for large sets
 * Validates: Requirements 8.3
 *
 * For any bulk operation with more than 200 events to star, the coordinator
 * SHALL process events in batches of 50, yielding to the main thread between
 * batches. For operations with ≤ 200 events, no batching/yielding is required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { MessagePayload, MessageResponse, GetStarStateData } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';

// Feature: bulk-star-filtered, Property 10: Batching with main-thread yields for large sets

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type EventNormalizerModule = typeof import('#core/event-normalizer');

describe('Property 10: Batching with main-thread yields for large sets', () => {
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
   * Tracks setTimeout calls with delay of 0 (yield calls) separately
   * from rate-limiting delays (50ms) and retry delays (1000ms).
   */
  async function setupMocks(): Promise<{
    getStarEventCount: () => number;
    getYieldCallCount: () => number;
  }> {
    const { normalizeEvent } = (await import('#core/event-normalizer')) as EventNormalizerModule;
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
    mockSendMessage.mockImplementation(
      async <T>(message: MessagePayload): Promise<MessageResponse<T>> => {
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
      },
    );

    // Spy on global setTimeout to count yield calls (timeout === 0)
    let yieldCallCount = 0;
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((fn: (...args: unknown[]) => unknown, delay?: number, ...args: unknown[]) => {
        if (delay === 0) {
          yieldCallCount++;
        }
        return originalSetTimeout(fn, delay, ...args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );

    return {
      getStarEventCount: () => starEventCount,
      getYieldCallCount: () => yieldCallCount,
    };
  }

  it('yields between batches when events > 200 and processes all events', async () => {
    // **Validates: Requirements 8.3**
    //
    // Strategy: Generate event counts in range 201–220 (above threshold of 200).
    // Verify that setTimeout(fn, 0) is called at least once (yield between batches)
    // and that all events are still processed correctly.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 201, max: 220 }), async (numCards: number) => {
        // Reset state
        document.body.innerHTML = '';
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useFakeTimers();

        setupDom(numCards);
        const { getStarEventCount, getYieldCallCount } = await setupMocks();

        const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

        const resultPromise = executeBulkStar({
          adapter: mockBrowserApi,
          onProgress: () => {},
          signal: new AbortController().signal,
          locale: 'sv',
        });

        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // All events should be processed regardless of batching mode
        expect(result.eventsFound).toBe(numCards);
        expect(getStarEventCount()).toBe(numCards);
        expect(result.aborted).toBe(false);

        // With > 200 events, batching is enabled with batch size 50.
        // There should be at least one yield call (setTimeout(fn, 0))
        // between batches. For N events, yields = floor(N / 50) - 1 at minimum,
        // but at least 1 since N > 200 means at least 4 full batches.
        const expectedMinYields = Math.floor(numCards / 50) - 1;
        expect(getYieldCallCount()).toBeGreaterThanOrEqual(expectedMinYields);
        expect(getYieldCallCount()).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  it('does not yield between batches when events ≤ 200', async () => {
    // **Validates: Requirements 8.3**
    //
    // Strategy: Generate event counts in range 180–200 (at or below threshold).
    // Verify that no setTimeout(fn, 0) yield calls are made — the coordinator
    // processes all events without yielding to the main thread.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 180, max: 200 }), async (numCards: number) => {
        // Reset state
        document.body.innerHTML = '';
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useFakeTimers();

        setupDom(numCards);
        const { getStarEventCount, getYieldCallCount } = await setupMocks();

        const { executeBulkStar } = await import('#extension/bulk-star-coordinator');

        const resultPromise = executeBulkStar({
          adapter: mockBrowserApi,
          onProgress: () => {},
          signal: new AbortController().signal,
          locale: 'sv',
        });

        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // All events should be processed
        expect(result.eventsFound).toBe(numCards);
        expect(getStarEventCount()).toBe(numCards);
        expect(result.aborted).toBe(false);

        // With ≤ 200 events, no batching yield calls should occur
        expect(getYieldCallCount()).toBe(0);
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});
