/**
 * fast-check arbitraries for generating test event data.
 *
 * Provides realistic generators for NormalizedEvent, StarredEvent,
 * SortOrder, and arrays of starred events with unique IDs.
 */

import fc from 'fast-check';

import type { NormalizedEvent, StarredEvent, SortOrder } from '#core/types';
import { SORT_ORDERS } from '#core/types';

// ─── Helpers ──────────────────────────────────────────────────────

/** Generates a hex string of the given length for use as event IDs. */
const hexStringArb = (length: number): fc.Arbitrary<string> =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: length, maxLength: length })
    .map((nums) => nums.map((n) => n.toString(16)).join(''));

/** Generates a realistic ISO 8601 date-time string with +02:00 timezone. */
const isoDateTimeArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2024, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ year, month, day, hour, minute }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+02:00`,
  );

/** Generates a realistic ISO 8601 UTC timestamp for starredAt. */
const isoUtcTimestampArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2024, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
    second: fc.integer({ min: 0, max: 59 }),
  })
  .map(
    ({ year, month, day, hour, minute, second }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`,
  );

/** Generates a non-empty trimmed string suitable for titles and names. */
const nonEmptyTrimmedStringArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]{1,80}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Generates a realistic Swedish event title. */
const titleArb: fc.Arbitrary<string> = fc.oneof(
  nonEmptyTrimmedStringArb,
  fc.constantFrom(
    'Demokrati i förändring',
    'Hållbar utveckling för alla',
    'Framtidens sjukvård',
    'Klimatkrisen och politiken',
    'Trygghet i det digitala samhället',
    'Tillräcklighet krävs för att klara klimatkrisen',
  ),
);

/** Generates a nullable trimmed string for optional fields. */
const nullableStringArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  nonEmptyTrimmedStringArb,
);

/** Generates a realistic location string or null. */
const locationArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constantFrom(
    'Donners plats, Visby',
    'Holmen 1',
    'Wisby Strand Congress & Event',
    'Almedalsparken',
    'Kruttornet',
  ),
);

/** Generates a realistic topic string or null. */
const topicArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constantFrom(
    'Demokrati',
    'Hållbarhet',
    'Ekonomi',
    'Säkerhet/försvar',
    'Utbildning',
    'Hälsa/sjukvård',
    'Mänskliga Rättigheter',
  ),
);

/** Generates a realistic organiser name or null. */
const organiserArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constantFrom(
    'Sveriges Riksdag',
    'Svenskt Näringsliv',
    'Svenska Röda Korset',
    'Den gröna tankesmedjan Cogito',
    'Region Gotland',
  ),
);

// ─── Public Arbitraries ───────────────────────────────────────────

/**
 * Generates a valid NormalizedEvent with realistic field values.
 * All required fields (id, title, startDateTime) are always present.
 * Optional fields may be null.
 */
export const normalizedEventArb: fc.Arbitrary<NormalizedEvent> = fc
  .record({
    id: hexStringArb(16),
    title: titleArb,
    organiser: organiserArb,
    startDateTime: isoDateTimeArb,
    endDateTime: fc.oneof(fc.constant(null), isoDateTimeArb),
    location: locationArb,
    description: nullableStringArb,
    topic: topicArb,
    sourceUrl: fc.oneof(
      fc.constant(null),
      hexStringArb(8).map(
        (id) => `https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/${id}`,
      ),
    ),
    icsDataUri: fc.constant(null),
  })
  .map((fields) => ({ ...fields }) as NormalizedEvent);

/**
 * Generates a valid StarredEvent (NormalizedEvent + starred: true + starredAt).
 */
export const starredEventArb: fc.Arbitrary<StarredEvent> = fc
  .record({
    event: normalizedEventArb,
    starredAt: isoUtcTimestampArb,
  })
  .map(
    ({ event, starredAt }) =>
      ({
        ...event,
        starred: true as const,
        starredAt,
      }) satisfies StarredEvent,
  );

/**
 * Generates one of the four valid SortOrder values.
 */
export const sortOrderArb: fc.Arbitrary<SortOrder> = fc.constantFrom(...SORT_ORDERS);

/**
 * Generates an array of 0–50 StarredEvents with unique IDs.
 */
export const starredEventArrayArb: fc.Arbitrary<readonly StarredEvent[]> = fc
  .array(starredEventArb, { minLength: 0, maxLength: 50 })
  .map((events) => {
    const seen = new Set<string>();
    return events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  });
