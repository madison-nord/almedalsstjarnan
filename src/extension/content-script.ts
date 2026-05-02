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

import type { IBrowserApiAdapter, EventId, NormalizedEvent, StarredEvent } from '#core/types';
import { normalizeEvent } from '#core/event-normalizer';
import { createStarButton } from '#extension/star-button';
import { createBrowserApiAdapter } from '#core/browser-api-adapter';

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
export async function processEventCard(
  card: Element,
  adapter: IBrowserApiAdapter,
): Promise<void> {
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

    // Determine initial star state
    const response = await adapter.sendMessage<boolean>({
      command: 'GET_STAR_STATE',
      eventId,
    });

    const initialStarred = response.success ? (response.data as boolean) : false;

    // Create host container for the star button
    const host = document.createElement('div');
    host.className = 'almedals-star-host';
    host.setAttribute('data-event-id', eventId);

    // Insert the host after the title h2 element
    const titleH2 = card.querySelector('a.title h2');
    if (titleH2?.parentElement) {
      titleH2.parentElement.insertAdjacentElement('afterend', host);
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
        const starResponse = await adapter.sendMessage({
          command: 'STAR_EVENT',
          event,
        });
        if (starResponse.success) {
          // Update all star buttons for this eventId (cross-page consistency)
          updateAllButtonsForEvent(id, true);
        }
      },
      onUnstar: async (id: string) => {
        const unstarResponse = await adapter.sendMessage({
          command: 'UNSTAR_EVENT',
          eventId: id,
        });
        if (unstarResponse.success) {
          // Update all star buttons for this eventId (cross-page consistency)
          updateAllButtonsForEvent(id, false);
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
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  activeObserver = observer;

  // Register cross-tab consistency listener
  adapter.onStorageChanged((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => {
    const starredEventsChange = changes['starredEvents'];
    if (!starredEventsChange) return;

    const newStarredEvents = (starredEventsChange.newValue ?? {}) as Record<string, StarredEvent>;

    // Update all tracked star buttons based on new storage state
    for (const [eventId, buttons] of starButtonMap) {
      const isStarred = eventId in newStarredEvents;
      for (const button of buttons) {
        button.update(isStarred);
      }
    }
  });
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

// ─── Runtime Initialization ───────────────────────────────────────

// Auto-initialize when running in a browser extension context.
// Guard against non-browser environments (e.g., Vitest) where chrome is undefined.
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  const adapter = createBrowserApiAdapter();
  initContentScript(adapter);
}
