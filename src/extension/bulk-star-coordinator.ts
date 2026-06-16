/**
 * Bulk Star Coordinator — orchestrates the full bulk-star workflow.
 *
 * Expands all pagination, collects Event_Cards as a snapshot, normalizes them,
 * checks starred state, and sequentially stars unstarred events via the
 * background worker.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5,
 *              3.6, 3.7, 3.8, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3,
 *              7.4, 7.5, 8.1, 8.2, 8.3
 */

import { normalizeEvent } from '#core/event-normalizer';
import type { NormalizedEvent, GetStarStateData } from '#core/types';

import { BULK_STAR_CONSTANTS } from '#extension/bulk-star-constants';
import type { BulkStarOptions, BulkStarResult } from '#extension/bulk-star-types';

// ─── Helpers ──────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function countEventCards(): number {
  const allLis = document.querySelectorAll('li');
  let count = 0;
  for (const li of allLis) {
    if (li.querySelector('.event-information')) {
      count++;
    }
  }
  return count;
}

// ─── Pagination Expansion ─────────────────────────────────────────

async function expandPagination(
  signal: AbortSignal,
  onBatchLoaded: (count: number) => void,
): Promise<void> {
  const {
    MAX_PAGINATION_CLICKS,
    PAGINATION_CLICK_TIMEOUT_MS,
    PAGINATION_CLICK_DELAY_MS,
  } = BULK_STAR_CONSTANTS;

  let clicks = 0;

  while (clicks < MAX_PAGINATION_CLICKS) {
    if (signal.aborted) {
      break;
    }

    const button = document.querySelector('a[class*="load-more-button"]') as HTMLElement | null;
    if (!button || button.offsetParent === null) {
      break;
    }

    const countBefore = countEventCards();
    button.click();
    clicks++;

    // Wait for new Event_Cards to appear or timeout
    const appeared = await waitForNewCards(countBefore, PAGINATION_CLICK_TIMEOUT_MS);
    if (!appeared) {
      // Timeout — stop pagination, proceed with loaded events
      break;
    }

    onBatchLoaded(countEventCards());

    // Wait between clicks
    await delay(PAGINATION_CLICK_DELAY_MS);
  }
}

function waitForNewCards(previousCount: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = (): void => {
      const currentCount = countEventCards();
      if (currentCount > previousCount) {
        resolve(true);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 50);
    };

    check();
  });
}

// ─── Event Collection ─────────────────────────────────────────────

function collectEventCardElements(): Element[] {
  const allLis = document.querySelectorAll('li');
  const cards: Element[] = [];
  for (const li of allLis) {
    if (li.querySelector('.event-information')) {
      cards.push(li);
    }
    if (cards.length >= BULK_STAR_CONSTANTS.MAX_EVENTS_PER_BATCH) {
      break;
    }
  }
  return cards;
}

// ─── Main Coordinator ─────────────────────────────────────────────

/**
 * Executes the full bulk-star workflow. Never throws.
 */
export async function executeBulkStar(options: BulkStarOptions): Promise<BulkStarResult> {
  const { adapter, onProgress, signal } = options;

  let eventsNewlyStarred = 0;
  let eventsAlreadyStarred = 0;
  let eventsFailed = 0;
  let eventsSkipped = 0;
  let eventsFound = 0;
  let aborted = false;
  let abortReason: 'user-cancel' | 'error-threshold' | null = null;

  try {
    // ─── Phase 1: Pagination Expansion ────────────────────────────
    onProgress({
      phase: 'loading',
      eventsLoaded: countEventCards(),
      eventsProcessed: 0,
      eventsTotal: 0,
      eventsNewlyStarred: 0,
      eventsAlreadyStarred: 0,
      eventsFailed: 0,
      eventsSkipped: 0,
    });

    await expandPagination(signal, (loaded) => {
      onProgress({
        phase: 'loading',
        eventsLoaded: loaded,
        eventsProcessed: 0,
        eventsTotal: 0,
        eventsNewlyStarred: 0,
        eventsAlreadyStarred: 0,
        eventsFailed: 0,
        eventsSkipped: 0,
      });
    });

    // ─── Phase 2: Snapshot Collection ─────────────────────────────
    const cardElements = collectEventCardElements();
    eventsFound = cardElements.length;

    // Normalize all cards
    const normalizedEvents: NormalizedEvent[] = [];
    for (const element of cardElements) {
      const result = normalizeEvent(element);
      if (result.ok) {
        normalizedEvents.push(result.event);
      } else {
        eventsSkipped++;
        console.warn('[Almedalsstjärnan] Skipping card during bulk-star:', result.reason);
      }
    }

    const eventsTotal = normalizedEvents.length + eventsSkipped;

    onProgress({
      phase: 'starring',
      eventsLoaded: eventsFound,
      eventsProcessed: 0,
      eventsTotal,
      eventsNewlyStarred: 0,
      eventsAlreadyStarred: 0,
      eventsFailed: 0,
      eventsSkipped,
    });

    // ─── Phase 3: Star State Check & Starring ─────────────────────
    // Track whether the signal was already aborted before entering the starring phase.
    // Per Req 4.5, cancellation during pagination should NOT prevent starring of
    // already-loaded events — only cancellation during the starring phase itself
    // should stop further STAR_EVENT messages (Req 4.6).
    const abortedBeforeStarring = signal.aborted;
    const useBatching = normalizedEvents.length > BULK_STAR_CONSTANTS.BATCH_THRESHOLD;
    let eventsProcessed = 0;
    let eventsAttempted = 0;

    for (let i = 0; i < normalizedEvents.length; i++) {
      if (signal.aborted && !abortedBeforeStarring) {
        aborted = true;
        abortReason = 'user-cancel';
        break;
      }

      const event = normalizedEvents[i];
      if (!event) continue;

      // Check starred state
      let isAlreadyStarred = false;
      try {
        const stateResponse = await adapter.sendMessage<GetStarStateData>({
          command: 'GET_STAR_STATE',
          eventId: event.id,
        });
        if (stateResponse.success) {
          const data = stateResponse.data as GetStarStateData;
          isAlreadyStarred = data.starred;
        }
      } catch {
        // If GET_STAR_STATE fails, treat as unstarred (Req 7: error handling)
        console.warn('[Almedalsstjärnan] GET_STAR_STATE failed for event:', event.id);
      }

      if (isAlreadyStarred) {
        eventsAlreadyStarred++;
        eventsProcessed++;
        onProgress({
          phase: 'starring',
          eventsLoaded: eventsFound,
          eventsProcessed,
          eventsTotal,
          eventsNewlyStarred,
          eventsAlreadyStarred,
          eventsFailed,
          eventsSkipped,
        });
        // Rate limit between messages
        await delay(BULK_STAR_CONSTANTS.STAR_MESSAGE_DELAY_MS);
        continue;
      }

      // Attempt to star the event
      eventsAttempted++;
      let starred = false;

      try {
        const starResponse = await adapter.sendMessage<unknown>({
          command: 'STAR_EVENT',
          event,
        });
        starred = starResponse.success;
      } catch {
        starred = false;
      }

      // Retry once on failure
      if (!starred) {
        await delay(BULK_STAR_CONSTANTS.RETRY_DELAY_MS);
        try {
          const retryResponse = await adapter.sendMessage<unknown>({
            command: 'STAR_EVENT',
            event,
          });
          starred = retryResponse.success;
        } catch {
          starred = false;
        }
      }

      if (starred) {
        eventsNewlyStarred++;
      } else {
        eventsFailed++;
        console.warn('[Almedalsstjärnan] STAR_EVENT failed for event:', event.id);
      }

      eventsProcessed++;

      // Check error threshold abort
      if (eventsAttempted > 0 && eventsFailed / eventsAttempted > BULK_STAR_CONSTANTS.ERROR_ABORT_THRESHOLD) {
        aborted = true;
        abortReason = 'error-threshold';
        onProgress({
          phase: 'error',
          eventsLoaded: eventsFound,
          eventsProcessed,
          eventsTotal,
          eventsNewlyStarred,
          eventsAlreadyStarred,
          eventsFailed,
          eventsSkipped,
        });
        break;
      }

      onProgress({
        phase: 'starring',
        eventsLoaded: eventsFound,
        eventsProcessed,
        eventsTotal,
        eventsNewlyStarred,
        eventsAlreadyStarred,
        eventsFailed,
        eventsSkipped,
      });

      // Rate limit between STAR_EVENT messages
      await delay(BULK_STAR_CONSTANTS.STAR_MESSAGE_DELAY_MS);

      // Batching: yield to main thread every BATCH_SIZE events when > BATCH_THRESHOLD
      if (useBatching && (i + 1) % BULK_STAR_CONSTANTS.BATCH_SIZE === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    // ─── Phase 4: Final Progress Report ───────────────────────────
    if (!aborted) {
      onProgress({
        phase: 'complete',
        eventsLoaded: eventsFound,
        eventsProcessed,
        eventsTotal,
        eventsNewlyStarred,
        eventsAlreadyStarred,
        eventsFailed,
        eventsSkipped,
      });
    } else if (abortReason === 'user-cancel') {
      onProgress({
        phase: 'cancelled',
        eventsLoaded: eventsFound,
        eventsProcessed,
        eventsTotal,
        eventsNewlyStarred,
        eventsAlreadyStarred,
        eventsFailed,
        eventsSkipped,
      });
    }
  } catch (error: unknown) {
    // Never throw — catch all exceptions
    console.warn(
      '[Almedalsstjärnan] Bulk operation error:',
      error instanceof Error ? error.message : String(error),
    );
    aborted = true;
    abortReason = 'error-threshold';
    onProgress({
      phase: 'error',
      eventsLoaded: eventsFound,
      eventsProcessed: 0,
      eventsTotal: 0,
      eventsNewlyStarred,
      eventsAlreadyStarred,
      eventsFailed,
      eventsSkipped,
    });
  }

  return {
    eventsFound,
    eventsNewlyStarred,
    eventsAlreadyStarred,
    eventsFailed,
    eventsSkipped,
    aborted,
    abortReason,
  };
}
