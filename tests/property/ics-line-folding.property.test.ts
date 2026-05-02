// Feature: almedals-planner-extension, Property 9: ICS line folding

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';

import { starredEventArrayArb } from '#test/helpers/event-generators';

describe('Property 9: ICS line folding', () => {
  it('all content lines are at most 75 octets', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        fc.constantFrom('sv' as const, 'en' as const),
        (events, locale) => {
          const ics = generateICS(events, locale);
          const lines = ics.split('\r\n');
          const encoder = new TextEncoder();

          for (const line of lines) {
            const octets = encoder.encode(line).length;
            expect(octets).toBeLessThanOrEqual(75);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
