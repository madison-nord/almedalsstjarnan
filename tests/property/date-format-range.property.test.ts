// Feature: ux-enhancements, Property 4: range formatting correctness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { formatEventDateTime } from '#core/date-formatter';
import type { DateFormatterLocale } from '#core/date-formatter';

/**
 * Generates a valid ISO 8601 date-time string with timezone offset.
 */
const isoDateTimeArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ year, month, day, hour, minute }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+02:00`,
  );

/**
 * Generates a pair of ISO date-time strings on the same calendar day.
 * The end time is always on the same day as the start time.
 */
const sameDayRangeArb: fc.Arbitrary<{ readonly start: string; readonly end: string }> = fc
  .record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    startHour: fc.integer({ min: 0, max: 22 }),
    startMinute: fc.integer({ min: 0, max: 59 }),
    endHour: fc.integer({ min: 0, max: 23 }),
    endMinute: fc.integer({ min: 0, max: 59 }),
  })
  .map(({ year, month, day, startHour, startMinute, endHour, endMinute }) => {
    const datePart = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const start = `${datePart}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+02:00`;
    const end = `${datePart}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+02:00`;
    return { start, end };
  });

const localeArb: fc.Arbitrary<DateFormatterLocale> = fc.constantFrom('sv' as const, 'en' as const);

describe('Property 4: Range formatting correctness', () => {
  /**
   * Validates: Requirements 4.4, 4.5
   *
   * For any valid ISO 8601 start date-time string and for any end date-time
   * string on the same calendar day, the formatted output SHALL contain an
   * en-dash (–) separating two time values.
   */
  it('same-day range contains en-dash separating two time values', () => {
    fc.assert(
      fc.property(sameDayRangeArb, localeArb, ({ start, end }, locale) => {
        const formatted = formatEventDateTime(start, end, locale);

        // Must contain an en-dash
        expect(formatted).toContain('\u2013');

        // Extract the time portion (last token)
        const tokens = formatted.split(' ');
        const timeToken = tokens[tokens.length - 1]!;
        const timeParts = timeToken.split('\u2013');

        // Must have exactly two time values separated by en-dash
        expect(timeParts).toHaveLength(2);

        // Both parts must be valid HH:MM format
        const timePattern = /^\d{2}:\d{2}$/;
        expect(timeParts[0]).toMatch(timePattern);
        expect(timeParts[1]).toMatch(timePattern);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 4.4, 4.5
   *
   * For any start date-time with a null end date-time, the formatted output
   * SHALL NOT contain an en-dash.
   */
  it('null endDateTime produces no en-dash in output', () => {
    fc.assert(
      fc.property(isoDateTimeArb, localeArb, (isoString, locale) => {
        const formatted = formatEventDateTime(isoString, null, locale);

        // Must NOT contain an en-dash
        expect(formatted).not.toContain('\u2013');
      }),
      { numRuns: 100 },
    );
  });
});
