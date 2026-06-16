/**
 * Property-based test for collection/filtering logic in executeBulkStar.
 *
 * Feature: bulk-star-filtered, Property 2: Collection yields only valid normalized events
 * Validates: Requirements 3.1, 3.2, 7.1
 *
 * For any set of `li` elements in the DOM where some contain `.event-information`
 * and some do not, and where some normalizable cards produce `ok: true` and some
 * produce `ok: false`, the collected event set SHALL contain exactly those events
 * where the element is a valid Event_Card AND normalization succeeds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { NormalizerResult, NormalizedEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

// Feature: bulk-star-filtered, Property 2: Collection yields only valid normalized events

// Mock the event-normalizer module so we control which cards pass/fail
vi.mock('#core/event-normalizer', () => ({
  normalizeEvent: vi.fn(),
}));

// Import after mock setup
import { normalizeEvent } from '#core/event-normalizer';
import { executeBulkStar } from '#extension/bulk-star-coordinator';

const mockedNormalizeEvent = vi.mocked(normalizeEvent);

// ─── Generators ───────────────────────────────────────────────────

interface DomElementSpec {
  readonly tag: 'li' | 'div' | 'span' | 'section';
  readonly hasEventInfo: boolean;
  readonly normalizeOk: boolean;
  readonly eventId: string;
}

/**
 * Generates a specification for a DOM element that may or may not be
 * an Event_Card and may or may not normalize successfully.
 */
const domElementSpecArb: fc.Arbitrary<DomElementSpec> = fc.record({
  tag: fc.constantFrom('li' as const, 'div' as const, 'span' as const, 'section' as const),
  hasEventInfo: fc.boolean(),
  normalizeOk: fc.boolean(),
  eventId: fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 16 })
    .map((nums) => nums.map((n) => n.toString(16)).join('')),
});

/**
 * Generates an array of 1–30 DOM element specs representing a page.
 */
const pageSpecArb: fc.Arbitrary<readonly DomElementSpec[]> = fc.array(domElementSpecArb, {
  minLength: 1,
  maxLength: 30,
});

// ─── Helpers ──────────────────────────────────────────────────────

function buildDom(specs: readonly DomElementSpec[]): void {
  document.body.innerHTML = '';
  const container = document.createElement('div');

  for (const spec of specs) {
    const el = document.createElement(spec.tag);
    if (spec.hasEventInfo) {
      const infoDiv = document.createElement('div');
      infoDiv.className = 'event-information';
      el.appendChild(infoDiv);
    }
    // Mark with data attribute so we can identify in mock
    el.setAttribute('data-test-id', spec.eventId);
    container.appendChild(el);
  }

  document.body.appendChild(container);
}

function makeNormalizedEvent(id: string): NormalizedEvent {
  return {
    id,
    title: `Event ${id}`,
    organiser: null,
    startDateTime: '2026-06-22T07:30:00+02:00',
    endDateTime: null,
    location: null,
    description: null,
    topic: null,
    sourceUrl: null,
    icsDataUri: null,
  };
}

function setupNormalizerMock(specs: readonly DomElementSpec[]): void {
  // Build a map of element index to normalize result.
  // The coordinator calls normalizeEvent for each `li` with `.event-information`.
  // We track call order to map to the correct spec.
  let callIndex = 0;
  const validCards = specs.filter((s) => s.tag === 'li' && s.hasEventInfo);

  mockedNormalizeEvent.mockImplementation((_element: Element): NormalizerResult => {
    const spec = validCards[callIndex];
    callIndex++;

    if (!spec) {
      return { ok: false, reason: 'Unknown element' };
    }

    if (spec.normalizeOk) {
      return { ok: true, event: makeNormalizedEvent(spec.eventId) };
    } else {
      return { ok: false, reason: `Normalization failed for ${spec.eventId}` };
    }
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Property 2: Collection yields only valid normalized events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedNormalizeEvent.mockReset();

    // Mock GET_STAR_STATE to return starred: false for all events (no skipping)
    (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
      async (message: { command: string }) => {
        if (message.command === 'GET_STAR_STATE') {
          return { success: true, data: { starred: false, storedFields: null } };
        }
        if (message.command === 'STAR_EVENT') {
          return { success: true, data: undefined };
        }
        return { success: true, data: undefined };
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * The STAR_EVENT messages sent correspond exactly to the cards that are:
   * 1. `li` elements with `.event-information` descendant
   * 2. AND normalizeEvent returns `ok: true`
   */
  it('stars exactly the cards that are valid Event_Cards AND normalize successfully', async () => {
    await fc.assert(
      fc.asyncProperty(pageSpecArb, async (specs) => {
        // Reset state for each run
        document.body.innerHTML = '';
        mockedNormalizeEvent.mockReset();
        (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockReset();
        (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
          async (message: { command: string }) => {
            if (message.command === 'GET_STAR_STATE') {
              return { success: true, data: { starred: false, storedFields: null } };
            }
            if (message.command === 'STAR_EVENT') {
              return { success: true, data: undefined };
            }
            return { success: true, data: undefined };
          },
        );

        // Build DOM from spec
        buildDom(specs);

        // Set up normalizer mock
        setupNormalizerMock(specs);

        // Compute expected: li elements with .event-information where normalizeOk is true
        const expectedStarredIds = specs
          .filter((s) => s.tag === 'li' && s.hasEventInfo && s.normalizeOk)
          .map((s) => s.eventId);

        // Run the coordinator
        const controller = new AbortController();
        const progressFn = vi.fn();

        const resultPromise = executeBulkStar({
          adapter: mockBrowserApi,
          onProgress: progressFn,
          signal: controller.signal,
          locale: 'sv',
        });

        // Advance all timers to let the coordinator complete
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // Collect actual STAR_EVENT messages sent
        const sendMessageCalls = (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mock
          .calls;
        const starEventCalls = sendMessageCalls.filter(
          (call: unknown[]) =>
            (call[0] as { command: string }).command === 'STAR_EVENT',
        );
        const actualStarredIds = starEventCalls.map(
          (call: unknown[]) => (call[0] as { event: NormalizedEvent }).event.id,
        );

        // Property: starred event IDs must match expected
        expect(actualStarredIds).toEqual(expectedStarredIds);

        // Also verify counts
        const expectedSkipped = specs.filter(
          (s) => s.tag === 'li' && s.hasEventInfo && !s.normalizeOk,
        ).length;
        expect(result.eventsSkipped).toBe(expectedSkipped);
        expect(result.eventsNewlyStarred).toBe(expectedStarredIds.length);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.1, 7.1**
   *
   * Non-li elements (div, span, section) are never passed to normalizeEvent,
   * even if they contain `.event-information`.
   */
  it('non-li elements with .event-information are never collected', async () => {
    await fc.assert(
      fc.asyncProperty(pageSpecArb, async (specs) => {
        // Reset state
        document.body.innerHTML = '';
        mockedNormalizeEvent.mockReset();
        (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockReset();
        (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
          async (message: { command: string }) => {
            if (message.command === 'GET_STAR_STATE') {
              return { success: true, data: { starred: false, storedFields: null } };
            }
            if (message.command === 'STAR_EVENT') {
              return { success: true, data: undefined };
            }
            return { success: true, data: undefined };
          },
        );

        buildDom(specs);
        setupNormalizerMock(specs);

        const controller = new AbortController();
        const resultPromise = executeBulkStar({
          adapter: mockBrowserApi,
          onProgress: vi.fn(),
          signal: controller.signal,
          locale: 'en',
        });

        await vi.runAllTimersAsync();
        await resultPromise;

        // Count how many times normalizeEvent was called
        const callCount = mockedNormalizeEvent.mock.calls.length;

        // Expected: only li elements with .event-information get normalized
        const expectedCallCount = specs.filter(
          (s) => s.tag === 'li' && s.hasEventInfo,
        ).length;

        expect(callCount).toBe(expectedCallCount);
      }),
      { numRuns: 100 },
    );
  });
});
