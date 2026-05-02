// ─── Event Identity ───────────────────────────────────────────────

/** Unique event identifier derived from ICS URL path, detail-page URL, or SHA-256 hash fallback */
export type EventId = string;

// ─── Sort Order ───────────────────────────────────────────────────

export const SORT_ORDERS = [
  'chronological',
  'reverse-chronological',
  'alphabetical-by-title',
  'starred-desc',
] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_SORT_ORDER: SortOrder = 'chronological';

// ─── Normalized Event ─────────────────────────────────────────────

export interface NormalizedEvent {
  /** Unique event identifier */
  readonly id: EventId;
  /** Event title (required, trimmed) */
  readonly title: string;
  /** Organiser name (optional, trimmed) */
  readonly organiser: string | null;
  /** ISO 8601 start date-time with timezone (required) */
  readonly startDateTime: string;
  /** ISO 8601 end date-time with timezone (optional) */
  readonly endDateTime: string | null;
  /** Event location (optional, trimmed) */
  readonly location: string | null;
  /** Event description (optional, trimmed) */
  readonly description: string | null;
  /** Event topic/category (optional, trimmed) */
  readonly topic: string | null;
  /** Source URL on almedalsveckan.info (optional) */
  readonly sourceUrl: string | null;
  /** Raw ICS data URI from the data:text/calendar anchor href */
  readonly icsDataUri: string | null;
}

// ─── Starred Event (persisted) ────────────────────────────────────

export interface StarredEvent extends NormalizedEvent {
  /** Whether the event is currently starred (always true when in storage) */
  readonly starred: true;
  /** Timestamp when the event was starred (ISO 8601) */
  readonly starredAt: string;
}

// ─── Storage Schema ───────────────────────────────────────────────

export interface StorageSchema {
  /** Object keyed by EventId, values are StarredEvent objects */
  readonly starredEvents: Record<EventId, StarredEvent>;
  /** Current sort order preference */
  readonly sortOrder: SortOrder;
}

// ─── Message Protocol ─────────────────────────────────────────────

export const MESSAGE_COMMANDS = [
  'STAR_EVENT',
  'UNSTAR_EVENT',
  'GET_STAR_STATE',
  'GET_ALL_STARRED_EVENTS',
  'GET_SORT_ORDER',
  'SET_SORT_ORDER',
] as const;

export type MessageCommand = (typeof MESSAGE_COMMANDS)[number];

export interface StarEventPayload {
  readonly command: 'STAR_EVENT';
  readonly event: NormalizedEvent;
}

export interface UnstarEventPayload {
  readonly command: 'UNSTAR_EVENT';
  readonly eventId: EventId;
}

export interface GetStarStatePayload {
  readonly command: 'GET_STAR_STATE';
  readonly eventId: EventId;
}

export interface GetAllStarredEventsPayload {
  readonly command: 'GET_ALL_STARRED_EVENTS';
}

export interface GetSortOrderPayload {
  readonly command: 'GET_SORT_ORDER';
}

export interface SetSortOrderPayload {
  readonly command: 'SET_SORT_ORDER';
  readonly sortOrder: SortOrder;
}

export type MessagePayload =
  | StarEventPayload
  | UnstarEventPayload
  | GetStarStatePayload
  | GetAllStarredEventsPayload
  | GetSortOrderPayload
  | SetSortOrderPayload;

// ─── Message Responses ────────────────────────────────────────────

export interface MessageResponseSuccess<T = unknown> {
  readonly success: true;
  readonly data: T;
}

export interface MessageResponseError {
  readonly success: false;
  readonly error: string;
}

export type MessageResponse<T = unknown> =
  | MessageResponseSuccess<T>
  | MessageResponseError;

// ─── Response type map per command ────────────────────────────────

export type StarEventResponse = MessageResponse<void>;
export type UnstarEventResponse = MessageResponse<void>;
export type GetStarStateResponse = MessageResponse<boolean>;
export type GetAllStarredEventsResponse = MessageResponse<StarredEvent[]>;
export type GetSortOrderResponse = MessageResponse<SortOrder>;
export type SetSortOrderResponse = MessageResponse<void>;

// ─── Event Normalizer Result ──────────────────────────────────────

export interface NormalizerSuccess {
  readonly ok: true;
  readonly event: NormalizedEvent;
}

export interface NormalizerError {
  readonly ok: false;
  readonly reason: string;
  readonly missingField?: string;
}

export type NormalizerResult = NormalizerSuccess | NormalizerError;

// ─── ICS Types ────────────────────────────────────────────────────

export interface ICSEvent {
  readonly uid: string;
  readonly dtstart: string;
  readonly dtend: string | null;
  readonly summary: string;
  readonly location: string | null;
  readonly description: string | null;
  readonly organizer: string | null;
}

export interface ICSCalendar {
  readonly version: string;
  readonly prodid: string;
  readonly calscale: string;
  readonly method: string;
  readonly events: readonly ICSEvent[];
}

// ─── Browser API Adapter Interface ────────────────────────────────

export interface IBrowserApiAdapter {
  storageLocalGet<K extends keyof StorageSchema>(
    keys: K[],
  ): Promise<Partial<Pick<StorageSchema, K>>>;

  storageLocalSet(items: Partial<StorageSchema>): Promise<void>;

  sendMessage<T>(message: MessagePayload): Promise<MessageResponse<T>>;

  getMessage(key: string): string;

  download(options: { readonly url: string; readonly filename: string }): Promise<number>;

  createTab(options: { readonly url: string }): Promise<void>;

  /** Register a listener for storage.onChanged events. Returns an unsubscribe function. */
  onStorageChanged(
    callback: (
      changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>,
    ) => void,
  ): () => void;
}
