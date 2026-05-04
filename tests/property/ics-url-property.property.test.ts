// Feature: grid-and-ics-bugfixes, Property 3: Source URL as dedicated ICS URL property
// Feature: grid-and-ics-bugfixes, Property 4: ICS output unchanged for null sourceUrl

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';
import { parseICS } from '#core/ics-parser';

import { starredEventArb } from '#test/helpers/event-generators';

import type { StarredEvent } from '#core/types';

// ─── Arbitraries ──────────────────────────────────────────────────

/** StarredEvent with a guaranteed non-null sourceUrl. */
const eventWithSourceUrlArb: fc.Arbitrary<StarredEvent> = starredEventArb.map((event) => ({
  ...event,
  sourceUrl:
    event.sourceUrl ??
    `https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/${event.id}`,
}));

/** StarredEvent with a guaranteed null sourceUrl. */
const eventWithNullSourceUrlArb: fc.Arbitrary<StarredEvent> = starredEventArb.map((event) => ({
  ...event,
  sourceUrl: null,
}));

// ─── Property 3 ───────────────────────────────────────────────────

describe('Property 3: Source URL as dedicated ICS URL property', () => {
  it('for any StarredEvent with non-null sourceUrl, ICS output has URL property and DESCRIPTION does not contain sourceUrl', () => {
    fc.assert(
      fc.property(
        eventWithSourceUrlArb,
        fc.constantFrom('sv' as const, 'en' as const),
        (event, locale) => {
          const ics = generateICS([event], locale);
          const parsed = parseICS(ics);
          const parsedEvent = parsed.events[0]!;

          // URL property should be present and match sourceUrl
          expect(parsedEvent.url).toBe(event.sourceUrl);

          // DESCRIPTION should NOT contain the sourceUrl
          if (parsedEvent.description !== null) {
            expect(parsedEvent.description).not.toContain(event.sourceUrl);
          }

          // DESCRIPTION should NOT contain localized source labels
          if (parsedEvent.description !== null) {
            expect(parsedEvent.description).not.toContain('Källa:');
            expect(parsedEvent.description).not.toContain('Source:');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4 ───────────────────────────────────────────────────

describe('Property 4: ICS output unchanged for null sourceUrl', () => {
  it('for any StarredEvent with null sourceUrl, ICS output has no URL property and DESCRIPTION is unchanged', () => {
    fc.assert(
      fc.property(
        eventWithNullSourceUrlArb,
        fc.constantFrom('sv' as const, 'en' as const),
        (event, locale) => {
          const ics = generateICS([event], locale);
          const parsed = parseICS(ics);
          const parsedEvent = parsed.events[0]!;

          // No URL property
          expect(parsedEvent.url).toBeNull();

          // DESCRIPTION should match original description exactly (or be null)
          if (event.description !== null) {
            expect(parsedEvent.description).toBe(event.description);
          } else {
            expect(parsedEvent.description).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
