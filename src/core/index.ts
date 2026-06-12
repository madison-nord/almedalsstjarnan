export type {
  EventId,
  SortOrder,
  NormalizedEvent,
  StarredEvent,
  StorageSchema,
  MessageCommand,
  StarEventPayload,
  UnstarEventPayload,
  GetStarStatePayload,
  GetAllStarredEventsPayload,
  GetSortOrderPayload,
  SetSortOrderPayload,
  MessagePayload,
  MessageResponseSuccess,
  MessageResponseError,
  MessageResponse,
  StarEventResponse,
  UnstarEventResponse,
  GetStarStateResponse,
  GetAllStarredEventsResponse,
  GetSortOrderResponse,
  SetSortOrderResponse,
  NormalizerSuccess,
  NormalizerError,
  NormalizerResult,
  ICSEvent,
  ICSCalendar,
  IBrowserApiAdapter,
} from './types';

export { SORT_ORDERS, DEFAULT_SORT_ORDER, MESSAGE_COMMANDS } from './types';

export { BrowserApiAdapter, createBrowserApiAdapter } from './browser-api-adapter';

export { parseICS, unfoldLines, unescapeICSText } from './ics-parser';

export type { ContentSection } from './event-normalizer';
export {
  normalizeEvent,
  deriveEventId,
  parseDateTime,
  extractContentSections,
  CONTENT_SECTION_HEADINGS,
  MAX_DESCRIPTION_LENGTH,
} from './event-normalizer';

export type { YearMismatchResult } from './date-config';
export {
  DAY_TO_DATE,
  SWEDISH_DAYS,
  STOCKHOLM_SUMMER_OFFSET,
  YEAR,
  checkYearMismatch,
} from './date-config';

export { sortEvents, isTimeBasedSort } from './sorter';

export {
  generateICS,
  foldLine,
  escapeICSText,
  buildDescription,
  generateExportFilename,
} from './ics-generator';

export type { DateFormatterLocale } from './date-formatter';
export { formatEventDateTime } from './date-formatter';

export type { ConflictPair } from './conflict-detector';
export { detectConflicts, getConflictingEventIds } from './conflict-detector';

export { filterEvents } from './event-filter';

export type { MutableFieldName, MutableFields, ComparisonResult } from './event-field-comparator';
export { MUTABLE_FIELDS, normalizeFieldValue, compareEventFields } from './event-field-comparator';

export type { SupportedLocale } from './locale-messages';
export { getLocalizedMessage, resolveEffectiveLocale } from './locale-messages';
