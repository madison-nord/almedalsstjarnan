/**
 * Content Script for the Almedalsstjärnan extension.
 *
 * Injected into almedalsveckan.info programme pages. Scans the DOM for
 * Event_Cards, injects Star_Buttons in Shadow DOM, and observes mutations
 * for dynamically added cards.
 *
 * Maintains cross-page consistency (same tab) via an internal eventId → StarButton[]
 * map, and cross-tab consistency via adapter.onStorageChanged listener.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.6, 5.7, 5.8, 5.9, 5.10,
 *              20.1, 20.2, 20.3, 20.4
 */

import type {
  IBrowserApiAdapter,
  EventId,
  NormalizedEvent,
  StarredEvent,
  GetStarStateData,
} from '#core/types';
import { normalizeEvent } from '#core/event-normalizer';
import { compareEventFields } from '#core/event-field-comparator';
import type { MutableFields } from '#core/event-field-comparator';
import { resolveEffectiveLocale } from '#core/locale-messages';
import type { SupportedLocale } from '#core/locale-messages';
import { createStarButton } from '#extension/star-button';
import { createBrowserApiAdapter } from '#core/browser-api-adapter';
import { createBulkStarButton } from '#extension/bulk-star-button';
import { createProgressIndicator } from '#extension/progress-indicator';
import { executeBulkStar } from '#extension/bulk-star-coordinator';

// ─── Internal State ───────────────────────────────────────────────

/** Maps eventId to all visible star button instances for cross-page consistency */
const starButtonMap = new Map<string, Array<{ readonly update: (starred: boolean) => void }>>();

/** Reference to the active MutationObserver (for cleanup on re-initialization) */
let activeObserver: MutationObserver | null = null;

// ─── Public API ───────────────────────────────────────────────────

/**
 * Checks whether an element is an Event_Card.
 * An Event_Card is an `li` element that contains a `.event-information` child div.
 */
export function isEventCard(element: Element): boolean {
  if (element.tagName !== 'LI') return false;
  return element.querySelector('.event-information') !== null;
}

/**
 * Finds all Event_Cards within a root element or document.
 * Returns `li` elements that contain a `.event-information` descendant.
 */
export function findEventCards(root: Element | Document): Element[] {
  const allLis = root.querySelectorAll('li');
  const cards: Element[] = [];
  for (const li of allLis) {
    if (isEventCard(li)) {
      cards.push(li);
    }
  }
  return cards;
}

/**
 * Processes a single Event_Card: normalizes event data, injects a Star_Button,
 * and wires up click handlers and cross-page consistency.
 *
 * Skips cards that are already initialized or where normalization fails.
 * Never throws — catches and logs warnings.
 */
export async function processEventCard(card: Element, adapter: IBrowserApiAdapter): Promise<void> {
  try {
    // Skip already-initialized cards
    if (card.getAttribute('data-almedals-planner-initialized') === '1') {
      return;
    }

    // Normalize event data from the card
    const result = normalizeEvent(card);
    if (!result.ok) {
      console.warn(`[Almedalsstjärnan] Skipping card: ${result.reason}`);
      return;
    }

    const event: NormalizedEvent = result.event;
    const eventId: EventId = event.id;

    // Determine initial star state and get stored fields for refresh comparison
    const response = await adapter.sendMessage<GetStarStateData>({
      command: 'GET_STAR_STATE',
      eventId,
    });

    const starStateData = response.success
      ? (response.data as GetStarStateData)
      : { starred: false, storedFields: null };
    const initialStarred = starStateData.starred;

    // Create host container for the star button
    const host = document.createElement('span');
    host.className = 'almedals-star-host';
    host.setAttribute('data-event-id', eventId);
    // Use inline-flex + vertical-align:middle inside the h2 so it sits
    // on the same line as the title text, centered with the first line
    host.style.cssText = 'display: inline-flex; vertical-align: -1px; margin-right: 1px;';

    // Insert the host INSIDE the h2 element as the first child
    // This ensures it's truly inline with the title text regardless of
    // any flex/block layout on parent elements
    const titleH2 = card.querySelector('a.title h2');
    if (titleH2) {
      titleH2.insertBefore(host, titleH2.firstChild);
    } else {
      // Fallback: append to the event-information-inner div
      const inner = card.querySelector('.event-information-inner');
      if (inner) {
        inner.insertBefore(host, inner.firstChild);
      } else {
        card.appendChild(host);
      }
    }

    // Create the star button in Shadow DOM
    const starButton = createStarButton(host, {
      eventId,
      initialStarred,
      adapter,
      onStar: async (id: string) => {
        try {
          const starResponse = await adapter.sendMessage({
            command: 'STAR_EVENT',
            event,
          });
          if (starResponse.success) {
            // Update all star buttons for this eventId (cross-page consistency)
            updateAllButtonsForEvent(id, true);
          } else {
            // Revert and flash error
            updateAllButtonsForEvent(id, false);
            flashError(host);
          }
        } catch {
          // Revert and flash error
          updateAllButtonsForEvent(id, false);
          flashError(host);
          console.warn('[Almedalsstjärnan] STAR_EVENT failed for event:', id);
        }
      },
      onUnstar: async (id: string) => {
        try {
          const unstarResponse = await adapter.sendMessage({
            command: 'UNSTAR_EVENT',
            eventId: id,
          });
          if (unstarResponse.success) {
            // Update all star buttons for this eventId (cross-page consistency)
            updateAllButtonsForEvent(id, false);
          } else {
            // Revert and flash error
            updateAllButtonsForEvent(id, true);
            flashError(host);
          }
        } catch {
          // Revert and flash error
          updateAllButtonsForEvent(id, true);
          flashError(host);
          console.warn('[Almedalsstjärnan] UNSTAR_EVENT failed for event:', id);
        }
      },
    });

    // Register in the eventId → StarButton[] map
    if (!starButtonMap.has(eventId)) {
      starButtonMap.set(eventId, []);
    }
    starButtonMap.get(eventId)?.push(starButton);

    // Mark card as initialized
    card.setAttribute('data-almedals-planner-initialized', '1');

    // --- Refresh logic (non-blocking, fire-and-forget) ---
    if (starStateData.starred && starStateData.storedFields) {
      void refreshStarredEventData(event, starStateData.storedFields, eventId, adapter);
    }
  } catch (error: unknown) {
    // Never throw from content script

    console.warn(
      '[Almedalsstjärnan] Error processing event card:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Initializes the content script: scans existing DOM, sets up MutationObserver,
 * and registers cross-tab storage change listener.
 */
export function initContentScript(adapter: IBrowserApiAdapter): void {
  // Clean up previous initialization if any
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  starButtonMap.clear();

  // Scan existing DOM for Event_Cards
  const existingCards = findEventCards(document);
  for (const card of existingCards) {
    void processEventCard(card, adapter);
  }

  // Mutable reference for bulk star button — assigned after creation below.
  // Allows the MutationObserver to update visibility when new cards are added.
  let bulkStarButtonRef: {
    readonly setVisible: (visible: boolean) => void;
    readonly setLocale: (locale: SupportedLocale) => void;
  } | null = null;

  // Create exactly ONE MutationObserver on document.body
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;
        const element = addedNode as Element;

        // Check if the added node itself is an Event_Card
        if (isEventCard(element)) {
          void processEventCard(element, adapter);
        }

        // Check for Event_Cards within the added subtree
        const nestedCards = findEventCards(element);
        for (const card of nestedCards) {
          void processEventCard(card, adapter);
        }
      }
    }

    // Update bulk star button visibility after processing added nodes
    if (bulkStarButtonRef) {
      const currentCards = findEventCards(document);
      bulkStarButtonRef.setVisible(currentCards.length > 0);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  activeObserver = observer;

  // Register cross-tab consistency listener
  adapter.onStorageChanged(
    (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => {
      // Update star buttons when starred events change
      const starredEventsChange = changes['starredEvents'];
      if (starredEventsChange) {
        const newStarredEvents = (starredEventsChange.newValue ?? {}) as Record<string, StarredEvent>;

        // Update all tracked star buttons based on new storage state
        for (const [eventId, buttons] of starButtonMap) {
          const isStarred = eventId in newStarredEvents;
          for (const button of buttons) {
            button.update(isStarred);
          }
        }
      }

      // Update bulk star button locale when language preference changes
      const langChange = changes['languagePreference'];
      if (langChange && bulkStarButtonRef) {
        const newLang = (langChange.newValue ?? null) as 'sv' | 'en' | null;
        const newLocale = resolveEffectiveLocale(newLang);
        bulkStarButtonRef.setLocale(newLocale);
      }
    },
  );

  // ─── Bulk Star Button Integration ────────────────────────────────

  // Fetch the stored language preference before creating the bulk star button.
  // This ensures the button uses the user's chosen language, not just browser locale.
  void (async () => {
    let languagePreference: 'sv' | 'en' | null = null;
    try {
      const langResponse = await adapter.sendMessage<'sv' | 'en' | null>({
        command: 'GET_LANGUAGE_PREFERENCE',
      });
      if (langResponse.success) {
        languagePreference = langResponse.data as 'sv' | 'en' | null;
      }
    } catch {
      // Fall back to browser locale detection if message fails
    }

    const locale = resolveEffectiveLocale(languagePreference);

    // Create and inject Bulk Star Button host element
    const bulkStarHost = document.createElement('div');
    bulkStarHost.id = 'almedals-bulk-star-host';

    // Position the button near the search/filter area instead of fixed bottom-right.
    // Find the list-header area that shows filter/hit count and inject the button there.
    const listHeader = document.querySelector('.list-header');
    if (listHeader) {
      // Insert after the list-header as a sibling within the outer container
      listHeader.insertAdjacentElement('afterend', bulkStarHost);
    } else {
      // Fallback: look for the outer app container
      const outerContainer = document.querySelector('.outer.app-aoc70s');
      if (outerContainer) {
        // Insert before the event list
        const eventList = outerContainer.querySelector('.list.app-aoc70s');
        if (eventList) {
          outerContainer.insertBefore(bulkStarHost, eventList);
        } else {
          outerContainer.appendChild(bulkStarHost);
        }
      } else {
        // Last resort: append to body
        document.body.appendChild(bulkStarHost);
      }
    }

    function handleBulkStarActivate(): void {
      const controller = new AbortController();

      // Create progress indicator host
      const progressHost = document.createElement('div');
      progressHost.id = 'almedals-progress-host';
      document.body.appendChild(progressHost);

      const progressIndicator = createProgressIndicator(progressHost, {
        locale,
        onCancel: () => controller.abort(),
      });

      // Disable button during operation
      bulkStarButton.setDisabled(true);

      void (async () => {
        try {
          await executeBulkStar({
            adapter,
            onProgress: (progress) => progressIndicator.update(progress),
            signal: controller.signal,
            locale,
          });
        } catch {
          // Never expected (coordinator never throws), but safety net
        } finally {
          bulkStarButton.setDisabled(false);
        }
      })();
    }

    const bulkStarButton = createBulkStarButton(bulkStarHost, {
      locale,
      onActivate: handleBulkStarActivate,
    });

    // Wire up the mutable reference for the MutationObserver
    bulkStarButtonRef = bulkStarButton;

    // Set initial visibility based on existing Event_Cards
    bulkStarButton.setVisible(existingCards.length > 0);
  })();
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Updates all star buttons for a given eventId to the specified starred state.
 * Used for cross-page consistency within the same tab.
 */
function updateAllButtonsForEvent(eventId: string, starred: boolean): void {
  const buttons = starButtonMap.get(eventId);
  if (!buttons) return;
  for (const button of buttons) {
    button.update(starred);
  }
}

/**
 * Compares fresh DOM data against stored fields and sends an update if changes are detected.
 * Fire-and-forget helper — never throws, logs warnings on failure.
 */
async function refreshStarredEventData(
  freshEvent: NormalizedEvent,
  storedFields: MutableFields,
  eventId: EventId,
  adapter: IBrowserApiAdapter,
): Promise<void> {
  try {
    const comparison = compareEventFields(freshEvent, storedFields);
    if (!comparison.hasChanges) return;

    await adapter.sendMessage({
      command: 'UPDATE_STARRED_EVENT',
      eventId,
      title: freshEvent.title,
      organiser: freshEvent.organiser,
      startDateTime: freshEvent.startDateTime,
      endDateTime: freshEvent.endDateTime,
      location: freshEvent.location,
      description: freshEvent.description,
      topic: freshEvent.topic,
      sourceUrl: freshEvent.sourceUrl,
      icsDataUri: freshEvent.icsDataUri,
    });
  } catch {
    console.warn('[Almedalsstjärnan] Refresh comparison failed for event:', eventId);
  }
}

/**
 * Flashes an error indicator on the star button inside the given host element.
 * Adds the `.star-btn--error` CSS class to the button in the shadow DOM and
 * removes it after the animation completes.
 */
function flashError(host: HTMLElement): void {
  const btn = host.shadowRoot?.querySelector('button.star-btn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.classList.add('star-btn--error');
  const onAnimationEnd = (): void => {
    btn.classList.remove('star-btn--error');
    btn.removeEventListener('animationend', onAnimationEnd);
  };
  btn.addEventListener('animationend', onAnimationEnd);
  // Fallback: remove class after 700ms if animationend doesn't fire
  setTimeout(() => {
    btn.classList.remove('star-btn--error');
  }, 700);
}

// ─── Runtime Initialization ───────────────────────────────────────

// Auto-initialize when running in a browser extension context.
// Guard against non-browser environments (e.g., Vitest) where chrome is undefined.
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  const adapter = createBrowserApiAdapter();
  initContentScript(adapter);
}
