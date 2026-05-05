/**
 * Background Service Worker for the Almedalsstjärnan extension.
 *
 * Registers a chrome.runtime.onMessage listener that dispatches incoming
 * MessagePayload messages to handler functions. All storage operations
 * go through IBrowserApiAdapter. The service worker is stateless — it
 * reads from storage.local for every request.
 *
 * Exported `handleMessage` function enables direct testing with a mock adapter.
 */

import type {
  IBrowserApiAdapter,
  MessagePayload,
  MessageResponse,
  StarredEvent,
  EventId,
  NormalizedEvent,
  SortOrder,
} from '#core/types';
import { DEFAULT_SORT_ORDER } from '#core/types';
import { createBrowserApiAdapter } from '#core/browser-api-adapter';

// ─── Handler Functions ────────────────────────────────────────────

async function addStarredEvent(
  adapter: IBrowserApiAdapter,
  event: NormalizedEvent,
): Promise<MessageResponse<void>> {
  const result = await adapter.storageLocalGet(['starredEvents']);
  const starredEvents = result.starredEvents ?? {};

  const starredEvent: StarredEvent = {
    ...event,
    starred: true,
    starredAt: new Date().toISOString(),
  };

  await adapter.storageLocalSet({
    starredEvents: { ...starredEvents, [event.id]: starredEvent },
  });

  return { success: true, data: undefined };
}

async function removeStarredEvent(
  adapter: IBrowserApiAdapter,
  eventId: EventId,
): Promise<MessageResponse<void>> {
  const result = await adapter.storageLocalGet(['starredEvents']);
  const starredEvents = result.starredEvents ?? {};

  const { [eventId]: _removed, ...remaining } = starredEvents;

  await adapter.storageLocalSet({ starredEvents: remaining });

  return { success: true, data: undefined };
}

async function isEventStarred(
  adapter: IBrowserApiAdapter,
  eventId: EventId,
): Promise<MessageResponse<boolean>> {
  const result = await adapter.storageLocalGet(['starredEvents']);
  const starredEvents = result.starredEvents ?? {};

  return { success: true, data: eventId in starredEvents };
}

async function getAllStarredEvents(
  adapter: IBrowserApiAdapter,
): Promise<MessageResponse<StarredEvent[]>> {
  const result = await adapter.storageLocalGet(['starredEvents']);
  const starredEvents = result.starredEvents ?? {};

  return { success: true, data: Object.values(starredEvents) };
}

async function getSortOrder(
  adapter: IBrowserApiAdapter,
): Promise<MessageResponse<SortOrder>> {
  const result = await adapter.storageLocalGet(['sortOrder']);
  const sortOrder = result.sortOrder ?? DEFAULT_SORT_ORDER;

  return { success: true, data: sortOrder };
}

async function setSortOrder(
  adapter: IBrowserApiAdapter,
  sortOrder: SortOrder,
): Promise<MessageResponse<void>> {
  await adapter.storageLocalSet({ sortOrder });

  return { success: true, data: undefined };
}

async function getOnboardingState(
  adapter: IBrowserApiAdapter,
): Promise<MessageResponse<boolean>> {
  const result = await adapter.storageLocalGet(['onboardingDismissed']);
  const dismissed = result.onboardingDismissed ?? false;

  return { success: true, data: dismissed };
}

async function setOnboardingState(
  adapter: IBrowserApiAdapter,
  dismissed: boolean,
): Promise<MessageResponse<void>> {
  await adapter.storageLocalSet({ onboardingDismissed: dismissed });

  return { success: true, data: undefined };
}

async function getLanguagePreference(
  adapter: IBrowserApiAdapter,
): Promise<MessageResponse<'sv' | 'en' | null>> {
  const result = await adapter.storageLocalGet(['languagePreference']);
  const preference = result.languagePreference ?? null;

  return { success: true, data: preference };
}

async function setLanguagePreference(
  adapter: IBrowserApiAdapter,
  locale: 'sv' | 'en' | null,
): Promise<MessageResponse<void>> {
  await adapter.storageLocalSet({ languagePreference: locale });

  return { success: true, data: undefined };
}

// ─── Message Dispatcher ──────────────────────────────────────────

/**
 * Handles an incoming message by dispatching to the appropriate handler.
 * Exported for direct testing with a mock adapter.
 *
 * @param adapter - The browser API adapter to use for storage operations
 * @param message - The incoming message payload
 * @returns A promise resolving to the message response
 */
export async function handleMessage(
  adapter: IBrowserApiAdapter,
  message: MessagePayload,
): Promise<MessageResponse> {
  try {
    switch (message.command) {
      case 'STAR_EVENT':
        return await addStarredEvent(adapter, message.event);
      case 'UNSTAR_EVENT':
        return await removeStarredEvent(adapter, message.eventId);
      case 'GET_STAR_STATE':
        return await isEventStarred(adapter, message.eventId);
      case 'GET_ALL_STARRED_EVENTS':
        return await getAllStarredEvents(adapter);
      case 'GET_SORT_ORDER':
        return await getSortOrder(adapter);
      case 'SET_SORT_ORDER':
        return await setSortOrder(adapter, message.sortOrder);
      case 'GET_ONBOARDING_STATE':
        return await getOnboardingState(adapter);
      case 'SET_ONBOARDING_STATE':
        return await setOnboardingState(adapter, message.dismissed);
      case 'GET_LANGUAGE_PREFERENCE':
        return await getLanguagePreference(adapter);
      case 'SET_LANGUAGE_PREFERENCE':
        return await setLanguagePreference(adapter, message.locale);
      default:
        return {
          success: false,
          error: `Unknown command: ${(message as Record<string, unknown>).command as string}`,
        };
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Badge Logic ─────────────────────────────────────────────────

/**
 * Computes the badge text for a given record of starred events.
 * Returns the count as a string when count > 0, or empty string when count is 0.
 *
 * Exported for direct testing.
 */
export function computeBadgeText(starredEvents: Record<string, unknown>): string {
  const count = Object.keys(starredEvents).length;
  return count > 0 ? String(count) : '';
}

/**
 * Badge update result returned by handleStorageChange.
 */
export interface BadgeUpdate {
  readonly text: string;
  readonly color: string;
}

/**
 * Handles a storage.onChanged event and determines if a badge update is needed.
 * Returns a BadgeUpdate if the badge should be updated, or null if no update is needed.
 *
 * Exported for direct testing.
 *
 * @param changes - The storage changes object
 * @param areaName - The storage area that changed ('local', 'sync', etc.)
 */
export function handleStorageChange(
  changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>,
  areaName: string,
): BadgeUpdate | null {
  if (areaName !== 'local' || !('starredEvents' in changes)) {
    return null;
  }

  const newEvents = (changes.starredEvents?.newValue ?? {}) as Record<string, unknown>;
  const text = computeBadgeText(newEvents);

  return { text, color: '#f59e0b' };
}

// ─── Runtime Registration ────────────────────────────────────────

// Register the message listener at module level using the real adapter.
// This runs when the service worker is loaded by the browser.
// Guard against non-browser environments (e.g., Vitest) where chrome is undefined.
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  const adapter = createBrowserApiAdapter();

  chrome.runtime.onMessage.addListener(
    (
      message: MessagePayload,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void,
    ) => {
      handleMessage(adapter, message)
        .then(sendResponse)
        .catch((error: unknown) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      // Return true to indicate we will send a response asynchronously
      return true;
    },
  );
}

// Register the storage.onChanged listener for badge updates.
// Guard against non-browser environments (e.g., Vitest) where chrome is undefined.
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const update = handleStorageChange(
      changes as Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>,
      areaName,
    );

    if (update) {
      chrome.action.setBadgeText({ text: update.text });
      chrome.action.setBadgeBackgroundColor({ color: update.color });
    }
  });
}
