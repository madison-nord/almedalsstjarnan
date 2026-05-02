// Feature: almedals-planner-extension, Property 10: ICS UID format

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';
import { parseICS } from '#core/ics-parser';

import { starredEventArrayArb } from '#test/helpers/event-generators';

describe('Property 10: ICS UID format', () => {
  it('UID matches {id}@almedalsstjarnan for every event', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        if (events.length === 0) return;

        const ics = generateICS(events, 'sv');
        const parsed = parseICS(ics);

        expect(parsed.events).toHaveLength(events.length);

        for (let i = 0; i < events.length; i++) {
          const original = events[i]!;
          const parsedEvent = parsed.events[i]!;
          expect(parsedEvent.uid).toBe(`${original.id}@almedalsstjarnan`);
        }
      }),
      { numRuns: 100 },
    );
  });
});
