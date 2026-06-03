/**
 * Year-specific Almedalsveckan configuration.
 *
 * Update cadence: annually, when Almedalsveckan dates are announced
 * (typically 6–12 months before the event).
 */

/** The year these date mappings apply to. */
export const YEAR = 2026 as const;

export interface YearMismatchResult {
  readonly mismatch: boolean;
  readonly expected: number;
  readonly actual: number;
}

/**
 * Compares the current system year against the configured YEAR constant.
 * Returns a discriminated-union result indicating whether there is a mismatch.
 *
 * Called once during service worker initialization to emit a console warning
 * if the extension is running in a different year than configured.
 */
export function checkYearMismatch(): YearMismatchResult {
  const actual = new Date().getFullYear();
  return { mismatch: actual !== YEAR, expected: YEAR, actual };
}

/** Almedalsveckan takes place in Visby, Sweden (Europe/Stockholm, UTC+02:00 in summer) */
export const STOCKHOLM_SUMMER_OFFSET = '+02:00' as const;

/** Swedish day names used in DOM time text */
export const SWEDISH_DAYS = [
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lördag',
  'Söndag',
] as const;

/**
 * Almedalsveckan 2026 date mapping.
 * The week starts on Monday June 22 and runs through Sunday June 28.
 *
 * This mapping applies to the year 2026. Developers must update this mapping
 * annually when the next year's Almedalsveckan dates are announced.
 */
export const DAY_TO_DATE: Readonly<Record<string, string>> = {
  Måndag: '2026-06-22',
  Tisdag: '2026-06-23',
  Onsdag: '2026-06-24',
  Torsdag: '2026-06-25',
  Fredag: '2026-06-26',
  Lördag: '2026-06-27',
  Söndag: '2026-06-28',
} as const;
