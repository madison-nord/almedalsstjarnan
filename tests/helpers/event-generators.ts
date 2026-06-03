/**
 * fast-check arbitraries for generating test event data.
 *
 * Provides realistic generators for NormalizedEvent, StarredEvent,
 * SortOrder, and arrays of starred events with unique IDs.
 */

import fc from 'fast-check';

import type { MutableFields } from '#core/event-field-comparator';
import { MUTABLE_FIELDS } from '#core/event-field-comparator';
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

/**
 * Generates a valid MutableFields object by picking only the 9 mutable fields
 * from a generated NormalizedEvent.
 */
export const mutableFieldsArb: fc.Arbitrary<MutableFields> = normalizedEventArb.map((event) => {
  const fields = {} as Record<string, unknown>;
  for (const field of MUTABLE_FIELDS) {
    fields[field] = event[field];
  }
  return fields as MutableFields;
});

// ─── Storage Validator Generators ─────────────────────────────────

/**
 * Generates an object that fails one or more StarredEvent validation checks.
 * Each malformed entry is keyed by a known id but violates at least one rule
 * (missing id, wrong starred value, empty title, non-string startDateTime, etc.)
 */
export const malformedEntryArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
  // Missing id entirely
  fc.record({
    title: nonEmptyTrimmedStringArb,
    startDateTime: isoDateTimeArb,
    starred: fc.constant(true),
    starredAt: isoUtcTimestampArb,
  }),
  // starred is false instead of true
  fc.record({
    id: hexStringArb(16),
    title: nonEmptyTrimmedStringArb,
    startDateTime: isoDateTimeArb,
    starred: fc.constant(false),
    starredAt: isoUtcTimestampArb,
  }),
  // Empty title
  fc.record({
    id: hexStringArb(16),
    title: fc.constant(''),
    startDateTime: isoDateTimeArb,
    starred: fc.constant(true),
    starredAt: isoUtcTimestampArb,
  }),
  // startDateTime is a number instead of string
  fc.record({
    id: hexStringArb(16),
    title: nonEmptyTrimmedStringArb,
    startDateTime: fc.integer(),
    starred: fc.constant(true),
    starredAt: isoUtcTimestampArb,
  }),
  // starredAt is missing (empty object with just id/title/startDateTime/starred)
  fc.record({
    id: hexStringArb(16),
    title: nonEmptyTrimmedStringArb,
    startDateTime: isoDateTimeArb,
    starred: fc.constant(true),
  }),
  // Entry is a primitive (not an object)
  fc
    .oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))
    .map((v) => v as unknown as Record<string, unknown>),
);

/**
 * Generates a Record<string, unknown> containing a mix of valid StarredEvent
 * entries and malformed entries. Returns the record along with metadata about
 * which keys are valid and which are malformed.
 */
export const mixedStorageRecordArb: fc.Arbitrary<{
  readonly record: Record<string, unknown>;
  readonly validKeys: readonly string[];
  readonly malformedKeys: readonly string[];
}> = fc
  .record({
    validEvents: fc.array(starredEventArb, { minLength: 0, maxLength: 10 }),
    malformedEntries: fc.array(fc.tuple(hexStringArb(16), malformedEntryArb), {
      minLength: 0,
      maxLength: 10,
    }),
  })
  .map(({ validEvents, malformedEntries }) => {
    const record: Record<string, unknown> = {};
    const validKeys: string[] = [];
    const malformedKeys: string[] = [];
    const usedKeys = new Set<string>();

    // Add valid events keyed by their id
    for (const event of validEvents) {
      if (usedKeys.has(event.id)) continue;
      usedKeys.add(event.id);
      record[event.id] = { ...event };
      validKeys.push(event.id);
    }

    // Add malformed entries with unique keys that don't collide with valid ones
    for (const [key, entry] of malformedEntries) {
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      record[key] = entry;
      malformedKeys.push(key);
    }

    return { record, validKeys, malformedKeys } as const;
  });

/**
 * Generates values that are NOT valid storage objects (null, arrays, strings,
 * numbers, booleans). Used for top-level rejection tests.
 */
export const invalidTopLevelArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.array(fc.anything()),
  fc.string(),
  fc.integer(),
  fc.double(),
  fc.boolean(),
);
