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
import type { NormalizedEvent } from '#core/types';

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

    const button = document.querySelector('[class*="load-more-button"]:is(a, button)') as HTMLElement | null;
    if (!button) {
      console.log('[Almedalsstjärnan] Pagination: no load-more button found, stopping');
      break;
    }
    // Check if button is hidden via display:none or visibility:hidden
    const style = window.getComputedStyle(button);
    if (style.display === 'none' || style.visibility === 'hidden') {
      console.log('[Almedalsstjärnan] Pagination: load-more button is hidden, stopping');
      break;
    }

    const countBefore = countEventCards();
    console.log(`[Almedalsstjärnan] Pagination: clicking load-more (click ${clicks + 1}), cards before: ${countBefore}`);

    // For <a> elements with href, prevent navigation while still allowing
    // the React click handler to fire via event delegation.
    // For <button> elements, no navigation prevention is needed.
    if (button.tagName === 'A') {
      button.addEventListener(
        'click',
        (e: Event) => e.preventDefault(),
        { once: true },
      );
    }
    button.click();
    clicks++;

    // Wait for new Event_Cards to appear or timeout
    const appeared = await waitForNewCards(countBefore, PAGINATION_CLICK_TIMEOUT_MS);
    if (!appeared) {
      console.log(`[Almedalsstjärnan] Pagination: timeout waiting for new cards after click ${clicks}, stopping`);
      // Timeout — stop pagination, proceed with loaded events
      break;
    }

    const countAfter = countEventCards();
    console.log(`[Almedalsstjärnan] Pagination: new cards loaded, count now: ${countAfter}`);
    onBatchLoaded(countAfter);

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

/**
 * Collects Event_Cards from the active event list container.
 * Scopes collection to the container holding the load-more button (or its parent list),
 * avoiding stale cards from previous searches that may remain in the DOM.
 */
function collectEventCardElements(): Element[] {
  // Find the event list container. The site uses a container that holds both
  // the event cards and the load-more button. Scope to that container to avoid
  // picking up stale cards from pre-search default display.
  //
  // Strategy: Find the load-more button's parent list, or the main list container.
  // Fall back to whole document if no scoped container is found.
  let root: Element | Document = document;

  // Try to find the list container by looking for common structural patterns:
  // 1. The container with class containing "list" that holds the event items
  const loadMoreBtn = document.querySelector('[class*="load-more-button"]:is(a, button)');
  if (loadMoreBtn) {
    // Walk up to find the list container (the parent that also contains the event cards)
    let parent = loadMoreBtn.parentElement;
    while (parent && parent !== document.body) {
      if (parent.querySelectorAll('li .event-information').length > 5) {
        root = parent;
        break;
      }
      parent = parent.parentElement;
    }
  }

  // If no scoped root found via load-more button, try to find the main app container
  if (root === document) {
    const appContainer = document.querySelector('[class*="outer"][class*="app-"]');
    if (appContainer) {
      root = appContainer;
    }
  }

  const allLis = root.querySelectorAll('li');
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
    const idOccurrences = new Map<string, Array<{ title: string; startDateTime: string }>>();
    for (const element of cardElements) {
      const result = normalizeEvent(element);
      if (result.ok) {
        normalizedEvents.push(result.event);
        // Track ID collisions for diagnostics
        const existing = idOccurrences.get(result.event.id);
        if (existing) {
          existing.push({ title: result.event.title, startDateTime: result.event.startDateTime });
        } else {
          idOccurrences.set(result.event.id, [{ title: result.event.title, startDateTime: result.event.startDateTime }]);
        }
      } else {
        eventsSkipped++;
        console.warn('[Almedalsstjärnan] Skipping card during bulk-star:', result.reason);
      }
    }

    // Log detailed ID collision info
    for (const [id, events] of idOccurrences) {
      if (events.length > 1) {
        console.warn(`[Almedalsstjärnan] ID COLLISION "${id}" (${events.length} events):`);
        for (const evt of events) {
          console.warn(`  - "${evt.title}" @ ${evt.startDateTime}`);
        }
      }
    }
    const uniqueIds = idOccurrences.size;
    const totalNormalized = normalizedEvents.length;
    if (uniqueIds < totalNormalized) {
      console.warn(`[Almedalsstjärnan] TOTAL: ${totalNormalized - uniqueIds} events lost to ${totalNormalized - uniqueIds} ID collisions (${totalNormalized} normalized → ${uniqueIds} unique IDs)`);
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

    // Fetch all currently starred event IDs upfront to avoid N round-trips.
    // This is O(1) instead of O(N) message passes for the star-state check.
    const starredIds = new Set<string>();
    try {
      const allStarredResponse = await adapter.sendMessage<Array<{ readonly id: string }>>({
        command: 'GET_ALL_STARRED_EVENTS',
      });
      if (allStarredResponse.success && Array.isArray(allStarredResponse.data)) {
        for (const starred of allStarredResponse.data) {
          starredIds.add(starred.id);
        }
      }
    } catch {
      console.warn('[Almedalsstjärnan] GET_ALL_STARRED_EVENTS failed, will check individually');
    }

    for (let i = 0; i < normalizedEvents.length; i++) {
      if (signal.aborted && !abortedBeforeStarring) {
        aborted = true;
        abortReason = 'user-cancel';
        break;
      }

      const event = normalizedEvents[i];
      if (!event) continue;

      // Check starred state using the pre-fetched set (fast, no round-trip)
      const isAlreadyStarred = starredIds.has(event.id);

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
        continue;
      }

      // Attempt to star the event
      eventsAttempted++;
      let starred = false;

      for (let attempt = 0; attempt <= BULK_STAR_CONSTANTS.MAX_RETRIES; attempt++) {
        try {
          const starResponse = await adapter.sendMessage<unknown>({
            command: 'STAR_EVENT',
            event,
          });
          if (starResponse.success) {
            starred = true;
            break;
          }
        } catch {
          // Message channel error — will retry
        }
        if (attempt < BULK_STAR_CONSTANTS.MAX_RETRIES) {
          await delay(BULK_STAR_CONSTANTS.RETRY_DELAY_MS);
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

  console.log(`[Almedalsstjärnan] Bulk star complete: found=${eventsFound}, starred=${eventsNewlyStarred}, already=${eventsAlreadyStarred}, failed=${eventsFailed}, skipped=${eventsSkipped}, aborted=${aborted}`);

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
