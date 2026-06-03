import type { StarredEvent, EventId } from './types';

/**
 * Result of storage validation. Contains only entries that pass
 * all structural checks. Invalid entries are silently filtered.
 */
export interface StorageValidationResult {
  readonly valid: Readonly<Record<EventId, StarredEvent>>;
  readonly invalidKeys: readonly string[];
}

/**
 * Validates a single entry against the StarredEvent schema.
 *
 * Checks:
 * - entry is a non-null object
 * - entry.id is a non-empty string matching the provided key
 * - entry.title is a non-empty string
 * - entry.startDateTime is a non-empty string
 * - entry.starred === true
 * - entry.starredAt is a non-empty string
 *
 * @param key - The object key this entry was stored under
 * @param entry - The raw entry value
 * @returns true if the entry is a valid StarredEvent
 */
export function isValidStarredEntry(key: string, entry: unknown): entry is StarredEvent {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return false;
  }

  const record = entry as Record<string, unknown>;

  if (typeof record['id'] !== 'string' || record['id'] === '' || record['id'] !== key) {
    return false;
  }

  if (typeof record['title'] !== 'string' || record['title'] === '') {
    return false;
  }

  if (typeof record['startDateTime'] !== 'string' || record['startDateTime'] === '') {
    return false;
  }

  if (record['starred'] !== true) {
    return false;
  }

  if (typeof record['starredAt'] !== 'string' || record['starredAt'] === '') {
    return false;
  }

  return true;
}

/**
 * Validates the raw `starredEvents` value read from chrome.storage.local.
 *
 * Pure function — no side effects. Logging is the caller's responsibility.
 *
 * @param raw - The raw value from storage (could be anything)
 * @returns StorageValidationResult with valid entries and list of rejected keys
 */
export function validateStarredEvents(raw: unknown): StorageValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: {}, invalidKeys: [] };
  }

  const valid: Record<EventId, StarredEvent> = {};
  const invalidKeys: string[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (isValidStarredEntry(key, value)) {
      valid[key] = value;
    } else {
      invalidKeys.push(key);
    }
  }

  return { valid, invalidKeys };
}
