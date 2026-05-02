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
