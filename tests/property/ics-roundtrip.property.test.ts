// Feature: almedals-planner-extension, Property 1: ICS round-trip preservation

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';
import { parseICS } from '#core/ics-parser';

import { starredEventArrayArb } from '#test/helpers/event-generators';

describe('Property 1: ICS round-trip preservation', () => {
  it('generating ICS then parsing produces equivalent events', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        fc.constantFrom('sv' as const, 'en' as const),
        (events, locale) => {
          const ics = generateICS(events, locale);
          const parsed = parseICS(ics);

          // Same number of events
          expect(parsed.events).toHaveLength(events.length);

          // Each event round-trips correctly
          for (let i = 0; i < events.length; i++) {
            const original = events[i]!;
            const roundTripped = parsed.events[i]!;

            // UID format: {id}@almedalsstjarnan
            expect(roundTripped.uid).toBe(`${original.id}@almedalsstjarnan`);

            // DTSTART: ISO 8601 → ICS local time format
            const expectedDtstart = original.startDateTime
              .replace(/[-:]/g, '')
              .replace(/\+.*$/, '')
              .slice(0, 15);
            expect(roundTripped.dtstart).toBe(expectedDtstart);

            // DTEND: present only if endDateTime is non-null
            if (original.endDateTime !== null) {
              const expectedDtend = original.endDateTime
                .replace(/[-:]/g, '')
                .replace(/\+.*$/, '')
                .slice(0, 15);
              expect(roundTripped.dtend).toBe(expectedDtend);
            } else {
              expect(roundTripped.dtend).toBeNull();
            }

            // SUMMARY matches title
            expect(roundTripped.summary).toBe(original.title);

            // LOCATION matches (null if original is null)
            if (original.location !== null) {
              expect(roundTripped.location).toBe(original.location);
            } else {
              expect(roundTripped.location).toBeNull();
            }

            // ORGANIZER matches (null if original is null)
            if (original.organiser !== null) {
              expect(roundTripped.organizer).toBe(original.organiser);
            } else {
              expect(roundTripped.organizer).toBeNull();
            }

            // DESCRIPTION contains original description if present
            if (original.description !== null) {
              expect(roundTripped.description).toBe(original.description);
            }

            // URL round-trips correctly
            if (original.sourceUrl !== null) {
              expect(roundTripped.url).toBe(original.sourceUrl);
            } else {
              expect(roundTripped.url).toBeNull();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
