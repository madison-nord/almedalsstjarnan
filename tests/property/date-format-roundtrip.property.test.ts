// Feature: ux-enhancements, Property 3: round-trip consistency

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { formatEventDateTime } from '#core/date-formatter';
import type { DateFormatterLocale } from '#core/date-formatter';

/**
 * Generates a valid ISO 8601 date-time string with timezone offset.
 * Format: YYYY-MM-DDTHH:MM:SS+HH:MM
 */
const isoDateTimeArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid dates
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ year, month, day, hour, minute }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+02:00`,
  );

const localeArb: fc.Arbitrary<DateFormatterLocale> = fc.constantFrom('sv' as const, 'en' as const);

describe('Property 3: Date formatting round-trip consistency', () => {
  /**
   * Validates: Requirements 4.1, 4.8
   *
   * For any valid ISO 8601 date-time string with timezone offset and for any
   * supported locale, formatting the string and then extracting the numeric day,
   * hour, and minute components from the formatted output SHALL produce values
   * equal to the corresponding components in the original ISO string.
   */
  it('extracting day, hour, and minute from formatted output matches original ISO components', () => {
    fc.assert(
      fc.property(isoDateTimeArb, localeArb, (isoString, locale) => {
        const formatted = formatEventDateTime(isoString, null, locale);

        // Extract original components from ISO string
        const originalDay = Number(isoString.slice(8, 10));
        const originalHour = Number(isoString.slice(11, 13));
        const originalMinute = Number(isoString.slice(14, 16));

        // Extract components from formatted output
        // Format is: "Day DD month HH:MM" or "Day DD month HH:MM–HH:MM"
        // The day number is the second token
        const tokens = formatted.split(' ');
        const extractedDay = Number(tokens[1]);

        // The time is the last token (either "HH:MM" or "HH:MM–HH:MM")
        const timeToken = tokens[tokens.length - 1]!;
        const startTime = timeToken.split('\u2013')[0]!;
        const [hourStr, minuteStr] = startTime.split(':');
        const extractedHour = Number(hourStr);
        const extractedMinute = Number(minuteStr);

        expect(extractedDay).toBe(originalDay);
        expect(extractedHour).toBe(originalHour);
        expect(extractedMinute).toBe(originalMinute);
      }),
      { numRuns: 100 },
    );
  });
});
