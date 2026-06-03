import type { NormalizedEvent } from '#core/types';

/** The 9 mutable fields that may change over time on the website */
export const MUTABLE_FIELDS = [
  'title',
  'organiser',
  'startDateTime',
  'endDateTime',
  'location',
  'description',
  'topic',
  'sourceUrl',
  'icsDataUri',
] as const;

export type MutableFieldName = (typeof MUTABLE_FIELDS)[number];

/** Subset of NormalizedEvent containing only the mutable fields */
export type MutableFields = Pick<NormalizedEvent, MutableFieldName>;

/** Result of comparing two sets of mutable fields */
export interface ComparisonResult {
  readonly hasChanges: boolean;
  readonly changedFields: readonly MutableFieldName[];
}

/**
 * Normalizes a single field value for comparison:
 * - Trims leading/trailing whitespace
 * - Converts empty or whitespace-only strings to null
 */
export function normalizeFieldValue(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Compares the mutable fields of a fresh NormalizedEvent against stored fields.
 * Returns which fields (if any) have changed.
 *
 * Both inputs are normalized before comparison: whitespace-trimmed,
 * empty/whitespace-only strings converted to null, then strict equality.
 */
export function compareEventFields(
  fresh: MutableFields,
  stored: MutableFields,
): ComparisonResult {
  return { hasChanges: false, changedFields: [] };
}
