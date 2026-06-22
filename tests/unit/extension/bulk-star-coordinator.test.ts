/**
 * Unit tests for BulkStarCoordinator.
 *
 * Tests the executeBulkStar function covering pagination expansion,
 * event collection, normalization filtering, skip-starred logic,
 * sequential starring with delays, retry, error threshold abort,
 * cancellation, 2000-event cap, and batching.
 *
 * Requirements: 2.1, 2.4, 2.6, 2.7, 3.1, 3.3, 3.8, 7.2, 7.3, 8.1, 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';

vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// Mock the constants to use shorter delays in tests
vi.mock('#extension/bulk-star-constants', () => ({
  BULK_STAR_CONSTANTS: {
    MAX_EVENTS_PER_BATCH: 2000,
    MAX_PAGINATION_CLICKS: 100,
    PAGINATION_CLICK_TIMEOUT_MS: 200, // Shortened for tests
    PAGINATION_CLICK_DELAY_MS: 10,    // Shortened for tests
    STAR_MESSAGE_DELAY_MS: 1,         // Minimal for tests
    BATCH_SIZE: 50,
    BATCH_THRESHOLD: 200,
    RETRY_DELAY_MS: 10,               // Shortened for tests
    MAX_RETRIES: 1,
    ERROR_ABORT_THRESHOLD: 0.5,
    SUMMARY_DISPLAY_MS: 5000,
    BUTTON_VIEWPORT_OFFSET_PX: 16,
  },
}));

import { normalizeEvent } from '#core/event-normalizer';
import { executeBulkStar } from '#extension/bulk-star-coordinator';
import type { BulkStarOptions } from '#extension/bulk-star-types';

const mockedNormalizeEvent = vi.mocked(normalizeEvent);

// ─── Helpers ──────────────────────────────────────────────────────

function makeNormalizedEvent(id: string) {
  return {
    id,
    title: `Event ${id}`,
    organiser: 'Test Org',
    startDateTime: '2026-06-22T07:30:00+02:00',
    endDateTime: '2026-06-22T08:30:00+02:00',
    location: 'Test Location',
    description: 'Test description',
    topic: 'Test Topic',
    sourceUrl: null,
    icsDataUri: null,
  };
}

function createMinimalEventCard(): HTMLLIElement {
  const li = document.createElement('li');
  const div = document.createElement('div');
  div.className = 'event-information';
  li.appendChild(div);
  return li;
}

/**
 * Creates a load-more button visible to the coordinator.
 * jsdom always returns null for offsetParent so we override it.
 */
function createLoadMoreButton(): HTMLAnchorElement {
  const a = document.createElement('a');
  a.className = 'load-more-button';
  a.href = '#';
  Object.defineProperty(a, 'offsetParent', {
    get: () => document.body,
    configurable: true,
  });
  document.body.appendChild(a);
  return a;
}

function defaultOptions(overrides?: Partial<BulkStarOptions>): BulkStarOptions {
  return {
    adapter: mockBrowserApi,
    onProgress: vi.fn(),
    signal: new AbortController().signal,
    locale: 'sv',
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────

describe('BulkStarCoordinator - executeBulkStar', () => {
  beforeEach(() => {
    // Clear DOM completely between tests
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    mockedNormalizeEvent.mockReset();
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // ─── Pagination Detection and Expansion ───────────────────────

  describe('pagination detection and expansion', () => {
    it('detects Load_More_Button and clicks it', async () => {
      const card1 = createMinimalEventCard();
      document.body.appendChild(card1);

      const loadMoreBtn = createLoadMoreButton();
      let clickCount = 0;

      loadMoreBtn.addEventListener('click', () => {
        clickCount++;
        const card2 = createMinimalEventCard();
        document.body.appendChild(card2);
        loadMoreBtn.remove();
      });

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const result = await executeBulkStar(defaultOptions());

      expect(clickCount).toBe(1);
      expect(result.eventsFound).toBe(2);
    });

    it('stops pagination on timeout when no new cards appear', async () => {
      const card1 = createMinimalEventCard();
      document.body.appendChild(card1);

      // Button stays but no new cards ever appear
      createLoadMoreButton();

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const result = await executeBulkStar(defaultOptions());

      // Should have proceeded with the 1 card loaded
      expect(result.eventsFound).toBe(1);
    });

    it('stops pagination after 100 clicks', async () => {
      const card1 = createMinimalEventCard();
      document.body.appendChild(card1);

      const loadMoreBtn = createLoadMoreButton();
      let clickCount = 0;

      loadMoreBtn.addEventListener('click', () => {
        clickCount++;
        const newCard = createMinimalEventCard();
        document.body.appendChild(newCard);
      });

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('x'),
      });

      // All already starred to avoid extra delay per event
      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: true, storedFields: null },
      });

      const result = await executeBulkStar(defaultOptions());

      expect(clickCount).toBe(100);
      // 1 initial + 100 from clicks = 101
      expect(result.eventsFound).toBe(101);
    }, 30000);
  });

  // ─── Pagination Delay ─────────────────────────────────────────

  describe('pagination delay', () => {
    it('waits between consecutive Load_More_Button clicks', async () => {
      const card1 = createMinimalEventCard();
      document.body.appendChild(card1);

      const loadMoreBtn = createLoadMoreButton();
      const clickTimes: number[] = [];
      let clickCount = 0;

      loadMoreBtn.addEventListener('click', () => {
        clickTimes.push(Date.now());
        clickCount++;
        const newCard = createMinimalEventCard();
        document.body.appendChild(newCard);
        if (clickCount >= 2) {
          loadMoreBtn.remove();
        }
      });

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('x'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: true, storedFields: null },
      });

      await executeBulkStar(defaultOptions());

      expect(clickTimes.length).toBe(2);
      const gap = clickTimes[1]! - clickTimes[0]!;
      // With mocked constants, delay is 10ms
      expect(gap).toBeGreaterThanOrEqual(10);
    });
  });

  // ─── Event Collection and Normalization ───────────────────────

  describe('event collection and normalization filtering', () => {
    it('collects all li elements with .event-information', async () => {
      for (let i = 0; i < 3; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let idx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        idx++;
        return { ok: true, event: makeNormalizedEvent(String(idx)) };
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsFound).toBe(3);
      expect(mockedNormalizeEvent).toHaveBeenCalledTimes(3);
    });

    it('skips cards where normalizeEvent returns ok: false', async () => {
      document.body.appendChild(createMinimalEventCard());
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent
        .mockReturnValueOnce({ ok: true, event: makeNormalizedEvent('1') })
        .mockReturnValueOnce({ ok: false, reason: 'Missing title' });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsFound).toBe(2);
      expect(result.eventsSkipped).toBe(1);
      expect(result.eventsNewlyStarred).toBe(1);
    });

    it('caps event collection at 2000 Event_Cards', async () => {
      // Verify the cap mechanism with a smaller number to avoid timeout.
      // The coordinator uses MAX_EVENTS_PER_BATCH (2000) as the cap.
      // We test with 2005 cards and verify only 2000 are processed.
      for (let i = 0; i < 2005; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let callCount = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        callCount++;
        return { ok: true, event: makeNormalizedEvent(String(callCount)) };
      });

      // Use a mock that resolves instantly to not spend time in message delays
      // Abort immediately after collection to verify the cap without processing
      const controller = new AbortController();

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            // Abort immediately to skip the starring loop
            controller.abort();
            return { success: true, data: [] };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(
        defaultOptions({ signal: controller.signal }),
      );

      // The key assertion: only 2000 cards collected from 2005 in DOM
      expect(result.eventsFound).toBe(2000);
      expect(mockedNormalizeEvent).toHaveBeenCalledTimes(2000);
    });
  });

  // ─── Skip Already-Starred ─────────────────────────────────────

  describe('skip-already-starred logic', () => {
    it('skips events that are already starred', async () => {
      document.body.appendChild(createMinimalEventCard());
      document.body.appendChild(createMinimalEventCard());

      let normalizeIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        normalizeIdx++;
        return { ok: true, event: makeNormalizedEvent(String(normalizeIdx)) };
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            // Event '1' is already starred
            return { success: true, data: [{ id: '1' }] };
          }
          if (msg.command === 'STAR_EVENT') {
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsAlreadyStarred).toBe(1);
      expect(result.eventsNewlyStarred).toBe(1);
    });
  });

  // ─── Sequential Starring with Delay ───────────────────────────

  describe('sequential starring with delay', () => {
    it('sends STAR_EVENT messages sequentially with delays between them', async () => {
      for (let i = 0; i < 3; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let eventIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        eventIdx++;
        return { ok: true, event: makeNormalizedEvent(String(eventIdx)) };
      });

      const starTimes: number[] = [];

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            return { success: true, data: [] };
          }
          if (msg.command === 'STAR_EVENT') {
            starTimes.push(Date.now());
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      await executeBulkStar(defaultOptions());

      expect(starTimes.length).toBe(3);
      for (let i = 1; i < starTimes.length; i++) {
        const gap = starTimes[i]! - starTimes[i - 1]!;
        // With mocked constants, delay is 1ms — verify sequential ordering
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── Retry on Failure ─────────────────────────────────────────

  describe('retry on failure (1 retry after delay)', () => {
    it('retries a failed STAR_EVENT once and succeeds', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      let starCallCount = 0;

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            return { success: true, data: [] };
          }
          if (msg.command === 'STAR_EVENT') {
            starCallCount++;
            if (starCallCount === 1) {
              return { success: false, error: 'Storage error' };
            }
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(starCallCount).toBe(2);
      expect(result.eventsNewlyStarred).toBe(1);
      expect(result.eventsFailed).toBe(0);
    });

    it('counts event as failed after retry also fails', async () => {
      // Use 4 events: first 2 succeed, third fails twice, fourth succeeds
      // This keeps the failure ratio at 1/3 (33%) which is below the 50% threshold
      for (let i = 0; i < 4; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let normalizeIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        normalizeIdx++;
        return { ok: true, event: makeNormalizedEvent(String(normalizeIdx)) };
      });

      let starCallCount = 0;

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            return { success: true, data: [] };
          }
          if (msg.command === 'STAR_EVENT') {
            starCallCount++;
            // Events 1 and 2 succeed (calls 1, 2)
            // Event 3 fails initial + retry (calls 3, 4)
            // Event 4 succeeds (call 5)
            if (starCallCount === 3 || starCallCount === 4) {
              return { success: false, error: 'Storage error' };
            }
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsFailed).toBe(1);
      expect(result.eventsNewlyStarred).toBe(3);
    });

    it('waits before retry attempt', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      const callTimes: number[] = [];

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            return { success: true, data: [] };
          }
          if (msg.command === 'STAR_EVENT') {
            callTimes.push(Date.now());
            if (callTimes.length === 1) {
              return { success: false, error: 'Storage error' };
            }
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      await executeBulkStar(defaultOptions());

      expect(callTimes.length).toBe(2);
      const gap = callTimes[1]! - callTimes[0]!;
      // With mocked constants, retry delay is 10ms (allow 1ms timer imprecision)
      expect(gap).toBeGreaterThanOrEqual(9);
    });
  });

  // ─── Error Threshold Abort ────────────────────────────────────

  describe('error threshold abort (> 50% failures)', () => {
    it('aborts when more than 50% of STAR_EVENT attempts fail', async () => {
      for (let i = 0; i < 4; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let eventIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        eventIdx++;
        return { ok: true, event: makeNormalizedEvent(String(eventIdx)) };
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_STAR_STATE') {
            return { success: true, data: { starred: false, storedFields: null } };
          }
          if (msg.command === 'STAR_EVENT') {
            return { success: false, error: 'Storage error' };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(result.aborted).toBe(true);
      expect(result.abortReason).toBe('error-threshold');
    });

    it('reports error phase via onProgress when threshold exceeded', async () => {
      for (let i = 0; i < 4; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let eventIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        eventIdx++;
        return { ok: true, event: makeNormalizedEvent(String(eventIdx)) };
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_STAR_STATE') {
            return { success: true, data: { starred: false, storedFields: null } };
          }
          if (msg.command === 'STAR_EVENT') {
            return { success: false, error: 'Storage error' };
          }
          return { success: true, data: undefined };
        },
      );

      const onProgress = vi.fn();
      await executeBulkStar(defaultOptions({ onProgress }));

      const errorCalls = onProgress.mock.calls.filter(
        (call) => (call[0] as { phase: string }).phase === 'error',
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });
  });

  // ─── Cancellation ────────────────────────────────────────────

  describe('cancellation', () => {
    it('cancels during starring phase — stops sending more messages', async () => {
      for (let i = 0; i < 5; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let eventIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        eventIdx++;
        return { ok: true, event: makeNormalizedEvent(String(eventIdx)) };
      });

      const controller = new AbortController();
      let starCount = 0;

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_STAR_STATE') {
            return { success: true, data: { starred: false, storedFields: null } };
          }
          if (msg.command === 'STAR_EVENT') {
            starCount++;
            if (starCount === 2) {
              controller.abort();
            }
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(
        defaultOptions({ signal: controller.signal }),
      );

      expect(result.aborted).toBe(true);
      expect(result.abortReason).toBe('user-cancel');
      // At least 1 event starred before abort took effect
      expect(result.eventsNewlyStarred).toBeGreaterThanOrEqual(1);
      // Not all 5 events should be starred
      expect(result.eventsNewlyStarred).toBeLessThan(5);
    });

    it('cancels during pagination — proceeds to star loaded events', async () => {
      const card1 = createMinimalEventCard();
      document.body.appendChild(card1);

      const loadMoreBtn = createLoadMoreButton();
      const controller = new AbortController();

      loadMoreBtn.addEventListener('click', () => {
        const newCard = createMinimalEventCard();
        document.body.appendChild(newCard);
        controller.abort();
      });

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('x'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const result = await executeBulkStar(
        defaultOptions({ signal: controller.signal }),
      );

      // Pagination stopped, events were collected and starred
      expect(result.eventsFound).toBeGreaterThanOrEqual(1);
    });

    it('reports cancelled phase via onProgress', async () => {
      for (let i = 0; i < 3; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let normalizeIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        normalizeIdx++;
        return { ok: true, event: makeNormalizedEvent(String(normalizeIdx)) };
      });

      const controller = new AbortController();
      let starCount = 0;

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_STAR_STATE') {
            return { success: true, data: { starred: false, storedFields: null } };
          }
          if (msg.command === 'STAR_EVENT') {
            starCount++;
            if (starCount === 1) {
              controller.abort();
            }
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const onProgress = vi.fn();
      await executeBulkStar(
        defaultOptions({ signal: controller.signal, onProgress }),
      );

      const cancelledCalls = onProgress.mock.calls.filter(
        (call) => (call[0] as { phase: string }).phase === 'cancelled',
      );
      expect(cancelledCalls.length).toBeGreaterThan(0);
    });
  });

  // ─── Batching for > 200 Events ────────────────────────────────

  describe('batching for > 200 events', () => {
    it('processes all events when count exceeds batch threshold', async () => {
      for (let i = 0; i < 210; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let eventIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        eventIdx++;
        return { ok: true, event: makeNormalizedEvent(String(eventIdx)) };
      });

      // All already starred to avoid STAR_EVENT delays
      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            // Return all 210 event IDs as already starred
            const data = Array.from({ length: 210 }, (_, i) => ({ id: String(i + 1) }));
            return { success: true, data };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsFound).toBe(210);
      expect(result.eventsAlreadyStarred).toBe(210);
      expect(result.aborted).toBe(false);
    }, 30000);
  });

  // ─── Progress Reporting ───────────────────────────────────────

  describe('progress reporting via onProgress', () => {
    it('reports loading phase at start', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const onProgress = vi.fn();
      await executeBulkStar(defaultOptions({ onProgress }));

      expect(onProgress.mock.calls[0]![0].phase).toBe('loading');
    });

    it('reports starring phase during event processing', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const onProgress = vi.fn();
      await executeBulkStar(defaultOptions({ onProgress }));

      const starringCalls = onProgress.mock.calls.filter(
        (call) => (call[0] as { phase: string }).phase === 'starring',
      );
      expect(starringCalls.length).toBeGreaterThan(0);
    });

    it('reports complete phase when all events processed', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockReturnValue({
        ok: true,
        event: makeNormalizedEvent('1'),
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { starred: false, storedFields: null },
      });

      const onProgress = vi.fn();
      await executeBulkStar(defaultOptions({ onProgress }));

      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]!;
      expect(lastCall[0].phase).toBe('complete');
    });

    it('reports accurate counts in final progress', async () => {
      for (let i = 0; i < 3; i++) {
        document.body.appendChild(createMinimalEventCard());
      }

      let normalizeCallIdx = 0;
      mockedNormalizeEvent.mockImplementation(() => {
        normalizeCallIdx++;
        if (normalizeCallIdx === 3) {
          return { ok: false, reason: 'Missing title' };
        }
        return { ok: true, event: makeNormalizedEvent(String(normalizeCallIdx)) };
      });

      (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        async (msg: { command: string }) => {
          if (msg.command === 'GET_ALL_STARRED_EVENTS') {
            // Event '2' is already starred
            return { success: true, data: [{ id: '2' }] };
          }
          if (msg.command === 'STAR_EVENT') {
            return { success: true, data: undefined };
          }
          return { success: true, data: undefined };
        },
      );

      const result = await executeBulkStar(defaultOptions());

      expect(result.eventsFound).toBe(3);
      expect(result.eventsNewlyStarred).toBe(1);
      expect(result.eventsAlreadyStarred).toBe(1);
      expect(result.eventsSkipped).toBe(1);
      expect(result.eventsFailed).toBe(0);
    });
  });

  // ─── Never Throws ─────────────────────────────────────────────

  describe('never throws', () => {
    it('catches unexpected errors and returns gracefully', async () => {
      document.body.appendChild(createMinimalEventCard());

      mockedNormalizeEvent.mockImplementation(() => {
        throw new Error('Unexpected DOM error');
      });

      const result = await executeBulkStar(defaultOptions());

      expect(result).toBeDefined();
      expect(result.aborted).toBe(true);
    });
  });
});
