// Feature: almedals-planner-extension, Property 8: ICS CRLF line endings

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';

import { starredEventArrayArb } from '#test/helpers/event-generators';

describe('Property 8: ICS CRLF line endings', () => {
  it('no bare LF in output — every LF is preceded by CR', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        fc.constantFrom('sv' as const, 'en' as const),
        (events, locale) => {
          const ics = generateICS(events, locale);

          // Check that every \n is preceded by \r
          for (let i = 0; i < ics.length; i++) {
            if (ics[i] === '\n') {
              expect(ics[i - 1]).toBe('\r');
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
