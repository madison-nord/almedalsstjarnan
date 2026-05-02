// Feature: almedals-planner-extension, Property 11: ICS export filename pattern

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateExportFilename } from '#core/ics-generator';

describe('Property 11: ICS export filename pattern', () => {
  it('filename matches almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('2020-01-01T00:00:00Z'),
          max: new Date('2035-12-31T23:59:59Z'),
        }).filter((d) => !isNaN(d.getTime())),
        (date) => {
          const filename = generateExportFilename(date);
          expect(filename).toMatch(
            /^almedalsstjarnan-starred-events-\d{8}-\d{6}\.ics$/,
          );

          // Verify the date components match the input
          const match = filename.match(
            /^almedalsstjarnan-starred-events-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.ics$/,
          );
          expect(match).not.toBeNull();

          const year = parseInt(match![1]!, 10);
          const month = parseInt(match![2]!, 10);
          const day = parseInt(match![3]!, 10);
          const hour = parseInt(match![4]!, 10);
          const minute = parseInt(match![5]!, 10);
          const second = parseInt(match![6]!, 10);

          expect(year).toBe(date.getUTCFullYear());
          expect(month).toBe(date.getUTCMonth() + 1);
          expect(day).toBe(date.getUTCDate());
          expect(hour).toBe(date.getUTCHours());
          expect(minute).toBe(date.getUTCMinutes());
          expect(second).toBe(date.getUTCSeconds());
        },
      ),
      { numRuns: 100 },
    );
  });
});
